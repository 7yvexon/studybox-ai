import { randomUUID } from "node:crypto";

import { defaultLearningSettings, normalizeAnswerLevel, type LearningSettings } from "@studybox/shared";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { z } from "zod";

import { createChatProvider } from "./ai/provider.js";
import { loginSchema, registerSchema } from "./auth/validation.js";
import { config } from "./config.js";
import {
  appendMessages,
  createConversation,
  createSession,
  deleteConversation,
  deleteSession,
  deleteUser,
  findUserByUsername,
  getConversation,
  getConversationContext,
  listConversations,
  registerUser,
  reserveUsage,
  updateConversationTitle,
  checkStorageReady
} from "./storage/index.js";
import { errorHandler, notFound, parseBody, ApiError } from "./lib/http.js";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./lib/security.js";
import { clearSessionCookie, requireAuth, requireSameOrigin, setSessionCookie } from "./middleware/auth.js";

const answerLevelSchema = z
  .enum(["middle1", "middle2", "middle3", "high1", "high2", "high3", "basic", "standard", "advanced"])
  .transform((value) => normalizeAnswerLevel(value) || defaultLearningSettings.level) as unknown as z.ZodType<
    LearningSettings["level"]
  >;

const learningSettingsSchema = z.object({
  mode: z.enum(["concept", "solve", "summary", "exam", "performance"]),
  level: answerLevelSchema,
  responseLength: z.enum(["short", "standard", "detailed"])
});

const defaultSettings: LearningSettings = defaultLearningSettings;

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
  const app = express();
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

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      provider: provider.name,
      storage: config.storageMode,
      timestamp: new Date().toISOString()
    });
  });

  app.get(
    "/api/ready",
    asyncRoute(async (_request, response) => {
      await checkStorageReady();
      response.json({ status: "ready", storage: config.storageMode });
    })
  );

  app.post(
    "/api/auth/register",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const input = parseBody(registerSchema, request);
      const user = await registerUser({
        username: input.username,
        passwordHash: await hashPassword(input.password),
        realName: input.realName,
        schoolName: input.schoolName,
        grade: input.grade,
        classNumber: input.classNumber,
        studentNumber: input.studentNumber,
        role: config.adminUserIdSet.has(input.username) ? "admin" : "user"
      });
      const token = createOpaqueToken();
      await createSession(
        user.id,
        hashToken(token),
        new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000)
      );
      setSessionCookie(response, token);
      response.status(201).json({ user });
    })
  );

  app.post(
    "/api/auth/login",
    requireSameOrigin,
    authLimiter,
    asyncRoute(async (request, response) => {
      const { username, password } = parseBody(loginSchema, request);
      const user = await findUserByUsername(username);

      if (!user || !(await verifyPassword(user.password_hash, password))) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
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
