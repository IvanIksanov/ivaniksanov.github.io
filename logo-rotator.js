(function () {
  if (window.__qaToDevLogoRotatorInitialized) {
    return;
  }
  window.__qaToDevLogoRotatorInitialized = true;

  const imgs = [
    "img/QAtoDev_(Flappy_Bird_style).png",
    "img/QAtoDev_Classic.png",
    "img/QAtoDev_new_year.png",
    "img/QAtoDev_DayQA.png",
    "img/QAtoDev_Halloween.png",
    "img/QAtoDev_BlackAndWhite.png",
    "img/QAtoDev_CoverChatChannel.png",
  ];

  if (!imgs.length) {
    return;
  }

  var STORAGE_KEY = "qaToDevLogoRotationStateV2";
  var LEGACY_IDX_KEY = "logoIdx";
  var STEP_MS = 50000;
  var MAX_CATCH_UP_STEPS = 1000;

  const logoImg = document.querySelector(".logo img");
  const faviconTag = document.querySelector('link[rel="icon"]');
  var reducedMotionMedia =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  var state = null;
  var timerId = null;
  var appliedIdx = -1;
  var revealListenerAttached = false;

  function isValidIndex(value) {
    return Number.isInteger(value) && value >= 0 && value < imgs.length;
  }

  function buildShuffledBag(excludeFirst) {
    var bag = [];
    for (var i = 0; i < imgs.length; i += 1) {
      bag.push(i);
    }

    for (var j = bag.length - 1; j > 0; j -= 1) {
      var swapIndex = Math.floor(Math.random() * (j + 1));
      var tmp = bag[j];
      bag[j] = bag[swapIndex];
      bag[swapIndex] = tmp;
    }

    // Avoid immediate repeats on the boundary between two bags.
    if (bag.length > 1 && isValidIndex(excludeFirst) && bag[0] === excludeFirst) {
      var replacementIndex = 1 + Math.floor(Math.random() * (bag.length - 1));
      var replacement = bag[replacementIndex];
      bag[replacementIndex] = bag[0];
      bag[0] = replacement;
    }

    return bag;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(LEGACY_IDX_KEY, String(state.currentIdx));
    } catch (_) {
      // localStorage can be unavailable in restrictive environments.
    }
  }

  function loadState() {
    var now = Date.now();
    var initialIdx = 0;

    try {
      var legacyIdx = parseInt(localStorage.getItem(LEGACY_IDX_KEY), 10);
      if (isValidIndex(legacyIdx)) {
        initialIdx = legacyIdx;
      }
    } catch (_) {
      // Ignore storage read failures.
    }

    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          var loaded = {
            currentIdx: isValidIndex(parsed.currentIdx) ? parsed.currentIdx : initialIdx,
            bag: Array.isArray(parsed.bag)
              ? parsed.bag.filter(function (value) {
                  return isValidIndex(value);
                })
              : [],
            bagPos: Number.isInteger(parsed.bagPos) ? parsed.bagPos : 0,
            nextSwitchAt:
              Number.isFinite(parsed.nextSwitchAt) && parsed.nextSwitchAt > 0
                ? parsed.nextSwitchAt
                : now + STEP_MS,
          };

          if (!loaded.bag.length) {
            loaded.bag = buildShuffledBag(loaded.currentIdx);
            loaded.bagPos = 0;
          }
          if (loaded.bagPos < 0 || loaded.bagPos > loaded.bag.length) {
            loaded.bagPos = 0;
          }
          return loaded;
        }
      }
    } catch (_) {
      // Ignore corrupted JSON and rebuild state.
    }

    return {
      currentIdx: initialIdx,
      bag: buildShuffledBag(initialIdx),
      bagPos: 0,
      nextSwitchAt: now + STEP_MS,
    };
  }

  function getNextIdx() {
    if (!state.bag.length || state.bagPos >= state.bag.length) {
      state.bag = buildShuffledBag(state.currentIdx);
      state.bagPos = 0;
    }

    var nextIdx = state.bag[state.bagPos];
    state.bagPos += 1;

    if (!isValidIndex(nextIdx)) {
      nextIdx = (state.currentIdx + 1) % imgs.length;
    }

    return nextIdx;
  }

  function advanceOneStep() {
    state.currentIdx = getNextIdx();
    state.nextSwitchAt += STEP_MS;
  }

  function catchUpToNow(now) {
    var steps = 0;
    while (now >= state.nextSwitchAt && steps < MAX_CATCH_UP_STEPS) {
      advanceOneStep();
      steps += 1;
    }

    if (steps >= MAX_CATCH_UP_STEPS) {
      state.nextSwitchAt = now + STEP_MS;
    }

    if (steps > 0) {
      persistState();
    }
  }

  function animateLogoSwap() {
    if (!logoImg || !logoImg.animate) return;
    if (reducedMotionMedia && reducedMotionMedia.matches) return;

    try {
      logoImg.animate(
        [
          { opacity: 0.6, transform: "scale(0.94) rotate(-4deg)" },
          { opacity: 1, transform: "scale(1) rotate(0deg)" },
        ],
        {
          duration: 320,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      );
    } catch (_) {
      // Ignore animation API issues.
    }
  }

  function markLogoReady() {
    if (!logoImg) return;
    logoImg.classList.add("logo-ready");
  }

  function revealLogoWhenReady() {
    if (!logoImg) return;
    if (logoImg.classList.contains("logo-ready")) return;

    if (logoImg.complete) {
      markLogoReady();
      return;
    }

    if (revealListenerAttached) return;
    revealListenerAttached = true;

    var onDone = function () {
      revealListenerAttached = false;
      markLogoReady();
    };

    logoImg.addEventListener("load", onDone, { once: true });
    logoImg.addEventListener("error", onDone, { once: true });
  }

  function applyCurrentLogo(animate) {
    if (!isValidIndex(state.currentIdx)) {
      state.currentIdx = 0;
    }

    if (appliedIdx === state.currentIdx) return;

    var src = imgs[state.currentIdx];
    if (logoImg) logoImg.src = src;
    if (faviconTag) faviconTag.href = src;
    revealLogoWhenReady();

    appliedIdx = state.currentIdx;

    if (animate) {
      animateLogoSwap();
    }
  }

  function scheduleNextTick() {
    if (timerId) {
      clearTimeout(timerId);
    }

    var delay = Math.max(200, state.nextSwitchAt - Date.now());
    timerId = window.setTimeout(onTick, delay);
  }

  function onTick() {
    var beforeIdx = state.currentIdx;
    catchUpToNow(Date.now());
    applyCurrentLogo(state.currentIdx !== beforeIdx);
    scheduleNextTick();
  }

  state = loadState();
  catchUpToNow(Date.now());
  applyCurrentLogo(false);
  persistState();
  scheduleNextTick();

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      onTick();
    }
  });
})();
