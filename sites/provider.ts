import type {
  ChatProvider,
  GenerateReplyInput,
  GenerateReplyResult,
  LearningMode,
  LearningSettings
} from "@studybox/shared";
import { z } from "zod";

import type { SitesConfig } from "./config";
import { ApiError } from "./errors";

const modeTitles = {
  concept: ["쉬운 설명", "예시와 연결", "핵심 용어", "한 줄 정리"],
  solve: ["조건 먼저 읽기", "풀이 전략", "단계별 풀이", "실수 점검"],
  summary: ["핵심 내용", "핵심 키워드", "내용 구조", "빠른 복습"],
  exam: ["암기 포인트", "예상 문제", "답안 점검", "시험 직전 확인"],
  performance: ["조건 분석", "주제 방향", "개요 만들기", "제출 전 점검"]
} as const;

const levelGuide = {
  middle1: "중학교 1학년이 이해할 수 있는 쉬운 용어와 생활 속 예시부터 확인해 보세요.",
  middle2: "중학교 2학년 교과 수준에서 핵심 개념의 원인과 결과를 순서대로 연결해 보세요.",
  middle3: "중학교 3학년 교과 수준에서 개념 사이의 관계와 다음 과정의 기초까지 연결해 보세요.",
  high1: "고등학교 1학년 공통 과목 수준에서 개념과 공식이 성립하는 이유를 설명해 보세요.",
  high2: "고등학교 2학년 선택 과목 수준에서 자료와 공식의 해석을 세부 개념과 연결해 보세요.",
  high3: "고등학교 3학년 및 수능 수준에서 조건, 예외, 문제 적용까지 함께 점검해 보세요."
} as const;

const modeInstructions: Record<LearningMode, string> = {
  concept: "어려운 용어를 먼저 쉬운 말로 풀고, 일상적인 예시와 한 줄 핵심 정리를 포함합니다.",
  solve: "정답만 제시하지 말고 조건 분석, 전략, 단계별 풀이, 실수 점검을 순서대로 제공합니다.",
  summary: "중요도에 따라 핵심 정보와 키워드를 압축하고 빠르게 복습할 수 있게 구조화합니다.",
  exam: "암기 포인트, 예상 질문, 답안 점검, 시험 직전 확인 항목을 우선합니다.",
  performance: "수행 조건, 주제 방향, 개요, 제출 전 점검을 중심으로 스스로 완성하도록 돕습니다."
};

const levelInstructions = {
  middle1: "중학교 1학년 교과 수준에 맞춰 낯선 용어를 먼저 정의하고 일상적인 예시로 설명합니다.",
  middle2: "중학교 2학년 교과 수준의 용어를 사용하되 핵심 원리와 원인·결과를 단계적으로 연결합니다.",
  middle3: "중학교 3학년 교과 수준에 맞춰 개념 간 관계와 고등학교 과정으로 이어지는 기초를 함께 설명합니다.",
  high1: "고등학교 1학년 공통 과목 수준에 맞춰 개념, 근거, 공식이 연결되는 이유를 분명히 설명합니다.",
  high2: "고등학교 2학년 선택 과목 수준에 맞춰 세부 개념과 자료·그래프·공식의 해석을 함께 다룹니다.",
  high3: "고등학교 3학년 및 수능 대비 수준에 맞춰 조건, 예외, 개념 비교와 문제 적용까지 깊이 있게 다룹니다."
};

const buildSystemPrompt = (settings: LearningSettings) =>
  [
    "당신은 한국어로 답하는 StudyBox AI 학습 도우미입니다.",
    modeInstructions[settings.mode],
    levelInstructions[settings.level],
    "완성 답안을 대신 작성하거나 부정행위를 돕지 말고, 학생이 이해하고 스스로 작성할 수 있게 안내합니다.",
    "반드시 title, summary, sections 배열을 가진 JSON 객체만 반환하세요.",
    "sections의 각 항목은 title과 content 문자열을 가져야 합니다."
  ].join(" ");

const replySchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  sections: z.array(z.object({ title: z.string().min(1).max(160), content: z.string().min(1).max(6000) })).min(1).max(4)
});

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1)
});

class MockChatProvider implements ChatProvider {
  readonly name = "mock";
  readonly model = "studybox-sites-mock";

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const sectionCount = { short: 2, standard: 3, detailed: 4 }[input.settings.responseLength];
    const titles = modeTitles[input.settings.mode].slice(0, sectionCount);
    const reply = {
      title: `“${input.question}” 학습 답변`,
      summary: "개발용 모의 답변입니다. 실제 AI 제공자를 연결하면 같은 형식으로 학습 답변이 생성됩니다.",
      sections: titles.map((title, index) => ({
        title,
        content: `${input.question}에 대해 ${index + 1}단계로 생각해 보세요. ${levelGuide[input.settings.level]}`
      }))
    };
    return { reply, rawContent: JSON.stringify(reply) };
  }
}

class OpenAiCompatibleChatProvider implements ChatProvider {
  readonly name = "openai-compatible";
  readonly model: string;

  constructor(private readonly appConfig: SitesConfig) {
    if (!appConfig.aiApiKey || !appConfig.aiModel) {
      throw new ApiError(503, "AI_NOT_CONFIGURED", "AI 연결 설정이 완료되지 않았습니다.");
    }
    if (!appConfig.aiBaseUrl.startsWith("https://")) {
      throw new ApiError(503, "AI_NOT_CONFIGURED", "AI 연결 주소는 HTTPS를 사용해야 합니다.");
    }
    this.model = appConfig.aiModel;
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const models = [this.appConfig.aiModel, ...this.appConfig.aiFallbackModels];
    let lastError: unknown;

    for (const model of models) {
      try {
        return await this.generateForModel(input, model);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof ApiError && lastError.code === "AI_NOT_CONFIGURED") {
      throw lastError;
    }
    throw new ApiError(502, "AI_PROVIDER_ERROR", "AI 답변을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  private async generateForModel(input: GenerateReplyInput, model: string) {
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
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(input.settings) },
            ...input.conversation.map((message) => ({
              role: message.role,
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
      const normalized = rawContent.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const reply = replySchema.parse(JSON.parse(normalized));
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

export const createChatProvider = (appConfig: SitesConfig): ChatProvider =>
  appConfig.aiProvider === "openai-compatible"
    ? new OpenAiCompatibleChatProvider(appConfig)
    : new MockChatProvider();
