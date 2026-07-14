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
  normalizeAnswerLevel,
  normalizeLearningSettings,
  type Conversation,
  type LearningMode,
  type LearningSettings,
  type Message
} from "@studybox/shared";
import { ArrowRight, ArrowUp, ArrowUpRight, ChatCircleDots } from "@phosphor-icons/react";

import { api, ApiClientError } from "./api";
import { useAuth } from "./auth";
import { DeepLanding } from "./DeepLanding";
import { CapabilityStrip, ProductDemo } from "./LandingHighlights";
import { LearningMethod } from "./LearningMethod";

const settingsLabels = {
  mode: {
    concept: "개념 설명",
    solve: "문제 풀이",
    summary: "핵심 요약",
    exam: "시험 대비",
    performance: "수행평가"
  },
  level: {
    middle1: "중학교 1학년",
    middle2: "중학교 2학년",
    middle3: "중학교 3학년",
    high1: "고등학교 1학년",
    high2: "고등학교 2학년",
    high3: "고등학교 3학년"
  },
  responseLength: { short: "짧게", standard: "보통", detailed: "자세히" }
} as const;

const previewResponses: Record<
  LearningMode,
  {
    question: string;
    title: string;
    summary: string;
    sections: Array<{ title: string; content: string }>;
    closing: string;
    followUps: string[];
  }
