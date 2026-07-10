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
  initLearningLinks();
  initCurrentYear();
})();
