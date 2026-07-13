import { Link, useNavigate } from "react-router-dom";
import { ArrowUp, ArrowUpRight, ChatCircleDots, Plus } from "@phosphor-icons/react";
import { defaultLearningSettings } from "@studybox/shared";

import { useAuth } from "./auth";
import "./deep-landing.css";

const DeepBrand = () => (
  <span className="deep-brand">
    <span className="deep-brand__mark" aria-hidden="true">
      <i /><i /><i />
    </span>
    <span>StudyBox <strong>AI</strong></span>
  </span>
);

export const DeepProductMockup = () => (
  <div className="deep-product" role="img" aria-label="StudyBox AI 실제 학습 대화 화면 미리보기">
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
        <div><span>개념 설명</span><span>중학교 2학년</span><span>보통 길이</span></div>
      </header>
      <div className="deep-product__body">
        <div className="deep-product__question">일차함수의 그래프에서 기울기가 의미하는 게 뭐야?</div>
        <div className="deep-product__answer">
          <b className="deep-product__ai">AI</b>
          <div>
            <p className="deep-product__answer-label">개념 설명 · 핵심부터</p>
            <h2>기울기는 x가 1만큼 변할 때,<br />y가 얼마나 변하는지를 뜻해요.</h2>
            <p>일차함수 <strong>y = ax + b</strong>에서 a가 바로 기울기입니다. a가 클수록 그래프는 더 가파르게 올라가요.</p>
            <div className="deep-product__formula"><strong>y = 2x + 1</strong><span>x +1 → y +2</span><i aria-hidden="true" /></div>
            <div className="deep-product__suggestions"><span>예시로 더 보기</span><span>문제로 확인하기</span></div>
          </div>
        </div>
      </div>
      <footer><span>궁금한 내용을 입력하세요</span><b><ArrowUp weight="bold" /></b></footer>
    </div>
  </div>
);

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
            <p className="deep-welcome__announcement"><ChatCircleDots weight="duotone" /> 나에게 맞춰 생각하는 학습 AI를 만나보세요.</p>
            <h1 id="deep-title" className="deep-welcome__wordmark">StudyBox <strong>AI</strong></h1>
            <p className="deep-welcome__tagline">Into better learning.</p>
            <p className="deep-welcome__description">질문 하나로 시작해 이해와 문제 풀이까지. 학년, 목적, 답변 길이에 맞춘 나만의 학습 흐름을 만들어보세요.</p>

            <div className="deep-actions" aria-label="StudyBox AI 시작 메뉴">
              <button className="deep-action deep-action--primary" type="button" onClick={startLearning}>
                <span><strong>지금 시작하기</strong><small>무료로 AI 학습 대화를 시작하세요.</small></span>
                <ArrowUpRight weight="bold" aria-hidden="true" />
              </button>
              <a className="deep-action deep-action--secondary" href="#product-tour">
                <span><strong>실제 학습 화면</strong><small>질문이 답변으로 이어지는 과정을 확인하세요.</small></span>
                <ArrowUpRight weight="bold" aria-hidden="true" />
              </a>
            </div>
            <p className="deep-welcome__settings"><span>개념 설명</span><i /><span>중학교 2학년</span><i /><span>보통 길이</span></p>
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
