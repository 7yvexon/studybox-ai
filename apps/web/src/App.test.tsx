import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  it("keeps the interactive preview and sends learning into a separate authenticated workspace", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);
    renderAt("/");

    const preview = screen.getByRole("group", { name: "학습 답변 미리보기" });
    fireEvent.click(within(preview).getByRole("button", { name: "문제 풀이" }));

    expect(within(preview).getByRole("heading", { name: "곱해서 6, 더해서 -5가 되는 수 찾기" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "질문 시작하기" }));
    expect(await screen.findByRole("heading", { name: "다시 만나서 반가워요." })).toBeTruthy();
  });

  it("replays upward reveals after leaving and re-entering in either scroll direction", async () => {
    vi.stubGlobal("fetch", unauthenticatedFetch);

    class FakeIntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
      readonly elements = new Set<Element>();

      constructor(readonly callback: IntersectionObserverCallback) {
        observers.push(this);
      }

      observe(target: Element) {
        this.elements.add(target);
      }

      unobserve(target: Element) {
        this.elements.delete(target);
      }

      disconnect() {
        this.elements.clear();
      }

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    const observers: FakeIntersectionObserver[] = [];
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    renderAt("/");

    const revealTarget = document.querySelector(".product-section .page-reveal--product");
    const modeTarget = document.querySelector(".mode-flow__item");
    expect(revealTarget).toBeTruthy();
    expect(modeTarget).toBeTruthy();

    await waitFor(() => {
      expect(observers.some((observer) => observer.elements.has(revealTarget!))).toBe(true);
      expect(observers.some((observer) => observer.elements.has(modeTarget!))).toBe(true);
    });

    const trigger = (target: Element, isIntersecting: boolean) => {
      const observer = observers.find((candidate) => candidate.elements.has(target));
      expect(observer).toBeTruthy();
      act(() => {
        observer!.callback(
          [{ target, isIntersecting } as IntersectionObserverEntry],
          observer as unknown as IntersectionObserver
        );
      });
    };

    trigger(revealTarget!, true);
    trigger(modeTarget!, true);
    expect(revealTarget!.classList.contains("is-visible")).toBe(true);
    expect(modeTarget!.classList.contains("is-in-view")).toBe(true);

    trigger(revealTarget!, false);
    trigger(modeTarget!, false);
    expect(revealTarget!.classList.contains("is-visible")).toBe(false);
    expect(modeTarget!.classList.contains("is-in-view")).toBe(false);

    trigger(revealTarget!, true);
    trigger(modeTarget!, true);
    expect(revealTarget!.classList.contains("is-visible")).toBe(true);
    expect(modeTarget!.classList.contains("is-in-view")).toBe(true);
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
