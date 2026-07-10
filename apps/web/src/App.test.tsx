import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";
import { AuthProvider } from "./auth";

const response = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }) as Response;

const unauthenticatedFetch = vi.fn(async () =>
  response(401, { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } })
);

const currentUser = {
  id: "user-1",
  username: "student01",
  realName: "김학생",
  schoolName: "스터디중학교",
  grade: 2,
  classNumber: 3,
  studentNumber: 12,
  role: "user" as const,
  createdAt: "2026-07-10T00:00:00.000Z"
};

const conversation = {
  id: "conversation-1",
  title: "광합성 공부",
  settings: { mode: "concept" as const, level: "standard" as const, responseLength: "standard" as const },
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
  lastMessagePreview: null
};

const userMessage = {
  id: "message-user-1",
  conversationId: conversation.id,
  role: "user" as const,
  content: "이차방정식 풀이 과정을 알려줘",
  settings: conversation.settings,
  response: null,
  provider: null,
  model: null,
  createdAt: "2026-07-10T00:01:00.000Z"
};

const assistantMessage = {
  id: "message-assistant-1",
  conversationId: conversation.id,
  role: "assistant" as const,
  content: "인수분해로 풀이합니다.",
  settings: conversation.settings,
  response: {
    title: "인수분해로 차근차근 풀어요",
    summary: "곱해서 6, 더해서 -5가 되는 두 수를 찾습니다.",
    sections: [{ title: "풀이", content: "(x-2)(x-3)=0으로 정리합니다." }]
  },
  provider: "mock",
  model: "mock-studybox-v1",
  createdAt: "2026-07-10T00:01:01.000Z"
};

const authenticatedFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);

  if (url === "/api/me") {
    return response(200, { user: currentUser });
  }

  if (url === "/api/conversations/conversation-1") {
    return response(200, { conversation, messages: [] });
  }

  if (url === "/api/conversations") {
    return response(200, { conversations: [conversation] });
  }

  return response(404, { error: { code: "NOT_FOUND", message: "찾을 수 없습니다." } });
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("StudyBox web experience", () => {
  it("switches learning agents and fills the composer from an example", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    await screen.findByRole("heading", { name: "공부할 일을 맡겨보세요." });
    const solveAgent = screen.getByRole("button", { name: /풀이 코치/ });
    const summaryAgent = screen.getByRole("button", { name: /요약 코치/ });

    expect(solveAgent.getAttribute("aria-pressed")).toBe("true");
    expect(summaryAgent.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(summaryAgent);

    expect(summaryAgent.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("선택한 요약 코치가 최적의 방식으로 도와줄게요.")).toBeTruthy();

    const example = screen.getByRole("button", { name: /조선 후기 경제 변화를 핵심만 요약해 줘/ });
    fireEvent.click(example);

    expect((screen.getByRole("textbox", { name: "문제나 궁금한 내용" }) as HTMLTextAreaElement).value)
      .toBe("조선 후기 경제 변화를 핵심만 요약해 줘");
  });

  it("keeps keyboard input behavior and carries a trimmed question into login", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    const question = await screen.findByRole("textbox", { name: "문제나 궁금한 내용" }) as HTMLTextAreaElement;
    const submit = screen.getByRole("button", { name: "시작하기" }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
    fireEvent.change(question, { target: { value: "  이차방정식 풀이 과정을 알려줘  " } });
    expect(submit.disabled).toBe(false);

    fireEvent.keyDown(question, { key: "Enter", shiftKey: true });
    expect(window.sessionStorage.getItem("studybox-pending-question")).toBeNull();

    fireEvent.keyDown(question, { key: "Enter", isComposing: true });
    expect(window.sessionStorage.getItem("studybox-pending-question")).toBeNull();

    fireEvent.keyDown(question, { key: "Enter" });

    expect(window.sessionStorage.getItem("studybox-pending-question"))
      .toBe("이차방정식 풀이 과정을 알려줘");
    expect(await screen.findByRole("heading", { name: "다시 만나서 반가워요." })).toBeTruthy();
  });

  it("automatically sends a pending question exactly once", async () => {
    window.sessionStorage.setItem("studybox-pending-question", userMessage.content);
    const automaticFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === `/api/conversations/${conversation.id}/messages` && init?.method === "POST") {
        return response(200, { userMessage, assistantMessage, usageLimit: 49 });
      }

      return authenticatedFetch(input);
    });
    vi.stubGlobal("fetch", automaticFetch);

    renderAt(`/app/${conversation.id}`);

    expect(await screen.findByRole("heading", { name: "인수분해로 차근차근 풀어요" })).toBeTruthy();
    expect(window.sessionStorage.getItem("studybox-pending-question")).toBeNull();
    expect(automaticFetch.mock.calls.filter(([input]) => String(input).endsWith("/messages"))).toHaveLength(1);
    expect((screen.getByRole("textbox", { name: "추가 질문" }) as HTMLTextAreaElement).value).toBe("");
  });

  it("restores a pending question when automatic sending fails", async () => {
    window.sessionStorage.setItem("studybox-pending-question", userMessage.content);
    const failedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === `/api/conversations/${conversation.id}/messages` && init?.method === "POST") {
        return response(500, { error: { code: "AI_FAILED", message: "답변을 준비하지 못했습니다." } });
      }

      return authenticatedFetch(input);
    });
    vi.stubGlobal("fetch", failedFetch);

    renderAt(`/app/${conversation.id}`);

    expect((await screen.findByRole("alert")).textContent).toContain("답변을 준비하지 못했습니다.");
    expect((screen.getByRole("textbox", { name: "추가 질문" }) as HTMLTextAreaElement).value)
      .toBe(userMessage.content);
    expect(window.sessionStorage.getItem("studybox-pending-question")).toBeNull();
  });

  it("keeps login input behavior and validation attributes", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/login");

    await screen.findByRole("heading", { name: "다시 만나서 반가워요." });
    const username = screen.getByLabelText("아이디") as HTMLInputElement;
    const password = screen.getByLabelText("비밀번호") as HTMLInputElement;

    fireEvent.change(username, { target: { value: "STUDENT_01" } });

    expect(username.value).toBe("student_01");
    expect(username.required).toBe(true);
    expect(password.required).toBe(true);
  });

  it("exposes an accessible mobile settings toggle and disabled empty composer", async () => {
    vi.stubGlobal("fetch", authenticatedFetch);
    renderAt("/app/conversation-1");

    const toggle = await screen.findByRole("button", { name: "학습 설정 열기" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "학습 설정 닫기" })).toBeTruthy();

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "보내기" }) as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
