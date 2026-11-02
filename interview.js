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
  const settingsWrap = document.getElementById("interview-settings-wrap");
  const settingsBtn = document.getElementById("interview-settings-btn");
  const settingsBtnLabel = document.getElementById("interview-settings-btn-label");
  const historyBtn = document.getElementById("interview-history-btn");
  const historyDialog = document.getElementById("interview-history");
  const historyList = document.getElementById("interview-history-list");
  const historyLocalNote = document.getElementById("interview-history-local-note");
  const historyCloseBtn = document.getElementById("interview-history-close");
  const timerEl = document.getElementById("interview-timer");
  const timerFill = document.getElementById("interview-timer-fill");
  const timerLabel = document.getElementById("interview-timer-label");
  const setupDialog = document.getElementById("interview-setup");
  const setupStartBtn = document.getElementById("interview-setup-start");
  const setupCancelBtn = document.getElementById("interview-setup-cancel");
  const setupCloseBtn = document.getElementById("interview-setup-close");
  const setupTimerOptions = document.getElementById("interview-timer-options");
  const setupModeButtons = Array.from(document.querySelectorAll("[data-interview-mode]"));
  const setupTimerButtons = Array.from(document.querySelectorAll("[data-timer-seconds]"));

  if (!categoryFilters || !questionTitleEl || !answerEl || !toggleAnswerBtn || !skipBtn || !acceptBtn
    || !settingsWrap || !settingsBtn || !settingsBtnLabel || !timerEl || !timerFill || !timerLabel
    || !historyBtn || !historyDialog || !historyList || !historyLocalNote || !historyCloseBtn
    || !setupDialog || !setupStartBtn || !setupCancelBtn || !setupCloseBtn || !setupTimerOptions) return;

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
  const INTERVIEW_TIMER_STEPS = [15, 30, 60];
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
  let publicAiMap = new Map();
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
  let timerLabelValue = "";

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
      const timerActive = interviewMode === "timer" && interviewStarted && !interviewFinished;
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
    roundAnswers = Array.isArray(saved.roundAnswers)
      ? saved.roundAnswers
        .filter((answer) => answer?.id && answer?.title)
        .map((answer) => ({
          id: String(answer.id),
          title: String(answer.title),
          category: canonicalCategory(answer.category),
          status: answer.status === "skipped" ? "skipped" : "accepted"
        }))
      : [];
    if (saved.mode === "manual" || saved.mode === "timer") interviewMode = saved.mode;
    const savedTimerSeconds = Number(saved.timerSeconds);
    if (INTERVIEW_TIMER_STEPS.includes(savedTimerSeconds)) timerSeconds = savedTimerSeconds;
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
    setupCategories = new Set(selectedCategories);
    persistSelectedCategories();
    syncChipActiveState();
    const savedTimerRemaining = Number(saved.timerRemainingMs);
    const savedTimerSavedAt = Number(saved.timerSavedAt);
    let restoredTimerRemaining = 0;
    if (interviewMode === "timer" && interviewStarted && !interviewFinished) {
      if (Number.isFinite(savedTimerRemaining) && savedTimerRemaining >= 0) {
        restoredTimerRemaining = saved.timerPaused
          ? savedTimerRemaining
          : Math.max(0, savedTimerRemaining - Math.max(0, Date.now() - (Number.isFinite(savedTimerSavedAt) ? savedTimerSavedAt : Date.now())));
      } else {
        restoredTimerRemaining = timerSeconds * 1000;
      }
      if (restoredTimerRemaining <= 0) restoredTimerRemaining = timerSeconds * 1000;
      restoredTimerRemaining = Math.min(restoredTimerRemaining, timerSeconds * 1000);
    }
    pendingRestoreAnswerExpanded = !!saved.answerExpanded;
    if (interviewFinished) {
      finishInterview();
    } else {
      renderCard();
      if (!interviewStarted) {
        openSetupDialog({ allowCancel: false });
      } else if (interviewMode === "timer") {
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
      prev.title = "Предыдущий ответ";
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
      next.title = "Следующий ответ";
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

  async function getAiProxyHeaders() {
    const api = window.AppSupabase || null;
    const headers = {
      apikey: api?.anonKey || SUPABASE_ANON_KEY_DIRECT,
      "Content-Type": "application/json"
    };
    try {
      const session = api?.getSession ? await api.getSession() : null;
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {}
    return headers;
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

  function recordRoundAnswer(item, status) {
    if (!item?.id || !item?.title) return;
    const existing = roundAnswers.find((answer) => answer.id === item.id);
    const value = {
      id: item.id,
      title: item.title,
      category: item.category,
      status: status === "skipped" ? "skipped" : "accepted"
    };
    if (existing) Object.assign(existing, value);
    else roundAnswers.push(value);
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
          status: question.status === "skipped" ? "skipped" : "accepted"
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
    const userId = await getInterviewCloudUserId();
    historyLocalNote.hidden = !!userId;
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
      historyLocalNote.hidden = true;
      const { data: remoteRows, error } = await client
        .from(INTERVIEW_HISTORY_TABLE)
        .select("user_id,id,number,created_at,categories,accepted,skipped,total,percent,questions")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;

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
        .filter((entry) => !remoteIds.has(entry.id))
        .map((entry) => historyRowFromLocal(entry, userId));
      if (uploadRows.length) {
        const { error: upsertError } = await client
          .from(INTERVIEW_HISTORY_TABLE)
          .upsert(uploadRows, { onConflict: "user_id,id", ignoreDuplicates: true });
        if (upsertError) throw upsertError;
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

  function renderInterviewHistory() {
    historyList.innerHTML = "";
    const history = readInterviewHistory();
    if (!history.length) {
      const empty = document.createElement("p");
      empty.className = "interview-history__empty";
      empty.textContent = "Пока нет завершённых ручных собеседований.";
      historyList.appendChild(empty);
      return;
    }
    history.forEach((entry, index) => {
      const details = document.createElement("details");
      details.className = "interview-history__item";

      const summary = document.createElement("summary");
      const summaryTop = document.createElement("div");
      summaryTop.className = "interview-history__summary";

      const name = document.createElement("span");
      name.className = "interview-history__name";
      name.textContent = `Собеседование ${history.length - index}`;

      const score = document.createElement("span");
      score.className = "interview-history__score";
      score.textContent = `${entry.accepted || 0} из ${entry.total || 0} · ${entry.percent || 0}%`;
      summaryTop.append(name, score);

      const date = document.createElement("span");
      date.className = "interview-history__date";
      date.textContent = formatHistoryDate(entry.ts);

      const link = document.createElement("a");
      link.className = "interview-history__link";
      link.href = "questions.html";
      link.setAttribute("aria-label", "Перейти на страницу вопросов");
      link.innerHTML = '<span>К вопросам</span><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M21 3l-9 9"></path><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"></path></svg>';
      link.addEventListener("click", (event) => event.stopPropagation());

      const metaLeft = document.createElement("div");
      metaLeft.className = "interview-history__meta-left";
      metaLeft.append(date);

      const categories = document.createElement("div");
      categories.className = "interview-history__categories";
      (entry.categories || []).forEach((category) => {
        const chip = document.createElement("span");
        chip.className = "interview-history__category";
        chip.textContent = chipLabel(canonicalCategory(category));
        categories.appendChild(chip);
      });

      const meta = document.createElement("div");
      meta.className = "interview-history__meta";
      meta.append(metaLeft, categories);

      const summaryAction = document.createElement("div");
      summaryAction.className = "interview-history__summary-action";
      summaryAction.appendChild(link);

      summary.append(summaryTop, meta, summaryAction);

      const body = document.createElement("div");
      body.className = "interview-history__questions";
      (entry.questions || []).forEach((question) => {
        const row = document.createElement("div");
        row.className = `interview-history__question is-${question.status === "skipped" ? "skipped" : "accepted"}`;

        const title = document.createElement("span");
        title.className = "interview-history__question-title";
        title.textContent = question.title;
        row.appendChild(title);

        const categoryLabel = chipLabel(canonicalCategory(question.category));
        if (categoryLabel) {
          const category = document.createElement("span");
          category.className = "interview-history__category interview-history__question-category";
          category.textContent = categoryLabel;
          row.appendChild(category);
        }

        body.appendChild(row);
      });

      details.append(summary, body);
      historyList.appendChild(details);
    });
  }

  function getSelectedItemsFlat() {
    return allItems.filter((item) => selectedCategories.has(item.category));
  }

  function buildInterviewPool() {
    const pool = shuffleInPlace(getSelectedItemsFlat());
    return pool.slice(0, Math.min(pool.length, INTERVIEW_POOL_LIMIT));
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
    stageEl.classList.toggle("is-running", mode === "normal" || mode === "timer");
    stageEl.classList.toggle("is-timer", mode === "timer");
    stageEl.classList.toggle("is-retry", mode === "retry");
    toggleAnswerBtn.hidden = mode !== "normal";
    toggleAnswerBtn.disabled = mode !== "normal";
    const showSettings = mode === "normal" || mode === "timer" || mode === "retry";
    settingsWrap.hidden = !showSettings;
    historyBtn.hidden = !showSettings;
    settingsBtn.hidden = !showSettings;
    if (showSettings) {
      const timerMode = mode === "timer";
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
    timerEl.hidden = true;
    if (mode === "start") {
      skipBtn.disabled = true;
      skipBtn.style.visibility = "hidden";
      acceptBtn.disabled = false;
      acceptBtn.style.visibility = "";
      acceptBtn.textContent = "Начать собеседование";
      acceptBtn.title = "Начать собеседование (Enter)";
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
    skipBtn.title = "Пропустить вопрос (→)";
    acceptBtn.disabled = false;
    acceptBtn.style.visibility = "";
    acceptBtn.textContent = "Засчитать ответ";
    acceptBtn.title = "Засчитать ответ (Enter)";
  }

  function finishInterview() {
    stopTimer();
    interviewFinished = true;
    interviewStarted = false;
    currentQuestion = null;
    const total = interviewPool.length || 0;
    const percent = total ? Math.round((acceptedCount / total) * 100) : 0;
    answerEl.classList.add("interview-result");
    answerEl.hidden = false;

    if (interviewMode === "timer") {
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
    const item = currentPoolItem();
    if (!item) {
      stopTimer();
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
    if (interviewMode === "timer") {
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
    interviewPool = buildInterviewPool();
    interviewIndex = 0;
    interviewStarted = !deferStart;
    interviewFinished = false;
    acceptedCount = 0;
    skippedCount = 0;
    roundStats = new Map();
    roundAnswers = [];
    roundId = newRoundId();
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
      if (mode === "manual" || mode === "timer") interviewMode = mode;
      const seconds = Number(localStorage.getItem(INTERVIEW_TIMER_SECONDS_KEY));
      if (INTERVIEW_TIMER_STEPS.includes(seconds)) timerSeconds = seconds;
    } catch {}
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
  }

  function persistInterviewSettings() {
    try {
      localStorage.setItem(INTERVIEW_MODE_KEY, interviewMode);
      localStorage.setItem(INTERVIEW_TIMER_SECONDS_KEY, String(timerSeconds));
    } catch {}
  }

  function updateSetupStartLabel() {
    if (interviewFinished) {
      setupStartBtn.textContent = "Начать сначала";
      return;
    }
    if (interviewStarted) {
      const sameCategories = setupCategories.size === selectedCategories.size
        && [...setupCategories].every((category) => selectedCategories.has(category));
      const unchanged = sameCategories
        && setupMode === interviewMode
        && setupTimerSeconds === timerSeconds;
      setupStartBtn.textContent = unchanged ? "Продолжить" : "Начать заново";
      return;
    }
    setupStartBtn.textContent = "Начать собеседование";
  }

  function syncSetupUi() {
    setupModeButtons.forEach((button) => {
      const active = button.dataset.interviewMode === setupMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setupTimerOptions.hidden = setupMode !== "timer";
    setupTimerButtons.forEach((button) => {
      const active = Number(button.dataset.timerSeconds) === setupTimerSeconds;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateSetupStartLabel();
  }

  function openSetupDialog({ allowCancel = false } = {}) {
    setupMode = interviewMode;
    setupTimerSeconds = timerSeconds;
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
    historyResumeTimer = interviewMode === "timer" && interviewStarted && !interviewFinished && !timerPaused;
    pauseTimer();
    writeInterviewSessionState();
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
    renderInterviewHistory();
    if (!historyDialog.open) historyDialog.showModal();
  }

  function closeHistoryDialog() {
    if (historyDialog.open) historyDialog.close();
    if (historyResumeTimer) {
      historyResumeTimer = false;
      resumeTimer();
      writeInterviewSessionState();
    }
  }

  function applySetupOrContinue() {
    const sameCategories = setupCategories.size === selectedCategories.size
      && [...setupCategories].every((category) => selectedCategories.has(category));
    const unchanged = interviewStarted && !interviewFinished
      && sameCategories && setupMode === interviewMode && setupTimerSeconds === timerSeconds;
    if (unchanged) {
      closeSetupDialog({ resume: true });
      return;
    }
    selectedCategories = new Set(setupCategories);
    persistSelectedCategories();
    startInterviewFromSetup();
  }

  function startInterviewFromSetup() {
    interviewMode = setupMode;
    timerSeconds = setupTimerSeconds;
    persistInterviewSettings();
    closeSetupDialog({ resume: false });
    stopTimer();
    rebuildInterviewPool({ deferStart: false });
  }

  function stopTimer() {
    cancelAnimationFrame(timerFrame);
    timerFrame = 0;
    timerPaused = false;
    timerRemainingMs = 0;
    timerLabelValue = "";
    timerEl.hidden = true;
    timerFill.style.width = "0%";
    timerLabel.textContent = `${timerSeconds} с`;
  }

  function setTimerVisual(remaining) {
    const total = Math.max(1, timerSeconds * 1000);
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
    if (interviewMode !== "timer" || !interviewStarted || interviewFinished) return;
    timerRemainingMs = timerSeconds * 1000;
    timerDeadline = performance.now() + timerRemainingMs;
    timerPaused = false;
    timerEl.hidden = false;
    setTimerVisual(timerRemainingMs);
    tickTimer();
  }

  function tickTimer() {
    if (timerPaused || interviewMode !== "timer" || !interviewStarted || interviewFinished) return;
    const remaining = Math.max(0, timerDeadline - performance.now());
    setTimerVisual(remaining);
    if (remaining <= 0) {
      timerFrame = 0;
      advanceByTimer();
      return;
    }
    timerFrame = requestAnimationFrame(tickTimer);
  }

  function pauseTimer() {
    if (interviewMode !== "timer" || !interviewStarted || interviewFinished || timerPaused) return;
    if (timerFrame) cancelAnimationFrame(timerFrame);
    timerFrame = 0;
    timerRemainingMs = Math.max(0, timerDeadline - performance.now());
    timerPaused = true;
    setTimerVisual(timerRemainingMs);
  }

  function resumeTimer() {
    if (interviewMode !== "timer" || !interviewStarted || interviewFinished || !timerPaused) return;
    if (timerRemainingMs <= 0) timerRemainingMs = timerSeconds * 1000;
    timerPaused = false;
    timerDeadline = performance.now() + timerRemainingMs;
    timerEl.hidden = false;
    setTimerVisual(timerRemainingMs);
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
        if (setupCategories.has(category) && setupCategories.size > 1) {
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
      setupMode = button.dataset.interviewMode === "timer" ? "timer" : "manual";
      syncSetupUi();
    });
  });
  setupTimerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = Number(button.dataset.timerSeconds);
      if (INTERVIEW_TIMER_STEPS.includes(seconds)) {
        setupTimerSeconds = seconds;
        syncSetupUi();
      }
    });
  });
  setupStartBtn.addEventListener("click", applySetupOrContinue);
  setupCancelBtn.addEventListener("click", () => closeSetupDialog({ resume: true }));
  setupCloseBtn.addEventListener("click", () => closeSetupDialog({ resume: true }));
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

  document.addEventListener("shared-auth:ready", () => {
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
  });
  window.addEventListener("online", () => scheduleInterviewHistorySync(0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    updateInterviewLocalNote();
    scheduleInterviewHistorySync(0);
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
      if (interviewMode === "timer" && interviewStarted && !interviewFinished) {
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

  bootstrap().catch((e) => {
    console.error("Interview bootstrap failed", e);
    questionTitleEl.textContent = "Не удалось загрузить вопросы";
    if (stageEl) stageEl.classList.add("stage-error");
    revealInterviewPage();
  });
});
