import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import type { ChatProvider, GenerateReplyInput, GenerateReplyResult } from "@studybox/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { resetMemoryRepository } from "./storage/memory-repository.js";

const settings = { mode: "concept", level: "middle2", responseLength: "standard" } as const;

describe("API message flow", () => {
  let server: Server | null = null;

  beforeEach(() => {
    resetMemoryRepository();
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
      server = null;
    }
  });

  it("does not consume the daily limit when reply generation fails", async () => {
    let failNextReply = true;
    const provider: ChatProvider = {
      name: "test",
      model: "test-model",
      generateReply: async (_input: GenerateReplyInput): Promise<GenerateReplyResult> => {
        if (failNextReply) {
          failNextReply = false;
          throw new Error("provider unavailable");
        }
        return {
          reply: {
            title: "학습 답변",
            summary: "정상적으로 생성된 답변입니다.",
            sections: [{ title: "핵심", content: "핵심 내용입니다." }]
          },
          rawContent: "{}"
        };
      }
    };
    const app = createApp({ chatProvider: provider, aiDailyLimit: 1 });
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once("listening", resolve));
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };

    const register = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        username: "student01",
        password: "secure-password",
        realName: "김학생",
        schoolName: "스터디중학교",
        grade: 2,
        classNumber: 3,
        studentNumber: 12
      })
    });
    const cookie = register.headers.get("set-cookie")?.split(";")[0];
    expect(register.status).toBe(201);
    expect(cookie).toBeTruthy();

    const authenticatedHeaders = { ...headers, Cookie: cookie! };
    const created = await fetch(`${baseUrl}/api/conversations`, {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({ settings })
    });
    const { conversation } = (await created.json()) as { conversation: { id: string } };

    const send = (question: string) =>
      fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ question, settings })
      });

    expect((await send("첫 질문")).status).toBe(500);
    expect((await send("두 번째 질문")).status).toBe(201);
  });
});
