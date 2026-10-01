document.addEventListener('DOMContentLoaded', async () => {
  const isMapEmbed = new URLSearchParams(window.location.search).get("map_embed") === "1";
  const softQuestionsItemId = "accordion_theory_q54";
  const debugLog = window.DebugLog || null;
  let questionsAiClient;
  function getQuestionsAiClient() {
    if (!questionsAiClient) questionsAiClient = window.QAtoDevAiClient.create({
      get supabaseStore() { return supabaseStore; },
      get lastKnownAccessToken() { return lastKnownAccessToken; },
      get authUser() { return authUser; },
      get currentModels() { return currentModels; },
      get systemPrompt() { return systemPrompt; },
      getAuthKey,
      saveStorage: safeSetItemWithAiEviction,
      refreshAuth: refreshAuthUserInBackground,
      refreshRanking: refreshRuntimeModelRanking,
      replaceSlow: markModelAsSlowAndReplace,
      applyModelHint: applyAvailableModelsHint
    });
    return questionsAiClient;
  }

  const metrics = window.QAtoDevMetrics || null;
  function logUserAction(event, details = {}) {
    debugLog?.info("user", event, details);
  }
  function trackQuestionsGoal(params) {
    metrics?.reachGoal?.("questions_interaction", params);
  }
  function shortenText(value, maxLength = 120) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }
  const SCROLL_POS_KEY = "questions_scroll_y_v1";
  const AUTH_RETURN_SCROLL_KEY = "questions_auth_return_scroll_v1";
  const savedScrollY = isMapEmbed ? 0 : Number(sessionStorage.getItem(SCROLL_POS_KEY) || 0);
  function saveAuthReturnScrollPosition() {
    try {
      localStorage.setItem(AUTH_RETURN_SCROLL_KEY, JSON.stringify({
        y: Math.max(0, Math.round(window.scrollY || 0)),
        path: window.location.pathname,
        ts: Date.now()
      }));
    } catch {}
  }
  function consumeAuthReturnScrollPosition() {
    try {
      const raw = localStorage.getItem(AUTH_RETURN_SCROLL_KEY);
      if (!raw) return null;
      localStorage.removeItem(AUTH_RETURN_SCROLL_KEY);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.y !== "number") return null;
      if (parsed.path && parsed.path !== window.location.pathname) return null;
      if (parsed.ts && (Date.now() - Number(parsed.ts)) > (30 * 60 * 1000)) return null;
      return Math.max(0, Math.round(parsed.y));
    } catch {
      try { localStorage.removeItem(AUTH_RETURN_SCROLL_KEY); } catch {}
      return null;
    }
  }
  const authReturnScrollY = isMapEmbed ? null : consumeAuthReturnScrollPosition();
  if (!isMapEmbed) {
    window.addEventListener("scroll", () => {
      sessionStorage.setItem(SCROLL_POS_KEY, String(window.scrollY || 0));
    }, { passive: true });
    window.addEventListener("beforeunload", () => {
      sessionStorage.setItem(SCROLL_POS_KEY, String(window.scrollY || 0));
    });
  }

const systemPrompt =
  "You are an AI assistant for interview preparation in the IT field, specializing in roles such as Test Engineer, QA, AQA, and Test Automation. " +
  "Answer all user queries in Russian and maintain the context of software testing throughout. " +
  "If the user submits only a single term or skill (for example, “Postman” or “SQL”), provide a clear definition, explain its purpose, and describe typical use cases. " +
  "If the user submits a full interview question, respond with a detailed, structured answer in Russian, without generating additional follow-up questions. " +
  "Provide a concise but rich summary: максимум смысла, минимум воды, основные пункты + практические примеры при необходимости. " +
  "Суммарный объем ответа должен укладываться в лимит 1000 токенов. " +
  "Не используй таблицы, графики, диаграммы и лишнее оформление в ответе. " +
  "Do not use markdown, asterisks, or other formatting characters—deliver plain text responses.";

