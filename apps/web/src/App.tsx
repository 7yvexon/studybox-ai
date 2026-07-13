import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
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

import { api, ApiClientError } from "./api";
import { useAuth } from "./auth";
import { DeepLanding, DeepProductMockup } from "./DeepLanding";

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

const getErrorMessage = (error: unknown) =>
  error instanceof ApiClientError ? error.message : "잠시 후 다시 시도해 주세요.";

const LoadingPage = () => <main className="loading-page">불러오는 중입니다.</main>;

const BrandLogo = () => (
  <>
    <span className="brand-mark" aria-hidden="true"><i /><i /></span>
    <span className="brand-name">StudyBox <strong>AI</strong></span>
  </>
);

const MovingSurface = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!context) {
      return;
    }

    const image = new Image();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
    };

    const draw = (time = 0) => {
      if (!image.naturalWidth || !image.naturalHeight) {
        return;
      }

      const camera = time / 1000;
      const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const scale = 1.1 + Math.sin(camera * 0.34) * 0.025;
      const drawWidth = image.naturalWidth * cover * scale;
      const drawHeight = image.naturalHeight * cover * scale;
      const x = (width - drawWidth) / 2 + Math.sin(camera * 0.24) * width * 0.024;
      const y = (height - drawHeight) / 2 + Math.cos(camera * 0.19) * height * 0.018;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.filter = "saturate(1.08) contrast(1.05)";
      context.globalAlpha = 1;
      context.drawImage(image, x, y, drawWidth, drawHeight);

      context.save();
      context.globalAlpha = 0.16;
      context.globalCompositeOperation = "screen";
      context.filter = "blur(5px) saturate(1.22)";
      context.translate(width / 2, height / 2);
      context.rotate(Math.sin(camera * 0.16) * 0.012);
      context.drawImage(
        image,
        -drawWidth / 2 + Math.cos(camera * 0.28) * 24,
        -drawHeight / 2 + Math.sin(camera * 0.22) * 18,
        drawWidth,
        drawHeight
      );
      context.restore();
      context.filter = "none";

      if (!reducedMotion.matches) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const start = () => {
      resize();
      draw();
    };

    image.addEventListener("load", start, { once: true });
    image.src = "/images/studybox-cinematic-surface.png";
    window.addEventListener("resize", resize);

    return () => {
      image.removeEventListener("load", start);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="moving-surface" ref={canvasRef} aria-hidden="true" />;
};

const SiteHeader = ({ tone = "dark", minimal = false }: { tone?: "dark" | "light"; minimal?: boolean }) => {
  const { user, loading } = useAuth();

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
          <BrandLogo />
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
            {settingsLabels.mode[mode]} · 중학교 2학년 · 보통 길이
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
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
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

        <section id="product-tour" className="product-tour scene-stack scene-stack--tour" aria-labelledby="product-tour-title">
          <div className="product-tour__inner">
            <header className="product-tour__heading">
              <div>
                <p>REAL STUDY WORKSPACE</p>
                <h2 id="product-tour-title">질문부터 이해까지,<br /><strong>한 화면에서 이어집니다.</strong></h2>
              </div>
              <p>대화 기록, 학습 설정, 개념 설명과 다음 문제까지 끊기지 않는 실제 StudyBox AI 학습 화면입니다.</p>
            </header>
            <DeepProductMockup />
          </div>
        </section>

        <section id="story" className="mode-flow kinetic-story scroll-scene scroll-scene--modes scene-stack scene-stack--story" aria-labelledby="story-title">
          <div className="kinetic-story__stage">
            <span className="mode-flow__item kinetic-story__observer-target" aria-hidden="true" />
            <div className="kinetic-story__planes" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="kinetic-story__counter" aria-hidden="true">
              <span>01</span><i /><span>04</span>
            </div>

            <header className="kinetic-story__intro scroll-rise scene-panel">
              <div className="kinetic-story__intro-copy">
                <p>STUDYBOX REASONING</p>
                <h2 id="story-title">질문은 하나.<br /><strong>생각은 더 멀리.</strong></h2>
                <span>질문의 의도와 현재 수준을 읽고, 이해할 수 있는 설명의 순서로 다시 설계합니다.</span>
              </div>
              <div className="scene-question-card">
                <div className="scene-question-card__top">
                  <strong>개념 설명</strong>
                  <div><span>중학교 2학년</span><span>보통 길이</span></div>
                </div>
                <div className="scene-question-card__body">
                  <p className="scene-question-card__question">왜 음수끼리 곱하면 양수가 돼?</p>
                  <div className="scene-question-card__answer">
                    <b>AI</b>
                    <div>
                      <small>부호의 변화부터 차근차근</small>
                      <h3>반대 방향을 다시 반대로 바꾸면,<br />원래 방향이 됩니다.</h3>
                      <p>수직선에서 ‘음수로 곱한다’는 것은 방향을 뒤집는다는 뜻이에요.</p>
                      <div><span>− × − = +</span><i /><span>방향을 두 번 전환</span></div>
                    </div>
                  </div>
                </div>
                <div className="scene-question-card__composer"><span>이어서 질문해 보세요</span><b>↑</b></div>
              </div>
            </header>

            <div className="kinetic-story__idea scroll-rise scene-panel" aria-hidden="true">
              <div className="kinetic-story__idea-copy">
                <p>DESIGNED FOR LEARNING</p>
                <h3>답을 주는 AI가 아니라,<br /><strong>공부를 설계하는 AI.</strong></h3>
                <span>질문이 들어오는 순간, 네 단계의 학습 설계가 동시에 시작됩니다.</span>
              </div>
              <div className="scene-reasoning-board">
                {[
                  ["01", "질문 의도", "무엇이 막혔는지 먼저 파악합니다."],
                  ["02", "학년과 수준", "이미 아는 것에서 설명을 시작합니다."],
                  ["03", "설명 구조", "개념·예시·확인을 알맞게 배치합니다."],
                  ["04", "다음 학습", "바로 이어서 풀 문제를 제안합니다."]
                ].map(([number, title, body]) => (
                  <article key={number}>
                    <span>{number}</span>
                    <div><h4>{title}</h4><p>{body}</p></div>
                  </article>
                ))}
              </div>
            </div>

            <div className="kinetic-story__core" aria-hidden="true">
              <div className="kinetic-story__core-face">
                <BrandLogo />
                <strong>AI</strong>
              </div>
              <i /><i /><i />
            </div>

            <div className="kinetic-story__gallery scroll-rise scene-panel" aria-hidden="true">
              <header>
                <p>FIVE LEARNING MODES</p>
                <h3>같은 질문도,<br />배우는 방식은 다르게.</h3>
              </header>
              <div className="kinetic-story__rail">
                {learningStories.map((story, index) => (
                  <article key={story.mode}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{settingsLabels.mode[story.mode]}</p>
                    <h4>{story.title.replace("\n", " ")}</h4>
                    <div><i /><i /><i /></div>
                  </article>
                ))}
              </div>
              <p className="kinetic-story__gallery-note">목적과 수준을 읽고, 가장 알맞은 답변 구조를 선택합니다.</p>
            </div>

            <div className="kinetic-story__workspace scroll-rise scene-panel">
              <header>
                <p>YOUR LEARNING SPACE</p>
                <h3>질문이 쌓일수록,<br /><strong>나만의 공부가 됩니다.</strong></h3>
                <button type="button" onClick={startLearning}>AI 학습 공간 열기 <span aria-hidden="true">↗</span></button>
              </header>
              <div className="kinetic-story__workspace-frame" aria-hidden="true">
                <aside>
                  <BrandLogo />
                  <span>＋ 새 학습</span>
                  <nav><i /><i /><i /><i /></nav>
                  <footer><b>김</b><small>김학생</small></footer>
                </aside>
                <div className="kinetic-story__workspace-main">
                  <header><b>새 학습 대화</b><div><span>개념 설명</span><span>중학교 2학년</span><span>보통 길이</span></div></header>
                  <section>
                    <p>STUDYBOX AI</p>
                    <h4>무엇을 공부해 볼까요?</h4>
                    <span>학습 목적과 답변 수준에 맞춰 대화를 시작합니다.</span>
                  </section>
                  <footer><span>궁금한 내용을 입력하세요</span><b>↑</b></footer>
                </div>
              </div>
            </div>

            <div className="kinetic-story__scroll-cue" aria-hidden="true"><i /> SCROLL TO CONTINUE</div>
          </div>
        </section>

        <section id="categories" className="section product-section scroll-scene scroll-scene--product scene-stack scene-stack--product" aria-labelledby="categories-title">
          <div className="product-section__kinetic" aria-hidden="true"><span /><span /><span /></div>
          <div className="container">
            <header className="section-heading page-reveal page-reveal--left">
              <p className="section-eyebrow">ANSWER PREVIEW</p>
              <h2 id="categories-title">같은 질문.<br />다르게 이어지는 생각.</h2>
              <p>답변의 시작점과 밀도, 흐름이 목적에 맞게 달라집니다.</p>
            </header>
            <div className="page-reveal page-reveal--product">
              <LearningPreview mode={settings.mode} onModeChange={selectMode} />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section process-section scroll-scene scroll-scene--process scene-stack scene-stack--process" aria-labelledby="how-it-works-title">
          <p className="process-section__word" aria-hidden="true">REASONING</p>
          <div className="container">
            <header className="section-heading page-reveal page-reveal--left">
              <p className="section-eyebrow">STUDYBOX FLOW</p>
              <h2 id="how-it-works-title">질문은 쌓이고,<br />생각은 남습니다.</h2>
            </header>
            <ol className="process-list">
              {[
                ["목적 감지", "선택한 학습 모드와 질문의 의도를 함께 읽습니다."],
                ["답변 설계", "수준과 길이에 맞춰 설명의 순서와 정보 밀도를 조절합니다."],
                ["학습 가능한 답", "지금 이해하고, 풀고, 기억할 수 있는 구조로 답합니다."]
              ].map(([title, content], index) => (
                <li className={`process-item page-reveal page-reveal--delay-${index + 1}`} key={title}>
                  <p className="process-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
                  <div><h3>{title}</h3><p>{content}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="learning-app" className="workspace-invite scroll-scene scroll-scene--workspace scene-stack scene-stack--workspace" aria-labelledby="learning-app-title">
          <div className="workspace-invite__stage">
            <div className="workspace-invite__film" aria-hidden="true">
              <div className="workspace-invite__film-media"><MovingSurface /></div>
              <p className="workspace-invite__wordmark">StudyBox <span>AI</span></p>
              <div className="workspace-invite__surface" />
            </div>
            <div className="workspace-invite__lines" aria-hidden="true"><span /><span /><span /></div>
            <div className="container">
            <header className="workspace-invite__header page-reveal page-reveal--left">
              <p className="section-eyebrow">YOUR LEARNING SPACE</p>
              <h2 id="learning-app-title">StudyBox <span>AI</span></h2>
              <p>질문을 쌓고, 생각을 정리하고, 나만의 학습 흐름을 이어갑니다.</p>
              <button className="button button--primary workspace-invite__button" type="button" onClick={startLearning}>
                질문 시작하기 <span aria-hidden="true">↗</span>
              </button>
            </header>

            <div className="workspace-preview-stage page-reveal page-reveal--product">
              <div className="workspace-preview" aria-hidden="true">
                <aside className="workspace-preview__sidebar">
                  <div><BrandLogo /></div>
                  <span>＋ 새 학습</span>
                  <nav><i /><i /><i /><i /></nav>
                  <footer><b>김</b><p>김학생<br /><small>스터디중학교</small></p></footer>
                </aside>
                <div className="workspace-preview__main">
                  <header>
                    <p>새 학습 대화</p>
                    <div><span>개념 설명</span><span>중학교 2학년</span><span>보통 길이</span></div>
                  </header>
                  <section>
                    <p>STUDYBOX AI</p>
                    <h3>무엇을 공부해 볼까요?</h3>
                    <span>학습 목적과 답변 수준에 맞춰 대화를 시작합니다.</span>
                  </section>
                  <footer><p>궁금한 내용을 입력하세요</p><b>↑</b></footer>
                </div>
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
            <p className="auth-story__eyebrow">{isLogin ? "YOUR STUDY, CONTINUED" : "PERSONAL STUDY SETUP"}</p>
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
        <p className="section-eyebrow">STUDYBOX AI BETA</p>
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
        <div className="auth-card__topline"><span><i /> BETA ACCESS</span><Link to="/">홈으로</Link></div>
        <p className="section-eyebrow">STUDYBOX AI BETA</p>
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
  const [settings, setSettings] = useState<LearningSettings>(defaultLearningSettings);
  const [question, setQuestion] = useState(() => searchParams.get("draft") || "");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
