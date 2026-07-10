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

const pendingQuestionKey = "studybox-pending-question";

const getErrorMessage = (error: unknown) =>
  error instanceof ApiClientError ? error.message : "잠시 후 다시 시도해 주세요.";

const LoadingPage = () => <main className="loading-page">불러오는 중입니다.</main>;

const SiteHeader = () => {
  const { user, loading } = useAuth();

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동">
          StudyBox <span>AI</span>
        </Link>
        <nav className="primary-navigation" aria-label="주요 메뉴">
          <a href="/#story">학습 모드</a>
          <a href="/#categories">주요 기능</a>
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
  <footer className="site-footer">
    <div className="site-footer__inner container">
      <div>
        <Link className="brand-link" to="/">
          StudyBox <span>AI</span>
        </Link>
        <p>One question. Your way to learn.</p>
      </div>
      <p>StudyBox AI Beta · {new Date().getFullYear()}</p>
    </div>
  </footer>
);

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);

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

  const chooseMode = (mode: LearningMode) => {
    setSettings((current) => ({ ...current, mode }));
    document.getElementById("learning-app")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <SiteHeader />
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
                  어떻게 다른지 보기 <span aria-hidden="true">↘</span>
                </a>
              </div>
            </div>
            <a className="scroll-cue" href="#story">
              <span aria-hidden="true" />
              Scroll to explore
            </a>
          </div>
        </section>

        <section id="story" className="story-section" aria-labelledby="story-title">
          <h2 id="story-title" className="visually-hidden">
            StudyBox AI의 다섯 가지 학습 모드
          </h2>
          <div className="story-sticky">
            <div className="story-frame container">
              <header className="story-topline">
                <p>ONE AI · FIVE MODES</p>
                <p>목적에 맞는 답변</p>
              </header>
              <div className="story-panels">
                <article className="story-panel">
                  <p className="story-panel__meta">01 / CONCEPT</p>
                  <h3>모르는 걸<br /><strong>아는 말로.</strong></h3>
                  <p>낯선 개념도 쉬운 표현과 익숙한 예시부터 시작합니다.</p>
                </article>
                <article className="story-panel">
                  <p className="story-panel__meta">02 / SOLVE</p>
                  <h3>답보다 먼저<br /><strong>보이는 과정.</strong></h3>
                  <p>조건, 공식, 풀이 순서를 연결해 다음 문제까지 풀 수 있게 합니다.</p>
                </article>
                <article className="story-panel">
                  <p className="story-panel__meta">03 / SUMMARY</p>
                  <h3>길게 읽지 않아도<br /><strong>남는 핵심.</strong></h3>
                  <p>중요한 정보와 키워드만 남겨 복습의 밀도를 높입니다.</p>
                </article>
                <article className="story-panel">
                  <p className="story-panel__meta">04 / EXAM</p>
                  <h3>시험 직전,<br /><strong>봐야 할 것만.</strong></h3>
                  <p>암기 포인트부터 예상 문제와 오답까지 한 흐름으로 정리합니다.</p>
                </article>
                <article className="story-panel">
                  <p className="story-panel__meta">05 / PROJECT</p>
                  <h3>막막한 시작을<br /><strong>선명한 개요로.</strong></h3>
                  <p>수행 조건을 읽고 주제, 근거, 구성, 평가 기준을 함께 설계합니다.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="categories" className="section categories-section" aria-labelledby="categories-title">
          <div className="container">
            <header className="section-heading">
              <p className="section-eyebrow">BUILT FOR STUDY</p>
              <h2 id="categories-title">다섯 개의 모드.<br />필요한 순간에 바로.</h2>
              <p>선택 한 번으로 답변의 순서, 깊이, 표현 방식이 바뀝니다.</p>
            </header>
            <ol className="category-list">
              {(
                [
                  ["concept", "개념 설명", "쉬운 표현 · 예시와 비유 · 핵심 용어 · 한 줄 정리"],
                  ["solve", "문제 풀이", "조건 분석 · 필요한 공식 · 단계별 풀이 · 실수 점검"],
                  ["summary", "핵심 요약", "중요 정보 · 핵심 키워드 · 내용 구조 · 빠른 복습"],
                  ["exam", "시험 대비", "암기 포인트 · 예상 문제 · 정답과 해설 · 오답 확인"],
                  ["performance", "수행평가", "조건 분석 · 주제 추천 · 개요 작성 · 기준 점검"]
                ] as Array<[LearningMode, string, string]>
              ).map(([mode, title, description], index) => (
                <li className="category-item" key={mode}>
                  <button className="category-item__button" type="button" onClick={() => chooseMode(mode)}>
                    <span className="category-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="category-item__title">{title}</span>
                    <span className="category-item__description">{description}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="how-it-works" className="section process-section" aria-labelledby="how-it-works-title">
          <div className="container">
            <header className="section-heading">
              <p className="section-eyebrow">LESS SETUP · MORE FOCUS</p>
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
                <p className="section-eyebrow">STUDY YOUR WAY</p>
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
    <SiteHeader />
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = safeNextPath(searchParams.get("next") || location.state?.next);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
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
        <p className="auth-card__intro">이메일 인증을 완료한 계정으로 로그인해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "로그인 중..." : "로그인"}</button>
        </form>
        <div className="auth-links">
          <Link to={`/register${location.search}`}>초대 코드를 받았다면 가입하기</Link>
          <Link to="/forgot-password">비밀번호를 잊으셨나요?</Link>
        </div>
      </section>
    </AuthFrame>
  );
};

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await api.register({ email, password, inviteCode });
      setMessage(result.message);
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
        <p className="auth-card__intro">초대 코드와 이메일 인증이 필요합니다. 비밀번호는 12자 이상으로 설정해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>초대 코드<input autoComplete="off" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required /></label>
          <label>이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>비밀번호<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {message && <p className="form-message" role="status">{message}</p>}
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "가입 중..." : "가입하고 인증하기"}</button>
        </form>
        <div className="auth-links"><Link to={`/login?${searchParams.toString()}`}>이미 계정이 있나요? 로그인</Link></div>
      </section>
    </AuthFrame>
  );
};

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.forgotPassword(email);
      setMessage("가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame>
      <section className="auth-card" aria-labelledby="forgot-title">
        <p className="section-eyebrow">ACCOUNT RECOVERY</p>
        <h1 id="forgot-title">비밀번호를<br />다시 설정해요.</h1>
        <p className="auth-card__intro">가입할 때 사용한 이메일을 입력해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {message && <p className="form-message" role="status">{message}</p>}
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "보내는 중..." : "재설정 링크 보내기"}</button>
        </form>
        <div className="auth-links"><Link to="/login">로그인으로 돌아가기</Link></div>
      </section>
    </AuthFrame>
  );
};

