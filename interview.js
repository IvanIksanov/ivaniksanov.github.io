document.addEventListener("DOMContentLoaded", () => {
  const categoryNote = document.getElementById("category-note");
  const categoryFilters = document.getElementById("category-filters");
  const badgeCategory = document.getElementById("badge-category");
  const counterEl = document.getElementById("counter");
  const questionTitleEl = document.getElementById("question-title");
  const answerEl = document.getElementById("answer");
  const toggleAnswerBtn = document.getElementById("toggle-answer");
  const skipBtn = document.getElementById("skip-btn");
  const acceptBtn = document.getElementById("accept-btn");
  const stageEl = document.getElementById("stage");

  if (!categoryFilters || !questionTitleEl || !answerEl || !toggleAnswerBtn || !skipBtn || !acceptBtn) return;

  const PUBLIC_AI_APPEND_CACHE_KEY = "public_ai_append_cache_v1";
  const PUBLIC_AI_APPEND_CACHE_TTL_MS = 10 * 60 * 1000;
  const INTERVIEW_AI_LOCAL_PREFIX = "interview_ai_local_";
  const INTERVIEW_PROGRESS_PREFIX = "interview_progress_";
  const INTERVIEW_SELECTED_CATEGORIES_KEY = "interview_selected_categories";
  const INTERVIEW_SESSION_STATE_KEY = "interview_session_state_v1";
  const INTERVIEW_SCROLL_STATE_KEY = "interview_scroll_state_v1";
  const IO_API_BASE = "https://api.intelligence.io.solutions/api/v1";
  const IO_API_KEY = (() => {
    const p1 = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.";
    const p2 = "eyJvd25lciI6IjVhNzhhY2I4LTJkZmUtNGRiNi04N2QxLTkxODZmNTFmZDllZSIsImV4cCI6NDkyNDc3MTU3OH0.";
    const p3 = "EMXKUEfcMvAbtMt_WodTcNcENyqOXwfuF16wtC4-8i2sJgak6KJODACg3c3tyzwjbacXC1XHUu3jS9E4C14VLw";
    return p1 + p2 + p3;
  })();
  const DEFAULT_MODEL = "openai/gpt-oss-20b";

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
  let publicAiMap = new Map();
  const aiStateByQuestion = new Map();
  let pendingRestoreAnswerExpanded = false;
  let interviewScrollSaveRaf = 0;

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

  function normalizeCategoryKey(category) {
    const value = String(category || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!value || value === "ВСЕ") return "ALL";
    if (value === "БД" || value === "БАЗЫ ДАННЫХ") return "БАЗЫ ДАННЫХ";
    if (value === "GIT" || value === "GIT + IDE" || value === "GIT + IDE + SELENIUM") return "GIT";
    if (value === "ТЕОРИЯ") return "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ";
    return value;
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
      const state = {
        ts: Date.now(),
        selectedCategories: Array.from(selectedCategories || []),
        poolIds: (interviewPool || []).map((q) => q?.id).filter(Boolean),
        index: Math.max(0, Number(interviewIndex) || 0),
        interviewStarted: !!interviewStarted,
        interviewFinished: !!interviewFinished,
        acceptedCount: Math.max(0, Number(acceptedCount) || 0),
        skippedCount: Math.max(0, Number(skippedCount) || 0),
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

  function restoreInterviewSessionStateIfPossible() {
    const saved = readInterviewSessionState();
    if (!saved || !Array.isArray(saved.poolIds) || !saved.poolIds.length) return false;
    const restoredPool = buildPoolFromIds(saved.poolIds);
    if (!restoredPool.length) return false;
    interviewPool = restoredPool;
    interviewIndex = Math.max(0, Math.min(Number(saved.index) || 0, restoredPool.length - 1));
    interviewStarted = !!saved.interviewStarted;
    interviewFinished = !!saved.interviewFinished;
    acceptedCount = Math.max(0, Number(saved.acceptedCount) || 0);
    skippedCount = Math.max(0, Number(saved.skippedCount) || 0);
    pendingRestoreAnswerExpanded = !!saved.answerExpanded;
    if (interviewFinished) {
      finishInterview();
    } else {
      renderCard();
      if (pendingRestoreAnswerExpanded && currentQuestion && toggleAnswerBtn && !toggleAnswerBtn.disabled) {
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

  function restoreInterviewScrollState() {
    try {
      const raw = localStorage.getItem(INTERVIEW_SCROLL_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.path !== window.location.pathname) return;
      const y = Math.max(0, Number(parsed.y) || 0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
        });
      });
    } catch {}
  }

  function chipLabel(category) {
    if (category === "БАЗЫ ДАННЫХ") return "БД";
    if (category === "GIT + IDE + SELENIUM") return "GIT";
    if (category === "ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ") return "Теория";
    return category;
  }

  function isExcludedCategory(category) {
    const t = String(category || "").trim();
    return t === "Вопросы к руководителю | команде | HR";
  }

  function randInt(min, max) {
    if (window.crypto && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return min + (buf[0] % (max - min + 1));
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      let j;
      if (window.crypto && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        j = buf[0] % (i + 1);
      } else {
        j = Math.floor(Math.random() * (i + 1));
      }
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
    return [
      `Вопрос для собеседования: ${item.title}`,
      "",
      "Базовый ответ (из QAtoDev):",
      String(item.answer || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "),
      "",
      "Дополните ответ для подготовки к собеседованию QA/тестировщика.",
      "Нужно кратко и по делу: важные детали, практический пример, частые ошибки."
    ].join("\n");
  }

  async function requestAiAppend(item) {
    const startedAt = Date.now();
    const body = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "Ты ИИ-помощник для подготовки к собеседованию QA. Отвечай на русском языке, кратко, структурно, без лишней воды. Без markdown таблиц." },
        { role: "user", content: buildAiPrompt(item) }
      ],
      temperature: 0.4,
      stream: false
    };
    const res = await fetch(`${IO_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${IO_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
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

  function getSelectedItemsFlat() {
    return allItems.filter((item) => selectedCategories.has(item.category) && !isExcludedCategory(item.category));
  }

  function buildSample(list, selected) {
    const byCat = new Map();
    selected.forEach((c) => {
      if (isExcludedCategory(c)) return;
      byCat.set(c, []);
    });
    list.forEach((q) => {
      if (byCat.has(q.category)) byCat.get(q.category).push(q);
    });
    byCat.forEach((arr) => shuffleInPlace(arr));
    const target = randInt(20, 25);
    const cats = Array.from(byCat.keys());
    if (!cats.length) return [];
    if (list.length <= target) return shuffleInPlace(list.slice());

    const result = [];
    const quotas = new Map();
    const base = Math.floor(target / cats.length);
    let rem = target % cats.length;

    cats.forEach((c) => {
      let need = base + (rem > 0 ? 1 : 0);
      rem = Math.max(0, rem - 1);
      const src = byCat.get(c) || [];
      const take = Math.min(need, src.length);
      for (let i = 0; i < take; i++) result.push(src[i]);
      quotas.set(c, take);
    });

    let total = result.length;
    if (total < target) {
      const ptrs = {};
      cats.forEach((c) => { ptrs[c] = quotas.get(c) || 0; });
      outer: while (total < target) {
        let added = false;
        for (let i = 0; i < cats.length; i++) {
          const c = cats[i];
          const src = byCat.get(c) || [];
          const p = ptrs[c];
          if (p < src.length) {
            result.push(src[p]);
            ptrs[c] = p + 1;
            total += 1;
            added = true;
            if (total >= target) break outer;
          }
        }
        if (!added) break;
      }
    }
    if (result.length > target) return shuffleInPlace(result).slice(0, target);
    return shuffleInPlace(result);
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
      acceptBtn.disabled = false;
      acceptBtn.style.visibility = "";
      acceptBtn.textContent = "Попробовать снова";
      acceptBtn.title = "Попробовать снова";
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
    interviewFinished = true;
    interviewStarted = false;
    currentQuestion = null;
    const total = interviewPool.length || 1;
    const percent = Math.round((acceptedCount / total) * 100);
    let text = "";
    if (percent <= 10) text = "Печально. Советуем пройтись по базовой теории и попробовать ещё раз. На вкладке «Вопросы» ты найдешь все вопросы из интервью.";
    else if (percent <= 30) text = "Неплохое начало. Усильте ключевые темы и разберите ошибки. На вкладке «Вопросы» ты найдешь все вопросы из интервью.";
    else if (percent <= 60) text = "Середина пути. Виден прогресс, но есть пробелы — закрепите практикой. На вкладке «Вопросы» ты найдешь все вопросы из интервью.";
    else if (percent <= 70) text = "Уверенный уровень: большинство базовых вопросов закрыты. Продолжайте тренироваться.";
    else if (percent <= 90) text = "Сильный результат. Осталось отполировать тонкости и довести ответы до краткости.";
    else if (percent < 100) text = "Почти идеально! Шлифуйте слабые места на задачах и кейсах.";
    else text = "Идеально! Готовность к собеседованию максимальная.";

    badgeCategory.textContent = "Итог";
    questionTitleEl.textContent = `Процент прохождения: ${percent}%`;
    answerEl.innerHTML = `<p>Засчитано: <strong>${acceptedCount}</strong></p><p>Пропущено: <strong>${skippedCount}</strong></p><p>${escapeHtml(text)}</p>`;
    answerEl.hidden = false;
    toggleAnswerBtn.disabled = true;
    toggleAnswerBtn.setAttribute("aria-expanded", "true");
    toggleAnswerBtn.textContent = "Скрыть ответ";
    aiZone.style.display = "none";
    updateCounter();
    setInterviewNavMode("retry");
    writeInterviewSessionState();
  }

  function renderCard() {
    const item = currentPoolItem();
    if (!item) {
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
      currentQuestion = null;
      badgeCategory.textContent = "—";
      questionTitleEl.textContent = "Нажмите «Начать собеседование» после выбора разделов интервью";
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
    setInterviewNavMode("normal");
    updateCounter();
    writeInterviewSessionState();
  }

  function rebuildInterviewPool({ deferStart = false } = {}) {
    const selected = Array.from(selectedCategories);
    const flat = getSelectedItemsFlat();
    interviewPool = buildSample(flat, selected);
    interviewIndex = 0;
    interviewStarted = !deferStart;
    interviewFinished = false;
    acceptedCount = 0;
    skippedCount = 0;
    pendingRestoreAnswerExpanded = false;
    renderCard();
  }

  function setAllCategoriesSelected() {
    selectedCategories = new Set(allCategories.filter((c) => !isExcludedCategory(c)));
  }

  function persistSelectedCategories() {
    try {
      localStorage.setItem(INTERVIEW_SELECTED_CATEGORIES_KEY, JSON.stringify(Array.from(selectedCategories)));
    } catch {}
  }

  function updateNote() {
    if (!categoryNote) return;
    if (selectedCategories.size === allCategories.length) {
      categoryNote.textContent = "По умолчанию выбраны все категории.";
      return;
    }
    if (selectedCategories.size === 0) {
      categoryNote.textContent = "Выберите хотя бы одну категорию.";
      return;
    }
    categoryNote.textContent = `Выбрано категорий: ${selectedCategories.size}`;
  }

  function syncChipActiveState() {
    categoryFilters.querySelectorAll(".filter-chip").forEach((chip) => {
      const category = chip.dataset.category;
      if (category === "Все") {
        chip.classList.toggle("active", selectedCategories.size === allCategories.length);
      } else {
        chip.classList.toggle("active", selectedCategories.has(category));
      }
    });
    updateNote();
    updateCounter();
  }

  function renderCategoryChips() {
    categoryFilters.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "filter-chip active";
    allChip.dataset.category = "Все";
    allChip.textContent = "Все";
      allChip.addEventListener("click", () => {
        setAllCategoriesSelected();
        persistSelectedCategories();
        syncChipActiveState();
        rebuildInterviewPool({ deferStart: true });
      });
    categoryFilters.appendChild(allChip);

    allCategories.forEach((category) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip active";
      chip.dataset.category = category;
      chip.textContent = chipLabel(category);
      chip.addEventListener("click", () => {
        if (selectedCategories.has(category) && selectedCategories.size > 1) {
          selectedCategories.delete(category);
        } else {
          selectedCategories.add(category);
        }
        persistSelectedCategories();
        syncChipActiveState();
        rebuildInterviewPool({ deferStart: true });
      });
      categoryFilters.appendChild(chip);
    });
  }

  function flattenQuestions(rawData) {
    const categories = [];
    const items = [];
    (rawData || []).forEach((cat) => {
      if (!cat?.category || !Array.isArray(cat.items)) return;
      if (!categories.includes(cat.category)) categories.push(cat.category);
      cat.items.forEach((item) => {
        if (!item?.id || !item?.title) return;
        items.push({
          ...item,
          category: cat.category
        });
      });
    });
    return { categories, items };
  }

  function getQuestionsDataNow() {
    const fromWindow = window.questionsData;
    if (Array.isArray(fromWindow) && fromWindow.length) return fromWindow;
    return null;
  }

  function waitForQuestionsData() {
    const existing = getQuestionsDataNow();
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      let done = false;
      const finish = (data) => {
        if (done) return;
        done = true;
        window.removeEventListener("qatodev:questions-data-ready", onReady);
        resolve(Array.isArray(data) ? data : []);
      };
      const onReady = (e) => finish(e?.detail?.questions || window.questionsData);
      window.addEventListener("qatodev:questions-data-ready", onReady, { once: true });
      setTimeout(() => finish(getQuestionsDataNow() || []), 7000);
    });
  }

  async function bootstrap() {
    questionTitleEl.textContent = "Загружаю вопросы…";
    const [rawData] = await Promise.all([
      waitForQuestionsData(),
      fetchPublicAiAnswers().catch((e) => console.warn("Interview page: public AI preload failed", e))
    ]);
    const { categories, items } = flattenQuestions(rawData);
    allCategories = categories.filter((c) => !isExcludedCategory(c));
    allItems = items;
    try {
      const saved = JSON.parse(localStorage.getItem(INTERVIEW_SELECTED_CATEGORIES_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        selectedCategories = new Set(saved.filter((c) => allCategories.includes(c) && !isExcludedCategory(c)));
      }
    } catch {}
    if (!selectedCategories.size) setAllCategoriesSelected();
    persistSelectedCategories();
    renderCategoryChips();
    syncChipActiveState();
    if (!allItems.length) {
      questionTitleEl.textContent = "Не удалось загрузить вопросы";
      return;
    }
    if (!restoreInterviewSessionStateIfPossible()) {
      rebuildInterviewPool({ deferStart: false });
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
    skippedCount += 1;
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  });

  acceptBtn.addEventListener("click", () => {
    if (!interviewPool.length) return;
    if (interviewFinished) {
      rebuildInterviewPool({ deferStart: false });
      return;
    }
    if (!interviewStarted) {
      interviewStarted = true;
      renderCard();
      return;
    }
    if (currentQuestion) setProgressMark(currentQuestion, "studied");
    acceptedCount += 1;
    if (interviewIndex >= interviewPool.length - 1) {
      finishInterview();
      return;
    }
    interviewIndex += 1;
    renderCard();
  });

  window.addEventListener("scroll", queueInterviewScrollSave, { passive: true });
  window.addEventListener("pagehide", writeInterviewScrollState);

  aiAppendBtn.addEventListener("click", onAiAppendClick);

  document.addEventListener("keydown", (e) => {
    if (e.key === " " && document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (!interviewStarted && !interviewFinished && e.key !== "Enter") return;
    if (e.key === " ") {
      e.preventDefault();
      if (!toggleAnswerBtn.disabled) toggleAnswerBtn.click();
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
  });
});
