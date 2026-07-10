import { randomUUID } from "node:crypto";

import type { LearningSettings } from "@studybox/shared";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { z } from "zod";

import { createChatProvider } from "./ai/provider.js";
import { config } from "./config.js";
import { query } from "./db/index.js";
import {
  appendMessages,
  consumeAuthToken,
  createAuthToken,
  createConversation,
  createSession,
  deleteConversation,
  deleteSession,
  deleteUser,
  findUserByEmail,
  getConversation,
  getConversationContext,
  listConversations,
  markEmailVerified,
  registerUser,
  reserveUsage,
  updateConversationTitle,
  updatePassword
} from "./db/repository.js";
import { createEmailService } from "./email/service.js";
import { errorHandler, notFound, parseBody, ApiError } from "./lib/http.js";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./lib/security.js";
import { clearSessionCookie, requireAuth, requireSameOrigin, setSessionCookie } from "./middleware/auth.js";

const learningSettingsSchema = z.object({
  mode: z.enum(["concept", "solve", "summary", "exam", "performance"]),
  level: z.enum(["basic", "standard", "advanced"]),
  responseLength: z.enum(["short", "standard", "detailed"])
});

const defaultSettings: LearningSettings = {
  mode: "concept",
  level: "standard",
  responseLength: "standard"
};

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  inviteCode: z.string().trim().min(8).max(120)
});

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
const tokenSchema = z.object({ token: z.string().min(32).max(200) });
const resetSchema = tokenSchema.extend({ password: passwordSchema });
const conversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  settings: learningSettingsSchema.optional()
});
const titleSchema = z.object({ title: z.string().trim().min(1).max(120) });
const messageSchema = z.object({ question: z.string().trim().min(1).max(2000), settings: learningSettingsSchema });

const asyncRoute = (handler: (request: Request, response: Response) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };

const getUser = (request: Request) => {
  if (!request.user) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  return request.user;
};

const getConversationId = (request: Request) => {
  const value = request.params.conversationId;

  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_CONVERSATION_ID", "대화 식별자가 올바르지 않습니다.");
  }

  return value;
};

