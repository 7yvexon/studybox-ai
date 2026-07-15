import { config } from "./config";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  source: "worker" | "api" | "ai" | "browser";
  event: string;
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  actorId?: string;
  ipHash?: string;
  details?: unknown;
  content?: unknown;
}

const secretPatterns = [
  /(bearer\s+)[^\s,;]+/gi,
  /((?:password|token|secret|authorization|cookie)\s*[=:]\s*)[^\s,;]+/gi,
  /(sk-[a-z0-9_-]{8,})/gi
];

const redact = (value: string) => secretPatterns.reduce((result, pattern) => result.replace(pattern, "$1[REDACTED]"), value);

const sanitize = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redact(value);
  }
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message), stack: value.stack ? redact(value.stack) : undefined };
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) =>
        /password|token|secret|authorization|cookie|api.?key/i.test(key) ? [key, "[REDACTED]"] : [key, sanitize(nested)]
      )
    );
  }
  return value;
};

const serialize = (value: unknown) => (value === undefined ? null : JSON.stringify(sanitize(value)));

export const requestIdFrom = (request: Request) => request.headers.get("x-studybox-request-id") || undefined;

export const hashIp = async (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) {
    return undefined;
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
};

export const recordLog = async (entry: LogEntry) => {
  const database = config.db;
  if (!database) {
    return;
  }
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  await database.prepare("DELETE FROM observability_logs WHERE occurred_at < ?").bind(cutoff.toISOString()).run();
  await database
    .prepare(
      `INSERT INTO observability_logs (
        id, occurred_at, level, source, event, request_id, method, route, status, duration_ms, actor_id, ip_hash, details, content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      entry.level,
      entry.source,
      entry.event,
      entry.requestId || null,
      entry.method || null,
      entry.route || null,
      entry.status ?? null,
      entry.durationMs ?? null,
      entry.actorId || null,
      entry.ipHash || null,
      serialize(entry.details),
      serialize(entry.content)
    )
    .run();
};

export const recordLogSafely = (entry: LogEntry) =>
  recordLog(entry).catch((error) => console.error("observability_log_failed", sanitize(error)));

export const errorDetails = (error: unknown) => sanitize(error);
