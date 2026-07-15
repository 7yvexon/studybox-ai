import type { Conversation, CurrentUser, LearningSettings, Message } from "@studybox/shared";

import { reportClientEvent } from "./telemetry";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch (error) {
    reportClientEvent({
      event: "browser.api_failure",
      message: error instanceof Error ? error.message : "네트워크 요청에 실패했습니다.",
      stack: error instanceof Error ? error.stack : undefined,
      details: { method: options.method || "GET", path, kind: "network" }
    });
    throw error;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    const error = new ApiClientError(
      payload?.error?.message || "요청을 처리하지 못했습니다.",
      response.status,
      payload?.error?.code || "REQUEST_FAILED"
    );
    reportClientEvent({
      event: "browser.api_failure",
      message: error.message,
      details: { method: options.method || "GET", path, status: String(error.status), code: error.code }
    });
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const api = {
  getMe: () => request<{ user: CurrentUser }>("/api/me"),
  register: (input: {
    username: string;
    password: string;
    realName: string;
    schoolName: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  }) => request<{ user: CurrentUser }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: { username: string; password: string }) =>
    request<void>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  deleteAccount: () => request<void>("/api/me", { method: "DELETE" }),
  listConversations: () => request<{ conversations: Conversation[] }>("/api/conversations"),
  createConversation: (input: { title?: string; settings?: LearningSettings }) =>
    request<{ conversation: Conversation }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getConversation: (id: string, options: { before?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (options.before) {
      query.set("before", options.before);
    }
    if (options.limit) {
      query.set("limit", String(options.limit));
    }
    const suffix = query.size ? `?${query.toString()}` : "";
    return request<{ conversation: Conversation; messages: Message[]; nextCursor: string | null }>(
      `/api/conversations/${encodeURIComponent(id)}${suffix}`
    );
  },
  updateConversation: (id: string, title: string) =>
    request<{ conversation: Conversation }>(`/api/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    }),
  deleteConversation: (id: string) =>
    request<void>(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sendMessage: (id: string, input: { question: string; settings: LearningSettings }) =>
    request<{ userMessage: Message; assistantMessage: Message; usageLimit: number }>(
      `/api/conversations/${encodeURIComponent(id)}/messages`,
      { method: "POST", body: JSON.stringify(input) }
    )
};
