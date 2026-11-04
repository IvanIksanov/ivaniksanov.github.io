document.addEventListener("DOMContentLoaded", () => {
  const categoryFilters = document.getElementById("category-filters");
  const badgeCategory = document.getElementById("badge-category");
  const counterEl = document.getElementById("counter");
  const questionTitleEl = document.getElementById("question-title");
  const answerEl = document.getElementById("answer");
  const toggleAnswerBtn = document.getElementById("toggle-answer");
  const skipBtn = document.getElementById("skip-btn");
  const acceptBtn = document.getElementById("accept-btn");
  const stageEl = document.getElementById("stage");
  const micIndicator = document.getElementById("interview-mic");
  const micHint = document.getElementById("interview-mic-hint");
  const voiceModeBtn = document.querySelector('[data-interview-mode="voice"]');
  const voiceNote = document.getElementById("interview-voice-note");
  const settingsWrap = document.getElementById("interview-settings-wrap");
  const settingsBtn = document.getElementById("interview-settings-btn");
  const settingsBtnLabel = document.getElementById("interview-settings-btn-label");
  const historyBtn = document.getElementById("interview-history-btn");
  const historyDialog = document.getElementById("interview-history");
  const historyList = document.getElementById("interview-history-list");
  const historyHint = document.getElementById("interview-history-hint");
  const historyLocalNote = document.getElementById("interview-history-local-note");
  const historyCloseBtn = document.getElementById("interview-history-close");
  const timerEl = document.getElementById("interview-timer");
  const timerFill = document.getElementById("interview-timer-fill");
  const timerLabel = document.getElementById("interview-timer-label");
  const setupDialog = document.getElementById("interview-setup");
  const setupStartBtn = document.getElementById("interview-setup-start");
  const setupCategoryNote = document.getElementById("interview-setup-category-note");
  const setupCancelBtn = document.getElementById("interview-setup-cancel");
  const setupCloseBtn = document.getElementById("interview-setup-close");
  const setupVoiceOptions = document.getElementById("interview-voice-options");
  const setupModeButtons = Array.from(document.querySelectorAll("[data-interview-mode]"));
  const setupVoiceButtons = Array.from(document.querySelectorAll("[data-voice-seconds]"));

  if (!categoryFilters || !questionTitleEl || !answerEl || !toggleAnswerBtn || !skipBtn || !acceptBtn
    || !settingsWrap || !settingsBtn || !settingsBtnLabel || !timerEl || !timerFill || !timerLabel
    || !micIndicator || !micHint || !voiceModeBtn || !voiceNote
    || !historyBtn || !historyDialog || !historyList || !historyHint || !historyLocalNote || !historyCloseBtn
    || !setupDialog || !setupStartBtn || !setupCategoryNote || !setupCancelBtn || !setupCloseBtn
    || !setupVoiceOptions) return;

  const PUBLIC_AI_APPEND_CACHE_KEY = "public_ai_append_cache_v1";
  const PUBLIC_AI_APPEND_CACHE_TTL_MS = 10 * 60 * 1000;
  const INTERVIEW_AI_LOCAL_PREFIX = "interview_ai_local_";
  const INTERVIEW_PROGRESS_PREFIX = "interview_progress_";
  const INTERVIEW_SELECTED_CATEGORIES_KEY = "interview_selected_categories";
  const INTERVIEW_SESSION_STATE_KEY = "interview_session_state_v1";
  const INTERVIEW_SCROLL_STATE_KEY = "interview_scroll_state_v1";
  const INTERVIEW_HISTORY_KEY = "interview_history_v1";
  const INTERVIEW_HISTORY_LIMIT = 50;
  const INTERVIEW_HISTORY_TABLE = "interview_history";
  const INTERVIEW_HISTORY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
  const INTERVIEW_HISTORY_SYNC_TS_KEY = "interview_history_sync_ts_v1";
  const INTERVIEW_MODE_KEY = "interview_mode_v1";
  const INTERVIEW_TIMER_SECONDS_KEY = "interview_timer_seconds_v1";
  const INTERVIEW_VOICE_SECONDS_KEY = "interview_voice_seconds_v1";
  const INTERVIEW_TIMER_STEPS = [15, 30, 60];
  const VOICE_TIMER_STEPS = [45, 60];
  const VOICE_POOL_LIMIT = 10;
  const MIN_SPEECH_RMS = 0.008;
  const VOICED_RMS = 0.012;
  const MIN_SPEECH_MS = 450;
  const SUPABASE_URL_DIRECT = "https://mbebpfbmnojlaggdroum.supabase.co";
  const SUPABASE_FUNCTIONS_BASE_DIRECT = "https://mbebpfbmnojlaggdroum.functions.supabase.co";
  const SUPABASE_ANON_KEY_DIRECT = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
  const DEFAULT_MODEL = "openai/gpt-oss-20b";
  const QUESTIONS_DATA_URL = "over/questions_db_snapshot.json";
  const INTERVIEW_POOL_LIMIT = 25;
  const DEFAULT_PHOTO = { src: "img/cover/call_mock.png", alt: "Окно тренировочного созвона" };
  const RESULT_PHOTOS = {
    good: { src: "img/cover/call_mock_good.png", alt: "Хороший результат собеседования" },
    "so-so": { src: "img/cover/call_mock_so_so.png", alt: "Средний результат собеседования" },
    bad: { src: "img/cover/call_mock_bad.png", alt: "Слабый результат собеседования" },
    neutral: { src: "img/cover/call_mock_so_so.png", alt: "Собеседование завершено" }
  };

  // Canonical directions and labels, mirrored from questions.html.
  const CATEGORY_DEFS = [
    { key: "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ", label: "Теория" },
    { key: "WEB", label: "Web" },
    { key: "API", label: "API" },
    { key: "БАЗЫ ДАННЫХ", label: "Базы данных" },
    { key: "GIT + IDE + SELENIUM", label: "Git + IDE" },
    { key: "DEVOPS", label: "DevOps" },
    { key: "AQA Java", label: "Java" },
    { key: "AQA Python", label: "Python" },
    { key: "AQA JS", label: "JS" }
  ];
  const CATEGORY_LABELS = new Map(CATEGORY_DEFS.map(({ key, label }) => [key, label]));
  const CATEGORY_RANK = new Map(CATEGORY_DEFS.map(({ key }, index) => [key, index]));
  const DEFAULT_CATEGORY = CATEGORY_DEFS[0].key;
  const EXCLUDED_CATEGORY = "Вопросы к руководителю | команде | HR";
  const CATEGORY_ALIASES = new Map();
  CATEGORY_DEFS.forEach(({ key, label }) => {
    CATEGORY_ALIASES.set(key.toUpperCase(), key);
    CATEGORY_ALIASES.set(label.toUpperCase(), key);
  });
  [
    ["БД", "БАЗЫ ДАННЫХ"],
    ["GIT", "GIT + IDE + SELENIUM"],
    ["HR", EXCLUDED_CATEGORY],
    ["ВОПРОСЫ К РУКОВОДИТЕЛЮ | КОМАНДЕ | HR", EXCLUDED_CATEGORY]
  ].forEach(([alias, key]) => CATEGORY_ALIASES.set(alias, key));

  let allCategories = [];
  let allItems = [];
  let selectedCategories = new Set();
  let currentQuestion = null;
  let interviewPool = [];
  let interviewIndex = 0;
  let interviewStarted = true;
  let interviewFinished = false;
  let acceptedCount = 0;
  let skippedCount = 0;
  let roundStats = new Map();
  let roundAnswers = [];
  let roundId = "";
  let historyResumeTimer = false;
  let historySyncPromise = null;
  let historySyncTimer = 0;
  let historySyncQueued = false;
  let historyNoteToken = 0;
  let publicAiMap = new Map();
  let publicAiSnapshotMap = null;
  let publicAiSnapshotPromise = null;
  const aiStateByQuestion = new Map();
  let pendingRestoreAnswerExpanded = false;
  let interviewScrollSaveRaf = 0;
  let interviewMode = "manual";
  let setupMode = "manual";
  let setupCategories = new Set();
  let timerSeconds = 15;
  let setupTimerSeconds = 15;
  let timerDeadline = 0;
  let timerRemainingMs = 0;
  let timerFrame = 0;
  let timerPaused = false;
  let timerPausedByVisibility = false;
  let timerLabelValue = "";
  let voiceSeconds = 45;
  let setupVoiceSeconds = 45;
  let voiceStream = null;
  let voiceStreamPromise = null;
  let voiceStreamToken = 0;
  let voiceRecorder = null;
  let voiceRecorderReady = null;
  let voiceCaptureToken = 0;
  let voiceRecording = false;
  let voiceAnswerCommitted = false;
  let voiceQuestionStartedAt = 0;
  let voiceUploads = new Map();
  let voiceLevelContext = null;
  let voiceLevelSource = null;
  let voiceLevelAnalyser = null;
  let voiceLevelData = null;
  let voiceLevelFrame = 0;
  let voiceLevelStream = null;
  let voicePeakRms = 0;
  let voiceLevelFrames = 0;
  let voiceVoicedMs = 0;
  let voiceLastLevelAt = 0;
  let micPermissionGranted = false;
  let micHintTimer = 0;
  let voiceReport = null;
  let voiceAnalysisRunning = false;
  let voiceAnalysisToken = 0;
  let voiceAnalysisDone = 0;
  let voiceAnalysisTotal = 0;
  let voiceSupport = { supported: false, mobile: false, secure: false };

  const aiZone = document.createElement("div");
  aiZone.className = "interview-ai-zone";
  aiZone.innerHTML = `
    <div class="interview-ai-actions">
      <button type="button" id="interview-ai-append-btn" class="ai-append-btn">Дополнить ответ от ИИ</button>
    </div>
    <div id="interview-ai-supplement" class="ai-supplement" style="display:none;"></div>
  `;
  answerEl.insertAdjacentElement("afterend", aiZone);
  const aiAppendBtn = aiZone.querySelector("#interview-ai-append-btn");
  const aiSupplementEl = aiZone.querySelector("#interview-ai-supplement");
  const photoImage = document.querySelector("#question-photo img");
  let photoSwapTimer = 0;
  if (photoImage) {
    const usePhotoFallback = () => {
      if (photoImage.dataset.fallback === "true") return;
      photoImage.dataset.fallback = "true";
      photoImage.src = "img/call-cats2.jpeg";
    };
    photoImage.addEventListener("error", usePhotoFallback, { once: true });
    if (photoImage.complete && photoImage.naturalWidth === 0) usePhotoFallback();
  }

  function setQuestionPhoto(photo) {
    if (!photoImage || !photo?.src) return;
    if (photoImage.getAttribute("src") === photo.src) {
      if (photo.alt) photoImage.alt = photo.alt;
      return;
    }
    window.clearTimeout(photoSwapTimer);
    if (document.documentElement.classList.contains("is-interview-booting")) {
      photoImage.classList.remove("is-swapping");
      photoImage.src = photo.src;
      if (photo.alt) photoImage.alt = photo.alt;
      return;
    }
    photoImage.classList.add("is-swapping");
    photoSwapTimer = window.setTimeout(() => {
      photoImage.src = photo.src;
      if (photo.alt) photoImage.alt = photo.alt;
      requestAnimationFrame(() => photoImage.classList.remove("is-swapping"));
    }, 160);
  }

  function canonicalCategory(category) {
    const value = String(category || "").replace(/\s+/g, " ").trim();
    if (!value) return "";
    return CATEGORY_ALIASES.get(value.toUpperCase()) || value;
  }

  function readInterviewSessionState() {
    try {
      const raw = localStorage.getItem(INTERVIEW_SESSION_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.poolIds)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeInterviewSessionState() {
    try {
      const timerActive = (interviewMode === "timer" || interviewMode === "voice") && interviewStarted && !interviewFinished;
      const timerRemaining = timerActive
        ? (timerPaused ? timerRemainingMs : Math.max(0, timerDeadline - performance.now()))
        : 0;
      const state = {
        ts: Date.now(),
        selectedCategories: Array.from(selectedCategories || []),
        poolIds: (interviewPool || []).map((q) => q?.id).filter(Boolean),
        index: Math.max(0, Number(interviewIndex) || 0),
        interviewStarted: !!interviewStarted,
        interviewFinished: !!interviewFinished,
        acceptedCount: Math.max(0, Number(acceptedCount) || 0),
        skippedCount: Math.max(0, Number(skippedCount) || 0),
        roundStats: Object.fromEntries(roundStats),
        roundId,
        roundAnswers,
        mode: interviewMode,
        timerSeconds,
        voiceSeconds,
        voiceReport,
        timerRemainingMs: Math.round(timerRemaining),
        timerSavedAt: Date.now(),
        timerPaused: timerActive ? !!timerPaused : false,
        answerExpanded: toggleAnswerBtn?.getAttribute("aria-expanded") === "true"
      };
      localStorage.setItem(INTERVIEW_SESSION_STATE_KEY, JSON.stringify(state));
    } catch {}
  }

  function buildPoolFromIds(ids) {
    const byId = new Map((allItems || []).map((item) => [item.id, item]));
    const pool = [];
    (ids || []).forEach((id) => {
      const item = byId.get(id);
      if (item) pool.push(item);
    });
    return pool;
  }

  function restoreInterviewSessionStateIfPossible({ useSessionCategories = false } = {}) {
    const saved = readInterviewSessionState();
    if (!saved || !Array.isArray(saved.poolIds) || !saved.poolIds.length) return false;
    if (useSessionCategories && Array.isArray(saved.selectedCategories)) {
      const savedCategories = [...new Set(saved.selectedCategories.map(canonicalCategory))]
        .filter((category) => allCategories.includes(category));
      if (savedCategories.length) selectedCategories = new Set(savedCategories);
    }
    const poolFromIds = buildPoolFromIds(saved.poolIds);
    const restoredPool = poolFromIds.filter((item) => selectedCategories.has(item.category));
    // Never resume a pool that contains questions from directions the user
    // has not selected: rebuild a clean pool instead.
    if (!restoredPool.length || restoredPool.length !== poolFromIds.length) return false;
    interviewPool = restoredPool;
    interviewIndex = Math.max(0, Math.min(Number(saved.index) || 0, restoredPool.length - 1));
    interviewStarted = !!saved.interviewStarted;
    interviewFinished = !!saved.interviewFinished;
    acceptedCount = Math.max(0, Number(saved.acceptedCount) || 0);
    skippedCount = Math.max(0, Number(saved.skippedCount) || 0);
    roundStats = new Map();
    if (saved.roundStats && typeof saved.roundStats === "object" && !Array.isArray(saved.roundStats)) {
      Object.entries(saved.roundStats).forEach(([category, stats]) => {
        const key = canonicalCategory(category);
        if (!key) return;
        roundStats.set(key, {
          accepted: Math.max(0, Number(stats?.accepted) || 0),
          skipped: Math.max(0, Number(stats?.skipped) || 0)
        });
      });
    }
    roundId = typeof saved.roundId === "string" && saved.roundId ? saved.roundId : newRoundId();
    voiceUploads = new Map();
    roundAnswers = Array.isArray(saved.roundAnswers)
      ? saved.roundAnswers
        .filter((answer) => answer?.id && answer?.title)
        .map((answer) => ({
          id: String(answer.id),
          title: String(answer.title),
          category: canonicalCategory(answer.category),
          status: answer.status === "skipped" ? "skipped" : "accepted",
          transcript: String(answer.transcript || "").slice(0, 3000),
          durationSeconds: Math.max(0, Number(answer.durationSeconds) || 0),
          analysis: normalizeVoiceAnalysis(answer.analysis),
          shortAnswer: !!answer.shortAnswer,
          echoQuestion: !!answer.echoQuestion
        }))
      : [];
    if (saved.mode === "manual" || (saved.mode === "voice" && voiceSupport.supported)) {
      interviewMode = saved.mode;
    }
    const savedTimerSeconds = Number(saved.timerSeconds);
    if (INTERVIEW_TIMER_STEPS.includes(savedTimerSeconds)) timerSeconds = savedTimerSeconds;
    const savedVoiceSeconds = Number(saved.voiceSeconds);
    if (VOICE_TIMER_STEPS.includes(savedVoiceSeconds)) voiceSeconds = savedVoiceSeconds;
    voiceReport = isValidVoiceReport(saved.voiceReport) ? saved.voiceReport : null;
    voiceAnalysisRunning = false;
    if (!voiceReport && interviewFinished && interviewMode === "voice") {
      const stored = readInterviewHistory().find(entry => entry.id === roundId);
      if (isValidVoiceReport(stored?.report)) voiceReport = stored.report;
    }
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
    setupVoiceSeconds = voiceSeconds;
    setupCategories = new Set(selectedCategories);
    persistSelectedCategories();
    syncChipActiveState();
    const savedTimerRemaining = Number(saved.timerRemainingMs);
    const savedTimerSavedAt = Number(saved.timerSavedAt);
    let restoredTimerRemaining = 0;
    if ((interviewMode === "timer" || interviewMode === "voice") && interviewStarted && !interviewFinished) {
      const totalMs = (interviewMode === "voice" ? voiceSeconds : timerSeconds) * 1000;
      if (Number.isFinite(savedTimerRemaining) && savedTimerRemaining >= 0) {
        restoredTimerRemaining = saved.timerPaused
          ? savedTimerRemaining
          : Math.max(0, savedTimerRemaining - Math.max(0, Date.now() - (Number.isFinite(savedTimerSavedAt) ? savedTimerSavedAt : Date.now())));
      } else {
        restoredTimerRemaining = totalMs;
      }
      if (restoredTimerRemaining <= 0) restoredTimerRemaining = totalMs;
      restoredTimerRemaining = Math.min(restoredTimerRemaining, totalMs);
    }
    pendingRestoreAnswerExpanded = !!saved.answerExpanded;
    if (interviewFinished) {
      finishInterview();
    } else {
      renderCard();
      if (!interviewStarted) {
        openSetupDialog({ allowCancel: false });
      } else if (interviewMode === "timer" || interviewMode === "voice") {
        pauseTimer();
        timerRemainingMs = restoredTimerRemaining;
        timerPaused = true;
        setTimerVisual(timerRemainingMs);
        openSetupDialog({ allowCancel: true });
      } else if (pendingRestoreAnswerExpanded && currentQuestion && toggleAnswerBtn && !toggleAnswerBtn.disabled) {
        answerEl.hidden = false;
        toggleAnswerBtn.setAttribute("aria-expanded", "true");
        toggleAnswerBtn.textContent = "Скрыть ответ";
        aiZone.style.display = "";
        refreshAiForCurrentQuestion();
      }
    }
    writeInterviewSessionState();
    return true;
  }

  function writeInterviewScrollState() {
    try {
      localStorage.setItem(INTERVIEW_SCROLL_STATE_KEY, JSON.stringify({
        path: window.location.pathname,
        y: Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0)),
        ts: Date.now()
      }));
    } catch {}
  }

  function queueInterviewScrollSave() {
    if (interviewScrollSaveRaf) return;
    interviewScrollSaveRaf = requestAnimationFrame(() => {
      interviewScrollSaveRaf = 0;
      writeInterviewScrollState();
    });
  }

  function revealInterviewPage() {
    document.documentElement.classList.remove("is-interview-booting");
  }

  function restoreInterviewScrollState() {
    try {
      const raw = localStorage.getItem(INTERVIEW_SCROLL_STATE_KEY);
      if (!raw) {
        revealInterviewPage();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.path !== window.location.pathname) {
        revealInterviewPage();
        return;
      }
      const y = Math.max(0, Number(parsed.y) || 0);
      let revealed = false;
      const finish = () => {
        if (revealed) return;
        revealed = true;
        window.scrollTo(0, y);
        revealInterviewPage();
      };
      window.scrollTo(0, y);
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        requestAnimationFrame(finish);
      });
      window.setTimeout(finish, 120);
    } catch {
      revealInterviewPage();
    }
  }

  function chipLabel(category) {
    return CATEGORY_LABELS.get(category) || category;
  }

  function isExcludedCategory(category) {
    return canonicalCategory(category) === EXCLUDED_CATEGORY;
  }

  const EXCLUDED_ITEM_IDS = new Set(["accordion_theory_q54"]);
  const EXCLUDED_ITEM_TITLES = new Set(["вопросы на софты без конкретного ответа"]);

  function isExcludedItem(item) {
    const id = String(item?.id || "").trim();
    const title = String(item?.title || "").replace(/\s+/g, " ").trim().toLowerCase();
    return EXCLUDED_ITEM_IDS.has(id) || EXCLUDED_ITEM_TITLES.has(title);
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function detectVoiceSupport() {
    const ua = navigator.userAgent || "";
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|CriOS|FxiOS|EdgiOS/i.test(ua)
      || navigator.userAgentData?.mobile === true;
    const secure = window.isSecureContext !== false;
    const mediaDevices = !!(navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === "function");
    const mediaRecorder = typeof window.MediaRecorder === "function";
    return { supported: secure && mediaDevices && mediaRecorder, mobile, secure, mediaDevices, mediaRecorder };
  }

  function applyVoiceSupportUi() {
    voiceSupport = detectVoiceSupport();
    if (voiceSupport.supported) {
      micIndicator.disabled = false;
      voiceNote.hidden = true;
      voiceModeBtn.classList.remove("is-disabled");
      voiceModeBtn.removeAttribute("aria-disabled");
      return;
    }
    micIndicator.disabled = true;
    setMicIndicatorError("Микрофон недоступен в этом браузере");
    voiceNote.hidden = false;
    voiceNote.textContent = !voiceSupport.secure
      ? "Для записи голоса откройте сайт по HTTPS."
      : !voiceSupport.mediaDevices
        ? "Браузер не даёт доступ к микрофону. Попробуйте Chrome, Safari или Firefox."
        : "Браузер не поддерживает запись аудио. Обновите браузер.";
    voiceModeBtn.classList.add("is-disabled");
    voiceModeBtn.setAttribute("aria-disabled", "true");
  }

  function setMicButton({ on, ready = false, live = false, error = false, title }) {
    micIndicator.classList.toggle("is-on", on);
    micIndicator.classList.toggle("is-off", !on && !ready);
    micIndicator.classList.toggle("is-ready", !on && ready);
    micIndicator.classList.toggle("is-live", on && live);
    micIndicator.classList.toggle("is-error", error);
    micIndicator.setAttribute("aria-pressed", String(on));
    micIndicator.removeAttribute("aria-disabled");
    micIndicator.setAttribute("aria-label", title);
    if (!on || !live) {
      micIndicator.style.setProperty("--mic-scale", "1");
      micIndicator.style.setProperty("--mic-glow", "0");
    }
  }

  function showMicHint(text) {
    if (!text) return;
    micHint.textContent = text;
    micHint.hidden = false;
    window.clearTimeout(micHintTimer);
    micHintTimer = window.setTimeout(() => {
      micHint.hidden = true;
    }, 5000);
  }

  function hideMicHint() {
    window.clearTimeout(micHintTimer);
    micHintTimer = 0;
    micHint.hidden = true;
  }

  function setMicIndicatorLive() {
    hideMicHint();
    setMicButton({ on: true, live: true, title: "Микрофон включён, идёт запись" });
  }

  function setMicIndicatorIdle(title = "Микрофон включён") {
    setMicButton({ on: true, title });
  }

  function setMicIndicatorError(title) {
    setMicButton({ on: false, error: true, title });
  }

  function setMicIndicatorOff(title = "Микрофон выключен") {
    setMicButton({ on: false, title });
  }

  function setMicIndicatorReady(title = "Разрешение на микрофон есть. Он понадобится в голосовом собеседовании.") {
    setMicButton({ on: false, ready: true, title });
  }

  function hideMicIndicator() {
    if (micPermissionGranted && voiceSupport.supported) setMicIndicatorReady();
    else setMicIndicatorOff();
    hideMicHint();
    stopVoiceLevelAnimation();
  }

  async function detectMicPermission() {
    if (!voiceSupport.supported || !navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: "microphone" });
      const apply = () => {
        if (voiceRecording || (voiceStream && voiceStream.active)) return;
        if (status.state === "granted") {
          micPermissionGranted = true;
          setMicIndicatorReady();
        } else if (status.state === "denied") {
          micPermissionGranted = false;
          setMicIndicatorError("Доступ к микрофону запрещён");
        } else {
          micPermissionGranted = false;
          setMicIndicatorOff();
        }
      };
      apply();
      status.onchange = apply;
    } catch {}
  }

  const ASR_CREDIT_MARKER = /(редактор\s+субтитров|корректор\s*:?\s*[А-ЯЁA-Z]|субтитры\s+(?:подготовлены|сделаны|созданы|переведены))/i;

  const ASR_ARTIFACT_PATTERNS = [
    /рекомендуемые\s+данные[^\n]*/gi,
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /продолжение\s+следует[.!…]*/gi,
    /подписывайтесь\s+на\s+канал[^.!?\n]*/gi,
    /спасибо\s+за\s+внимание[.!?]*/gi,
    /до\s+новых\s+встреч[.!?]*/gi
  ];

  function sanitizeTranscript(value) {
    let text = String(value || "");
    const creditIndex = text.search(ASR_CREDIT_MARKER);
    if (creditIndex >= 0) text = text.slice(0, creditIndex);
    ASR_ARTIFACT_PATTERNS.forEach((pattern) => {
      text = text.replace(pattern, " ");
    });
    return text.replace(/\s{2,}/g, " ").trim();
  }

  function isShortTranscript(value) {
    const text = sanitizeTranscript(value);
    if (!text) return true;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 4 || text.length < 18) return true;
    const normalized = text.toLowerCase().replace(/[.,!?…]/g, " ").replace(/\s+/g, " ").trim();
    return /^(не знаю|не помню|не уверен|не уверена|сложно сказать|затрудняюсь ответить|не могу ответить)(?:\s|$)/.test(normalized);
  }

  function wordsForEcho(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 2);
  }

  function isQuestionEcho(answer, question) {
    const answerWords = wordsForEcho(answer);
    const questionWords = wordsForEcho(question);
    if (answerWords.length < 3 || questionWords.length < 3) return false;
    const questionSet = new Set(questionWords);
    const overlap = answerWords.filter((word) => questionSet.has(word)).length;
    const ratio = overlap / answerWords.length;
    return ratio >= 0.75 && answerWords.length <= questionWords.length + 4;
  }

  function voiceMicErrorMessage(error) {
    const name = String(error?.name || "");
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "Разрешите доступ к микрофону в настройках браузера и попробуйте снова.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "Микрофон не найден. Подключите его и попробуйте снова.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Микрофон занят другим приложением. Освободите его и попробуйте снова.";
    }
    return "Не удалось включить микрофон. Проверьте разрешение и попробуйте снова.";
  }

  function stopVoiceLevelAnimation() {
    if (voiceLevelFrame) cancelAnimationFrame(voiceLevelFrame);
    voiceLevelFrame = 0;
    micIndicator.style.setProperty("--mic-scale", "1");
    micIndicator.style.setProperty("--mic-glow", "0");
  }

  function releaseVoiceLevel() {
    stopVoiceLevelAnimation();
    try { voiceLevelSource?.disconnect(); } catch {}
    try { voiceLevelContext?.close(); } catch {}
    voiceLevelSource = null;
    voiceLevelContext = null;
    voiceLevelAnalyser = null;
    voiceLevelData = null;
    voiceLevelStream = null;
  }

  function ensureVoiceLevel(stream) {
    if (voiceLevelContext && voiceLevelStream === stream && voiceLevelAnalyser) return true;
    releaseVoiceLevel();
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    try {
      const context = new AudioCtor();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      voiceLevelContext = context;
      voiceLevelSource = source;
      voiceLevelAnalyser = analyser;
      voiceLevelData = new Uint8Array(analyser.fftSize);
      voiceLevelStream = stream;
      if (context.state === "suspended") context.resume().catch(() => {});
      return true;
    } catch {
      releaseVoiceLevel();
      return false;
    }
  }

  function tickVoiceLevel() {
    if (!voiceRecording || !voiceLevelAnalyser || !voiceLevelData) {
      voiceLevelFrame = 0;
      return;
    }
    voiceLevelAnalyser.getByteTimeDomainData(voiceLevelData);
    let sum = 0;
    for (let i = 0; i < voiceLevelData.length; i += 1) {
      const value = (voiceLevelData[i] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / voiceLevelData.length);
    const now = performance.now();
    if (voiceLastLevelAt) {
      const delta = Math.min(100, Math.max(0, now - voiceLastLevelAt));
      if (rms > VOICED_RMS) voiceVoicedMs += delta;
    }
    voiceLastLevelAt = now;
    voiceLevelFrames += 1;
    voicePeakRms = Math.max(voicePeakRms, rms);
    const level = Math.min(1, Math.max(0, (rms - 0.015) * 7));
    micIndicator.style.setProperty("--mic-scale", String(1 + level * 0.45));
    micIndicator.style.setProperty("--mic-glow", String(level));
    voiceLevelFrame = requestAnimationFrame(tickVoiceLevel);
  }

  function startVoiceLevel(stream) {
    if (!stream || !ensureVoiceLevel(stream)) return;
    if (voiceLevelFrame) cancelAnimationFrame(voiceLevelFrame);
    voiceLastLevelAt = 0;
    voiceLevelFrame = requestAnimationFrame(tickVoiceLevel);
  }

  function normalizeVoiceAnalysis(raw) {
    if (!raw || typeof raw !== "object") return null;
    const rawScore = raw.score;
    const score = rawScore === null || rawScore === undefined || rawScore === "" ? NaN : Number(rawScore);
    const verdicts = new Set(["good", "partial", "weak", "skipped", "unknown"]);
    const list = (value) => (Array.isArray(value)
      ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
      : []);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
      verdict: verdicts.has(raw.verdict) ? raw.verdict : "unknown",
      summary: String(raw.summary || "").slice(0, 600),
      strengths: list(raw.strengths),
      gaps: list(raw.gaps),
      improvedAnswer: String(raw.improvedAnswer || "").slice(0, 1200),
      cleanedAnswer: String(raw.cleanedAnswer || "").slice(0, 1200)
    };
  }

  function voiceSkippedAnalysis() {
    return { score: null, verdict: "skipped", summary: "Вопрос пропущен.", strengths: [], gaps: [], improvedAnswer: "" };
  }

  function voiceFailureAnalysis(message) {
    return {
      score: null,
      verdict: "unknown",
      summary: String(message || "Не удалось распознать ответ.").slice(0, 600),
      strengths: [],
      gaps: [],
      improvedAnswer: ""
    };
  }

  function ensureVoiceStream() {
    if (voiceStream && voiceStream.active) return Promise.resolve(voiceStream);
    if (voiceStreamPromise) return voiceStreamPromise;
    const token = voiceStreamToken;
    const promise = navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }).then((stream) => {
      if (token !== voiceStreamToken) {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        throw new Error("voice_stream_released");
      }
      voiceStream = stream;
      return stream;
    }).finally(() => {
      if (voiceStreamPromise === promise) voiceStreamPromise = null;
    });
    voiceStreamPromise = promise;
    return promise;
  }

  function releaseVoiceStream() {
    voiceStreamToken += 1;
    voiceStreamPromise = null;
    voiceRecorderReady = null;
    releaseVoiceLevel();
    const stream = voiceStream;
    voiceStream = null;
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
  }

  function pickVoiceMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    if (typeof window.MediaRecorder?.isTypeSupported !== "function") return "";
    return candidates.find((type) => {
      try { return window.MediaRecorder.isTypeSupported(type); } catch { return false; }
    }) || "";
  }

  function createVoiceRecorder(stream) {
    const mimeType = pickVoiceMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      // 64 kbps mono Opus/AAC достаточно для речи и вдвое уменьшает upload.
      audioBitsPerSecond: 64000
    });
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });
    recorder.voiceChunks = chunks;
    recorder.addEventListener("error", (event) => {
      console.warn("Voice recorder error", event?.error || event);
      voiceRecording = false;
      setMicIndicatorError("Ошибка записи");
      stopVoiceLevelAnimation();
    });
    return recorder;
  }

  async function beginVoiceQuestion() {
    if (!voiceSupport.supported || interviewMode !== "voice" || interviewFinished) return;
    const token = ++voiceCaptureToken;
    voiceRecording = true;
    voiceAnswerCommitted = false;
    voiceRecorder = null;
    voiceQuestionStartedAt = performance.now();
    voicePeakRms = 0;
    voiceLevelFrames = 0;
    voiceVoicedMs = 0;
    voiceLastLevelAt = 0;
    if (!(voiceStream && voiceStream.active)) {
      setMicIndicatorOff("Запрашиваю доступ к микрофону");
    }

    voiceRecorderReady = (async () => {
      let stream;
      try {
        stream = await ensureVoiceStream();
      } catch (error) {
        if (token === voiceCaptureToken) {
          voiceRecording = false;
          setMicIndicatorError(voiceMicErrorMessage(error));
        }
        return null;
      }
      if (token !== voiceCaptureToken || !voiceRecording || interviewFinished) return null;
      const recorder = createVoiceRecorder(stream);
      voiceRecorder = recorder;
      try {
        recorder.start(1000);
      } catch (error) {
        voiceRecorder = null;
        voiceRecording = false;
        setMicIndicatorError("Не удалось начать запись");
        return null;
      }
      if (token === voiceCaptureToken) {
        setMicIndicatorLive();
        startVoiceLevel(stream);
      }
      return recorder;
    })();
    return voiceRecorderReady;
  }

  function pauseVoiceRecording() {
    if (!voiceRecording) return;
    voiceRecording = false;
    try {
      if (voiceRecorder?.state === "recording") voiceRecorder.pause();
    } catch {}
    stopVoiceLevelAnimation();
    setMicIndicatorIdle("Запись приостановлена");
  }

  function resumeVoiceRecording() {
    if (!voiceSupport.supported || interviewMode !== "voice" || !interviewStarted || interviewFinished) return;
    if (voiceRecording) return;
    if (!voiceRecorder) return;
    voiceRecording = true;
    if (voiceRecorder.state === "paused") {
      try { voiceRecorder.resume(); } catch {}
      setMicIndicatorLive();
      startVoiceLevel(voiceStream);
      return;
    }
    if (voiceRecorder.state === "inactive") beginVoiceQuestion();
  }

  async function stopVoiceCapture({ discard = false } = {}) {
    voiceRecording = false;
    const ready = voiceRecorderReady;
    let recorder = voiceRecorder;
    voiceRecorder = null;
    voiceRecorderReady = null;
    if (!recorder && ready) {
      try { recorder = await ready; } catch { recorder = null; }
    }
    if (!recorder) return null;

    return new Promise((resolve) => {
      let settled = false;
      let fallback = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallback);
        const chunks = recorder.voiceChunks || [];
        if (discard || !chunks.length) {
          resolve(null);
          return;
        }
        resolve(new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "audio/webm" }));
      };
      recorder.addEventListener("stop", finish, { once: true });
      if (recorder.state === "inactive") {
        finish();
        return;
      }
      // Страховка на случай, если браузер не пришлёт stop.
      fallback = window.setTimeout(finish, 3000);
      try {
        recorder.stop();
      } catch {
        finish();
      }
    });
  }

  function stopVoiceRecording({ discard = false, label = "Запись остановлена", silent = false, release = false } = {}) {
    const promise = stopVoiceCapture({ discard });
    if (release) promise.finally(releaseVoiceStream);
    if (discard) {
      hideMicIndicator();
      return promise;
    }
    if (!silent) setMicIndicatorIdle(label);
    return promise;
  }

  function advanceInterview() {
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  }

  function finalizeVoiceAnswer(reason) {
    if (voiceAnswerCommitted || !currentQuestion || interviewMode !== "voice") return;
    voiceAnswerCommitted = true;
    const item = currentQuestion;
    const durationSeconds = Math.max(0, Math.round((performance.now() - voiceQuestionStartedAt) / 1000));
    const skipped = reason === "skipped";
    const silentRecording = !skipped
      && voiceLevelFrames > 0
      && (voicePeakRms < MIN_SPEECH_RMS || voiceVoicedMs < MIN_SPEECH_MS);
    const blobPromise = stopVoiceCapture({ discard: skipped || silentRecording });
    voiceCaptureToken += 1;

    if (skipped) {
      hideMicIndicator();
      bumpRoundStat(item, "skipped");
      recordRoundAnswer(item, "skipped", "", durationSeconds, { analysis: voiceSkippedAnalysis() });
      skippedCount += 1;
      advanceInterview();
      return;
    }

    bumpRoundStat(item, "accepted");
    recordRoundAnswer(item, "accepted", "", durationSeconds);
    acceptedCount += 1;
    skipBtn.disabled = true;
    acceptBtn.disabled = true;
    stopVoiceLevelAnimation();
    setMicIndicatorIdle("Сохраняю ответ");

    // Переходим к следующему вопросу только после того, как запись
    // действительно остановлена: иначе быстрый клик может оборвать её.
    let advanced = false;
    const advanceOnce = () => {
      if (advanced) return;
      advanced = true;
      advanceInterview();
    };
    blobPromise.then(advanceOnce, advanceOnce);

    if (silentRecording) {
      updateRoundAnswer(item.id, {
        transcript: "",
        analysis: null,
        shortAnswer: true
      });
      hideMicIndicator();
      return;
    }

    const upload = blobPromise
      .then((blob) => {
        if (!blob || blob.size < 512) {
          return { transcript: "", analysis: null, emptyAudio: true };
        }
        return uploadVoiceAnswer(item, blob, durationSeconds);
      })
      .then((result) => {
        const transcript = sanitizeTranscript(result?.transcript || "").slice(0, 3000);
        const echoQuestion = !!result?.echoQuestion || isQuestionEcho(transcript, item.title);
        const shortAnswer = !!result?.shortAnswer || isShortTranscript(transcript) || echoQuestion;
        if (shortAnswer) {
          updateRoundAnswer(item.id, {
            transcript,
            analysis: null,
            shortAnswer: true,
            echoQuestion
          });
        } else {
          updateRoundAnswer(item.id, {
            transcript,
            shortAnswer: false,
            echoQuestion: false,
            ...(result?.analysis ? { analysis: normalizeVoiceAnalysis(result.analysis) } : {})
          });
        }
        writeInterviewSessionState();
      })
      .catch((error) => {
        console.warn("Voice answer upload failed", error);
        updateRoundAnswer(item.id, {
          transcript: "",
          analysis: null,
          shortAnswer: true,
          echoQuestion: false
        });
        writeInterviewSessionState();
      });

    voiceUploads.set(item.id, upload);
    upload.finally(() => {
      if (voiceUploads.get(item.id) === upload) voiceUploads.delete(item.id);
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function formatAiText(text) {
    if (!text) return "";
    const src = String(text);
    const parts = [];
    const re = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) parts.push({ type: "text", value: src.slice(last, m.index) });
      parts.push({ type: "code", lang: (m[1] || "").toLowerCase(), value: m[2] });
      last = m.index + m[0].length;
    }
    if (last < src.length) parts.push({ type: "text", value: src.slice(last) });

    function renderTextBlock(block) {
      let t = escapeHtml(block);
      t = t.replace(/(\s)(\d{1,2})\)\s+/g, "\n$2. ");
      t = t.replace(/^###\s+(.*)$/gm, "<h4>$1</h4>");
      t = t.replace(/^##\s+(.*)$/gm, "<h3>$1</h3>");
      t = t.replace(/^#\s+(.*)$/gm, "<h2>$1</h2>");
      t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
      t = t.replace(/`([^`]+)`/g, "<code>$1</code>");

      const lines = t.split(/\r?\n/);
      const outLines = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const next = lines[i + 1] || "";
        const isTableLine = /\|/.test(line);
        const isSeparator = /^\s*\|?\s*[-:]{3,}\s*(\|\s*[-:]{3,}\s*)+\|?\s*$/.test(next);
        if (isTableLine && isSeparator) {
          const headerCells = line.split("|").map((s) => s.trim()).filter(Boolean);
          const rows = [];
          i += 2;
          while (i < lines.length && /\|/.test(lines[i])) {
            const rowCells = lines[i].split("|").map((s) => s.trim()).filter(Boolean);
            if (rowCells.length) rows.push(rowCells);
            i++;
          }
          let tableHtml = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
          headerCells.forEach((c) => { tableHtml += `<th>${c}</th>`; });
          tableHtml += "</tr></thead><tbody>";
          rows.forEach((r) => {
            tableHtml += "<tr>";
            headerCells.forEach((_, idx) => { tableHtml += `<td>${r[idx] || ""}</td>`; });
            tableHtml += "</tr>";
          });
          tableHtml += "</tbody></table></div>";
          outLines.push(tableHtml);
          continue;
        }
        outLines.push(line);
        i++;
      }

      let out = "";
      let inUl = false;
      let inOl = false;
      outLines.forEach((line) => {
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

    return parts.map((p) => {
      if (p.type === "code") {
        return `<pre class="code-block"><code>${escapeHtml(p.value)}</code></pre>`;
      }
      return renderTextBlock(p.value);
    }).join("");
  }

  function showAiLoader() {
    aiSupplementEl.classList.remove("ai-supplement-public");
    aiSupplementEl.innerHTML = `
      <span class="ai-loader">
        <span class="ai-spinner"></span>
        <span class="ai-loader-text">Сейчас модель вернет ответ</span>
      </span>
    `;
    aiSupplementEl.style.display = "block";
  }

  function getAiState(questionId) {
    const existing = aiStateByQuestion.get(questionId);
    if (existing) return existing;
    const state = { responses: [], index: 0 };
    aiStateByQuestion.set(questionId, state);
    return state;
  }

  function readLocalAi(questionId) {
    try {
      const raw = localStorage.getItem(`${INTERVIEW_AI_LOCAL_PREFIX}${questionId}`);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeLocalAi(questionId, rows) {
    try {
      localStorage.setItem(`${INTERVIEW_AI_LOCAL_PREFIX}${questionId}`, JSON.stringify((rows || []).slice(-4)));
    } catch {}
  }

  function renderAiSupplement(questionId) {
    const state = getAiState(questionId);
    const rows = state.responses || [];
    if (!rows.length) {
      aiSupplementEl.style.display = "none";
      aiSupplementEl.classList.remove("ai-supplement-public");
      aiSupplementEl.innerHTML = "";
      return;
    }
    const current = rows[state.index] || rows[rows.length - 1];
    aiSupplementEl.classList.toggle("ai-supplement-public", !!current?.isPublicShared);
    aiSupplementEl.innerHTML = "";

    const head = document.createElement("div");
    head.className = "ai-supplement-head";

    const title = document.createElement("div");
    title.className = "ai-supplement-title";
    if (current.isPublicShared) {
      title.innerHTML = `Ответ ИИ <span class="ai-time">из хранилища</span>`;
    } else {
      title.innerHTML = current.seconds
        ? `Ответ ИИ <span class="ai-time">за ${formatSecondsRu(current.seconds)}</span>`
        : "Ответ ИИ";
    }
    head.appendChild(title);

    const nav = document.createElement("div");
    nav.className = "ai-supplement-nav";
    if (rows.length > 1) {
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "ai-nav-btn";
      prev.textContent = "‹";
      prev.setAttribute("aria-label", "Предыдущий ответ");
      prev.addEventListener("click", () => {
        state.index = (state.index - 1 + rows.length) % rows.length;
        renderAiSupplement(questionId);
      });
      nav.appendChild(prev);

      const index = document.createElement("span");
      index.className = "ai-nav-index ai-time";
      index.textContent = `${state.index + 1}/${rows.length}`;
      nav.appendChild(index);

      const next = document.createElement("button");
      next.type = "button";
      next.className = "ai-nav-btn";
      next.textContent = "›";
      next.setAttribute("aria-label", "Следующий ответ");
      next.addEventListener("click", () => {
        state.index = (state.index + 1) % rows.length;
        renderAiSupplement(questionId);
      });
      nav.appendChild(next);
    }
    head.appendChild(nav);

    const body = document.createElement("div");
    body.className = "ai-supplement-text ai-rich";
    body.innerHTML = formatAiText(current.answer || "");

    aiSupplementEl.appendChild(head);
    aiSupplementEl.appendChild(body);

    if (current.model) {
      const meta = document.createElement("div");
      meta.className = "ai-supplement-meta";
      meta.innerHTML = `<span class="ai-time">ответила: ${escapeHtml(current.model)}</span>`;
      aiSupplementEl.appendChild(meta);
    }
    aiSupplementEl.style.display = "block";
    writeInterviewSessionState();
  }

  function dedupeResponses(rows) {
    const out = [];
    (rows || []).forEach((row) => {
      if (!row?.answer) return;
      const exists = out.some((x) =>
        String(x.answer || "") === String(row.answer || "") &&
        String(x.model || "") === String(row.model || "") &&
        String(x.answerType || "append") === String(row.answerType || "append")
      );
      if (!exists) out.push(row);
    });
    return out;
  }

  function refreshAiForCurrentQuestion() {
    if (!currentQuestion) return;
    const state = getAiState(currentQuestion.id);
    const shared = publicAiMap.get(currentQuestion.id) || [];
    const local = readLocalAi(currentQuestion.id) || [];
    state.responses = dedupeResponses([...shared, ...local]).slice(-4);
    state.index = Math.max(0, state.responses.length - 1);
    renderAiSupplement(currentQuestion.id);
  }

  function currentPoolItem() {
    if (!interviewPool.length) return null;
    if (interviewIndex < 0) interviewIndex = 0;
    if (interviewIndex >= interviewPool.length) interviewIndex = interviewPool.length - 1;
    return interviewPool[interviewIndex] || null;
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
      localStorage.setItem(PUBLIC_AI_APPEND_CACHE_KEY, JSON.stringify({ ts: Date.now(), rows: normalizedRows }));
    } catch {}
  }

  function fillPublicAiMap(rows) {
    publicAiMap = new Map();
    (rows || []).forEach((row) => {
      if (!row?.question_id || !row?.content) return;
      const list = publicAiMap.get(row.question_id) || [];
      list.push({
        cloudId: row.id || null,
        answer: row.content,
        model: row.model || "",
        seconds: row.seconds || 0,
        arrivedAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
        answerType: "append",
        isPublicShared: true
      });
      publicAiMap.set(row.question_id, list);
    });
  }

  async function fetchPublicAiAnswers() {
    const cached = readPublicAppendAnswersCache();
    if (cached) {
      fillPublicAiMap(cached);
      return;
    }
    const client = window.AppSupabase?.client;
    if (!client) return;
    const { data, error } = await client
      .from("ai_answers")
      .select("id,question_id,answer_type,model,seconds,content,created_at")
      .eq("answer_type", "append")
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("Interview page: failed to load public AI answers", error);
      return;
    }
    fillPublicAiMap(data || []);
    writePublicAppendAnswersCache(data || []);
  }

  function readPublicAiAnswer(questionId) {
    const list = publicAiMap.get(questionId) || [];
    return list.length ? list[list.length - 1] : null;
  }

  function loadPublicAiSnapshotMap() {
    if (publicAiSnapshotMap) return Promise.resolve(publicAiSnapshotMap);
    if (publicAiSnapshotPromise) return publicAiSnapshotPromise;
    publicAiSnapshotPromise = fetch("over/public_ai_append_snapshot.json")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const map = new Map();
        (Array.isArray(data?.rows) ? data.rows : []).forEach((row) => {
          if (!row?.question_id || !row?.content) return;
          if (!map.has(row.question_id)) map.set(row.question_id, row);
        });
        publicAiSnapshotMap = map;
        return map;
      })
      .catch(() => new Map())
      .finally(() => {
        publicAiSnapshotPromise = null;
      });
    return publicAiSnapshotPromise;
  }

  function renderAiAnswerInto(slot, answer) {
    if (!slot) return;
    const raw = typeof answer === "string"
      ? answer
      : answer?.answer || answer?.content || "";
    const content = stripContinuationMarkers(raw);
    if (!content) return;
    slot.innerHTML = formatAiText(content);
    slot.dataset.loaded = "true";
  }

  async function loadManualAiAnswer(questionId, slot) {
    if (!slot || slot.dataset.loaded === "true") return;
    const live = readPublicAiAnswer(questionId);
    if (live) {
      renderAiAnswerInto(slot, live);
      return;
    }
    slot.textContent = "Загружаю теорию…";
    const map = await loadPublicAiSnapshotMap();
    const row = map.get(questionId);
    if (!row) {
      slot.textContent = "Теория для этого вопроса пока не готова.";
      return;
    }
    renderAiAnswerInto(slot, row);
  }

  async function maybeSaveAiAnswerToCloud(questionId, response) {
    const api = window.AppSupabase;
    if (!api?.client || !api?.getUser || !api?.saveAiAnswer) return null;
    try {
      const user = await api.getUser();
      if (!user) return null;
      const { data, error } = await api.saveAiAnswer({
        user_id: user.id,
        question_id: questionId,
        answer_type: "append",
        model: response.model || DEFAULT_MODEL,
        seconds: Number(response.seconds || 0),
        content: response.answer || ""
      });
      if (error) {
        console.warn("Interview page: save AI answer failed", error);
        return null;
      }
      try { localStorage.removeItem(PUBLIC_AI_APPEND_CACHE_KEY); } catch {}
      return data?.id || null;
    } catch (e) {
      console.warn("Interview page: save AI answer failed", e);
      return null;
    }
  }

  function buildAiPrompt(item) {
    return window.QAtoDevAiPrompts.interview.append(item);
  }

  async function getFunctionHeaders({ json = true } = {}) {
    const api = window.AppSupabase || null;
    const headers = {
      apikey: api?.anonKey || SUPABASE_ANON_KEY_DIRECT
    };
    if (json) headers["Content-Type"] = "application/json";
    try {
      const session = api?.getSession ? await api.getSession() : null;
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {}
    return headers;
  }

  async function getAiProxyHeaders() {
    return getFunctionHeaders({ json: true });
  }

  async function callInterviewAiProxy(body) {
    const api = window.AppSupabase || null;
    const urls = Array.from(new Set([
      `${SUPABASE_FUNCTIONS_BASE_DIRECT}/ai-chat`,
      `${api?.url || SUPABASE_URL_DIRECT}/functions/v1/ai-chat`
    ]));
    let lastError = null;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        return await fetch(urls[i], {
          method: "POST",
          headers: await getAiProxyHeaders(),
          body: JSON.stringify(body)
        });
      } catch (e) {
        lastError = e;
        if (i === urls.length - 1) throw e;
      }
    }
    throw lastError || new Error("AI proxy request failed");
  }

  function voiceMimeFilename(type) {
    const value = String(type || "").toLowerCase();
    if (value.includes("mp4")) return "answer.mp4";
    if (value.includes("ogg")) return "answer.ogg";
    if (value.includes("wav")) return "answer.wav";
    return "answer.webm";
  }

  async function uploadVoiceAnswer(item, blob, durationSeconds) {
    const api = window.AppSupabase || null;
    const urls = Array.from(new Set([
      `${SUPABASE_FUNCTIONS_BASE_DIRECT}/voice-answer`,
      `${api?.url || SUPABASE_URL_DIRECT}/functions/v1/voice-answer`
    ]));
    const buildForm = () => {
      const form = new FormData();
      form.append("audio", blob, voiceMimeFilename(blob.type));
      form.append("questionTitle", String(item.title || "").slice(0, 500));
      form.append("category", chipLabel(item.category));
      form.append("referenceAnswer", referenceAnswerText(item));
      form.append("durationSeconds", String(Math.max(0, Math.round(durationSeconds) || 0)));
      return form;
    };

    let lastError = null;
    for (const url of urls) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60000);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: await getFunctionHeaders({ json: false }),
          body: buildForm(),
          signal: controller.signal
        });
        window.clearTimeout(timeout);
        if (!response.ok) {
          let detail = "";
          try {
            const payload = await response.json();
            detail = payload?.error || payload?.detail || "";
          } catch {}
          const error = new Error(detail || `voice-answer failed: ${response.status}`);
          error.status = response.status;
          throw error;
        }
        const payload = await response.json();
        return {
          transcript: String(payload?.transcript || "").slice(0, 3000),
          analysis: normalizeVoiceAnalysis(payload?.analysis),
          shortAnswer: !!payload?.shortAnswer,
          echoQuestion: !!payload?.echoQuestion
        };
      } catch (error) {
        window.clearTimeout(timeout);
        lastError = error;
        // 400/401/403/413/415/422 не станут успешнее на втором URL.
        // 404/408/429 и сетевые/5xx ошибки пробуем через резервный адрес.
        const status = Number(error?.status) || 0;
        const fatal = status >= 400 && status < 500 && ![404, 408, 429].includes(status);
        if (fatal) break;
      }
    }
    throw lastError || new Error("voice-answer failed");
  }

  async function requestAiAppend(item) {
    const startedAt = Date.now();
    const body = {
      provider: "groq",
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: window.QAtoDevAiPrompts.interview.system },
        { role: "user", content: buildAiPrompt(item) }
      ],
      temperature: 0.4,
      stream: false
    };
    const res = await callInterviewAiProxy(body);
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
    const json = await res.json();
    const answer = json?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty AI answer");
    return {
      answer,
      model: DEFAULT_MODEL,
      seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      answerType: "append",
      arrivedAt: Date.now()
    };
  }

  function createVoiceResultCard() {
    const wrap = document.createElement("div");
    wrap.className = "interview-result__report";
    return wrap;
  }

  function appendVoiceResultHint(wrap) {
    const hint = document.createElement("p");
    hint.className = "interview-result__history-hint";
    hint.textContent = "Подробный разбор — в «Истории» собеседований.";
    wrap.appendChild(hint);
  }

  function updateVoiceAnalysisProgress(done, total, label = "Анализирую ответы…") {
    if (interviewMode !== "voice") return;
    voiceAnalysisDone = Math.max(0, Number(done) || 0);
    voiceAnalysisTotal = Math.max(0, Number(total) || 0);
    answerEl.classList.add("interview-result");
    answerEl.hidden = false;
    badgeCategory.textContent = "Итог";
    questionTitleEl.hidden = true;
    questionTitleEl.textContent = "";
    answerEl.innerHTML = "";

    const wrap = createVoiceResultCard();
    const summary = document.createElement("div");
    summary.className = "interview-history__report-summary";
    const ring = document.createElement("span");
    ring.className = "interview-history__score-ring is-loading";
    const ringValue = document.createElement("span");
    ringValue.className = "interview-history__score-ring-value";
    ringValue.textContent = "…";
    ring.appendChild(ringValue);
    const copy = document.createElement("div");
    copy.className = "interview-history__report-copy";
    const line = document.createElement("p");
    line.className = "interview-history__report-line";
    line.textContent = "Отчёт готовится";
    const text = document.createElement("p");
    text.className = "interview-history__report-text";
    text.textContent = voiceAnalysisTotal > 0
      ? `${label} ${voiceAnalysisDone} из ${voiceAnalysisTotal}.`
      : "Анализирую ответы. Обычно это занимает до минуты.";
    copy.append(line, text);
    summary.append(ring, copy);
    wrap.appendChild(summary);
    appendVoiceResultHint(wrap);
    answerEl.appendChild(wrap);
  }

  function updateVoiceResultUi({ running = false, report = voiceReport } = {}) {
    if (interviewMode !== "voice") return;
    answerEl.classList.add("interview-result");
    answerEl.hidden = false;
    badgeCategory.textContent = "Итог";
    questionTitleEl.hidden = true;
    questionTitleEl.textContent = "";
    if (running) {
      updateVoiceAnalysisProgress(voiceAnalysisDone, voiceAnalysisTotal || roundAnswers.length);
      return;
    }
    answerEl.innerHTML = "";
    const wrap = createVoiceResultCard();
    if (report) {
      renderHistorySummary(wrap, {
        score: report.overallScore,
        answered: report.answered,
        total: report.total,
        summary: report.summary,
        recommendations: report.recommendations
      });
      counterEl.textContent = `${report.answered} / ${report.total}`;
      const kind = report.overallScore == null ? "neutral" : report.overallScore >= 70 ? "good" : report.overallScore >= 40 ? "so-so" : "bad";
      setQuestionPhoto(RESULT_PHOTOS[kind]);
    } else {
      renderHistorySummary(wrap, {
        score: null,
        answered: acceptedCount,
        total: interviewPool.length || 0,
        summary: "Отчёт не сформирован. Попробуйте открыть «Историю» позже.",
        recommendations: []
      });
      counterEl.textContent = `${acceptedCount} / ${interviewPool.length || 0}`;
      setQuestionPhoto(RESULT_PHOTOS.neutral);
    }
    appendVoiceResultHint(wrap);
    answerEl.appendChild(wrap);
  }

  function buildVoiceJob() {
    const history = readInterviewHistory();
    const number = history.reduce((max, entry) => Math.max(max, Number(entry.number) || 0), 0) + 1;
    return {
      id: roundId,
      ts: Date.now(),
      mode: "voice",
      number,
      categories: Array.from(selectedCategories),
      answers: roundAnswers.map(answer => ({
        ...answer,
        categoryLabel: chipLabel(answer.category),
        referenceAnswer: referenceAnswerText(answer)
      }))
    };
  }

  async function startVoiceReportAnalysis() {
    if (interviewMode !== "voice" || !roundAnswers.length || voiceAnalysisRunning) return;
    const token = ++voiceAnalysisToken;
    voiceAnalysisRunning = true;
    voiceReport = null;
    voiceAnalysisDone = 0;
    voiceAnalysisTotal = roundAnswers.length;
    setInterviewNavMode("retry");
    updateVoiceResultUi({ running: true });
    writeInterviewSessionState();

    const pendingUploads = [...new Set(voiceUploads.values())];
    if (pendingUploads.length) {
      updateVoiceAnalysisProgress(0, roundAnswers.length, "Распознаю ответы…");
      await Promise.allSettled(pendingUploads);
      if (token !== voiceAnalysisToken) return;
    }

    const job = buildVoiceJob();
    if (!window.QAtoDevVoiceReport) {
      voiceAnalysisRunning = false;
      updateVoiceResultUi({});
      answerEl.innerText = "Не удалось запустить анализ. Откройте отчёт ещё раз.";
      return;
    }
    window.QAtoDevVoiceReport.enqueue(job);
    window.QAtoDevVoiceReport.processPending({
      onlyId: job.id,
      onProgress: (progressJob, done, total) => {
        if (token !== voiceAnalysisToken || progressJob.id !== roundId) return;
        updateVoiceAnalysisProgress(done, total);
      },
      onComplete: (completedJob, report) => {
        if (token !== voiceAnalysisToken || completedJob.id !== roundId) return;
        voiceReport = report;
        voiceAnalysisRunning = false;
        updateVoiceResultUi({ report });
        setInterviewNavMode("retry");
        writeInterviewSessionState();
        if (historyDialog.open) renderInterviewHistory();
      }
    }).catch(error => {
      console.warn("Voice report processing failed", error);
      if (token !== voiceAnalysisToken) return;
      voiceAnalysisRunning = false;
      updateVoiceResultUi({});
      setInterviewNavMode("retry");
    });
  }

  function isValidVoiceReport(report) {
    return !!report
      && Array.isArray(report.categories)
      && Number.isFinite(Number(report.total))
      && Number(report.total) > 0;
  }

  async function onAiAppendClick() {
    if (!currentQuestion) return;
    aiAppendBtn.disabled = true;
    showAiLoader();
    try {
      const response = await requestAiAppend(currentQuestion);
      const state = getAiState(currentQuestion.id);
      state.responses = dedupeResponses([...(state.responses || []), response]).slice(-4);
      state.index = state.responses.length - 1;
      writeLocalAi(currentQuestion.id, state.responses);
      renderAiSupplement(currentQuestion.id);
      const cloudId = await maybeSaveAiAnswerToCloud(currentQuestion.id, response);
      if (cloudId) {
        const list = publicAiMap.get(currentQuestion.id) || [];
        list.push({ ...response, cloudId });
        publicAiMap.set(currentQuestion.id, dedupeResponses(list));
      }
    } catch (e) {
      console.warn("Interview page: AI append failed", e);
      aiSupplementEl.classList.remove("ai-supplement-public");
      aiSupplementEl.innerHTML = `
        <div class="ai-supplement-head">
          <div class="ai-supplement-title">Ответ ИИ</div>
        </div>
        <div class="ai-supplement-text ai-rich"><p>Не удалось получить ответ ИИ. Попробуйте еще раз.</p></div>
      `;
      aiSupplementEl.style.display = "block";
    } finally {
      aiAppendBtn.disabled = false;
    }
  }

  function renderAnswer(item) {
    answerEl.innerHTML = item.answer || "";
    answerEl.hidden = true;
    toggleAnswerBtn.setAttribute("aria-expanded", "false");
    toggleAnswerBtn.textContent = "Посмотреть ответ";
    aiZone.style.display = "none";
    aiSupplementEl.style.display = "none";
    aiSupplementEl.classList.remove("ai-supplement-public");
    aiSupplementEl.innerHTML = "";
    writeInterviewSessionState();
  }

  function setProgressMark(item, status) {
    if (!item?.id) return;
    try {
      localStorage.setItem(`${INTERVIEW_PROGRESS_PREFIX}${item.id}`, status);
    } catch {}
  }

  function bumpRoundStat(item, field) {
    if (!item?.category) return;
    const stats = roundStats.get(item.category) || { accepted: 0, skipped: 0 };
    stats[field] += 1;
    roundStats.set(item.category, stats);
  }

  function referenceAnswerText(item) {
    const source = allItems.find((question) => question.id === item?.id) || {};
    return String(source.answer || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
  }

  function recordRoundAnswer(item, status, transcript = "", durationSeconds = 0, extra = {}) {
    if (!item?.id || !item?.title) return null;
    const existing = roundAnswers.find((answer) => answer.id === item.id);
    const value = {
      id: item.id,
      title: item.title,
      category: item.category,
      status: status === "skipped" ? "skipped" : "accepted",
      transcript: String(transcript || "").slice(0, 3000),
      durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
      ...extra
    };
    if (existing) Object.assign(existing, value);
    else roundAnswers.push(value);
    return existing || value;
  }

  function updateRoundAnswer(id, patch) {
    const answer = roundAnswers.find((entry) => entry.id === id);
    if (!answer) return null;
    Object.assign(answer, patch || {});
    return answer;
  }

  function getWeakCategories(limit = 2) {
    return [...roundStats.entries()]
      .map(([category, stats]) => {
        const total = stats.accepted + stats.skipped;
        const percent = total ? Math.round((stats.accepted / total) * 100) : 100;
        return { category, total, percent };
      })
      .filter(({ total, percent }) => total > 0 && percent < 60)
      .sort((a, b) => a.percent - b.percent || b.total - a.total)
      .slice(0, limit)
      .map(({ category }) => chipLabel(category));
  }

  function newRoundId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function readInterviewHistory() {
    try {
      const raw = localStorage.getItem(INTERVIEW_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => entry && Array.isArray(entry.questions))
        .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
    } catch {
      return [];
    }
  }

  function writeInterviewHistory(list) {
    try {
      localStorage.setItem(INTERVIEW_HISTORY_KEY, JSON.stringify(list.slice(0, INTERVIEW_HISTORY_LIMIT)));
    } catch {}
  }

  function historyEntryFromRemote(row) {
    const questions = Array.isArray(row?.questions) ? row.questions : [];
    return {
      id: String(row?.id || ""),
      number: Math.max(0, Number(row?.number) || 0),
      ts: Date.parse(row?.created_at) || Number(row?.ts) || 0,
      mode: row?.mode === "voice" ? "voice" : "manual",
      report: row?.report && typeof row.report === "object" ? row.report : null,
      categories: [...new Set((Array.isArray(row?.categories) ? row.categories : [])
        .map(canonicalCategory)
        .filter(Boolean))],
      accepted: Math.max(0, Number(row?.accepted) || 0),
      skipped: Math.max(0, Number(row?.skipped) || 0),
      total: Math.max(0, Number(row?.total) || 0),
      percent: Math.min(100, Math.max(0, Number(row?.percent) || 0)),
      questions: questions
        .filter((question) => question?.id && question?.title)
        .map((question) => ({
          id: String(question.id),
          title: String(question.title),
          category: canonicalCategory(question.category),
          status: question.status === "skipped" ? "skipped" : "accepted",
          transcript: String(question.transcript || "").slice(0, 3000),
          durationSeconds: Math.max(0, Number(question.durationSeconds) || 0),
          analysis: question.analysis && typeof question.analysis === "object" ? question.analysis : null
        }))
    };
  }

  function historyRowFromLocal(entry, userId) {
    return {
      user_id: userId,
      id: entry.id,
      number: Math.max(0, Number(entry.number) || 0),
      created_at: new Date(Number(entry.ts) || Date.now()).toISOString(),
      categories: Array.isArray(entry.categories) ? entry.categories : [],
      accepted: Math.max(0, Number(entry.accepted) || 0),
      skipped: Math.max(0, Number(entry.skipped) || 0),
      total: Math.max(0, Number(entry.total) || 0),
      percent: Math.min(100, Math.max(0, Number(entry.percent) || 0)),
      questions: Array.isArray(entry.questions) ? entry.questions : []
    };
  }

  async function getInterviewCloudUserId() {
    const api = window.AppSupabase;
    if (!api) return "";
    try {
      const session = api.getSession ? await api.getSession() : null;
      if (session?.user?.id) return session.user.id;
      if (api.getSession) return "";
    } catch {}
    try {
      const user = api.getUser ? await api.getUser() : null;
      return user?.id || "";
    } catch {
      return "";
    }
  }

  async function updateInterviewLocalNote() {
    const token = ++historyNoteToken;
    const userId = await getInterviewCloudUserId();
    if (token !== historyNoteToken) return;
    const signedIn = !!userId;
    historyHint.hidden = !signedIn;
    historyLocalNote.hidden = signedIn;
  }

  function scheduleInterviewHistorySync(delay = 0) {
    if (historySyncPromise) {
      historySyncQueued = true;
      return;
    }
    window.clearTimeout(historySyncTimer);
    historySyncTimer = window.setTimeout(() => {
      historySyncTimer = 0;
      syncInterviewHistory();
    }, Math.max(0, Number(delay) || 0));
  }

  function syncInterviewHistory() {
    if (historySyncPromise) return historySyncPromise;
    historySyncPromise = (async () => {
      const api = window.AppSupabase;
      const client = api?.client;
      if (!client) return { ok: false, skipped: "no-client" };
      const userId = await getInterviewCloudUserId();
      if (!userId) {
        await updateInterviewLocalNote();
        return { ok: false, skipped: "signed-out" };
      }
      historyHint.hidden = false;
      historyLocalNote.hidden = true;
      const baseSelect = "user_id,id,number,created_at,categories,accepted,skipped,total,percent,questions";
      let remoteRows = null;
      let remoteError = null;
      ({ data: remoteRows, error: remoteError } = await client
        .from(INTERVIEW_HISTORY_TABLE)
        .select(`${baseSelect},mode,report`)
        .eq("user_id", userId)
        .order("created_at", { ascending: true }));
      if (remoteError) {
        ({ data: remoteRows, error: remoteError } = await client
          .from(INTERVIEW_HISTORY_TABLE)
          .select(baseSelect)
          .eq("user_id", userId)
          .order("created_at", { ascending: true }));
      }
      if (remoteError) throw remoteError;

      const local = readInterviewHistory();
      const byId = new Map();
      local.forEach((entry) => {
        if (entry?.id) byId.set(entry.id, entry);
      });
      (remoteRows || []).forEach((row) => {
        const entry = historyEntryFromRemote(row);
        if (!entry.id) return;
        const existing = byId.get(entry.id);
        if (!existing || (Number(entry.ts) || 0) > (Number(existing.ts) || 0)) {
          byId.set(entry.id, entry);
        }
      });

      const merged = [...byId.values()]
        .filter((entry) => entry?.id && Array.isArray(entry.questions))
        .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0))
        .slice(0, INTERVIEW_HISTORY_LIMIT);
      writeInterviewHistory(merged);

      const remoteIds = new Set((remoteRows || []).map((row) => String(row.id)));
      const uploadRows = merged
        .filter((entry) => !remoteIds.has(entry.id) && entry.mode !== "voice")
        .map((entry) => historyRowFromLocal(entry, userId));
      if (uploadRows.length) {
        const { error: upsertError } = await client
          .from(INTERVIEW_HISTORY_TABLE)
          .upsert(uploadRows, { onConflict: "user_id,id", ignoreDuplicates: true });
        if (upsertError) throw upsertError;
      }

      const voiceRows = merged
        .filter((entry) => !remoteIds.has(entry.id) && entry.mode === "voice")
        .map((entry) => ({
          ...historyRowFromLocal(entry, userId),
          mode: "voice",
          report: entry.report || null
        }));
      if (voiceRows.length) {
        const { error: voiceError } = await client
          .from(INTERVIEW_HISTORY_TABLE)
          .upsert(voiceRows, { onConflict: "user_id,id" });
        if (voiceError) console.warn("Interview voice history sync skipped", voiceError);
      }

      try { localStorage.setItem(INTERVIEW_HISTORY_SYNC_TS_KEY, String(Date.now())); } catch {}
      if (historyDialog.open) renderInterviewHistory();
      return { ok: true, uploaded: uploadRows.length, remote: remoteRows?.length || 0 };
    })().catch((error) => {
      console.warn("Interview history sync failed", error);
      return { ok: false, error };
    }).finally(() => {
      historySyncPromise = null;
      if (historySyncQueued) {
        historySyncQueued = false;
        scheduleInterviewHistorySync(0);
      }
    });
    return historySyncPromise;
  }

  function saveInterviewHistoryEntry() {
    if (interviewMode !== "manual" || !roundAnswers.length) return;
    if (!roundId) roundId = newRoundId();
    const history = readInterviewHistory();
    if (history.some((entry) => entry.id === roundId)) return;
    const total = interviewPool.length || roundAnswers.length;
    const percent = total ? Math.round((acceptedCount / total) * 100) : 0;
    const number = history.reduce((max, entry) => Math.max(max, Number(entry.number) || 0), 0) + 1;
    history.unshift({
      id: roundId,
      number,
      ts: Date.now(),
      categories: Array.from(selectedCategories),
      accepted: acceptedCount,
      skipped: skippedCount,
      total,
      percent,
      questions: roundAnswers.map((answer) => ({ ...answer }))
    });
    writeInterviewHistory(history);
    scheduleInterviewHistorySync(0);
  }

  function formatHistoryDate(ts) {
    try {
      return new Date(Number(ts) || 0).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function stripContinuationMarkers(value) {
    return String(value || "")
      .replace(/[ \t]*продолжение[ \t]+следует[.!…]*[ \t]*/gi, "")
      .trim();
  }

  function formatInlineAiText(value) {
    let text = escapeHtml(stripContinuationMarkers(value));
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    return text;
  }

  function createHistoryLabel(text, kind = "") {
    const label = document.createElement("span");
    label.className = "interview-history__detail-label";
    if (kind) label.dataset.kind = kind;
    label.textContent = text;
    return label;
  }

  function appendHistoryDetailList(container, title, items, kind = "") {
    if (!Array.isArray(items) || !items.length) return;
    const block = document.createElement("div");
    block.className = "interview-history__detail-block";
    const list = document.createElement("ul");
    list.className = "interview-history__detail-list";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = formatInlineAiText(item);
      list.appendChild(li);
    });
    block.append(createHistoryLabel(title, kind), list);
    container.appendChild(block);
  }

  function collapseOtherHistoryQuestions(currentDetails) {
    const roots = new Set([
      historyList,
      currentDetails.closest(".interview-history__item")
    ].filter(Boolean));
    roots.forEach((root) => {
      root.querySelectorAll(".interview-history__question-details[open]").forEach((element) => {
        if (element !== currentDetails) element.open = false;
      });
    });
  }

  function collapseHistoryDetails() {
    historyList.querySelectorAll("details[open]").forEach((element) => {
      element.open = false;
    });
  }

  function scoreProgressColor(score) {
    if (score == null || !Number.isFinite(Number(score))) return "var(--muted)";
    const value = Math.max(0, Math.min(100, Number(score)));
    const hue = Math.round((value / 100) * 120);
    return `hsl(${hue} 62% 43%)`;
  }

  function appendSnapshotAnswers(container, question) {
    const aiAnswer = document.createElement("div");
    aiAnswer.className = "interview-history__answer-text ai-rich";
    container.append(createHistoryLabel("Теория для повторения", "ai"), aiAnswer);

    return () => loadManualAiAnswer(question.id, aiAnswer).catch(() => {
      if (aiAnswer.dataset.loaded !== "true") {
        aiAnswer.textContent = "Не удалось загрузить теорию.";
      }
    });
  }

  function createQuestionStatus(passed) {
    const status = document.createElement("span");
    status.className = `interview-history__question-status ${passed ? "is-passed" : "is-failed"}`;
    status.textContent = passed ? "✓" : "✕";
    status.setAttribute("aria-label", passed ? "Засчитан" : "Не засчитан");
    return status;
  }

  function conciseHistorySummary({ summary, recommendations }) {
    const text = String(summary || "").trim();
    const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    const meaningful = sentences.filter((sentence) =>
      !/(получил|получен|ответил|балл|оценк|категор|процент|из \d+)/i.test(sentence)
    );
    if (meaningful.length) return meaningful.join(" ");
    if (Array.isArray(recommendations) && recommendations.length) {
      return recommendations.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 2).join(" ");
    }
    return "";
  }

  function renderHistorySummary(container, { score: rawScore, answered, total, summary: summaryText, recommendations }) {
    const summary = document.createElement("div");
    summary.className = "interview-history__report-summary";
    const value = rawScore == null ? NaN : Number(rawScore);
    const scoreValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
    const ring = document.createElement("span");
    ring.className = "interview-history__score-ring";
    ring.style.setProperty("--score", String(scoreValue == null ? 0 : scoreValue));
    ring.style.setProperty("--ring-color", scoreProgressColor(scoreValue));
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", scoreValue == null ? "Общий результат не сформирован" : `Общий результат: ${scoreValue}%`);
    const ringValue = document.createElement("span");
    ringValue.className = "interview-history__score-ring-value";
    ringValue.textContent = scoreValue == null ? "—" : `${scoreValue}%`;
    ring.appendChild(ringValue);
    const copy = document.createElement("div");
    copy.className = "interview-history__report-copy";
    const line = document.createElement("p");
    line.className = "interview-history__report-line";
    line.textContent = `Отвечено ${Number(answered) || 0} из ${Number(total) || 0}`;
    copy.append(line);
    const concise = conciseHistorySummary({ summary: summaryText, recommendations });
    if (concise) {
      const text = document.createElement("p");
      text.className = "interview-history__report-text";
      text.innerHTML = formatInlineAiText(concise);
      copy.appendChild(text);
    }
    summary.append(ring, copy);
    container.appendChild(summary);
  }

  function renderVoiceHistoryQuestion(question) {
    const details = document.createElement("details");
    details.className = `interview-history__question-details is-${question.status === "skipped" ? "skipped" : "accepted"}`;
    details.dataset.questionId = question.id;
    const summary = document.createElement("summary");
    summary.className = "interview-history__question-summary";

    const rawScore = question.analysis?.score;
    const numericScore = rawScore == null ? NaN : Number(rawScore);
    const passed = Number.isFinite(numericScore) && numericScore >= 70;
    const status = createQuestionStatus(passed);

    const title = document.createElement("span");
    title.className = "interview-history__question-title";
    title.textContent = question.title;

    const categoryLabel = chipLabel(canonicalCategory(question.category));
    const category = document.createElement("span");
    category.className = "interview-history__category interview-history__question-category";
    category.textContent = categoryLabel;

    const main = document.createElement("span");
    main.className = "interview-history__question-main";
    main.append(status, title);
    if (categoryLabel) main.appendChild(category);
    summary.appendChild(main);

    const body = document.createElement("div");
    body.className = "interview-history__question-body";
    const isSkipped = question.status === "skipped" || question.analysis?.verdict === "skipped";
    const echoQuestion = !isSkipped
      && (!!question.echoQuestion || isQuestionEcho(question.transcript, question.title));
    const shortAnswer = !isSkipped
      && (!!question.shortAnswer || isShortTranscript(question.transcript) || echoQuestion);
    if (isSkipped) {
      const note = document.createElement("p");
      note.className = "interview-history__skipped-note";
      note.textContent = "Вопрос пропущен — ответа пользователя нет.";
      body.appendChild(note);
    } else if (shortAnswer) {
      const note = document.createElement("p");
      note.className = "interview-history__skipped-note";
      const transcript = sanitizeTranscript(question.transcript);
      note.textContent = echoQuestion
        ? "Похоже, вы повторили вопрос, а не ответили на него."
        : transcript
          ? `Ответ слишком короткий для разбора. Распознано: «${transcript}».`
          : "Ответ не распознан — вопрос не засчитан.";
      body.appendChild(note);
    } else {
      const answerText = sanitizeTranscript(question.analysis?.cleanedAnswer || "");
      if (answerText || question.transcript) {
        const card = document.createElement("div");
        card.className = "interview-history__answer-card is-user";
        const label = document.createElement("span");
        label.className = "interview-history__answer-card-label";
        label.textContent = "Ваш ответ";
        card.appendChild(label);
        if (answerText) {
          const answer = document.createElement("p");
          answer.className = "interview-history__answer-card-text";
          answer.innerHTML = formatInlineAiText(answerText);
          card.appendChild(answer);
        } else {
          const transcript = document.createElement("pre");
          transcript.className = "interview-history__transcript";
          transcript.textContent = sanitizeTranscript(question.transcript);
          card.appendChild(transcript);
        }
        body.appendChild(card);
      }
      if (question.analysis?.summary) {
        const card = document.createElement("div");
        card.className = "interview-history__answer-card is-analysis";
        const label = document.createElement("span");
        label.className = "interview-history__answer-card-label";
        label.textContent = "Разбор ИИ";
        const analysis = document.createElement("div");
        analysis.className = "interview-history__answer-card-text ai-rich";
        analysis.innerHTML = formatAiText(stripContinuationMarkers(question.analysis.summary));
        card.append(label, analysis);
        body.appendChild(card);
      }
      appendHistoryDetailList(body, "Сильные стороны", question.analysis?.strengths, "strengths");
      appendHistoryDetailList(body, "Что подтянуть", question.analysis?.gaps, "gaps");
      if (question.analysis?.improvedAnswer) {
        const improved = document.createElement("div");
        improved.className = "interview-history__analysis ai-rich";
        improved.innerHTML = formatAiText(stripContinuationMarkers(question.analysis.improvedAnswer));
        body.append(createHistoryLabel("Как можно ответить", "improved"), improved);
      }
      if (!answerText && !question.transcript && !question.analysis) {
        const empty = document.createElement("p");
        empty.className = "interview-history__analysis is-muted";
        empty.textContent = "Разбор пока недоступен.";
        body.appendChild(empty);
      }
    }
    const loadSnapshotAnswer = appendSnapshotAnswers(body, question);

    details.append(summary, body);
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      collapseOtherHistoryQuestions(details);
      loadSnapshotAnswer();
    });
    return details;
  }

  function renderManualHistoryQuestion(question) {
    const details = document.createElement("details");
    details.className = `interview-history__question-details is-${question.status === "skipped" ? "skipped" : "accepted"}`;
    details.dataset.questionId = question.id;
    const summary = document.createElement("summary");
    summary.className = "interview-history__question-summary";

    const passed = question.status !== "skipped";
    const status = createQuestionStatus(passed);

    const title = document.createElement("span");
    title.className = "interview-history__question-title";
    title.textContent = question.title;

    const categoryLabel = chipLabel(canonicalCategory(question.category));
    const category = document.createElement("span");
    category.className = "interview-history__category interview-history__question-category";
    category.textContent = categoryLabel;

    const main = document.createElement("span");
    main.className = "interview-history__question-main";
    main.append(status, title);
    if (categoryLabel) main.appendChild(category);
    summary.appendChild(main);

    const body = document.createElement("div");
    body.className = "interview-history__question-body";
    const loadSnapshotAnswer = appendSnapshotAnswers(body, question);

    details.append(summary, body);
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      collapseOtherHistoryQuestions(details);
      loadSnapshotAnswer();
    });
    return details;
  }

  function renderInterviewHistory() {
    const openHistoryIds = new Set(
      [...historyList.querySelectorAll(".interview-history__item[open]")]
        .map((element) => element.dataset.historyId || "")
        .filter(Boolean)
    );
    const openQuestionKeys = new Set(
      [...historyList.querySelectorAll(".interview-history__question-details[open]")]
        .map((element) => {
          const historyId = element.closest(".interview-history__item")?.dataset.historyId || "";
          const questionId = element.dataset.questionId || "";
          return historyId && questionId ? `${historyId}::${questionId}` : "";
        })
        .filter(Boolean)
    );
    const savedScrollTop = historyList.scrollTop;
    historyList.innerHTML = "";
    const history = readInterviewHistory();
    if (!history.length) {
      const empty = document.createElement("p");
      empty.className = "interview-history__empty";
      empty.textContent = "Пока нет завершённых собеседований.";
      historyList.appendChild(empty);
      return;
    }
    history.forEach((entry, index) => {
      const details = document.createElement("details");
      const rawScore = entry.mode === "voice" ? entry.report?.overallScore : entry.percent;
      const scoreValue = rawScore == null ? NaN : Number(rawScore);
      const hasResult = Number(entry.total) > 0 && Number.isFinite(scoreValue);
      const resultKind = !hasResult ? "neutral" : scoreValue >= 70 ? "good" : scoreValue >= 40 ? "so-so" : "bad";
      details.className = `interview-history__item is-${resultKind}`;
      details.dataset.historyId = entry.id;
      details.addEventListener("toggle", () => {
        if (details.open) return;
        details.querySelectorAll(".interview-history__question-details[open]").forEach((question) => {
          question.open = false;
        });
      });

      const summary = document.createElement("summary");
      const summaryTop = document.createElement("div");
      summaryTop.className = "interview-history__summary";

      const name = document.createElement("span");
      name.className = "interview-history__name";
      name.textContent = `Собеседование ${history.length - index}`;

      const date = document.createElement("span");
      date.className = "interview-history__date";
      date.textContent = formatHistoryDate(entry.ts);

      const badges = document.createElement("div");
      badges.className = "interview-history__badges";
      if (entry.mode === "voice") {
        const mode = document.createElement("span");
        mode.className = "interview-history__mode";
        mode.setAttribute("role", "img");
        mode.setAttribute("aria-label", "Голосовое собеседование");
        mode.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path></svg>';
        badges.appendChild(mode);
      }
      summaryTop.append(name, date);
      if (badges.childElementCount) summaryTop.appendChild(badges);

      summary.append(summaryTop);

      const body = document.createElement("div");
      body.className = "interview-history__questions";
      const appendQuestion = (question, element) => {
        body.appendChild(element);
        if (openQuestionKeys.has(`${entry.id}::${question.id}`)) {
          element.open = true;
        }
      };
      const hasVoiceReport = entry.mode === "voice" && isValidVoiceReport(entry.report);
      if (hasVoiceReport) {
        renderHistorySummary(body, {
          score: entry.report.overallScore,
          answered: entry.report.answered,
          total: entry.report.total,
          summary: entry.report.summary,
          recommendations: entry.report.recommendations
        });
        const reportQuestions = entry.report.categories.flatMap((category) =>
          Array.isArray(category.questions) ? category.questions : []
        );
        const questions = reportQuestions.length ? reportQuestions : (entry.questions || []);
        questions.forEach((question) => {
          appendQuestion(question, renderVoiceHistoryQuestion(question));
        });
      } else if (entry.mode !== "voice") {
        renderHistorySummary(body, {
          score: entry.percent,
          answered: entry.accepted,
          total: entry.total,
          summary: "",
          recommendations: []
        });
        (entry.questions || []).forEach((question) => {
          appendQuestion(question, renderManualHistoryQuestion(question));
        });
      } else {
        (entry.questions || []).forEach((question) => {
          appendQuestion(question, question.analysis
            ? renderVoiceHistoryQuestion(question)
            : renderManualHistoryQuestion(question));
        });
      }

      details.open = openHistoryIds.has(entry.id);
      details.append(summary, body);
      historyList.appendChild(details);
    });
    requestAnimationFrame(() => {
      historyList.scrollTop = savedScrollTop;
    });
  }

  function getSelectedItemsFlat() {
    return allItems.filter((item) => selectedCategories.has(item.category));
  }

  function buildInterviewPool() {
    const pool = shuffleInPlace(getSelectedItemsFlat());
    const limit = interviewMode === "voice" ? VOICE_POOL_LIMIT : INTERVIEW_POOL_LIMIT;
    return pool.slice(0, Math.min(pool.length, limit));
  }

  function updateCounter() {
    if (interviewFinished) {
      const total = interviewPool.length || 0;
      const percent = total ? Math.round((acceptedCount / total) * 100) : 0;
      counterEl.textContent = `${acceptedCount} из ${total} (${percent}%)`;
      return;
    }
    counterEl.textContent = `${Math.min(interviewIndex + (interviewStarted && interviewPool.length ? 1 : 0), interviewPool.length)} / ${interviewPool.length}`;
  }

  function setInterviewNavMode(mode) {
    stageEl.classList.toggle("is-running", mode === "normal" || mode === "timer" || mode === "voice");
    stageEl.classList.toggle("is-timer", mode === "timer");
    stageEl.classList.toggle("is-voice", mode === "voice");
    stageEl.classList.toggle("is-retry", mode === "retry");
    toggleAnswerBtn.hidden = mode !== "normal";
    toggleAnswerBtn.disabled = mode !== "normal";
    const showSettings = mode === "normal" || mode === "timer" || mode === "voice" || mode === "retry";
    settingsWrap.hidden = !showSettings;
    historyBtn.hidden = !showSettings;
    settingsBtn.hidden = !showSettings;
    if (showSettings) {
      const timerMode = mode === "timer" || mode === "voice";
      const retryMode = mode === "retry";
      settingsBtnLabel.textContent = retryMode ? "Заново" : timerMode ? "Пауза" : "Настройки";
      settingsBtn.setAttribute("aria-label", retryMode
        ? "Начать заново"
        : timerMode ? "Пауза и настройки собеседования" : "Настройки собеседования");
      settingsBtn.classList.toggle("is-retry", retryMode);
    } else {
      settingsBtn.classList.remove("is-retry");
    }
    if (mode === "timer") {
      skipBtn.disabled = true;
      skipBtn.style.visibility = "hidden";
      acceptBtn.disabled = true;
      acceptBtn.style.visibility = "hidden";
      timerEl.hidden = false;
      return;
    }
    if (mode === "voice") {
      skipBtn.disabled = false;
      skipBtn.style.visibility = "";
      skipBtn.textContent = "Пропустить вопрос";
      acceptBtn.disabled = false;
      acceptBtn.style.visibility = "";
      acceptBtn.textContent = "Закончить ответ";
      timerEl.hidden = false;
      return;
    }
    timerEl.hidden = true;
    if (mode === "start") {
      skipBtn.disabled = true;
      skipBtn.style.visibility = "hidden";
      acceptBtn.disabled = false;
      acceptBtn.style.visibility = "";
      acceptBtn.textContent = "Начать собеседование";
      return;
    }
    if (mode === "retry") {
      skipBtn.disabled = true;
      skipBtn.style.visibility = "hidden";
      acceptBtn.disabled = true;
      acceptBtn.style.visibility = "hidden";
      return;
    }
    skipBtn.disabled = false;
    skipBtn.style.visibility = "";
    skipBtn.textContent = "Пропустить вопрос";
    acceptBtn.disabled = false;
    acceptBtn.style.visibility = "";
    acceptBtn.textContent = "Засчитать ответ";
  }

  function finishInterview() {
    stopTimer();
    if (voiceRecording) stopVoiceRecording({ discard: true, silent: true });
    releaseVoiceStream();
    hideMicIndicator();
    interviewFinished = true;
    interviewStarted = false;
    currentQuestion = null;
    const total = interviewPool.length || 0;
    const percent = total ? Math.round((acceptedCount / total) * 100) : 0;
    answerEl.classList.add("interview-result");
    answerEl.hidden = false;

    if (interviewMode === "voice") {
      badgeCategory.textContent = "Итог";
      questionTitleEl.hidden = true;
      questionTitleEl.textContent = "";
      if (voiceReport) {
        updateVoiceResultUi({ report: voiceReport });
      } else {
        updateVoiceResultUi({});
        startVoiceReportAnalysis();
      }
    } else if (interviewMode === "timer") {
      badgeCategory.textContent = "Итог";
      questionTitleEl.textContent = "Раунд завершён";
      answerEl.innerHTML = `<p class="interview-result__line">Просмотрено вопросов: <strong>${total}</strong>. Без оценки — режим по таймеру.</p>`;
      counterEl.textContent = total ? `${total} / ${total}` : "0 / 0";
      setQuestionPhoto(RESULT_PHOTOS.neutral);
    } else {
      const weak = getWeakCategories();
      const kind = percent >= 70 ? "good" : percent >= 40 ? "so-so" : "bad";
      badgeCategory.textContent = "Итог";
      questionTitleEl.textContent = `Вы прошли ${acceptedCount} из ${total}`;
      answerEl.innerHTML = [
        `<p class="interview-result__line">Пропущено: <strong>${skippedCount}</strong> · результат: <strong>${percent}%</strong></p>`,
        weak.length
          ? `<p class="interview-result__line">Стоит подтянуть: <strong>${escapeHtml(weak.join(", "))}</strong>.</p>`
          : `<p class="interview-result__line">Все выбранные разделы закрыты уверенно.</p>`
      ].join("");
      updateCounter();
      setQuestionPhoto(RESULT_PHOTOS[kind]);
    }

    aiZone.style.display = "none";
    setInterviewNavMode("retry");
    if (interviewMode === "manual") saveInterviewHistoryEntry();
    writeInterviewSessionState();
  }

  function renderCard() {
    answerEl.classList.remove("interview-result");
    questionTitleEl.hidden = false;
    if (interviewMode !== "voice") {
      if (voiceRecording) stopVoiceRecording({ discard: true, silent: true });
      hideMicIndicator();
      releaseVoiceStream();
    }
    const item = currentPoolItem();
    if (!item) {
      stopTimer();
      if (voiceRecording) stopVoiceRecording({ discard: true, silent: true });
      hideMicIndicator();
      releaseVoiceStream();
      currentQuestion = null;
      questionTitleEl.textContent = "Не удалось загрузить вопросы";
      badgeCategory.textContent = "—";
      counterEl.textContent = "0 / 0";
      answerEl.hidden = true;
      aiZone.style.display = "none";
      toggleAnswerBtn.disabled = true;
      setInterviewNavMode("retry");
      writeInterviewSessionState();
      return;
    }

    if (!interviewStarted) {
      stopTimer();
      if (voiceRecording) stopVoiceRecording({ discard: true, silent: true });
      hideMicIndicator();
      releaseVoiceStream();
      currentQuestion = null;
      badgeCategory.textContent = "—";
      questionTitleEl.textContent = "Настройте собеседование, чтобы начать";
      answerEl.hidden = true;
      answerEl.innerHTML = "";
      aiZone.style.display = "none";
      toggleAnswerBtn.disabled = true;
      toggleAnswerBtn.setAttribute("aria-expanded", "false");
      toggleAnswerBtn.textContent = "Посмотреть ответ";
      setInterviewNavMode("start");
      updateCounter();
      writeInterviewSessionState();
      return;
    }

    currentQuestion = item;
    badgeCategory.textContent = chipLabel(item.category);
    questionTitleEl.textContent = item.title;
    questionTitleEl.style.color = "";
    renderAnswer(item);
    toggleAnswerBtn.disabled = false;
    if (interviewMode === "voice") {
      setInterviewNavMode("voice");
      startTimer();
      beginVoiceQuestion();
    } else if (interviewMode === "timer") {
      setInterviewNavMode("timer");
      startTimer();
    } else {
      setInterviewNavMode("normal");
      stopTimer();
    }
    updateCounter();
    writeInterviewSessionState();
  }

  function rebuildInterviewPool({ deferStart = false } = {}) {
    releaseVoiceStream();
    interviewPool = buildInterviewPool();
    interviewIndex = 0;
    interviewStarted = !deferStart;
    interviewFinished = false;
    acceptedCount = 0;
    skippedCount = 0;
    roundStats = new Map();
    roundAnswers = [];
    voiceUploads = new Map();
    roundId = newRoundId();
    voiceAnalysisToken += 1;
    voiceReport = null;
    voiceAnalysisRunning = false;
    pendingRestoreAnswerExpanded = false;
    setQuestionPhoto(DEFAULT_PHOTO);
    renderCard();
  }

  function setDefaultCategorySelected() {
    const preferred = allCategories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : allCategories[0];
    selectedCategories = new Set(preferred ? [preferred] : []);
  }

  function readInterviewSettings() {
    try {
      const mode = localStorage.getItem(INTERVIEW_MODE_KEY);
      if (mode === "manual" || (mode === "voice" && voiceSupport.supported)) {
        interviewMode = mode;
      }
      const seconds = Number(localStorage.getItem(INTERVIEW_TIMER_SECONDS_KEY));
      if (INTERVIEW_TIMER_STEPS.includes(seconds)) timerSeconds = seconds;
      const voice = Number(localStorage.getItem(INTERVIEW_VOICE_SECONDS_KEY));
      if (VOICE_TIMER_STEPS.includes(voice)) voiceSeconds = voice;
    } catch {}
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
    setupVoiceSeconds = voiceSeconds;
  }

  function persistInterviewSettings() {
    try {
      localStorage.setItem(INTERVIEW_MODE_KEY, interviewMode);
      localStorage.setItem(INTERVIEW_TIMER_SECONDS_KEY, String(timerSeconds));
      localStorage.setItem(INTERVIEW_VOICE_SECONDS_KEY, String(voiceSeconds));
    } catch {}
  }

  function updateSetupStartLabel() {
    const noCategories = setupCategories.size === 0;
    setupStartBtn.disabled = noCategories;
    setupCategoryNote.hidden = !noCategories;
    if (interviewFinished) {
      setupStartBtn.textContent = "Начать сначала";
      return;
    }
    if (interviewStarted) {
      const sameCategories = setupCategories.size === selectedCategories.size
        && [...setupCategories].every((category) => selectedCategories.has(category));
      const sameTime = setupMode === "voice" ? setupVoiceSeconds === voiceSeconds : true;
      const unchanged = sameCategories
        && setupMode === interviewMode
        && sameTime;
      setupStartBtn.textContent = unchanged ? "Продолжить" : "Начать заново";
      return;
    }
    setupStartBtn.textContent = "Начать собеседование";
  }

  function syncSetupUi() {
    setupDialog.dataset.setupMode = setupMode;
    setupModeButtons.forEach((button) => {
      const active = button.dataset.interviewMode === setupMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setupVoiceOptions.classList.toggle("is-open", setupMode === "voice");
    setupVoiceOptions.inert = setupMode !== "voice";
    setupVoiceButtons.forEach((button) => {
      const active = Number(button.dataset.voiceSeconds) === setupVoiceSeconds;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateSetupStartLabel();
  }

  function openSetupDialog({ allowCancel = false } = {}) {
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
    setupVoiceSeconds = voiceSeconds;
    setupCategories = new Set(selectedCategories);
    syncChipActiveState();
    pauseTimer();
    writeInterviewSessionState();
    syncSetupUi();
    setupCancelBtn.hidden = !allowCancel;
    setupCloseBtn.hidden = !allowCancel;
    if (!setupDialog.open) setupDialog.showModal();
    requestAnimationFrame(() => setupStartBtn.focus());
  }

  function closeSetupDialog({ resume = true } = {}) {
    if (setupDialog.open) setupDialog.close();
    if (resume) {
      resumeTimer();
      writeInterviewSessionState();
    }
  }

  function openHistoryDialog() {
    historyResumeTimer = (interviewMode === "timer" || interviewMode === "voice")
      && interviewStarted && !interviewFinished && !timerPaused;
    pauseTimer();
    writeInterviewSessionState();
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
    collapseHistoryDetails();
    historyList.scrollTop = 0;
    renderInterviewHistory();
    if (!historyDialog.open) historyDialog.showModal();
  }

  function closeHistoryDialog() {
    collapseHistoryDetails();
    if (historyDialog.open) historyDialog.close();
    if (historyResumeTimer) {
      historyResumeTimer = false;
      resumeTimer();
      writeInterviewSessionState();
    }
  }

  function applySetupOrContinue() {
    if (!setupCategories.size) {
      setupStartBtn.focus();
      return;
    }
    const sameCategories = setupCategories.size === selectedCategories.size
      && [...setupCategories].every((category) => selectedCategories.has(category));
    const sameTime = setupMode === "timer"
      ? setupTimerSeconds === timerSeconds
      : setupMode === "voice" ? setupVoiceSeconds === voiceSeconds : true;
    const unchanged = interviewStarted && !interviewFinished
      && sameCategories && setupMode === interviewMode && sameTime;
    if (unchanged) {
      closeSetupDialog({ resume: true });
      return;
    }
    selectedCategories = new Set(setupCategories);
    persistSelectedCategories();
    startInterviewFromSetup();
  }

  function startInterviewFromSetup() {
    if (!setupCategories.size) return;
    interviewMode = setupMode;
    timerSeconds = setupTimerSeconds;
    voiceSeconds = setupVoiceSeconds;
    persistInterviewSettings();
    closeSetupDialog({ resume: false });
    stopTimer();
    stopVoiceRecording({ discard: true, silent: true });
    rebuildInterviewPool({ deferStart: false });
  }

  function isTimedMode() {
    return interviewMode === "timer" || interviewMode === "voice";
  }

  function activeTimerSeconds() {
    return interviewMode === "voice" ? voiceSeconds : timerSeconds;
  }

  function stopTimer() {
    cancelAnimationFrame(timerFrame);
    timerFrame = 0;
    timerPaused = false;
    timerPausedByVisibility = false;
    timerRemainingMs = 0;
    timerLabelValue = "";
    timerEl.hidden = true;
    timerEl.classList.remove("is-expired");
    timerFill.style.width = "0%";
    timerLabel.textContent = `${activeTimerSeconds()} с`;
  }

  function setTimerVisual(remaining) {
    const total = Math.max(1, activeTimerSeconds() * 1000);
    const safeRemaining = Math.max(0, Math.min(total, remaining));
    timerFill.style.width = `${(safeRemaining / total) * 100}%`;
    const secondsLeft = Math.max(0, Math.ceil(safeRemaining / 1000));
    if (String(secondsLeft) !== timerLabelValue) {
      timerLabelValue = String(secondsLeft);
      timerLabel.textContent = `${secondsLeft} с`;
    }
  }

  function startTimer() {
    stopTimer();
    if (!isTimedMode() || !interviewStarted || interviewFinished) return;
    timerRemainingMs = activeTimerSeconds() * 1000;
    timerDeadline = performance.now() + timerRemainingMs;
    timerPaused = false;
    timerEl.hidden = false;
    timerEl.classList.remove("is-expired");
    setTimerVisual(timerRemainingMs);
    tickTimer();
  }

  function tickTimer() {
    if (timerPaused || !isTimedMode() || !interviewStarted || interviewFinished) return;
    const remaining = Math.max(0, timerDeadline - performance.now());
    setTimerVisual(remaining);
    if (remaining <= 0) {
      timerFrame = 0;
      if (interviewMode === "voice") {
        timerEl.classList.add("is-expired");
        if (voiceRecording) {
          micIndicator.setAttribute("aria-label", "Время вышло — можно ещё говорить");
        }
        return;
      }
      advanceByTimer();
      return;
    }
    timerFrame = requestAnimationFrame(tickTimer);
  }

  function pauseTimer() {
    if (!isTimedMode() || !interviewStarted || interviewFinished || timerPaused) return;
    if (timerFrame) cancelAnimationFrame(timerFrame);
    timerFrame = 0;
    timerRemainingMs = Math.max(0, timerDeadline - performance.now());
    timerPaused = true;
    setTimerVisual(timerRemainingMs);
    if (interviewMode === "voice") pauseVoiceRecording();
  }

  function resumeTimer() {
    timerPausedByVisibility = false;
    if (!isTimedMode() || !interviewStarted || interviewFinished || !timerPaused) return;
    if (timerRemainingMs <= 0) {
      timerRemainingMs = interviewMode === "voice" ? 0 : activeTimerSeconds() * 1000;
    }
    timerPaused = false;
    timerDeadline = performance.now() + timerRemainingMs;
    timerEl.hidden = false;
    if (timerRemainingMs <= 0) timerEl.classList.add("is-expired");
    else timerEl.classList.remove("is-expired");
    setTimerVisual(timerRemainingMs);
    if (interviewMode === "voice") resumeVoiceRecording();
    if (!timerFrame) tickTimer();
  }

  function advanceByTimer() {
    if (!interviewStarted || interviewFinished) return;
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  }

  function persistSelectedCategories() {
    try {
      localStorage.setItem(INTERVIEW_SELECTED_CATEGORIES_KEY, JSON.stringify(Array.from(selectedCategories)));
    } catch {}
  }

  function syncChipActiveState() {
    categoryFilters.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", setupCategories.has(chip.dataset.category));
    });
    updateCounter();
  }

  function renderCategoryChips() {
    categoryFilters.innerHTML = "";

    allCategories.forEach((category) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip active";
      chip.dataset.category = category;
      chip.textContent = chipLabel(category);
      chip.addEventListener("click", () => {
        if (setupCategories.has(category)) {
          setupCategories.delete(category);
        } else {
          setupCategories.add(category);
        }
        syncChipActiveState();
        updateSetupStartLabel();
      });
      categoryFilters.appendChild(chip);
    });
  }

  function flattenQuestions(payload) {
    const sections = Array.isArray(payload) ? payload : payload?.data || payload?.questions || [];
    const categories = [];
    const items = [];
    sections.forEach((section) => {
      const category = canonicalCategory(section?.category);
      if (!category || isExcludedCategory(category) || !Array.isArray(section.items)) return;
      if (!categories.includes(category)) categories.push(category);
      section.items.forEach((item) => {
        if (!item?.id || !item?.title || isExcludedItem(item)) return;
        items.push({ ...item, category });
      });
    });
    categories.sort((a, b) => (CATEGORY_RANK.get(a) ?? 999) - (CATEGORY_RANK.get(b) ?? 999));
    return { categories, items };
  }

  async function loadQuestionsData() {
    const res = await fetch(QUESTIONS_DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Questions data fetch failed: ${res.status}`);
    return res.json();
  }

  async function bootstrap() {
    readInterviewSettings();
    questionTitleEl.textContent = "Загружаю вопросы…";
    const [rawData] = await Promise.all([
      loadQuestionsData(),
      fetchPublicAiAnswers().catch((e) => console.warn("Interview page: public AI preload failed", e))
    ]);
    const { categories, items } = flattenQuestions(rawData);
    allCategories = categories;
    allItems = items;
    let restoredSelection = false;
    try {
      const saved = JSON.parse(localStorage.getItem(INTERVIEW_SELECTED_CATEGORIES_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        const filtered = [...new Set(saved.map(canonicalCategory))]
          .filter((category) => allCategories.includes(category));
        if (filtered.length) {
          selectedCategories = new Set(filtered);
          restoredSelection = true;
        }
      }
    } catch {}
    // First visit: start from the focused "Теория" direction.
    if (!restoredSelection || !selectedCategories.size) {
      setDefaultCategorySelected();
    }
    setupCategories = new Set(selectedCategories);
    persistSelectedCategories();
    renderCategoryChips();
    syncChipActiveState();
    if (!allItems.length) {
      questionTitleEl.textContent = "Не удалось загрузить вопросы";
      revealInterviewPage();
      return;
    }
    if (!restoreInterviewSessionStateIfPossible({ useSessionCategories: !restoredSelection })) {
      rebuildInterviewPool({ deferStart: true });
      openSetupDialog({ allowCancel: false });
    }
    restoreInterviewScrollState();
  }

  toggleAnswerBtn.addEventListener("click", () => {
    const expanded = toggleAnswerBtn.getAttribute("aria-expanded") === "true";
    answerEl.hidden = expanded;
    toggleAnswerBtn.setAttribute("aria-expanded", String(!expanded));
    toggleAnswerBtn.textContent = expanded ? "Посмотреть ответ" : "Скрыть ответ";
    if (!expanded) {
      aiZone.style.display = "";
      refreshAiForCurrentQuestion();
    } else {
      aiZone.style.display = "none";
      aiSupplementEl.style.display = "none";
    }
    writeInterviewSessionState();
  });

  skipBtn.addEventListener("click", () => {
    if (!interviewPool.length || interviewFinished || !interviewStarted) return;
    if (interviewMode === "voice") {
      finalizeVoiceAnswer("skipped");
      return;
    }
    if (currentQuestion) bumpRoundStat(currentQuestion, "skipped");
    if (currentQuestion) recordRoundAnswer(currentQuestion, "skipped");
    skippedCount += 1;
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  });

  acceptBtn.addEventListener("click", () => {
    if (!interviewPool.length) {
      openSetupDialog({ allowCancel: false });
      return;
    }
    if (interviewFinished) {
      openSetupDialog({ allowCancel: true });
      return;
    }
    if (!interviewStarted) {
      openSetupDialog({ allowCancel: false });
      return;
    }
    if (interviewMode === "voice") {
      finalizeVoiceAnswer("answered");
      return;
    }
    if (currentQuestion) setProgressMark(currentQuestion, "studied");
    if (currentQuestion) bumpRoundStat(currentQuestion, "accepted");
    if (currentQuestion) recordRoundAnswer(currentQuestion, "accepted");
    acceptedCount += 1;
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  });

  setupModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.interviewMode;
      if (mode === "voice" && !voiceSupport.supported) {
        voiceNote.hidden = false;
        voiceNote.classList.add("is-highlight");
        window.setTimeout(() => voiceNote.classList.remove("is-highlight"), 900);
        return;
      }
      setupMode = mode === "voice" ? "voice" : "manual";
      syncSetupUi();
    });
  });
  setupVoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = Number(button.dataset.voiceSeconds);
      if (VOICE_TIMER_STEPS.includes(seconds)) {
        setupVoiceSeconds = seconds;
        syncSetupUi();
      }
    });
  });
  setupStartBtn.addEventListener("click", applySetupOrContinue);
  setupCancelBtn.addEventListener("click", () => closeSetupDialog({ resume: true }));
  setupCloseBtn.addEventListener("click", () => closeSetupDialog({ resume: true }));
  micIndicator.addEventListener("click", async () => {
    if (!voiceSupport.supported) return;
    const voiceRoundActive = interviewStarted && interviewMode === "voice" && !interviewFinished;
    if (micPermissionGranted || (voiceStream && voiceStream.active)) {
      showMicHint(voiceRoundActive
        ? "Микрофон включён. Идёт запись ответа."
        : "Разрешение на микрофон уже есть. Он включится, когда вы начнёте голосовое собеседование.");
      return;
    }
    setMicIndicatorOff("Запрашиваю доступ к микрофону");
    try {
      await ensureVoiceStream();
      micPermissionGranted = true;
      if (voiceRoundActive) {
        setMicIndicatorIdle("Микрофон включён");
        showMicHint("Микрофон включён. Идёт запись ответа.");
        if (!voiceRecorder && !voiceAnswerCommitted) beginVoiceQuestion();
      } else {
        releaseVoiceStream();
        setMicIndicatorReady();
        showMicHint("Разрешение на микрофон получено. Он включится, когда вы начнёте голосовое собеседование.");
      }
    } catch (error) {
      micPermissionGranted = false;
      const message = voiceMicErrorMessage(error);
      setMicIndicatorError(message);
      showMicHint(message);
    }
  });
  historyBtn.addEventListener("click", openHistoryDialog);
  historyCloseBtn.addEventListener("click", closeHistoryDialog);
  historyDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeHistoryDialog();
  });
  historyDialog.addEventListener("click", (event) => {
    if (event.target === historyDialog) closeHistoryDialog();
  });
  settingsBtn.addEventListener("click", () => openSetupDialog({ allowCancel: true }));
  setupDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (interviewStarted || interviewFinished) closeSetupDialog({ resume: true });
  });
  setupDialog.addEventListener("click", (event) => {
    if (event.target !== setupDialog) return;
    if (interviewStarted || interviewFinished) closeSetupDialog({ resume: true });
  });

  window.addEventListener("scroll", queueInterviewScrollSave, { passive: true });
  window.addEventListener("pagehide", writeInterviewScrollState);

  aiAppendBtn.addEventListener("click", onAiAppendClick);

  window.addEventListener("qatodev:voice-report-ready", (event) => {
    const detail = event?.detail || {};
    if (!detail.report || detail.jobId !== roundId) return;
    voiceReport = detail.report;
    voiceAnalysisRunning = false;
    updateVoiceResultUi({ report: detail.report });
    setInterviewNavMode("retry");
    writeInterviewSessionState();
    if (historyDialog.open) renderInterviewHistory();
  });

  document.addEventListener("shared-auth:ready", () => {
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
  });
  window.addEventListener("online", () => scheduleInterviewHistorySync(0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      // Скрытая вкладка: останавливаем таймер и распознавание речи,
      // чтобы фоновая вкладка не жгла CPU и не держала микрофон.
      if (isTimedMode() && interviewStarted && !interviewFinished && !timerPaused) {
        pauseTimer();
        timerPausedByVisibility = true;
      }
      return;
    }
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
    if (timerPausedByVisibility) {
      resumeTimer();
    }
  });
  window.setTimeout(() => scheduleInterviewHistorySync(0), 1200);
  window.setInterval(() => {
    if (document.visibilityState === "visible") scheduleInterviewHistorySync(0);
  }, INTERVIEW_HISTORY_SYNC_INTERVAL_MS);
  try {
    window.AppSupabase?.client?.auth?.onAuthStateChange?.((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)) return;
      updateInterviewLocalNote();
      scheduleInterviewHistorySync(200);
    });
  } catch {}

  document.addEventListener("keydown", (e) => {
    if (setupDialog.open) return;
    if (e.key === " " && document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (!interviewStarted && !interviewFinished && e.key !== "Enter") return;
    if (e.key === " ") {
      e.preventDefault();
      if ((interviewMode === "timer" || interviewMode === "voice") && interviewStarted && !interviewFinished) {
        openSetupDialog({ allowCancel: true });
      } else if (!toggleAnswerBtn.disabled) {
        toggleAnswerBtn.click();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      skipBtn.click();
    } else if (e.key === "Enter") {
      if (document.activeElement && document.activeElement !== skipBtn && document.activeElement !== acceptBtn && document.activeElement !== toggleAnswerBtn) return;
      e.preventDefault();
      acceptBtn.click();
    }
  });

  applyVoiceSupportUi();
  detectMicPermission();
  bootstrap().catch((e) => {
    console.error("Interview bootstrap failed", e);
    questionTitleEl.textContent = "Не удалось загрузить вопросы";
    if (stageEl) stageEl.classList.add("stage-error");
    revealInterviewPage();
  });
});