const refineSystemPrompt =
  "Ты ИИ-помощник для подготовки к собеседованию QA/тестировщика. " +
  "Отвечай на русском языке, кратко и по делу, с фокусом на выделенном фрагменте и уточняющем вопросе пользователя. " +
  "Используй переданный контекст вопроса и предыдущего ответа, не игнорируй его. " +
  "Дай более детальное пояснение, практичный пример и возможные ошибки/риски в рамках темы. " +
  "Без таблиц, графиков, диаграмм и лишнего оформления. " +
  "Ответ в пределах 1000 токенов.";
  let runtimeQuestionsData = [];
  window.questionsData = runtimeQuestionsData; // активный источник для рендера
  const OVERRIDE_API_KEY_STORAGE = "groq_api_key_override";
  const OVERRIDE_API_KEY_META_STORAGE = "groq_api_key_override_meta_v1";
  const USER_API_KEY_SERVICE = "groq";
  const USER_API_KEY_SYNC_TS_KEY = "user_api_key_sync_ts_groq_v1";
  const SUPABASE_URL_DIRECT = "https://mbebpfbmnojlaggdroum.supabase.co";
  const SUPABASE_ANON_KEY_DIRECT = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
  const AUTH_VISUAL_STATE_KEY = "auth_visual_state_v1";
  const FAST_MODEL_HINTS = window.QAtoDevAiClient.models;
  const AI_LOADER_HTML = '<span class="ai-loader"><span class="ai-spinner"></span><span class="ai-loader-text">Сейчас модель вернет ответ</span></span>';
  let currentModels = FAST_MODEL_HINTS.slice();
  let modelDiscoveryPromise = null;
  let modelDiscoveryAt = 0;
  let modelDiscoveryScope = '';
  const MODEL_LIST_CACHE_TTL_MS = 15 * 60 * 1000;
  const MODEL_RUNTIME_REBALANCE_COOLDOWN_MS = 2 * 60 * 1000;
  const QUESTIONS_CACHE_KEY = "questions_db_cache_v1";
  const QUESTIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const QUESTIONS_REPO_JSON_PATH = "over/questions_db_snapshot.json";
  const PUBLIC_AI_APPEND_REPO_JSON_PATH = "over/public_ai_append_snapshot.json";
  const QUESTIONS_REST_TIMEOUT_MS = 45 * 1000;
  const QUESTIONS_LOAD_USE_SDK = false;
  const PUBLIC_AI_APPEND_CACHE_KEY = "public_ai_append_cache_v1";
  const PUBLIC_AI_APPEND_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const USER_API_KEY_SYNC_INTERVAL_MS = 10 * 60 * 1000;
  const AI_SUPPLEMENT_META_KEY = "ai_supplement_meta_v1";
  const AI_RESPONSES_LOCAL_PREFIX = "ai_responses_";
  const AI_RESPONSE_CURSOR_PREFIX = "ai_response_cursor_";
  const AI_GUEST_AUTH_BYPASS_KEY = "ai_guest_auth_bypass_v1";
  const AI_NOTCH_FIRST_APPEND_HINT_DONE_KEY = "ai_notch_first_append_hint_done_v1";
  const AI_SUPPLEMENT_MAX = 4;
  let modelRuntimeRebalancePromise = null;
  let modelLastRuntimeRebalanceTs = 0;
  let pendingRetry = null;
  let lastAuthDrivenSyncTs = 0;
  let lastAuthDrivenSyncUserId = "";

  // --- UI elements: поиск, AI, переключатель модели ---
  const searchInput    = document.getElementById("search-input");
  const initialQuestionsSearchQuery = new URLSearchParams(window.location.search).get("q")?.trim() || "";
  const modelsListEl   = document.getElementById("ai-models-list");
  const clearBtn       = document.getElementById("search-clear-btn");
  const resultsTitle   = document.getElementById("search-results-title");
  const about          = document.getElementById("about");
  const accordionContainerEl = document.getElementById("accordion-container");
  const questionsLoadStatusEl = document.getElementById("questions-load-status");
  const apiKeyModal    = document.getElementById("api-key-modal");
  const apiKeyDescription = document.getElementById("api-key-description");
  const apiKeyInput    = document.getElementById("api-key-input");
  const apiKeyStatus   = document.getElementById("api-key-status");
  const apiKeySave     = document.getElementById("api-key-save");
  const apiKeyClose    = document.getElementById("api-key-close");
  const authOpenBtn    = document.getElementById("auth-open-btn");
  const headerAiNotch  = document.getElementById("header-ai-notch");
  const headerAiNotchIcon = document.getElementById("header-ai-notch-icon");
  const headerAiNotchText = document.getElementById("header-ai-notch-text");
  const authModal      = document.getElementById("auth-modal");
  const authCard       = authModal?.querySelector(".auth-card");
  const authTitle      = document.getElementById("auth-title");
  const authDescription = document.getElementById("auth-description");
  const authIdentity   = document.getElementById("auth-identity");
  const authChipRow    = document.getElementById("auth-chip-row");
  const authUserEmail  = document.getElementById("auth-user-email");
  const authLevelWrap  = document.getElementById("auth-level-wrap");
  const authTrackSelect = document.getElementById("auth-track-select");
  const authGradeSelect = document.getElementById("auth-grade-select");
  const authOAuthRow    = document.getElementById("auth-oauth-row");
  const authGoogleBtn   = document.getElementById("auth-google-btn");
  const authGithubBtn   = document.getElementById("auth-github-btn");
  const authEmailToggle = document.getElementById("auth-email-toggle");
  const authEmailInput = document.getElementById("auth-email-input");
  const authEmailError = document.getElementById("auth-email-error");
  const authSyncBtn    = document.getElementById("auth-sync-btn");
  const authSendBtn    = document.getElementById("auth-send-btn");
  const authCloseBtn   = document.getElementById("auth-close-btn");
  const authStatus     = document.getElementById("auth-status");
  const authStateShared = window.AuthStateShared || {
    getAuthUiConfig(options) {
      const isAuthenticated = !!options?.isAuthenticated;
      return {
        buttonLabel: isAuthenticated ? "" : "Войти",
        modalPlacement: isAuthenticated ? "anchored" : "centered"
      };
    }
  };
  const supabaseStore  = window.AppSupabase || null;
  let authUser = null;
  let authProfile = null;
  let lastKnownAccessToken = "";
  let allowGuestAiRequests = readGuestAiAuthBypassFlag();
  let authModalAiGateActive = false;
  const AUTH_PENDING_PROFILE_KEY = "auth_pending_profile_v1";
  const CLOUD_SYNC_TS_KEY = "cloud_sync_ts_v1";
  const PENDING_MUTATIONS_KEY = "cloud_pending_mutations_v1";
  const CLOUD_SYNC_TTL_MS = 60 * 1000;
  const AUTH_SESSION_CHECK_TTL_MS = 5 * 60 * 1000;
  const AUTH_STARTUP_GRACE_MS = 5000;
  const CLOUD_OP_TIMEOUT_MS = 10000;
  const REST_TIMEOUT_MS = 7000;
  let cloudProgressByQuestion = new Map();
  let cloudAnswersByQuestion = new Map();
  const publicAppendAnswersByQuestion = new Map();
  const aiItemState = new Map();
  let questionsUiRendered = false;
  let pendingMapQuestionId = "";
  if (isMapEmbed) {
    window.QAtoDevMapEmbed = {
      showQuestion(id) {
        pendingMapQuestionId = String(id || "");
        if (!questionsUiRendered || !pendingMapQuestionId) return false;
        const content = document.getElementById(pendingMapQuestionId);
        const selectedItem = content?.closest(".t-item");
        const selectedSection = selectedItem?.closest(".article");
        if (!selectedSection || !accordionContainerEl?.contains(selectedItem)) return false;
        accordionContainerEl.querySelectorAll(".article").forEach(section => {
          section.classList.toggle("questions-map-embed-selected", section === selectedSection);
        });
        accordionContainerEl.querySelectorAll(".t-item").forEach(item => {
          item.classList.toggle("questions-map-embed-selected-item", item === selectedItem);
        });
        selectedSection.style.display = "";
        selectedItem.style.display = "";
        const trigger = selectedItem.querySelector(".t849__trigger-button");
        if (trigger?.getAttribute("aria-expanded") !== "true") trigger?.click();
        window.scrollTo(0, 0);
        return true;
      }
    };
  }
  let questionsLoadFallbackTimer = null;
  let userApiKeySyncPromise = null;
  let authLastSessionCheckTs = 0;
  let authResolved = false;
  let authCardMorphToken = 0;
  let headerAiNotchHideTimer = null;
  let headerAiNotchActiveQuestionId = "";
  let headerAiNotchPendingCount = 0;
  let authController = null;
  let authControllerInitPromise = null;
  let questionsCloudSyncController = null;
  let syncCoordinator = null;

  function setAuthSessionCheckedNow() {
    authLastSessionCheckTs = Date.now();
  }

  function isAuthSessionCheckFresh() {
    return (Date.now() - authLastSessionCheckTs) < AUTH_SESSION_CHECK_TTL_MS;
  }

  function setAuthSyncButtonBusy(isBusy) {
    if (authController) {
      authController.setSyncBusy(isBusy);
      return;
    }
    if (!authSyncBtn) return;
    authSyncBtn.classList.toggle("is-busy", !!isBusy);
    authSyncBtn.disabled = !!isBusy;
    refreshVisibleAuthModalUi();
  }

  function flashAuthSyncButtonSuccess() {
    if (authController) {
      authController.flashSyncSuccess();
      return;
    }
    if (!authSyncBtn) return;
    authSyncBtn.classList.remove("is-success");
    void authSyncBtn.offsetWidth;
    authSyncBtn.classList.add("is-success");
    setTimeout(() => authSyncBtn.classList.remove("is-success"), 700);
  }

  function showQuestionsLoadFallback() {
    if (!questionsLoadStatusEl) return;
    questionsLoadStatusEl.textContent = "Загружаю вопросы...";
    questionsLoadStatusEl.classList.add("show");
  }

  function hideQuestionsLoadFallback() {
    if (!questionsLoadStatusEl) return;
    questionsLoadStatusEl.classList.remove("show");
  }

  function scheduleQuestionsLoadFallback() {
    if (questionsLoadFallbackTimer) clearTimeout(questionsLoadFallbackTimer);
    questionsLoadFallbackTimer = setTimeout(() => {
      questionsLoadFallbackTimer = null;
      showQuestionsLoadFallback();
    }, 1500);
  }

  function clearQuestionsLoadFallbackTimer() {
    if (!questionsLoadFallbackTimer) return;
    clearTimeout(questionsLoadFallbackTimer);
    questionsLoadFallbackTimer = null;
  }

  function renderQuestionsSkeleton() {
    if (!accordionContainerEl || accordionContainerEl.childElementCount) return;
    accordionContainerEl.classList.add("is-loading");
    accordionContainerEl.innerHTML = `
      <div class="questions-skeleton" aria-hidden="true">
        ${Array.from({ length: 5 }).map(() => `
          <section class="article">
            <div class="questions-skeleton-card">
              <div class="questions-skeleton-head">
                <div class="questions-skeleton-line questions-skeleton-line--title"></div>
                <div class="questions-skeleton-line questions-skeleton-line--progress"></div>
              </div>
              <div class="questions-skeleton-line questions-skeleton-line--item"></div>
              <div class="questions-skeleton-line questions-skeleton-line--item"></div>
              <div class="questions-skeleton-line questions-skeleton-line--item"></div>
            </div>
          </section>
        `).join("")}
      </div>
    `;
  }

  function clearQuestionsSkeleton() {
    if (!accordionContainerEl) return;
    accordionContainerEl.classList.remove("is-loading");
    if (accordionContainerEl.querySelector(".questions-skeleton")) {
      accordionContainerEl.innerHTML = "";
    }
  }

  function finalizeAuthCardMorph(token) {
    if (!authCard || token !== authCardMorphToken) return;
    authCard.classList.remove("is-morphing");
    authCard.style.width = "";
    authCard.style.height = "";
  }

  function morphAuthCardLayout(mutator) {
    if (!authCard) {
      mutator();
      return;
    }
    const canAnimate = !!(authModal?.classList.contains("show")) &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!canAnimate) {
      mutator();
      return;
    }
    const startRect = authCard.getBoundingClientRect();
    mutator();
    const endRect = authCard.getBoundingClientRect();
    if (Math.abs(startRect.width - endRect.width) < 1 && Math.abs(startRect.height - endRect.height) < 1) return;
    const token = authCardMorphToken + 1;
    authCardMorphToken = token;
    authCard.classList.add("is-morphing");
    authCard.style.width = `${startRect.width}px`;
    authCard.style.height = `${startRect.height}px`;
    void authCard.offsetWidth;
    authCard.style.width = `${endRect.width}px`;
    authCard.style.height = `${endRect.height}px`;
    setTimeout(() => finalizeAuthCardMorph(token), 260);
  }

  function clearHeaderAiNotchHideTimer() {
    if (!headerAiNotchHideTimer) return;
    clearTimeout(headerAiNotchHideTimer);
    headerAiNotchHideTimer = null;
  }

  function syncHeaderAiNotchViewportMode() {}

  function showHeaderAiNotchProcessing(questionId, options = {}) {
    const { incrementPending = true } = options;
    if (!headerAiNotch) return;
    syncHeaderAiNotchViewportMode();
    if (incrementPending) {
      headerAiNotchPendingCount += 1;
    }
    headerAiNotchActiveQuestionId = questionId || headerAiNotchActiveQuestionId || "";
    clearHeaderAiNotchHideTimer();
    headerAiNotch.classList.remove("ready", "hiding");
    headerAiNotch.classList.add("show", "processing");
    headerAiNotch.dataset.state = "processing";
    headerAiNotch.setAttribute("aria-hidden", "false");
    if (headerAiNotchIcon) headerAiNotchIcon.textContent = "↻";
    if (headerAiNotchText) headerAiNotchText.textContent = "В процессе";
    if (options.fromPrimaryAiAppend) {
      let shouldPulse = false;
      try {
        shouldPulse = localStorage.getItem(AI_NOTCH_FIRST_APPEND_HINT_DONE_KEY) !== "1";
      } catch {
        shouldPulse = false;
      }
      if (shouldPulse) {
        headerAiNotch.classList.add("attention-flash");
        setTimeout(() => {
          headerAiNotch.classList.remove("attention-flash");
        }, 1400);
        try {
          localStorage.setItem(AI_NOTCH_FIRST_APPEND_HINT_DONE_KEY, "1");
        } catch {}
      }
    }
  }

  function hideHeaderAiNotch() {
    if (!headerAiNotch) return;
    syncHeaderAiNotchViewportMode();
    headerAiNotch.classList.add("hiding");
    headerAiNotch.classList.remove("show", "processing", "ready");
    delete headerAiNotch.dataset.state;
    delete headerAiNotch.dataset.readyAt;
    headerAiNotchPendingCount = 0;
    headerAiNotchActiveQuestionId = "";
    clearHeaderAiNotchHideTimer();
    setTimeout(() => {
      if (!headerAiNotch) return;
      headerAiNotch.setAttribute("aria-hidden", "true");
      headerAiNotch.classList.remove("hiding");
    }, 240);
  }

  function openQuestionAndScrollToAi(questionId) {
    if (!questionId) return;
    const aiEl = document.querySelector(`.ai-supplement[data-id="${questionId}"]`);
    if (!aiEl) return;
    const itemRoot = aiEl.closest(".t-item");
    const trigger = itemRoot?.querySelector(".t849__trigger-button");
    if (trigger && trigger.getAttribute("aria-expanded") !== "true") {
      trigger.click();
    }
    setTimeout(() => {
      const headerEl = itemRoot?.querySelector(".t849__header");
      const target = headerEl || aiEl;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const headerOffset = (() => {
        const siteHeader = document.querySelector(".site-header");
        const h = siteHeader?.getBoundingClientRect()?.height || 0;
        return Math.max(76, Math.round(h + 12));
      })();
      const top = window.scrollY + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 120);
  }

  function showHeaderAiNotchReady(questionId) {
    if (!headerAiNotch) return;
    syncHeaderAiNotchViewportMode();
    headerAiNotchPendingCount = Math.max(0, headerAiNotchPendingCount - 1);
    headerAiNotchActiveQuestionId = questionId || headerAiNotchActiveQuestionId || "";
    clearHeaderAiNotchHideTimer();
    headerAiNotch.classList.remove("processing", "hiding");
    headerAiNotch.classList.add("show", "ready");
    headerAiNotch.dataset.state = "ready";
    headerAiNotch.dataset.readyAt = String(Date.now());
    headerAiNotch.setAttribute("aria-hidden", "false");
    if (headerAiNotchIcon) headerAiNotchIcon.textContent = "✓";
    if (headerAiNotchText) headerAiNotchText.textContent = "Готово";
    headerAiNotchHideTimer = setTimeout(() => {
      // Не возвращаемся в "В процессе" после первого полученного ответа.
      // Если в фоне еще идут дополнительные запросы/фолбэки, не показываем это пользователю.
      headerAiNotchPendingCount = 0;
      hideHeaderAiNotch();
    }, 3000);
  }

  function failHeaderAiNotchRequest() {
    headerAiNotchPendingCount = Math.max(0, headerAiNotchPendingCount - 1);
    if (headerAiNotchPendingCount <= 0) hideHeaderAiNotch();
  }

  function modelCacheScope() {
    return window.QAtoDevAiClient.modelCacheScope(getAuthKey());
  }

  function readQuestionsCache(options = {}) {
    const { allowStale = false } = options;
    try {
      const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data) || !parsed.ts) return null;
      if (!allowStale && (Date.now() - parsed.ts) > QUESTIONS_CACHE_TTL_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  function writeQuestionsCache(data) {
    try {
      safeSetItemWithAiEviction(QUESTIONS_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data
      }));
    } catch {}
  }

  function readGuestAiAuthBypassFlag() {
    try {
      return localStorage.getItem(AI_GUEST_AUTH_BYPASS_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeGuestAiAuthBypassFlag(enabled) {
    try {
      if (enabled) {
        localStorage.setItem(AI_GUEST_AUTH_BYPASS_KEY, "1");
      } else {
        localStorage.removeItem(AI_GUEST_AUTH_BYPASS_KEY);
      }
    } catch {}
  }

  function isQuotaExceededError(err) {
    return !!err && (
      err.name === "QuotaExceededError" ||
      err.code === 22 ||
      String(err.message || "").toLowerCase().includes("quota")
    );
  }

  function readAiSupplementMeta() {
    try {
      const raw = localStorage.getItem(AI_SUPPLEMENT_META_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAiSupplementMeta(meta) {
    try {
      localStorage.setItem(AI_SUPPLEMENT_META_KEY, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.warn("Failed to write AI supplement meta", e);
      return false;
    }
  }

  function evictOldestAiSupplement(excludeKey) {
    const meta = readAiSupplementMeta()
      .filter(x => x && x.key && x.key !== excludeKey)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (!meta.length) return false;
    const oldest = meta[0];
    try {
      localStorage.removeItem(oldest.key);
    } catch {}
    const nextMeta = readAiSupplementMeta().filter(x => x && x.key && x.key !== oldest.key);
    writeAiSupplementMeta(nextMeta);
    return true;
  }

  function safeSetItemWithAiEviction(key, value, excludeAiKey) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (!isQuotaExceededError(e)) {
        console.warn(`setItem failed for ${key}`, e);
        return false;
      }
      while (evictOldestAiSupplement(excludeAiKey)) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryErr) {
          if (!isQuotaExceededError(retryErr)) {
            console.warn(`setItem retry failed for ${key}`, retryErr);
            return false;
          }
        }
      }
      return false;
    }
  }

  function saveAiSupplementWithLimit(key, payload) {
    const value = JSON.stringify(payload);
    const written = safeSetItemWithAiEviction(key, value, key);
    if (!written) return false;

    let meta = readAiSupplementMeta().filter(x => x && x.key && x.key !== key);
    meta.push({ key, ts: Date.now() });
    meta.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const toRemove = meta.slice(AI_SUPPLEMENT_MAX);
    toRemove.forEach(item => {
      try {
        localStorage.removeItem(item.key);
      } catch {}
    });
    meta = meta.slice(0, AI_SUPPLEMENT_MAX);
    writeAiSupplementMeta(meta);
    return true;
  }

  function getAuthKey() {
    return readStoredOverrideApiKey();
  }

  function readStoredOverrideApiKey() {
    try {
      const raw = localStorage.getItem(OVERRIDE_API_KEY_STORAGE);
      return raw ? String(raw).trim() : "";
    } catch {
      return "";
    }
  }

  function readStoredOverrideApiKeyMeta() {
    try {
      const raw = localStorage.getItem(OVERRIDE_API_KEY_META_STORAGE);
      const parsed = JSON.parse(raw || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeStoredOverrideApiKey(key, options = {}) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) return false;
    const meta = {
      updatedAt: options.updatedAt || new Date().toISOString(),
      userId: options.userId || authUser?.id || null,
      source: options.source || "local"
    };
    safeSetItemWithAiEviction(OVERRIDE_API_KEY_STORAGE, normalizedKey);
    try {
      localStorage.setItem(OVERRIDE_API_KEY_META_STORAGE, JSON.stringify(meta));
    } catch (e) {
      console.warn("Failed to persist API key meta", e);
    }
    return true;
  }

  function getCurrentApiKeyMode() {
    return readStoredOverrideApiKey() ? "user" : "primary";
  }

  function getUserApiKeySyncLastTs() {
    try {
      return Number(localStorage.getItem(USER_API_KEY_SYNC_TS_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function markUserApiKeySyncTs() {
    try {
      localStorage.setItem(USER_API_KEY_SYNC_TS_KEY, String(Date.now()));
    } catch {}
  }

  function getIsoTimeMs(value) {
    const ts = Date.parse(String(value || ""));
    return Number.isFinite(ts) ? ts : 0;
  }

  function isApiKeyQuotaDetail(...args) {
    return getQuestionsAiClient().isApiKeyQuotaDetail(...args);
  }

  function isApiKeyCredentialDetail(...args) {
    return getQuestionsAiClient().isApiKeyCredentialDetail(...args);
  }

  function isRecoverableApiKeyError(...args) {
    return getQuestionsAiClient().isRecoverableApiKeyError(...args);
  }

  function isAllModelsCreditsExhaustedError(...args) {
    return getQuestionsAiClient().isAllModelsCreditsExhaustedError(...args);
  }

  function isAiRegionAvailabilityError(...args) {
    return getQuestionsAiClient().isAiRegionAvailabilityError(...args);
  }

  function getAiRegionUnavailableMessage(...args) {
    return getQuestionsAiClient().getAiRegionUnavailableMessage(...args);
  }

  function setApiKeyStatus(message, type = "") {
    if (!apiKeyStatus) return;
    apiKeyStatus.textContent = message || "";
    apiKeyStatus.classList.remove("is-error", "is-success");
    if (type === "error") apiKeyStatus.classList.add("is-error");
    if (type === "success") apiKeyStatus.classList.add("is-success");
  }

  function getApiKeyModalDescription(options = {}) {
    const authMode = options.authMode || getCurrentApiKeyMode();
    if (options.reason === "model_credits_exhausted") {
      return "Groq сообщил о недостатке доступной квоты. Проверьте лимиты аккаунта и попробуйте позже; при необходимости укажите другой ключ Groq.";
    }
    const quotaExceeded = options.reason === "quota_exceeded";
    if (quotaExceeded && authMode === "primary") {
      return authUser
        ? "Квота основного ключа исчерпана. Вставьте ваш API-ключ Groq: мы начнем использовать его сразу и сохраним в аккаунт для других устройств."
        : "Квота основного ключа исчерпана. Вставьте ваш API-ключ Groq, и новые ответы пойдут уже через него.";
    }
    if (quotaExceeded && authMode === "user") {
      return authUser
        ? "Сохраненный пользовательский ключ тоже уперся в лимит или больше не подходит. Вставьте новый ключ: он заменит текущий локально и в аккаунте."
        : "Сохраненный пользовательский ключ тоже уперся в лимит или больше не подходит. Вставьте новый ключ, чтобы продолжить.";
    }
    return authUser
      ? "Похоже, текущий ключ не работает. Получите новый ключ в кабинете Groq, вставьте его ниже, и мы сохраним его локально и в аккаунт."
      : "Похоже, текущий ключ не работает. Получите новый ключ в кабинете Groq и вставьте его ниже.";
  }

  function showApiKeyModal(options = {}) {
    if (!apiKeyModal) return;
    const title = document.getElementById("api-key-title");
    if (title) title.textContent = options.reason === "model_credits_exhausted" ? "Модели временно недоступны" : "Нужен новый API-ключ";
    if (apiKeyDescription) {
      apiKeyDescription.textContent = getApiKeyModalDescription(options);
    }
    setApiKeyStatus("");
    apiKeyModal.classList.add("show");
    apiKeyModal.setAttribute("aria-hidden", "false");
    if (apiKeyInput) {
      apiKeyInput.value = readStoredOverrideApiKey();
      apiKeyInput.focus();
      apiKeyInput.select();
    }
  }

  function hideApiKeyModal() {
    if (!apiKeyModal) return;
    apiKeyModal.classList.remove("show");
    apiKeyModal.setAttribute("aria-hidden", "true");
    setApiKeyStatus("");
  }

  function isCloudReady() {
    return !!(supabaseStore && supabaseStore.client);
  }

  function setAuthStatus(message) {
    if (authStatus) authStatus.textContent = message || "";
  }

  function setAuthCheckingState(isChecking) {
    if (!authModal) return;
    authModal.classList.toggle("auth-checking", !!isChecking);
    if (isChecking) {
      if (authTitle) authTitle.textContent = "Проверяю синхронизацию";
      setAuthStatus("Пожалуйста, подождите...");
    }
  }

  function refreshVisibleAuthModalUi() {
    if (!authModal?.classList.contains("show")) return;
    if (authModal.classList.contains("auth-checking")) return;
    applyAuthModalMode();
    positionAuthModal();
  }

  function readPendingProfile() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_PENDING_PROFILE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writePendingProfile(profile) {
    try {
      localStorage.setItem(AUTH_PENDING_PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }

  function clearPendingProfile() {
    try {
      localStorage.removeItem(AUTH_PENDING_PROFILE_KEY);
    } catch {}
  }

  function profileLabel(profile) {
    if (!profile?.track || !profile?.grade) return "";
    return `${profile.track} (${profile.grade})`;
  }

  function readStoredAuthVisualState() {
    try {
      return localStorage.getItem(AUTH_VISUAL_STATE_KEY) || "";
    } catch {
      return "";
    }
  }

  function isOptimisticAuthUiActive() {
    return !authUser && !authResolved && readStoredAuthVisualState() === "auth";
  }

  function persistPendingProfileSelection() {
    authController?.persistPendingProfileSelection();
  }

  function syncProfileUiFromState() {
    authController?.applyAuthModalMode();
  }

  function applyAuthModalMode() {
    authController?.applyAuthModalMode();
  }

  function updateAuthButtonLabel() {
    authController?.updateAuthButtonUi();
  }

  function positionAuthModal() {
    authController?.positionModal();
  }

  function showAuthModal(prefillMessage, options = {}) {
    authController?.showModal(prefillMessage, options);
  }

  function hideAuthModal() {
    authController?.hideModal();
  }

  function getCleanRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function getActiveSession() {
    return authController?.getActiveSession();
  }

  async function refreshAuthUser() {
    const user = await authController?.refreshAuthUser({ source: "questions-wrapper" });
    const state = authController?.getState?.();
    authUser = state?.authUser || null;
    authProfile = state?.authProfile || null;
    authResolved = !!state?.authResolved;
    return user || null;
  }

  async function refreshAuthUserInBackground(options = {}) {
    const user = await authController?.refreshAuthUserInBackground(options || {});
    const state = authController?.getState?.();
    authUser = state?.authUser || null;
    authProfile = state?.authProfile || null;
    authResolved = !!state?.authResolved;
    return user || null;
  }

  async function syncUserApiKeyWithCloud(options = {}) {
    const { force = false, source = "auto" } = options;
    if (!isCloudReady() || !authUser || !supabaseStore?.getUserApiKey || !supabaseStore?.upsertUserApiKey) {
      return { ok: false, skipped: true };
    }
    const now = Date.now();
    if (!force && userApiKeySyncPromise) return userApiKeySyncPromise;
    if (!force && (now - getUserApiKeySyncLastTs()) < USER_API_KEY_SYNC_INTERVAL_MS) {
      return { ok: true, skipped: true };
    }
    userApiKeySyncPromise = (async () => {
      try {
        const localKey = readStoredOverrideApiKey();
        const localMeta = readStoredOverrideApiKeyMeta();
        const localUpdatedMs = getIsoTimeMs(localMeta?.updatedAt);

        const { data: cloudRow, error } = await supabaseStore.getUserApiKey(authUser.id, USER_API_KEY_SERVICE);
        if (error) throw error;

        const cloudKey = String(cloudRow?.api_key || "").trim();
        const cloudUpdatedMs = getIsoTimeMs(cloudRow?.updated_at);

        let syncedLocalFromCloud = false;
        let syncedCloudFromLocal = false;

        if (localKey && (!cloudKey || localUpdatedMs > (cloudUpdatedMs + 1000))) {
          const payload = {
            user_id: authUser.id,
            service: USER_API_KEY_SERVICE,
            api_key: localKey,
            updated_at: localMeta?.updatedAt || new Date().toISOString()
          };
          const { data: saved, error: saveError } = await supabaseStore.upsertUserApiKey(payload);
          if (saveError) throw saveError;
          writeStoredOverrideApiKey(localKey, {
            updatedAt: saved?.updated_at || payload.updated_at,
            userId: authUser.id,
            source: "cloud"
          });
          syncedCloudFromLocal = true;
        } else if (cloudKey && (!localKey || cloudUpdatedMs > (localUpdatedMs + 1000) || localKey !== cloudKey)) {
          writeStoredOverrideApiKey(cloudKey, {
            updatedAt: cloudRow?.updated_at || new Date().toISOString(),
            userId: authUser.id,
            source: "cloud"
          });
          syncedLocalFromCloud = true;
        } else if (localKey && localMeta?.userId !== authUser.id) {
          writeStoredOverrideApiKey(localKey, {
            updatedAt: localMeta?.updatedAt || new Date().toISOString(),
            userId: authUser.id,
            source: localMeta?.source || "local"
          });
        }

        markUserApiKeySyncTs();
        return {
          ok: true,
          source,
          syncedLocalFromCloud,
          syncedCloudFromLocal,
          hasKey: !!(readStoredOverrideApiKey() || cloudKey)
        };
      } catch (e) {
        console.warn("User API key sync failed", e);
        return { ok: false, error: e };
      } finally {
        userApiKeySyncPromise = null;
      }
    })();
    return userApiKeySyncPromise;
  }

  async function tryHydrateUserApiKeyFromCloud() {
    if (readStoredOverrideApiKey()) return false;
    const hasAuth = await ensureAuthContext();
    if (!hasAuth) return false;
    const result = await syncUserApiKeyWithCloud({ force: true, source: "quota-recovery" });
    return !!result?.syncedLocalFromCloud && !!readStoredOverrideApiKey();
  }

  async function loadCloudProgress() {
    return questionsCloudSyncController?.loadCloudProgress() || [];
  }

  async function loadCloudAnswers() {
    return questionsCloudSyncController?.loadCloudAnswers() || [];
  }

  function readPublicAppendAnswersCache() {
    try {
      const raw = localStorage.getItem(PUBLIC_AI_APPEND_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.rows) || !parsed.ts) return null;
      if (!parsed.rows.length) return null;
      if ((Date.now() - Number(parsed.ts)) > PUBLIC_AI_APPEND_CACHE_TTL_MS) return null;
      return parsed.rows;
    } catch {
      return null;
    }
  }

  function writePublicAppendAnswersCache(rows) {
    try {
      const normalizedRows = Array.isArray(rows) ? rows : [];
      if (!normalizedRows.length) {
        localStorage.removeItem(PUBLIC_AI_APPEND_CACHE_KEY);
        return;
      }
      localStorage.setItem(PUBLIC_AI_APPEND_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        rows: normalizedRows
      }));
    } catch {}
  }

  function fillPublicAppendAnswersMap(rows) {
    publicAppendAnswersByQuestion.clear();
    const grouped = new Map();
    (rows || []).forEach((row) => {
      if (!row?.question_id || !row?.content) return;
      const list = grouped.get(row.question_id) || [];
      list.push({
        cloudId: row.id || null,
        answer: row.content,
        model: row.model || "",
        seconds: row.seconds || 0,
        arrivedAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
        answerType: "append",
        isPublicShared: true
      });
      grouped.set(row.question_id, list);
    });
    grouped.forEach((list, questionId) => {
      list.sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0));
      publicAppendAnswersByQuestion.set(questionId, list.slice(-2)); // max 2 public answers per question
    });
  }

  function normalizePublicAppendSnapshotRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.rows)) return payload.rows;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  async function loadPublicAppendAnswersFromRepoJson() {
    try {
      const res = await fetch(PUBLIC_AI_APPEND_REPO_JSON_PATH, { cache: "no-store" });
      if (!res.ok) return null;
      const payload = await res.json();
      const rows = normalizePublicAppendSnapshotRows(payload)
        .filter((row) => row?.question_id && row?.content)
        .filter((row) => row?.answer_type === "append" || !row?.answer_type);
      return rows.length ? rows : [];
    } catch (e) {
      console.warn("Failed to load public append answers from repo JSON", e);
      return null;
    }
  }

  async function loadPublicAppendAnswers(options = {}) {
    const { onUpdate = null } = options;
    const notify = (source) => {
      if (typeof onUpdate === "function") {
        try { onUpdate(source); } catch {}
      }
    };

    const cachedRows = readPublicAppendAnswersCache();
    if (cachedRows) {
      fillPublicAppendAnswersMap(cachedRows);
      notify("cache");
      return { source: "cache", count: cachedRows.length };
    }

    const repoRows = await loadPublicAppendAnswersFromRepoJson();
    if (Array.isArray(repoRows)) {
      fillPublicAppendAnswersMap(repoRows);
      writePublicAppendAnswersCache(repoRows);
      notify("repo");
      return { source: "repo", count: repoRows.length };
    }

    if (cachedRows) {
      return { source: "cache", count: cachedRows.length };
    }

    fillPublicAppendAnswersMap([]);
    console.warn("Public append answers source is empty: no repo JSON and no local cache");
    notify("empty");
    return { source: "empty", count: 0 };
  }

  async function initializeCloudState() {
    if (authControllerInitPromise) {
      try {
        await authControllerInitPromise;
      } catch (e) {
        console.warn("Auth controller init failed before cloud state init", e);
      }
    }
    if (authController?.getState) {
      const state = authController.getState();
      authUser = state?.authUser || null;
      authProfile = state?.authProfile || null;
      authResolved = !!state?.authResolved;
    }
    if (!authResolved && isCloudReady()) {
      await refreshAuthUser();
    }
    if (!authUser) return;
    await syncUserApiKeyWithCloud({ force: false, source: "init" });
    await syncLocalAndCloudState({ force: false, source: "init" });
  }

  function getCloudSyncLastTs() {
    return Number(localStorage.getItem(CLOUD_SYNC_TS_KEY) || 0);
  }

  function readPendingMutations() {
    try {
      const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writePendingMutations(mutations) {
    try {
      localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(mutations.slice(-200)));
    } catch (e) {
      console.warn("Failed to persist pending mutations", e);
    }
  }

  function mutationKey(type, payload) {
    if (type === "saveProgress") return `${type}:${payload?.questionId}:${payload?.status}`;
    if (type === "saveAiAnswer") {
      const r = payload?.response || {};
      return `${type}:${payload?.questionId}:${payload?.answerType || r.answerType || "append"}:${r.model || ""}:${String(r.answer || "").slice(0, 200)}`;
    }
    if (type === "deleteAiById") return `${type}:${payload?.answerId}`;
    if (type === "deleteAiByPayload") {
      const r = payload?.response || {};
      return `${type}:${payload?.questionId}:${r.answerType || "append"}:${r.model || ""}:${String(r.answer || "").slice(0, 200)}`;
    }
    return `${type}:${Date.now()}`;
  }

  function enqueueMutation(type, payload) {
    const mutations = readPendingMutations();
    const key = mutationKey(type, payload);
    const existingIdx = mutations.findIndex(m => m && m.key === key);
    if (existingIdx >= 0) {
      mutations[existingIdx] = {
        ...mutations[existingIdx],
        payload,
        ts: Date.now()
      };
    } else {
      mutations.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        key,
        type,
        payload,
        ts: Date.now(),
        attempts: 0,
        nextTs: Date.now()
      });
    }
    writePendingMutations(mutations);
  }

  function prunePendingSaveForResponse(questionId, response) {
    if (!questionId || !response?.answer) return;
    const targetType = response.answerType || "append";
    const targetModel = response.model || "";
    const targetAnswer = String(response.answer || "").trim();
    const mutations = readPendingMutations();
    const next = mutations.filter((m) => {
      if (!m || m.type !== "saveAiAnswer") return true;
      const p = m.payload || {};
      const r = p.response || {};
      if (p.questionId !== questionId) return true;
      const t = p.answerType || r.answerType || "append";
      const model = r.model || "";
      const answer = String(r.answer || "").trim();
      return !(t === targetType && model === targetModel && answer === targetAnswer);
    });
    if (next.length !== mutations.length) {
      writePendingMutations(next);
      console.info("Pruned pending save mutations for deleted response", {
        questionId,
        removed: mutations.length - next.length
      });
    }
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
    ]);
  }

  function markCloudSyncTs() {
    try { localStorage.setItem(CLOUD_SYNC_TS_KEY, String(Date.now())); } catch {}
  }

  async function ensureAuthContext() {
    if (!isCloudReady()) return false;
    if (authUser?.id) {
      refreshAuthUserInBackground().catch((e) => console.warn("Background auth refresh failed", e));
      return true;
    }
    const session = await getActiveSession();
    if (session === undefined) {
      // Temporary Supabase auth timeout/network hiccup.
      // Keep the last known user state instead of downgrading the page into a blocked auth gate.
      return authUser?.id ? true : undefined;
    }
    if (session?.access_token && authUser?.id) return true;
    try {
      authUser = session?.user || null;
      if (!authUser && supabaseStore?.getUser) {
        authUser = await supabaseStore.getUser();
      }
      if (authUser) {
        await refreshAuthUser();
        return true;
      }
    } catch (e) {
      console.warn("ensureAuthContext failed", e);
    }
    return false;
  }

  function buildRestUrl(path, query = "") {
    const base = supabaseStore?.url || SUPABASE_URL_DIRECT;
    const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
    return `${base}/rest/v1/${path}${q}`;
  }

  function buildFunctionUrlCandidates(...args) {
    return getQuestionsAiClient().buildFunctionUrlCandidates(...args);
  }

  function callAiProxy(...args) {
    return getQuestionsAiClient().callAiProxy(...args);
  }

  async function restRequest(path, { method = "GET", query = "", body = null, prefer = "return=representation" } = {}) {
    const key = supabaseStore?.anonKey || SUPABASE_ANON_KEY_DIRECT;
    const session = await getActiveSession();
    const accessToken = session?.access_token || null;
    if (!accessToken) {
      throw new Error(`AUTH_SESSION_MISSING for ${method} ${path}`);
    }
    const headers = {
      apikey: key,
      Authorization: `Bearer ${accessToken}`
    };
    if (prefer) headers.Prefer = prefer;
    if (body !== null) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    let res;
    const startedAt = Date.now();
    try {
      res = await fetch(buildRestUrl(path, query), {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new Error(`${method} ${path} timeout`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (!res.ok) {
      debugLog?.warn("network", "questions-rest-fail", {
        path,
        method,
        status: res.status,
        durationMs: Date.now() - startedAt
      });
      throw new Error(`${method} ${path} failed: ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    debugLog?.debug("network", "questions-rest-ok", {
      path,
      method,
      status: res.status,
      durationMs: Date.now() - startedAt
    });
    return data;
  }

  async function restRequestPublic(path, { method = "GET", query = "", body = null, prefer = "" } = {}) {
    const key = supabaseStore?.anonKey || SUPABASE_ANON_KEY_DIRECT;
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };
    if (prefer) headers.Prefer = prefer;
    if (body !== null) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(buildRestUrl(path, query), {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal
      });
    } catch (e) {
      if (e?.name === "AbortError") throw new Error(`${method} ${path} timeout`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (!res.ok) {
      throw new Error(`${method} ${path} failed: ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    return data;
  }

  function mergePublicAppendIntoVisibleState(questionId) {
    const state = aiItemState.get(questionId);
    if (!state || !Array.isArray(state.runtimeResponses)) return;
    const shared = publicAppendAnswersByQuestion.get(questionId) || [];
    if (!shared.length) return;
    let changed = false;
    shared.forEach((resp) => {
      const idx = state.runtimeResponses.findIndex((x) =>
        String(x.answerType || "append") === "append" &&
        String(x.answer || "") === String(resp.answer || "") &&
        String(x.model || "") === String(resp.model || "")
      );
      if (idx >= 0) {
        if (!state.runtimeResponses[idx].isPublicShared) {
          state.runtimeResponses[idx] = { ...state.runtimeResponses[idx], isPublicShared: true };
          changed = true;
        }
        return;
      }
      state.runtimeResponses.push({ ...resp });
      changed = true;
    });
    if (!changed) return;
    state.runtimeResponses.sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0));
    state.restoreRuntimeResponseCursor?.();
  }

  function applyPublicAppendAnswersToVisibleUi() {
    if (!questionsUiRendered) return;
    publicAppendAnswersByQuestion.forEach((_, questionId) => {
      mergePublicAppendIntoVisibleState(questionId);
    });
  }

  function getLocalProgressRows() {
    const rows = [];
    const dedupe = new Map();
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("studied_") && !key.startsWith("unclear_")) continue;
      const status = key.startsWith("studied_") ? "studied" : "unclear";
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
      if (!Array.isArray(arr)) continue;
      arr.forEach((questionId) => {
        if (!questionId) return;
        dedupe.set(String(questionId), status);
      });
    }
    dedupe.forEach((status, questionId) => {
      rows.push({
        user_id: authUser.id,
        question_id: questionId,
        status,
        updated_at: new Date().toISOString()
      });
    });
    return rows;
  }

  function aiSignature(questionId, answerType, model, content) {
    return `${questionId}::${answerType || "append"}::${model || ""}::${String(content || "").trim()}`;
  }

  function readLocalAiResponses(questionId) {
    if (!questionId) return [];
    try {
      const raw = localStorage.getItem(`${AI_RESPONSES_LOCAL_PREFIX}${questionId}`);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeLocalAiResponses(questionId, responses) {
    if (!questionId) return;
    try {
      const normalized = (Array.isArray(responses) ? responses : [])
        .filter(x => x && x.answer && !x.isPublicShared)
        .slice(-10)
        .map(x => ({
          answer: x.answer,
          model: x.model || "",
          seconds: x.seconds || 0,
          arrivedAt: x.arrivedAt || Date.now(),
          answerType: x.answerType || "append",
          cloudId: x.cloudId || null,
          isPublicShared: !!x.isPublicShared
        }));
      if (!normalized.length) {
        localStorage.removeItem(`${AI_RESPONSES_LOCAL_PREFIX}${questionId}`);
        return;
      }
      safeSetItemWithAiEviction(
        `${AI_RESPONSES_LOCAL_PREFIX}${questionId}`,
        JSON.stringify(normalized)
      );
    } catch (e) {
      console.warn("Failed to write local AI responses", e);
    }
  }

  function readAiResponseCursor(questionId) {
    if (!questionId) return null;
    try {
      const raw = localStorage.getItem(`${AI_RESPONSE_CURSOR_PREFIX}${questionId}`);
      const parsed = JSON.parse(raw || "null");
      if (!parsed || typeof parsed !== "object") return null;
      return {
        index: Number.isInteger(parsed.index) ? parsed.index : null,
        signature: parsed.signature ? String(parsed.signature) : ""
      };
    } catch {
      return null;
    }
  }

  function writeAiResponseCursor(questionId, responses, index) {
    if (!questionId) return;
    try {
      if (!Array.isArray(responses) || !responses.length) {
        localStorage.removeItem(`${AI_RESPONSE_CURSOR_PREFIX}${questionId}`);
        return;
      }
      const safeIndex = Math.max(0, Math.min(Number(index) || 0, responses.length - 1));
      const current = responses[safeIndex];
      const signature = current
        ? aiSignature(questionId, current.answerType, current.model, current.answer)
        : "";
      localStorage.setItem(`${AI_RESPONSE_CURSOR_PREFIX}${questionId}`, JSON.stringify({
        index: safeIndex,
        signature
      }));
    } catch {}
  }

  function getLocalAiRows(existingSignatures) {
    const rows = [];
    const publicAppendSignatures = new Set();
    publicAppendAnswersByQuestion.forEach((list, questionId) => {
      (list || []).forEach((resp) => {
        publicAppendSignatures.add(aiSignature(questionId, "append", resp?.model, resp?.answer));
      });
    });
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith(AI_RESPONSES_LOCAL_PREFIX)) continue;
      const questionId = key.slice(AI_RESPONSES_LOCAL_PREFIX.length);
      if (!questionId) continue;
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
      if (!Array.isArray(arr)) continue;
      arr.forEach((entry) => {
        if (entry?.isPublicShared) return;
        if (entry?.cloudId) return; // already persisted
        const content = String(entry?.answer || "").trim();
        if (!content) return;
        const answerType = entry?.answerType || "append";
        const model = entry?.model || null;
        const seconds = Number(entry?.seconds) || null;
        const signature = aiSignature(questionId, answerType, model, content);
        if (answerType === "append" && publicAppendSignatures.has(signature)) return;
        if (existingSignatures.has(signature)) return;
        existingSignatures.add(signature);
        rows.push({
          user_id: authUser.id,
          question_id: questionId,
          answer_type: answerType,
          model,
          seconds,
          content
        });
      });
    }

    // legacy fallback: single supplement entry
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("ai_supplement_")) continue;
      const questionId = key.slice("ai_supplement_".length);
      if (!questionId) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let content = "";
      let model = null;
      let seconds = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          content = String(parsed.text || "").trim();
          model = parsed.model || null;
          seconds = Number(parsed.seconds) || null;
        } else {
          content = String(parsed || "").trim();
        }
      } catch {
        content = String(raw || "").trim();
      }
      if (!content) continue;
      const signature = aiSignature(questionId, "append", model, content);
      if (publicAppendSignatures.has(signature)) continue;
      if (existingSignatures.has(signature)) continue;
      existingSignatures.add(signature);
      rows.push({
        user_id: authUser.id,
        question_id: questionId,
        answer_type: "append",
        model,
        seconds,
        content
      });
    }
    return rows;
  }

  function applyCloudStateToUi() {
    runtimeQuestionsData.forEach((cat) => {
      const trackableIds = new Set(cat.items.filter(item => item.id !== softQuestionsItemId).map(item => item.id));
      const studiedKey = `studied_${cat.category}`;
      const unclearKey = `unclear_${cat.category}`;
      const studiedArr = JSON.parse(localStorage.getItem(studiedKey) || "[]");
      const unclearArr = JSON.parse(localStorage.getItem(unclearKey) || "[]");
      cat.items.forEach((item) => {
        const cloudStatus = cloudProgressByQuestion.get(item.id);
        if (cloudStatus === "studied") {
          if (!studiedArr.includes(item.id)) studiedArr.push(item.id);
          const idx = unclearArr.indexOf(item.id);
          if (idx >= 0) unclearArr.splice(idx, 1);
        } else if (cloudStatus === "unclear") {
          if (!unclearArr.includes(item.id)) unclearArr.push(item.id);
          const idx = studiedArr.indexOf(item.id);
          if (idx >= 0) studiedArr.splice(idx, 1);
        }
        const actionBtn = document.querySelector(`.study-btn[data-id="${item.id}"]`);
        const header = actionBtn?.closest(".t-item")?.querySelector(".t849__header");
        if (header) {
          header.classList.remove("studied", "unclear");
          if (cloudStatus === "studied") header.classList.add("studied");
          if (cloudStatus === "unclear") header.classList.add("unclear");
        }
      });
      safeSetItemWithAiEviction(studiedKey, JSON.stringify(studiedArr));
      safeSetItemWithAiEviction(unclearKey, JSON.stringify(unclearArr));
      updateProgress(cat.category,
        studiedArr.filter(id => trackableIds.has(id)).length,
        unclearArr.filter(id => trackableIds.has(id)).length,
        trackableIds.size);
    });

    cloudAnswersByQuestion.forEach((rows, questionId) => {
      const state = aiItemState.get(questionId);
      if (!state || !Array.isArray(rows) || !rows.length) return;
      const existed = new Set(
        state.runtimeResponses.map((x) => aiSignature(questionId, x.answerType, x.model, x.answer))
      );
      rows.forEach((resp) => {
        const signature = aiSignature(questionId, resp.answerType, resp.model, resp.answer);
        if (existed.has(signature)) return;
        existed.add(signature);
        state.runtimeResponses.push(resp);
      });
      state.runtimeResponses.sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0));
      state.restoreRuntimeResponseCursor?.();
    });
  }

  questionsCloudSyncController = window.QuestionsCloudSyncShared?.create({
    debugLog,
    cloudSyncTsKey: CLOUD_SYNC_TS_KEY,
    pendingMutationsKey: PENDING_MUTATIONS_KEY,
    cloudSyncTtlMs: CLOUD_SYNC_TTL_MS,
    cloudOpTimeoutMs: CLOUD_OP_TIMEOUT_MS,
    restTimeoutMs: REST_TIMEOUT_MS,
    aiResponsesLocalPrefix: AI_RESPONSES_LOCAL_PREFIX,
    logEvents: {
      start: "questions-cloud-start",
      success: "questions-cloud-success",
      failed: "questions-cloud-failed",
      skipped: "questions-cloud-skip",
      restOk: "questions-rest-ok",
      restFail: "questions-rest-fail"
    },
    getSupabaseStore: () => supabaseStore,
    getAuthUser: () => authUser,
    getActiveSession,
    ensureAuthContext,
    readPendingMutations,
    writePendingMutations,
    enqueueMutation,
    getLocalProgressRows,
    prepareProgressRowsForUpload: (rows, progressMap) => rows.filter((row) => {
      if (!row?.question_id || !row?.status) return false;
      return progressMap.get(row.question_id) !== row.status;
    }),
    getLocalAiRows,
    includeLocalAiInPendingCheck: true,
    getReloadPlan: ({ progressRowsToUpload, localAiRows, pendingMutationsAtStart }) => {
      const hasPendingProgressMutations = pendingMutationsAtStart.some((mutation) => mutation?.type === "saveProgress");
      const hasPendingAiMutations = pendingMutationsAtStart.some((mutation) => (
        mutation?.type === "saveAiAnswer" ||
        mutation?.type === "deleteAiById" ||
        mutation?.type === "deleteAiByPayload"
      ));
      return {
        progress: !!(progressRowsToUpload.length || hasPendingProgressMutations),
        answers: !!(localAiRows.length || hasPendingAiMutations)
      };
    },
    onSyncBusyChange: setAuthSyncButtonBusy,
    onSyncSuccessFlash: flashAuthSyncButtonSuccess,
    onSyncStatusMessage: setAuthStatus,
    onCloudStateApplied: ({ progressMap, answersMap }) => {
      cloudProgressByQuestion = progressMap;
      cloudAnswersByQuestion = answersMap;
      applyCloudStateToUi();
    },
    shouldEnqueueAiSaveOnMissingAuth: ({ hasAuth, enqueueOnFail, questionId, response }) => (
      !!(enqueueOnFail && questionId && response?.answer && !(allowGuestAiRequests && !hasAuth))
    )
  }) || null;

  if (questionsCloudSyncController) {
    cloudProgressByQuestion = questionsCloudSyncController.getProgressMap();
    cloudAnswersByQuestion = questionsCloudSyncController.getAnswersMap();
  }

  syncCoordinator = window.SyncShared?.create({
    debugLog,
    shouldRunAuthSync: ({ userId, force }) => shouldRunAuthDrivenSync({ userId, force }),
    markAuthSync: (userId) => markAuthDrivenSync(userId),
    resolveManualTasks: () => ([
      {
        name: "questions-cloud",
        shouldRun: () => true,
        run: () => syncLocalAndCloudState({ force: true, source: "manual" })
      }
    ]),
    authResolvedTask: {
      shouldRun: ({ userId, force }) => shouldRunAuthDrivenSync({ userId, force }),
      run: () => syncLocalAndCloudState({ force: false, source: "auth-core" })
    }
  }) || null;

  async function syncLocalAndCloudState(options = {}) {
    return questionsCloudSyncController?.syncNow(options || {}) || { ok: false, skipped: "controller-unavailable" };
  }

  function mapQuestionsPayload(sections, questions) {
    const grouped = new Map();
    (questions || []).forEach((q) => {
      const list = grouped.get(q.section_id) || [];
      list.push({
        id: q.id,
        title: q.title,
        answer: q.answer_html,
        moreLink: q.more_link || "",
        authorCheck: q.author_check || "",
        avatar: q.avatar || ""
      });
      grouped.set(q.section_id, list);
    });
    const mapped = (sections || [])
      .map((s) => ({
        category: s.title,
        items: grouped.get(s.id) || []
      }))
      .filter((s) => s.items.length);
    return mapped.length ? mapped : null;
  }

  function normalizeQuestionsDataPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.questions)) return payload.questions;
    return null;
  }

  async function loadQuestionsFromRepoJson() {
    try {
      const res = await fetch(QUESTIONS_REPO_JSON_PATH, {
        cache: "no-store"
      });
      if (!res.ok) {
        throw new Error(`Repo JSON fetch failed: ${res.status}`);
      }
      const payload = await res.json();
      const normalized = normalizeQuestionsDataPayload(payload);
      if (!Array.isArray(normalized) || !normalized.length) return null;
      return normalized;
    } catch (e) {
      console.warn("Failed to load questions from repo JSON", e);
      return null;
    }
  }

  async function loadQuestionsFromDbViaRest() {
    const base = supabaseStore?.url || SUPABASE_URL_DIRECT;
    const key = supabaseStore?.anonKey || SUPABASE_ANON_KEY_DIRECT;
    if (!base || !key) return null;
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };
    async function fetchRestWithTimeout(url, label) {
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), QUESTIONS_REST_TIMEOUT_MS);
        try {
          const res = await fetch(url, {
            headers,
            mode: "cors",
            cache: "no-store",
            signal: controller.signal
          });
          return res;
        } catch (e) {
          lastError = e;
          const isAbort = controller.signal.aborted || e?.name === "AbortError" || /aborted/i.test(String(e?.message || ""));
          if (isAbort && attempt < 2) {
            console.warn(`Questions REST ${label} timed out (attempt ${attempt}), retrying...`);
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeoutId);
        }
      }
      throw lastError || new Error(`Questions REST ${label} failed`);
    }
    console.info("Loading questions from Supabase REST...");
    let sectionsRes;
    let questionsRes;
    [sectionsRes, questionsRes] = await Promise.all([
      fetchRestWithTimeout(`${base}/rest/v1/question_sections?select=id,title,sort_order&order=sort_order.asc`, "question_sections"),
      fetchRestWithTimeout(`${base}/rest/v1/questions?select=id,section_id,title,answer_html,more_link,author_check,avatar,sort_order&order=sort_order.asc`, "questions")
    ]);
    if (!sectionsRes.ok || !questionsRes.ok) {
      throw new Error(`REST load failed: sections=${sectionsRes.status}, questions=${questionsRes.status}`);
    }
    const [sections, questions] = await Promise.all([sectionsRes.json(), questionsRes.json()]);
    const mapped = mapQuestionsPayload(sections, questions);
    console.info(`Supabase REST loaded: sections=${Array.isArray(sections) ? sections.length : 0}, questions=${Array.isArray(questions) ? questions.length : 0}`);
    return mapped;
  }

  async function loadQuestionsFromDbViaSdk() {
    const [sectionsRes, questionsRes] = await Promise.all([
      supabaseStore.client
        .from("question_sections")
        .select("id,title,sort_order")
        .order("sort_order", { ascending: true }),
      supabaseStore.client
        .from("questions")
        .select("id,section_id,title,answer_html,more_link,author_check,avatar,sort_order")
        .order("sort_order", { ascending: true })
    ]);
    if (sectionsRes.error) throw sectionsRes.error;
    if (questionsRes.error) throw questionsRes.error;
    return mapQuestionsPayload(sectionsRes.data || [], questionsRes.data || []);
  }

  async function loadQuestionsFromDb() {
    try {
      if (QUESTIONS_LOAD_USE_SDK && isCloudReady()) {
        try {
          const sdkData = await Promise.race([
            loadQuestionsFromDbViaSdk(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("SDK timeout")), 2500))
          ]);
          if (sdkData) return sdkData;
        } catch (sdkErr) {
          console.warn("Supabase SDK questions load failed, fallback to REST", sdkErr);
        }
      }
      return await loadQuestionsFromDbViaRest();
    } catch (e) {
      console.warn("Failed to load questions from Supabase, fallback to local data", e);
      return null;
    }
  }

  async function loadQuestionsFromDbWithTimeout() {
    return loadQuestionsFromDb();
  }

  function shouldRunAuthDrivenSync(options = {}) {
    const { userId = "", force = false } = options;
    if (force) return true;
    const pendingCount = readPendingMutations().length;
    if (pendingCount > 0) return true;
    const now = Date.now();
    if (userId && userId === lastAuthDrivenSyncUserId && (now - lastAuthDrivenSyncTs) < 12000) {
      return false;
    }
    if ((now - getCloudSyncLastTs()) < 8000) {
      return false;
    }
    return true;
  }

  function markAuthDrivenSync(userId) {
    lastAuthDrivenSyncTs = Date.now();
    lastAuthDrivenSyncUserId = String(userId || "");
  }

  function hasPendingCloudWork() {
    return !!questionsCloudSyncController?.hasPendingCloudWork();
  }

  async function saveProgressCloud(questionId, status, options = {}) {
    return questionsCloudSyncController?.saveProgress(questionId, status, options || {});
  }

  async function saveAiAnswerCloud(questionId, answerType, response, options = {}) {
    return questionsCloudSyncController?.saveAiAnswer(questionId, answerType, response, options || {}) || null;
  }

  async function deleteAiAnswerCloud(answerId, options = {}) {
    return questionsCloudSyncController?.deleteAiAnswer(answerId, options || {}) || false;
  }

  async function deleteAiAnswerCloudByPayload(questionId, response, options = {}) {
    return questionsCloudSyncController?.deleteAiAnswerByPayload(questionId, response, options || {}) || false;
  }

  async function flushPendingMutations() {
    const queueBefore = readPendingMutations();
    await questionsCloudSyncController?.flushPendingMutations();
    const queueAfter = readPendingMutations();
    if (!queueAfter.length && queueBefore.length) {
      console.info("Pending mutations flushed");
    } else if (queueAfter.length) {
      console.warn("Pending mutations left", queueAfter.length);
    }
  }

  async function ensureAuthForAiAction() {
    if (allowGuestAiRequests) return true;
    if (!isCloudReady()) {
      if (authController) {
        authController.showModal("Авторизация недоступна. Закройте окно и продолжите без сохранения ответов ИИ.", { aiGate: true });
      } else {
        showAuthModal("Авторизация недоступна. Закройте окно и продолжите без сохранения ответов ИИ.", { aiGate: true });
      }
      return false;
    }
    const hasAuth = await ensureAuthContext();
    if (hasAuth === undefined) {
      // If session check temporarily timed out, do not block AI completely.
      // Continue in guest mode and skip cloud save until auth becomes reachable again.
      allowGuestAiRequests = true;
      writeGuestAiAuthBypassFlag(true);
      return true;
    }
    if (hasAuth) {
      allowGuestAiRequests = false;
      writeGuestAiAuthBypassFlag(false);
      return true;
    }
    if (authController) {
      authController.showModal("Войдите, чтобы сохранить ответы ИИ. Или закройте окно и продолжите без сохранения.", { aiGate: true });
    } else {
      showAuthModal("Войдите, чтобы сохранить ответы ИИ. Или закройте окно и продолжите без сохранения.", { aiGate: true });
    }
    return false;
  }

  async function ensureUnifiedAuthController() {
    if (authController || !window.AuthCoreShared || !authModal || !authOpenBtn) return authController;
    authController = window.AuthCoreShared.create({
      supabaseStore,
      authStateShared,
      startupGraceMs: AUTH_STARTUP_GRACE_MS,
      sessionCheckTtlMs: AUTH_SESSION_CHECK_TTL_MS,
      storageKeys: {
        pendingProfile: AUTH_PENDING_PROFILE_KEY,
        visualState: AUTH_VISUAL_STATE_KEY,
        returnScroll: AUTH_RETURN_SCROLL_KEY
      },
      dom: {
        authOpenBtn,
        authModal,
        authCard,
        authTitle,
        authDescription,
        authIdentity,
        authChipRow,
        authUserEmail,
        authLevelWrap,
        authTrackSelect,
        authGradeSelect,
        authOAuthRow,
        authGoogleBtn,
        authGithubBtn,
        authEmailToggle,
        authEmailInput,
        authEmailError,
        authSyncBtn,
        authSendBtn,
        authCloseBtn,
        authStatus
      },
      mutateModalLayout: morphAuthCardLayout,
      isChecking: () => authModal?.classList.contains("auth-checking"),
      setChecking: setAuthCheckingState,
      loadUserProfile: async (user) => {
        if (!user || !supabaseStore?.getUserProfile) return null;
        try {
          const { data } = await withTimeout(supabaseStore.getUserProfile(user.id), 4000, "get user profile");
          return data || null;
        } catch (profileError) {
          console.warn("Supabase profile load failed", profileError);
          return null;
        }
      },
      savePendingProfile: async (user, pending) => {
        if (!user || !pending?.track || !pending?.grade || !supabaseStore?.upsertUserProfile) return null;
        const payload = {
          user_id: user.id,
          email: user.email || pending.email || null,
          track: pending.track,
          grade: pending.grade,
          updated_at: new Date().toISOString()
        };
        try {
          const { data: saved, error } = await withTimeout(supabaseStore.upsertUserProfile(payload), 4000, "apply pending profile");
          if (error) throw error;
          return saved || payload;
        } catch (pendingProfileError) {
          console.warn("Pending profile sync failed", pendingProfileError);
          return null;
        }
      },
      onModalShow: (options) => {
        authModalAiGateActive = !!options?.aiGate;
      },
      onModalHide: (_, meta) => {
        if (authModalAiGateActive && !meta?.isAuthenticated) {
          allowGuestAiRequests = true;
          writeGuestAiAuthBypassFlag(true);
        }
        authModalAiGateActive = false;
      },
      onUserResolved: async ({ user, profile }) => {
        authUser = user || null;
        authProfile = profile || null;
        authResolved = true;
        allowGuestAiRequests = false;
        writeGuestAiAuthBypassFlag(false);
        authModalAiGateActive = false;
        await syncUserApiKeyWithCloud({ force: false, source: "auth-core" });
        await syncCoordinator?.runAuthResolvedSync({
          userId: authUser?.id,
          source: "auth-core"
        });
        if (hasPendingCloudWork()) {
          await flushPendingMutations();
        }
      },
      onSignedOut: async () => {
        authUser = null;
        authProfile = null;
        authResolved = true;
        lastKnownAccessToken = "";
      },
      onManualSync: async () => {
        const session = await authController.getActiveSession();
        if (session === undefined) {
          await authController.refreshAuthUserInBackground({ force: true, source: "manual-sync" });
          return;
        }
        if (!session?.access_token) {
          authUser = null;
          authProfile = null;
          setAuthSessionCheckedNow();
          updateAuthButtonLabel();
          applyAuthModalMode();
          setAuthStatus("Сессия истекла. Войдите заново.");
          return;
        }
        await syncUserApiKeyWithCloud({ force: true, source: "manual" });
        await syncCoordinator?.runManualSync({ source: "manual" });
      }
    });
    await authController.init();
    const state = authController.getState();
    authUser = state.authUser;
    authProfile = state.authProfile;
    authResolved = state.authResolved;
    return authController;
  }
  authControllerInitPromise = ensureUnifiedAuthController().catch((e) => {
    console.warn("Unified auth controller init failed", e);
    return null;
  });

  if (apiKeySave) {
    apiKeySave.addEventListener("click", async () => {
      const v = apiKeyInput?.value?.trim();
      if (!v) {
        setApiKeyStatus("Вставьте API-ключ, чтобы продолжить.", "error");
        return;
      }
      setApiKeyStatus(authUser ? "Сохраняю ключ локально и в аккаунт..." : "Сохраняю ключ локально...", "");
      writeStoredOverrideApiKey(v, {
        updatedAt: new Date().toISOString(),
        userId: authUser?.id || null,
        source: "local"
      });
      if (authUser) {
        const syncResult = await syncUserApiKeyWithCloud({ force: true, source: "manual-save" });
        if (!syncResult?.ok) {
          setApiKeyStatus("Ключ сохранен локально. Облачная синхронизация повторится позже.", "success");
          setTimeout(() => hideApiKeyModal(), 900);
        } else {
          setApiKeyStatus("Ключ сохранен и синхронизирован.", "success");
          setTimeout(() => hideApiKeyModal(), 500);
        }
      } else {
        setApiKeyStatus("Ключ сохранен локально.", "success");
        setTimeout(() => hideApiKeyModal(), 350);
      }
      if (pendingRetry) {
        const retry = pendingRetry;
        pendingRetry = null;
        setTimeout(() => retry(), 100);
      }
    });
  }

  if (apiKeyClose) {
    apiKeyClose.addEventListener("click", () => {
      pendingRetry = null;
      hideApiKeyModal();
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      apiKeySave?.click();
    });
  }

  if (apiKeyModal) {
    apiKeyModal.addEventListener("click", (event) => {
      if (event.target === apiKeyModal) {
        pendingRetry = null;
        hideApiKeyModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (apiKeyModal?.classList.contains("show")) {
      pendingRetry = null;
      hideApiKeyModal();
      return;
    }
  });

  document.addEventListener("click", (event) => {
    const metricsTarget = event.target instanceof Element ? event.target.closest(".read-link, .author-link") : null;
    if (metricsTarget) {
      const questionItem = metricsTarget.closest(".t-item");
      const questionButton = questionItem?.querySelector(".study-btn, .unclear-btn, .ai-append-btn");
      const questionTitle = questionItem?.querySelector(".t849__title")?.textContent || "";
      const categoryTitle = questionItem?.closest(".article")?.querySelector(".category-title")?.textContent || "";
      trackQuestionsGoal({
        action: metricsTarget.classList.contains("author-link") ? "author_link_open" : "read_link_open",
        question_id: questionButton?.getAttribute("data-id") || "",
        category: shortenText(categoryTitle, 80),
        question_title: shortenText(questionTitle),
        link_url: metricsTarget.getAttribute("href") || ""
      });
    }

    const target = event.target instanceof Element ? event.target.closest([
      "#auth-open-btn",
      "#auth-google-btn",
      "#auth-github-btn",
      "#auth-sync-btn",
      "#auth-send-btn",
      "#api-key-save",
      "#api-key-close",
      "#search-clear-btn",
      "#header-ai-notch",
      ".ai-append-btn",
      ".study-btn",
      ".unclear-btn",
      ".t849__trigger-button",
      ".read-link",
      ".author-link",
      ".ai-nav-delete",
      ".ai-refine-action",
      ".ai-refine-send",
      ".ai-refine-cancel",
      ".filter-chip"
    ].join(",")) : null;
    if (!target) return;
    const questionId = target.getAttribute("data-id") || target.closest("[data-id]")?.getAttribute("data-id") || "";
    const label = target.textContent ? String(target.textContent).trim().slice(0, 80) : "";
    logUserAction("click", {
      target: target.id || target.className || target.tagName.toLowerCase(),
      questionId,
      label
    });
  }, true);

  searchInput?.addEventListener("input", () => {
    logUserAction("search-input", {
      termLength: String(searchInput.value || "").trim().length
    });
  });

  document.addEventListener("visibilitychange", () => {
    logUserAction("visibility-change", {
      state: document.visibilityState
    });
  });

  window.addEventListener("resize", () => {
    syncHeaderAiNotchViewportMode();
  }, { passive: true });
  if (headerAiNotch) {
    syncHeaderAiNotchViewportMode();
    headerAiNotch.addEventListener("click", (e) => {
      if (!e.isTrusted) return;
      if (headerAiNotch.dataset.state !== "ready") return;
      const readyAt = Number(headerAiNotch.dataset.readyAt || 0);
      if (readyAt && (Date.now() - readyAt) < 200) return; // защита от ghost-click
      const qid = headerAiNotchActiveQuestionId;
      if (qid) openQuestionAndScrollToAi(qid);
      hideHeaderAiNotch();
    });
  }

  scheduleQuestionsLoadFallback();
  renderQuestionsSkeleton();
  const publicAiLoadPromise = loadPublicAppendAnswers({
    onUpdate: () => {
      applyPublicAppendAnswersToVisibleUi();
      window.dispatchEvent(new CustomEvent("qatodev:questions-public-ai-ready", {
        detail: {
          publicAppendAiByQuestion: Object.fromEntries(publicAppendAnswersByQuestion)
        }
      }));
    }
  }).catch((e) => {
    console.warn("Public append answers async load failed", e);
    return { source: "error", count: 0 };
  });
  let questionsSource = "none";
  const cachedQuestionsData = readQuestionsCache();
  const staleCachedQuestionsData = cachedQuestionsData || readQuestionsCache({ allowStale: true });
  if (Array.isArray(cachedQuestionsData) && cachedQuestionsData.length) {
    runtimeQuestionsData = cachedQuestionsData;
    window.questionsData = runtimeQuestionsData;
    questionsSource = "local-cache";
    console.info(`Questions source: local cache (${runtimeQuestionsData.length} sections)`);
  } else {
    const repoQuestionsData = await loadQuestionsFromRepoJson();
    if (Array.isArray(repoQuestionsData) && repoQuestionsData.length) {
      runtimeQuestionsData = repoQuestionsData;
      window.questionsData = runtimeQuestionsData;
      writeQuestionsCache(repoQuestionsData);
      questionsSource = "repo-json";
      console.info(`Questions source: repo JSON (${runtimeQuestionsData.length} sections)`);
    } else {
      const dbData = await loadQuestionsFromDbWithTimeout();
      if (Array.isArray(dbData) && dbData.length) {
        runtimeQuestionsData = dbData;
        window.questionsData = runtimeQuestionsData;
        writeQuestionsCache(dbData);
        questionsSource = "supabase";
        console.info(`Questions source: Supabase (${runtimeQuestionsData.length} sections)`);
      } else if (Array.isArray(staleCachedQuestionsData) && staleCachedQuestionsData.length) {
        runtimeQuestionsData = staleCachedQuestionsData;
        window.questionsData = runtimeQuestionsData;
        questionsSource = "stale-cache";
        console.warn(`Questions source: stale local cache fallback (${runtimeQuestionsData.length} sections)`);
      } else {
        runtimeQuestionsData = [];
        window.questionsData = runtimeQuestionsData;
        console.error("Questions source: repo JSON/Supabase load failed, no local fallback available.");
      }
    }
  }

  initializeCloudState().catch((e) => {
    console.warn("Cloud state init skipped", e);
  });
  setInterval(() => {
    if (!authUser) return;
    if (!hasPendingCloudWork()) return;
    syncLocalAndCloudState({ force: false, source: "interval-pending" }).catch((e) => console.warn("Pending cloud sync failed", e));
    flushPendingMutations().catch((e) => console.warn("Pending flush failed", e));
  }, 5 * 60 * 1000);
  setInterval(() => {
    if (!authUser) return;
    syncUserApiKeyWithCloud({ force: false, source: "interval" }).catch((e) => console.warn("Periodic API key sync failed", e));
  }, USER_API_KEY_SYNC_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshAuthUserInBackground()
        .then(() => {
          if (!authUser || !hasPendingCloudWork()) return;
          return syncUserApiKeyWithCloud({ force: false, source: "visibility" });
        })
        .catch((e) => console.warn("Visibility auth refresh failed", e));
    }
  });
  window.addEventListener("online", () => {
    refreshAuthUserInBackground({ force: true })
      .then(() => Promise.allSettled([
        authUser ? syncUserApiKeyWithCloud({ force: false, source: "online" }) : Promise.resolve(),
        authUser && hasPendingCloudWork() ? syncLocalAndCloudState({ force: false, source: "online" }) : Promise.resolve(),
        authUser && hasPendingCloudWork() ? flushPendingMutations() : Promise.resolve()
      ]))
      .catch((e) => console.warn("Online recovery sync failed", e));
  });
  setInterval(() => {
    if (!authUser) return;
    if (!hasPendingCloudWork()) return;
    flushPendingMutations().catch((e) => console.warn("Pending flush failed", e));
  }, 15000);
  // Questions are loaded from repo JSON / cache on page boot.
  // DB refresh is done by snapshot sync scripts (manual or scheduled), not from client runtime.
  clearQuestionsLoadFallbackTimer();
  if (Array.isArray(runtimeQuestionsData) && runtimeQuestionsData.length) {
    hideQuestionsLoadFallback();
  } else {
    showQuestionsLoadFallback();
    if (questionsLoadStatusEl) {
      questionsLoadStatusEl.textContent = "Не удалось загрузить вопросы";
    }
  }
  window.dispatchEvent(new CustomEvent("qatodev:questions-data-ready", {
    detail: {
      questions: runtimeQuestionsData,
      publicAppendAiByQuestion: Object.fromEntries(publicAppendAnswersByQuestion)
    }
  }));
  publicAiLoadPromise.then(() => {
    applyPublicAppendAnswersToVisibleUi();
  });

  function renderModelsList(models) {
    if (!modelsListEl) return;
    modelsListEl.innerHTML = "";
    models.forEach(m => {
      const li = document.createElement("li");
      li.textContent = m;
      modelsListEl.appendChild(li);
    });
  }

  function getPreferredModel(models) {
    return getModelOrder().find(model => models.includes(model)) || models[0] || FAST_MODEL_HINTS[0];
  }

  function setCurrentModels(models) {
    currentModels = Array.isArray(models) ? models.slice() : FAST_MODEL_HINTS.slice();
  }

  function readModelTimings(...args) {
    return getQuestionsAiClient().readModelTimings(...args);
  }

  function writeModelTimings(...args) {
    return getQuestionsAiClient().writeModelTimings(...args);
  }

  function recordModelTiming(...args) {
    return getQuestionsAiClient().recordModelTiming(...args);
  }

  function rankModelsByTimings(models) {
    const list = Array.isArray(models) ? models.filter(Boolean) : [];
    if (!list.length) return [];
    const timings = readModelTimings();
    return list.slice().sort((a, b) => {
      const ta = timings[a]?.avg ?? Number.POSITIVE_INFINITY;
      const tb = timings[b]?.avg ?? Number.POSITIVE_INFINITY;
      if (ta === tb) return 0;
      return ta - tb;
    });
  }

  function refreshRuntimeModelRanking() {
    if (!Array.isArray(currentModels) || !currentModels.length) return;
    const ranked = rankModelsByTimings(currentModels);
    if (!ranked.length) return;
    const prev = currentModels.slice();
    const changed = ranked.length !== prev.length || ranked.some((m, i) => m !== prev[i]);
    if (!changed) return;
    setCurrentModels(ranked);
    renderModelsList(ranked);
    console.info("Runtime model ranking updated by real response timings", ranked);
  }

  function markModelAsSlowAndReplace(model, ms) {
    if (!model) return;
    const filteredCurrent = (currentModels || []).filter((m) => m && m !== model);
    if (!filteredCurrent.length) return;
    const rankedCurrent = rankModelsByTimings(filteredCurrent);
    setCurrentModels(rankedCurrent);
    renderModelsList(rankedCurrent);
    recordModelFailure(model, "slow_response_over_30s");
    console.warn(`Model removed from fast pool due to slow response (${ms} ms): ${model}`);

    const now = Date.now();
    if (modelRuntimeRebalancePromise) return;
    if ((now - modelLastRuntimeRebalanceTs) < MODEL_RUNTIME_REBALANCE_COOLDOWN_MS) return;
    modelLastRuntimeRebalanceTs = now;
    modelRuntimeRebalancePromise = (async () => {
      try {
        const exclude = Array.from(new Set([...rankedCurrent, model]));
        const fresh = await loadModels({ exclude });
        const merged = Array.from(new Set([...(rankedCurrent || []), ...(fresh || [])])).filter(Boolean);
        if (!merged.length) return;
        const rankedMerged = rankModelsByTimings(merged);
        setCurrentModels(rankedMerged);
        renderModelsList(rankedMerged);
        console.info("Model pool rebalanced after slow response", rankedMerged);
      } catch (e) {
        console.warn("Failed to rebalance model pool after slow response", e);
      } finally {
        modelRuntimeRebalancePromise = null;
      }
    })();
  }

  function readModelFailures(...args) {
    return getQuestionsAiClient().readModelFailures(...args);
  }

  function writeModelFailures(...args) {
    return getQuestionsAiClient().writeModelFailures(...args);
  }

  function recordModelFailure(...args) {
    return getQuestionsAiClient().recordModelFailure(...args);
  }

  function parseAvailableModelsFromDetail(...args) {
    return getQuestionsAiClient().parseAvailableModelsFromDetail(...args);
  }

  function normalizeAvailableChatModels(...args) {
    return getQuestionsAiClient().normalizeAvailableChatModels(...args);
  }

  function applyAvailableModelsHint(apiModels, options = {}) {
    const { exclude = [] } = options;
    const nextModels = normalizeAvailableChatModels(apiModels, exclude);
    if (!nextModels.length) return [];
    setCurrentModels(nextModels);
    renderModelsList(nextModels);
    return nextModels;
  }

  function getRequestOrder(preferredModel) {
    return getModelOrder(preferredModel && currentModels.includes(preferredModel) ? preferredModel : getPreferredModel(currentModels));
  }

  function isModelBlocked(...args) {
    return getQuestionsAiClient().isModelBlocked(...args);
  }

  function getModelOrder(...args) {
    return getQuestionsAiClient().getModelOrder(...args);
  }

  function showLoader(el) {
    if (!el) return;
    el.innerHTML = AI_LOADER_HTML;
    delete el.dataset.waitingModel;
    el.classList.add("show");
  }

  function updateLoaderText(...args) {
    return getQuestionsAiClient().updateLoaderText(...args);
  }

  function getModelDisplayLabel(...args) {
    return getQuestionsAiClient().getModelDisplayLabel(...args);
  }

  function startLoaderPhases(...args) {
    return getQuestionsAiClient().startLoaderPhases(...args);
  }

  function stopLoaderPhases(...args) {
    return getQuestionsAiClient().stopLoaderPhases(...args);
  }

  function fetchAnswerOnce(...args) {
    return getQuestionsAiClient().fetchAnswerOnce(...args);
  }

  function requestBatchWithTimeout(...args) {
    return getQuestionsAiClient().requestBatchWithTimeout(...args);
  }

  async function requestWithFallback(userQ, preferredModel, onAttempt, onAdditional, options = {}) {
    const { skipCloudUserKeyRecovery = false } = options;
    if (modelDiscoveryPromise) await modelDiscoveryPromise;
    if (modelDiscoveryScope !== modelCacheScope() || Date.now() - modelDiscoveryAt > MODEL_LIST_CACHE_TTL_MS) {
      modelDiscoveryPromise = loadModels();
      await modelDiscoveryPromise;
    }
    const requestedOrder = typeof options.modelOrder === "function" ? options.modelOrder() : options.modelOrder;
    const order = Array.isArray(requestedOrder)
      ? requestedOrder.filter(model => currentModels.includes(model))
      : getRequestOrder(preferredModel);
    try {
      return await requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options);
    } catch (batchErr) {
      if (isAllModelsCreditsExhaustedError(batchErr?.error)) {
        showApiKeyModal({ reason: "model_credits_exhausted" });
        throw batchErr.error;
      }
      if (batchErr?.apiKeyFailureCount === batchErr?.total) {
        if (!skipCloudUserKeyRecovery && await tryHydrateUserApiKeyFromCloud()) {
          return requestWithFallback(userQ, preferredModel, onAttempt, onAdditional, {
            ...options,
            skipCloudUserKeyRecovery: true
          });
        }
        showApiKeyModal({
          reason: batchErr?.apiKeyError?.code === "API_KEY_QUOTA_EXCEEDED" ? "quota_exceeded" : "invalid_key",
          detail: batchErr?.apiKeyError?.detail || "",
          authMode: batchErr?.apiKeyError?.authMode || getCurrentApiKeyMode()
        });
        throw batchErr.error || new Error(batchErr?.apiKeyError?.code || "INVALID_API_KEY");
      }
      if (batchErr?.regionFailureCount === batchErr?.total) {
        throw batchErr.regionError || new Error("AI_REGION_UNAVAILABLE");
      }
      if (Array.isArray(batchErr?.availableModelsHint) && batchErr.availableModelsHint.length) {
        const hintedModels = applyAvailableModelsHint(batchErr.availableModelsHint, { exclude: batchErr?.tried || [] });
        if (hintedModels.length) {
          const retryOrderFromHint = getRequestOrder(getPreferredModel(hintedModels)).filter(m => !(batchErr?.tried || []).includes(m));
          if (retryOrderFromHint.length) {
            try {
              return await requestBatchWithTimeout(userQ, retryOrderFromHint, onAttempt, onAdditional, options);
            } catch (retryErrFromHint) {
              if (isAllModelsCreditsExhaustedError(retryErrFromHint?.error)) {
                showApiKeyModal({ reason: "model_credits_exhausted" });
                throw retryErrFromHint.error;
              }
              if (retryErrFromHint?.apiKeyFailureCount === retryErrFromHint?.total) {
                if (!skipCloudUserKeyRecovery && await tryHydrateUserApiKeyFromCloud()) {
                  return requestWithFallback(userQ, preferredModel, onAttempt, onAdditional, {
                    ...options,
                    skipCloudUserKeyRecovery: true
                  });
                }
                showApiKeyModal({
                  reason: retryErrFromHint?.apiKeyError?.code === "API_KEY_QUOTA_EXCEEDED" ? "quota_exceeded" : "invalid_key",
                  detail: retryErrFromHint?.apiKeyError?.detail || "",
                  authMode: retryErrFromHint?.apiKeyError?.authMode || getCurrentApiKeyMode()
                });
                throw retryErrFromHint.error || new Error(retryErrFromHint?.apiKeyError?.code || "INVALID_API_KEY");
              }
              if (retryErrFromHint?.regionFailureCount === retryErrFromHint?.total) {
                throw retryErrFromHint.regionError || new Error("AI_REGION_UNAVAILABLE");
              }
              throw retryErrFromHint.error || new Error("No AI answer");
            }
          }
        }
      }
      throw batchErr.error || new Error("No AI answer");
    }
  }

  async function loadModels(options = {}) {
    const { exclude = [] } = options;
    try {
      const res = await callAiProxy({
        method: "POST",
        body: {
          action: "models",
          userApiKey: getAuthKey() || null
        }
      });
      if (!res.ok) throw new Error(`Models list failed: ${res.status}`);
      const json = await res.json();
      const finalModels = normalizeAvailableChatModels(json?.data, exclude);
      if (!finalModels.length) throw new Error("No accessible text models in /models response");
      setCurrentModels(finalModels);
      renderModelsList(finalModels);
      modelDiscoveryAt = Date.now();
      modelDiscoveryScope = modelCacheScope();
      return finalModels;
    } catch (e) {
      console.warn("Using fallback model list", e);
      const fallback = FAST_MODEL_HINTS.filter(m => !exclude.includes(m));
      if (fallback.length) {
        setCurrentModels(fallback);
        renderModelsList(fallback);
      }
      modelDiscoveryAt = Date.now();
      modelDiscoveryScope = modelCacheScope();
      return fallback;
    }
  }


  // --- Typewriter effect для AI-ответа ---
  function typeWriter(el, text, startSpeed = 50, endSpeed = 0) {
    el.textContent = "";
    let i = 0, total = text.length;
    (function write() {
      if (i < total) {
        el.textContent += text.charAt(i++);
        const progress = total > 1 ? (i / (total - 1)) : 1;
        const delay = startSpeed + (endSpeed - startSpeed) * progress;
        setTimeout(write, Math.max(delay, 0));
      }
    })();
  }

  function showSupplementLoader(el) {
    if (!el) return;
    el.innerHTML = AI_LOADER_HTML;
    delete el.dataset.waitingModel;
    el.style.display = "block";
  }

  function formatSecondsRu(seconds) {
    const n = Math.abs(Number(seconds) || 0);
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return `${n} секунд`;
    if (mod10 === 1) return `${n} секунду`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} секунды`;
    return `${n} секунд`;
  }

  function getAppendInlineStatusText() {
    return window.innerWidth <= 600 ? "Дополняю..." : "Дополняю ответ у ИИ";
  }

  function shortModelLabel(model) {
    const [provider = "", id = ""] = String(model || "").split("/");
    const family = id.split("-")[0].toLowerCase();
    const label = provider === "openai" ? "OpenAI" : ({ llama: "LLaMA", gemma: "Gemma", glm: "GLM", deepseek: "DeepSeek", nemotron: "Nemotron" })[family] || id.split("-")[0] || provider;
    const duplicate = currentModels.filter(item => item !== model && item.split("/").pop()?.split("-")[0].toLowerCase() === family).length > 0;
    const size = id.match(/(?:^|-)(\d+(?:\.\d+)?)b(?:-|$)/i)?.[1];
    return duplicate && size ? `${label} ${size}B` : label;
  }

  function normalizeCategoryKey(category) {
    const value = String(category || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (!value || value === "ВСЕ") return "ALL";
    if (value === "БД" || value === "БАЗЫ ДАННЫХ") return "БАЗЫ ДАННЫХ";
    if (value === "GIT" || value === "GIT + IDE" || value === "GIT + IDE + SELENIUM") return "GIT";
    if (value === "ТЕОРИЯ") return "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ";
    return value;
  }

  function renderAiSupplement(el, text, seconds, modelName, nav, statusText, appearanceVariant = "") {
    if (!el) return;
    el.innerHTML = "";
    el.classList.toggle("ai-supplement-public", appearanceVariant === "public");
    const head = document.createElement("div");
    head.className = "ai-supplement-head";
    const title = document.createElement("div");
    title.className = "ai-supplement-title";
    if (appearanceVariant === "public") {
      title.innerHTML = `Ответ ИИ <span class="ai-time">из хранилища</span>`;
    } else if (seconds) {
      title.innerHTML = `Ответ ИИ <span class="ai-time">за ${formatSecondsRu(seconds)}</span>`;
    } else {
      title.textContent = "Ответ ИИ";
    }
    head.appendChild(title);
    if (statusText) {
      const inlineStatus = document.createElement("div");
      inlineStatus.className = "ai-supplement-inline-status";
      inlineStatus.innerHTML = `<span class="ai-inline-spinner"></span><span class="ai-time">${escapeHtml(statusText)}</span>`;
      head.appendChild(inlineStatus);
    }
      if (nav && nav.total > 1) {
      const controls = document.createElement("div");
      controls.className = "ai-supplement-nav";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "ai-nav-btn";
      prev.title = "Предыдущий ответ";
      prev.textContent = "‹";
      prev.addEventListener("click", nav.onPrev);
      const index = document.createElement("span");
      index.className = "ai-nav-index ai-time";
      index.textContent = `${nav.index + 1}/${nav.total}`;
      const next = document.createElement("button");
      next.type = "button";
      next.className = "ai-nav-btn";
      next.title = "Следующий ответ";
      next.textContent = "›";
      next.addEventListener("click", nav.onNext);
      controls.appendChild(prev);
      controls.appendChild(index);
      controls.appendChild(next);
      if (typeof nav.onDelete === "function") {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ai-nav-delete";
        del.title = "Удалить этот ответ";
        del.textContent = "🗑";
        del.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          nav.onDelete();
        });
        controls.appendChild(del);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "ai-nav-delete-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        controls.appendChild(placeholder);
      }
      head.appendChild(controls);
    } else if (nav && typeof nav.onDelete === "function") {
      const controls = document.createElement("div");
      controls.className = "ai-supplement-nav";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "ai-nav-delete";
      del.title = "Удалить этот ответ";
      del.textContent = "🗑";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        nav.onDelete();
      });
      controls.appendChild(del);
      head.appendChild(controls);
    }
    const body = document.createElement("div");
    body.className = "ai-supplement-text ai-rich";
    try {
      body.innerHTML = formatAiText(String(text || ""));
      enhanceAiTableScrollbars(body);
    } catch (e) {
      console.warn("AI render failed, fallback to plain text", e);
      body.textContent = String(text || "");
    }
    el.appendChild(head);
    el.appendChild(body);
    if (modelName) {
      const meta = document.createElement("div");
      meta.className = "ai-supplement-meta";
      meta.innerHTML = `<span class="ai-time">ответила: ${escapeHtml(modelName)}</span>`;
      el.appendChild(meta);
    }
    el.style.display = "block";
  }

  function animateAiSupplementSwipe(el, direction = "next") {
    if (!el) return;
    const cls = direction === "prev" ? "ai-swipe-prev" : "ai-swipe-next";
    el.classList.remove("ai-swipe-prev", "ai-swipe-next");
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 260);
  }

  let refineContext = null;

  const refineAction = document.createElement("button");
  refineAction.type = "button";
  refineAction.className = "ai-refine-action";
  refineAction.textContent = "Уточнить у ИИ";
  refineAction.style.display = "none";
  document.body.appendChild(refineAction);

  const refinePanel = document.createElement("div");
  refinePanel.className = "ai-refine-panel";
  refinePanel.style.display = "none";
  refinePanel.innerHTML = `
    <input type="text" class="ai-refine-input" placeholder="Что уточнить по выделенному тексту?" />
    <button type="button" class="ai-refine-send">Отправить</button>
    <button type="button" class="ai-refine-cancel">Закрыть</button>
  `;
  document.body.appendChild(refinePanel);

  const refineInput = refinePanel.querySelector(".ai-refine-input");
  const refineSend = refinePanel.querySelector(".ai-refine-send");
  const refineCancel = refinePanel.querySelector(".ai-refine-cancel");

  function hideRefineUi() {
    refineAction.style.display = "none";
    refinePanel.style.display = "none";
  }

  function buildRefinePrompt(context, userFollowup) {
    return [
      `Тема: ${context.category}`,
      `Основной вопрос: ${context.questionTitle}`,
      `Базовый ответ: ${context.baseAnswer}`,
      `Текущий ответ ИИ (если есть): ${context.currentAiAnswer || "нет"}`,
      `Выделенный фрагмент: ${context.selectedText}`,
      `Уточнение пользователя: ${userFollowup}`
    ].join("\n\n");
  }

  function showRefineAction(selection, context) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;
    refineContext = context;
    refineAction.style.display = "inline-flex";
    const left = Math.min(
      Math.max(8, rect.left + window.scrollX),
      window.scrollX + window.innerWidth - refineAction.offsetWidth - 8
    );
    refineAction.style.left = `${left}px`;
    refineAction.style.top = `${Math.max(8, rect.bottom + window.scrollY + 8)}px`;
  }

  function getSelectionContext(selection) {
    if (!selection || selection.rangeCount === 0) return null;
    const anchorNode = selection.anchorNode;
    const root = anchorNode && anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
    if (!root) return null;
    const textRoot = root.closest(".t849__text");
    const aiTextRoot = root.closest(".ai-supplement-text");
    if (!textRoot && !aiTextRoot) return null;
    let itemId = "";
    if (textRoot) {
      itemId = textRoot.getAttribute("data-item-id") || "";
    } else if (aiTextRoot) {
      itemId = aiTextRoot.closest(".ai-supplement")?.getAttribute("data-id") || "";
    }
    if (!itemId) return null;
    const state = aiItemState.get(itemId);
    if (!state) return null;
    const selectedText = selection.toString().trim();
    if (!selectedText) return null;
    const current = state.runtimeResponses[state.runtimeIndex] || null;
    return {
      itemId,
      selectedText,
      category: state.category,
      questionTitle: state.questionTitle,
      baseAnswer: state.baseAnswer,
      currentAiAnswer: current ? current.answer : "",
      state
    };
  }

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      refineAction.style.display = "none";
      return;
    }
    const context = getSelectionContext(selection);
    if (!context) {
      refineAction.style.display = "none";
      return;
    }
    showRefineAction(selection, context);
  });

  document.addEventListener("click", (e) => {
    const isRefineElement =
      refineAction.contains(e.target) ||
      refinePanel.contains(e.target);
    if (isRefineElement) return;
    const selection = window.getSelection();
    const hasActiveSelection = !!(
      selection &&
      !selection.isCollapsed &&
      String(selection.toString() || "").trim()
    );
    if (hasActiveSelection) return;
    hideRefineUi();
  });

  refineAction.addEventListener("click", async () => {
    if (!refineContext) return;
    const canContinue = await ensureAuthForAiAction();
    if (!canContinue) return;
    refinePanel.style.display = "flex";
    const left = parseInt(refineAction.style.left, 10) || 8;
    refinePanel.style.left = `${left}px`;
    refinePanel.style.top = `${parseInt(refineAction.style.top, 10) + 36}px`;
    requestAnimationFrame(() => {
      const rect = refinePanel.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        const correctedLeft = Math.max(8, window.scrollX + window.innerWidth - rect.width - 8);
        refinePanel.style.left = `${correctedLeft}px`;
      }
    });
    if (refineInput) {
      refineInput.value = "";
      refineInput.focus();
    }
  });

  async function runRefineRequest(context, userFollowup) {
    const itemState = context.state;
    if (!itemState || typeof itemState.pushRuntimeResponse !== "function") return false;
    const preferredModel = getPreferredModel(currentModels);
    const startedAt = Date.now();
    const prompt = buildRefinePrompt(context, userFollowup);
    showHeaderAiNotchProcessing(context.itemId);
    const timer = null;
    try {
      const result = await requestWithFallback(
        prompt,
        preferredModel,
        () => {},
        (extraResult) => {
          const extraSeconds = Math.max(1, Math.round((Number(extraResult.elapsedMs) || 0) / 1000));
          const response = {
            answer: extraResult.answer,
            model: extraResult.model,
            seconds: extraSeconds,
            arrivedAt: extraResult.arrivedAt,
            answerType: "refine"
          };
          itemState.pushRuntimeResponse(response, { focus: false });
          saveAiAnswerCloud(context.itemId, "refine", response).then((id) => {
            if (id) {
              response.cloudId = id;
              if (response.__deleteRequested) deleteAiAnswerCloud(id);
            }
          });
        },
        { system: refineSystemPrompt }
      );
      stopLoaderPhases(timer);
      const seconds = Math.max(1, Math.round((Number(result.elapsedMs) || (Date.now() - startedAt)) / 1000));
      const response = {
        answer: result.answer,
        model: result.model,
        seconds,
        arrivedAt: result.arrivedAt || Date.now(),
        answerType: "refine"
      };
      itemState.pushRuntimeResponse(response, { focus: false, delayedFocusMs: 1000 });
      showHeaderAiNotchReady(context.itemId);
      saveAiAnswerCloud(context.itemId, "refine", response).then((id) => {
        if (id) {
          response.cloudId = id;
          if (response.__deleteRequested) deleteAiAnswerCloud(id);
        }
      });
      return true;
    } catch (e) {
      stopLoaderPhases(timer);
      if (isRecoverableApiKeyError(e) || isAllModelsCreditsExhaustedError(e) || String(e?.message || "").includes("INVALID_API_KEY")) {
        pendingRetry = () => runRefineRequest(context, userFollowup);
        return false;
      }
      failHeaderAiNotchRequest();
      renderAiSupplement(
        itemState.aiSupplementEl,
        e?.code === "AI_RATE_LIMITED" ? "Лимит Groq временно достигнут. Попробуйте позже." : isAiRegionAvailabilityError(e) ? getAiRegionUnavailableMessage() : "Не удалось получить ответ от моделей. Попробуйте позже."
      );
      return false;
    }
  }

  if (refineSend) {
    refineSend.addEventListener("click", async () => {
      const followup = (refineInput?.value || "").trim();
      if (!refineContext || !followup) return;
      const canContinue = await ensureAuthForAiAction();
      if (!canContinue) return;
      const ctx = refineContext;
      hideRefineUi();
      await runRefineRequest(ctx, followup);
    });
  }

  if (refineInput) {
    refineInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const followup = (refineInput.value || "").trim();
      if (!refineContext || !followup) return;
      const canContinue = await ensureAuthForAiAction();
      if (!canContinue) return;
      const ctx = refineContext;
      hideRefineUi();
      await runRefineRequest(ctx, followup);
    });
  }

  if (refineCancel) {
    refineCancel.addEventListener("click", hideRefineUi);
  }

  // --- Render accordion sections & items ---
  const container = document.getElementById("accordion-container");
  const tpl       = document.getElementById("accordion-item-template");
  if (!container || !tpl) {
    console.info("Accordion UI not found on this page, questions list render skipped.");
    return;
  }
  clearQuestionsSkeleton();

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function detectLanguage(code) {
    const text = code.toUpperCase();
    if (/(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY|VALUES|CREATE|ALTER|DROP)\b/.test(text)) {
      return 'sql';
    }
    if (/(SYSTEM\.OUT\.PRINT|PUBLIC\s+CLASS|STATIC\s+VOID|STRING\s+|INT\s+)/.test(code)) {
      return 'java';
    }
    if (/(CONSOLE\.LOG|=>|\bLET\b|\bCONST\b|\bVAR\b|\bFUNCTION\b|\bASYNC\b|\bAWAIT\b)/i.test(code)) {
      return 'javascript';
    }
    if (/(DEF\s+|PRINT\(|\bNONE\b|\bTRUE\b|\bFALSE\b)/i.test(code)) {
      return 'python';
    }
    return '';
  }

  function highlightCode(code, lang) {
    let html = escapeHtml(code);

    // Comments
    if (lang === 'sql') {
      html = html.replace(/(--.*)$/gm, '<span class="tok-comment">$1</span>');
    } else {
      html = html.replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>');
      html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>');
    }

    // Strings
    html = html.replace(/("([^"\\]|\\.)*")/g, '<span class="tok-string">$1</span>');
    html = html.replace(/('([^'\\]|\\.)*')/g, '<span class="tok-string">$1</span>');

    // Numbers
    html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-number">$1</span>');

    // Keywords
    let keywords = [];
    if (lang === 'sql') {
      keywords = [
        'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','GROUP','BY','ORDER','INSERT','UPDATE','DELETE',
        'CREATE','ALTER','DROP','DISTINCT','LIMIT','VALUES','INTO','AS','ON','AND','OR','NOT','NULL','IS','IN',
        'BETWEEN','LIKE','COUNT','AVG','MIN','MAX','SUM'
      ];
      const re = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
      html = html.replace(re, '<span class="tok-keyword">$1</span>');
    } else if (lang === 'java' || lang === 'javascript' || lang === 'python') {
      keywords = [
        'public','class','static','void','int','string','new','return','if','else','switch','case','break','default',
        'for','while','try','catch','throw','const','let','var','function','async','await','extends','import','from'
      ];
      const re = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
      html = html.replace(re, '<span class="tok-keyword">$1</span>');
    }

    return html;
  }

  function enhanceAnswerBlock(textEl) {
    const codeNodes = Array.from(textEl.querySelectorAll('code'));
    codeNodes.forEach(codeEl => {
      const rawHtml = codeEl.innerHTML || '';
      const text = codeEl.textContent || '';
      const hasBreaks = /<br\s*\/?>/i.test(rawHtml) || text.includes('\n');
      const lang = detectLanguage(text);
      const looksLikeSqlStatement = lang === 'sql' && /\\b(SELECT|INSERT|UPDATE|DELETE|WITH)\\b/i.test(text);

      if (hasBreaks || looksLikeSqlStatement) {
        const pre = document.createElement('pre');
        pre.className = 'code-block';
        const code = document.createElement('code');
        if (lang) code.className = `language-${lang}`;
        const normalized = rawHtml
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]*>/g, '');
        code.innerHTML = highlightCode(normalized, lang);
        pre.appendChild(code);
        codeEl.replaceWith(pre);
      } else {
        codeEl.classList.add('code-inline');
        codeEl.textContent = text;
      }
    });
  }

  function enhanceAiTableScrollbars(root) {
    root.querySelectorAll('.ai-table-wrap').forEach(viewport => {
      const shell = document.createElement('div');
      shell.className = 'ai-table-shell';
      viewport.parentNode.insertBefore(shell, viewport);
      shell.appendChild(viewport);

      const track = document.createElement('div');
      track.className = 'ai-table-scroll-track';
      track.setAttribute('aria-hidden', 'true');
      const thumb = document.createElement('div');
      thumb.className = 'ai-table-scroll-thumb';
      track.appendChild(thumb);
      shell.appendChild(track);

      let showTimer;
      let hideTimer;
      let dragging = false;
      let dragPointerId = null;
      let dragX = 0;
      let dragScrollLeft = 0;

      function update() {
        const overflow = viewport.scrollWidth - viewport.clientWidth;
        shell.classList.toggle('ai-table-shell--scrollable', overflow > 1);
        if (overflow <= 1) return;
        const trackWidth = track.clientWidth;
        const thumbWidth = Math.min(trackWidth, Math.max(36, trackWidth * viewport.clientWidth / viewport.scrollWidth));
        const travel = Math.max(0, trackWidth - thumbWidth);
        thumb.style.width = `${thumbWidth}px`;
        thumb.style.transform = `translateX(${travel * viewport.scrollLeft / overflow}px)`;
      }

      shell.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(hideTimer);
        update();
        showTimer = setTimeout(() => shell.classList.add('ai-table-shell--visible'), 500);
      });
      shell.addEventListener('pointerleave', () => {
        clearTimeout(showTimer);
        if (!dragging) hideTimer = setTimeout(() => shell.classList.remove('ai-table-shell--visible'), 500);
      });
      viewport.addEventListener('scroll', update, { passive: true });
      track.addEventListener('pointerdown', event => {
        if (event.button !== 0 || dragging) return;
        event.preventDefault();
        update();
        dragging = true;
        dragPointerId = event.pointerId;
        dragX = event.clientX;
        dragScrollLeft = viewport.scrollLeft;
        if (event.target !== thumb) {
          const thumbWidth = thumb.getBoundingClientRect().width;
          const travel = track.clientWidth - thumbWidth;
          viewport.scrollLeft = (event.clientX - track.getBoundingClientRect().left - thumbWidth / 2)
            / Math.max(1, travel) * (viewport.scrollWidth - viewport.clientWidth);
          dragScrollLeft = viewport.scrollLeft;
        }
        track.setPointerCapture(event.pointerId);
      });
      track.addEventListener('pointermove', event => {
        if (!dragging || event.pointerId !== dragPointerId) return;
        if (!(event.buttons & 1)) {
          endDrag();
          return;
        }
        const travel = track.clientWidth - thumb.getBoundingClientRect().width;
        viewport.scrollLeft = dragScrollLeft + (event.clientX - dragX)
          / Math.max(1, travel) * (viewport.scrollWidth - viewport.clientWidth);
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        const pointerId = dragPointerId;
        dragPointerId = null;
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
        if (!shell.matches(':hover')) {
          hideTimer = setTimeout(() => shell.classList.remove('ai-table-shell--visible'), 500);
        }
      }
      track.addEventListener('pointerup', event => {
        if (event.pointerId === dragPointerId) endDrag();
      });
      track.addEventListener('pointercancel', endDrag);
      track.addEventListener('lostpointercapture', endDrag);
    });
  }

  function formatAiText(text) {
    if (!text) return "";
    const src = String(text);
    const parts = [];
    const re = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) {
        parts.push({ type: "text", value: src.slice(last, m.index) });
      }
      parts.push({ type: "code", lang: (m[1] || "").toLowerCase(), value: m[2] });
      last = m.index + m[0].length;
    }
    if (last < src.length) parts.push({ type: "text", value: src.slice(last) });

    function renderTextBlock(block) {
      let t = escapeHtml(block);
      // Normalize inline numbered lists like "1) ..." into new lines
      t = t.replace(/(\s)(\d{1,2})\)\s+/g, "\n$2. ");
      t = t.replace(/^###\s+(.*)$/gm, "<h4>$1</h4>");
      t = t.replace(/^##\s+(.*)$/gm, "<h3>$1</h3>");
      t = t.replace(/^#\s+(.*)$/gm, "<h2>$1</h2>");
      t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
      t = t.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Markdown-like tables
      const lines = t.split(/\r?\n/);
      const outLines = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const isTableLine = /\|/.test(line);
        const next = lines[i + 1] || "";
        const isSeparator = /^\s*\|?\s*[-:]{3,}\s*(\|\s*[-:]{3,}\s*)+\|?\s*$/.test(next);
        if (isTableLine && isSeparator) {
          const headerCells = line.split("|").map(s => s.trim()).filter(s => s.length);
          const rows = [];
          i += 2;
          while (i < lines.length && /\|/.test(lines[i])) {
            const rowCells = lines[i].split("|").map(s => s.trim()).filter(s => s.length);
            if (rowCells.length) rows.push(rowCells);
            i++;
          }
          let tableHtml = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
          headerCells.forEach(c => { tableHtml += `<th>${c}</th>`; });
          tableHtml += '</tr></thead><tbody>';
          rows.forEach(r => {
            tableHtml += '<tr>';
            headerCells.forEach((_, idx) => {
              tableHtml += `<td>${r[idx] || ""}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table></div>';
          outLines.push(tableHtml);
          continue;
        }
        outLines.push(line);
        i++;
      }

      const lines2 = outLines;
      let out = "";
      let inUl = false;
      let inOl = false;
      lines2.forEach(line => {
        const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
        const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
        if (ulMatch) {
          if (inOl) { out += "</ol>"; inOl = false; }
          if (!inUl) { out += "<ul>"; inUl = true; }
          out += `<li>${ulMatch[1]}</li>`;
          return;
        }
        if (olMatch) {
          if (inUl) { out += "</ul>"; inUl = false; }
          if (!inOl) { out += "<ol>"; inOl = true; }
          out += `<li>${olMatch[1]}</li>`;
          return;
        }
        if (line.includes("ai-table")) {
          if (inUl) { out += "</ul>"; inUl = false; }
          if (inOl) { out += "</ol>"; inOl = false; }
          out += line;
          return;
        }
        if (inUl) { out += "</ul>"; inUl = false; }
        if (inOl) { out += "</ol>"; inOl = false; }
        out += line === "" ? "<br>" : `${line}<br>`;
      });
      if (inUl) out += "</ul>";
      if (inOl) out += "</ol>";

      out = out.replace(/<br>\s*<br>/g, "</p><p>");
      if (!out.startsWith("<")) out = `<p>${out}</p>`;
      if (!out.startsWith("<p>")) out = `<p>${out}</p>`;
      return out;
    }

    return parts.map(p => {
      if (p.type === "code") {
        const code = escapeHtml(p.value);
        return `<pre class="code-block"><code>${code}</code></pre>`;
      }
      return renderTextBlock(p.value);
    }).join("");
  }

  if (!Array.isArray(runtimeQuestionsData) || !runtimeQuestionsData.length) {
    if (container) {
      container.innerHTML = `
        <section class="article">
          <h3>Не удалось загрузить вопросы из БД</h3>
          <p>Проверьте запросы к Supabase в Network и ошибки в Console.</p>
        </section>
      `;
    }
  }

  const openKey = "open_items";
  let initialOpenIds = [];
  try {
    const parsedOpen = JSON.parse(localStorage.getItem(openKey) || "[]");
    initialOpenIds = Array.isArray(parsedOpen) ? parsedOpen.filter(Boolean) : [];
  } catch {
    initialOpenIds = [];
  }
  const openSet = new Set(initialOpenIds);
  while (openSet.size > 3) {
    const oldestId = openSet.values().next().value;
    if (!oldestId) break;
    openSet.delete(oldestId);
  }
  safeSetItemWithAiEviction(openKey, JSON.stringify(Array.from(openSet)));

  runtimeQuestionsData.forEach(cat => {
    // 1. Создаем <section>
    const section = document.createElement("section");
    section.className = "article";
    section.dataset.categoryKey = normalizeCategoryKey(cat.category);

    // 2. Картинка и заголовок
    let imgSrc = "img/answer/default-category.png";
    switch (cat.category) {
      case "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ": imgSrc = "img/answer/theory.jpeg"; break;
      case "WEB":                         imgSrc = "img/answer/client-server-arch.jpeg"; break;
      case "API":                         imgSrc = "img/answer/restapi.jpeg"; break;
      case "БАЗЫ ДАННЫХ":                 imgSrc = "img/answer/mysql.jpeg"; break;
      case "GIT + IDE + SELENIUM":        imgSrc = "img/answer/git.jpeg"; break;
      case "DEVOPS":                      imgSrc = "img/answer/docker.jpeg"; break;
      case "Вопросы к руководителю | команде | HR": imgSrc = "img/answer/hr.jpeg"; break;
      case "AQA Java":                    imgSrc = "img/answer/AQAjava.jpeg"; break;
      case "AQA Python":                  imgSrc = "img/answer/AQApython.jpeg"; break;
      case "AQA JS":                      imgSrc = "img/answer/AQAjs.jpeg"; break;
    }

    section.innerHTML = `
      <div class="answer-image">
        <img src="${imgSrc}" alt="Иконка для ${cat.category}" class="category-icon" width="720" height="405" loading="eager" decoding="async" />
        <h3 class="category-title">${cat.category}</h3>
      </div>
    `;

    // 3. Прогресс-бар
    const trackableIds = new Set(cat.items.filter(item => item.id !== softQuestionsItemId).map(item => item.id));
    const total = trackableIds.size;
    const countTracked = ids => ids.filter(id => trackableIds.has(id)).length;
    section.insertAdjacentHTML('beforeend', `
      <div class="progress-container">
        <div class="progress-bar-unclear" data-category="${cat.category}"></div>
        <div class="progress-bar"        data-category="${cat.category}"></div>
        <span class="progress-text"      data-category="${cat.category}">0%</span>
      </div>
    `);
    container.appendChild(section);

    // Восстанавливаем состояния из localStorage
    const studiedArr = JSON.parse(
      localStorage.getItem(`studied_${cat.category}`)
    ) || [];
    const unclearArr = JSON.parse(
      localStorage.getItem(`unclear_${cat.category}`)
    ) || [];
    cat.items.forEach(item => {
      const cloudStatus = cloudProgressByQuestion.get(item.id);
      if (cloudStatus === "studied") {
        if (!studiedArr.includes(item.id)) studiedArr.push(item.id);
        const idx = unclearArr.indexOf(item.id);
        if (idx >= 0) unclearArr.splice(idx, 1);
      } else if (cloudStatus === "unclear") {
        if (!unclearArr.includes(item.id)) unclearArr.push(item.id);
        const idx = studiedArr.indexOf(item.id);
        if (idx >= 0) studiedArr.splice(idx, 1);
      }
    });
    safeSetItemWithAiEviction(`studied_${cat.category}`, JSON.stringify(studiedArr));
    safeSetItemWithAiEviction(`unclear_${cat.category}`, JSON.stringify(unclearArr));
    updateProgress(cat.category, countTracked(studiedArr), countTracked(unclearArr), total);

    // 4. Render вопросов
    cat.items.forEach(item => {
      const clone  = tpl.content.cloneNode(true);
      const header = clone.querySelector('.t849__header');
      const btn    = clone.querySelector('.t849__trigger-button');
      const title  = clone.querySelector('.t849__title');
      const content= clone.querySelector('.t849__content');
      const textEl = clone.querySelector('.t849__text');

      btn.setAttribute('aria-controls', item.id);
      title.textContent = item.title;
      content.id = item.id;

      // Собираем ссылки «Читать» и «Ревью от автора», если они есть
      // Собираем кнопки
      let readLinks = [];
      let authorLinks = [];
      if (item.moreLink) {
        readLinks.push(
          `<a href="${item.moreLink}" target="_blank" rel="noopener noreferrer" class="answer-link read-link">Читать</a>`
        );
      }
      if (item.authorCheck) {
        authorLinks.push(`
          <a
            href="${item.authorCheck}"
            target="_blank"
            rel="noopener noreferrer"
            class="answer-link author-link"
          >
            Блог ревьюера
            <img src="${item.avatar}" alt="Аватар ревьюера" width="22" height="22" loading="lazy" decoding="async">
          </a>
        `);
      }

      let authorLinksBlock = '';
      if (authorLinks.length) {
        authorLinksBlock = `<br><br><div class="answer-links">${authorLinks.join('')}</div>`;
      }

      // The soft-skills entry is a collection of prompts, not a question with a model answer.
      if (item.id === softQuestionsItemId) {
        const prompts = document.createElement('ul');
        prompts.className = 'soft-questions-list';
        for (const part of String(item.answer || '').split(/<br\s*\/?\s*>/i)) {
          const source = document.createElement('span');
          source.innerHTML = part;
          const prompt = source.textContent.trim();
          if (!prompt) continue;
          const card = document.createElement('li');
          card.className = 'soft-questions-list__item';
          card.textContent = prompt;
          prompts.appendChild(card);
        }
        textEl.replaceChildren(prompts);
      } else {
        textEl.innerHTML = item.answer + authorLinksBlock;
        enhanceAnswerBlock(textEl);
      }
      textEl.setAttribute("data-item-id", item.id);

      // Toggle accordion
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        if (expanded) {
          btn.setAttribute("aria-expanded", "false");
          content.style.display = "none";
          header.classList.remove("t849__opened");
          openSet.delete(item.id);
        } else {
          if (!openSet.has(item.id) && openSet.size >= 3) {
            const oldestId = openSet.values().next().value;
            if (oldestId) {
              const oldestBtn = container.querySelector(`.t849__trigger-button[aria-controls="${oldestId}"]`);
              const oldestHeader = oldestBtn?.closest(".t849__header");
              const oldestContent = document.getElementById(oldestId);
              if (oldestBtn) oldestBtn.setAttribute("aria-expanded", "false");
              if (oldestHeader) oldestHeader.classList.remove("t849__opened");
              if (oldestContent) oldestContent.style.display = "none";
              openSet.delete(oldestId);
            }
          }
          btn.setAttribute("aria-expanded", "true");
          content.style.display = "block";
          header.classList.add("t849__opened");
          openSet.delete(item.id);
          openSet.add(item.id);
          trackQuestionsGoal({
            action: "question_open",
            question_id: item.id,
            category: cat.category,
            question_title: shortenText(item.title)
          });
        }
        safeSetItemWithAiEviction(openKey, JSON.stringify(Array.from(openSet)));
      });

      if (item.id === softQuestionsItemId) {
        if (openSet.has(item.id)) {
          btn.setAttribute("aria-expanded", "true");
          content.style.display = "block";
          header.classList.add("t849__opened");
        }
        section.appendChild(clone);
        return;
      }

      const baseAnswerHolder = document.createElement("div");
      baseAnswerHolder.innerHTML = item.answer;
      const baseAnswerPlain = (baseAnswerHolder.textContent || "").trim();
      textEl.insertAdjacentHTML('beforeend', `
        <div class="answer-actions" style="margin-top:1rem;">
          <div class="answer-actions-left">
            <button type="button" class="answer-link study-btn"
                    data-category="${cat.category}" data-id="${item.id}"
                    title="Понимаю материал">
              &#10003;
            </button>
            <button type="button" class="unclear-btn"
                    data-category="${cat.category}" data-id="${item.id}"
                    title="Не до конца разбираюсь">
              ?
            </button>
          </div>
          <div class="answer-actions-right">
            ${readLinks.length ? `<div class="answer-links inline-links">${readLinks.join('')}</div>` : ""}
            <button type="button" class="ai-append-btn" data-id="${item.id}">Дополнить ответ от ИИ</button>
          </div>
        </div>
        <div class="ai-append-wrap" data-id="${item.id}">
          <div class="ai-supplement" data-id="${item.id}" style="display:none;"></div>
        </div>
      `);

      // Подкрашиваем «+» при рендере
      if (studiedArr.includes(item.id)) header.classList.add('studied');
      else if (unclearArr.includes(item.id)) header.classList.add('unclear');

      // Обработчик «✓»
      clone.querySelector('.study-btn').addEventListener('click', e => {
        const c = e.target.dataset.category;
        const id = e.target.dataset.id;
        const studiedKey = 'studied_' + c;
        const unclearKey = 'unclear_' + c;
        const sArr = JSON.parse(localStorage.getItem(studiedKey)) || [];
        let   uArr = JSON.parse(localStorage.getItem(unclearKey)) || [];
        if (!sArr.includes(id)) {
          sArr.push(id);
          uArr = uArr.filter(x => x !== id);
          safeSetItemWithAiEviction(studiedKey, JSON.stringify(sArr));
          safeSetItemWithAiEviction(unclearKey, JSON.stringify(uArr));
          header.classList.remove('unclear');
          header.classList.add('studied');
          updateProgress(c, countTracked(sArr), countTracked(uArr), total);
          saveProgressCloud(id, "studied");
          trackQuestionsGoal({
            action: "mark_studied",
            question_id: id,
            category: c,
            question_title: shortenText(item.title)
          });
        }
      });

      // Обработчик «?»
      clone.querySelector('.unclear-btn').addEventListener('click', e => {
        const c = e.target.dataset.category;
        const id = e.target.dataset.id;
        let   sArr = JSON.parse(localStorage.getItem('studied_' + c)) || [];
        const uKey = 'unclear_' + c;
        const uArr = JSON.parse(localStorage.getItem(uKey)) || [];
        if (!uArr.includes(id)) {
          uArr.push(id);
          sArr = sArr.filter(x => x !== id);
          safeSetItemWithAiEviction(uKey, JSON.stringify(uArr));
          safeSetItemWithAiEviction('studied_' + c, JSON.stringify(sArr));
          header.classList.remove('studied');
          header.classList.add('unclear');
          updateProgress(c, countTracked(sArr), countTracked(uArr), total);
          saveProgressCloud(id, "unclear");
          trackQuestionsGoal({
            action: "mark_unclear",
            question_id: id,
            category: c,
            question_title: shortenText(item.title)
          });
        }
      });

      const supplementKey = `ai_supplement_${item.id}`;
      const aiAppendBtn = clone.querySelector(`.ai-append-btn[data-id="${item.id}"]`);
      const aiSupplementEl = clone.querySelector(`.ai-supplement[data-id="${item.id}"]`);
      const state = {
        id: item.id,
        category: cat.category,
        questionTitle: item.title,
        baseAnswer: baseAnswerPlain,
        aiSupplementEl,
        runtimeResponses: [],
        runtimeIndex: 0,
        pendingCursorSignature: "",
        inlineStatus: "",
        renderCurrentRuntimeResponse: null,
        restoreRuntimeResponseCursor: null,
        pushRuntimeResponse: null,
        setInlineStatus: null
      };
      aiItemState.set(item.id, state);
      const sharedAppendResponses = publicAppendAnswersByQuestion.get(item.id) || [];
      const cloudResponses = cloudAnswersByQuestion.get(item.id) || [];
      const mergedCloudResponses = [...sharedAppendResponses];
      const pushIfUniqueResponse = (target, resp) => {
        if (!resp || !resp.answer) return;
        const duplicateIdx = target.findIndex(existing =>
          String(existing.answerType || "append") === String(resp.answerType || "append") &&
          String(existing.answer || "") === String(resp.answer || "") &&
          String(existing.model || "") === String(resp.model || "")
        );
        if (duplicateIdx >= 0) {
          if (target[duplicateIdx]?.isPublicShared && !resp?.isPublicShared) {
            target[duplicateIdx] = { ...target[duplicateIdx], ...resp, isPublicShared: false };
          }
          return;
        }
        target.push({ ...resp });
      };
      cloudResponses.forEach(resp => {
        pushIfUniqueResponse(mergedCloudResponses, { ...resp });
      });
      const localResponses = readLocalAiResponses(item.id);
      localResponses.forEach(resp => pushIfUniqueResponse(mergedCloudResponses, { ...resp }));
      mergedCloudResponses.sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0));
      const savedCursor = readAiResponseCursor(item.id);
      state.pendingCursorSignature = savedCursor?.signature || "";
      if (mergedCloudResponses.length && aiSupplementEl) {
        mergedCloudResponses.forEach(resp => state.runtimeResponses.push(resp));
        if (savedCursor) {
          const bySignatureIdx = savedCursor.signature
            ? state.runtimeResponses.findIndex((x) =>
                aiSignature(item.id, x.answerType, x.model, x.answer) === savedCursor.signature
              )
            : -1;
          if (bySignatureIdx >= 0) {
            state.runtimeIndex = bySignatureIdx;
            state.pendingCursorSignature = "";
          } else if (Number.isInteger(savedCursor.index)) {
            state.runtimeIndex = Math.max(0, Math.min(savedCursor.index, state.runtimeResponses.length - 1));
          }
        }
        writeLocalAiResponses(item.id, state.runtimeResponses);
        const latest = state.runtimeResponses[state.runtimeIndex] || mergedCloudResponses[mergedCloudResponses.length - 1];
        renderAiSupplement(
          aiSupplementEl,
          latest.answer,
          latest.seconds,
          latest.model,
          undefined,
          undefined,
          latest?.isPublicShared ? "public" : ""
        );
      } else {
        const savedSupplement = localStorage.getItem(supplementKey);
        if (savedSupplement && aiSupplementEl) {
          try {
            const parsed = JSON.parse(savedSupplement);
            if (parsed && parsed.text) {
              state.runtimeResponses.push({
                answer: parsed.text,
                model: parsed.model,
                seconds: parsed.seconds,
                arrivedAt: 0,
                answerType: "append"
              });
              writeLocalAiResponses(item.id, state.runtimeResponses);
              renderAiSupplement(aiSupplementEl, parsed.text, parsed.seconds, parsed.model);
            } else {
              renderAiSupplement(aiSupplementEl, savedSupplement);
            }
          } catch {
            renderAiSupplement(aiSupplementEl, savedSupplement);
          }
        }
      }
      if (openSet.has(item.id)) {
        btn.setAttribute("aria-expanded", "true");
        content.style.display = "block";
        header.classList.add("t849__opened");
      }
      if (aiAppendBtn && aiSupplementEl) {
        const runtimeResponses = state.runtimeResponses;
        let runtimeIndex = state.runtimeIndex;
        let inlineStatus = state.inlineStatus || "";

        const syncLocalSupplementCache = () => {
          writeLocalAiResponses(item.id, runtimeResponses);
          if (cloudAnswersByQuestion.get(item.id)?.length || (isCloudReady() && authUser)) return;
          if (!runtimeResponses.length) {
            try {
              localStorage.removeItem(supplementKey);
            } catch {}
            return;
          }
          const current = runtimeResponses[runtimeIndex] || runtimeResponses[runtimeResponses.length - 1];
          try {
            saveAiSupplementWithLimit(
              supplementKey,
              { text: current.answer, seconds: current.seconds, model: current.model }
            );
          } catch (storageError) {
            console.warn("Failed to sync AI supplement cache", storageError);
          }
        };

        const removeRuntimeResponse = async () => {
          try {
            if (!runtimeResponses.length) return;
            if (!Number.isInteger(runtimeIndex) || runtimeIndex < 0 || runtimeIndex >= runtimeResponses.length) {
              runtimeIndex = runtimeResponses.length - 1;
            }
            const removing = runtimeResponses[runtimeIndex];
            if (!removing || typeof removing !== "object") return;
            removing.__deleteRequested = true;
            prunePendingSaveForResponse(item.id, removing);
            runtimeResponses.splice(runtimeIndex, 1);
            if (runtimeIndex >= runtimeResponses.length) {
              runtimeIndex = Math.max(0, runtimeResponses.length - 1);
            }
            if (runtimeResponses.length) {
              renderCurrentRuntimeResponse();
            } else {
              aiSupplementEl.style.display = "none";
              aiSupplementEl.innerHTML = "";
              try { localStorage.removeItem(supplementKey); } catch {}
              writeLocalAiResponses(item.id, []);
            }
            syncLocalSupplementCache();
            let deleted = false;
            if (removing?.cloudId) {
              console.info("Try cloud delete by id", { questionId: item.id, cloudId: removing.cloudId });
              deleted = await deleteAiAnswerCloud(removing.cloudId);
            }
            if (!deleted) {
              console.info("Try cloud delete by payload", { questionId: item.id });
              deleted = await deleteAiAnswerCloudByPayload(item.id, removing);
            }
            if (!deleted) {
              console.warn("AI response delete was not confirmed in cloud", { questionId: item.id, cloudId: removing?.cloudId || null });
              enqueueMutation("deleteAiByPayload", { questionId: item.id, response: removing });
            }
          } catch (e) {
            console.warn("Failed to remove runtime response", e);
          }
        };

        const renderCurrentRuntimeResponse = (options = {}) => {
          const { swipe = null, userSelection = false } = options;
          if (!runtimeResponses.length) return;
          if (userSelection) state.pendingCursorSignature = "";
          const current = runtimeResponses[runtimeIndex];
          state.runtimeIndex = runtimeIndex;
          const canDeleteCurrent = !current?.isPublicShared;
          renderAiSupplement(
            aiSupplementEl,
            current.answer,
            current.seconds,
            current.model,
            runtimeResponses.length > 1
                ? {
                    index: runtimeIndex,
                    total: runtimeResponses.length,
                    onPrev: () => {
                      runtimeIndex = (runtimeIndex - 1 + runtimeResponses.length) % runtimeResponses.length;
                      renderCurrentRuntimeResponse({ swipe: "prev", userSelection: true });
                    },
                    onNext: () => {
                      runtimeIndex = (runtimeIndex + 1) % runtimeResponses.length;
                      renderCurrentRuntimeResponse({ swipe: "next", userSelection: true });
                    },
                    onDelete: canDeleteCurrent ? removeRuntimeResponse : null
                  }
              : (canDeleteCurrent ? { onDelete: removeRuntimeResponse } : null),
            inlineStatus,
            current?.isPublicShared ? "public" : ""
          );
          if (!state.pendingCursorSignature) writeAiResponseCursor(item.id, runtimeResponses, runtimeIndex);
          if (swipe) animateAiSupplementSwipe(aiSupplementEl, swipe);
        };
        state.renderCurrentRuntimeResponse = renderCurrentRuntimeResponse;
        state.restoreRuntimeResponseCursor = () => {
          const signature = state.pendingCursorSignature || readAiResponseCursor(item.id)?.signature;
          const selectedIndex = signature
            ? runtimeResponses.findIndex(resp =>
                aiSignature(item.id, resp.answerType, resp.model, resp.answer) === signature)
            : -1;
          if (selectedIndex >= 0) {
            runtimeIndex = selectedIndex;
            state.pendingCursorSignature = "";
          } else {
            runtimeIndex = Math.max(0, Math.min(runtimeIndex, runtimeResponses.length - 1));
          }
          writeLocalAiResponses(item.id, runtimeResponses);
          renderCurrentRuntimeResponse();
        };
        state.setInlineStatus = (text) => {
          inlineStatus = text || "";
          if (runtimeResponses.length) renderCurrentRuntimeResponse();
        };

        const pushRuntimeResponse = (resp, options = {}) => {
          const { focus = false, swipe = null, delayedFocusMs = 0 } = options;
          runtimeResponses.push(resp);
          runtimeResponses.sort((a, b) => a.arrivedAt - b.arrivedAt);
          const targetIndex = Math.max(
            0,
            runtimeResponses.findIndex(
              x => x.arrivedAt === resp.arrivedAt && x.answer === resp.answer && x.model === resp.model
            )
          );
          if (runtimeResponses.length === 1) {
            runtimeIndex = 0;
          } else if (focus) {
            runtimeIndex = targetIndex;
          }
          renderCurrentRuntimeResponse({ swipe, userSelection: focus });
          if (delayedFocusMs > 0 && !focus) {
            setTimeout(() => {
              if (!runtimeResponses.length) return;
              const idx = runtimeResponses.findIndex(
                x => x.arrivedAt === resp.arrivedAt && x.answer === resp.answer && x.model === resp.model
              );
              if (idx < 0 || runtimeIndex === idx) return;
              runtimeIndex = idx;
              renderCurrentRuntimeResponse({ swipe: "next", userSelection: true });
            }, delayedFocusMs);
          }
          syncLocalSupplementCache();
        };
        state.pushRuntimeResponse = pushRuntimeResponse;

        aiAppendBtn.addEventListener("click", async () => {
          trackQuestionsGoal({
            action: "ai_append_request",
            question_id: item.id,
            category: cat.category,
            question_title: shortenText(item.title)
          });
          aiAppendBtn.disabled = true;
          showHeaderAiNotchProcessing(item.id, { fromPrimaryAiAppend: true });
          const canContinue = await ensureAuthForAiAction();
          if (!canContinue) {
            hideHeaderAiNotch();
            aiAppendBtn.disabled = false;
            return;
          }
          const preferredModel = getPreferredModel(currentModels);
          const hasExistingResponses = Array.isArray(runtimeResponses) && runtimeResponses.length > 0;
          const supplementTimer = null;
          const executeRequest = async () => {
            const startedAt = Date.now();
            let hasFocusedGeneratedResponse = false;
            const nextAppendPushOptions = () => {
              if (hasFocusedGeneratedResponse) return {};
              hasFocusedGeneratedResponse = true;
              return hasExistingResponses ? { focus: true, swipe: "next" } : {};
            };
            const promptWithCategory = `Тема: ${cat.category}. Вопрос: ${item.title}`;
            const result = await requestWithFallback(
              promptWithCategory,
              preferredModel,
              () => {},
              (extraResult) => {
                const extraSeconds = Math.max(1, Math.round((Number(extraResult.elapsedMs) || 0) / 1000));
                const response = {
                  answer: extraResult.answer,
                  model: extraResult.model,
                  seconds: extraSeconds,
                  arrivedAt: extraResult.arrivedAt,
                  answerType: "append"
                };
                pushRuntimeResponse(response, nextAppendPushOptions());
                saveAiAnswerCloud(item.id, "append", response).then((id) => {
                  if (id) {
                    response.cloudId = id;
                    if (response.__deleteRequested) deleteAiAnswerCloud(id);
                  }
                });
              }
            );
            stopLoaderPhases(supplementTimer);
            const seconds = Math.max(1, Math.round((Number(result.elapsedMs) || (Date.now() - startedAt)) / 1000));
            const response = {
              answer: result.answer,
              model: result.model,
              seconds,
              arrivedAt: result.arrivedAt || Date.now(),
              answerType: "append"
            };
            pushRuntimeResponse(response, nextAppendPushOptions());
            showHeaderAiNotchReady(item.id);
            saveAiAnswerCloud(item.id, "append", response).then((id) => {
              if (id) {
                response.cloudId = id;
                if (response.__deleteRequested) deleteAiAnswerCloud(id);
              }
            });
            try {
              saveAiSupplementWithLimit(
                supplementKey,
                { text: result.answer, seconds, model: result.model }
              );
            } catch (storageError) {
              console.warn("Failed to persist AI supplement in localStorage", storageError);
            }
          };
          try {
            await executeRequest();
          } catch (e) {
            if (isRecoverableApiKeyError(e) || isAllModelsCreditsExhaustedError(e) || String(e?.message || "").includes("INVALID_API_KEY")) {
              pendingRetry = executeRequest;
              return;
            }
            failHeaderAiNotchRequest();
            renderAiSupplement(
              aiSupplementEl,
              e?.code === "AI_RATE_LIMITED" ? "Лимит Groq временно достигнут. Попробуйте позже." : isAiRegionAvailabilityError(e) ? getAiRegionUnavailableMessage() : "Не удалось получить ответ от моделей. Попробуйте позже."
            );
          } finally {
            aiAppendBtn.disabled = false;
          }
        });
        if (runtimeResponses.length) {
          renderCurrentRuntimeResponse();
        }
      }

      section.appendChild(clone);
    });
  });
  questionsUiRendered = true;
  applyPublicAppendAnswersToVisibleUi();

  const initialSelectedFilter = localStorage.getItem("selectedFilter") || "Все";
  if (initialSelectedFilter !== "Все") {
    const selectedKey = normalizeCategoryKey(initialSelectedFilter);
    document.querySelectorAll("#accordion-container .article").forEach(section => {
      const sectionKey = section.dataset.categoryKey || normalizeCategoryKey(section.querySelector(".category-title")?.textContent || "");
      section.style.display = sectionKey === selectedKey ? "" : "none";
    });
  }
  if (typeof window.__questionsApplyActiveFilter === "function") {
    window.__questionsApplyActiveFilter();
  }
  if (isMapEmbed) {
    const initialId = pendingMapQuestionId || new URLSearchParams(window.location.search).get("id");
    if (initialId) window.QAtoDevMapEmbed.showQuestion(initialId);
    window.dispatchEvent(new Event("qatodev:map-embed-ready"));
  }

  if (authUser) {
    syncLocalAndCloudState({ force: false, source: "post-render" }).catch((e) => {
      console.warn("Post-render cloud sync failed", e);
    });
  }

  // --- Поиск/фильтрация ---
  let searchMetricsTimer = null;
  const normalizeQuestionsSearchText = (value) => String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9+#]+/gi, " ")
    .trim();

  searchInput.addEventListener("input", () => {
    const term = normalizeQuestionsSearchText(searchInput.value);
    const terms = term.split(/\s+/).filter(Boolean);
    const requireEveryTerm = terms.length <= 2;
    const has  = term.length > 0;
    document.querySelectorAll("#accordion-container .t-item").forEach(item => {
      const section = item.closest(".article");
      const searchableText = normalizeQuestionsSearchText([
        item.querySelector(".t849__title")?.textContent,
        item.querySelector(".t849__text")?.textContent,
        section?.querySelector(".category-title")?.textContent,
        item.dataset.tags,
        item.dataset.category
      ].filter(Boolean).join(" "));
      const match = !has || (requireEveryTerm
        ? terms.every(searchTerm => searchableText.includes(searchTerm))
        : terms.some(searchTerm => searchableText.includes(searchTerm)));
      item.style.display = match ? "" : "none";
    });
    document.querySelectorAll("#accordion-container .article").forEach(section => {
      const items      = section.querySelectorAll(".t-item");
      const anyVisible = Array.from(items).some(i => i.style.display !== "none");
      section.style.display = anyVisible ? "" : "none";
      const icon = section.querySelector(".category-icon");
      if (icon) icon.style.display = (has && anyVisible) ? "none" : "";
    });
    clearBtn.style.display     = has ? "inline-block" : "none";
    resultsTitle.style.display = has ? "block"       : "none";
    about.style.display        = has ? "none"        : "";

    if (window.__questionsFilterMode === "companies" && typeof window.__questionsApplyCompanyFilter === "function") {
      window.__questionsApplyCompanyFilter({ preserveSearch: has });
    } else if (!has) {
      const selectedFilter = localStorage.getItem("selectedFilter") || "Все";
      if (selectedFilter !== "Все") {
        const selectedKey = normalizeCategoryKey(selectedFilter);
        document.querySelectorAll("#accordion-container .article").forEach(section => {
          const sectionKey = section.dataset.categoryKey || normalizeCategoryKey(section.querySelector(".category-title")?.textContent || "");
          section.style.display = sectionKey === selectedKey ? "" : "none";
        });
      }
    }

    if (searchMetricsTimer) {
      clearTimeout(searchMetricsTimer);
    }
    searchMetricsTimer = setTimeout(() => {
      trackQuestionsGoal({
        action: term ? "search" : "search_clear",
        term_length: term.length
      });
    }, 500);
  });

  if (initialQuestionsSearchQuery) {
    searchInput.value = initialQuestionsSearchQuery;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
    searchInput.focus();
  });

  const restoreScrollPosition = () => {
    const targetY = Number.isFinite(authReturnScrollY) && authReturnScrollY !== null
      ? authReturnScrollY
      : savedScrollY;
    if (!targetY || Number.isNaN(targetY)) return;
    window.scrollTo(0, targetY);
  };
  restoreScrollPosition();
  requestAnimationFrame(restoreScrollPosition);
  setTimeout(restoreScrollPosition, 120);

    modelDiscoveryPromise = loadModels();
    modelDiscoveryPromise.then(restoreScrollPosition);
    });  // — конец DOMContentLoaded