const TokenActionPage = ({ purpose }: { purpose: "verify" | "reset" }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (purpose !== "verify" || !token) {
      return;
    }

    setSubmitting(true);
    api.verifyEmail(token)
      .then(() => setMessage("이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다."))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setSubmitting(false));
  }, [purpose, token]);

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.resetPassword(token, password);
      setMessage("비밀번호를 변경했습니다. 로그인해 주세요.");
      window.setTimeout(() => navigate("/login"), 1000);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return <AuthFrame><section className="auth-card"><p className="form-message form-message--error">유효한 링크가 필요합니다.</p></section></AuthFrame>;
  }

  return (
    <AuthFrame>
      <section className="auth-card" aria-labelledby="token-title">
        <p className="section-eyebrow">STUDYBOX AI</p>
        <h1 id="token-title">{purpose === "verify" ? "이메일을\n인증하는 중이에요." : "새 비밀번호를\n설정해요."}</h1>
        {purpose === "verify" ? (
          <>
            {submitting && <p className="form-message">이메일을 확인하고 있습니다.</p>}
            {message && <p className="form-message" role="status">{message}</p>}
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            {message && <div className="auth-links"><Link to="/login">로그인하기</Link></div>}
          </>
        ) : (
          <form className="auth-form" onSubmit={submitReset}>
            <label>새 비밀번호<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {message && <p className="form-message" role="status">{message}</p>}
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "변경 중..." : "비밀번호 변경"}</button>
          </form>
        )}
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
          <span>{user?.email}</span>
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
          <aside className="chat-settings" aria-labelledby="chat-settings-title">
            <div className="chat-settings__content">
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
                  <button className="chat-send-button" type="submit" disabled={sending || !question.trim()}>{sending ? "답변 준비 중..." : <>보내기 <span aria-hidden="true">↑</span></>}</button>
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
          <p className="account-card__intro">{user?.email}</p>
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
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/verify-email" element={<TokenActionPage purpose="verify" />} />
    <Route path="/reset-password" element={<TokenActionPage purpose="reset" />} />
    <Route path="/app/new" element={<RequireAuth><NewConversationPage /></RequireAuth>} />
    <Route path="/app/:conversationId" element={<RequireAuth><ChatPage /></RequireAuth>} />
    <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
