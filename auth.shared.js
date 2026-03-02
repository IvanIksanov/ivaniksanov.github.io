(function () {
  const path = window.location.pathname || "";
  if (path.endsWith("/questions.html") || path.endsWith("questions.html")) {
    return;
  }

  const AUTH_PENDING_PROFILE_KEY = "auth_pending_profile_v1";
  const AUTH_RETURN_SCROLL_KEY = "questions_auth_return_scroll_v1";
  const CLOUD_SYNC_TS_KEY = "cloud_sync_ts_v1";
  const PENDING_MUTATIONS_KEY = "cloud_pending_mutations_v1";
  const AI_RESPONSES_LOCAL_PREFIX = "ai_responses_";
  const CLOUD_SYNC_TTL_MS = 60 * 1000;
  const AUTH_SESSION_CHECK_TTL_MS = 5 * 60 * 1000;
  const CLOUD_OP_TIMEOUT_MS = 10000;
  const REST_TIMEOUT_MS = 7000;

  let supabaseStore = null;
  let authUser = null;
  let authProfile = null;
  let authEmailLoginExpanded = false;
  let authLastSessionCheckTs = 0;
  let authRefreshInFlight = null;
  let cloudSyncPromise = null;
  let initialized = false;

  const cloudAnswersByQuestion = new Map();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.querySelectorAll("script")).find((s) => (s.src || "").includes(src));
      if (existing && (window.supabase || window.AppSupabase || src === "supabase.client.js")) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabaseReady() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    }
    if (!window.AppSupabase) {
      await loadScript("supabase.client.js");
      await new Promise((r) => setTimeout(r, 0));
    }
    return window.AppSupabase || null;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
    ]);
  }

  function isCloudReady() {
    return !!(supabaseStore && supabaseStore.client);
  }

  function setAuthSessionCheckedNow() {
    authLastSessionCheckTs = Date.now();
  }

  function isAuthSessionCheckFresh() {
    return (Date.now() - authLastSessionCheckTs) < AUTH_SESSION_CHECK_TTL_MS;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function setAuthStatus(message) {
    const authStatus = getEl("auth-status");
    if (authStatus) authStatus.textContent = message || "";
  }

  function setAuthSyncButtonBusy(isBusy) {
    const authSyncBtn = getEl("auth-sync-btn");
    if (!authSyncBtn) return;
    authSyncBtn.classList.toggle("is-busy", !!isBusy);
    authSyncBtn.disabled = !!isBusy;
  }

  function flashAuthSyncButtonSuccess() {
    const authSyncBtn = getEl("auth-sync-btn");
    if (!authSyncBtn) return;
    authSyncBtn.classList.remove("is-success");
    void authSyncBtn.offsetWidth;
    authSyncBtn.classList.add("is-success");
    setTimeout(() => authSyncBtn.classList.remove("is-success"), 700);
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

  function saveAuthReturnScrollPosition() {
    try {
      localStorage.setItem(AUTH_RETURN_SCROLL_KEY, JSON.stringify({
        y: Math.max(0, Math.round(window.scrollY || 0)),
        path: window.location.pathname,
        ts: Date.now()
      }));
    } catch {}
  }

  function setEmailLoginExpanded(next) {
    authEmailLoginExpanded = !!next;
    const authModal = getEl("auth-modal");
    const authEmailToggle = getEl("auth-email-toggle");
    if (authModal) authModal.classList.toggle("auth-email-expanded", authEmailLoginExpanded);
    if (authEmailToggle) authEmailToggle.setAttribute("aria-expanded", authEmailLoginExpanded ? "true" : "false");
  }

  function syncProfileUiFromState() {
    const authTrackSelect = getEl("auth-track-select");
    const authGradeSelect = getEl("auth-grade-select");
    const authTitle = getEl("auth-title");
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

  function updateAuthButtonLabel() {
    const authOpenBtn = getEl("auth-open-btn");
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
    const authModal = getEl("auth-modal");
    const authCard = authModal?.querySelector(".auth-card");
    const authOpenBtn = getEl("auth-open-btn");
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

  function applyAuthModalMode() {
    const authModal = getEl("auth-modal");
    const authEmailInput = getEl("auth-email-input");
    const authSendBtn = getEl("auth-send-btn");
    const authCloseBtn = getEl("auth-close-btn");
    const authDescription = getEl("auth-description");
    const authLevelWrap = getEl("auth-level-wrap");
    const authOAuthRow = getEl("auth-oauth-row");
    const authEmailToggle = getEl("auth-email-toggle");
    const authSyncBtn = getEl("auth-sync-btn");
    const authTitle = getEl("auth-title");

    if (!authModal || !authEmailInput || !authSendBtn || !authCloseBtn) return;

    const isAuthorized = !!authUser;
    authModal.classList.toggle("compact-auth", isAuthorized);

    if (isAuthorized) {
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

    positionAuthModal();
  }

  function showAuthModal(prefillMessage) {
    const authModal = getEl("auth-modal");
    const authTrackSelect = getEl("auth-track-select");
    const authGradeSelect = getEl("auth-grade-select");
    const authEmailInput = getEl("auth-email-input");
    if (!authModal) return;

    setEmailLoginExpanded(false);
    if (!authUser) {
      const pending = readPendingProfile();
      if (authTrackSelect && pending?.track) authTrackSelect.value = pending.track;
      if (authGradeSelect && pending?.grade) authGradeSelect.value = pending.grade;
    }
    applyAuthModalMode();
    authModal.classList.add("show");
    authModal.setAttribute("aria-hidden", "false");
    positionAuthModal();
    setAuthStatus(prefillMessage || "");

    if (authEmailInput && authEmailLoginExpanded && authEmailInput.style.display !== "none") {
      authEmailInput.focus();
    }
  }

  function hideAuthModal() {
    const authModal = getEl("auth-modal");
    if (!authModal) return;
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
          updateAuthButtonLabel();
          applyAuthModalMode();
          return authUser || null;
        }
        if (!session?.access_token) {
          authUser = null;
          authProfile = null;
          setAuthSessionCheckedNow();
          updateAuthButtonLabel();
          applyAuthModalMode();
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
        applyAuthModalMode();
        return authUser;
      } catch (e) {
        console.warn("Supabase auth init failed", e);
        authUser = null;
        authProfile = null;
        setAuthSessionCheckedNow();
        updateAuthButtonLabel();
        applyAuthModalMode();
        return null;
      } finally {
        authRefreshInFlight = null;
      }
    })();
    return authRefreshInFlight;
  }

  async function refreshAuthUserInBackground(options) {
    const force = !!options?.force;
    if (!isCloudReady()) return null;
    if (!force && isAuthSessionCheckFresh() && authUser) return authUser;
    if (document.visibilityState === "hidden" && !force) return authUser;
    return refreshAuthUser();
  }

  function getCloudSyncLastTs() {
    return Number(localStorage.getItem(CLOUD_SYNC_TS_KEY) || 0);
  }

  function markCloudSyncTs() {
    try {
      localStorage.setItem(CLOUD_SYNC_TS_KEY, String(Date.now()));
    } catch {}
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
      localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify((mutations || []).slice(-200)));
    } catch {}
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

  function buildRestUrl(pathName, query) {
    const base = supabaseStore?.url;
    const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
    return `${base}/rest/v1/${pathName}${q}`;
  }

  async function restRequest(pathName, options) {
    const method = options?.method || "GET";
    const query = options?.query || "";
    const body = options?.body ?? null;
    const prefer = options?.prefer ?? "return=representation";

    const session = await getActiveSession();
    const accessToken = session?.access_token || null;
    if (!accessToken) {
      throw new Error(`AUTH_SESSION_MISSING for ${method} ${pathName}`);
    }

    const headers = {
      apikey: supabaseStore.anonKey,
      Authorization: `Bearer ${accessToken}`
    };
    if (prefer) headers.Prefer = prefer;
    if (body !== null) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(buildRestUrl(pathName, query), {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!res.ok) {
      throw new Error(`${method} ${pathName} failed: ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    return data;
  }

  function aiSignature(questionId, answerType, model, content) {
    return `${questionId}::${answerType || "append"}::${model || ""}::${String(content || "").trim()}`;
  }

  function readPublicAppendSignatures() {
    const set = new Set();
    try {
      const raw = localStorage.getItem("public_ai_append_cache_v1");
      if (!raw) return set;
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
      rows.forEach((row) => {
        if (!row?.question_id || !row?.content) return;
        set.add(aiSignature(row.question_id, "append", row.model || "", row.content));
      });
    } catch {}
    return set;
  }

  async function loadCloudProgress() {
    if (!isCloudReady() || !authUser) return;
    await restRequest("question_progress", {
      method: "GET",
      query: `select=user_id,question_id,status,updated_at&user_id=eq.${encodeURIComponent(authUser.id)}`,
      prefer: ""
    });
  }

  async function loadCloudAnswers() {
    cloudAnswersByQuestion.clear();
    if (!isCloudReady() || !authUser) return;
    const data = await restRequest("ai_answers", {
      method: "GET",
      query: `select=id,question_id,answer_type,model,seconds,content,created_at&user_id=eq.${encodeURIComponent(authUser.id)}&order=created_at.asc`,
      prefer: ""
    });
    (data || []).forEach((row) => {
      if (!row?.question_id || !row?.content) return;
      const list = cloudAnswersByQuestion.get(row.question_id) || [];
      list.push({
        answer: row.content,
        model: row.model || "",
        answerType: row.answer_type || "append"
      });
      cloudAnswersByQuestion.set(row.question_id, list);
    });
  }

  function getLocalProgressRows() {
    if (!authUser?.id) return [];
    const dedupe = new Map();
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("studied_") && !key.startsWith("unclear_")) continue;
      const status = key.startsWith("studied_") ? "studied" : "unclear";
      let arr = [];
      try {
        arr = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {}
      if (!Array.isArray(arr)) continue;
      arr.forEach((questionId) => {
        if (!questionId) return;
        dedupe.set(String(questionId), status);
      });
    }
    const rows = [];
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

  function getLocalAiRows(existingSignatures) {
    if (!authUser?.id) return [];
    const rows = [];
    const publicAppendSignatures = readPublicAppendSignatures();

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith(AI_RESPONSES_LOCAL_PREFIX)) continue;
      const questionId = key.slice(AI_RESPONSES_LOCAL_PREFIX.length);
      if (!questionId) continue;
      let arr = [];
      try {
        arr = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {}
      if (!Array.isArray(arr)) continue;

      arr.forEach((entry) => {
        if (entry?.isPublicShared) return;
        if (entry?.cloudId) return;
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

    return rows;
  }

  async function saveProgressCloud(questionId, status, options) {
    const enqueueOnFail = options?.enqueueOnFail !== false;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId) {
      if (enqueueOnFail) {
        const pending = readPendingMutations();
        pending.push({ type: "saveProgress", payload: { questionId, status }, attempts: 0, nextTs: Date.now() });
        writePendingMutations(pending);
      }
      return;
    }

    const payload = {
      user_id: authUser.id,
      question_id: questionId,
      status,
      updated_at: new Date().toISOString()
    };

    await withTimeout(restRequest("question_progress", {
      method: "POST",
      query: "on_conflict=user_id,question_id",
      body: payload,
      prefer: "resolution=merge-duplicates,return=representation"
    }), CLOUD_OP_TIMEOUT_MS, "save progress");
  }

  async function saveAiAnswerCloud(questionId, answerType, response, options) {
    const enqueueOnFail = options?.enqueueOnFail !== false;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId || !response?.answer) {
      if (enqueueOnFail && questionId && response?.answer) {
        const pending = readPendingMutations();
        pending.push({ type: "saveAiAnswer", payload: { questionId, answerType, response }, attempts: 0, nextTs: Date.now() });
        writePendingMutations(pending);
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

    const data = await withTimeout(restRequest("ai_answers", {
      method: "POST",
      body: payload,
      prefer: "return=representation"
    }), CLOUD_OP_TIMEOUT_MS, "save ai answer");

    const row = Array.isArray(data) ? data[0] : data;
    return row?.id || null;
  }

  async function deleteAiAnswerCloud(answerId, options) {
    const enqueueOnFail = options?.enqueueOnFail !== false;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !answerId) {
      if (enqueueOnFail && answerId) {
        const pending = readPendingMutations();
        pending.push({ type: "deleteAiById", payload: { answerId }, attempts: 0, nextTs: Date.now() });
        writePendingMutations(pending);
      }
      return false;
    }

    const data = await withTimeout(restRequest("ai_answers", {
      method: "DELETE",
      query: `id=eq.${encodeURIComponent(answerId)}&user_id=eq.${encodeURIComponent(authUser.id)}`,
      prefer: "return=representation"
    }), CLOUD_OP_TIMEOUT_MS, "delete ai by id");

    return Array.isArray(data) ? data.length > 0 : true;
  }

  async function deleteAiAnswerCloudByPayload(questionId, response, options) {
    const enqueueOnFail = options?.enqueueOnFail !== false;
    const hasAuth = await ensureAuthContext();
    if (!isCloudReady() || !hasAuth || !questionId || !response?.answer) {
      if (enqueueOnFail && questionId && response?.answer) {
        const pending = readPendingMutations();
        pending.push({ type: "deleteAiByPayload", payload: { questionId, response }, attempts: 0, nextTs: Date.now() });
        writePendingMutations(pending);
      }
      return false;
    }

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

    const rows = await withTimeout(restRequest("ai_answers", {
      method: "GET",
      query: lookupQuery,
      prefer: ""
    }), CLOUD_OP_TIMEOUT_MS, "find ai by payload");

    const target = (Array.isArray(rows) ? rows : []).find((row) => (
      row &&
      String(row.content || "") === String(response.answer || "") &&
      String(row.answer_type || "append") === String(response.answerType || "append") &&
      String(row.model || "") === String(response.model || "")
    ));
    if (!target?.id) return true;

    return deleteAiAnswerCloud(target.id, { enqueueOnFail });
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
        failed.push({ ...m, attempts, nextTs: Date.now() + backoffMs });
      }
    }

    writePendingMutations(failed);
  }

  async function syncLocalAndCloudState(options) {
    const force = !!options?.force;
    const source = options?.source || "auto";

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
            await withTimeout(
              supabaseStore.saveAiAnswersBulk(localAiRows),
              CLOUD_OP_TIMEOUT_MS,
              "ai answers bulk insert"
            );
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

        await flushPendingMutations();

        if (localProgressRows.length || localAiRows.length || force || hadPendingMutationsAtStart) {
          await withTimeout(Promise.all([loadCloudProgress(), loadCloudAnswers()]), CLOUD_OP_TIMEOUT_MS, "final cloud reload");
        }

        markCloudSyncTs();
        if (source === "manual") {
          flashAuthSyncButtonSuccess();
          setAuthStatus("Синхронизация завершена");
        }
        return { ok: true };
      } catch (e) {
        console.warn("Cloud sync failed", e);
        if (source === "manual") setAuthStatus("Ошибка синхронизации. Попробуйте снова.");
        return { ok: false, error: e };
      } finally {
        if (source === "manual") setAuthSyncButtonBusy(false);
        cloudSyncPromise = null;
      }
    })();

    return cloudSyncPromise;
  }

  async function bindAuthHandlers() {
    const authModal = getEl("auth-modal");
    const authOpenBtn = getEl("auth-open-btn");
    const authSendBtn = getEl("auth-send-btn");
    const authEmailToggle = getEl("auth-email-toggle");
    const authGoogleBtn = getEl("auth-google-btn");
    const authCloseBtn = getEl("auth-close-btn");
    const authSyncBtn = getEl("auth-sync-btn");

    if (!authModal || !authOpenBtn) return;

    authOpenBtn.addEventListener("click", async () => {
      if (!authUser || !isAuthSessionCheckFresh()) {
        refreshAuthUserInBackground().catch((e) => console.warn("Background auth refresh failed", e));
      }
      showAuthModal("");
      applyAuthModalMode();
    });

    if (authSendBtn) {
      authSendBtn.addEventListener("click", async () => {
        if (!isCloudReady()) {
          setAuthStatus("Supabase не подключен.");
          return;
        }

        if (authUser) {
          try {
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
        const authTrackSelect = getEl("auth-track-select");
        const authGradeSelect = getEl("auth-grade-select");
        const authEmailInput = getEl("auth-email-input");
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
        const authEmailInput = getEl("auth-email-input");
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

        const authTrackSelect = getEl("auth-track-select");
        const authGradeSelect = getEl("auth-grade-select");
        const authEmailInput = getEl("auth-email-input");
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

        await syncLocalAndCloudState({ force: true, source: "manual" });
      });
    }

    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) hideAuthModal();
    });

    window.addEventListener("resize", () => {
      if (authModal.classList.contains("show")) {
        applyAuthModalMode();
        positionAuthModal();
      }
    });

    window.addEventListener("scroll", () => {
      if (authModal.classList.contains("show")) positionAuthModal();
    }, { passive: true });
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    if (!getEl("auth-open-btn") || !getEl("auth-modal")) return;

    try {
      supabaseStore = await ensureSupabaseReady();
    } catch (e) {
      console.warn("Shared auth bootstrap failed", e);
      return;
    }

    if (!isCloudReady()) return;

    await refreshAuthUser();
    await bindAuthHandlers();

    if (supabaseStore.client?.auth?.onAuthStateChange) {
      supabaseStore.client.auth.onAuthStateChange(async (event, session) => {
        authUser = session?.user || null;
        if (authUser) {
          setAuthSessionCheckedNow();
        } else if (event === "INITIAL_SESSION") {
          authLastSessionCheckTs = 0;
        } else {
          setAuthSessionCheckedNow();
        }

        if (authUser) {
          await refreshAuthUser();
          setAuthStatus("");
          await syncLocalAndCloudState({ force: false, source: "auth" });
          await flushPendingMutations();
        } else {
          authProfile = null;
          updateAuthButtonLabel();
        }
        applyAuthModalMode();
      });
    }

    [600, 1800, 4000].forEach((delay) => {
      setTimeout(async () => {
        if (authUser) return;
        try {
          const user = await refreshAuthUserInBackground({ force: true });
          if (user) {
            await syncLocalAndCloudState({ force: false, source: "auth" });
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