export const createApp = () => {
  const logger = pino({ level: config.logLevel });
  const provider = createChatProvider(config);
  const emailService = createEmailService(config, logger);
  const app = express();
  const appOrigin = new URL(config.appOrigin).origin;
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "AUTH_RATE_LIMIT", message: "잠시 후 다시 시도해 주세요." } }
  });
  const messageLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (request) => request.user?.id || request.ip || "unknown",
    message: { error: { code: "MESSAGE_RATE_LIMIT", message: "잠시 후 다시 시도해 주세요." } }
  });

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => request.id || randomUUID(),
      redact: ["req.headers.cookie", "req.headers.authorization"]
    })
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-origin" } }));
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());

  const sendTokenEmail = async (
    userId: string,
    email: string,
    purpose: "verify_email" | "reset_password"
  ) => {
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await createAuthToken(userId, hashToken(token), purpose, expiresAt);
    const route = purpose === "verify_email" ? "verify-email" : "reset-password";
    const subject = purpose === "verify_email" ? "StudyBox AI 이메일 인증" : "StudyBox AI 비밀번호 재설정";
    const text = `${appOrigin}/${route}?token=${encodeURIComponent(token)}\n이 링크는 1시간 동안 유효합니다.`;
    await emailService.send({ to: email, subject, text });
  };

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", provider: provider.name, timestamp: new Date().toISOString() });
  });

  app.get(
    "/api/ready",
    asyncRoute(async (_request, response) => {
      await query("SELECT 1");
      response.json({ status: "ready" });
    })
  );

  app.post(
    "/api/auth/register",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const input = parseBody(registerSchema, request);
      const user = await registerUser({
        email: input.email,
        passwordHash: await hashPassword(input.password),
        inviteHash: hashToken(input.inviteCode),
        role: config.adminEmailSet.has(input.email) ? "admin" : "user"
      });
      await sendTokenEmail(user.id, user.email, "verify_email");
      response.status(201).json({ message: "인증 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요." });
    })
  );

  app.post(
    "/api/auth/verify-email",
    requireSameOrigin,
    asyncRoute(async (request, response) => {
      const { token } = parseBody(tokenSchema, request);
      const userId = await consumeAuthToken(hashToken(token), "verify_email");

      if (!userId) {
        throw new ApiError(400, "INVALID_TOKEN", "인증 링크가 유효하지 않거나 만료되었습니다.");
      }

      await markEmailVerified(userId);
      response.status(204).end();
    })
  );

  app.post(
    "/api/auth/login",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const { email, password } = parseBody(loginSchema, request);
      const user = await findUserByEmail(email);

      if (!user || !(await verifyPassword(user.password_hash, password))) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
      }

      if (!user.email_verified_at) {
        throw new ApiError(403, "EMAIL_NOT_VERIFIED", "이메일 인증을 먼저 완료해 주세요.");
      }

      const token = createOpaqueToken();
      await createSession(
        user.id,
        hashToken(token),
        new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000)
      );
      setSessionCookie(response, token);
      response.status(204).end();
    })
  );

  app.post(
    "/api/auth/logout",
    requireSameOrigin,
    requireAuth,
    asyncRoute(async (request, response) => {
      const token = request.cookies?.[config.sessionCookieName];

      if (typeof token === "string") {
        await deleteSession(hashToken(token));
      }

      clearSessionCookie(response);
      response.status(204).end();
    })
  );

  app.post(
    "/api/auth/forgot-password",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const { email } = parseBody(z.object({ email: emailSchema }), request);
      const user = await findUserByEmail(email);

      if (user?.email_verified_at) {
        await sendTokenEmail(user.id, user.email, "reset_password");
      }

      response.status(204).end();
    })
  );

  app.post(
    "/api/auth/reset-password",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const { token, password } = parseBody(resetSchema, request);
      const userId = await consumeAuthToken(hashToken(token), "reset_password");

      if (!userId) {
        throw new ApiError(400, "INVALID_TOKEN", "재설정 링크가 유효하지 않거나 만료되었습니다.");
      }

      await updatePassword(userId, await hashPassword(password));
      response.status(204).end();
    })
  );

  app.get("/api/me", requireAuth, (request, response) => {
    response.json({ user: getUser(request) });
  });

  app.delete(
    "/api/me",
    requireSameOrigin,
    requireAuth,
    asyncRoute(async (request, response) => {
      await deleteUser(getUser(request).id);
      clearSessionCookie(response);
      response.status(204).end();
    })
  );

  app.get(
    "/api/conversations",
    requireAuth,
    asyncRoute(async (request, response) => {
      response.json({ conversations: await listConversations(getUser(request).id) });
    })
  );

  app.post(
    "/api/conversations",
    requireSameOrigin,
    requireAuth,
    asyncRoute(async (request, response) => {
      const input = parseBody(conversationSchema, request);
      const conversation = await createConversation(
        getUser(request).id,
        input.title || "새 학습 대화",
        input.settings || defaultSettings
      );
      response.status(201).json({ conversation });
    })
  );

  app.get(
    "/api/conversations/:conversationId",
    requireAuth,
    asyncRoute(async (request, response) => {
      response.json(await getConversation(getUser(request).id, getConversationId(request)));
    })
  );

  app.patch(
    "/api/conversations/:conversationId",
    requireSameOrigin,
    requireAuth,
    asyncRoute(async (request, response) => {
      const { title } = parseBody(titleSchema, request);
      const conversation = await updateConversationTitle(
        getUser(request).id,
        getConversationId(request),
        title
      );
      response.json({ conversation });
    })
  );

  app.delete(
    "/api/conversations/:conversationId",
    requireSameOrigin,
    requireAuth,
    asyncRoute(async (request, response) => {
      await deleteConversation(getUser(request).id, getConversationId(request));
      response.status(204).end();
    })
  );

  app.post(
    "/api/conversations/:conversationId/messages",
    requireSameOrigin,
    requireAuth,
    messageLimiter,
    asyncRoute(async (request, response) => {
      const input = parseBody(messageSchema, request);
      const user = getUser(request);
      const conversationId = getConversationId(request);
      const context = await getConversationContext(user.id, conversationId);
      await reserveUsage(user.id, config.aiDailyLimit);
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
      response.status(201).json({ ...messages, usageLimit: config.aiDailyLimit });
    })
  );

  app.use(notFound);
  app.use((error: unknown, request: Request, response: Response, next: NextFunction) => {
    if (!(error instanceof ApiError)) {
      request.log.error({ error }, "request failed");
    }
    errorHandler(error, request, response, next);
  });

  return app;
};
