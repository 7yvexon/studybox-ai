import { defaultLearningSettings, type CurrentUser } from "@studybox/shared";
import type { ZodType } from "zod";

import { config } from "./config";
import {
  appendMessages,
  checkStorageReady,
  consumeRateLimit,
  createConversation,
  createSession,
  deleteConversation,
  deleteSession,
  deleteUser,
  findUserByUsername,
  getConversation,
  getConversationContext,
  getCurrentUserBySession,
  listConversations,
  registerUser,
  releaseUsage,
  reserveUsage,
  updateConversationTitle
} from "./database";
import { ApiError, errorResponse } from "./errors";
import { createChatProvider } from "./provider";
import { createOpaqueToken, getDummyPasswordHash, hashPassword, hashToken, verifyPassword } from "./security";
import {
  conversationSchema,
  loginSchema,
  messageSchema,
  registerSchema,
  titleSchema,
  uuidSchema
} from "./validation";

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

const json = (payload: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(payload, { status, headers: { ...responseHeaders, ...headers } });

const empty = (status = 204, headers?: HeadersInit) =>
  new Response(null, { status, headers: { ...responseHeaders, ...headers } });

const parseBody = async <T>(request: Request, schema: ZodType<T>) => {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 16384) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "입력 내용이 너무 큽니다.");
  }
  return schema.parse(JSON.parse(body));
};

const parseCookies = (request: Request) => {
  const values = new Map<string, string>();
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    values.set(key, decodeURIComponent(value));
  }
  return values;
};

const sessionToken = (request: Request) => parseCookies(request).get(config.sessionCookieName);

const requireUser = async (request: Request): Promise<CurrentUser> => {
  const token = sessionToken(request);
  if (!token) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }
  const user = await getCurrentUserBySession(await hashToken(token));
  if (!user) {
    throw new ApiError(401, "SESSION_EXPIRED", "로그인 상태가 만료되었습니다.");
  }
  return user;
};

const cookieHeader = (request: Request, token: string, maxAge: number) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${config.sessionCookieName}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
};

const clearCookieHeader = (request: Request) => cookieHeader(request, "", 0);

const requireSameOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 요청입니다.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 요청입니다.");
    }
    return;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 요청입니다.");
  }
};

const requestIp = (request: Request) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

const conversationIdFrom = (value: string | undefined) => {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "INVALID_CONVERSATION_ID", "대화 식별자가 올바르지 않습니다.");
  }
  return result.data;
};

