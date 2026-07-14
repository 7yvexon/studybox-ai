import { afterEach, describe, expect, it, vi } from "vitest";

import { config, parseAiFallbackModels } from "../config.js";
import { OpenAiCompatibleChatProvider } from "./openai-compatible-provider.js";

describe("OpenAiCompatibleChatProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes fallback model environment values", () => {
    expect(
      parseAiFallbackModels(
        " google/gemma-4-31b-it:free, ,qwen/qwen3-next-80b-a3b-instruct:free,openai/gpt-oss-20b:free ",
        "qwen/qwen3-next-80b-a3b-instruct:free"
      )
    ).toEqual(["google/gemma-4-31b-it:free", "openai/gpt-oss-20b:free"]);
  });

  it("sends OpenRouter fallback models in priority order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "학습 답변",
                  summary: "핵심 내용을 설명합니다.",
                  sections: [{ title: "핵심", content: "핵심 내용입니다." }]
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAiCompatibleChatProvider({
      ...config,
      aiProvider: "openai-compatible",
      aiBaseUrl: "https://openrouter.ai/api/v1",
      aiModel: "qwen/qwen3-next-80b-a3b-instruct:free",
      aiFallbackModels: [
        "google/gemma-4-31b-it:free",
        "openai/gpt-oss-20b:free",
        "qwen/qwen3.5-flash-02-23",
        "deepseek/deepseek-v3.2"
      ],
      aiApiKey: "test-key"
    });

    await provider.generateReply({
      question: "광합성을 설명해 줘",
      settings: { mode: "concept", level: "middle1", responseLength: "short" },
      conversation: []
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        body: expect.stringContaining('"models":["google/gemma-4-31b-it:free","openai/gpt-oss-20b:free","qwen/qwen3.5-flash-02-23"]')
      })
    );
  });

  it("retries remaining fallback models after OpenRouter rejects every initial model", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "all initial models unavailable" } }), { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: "학습 답변",
                    summary: "핵심 내용을 설명합니다.",
                    sections: [{ title: "핵심", content: "핵심 내용입니다." }]
                  })
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAiCompatibleChatProvider({
      ...config,
      aiProvider: "openai-compatible",
      aiBaseUrl: "https://openrouter.ai/api/v1",
      aiModel: "qwen/qwen3-next-80b-a3b-instruct:free",
      aiFallbackModels: [
        "google/gemma-4-31b-it:free",
        "openai/gpt-oss-20b:free",
        "qwen/qwen3.5-flash-02-23",
        "deepseek/deepseek-v3.2"
      ],
      aiApiKey: "test-key"
    });

    await provider.generateReply({
      question: "광합성을 설명해 줘",
      settings: { mode: "concept", level: "middle1", responseLength: "short" },
      conversation: []
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        body: expect.stringContaining('"model":"deepseek/deepseek-v3.2"')
      })
    );
  });
});