> = {
  concept: {
    question: "광합성 과정을 쉽게 설명해 줘",
    title: "광합성은 빛의 힘을 포도당에 저장하는 과정이에요",
    summary: "식물은 햇빛을 그대로 먹는 것이 아니라, 빛에서 얻은 에너지로 물과 이산화탄소를 포도당으로 바꿔요. 만들어진 포도당은 식물이 자라고 살아가는 데 필요한 에너지원이 됩니다.",
    sections: [
      { title: "재료는 어디서 올까요?", content: "뿌리는 흙에서 물을 흡수하고, 잎은 기공을 통해 공기 중의 이산화탄소를 받아들여요. 햇빛은 잎 속 엽록체의 엽록소가 흡수합니다." },
      { title: "잎 안에서는 무슨 일이 일어날까요?", content: "엽록체는 빛에너지를 이용해 물과 이산화탄소를 포도당으로 바꿔요. 이 과정에서 식물이 사용하고 남은 산소가 밖으로 나옵니다." },
      { title: "왜 중요한가요?", content: "포도당에는 빛에서 얻은 에너지가 화학 에너지 형태로 저장돼요. 식물은 이 에너지로 자라고, 다른 생물도 식물을 먹으며 에너지를 얻습니다." }
    ],
    closing: "정리하면 광합성은 ‘빛에너지를 생물이 사용할 수 있는 에너지로 바꾸는 과정’이라고 기억하면 좋아요.",
    followUps: ["명반응과 암반응도 알려줘", "광합성 확인 문제 풀기"]
  },
  solve: {
    question: "이차방정식 x²-5x+6=0을 풀어 줘",
    title: "인수분해하면 두 해를 차근차근 찾을 수 있어요",
    summary: "이 식은 x²의 계수가 1이므로, 곱해서 6이 되고 더해서 -5가 되는 두 수를 찾으면 됩니다. 두 수는 -2와 -3이에요.",
    sections: [
      { title: "1. 식을 인수분해해요", content: "x²-5x+6은 (x-2)(x-3)으로 묶을 수 있어요. 실제로 두 괄호를 전개하면 x²-3x-2x+6이 되어 원래 식과 같아집니다." },
      { title: "2. 각 괄호를 0으로 만들어요", content: "두 수의 곱이 0이라면 둘 중 하나는 반드시 0이어야 해요. 따라서 x-2=0 또는 x-3=0으로 나눠 생각할 수 있습니다." },
      { title: "3. 답을 확인해요", content: "x=2와 x=3을 원래 식에 넣으면 두 경우 모두 0이 돼요. 그래서 이 방정식의 해는 x=2 또는 x=3입니다." }
    ],
    closing: "인수분해 문제에서는 ‘곱은 상수항, 합은 일차항의 계수’가 되는 두 수를 먼저 찾으면 풀이가 빨라져요.",
    followUps: ["인수분해가 안 될 때는?", "비슷한 문제 하나 더"]
  },
  summary: {
    question: "조선 후기 경제 변화를 핵심만 요약해 줘",
    title: "생산이 늘고 시장이 연결되면서 상품 화폐 경제가 성장했어요",
    summary: "조선 후기에는 농업 생산량이 늘고 장시와 포구가 발달했어요. 사람들이 필요한 물건을 시장에서 사고파는 일이 많아지면서 화폐 사용과 전문 상인의 활동도 함께 커졌습니다.",
    sections: [
      { title: "농업 생산의 변화", content: "모내기법이 널리 퍼지고 일부 농민은 넓은 땅을 경작하는 광작을 했어요. 시장에 내다 팔기 위한 인삼, 담배 같은 상품 작물 재배도 늘었습니다." },
      { title: "시장과 상인의 성장", content: "정기 시장인 장시와 물류 중심지인 포구가 성장했고, 사상과 보부상이 지역 사이의 상품 유통을 맡았어요. 덕분에 서로 떨어진 시장도 점차 연결됐습니다." },
      { title: "시험에서 연결할 흐름", content: "생산력 증가 → 상품 작물 재배 → 장시와 포구 성장 → 화폐 유통 확대 순서로 이해하면 경제 변화의 흐름을 기억하기 쉬워요." }
    ],
    closing: "핵심 키워드는 광작, 상품 작물, 장시, 포구, 사상, 상품 화폐 경제입니다.",
    followUps: ["대동법과도 연결해 줘", "시험용 표로 정리해 줘"]
  },
  exam: {
    question: "중간고사 전에 세포 분열을 정리해 줘",
    title: "체세포 분열과 감수 분열은 목적과 결과가 달라요",
    summary: "체세포 분열은 몸의 성장과 회복을 위해 같은 세포를 만들고, 감수 분열은 생식세포를 만들기 위해 염색체 수를 절반으로 줄여요. 시험에서는 분열 횟수와 결과 세포 수를 함께 비교하는 문제가 자주 나옵니다.",
    sections: [
      { title: "체세포 분열", content: "한 번 분열해 유전적으로 같은 두 세포를 만들어요. 결과 세포의 염색체 수는 모세포와 같고, 성장하거나 상처를 회복할 때 이용됩니다." },
      { title: "감수 분열", content: "연속 두 번 분열해 네 개의 생식세포를 만들어요. 결과 세포의 염색체 수는 모세포의 절반이며, 세포마다 유전 정보의 조합도 달라집니다." },
      { title: "자주 틀리는 부분", content: "DNA가 복제되는 횟수와 세포가 분열하는 횟수를 구분해야 해요. 감수 분열은 DNA를 한 번 복제한 뒤 세포 분열을 두 번 진행합니다." }
    ],
    closing: "문제를 풀 때는 ‘목적, 분열 횟수, 세포 수, 염색체 수’ 네 항목을 표처럼 비교해 보세요.",
    followUps: ["비교표로 다시 보여줘", "시험 문제 3개 내 줘"]
  },
  performance: {
    question: "플라스틱 사용을 주제로 발표 개요를 만들어 줘",
    title: "문제 제기부터 실천 제안까지 자연스럽게 연결해요",
    summary: "자료를 많이 보여주는 것보다 ‘왜 문제인지, 우리 생활에 어떤 영향을 주는지, 무엇을 바꿀 수 있는지’가 이어지는 구성이 더 설득력 있어요. 5분 발표라면 핵심 사례 하나를 중심으로 내용을 좁히는 것이 좋습니다.",
    sections: [
      { title: "도입: 내 생활에서 시작하기", content: "하루 동안 사용한 일회용 플라스틱을 직접 세어 본 경험이나 사진으로 시작해요. 가까운 사례는 청중이 문제를 자기 일처럼 느끼게 합니다." },
      { title: "본론: 원인과 영향을 연결하기", content: "편리함 때문에 사용량이 늘어난 원인과, 잘 분해되지 않아 생태계에 남는 영향을 자료로 설명해요. 개인, 학교, 기업이 할 수 있는 해결책도 각각 한 가지씩 제시합니다." },
      { title: "마무리: 하나의 행동을 남기기", content: "여러 실천을 나열하기보다 ‘이번 주에는 교내 매점에서 일회용 컵을 줄이자’처럼 바로 실행할 수 있는 행동 하나를 제안해요." }
    ],
    closing: "발표 자료에는 문장 전체보다 핵심 수치와 사진을 넣고, 자세한 설명은 말로 전달하면 집중도가 높아져요.",
    followUps: ["5분 발표 대본도 써 줘", "슬라이드 순서 추천해 줘"]
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof ApiClientError ? error.message : "잠시 후 다시 시도해 주세요.";

const LoadingPage = () => <main className="loading-page">불러오는 중입니다.</main>;

const BrandLogo = () => (
  <>
    <span className="brand-mark" aria-hidden="true"><i /><i /></span>
    <span className="brand-name">StudyBox <strong>AI</strong></span>
  </>
);

const SiteHeader = ({ tone = "dark", minimal = false }: { tone?: "dark" | "light"; minimal?: boolean }) => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openingRecentConversation, setOpeningRecentConversation] = useState(false);
  const showRecentConversation = Boolean(user && pathname === "/");

  const openRecentConversation = async () => {
    if (openingRecentConversation) {
      return;
    }

    setOpeningRecentConversation(true);

    try {
      const { conversations } = await api.listConversations();
      navigate(conversations[0] ? `/app/${conversations[0].id}` : "/app/new");
    } catch {
      navigate("/app/new");
    }
  };

  return (
    <header className={`site-header site-header--${tone}${minimal ? " site-header--minimal" : ""}`}>
      <div className="site-header__inner container">
        <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동">
          <BrandLogo />
        </Link>
        {!minimal && (
          <nav className="primary-navigation" aria-label="주요 메뉴">
            <a href="/#story">답변 설계</a>
            <a href="/#categories">답변 미리보기</a>
            <a href="/#learning-app">질문 시작</a>
          </nav>
        )}
        {!loading && (
          <div className="site-header__actions">
            {showRecentConversation && (
              <button
                className="header-recent"
                type="button"
                onClick={openRecentConversation}
                disabled={openingRecentConversation}
                aria-busy={openingRecentConversation}
              >
                {openingRecentConversation ? "불러오는 중…" : "최근 대화"}
              </button>
            )}
            <Link className="header-start" to={user ? "/app/new" : "/login?next=/app/new"}>
              {user ? "학습 시작" : "로그인"}
            </Link>
          </div>
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
          <BrandLogo />
        </Link>
        <p>질문은 하나, 공부는 내 방식대로.</p>
      </div>
      <p>StudyBox AI 시험 운영 · {new Date().getFullYear()}</p>
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
        <span>답변 미리보기</span>
      </div>
      <div className="product-preview__layout">
        <div className="product-preview__settings">
          <p>답변 방식</p>
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
        <article className="product-preview__answer" key={mode} aria-live="polite">
          <div className="product-preview__assistant">
            <span aria-hidden="true"><ChatCircleDots weight="fill" /></span>
            <div><strong>StudyBox AI</strong><small>현재 설정에 맞춰 설명했어요</small></div>
          </div>
          <p className="product-preview__eyebrow">
            {settingsLabels.mode[mode]} · 중학교 2학년 · 보통 길이
          </p>
          <h3>{response.title}</h3>
          <p className="product-preview__summary">{response.summary}</p>
          <div className="product-preview__sections">
            {response.sections.map((section, index) => (
              <section key={section.title}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div><h4>{section.title}</h4><p>{section.content}</p></div>
              </section>
            ))}
          </div>
          <p className="product-preview__closing">{response.closing}</p>
          <div className="product-preview__followups">
            <span>이어서 물어보기</span>
            <ul aria-label="이어서 물어볼 수 있는 질문">
              {response.followUps.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);

  useEffect(() => {
    const scrollEffectsEnabled = false;
    if (!scrollEffectsEnabled) {
      return;
    }

    const flow = document.querySelector<HTMLElement>(".mode-flow");
    if (!flow) {
      return;
    }

    const root = document.documentElement;
    const hero = document.querySelector<HTMLElement>(".scroll-scene--hero");
    const workspace = document.querySelector<HTMLElement>(".scroll-scene--workspace");
    const kineticStory = document.querySelector<HTMLElement>(".kinetic-story");
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(".scroll-scene"));
    const items = Array.from(flow.querySelectorAll<HTMLElement>(".mode-flow__item"));
    const progressLinks = Array.from(flow.querySelectorAll<HTMLElement>(".mode-flow__progress a"));
    let animationFrame = 0;
    let observer: IntersectionObserver | undefined;
    let previousScrollY = window.scrollY;
    const smoothstep = (start: number, end: number, value: number) => {
      const progress = Math.min(1, Math.max(0, (value - start) / Math.max(0.001, end - start)));
      return progress * progress * (3 - 2 * progress);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("is-in-view", entry.isIntersecting);
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
      );
      items.forEach((item) => observer?.observe(item));
    } else {
      items.forEach((item) => item.classList.add("is-in-view"));
    }

    const updateScrollEffects = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight || 1;
        const scrollDelta = window.scrollY - previousScrollY;
        const scrollVelocity = Math.min(1, Math.abs(scrollDelta) / 42);

        if (Math.abs(scrollDelta) > 0.2) {
          root.style.setProperty("--scroll-direction", scrollDelta > 0 ? "1" : "-1");
        }
        root.style.setProperty("--scroll-velocity", scrollVelocity.toFixed(3));
        previousScrollY = window.scrollY;
        const scrollRange = Math.max(1, root.scrollHeight - viewportHeight);
        const pageProgress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
        const flowRect = flow.getBoundingClientRect();
        const flowProgress = Math.min(
          1,
          Math.max(0, (viewportHeight - flowRect.top) / (flowRect.height + viewportHeight))
        );

        root.style.setProperty("--page-progress", pageProgress.toFixed(4));

        scenes.forEach((scene) => {
          const rect = scene.getBoundingClientRect();
          const sceneProgress = Math.min(
            1,
            Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height))
          );
          const sceneCenter = Math.min(
            1,
            Math.max(-1, (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight)
          );

          scene.style.setProperty("--scene-progress", sceneProgress.toFixed(4));
          scene.style.setProperty("--scene-center", sceneCenter.toFixed(4));
          scene.style.setProperty("--scene-offset", `${(sceneCenter * 112).toFixed(2)}px`);
          scene.style.setProperty("--scene-tilt", `${(sceneCenter * 7).toFixed(2)}deg`);
          scene.style.setProperty("--scene-scale", (1 - Math.abs(sceneCenter) * 0.022).toFixed(4));
          scene.classList.toggle("is-scene-active", rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.18);
        });

        if (hero) {
          hero.dataset.heroPhase = "home";
        }

        if (kineticStory) {
          const kineticRect = kineticStory.getBoundingClientRect();
          const kineticTravel = Math.max(1, kineticRect.height - viewportHeight);
          const kineticProgress = Math.min(1, Math.max(0, -kineticRect.top / kineticTravel));
          const intro = smoothstep(0.01, 0.12, kineticProgress);
          const idea = smoothstep(0.13, 0.28, kineticProgress);
          const gallery = smoothstep(0.29, 0.47, kineticProgress);
          const galleryOut = smoothstep(0.55, 0.68, kineticProgress);
          const workspaceIn = smoothstep(0.66, 0.84, kineticProgress);
          const finish = smoothstep(0.9, 0.99, kineticProgress);

          kineticStory.style.setProperty("--kinetic-progress", kineticProgress.toFixed(4));
          kineticStory.style.setProperty("--kinetic-intro", intro.toFixed(4));
          kineticStory.style.setProperty("--kinetic-idea", idea.toFixed(4));
          kineticStory.style.setProperty("--kinetic-gallery", gallery.toFixed(4));
          kineticStory.style.setProperty("--kinetic-gallery-out", galleryOut.toFixed(4));
          kineticStory.style.setProperty("--kinetic-workspace", workspaceIn.toFixed(4));
          kineticStory.style.setProperty("--kinetic-finish", finish.toFixed(4));
          kineticStory.style.setProperty("--kinetic-rail", `${((1 - gallery) * 34 - galleryOut * 26).toFixed(2)}vw`);
          kineticStory.style.setProperty("--kinetic-turn", `${(kineticProgress * 238).toFixed(2)}deg`);
          kineticStory.dataset.kineticPhase = kineticProgress < 0.15
            ? "intro"
            : kineticProgress < 0.3
              ? "idea"
              : kineticProgress < 0.66
                ? "gallery"
                : "workspace";
        }

        if (workspace) {
          const workspaceRect = workspace.getBoundingClientRect();
          const workspaceTravel = Math.max(1, workspaceRect.height - viewportHeight);
          const workspaceProgress = Math.min(1, Math.max(0, -workspaceRect.top / workspaceTravel));
          const workspaceReveal = Math.min(1, Math.max(0, (workspaceProgress - 0.06) / 0.68));
          const workspaceContent = Math.min(1, Math.max(0, (workspaceProgress - 0.48) / 0.42));

          workspace.style.setProperty("--workspace-progress", workspaceProgress.toFixed(4));
          workspace.style.setProperty("--workspace-reveal", workspaceReveal.toFixed(4));
          workspace.style.setProperty("--workspace-wordmark-opacity", (1 - Math.min(1, workspaceReveal * 1.08)).toFixed(4));
          workspace.style.setProperty("--workspace-wordmark-scale", (1 - workspaceReveal * 0.4).toFixed(4));
          workspace.style.setProperty("--workspace-wordmark-y", `${(workspaceReveal * -118).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-media-opacity", (0.12 + workspaceReveal * 0.82).toFixed(4));
          workspace.style.setProperty("--workspace-media-scale", (1.18 - workspaceReveal * 0.18).toFixed(4));
          workspace.style.setProperty("--workspace-media-y", `${(workspaceReveal * -46).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-shade-opacity", (0.92 - workspaceReveal * 0.72).toFixed(4));
          workspace.style.setProperty("--workspace-surface-opacity", Math.pow(workspaceReveal, 1.65).toFixed(4));
          workspace.style.setProperty("--workspace-surface-scale", (1.18 - workspaceReveal * 0.12).toFixed(4));
          workspace.style.setProperty("--workspace-surface-y", "0px");
          workspace.style.setProperty("--workspace-surface-z", "0px");
          workspace.style.setProperty("--workspace-surface-rotate", "0deg");
          workspace.style.setProperty("--workspace-content-opacity", workspaceContent.toFixed(4));
          workspace.style.setProperty("--workspace-content-y", `${((1 - workspaceContent) * 54).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-content-z", `${((1 - workspaceContent) * -150).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-panel-scale", (0.78 + workspaceContent * 0.22).toFixed(4));
          workspace.style.setProperty("--workspace-panel-y", `${((1 - workspaceContent) * 74).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-panel-z", `${((1 - workspaceContent) * -260).toFixed(2)}px`);
          workspace.style.setProperty("--workspace-panel-rotate", `${((1 - workspaceContent) * 9).toFixed(2)}deg`);
          workspace.dataset.workspacePhase = workspaceReveal < 0.03 ? "wordmark" : workspaceContent < 0.96 ? "reveal" : "workspace";
        }

        flow.style.setProperty("--flow-progress", flowProgress.toFixed(4));
        flow.style.setProperty("--flow-shift", `${flowProgress * 300}px`);
        flow.style.setProperty("--flow-shift-reverse", `${flowProgress * -230}px`);
        flow.classList.toggle("is-flow-active", flowRect.top < viewportHeight * 0.7 && flowRect.bottom > viewportHeight * 0.3);

        let activeIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        items.forEach((item, index) => {
          const rect = item.getBoundingClientRect();
          const centerOffset = Math.min(
            1,
            Math.max(-1, (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight)
          );
          const sceneProgress = Math.min(
            1,
            Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height))
          );
          const direction = index % 2 === 0 ? 1 : -1;
          const distance = Math.abs(centerOffset);

          item.style.setProperty("--card-shift", `${centerOffset * -72}px`);
          item.style.setProperty("--card-rotate", `${centerOffset * direction * 8}deg`);
          item.style.setProperty("--card-scale", (1 - distance * 0.055).toFixed(4));
          item.style.setProperty("--copy-shift", `${centerOffset * -42}px`);
          item.style.setProperty("--fx-shift", `${(sceneProgress - 0.5) * 320}px`);
          item.style.setProperty("--card-glow", (1 - distance * 0.72).toFixed(4));
          item.style.setProperty("--scene-progress", sceneProgress.toFixed(4));

          if (distance < closestDistance) {
            closestDistance = distance;
            activeIndex = index;
          }
        });

        progressLinks.forEach((link, index) => link.classList.toggle("is-active", index === activeIndex));
      });
    };

    updateScrollEffects();
    window.addEventListener("scroll", updateScrollEffects, { passive: true });
    window.addEventListener("resize", updateScrollEffects);

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrollEffects);
      window.removeEventListener("resize", updateScrollEffects);
      root.style.removeProperty("--page-progress");
      root.style.removeProperty("--scroll-direction");
      root.style.removeProperty("--scroll-velocity");
    };
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".page-reveal, .scroll-rise"));

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const startLearning = () => {
    const query = new URLSearchParams({
      mode: settings.mode,
      level: settings.level,
      responseLength: settings.responseLength
    }).toString();
    const destination = `/app/new?${query}`;

    navigate(user ? destination : `/login?next=${encodeURIComponent(destination)}`);
  };

  const selectMode = (mode: LearningMode) => setSettings((current) => ({ ...current, mode }));

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <SiteHeader tone="light" minimal />
      <main id="main-content" className="landing-page landing-page--static" tabIndex={-1}>
        <DeepLanding embedded />
        <CapabilityStrip />

        <section id="product-tour" className="product-tour scene-stack scene-stack--tour" aria-labelledby="product-tour-title">
          <div className="product-tour__inner">
            <header className="product-tour__heading scroll-rise">
              <div>
                <p>실제 학습 화면</p>
                <h2 id="product-tour-title">질문하면,<br /><strong>설명이 차근차근 이어져요.</strong></h2>
              </div>
              <p>답만 툭 보여주지 않아요. 어디에서 막혔는지 살펴보고, 익숙한 예시와 확인 문제까지 한 대화 안에서 이어갑니다.</p>
            </header>
            <div className="product-tour__mockup scroll-rise">
              <ProductDemo />
            </div>
          </div>
        </section>

        <LearningMethod />

        <section id="categories" className="answer-showcase scroll-scene scene-stack scene-stack--answer" aria-labelledby="categories-title">
          <div className="answer-showcase__inner">
            <header className="answer-showcase__header scroll-rise">
              <div className="answer-showcase__title">
                <p>답변 미리보기</p>
                <h2 id="categories-title">같은 질문도,<br /><strong>내가 원하는 방식으로.</strong></h2>
              </div>
              <p className="answer-showcase__note">
                <b>버튼을 눌러 비교해 보세요</b>
                쉽게 이해하고 싶을 때, 시험 전에 정리하고 싶을 때, 발표를 준비할 때 필요한 답은 서로 달라요.
              </p>
            </header>
            <div className="answer-showcase__preview scroll-rise">
              <LearningPreview mode={settings.mode} onModeChange={selectMode} />
            </div>
          </div>
        </section>

        <section id="learning-app" className="workspace-invite scroll-scene scroll-scene--workspace scene-stack scene-stack--workspace" aria-labelledby="learning-app-title">
          <div className="workspace-invite__stage">
            <div className="workspace-invite__inner">
              <header className="workspace-invite__header page-reveal page-reveal--left">
                <p className="section-eyebrow">지금 막힌 게 있다면</p>
                <h2 id="learning-app-title">그 질문부터,<br /><span>같이 풀어봐요.</span></h2>
                <p>완벽한 문장으로 묻지 않아도 괜찮아요. 지금 아는 만큼만 적으면, 헷갈린 지점부터 찾아 이해되는 말로 다시 설명해 드릴게요.</p>
                <p className="workspace-invite__assurance">학년과 답변 방식은 대화 중에도 언제든 바꿀 수 있어요.</p>
                <div className="workspace-invite__actions">
                  <button className="button button--primary workspace-invite__button" type="button" onClick={startLearning}>
                    내 질문으로 시작하기 <ArrowUpRight weight="bold" aria-hidden="true" />
                  </button>
                  <a className="workspace-invite__secondary" href="#categories">
                    답변 예시 다시 보기 <ArrowRight weight="bold" aria-hidden="true" />
                  </a>
                </div>
              </header>

              <div className="closing-conversation-stage page-reveal page-reveal--product">
                <div className="closing-conversation" role="region" aria-label="StudyBox AI 대화 예시">
                  <header>
                    <div><BrandLogo /></div>
                    <span><i aria-hidden="true" /> 답변 준비됨</span>
                  </header>
                  <div className="closing-conversation__body">
                    <p className="closing-conversation__question">왜 음수끼리 곱하면 양수가 되는지 아직도 헷갈려.</p>
                    <article className="closing-conversation__answer">
                      <span className="closing-conversation__avatar" aria-hidden="true"><ChatCircleDots weight="fill" /></span>
                      <div>
                        <strong>그 부분은 ‘부호’를 방향이라고 생각하면 쉬워져요.</strong>
                        <p>음수는 방향을 반대로 바꾼다는 뜻으로 볼 수 있어요. 음수를 한 번 곱하면 방향이 한 번 바뀌고, 음수를 다시 곱하면 방향이 한 번 더 바뀌어서 원래 방향으로 돌아옵니다.</p>
                        <p>예를 들어 <b>-3 × -2</b>는 ‘-3을 반대 방향으로 2번 움직인다’고 생각할 수 있어서 결과가 <b>+6</b>이 돼요.</p>
                        <div className="closing-conversation__key">방향을 한 번 바꾸면 음수, 두 번 바꾸면 다시 양수</div>
                        <div className="closing-conversation__suggestions"><span>수직선으로 보기</span><span>확인 문제 풀기</span></div>
                      </div>
                    </article>
                  </div>
                  <footer className="closing-conversation__composer">
                    <span>이어서 궁금한 내용을 입력하세요</span>
                    <b aria-hidden="true"><ArrowUp weight="bold" /></b>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

const WorkspaceSettings = ({
  settings,
  onChange
}: {
  settings: LearningSettings;
  onChange: (settings: LearningSettings) => void;
}) => {
  const change = <K extends keyof LearningSettings>(key: K, value: LearningSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="workspace-controls" aria-label="현재 답변 설정">
      <label>
        <span>학습 모드</span>
        <select
          aria-label="학습 모드"
          value={settings.mode}
          onChange={(event) => change("mode", event.target.value as LearningSettings["mode"])}
        >
          {(Object.entries(settingsLabels.mode) as Array<[LearningMode, string]>).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>답변 수준</span>
        <select
          aria-label="답변 수준"
          value={settings.level}
          onChange={(event) => change("level", event.target.value as LearningSettings["level"])}
        >
          {(Object.entries(settingsLabels.level) as Array<[LearningSettings["level"], string]>).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>답변 길이</span>
        <select
          aria-label="답변 길이"
          value={settings.responseLength}
          onChange={(event) => change("responseLength", event.target.value as LearningSettings["responseLength"])}
        >
          {(Object.entries(settingsLabels.responseLength) as Array<[LearningSettings["responseLength"], string]>).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

const AuthFrame = ({ children, variant }: { children: ReactNode; variant: "login" | "register" }) => {
  const isLogin = variant === "login";

  return (
    <>
      <SiteHeader tone="light" />
      <main className={`auth-page auth-page--${variant}`}>
        <div className="auth-ambient" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
          <i />
        </div>
        <div className={`auth-shell auth-shell--${variant}`}>
          <section className="auth-story" aria-label={isLogin ? "학습 이어하기" : "학습 환경 만들기"}>
            <p className="auth-story__eyebrow">{isLogin ? "다시 이어가는 공부" : "나만의 학습 설정"}</p>
            <h2>{isLogin ? <>멈춘 곳에서,<br /><strong>생각을 이어가세요.</strong></> : <>처음 한 번의 설정으로,<br /><strong>답변의 기준이 달라집니다.</strong></>}</h2>
            <p className="auth-story__description">
              {isLogin
                ? "지난 대화와 학습 설정을 그대로 불러와 바로 다음 질문을 시작합니다."
                : "학교 정보와 계정을 연결해 나에게 맞는 AI 학습 작업 공간을 만듭니다."}
            </p>
            {isLogin ? (
              <div className="auth-activity" aria-hidden="true">
                <header><span><i /> 최근 학습</span><b>이어하기</b></header>
                <div className="auth-activity__question"><span>나</span><p>광합성에서 빛이 꼭 필요한 이유는?</p></div>
                <div className="auth-activity__answer"><span>AI</span><p><b>빛은 에너지원이에요.</b> 식물이 포도당을 만드는 과정의 출발점부터 이어서 살펴볼게요.</p></div>
                <footer><i /><i /><i /><span>답변 생성 완료</span></footer>
              </div>
            ) : (
              <ol className="auth-setup" aria-label="가입 단계">
                <li className="is-current"><span>01</span><div><b>계정 정보</b><p>나만의 StudyBox 아이디 준비</p></div></li>
                <li><span>02</span><div><b>학생 정보</b><p>학교와 현재 학년 설정</p></div></li>
                <li><span>03</span><div><b>학습 시작</b><p>나만의 대화 기록 만들기</p></div></li>
              </ol>
            )}
          </section>
          {children}
        </div>
      </main>
    </>
  );
};

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
    <AuthFrame variant="login">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__topline"><span><i /> 학습 공간 연결됨</span><Link to="/">홈으로</Link></div>
        <p className="section-eyebrow">StudyBox AI 시험 운영</p>
        <h1 id="login-title">다시 만나서<br />반가워요.</h1>
        <p className="auth-card__intro">계정에 로그인하고 계속하던 공부를 이어가세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <label><span>아이디</span><input autoComplete="username" minLength={4} maxLength={20} pattern="[a-z0-9_]{4,20}" placeholder="studybox_id" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required /></label>
          <label><span>비밀번호</span><input type="password" autoComplete="current-password" placeholder="비밀번호를 입력하세요" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary auth-submit" type="submit" disabled={submitting}><span>{submitting ? "학습 공간을 여는 중..." : "로그인하고 이어가기"}</span><b aria-hidden="true">→</b></button>
        </form>
        <div className="auth-links">
          <span>아직 StudyBox 계정이 없나요?</span>
          <Link to={`/register${location.search}`}>새 계정 만들기 <b aria-hidden="true">↗</b></Link>
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
    <AuthFrame variant="register">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-card__topline"><span><i /> 누구나 가입 가능</span><Link to="/">홈으로</Link></div>
        <p className="section-eyebrow">StudyBox AI 시험 운영</p>
        <h1 id="register-title">내 공부를 위한<br />계정을 만들어요.</h1>
        <p className="auth-card__intro">아이디와 학교 정보를 입력하면 바로 학습을 시작할 수 있어요. 비밀번호는 12자 이상으로 설정해 주세요.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form__group">
            <div className="auth-form__group-title"><span>01</span><p><b>계정 정보</b><small>학습 공간에 사용할 로그인 아이디</small></p></div>
            <label><span>아이디</span><input autoComplete="username" minLength={4} maxLength={20} pattern="[a-z0-9_]{4,20}" placeholder="영문 소문자, 숫자, 밑줄 4-20자" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required /></label>
          </div>
          <div className="auth-form__group">
            <div className="auth-form__group-title"><span>02</span><p><b>학생 정보</b><small>학교 학습 환경에 맞춘 기본 설정</small></p></div>
            <div className="auth-form__student-grid">
              <label><span>이름</span><input autoComplete="name" maxLength={50} placeholder="이름" value={realName} onChange={(event) => setRealName(event.target.value)} required /></label>
              <label><span>학교명</span><input autoComplete="organization" maxLength={100} placeholder="학교 이름" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required /></label>
            </div>
            <div className="auth-form__school-numbers">
              <label><span>학년</span><input type="number" inputMode="numeric" min={1} max={6} placeholder="2" value={grade} onChange={(event) => setGrade(event.target.value)} required /></label>
              <label><span>반</span><input type="number" inputMode="numeric" min={1} max={99} placeholder="3" value={classNumber} onChange={(event) => setClassNumber(event.target.value)} required /></label>
              <label><span>번호</span><input type="number" inputMode="numeric" min={1} max={99} placeholder="12" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} required /></label>
            </div>
          </div>
          <div className="auth-form__group auth-form__group--last">
            <div className="auth-form__group-title"><span>03</span><p><b>비밀번호</b><small>12자 이상으로 안전하게 설정</small></p></div>
            <label><span>새 비밀번호</span><input type="password" autoComplete="new-password" minLength={12} placeholder="12자 이상 입력하세요" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          </div>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="button button--primary auth-submit" type="submit" disabled={submitting}><span>{submitting ? "학습 공간을 만드는 중..." : "내 학습 공간 만들기"}</span><b aria-hidden="true">→</b></button>
        </form>
        <div className="auth-links"><span>이미 계정이 있나요?</span><Link to={`/login?${searchParams.toString()}`}>로그인해서 이어가기 <b aria-hidden="true">↗</b></Link></div>
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
        <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동"><BrandLogo /></Link>
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
    () =>
      normalizeLearningSettings({
        mode: searchParams.get("mode"),
        level: normalizeAnswerLevel(searchParams.get("level")),
        responseLength: searchParams.get("responseLength")
      }) || defaultLearningSettings,
    [searchParams]
  );

  useEffect(() => {
    let active = true;
    const draft = searchParams.get("draft")?.trim();
    api.createConversation({ settings })
      .then(({ conversation }) => {
        if (active) {
          navigate(`/app/${conversation.id}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`, { replace: true });
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
  const { user, logout } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null);
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);
  const [question, setQuestion] = useState(() => searchParams.get("draft") || "");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usageLimit, setUsageLimit] = useState<number | null>(null);

  const refreshList = async () => {
    const result = await api.listConversations();
    setConversations(result.conversations);
  };

  const loadConversation = async (id: string, active: () => boolean) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getConversation(id);
      if (!active()) {
        return;
      }
      setConversation(result.conversation);
      setMessages(result.messages);
      setNextMessageCursor(result.nextCursor);
      setSettings(result.conversation.settings);
      setTitle(result.conversation.title);
      await refreshList();
    } catch (requestError) {
      if (active()) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (active()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    document.body.classList.add("chat-page");
    return () => document.body.classList.remove("chat-page");
  }, []);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let active = true;
    loadConversation(conversationId, () => active);

    return () => {
      active = false;
    };
  }, [conversationId]);

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
      setUsageLimit(result.usageLimit);
      setConversation((current) => current ? { ...current, settings, updatedAt: result.assistantMessage.createdAt } : current);
      await refreshList();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const loadEarlierMessages = async () => {
    if (!conversationId || !nextMessageCursor || sending || loadingEarlier) {
      return;
    }

    setLoadingEarlier(true);
    setError("");
    try {
      const result = await api.getConversation(conversationId, { before: nextMessageCursor });
      setMessages((current) => [...result.messages, ...current]);
      setNextMessageCursor(result.nextCursor);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoadingEarlier(false);
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

  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
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
      <main id="chat-main" className="workspace-app" tabIndex={-1}>
        <aside
          id="workspace-sidebar"
          className={`workspace-sidebar${sidebarOpen ? " is-open" : ""}`}
          aria-label="학습 작업 공간 메뉴"
        >
          <header className="workspace-sidebar__header">
            <Link className="brand-link" to="/" aria-label="StudyBox AI 처음으로 이동"><BrandLogo /></Link>
            <button className="workspace-sidebar__close" type="button" aria-label="작업 공간 메뉴 닫기" onClick={() => setSidebarOpen(false)}>×</button>
          </header>

          <button
            className="workspace-new-button"
            type="button"
            onClick={() => navigate(`/app/new?${new URLSearchParams({ mode: settings.mode, level: settings.level, responseLength: settings.responseLength }).toString()}`)}
          >
            <span aria-hidden="true">＋</span> 새 학습
          </button>

          <p className="workspace-sidebar__label">대화</p>
          <nav className="conversation-list" aria-label="내 대화 목록">
            {conversations.map((item) => (
              <Link
                className={`conversation-list__item${item.id === conversation.id ? " is-active" : ""}`}
                to={`/app/${item.id}`}
                onClick={() => setSidebarOpen(false)}
                key={item.id}
              >
                <strong>{item.title}</strong>
                <span>{item.lastMessagePreview || "아직 메시지가 없습니다."}</span>
              </Link>
            ))}
          </nav>

          <button className="workspace-delete-button" type="button" onClick={deleteCurrentConversation}>현재 대화 삭제</button>

          <footer className="workspace-sidebar__footer">
            <Link to="/account" className="workspace-user">
              <span>{user?.realName?.slice(0, 1) || "S"}</span>
              <p><strong>{user?.realName || user?.username}</strong><small>{user?.schoolName}</small></p>
            </Link>
            <button type="button" onClick={signOut}>로그아웃</button>
          </footer>
        </aside>

        {sidebarOpen && <button className="workspace-sidebar-overlay" type="button" aria-label="작업 공간 메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

        <section className="chat-workspace workspace-main" aria-labelledby="chat-title">
          <header className="workspace-toolbar">
            <button
              className="workspace-menu-button"
              type="button"
              aria-label="작업 공간 메뉴 열기"
              aria-expanded={sidebarOpen}
              aria-controls="workspace-sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <span aria-hidden="true">☰</span>
            </button>

            <div className="workspace-toolbar__title">
              {isEditingTitle ? (
                <form onSubmit={saveTitle}>
                  <label className="visually-hidden" htmlFor="conversation-title">대화 제목</label>
                  <input id="conversation-title" className="conversation-title-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
                  <button type="submit">저장</button>
                </form>
              ) : (
                <button className="workspace-title-button" type="button" onClick={() => setIsEditingTitle(true)}>
                  <span id="chat-title">{conversation.title}</span>
                  <small>편집</small>
                </button>
              )}
            </div>

            <WorkspaceSettings settings={settings} onChange={setSettings} />
          </header>

          <div className="chat-conversation">
            <div className="chat-conversation__inner">
              {nextMessageCursor && (
                <button className="chat-load-earlier" type="button" onClick={loadEarlierMessages} disabled={sending || loadingEarlier}>
                  {loadingEarlier ? "이전 대화를 불러오는 중…" : "이전 대화 불러오기"}
                </button>
              )}
              {!messages.length && (
                <div className="chat-empty-state workspace-empty">
                  <span className="workspace-empty__mark" aria-hidden="true"><BrandLogo /></span>
                  <p className="chat-empty-state__eyebrow">STUDYBOX AI</p>
                  <h2>무엇을 공부해 볼까요?</h2>
                  <p>{settingsLabels.level[settings.level]} 수준과 {settingsLabels.mode[settings.mode]} 방식으로 답변합니다.</p>
                  <div className="workspace-suggestions" aria-label="추천 질문">
                    {["광합성을 쉽게 설명해 줘", "이차방정식 풀이를 도와줘", "조선 후기 경제를 요약해 줘"].map((suggestion) => (
                      <button type="button" onClick={() => setQuestion(suggestion)} key={suggestion}>{suggestion}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="chat-message-list" aria-label="학습 대화 내용" role="log">
                {messages.map((message) => <ChatMessage message={message} key={message.id} />)}
              </div>
            </div>
          </div>

          <form className="chat-composer workspace-composer" onSubmit={sendMessage} aria-busy={sending}>
            <div className="chat-composer__inner">
              <div className="workspace-composer__box">
                <label className="visually-hidden" htmlFor="chat-question">추가 질문</label>
                <textarea id="chat-question" rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="StudyBox AI에게 질문하세요" disabled={sending} />
                <div className="chat-composer__footer">
                  <p>
                    {settingsLabels.mode[settings.mode]} · {settingsLabels.level[settings.level]} · {settingsLabels.responseLength[settings.responseLength]}
                    {usageLimit !== null && ` · 오늘 한도 ${usageLimit}회`}
                  </p>
                  <button className="chat-send-button" type="submit" aria-label="보내기" disabled={sending || !question.trim()}>
                    <span aria-hidden="true">{sending ? "…" : "↑"}</span>
                  </button>
                </div>
              </div>
              {error && <p className="chat-composer__error" role="alert">{error}</p>}
            </div>
          </form>
          <p className="chat-live" role="status" aria-live="polite">{sending ? "선택한 설정으로 답변을 구성하고 있습니다." : ""}</p>
        </section>
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
          <p className="section-eyebrow">계정 관리</p>
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
