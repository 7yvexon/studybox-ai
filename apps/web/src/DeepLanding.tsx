import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUp, BookOpenText, ChatCircleDots, Plus } from "@phosphor-icons/react";
import { defaultLearningSettings } from "@studybox/shared";

import { useAuth } from "./auth";

const DeepBrand = () => (
  <span className="deep-brand">
    <span className="deep-brand__mark" aria-hidden="true">
      <i /><i /><i />
    </span>
    <span>StudyBox <strong>AI</strong></span>
  </span>
);

const demoStatus = [
  "어디에서 막혔는지 살펴보고 있어요",
  "중학교 2학년 수준에 맞췄어요",
  "익숙한 예시부터 설명을 구성했어요",
  "이해를 확인할 다음 질문도 준비했어요"
] as const;

export const DeepProductMockup = ({ demoStage = 3 }: { demoStage?: number }) => {
  const activeStage = Math.min(Math.max(demoStage, 0), demoStatus.length - 1);

  return (
  <div
    className={`deep-product deep-product--demo-stage-${activeStage}`}
    data-demo-stage={activeStage}
    role="img"
    aria-label="StudyBox AI 실제 학습 대화 화면 미리보기"
  >
    <aside className="deep-product__sidebar">
      <div className="deep-product__mini-mark"><span className="brand-mark" aria-hidden="true"><i /><i /></span></div>
      <div className="deep-product__side-brand"><DeepBrand /></div>
      <div className="deep-product__new"><Plus weight="bold" /> 새 학습</div>
      <div className="deep-product__history" aria-hidden="true">
        <p className="is-active"><span>일차함수 그래프</span><small>방금 전</small></p>
        <p><span>광합성 핵심 정리</span><small>어제</small></p>
        <p><span>영어 수행평가</span><small>7월 10일</small></p>
        <p><span>조선 후기 흐름</span><small>7월 8일</small></p>
      </div>
      <div className="deep-product__profile"><b>김</b><span>김학생</span></div>
    </aside>

    <div className="deep-product__workspace">
      <header>
        <strong>새 학습 대화</strong>
        <div><span>개념 설명</span><span className="deep-product__level">중학교 2학년</span><span>보통 길이</span></div>
      </header>
      <div className="deep-product__body">
        <div className="deep-product__question">일차함수의 그래프에서 기울기가 의미하는 게 뭐야?</div>
        <div className="deep-product__answer">
          <b className="deep-product__ai">AI</b>
          <div>
            <p className="deep-product__answer-label"><i aria-hidden="true" />{demoStatus[activeStage]}</p>
            <h2>기울기는 그래프가 얼마나 빠르게 변하는지를 보여줘요.</h2>
            <p>예를 들어 <strong>y = 2x + 1</strong>에서는 x가 1 늘어날 때 y가 2 늘어나요. 그래서 이 그래프의 기울기는 2입니다.</p>
            <p className="deep-product__answer-detail">같은 거리만큼 오른쪽으로 갔을 때 y가 더 크게 변할수록 선은 가파르고, 기울기가 음수라면 오른쪽으로 갈수록 내려갑니다.</p>
            <div className="deep-product__formula"><strong>y = 2x + 1</strong><span>x +1 → y +2</span><i aria-hidden="true" /></div>
            <div className="deep-product__suggestions"><span>기울기 부호도 설명해 줘</span><span>확인 문제 풀기</span></div>
          </div>
        </div>
      </div>
      <footer><span>궁금한 내용을 입력하세요</span><b><ArrowUp weight="bold" /></b></footer>
    </div>
  </div>
  );
};

export const DeepLanding = ({ embedded = false }: { embedded?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const MainTag = embedded ? "div" : "main";

  const startLearning = () => {
    const query = new URLSearchParams({
      mode: defaultLearningSettings.mode,
      level: defaultLearningSettings.level,
      responseLength: defaultLearningSettings.responseLength
    });

    const destination = `/app/new?${query.toString()}`;
    navigate(user ? destination : `/login?next=${encodeURIComponent(destination)}`);
  };

  return (
    <div className={`deep-home${embedded ? " deep-home--embedded" : ""}`}>
      {!embedded && <a className="deep-home__skip" href="#deep-main">본문으로 건너뛰기</a>}

      {!embedded && (
        <header className="deep-header">
          <Link to="/" aria-label="StudyBox AI 홈"><DeepBrand /></Link>
          <nav aria-label="홈페이지 메뉴">
            <a href="#examples">학습 예시</a>
            <Link to={user ? "/app" : "/login"}>{user ? "내 학습" : "로그인"}</Link>
            <button type="button" onClick={startLearning}>새 학습</button>
          </nav>
        </header>
      )}

      <MainTag id={embedded ? "deep-hero" : "deep-main"} className="deep-home__main">
        <section className="deep-welcome" aria-labelledby="deep-title">
          <div className="deep-welcome__copy">
            <p className="deep-welcome__announcement"><ChatCircleDots weight="duotone" /> 질문을 이해하는 개인 학습 AI</p>
            <h1 id="deep-title" className="deep-welcome__wordmark">StudyBox <strong>AI</strong></h1>
            <p className="deep-welcome__tagline">모르는 건 편하게 묻고,<br />이해될 때까지 이어가세요.</p>
            <p className="deep-welcome__description">질문을 완벽하게 정리하지 않아도 괜찮아요. 지금 막힌 지점과 학년을 읽고, 알아듣기 쉬운 말부터 차근차근 설명합니다.</p>

            <div className="deep-entry-points">
              <button className="deep-entry deep-entry--primary" type="button" onClick={startLearning}>
                <span className="deep-entry__icon" aria-hidden="true"><ChatCircleDots weight="duotone" /></span>
                <span><strong>바로 학습하기</strong><small>내 학년과 목적에 맞는 새 대화를 시작해요.</small></span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </button>
              <a className="deep-entry" href="#product-tour">
                <span className="deep-entry__icon" aria-hidden="true"><BookOpenText weight="duotone" /></span>
                <span><strong>답변 먼저 보기</strong><small>질문이 설명으로 바뀌는 과정을 살펴봐요.</small></span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </a>
            </div>

            <p className="deep-welcome__promise">학년별 설명 · 단계별 풀이 · 이어지는 후속 질문</p>
          </div>
        </section>
      </MainTag>

      {!embedded && (
        <footer className="deep-footer">
          <span>StudyBox AI는 학습을 돕기 위한 서비스입니다. 중요한 내용은 교과서와 선생님의 안내를 함께 확인하세요.</span>
          <span>© 2026 StudyBox AI</span>
        </footer>
      )}
    </div>
  );
};
