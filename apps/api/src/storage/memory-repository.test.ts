import { beforeEach, describe, expect, it } from "vitest";

import {
  appendMessages,
  createConversation,
  createSession,
  findUserByUsername,
  getConversation,
  getCurrentUserBySession,
  listConversations,
  registerUser,
  reserveUsage,
  resetMemoryRepository
} from "./memory-repository.js";

const settings = { mode: "concept", level: "middle2", responseLength: "standard" } as const;

beforeEach(() => {
  resetMemoryRepository();
});

describe("memory repository", () => {
  it("supports signup, sessions, conversations, and messages without PostgreSQL", async () => {
    const user = await registerUser({
      username: "student01",
      passwordHash: "hashed-password",
      realName: "김학생",
      schoolName: "스터디중학교",
      grade: 2,
      classNumber: 3,
      studentNumber: 12,
      role: "user"
    });

    expect((await findUserByUsername("student01"))?.password_hash).toBe("hashed-password");

    await createSession(user.id, "session-hash", new Date(Date.now() + 60_000));
    expect((await getCurrentUserBySession("session-hash"))?.username).toBe("student01");

    const conversation = await createConversation(user.id, "광합성 공부", settings);
    const reply = {
      title: "빛을 에너지로 바꾸는 과정",
      summary: "광합성은 빛 에너지로 포도당을 만드는 과정이에요.",
      sections: [{ title: "핵심", content: "빛이 에너지원으로 쓰여요." }]
    };
    await appendMessages({
      userId: user.id,
      conversationId: conversation.id,
      question: "광합성을 설명해 줘",
      settings,
      reply,
      provider: "mock",
      model: "studybox-development-mock"
    });

    const stored = await getConversation(user.id, conversation.id);
    expect(stored.messages).toHaveLength(2);
    expect(stored.messages[1].response?.title).toBe(reply.title);
    expect((await listConversations(user.id))[0].lastMessagePreview).toContain("광합성");
  });

  it("enforces duplicate usernames and daily usage limits", async () => {
    const input = {
      username: "student01",
      passwordHash: "hashed-password",
      realName: "김학생",
      schoolName: "스터디중학교",
      grade: 2,
      classNumber: 3,
      studentNumber: 12,
      role: "user" as const
    };
    const user = await registerUser(input);

    await expect(registerUser(input)).rejects.toMatchObject({ code: "USERNAME_IN_USE" });
    await expect(reserveUsage(user.id, 1)).resolves.toBe(1);
    await expect(reserveUsage(user.id, 1)).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });
  });
});
