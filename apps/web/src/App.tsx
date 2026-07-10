import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import {
  defaultLearningSettings,
  type Conversation,
  type LearningMode,
  type LearningSettings,
  type Message
} from "@studybox/shared";

import { api, ApiClientError } from "./api";
import { useAuth } from "./auth";

const settingsLabels = {
  mode: {
    concept: "개념 설명",
    solve: "문제 풀이",
    summary: "핵심 요약",
    exam: "시험 대비",
    performance: "수행평가"
  },
  level: { basic: "기초", standard: "보통", advanced: "심화" },
  responseLength: { short: "짧게", standard: "보통", detailed: "자세히" }
} as const;

const learningStories = [
  {
    mode: "concept",
    code: "01 / 개념 설명",
    title: "모르는 걸\n아는 말로.",
    description: "낯선 개념도 쉬운 표현과 익숙한 예시부터 시작합니다."
  },
  {
    mode: "solve",
    code: "02 / 문제 풀이",
    title: "답보다 먼저\n보이는 과정.",
    description: "조건, 공식, 풀이 순서를 연결해 다음 문제까지 풀 수 있게 합니다."
  },
  {
    mode: "summary",
    code: "03 / 핵심 요약",
    title: "길게 읽지 않아도\n남는 핵심.",
    description: "중요한 정보와 키워드만 남겨 복습의 밀도를 높입니다."
  },
  {
    mode: "exam",
    code: "04 / 시험 대비",
    title: "시험 직전,\n봐야 할 것만.",
    description: "암기 포인트부터 예상 문제와 오답까지 한 흐름으로 정리합니다."
  },
  {
    mode: "performance",
    code: "05 / 수행평가",
    title: "막막한 시작을\n선명한 개요로.",
    description: "수행 조건을 읽고 주제, 근거, 구성, 평가 기준을 함께 설계합니다."
  }
] satisfies Array<{
  mode: LearningMode;
  code: string;
  title: string;
  description: string;
}>;

const previewResponses: Record<
  LearningMode,
  {
    question: string;
    title: string;
    summary: string;
    sections: Array<{ title: string; content: string }>;
  }
> = {
  concept: {
    question: "광합성 과정을 쉽게 설명해 줘",
    title: "빛을 에너지로 바꾸는 식물의 과정",
    summary: "광합성은 식물이 햇빛을 이용해 스스로 먹을 것을 만드는 과정이에요.",
    sections: [
      { title: "준비물", content: "햇빛, 물, 이산화탄소가 필요해요." },
      { title: "일어나는 일", content: "잎의 엽록체가 빛을 받아 포도당과 산소를 만들어요." },
      { title: "한 줄 정리", content: "식물은 빛 에너지를 저장 가능한 화학 에너지로 바꿔요." }
    ]
  },
  solve: {
    question: "이차방정식 x²-5x+6=0을 풀어 줘",
    title: "곱해서 6, 더해서 -5가 되는 수 찾기",
    summary: "식을 인수분해하면 해를 빠르고 정확하게 확인할 수 있어요.",
    sections: [
      { title: "조건 확인", content: "상수항은 6이고 일차항의 계수는 -5예요." },
      { title: "단계별 풀이", content: "(x-2)(x-3)=0으로 인수분해해요." },
      { title: "정답 점검", content: "따라서 x=2 또는 x=3이에요." }
    ]
  },
  summary: {
    question: "조선 후기 경제 변화를 핵심만 요약해 줘",
    title: "상품 화폐 경제가 빠르게 성장했어요",
    summary: "농업 생산력과 시장이 성장하면서 상업과 수공업의 모습도 달라졌어요.",
    sections: [
      { title: "농업", content: "모내기법이 널리 퍼지고 상품 작물 재배가 늘었어요." },
      { title: "상업", content: "장시와 포구가 성장하고 사상인의 활동이 활발해졌어요." },
      { title: "핵심 키워드", content: "광작, 장시, 사상, 상품 화폐 경제를 기억하세요." }
    ]
  },
  exam: {
    question: "중간고사 전에 세포 분열을 정리해 줘",
    title: "체세포 분열과 감수 분열을 구분해요",
    summary: "시험에서는 분열 횟수, 만들어지는 세포 수, 염색체 수를 비교하는 문제가 자주 나와요.",
    sections: [
      { title: "암기 포인트", content: "체세포 분열은 1회, 감수 분열은 연속 2회 진행돼요." },
      { title: "자주 틀리는 부분", content: "감수 분열 결과의 염색체 수는 모세포의 절반이에요." },
      { title: "예상 문제", content: "두 분열의 결과 세포 수와 유전적 차이를 비교해 보세요." }
    ]
  },
  performance: {
    question: "플라스틱 사용을 주제로 발표 개요를 만들어 줘",
    title: "문제 제기부터 실천 제안까지 연결해요",
    summary: "자료를 나열하기보다 원인, 영향, 해결책이 이어지는 구조가 설득력을 높여요.",
    sections: [
      { title: "도입", content: "일상에서 버려지는 플라스틱의 규모를 짧은 사례로 보여줘요." },
      { title: "본론", content: "환경 영향과 개인·학교·기업의 해결책을 근거와 함께 제시해요." },
      { title: "마무리", content: "청중이 오늘부터 실천할 수 있는 행동을 한 가지 제안해요." }
    ]
  }
};

