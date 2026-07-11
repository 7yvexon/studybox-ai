import { describe, expect, it } from "vitest";

import { MockChatProvider } from "./mock-provider.js";

describe("MockChatProvider", () => {
  it("returns a learning-mode-shaped reply", async () => {
    const provider = new MockChatProvider();
    const result = await provider.generateReply({
      question: "광합성 과정을 설명해 줘",
      settings: { mode: "concept", level: "middle1", responseLength: "short" },
      conversation: []
    });

    expect(result.reply.sections).toHaveLength(2);
    expect(result.reply.title).toContain("광합성");
  });
});
