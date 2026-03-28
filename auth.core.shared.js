(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AuthCoreShared = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_KEYS = {
    pendingProfile: "auth_pending_profile_v1",
    visualState: "auth_visual_state_v1",
    returnScroll: "questions_auth_return_scroll_v1",
    authSnapshot: "auth_snapshot_v1",
    oauthReturnPending: "auth_oauth_return_pending_v1"
  };

  function noop() {}

  function create(options = {}) {
    const debugLog = globalThis.DebugLog || null;
    const authStateShared = options.authStateShared || globalThis.AuthStateShared || {
      getAuthUiConfig(innerOptions) {
        const isAuthenticated = !!innerOptions?.isAuthenticated;
        return {
          buttonLabel: isAuthenticated ? "" : "Войти",
          modalPlacement: isAuthenticated ? "anchored" : "centered"
        };
      },
      consumeSavedScrollPosition(innerOptions) {
        const saved = innerOptions?.saved;
        const currentPath = innerOptions?.currentPath || "";
        const now = Number(innerOptions?.now || Date.now());
        const ttlMs = Number(innerOptions?.ttlMs || 0);
        if (!saved || typeof saved.y !== "number") return null;
        if (saved.path && saved.path !== currentPath) return null;
        if (saved.ts && ttlMs > 0 && (now - Number(saved.ts)) > ttlMs) return null;
        return Math.max(0, Math.round(saved.y));
      }
    };

    const storageKeys = {
      ...DEFAULT_KEYS,
      ...(options.storageKeys || {})
    };
    const startupGraceMs = Number(options.startupGraceMs || 5000);
    const sessionCheckTtlMs = Number(options.sessionCheckTtlMs || 5 * 60 * 1000);
    const authSnapshotTtlMs = Number(options.authSnapshotTtlMs || 60 * 1000);
    const dom = options.dom || {};
    const ensureSupabaseReady = options.ensureSupabaseReady;
    const getSupabaseStore = options.getSupabaseStore;
    const mutateModalLayout = typeof options.mutateModalLayout === "function"
      ? options.mutateModalLayout
      : (mutator) => mutator();
    const getGuestDescription = typeof options.getGuestDescription === "function"
      ? options.getGuestDescription
      : () => "Войдите, чтобы сохранить ответы ИИ и прогресс изучения.";
    const getAuthorizedDescription = typeof options.getAuthorizedDescription === "function"
      ? options.getAuthorizedDescription
      : ({ syncInProgress }) => syncInProgress
        ? "Идет синхронизация. Пожалуйста, подождите."
        : "Профиль подключен. Направление, уровень и прогресс синхронизируются автоматически.";
    const getProfileLabel = typeof options.getProfileLabel === "function"
      ? options.getProfileLabel
      : (profile) => (profile?.track && profile?.grade ? `${profile.track} (${profile.grade})` : "");
    const getRedirectUrl = typeof options.getRedirectUrl === "function"
      ? options.getRedirectUrl
      : () => `${window.location.origin}${window.location.pathname}`;
    const isChecking = typeof options.isChecking === "function" ? options.isChecking : () => false;
    const setChecking = typeof options.setChecking === "function" ? options.setChecking : noop;
    const loadUserProfile = typeof options.loadUserProfile === "function" ? options.loadUserProfile : async () => null;
    const savePendingProfile = typeof options.savePendingProfile === "function" ? options.savePendingProfile : async () => null;
    const onUserResolved = typeof options.onUserResolved === "function" ? options.onUserResolved : async () => {};
    const onSignedOut = typeof options.onSignedOut === "function" ? options.onSignedOut : async () => {};
    const onManualSync = typeof options.onManualSync === "function" ? options.onManualSync : async () => {};
    const onModalShow = typeof options.onModalShow === "function" ? options.onModalShow : noop;
    const onModalHide = typeof options.onModalHide === "function" ? options.onModalHide : noop;
    const shouldDeferInitialScrollRestore = typeof options.shouldDeferInitialScrollRestore === "function"
      ? options.shouldDeferInitialScrollRestore
      : () => false;

    let supabaseStore = options.supabaseStore || null;
    let authUser = null;
    let authProfile = null;
    let authResolved = false;
    let authEmailLoginExpanded = false;
    let authLastSessionCheckTs = 0;
    let authRefreshInFlight = null;
    let initialized = false;
    let hoverCloseTimer = null;
    let pendingReturnScrollY = null;
    let syncBusy = false;
    let bootstrapStartedAt = Date.now();
    let modalOptions = {};
    let lastResolvedUserId = "";
    let lastResolvedProfileKey = "";
    let lastResolvedAuthTs = 0;
    let lastSoftSessionLogTs = 0;

    function publishAuthDebugState(extra = {}) {
      try {
        globalThis.__authDebugState = {
          userId: String(authUser?.id || ""),
          email: String(authUser?.email || ""),
          authResolved: !!authResolved,
          hasProfile: !!authProfile,
          profile: authProfile
            ? {
                track: authProfile.track || "",
                grade: authProfile.grade || "",
                updatedAt: authProfile.updated_at || ""
              }
            : null,
          syncBusy: !!syncBusy,
          sessionFresh: isAuthSessionCheckFresh(),
          authLastSessionCheckTs,
          lastResolvedAuthTs,
          visualState: readStoredAuthVisualState(),
          initialized: !!initialized,
          cloudReady: !!(supabaseStore && supabaseStore.client),
          oauthReturnPending: isOauthReturnPendingActive(),
          ...extra
        };
      } catch {}
    }

    function readLocal(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : raw;
      } catch {
        return fallback;
      }
    }

    function writeLocal(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    }

    function removeLocal(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    function setStatus(message) {
      if (dom.authStatus) dom.authStatus.textContent = message || "";
    }

    function readPendingProfile() {
      try {
        return JSON.parse(readLocal(storageKeys.pendingProfile, "null") || "null");
      } catch {
        return null;
      }
    }

    function writePendingProfile(profile) {
      try {
        writeLocal(storageKeys.pendingProfile, JSON.stringify(profile));
      } catch {}
    }

    function clearPendingProfile() {
      removeLocal(storageKeys.pendingProfile);
    }

    function readOauthReturnPending() {
      try {
        return JSON.parse(readLocal(storageKeys.oauthReturnPending, "null") || "null");
      } catch {
        return null;
      }
    }

    function writeOauthReturnPending(payload) {
      try {
        writeLocal(storageKeys.oauthReturnPending, JSON.stringify({
          ts: Date.now(),
          ...(payload || {})
        }));
      } catch {}
    }

    function clearOauthReturnPending() {
      removeLocal(storageKeys.oauthReturnPending);
    }

    function readAuthSnapshot() {
      try {
        const parsed = JSON.parse(readLocal(storageKeys.authSnapshot, "null") || "null");
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.ts || (Date.now() - Number(parsed.ts)) > authSnapshotTtlMs) return null;
        if (!parsed.user || typeof parsed.user !== "object") return null;
        return parsed;
      } catch {
        return null;
      }
    }

    function persistAuthSnapshot() {
      if (!authUser) {
        removeLocal(storageKeys.authSnapshot);
        return;
      }
      try {
        writeLocal(storageKeys.authSnapshot, JSON.stringify({
          ts: Date.now(),
          user: {
            id: authUser.id || null,
            email: authUser.email || null
          },
          profile: authProfile
            ? {
                user_id: authProfile.user_id || authUser.id || null,
                email: authProfile.email || authUser.email || null,
                track: authProfile.track || "",
                grade: authProfile.grade || "",
                updated_at: authProfile.updated_at || null
              }
            : null
        }));
      } catch {}
    }

    function clearAuthSnapshot() {
      removeLocal(storageKeys.authSnapshot);
    }

    function hydrateAuthSnapshotFromCache() {
      const snapshot = readAuthSnapshot();
      if (!snapshot?.user?.id) return false;
      authResolved = true;
      authUser = {
        id: snapshot.user.id,
        email: snapshot.user.email || null
      };
      authProfile = snapshot.profile || null;
      authLastSessionCheckTs = Number(snapshot.ts || Date.now());
      markResolvedAuthSnapshot();
      syncProfileUiFromState();
      publishAuthDebugState({ source: "snapshot" });
      return true;
    }

    function persistAuthVisualState(state) {
      try {
        if (state) {
          writeLocal(storageKeys.visualState, state);
          document.documentElement.setAttribute("data-auth-visual-state", state);
        } else {
          removeLocal(storageKeys.visualState);
          document.documentElement.removeAttribute("data-auth-visual-state");
        }
      } catch {}
    }

    function readStoredAuthVisualState() {
      return String(readLocal(storageKeys.visualState, "") || "");
    }

    function isOauthReturnPendingActive() {
      const pending = readOauthReturnPending();
      if (!pending?.ts) return false;
      return (Date.now() - Number(pending.ts)) < Math.max(15000, startupGraceMs * 3);
    }

    function isOptimisticAuthUiActive() {
      return !authUser
        && readStoredAuthVisualState() === "auth"
        && (!authResolved || isOauthReturnPendingActive());
    }

    function shouldKeepOptimisticAuthUiOnMissingSession() {
      return readStoredAuthVisualState() === "auth"
        && (isOauthReturnPendingActive() || (!authResolved && (Date.now() - bootstrapStartedAt) < startupGraceMs));
    }

    function shouldRunStartupRetry() {
      if (authUser) return false;
      const visualState = readStoredAuthVisualState();
      if (visualState === "auth") return true;
      const pendingProfile = readPendingProfile();
      return isOauthReturnPendingActive() || !!(pendingProfile?.email || pendingProfile?.track || pendingProfile?.grade);
    }

    function setAuthSessionCheckedNow() {
      authLastSessionCheckTs = Date.now();
      publishAuthDebugState();
    }

    function isAuthSessionCheckFresh() {
      return (Date.now() - authLastSessionCheckTs) < sessionCheckTtlMs;
    }

    function getProfileCacheKey(profile) {
      if (!profile) return "";
      return [
        String(profile.user_id || ""),
        String(profile.track || ""),
        String(profile.grade || ""),
        String(profile.updated_at || "")
      ].join("::");
    }

    function markResolvedAuthSnapshot() {
      lastResolvedUserId = String(authUser?.id || "");
      lastResolvedProfileKey = getProfileCacheKey(authProfile);
      lastResolvedAuthTs = Date.now();
      publishAuthDebugState();
    }

    function isSessionTimeoutError(error) {
      const message = String(error?.message || error || "").toLowerCase();
      return message.includes("get session timeout") || message.includes("get session fallback timeout");
    }

    function logSoftSessionIssue(message, error) {
      const now = Date.now();
      if ((now - lastSoftSessionLogTs) < (2 * 60 * 1000)) return;
      lastSoftSessionLogTs = now;
      if (error) {
        console.info(message, error);
        return;
      }
      console.info(message);
    }

    function canSkipAuthRefreshForInitialSession(event, session) {
      if (event !== "INITIAL_SESSION") return false;
      if (!authUser?.id || !session?.user?.id) return false;
      if (String(session.user.id) !== String(authUser.id)) return false;
      if (!authProfile) return false;
      if (!lastResolvedUserId || !lastResolvedProfileKey) return false;
      if (lastResolvedUserId !== String(authUser.id)) return false;
      if (lastResolvedProfileKey !== getProfileCacheKey(authProfile)) return false;
      return (Date.now() - lastResolvedAuthTs) < 10 * 1000;
    }

    function canSkipAuthRefreshForStableAuthEvent(event, session) {
      if (!event || event === "SIGNED_OUT" || event === "USER_DELETED") return false;
      if (!authUser?.id || !session?.user?.id) return false;
      if (String(session.user.id) !== String(authUser.id)) return false;
      if (!authProfile) return false;
      if (!lastResolvedUserId || !lastResolvedProfileKey) return false;
      if (lastResolvedUserId !== String(authUser.id)) return false;
      if (lastResolvedProfileKey !== getProfileCacheKey(authProfile)) return false;
      return isAuthSessionCheckFresh();
    }

    function syncProfileUiFromState() {
      if (dom.authTrackSelect && authProfile?.track) dom.authTrackSelect.value = authProfile.track;
      if (dom.authGradeSelect && authProfile?.grade) dom.authGradeSelect.value = authProfile.grade;
      if (!dom.authTitle) return;
      const fallbackPending = !authProfile ? readPendingProfile() : null;
      const label = getProfileLabel(authProfile) || getProfileLabel(fallbackPending);
      dom.authTitle.textContent = label || "Аккаунт подключен";
    }

    function updateAuthButtonUi() {
      if (!dom.authOpenBtn) return;
      const labelEl = dom.authOpenBtn.querySelector(".auth-open-btn__label");
      const isAuthenticatedUi = !!authUser || isOptimisticAuthUiActive();
      const uiConfig = authStateShared.getAuthUiConfig({ isAuthenticated: isAuthenticatedUi });
      dom.authOpenBtn.classList.toggle("is-auth", isAuthenticatedUi);
      dom.authOpenBtn.classList.toggle("is-guest", !isAuthenticatedUi);
      dom.authOpenBtn.dataset.authPlacement = uiConfig.modalPlacement;
      if (authUser) {
        persistAuthVisualState("auth");
      } else if (authResolved) {
        persistAuthVisualState("guest");
      }
      if (labelEl) {
        labelEl.textContent = uiConfig.buttonLabel;
      }
      if (isAuthenticatedUi) {
        dom.authOpenBtn.title = "Профиль";
        dom.authOpenBtn.setAttribute("aria-label", "Профиль");
      } else {
        dom.authOpenBtn.title = "Войти и сохранить прогресс";
        dom.authOpenBtn.setAttribute("aria-label", "Войти и сохранить прогресс");
      }
    }

    function setEmailLoginExpanded(next) {
      authEmailLoginExpanded = !!next;
      if (dom.authModal) dom.authModal.classList.toggle("auth-email-expanded", authEmailLoginExpanded);
      if (dom.authEmailToggle) dom.authEmailToggle.setAttribute("aria-expanded", authEmailLoginExpanded ? "true" : "false");
    }

    function positionAuthModal() {
      if (!dom.authModal || !dom.authCard) return;
      const uiConfig = authStateShared.getAuthUiConfig({ isAuthenticated: !!authUser });
      dom.authModal.dataset.placement = uiConfig.modalPlacement;
      if (uiConfig.modalPlacement === "anchored" && dom.authOpenBtn) {
        const trigger = dom.authOpenBtn.getBoundingClientRect();
        dom.authCard.style.left = "auto";
        dom.authCard.style.top = `${Math.max(8, Math.round(trigger.bottom + 8))}px`;
        dom.authCard.style.right = `${Math.max(8, Math.round(window.innerWidth - trigger.right))}px`;
        return;
      }
      dom.authCard.style.left = "50%";
      dom.authCard.style.top = "50%";
      dom.authCard.style.right = "auto";
    }

    function applyAuthModalMode() {
      if (!dom.authModal || !dom.authEmailInput || !dom.authSendBtn || !dom.authCloseBtn) return;
      if (isChecking()) return;
      mutateModalLayout(() => {
        const isOptimisticAuth = isOptimisticAuthUiActive();
        const isAuthorized = !!authUser || isOptimisticAuth;
        dom.authModal.classList.toggle("compact-auth", isAuthorized);
        if (isAuthorized) {
          if (dom.authDescription) {
            dom.authDescription.style.display = "";
            dom.authDescription.textContent = getAuthorizedDescription({
              user: authUser,
              profile: authProfile,
              syncInProgress: syncBusy,
              isOptimisticAuth
            });
          }
          if (dom.authLevelWrap) dom.authLevelWrap.style.display = "";
          if (dom.authOAuthRow) dom.authOAuthRow.style.display = isOptimisticAuth ? "none" : "";
          if (dom.authEmailToggle) dom.authEmailToggle.style.display = "none";
          dom.authEmailInput.style.display = "none";
          syncProfileUiFromState();
          if (isOptimisticAuth) {
            dom.authModal.classList.add("auth-profile-pending");
            if (dom.authSyncBtn) dom.authSyncBtn.style.display = "none";
            dom.authSendBtn.textContent = "Закрыть";
            dom.authSendBtn.disabled = false;
            dom.authSendBtn.style.display = "none";
            dom.authCloseBtn.textContent = "Закрыть";
            return;
          }
          dom.authModal.classList.remove("auth-profile-pending");
          if (dom.authSyncBtn) dom.authSyncBtn.style.display = syncBusy ? "none" : "inline-flex";
          dom.authSendBtn.textContent = syncBusy ? "Закрыть" : "Выйти";
          dom.authSendBtn.disabled = false;
          dom.authSendBtn.style.display = syncBusy ? "none" : "";
          dom.authCloseBtn.textContent = "Закрыть";
          return;
        }
        dom.authModal.classList.remove("auth-profile-pending");
        if (dom.authTitle) dom.authTitle.textContent = "Сохранение прогресса";
        if (dom.authDescription) {
          dom.authDescription.style.display = "";
          dom.authDescription.textContent = getGuestDescription();
        }
        if (dom.authLevelWrap) dom.authLevelWrap.style.display = "";
        if (dom.authOAuthRow) dom.authOAuthRow.style.display = "";
        if (dom.authEmailToggle) dom.authEmailToggle.style.display = "";
        dom.authEmailInput.style.display = authEmailLoginExpanded ? "" : "none";
        if (dom.authSyncBtn) dom.authSyncBtn.style.display = "none";
        dom.authSendBtn.textContent = "Получить ссылку";
        dom.authSendBtn.style.display = authEmailLoginExpanded ? "" : "none";
        dom.authCloseBtn.textContent = "Закрыть";
      });
      positionAuthModal();
    }

    function setSyncBusy(isBusy) {
      syncBusy = !!isBusy;
      if (dom.authSyncBtn) {
        dom.authSyncBtn.classList.toggle("is-busy", syncBusy);
        dom.authSyncBtn.disabled = syncBusy;
      }
      publishAuthDebugState();
      applyAuthModalMode();
    }

    function flashSyncSuccess() {
      if (!dom.authSyncBtn) return;
      dom.authSyncBtn.classList.remove("is-success");
      void dom.authSyncBtn.offsetWidth;
      dom.authSyncBtn.classList.add("is-success");
      setTimeout(() => dom.authSyncBtn.classList.remove("is-success"), 700);
    }

    function saveReturnScrollPosition() {
      try {
        writeLocal(storageKeys.returnScroll, JSON.stringify({
          y: Math.max(0, Math.round(window.scrollY || 0)),
          path: window.location.pathname,
          ts: Date.now()
        }));
      } catch {}
    }

    function consumeReturnScrollPosition() {
      try {
        const saved = JSON.parse(readLocal(storageKeys.returnScroll, "null") || "null");
        const y = authStateShared.consumeSavedScrollPosition({
          saved,
          currentPath: window.location.pathname,
          now: Date.now(),
          ttlMs: 30 * 60 * 1000
        });
        removeLocal(storageKeys.returnScroll);
        return y;
      } catch {
        removeLocal(storageKeys.returnScroll);
        return null;
      }
    }

    function restorePendingScroll() {
      const targetY = Number.isFinite(pendingReturnScrollY) ? pendingReturnScrollY : consumeReturnScrollPosition();
      if (!Number.isFinite(targetY) || targetY === null) return;
      pendingReturnScrollY = targetY;
      const restore = () => window.scrollTo(0, targetY);
      restore();
      requestAnimationFrame(restore);
      setTimeout(restore, 120);
      setTimeout(() => {
        restore();
        pendingReturnScrollY = null;
      }, 520);
    }

    async function ensureSupabaseStoreReady() {
      if (supabaseStore) return supabaseStore;
      if (typeof ensureSupabaseReady === "function") {
        supabaseStore = await ensureSupabaseReady();
      } else if (typeof getSupabaseStore === "function") {
        supabaseStore = await getSupabaseStore();
      }
      return supabaseStore;
    }

    function isCloudReady() {
      return !!(supabaseStore && supabaseStore.client);
    }

    async function getActiveSession() {
      if (!isCloudReady()) return null;
      try {
        if (supabaseStore?.getSession) {
          const session = await Promise.race([
            supabaseStore.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("get session timeout")), 3000))
          ]);
          if (session?.access_token) return session;
        }
        const fallback = await Promise.race([
          supabaseStore.client?.auth?.getSession?.() || Promise.resolve({ data: { session: null } }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("get session fallback timeout")), 3000))
        ]);
        debugLog?.debug("auth", "session-ok", {
          source: "fallback",
          hasSession: !!fallback?.data?.session?.access_token
        });
        return fallback?.data?.session || null;
      } catch (error) {
        if (isSessionTimeoutError(error)) {
          logSoftSessionIssue("getActiveSession timed out, continuing with cached/local auth state.", error);
          debugLog?.info("auth", "session-timeout", {
            message: String(error?.message || error || "")
          });
        } else {
          console.warn("getActiveSession failed", error);
          debugLog?.warn("auth", "session-failed", {
            message: String(error?.message || error || "")
          });
        }
        return undefined;
      }
    }

    async function applyPendingProfileToCloud() {
      if (!authUser) return false;
      const pending = readPendingProfile();
      if (!pending?.track || !pending?.grade) return false;
      const saved = await savePendingProfile(authUser, pending);
      if (!saved) return false;
      authProfile = saved;
      clearPendingProfile();
      syncProfileUiFromState();
      return true;
    }

    async function refreshAuthUser(meta = {}) {
      if (authRefreshInFlight) return authRefreshInFlight;
      if (!isCloudReady()) return null;
      authRefreshInFlight = (async () => {
        try {
          debugLog?.debug("auth", "refresh-start", {
            source: meta?.source || "unknown",
            initial: !!meta?.initial
          });
          const session = await getActiveSession();
          if (session === undefined) {
            updateAuthButtonUi();
            applyAuthModalMode();
            publishAuthDebugState({
              source: meta?.source || "unknown",
              reason: "session-unavailable"
            });
            debugLog?.info("auth", "refresh-deferred", {
              source: meta?.source || "unknown",
              reason: "session-unavailable"
            });
            return authUser || null;
          }
          if (!session?.access_token) {
            if (shouldKeepOptimisticAuthUiOnMissingSession()) {
              updateAuthButtonUi();
              applyAuthModalMode();
              return authUser || null;
            }
            authResolved = true;
            authUser = null;
            authProfile = null;
            clearAuthSnapshot();
            clearOauthReturnPending();
            setAuthSessionCheckedNow();
            publishAuthDebugState({
              source: meta?.source || "unknown",
              reason: "missing-session"
            });
            updateAuthButtonUi();
            applyAuthModalMode();
            await onSignedOut({ ...meta, reason: "missing-session" });
            debugLog?.info("auth", "signed-out", {
              source: meta?.source || "unknown",
              reason: "missing-session"
            });
            return null;
          }
          authResolved = true;
          authUser = typeof supabaseStore.getUser === "function"
            ? await supabaseStore.getUser()
            : (session.user || null);
          if (authUser) {
            authProfile = await loadUserProfile(authUser);
            await applyPendingProfileToCloud();
            syncProfileUiFromState();
            markResolvedAuthSnapshot();
            persistAuthSnapshot();
            clearOauthReturnPending();
          } else {
            authProfile = null;
            markResolvedAuthSnapshot();
            clearAuthSnapshot();
          }
          updateAuthButtonUi();
          setAuthSessionCheckedNow();
          applyAuthModalMode();
          publishAuthDebugState({
            source: meta?.source || "unknown",
            hasSession: !!session?.access_token
          });
          if (authUser) {
            await onUserResolved({
              ...meta,
              user: authUser,
              profile: authProfile,
              controller: api
            });
            debugLog?.info("auth", "refresh-success", {
              source: meta?.source || "unknown",
              userId: authUser.id,
              hasProfile: !!authProfile
            });
          }
          return authUser;
        } catch (error) {
          console.warn("Supabase auth init failed", error);
          debugLog?.warn("auth", "refresh-failed", {
            source: meta?.source || "unknown",
            message: String(error?.message || error || "")
          });
          publishAuthDebugState({
            source: meta?.source || "unknown",
            lastError: String(error?.message || error || "")
          });
          updateAuthButtonUi();
          applyAuthModalMode();
          return authUser || null;
        } finally {
          authRefreshInFlight = null;
        }
      })();
      return authRefreshInFlight;
    }

    async function refreshAuthUserInBackground(meta = {}) {
      const force = !!meta.force;
      if (!isCloudReady()) return null;
      if (!force && isAuthSessionCheckFresh() && authUser) return authUser;
      if (document.visibilityState === "hidden" && !force) return authUser;
      return refreshAuthUser(meta);
    }

    function persistPendingProfileSelection() {
      const track = (dom.authTrackSelect?.value || "").trim();
      const grade = (dom.authGradeSelect?.value || "").trim();
      const current = readPendingProfile() || {};
      if (!track && !grade && !current?.email) {
        clearPendingProfile();
        return;
      }
      writePendingProfile({
        ...current,
        track: track || current?.track || "",
        grade: grade || current?.grade || "",
        ts: Date.now()
      });
    }

    function showModal(message, nextOptions = {}) {
      if (!dom.authModal) return;
      modalOptions = nextOptions || {};
      onModalShow(modalOptions);
      const startChecking = !!nextOptions.checking;
      setChecking(startChecking);
      setEmailLoginExpanded(false);
      if (!authUser) {
        const pending = readPendingProfile();
        if (dom.authTrackSelect && pending?.track) dom.authTrackSelect.value = pending.track;
        if (dom.authGradeSelect && pending?.grade) dom.authGradeSelect.value = pending.grade;
      }
      if (!startChecking) {
        applyAuthModalMode();
        setStatus(message || "");
      }
      dom.authModal.classList.add("show");
      dom.authModal.setAttribute("aria-hidden", "false");
      positionAuthModal();
      if (dom.authEmailInput && authEmailLoginExpanded && dom.authEmailInput.style.display !== "none") {
        dom.authEmailInput.focus();
      }
    }

    function hideModal() {
      if (!dom.authModal) return;
      onModalHide(modalOptions, {
        isAuthenticated: !!authUser,
        controller: api
      });
      modalOptions = {};
      setChecking(false);
      dom.authModal.classList.remove("auth-profile-pending");
      dom.authModal.classList.remove("show");
      dom.authModal.setAttribute("aria-hidden", "true");
      setStatus("");
    }

    async function handleAuthorizedAction() {
      if (!isCloudReady()) {
        setStatus("Supabase не подключен.");
        return;
      }
      try {
        const signOutFn = supabaseStore.signOut || (supabaseStore.client?.auth?.signOut
          ? () => supabaseStore.client.auth.signOut()
          : null);
        if (!signOutFn) {
          setStatus("Выход недоступен. Обновите страницу.");
          return;
        }
        setSyncBusy(false);
        setStatus("");
        authUser = null;
        authProfile = null;
        authResolved = true;
        clearAuthSnapshot();
        clearOauthReturnPending();
        publishAuthDebugState({ source: "signout-click" });
        updateAuthButtonUi();
        hideModal();
        const { error } = await signOutFn();
        if (error) {
          console.warn("Sign out returned error", error);
        }
        await onSignedOut({ event: "signout-click", controller: api });
      } catch (error) {
        console.warn("Sign out failed", error);
      }
    }

    async function bindHandlers() {
      if (!dom.authOpenBtn || !dom.authModal) return;

      dom.authOpenBtn.addEventListener("click", async () => {
        if (!authUser || !isAuthSessionCheckFresh() || isOptimisticAuthUiActive()) {
          refreshAuthUserInBackground({ force: isOptimisticAuthUiActive(), source: "open-click" }).catch((error) => {
            console.warn("Background auth refresh failed", error);
          });
        }
        showModal("");
        applyAuthModalMode();
      });

      const supportsHover = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
      if (supportsHover) {
        const clearHoverClose = () => {
          if (!hoverCloseTimer) return;
          clearTimeout(hoverCloseTimer);
          hoverCloseTimer = null;
        };
        const scheduleHoverClose = () => {
          clearHoverClose();
          hoverCloseTimer = setTimeout(() => {
            if (!authUser) return;
            if (!dom.authModal.matches(":hover") && !dom.authOpenBtn.matches(":hover")) {
              hideModal();
            }
          }, 1000);
        };
        dom.authOpenBtn.addEventListener("mouseenter", () => {
          if (!authUser) return;
          clearHoverClose();
          showModal("");
        });
        dom.authOpenBtn.addEventListener("mouseleave", scheduleHoverClose);
        dom.authModal.addEventListener("mouseenter", clearHoverClose);
        dom.authModal.addEventListener("mouseleave", scheduleHoverClose);
      }

      if (dom.authSendBtn) {
        dom.authSendBtn.addEventListener("click", async () => {
          if (authUser) {
            await handleAuthorizedAction();
            return;
          }
          if (isOptimisticAuthUiActive()) {
            setStatus("Восстанавливаю сессию...");
            refreshAuthUserInBackground({ force: true, source: "optimistic-recover" }).catch((error) => {
              console.warn("Forced auth refresh failed", error);
            });
            return;
          }
          await refreshAuthUser({ source: "send-click" });
          const track = (dom.authTrackSelect?.value || "").trim();
          const grade = (dom.authGradeSelect?.value || "").trim();
          if (!track || !grade) {
            setStatus("Выберите направление и уровень.");
            return;
          }
          const email = (dom.authEmailInput?.value || "").trim();
          if (!email) {
            setStatus("Введите email.");
            return;
          }
          if (!email.includes("@")) {
            setStatus("Введите корректный email: нужен символ @.");
            return;
          }
          writePendingProfile({ email, track, grade, ts: Date.now() });
          setStatus("Отправляю ссылку для входа...");
          saveReturnScrollPosition();
          const { error } = await supabaseStore.signInWithOtp(email, getRedirectUrl());
          if (error) {
            const errCode = String(error.code || "");
            const errMsg = String(error.message || "").toLowerCase();
            if (errCode === "over_email_send_rate_limit" || errMsg.includes("email rate limit exceeded")) {
              setStatus("Лимит писем Supabase исчерпан. Подождите 60 сек и попробуйте снова.");
              dom.authSendBtn.disabled = true;
              setTimeout(() => {
                dom.authSendBtn.disabled = false;
              }, 60000);
              return;
            }
            setStatus("Не удалось отправить ссылку. Проверьте email и повторите.");
            return;
          }
          setStatus("Ссылка отправлена. Откройте письмо и вернитесь на страницу.");
        });
      }

      if (dom.authEmailToggle) {
        dom.authEmailToggle.addEventListener("click", () => {
          if (authUser) return;
          setEmailLoginExpanded(!authEmailLoginExpanded);
          applyAuthModalMode();
          positionAuthModal();
          if (authEmailLoginExpanded && dom.authEmailInput) {
            requestAnimationFrame(() => dom.authEmailInput.focus());
          }
        });
      }

      if (dom.authTrackSelect) {
        dom.authTrackSelect.addEventListener("change", () => {
          persistPendingProfileSelection();
          syncProfileUiFromState();
        });
      }

      if (dom.authGradeSelect) {
        dom.authGradeSelect.addEventListener("change", () => {
          persistPendingProfileSelection();
          syncProfileUiFromState();
        });
      }

      if (dom.authGoogleBtn) {
        dom.authGoogleBtn.addEventListener("click", async () => {
          if (!isCloudReady()) {
            setStatus("Supabase не подключен.");
            return;
          }
          const track = (dom.authTrackSelect?.value || "").trim();
          const grade = (dom.authGradeSelect?.value || "").trim();
          if (!track || !grade) {
            setStatus("Выберите направление и уровень.");
            return;
          }
          writePendingProfile({
            email: (dom.authEmailInput?.value || "").trim() || null,
            track,
            grade,
            ts: Date.now()
          });
          persistAuthVisualState("auth");
          writeOauthReturnPending({ provider: "google" });
          publishAuthDebugState({ source: "google-redirect-start" });
          setStatus("Перенаправляю в Google...");
          saveReturnScrollPosition();
          const signInOAuthFn = supabaseStore.signInWithOAuth || (supabaseStore.client?.auth?.signInWithOAuth
            ? (provider, redirectTo) => supabaseStore.client.auth.signInWithOAuth({ provider, options: { redirectTo } })
            : null);
          if (!signInOAuthFn) {
            setStatus("Google вход недоступен. Обновите страницу.");
            return;
          }
          const { error } = await signInOAuthFn("google", getRedirectUrl());
          if (error) {
            console.warn("Google OAuth sign-in failed", error);
            setStatus("Не удалось открыть Google вход.");
          }
        });
      }

      if (dom.authSyncBtn) {
        dom.authSyncBtn.addEventListener("click", async () => {
          if (!authUser && isOptimisticAuthUiActive()) {
            setStatus("Восстанавливаю сессию...");
            refreshAuthUserInBackground({ force: true, source: "manual-sync-recover" }).catch((error) => {
              console.warn("Auth refresh for sync failed", error);
            });
            return;
          }
          if (!authUser) {
            setStatus("Сначала войдите");
            return;
          }
          try {
            setSyncBusy(true);
            await onManualSync({
              user: authUser,
              profile: authProfile,
              controller: api
            });
          } finally {
            setSyncBusy(false);
          }
        });
      }

      if (dom.authCloseBtn) {
        dom.authCloseBtn.addEventListener("click", hideModal);
      }

      dom.authModal.addEventListener("click", (event) => {
        if (event.target === dom.authModal) hideModal();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!dom.authModal.classList.contains("show")) return;
        hideModal();
      });

      window.addEventListener("resize", () => {
        if (dom.authModal.classList.contains("show")) {
          applyAuthModalMode();
          positionAuthModal();
        }
      });

      window.addEventListener("scroll", () => {
        if (dom.authModal.classList.contains("show")) positionAuthModal();
      }, { passive: true });
    }

    async function init() {
      if (initialized) return api;
      initialized = true;
      await ensureSupabaseStoreReady();
      if (!shouldDeferInitialScrollRestore()) {
        pendingReturnScrollY = consumeReturnScrollPosition();
        restorePendingScroll();
      }
      await bindHandlers();
      hydrateAuthSnapshotFromCache();
      publishAuthDebugState({ source: "init-start" });
      if (authUser) {
        debugLog?.info("auth", "snapshot-used", {
          userId: authUser.id,
          hasProfile: !!authProfile
        });
      }
      updateAuthButtonUi();
      applyAuthModalMode();
      if (!isCloudReady()) return api;
      if (!isAuthSessionCheckFresh()) {
        await refreshAuthUser({ source: "init", initial: true });
      } else {
        debugLog?.info("auth", "init-skip-network", {
          reason: "fresh-session-ttl",
          userId: authUser?.id || ""
        });
      }
      bootstrapStartedAt = Date.now();

      if (supabaseStore.client?.auth?.onAuthStateChange) {
        supabaseStore.client.auth.onAuthStateChange(async (event, session) => {
          debugLog?.debug("auth", "auth-event-received", {
            event: String(event || ""),
            hasSession: !!session?.access_token,
            sessionUserId: String(session?.user?.id || "")
          });
          authResolved = true;
          authUser = session?.user || null;
          if (authUser) {
            setAuthSessionCheckedNow();
          } else if (event === "INITIAL_SESSION") {
            authLastSessionCheckTs = 0;
          } else {
            setAuthSessionCheckedNow();
          }
          if (canSkipAuthRefreshForInitialSession(event, session)) {
            publishAuthDebugState({
              source: event || "auth-event",
              reason: "initial-session-unchanged"
            });
            updateAuthButtonUi();
            applyAuthModalMode();
            return;
          }
          if (canSkipAuthRefreshForStableAuthEvent(event, session)) {
            publishAuthDebugState({
              source: event || "auth-event",
              reason: "stable-auth-event-skipped"
            });
            updateAuthButtonUi();
            applyAuthModalMode();
            return;
          }
          if (authUser) {
            await refreshAuthUser({ source: "auth-event", event });
          } else if (isOauthReturnPendingActive()) {
            publishAuthDebugState({
              source: event || "auth-event",
              reason: "oauth-return-pending"
            });
            updateAuthButtonUi();
            applyAuthModalMode();
            return;
          } else {
            authProfile = null;
            markResolvedAuthSnapshot();
            clearAuthSnapshot();
            clearOauthReturnPending();
            publishAuthDebugState({
              source: event || "auth-event",
              reason: "signed-out"
            });
            updateAuthButtonUi();
            applyAuthModalMode();
            await onSignedOut({ event, controller: api });
          }
        });
      }

      [600, 1800, 4000].forEach((delay) => {
        setTimeout(() => {
          if (authUser) return;
          if (!shouldRunStartupRetry()) {
            if (authResolved && !isOauthReturnPendingActive()) return;
            debugLog?.debug("auth", "startup-retry-skipped", {
              reason: "guest-no-session-hint",
              delay
            });
            return;
          }
          refreshAuthUserInBackground({ force: true, source: "startup-retry" }).catch((error) => {
            console.warn("Startup auth retry failed", error);
          });
        }, delay);
      });

      setInterval(() => {
        refreshAuthUserInBackground({ source: "periodic" }).catch((error) => {
          console.warn("Periodic auth refresh failed", error);
        });
      }, sessionCheckTtlMs);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          refreshAuthUserInBackground({ source: "visibility" }).catch((error) => {
            console.warn("Visibility auth refresh failed", error);
          });
        }
      });

      window.addEventListener("storage", (event) => {
        if (event.key && ![
          storageKeys.visualState,
          storageKeys.pendingProfile
        ].includes(event.key)) {
          return;
        }
        syncProfileUiFromState();
        updateAuthButtonUi();
        applyAuthModalMode();
      });

      return api;
    }

    const api = {
      init,
      showModal,
      hideModal,
      applyAuthModalMode,
      positionModal: positionAuthModal,
      updateAuthButtonUi,
      refreshAuthUser,
      refreshAuthUserInBackground,
      getActiveSession,
      setSyncBusy,
      flashSyncSuccess,
      saveReturnScrollPosition,
      restorePendingScroll,
      persistPendingProfileSelection,
      setStatus,
      isCloudReady,
      isAuthenticated() {
        return !!authUser;
      },
      getState() {
        return {
          authUser,
          authProfile,
          authResolved,
          syncBusy
        };
      },
      readPendingProfile,
      writePendingProfile,
      clearPendingProfile,
      readStoredAuthVisualState,
      isOptimisticAuthUiActive
    };

    publishAuthDebugState({ source: "create" });

    return api;
  }

  return { create };
});
