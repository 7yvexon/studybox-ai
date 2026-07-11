import type { ChatProvider, GenerateReplyInput, GenerateReplyResult } from "@studybox/shared";

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
