(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuestionsCloudSyncShared = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function create(options = {}) {
    const debugLog = options.debugLog || null;
    const localStorageRef = options.localStorage || globalThis.localStorage;
    const progressMap = new Map();
    const answersMap = new Map();
    let syncPromise = null;

    const config = {
      cloudSyncTsKey: options.cloudSyncTsKey || "cloud_sync_ts_v1",
      pendingMutationsKey: options.pendingMutationsKey || "cloud_pending_mutations_v1",
      cloudSyncTtlMs: Number(options.cloudSyncTtlMs || 60 * 1000),
      cloudOpTimeoutMs: Number(options.cloudOpTimeoutMs || 10000),
      restTimeoutMs: Number(options.restTimeoutMs || 7000),
      aiResponsesLocalPrefix: options.aiResponsesLocalPrefix || "ai_responses_",
      progressTable: options.progressTable || "question_progress",
      answersTable: options.answersTable || "ai_answers",
      logEvents: Object.assign({
        start: "cloud-sync-start",
        success: "cloud-sync-success",
        failed: "cloud-sync-failed",
        skipped: "cloud-sync-skip",
        restOk: "cloud-rest-ok",
        restFail: "cloud-rest-fail"
      }, options.logEvents || {})
    };

    const getSupabaseStore = typeof options.getSupabaseStore === "function"
      ? options.getSupabaseStore
      : () => globalThis.AppSupabase || null;
    const getAuthUser = typeof options.getAuthUser === "function"
      ? options.getAuthUser
      : () => null;
    const getActiveSession = typeof options.getActiveSession === "function"
      ? options.getActiveSession
      : async () => null;
    const ensureAuthContext = typeof options.ensureAuthContext === "function"
      ? options.ensureAuthContext
      : async () => !!getAuthUser()?.id;
    const readPendingMutations = typeof options.readPendingMutations === "function"
      ? options.readPendingMutations
      : () => {
        try {
          const raw = localStorageRef?.getItem(config.pendingMutationsKey);
          const parsed = JSON.parse(raw || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
    const writePendingMutations = typeof options.writePendingMutations === "function"
      ? options.writePendingMutations
      : (mutations) => {
        try {
          localStorageRef?.setItem(config.pendingMutationsKey, JSON.stringify((mutations || []).slice(-200)));
        } catch {}
      };
    const enqueueMutation = typeof options.enqueueMutation === "function"
      ? options.enqueueMutation
      : (type, payload) => {
        const mutations = readPendingMutations();
        mutations.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          payload,
          ts: Date.now(),
          attempts: 0,
          nextTs: Date.now()
        });
        writePendingMutations(mutations);
      };
    const getLocalProgressRows = typeof options.getLocalProgressRows === "function"
      ? options.getLocalProgressRows
      : () => [];
    const prepareProgressRowsForUpload = typeof options.prepareProgressRowsForUpload === "function"
      ? options.prepareProgressRowsForUpload
      : (rows) => rows;
    const getLocalAiRows = typeof options.getLocalAiRows === "function"
      ? options.getLocalAiRows
      : () => [];
    const getReloadPlan = typeof options.getReloadPlan === "function"
      ? options.getReloadPlan
      : ({ force, progressRowsToUpload, localAiRows, pendingMutationsAtStart }) => ({
        progress: !!(force || progressRowsToUpload.length || pendingMutationsAtStart.length),
        answers: !!(force || localAiRows.length || pendingMutationsAtStart.length)
      });
    const onSyncBusyChange = typeof options.onSyncBusyChange === "function"
      ? options.onSyncBusyChange
      : () => {};
    const onSyncSuccessFlash = typeof options.onSyncSuccessFlash === "function"
      ? options.onSyncSuccessFlash
      : () => {};
    const onSyncStatusMessage = typeof options.onSyncStatusMessage === "function"
      ? options.onSyncStatusMessage
      : () => {};
    const onCloudStateApplied = typeof options.onCloudStateApplied === "function"
      ? options.onCloudStateApplied
      : () => {};
    const shouldEnqueueAiSaveOnMissingAuth = typeof options.shouldEnqueueAiSaveOnMissingAuth === "function"
      ? options.shouldEnqueueAiSaveOnMissingAuth
      : ({ enqueueOnFail, questionId, response }) => !!(enqueueOnFail && questionId && response?.answer);

    function withTimeout(promise, ms, label) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
      ]);
    }

    function aiSignature(questionId, answerType, model, content) {
      return `${questionId}::${answerType || "append"}::${model || ""}::${String(content || "").trim()}`;
    }

    function isCloudReady() {
      const store = getSupabaseStore();
      return !!(store?.url && store?.anonKey);
    }

    function getCloudSyncLastTs() {
      try {
        return Number(localStorageRef?.getItem(config.cloudSyncTsKey) || 0);
      } catch {
        return 0;
      }
    }

    function markCloudSyncTs() {
      try {
        localStorageRef?.setItem(config.cloudSyncTsKey, String(Date.now()));
      } catch {}
    }

    function buildRestUrl(pathName, query) {
      const store = getSupabaseStore();
      const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
      return `${store?.url || ""}/rest/v1/${pathName}${q}`;
    }

    async function restRequest(pathName, requestOptions = {}) {
      const store = getSupabaseStore();
      const method = requestOptions.method || "GET";
      const query = requestOptions.query || "";
      const body = Object.prototype.hasOwnProperty.call(requestOptions, "body")
        ? requestOptions.body
        : null;
      const prefer = Object.prototype.hasOwnProperty.call(requestOptions, "prefer")
        ? requestOptions.prefer
        : "return=representation";

      const session = await getActiveSession();
      const accessToken = session?.access_token || null;
      if (!accessToken) {
        throw new Error(`AUTH_SESSION_MISSING for ${method} ${pathName}`);
      }

      const headers = {
        apikey: store.anonKey,
        Authorization: `Bearer ${accessToken}`
      };
      if (prefer) headers.Prefer = prefer;
      if (body !== null) headers["Content-Type"] = "application/json";

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.restTimeoutMs);
      const startedAt = Date.now();
      let response;
      try {
        response = await fetch(buildRestUrl(pathName, query), {
          method,
          headers,
          body: body !== null ? JSON.stringify(body) : undefined,
          cache: "no-store",
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error(`${method} ${pathName} timeout`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      if (!response.ok) {
        debugLog?.warn("network", config.logEvents.restFail, {
          path: pathName,
          method,
          status: response.status,
          durationMs: Date.now() - startedAt
        });
        throw new Error(`${method} ${pathName} failed: ${response.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
      }

      debugLog?.debug("network", config.logEvents.restOk, {
        path: pathName,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      return data;
    }

    async function loadCloudProgress() {
      progressMap.clear();
      const authUser = getAuthUser();
      if (!isCloudReady() || !authUser?.id) return [];
      const data = await restRequest(config.progressTable, {
        method: "GET",
        query: `select=user_id,question_id,status,updated_at&user_id=eq.${encodeURIComponent(authUser.id)}`,
        prefer: ""
      });
      (data || []).forEach((row) => {
        if (row?.question_id && row?.status) {
          progressMap.set(row.question_id, row.status);
        }
      });
      return Array.isArray(data) ? data : [];
    }

    async function loadCloudAnswers() {
      answersMap.clear();
      const authUser = getAuthUser();
      if (!isCloudReady() || !authUser?.id) return [];
      const data = await restRequest(config.answersTable, {
        method: "GET",
        query: `select=id,question_id,answer_type,model,seconds,content,created_at&user_id=eq.${encodeURIComponent(authUser.id)}&order=created_at.asc`,
        prefer: ""
      });
      (data || []).forEach((row) => {
        if (!row?.question_id || !row?.content) return;
        const list = answersMap.get(row.question_id) || [];
        list.push({
          cloudId: row.id || null,
          answer: row.content,
          model: row.model || "",
          seconds: row.seconds || 0,
          arrivedAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
          answerType: row.answer_type || "append"
        });
        answersMap.set(row.question_id, list);
      });
      return Array.isArray(data) ? data : [];
    }

    function hasPendingCloudWork() {
      if (readPendingMutations().length > 0) return true;
      const authUser = getAuthUser();
      if (!authUser?.id) return false;
      if (options.includeLocalProgressInPendingCheck && getLocalProgressRows().length > 0) return true;
      if (options.includeLocalAiInPendingCheck && getLocalAiRows(new Set()).length > 0) return true;
      return false;
    }

    async function saveProgress(questionId, status, saveOptions = {}) {
      const enqueueOnFail = saveOptions.enqueueOnFail !== false;
      const hasAuth = await ensureAuthContext();
      if (!isCloudReady() || !hasAuth || !questionId) {
        if (enqueueOnFail) enqueueMutation("saveProgress", { questionId, status });
        return false;
      }

      const authUser = getAuthUser();
      const payload = {
        user_id: authUser.id,
        question_id: questionId,
        status,
        updated_at: new Date().toISOString()
      };

      await withTimeout(restRequest(config.progressTable, {
        method: "POST",
        query: "on_conflict=user_id,question_id",
        body: payload,
        prefer: "resolution=merge-duplicates,return=representation"
      }), config.cloudOpTimeoutMs, "save progress");
      return true;
    }

    async function saveAiAnswer(questionId, answerType, response, saveOptions = {}) {
      const enqueueOnFail = saveOptions.enqueueOnFail !== false;
      const hasAuth = await ensureAuthContext();
      if (!isCloudReady() || !hasAuth || !questionId || !response?.answer) {
        const shouldQueue = shouldEnqueueAiSaveOnMissingAuth({
          hasAuth,
          enqueueOnFail,
          questionId,
          response
        });
        if (shouldQueue) {
          enqueueMutation("saveAiAnswer", { questionId, answerType, response });
        }
        return null;
      }

      const authUser = getAuthUser();
      const payload = {
        user_id: authUser.id,
        question_id: questionId,
        answer_type: answerType || response.answerType || "append",
        model: response.model || null,
        seconds: response.seconds || null,
        content: response.answer
      };

      const data = await withTimeout(restRequest(config.answersTable, {
        method: "POST",
        body: payload,
        prefer: "return=representation"
      }), config.cloudOpTimeoutMs, "save ai answer");

      const row = Array.isArray(data) ? data[0] : data;
      return row?.id || null;
    }

    async function deleteAiAnswer(answerId, deleteOptions = {}) {
      const enqueueOnFail = deleteOptions.enqueueOnFail !== false;
      const hasAuth = await ensureAuthContext();
      const authUser = getAuthUser();
      if (!isCloudReady() || !hasAuth || !answerId || !authUser?.id) {
        if (enqueueOnFail && answerId) enqueueMutation("deleteAiById", { answerId });
        return false;
      }

      const data = await withTimeout(restRequest(config.answersTable, {
        method: "DELETE",
        query: `id=eq.${encodeURIComponent(answerId)}&user_id=eq.${encodeURIComponent(authUser.id)}`,
        prefer: "return=representation"
      }), config.cloudOpTimeoutMs, "delete ai by id");

      return Array.isArray(data) ? data.length > 0 : true;
    }

    async function deleteAiAnswerByPayload(questionId, response, deleteOptions = {}) {
      const enqueueOnFail = deleteOptions.enqueueOnFail !== false;
      const hasAuth = await ensureAuthContext();
      const authUser = getAuthUser();
      if (!isCloudReady() || !hasAuth || !questionId || !response?.answer || !authUser?.id) {
        if (enqueueOnFail && questionId && response?.answer) {
          enqueueMutation("deleteAiByPayload", { questionId, response });
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

      const rows = await withTimeout(restRequest(config.answersTable, {
        method: "GET",
        query: lookupQuery,
        prefer: ""
      }), config.cloudOpTimeoutMs, "find ai by payload");

      const target = (Array.isArray(rows) ? rows : []).find((row) => (
        row &&
        String(row.content || "") === String(response.answer || "") &&
        String(row.answer_type || "append") === String(response.answerType || "append") &&
        String(row.model || "") === String(response.model || "")
      ));
      if (!target?.id) return true;

      return deleteAiAnswer(target.id, { enqueueOnFail });
    }

    async function flushPendingMutations() {
      if (!isCloudReady() || !getAuthUser()?.id) return;
      const queue = readPendingMutations();
      if (!queue.length) return;
      const now = Date.now();
      const failed = [];

      for (const mutation of queue) {
        if ((mutation?.nextTs || 0) > now) {
          failed.push(mutation);
          continue;
        }
        try {
          if (mutation.type === "saveProgress") {
            await saveProgress(mutation.payload.questionId, mutation.payload.status, { enqueueOnFail: false });
          } else if (mutation.type === "saveAiAnswer") {
            const id = await saveAiAnswer(mutation.payload.questionId, mutation.payload.answerType, mutation.payload.response, { enqueueOnFail: false });
            if (!id) throw new Error("saveAiAnswer retry failed");
          } else if (mutation.type === "deleteAiById") {
            const ok = await deleteAiAnswer(mutation.payload.answerId, { enqueueOnFail: false });
            if (!ok) throw new Error("deleteAiById retry failed");
          } else if (mutation.type === "deleteAiByPayload") {
            const ok = await deleteAiAnswerByPayload(mutation.payload.questionId, mutation.payload.response, { enqueueOnFail: false });
            if (!ok) throw new Error("deleteAiByPayload retry failed");
          }
        } catch {
          const attempts = Number(mutation?.attempts || 0) + 1;
          const backoffMs = Math.min(120000, 5000 * attempts);
          failed.push({
            ...mutation,
            attempts,
            nextTs: Date.now() + backoffMs
          });
        }
      }

      writePendingMutations(failed);
    }

    async function syncNow(runOptions = {}) {
      const force = !!runOptions.force;
      const source = runOptions.source || "auto";
      const authUser = getAuthUser();
      if (!isCloudReady() || !authUser?.id) return { ok: false };
      if (!force && syncPromise) return syncPromise;
      if (!force && (Date.now() - getCloudSyncLastTs()) < config.cloudSyncTtlMs) {
        debugLog?.debug("sync", config.logEvents.skipped, { reason: "ttl", source });
        return { ok: true, skipped: true };
      }

      syncPromise = (async () => {
        try {
          debugLog?.info("sync", config.logEvents.start, { source, force });
          if (source === "manual") onSyncBusyChange(true);

          const pendingMutationsAtStart = readPendingMutations();
          await withTimeout(Promise.all([loadCloudProgress(), loadCloudAnswers()]), config.cloudOpTimeoutMs, "initial cloud load");

          const baseLocalProgressRows = getLocalProgressRows();
          const progressRowsToUpload = prepareProgressRowsForUpload(baseLocalProgressRows, progressMap);
          if (progressRowsToUpload.length) {
            const store = getSupabaseStore();
            if (typeof store?.upsertQuestionProgressBulk === "function") {
              const result = await withTimeout(
                store.upsertQuestionProgressBulk(progressRowsToUpload),
                config.cloudOpTimeoutMs,
                "progress bulk upsert"
              );
              if (result?.error) {
                await Promise.all(progressRowsToUpload.map((row) => saveProgress(row.question_id, row.status)));
              }
            } else {
              await Promise.all(progressRowsToUpload.map((row) => saveProgress(row.question_id, row.status)));
            }
          }

          const cloudSignatures = new Set();
          answersMap.forEach((list, questionId) => {
            (list || []).forEach((response) => {
              cloudSignatures.add(aiSignature(questionId, response.answerType, response.model, response.answer));
            });
          });
          pendingMutationsAtStart.forEach((mutation) => {
            if (!mutation || mutation.type !== "saveAiAnswer") return;
            const payload = mutation.payload || {};
            const response = payload.response || {};
            const questionId = payload.questionId;
            const content = String(response.answer || "").trim();
            if (!questionId || !content) return;
            cloudSignatures.add(aiSignature(
              questionId,
              payload.answerType || response.answerType || "append",
              response.model || null,
              content
            ));
          });

          const localAiRows = getLocalAiRows(cloudSignatures);
          if (localAiRows.length) {
            const store = getSupabaseStore();
            if (typeof store?.saveAiAnswersBulk === "function") {
              const result = await withTimeout(
                store.saveAiAnswersBulk(localAiRows),
                config.cloudOpTimeoutMs,
                "ai answers bulk insert"
              );
              if (result?.error) {
                await Promise.all(localAiRows.map((row) => saveAiAnswer(row.question_id, row.answer_type, {
                  answer: row.content,
                  model: row.model,
                  seconds: row.seconds
                })));
              }
            } else {
              await Promise.all(localAiRows.map((row) => saveAiAnswer(row.question_id, row.answer_type, {
                answer: row.content,
                model: row.model,
                seconds: row.seconds
              })));
            }
          }

          await flushPendingMutations();

          const reloadPlan = getReloadPlan({
            force,
            source,
            progressRowsToUpload,
            localAiRows,
            pendingMutationsAtStart
          }) || {};
          const reloadTasks = [];
          if (reloadPlan.progress) reloadTasks.push(loadCloudProgress());
          if (reloadPlan.answers) reloadTasks.push(loadCloudAnswers());
          if (reloadTasks.length) {
            await withTimeout(Promise.all(reloadTasks), config.cloudOpTimeoutMs, "final cloud reload");
          }

          onCloudStateApplied({
            progressMap,
            answersMap,
            reloadPlan,
            source,
            force
          });
          markCloudSyncTs();
          debugLog?.info("sync", config.logEvents.success, {
            source,
            force,
            progressRowsToUpload: progressRowsToUpload.length,
            localAiRows: localAiRows.length,
            shouldReloadProgress: !!reloadPlan.progress,
            shouldReloadAiAnswers: !!reloadPlan.answers,
            hadPendingMutationsAtStart: pendingMutationsAtStart.length > 0
          });
          if (source === "manual") onSyncSuccessFlash();
          return { ok: true };
        } catch (error) {
          debugLog?.warn("sync", config.logEvents.failed, {
            source,
            force,
            message: String(error?.message || error || "")
          });
          onSyncStatusMessage("Не удалось завершить синхронизацию. Попробуйте еще раз.");
          return { ok: false, error };
        } finally {
          if (source === "manual") onSyncBusyChange(false);
          syncPromise = null;
        }
      })();

      return syncPromise;
    }

    return {
      getProgressMap() {
        return progressMap;
      },
      getAnswersMap() {
        return answersMap;
      },
      getCloudSyncLastTs,
      readPendingMutations,
      writePendingMutations,
      loadCloudProgress,
      loadCloudAnswers,
      saveProgress,
      saveAiAnswer,
      deleteAiAnswer,
      deleteAiAnswerByPayload,
      flushPendingMutations,
      hasPendingCloudWork,
      syncNow
    };
  }

  return { create };
});
