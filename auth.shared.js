(function () {
  const debugLog = window.DebugLog || null;
  const path = window.location.pathname || "";
  if (path.endsWith("/questions.html") || path.endsWith("questions.html")) {
    return;
  }

  const AUTH_PENDING_PROFILE_KEY = "auth_pending_profile_v1";
  const AUTH_RETURN_SCROLL_KEY = "questions_auth_return_scroll_v1";
  const SHARED_AUTH_PENDING_ACTION_KEY = "shared_auth_pending_action_v1";
  const AUTH_VISUAL_STATE_KEY = "auth_visual_state_v1";
  const CLOUD_SYNC_TS_KEY = "cloud_sync_ts_v1";
  const CLOUD_AUTH_SYNC_TS_KEY = "cloud_auth_sync_ts_v1";
  const CLOUD_AUTH_SYNC_USER_KEY = "cloud_auth_sync_user_v1";
  const PENDING_MUTATIONS_KEY = "cloud_pending_mutations_v1";
  const AI_RESPONSES_LOCAL_PREFIX = "ai_responses_";
  const CLOUD_SYNC_TTL_MS = 60 * 1000;
  const AUTH_SESSION_CHECK_TTL_MS = 5 * 60 * 1000;
  const AUTH_STARTUP_GRACE_MS = 5000;
  const CLOUD_AUTH_SYNC_COOLDOWN_MS = 2 * 60 * 1000;
  const CLOUD_OP_TIMEOUT_MS = 10000;
  const REST_TIMEOUT_MS = 7000;

  let supabaseStore = null;
  let authUser = null;
  let authProfile = null;
  let authLastSessionCheckTs = 0;
  let cloudSyncPromise = null;
  let initialized = false;
  let authResolved = false;
  let activeGuestGate = null;
  let pendingAuthReturnScrollY = null;
  let authController = null;

  const authStateShared = window.AuthStateShared || {
    getAuthUiConfig(options) {
      const isAuthenticated = !!options?.isAuthenticated;
      return {
        buttonLabel: isAuthenticated ? "" : "Войти",
        modalPlacement: isAuthenticated ? "anchored" : "centered"
      };
    },
    resolveProtectedAction(options) {
      const isAuthenticated = !!options?.isAuthenticated;
      const hasGuestBypass = !!options?.hasGuestBypass;
      const isAuthAvailable = options?.isAuthAvailable !== false;
      if (isAuthenticated || hasGuestBypass) {
        return {
          allowed: true,
          shouldOpenAuthModal: false,
          shouldPersistGuestBypassOnClose: false
        };
      }
      return {
        allowed: false,
        shouldOpenAuthModal: true,
        shouldPersistGuestBypassOnClose: isAuthAvailable
      };
    },
    resolveGuestModalClose(options) {
      return {
        enableGuestBypass: !!options?.allowsGuestAfterClose && !options?.isAuthenticated
      };
    },
    resolveDeferredActionAfterAuth(options) {
      const pendingAction = options?.pendingAction || null;
      return {
        shouldRun: !!options?.isAuthenticated && !!pendingAction,
        pendingAction
      };
    },
    consumeSavedScrollPosition(options) {
      const saved = options?.saved;
      const currentPath = options?.currentPath || "";
      const now = Number(options?.now || Date.now());
      const ttlMs = Number(options?.ttlMs || 0);
      if (!saved || typeof saved.y !== "number") return null;
      if (saved.path && saved.path !== currentPath) return null;
      if (saved.ts && ttlMs > 0 && (now - Number(saved.ts)) > ttlMs) return null;
      return Math.max(0, Math.round(saved.y));
    }
  };

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
    if (authController) {
      authController.setStatus(message);
      return;
    }
    const authStatus = getEl("auth-status");
    if (authStatus) authStatus.textContent = message || "";
  }

  function setAuthSyncButtonBusy(isBusy) {
    if (authController) {
      authController.setSyncBusy(isBusy);
      return;
    }
    const authSyncBtn = getEl("auth-sync-btn");
    if (!authSyncBtn) return;
    authSyncBtn.classList.toggle("is-busy", !!isBusy);
    authSyncBtn.disabled = !!isBusy;
    applyAuthModalMode();
  }

  function flashAuthSyncButtonSuccess() {
    if (authController) {
      authController.flashSyncSuccess();
      return;
    }
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

  function readAuthReturnScrollPosition() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_RETURN_SCROLL_KEY) || "null");
    } catch {
      return null;
    }
  }

  function consumeAuthReturnScrollPosition() {
    const saved = readAuthReturnScrollPosition();
    const y = authStateShared.consumeSavedScrollPosition({
      saved,
      currentPath: window.location.pathname,
      now: Date.now(),
      ttlMs: 30 * 60 * 1000
    });
    try {
      localStorage.removeItem(AUTH_RETURN_SCROLL_KEY);
    } catch {}
    return y;
  }

  function restoreAuthReturnScrollPosition() {
    const targetY = Number.isFinite(pendingAuthReturnScrollY) ? pendingAuthReturnScrollY : consumeAuthReturnScrollPosition();
    if (!Number.isFinite(targetY) || targetY === null) return;
    pendingAuthReturnScrollY = targetY;
    const restore = () => window.scrollTo(0, targetY);
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 120);
    setTimeout(() => {
      restore();
      pendingAuthReturnScrollY = null;
    }, 520);
  }

  function readPendingAction() {
    try {
      return JSON.parse(localStorage.getItem(SHARED_AUTH_PENDING_ACTION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writePendingAction(action) {
    try {
      localStorage.setItem(SHARED_AUTH_PENDING_ACTION_KEY, JSON.stringify(action));
    } catch {}
  }

  function clearPendingAction() {
    try {
      localStorage.removeItem(SHARED_AUTH_PENDING_ACTION_KEY);
    } catch {}
  }

  function readGuestBypass(storageKey) {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  function writeGuestBypass(storageKey, value) {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, value ? "true" : "false");
    } catch {}
  }

  function persistAuthVisualState(state) {
    try {
      if (state) {
        localStorage.setItem(AUTH_VISUAL_STATE_KEY, state);
        document.documentElement.setAttribute("data-auth-visual-state", state);
        return;
      }
      localStorage.removeItem(AUTH_VISUAL_STATE_KEY);
      document.documentElement.removeAttribute("data-auth-visual-state");
    } catch {}
  }

  function dispatchPendingAction(action, meta) {
    if (!action?.id) return;
    document.dispatchEvent(new CustomEvent("shared-auth:execute-action", {
      detail: {
        action,
        meta: meta || {}
      }
    }));
  }

  function flushPendingActionAfterAuth() {
    const resolved = authStateShared.resolveDeferredActionAfterAuth({
      isAuthenticated: !!authUser,
      pendingAction: readPendingAction()
    });
    if (!resolved.shouldRun || !resolved.pendingAction) return false;
    clearPendingAction();
    dispatchPendingAction(resolved.pendingAction, { source: "auth" });
    restoreAuthReturnScrollPosition();
    return true;
  }

  function updateAuthButtonUi() {
    const authOpenBtn = getEl("auth-open-btn");
    if (!authOpenBtn) return;
    const labelEl = authOpenBtn.querySelector(".auth-open-btn__label");
    const isAuthenticatedUi = !!authUser || isOptimisticAuthUiActive();
    const uiConfig = authStateShared.getAuthUiConfig({ isAuthenticated: isAuthenticatedUi });
    authOpenBtn.classList.toggle("is-auth", isAuthenticatedUi);
    authOpenBtn.classList.toggle("is-guest", !isAuthenticatedUi);
    authOpenBtn.dataset.authPlacement = uiConfig.modalPlacement;
    if (authUser) {
      persistAuthVisualState("auth");
    } else if (authResolved) {
      persistAuthVisualState("guest");
    }
    if (labelEl) {
      labelEl.textContent = uiConfig.buttonLabel;
    }
    if (authUser?.email) {
      authOpenBtn.title = "Профиль";
      authOpenBtn.setAttribute("aria-label", "Профиль");
      return;
    }
    if (isAuthenticatedUi) {
      authOpenBtn.title = "Профиль";
      authOpenBtn.setAttribute("aria-label", "Профиль");
      return;
    }
    authOpenBtn.title = "Войти и сохранить прогресс";
    authOpenBtn.setAttribute("aria-label", "Войти и сохранить прогресс");
  }

  function syncProfileUiFromState() {
    if (authController) {
      authController.applyAuthModalMode();
      return;
    }
  }

  function updateAuthButtonLabel() {
    if (authController) {
      authController.updateAuthButtonUi();
      return;
    }
    updateAuthButtonUi();
  }

  function positionAuthModal() {
    authController?.positionModal();
  }

  function applyAuthModalMode() {
    authController?.applyAuthModalMode();
  }

  function showAuthModal(prefillMessage, options) {
    activeGuestGate = options?.guestGate || null;
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
    const user = await authController?.refreshAuthUser({ source: "shared-wrapper" });
    const state = authController?.getState?.();
    authUser = state?.authUser || null;
    authProfile = state?.authProfile || null;
    authResolved = !!state?.authResolved;
    return user || null;
  }

  async function refreshAuthUserInBackground(options) {
    const user = await authController?.refreshAuthUserInBackground(options || {});
    const state = authController?.getState?.();
    authUser = state?.authUser || null;
    authProfile = state?.authProfile || null;
    authResolved = !!state?.authResolved;
    return user || null;
  }

  function getCloudSyncLastTs() {
    return Number(localStorage.getItem(CLOUD_SYNC_TS_KEY) || 0);
  }

  function markCloudSyncTs() {
    try {
      localStorage.setItem(CLOUD_SYNC_TS_KEY, String(Date.now()));
    } catch {}
  }

  function getCloudAuthSyncLastTs() {
    try {
      return Number(localStorage.getItem(CLOUD_AUTH_SYNC_TS_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function getCloudAuthSyncLastUserId() {
    try {
      return String(localStorage.getItem(CLOUD_AUTH_SYNC_USER_KEY) || "");
    } catch {
      return "";
    }
  }

  function markCloudAuthSync(userId) {
    try {
      localStorage.setItem(CLOUD_AUTH_SYNC_TS_KEY, String(Date.now()));
      localStorage.setItem(CLOUD_AUTH_SYNC_USER_KEY, String(userId || ""));
    } catch {}
  }

  function shouldRunCloudAuthSync(userId) {
    const normalizedUserId = String(userId || "");
    if (!normalizedUserId) return false;
    const lastUserId = getCloudAuthSyncLastUserId();
    const lastTs = getCloudAuthSyncLastTs();
    if (lastUserId !== normalizedUserId) return true;
    return (Date.now() - lastTs) >= CLOUD_AUTH_SYNC_COOLDOWN_MS;
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
    const startedAt = Date.now();
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
      debugLog?.warn("network", "shared-rest-fail", {
        path: pathName,
        method,
        status: res.status,
        durationMs: Date.now() - startedAt
      });
      throw new Error(`${method} ${pathName} failed: ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    debugLog?.debug("network", "shared-rest-ok", {
      path: pathName,
      method,
      status: res.status,
      durationMs: Date.now() - startedAt
    });
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
      debugLog?.debug("sync", "shared-cloud-skip", { reason: "ttl", source });
      return { ok: true, skipped: true };
    }

    cloudSyncPromise = (async () => {
      try {
        debugLog?.info("sync", "shared-cloud-start", { source, force });
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
        debugLog?.info("sync", "shared-cloud-success", {
          source,
          force,
          localProgressRows: localProgressRows.length,
          localAiRows: localAiRows.length,
          hadPendingMutationsAtStart
        });
        if (source === "manual") flashAuthSyncButtonSuccess();
        return { ok: true };
      } catch (e) {
        console.warn("Cloud sync failed", e);
        debugLog?.warn("sync", "shared-cloud-failed", {
          source,
          force,
          message: String(e?.message || e || "")
        });
        return { ok: false, error: e };
      } finally {
        if (source === "manual") setAuthSyncButtonBusy(false);
        cloudSyncPromise = null;
      }
    })();

    return cloudSyncPromise;
  }

  function hasPendingCloudWork() {
    if (readPendingMutations().length > 0) return true;
    if (!authUser?.id) return false;
    if (getLocalProgressRows().length > 0) return true;
    return getLocalAiRows(new Set()).length > 0;
  }

  async function ensureAuthController() {
    if (authController || !window.AuthCoreShared) return authController;
    authController = window.AuthCoreShared.create({
      supabaseStore,
      authStateShared,
      startupGraceMs: AUTH_STARTUP_GRACE_MS,
      sessionCheckTtlMs: AUTH_SESSION_CHECK_TTL_MS,
      shouldDeferInitialScrollRestore: () => !!readPendingAction()?.id,
      storageKeys: {
        pendingProfile: AUTH_PENDING_PROFILE_KEY,
        visualState: AUTH_VISUAL_STATE_KEY,
        returnScroll: AUTH_RETURN_SCROLL_KEY
      },
      dom: {
        authOpenBtn: getEl("auth-open-btn"),
        authModal: getEl("auth-modal"),
        authCard: getEl("auth-modal")?.querySelector(".auth-card"),
        authTitle: getEl("auth-title"),
        authDescription: getEl("auth-description"),
        authLevelWrap: getEl("auth-level-wrap"),
        authTrackSelect: getEl("auth-track-select"),
        authGradeSelect: getEl("auth-grade-select"),
        authOAuthRow: getEl("auth-oauth-row"),
        authGoogleBtn: getEl("auth-google-btn"),
        authEmailToggle: getEl("auth-email-toggle"),
        authEmailInput: getEl("auth-email-input"),
        authSyncBtn: getEl("auth-sync-btn"),
        authSendBtn: getEl("auth-send-btn"),
        authCloseBtn: getEl("auth-close-btn"),
        authStatus: getEl("auth-status")
      },
      ensureSupabaseReady: async () => supabaseStore || ensureSupabaseReady(),
      loadUserProfile: async (user) => {
        if (!user || !supabaseStore?.getUserProfile) return null;
        const { data } = await supabaseStore.getUserProfile(user.id);
        return data || null;
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
        const { data: saved, error } = await supabaseStore.upsertUserProfile(payload);
        if (error) {
          console.warn("Failed to upsert pending user profile", error);
          return null;
        }
        return saved || payload;
      },
      onModalHide: (options, meta) => {
        const gate = activeGuestGate;
        const closeDecision = authStateShared.resolveGuestModalClose({
          isAuthenticated: !!meta?.isAuthenticated,
          allowsGuestAfterClose: !!gate?.allowsGuestAfterClose
        });
        if (closeDecision.enableGuestBypass) {
          writeGuestBypass(gate?.bypassStorageKey, true);
          if (gate?.action) {
            clearPendingAction();
            dispatchPendingAction(gate.action, { source: "guest-bypass" });
          }
        }
        activeGuestGate = null;
      },
      onUserResolved: async ({ user, profile }) => {
        authUser = user || null;
        authProfile = profile || null;
        authResolved = true;
        debugLog?.info("auth", "shared-user-resolved", {
          userId: authUser?.id || "",
          hasProfile: !!authProfile
        });
        if (hasPendingCloudWork() && shouldRunCloudAuthSync(authUser?.id)) {
          markCloudAuthSync(authUser.id);
          await syncLocalAndCloudState({ force: false, source: "auth" });
        }
        await flushPendingMutations();
        flushPendingActionAfterAuth();
      },
      onSignedOut: async () => {
        authUser = null;
        authProfile = null;
        authResolved = true;
      },
      onManualSync: async () => {
        const session = await authController.getActiveSession();
        if (!session?.access_token) {
          setAuthStatus("Связь с аккаунтом временно недоступна. Попробуйте снова.");
          await authController.refreshAuthUserInBackground({ force: true, source: "manual-sync" });
          return;
        }
        await syncLocalAndCloudState({ force: true, source: "manual" });
      }
    });
    return authController;
  }

  async function requireAuthForAction(options) {
    const action = options?.action || null;
    const bypassStorageKey = options?.bypassStorageKey || "";
    if (isCloudReady() && !authUser) {
      await refreshAuthUserInBackground({ force: true, source: "protected-action" });
    }
    const decision = authStateShared.resolveProtectedAction({
      isAuthenticated: !!authUser,
      hasGuestBypass: readGuestBypass(bypassStorageKey),
      isAuthAvailable: isCloudReady()
    });

    if (decision.allowed) {
      if (authUser) {
        writeGuestBypass(bypassStorageKey, false);
      }
      return true;
    }

    if (!decision.shouldOpenAuthModal) return false;

    if (action) {
      writePendingAction(action);
    }

    showAuthModal(
      isCloudReady()
        ? (options?.authMessage || "Войдите, чтобы продолжить.")
        : (options?.unavailableMessage || "Авторизация недоступна. Закройте окно и продолжите без сохранения."),
      {
        guestGate: {
          allowsGuestAfterClose: !!decision.shouldPersistGuestBypassOnClose,
          bypassStorageKey,
          action
        }
      }
    );
    return false;
  }

  function publishSharedAuthApi() {
    window.SharedAuth = {
      requireAuthForAction,
      isAuthenticated() {
        return !!authUser;
      },
      hasGuestBypass(storageKey) {
        return readGuestBypass(storageKey);
      },
      restorePendingScroll() {
        if (authController) {
          authController.restorePendingScroll();
          return;
        }
        restoreAuthReturnScrollPosition();
      }
    };
    document.dispatchEvent(new CustomEvent("shared-auth:ready"));
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

    await ensureAuthController();
    publishSharedAuthApi();
    if (authController) {
      await authController.init();
      const state = authController.getState();
      authUser = state.authUser;
      authProfile = state.authProfile;
      authResolved = state.authResolved;
    }

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
