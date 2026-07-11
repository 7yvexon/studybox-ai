import type { Conversation, CurrentUser, LearningSettings, Message } from "@studybox/shared";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
  }
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers, credentials: "include" });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new ApiClientError(
      payload?.error?.message || "요청을 처리하지 못했습니다.",
      response.status,
      payload?.error?.code || "REQUEST_FAILED"
    );
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
  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`),
  updateConversation: (id: string, title: string) =>
    request<{ conversation: Conversation }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    }),
  deleteConversation: (id: string) => request<void>(`/api/conversations/${id}`, { method: "DELETE" }),
  sendMessage: (id: string, input: { question: string; settings: LearningSettings }) =>
    request<{ userMessage: Message; assistantMessage: Message; usageLimit: number }>(
      `/api/conversations/${id}/messages`,
      { method: "POST", body: JSON.stringify(input) }
    )
};
