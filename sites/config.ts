import { env } from "cloudflare:workers";

interface SitesEnv {
  DB: D1Database;
  AI_PROVIDER?: string;
  AI_DAILY_LIMIT?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_FALLBACK_MODELS?: string;
  AI_API_KEY?: string;
  AI_TIMEOUT_MS?: string;
  SESSION_COOKIE_NAME?: string;
  SESSION_TTL_DAYS?: string;
  ADMIN_USER_IDS?: string;
  ADMIN_REGISTRATION_TOKEN?: string;
}

const bindings = env as unknown as SitesEnv;

const boundedInteger = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

const model = bindings.AI_MODEL?.trim() || "";

export const config = {
  db: bindings.DB,
  aiProvider: bindings.AI_PROVIDER === "openai-compatible" ? "openai-compatible" : "mock",
  aiDailyLimit: boundedInteger(bindings.AI_DAILY_LIMIT, 50, 1, 500),
  aiBaseUrl: bindings.AI_BASE_URL?.trim() || "https://api.openai.com/v1",
  aiModel: model,
  aiFallbackModels: (bindings.AI_FALLBACK_MODELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value && value !== model),
  aiApiKey: bindings.AI_API_KEY?.trim(),
  aiTimeoutMs: boundedInteger(bindings.AI_TIMEOUT_MS, 30000, 1000, 120000),
  sessionCookieName: bindings.SESSION_COOKIE_NAME?.trim() || "studybox_session",
  sessionTtlDays: boundedInteger(bindings.SESSION_TTL_DAYS, 7, 1, 90),
  adminUserIdSet: new Set(
    (bindings.ADMIN_USER_IDS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  ),
  adminRegistrationToken: bindings.ADMIN_REGISTRATION_TOKEN?.trim()
};

export type SitesConfig = typeof config;
