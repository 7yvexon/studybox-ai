import { useEffect, useRef, useState } from "react";
import {
  ChatCircleDots,
  ListNumbers,
  Path,
  Pause,
  Play,
  SlidersHorizontal
} from "@phosphor-icons/react";

import { DeepProductMockup } from "./DeepLanding";

const capabilities = [
  {
    title: "학년별 설명",
    description: "중학교 1학년부터 고등학교 3학년까지",
    Icon: SlidersHorizontal
  },
  {
    title: "단계별 풀이",
    description: "조건, 과정, 검산을 놓치지 않게",
    Icon: ListNumbers
  },
  {
    title: "핵심 요약",
    description: "다시 볼 내용만 짧고 선명하게",
    Icon: Path
  },
  {
    title: "후속 질문",
    description: "같은 맥락을 유지한 채 이어서",
    Icon: ChatCircleDots
  }
] as const;

const demoStages = [
  { number: "01", label: "질문 읽기" },
  { number: "02", label: "수준 맞춤" },
  { number: "03", label: "설명 구성" },
  { number: "04", label: "다음 학습" }
] as const;

export const CapabilityStrip = () => (
  <section className="capability-strip" aria-labelledby="capability-strip-title">
    <div className="capability-strip__inner">
      <div className="capability-strip__heading">
        <span>핵심 기능</span>
        <h2 id="capability-strip-title">내 공부에 맞추는 네 가지 기준</h2>
      </div>
      <ul aria-label="StudyBox AI 핵심 기능">
        {capabilities.map(({ title, description, Icon }) => (
          <li key={title}>
            <Icon weight="regular" aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export const ProductDemo = () => {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const hasEnteredView = useRef(false);

  useEffect(() => {
    const element = demoRef.current;

    if (!element || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);

        if (
          entry.isIntersecting &&
          !hasEnteredView.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          hasEnteredView.current = true;
          setActiveStage(0);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      setReducedMotion(media.matches);

      if (media.matches) {
        setActiveStage(demoStages.length - 1);
        setIsPlaying(false);
      }
    };

    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);
    return () => media.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (!isPlaying || !isInView || reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % demoStages.length);
    }, 2100);

    return () => window.clearInterval(timer);
  }, [isInView, isPlaying, reducedMotion]);

  const selectStage = (index: number) => {
    setActiveStage(index);
    setIsPlaying(false);
  };

  return (
    <div ref={demoRef} className="learning-demo" role="region" aria-label="StudyBox AI 자동 학습 데모">
      <header className="learning-demo__toolbar">
        <div className="learning-demo__status">
          <span><i aria-hidden="true" /> 답변을 만드는 과정</span>
          <strong>{demoStages[activeStage].number} · {demoStages[activeStage].label}</strong>
        </div>

        <div className="learning-demo__controls">
          <ol aria-label="자동 데모 단계">
            {demoStages.map((stage, index) => (
              <li key={stage.number}>
                <button
                  className={index === activeStage ? "is-active" : ""}
                  type="button"
                  aria-label={`자동 데모 ${index + 1}단계: ${stage.label}`}
                  aria-pressed={index === activeStage}
                  onClick={() => selectStage(index)}
                >
                  {stage.number}
                </button>
              </li>
            ))}
          </ol>
          <button
            className="learning-demo__playback"
            type="button"
            aria-label={isPlaying ? "자동 데모 일시정지" : "자동 데모 재생"}
            title={reducedMotion ? "동작 줄이기 설정이 켜져 있습니다" : isPlaying ? "일시정지" : "재생"}
            disabled={reducedMotion}
            onClick={() => setIsPlaying((current) => !current)}
          >
            {isPlaying ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <p className="visually-hidden" aria-live="polite">
        자동 데모 {activeStage + 1}단계, {demoStages[activeStage].label}
      </p>
      <div className="learning-demo__viewport">
        <DeepProductMockup demoStage={activeStage} />
      </div>
    </div>
  );
};
