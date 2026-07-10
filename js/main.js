(() => {
  "use strict";

  const isReducedMotionEnabled = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const initHeader = () => {
    const header = document.querySelector("#site-header");

    if (!header) {
      return;
    }

    let frameId = null;

    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      frameId = null;
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateHeader);
      }
    };

    updateHeader();
    window.addEventListener("scroll", onScroll, { passive: true });
  };

  const initMobileMenu = () => {
    const header = document.querySelector("#site-header");
    const toggle = document.querySelector("[data-menu-toggle]");
    const navigation = document.querySelector("#primary-navigation");

    if (!header || !toggle || !navigation) {
      return () => {};
    }

    const setMenuState = (isOpen) => {
      header.classList.toggle("is-menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
    };

    const closeMenu = () => setMenuState(false);

    toggle.addEventListener("click", () => {
      setMenuState(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        toggle.getAttribute("aria-expanded") === "true" &&
        event.target instanceof Node &&
        !header.contains(event.target)
      ) {
        closeMenu();
      }
    });

    return closeMenu;
  };

  const initNavigation = (closeMenu) => {
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");

        if (!hash || hash === "#") {
          return;
        }

        const target = document.getElementById(hash.slice(1));

        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({
          behavior: isReducedMotionEnabled() ? "auto" : "smooth",
          block: "start"
        });
        target.focus({ preventScroll: true });

        if (window.location.hash !== hash) {
          window.history.pushState(null, "", hash);
        }

        closeMenu();
      });
    });
  };

  const initHeroMotion = () => {
    const hero = document.querySelector("[data-hero]");

    if (!hero || isReducedMotionEnabled()) {
      return;
    }

    let frameId = null;

    const updateHero = () => {
      const rect = hero.getBoundingClientRect();
      const distance = Math.max(hero.offsetHeight * 0.72, 1);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));

      hero.style.setProperty("--hero-progress", progress.toFixed(3));
      frameId = null;
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateHero);
      }
    };

    updateHero();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  };

  const initStoryScroll = () => {
    const story = document.querySelector("[data-story]");

    if (!story || isReducedMotionEnabled() || !("IntersectionObserver" in window)) {
      return;
    }

    const panels = Array.from(story.querySelectorAll("[data-story-panel]"));
    const steps = Array.from(story.querySelectorAll("[data-story-step]"));
    const current = story.querySelector("[data-story-current]");
    const progress = story.querySelector("[data-story-progress]");

    if (!panels.length || panels.length !== steps.length || !current || !progress) {
      return;
    }

    const setActivePanel = (activeIndex) => {
      panels.forEach((panel, panelIndex) => {
        const isActive = panelIndex === activeIndex;

        panel.classList.toggle("is-active", isActive);
        panel.classList.toggle("is-past", panelIndex < activeIndex);
        panel.setAttribute("aria-hidden", String(!isActive));
      });

      current.textContent = String(activeIndex + 1).padStart(2, "0");
      progress.style.transform = `scaleX(${(activeIndex + 1) / panels.length})`;
    };

    story.classList.add("is-enhanced");
    setActivePanel(0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActivePanel(Number(entry.target.dataset.storyStep));
          }
        });
      },
      { rootMargin: "-46% 0px -46% 0px", threshold: 0 }
    );

    steps.forEach((step) => observer.observe(step));
  };

  const initRevealAnimations = () => {
    const revealElements = document.querySelectorAll("[data-reveal]");

    if (!revealElements.length) {
      return;
    }

    if (isReducedMotionEnabled() || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealElements.forEach((element) => observer.observe(element));
  };

  const initLearningApp = () => {
    const form = document.querySelector("[data-learning-form]");
    const learningApp = document.querySelector("#learning-app");
    const questionInput = document.querySelector("#learning-question");
    const questionError = document.querySelector("#learning-question-error");
    const submitButton = form?.querySelector('button[type="submit"]');
    const liveRegion = document.querySelector("[data-learning-live]");
    const response = document.querySelector("[data-learning-response]");
    const responseMeta = document.querySelector("[data-response-meta]");
    const responseTitle = document.querySelector("[data-response-title]");
    const responseSummary = document.querySelector("[data-response-summary]");
    const responseContent = document.querySelector("[data-response-content]");
    const categoryButtons = document.querySelectorAll("[data-category-select]");

    if (
      !form ||
      !learningApp ||
      !questionInput ||
      !questionError ||
      !submitButton ||
      !liveRegion ||
      !response ||
      !responseMeta ||
      !responseTitle ||
      !responseSummary ||
      !responseContent
    ) {
      return;
    }

    const storageKey = "studybox-learning-settings-v1";
    const defaults = {
      mode: "concept",
      level: "standard",
      responseLength: "standard"
    };
    const modes = {
      concept: "개념 설명",
      solve: "문제 풀이",
      summary: "핵심 요약",
      exam: "시험 대비",
      performance: "수행평가"
    };
    const levels = {
      basic: "기초",
      standard: "보통",
      advanced: "심화"
    };
    const responseLengths = {
      short: "짧게",
      standard: "보통",
      detailed: "자세히"
    };
    const levelGuides = {
      basic: "처음 배우는 단계라면 낯선 용어를 쉬운 말로 바꿔 적어 보세요.",
      standard: "핵심 개념이 어떤 순서와 이유로 연결되는지 확인해 보세요.",
      advanced: "핵심 원리와 함께 예외나 다른 개념과의 연결도 생각해 보세요."
    };
    let responseTimer = null;

    const getStoredSettings = () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey));

        if (!stored || typeof stored !== "object") {
          return defaults;
        }

        return {
          mode: modes[stored.mode] ? stored.mode : defaults.mode,
          level: levels[stored.level] ? stored.level : defaults.level,
          responseLength: responseLengths[stored.responseLength]
            ? stored.responseLength
            : defaults.responseLength
        };
      } catch {
        return defaults;
      }
    };

    const saveSettings = (settings) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(settings));
      } catch {
        return;
      }
    };

    const applySettings = (settings) => {
      Object.entries(settings).forEach(([name, value]) => {
        const input = form.querySelector(`input[name="${name}"][value="${value}"]`);

        if (input) {
          input.checked = true;
        }
      });
    };

    const getSettings = () => {
      const formData = new FormData(form);

      return {
        mode: String(formData.get("mode") || defaults.mode),
        level: String(formData.get("level") || defaults.level),
        responseLength: String(formData.get("responseLength") || defaults.responseLength)
      };
    };

    const setQuestionError = (message = "") => {
      questionInput.setAttribute("aria-invalid", String(Boolean(message)));
      questionError.textContent = message;
      questionError.hidden = !message;
    };

    const createSections = (mode, question, level) => {
      const sharedGuide = levelGuides[level];
      const templates = {
        concept: [
          ["쉬운 설명", `“${question}”을(를) 이해하려면 먼저 무엇이 바뀌고, 왜 바뀌는지 두 부분으로 나누어 보세요. ${sharedGuide}`],
          ["예시와 연결", "비슷한 일상 사례를 한 가지 떠올린 뒤, 그 사례의 각 요소가 질문 속 어떤 부분과 이어지는지 말로 설명해 보세요."],
          ["핵심 용어", "질문에 들어 있는 핵심 단어를 골라 뜻, 역할, 다른 개념과의 관계 순서로 정리해 보세요."],
          ["한 줄 정리", `“${question}”의 핵심은 중요한 요소들이 어떤 이유와 순서로 연결되는지 설명할 수 있는 것입니다.`]
        ],
        solve: [
          ["조건 먼저 읽기", `“${question}”에서 이미 알고 있는 정보, 구해야 하는 값, 빠뜨리면 안 되는 조건을 각각 표시해 보세요.`],
          ["풀이 전략", `바로 계산하기보다 필요한 개념이나 공식을 하나 고른 뒤, 그 선택이 질문의 어느 조건과 연결되는지 확인해 보세요. ${sharedGuide}`],
          ["단계별 풀이", "1. 조건을 정리합니다. 2. 필요한 관계식이나 규칙을 고릅니다. 3. 값을 대입하거나 논리를 전개합니다. 4. 질문이 요구한 형태로 답을 확인합니다."],
          ["실수 점검", "단위, 부호, 조건 누락, 질문에서 요구한 답의 형식을 마지막에 한 번 더 확인해 보세요."]
        ],
        summary: [
          ["핵심 내용", `“${question}”에서 가장 먼저 남겨야 할 것은 주제, 핵심 주장 또는 변화 과정입니다. ${sharedGuide}`],
          ["핵심 키워드", "중요한 단어를 3~5개로 줄이고, 각 단어를 한 문장으로 연결해 보세요."],
          ["내용 구조", "배경 또는 정의 → 중요한 특징이나 과정 → 결과 또는 의미의 순서로 내용을 묶어 보세요."],
          ["빠른 복습", "눈을 감고 핵심 키워드만 보고도 전체 내용을 30초 안에 말할 수 있는지 확인해 보세요."]
        ],
        exam: [
          ["암기 포인트", `“${question}”과 관련해 시험에서 자주 묻는 정의, 순서, 비교 기준을 먼저 표시해 보세요. ${sharedGuide}`],
          ["예상 문제", "이 개념은 ‘무엇인가요?’, ‘왜 그런가요?’, ‘다른 개념과 어떻게 다른가요?’의 세 질문으로 바꿔 연습할 수 있습니다."],
          ["답안 점검", "답안에는 핵심 용어를 넣고, 이유나 과정 하나를 덧붙인 뒤, 예시 또는 결론으로 마무리해 보세요."],
          ["시험 직전 확인", "틀리기 쉬운 비슷한 개념 한 쌍을 골라 차이점을 한 문장으로 정리해 보세요."]
        ],
        performance: [
          ["조건 분석", `“${question}”을(를) 수행평가로 준비한다면 제출 형식, 평가 기준, 마감 일정부터 확인해 보세요.`],
          ["주제 방향", `질문의 핵심을 한 문장 주제로 바꾸고, 이를 뒷받침할 근거나 자료를 두 가지 이상 적어 보세요. ${sharedGuide}`],
          ["개요 만들기", "도입에서는 문제나 주제를 제시하고, 본문에서는 근거와 사례를 배열한 뒤, 마무리에서는 배운 점이나 제안을 정리해 보세요."],
          ["제출 전 점검", "평가 기준을 다시 읽고, 모든 조건을 충족했는지와 출처를 밝혀야 하는 자료가 있는지 확인해 보세요."]
        ]
      };

      return templates[mode] || templates.concept;
    };

    const renderResponse = (settings, question) => {
      const sectionCount = {
        short: 2,
        standard: 3,
        detailed: 4
      }[settings.responseLength];
      const sections = createSections(settings.mode, question, settings.level).slice(0, sectionCount);

      responseMeta.textContent = `${modes[settings.mode]} · ${levels[settings.level]} · ${responseLengths[settings.responseLength]}`;
      responseTitle.textContent = `“${question}” 학습 답변`;
      responseSummary.textContent = `${levels[settings.level]} 수준에 맞춘 ${responseLengths[settings.responseLength]} 체험 답변입니다. 아래 순서대로 직접 정리하며 학습해 보세요.`;
      responseContent.replaceChildren();

      sections.forEach(([title, content]) => {
        const section = document.createElement("section");
        const heading = document.createElement("h4");
        const paragraph = document.createElement("p");

        section.className = "learning-response__section";
        heading.textContent = title;
        paragraph.textContent = content;
        section.append(heading, paragraph);
        responseContent.append(section);
      });
    };

    const clearResponse = () => {
      response.hidden = true;
      responseContent.replaceChildren();
      responseMeta.textContent = "";
      responseTitle.textContent = "";
      responseSummary.textContent = "";
      liveRegion.textContent = "";
    };

    applySettings(getStoredSettings());

    form.addEventListener("change", () => {
      saveSettings(getSettings());
    });

    questionInput.addEventListener("input", () => {
      if (questionInput.value.trim()) {
        setQuestionError();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const question = questionInput.value.trim();

      if (!question) {
        setQuestionError("공부할 내용을 입력해 주세요.");
        questionInput.focus();
        return;
      }

      const settings = getSettings();

      if (responseTimer) {
        window.clearTimeout(responseTimer);
      }

      setQuestionError();
      saveSettings(settings);
      clearResponse();
      submitButton.disabled = true;
      submitButton.textContent = "답변 구성 중…";
      liveRegion.textContent = "선택한 방식으로 체험 답변을 구성하고 있습니다.";

      responseTimer = window.setTimeout(() => {
        renderResponse(settings, question);
        response.hidden = false;
        submitButton.disabled = false;
        submitButton.textContent = "학습 답변 만들기";
        liveRegion.textContent = "학습 답변이 준비되었습니다.";
        responseTitle.focus({ preventScroll: true });
        responseTimer = null;
      }, 420);
    });

    form.addEventListener("reset", (event) => {
      event.preventDefault();

      if (responseTimer) {
        window.clearTimeout(responseTimer);
        responseTimer = null;
      }

      applySettings(defaults);
      questionInput.value = "";
      saveSettings(defaults);
      setQuestionError();
      clearResponse();
      submitButton.disabled = false;
      submitButton.textContent = "학습 답변 만들기";
      questionInput.focus();
    });

    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.categorySelect;

        if (!mode || !modes[mode]) {
          return;
        }

        applySettings({ ...getSettings(), mode });
        saveSettings(getSettings());
        learningApp.scrollIntoView({
          behavior: isReducedMotionEnabled() ? "auto" : "smooth",
          block: "start"
        });
        questionInput.focus({ preventScroll: true });
      });
    });
  };

  const initLearningLinks = () => {
    const learningApp = document.querySelector("#learning-app");
    const learningLinks = document.querySelectorAll("[data-learning-link]");

    if (!learningApp || !learningLinks.length) {
      return;
    }

    learningLinks.forEach((link) => {
      link.setAttribute("aria-describedby", "learning-app-description");
    });
  };

  const initCurrentYear = () => {
    const currentYear = document.querySelector("#current-year");

    if (currentYear) {
      currentYear.textContent = String(new Date().getFullYear());
    }
  };

  document.documentElement.classList.add("js-enabled");
  const closeMenu = initMobileMenu();
  initHeader();
  initNavigation(closeMenu);
  initHeroMotion();
  initStoryScroll();
  initRevealAnimations();
  initLearningApp();
  initLearningLinks();
  initCurrentYear();
})();