// --- Theme toggle ---
(function() {
  const root = document.documentElement;
  const btn  = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-theme', saved);
    btn.classList.toggle('active', saved === 'dark');
  }
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.classList.toggle('active', next === 'dark');
  });
})();

/**
 * @param {string} category
 * @param {number} studiedCount
 * @param {number} unclearCount
 * @param {number} total
 */
function updateProgress(category, studiedCount, unclearCount, total) {
  const pctStudied = (studiedCount / total) * 100;
  const pctUnclear = (unclearCount  / total) * 100;
  const blueBar   = document.querySelector(`.progress-bar[data-category="${category}"]`);
  const orangeBar = document.querySelector(`.progress-bar-unclear[data-category="${category}"]`);
  const text      = document.querySelector(`.progress-text[data-category="${category}"]`);
  if (unclearCount > 0) {
    blueBar.classList.add('split');
    blueBar.classList.remove('full');
  } else {
    blueBar.classList.add('full');
    blueBar.classList.remove('split');
  }
  blueBar.style.width   = pctStudied + '%';
  orangeBar.style.left  = pctStudied + '%';
  orangeBar.style.width = pctUnclear + '%';
  text.textContent      = Math.round((studiedCount / total) * 100) + '%';
}

// ======== Фильтрация по категориям ========
document.addEventListener('DOMContentLoaded', () => {
  if (new URLSearchParams(window.location.search).get('map_embed') === '1') return;
  // Ждем полной загрузки DOM перед работой с фильтрами
  function normalizeCategoryKeyLocal(category) {
    const value = String(category || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (!value || value === "ВСЕ") return "ALL";
    if (value === "БД" || value === "БАЗЫ ДАННЫХ") return "БАЗЫ ДАННЫХ";
    if (value === "GIT" || value === "GIT + IDE" || value === "GIT + IDE + SELENIUM") return "GIT";
    if (value === "ТЕОРИЯ") return "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ";
    return value;
  }

  const categoryFilters = document.getElementById('category-filters');
  const categoryFiltersBottom = document.getElementById('category-filters-bottom');
  const companyFilters = document.getElementById('company-filters');
  const filterModeToggle = document.getElementById('filter-mode-toggle');
  const filterModeSwitcher = document.querySelector('.filter-mode-switcher');
  const searchInputEl = document.getElementById('search-input');
  if (!categoryFilters) return;
  const filterChips = categoryFilters.querySelectorAll('.filter-chip');
  const companyChips = companyFilters ? [...companyFilters.querySelectorAll('.company-chip')] : [];
  const bottomChips = [];
  const FILTER_MODE_KEY = 'questionsFilterMode';
  const SELECTED_COMPANY_KEY = 'selectedCompanyFilter';
  const filterMetrics = window.QAtoDevMetrics || null;
  function trackFilterGoal(params) {
    filterMetrics?.reachGoal?.("questions_interaction", params);
  }
  const COMPANIES = {
    yandex: [
      'accordion_theory_q4', 'accordion_theory_q21', 'accordion_theory_q22',
      'accordion_theory_q25', 'accordion_theory_q29', 'accordion_theory_q30',
      'accordion_theory_q40',
      'accordion_web_q3', 'accordion_web_q5', 'accordion_web_q11',
      'accordion_web_q14', 'accordion_web_q15', 'accordion_web_q16',
      'accordion_web_q24',
      'accordion_api_q1', 'accordion_api_q6', 'accordion_api_q7',
      'accordion_api_q9', 'accordion_api_q10', 'accordion_api_q12',
      'accordion_api_q23',
      'accordion_db_q4', 'accordion_db_q5', 'accordion_db_q8',
      'accordion_db_q10', 'accordion_db_q15'
    ],
    sber: [
      'accordion_theory_q16', 'accordion_theory_q18', 'accordion_theory_q24',
      'accordion_theory_q27', 'accordion_theory_q32', 'accordion_theory_q33',
      'accordion_theory_q35',
      'accordion_web_q6', 'accordion_web_q9', 'accordion_web_q10',
      'accordion_web_q12', 'accordion_web_q18',
      'accordion_api_q7', 'accordion_api_q11', 'accordion_api_q12',
      'accordion_api_q14', 'accordion_api_q16', 'accordion_api_q23',
      'accordion_db_q1', 'accordion_db_q4', 'accordion_db_q5',
      'accordion_db_q8', 'accordion_db_q10', 'accordion_db_q14',
      'accordion_db_q15', 'accordion_db_q17',
      'accordion_devops_q1', 'accordion_devops_q2', 'accordion_devops_q3',
      'accordion_devops_q5', 'accordion_devops_q6'
    ],
    ozon: [
      'accordion_theory_q19', 'accordion_theory_q20', 'accordion_theory_q22',
      'accordion_theory_q24', 'accordion_theory_q31', 'accordion_theory_q35',
      'accordion_theory_q39',
      'accordion_web_q6', 'accordion_web_q10', 'accordion_web_q16',
      'accordion_web_q18', 'accordion_web_q20', 'accordion_web_q23',
      'accordion_api_q3', 'accordion_api_q5', 'accordion_api_q9',
      'accordion_api_q11', 'accordion_api_q14', 'accordion_api_q16',
      'accordion_api_q23',
      'accordion_db_q5', 'accordion_db_q8', 'accordion_db_q10',
      'accordion_db_q12', 'accordion_db_q16',
      'accordion_devops_q1', 'accordion_devops_q2', 'accordion_devops_q3',
      'accordion_devops_q5', 'accordion_devops_q6'
    ],
    avito: [
      'accordion_theory_q4', 'accordion_theory_q5', 'accordion_theory_q21',
      'accordion_theory_q25', 'accordion_theory_q29', 'accordion_theory_q30',
      'accordion_theory_q40',
      'accordion_web_q4', 'accordion_web_q11', 'accordion_web_q14',
      'accordion_web_q15', 'accordion_web_q21', 'accordion_web_q22',
      'accordion_web_q23', 'accordion_web_q24',
      'accordion_api_q1', 'accordion_api_q7', 'accordion_api_q8',
      'accordion_api_q13', 'accordion_api_q22',
      'accordion_db_q4', 'accordion_db_q5', 'accordion_db_q8',
      'accordion_db_q10', 'accordion_db_q15'
    ],
    tbank: [
      'accordion_theory_q16', 'accordion_theory_q20', 'accordion_theory_q24',
      'accordion_theory_q27', 'accordion_theory_q33', 'accordion_theory_q36',
      'accordion_theory_q39', 'accordion_theory_q52',
      'accordion_web_q7', 'accordion_web_q10', 'accordion_web_q12',
      'accordion_web_q18', 'accordion_web_q20',
      'accordion_api_q2', 'accordion_api_q3', 'accordion_api_q7',
      'accordion_api_q11', 'accordion_api_q12', 'accordion_api_q16',
      'accordion_api_q22', 'accordion_api_q23',
      'accordion_db_q2', 'accordion_db_q3', 'accordion_db_q4',
      'accordion_db_q5', 'accordion_db_q7', 'accordion_db_q8',
      'accordion_db_q11', 'accordion_db_q12', 'accordion_db_q14',
      'accordion_db_q15', 'accordion_db_q17',
      'accordion_devops_q1', 'accordion_devops_q2', 'accordion_devops_q3',
      'accordion_devops_q5', 'accordion_devops_q6',
      'accordion_aqajava_q7', 'accordion_aqajava_q19',
      'accordion_aqajava_q23', 'accordion_aqajava_q25',
      'accordion_aqajava_q27'
    ],
    vk: [
      'accordion_theory_q16', 'accordion_theory_q19', 'accordion_theory_q31',
      'accordion_theory_q40', 'accordion_theory_q41',
      'accordion_web_q1', 'accordion_web_q2', 'accordion_web_q5',
      'accordion_web_q11', 'accordion_web_q12', 'accordion_web_q14',
      'accordion_web_q15', 'accordion_web_q16', 'accordion_web_q19',
      'accordion_web_q20', 'accordion_web_q21', 'accordion_web_q22',
      'accordion_web_q24',
      'accordion_api_q7', 'accordion_api_q10', 'accordion_api_q11',
      'accordion_api_q12', 'accordion_api_q13', 'accordion_api_q23',
      'accordion_db_q4', 'accordion_db_q5', 'accordion_db_q8',
      'accordion_db_q10', 'accordion_db_q15',
      'accordion_aqajs_q6', 'accordion_aqajs_q7', 'accordion_aqajs_q8',
      'accordion_aqajs_q9', 'accordion_aqajs_q11'
    ],
    wildberries: [
      'accordion_theory_q5', 'accordion_theory_q18', 'accordion_theory_q21',
      'accordion_theory_q24', 'accordion_theory_q29', 'accordion_theory_q31',
      'accordion_theory_q32', 'accordion_theory_q35', 'accordion_theory_q53',
      'accordion_web_q6', 'accordion_web_q8', 'accordion_web_q9',
      'accordion_web_q10', 'accordion_web_q12',
      'accordion_api_q6', 'accordion_api_q7', 'accordion_api_q10',
      'accordion_api_q11', 'accordion_api_q13', 'accordion_api_q16',
      'accordion_db_q4', 'accordion_db_q5', 'accordion_db_q8',
      'accordion_db_q9', 'accordion_db_q10', 'accordion_db_q16',
      'accordion_devops_q1', 'accordion_devops_q2', 'accordion_devops_q3',
      'accordion_devops_q5', 'accordion_devops_q6'
    ]
  };
  let currentFilterMode = localStorage.getItem(FILTER_MODE_KEY) === 'companies' ? 'companies' : 'categories';
  let selectedCompany = COMPANIES[localStorage.getItem(SELECTED_COMPANY_KEY)] ? localStorage.getItem(SELECTED_COMPANY_KEY) : 'yandex';
  window.__questionsFilterMode = currentFilterMode;

  // Клонируем чипы в нижнюю панель
  if (categoryFiltersBottom) {
    filterChips.forEach(chip => {
      if (chip.dataset.category === 'Все') return;
      const clone = chip.cloneNode(true);
      if (clone.dataset.category === 'БАЗЫ ДАННЫХ') {
        clone.textContent = 'БД';
      }
      if (clone.dataset.category === 'GIT + IDE + SELENIUM') {
        clone.textContent = 'GIT';
      }
      categoryFiltersBottom.appendChild(clone);
      bottomChips.push(clone);
    });
  }

  const allChips = [...filterChips, ...bottomChips];

  function applyCategoryFilter(category) {
    const sections = document.querySelectorAll('#accordion-container .article');
    const wanted = normalizeCategoryKeyLocal(category);

    document.body.classList.remove('questions-companies-mode');
    sections.forEach(section => {
      section.querySelectorAll('.t-item').forEach(item => {
        item.style.display = '';
      });
      const sectionTitle = section.querySelector('.category-title')?.textContent || "";
      const sectionKey = section.dataset.categoryKey || normalizeCategoryKeyLocal(sectionTitle);
      section.style.display = (wanted === "ALL" || sectionKey === wanted) ? '' : 'none';
    });
  }

  function getQuestionIdFromItem(item) {
    return item.querySelector('.t849__content')?.id || '';
  }

  function setActiveCompany(companyKey) {
    selectedCompany = COMPANIES[companyKey] ? companyKey : 'yandex';
    localStorage.setItem(SELECTED_COMPANY_KEY, selectedCompany);
    companyChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.company === selectedCompany);
    });
  }

  function applyCompanyFilter(options = {}) {
    const { preserveSearch = false } = options;
    const ids = new Set(COMPANIES[selectedCompany] || []);
    const sections = document.querySelectorAll('#accordion-container .article');

    document.body.classList.add('questions-companies-mode');
    sections.forEach(section => {
      let anyVisible = false;
      section.querySelectorAll('.t-item').forEach(item => {
        const matchesCompany = ids.has(getQuestionIdFromItem(item));
        const matchesSearch = !preserveSearch || item.style.display !== 'none';
        const visible = matchesCompany && matchesSearch;
        item.style.display = visible ? '' : 'none';
        if (visible) anyVisible = true;
      });
      section.style.display = anyVisible ? '' : 'none';
    });
  }

  window.__questionsApplyCompanyFilter = applyCompanyFilter;
  window.__questionsApplyActiveFilter = () => {
    if (currentFilterMode === 'companies') {
      applyCompanyFilter();
      return;
    }
    applyCategoryFilter(localStorage.getItem('selectedFilter') || 'Все');
  };

  function scrollToCategory(category) {
    const sections = document.querySelectorAll('#accordion-container .article');
    const wanted = normalizeCategoryKeyLocal(category);
    const targetSection = wanted === "ALL"
      ? sections[0]
      : [...sections].find(section => {
          const sectionTitle = section.querySelector('.category-title')?.textContent || "";
          const sectionKey = section.dataset.categoryKey || normalizeCategoryKeyLocal(sectionTitle);
          return sectionKey === wanted;
        });
    if (targetSection) {
      const headerOffset = 120;
      const rect = targetSection.getBoundingClientRect();
      const top = window.pageYOffset + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  function setActive(category) {
    const wanted = normalizeCategoryKeyLocal(category);
    allChips.forEach(c => {
      c.classList.toggle('active', normalizeCategoryKeyLocal(c.dataset.category) === wanted);
    });
    if (categoryFiltersBottom) {
      const activeBottom = [...categoryFiltersBottom.querySelectorAll(".filter-chip")]
        .find(chip => normalizeCategoryKeyLocal(chip.dataset.category) === wanted);
      if (activeBottom) {
        const container = categoryFiltersBottom;
        const chipRect = activeBottom.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const current = container.scrollLeft;
        const target = current + (chipRect.left - contRect.left) - (contRect.width / 2) + (chipRect.width / 2);
        container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      }
    }
  }

  function clearSearchInput() {
    if (!searchInputEl || !searchInputEl.value) return;
    searchInputEl.value = '';
    searchInputEl.dispatchEvent(new Event('input'));
  }

  function updateBottomVisibility() {
    if (!categoryFiltersBottom || !categoryFilters) return;
    if (currentFilterMode === 'companies') {
      categoryFiltersBottom.classList.remove('visible');
      return;
    }
    const headerOffset = 120;
    const rect = categoryFilters.getBoundingClientRect();
    const fullyVisible =
      rect.top >= headerOffset &&
      rect.bottom <= window.innerHeight;
    categoryFiltersBottom.classList.toggle('visible', !fullyVisible);
  }

  function setFilterMode(mode, options = {}) {
    const animate = options.animate !== false;
    if (!animate) {
      document.body.classList.add('filters-no-transition');
    }
    currentFilterMode = mode === 'companies' ? 'companies' : 'categories';
    window.__questionsFilterMode = currentFilterMode;
    localStorage.setItem(FILTER_MODE_KEY, currentFilterMode);

    const isCompanies = currentFilterMode === 'companies';
    filterModeToggle?.setAttribute('aria-checked', isCompanies ? 'true' : 'false');
    filterModeSwitcher?.classList.toggle('is-companies', isCompanies);
    categoryFilters.classList.toggle('is-hidden', isCompanies);
    categoryFilters.setAttribute('aria-hidden', isCompanies ? 'true' : 'false');
    companyFilters?.classList.toggle('is-hidden', !isCompanies);
    companyFilters?.setAttribute('aria-hidden', isCompanies ? 'false' : 'true');

    if (!options.preserveSearch) clearSearchInput();
    if (isCompanies) {
      setActiveCompany(selectedCompany);
      applyCompanyFilter();
      categoryFiltersBottom?.classList.remove('visible');
    } else {
      document.body.classList.remove('questions-companies-mode');
      restoreFilterState();
    }
    updateBottomVisibility();
    if (!animate) {
      requestAnimationFrame(() => {
        document.body.classList.remove('filters-no-transition');
      });
    }
  }

  categoryFilters.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    trackFilterGoal({
      action: 'category_filter',
      category: chip.dataset.category || ''
    });
  });

  categoryFiltersBottom?.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    trackFilterGoal({
      action: 'category_filter',
      category: chip.dataset.category || '',
      placement: 'bottom'
    });
  });

  // Восстановление состояния после полной загрузки
  function restoreFilterState() {
    const savedFilter = localStorage.getItem('selectedFilter');
    const activeChip = [...filterChips].find(
      chip => normalizeCategoryKeyLocal(chip.dataset.category) === normalizeCategoryKeyLocal(savedFilter)
    );

    if (activeChip) {
      applyCategoryFilter(savedFilter);
      setActive(savedFilter);
      if (categoryFiltersBottom) {
        setTimeout(() => setActive(savedFilter), 0);
        setTimeout(() => setActive(savedFilter), 50);
        setTimeout(() => setActive(savedFilter), 150);
      }
    } else {
      // По умолчанию активируем "Все"
      setActive('Все');
      localStorage.setItem('selectedFilter', 'Все');
      applyCategoryFilter('Все');
    }
  }

  // Обработчики для чипов
  allChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (currentFilterMode !== 'categories') return;
      setActive(chip.dataset.category);

      const category = chip.dataset.category;
      localStorage.setItem('selectedFilter', category);

      // Очищаем поиск
      if (searchInputEl) {
        searchInputEl.value = '';
        searchInputEl.dispatchEvent(new Event('input'));
      }
      applyCategoryFilter(category);
      scrollToCategory(category);
    });
  });

  filterModeToggle?.addEventListener('click', () => {
    setFilterMode(currentFilterMode === 'companies' ? 'categories' : 'companies');
  });

  companyFilters?.addEventListener('click', (event) => {
    const chip = event.target.closest('.company-chip');
    if (!chip || currentFilterMode !== 'companies') return;
    setActiveCompany(chip.dataset.company);
    trackFilterGoal({
      action: 'company_filter',
      company: chip.dataset.company || ''
    });
    clearSearchInput();
    applyCompanyFilter();
    window.scrollTo({ top: Math.max(0, categoryFilters.getBoundingClientRect().bottom + window.pageYOffset - 90), behavior: 'smooth' });
  });

  setActiveCompany(selectedCompany);
  restoreFilterState();
  setFilterMode(currentFilterMode, {
    animate: false,
    preserveSearch: Boolean(new URLSearchParams(window.location.search).get('q'))
  });

  // Показ нижней панели: скрываем только когда верхние чипы реально видны пользователю
  if (categoryFiltersBottom && categoryFilters) {
    window.addEventListener('scroll', updateBottomVisibility, { passive: true });
    window.addEventListener('resize', updateBottomVisibility);
    updateBottomVisibility();
  }
});
