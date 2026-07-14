import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUp, ArrowUpRight, ChatCircleDots, Plus } from "@phosphor-icons/react";
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
            <p className="deep-welcome__announcement"><ChatCircleDots weight="duotone" /> PERSONAL STUDY WORKSPACE</p>
            <h1 id="deep-title" className="deep-welcome__wordmark">질문을 이해로,<br /><strong>이해를 실력으로.</strong></h1>
            <p className="deep-welcome__tagline">내 수준에 맞춰, 필요한 만큼 설명합니다.</p>
            <p className="deep-welcome__description">StudyBox AI는 질문의 맥락과 현재 수준을 읽고, 개념부터 다음 문제까지 하나의 학습 흐름으로 이어줍니다.</p>

            <div className="deep-hero-actions">
              <button type="button" onClick={startLearning}>학습 시작하기 <ArrowUpRight weight="bold" aria-hidden="true" /></button>
              <a href="#product-tour">먼저 둘러보기 <ArrowRight weight="bold" aria-hidden="true" /></a>
            </div>
          </div>

          <ol className="deep-hero-principles" aria-label="StudyBox AI의 학습 방식">
            <li>
              <span>01</span>
              <div><strong>막힌 지점부터 찾습니다.</strong><p>정답을 서두르지 않고, 질문 속에서 아직 연결되지 않은 부분을 먼저 읽습니다.</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>이해되는 높이로 설명합니다.</strong><p>중학교 1학년부터 고등학교 3학년까지, 선택한 답변 수준에 맞춰 시작점을 조절합니다.</p></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>다음 공부까지 이어줍니다.</strong><p>개념, 예시, 확인 문제와 대화 기록이 한 공간에 남아 학습의 흐름이 끊기지 않습니다.</p></div>
            </li>
          </ol>
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
