type ClientLogEvent = "browser.error" | "browser.unhandled_rejection" | "browser.api_failure";

interface ClientLogPayload {
  event: ClientLogEvent;
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  details?: Record<string, string>;
}

let initialized = false;

const asMessage = (value: unknown) => {
  if (value instanceof Error) {
    return { message: value.message || value.name, stack: value.stack };
  }
  return { message: typeof value === "string" ? value : "처리되지 않은 브라우저 오류" };
};

export const reportClientEvent = (payload: ClientLogPayload) => {
  if (typeof window === "undefined") {
    return;
  }
  const details = { browser: navigator.userAgent, ...payload.details };
  void fetch("/api/client-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({ ...payload, url: payload.url || window.location.href, details })
  }).catch(() => undefined);
};

export const initClientTelemetry = () => {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;
  window.addEventListener("error", (event) => {
    const error = asMessage(event.error || event.message);
    reportClientEvent({
      event: "browser.error",
      message: error.message,
      stack: error.stack,
      url: event.filename || window.location.href,
      line: event.lineno,
      column: event.colno
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const error = asMessage(event.reason);
    reportClientEvent({ event: "browser.unhandled_rejection", message: error.message, stack: error.stack });
  });
};
