document.addEventListener('DOMContentLoaded', async () => {
  const SCROLL_POS_KEY = "questions_scroll_y_v1";
  const AUTH_RETURN_SCROLL_KEY = "questions_auth_return_scroll_v1";
  const savedScrollY = Number(sessionStorage.getItem(SCROLL_POS_KEY) || 0);
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
  const authReturnScrollY = consumeAuthReturnScrollPosition();
  window.addEventListener("scroll", () => {
    sessionStorage.setItem(SCROLL_POS_KEY, String(window.scrollY || 0));
  }, { passive: true });
  window.addEventListener("beforeunload", () => {
    sessionStorage.setItem(SCROLL_POS_KEY, String(window.scrollY || 0));
  });

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
const warmupUserPrompt = "Тема: API. Вопрос: Что такое REST API и как тестировать его на собеседовании QA?";
  let runtimeQuestionsData = [];
  window.questionsData = runtimeQuestionsData; // активный источник для рендера


  const IO_API_BASE = "https://api.intelligence.io.solutions/api/v1";
  const IO_API_KEY = (() => {
    const p1 = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.";
    const p2 = "eyJvd25lciI6IjVhNzhhY2I4LTJkZmUtNGRiNi04N2QxLTkxODZmNTFmZDllZSIsImV4cCI6NDkyNDc3MTU3OH0.";
    const p3 = "EMXKUEfcMvAbtMt_WodTcNcENyqOXwfuF16wtC4-8i2sJgak6KJODACg3c3tyzwjbacXC1XHUu3jS9E4C14VLw";
    return p1 + p2 + p3;
  })();
  const OVERRIDE_API_KEY_STORAGE = "io_api_key_override";
  const SUPABASE_URL_DIRECT = "https://mbebpfbmnojlaggdroum.supabase.co";
  const SUPABASE_ANON_KEY_DIRECT = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
  const DEFAULT_MODEL = "openai/gpt-oss-20b";
  const FAST_MODEL_HINTS = [
    "openai/gpt-oss-20b",
    "mistralai/Mistral-Nemo-Instruct-2407",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "moonshotai/Kimi-K2-Instruct-0905",
    "deepseek-ai/DeepSeek-V3.2"
  ];
  const AI_LOADER_HTML = '<span class="ai-loader"><span class="ai-spinner"></span><span class="ai-loader-text">Сейчас модель вернет ответ</span></span>';
  let currentModels = FAST_MODEL_HINTS.slice(0, 5);
  const MODEL_TIMINGS_KEY = "model_timings_v1";
  const MODEL_FAILURES_KEY = "model_failures_v1";
  const MODEL_WARMUP_KEY = "model_warmup_ts_v1";
  const MODEL_LIST_CACHE_KEY = "model_list_cache_v1";
  const MODEL_CHAT_VALIDATED_CACHE_KEY = "model_chat_validated_cache_v1";
  const MODEL_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const MODEL_SLOW_RESPONSE_MS = 30 * 1000;
  const MODEL_RUNTIME_REBALANCE_COOLDOWN_MS = 2 * 60 * 1000;
  const QUESTIONS_CACHE_KEY = "questions_db_cache_v1";
  const QUESTIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const QUESTIONS_REPO_JSON_PATH = "over/questions_db_snapshot.json";
  const PUBLIC_AI_APPEND_REPO_JSON_PATH = "over/public_ai_append_snapshot.json";
  const QUESTIONS_REST_TIMEOUT_MS = 45 * 1000;
  const QUESTIONS_LOAD_USE_SDK = false;
  const PUBLIC_AI_APPEND_CACHE_KEY = "public_ai_append_cache_v1";
  const PUBLIC_AI_APPEND_CACHE_TTL_MS = 10 * 60 * 1000;
  const AI_SUPPLEMENT_META_KEY = "ai_supplement_meta_v1";
  const AI_RESPONSES_LOCAL_PREFIX = "ai_responses_";
  const AI_RESPONSE_CURSOR_PREFIX = "ai_response_cursor_";
  const AI_GUEST_AUTH_BYPASS_KEY = "ai_guest_auth_bypass_v1";
  const AI_NOTCH_FIRST_APPEND_HINT_DONE_KEY = "ai_notch_first_append_hint_done_v1";
  const AI_SUPPLEMENT_MAX = 4;
  let modelListFromCache = false;
  let modelPreflightPromise = null;
  let modelRuntimeRebalancePromise = null;
  let modelLastRuntimeRebalanceTs = 0;
  let pendingRetry = null;
  let lastAuthDrivenSyncTs = 0;
  let lastAuthDrivenSyncUserId = "";

  // --- UI elements: поиск, AI, переключатель модели ---
  const searchInput    = document.getElementById("search-input");
  const modelsListEl   = document.getElementById("ai-models-list");
  const clearBtn       = document.getElementById("search-clear-btn");
  const resultsTitle   = document.getElementById("search-results-title");
  const about          = document.getElementById("about");
  const questionsLoadStatusEl = document.getElementById("questions-load-status");
  const apiKeyModal    = document.getElementById("api-key-modal");
  const apiKeyInput    = document.getElementById("api-key-input");
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
  const authLevelWrap  = document.getElementById("auth-level-wrap");
  const authTrackSelect = document.getElementById("auth-track-select");
  const authGradeSelect = document.getElementById("auth-grade-select");
  const authOAuthRow    = document.getElementById("auth-oauth-row");
  const authGoogleBtn   = document.getElementById("auth-google-btn");
  const authEmailToggle = document.getElementById("auth-email-toggle");
  const authEmailInput = document.getElementById("auth-email-input");
  const authSyncBtn    = document.getElementById("auth-sync-btn");
  const authSendBtn    = document.getElementById("auth-send-btn");
  const authCloseBtn   = document.getElementById("auth-close-btn");
  const authStatus     = document.getElementById("auth-status");
  const supabaseStore  = window.AppSupabase || null;
  let authUser = null;
  let authProfile = null;
  let authEmailLoginExpanded = false;
  let allowGuestAiRequests = readGuestAiAuthBypassFlag();
  let authModalAiGateActive = false;
  const AUTH_PENDING_PROFILE_KEY = "auth_pending_profile_v1";
  const CLOUD_SYNC_TS_KEY = "cloud_sync_ts_v1";
  const PENDING_MUTATIONS_KEY = "cloud_pending_mutations_v1";
  const CLOUD_SYNC_TTL_MS = 60 * 1000;
  const AUTH_SESSION_CHECK_TTL_MS = 5 * 60 * 1000;
  const CLOUD_OP_TIMEOUT_MS = 10000;
  const REST_TIMEOUT_MS = 7000;
  const cloudProgressByQuestion = new Map();
  const cloudAnswersByQuestion = new Map();
  const publicAppendAnswersByQuestion = new Map();
  const aiItemState = new Map();
  let questionsUiRendered = false;
  let questionsLoadFallbackTimer = null;
  let cloudSyncPromise = null;
  let authLastSessionCheckTs = 0;
  let authRefreshInFlight = null;
  let authCardMorphToken = 0;
  let headerAiNotchHideTimer = null;
  let headerAiNotchActiveQuestionId = "";
  let headerAiNotchPendingCount = 0;

  function setAuthSessionCheckedNow() {
    authLastSessionCheckTs = Date.now();
  }

  function isAuthSessionCheckFresh() {
    return (Date.now() - authLastSessionCheckTs) < AUTH_SESSION_CHECK_TTL_MS;
  }

  function setAuthSyncButtonBusy(isBusy) {
    if (!authSyncBtn) return;
    authSyncBtn.classList.toggle("is-busy", !!isBusy);
    authSyncBtn.disabled = !!isBusy;
  }

  function flashAuthSyncButtonSuccess() {
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

  function readModelListCache() {
    try {
      const raw = localStorage.getItem(MODEL_LIST_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.models) || !parsed.ts) return null;
      if ((Date.now() - parsed.ts) > MODEL_LIST_CACHE_TTL_MS) return null;
      return parsed.models;
    } catch {
      return null;
    }
  }

  function readValidatedChatModelsCache() {
    try {
      const raw = localStorage.getItem(MODEL_CHAT_VALIDATED_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.models) || !parsed.ts) return null;
      if ((Date.now() - parsed.ts) > MODEL_LIST_CACHE_TTL_MS) return null;
      return parsed.models.filter(Boolean);
    } catch {
      return null;
    }
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

  function writeModelListCache(models) {
    try {
      safeSetItemWithAiEviction(MODEL_LIST_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        models
      }));
    } catch {}
  }

  function writeValidatedChatModelsCache(models) {
    try {
      safeSetItemWithAiEviction(MODEL_CHAT_VALIDATED_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        models: (Array.isArray(models) ? models : []).filter(Boolean).slice(0, 5)
      }));
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
    const override = localStorage.getItem(OVERRIDE_API_KEY_STORAGE);
    return (override && override.trim()) ? override.trim() : IO_API_KEY;
  }

  function showApiKeyModal() {
    if (!apiKeyModal) return;
    apiKeyModal.classList.add("show");
    apiKeyModal.setAttribute("aria-hidden", "false");
    if (apiKeyInput) {
      apiKeyInput.value = localStorage.getItem(OVERRIDE_API_KEY_STORAGE) || "";
      apiKeyInput.focus();
    }
  }

  function hideApiKeyModal() {
    if (!apiKeyModal) return;
    apiKeyModal.classList.remove("show");
    apiKeyModal.setAttribute("aria-hidden", "true");
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

  function setEmailLoginExpanded(next) {
    authEmailLoginExpanded = !!next;
    if (authModal) authModal.classList.toggle("auth-email-expanded", authEmailLoginExpanded);
    if (authEmailToggle) authEmailToggle.setAttribute("aria-expanded", authEmailLoginExpanded ? "true" : "false");
  }

  function syncProfileUiFromState() {
    if (authTrackSelect && authProfile?.track) authTrackSelect.value = authProfile.track;
    if (authGradeSelect && authProfile?.grade) authGradeSelect.value = authProfile.grade;
    if (!authTitle) return;
    const fallbackPending = !authProfile ? readPendingProfile() : null;
    const label = profileLabel(authProfile) || profileLabel(fallbackPending);
    authTitle.textContent = label || "Сохранение прогресса";
  }

  async function applyPendingProfileToCloud() {
    if (!authUser || !supabaseStore?.upsertUserProfile) return false;
    const pending = readPendingProfile();
    if (!pending?.track || !pending?.grade) return false;
    const payload = {
      user_id: authUser.id,
      email: authUser.email || pending.email || null,
      track: pending.track,
      grade: pending.grade,
      updated_at: new Date().toISOString()
    };
    const { data: saved, error } = await supabaseStore.upsertUserProfile(payload);
    if (error) {
      console.warn("Failed to upsert pending user profile", error);
      return false;
    }
    authProfile = saved || payload;
    clearPendingProfile();
    syncProfileUiFromState();
    return true;
  }

  function applyAuthModalMode() {
    if (!authModal || !authEmailInput || !authSendBtn || !authCloseBtn) return;
    if (authModal.classList.contains("auth-checking")) return;
    morphAuthCardLayout(() => {
      const isAuthorized = !!authUser;
      const compactAuthorized = isAuthorized;
      authModal.classList.toggle("compact-auth", compactAuthorized);
      if (compactAuthorized) {
        if (authDescription) authDescription.style.display = "";
        if (authLevelWrap) authLevelWrap.style.display = "";
        if (authOAuthRow) authOAuthRow.style.display = "";
        if (authEmailToggle) authEmailToggle.style.display = "none";
        authEmailInput.style.display = "none";
        syncProfileUiFromState();
        const hasResolvedProfileLabel = !!profileLabel(authProfile);
        const titleShowsProgressPlaceholder = !!authTitle && authTitle.textContent === "Сохранение прогресса";
        const canShowAuthorizedActions = hasResolvedProfileLabel && !titleShowsProgressPlaceholder;
        authModal.classList.toggle("auth-profile-pending", !canShowAuthorizedActions);
        if (authSyncBtn) authSyncBtn.style.display = "inline-flex";
        authSendBtn.textContent = "Выйти";
        authSendBtn.disabled = false;
        authSendBtn.style.display = "";
        authCloseBtn.textContent = "Закрыть";
        return;
      }
      authModal.classList.remove("auth-profile-pending");
      if (authTitle) authTitle.textContent = "Сохранение прогресса";
      if (authDescription) authDescription.style.display = "";
      if (authLevelWrap) authLevelWrap.style.display = "";
      if (authOAuthRow) authOAuthRow.style.display = "";
      if (authEmailToggle) authEmailToggle.style.display = "";
      authEmailInput.style.display = authEmailLoginExpanded ? "" : "none";
      if (authSyncBtn) authSyncBtn.style.display = "none";
      authSendBtn.textContent = "Получить ссылку";
      authSendBtn.style.display = authEmailLoginExpanded ? "" : "none";
      authCloseBtn.textContent = "Закрыть";
    });
    positionAuthModal();
  }

  function updateAuthButtonLabel() {
    if (!authOpenBtn) return;
    if (authUser?.email) {
      authOpenBtn.title = `Синхронизация: ${authUser.email}`;
      authOpenBtn.classList.add("is-auth");
      return;
    }
    authOpenBtn.title = "Войти и сохранить прогресс";
    authOpenBtn.classList.remove("is-auth");
  }

  function positionAuthModal() {
    if (!authModal || !authCard || !authOpenBtn) return;
    const trigger = authOpenBtn.getBoundingClientRect();
    const isMobile = window.innerWidth <= 600;
    let top = Math.max(8, trigger.bottom + 8);
    let right = isMobile ? 8 : Math.max(8, Math.round(window.innerWidth - trigger.right));
    authCard.style.left = "auto";
    authCard.style.right = `${right}px`;
    authCard.style.top = `${top}px`;
    const rect = authCard.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      right = Math.max(8, right + (rect.right - (window.innerWidth - 8)));
    }
    if (rect.left < 8) {
      right = Math.max(8, right - (8 - rect.left));
    }
    if (rect.bottom > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - rect.height - 8);
    }
    authCard.style.left = "auto";
    authCard.style.right = `${Math.max(8, right)}px`;
    authCard.style.top = `${top}px`;
  }

  function showAuthModal(prefillMessage, options = {}) {
    if (!authModal) return;
    const startChecking = !!options.checking;
    authModalAiGateActive = !!options.aiGate;
    setEmailLoginExpanded(false);
    if (!authUser) {
      const pending = readPendingProfile();
      if (authTrackSelect && pending?.track) authTrackSelect.value = pending.track;
      if (authGradeSelect && pending?.grade) authGradeSelect.value = pending.grade;
    }
    setAuthCheckingState(startChecking);
    if (!startChecking) applyAuthModalMode();
    authModal.classList.add("show");
    authModal.setAttribute("aria-hidden", "false");
    positionAuthModal();
    if (!startChecking) {
      setAuthStatus(prefillMessage || "");
    }
    if (authUser && !authProfile) {
      refreshAuthUserInBackground({ force: true }).catch((e) => {
        console.warn("Auth profile refresh for modal failed", e);
      });
    }
    if (authEmailInput && authEmailLoginExpanded && authEmailInput.style.display !== "none") {
      authEmailInput.focus();
    }
  }

  function hideAuthModal() {
    if (!authModal) return;
    if (authModalAiGateActive && !authUser) {
      allowGuestAiRequests = true;
      writeGuestAiAuthBypassFlag(true);
    }
    authModalAiGateActive = false;
    setAuthCheckingState(false);
    authModal.classList.remove("auth-profile-pending");
    authModal.classList.remove("show");
    authModal.setAttribute("aria-hidden", "true");
    setAuthStatus("");
  }

  function getCleanRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function getActiveSession() {
    if (!isCloudReady()) return null;
    try {
      if (supabaseStore?.getSession) {
        const session = await withTimeout(supabaseStore.getSession(), 3000, "get session");
        if (session?.access_token) return session;
      }
      const fallback = await withTimeout(
        supabaseStore.client?.auth?.getSession?.() || Promise.resolve({ data: { session: null } }),
        3000,
        "get session fallback"
      );
      return fallback?.data?.session || null;
    } catch (e) {
      console.warn("getActiveSession failed", e);
      return undefined;
    }
  }

  async function refreshAuthUser() {
    if (authRefreshInFlight) return authRefreshInFlight;
    if (!isCloudReady()) return null;
    authRefreshInFlight = (async () => {
      try {
      const session = await getActiveSession();
      if (session === undefined) {
        // Transient session check failure (timeout/network/SDK hiccup).
        // Preserve last known auth state to avoid false "not authorized" UI flicker.
        updateAuthButtonLabel();
        refreshVisibleAuthModalUi();
        return authUser || null;
      }
      if (!session?.access_token) {
        authUser = null;
        authProfile = null;
        setAuthSessionCheckedNow();
        updateAuthButtonLabel();
        refreshVisibleAuthModalUi();
        return null;
      }
      authUser = await supabaseStore.getUser();
      if (authUser) {
        const { data } = await supabaseStore.getUserProfile(authUser.id);
        authProfile = data || null;
        await applyPendingProfileToCloud();
        syncProfileUiFromState();
      } else {
        authProfile = null;
      }
      updateAuthButtonLabel();
      setAuthSessionCheckedNow();
      refreshVisibleAuthModalUi();
      return authUser;
      } catch (e) {
      console.warn("Supabase auth init failed", e);
      authUser = null;
      authProfile = null;
      setAuthSessionCheckedNow();
      updateAuthButtonLabel();
      refreshVisibleAuthModalUi();
      return null;
      } finally {
        authRefreshInFlight = null;
      }
    })();
    return authRefreshInFlight;
  }

  async function refreshAuthUserInBackground(options = {}) {
    const { force = false } = options;
    if (!isCloudReady()) return null;
    if (!force && isAuthSessionCheckFresh() && authUser) return authUser;
    if (document.visibilityState === "hidden" && !force) return authUser;
    return refreshAuthUser();
  }

  async function loadCloudProgress() {
    cloudProgressByQuestion.clear();
    if (!isCloudReady() || !authUser) return;
    try {
      const data = await restRequest("question_progress", {
        method: "GET",
        query: `select=user_id,question_id,status,updated_at&user_id=eq.${encodeURIComponent(authUser.id)}`
      });
      (data || []).forEach(row => {
        if (row?.question_id && row?.status) {
          cloudProgressByQuestion.set(row.question_id, row.status);
        }
      });
    } catch (e) {
      console.warn("Failed to load question progress from Supabase", e);
    }
  }

  async function loadCloudAnswers() {
    cloudAnswersByQuestion.clear();
    if (!isCloudReady() || !authUser) return;
    try {
      const data = await restRequest("ai_answers", {
        method: "GET",
        query: `select=id,question_id,answer_type,model,seconds,content,created_at&user_id=eq.${encodeURIComponent(authUser.id)}&order=created_at.asc`
      });
      (data || []).forEach(row => {
        if (!row?.question_id || !row?.content) return;
        const list = cloudAnswersByQuestion.get(row.question_id) || [];
        list.push({
          cloudId: row.id || null,
          answer: row.content,
          model: row.model || "",
          seconds: row.seconds || 0,
          arrivedAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
          answerType: row.answer_type || "append"
        });
        cloudAnswersByQuestion.set(row.question_id, list);
      });
    } catch (e) {
      console.warn("Failed to load AI answers from Supabase", e);
    }
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
    await refreshAuthUser();
    if (!authUser) return;
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
    const session = await getActiveSession();
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
      throw new Error(`${method} ${path} failed: ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
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
    if (typeof state.renderCurrentRuntimeResponse === "function" && state.runtimeResponses.length) {
      const currentIdx = Math.max(0, Math.min(state.runtimeIndex || 0, state.runtimeResponses.length - 1));
      state.runtimeIndex = currentIdx;
      state.renderCurrentRuntimeResponse();
    }
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
      updateProgress(cat.category, studiedArr.length, unclearArr.length, cat.items.length);
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
      if (state.runtimeResponses.length && typeof state.renderCurrentRuntimeResponse === "function") {
        state.renderCurrentRuntimeResponse();
      }
    });
  }

  async function syncLocalAndCloudState(options = {}) {
    const { force = false, source = "auto" } = options;
    if (!isCloudReady() || !authUser) return { ok: false };
    const now = Date.now();
    if (!force && cloudSyncPromise) return cloudSyncPromise;
    if (!force && (now - getCloudSyncLastTs()) < CLOUD_SYNC_TTL_MS) {
      return { ok: true, skipped: true };
    }
    cloudSyncPromise = (async () => {
      try {
        if (source === "manual") setAuthSyncButtonBusy(true);
        const hadPendingMutationsAtStart = readPendingMutations().length > 0;
        await withTimeout(Promise.all([loadCloudProgress(), loadCloudAnswers()]), CLOUD_OP_TIMEOUT_MS, "initial cloud load");

        const localProgressRows = getLocalProgressRows();
        if (localProgressRows.length) {
          if (supabaseStore.upsertQuestionProgressBulk) {
            const { error } = await withTimeout(
              supabaseStore.upsertQuestionProgressBulk(localProgressRows),
              CLOUD_OP_TIMEOUT_MS,
              "progress bulk upsert"
            );
            if (error) {
              console.warn("Bulk progress sync failed, fallback to row upsert", error);
              await Promise.all(localProgressRows.map((r) => saveProgressCloud(r.question_id, r.status)));
            }
          } else {
            await Promise.all(localProgressRows.map((r) => saveProgressCloud(r.question_id, r.status)));
          }
        }

        const cloudSignatures = new Set();
        cloudAnswersByQuestion.forEach((list, questionId) => {
          (list || []).forEach((resp) => {
            cloudSignatures.add(aiSignature(questionId, resp.answerType, resp.model, resp.answer));
          });
        });
        // Avoid duplicate inserts when the same AI answer/refine is already queued in pending mutations
        // and will be flushed in the same sync cycle.
        readPendingMutations().forEach((m) => {
          if (!m || m.type !== "saveAiAnswer") return;
          const p = m.payload || {};
          const r = p.response || {};
          const qid = p.questionId;
          const content = String(r.answer || "").trim();
          if (!qid || !content) return;
          cloudSignatures.add(aiSignature(qid, p.answerType || r.answerType || "append", r.model || null, content));
        });
        const localAiRows = getLocalAiRows(cloudSignatures);
        if (localAiRows.length) {
          if (supabaseStore.saveAiAnswersBulk) {
            const { error } = await withTimeout(
              supabaseStore.saveAiAnswersBulk(localAiRows),
              CLOUD_OP_TIMEOUT_MS,
              "ai answers bulk insert"
            );
            if (error) {
              console.warn("Bulk AI answers sync failed", error);
            }
          } else {
            await Promise.all(localAiRows.map((row) =>
              saveAiAnswerCloud(row.question_id, row.answer_type, {
                answer: row.content,
                model: row.model,
                seconds: row.seconds
              })
            ));
          }
        }

        // Flush queued mutations (especially deletes) before final reload, so deleted AI answers
        // are not briefly rehydrated from cloud right after manual sync.
        await flushPendingMutations();

        if (localProgressRows.length || localAiRows.length || force || hadPendingMutationsAtStart) {
          await withTimeout(Promise.all([loadCloudProgress(), loadCloudAnswers()]), CLOUD_OP_TIMEOUT_MS, "final cloud reload");
        }
        applyCloudStateToUi();
        markCloudSyncTs();
        if (source === "manual") flashAuthSyncButtonSuccess();
        return { ok: true };
      } catch (e) {
        console.warn("Cloud sync failed", e);
        return { ok: false, error: e };
      } finally {
        if (source === "manual") setAuthSyncButtonBusy(false);
        cloudSyncPromise = null;
      }
    })();
    return cloudSyncPromise;
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

  async function saveProgressCloud(questionId, status, options = {}) {
    const { enqueueOnFail = true } = options;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId) {
      console.warn("Skip cloud progress save: no auth/cloud", { questionId, hasCloud: isCloudReady(), hasAuth });
      if (enqueueOnFail) enqueueMutation("saveProgress", { questionId, status });
      return;
    }
    const payload = {
      user_id: authUser.id,
      question_id: questionId,
      status,
      updated_at: new Date().toISOString()
    };
    try {
      await withTimeout(
        restRequest("question_progress", {
          method: "POST",
          query: "on_conflict=user_id,question_id",
          body: payload,
          prefer: "resolution=merge-duplicates,return=representation"
        }),
        CLOUD_OP_TIMEOUT_MS,
        "save progress"
      );
      console.info("Cloud progress saved", { questionId, status });
    } catch (e) {
      console.warn("Failed to save question progress to Supabase", e);
      if (enqueueOnFail) enqueueMutation("saveProgress", { questionId, status });
    }
  }

  async function saveAiAnswerCloud(questionId, answerType, response, options = {}) {
    const { enqueueOnFail = true } = options;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId || !response?.answer) {
      console.warn("Skip cloud AI save: no auth/cloud", { questionId, hasCloud: isCloudReady(), hasAuth });
      const shouldQueue = enqueueOnFail && questionId && response?.answer && !(allowGuestAiRequests && !hasAuth);
      if (shouldQueue) {
        enqueueMutation("saveAiAnswer", { questionId, answerType, response });
      }
      return null;
    }
    const payload = {
      user_id: authUser.id,
      question_id: questionId,
      answer_type: answerType || response.answerType || "append",
      model: response.model || null,
      seconds: response.seconds || null,
      content: response.answer
    };
    try {
      const data = await withTimeout(
        restRequest("ai_answers", {
          method: "POST",
          body: payload,
          prefer: "return=representation"
        }),
        CLOUD_OP_TIMEOUT_MS,
        "save ai answer"
      );
      const row = Array.isArray(data) ? data[0] : data;
      console.info("Cloud AI answer saved", { questionId, answerType: payload.answer_type, model: payload.model });
      return row?.id || null;
    } catch (e) {
      console.warn("Failed to save AI answer to Supabase", e);
      if (enqueueOnFail) enqueueMutation("saveAiAnswer", { questionId, answerType, response });
      return null;
    }
  }

  async function deleteAiAnswerCloud(answerId, options = {}) {
    const { enqueueOnFail = true } = options;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !answerId) {
      console.warn("Skip cloud AI delete by id: no auth/cloud", { answerId, hasCloud: isCloudReady(), hasAuth });
      if (enqueueOnFail && answerId) enqueueMutation("deleteAiById", { answerId });
      return false;
    }
    try {
      const data = await withTimeout(
        restRequest("ai_answers", {
          method: "DELETE",
          query: `id=eq.${encodeURIComponent(answerId)}&user_id=eq.${encodeURIComponent(authUser.id)}`,
          prefer: "return=representation"
        }),
        CLOUD_OP_TIMEOUT_MS,
        "delete ai by id"
      );
      console.info("Cloud AI answer deleted by id", { answerId });
      return Array.isArray(data) ? data.length > 0 : true;
    } catch (e) {
      console.warn("Failed to delete AI answer from Supabase", e);
      if (enqueueOnFail) enqueueMutation("deleteAiById", { answerId });
      return false;
    }
  }

  async function deleteAiAnswerCloudByPayload(questionId, response, options = {}) {
    const { enqueueOnFail = true } = options;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId || !response?.answer) {
      console.warn("Skip cloud AI delete by payload: no auth/cloud", { questionId, hasCloud: isCloudReady(), hasAuth });
      if (enqueueOnFail && questionId && response?.answer) enqueueMutation("deleteAiByPayload", { questionId, response });
      return false;
    }
    try {
      // Avoid sending huge answer text in URL (PostgREST DELETE filters are query-string based).
      // First find candidate rows by compact filters, then delete exact match by id.
      let lookupQuery = [
        "select=id,content,model,answer_type,created_at",
        `user_id=eq.${encodeURIComponent(authUser.id)}`,
        `question_id=eq.${encodeURIComponent(questionId)}`,
        `answer_type=eq.${encodeURIComponent(response.answerType || "append")}`,
        "order=created_at.desc",
        "limit=50"
      ].join("&");
      if (response.model) {
        lookupQuery += `&model=eq.${encodeURIComponent(response.model)}`;
      }
      const rows = await withTimeout(
        restRequest("ai_answers", {
          method: "GET",
          query: lookupQuery,
          prefer: null
        }),
        CLOUD_OP_TIMEOUT_MS,
        "find ai by payload"
      );
      const target = (Array.isArray(rows) ? rows : []).find((row) => (
        row &&
        String(row.content || "") === String(response.answer || "") &&
        String(row.answer_type || "append") === String(response.answerType || "append") &&
        String(row.model || "") === String(response.model || "")
      ));
      if (!target?.id) {
        console.info("Cloud AI answer delete by payload skipped: row not found", { questionId });
        return true;
      }
      return await deleteAiAnswerCloud(target.id, { enqueueOnFail });
    } catch (e) {
      console.warn("Failed to delete AI answer by payload from Supabase", e);
      if (enqueueOnFail) enqueueMutation("deleteAiByPayload", { questionId, response });
      return false;
    }
  }

  async function flushPendingMutations() {
    if (!isCloudReady() || !authUser) return;
    const queue = readPendingMutations();
    if (!queue.length) return;
    const now = Date.now();
    const failed = [];
    for (const m of queue) {
      if ((m?.nextTs || 0) > now) {
        failed.push(m);
        continue;
      }
      try {
        if (m.type === "saveProgress") {
          await saveProgressCloud(m.payload.questionId, m.payload.status, { enqueueOnFail: false });
        } else if (m.type === "saveAiAnswer") {
          const id = await saveAiAnswerCloud(m.payload.questionId, m.payload.answerType, m.payload.response, { enqueueOnFail: false });
          if (!id) throw new Error("saveAiAnswer retry failed");
        } else if (m.type === "deleteAiById") {
          const ok = await deleteAiAnswerCloud(m.payload.answerId, { enqueueOnFail: false });
          if (!ok) throw new Error("deleteAiById retry failed");
        } else if (m.type === "deleteAiByPayload") {
          const ok = await deleteAiAnswerCloudByPayload(m.payload.questionId, m.payload.response, { enqueueOnFail: false });
          if (!ok) throw new Error("deleteAiByPayload retry failed");
        }
      } catch {
        const attempts = Number(m?.attempts || 0) + 1;
        const backoffMs = Math.min(120000, 5000 * attempts);
        failed.push({
          ...m,
          attempts,
          nextTs: Date.now() + backoffMs
        });
      }
    }
    writePendingMutations(failed);
    if (!failed.length) {
      console.info("Pending mutations flushed");
    } else {
      console.warn("Pending mutations left", failed.length);
    }
  }

  async function ensureAuthForAiAction() {
    if (allowGuestAiRequests) return true;
    if (!isCloudReady()) {
      showAuthModal("Авторизация недоступна. Закройте окно и продолжите без сохранения ответов ИИ.", { aiGate: true });
      return false;
    }
    const hasAuth = await ensureAuthContext();
    if (hasAuth) {
      allowGuestAiRequests = false;
      writeGuestAiAuthBypassFlag(false);
      return true;
    }
    showAuthModal("Войдите, чтобы сохранить ответы ИИ. Или закройте окно и продолжите без сохранения.", { aiGate: true });
    return false;
  }

  if (apiKeySave) {
    apiKeySave.addEventListener("click", () => {
      const v = apiKeyInput?.value?.trim();
      if (v) {
        safeSetItemWithAiEviction(OVERRIDE_API_KEY_STORAGE, v);
        hideApiKeyModal();
        if (pendingRetry) {
          const retry = pendingRetry;
          pendingRetry = null;
          retry();
        }
      }
    });
  }

  if (apiKeyClose) {
    apiKeyClose.addEventListener("click", () => {
      pendingRetry = null;
      hideApiKeyModal();
    });
  }

  if (authOpenBtn) {
    authOpenBtn.addEventListener("click", async () => {
      if (!authUser || !isAuthSessionCheckFresh()) {
        refreshAuthUserInBackground().catch((e) => console.warn("Background auth refresh failed", e));
      }
      showAuthModal("");
      applyAuthModalMode();
    });
  }

  if (authSendBtn) {
    authSendBtn.addEventListener("click", async () => {
      if (!isCloudReady()) {
        setAuthStatus("Supabase не подключен.");
        return;
      }
      const isAuthorizedView = !!authUser;
      if (isAuthorizedView) {
        try {
          const session = await getActiveSession();
          if (!session?.access_token) {
            authUser = null;
            authProfile = null;
            updateAuthButtonLabel();
            applyAuthModalMode();
            setAuthStatus("Сессия истекла. Войдите заново.");
            return;
          }
          const signOutFn = supabaseStore.signOut || (supabaseStore.client?.auth?.signOut
            ? () => supabaseStore.client.auth.signOut()
            : null);
          if (!signOutFn) {
            setAuthStatus("Выход недоступен. Обновите страницу.");
            return;
          }
          const { error } = await signOutFn();
          if (error) {
            setAuthStatus("Не удалось выйти. Попробуйте снова.");
            return;
          }
          authUser = null;
          authProfile = null;
          updateAuthButtonLabel();
          hideAuthModal();
        } catch (e) {
          console.warn("Sign out failed", e);
          setAuthStatus("Не удалось выйти. Попробуйте снова.");
        }
        return;
      }
      await refreshAuthUser();
      const track = (authTrackSelect?.value || "").trim();
      const grade = (authGradeSelect?.value || "").trim();
      if (!track || !grade) {
        setAuthStatus("Выберите направление и уровень.");
        return;
      }
      const email = (authEmailInput?.value || "").trim();
      if (!email) {
        setAuthStatus("Введите email.");
        return;
      }
      writePendingProfile({ email, track, grade, ts: Date.now() });
      setAuthStatus("Отправляю ссылку для входа...");
      saveAuthReturnScrollPosition();
      const redirectTo = getCleanRedirectUrl();
      const { error } = await supabaseStore.signInWithOtp(email, redirectTo);
      if (error) {
        const errCode = String(error.code || "");
        const errMsg = String(error.message || "").toLowerCase();
        if (errCode === "over_email_send_rate_limit" || errMsg.includes("email rate limit exceeded")) {
          setAuthStatus("Лимит писем Supabase исчерпан. Подождите 60 сек и попробуйте снова.");
          authSendBtn.disabled = true;
          setTimeout(() => {
            authSendBtn.disabled = false;
          }, 60000);
          return;
        }
        setAuthStatus("Не удалось отправить ссылку. Проверьте email и повторите.");
        return;
      }
      setAuthStatus("Ссылка отправлена. Откройте письмо и вернитесь на страницу.");
    });
  }

  if (authEmailToggle) {
    authEmailToggle.addEventListener("click", () => {
      if (authUser) return;
      setEmailLoginExpanded(!authEmailLoginExpanded);
      applyAuthModalMode();
      positionAuthModal();
      if (authEmailLoginExpanded && authEmailInput) {
        requestAnimationFrame(() => authEmailInput.focus());
      }
    });
  }

  if (authGoogleBtn) {
    authGoogleBtn.addEventListener("click", async () => {
      if (!isCloudReady()) {
        setAuthStatus("Supabase не подключен.");
        return;
      }
      const track = (authTrackSelect?.value || "").trim();
      const grade = (authGradeSelect?.value || "").trim();
      if (!track || !grade) {
        setAuthStatus("Выберите направление и уровень.");
        return;
      }
      writePendingProfile({
        email: (authEmailInput?.value || "").trim() || null,
        track,
        grade,
        ts: Date.now()
      });
      setAuthStatus("Перенаправляю в Google...");
      saveAuthReturnScrollPosition();
      const redirectTo = getCleanRedirectUrl();
      const signInOAuthFn = supabaseStore.signInWithOAuth || (supabaseStore.client?.auth?.signInWithOAuth
        ? (provider, rt) => supabaseStore.client.auth.signInWithOAuth({ provider, options: { redirectTo: rt } })
        : null);
      if (!signInOAuthFn) {
        setAuthStatus("Google вход недоступен. Обновите страницу.");
        return;
      }
      const { error } = await signInOAuthFn("google", redirectTo);
      if (error) {
        console.warn("Google OAuth sign-in failed", error);
        setAuthStatus("Не удалось открыть Google вход.");
      }
    });
  }

  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", hideAuthModal);
  }

  if (authSyncBtn) {
    authSyncBtn.addEventListener("click", async () => {
      if (!authUser) {
        setAuthStatus("Сначала войдите");
        return;
      }
      if (!profileLabel(authProfile)) {
        setAuthStatus("Загружаю профиль...");
        refreshAuthUserInBackground({ force: true }).catch((e) => {
          console.warn("Auth profile refresh for sync failed", e);
        });
        return;
      }
      const session = await getActiveSession();
      if (!session?.access_token) {
        authUser = null;
        authProfile = null;
        setAuthSessionCheckedNow();
        updateAuthButtonLabel();
        applyAuthModalMode();
        setAuthStatus("Сессия истекла. Войдите заново.");
        return;
      }
      await refreshAuthUser();
      if (!authUser) {
        setAuthStatus("Сначала войдите");
        return;
      }
      try {
        setAuthSyncButtonBusy(true);
        // явный REST ping, чтобы в Network всегда был виден запрос синхронизации
        await restRequest("question_progress", {
          method: "GET",
          query: `select=question_id&user_id=eq.${encodeURIComponent(authUser.id)}&limit=1`
        });
        await syncLocalAndCloudState({ force: true, source: "manual" });
      } finally {
        setAuthSyncButtonBusy(false);
      }
    });
  }

  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) hideAuthModal();
    });
  }

  window.addEventListener("resize", () => {
    syncHeaderAiNotchViewportMode();
    if (authModal?.classList.contains("show")) {
      applyAuthModalMode();
      positionAuthModal();
    }
  });
  window.addEventListener("scroll", () => {
    if (authModal?.classList.contains("show")) positionAuthModal();
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

  if (isCloudReady() && supabaseStore.client?.auth?.onAuthStateChange) {
    supabaseStore.client.auth.onAuthStateChange(async (event, session) => {
      authUser = session?.user || null;
      if (authUser) {
        setAuthSessionCheckedNow();
      } else if (event === "INITIAL_SESSION") {
        // Don't cache a potentially transient "logged out" state on page reload.
        authLastSessionCheckTs = 0;
      } else {
        setAuthSessionCheckedNow();
      }
      if (authUser) {
        allowGuestAiRequests = false;
        writeGuestAiAuthBypassFlag(false);
        authModalAiGateActive = false;
        await refreshAuthUser();
        setAuthStatus("");
        if (shouldRunAuthDrivenSync({ userId: authUser.id })) {
          markAuthDrivenSync(authUser.id);
          await syncLocalAndCloudState({ force: false, source: "auth" });
        }
        await flushPendingMutations();
      } else {
        authProfile = null;
        updateAuthButtonLabel();
      }
      applyAuthModalMode();
    });
  }

  initializeCloudState().catch((e) => {
    console.warn("Cloud state init skipped", e);
  });
  // Supabase session restoration may lag on hard reload; retry a few times quickly.
  [600, 1800, 4000].forEach((delay) => {
    setTimeout(async () => {
      if (authUser) return;
      try {
        const user = await refreshAuthUserInBackground({ force: true });
        if (user) {
          if (shouldRunAuthDrivenSync({ userId: user.id })) {
            markAuthDrivenSync(user.id);
            await syncLocalAndCloudState({ force: false, source: "auth" });
          }
          await flushPendingMutations();
        }
      } catch (e) {
        console.warn("Startup auth retry failed", e);
      }
    }, delay);
  });
  setInterval(() => {
    refreshAuthUserInBackground().catch((e) => console.warn("Periodic auth refresh failed", e));
  }, AUTH_SESSION_CHECK_TTL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshAuthUserInBackground().catch((e) => console.warn("Visibility auth refresh failed", e));
    }
  });
  setInterval(() => {
    if (!authUser) return;
    flushPendingMutations().catch((e) => console.warn("Pending flush failed", e));
  }, 15000);
  scheduleQuestionsLoadFallback();
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
  const repoQuestionsData = await loadQuestionsFromRepoJson();
  const cachedQuestionsData = readQuestionsCache();
  const staleCachedQuestionsData = cachedQuestionsData || readQuestionsCache({ allowStale: true });
  if (Array.isArray(repoQuestionsData) && repoQuestionsData.length) {
    runtimeQuestionsData = repoQuestionsData;
    window.questionsData = runtimeQuestionsData;
    writeQuestionsCache(repoQuestionsData);
    questionsSource = "repo-json";
    console.info(`Questions source: repo JSON (${runtimeQuestionsData.length} sections)`);
  } else if (Array.isArray(cachedQuestionsData) && cachedQuestionsData.length) {
    runtimeQuestionsData = cachedQuestionsData;
    window.questionsData = runtimeQuestionsData;
    questionsSource = "local-cache";
    console.info(`Questions source: local cache (${runtimeQuestionsData.length} sections)`);
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
    const savedModel = localStorage.getItem("selectedModel");
    if (savedModel && models.includes(savedModel)) return savedModel;
    if (models.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
    return models[0] || DEFAULT_MODEL;
  }

  function applyModelSelection(models) {
    const preferred = getPreferredModel(models);
    safeSetItemWithAiEviction("selectedModel", preferred);
  }

  function setCurrentModels(models) {
    currentModels = Array.isArray(models) && models.length ? models.slice(0, 5) : FAST_MODEL_HINTS.slice(0, 5);
  }

  function readModelTimings() {
    try {
      return JSON.parse(localStorage.getItem(MODEL_TIMINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeModelTimings(map) {
    safeSetItemWithAiEviction(MODEL_TIMINGS_KEY, JSON.stringify(map));
  }

  function recordModelTiming(model, ms) {
    const map = readModelTimings();
    const prev = map[model];
    if (!prev) {
      map[model] = { avg: ms, count: 1 };
    } else {
      const nextCount = prev.count + 1;
      const nextAvg = (prev.avg * prev.count + ms) / nextCount;
      map[model] = { avg: nextAvg, count: nextCount };
    }
    writeModelTimings(map);
    refreshRuntimeModelRanking();
    if (ms >= MODEL_SLOW_RESPONSE_MS) {
      markModelAsSlowAndReplace(model, ms);
    }
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
    const ranked = rankModelsByTimings(currentModels).slice(0, 5);
    if (!ranked.length) return;
    const prev = currentModels.slice(0, 5);
    const changed = ranked.length !== prev.length || ranked.some((m, i) => m !== prev[i]);
    if (!changed) return;
    setCurrentModels(ranked);
    applyModelSelection(ranked);
    renderModelsList(ranked);
    writeModelListCache(ranked);
    writeValidatedChatModelsCache(ranked);
    modelListFromCache = false;
    console.info("Runtime model ranking updated by real response timings", ranked);
  }

  function markModelAsSlowAndReplace(model, ms) {
    if (!model) return;
    const filteredCurrent = (currentModels || []).filter((m) => m && m !== model);
    if (!filteredCurrent.length) return;
    const rankedCurrent = rankModelsByTimings(filteredCurrent).slice(0, 5);
    setCurrentModels(rankedCurrent);
    applyModelSelection(rankedCurrent);
    renderModelsList(rankedCurrent);
    writeModelListCache(rankedCurrent);
    writeValidatedChatModelsCache(rankedCurrent);
    modelListFromCache = false;
    recordModelFailure(model, "slow_response_over_30s");
    console.warn(`Model removed from fast pool due to slow response (${ms} ms): ${model}`);

    const now = Date.now();
    if (modelRuntimeRebalancePromise) return;
    if ((now - modelLastRuntimeRebalanceTs) < MODEL_RUNTIME_REBALANCE_COOLDOWN_MS) return;
    modelLastRuntimeRebalanceTs = now;
    modelRuntimeRebalancePromise = (async () => {
      try {
        const exclude = Array.from(new Set([...rankedCurrent, model]));
        const fresh = await loadModels({ force: true, exclude });
        const merged = Array.from(new Set([...(rankedCurrent || []), ...(fresh || [])])).filter(Boolean).slice(0, 5);
        if (!merged.length) return;
        const rankedMerged = rankModelsByTimings(merged);
        setCurrentModels(rankedMerged);
        applyModelSelection(rankedMerged);
        renderModelsList(rankedMerged);
        writeModelListCache(rankedMerged);
        writeValidatedChatModelsCache(rankedMerged);
        modelListFromCache = false;
        console.info("Model pool rebalanced after slow response", rankedMerged);
      } catch (e) {
        console.warn("Failed to rebalance model pool after slow response", e);
      } finally {
        modelRuntimeRebalancePromise = null;
      }
    })();
  }

  function readModelFailures() {
    try {
      return JSON.parse(localStorage.getItem(MODEL_FAILURES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeModelFailures(map) {
    safeSetItemWithAiEviction(MODEL_FAILURES_KEY, JSON.stringify(map));
  }

  function recordModelFailure(model, reason) {
    const map = readModelFailures();
    const now = Date.now();
    const prev = map[model] || { count: 0, last: 0, reasons: {} };
    const next = {
      count: prev.count + 1,
      last: now,
      reasons: { ...prev.reasons, [reason]: (prev.reasons[reason] || 0) + 1 }
    };
    map[model] = next;
    writeModelFailures(map);
  }

  function parseAvailableModelsFromDetail(detail) {
    const text = String(detail || "");
    if (!/available models\s*:/i.test(text)) return [];
    const bracketMatch = text.match(/available models\s*:\s*\[([\s\S]*?)\]/i);
    const source = bracketMatch ? bracketMatch[1] : text;
    const result = [];
    const rx = /'([^']+)'|"([^"]+)"/g;
    let m;
    while ((m = rx.exec(source))) {
      const model = String(m[1] || m[2] || "").trim();
      if (model && !result.includes(model)) result.push(model);
    }
    return result;
  }

  function normalizeAvailableChatModels(apiModels, exclude = []) {
    const list = Array.isArray(apiModels) ? apiModels.filter(Boolean) : [];
    const excluded = new Set(Array.isArray(exclude) ? exclude : []);
    const filtered = list.filter(m => !excluded.has(m));
    const noReasoning = filtered.filter(name => {
      const n = String(name).toLowerCase();
      return !(
        n.includes("thinking") ||
        n.includes("reasoning") ||
        n.includes("deepseek-r1") ||
        n.includes("/r1") ||
        n.endsWith("-r1") ||
        n.includes("o1") ||
        n.includes("o3") ||
        n.includes("vl") ||
        n.includes("vision")
      );
    });
    const hinted = FAST_MODEL_HINTS.filter(m => noReasoning.includes(m) && !excluded.has(m));
    const pool = hinted.length ? hinted : (noReasoning.length ? noReasoning : filtered);
    return (pool.length ? pool : filtered).slice(0, 5);
  }

  function applyAvailableModelsHint(apiModels, options = {}) {
    const { exclude = [] } = options;
    const nextModels = normalizeAvailableChatModels(apiModels, exclude);
    if (!nextModels.length) return [];
    setCurrentModels(nextModels);
    applyModelSelection(nextModels);
    renderModelsList(nextModels);
    writeModelListCache(nextModels);
    writeValidatedChatModelsCache(nextModels);
    modelListFromCache = false;
    return nextModels;
  }

  function getRequestOrder(preferredModel) {
    const validated = readValidatedChatModelsCache();
    if (Array.isArray(validated) && validated.length) {
      const nextModels = normalizeAvailableChatModels(validated);
      if (nextModels.length) {
        setCurrentModels(nextModels);
        applyModelSelection(nextModels);
        renderModelsList(nextModels);
        return getModelOrder(preferredModel && nextModels.includes(preferredModel) ? preferredModel : getPreferredModel(nextModels));
      }
    }
    const cached = readModelListCache();
    if (Array.isArray(cached) && cached.length) {
      const cachedSet = new Set(cached);
      const currentHasUnknown = currentModels.some(m => !cachedSet.has(m));
      if (currentHasUnknown) {
        const nextModels = normalizeAvailableChatModels(cached);
        if (nextModels.length) {
          setCurrentModels(nextModels);
          applyModelSelection(nextModels);
          renderModelsList(nextModels);
        }
      }
      const orderFromCurrent = getModelOrder(preferredModel);
      const filteredOrder = orderFromCurrent.filter(m => cachedSet.has(m));
      if (filteredOrder.length) return filteredOrder;
      const nextModels = normalizeAvailableChatModels(cached);
      if (nextModels.length) {
        setCurrentModels(nextModels);
        applyModelSelection(nextModels);
        renderModelsList(nextModels);
        return getModelOrder(getPreferredModel(nextModels));
      }
    }
    return getModelOrder(preferredModel);
  }

  function isModelBlocked(model) {
    const map = readModelFailures();
    const info = map[model];
    if (!info) return false;
    const hours6 = 6 * 60 * 60 * 1000;
    const isRecent = (Date.now() - info.last) < hours6;
    return isRecent && info.count >= 2;
  }

  function getModelOrder(preferred) {
    const base = currentModels.length ? currentModels : FAST_MODEL_HINTS.slice(0, 5);
    const timings = readModelTimings();
    const filtered = base.filter(m => !isModelBlocked(m));
    const pool = filtered.length ? filtered : base;
    const sorted = pool.slice().sort((a, b) => {
      const ta = timings[a]?.avg ?? Number.POSITIVE_INFINITY;
      const tb = timings[b]?.avg ?? Number.POSITIVE_INFINITY;
      if (ta === tb) return 0;
      return ta - tb;
    });
    const ordered = [];
    if (preferred && base.includes(preferred)) ordered.push(preferred);
    sorted.forEach(m => {
      if (!ordered.includes(m)) ordered.push(m);
    });
    return ordered;
  }

  function showLoader(el) {
    if (!el) return;
    el.innerHTML = AI_LOADER_HTML;
    delete el.dataset.waitingModel;
    el.classList.add("show");
  }

  function updateLoaderText(el, text) {
    if (!el) return;
    const label = el.querySelector(".ai-loader-text");
    if (label) label.textContent = text;
  }

  function getModelDisplayLabel(model) {
    const raw = String(model || "").trim();
    if (!raw) return "";
    const vendor = raw.split("/")[0]?.trim();
    return vendor || raw;
  }

  function startLoaderPhases(el) {
    if (!el) return null;
    updateLoaderText(el, "Жду ответ");
    const timers = [
      setTimeout(() => updateLoaderText(el, "Еще чуть-чуть…"), 3000),
      setTimeout(() => updateLoaderText(el, "Обрабатываю ответ модели"), 6000),
      setTimeout(() => updateLoaderText(el, "Я обязательно верну ответ"), 9000),
      setTimeout(() => {
        const modelName = el.dataset.waitingModel;
        updateLoaderText(el, modelName ? `Жду ответ от ${modelName}` : "Жду ответ");
      }, 12000)
    ];
    return timers;
  }

  function stopLoaderPhases(timer) {
    if (!timer) return;
    if (Array.isArray(timer)) {
      timer.forEach(t => clearTimeout(t));
    } else {
      clearInterval(timer);
    }
  }

  async function fetchAnswerOnce(userQ, model, options = {}) {
    const { system = systemPrompt } = options;
    const startedAt = Date.now();
    const res = await fetch(`${IO_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAuthKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: userQ }
        ],
        temperature: 0.7,
        reasoning_content: false,
        max_completion_tokens: 1000,
        stream: false
      })
    });
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.detail || "";
      } catch {}
      if (detail && /invalid api key/i.test(detail)) {
        throw new Error("INVALID_API_KEY");
      }
      const availableModels = parseAvailableModelsFromDetail(detail);
      if (res.status === 400 && availableModels.length) {
        const err = new Error(`MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS:${res.status}`);
        err.code = "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS";
        err.status = res.status;
        err.detail = detail;
        err.availableModels = availableModels;
        throw err;
      }
      const err = new Error(`AI request failed: ${res.status}`);
      err.status = res.status;
      err.detail = detail;
      throw err;
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const answer = msg?.content?.trim();
    if (!answer) {
      const hasReasoning = Array.isArray(msg?.reasoning_details) && msg.reasoning_details.length > 0;
      recordModelFailure(model, hasReasoning ? "reasoning_only" : "empty_content");
      throw new Error("Empty AI answer");
    }
    const elapsedMs = Date.now() - startedAt;
    recordModelTiming(model, elapsedMs);
    return {
      answer,
      elapsedMs,
      arrivedAt: Date.now()
    };
  }

  async function warmupModelOnce(model) {
    const startedAt = Date.now();
    const res = await fetch(`${IO_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAuthKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: warmupUserPrompt }
        ],
        temperature: 0.7,
        reasoning_content: false,
        max_completion_tokens: 1000,
        stream: false
      })
    });
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.detail || "";
      } catch {}
      if (detail && /invalid api key/i.test(detail)) {
        throw new Error("INVALID_API_KEY");
      }
      const availableModels = parseAvailableModelsFromDetail(detail);
      if (res.status === 400 && availableModels.length) {
        const err = new Error(`MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS:${res.status}`);
        err.code = "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS";
        err.status = res.status;
        err.detail = detail;
        err.availableModels = availableModels;
        throw err;
      }
      recordModelFailure(model, `warmup_${res.status}`);
      throw new Error(`Warmup failed: ${res.status}`);
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const answer = msg?.content?.trim();
    if (!answer) {
      const hasReasoning = Array.isArray(msg?.reasoning_details) && msg.reasoning_details.length > 0;
      recordModelFailure(model, hasReasoning ? "warmup_reasoning_only" : "warmup_empty_content");
      throw new Error("Warmup empty");
    }
    recordModelTiming(model, Date.now() - startedAt);
    return answer;
  }

  function shouldWarmup() {
    const last = Number(localStorage.getItem(MODEL_WARMUP_KEY) || 0);
    const hours6 = 6 * 60 * 60 * 1000;
    return !last || (Date.now() - last) > hours6;
  }

  function markWarmup() {
    safeSetItemWithAiEviction(MODEL_WARMUP_KEY, String(Date.now()));
  }

  async function warmupModels(models) {
    const list = (models && models.length ? models : currentModels).slice(0, 5);
    const valid = [];
    let availableHint = [];
    let warmupPool = list.slice();
    const probeModel = warmupPool[0];
    if (probeModel) {
      try {
        const started = Date.now();
        await warmupModelOnce(probeModel);
        valid.push({ model: probeModel, ms: Date.now() - started });
      } catch (err) {
        if (err?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(err.availableModels) && err.availableModels.length) {
          availableHint = err.availableModels;
          recordModelFailure(probeModel, "chat_completions_unavailable");
          const hinted = applyAvailableModelsHint(availableHint);
          if (hinted.length) warmupPool = hinted.slice(0, 5);
        } else {
          recordModelFailure(probeModel, "warmup_failed");
        }
      }
    }

    const remainingModels = warmupPool
      .filter((m) => !valid.some((x) => x.model === m))
      .slice(0, Math.max(0, 5 - valid.length));

    if (remainingModels.length) {
      const settled = await Promise.allSettled(remainingModels.map(async (m) => {
        const started = Date.now();
        await warmupModelOnce(m);
        return { model: m, ms: Date.now() - started };
      }));
      settled.forEach((entry, idx) => {
        const model = remainingModels[idx];
        if (entry.status === "fulfilled") {
          valid.push(entry.value);
          return;
        }
        const err = entry.reason;
        if (!availableHint.length && err?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(err.availableModels) && err.availableModels.length) {
          availableHint = err.availableModels;
          applyAvailableModelsHint(availableHint);
          recordModelFailure(model, "chat_completions_unavailable");
          return;
        }
        recordModelFailure(model, "warmup_failed");
      });
    }

    if (!valid.length && availableHint.length) {
      const hinted = applyAvailableModelsHint(availableHint);
      if (hinted.length) {
        const retryModels = hinted.slice(0, 5);
        const retrySettled = await Promise.allSettled(retryModels.map(async (m) => {
          const started = Date.now();
          await warmupModelOnce(m);
          return { model: m, ms: Date.now() - started };
        }));
        retrySettled.forEach((entry, idx) => {
          const model = retryModels[idx];
          if (entry.status === "fulfilled") valid.push(entry.value);
          else recordModelFailure(model, "warmup_failed");
        });
      }
    }
    markWarmup();
    if (valid.length) {
      valid.sort((a, b) => a.ms - b.ms);
      const validatedModels = valid.map(x => x.model).slice(0, 5);
      setCurrentModels(validatedModels);
      applyModelSelection(validatedModels);
      renderModelsList(validatedModels);
      writeModelListCache(validatedModels);
      writeValidatedChatModelsCache(validatedModels);
      modelListFromCache = false;
      return validatedModels;
    }
    const ordered = getRequestOrder(getPreferredModel(list));
    setCurrentModels(ordered);
    applyModelSelection(ordered);
    renderModelsList(ordered);
    return ordered;
  }

  function ensureModelPreflightInBackground() {
    if (modelPreflightPromise) return modelPreflightPromise;
    const needsPreflight = shouldWarmup() || !readValidatedChatModelsCache();
    if (!needsPreflight) return Promise.resolve(currentModels);
    modelPreflightPromise = warmupModels(currentModels)
      .catch((e) => {
        console.warn("Model preflight warmup failed", e);
        return currentModels;
      })
      .finally(() => {
        modelPreflightPromise = null;
      });
    return modelPreflightPromise;
  }

  function requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options = {}) {
    const ATTEMPT_DELAY_MS = 5000;
    return new Promise((resolve, reject) => {
      let completed = 0;
      let invalidCount = 0;
      let lastErr = null;
      let firstResolved = false;
      let availableSet = null;

      order.forEach((model, idx) => {
        setTimeout(async () => {
          // Если первый ответ уже получен, новые запросы к моделям не запускаем.
          if (firstResolved) {
            completed += 1;
            return;
          }
          if (availableSet && !availableSet.has(model)) {
            completed += 1;
            if (completed === order.length && !firstResolved) {
              reject({
                error: lastErr || new Error("No AI answer"),
                invalidCount,
                total: order.length,
                tried: order.slice(),
                availableModelsHint: availableSet ? Array.from(availableSet) : null
              });
            }
            return;
          }
          try {
            if (typeof onAttempt === "function") onAttempt(model, idx + 1, order.length);
            const result = await fetchAnswerOnce(userQ, model, options);
            const payload = {
              answer: result.answer,
              model,
              arrivedAt: result.arrivedAt || Date.now(),
              elapsedMs: Math.max(1, Number(result.elapsedMs) || 0)
            };
            if (!firstResolved) {
              firstResolved = true;
              resolve(payload);
            } else if (typeof onAdditional === "function") {
              onAdditional(payload);
            }
          } catch (e) {
            lastErr = e;
            if (e && String(e.message).includes("INVALID_API_KEY")) invalidCount += 1;
            if (e?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(e.availableModels) && e.availableModels.length) {
              availableSet = new Set(e.availableModels);
              applyAvailableModelsHint(e.availableModels);
              recordModelFailure(model, "chat_completions_unavailable");
            }
            console.warn(`Model failed: ${model}`, e);
          } finally {
            completed += 1;
            if (completed === order.length && !firstResolved) {
              reject({
                error: lastErr || new Error("No AI answer"),
                invalidCount,
                total: order.length,
                tried: order.slice(),
                availableModelsHint: availableSet ? Array.from(availableSet) : null
              });
            }
          }
        }, idx * ATTEMPT_DELAY_MS);
      });
    });
  }

  async function requestWithFallback(userQ, preferredModel, onAttempt, onAdditional, options = {}) {
    if (!readValidatedChatModelsCache()) {
      ensureModelPreflightInBackground();
    }
    if (modelPreflightPromise) {
      await Promise.race([
        modelPreflightPromise.catch(() => null),
        new Promise(resolve => setTimeout(resolve, readValidatedChatModelsCache() ? 1800 : 4000))
      ]);
    }
    const order = getRequestOrder(preferredModel);
    try {
      return await requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options);
    } catch (batchErr) {
      if (batchErr?.invalidCount === batchErr?.total) {
        showApiKeyModal();
        throw batchErr.error || new Error("INVALID_API_KEY");
      }
      if (Array.isArray(batchErr?.availableModelsHint) && batchErr.availableModelsHint.length) {
        const hintedModels = applyAvailableModelsHint(batchErr.availableModelsHint, { exclude: batchErr?.tried || [] });
        if (hintedModels.length) {
          const retryOrderFromHint = getRequestOrder(getPreferredModel(hintedModels)).filter(m => !(batchErr?.tried || []).includes(m));
          if (retryOrderFromHint.length) {
            try {
              return await requestBatchWithTimeout(userQ, retryOrderFromHint, onAttempt, onAdditional, options);
            } catch (retryErrFromHint) {
              if (retryErrFromHint?.invalidCount === retryErrFromHint?.total) {
                showApiKeyModal();
                throw retryErrFromHint.error || new Error("INVALID_API_KEY");
              }
              throw retryErrFromHint.error || new Error("No AI answer");
            }
          }
        }
      }
      if (modelListFromCache) {
        const refreshed = await loadModels({ force: true, exclude: batchErr?.tried || order });
        const retryOrder = getModelOrder(getPreferredModel(refreshed));
        try {
          return await requestBatchWithTimeout(userQ, retryOrder, onAttempt, onAdditional, options);
        } catch (retryErr) {
          if (retryErr?.invalidCount === retryErr?.total) {
            showApiKeyModal();
            throw retryErr.error || new Error("INVALID_API_KEY");
          }
          throw retryErr.error || new Error("No AI answer");
        }
      }
      throw batchErr.error || new Error("No AI answer");
    }
  }

  async function loadModels(options = {}) {
    const { force = false, exclude = [] } = options;
    const fallback = FAST_MODEL_HINTS.slice(0, 5).filter(m => !exclude.includes(m));
    if (!force) {
      const cached = readModelListCache();
      if (cached && cached.length) {
        const filtered = cached.filter(m => !exclude.includes(m)).slice(0, 5);
        const useList = filtered.length ? filtered : cached.slice(0, 5);
        setCurrentModels(useList);
        applyModelSelection(useList);
        renderModelsList(useList);
        modelListFromCache = true;
        return useList;
      }
    }
    try {
      const res = await fetch(`${IO_API_BASE}/models?page_size=100`, {
        headers: {
          "Authorization": `Bearer ${getAuthKey()}`
        }
      });
      if (!res.ok) throw new Error(`Models list failed: ${res.status}`);
      const json = await res.json();
      const apiModels = (json?.data || [])
        .filter(m => {
          const status = (m?.status || "").toLowerCase();
          if (status && status !== "active") return false;
          const enable = m?.metadata?.enable_api_chat_completions;
          if (enable === false) return false;
          return true;
        })
        .map(m => m?.name || m?.id)
        .filter(Boolean);
      const noReasoning = apiModels.filter(name => {
        const n = name.toLowerCase();
        return !(
          n.includes("thinking") ||
          n.includes("reasoning") ||
          n.includes("deepseek-r1") ||
          n.includes("r1") ||
          n.includes("o1") ||
          n.includes("o3") ||
          n.includes("vl") ||
          n.includes("vision")
        );
      });
      const hinted = FAST_MODEL_HINTS.filter(m => noReasoning.includes(m) && !exclude.includes(m));
      const pool = hinted.length ? hinted : (noReasoning.length ? noReasoning : apiModels);
      const finalModels = (pool.length ? pool : fallback).filter(m => !exclude.includes(m)).slice(0, 5);
      setCurrentModels(finalModels);
      applyModelSelection(finalModels);
      renderModelsList(finalModels);
      writeModelListCache(finalModels);
      modelListFromCache = false;
      return finalModels;
    } catch (e) {
      console.warn("Using fallback model list", e);
      setCurrentModels(fallback);
      applyModelSelection(fallback);
      renderModelsList(fallback);
      modelListFromCache = false;
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
      if (e && String(e.message).includes("INVALID_API_KEY")) {
        pendingRetry = () => runRefineRequest(context, userFollowup);
        return false;
      }
      failHeaderAiNotchRequest();
      renderAiSupplement(itemState.aiSupplementEl, "Не удалось получить ответ от моделей. Попробуйте позже.");
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
        <img src="${imgSrc}" alt="Иконка для ${cat.category}" class="category-icon" />
        <h3 class="category-title">${cat.category}</h3>
      </div>
    `;

    // 3. Прогресс-бар
    const total = cat.items.length;
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
    updateProgress(cat.category, studiedArr.length, unclearArr.length, total);

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
            <img src="${item.avatar}" alt="Аватар ревьюера">
          </a>
        `);
      }

      let authorLinksBlock = '';
      if (authorLinks.length) {
        authorLinksBlock = `<br><br><div class="answer-links">${authorLinks.join('')}</div>`;
      }

      // вставляем в ответ
      textEl.innerHTML = item.answer + authorLinksBlock;
      textEl.setAttribute("data-item-id", item.id);
      enhanceAnswerBlock(textEl);
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
          updateProgress(c, sArr.length, uArr.length, total);
          saveProgressCloud(id, "studied");
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
          updateProgress(c, sArr.length, uArr.length, total);
          saveProgressCloud(id, "unclear");
        }
      });

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
        }
        safeSetItemWithAiEviction(openKey, JSON.stringify(Array.from(openSet)));
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
        inlineStatus: "",
        renderCurrentRuntimeResponse: null,
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
      if (mergedCloudResponses.length && aiSupplementEl) {
        mergedCloudResponses.forEach(resp => state.runtimeResponses.push(resp));
        const savedCursor = readAiResponseCursor(item.id);
        if (savedCursor) {
          const bySignatureIdx = savedCursor.signature
            ? state.runtimeResponses.findIndex((x) =>
                aiSignature(item.id, x.answerType, x.model, x.answer) === savedCursor.signature
              )
            : -1;
          if (bySignatureIdx >= 0) {
            state.runtimeIndex = bySignatureIdx;
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
          const { swipe = null } = options;
          if (!runtimeResponses.length) return;
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
                      renderCurrentRuntimeResponse({ swipe: "prev" });
                    },
                    onNext: () => {
                      runtimeIndex = (runtimeIndex + 1) % runtimeResponses.length;
                      renderCurrentRuntimeResponse({ swipe: "next" });
                    },
                    onDelete: canDeleteCurrent ? removeRuntimeResponse : null
                  }
              : (canDeleteCurrent ? { onDelete: removeRuntimeResponse } : null),
            inlineStatus,
            current?.isPublicShared ? "public" : ""
          );
          writeAiResponseCursor(item.id, runtimeResponses, runtimeIndex);
          if (swipe) animateAiSupplementSwipe(aiSupplementEl, swipe);
        };
        state.renderCurrentRuntimeResponse = renderCurrentRuntimeResponse;
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
          renderCurrentRuntimeResponse(swipe ? { swipe } : {});
          if (delayedFocusMs > 0 && !focus) {
            setTimeout(() => {
              if (!runtimeResponses.length) return;
              const idx = runtimeResponses.findIndex(
                x => x.arrivedAt === resp.arrivedAt && x.answer === resp.answer && x.model === resp.model
              );
              if (idx < 0 || runtimeIndex === idx) return;
              runtimeIndex = idx;
              renderCurrentRuntimeResponse({ swipe: "next" });
            }, delayedFocusMs);
          }
          syncLocalSupplementCache();
        };
        state.pushRuntimeResponse = pushRuntimeResponse;

        aiAppendBtn.addEventListener("click", async () => {
          const canContinue = await ensureAuthForAiAction();
          if (!canContinue) return;
          const preferredModel = getPreferredModel(currentModels);
          aiAppendBtn.disabled = true;
          showHeaderAiNotchProcessing(item.id, { fromPrimaryAiAppend: true });
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
            if (e && String(e.message).includes("INVALID_API_KEY")) {
              pendingRetry = executeRequest;
              return;
            }
            failHeaderAiNotchRequest();
            renderAiSupplement(aiSupplementEl, "Не удалось получить ответ от моделей. Попробуйте позже.");
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

  if (authUser) {
    syncLocalAndCloudState({ force: false, source: "post-render" }).catch((e) => {
      console.warn("Post-render cloud sync failed", e);
    });
  }

  // --- Поиск/фильтрация ---
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const has  = term.length > 0;
    document.querySelectorAll("#accordion-container .t-item").forEach(item => {
      const q = item.querySelector(".t849__title").textContent.toLowerCase();
      const a = item.querySelector(".t849__text").textContent.toLowerCase();
      const match = !term || q.includes(term) || a.includes(term);
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

    if (!has) {
      const selectedFilter = localStorage.getItem("selectedFilter") || "Все";
      if (selectedFilter !== "Все") {
        const selectedKey = normalizeCategoryKey(selectedFilter);
        document.querySelectorAll("#accordion-container .article").forEach(section => {
          const sectionKey = section.dataset.categoryKey || normalizeCategoryKey(section.querySelector(".category-title")?.textContent || "");
          section.style.display = sectionKey === selectedKey ? "" : "none";
        });
      }
    }
  });

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

    loadModels().then(() => {
      ensureModelPreflightInBackground();
      if (!shouldWarmup()) return;
      let hasClicked = false;
      let hasScrolledToFirst = false;
      const firstQuestion = document.querySelector("#accordion-container .t-item");

      const checkScroll = () => {
        if (!firstQuestion) return;
        const rect = firstQuestion.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.85) {
          hasScrolledToFirst = true;
          tryStartWarmup();
        }
      };

      const tryStartWarmup = () => {
        if (hasClicked && hasScrolledToFirst && shouldWarmup()) {
          ensureModelPreflightInBackground();
          window.removeEventListener("scroll", checkScroll);
          window.removeEventListener("resize", checkScroll);
        }
      };

      document.addEventListener("click", () => {
        hasClicked = true;
        tryStartWarmup();
      }, { once: true });

      window.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      checkScroll();
      restoreScrollPosition();
    });
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

// --- Rotating logo/favicons (вне DOMContentLoaded) ---
(function() {
  const imgs = [
    'img/QAtoDev_(Flappy_Bird_style).png',
    'img/QAtoDev_Classic.png',
    'img/QAtoDev_new_year.png',
    'img/QAtoDev_DayQA.png',
    'img/QAtoDev_Halloween.png',
    'img/QAtoDev_BlackAndWhite.png',
    'img/QAtoDev_CoverChatChannel.png'
  ];
  let idx = parseInt(localStorage.getItem('logoIdx'), 10);
  if (isNaN(idx) || idx<0 || idx>=imgs.length) idx = 0;
  const logoImg    = document.querySelector('.logo img');
  const faviconTag = document.querySelector('link[rel="icon"]');
  function updateLogo() {
    const src = imgs[idx];
    if (logoImg)    logoImg.src    = src;
    if (faviconTag) faviconTag.href = src;
  }
  updateLogo();
  setInterval(() => {
    idx = (idx + 1) % imgs.length;
    localStorage.setItem('logoIdx', idx);
    updateLogo();
  }, 50000);
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
  const searchInputEl = document.getElementById('search-input');
  if (!categoryFilters) return;
  const filterChips = categoryFilters.querySelectorAll('.filter-chip');
  const bottomChips = [];

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

  // Модифицированная функция фильтрации
  function applyCategoryFilter(category) {
    const sections = document.querySelectorAll('#accordion-container .article');
    const wanted = normalizeCategoryKeyLocal(category);

    sections.forEach(section => {
      const sectionTitle = section.querySelector('.category-title')?.textContent || "";
      const sectionKey = section.dataset.categoryKey || normalizeCategoryKeyLocal(sectionTitle);
      section.style.display = (wanted === "ALL" || sectionKey === wanted) ? '' : 'none';
    });
  }

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

  // Инициализация после полной загрузки
  restoreFilterState();

  // Показ нижней панели: скрываем только когда верхние чипы реально видны пользователю
  if (categoryFiltersBottom && categoryFilters) {
    const headerOffset = 120; // высота фиксированного хедера
    const updateBottomVisibility = () => {
      const rect = categoryFilters.getBoundingClientRect();
      const fullyVisible =
        rect.top >= headerOffset &&
        rect.bottom <= window.innerHeight;
      categoryFiltersBottom.classList.toggle('visible', !fullyVisible);
    };
    window.addEventListener('scroll', updateBottomVisibility, { passive: true });
    window.addEventListener('resize', updateBottomVisibility);
    updateBottomVisibility();
  }
});