const handleRequest = async (request: Request, path: string[]) => {
  const method = request.method.toUpperCase();
  const mutating = method === "POST" || method === "PATCH" || method === "DELETE";
  if (mutating) {
    requireSameOrigin(request);
  }

  if (method === "GET" && path.length === 1 && path[0] === "health") {
    return json({ status: "ok", timestamp: new Date().toISOString() });
  }

  if (method === "GET" && path.length === 1 && path[0] === "ready") {
    await checkStorageReady();
    return json({ status: "ready", storage: "d1" });
  }

  if (method === "POST" && path.join("/") === "auth/register") {
    const input = await parseBody(request, registerSchema);
    const rateKey = await hashToken(`auth:${requestIp(request)}:${input.username}`);
    await consumeRateLimit(rateKey, 15 * 60 * 1000, 10);
    const isAdminName = config.adminUserIdSet.has(input.username);
    let role: "user" | "admin" = "user";
    if (isAdminName) {
      if (!config.adminRegistrationToken) {
        throw new ApiError(403, "ADMIN_REGISTRATION_DISABLED", "관리자 등록이 비활성화되어 있습니다.");
      }
      if (input.adminToken !== config.adminRegistrationToken) {
        throw new ApiError(403, "ADMIN_REGISTRATION_TOKEN_INVALID", "관리자 등록 토큰이 올바르지 않습니다.");
      }
      role = "admin";
    }
    const user = await registerUser({
      username: input.username,
      passwordHash: await hashPassword(input.password),
      realName: input.realName,
      schoolName: input.schoolName,
      grade: input.grade,
      classNumber: input.classNumber,
      studentNumber: input.studentNumber,
      role
    });
    const token = createOpaqueToken();
    await createSession(
      user.id,
      await hashToken(token),
      new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000)
    );
    return json(
      { user },
      201,
      { "Set-Cookie": cookieHeader(request, token, config.sessionTtlDays * 24 * 60 * 60) }
    );
  }

  if (method === "POST" && path.join("/") === "auth/login") {
    const input = await parseBody(request, loginSchema);
    const rateKey = await hashToken(`auth:${requestIp(request)}:${input.username}`);
    await consumeRateLimit(rateKey, 15 * 60 * 1000, 10);
    const user = await findUserByUsername(input.username);
    if (!user) {
      await verifyPassword(await getDummyPasswordHash(), input.password);
      throw new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    if (!(await verifyPassword(user.password_hash, input.password))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    const token = createOpaqueToken();
    await createSession(
      user.id,
      await hashToken(token),
      new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000)
    );
    return empty(204, { "Set-Cookie": cookieHeader(request, token, config.sessionTtlDays * 24 * 60 * 60) });
  }

  if (method === "POST" && path.join("/") === "auth/logout") {
    await requireUser(request);
    const token = sessionToken(request);
    if (token) {
      await deleteSession(await hashToken(token));
    }
    return empty(204, { "Set-Cookie": clearCookieHeader(request) });
  }

  if (path.length === 1 && path[0] === "me") {
    const user = await requireUser(request);
    if (method === "GET") {
      return json({ user });
    }
    if (method === "DELETE") {
      await deleteUser(user.id);
      return empty(204, { "Set-Cookie": clearCookieHeader(request) });
    }
  }

  if (path.length === 1 && path[0] === "conversations") {
    const user = await requireUser(request);
    if (method === "GET") {
      return json({ conversations: await listConversations(user.id) });
    }
    if (method === "POST") {
      const input = await parseBody(request, conversationSchema);
      const conversation = await createConversation(
        user.id,
        input.title || "새 학습 대화",
        input.settings || defaultLearningSettings
      );
      return json({ conversation }, 201);
    }
  }

  if (path[0] === "conversations" && path.length === 2) {
    const user = await requireUser(request);
    const conversationId = conversationIdFrom(path[1]);
    if (method === "GET") {
      const url = new URL(request.url);
      const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50;
      const before = url.searchParams.get("before") || undefined;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (before && !uuidSchema.safeParse(before).success)) {
        throw new ApiError(400, "VALIDATION_ERROR", "입력 내용을 다시 확인해 주세요.");
      }
      return json(await getConversation(user.id, conversationId, { limit, before }));
    }
    if (method === "PATCH") {
      const { title } = await parseBody(request, titleSchema);
      return json({ conversation: await updateConversationTitle(user.id, conversationId, title) });
    }
    if (method === "DELETE") {
      await deleteConversation(user.id, conversationId);
      return empty();
    }
  }

  if (method === "POST" && path[0] === "conversations" && path.length === 3 && path[2] === "messages") {
    const user = await requireUser(request);
    const rateKey = await hashToken(`message:${user.id}`);
    await consumeRateLimit(rateKey, 10 * 60 * 1000, 30);
    const conversationId = conversationIdFrom(path[1]);
    const input = await parseBody(request, messageSchema);
    const context = await getConversationContext(user.id, conversationId);
    const provider = createChatProvider(config);
    await reserveUsage(user.id, config.aiDailyLimit);
    try {
      const generated = await provider.generateReply({
        question: input.question,
        settings: input.settings,
        conversation: context
      });
      const messages = await appendMessages({
        userId: user.id,
        conversationId,
        question: input.question,
        settings: input.settings,
        reply: generated.reply,
        provider: provider.name,
        model: provider.model
      });
      return json({ ...messages, usageLimit: config.aiDailyLimit }, 201);
    } catch (error) {
      await releaseUsage(user.id).catch((releaseError) => console.error(releaseError));
      throw error;
    }
  }

  throw new ApiError(404, "NOT_FOUND", "요청한 기능을 찾을 수 없습니다.");
};

export const handleApi = async (request: Request, path: string[]) => {
  try {
    return await handleRequest(request, path);
  } catch (error) {
    return errorResponse(error);
  }
};
