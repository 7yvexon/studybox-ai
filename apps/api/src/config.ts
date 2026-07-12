import "dotenv/config";

import { z } from "zod";

const booleanFromEnvironment = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const configSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  storageMode: z.enum(["memory", "postgres"]).optional(),
  databaseUrl: z.string().min(1).default("postgresql://studybox:studybox@localhost:5432/studybox"),
  appOrigin: z.string().url().default("http://localhost:5173"),
  sessionCookieName: z.string().min(1).default("studybox_session"),
  sessionTtlDays: z.coerce.number().int().min(1).max(90).default(7),
  aiProvider: z.enum(["mock", "openai-compatible"]).default("mock"),
  aiDailyLimit: z.coerce.number().int().min(1).max(500).default(50),
  aiBaseUrl: z
    .string()
    .url()
    .default("https://api.openai.com/v1")
    .refine((url) => process.env.NODE_ENV !== "production" || url.startsWith("https://"), {
      message: "AI_BASE_URL must use HTTPS in production to protect the API key"
    }),
  aiModel: z.string().trim().default(""),
  aiApiKey: z.string().trim().optional(),
  aiTimeoutMs: z.coerce.number().int().min(1000).max(120000).default(30000),
  adminUserIds: z.string().default(""),
  adminRegistrationToken: z.string().trim().optional(),
  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  cookieSecure: booleanFromEnvironment
});

const parsed = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  storageMode: process.env.STORAGE_MODE,
  databaseUrl: process.env.DATABASE_URL,
  appOrigin: process.env.APP_ORIGIN,
  sessionCookieName: process.env.SESSION_COOKIE_NAME,
  sessionTtlDays: process.env.SESSION_TTL_DAYS,
  aiProvider: process.env.AI_PROVIDER,
  aiDailyLimit: process.env.AI_DAILY_LIMIT,
  aiBaseUrl: process.env.AI_BASE_URL,
  aiModel: process.env.AI_MODEL,
  aiApiKey: process.env.AI_API_KEY,
  aiTimeoutMs: process.env.AI_TIMEOUT_MS,
  adminUserIds: process.env.ADMIN_USER_IDS,
  adminRegistrationToken: process.env.ADMIN_REGISTRATION_TOKEN,
  logLevel: process.env.LOG_LEVEL,
  cookieSecure: process.env.COOKIE_SECURE
});

export const config = {
  ...parsed,
  storageMode: parsed.storageMode || (parsed.nodeEnv === "production" ? "postgres" : "memory"),
  cookieSecure: parsed.cookieSecure || parsed.nodeEnv === "production",
  adminUserIdSet: new Set(
    parsed.adminUserIds
      .split(",")
      .map((username) => username.trim().toLowerCase())
      .filter(Boolean)
  )
};

export type AppConfig = typeof config;
