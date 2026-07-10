import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { BookOpenIcon } from "@phosphor-icons/react/dist/csr/BookOpen";
import { CalculatorIcon } from "@phosphor-icons/react/dist/csr/Calculator";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { NotepadIcon } from "@phosphor-icons/react/dist/csr/Notepad";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { PencilLineIcon } from "@phosphor-icons/react/dist/csr/PencilLine";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { TargetIcon } from "@phosphor-icons/react/dist/csr/Target";
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

interface LearningAgentDefinition {
  mode: LearningMode;
  label: string;
  description: string;
  icon: Icon;
  examples: readonly [string, string, string];
}

const learningAgents = [
  {
    mode: "concept",
    label: "개념 코치",
    description: "개념 이해 · 원리 설명",
    icon: BookOpenIcon,
    examples: [
      "광합성 과정을 쉽게 설명해 줘",
      "중학생 눈높이로 핵심 원리를 알려줘",
      "일상 비유로 다시 설명해 줘"
    ]
  },
  {
    mode: "solve",
    label: "풀이 코치",
    description: "문제 풀이 · 단계별 해설",
    icon: CalculatorIcon,
    examples: [
      "이차방정식 풀이 과정을 알려줘",
      "이 문제에서 먼저 찾아야 할 조건은?",
      "틀린 풀이를 단계별로 고쳐줘"
    ]
  },
  {
    mode: "summary",
    label: "요약 코치",
    description: "핵심 요약 · 정리",
    icon: NotepadIcon,
    examples: [
      "조선 후기 경제 변화를 핵심만 요약해 줘",
      "이 내용을 시험 전 5줄로 줄여 줘",
      "꼭 외울 키워드만 정리해 줘"
    ]
  },
  {
    mode: "exam",
    label: "시험 코치",
    description: "시험 대비 · 문제 연습",
    icon: TargetIcon,
    examples: [
      "세포 분열 시험 포인트를 정리해 줘",
      "예상 문제 3개를 만들어 줘",
      "자주 틀리는 부분을 퀴즈로 내 줘"
    ]
  },
  {
    mode: "performance",
    label: "수행평가 코치",
    description: "보고서 · 발표 · 프로젝트",
    icon: PencilLineIcon,
    examples: [
      "플라스틱 사용을 주제로 발표 개요를 만들어 줘",
      "평가 기준에 맞춰 구성을 점검해 줘",
      "발표 근거와 출처 찾는 순서를 알려 줘"
    ]
  }
] satisfies LearningAgentDefinition[];

