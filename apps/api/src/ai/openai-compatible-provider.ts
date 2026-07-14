import type { ChatProvider, GenerateReplyInput, GenerateReplyResult } from "@studybox/shared";
import { z } from "zod";

import type { AppConfig } from "../config.js";
import { ApiError } from "../lib/http.js";
import { buildSystemPrompt } from "./prompts.js";

const replySchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  sections: z
    .array(z.object({ title: z.string().min(1).max(160), content: z.string().min(1).max(6000) }))
    .min(1)
    .max(4)
});

const completionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string().min(1) })
    })
  ).min(1)
});

const removeCodeFence = (value: string) =>
  value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

export class OpenAiCompatibleChatProvider implements ChatProvider {
  readonly name = "openai-compatible";
  readonly model: string;

  constructor(private readonly appConfig: AppConfig) {
    if (!appConfig.aiApiKey || !appConfig.aiModel) {
      throw new Error("AI_PROVIDER=openai-compatible requires AI_API_KEY and AI_MODEL.");
    }

    this.model = appConfig.aiModel;
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const attempts = [
      { model: this.appConfig.aiModel, fallbackModels: this.appConfig.aiFallbackModels.slice(0, 3) },
      ...this.appConfig.aiFallbackModels.slice(3).map((model) => ({ model, fallbackModels: [] }))
    ];
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        return await this.generateReplyForModels(input, attempt.model, attempt.fallbackModels);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof ApiError) {
      throw lastError;
    }

    throw new ApiError(502, "AI_PROVIDER_ERROR", "AI 답변을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  private async generateReplyForModels(
    input: GenerateReplyInput,
    model: string,
    fallbackModels: string[]
  ): Promise<GenerateReplyResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.appConfig.aiTimeoutMs);

    try {
      const response = await fetch(`${this.appConfig.aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.appConfig.aiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          ...(fallbackModels.length > 0
            ? { models: fallbackModels }
            : {}),
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(input.settings) },
            ...input.conversation.map((message) => ({
              role: message.role === "assistant" ? "assistant" : "user",
              content: message.role === "assistant" ? message.response?.summary || message.content : message.content
            })),
            { role: "user", content: input.question }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ApiError(502, "AI_PROVIDER_ERROR", "AI 답변을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const payload = completionSchema.parse(await response.json());
      const rawContent = payload.choices[0].message.content;
      const reply = replySchema.parse(JSON.parse(removeCodeFence(rawContent)));

      return { reply, rawContent };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(502, "AI_PROVIDER_ERROR", "AI 답변을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
