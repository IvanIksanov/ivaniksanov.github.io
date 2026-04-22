(function () {
  const config = window.QATrainerWelcome;
  if (!config || !config.title || !config.image) return;
  let scrollLockState = null;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
      return;
    }
    fn();
  }

  function createTextBlock(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }

  function getDismissKey() {
    return config.storageKey || `qa_trainer_welcome_dismissed:${location.pathname}:${config.version || "v1"}`;
  }

  function hasDismissed() {
    try {
      return localStorage.getItem(getDismissKey()) === "true";
    } catch (error) {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(getDismissKey(), "true");
    } catch (error) {}
  }

  function focusDialogButton(overlay) {
    const button = overlay.querySelector(".trainer-welcome__button");
    if (button) button.focus({ preventScroll: true });
  }

  function lockPageScroll() {
    if (scrollLockState) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    scrollLockState = {
      scrollY,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyOverflow: document.body.style.overflow
    };

    document.documentElement.classList.add("trainer-welcome-lock");
    document.body.classList.add("trainer-welcome-lock");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  function unlockPageScroll() {
    if (!scrollLockState) return;

    const { scrollY } = scrollLockState;
    document.documentElement.classList.remove("trainer-welcome-lock");
    document.body.classList.remove("trainer-welcome-lock");
    document.body.style.position = scrollLockState.bodyPosition;
    document.body.style.top = scrollLockState.bodyTop;
    document.body.style.left = scrollLockState.bodyLeft;
    document.body.style.right = scrollLockState.bodyRight;
    document.body.style.width = scrollLockState.bodyWidth;
    document.body.style.overflow = scrollLockState.bodyOverflow;
    scrollLockState = null;
    window.scrollTo(0, scrollY);
  }

  function closeModal(overlay) {
    markDismissed();
    overlay.classList.remove("is-visible");
    window.removeEventListener("keydown", overlay.__trainerWelcomeEsc);
    window.setTimeout(() => {
      overlay.remove();
      unlockPageScroll();
    }, 160);
  }

  function openModal(options = {}) {
    if (!options.force && hasDismissed()) return;

    const existing = document.querySelector(".trainer-welcome");
    if (existing) {
      existing.classList.add("is-visible");
      lockPageScroll();
      focusDialogButton(existing);
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "trainer-welcome";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "trainer-welcome-title");

    if (config.accent) {
      overlay.style.setProperty("--trainer-welcome-accent", config.accent);
    }

    const dialog = document.createElement("div");
    dialog.className = "trainer-welcome__dialog";

    const imageWrap = document.createElement("div");
    imageWrap.className = "trainer-welcome__media";

    const image = document.createElement("img");
    image.src = config.image;
    image.alt = config.imageAlt || config.title;
    image.loading = "eager";
    imageWrap.appendChild(image);

    const body = document.createElement("div");
    body.className = "trainer-welcome__body";

    if (config.kicker) {
      const kicker = document.createElement("span");
      kicker.className = "trainer-welcome__kicker";
      kicker.textContent = config.kicker;
      body.appendChild(kicker);
    }

    const title = document.createElement("h2");
    title.id = "trainer-welcome-title";
    title.textContent = config.title;
    body.appendChild(title);

    (config.text || []).forEach((text) => body.appendChild(createTextBlock(text)));

    if (Array.isArray(config.points) && config.points.length) {
      const list = document.createElement("ul");
      list.className = "trainer-welcome__list";
      config.points.forEach((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        list.appendChild(item);
      });
      body.appendChild(list);
    }

    const button = document.createElement("button");
    button.className = "trainer-welcome__button";
    button.type = "button";
    button.textContent = "Понятно";
    button.addEventListener("click", () => closeModal(overlay));
    body.appendChild(button);

    dialog.appendChild(imageWrap);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    lockPageScroll();

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay);
    });

    overlay.addEventListener("touchmove", (event) => {
      if (!event.target.closest(".trainer-welcome__dialog")) {
        event.preventDefault();
      }
    }, { passive: false });

    overlay.__trainerWelcomeEsc = function (event) {
      if (event.key === "Escape") closeModal(overlay);
    };
    window.addEventListener("keydown", overlay.__trainerWelcomeEsc);

    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      focusDialogButton(overlay);
    });
  }

  function ensureHelpButton() {
    const switcher = document.querySelector(".theme-switcher");
    if (!switcher || document.getElementById("trainer-welcome-help-btn")) return;

    const helpButton = document.createElement("button");
    helpButton.id = "trainer-welcome-help-btn";
    helpButton.className = "clean-btn toggleButton_gllP trainer-welcome-help-btn";
    helpButton.type = "button";
    helpButton.title = "Показать инструкцию тренажера";
    helpButton.setAttribute("aria-label", "Показать инструкцию тренажера");
    helpButton.innerHTML = '<span class="trainer-welcome-help-btn__mark" aria-hidden="true">?</span>';
    helpButton.addEventListener("click", () => openModal({ force: true }));

    const authButton = switcher.querySelector("#auth-open-btn");
    const themeToggle = switcher.querySelector("#theme-toggle");
    switcher.insertBefore(helpButton, authButton || themeToggle || switcher.firstChild);
  }

  window.openQATrainerWelcome = function () {
    openModal({ force: true });
  };

  ready(function () {
    ensureHelpButton();
    openModal();
  });
})();
