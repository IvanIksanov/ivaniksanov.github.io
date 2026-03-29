(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.StudyPlanSyncShared = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function create(options = {}) {
    const debugLog = options.debugLog || null;
    const localStorageRef = options.localStorage || globalThis.localStorage;
    const documentRef = options.document || globalThis.document;
    const config = {
      resourceStatusTable: options.resourceStatusTable || "study_plan_resource_progress",
      resourceSyncTtlMs: Number(options.resourceSyncTtlMs || 2 * 60 * 1000),
      authSyncCooldownMs: Number(options.authSyncCooldownMs || 2 * 60 * 1000),
      retryBaseDelayMs: Number(options.retryBaseDelayMs || 350),
      softLogTtlMs: Number(options.softLogTtlMs || 2 * 60 * 1000),
      resourceStatusCloudSyncTsKey: options.resourceStatusCloudSyncTsKey || "studyPlanResourceStatusesCloudSyncTsV1",
      resourceStatusAuthSyncTsKey: options.resourceStatusAuthSyncTsKey || "studyPlanResourceStatusesAuthSyncTsV1",
      resourceStatusAuthSyncUserKey: options.resourceStatusAuthSyncUserKey || "studyPlanResourceStatusesAuthSyncUserV1"
    };

    const getSupabaseStore = typeof options.getSupabaseStore === "function"
      ? options.getSupabaseStore
      : () => globalThis.AppSupabase || null;
    const isCloudReady = typeof options.isCloudReady === "function"
      ? options.isCloudReady
      : () => {
        const store = getSupabaseStore();
        return !!(store?.url && store?.anonKey);
      };
    const loadLocalMap = typeof options.loadLocalMap === "function" ? options.loadLocalMap : () => ({});
    const saveLocalMap = typeof options.saveLocalMap === "function" ? options.saveLocalMap : () => {};
    const mergeLocalWithCloud = typeof options.mergeLocalWithCloud === "function"
      ? options.mergeLocalWithCloud
      : () => ({ mergedMap: {}, rowsToUpload: [] });
    const cloudRowToLocalEntry = typeof options.cloudRowToLocalEntry === "function"
      ? options.cloudRowToLocalEntry
      : (row) => row || null;
    const onSyncSuccess = typeof options.onSyncSuccess === "function" ? options.onSyncSuccess : async () => {};
    const shouldAutoSync = typeof options.shouldAutoSync === "function" ? options.shouldAutoSync : () => true;

    let syncPromise = null;
    let authSubscriptionBound = false;
    let queuedSyncTimer = null;
    let lastSoftLogTs = 0;

    function readNumber(key) {
      try {
        return Number(localStorageRef?.getItem(key) || 0);
      } catch {
        return 0;
      }
    }

    function readString(key) {
      try {
        return String(localStorageRef?.getItem(key) || "");
      } catch {
        return "";
      }
    }

    function writeString(key, value) {
      try {
        localStorageRef?.setItem(key, String(value));
      } catch {}
    }

    function getResourceSyncLastTs() {
      return readNumber(config.resourceStatusCloudSyncTsKey);
    }

    function getAuthSyncLastTs() {
      return readNumber(config.resourceStatusAuthSyncTsKey);
    }

    function getAuthSyncLastUserId() {
      return readString(config.resourceStatusAuthSyncUserKey);
    }

    function markAuthSync(userId) {
      writeString(config.resourceStatusAuthSyncTsKey, Date.now());
      writeString(config.resourceStatusAuthSyncUserKey, userId || "");
    }

    function shouldRunAuthSync(userId) {
      const normalizedUserId = String(userId || "");
      if (!normalizedUserId) return false;
      const lastUserId = getAuthSyncLastUserId();
      const lastTs = getAuthSyncLastTs();
      if (lastUserId !== normalizedUserId) return true;
      return (Date.now() - lastTs) >= config.authSyncCooldownMs;
    }

    function markResourceSyncTs() {
      writeString(config.resourceStatusCloudSyncTsKey, Date.now());
    }

    async function ensureAuthUser() {
      if (!isCloudReady()) return null;
      const supabaseStore = getSupabaseStore();
      try {
        const session = typeof supabaseStore?.getSession === "function"
          ? await supabaseStore.getSession()
          : null;
        return session?.user || null;
      } catch (error) {
        console.warn("Study plan auth context failed", error);
        return null;
      }
    }

    function waitForRetry(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isTransientError(error) {
      const message = String(error?.message || error || "").toLowerCase();
      return (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network error") ||
        message.includes("err_connection_closed") ||
        message.includes("timeout") ||
        message.includes("aborterror")
      );
    }

    function logSoftIssue(message, error) {
      const now = Date.now();
      if ((now - lastSoftLogTs) < config.softLogTtlMs) return;
      lastSoftLogTs = now;
      if (error) {
        console.info(message, error);
        return;
      }
      console.info(message);
    }

    async function restRequest(pathName, requestOptions = {}) {
      const supabaseStore = getSupabaseStore();
      if (!isCloudReady() || !supabaseStore) {
        throw new Error("Supabase is not ready");
      }
      const method = requestOptions.method || "GET";
      const query = requestOptions.query || "";
      const prefer = Object.prototype.hasOwnProperty.call(requestOptions, "prefer")
        ? requestOptions.prefer
        : "return=representation";
      const body = requestOptions.body || null;
      const retryCount = Number.isFinite(requestOptions.retryCount)
        ? Math.max(0, Number(requestOptions.retryCount))
        : 0;
      const session = typeof supabaseStore.getSession === "function"
        ? await supabaseStore.getSession()
        : null;
      const url = new URL(`/rest/v1/${pathName}`, supabaseStore.url);
      if (query) url.search = query;
      const headers = {
        apikey: supabaseStore.anonKey,
        Authorization: `Bearer ${session?.access_token || supabaseStore.anonKey}`
      };
      if (prefer) headers.Prefer = prefer;
      if (body !== null) headers["Content-Type"] = "application/json";

      let attempt = 0;
      while (true) {
        try {
          const startedAt = Date.now();
          const response = await fetch(url.toString(), {
            method,
            headers,
            body: body !== null ? JSON.stringify(body) : undefined
          });
          if (!response.ok) {
            debugLog?.warn("network", "study-plan-rest-fail", {
              path: pathName,
              method,
              status: response.status,
              durationMs: Date.now() - startedAt,
              attempt: attempt + 1
            });
            throw new Error(`Study plan REST ${method} ${pathName} failed: ${response.status} ${await response.text()}`);
          }
          if (response.status === 204) return null;
          const text = await response.text();
          debugLog?.debug("network", "study-plan-rest-ok", {
            path: pathName,
            method,
            status: response.status,
            durationMs: Date.now() - startedAt,
            attempt: attempt + 1
          });
          return text ? JSON.parse(text) : null;
        } catch (error) {
          const canRetry = attempt < retryCount && isTransientError(error);
          debugLog?.warn("sync", "study-plan-request-error", {
            path: pathName,
            method,
            attempt: attempt + 1,
            retrying: canRetry,
            message: String(error?.message || error || "")
          });
          if (!canRetry) throw error;
          attempt += 1;
          await waitForRetry(config.retryBaseDelayMs * attempt);
        }
      }
    }

    async function loadCloudResourceStatuses(userId) {
      if (!userId || !isCloudReady()) return [];
      const data = await restRequest(config.resourceStatusTable, {
        method: "GET",
        query: `select=resource_url,status,skill_id,resource_type,updated_at&user_id=eq.${encodeURIComponent(userId)}`,
        prefer: "",
        retryCount: 2
      });
      return Array.isArray(data) ? data : [];
    }

    async function upsertCloudResourceStatuses(rows) {
      if (!Array.isArray(rows) || !rows.length) return;
      await restRequest(config.resourceStatusTable, {
        method: "POST",
        query: "on_conflict=user_id,resource_url",
        body: rows,
        prefer: "resolution=merge-duplicates,return=representation"
      });
    }

    async function syncNow(runOptions = {}) {
      const force = !!runOptions.force;
      if (!isCloudReady()) return { ok: false, skipped: "cloud-unavailable" };
      const authUser = await ensureAuthUser();
      if (!authUser?.id) return { ok: false, skipped: "guest" };
      if (!force && syncPromise) return syncPromise;
      if (!force && (Date.now() - getResourceSyncLastTs()) < config.resourceSyncTtlMs) {
        debugLog?.debug("sync", "study-plan-skip", { reason: "ttl" });
        return { ok: true, skipped: "ttl" };
      }

      syncPromise = (async () => {
        try {
          debugLog?.info("sync", "study-plan-start", { force });
          const localMap = loadLocalMap();
          const cloudRows = await loadCloudResourceStatuses(authUser.id);
          const merged = mergeLocalWithCloud(localMap, cloudRows, authUser.id);

          saveLocalMap(merged.mergedMap);

          if (merged.rowsToUpload.length) {
            await upsertCloudResourceStatuses(merged.rowsToUpload);
          }

          if (merged.rowsToUpload.length) {
            const finalCloudRows = await loadCloudResourceStatuses(authUser.id);
            const finalMap = {};
            finalCloudRows.forEach((row) => {
              const entry = cloudRowToLocalEntry(row);
              if (entry && row.resource_url) {
                finalMap[row.resource_url] = entry;
              }
            });
            saveLocalMap(finalMap);
          }

          markResourceSyncTs();
          await onSyncSuccess({
            force,
            authUser,
            localMap,
            cloudRows,
            rowsToUpload: merged.rowsToUpload,
            mergedMap: merged.mergedMap
          });
          debugLog?.info("sync", "study-plan-success", {
            force,
            localResources: Object.keys(localMap || {}).length,
            cloudRows: cloudRows.length,
            rowsToUpload: merged.rowsToUpload.length
          });
          return { ok: true };
        } catch (error) {
          if (isTransientError(error)) {
            logSoftIssue("Study plan cloud sync is temporarily unavailable, using local data.", error);
            debugLog?.info("sync", "study-plan-local-fallback", {
              force,
              message: String(error?.message || error || "")
            });
            return { ok: false, transient: true, skipped: "local-fallback", error };
          }
          console.warn("Study plan status sync failed", error);
          debugLog?.warn("sync", "study-plan-failed", {
            force,
            message: String(error?.message || error || "")
          });
          return { ok: false, error };
        } finally {
          syncPromise = null;
        }
      })();

      return syncPromise;
    }

    function queue(runOptions = {}) {
      if (queuedSyncTimer) {
        clearTimeout(queuedSyncTimer);
        queuedSyncTimer = null;
      }
      queuedSyncTimer = setTimeout(() => {
        queuedSyncTimer = null;
        syncNow(runOptions).catch((error) => {
          if (isTransientError(error)) {
            logSoftIssue("Queued study plan sync skipped due to transient network issue.", error);
            return;
          }
          console.warn("Queued study plan status sync failed", error);
        });
      }, 80);
    }

    function bind() {
      if (authSubscriptionBound) return;

      const bindSubscription = () => {
        const client = getSupabaseStore()?.client;
        if (!client?.auth?.onAuthStateChange || authSubscriptionBound) return;
        authSubscriptionBound = true;
        client.auth.onAuthStateChange((event, session) => {
          if (session?.user?.id && shouldRunAuthSync(session.user.id)) {
            markAuthSync(session.user.id);
            queue({ force: false });
          }
        });
      };

      bindSubscription();
      [600, 1800, 4000].forEach((delay) => {
        setTimeout(() => {
          bindSubscription();
        }, delay);
      });

      documentRef?.addEventListener("visibilitychange", () => {
        if (documentRef.visibilityState === "visible" && shouldAutoSync()) {
          queue({ force: false });
        }
      });

      setInterval(() => {
        if (documentRef?.visibilityState !== "visible") return;
        if (!shouldAutoSync()) return;
        queue({ force: false });
      }, 3 * 60 * 1000);
    }

    return {
      syncNow,
      queue,
      bind,
      isTransientError
    };
  }

  return { create };
});
