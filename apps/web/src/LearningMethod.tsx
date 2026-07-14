import {
  ArrowRight,
  ChatCircleDots,
  CheckCircle,
  ListNumbers,
  Path,
  SlidersHorizontal
} from "@phosphor-icons/react";

const methodSteps = [
  {
    number: "01",
    title: "질문의 막힌 지점",
    description: "질문 속에서 이미 아는 것과 아직 연결되지 않은 부분을 먼저 찾습니다.",
    Icon: ChatCircleDots
  },
  {
    number: "02",
    title: "답변의 높이와 밀도",
    description: "학년과 목적, 원하는 길이에 맞춰 설명의 기준점을 조절합니다.",
    Icon: SlidersHorizontal
  },
  {
    number: "03",
    title: "이해되는 설명 순서",
    description: "개념, 예시, 확인 문제를 지금 이해하기 좋은 순서로 배치합니다.",
    Icon: ListNumbers
  },
  {
    number: "04",
    title: "다음 학습으로 연결",
    description: "한 번의 답에서 끝나지 않도록 다음 질문과 복습 지점을 남깁니다.",
    Icon: Path
  }
] as const;

export const LearningMethod = () => (
  <section id="story" className="learning-method" aria-labelledby="learning-method-title">
    <div className="learning-method__inner">
      <header className="learning-method__header scroll-rise">
        <div>
          <p>THE STUDYBOX METHOD</p>
          <h2 id="learning-method-title">좋은 답은,<br /><strong>순서가 다릅니다.</strong></h2>
        </div>
        <p>바로 설명하기 전에 질문의 의도와 현재 수준을 읽습니다. 그래서 같은 질문도 지금 필요한 공부의 형태로 달라집니다.</p>
      </header>

      <div className="learning-method__layout">
        <ol className="learning-method__steps">
          {methodSteps.map(({ number, title, description, Icon }, index) => (
            <li className={`scroll-rise page-reveal--delay-${index + 1}`} key={number}>
              <span className="learning-method__number" aria-hidden="true">{number}</span>
              <Icon className="learning-method__icon" weight="regular" aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="answer-blueprint scroll-rise" role="img" aria-label="질문과 답변 수준을 분석해 설명 순서를 설계하는 StudyBox AI 화면">
          <header className="answer-blueprint__chrome">
            <span className="answer-blueprint__brand"><ChatCircleDots weight="duotone" /> StudyBox <strong>AI</strong></span>
            <span>ANSWER BLUEPRINT</span>
            <span className="answer-blueprint__status"><i /> READY</span>
          </header>

          <div className="answer-blueprint__question">
            <span>STUDENT QUESTION</span>
            <p>왜 음수끼리 곱하면 양수가 돼?</p>
          </div>

          <div className="answer-blueprint__signals">
            <div><span>목적</span><strong>개념 이해</strong></div>
            <div><span>수준</span><strong>중학교 2학년</strong></div>
            <div><span>길이</span><strong>보통</strong></div>
          </div>

          <div className="answer-blueprint__structure">
            <span>RESPONSE STRUCTURE</span>
            <ol>
              <li>
                <b>01</b>
                <div><strong>이미 아는 감각에서 시작</strong><p>온도와 방향처럼 익숙한 예시를 먼저 연결합니다.</p></div>
                <CheckCircle weight="fill" aria-hidden="true" />
              </li>
              <li>
                <b>02</b>
                <div><strong>개념을 한 문장으로 정리</strong><p>부호가 방향을 바꾼다는 핵심을 짧게 설명합니다.</p></div>
                <CheckCircle weight="fill" aria-hidden="true" />
              </li>
              <li>
                <b>03</b>
                <div><strong>바로 확인할 문제 제안</strong><p>이해한 내용을 다음 문제에서 스스로 확인합니다.</p></div>
                <CheckCircle weight="fill" aria-hidden="true" />
              </li>
            </ol>
          </div>

          <footer>
            <span>다음 학습까지 하나의 흐름으로 저장됩니다.</span>
            <ArrowRight weight="bold" aria-hidden="true" />
          </footer>
        </div>
      </div>
    </div>
  </section>
);