const pendingQuestionKey = "studybox-pending-question";

const getErrorMessage = (error: unknown) =>
  error instanceof ApiClientError ? error.message : "잠시 후 다시 시도해 주세요.";

const LoadingPage = () => <main className="loading-page">불러오는 중입니다.</main>;

const SiteHeader = ({ tone = "dark" }: { tone?: "dark" | "light" }) => {
  const { user, loading } = useAuth();

  return (
    <header className={`site-header site-header--${tone}`}>
      <div className="site-header__inner container">
        <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동">
          StudyBox <span>AI</span>
        </Link>
        <nav className="primary-navigation" aria-label="주요 메뉴">
          <a href="/#story">학습 모드</a>
          <a href="/#categories">AI 미리보기</a>
          <a href="/#how-it-works">사용 방법</a>
        </nav>
        {!loading && (
          <Link className="header-start" to={user ? "/app/new" : "/login?next=/app/new"}>
            {user ? "학습 시작" : "로그인"}
          </Link>
        )}
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="site-footer site-footer--light">
    <div className="site-footer__inner container">
      <div>
        <Link className="brand-link" to="/">
          StudyBox <span>AI</span>
        </Link>
        <p>질문은 하나, 공부는 내 방식대로.</p>
      </div>
      <p>StudyBox AI Beta · {new Date().getFullYear()}</p>
    </div>
  </footer>
);

const LearningPreview = ({
  mode,
  onModeChange,
  compact = false
}: {
  mode: LearningMode;
  onModeChange: (mode: LearningMode) => void;
  compact?: boolean;
}) => {
  const response = previewResponses[mode];

  return (
    <div
      className={`product-preview${compact ? " product-preview--compact" : ""}`}
      role={compact ? undefined : "group"}
      aria-label={compact ? undefined : "학습 답변 미리보기"}
      aria-hidden={compact ? true : undefined}
    >
      <div className="product-preview__chrome" aria-hidden="true">
        <span>StudyBox AI</span>
        <span>학습 미리보기</span>
      </div>
      <div className="product-preview__layout">
        <div className="product-preview__settings">
          <p>학습 모드</p>
          <div className="product-preview__modes" aria-label="미리보기 학습 모드">
            {(Object.entries(settingsLabels.mode) as Array<[LearningMode, string]>).map(([value, label]) => (
              <button
                className={value === mode ? "is-active" : ""}
                type="button"
                aria-pressed={value === mode}
                disabled={compact}
                tabIndex={compact ? -1 : undefined}
                onClick={() => onModeChange(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="product-preview__question">
            <span>나의 질문</span>
            <p>{response.question}</p>
          </div>
        </div>
        <article className="product-preview__answer" aria-live="polite">
          <p className="product-preview__eyebrow">
            {settingsLabels.mode[mode]} · 보통 · 보통 길이
          </p>
          <h3>{response.title}</h3>
          <p className="product-preview__summary">{response.summary}</p>
          <div className="product-preview__sections">
            {response.sections.map((section) => (
              <section key={section.title}>
                <h4>{section.title}</h4>
                <p>{section.content}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyEnhanced, setStoryEnhanced] = useState(false);
  const [lightHeader, setLightHeader] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setStoryEnhanced(!media.matches && "IntersectionObserver" in window);

    updateMotion();
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    if (!storyEnhanced) {
      return;
    }

    const steps = Array.from(document.querySelectorAll<HTMLElement>("[data-story-step]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries.find((entry) => entry.isIntersecting);
        if (activeEntry) {
          setStoryIndex(Number((activeEntry.target as HTMLElement).dataset.storyStep || 0));
        }
      },
      { rootMargin: "-46% 0px -46% 0px", threshold: 0 }
    );

    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [storyEnhanced]);

  useEffect(() => {
    let animationFrame = 0;

    const updateHeaderTone = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const lightSection = document.getElementById("categories");
        if (lightSection) {
          setLightHeader(window.scrollY >= lightSection.offsetTop - 52);
        }
      });
    };

    updateHeaderTone();
    window.addEventListener("scroll", updateHeaderTone, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateHeaderTone);
    };
  }, []);

  const startLearning = (event?: FormEvent) => {
    event?.preventDefault();
    const query = new URLSearchParams({
      mode: settings.mode,
      level: settings.level,
      responseLength: settings.responseLength
    }).toString();
    const destination = `/app/new?${query}`;

    if (question.trim()) {
      window.sessionStorage.setItem(pendingQuestionKey, question.trim());
    }

    navigate(user ? destination : `/login?next=${encodeURIComponent(destination)}`);
  };

  const selectMode = (mode: LearningMode) => setSettings((current) => ({ ...current, mode }));

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <SiteHeader tone={lightHeader ? "light" : "dark"} />
      <main id="main-content" tabIndex={-1}>
        <section id="hero" className="hero" aria-labelledby="hero-title">
          <div className="hero__inner container">
            <div className="hero__content">
              <p className="hero__kicker">STUDYBOX AI</p>
              <h1 id="hero-title">
                같은 질문.<br />
                <span>완전히 다른 공부.</span>
              </h1>
              <p className="hero__lead">
                개념은 쉽게. 풀이는 끝까지. 시험은 핵심만.
                <br />목적을 고르면, AI의 답변 방식이 달라집니다.
              </p>
              <div className="hero__actions" aria-label="StudyBox AI 바로가기">
                <button className="button button--primary" type="button" onClick={() => startLearning()}>
                  학습 시작하기
                </button>
                <a className="text-link" href="#story">
                  어떻게 다른지 보기
                </a>
              </div>
            </div>
            <div className="hero__preview">
              <LearningPreview mode={settings.mode} onModeChange={selectMode} compact />
            </div>
            <a className="scroll-cue" href="#story">아래로 스크롤</a>
          </div>
        </section>

        <section id="story" className={`story-section${storyEnhanced ? " is-enhanced" : ""}`} aria-labelledby="story-title">
          <h2 id="story-title" className="visually-hidden">
            StudyBox AI의 다섯 가지 학습 모드
          </h2>
          <div className="story-sticky">
            <div className="story-frame container">
              <header className="story-topline">
                <p>하나의 AI · 다섯 학습 모드</p>
                <p>목적에 맞는 답변</p>
              </header>
              <div className="story-panels">
                {learningStories.map((story, index) => {
                  const [firstLine, secondLine] = story.title.split("\n");
                  return (
                    <article
                      className={`story-panel${index === storyIndex ? " is-active" : ""}${index < storyIndex ? " is-past" : ""}`}
                      key={story.mode}
                    >
                      <p className="story-panel__meta">{story.code}</p>
                      <h3>{firstLine}<br /><strong>{secondLine}</strong></h3>
                      <p>{story.description}</p>
                    </article>
                  );
                })}
              </div>
              <div className="story-progress" aria-hidden="true">
                <div className="story-progress__rail"><span style={{ transform: `scaleX(${(storyIndex + 1) / learningStories.length})` }} /></div>
                <p>{String(storyIndex + 1).padStart(2, "0")} <span>/ 05</span></p>
              </div>
            </div>
          </div>
          <div className="story-steps" aria-hidden="true">
            {learningStories.map((story, index) => <span data-story-step={index} key={story.mode} />)}
          </div>
        </section>

        <section id="categories" className="section product-section" aria-labelledby="categories-title">
          <div className="container">
            <header className="section-heading">
              <p className="section-eyebrow">실제 답변 미리보기</p>
              <h2 id="categories-title">같은 AI가 아니라.<br />내 목적에 맞는 AI.</h2>
              <p>학습 모드를 눌러 같은 질문이 어떤 구조와 깊이의 답변으로 바뀌는지 확인해 보세요.</p>
            </header>
            <LearningPreview mode={settings.mode} onModeChange={selectMode} />
          </div>
        </section>

        <section id="how-it-works" className="section process-section" aria-labelledby="how-it-works-title">
          <div className="container">
            <header className="section-heading">
              <p className="section-eyebrow">설정은 짧게 · 집중은 길게</p>
              <h2 id="how-it-works-title">설정은 짧게.<br />집중은 바로.</h2>
            </header>
            <ol className="process-list">
              {[
                ["오늘 필요한 모드 선택", "설명, 풀이, 요약, 시험, 수행평가 중 하나를 고릅니다."],
                ["난이도와 길이 조절", "내 수준과 남은 시간에 맞게 답변의 깊이를 정합니다."],
                ["질문하면 끝", "답변의 구성은 StudyBox AI가 선택한 모드에 맞춥니다."]
              ].map(([title, content], index) => (
                <li className="process-item" key={title}>
                  <p className="process-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
                  <div><h3>{title}</h3><p>{content}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="learning-app" className="learning-app" aria-labelledby="learning-app-title">
          <div className="container">
            <div className="learning-app__content">
              <header className="learning-app__header">
                <p className="section-eyebrow">내 방식대로 공부하기</p>
                <h2 id="learning-app-title">질문은 그대로.<br /><span>답변은 내 방식대로.</span></h2>
                <p>초대 코드 베타 서비스입니다. 로그인 후 내 대화에 안전하게 저장됩니다.</p>
              </header>
              <div className="learning-workspace learning-workspace--start">
                <form className="learning-form" onSubmit={startLearning}>
                  <SettingsFields settings={settings} onChange={setSettings} prefix="landing" />
                  <div className="learning-question">
                    <label htmlFor="learning-question">무엇을 공부할까요?</label>
                    <textarea id="learning-question" rows={5} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 광합성 과정을 쉽게 설명해 줘" />
                    <p>최대 2,000자까지 입력할 수 있습니다.</p>
                  </div>
                  <div className="learning-form__actions">
                    <button className="button button--primary" type="submit">AI 질문 시작하기</button>
                    <button className="button button--secondary" type="button" onClick={() => { setQuestion(""); setSettings(defaultLearningSettings); }}>초기화</button>
                  </div>
                  <p className="learning-disclaimer">현재 배포 뼈대는 모의 AI 답변으로 동작합니다. 실제 제공자는 운영 환경에서 연결합니다.</p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

const SettingsFields = ({
  settings,
  onChange,
  prefix
}: {
  settings: LearningSettings;
  onChange: (settings: LearningSettings) => void;
  prefix: string;
}) => {
  const change = <K extends keyof LearningSettings>(key: K, value: LearningSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <>
      <fieldset className="learning-fieldset">
        <legend>학습 모드</legend>
        <div className="learning-option-grid learning-option-grid--modes">
          {(Object.entries(settingsLabels.mode) as Array<[LearningMode, string]>).map(([value, label]) => (
            <label className="learning-option" key={value}>
              <input type="radio" name={`${prefix}-mode`} value={value} checked={settings.mode === value} onChange={() => change("mode", value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="learning-form__settings">
        <fieldset className="learning-fieldset">
          <legend>학습 수준</legend>
          <div className="learning-option-grid">
            {(Object.entries(settingsLabels.level) as Array<[LearningSettings["level"], string]>).map(([value, label]) => (
              <label className="learning-option" key={value}>
                <input type="radio" name={`${prefix}-level`} value={value} checked={settings.level === value} onChange={() => change("level", value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="learning-fieldset">
          <legend>답변 길이</legend>
          <div className="learning-option-grid">
            {(Object.entries(settingsLabels.responseLength) as Array<[LearningSettings["responseLength"], string]>).map(([value, label]) => (
              <label className="learning-option" key={value}>
                <input type="radio" name={`${prefix}-length`} value={value} checked={settings.responseLength === value} onChange={() => change("responseLength", value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </>
  );
};

const AuthFrame = ({ children }: { children: ReactNode }) => (
  <>
    <SiteHeader tone="light" />
    <main className="auth-page">{children}</main>
  </>
);

const safeNextPath = (value: string | null) =>
  value && value.startsWith("/app") && !value.startsWith("//") ? value : "/app/new";

const LoginPage = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = safeNextPath(searchParams.get("next") || location.state?.next);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username, password);
      navigate(next, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame>
      <section className="auth-card" aria-labelledby="login-title">
        <p className="section-eyebrow">STUDYBOX AI BETA</p>
        <h1 id="login-title">다시 만나서<br />반가워요.</h1>
        <p className="auth-card__intro">가입한 아이디와 비밀번호를 입력해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>아이디<input autoComplete="username" minLength={4} maxLength={20} pattern="[a-z0-9_]{4,20}" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required /></label>
          <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "로그인 중..." : "로그인"}</button>
        </form>
        <div className="auth-links">
          <Link to={`/register${location.search}`}>초대 코드를 받았다면 가입하기</Link>
        </div>
      </section>
    </AuthFrame>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [realName, setRealName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = safeNextPath(searchParams.get("next") || location.state?.next);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await register({
        username,
        password,
        inviteCode,
        realName,
        schoolName,
        grade: Number(grade),
        classNumber: Number(classNumber),
        studentNumber: Number(studentNumber)
      });
      navigate(next, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame>
      <section className="auth-card" aria-labelledby="register-title">
        <p className="section-eyebrow">INVITE-ONLY BETA</p>
        <h1 id="register-title">내 공부를 위한<br />계정을 만들어요.</h1>
        <p className="auth-card__intro">학교 정보와 아이디를 입력하면 바로 학습을 시작할 수 있어요. 비밀번호는 12자 이상으로 설정해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>초대 코드<input autoComplete="off" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required /></label>
          <label>아이디<input autoComplete="username" minLength={4} maxLength={20} pattern="[a-z0-9_]{4,20}" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required /></label>
          <label>이름<input autoComplete="name" maxLength={50} value={realName} onChange={(event) => setRealName(event.target.value)} required /></label>
          <label>학교명<input autoComplete="organization" maxLength={100} value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required /></label>
          <div className="auth-form__school-numbers">
            <label>학년<input type="number" inputMode="numeric" min={1} max={6} value={grade} onChange={(event) => setGrade(event.target.value)} required /></label>
            <label>반<input type="number" inputMode="numeric" min={1} max={99} value={classNumber} onChange={(event) => setClassNumber(event.target.value)} required /></label>
            <label>번호<input type="number" inputMode="numeric" min={1} max={99} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} required /></label>
          </div>
          <label>비밀번호<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "가입 중..." : "가입하고 시작하기"}</button>
        </form>
        <div className="auth-links"><Link to={`/login?${searchParams.toString()}`}>이미 계정이 있나요? 로그인</Link></div>
      </section>
    </AuthFrame>
  );
};

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
};

const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="app-header">
      <div className="app-header__inner chat-shell">
        <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동">StudyBox <span>AI</span></Link>
        <div className="app-header__actions">
          <span>{user?.username}</span>
          <Link to="/account">계정</Link>
          <button className="app-link-button" type="button" onClick={signOut}>로그아웃</button>
        </div>
      </div>
    </header>
  );
};

const NewConversationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const settings = useMemo<LearningSettings>(
    () => ({
      mode: (searchParams.get("mode") as LearningSettings["mode"]) || defaultLearningSettings.mode,
      level: (searchParams.get("level") as LearningSettings["level"]) || defaultLearningSettings.level,
      responseLength:
        (searchParams.get("responseLength") as LearningSettings["responseLength"]) ||
        defaultLearningSettings.responseLength
    }),
    [searchParams]
  );

  useEffect(() => {
    let active = true;
    api.createConversation({ settings })
      .then(({ conversation }) => {
        if (active) {
          navigate(`/app/${conversation.id}`, { replace: true });
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      });

    return () => {
      active = false;
    };
  }, [navigate, settings]);

  return (
    <>
      <AppHeader />
      <main className="loading-page">{error || "새 학습 대화를 준비하고 있습니다."}</main>
    </>
  );
};

const ChatMessage = ({ message }: { message: Message }) => {
  if (message.role === "user") {
    return (
      <article className="chat-message chat-message--user">
        <p className="chat-message__label">나</p>
        <div className="chat-message__content"><p>{message.content}</p></div>
      </article>
    );
  }

  const response = message.response;

  return (
    <article className="chat-message chat-message--assistant">
      <p className="chat-message__label">STUDYBOX AI</p>
      <div className="chat-message__content">
        <p className="chat-message__meta">{message.settings ? `${settingsLabels.mode[message.settings.mode]} · ${settingsLabels.level[message.settings.level]} · ${settingsLabels.responseLength[message.settings.responseLength]}` : "학습 답변"}</p>
        <h3>{response?.title || "학습 답변"}</h3>
        <p className="chat-message__summary">{response?.summary || message.content}</p>
        {response && (
          <div className="chat-message__sections">
            {response.sections.map((section) => (
              <section className="chat-message__section" key={section.title}>
                <h4>{section.title}</h4>
                <p>{section.content}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);
  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshList = async () => {
    const result = await api.listConversations();
    setConversations(result.conversations);
  };

  const loadConversation = async () => {
    if (!conversationId) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.getConversation(conversationId);
      setConversation(result.conversation);
      setMessages(result.messages);
      setSettings(result.conversation.settings);
      setTitle(result.conversation.title);
      await refreshList();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add("chat-page");
    return () => document.body.classList.remove("chat-page");
  }, []);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    if (loading || sending || messages.length || !conversationId) {
      return;
    }

    const pendingQuestion = window.sessionStorage.getItem(pendingQuestionKey);

    if (pendingQuestion) {
      setQuestion(pendingQuestion);
      window.sessionStorage.removeItem(pendingQuestionKey);
    }
  }, [loading, sending, messages.length, conversationId]);

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!conversationId || !question.trim() || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const result = await api.sendMessage(conversationId, { question: question.trim(), settings });
      setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
      setQuestion("");
      setConversation((current) => current ? { ...current, settings, updatedAt: result.assistantMessage.createdAt } : current);
      await refreshList();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const saveTitle = async (event: FormEvent) => {
    event.preventDefault();

    if (!conversationId || !title.trim()) {
      return;
    }

    try {
      const result = await api.updateConversation(conversationId, title.trim());
      setConversation(result.conversation);
      setTitle(result.conversation.title);
      setIsEditingTitle(false);
      await refreshList();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const deleteCurrentConversation = async () => {
    if (!conversationId || !window.confirm("이 대화와 모든 메시지를 삭제할까요?")) {
      return;
    }

    try {
      await api.deleteConversation(conversationId);
      navigate("/app/new", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <><AppHeader /><LoadingPage /></>;
  }

  if (!conversation) {
    return <><AppHeader /><main className="loading-page">{error || "대화를 찾을 수 없습니다."}</main></>;
  }

  return (
    <>
      <a className="skip-link" href="#chat-main">대화 영역으로 건너뛰기</a>
      <AppHeader />
      <main id="chat-main" className="chat-app chat-app--react" tabIndex={-1}>
        <div className="chat-app__layout chat-shell">
          <aside className={`chat-settings${settingsOpen ? " is-open" : ""}`} aria-labelledby="chat-settings-title">
            <button
              className="chat-settings__toggle"
              type="button"
              aria-expanded={settingsOpen}
              aria-controls="chat-settings-content"
              onClick={() => setSettingsOpen((current) => !current)}
            >
              <span>학습 설정</span>
              <span>{settingsOpen ? "닫기" : "열기"}</span>
            </button>
            <div className="chat-settings__content" id="chat-settings-content">
              <div className="chat-settings__header">
                <div>
                  <p className="chat-settings__eyebrow">STUDY SETTINGS</p>
                  <h1 id="chat-settings-title">내 학습 방식</h1>
                </div>
              </div>
              <SettingsFields settings={settings} onChange={setSettings} prefix="chat" />
              <button className="chat-new-button chat-settings__new" type="button" onClick={() => navigate(`/app/new?${new URLSearchParams({ mode: settings.mode, level: settings.level, responseLength: settings.responseLength }).toString()}`)}>새 대화</button>
              <nav className="conversation-list" aria-label="내 대화 목록">
                {conversations.map((item) => (
                  <Link className={`conversation-list__item${item.id === conversation.id ? " is-active" : ""}`} to={`/app/${item.id}`} key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.lastMessagePreview || "아직 메시지가 없습니다."}</span>
                  </Link>
                ))}
              </nav>
              <button className="app-link-button chat-settings__delete" type="button" onClick={deleteCurrentConversation}>현재 대화 삭제</button>
            </div>
          </aside>

          <section className="chat-workspace" aria-labelledby="chat-title">
            <div className="chat-conversation">
              <div className="chat-conversation__title">
                {isEditingTitle ? (
                  <form onSubmit={saveTitle}><label className="visually-hidden" htmlFor="conversation-title">대화 제목</label><input id="conversation-title" className="conversation-title-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /><button className="chat-send-button" type="submit">저장</button></form>
                ) : (
                  <button className="app-link-button" type="button" onClick={() => setIsEditingTitle(true)}>{conversation.title}</button>
                )}
              </div>
              <div className="chat-conversation__inner">
                {!messages.length && (
                  <div className="chat-empty-state">
                    <p className="chat-empty-state__eyebrow">STUDYBOX AI CHAT</p>
                    <h2 id="chat-title">무엇을 더 공부해 볼까요?</h2>
                    <p>선택한 학습 방식에 맞춰 다음 질문부터 답변을 이어갑니다.</p>
                  </div>
                )}
                <div className="chat-message-list" aria-label="학습 대화 내용" role="log">
                  {messages.map((message) => <ChatMessage message={message} key={message.id} />)}
                </div>
              </div>
            </div>
            <form className="chat-composer" onSubmit={sendMessage} aria-busy={sending}>
              <div className="chat-composer__inner">
                <label className="visually-hidden" htmlFor="chat-question">추가 질문</label>
                <textarea id="chat-question" rows={2} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="궁금한 내용을 이어서 질문해 보세요" disabled={sending} />
                <div className="chat-composer__footer">
                  <p>최대 2,000자까지 입력할 수 있습니다.</p>
                  <button className="chat-send-button" type="submit" disabled={sending || !question.trim()}>{sending ? "답변 준비 중..." : "보내기"}</button>
                </div>
                {error && <p className="chat-composer__error" role="alert">{error}</p>}
              </div>
            </form>
            <p className="chat-live" role="status" aria-live="polite">{sending ? "선택한 방식으로 학습 답변을 구성하고 있습니다." : ""}</p>
          </section>
        </div>
      </main>
    </>
  );
};

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const removeAccount = async () => {
    if (!window.confirm("계정과 모든 학습 기록을 영구적으로 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      await api.deleteAccount();
      await logout();
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <>
      <AppHeader />
      <main className="account-page">
        <section className="account-card" aria-labelledby="account-title">
          <p className="section-eyebrow">ACCOUNT</p>
          <h1 id="account-title">내 계정</h1>
          <p className="account-card__intro">{user?.username}</p>
          <p className="account-card__profile form-message">{user ? `${user.realName} · ${user.schoolName} · ${user.grade}학년 ${user.classNumber}반 ${user.studentNumber}번` : ""}</p>
          <p className="form-message">대화 기록은 사용자가 삭제하기 전까지 보존됩니다. 개별 대화는 채팅 화면에서 삭제할 수 있습니다.</p>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <div className="learning-form__actions"><Link className="button button--primary" to="/app/new">학습 계속하기</Link><button className="button button--secondary" type="button" onClick={removeAccount}>계정 삭제</button></div>
        </section>
      </main>
    </>
  );
};

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/app/new" element={<RequireAuth><NewConversationPage /></RequireAuth>} />
    <Route path="/app/:conversationId" element={<RequireAuth><ChatPage /></RequireAuth>} />
    <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
