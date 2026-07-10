import type { ChatProvider, GenerateReplyInput, GenerateReplyResult } from "@studybox/shared";

const modeTitles = {
  concept: ["쉬운 설명", "예시와 연결", "핵심 용어", "한 줄 정리"],
  solve: ["조건 먼저 읽기", "풀이 전략", "단계별 풀이", "실수 점검"],
  summary: ["핵심 내용", "핵심 키워드", "내용 구조", "빠른 복습"],
  exam: ["암기 포인트", "예상 문제", "답안 점검", "시험 직전 확인"],
  performance: ["조건 분석", "주제 방향", "개요 만들기", "제출 전 점검"]
} as const;

const levelGuide = {
  basic: "낯선 용어는 쉬운 말로 바꾸어 한 문장씩 확인해 보세요.",
  standard: "핵심 개념이 어떤 순서와 이유로 이어지는지 직접 설명해 보세요.",
  advanced: "예외와 비슷한 개념의 차이까지 연결해 보세요."
} as const;

export class MockChatProvider implements ChatProvider {
  readonly name = "mock";
  readonly model = "studybox-development-mock";

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
