(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SyncShared = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function create(options = {}) {
    const debugLog = options.debugLog || null;
    const localStorageRef = options.localStorage || globalThis.localStorage;
    const authSyncTsKey = options.authSyncTsKey || "";
    const authSyncUserKey = options.authSyncUserKey || "";
    const authSyncCooldownMs = Number(options.authSyncCooldownMs || 0);
    const onBusyChange = typeof options.onBusyChange === "function" ? options.onBusyChange : () => {};
    const onSuccessFlash = typeof options.onSuccessFlash === "function" ? options.onSuccessFlash : () => {};
    const onStatusMessage = typeof options.onStatusMessage === "function" ? options.onStatusMessage : () => {};
    const resolveManualTasks = typeof options.resolveManualTasks === "function" ? options.resolveManualTasks : () => [];
    const authResolvedTask = options.authResolvedTask || null;

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

    function defaultShouldRunAuthSync(context = {}) {
      const userId = String(context.userId || "");
      const force = !!context.force;
      if (force) return true;
      if (!userId || !authSyncTsKey || !authSyncUserKey || !authSyncCooldownMs) return !!userId;
      const lastUserId = readString(authSyncUserKey);
      const lastTs = readNumber(authSyncTsKey);
      if (lastUserId !== userId) return true;
      return (Date.now() - lastTs) >= authSyncCooldownMs;
    }

    function defaultMarkAuthSync(userId) {
      if (!authSyncTsKey || !authSyncUserKey) return;
      writeString(authSyncTsKey, Date.now());
      writeString(authSyncUserKey, userId || "");
    }

    const shouldRunAuthSync = typeof options.shouldRunAuthSync === "function"
      ? options.shouldRunAuthSync
      : defaultShouldRunAuthSync;
    const markAuthSync = typeof options.markAuthSync === "function"
      ? options.markAuthSync
      : defaultMarkAuthSync;

    async function runManualSync(runOptions = {}) {
      const source = runOptions.source || "manual";
      const tasks = (resolveManualTasks({
        source,
        force: true
      }) || []).filter((task) => task && typeof task.run === "function" && (task.shouldRun ? task.shouldRun() : true));

      onBusyChange(true);
      try {
        if (!tasks.length) {
          onSuccessFlash();
          return { ok: true, skipped: true };
        }

        debugLog?.info("sync", "coordinator-manual-start", {
          source,
          taskCount: tasks.length
        });

        const results = await Promise.allSettled(tasks.map((task) => task.run()));
        const hasFailure = results.some((result) => (
          result.status === "rejected" ||
          (result.status === "fulfilled" && result.value?.ok === false && !result.value?.skipped)
        ));

        if (hasFailure) {
          onStatusMessage("Не удалось завершить синхронизацию. Попробуйте еще раз.");
          debugLog?.warn("sync", "coordinator-manual-failed", {
            source,
            taskCount: tasks.length
          });
          return { ok: false };
        }

        onSuccessFlash();
        debugLog?.info("sync", "coordinator-manual-success", {
          source,
          taskCount: tasks.length
        });
        return { ok: true };
      } finally {
        onBusyChange(false);
      }
    }

    async function runAuthResolvedSync(runOptions = {}) {
      const userId = String(runOptions.userId || "");
      const force = !!runOptions.force;
      const source = runOptions.source || "auth";
      if (!authResolvedTask || typeof authResolvedTask.run !== "function" || !userId) {
        return { ok: false, skipped: "no-auth-task" };
      }

      const taskShouldRun = typeof authResolvedTask.shouldRun === "function"
        ? authResolvedTask.shouldRun({ userId, force, source })
        : true;
      if (!taskShouldRun) {
        return { ok: true, skipped: "task-filtered" };
      }

      if (!shouldRunAuthSync({ userId, force, source })) {
        debugLog?.debug("sync", "coordinator-auth-skip", {
          source,
          userId,
          reason: "cooldown"
        });
        return { ok: true, skipped: "cooldown" };
      }

      markAuthSync(userId);
      debugLog?.info("sync", "coordinator-auth-start", {
        source,
        userId
      });
      const result = await authResolvedTask.run({ userId, force, source });
      debugLog?.info("sync", "coordinator-auth-finish", {
        source,
        userId,
        ok: result?.ok !== false
      });
      return result || { ok: true };
    }

    return {
      runManualSync,
      runAuthResolvedSync,
      shouldRunAuthSync,
      markAuthSync
    };
  }

  return { create };
});
