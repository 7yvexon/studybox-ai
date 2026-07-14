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
  settings: { mode: "concept" as const, level: "middle2" as const, responseLength: "standard" as const },
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
  lastMessagePreview: null
};

const newConversation = {
  ...conversation,
  id: "conversation-new",
  title: "새 학습"
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

const createRecentConversationFetch = ({
  conversations = [conversation],
  listStatus = 200
}: {
  conversations?: typeof conversation[];
  listStatus?: number;
} = {}) =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/me") {
      return response(200, { user: currentUser });
    }

    if (url === "/api/conversations" && init?.method === "POST") {
      return response(201, { conversation: newConversation });
    }

    if (url === "/api/conversations") {
      return listStatus === 200
        ? response(200, { conversations })
        : response(listStatus, { error: { code: "REQUEST_FAILED", message: "요청에 실패했습니다." } });
    }

    if (url === `/api/conversations/${conversation.id}`) {
      return response(200, { conversation, messages: [] });
    }

    if (url === `/api/conversations/${newConversation.id}`) {
      return response(200, { conversation: newConversation, messages: [] });
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
  it("offers a practical product-led start screen and sends learning into a separate authenticated workspace", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: /질문을 이해로, 이해를 실력으로/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /먼저 둘러보기/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: "StudyBox AI 실제 학습 대화 화면 미리보기" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "StudyBox AI의 학습 방식" })).toBeTruthy();
    expect(document.querySelectorAll(".deep-hero-principles li")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /학습 시작하기/ }));
    expect(await screen.findByRole("heading", { name: "다시 만나서 반가워요." })).toBeTruthy();
  });

  it("keeps every lower introduction section and marks content for simple rise reveals", () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    const landing = document.querySelector(".landing-page");
    expect(landing?.classList.contains("landing-page--static")).toBe(true);
    expect(document.querySelector(".site-scroll-progress")).toBeNull();
    expect(document.querySelector("#story")).toBeTruthy();
    expect(document.querySelector("#product-tour")).toBeTruthy();
    expect(document.querySelector("#categories")).toBeTruthy();
    expect(document.querySelector("#how-it-works")).toBeNull();
    expect(document.querySelector("#learning-app")).toBeTruthy();
    expect(document.querySelectorAll(".scroll-rise").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".scene-stack")).toHaveLength(3);
    expect(document.querySelector(".answer-blueprint")).toBeTruthy();
    expect(document.querySelectorAll(".learning-method__steps li")).toHaveLength(4);
    expect(document.querySelector(".deep-home__visual")).toBeNull();
    expect(document.querySelector(".kinetic-story__photo")).toBeNull();
  });

  it("opens the most recently updated conversation from the signed-in home header", async () => {
    let resolveConversationList: (value: Response) => void;
    const conversationList = new Promise<Response>((resolve) => {
      resolveConversationList = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/me") {
        return response(200, { user: currentUser });
      }

      if (url === "/api/conversations") {
        return conversationList;
      }

      if (url === `/api/conversations/${conversation.id}`) {
        return response(200, { conversation, messages: [] });
      }

      return response(404, { error: { code: "NOT_FOUND", message: "찾을 수 없습니다." } });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/");

    const recentConversation = await screen.findByRole("button", { name: "최근 대화" }) as HTMLButtonElement;
    fireEvent.click(recentConversation);

    expect(recentConversation.disabled).toBe(true);
    expect(recentConversation.getAttribute("aria-busy")).toBe("true");
    expect(recentConversation.textContent).toBe("불러오는 중…");

    resolveConversationList!(response(200, { conversations: [conversation] }));

    expect(await screen.findByRole("button", { name: "작업 공간 메뉴 열기" })).toBeTruthy();
  });

  it("starts a new conversation when the signed-in user has no previous conversations", async () => {
    const fetchMock = createRecentConversationFetch({ conversations: [] });
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/");

    fireEvent.click(await screen.findByRole("button", { name: "최근 대화" }));

    expect(await screen.findByRole("button", { name: "작업 공간 메뉴 열기" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/conversations" && init?.method === "POST")).toBe(true);
  });

  it("starts a new conversation when recent-conversation lookup fails", async () => {
    const fetchMock = createRecentConversationFetch({ listStatus: 500 });
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/");

    fireEvent.click(await screen.findByRole("button", { name: "최근 대화" }));

    expect(await screen.findByRole("button", { name: "작업 공간 메뉴 열기" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/conversations" && init?.method === "POST")).toBe(true);
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

  it("keeps open registration requirements inside the redesigned setup", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/register");

    await screen.findByRole("heading", { name: "내 공부를 위한 계정을 만들어요." });
    const username = screen.getByLabelText("아이디") as HTMLInputElement;
    const password = screen.getByLabelText("새 비밀번호") as HTMLInputElement;

    expect(screen.getByRole("list", { name: "가입 단계" })).toBeTruthy();
    expect(screen.queryByLabelText("초대 코드")).toBeNull();
    expect(username.required).toBe(true);
    expect(username.pattern).toBe("[a-z0-9_]{4,20}");
    expect(password.minLength).toBe(12);
  });

  it("exposes a Codex-style mobile workspace and grade-based answer level", async () => {
    vi.stubGlobal("fetch", authenticatedFetch);
    renderAt("/app/conversation-1");

    const toggle = await screen.findByRole("button", { name: "작업 공간 메뉴 열기" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("button", { name: "작업 공간 메뉴 닫기" }).length).toBeGreaterThan(0);

    const answerLevel = screen.getByLabelText("답변 수준") as HTMLSelectElement;
    expect(answerLevel.value).toBe("middle2");
    fireEvent.change(answerLevel, { target: { value: "high3" } });
    expect(answerLevel.value).toBe("high3");

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "보내기" }) as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
