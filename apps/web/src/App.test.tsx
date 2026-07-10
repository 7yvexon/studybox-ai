import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  it("connects the selected preview mode to the final learning settings", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    const preview = screen.getByRole("group", { name: "학습 답변 미리보기" });
    fireEvent.click(within(preview).getByRole("button", { name: "문제 풀이" }));

    expect(within(preview).getByRole("heading", { name: "곱해서 6, 더해서 -5가 되는 수 찾기" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "문제 풀이" }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect((screen.getByRole("radio", { name: "개념 설명" }) as HTMLInputElement).checked).toBe(true);
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