const defaultLandingSettings: LearningSettings = {
  ...defaultLearningSettings,
  mode: "solve"
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
        {!loading && (
          <Link className="header-start" to={user ? "/account" : "/login"}>
            {user ? "계정" : "로그인"}
          </Link>
        )}
      </div>
    </header>
  );
};

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [settings, setSettings] = useState<LearningSettings>(defaultLandingSettings);

  useEffect(() => {
    document.body.classList.add("agent-home-page");
    return () => document.body.classList.remove("agent-home-page");
  }, []);

  const startLearning = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const query = new URLSearchParams({
      mode: settings.mode,
      level: settings.level,
      responseLength: settings.responseLength
    }).toString();
    const destination = `/app/new?${query}`;

    window.sessionStorage.setItem(pendingQuestionKey, trimmedQuestion);
    navigate(user ? destination : `/login?next=${encodeURIComponent(destination)}`);
  };

  const selectMode = (mode: LearningMode) => setSettings((current) => ({ ...current, mode }));
  const activeAgent = learningAgents.find((agent) => agent.mode === settings.mode) || learningAgents[0];
  const ActiveAgentIcon = activeAgent.icon;

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    startLearning();
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <SiteHeader />
      <main id="main-content" className="agent-home" tabIndex={-1}>
        <aside className="agent-dock" aria-labelledby="agent-dock-title">
          <p className="agent-dock__eyebrow" id="agent-dock-title">에이전트 도크</p>
          <div className="agent-dock__list">
            {learningAgents.map((agent) => {
              const AgentIcon = agent.icon;
              const active = agent.mode === settings.mode;

              return (
                <button
                  className={`agent-card${active ? " is-active" : ""}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectMode(agent.mode)}
                  key={agent.mode}
                >
                  <AgentIcon className="agent-card__icon" size={30} weight="regular" aria-hidden="true" />
                  <span className="agent-card__content">
                    <strong>{agent.label}</strong>
                    <span>{agent.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="agent-workspace" aria-labelledby="agent-home-title">
          <div className="agent-workspace__inner">
            <label className="agent-mobile-select" htmlFor="mobile-agent-select">
              <span>학습 코치 선택</span>
              <span className="agent-mobile-select__control">
                <select
                  id="mobile-agent-select"
                  value={settings.mode}
                  onChange={(event) => selectMode(event.target.value as LearningMode)}
                >
                  {learningAgents.map((agent) => (
                    <option value={agent.mode} key={agent.mode}>{agent.label}</option>
                  ))}
                </select>
                <CaretDownIcon size={16} weight="bold" aria-hidden="true" />
              </span>
            </label>

            <header className="agent-workspace__header">
              <p>STUDYBOX AI</p>
              <h1 id="agent-home-title">공부할 일을 맡겨보세요.</h1>
              <span aria-live="polite">선택한 {activeAgent.label}가 최적의 방식으로 도와줄게요.</span>
            </header>

            <form className="agent-composer" onSubmit={startLearning} aria-label="학습 질문 시작">
              <label className="visually-hidden" htmlFor="agent-question">문제나 궁금한 내용</label>
              <textarea
                id="agent-question"
                rows={4}
                maxLength={2000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="문제나 궁금한 내용을 입력해 보세요"
              />
              <div className="agent-composer__footer">
                <div className="agent-composer__settings">
                  <label className="agent-select-control">
                    <span className="visually-hidden">학습 코치</span>
                    <ActiveAgentIcon size={20} weight="regular" aria-hidden="true" />
                    <select
                      aria-label="학습 코치"
                      value={settings.mode}
                      onChange={(event) => selectMode(event.target.value as LearningMode)}
                    >
                      {learningAgents.map((agent) => (
                        <option value={agent.mode} key={agent.mode}>{agent.label}</option>
                      ))}
                    </select>
                    <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
                  </label>
                  <label className="agent-select-control">
                    <span className="visually-hidden">학습 수준</span>
                    <SlidersHorizontalIcon size={20} weight="regular" aria-hidden="true" />
                    <select
                      aria-label="학습 수준"
                      value={settings.level}
                      onChange={(event) => setSettings((current) => ({
                        ...current,
                        level: event.target.value as LearningSettings["level"]
                      }))}
                    >
                      {(Object.entries(settingsLabels.level) as Array<[LearningSettings["level"], string]>).map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                    <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
                  </label>
                  <label className="agent-select-control">
                    <span className="visually-hidden">답변 길이</span>
                    <NotepadIcon size={20} weight="regular" aria-hidden="true" />
                    <select
                      aria-label="답변 길이"
                      value={settings.responseLength}
                      onChange={(event) => setSettings((current) => ({
                        ...current,
                        responseLength: event.target.value as LearningSettings["responseLength"]
                      }))}
                    >
                      {(Object.entries(settingsLabels.responseLength) as Array<[LearningSettings["responseLength"], string]>).map(([value, label]) => (
                        <option value={value} key={value}>{label} 길이</option>
                      ))}
                    </select>
                    <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
                  </label>
                </div>
                <button className="agent-submit" type="submit" disabled={!question.trim()}>
                  <PaperPlaneTiltIcon size={20} weight="fill" aria-hidden="true" />
                  <span>시작하기</span>
                </button>
              </div>
            </form>

            <div className="agent-examples">
              <p>예시로 시작해 보세요</p>
              <div className="agent-examples__list">
                {activeAgent.examples.map((example) => (
                  <button type="button" onClick={() => setQuestion(example)} key={example}>
                    <span>{example}</span>
                    <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <p className="agent-workspace__helper">
              <InfoIcon size={18} weight="regular" aria-hidden="true" />
              에이전트와 설정에 따라 답변의 형식과 깊이가 달라집니다.
            </p>
          </div>
        </section>
      </main>
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

  const sendQuestion = async (questionValue: string) => {
    const trimmedQuestion = questionValue.trim();

    if (!conversationId || !trimmedQuestion || sending) {
      return;
    }

    setQuestion(trimmedQuestion);
    setSending(true);
    setError("");

    try {
      const result = await api.sendMessage(conversationId, { question: trimmedQuestion, settings });
      setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
      setQuestion("");
      setConversation((current) => current ? { ...current, settings, updatedAt: result.assistantMessage.createdAt } : current);
      await refreshList();
    } catch (requestError) {
      setQuestion(trimmedQuestion);
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    void sendQuestion(question);
  };

  useEffect(() => {
    if (loading || sending || messages.length || !conversationId) {
      return;
    }

    const pendingQuestion = window.sessionStorage.getItem(pendingQuestionKey);

    if (!pendingQuestion) {
      return;
    }

    window.sessionStorage.removeItem(pendingQuestionKey);
    setQuestion(pendingQuestion);
    void sendQuestion(pendingQuestion);
  }, [loading, sending, messages.length, conversationId]);

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
