/* Shared AI request engine. Page UI and auth remain page-owned. */
(function () {
  "use strict";
  // Used only when model discovery is unavailable; live /models data takes priority.
  const FAST_MODEL_HINTS = [
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b"
  ];
  const FREE_CHAT_MODELS = new Set(FAST_MODEL_HINTS);
  const TOKEN_USAGE_KEY = "groq_token_usage_local_v1";
  const DAILY_LIMIT_KEY = "groq_daily_limit_seen_v1";
  const TOKEN_USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;
  function hasRecentDailyLimit() {
    try {
      const event = JSON.parse(localStorage.getItem(DAILY_LIMIT_KEY) || "null");
      return Number.isFinite(event?.at) && event.at > Date.now() - TOKEN_USAGE_WINDOW_MS;
    } catch { return false; }
  }
  function recordDailyLimit(model) {
    try { localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ at: Date.now(), model })); } catch {}
  }
  function readTokenUsage() {
    try {
      const records = JSON.parse(localStorage.getItem(TOKEN_USAGE_KEY) || "[]");
      return Array.isArray(records) ? records.filter(item =>
        item && typeof item.model === "string" && Number.isFinite(item.at) &&
        item.at > Date.now() - TOKEN_USAGE_WINDOW_MS && Number.isFinite(item.tokens) && item.tokens >= 0
      ) : [];
    } catch { return []; }
  }
  function recordTokenUsage(model, usage) {
    const input = Number(usage?.prompt_tokens);
    const output = Number(usage?.completion_tokens);
    if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return;
    const cached = Number(usage?.prompt_tokens_details?.cached_tokens) || 0;
    const records = readTokenUsage();
    records.push({ model, at: Date.now(), tokens: Math.max(0, input - Math.min(input, cached)) + output });
    try { localStorage.setItem(TOKEN_USAGE_KEY, JSON.stringify(records.slice(-2500))); } catch {}
  }
  function modelCacheScope(key) {
    if (!key) return "primary";
    let hash = 2166136261;
    for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return `user-${(hash >>> 0).toString(16)}`;
  }
  function nextComparisonOrder(modelOrder, currentModel, usedModels, availableOrder) {
    const available = new Set(availableOrder);
    const ordered = [...new Set([...modelOrder, ...availableOrder])].filter(model => available.has(model));
    const index = ordered.indexOf(currentModel);
    const used = new Set(usedModels);
    const others = index < 0 ? ordered : [...ordered.slice(index + 1), ...ordered.slice(0, index)];
    const untried = others.filter(model => !used.has(model));
    return index < 0 ? untried : [...untried, currentModel];
  }
  function create(context) {
    const SUPABASE_URL_DIRECT = "https://mbebpfbmnojlaggdroum.supabase.co";
    const SUPABASE_FUNCTIONS_BASE_DIRECT = "https://mbebpfbmnojlaggdroum.functions.supabase.co";
    const SUPABASE_ANON_KEY_DIRECT = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
    const MODEL_TIMINGS_KEY = "model_timings_groq_v1";
    const MODEL_FAILURES_KEY = "model_failures_groq_v1";
    const MODEL_SLOW_RESPONSE_MS = 30000;
    const REST_TIMEOUT_MS = 7000;
    const debugLog = window.DebugLog || null;
    const safeSetItemWithAiEviction = context.saveStorage || ((key, value) => { try { localStorage.setItem(key, value); } catch {} });
    const refreshAuthUserInBackground = context.refreshAuth || (() => Promise.resolve());
    const refreshRuntimeModelRanking = context.refreshRanking || (() => {});
    const markModelAsSlowAndReplace = context.replaceSlow || (() => {});
    const applyAvailableModelsHint = context.applyModelHint || (() => {});
    const getAuthKey = context.getAuthKey || (() => { try { return localStorage.getItem("groq_api_key_override") || ""; } catch { return ""; } });
    const getCurrentApiKeyMode = () => getAuthKey() ? "user" : "primary";
    function buildFunctionUrlCandidates(functionName, query = "") {
      const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
      const candidates = [];
      const directFunctionsBase = SUPABASE_FUNCTIONS_BASE_DIRECT;
      const restBase = context.supabaseStore?.url || SUPABASE_URL_DIRECT;
      if (directFunctionsBase) {
        candidates.push(`${directFunctionsBase}/${functionName}${q}`);
      }
      if (restBase) {
        candidates.push(`${restBase}/functions/v1/${functionName}${q}`);
      }
      return Array.from(new Set(candidates.filter(Boolean)));
    }

    async function callAiProxy({ method = "POST", query = "", body = null } = {}) {
      const key = context.supabaseStore?.anonKey || SUPABASE_ANON_KEY_DIRECT;
      const accessToken = context.lastKnownAccessToken || null;
      if (!accessToken && context.authUser?.id) {
        refreshAuthUserInBackground().catch((e) => console.warn("Background auth refresh failed for AI proxy", e));
      }
      const headers = {
        apikey: key
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      if (body !== null) {
        headers["Content-Type"] = "application/json";
      }
      const urls = buildFunctionUrlCandidates("ai-chat", query);
      debugLog?.info("ai", "proxy-start", {
        method,
        urlCount: urls.length,
        hasAccessToken: !!accessToken,
        authUserId: context.authUser?.id || "",
        model: body?.model || "",
        hasUserApiKey: !!body?.userApiKey
      });
      let lastError = null;
      for (let i = 0; i < urls.length; i += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS + 23000);
        const startedAt = Date.now();
        try {
          debugLog?.debug("ai", "proxy-attempt", {
            attempt: i + 1,
            url: urls[i],
            method,
            model: body?.model || ""
          });
          const response = await fetch(urls[i], {
            method,
            headers,
            body: body !== null ? JSON.stringify({ ...body, provider: "groq" }) : undefined,
            cache: "no-store",
            signal: controller.signal
          });
          debugLog?.info("ai", "proxy-response", {
            attempt: i + 1,
            url: urls[i],
            method,
            model: body?.model || "",
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startedAt
          });
          return response;
        } catch (e) {
          lastError = e;
          if (e?.name === "AbortError") {
            const err = new Error("AI_PROXY_TIMEOUT");
            err.code = "AI_PROXY_TIMEOUT";
            lastError = err;
          }
          debugLog?.warn("ai", "proxy-error", {
            attempt: i + 1,
            url: urls[i],
            method,
            model: body?.model || "",
            durationMs: Date.now() - startedAt,
            message: String(lastError?.message || lastError || ""),
            code: String(lastError?.code || "")
          });
          if (i === urls.length - 1) {
            throw lastError;
          }
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastError || new Error("AI proxy request failed");
    }

    function isApiKeyQuotaDetail(detail) {
      return /quota exceeded|insufficient credits|insufficient_quota/i.test(String(detail || ""));
    }

    function isApiKeyCredentialDetail(detail) {
      return /invalid api key|api key.*invalid|api key.*expired|unauthorized/i.test(String(detail || ""));
    }

    function isRecoverableApiKeyError(err) {
      return !!err && (
        err.code === "INVALID_API_KEY" ||
        err.code === "API_KEY_QUOTA_EXCEEDED"
      );
    }

    function isAllModelsCreditsExhaustedError(err) {
      return err?.code === "ALL_MODELS_CREDITS_EXHAUSTED";
    }

    function isAiRegionAvailabilityError(err) {
      const message = String(err?.message || "");
      const detail = String(err?.detail || "");
      return !!err && (
        err.code === "AI_REGION_UNAVAILABLE" ||
        /ERR_TIMED_OUT|Failed to fetch|Load failed|NetworkError/i.test(message) ||
        /ERR_TIMED_OUT|Failed to fetch|Load failed|NetworkError/i.test(detail)
      );
    }

    function getAiRegionUnavailableMessage() {
      return "Модель не смогла ответить в вашем регионе. Попробуйте другой регион сети.";
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
      const excluded = new Set(Array.isArray(exclude) ? exclude : []);
      const seen = new Set();
      const models = (Array.isArray(apiModels) ? apiModels : []).filter(model => {
        const id = typeof model === "string" ? model : model?.id;
        if (typeof id !== "string" || !FREE_CHAT_MODELS.has(id) || seen.has(id) || excluded.has(id)) return false;
        if (typeof model === "object") {
          if (model.active === false) return false;
          if (model.higher_tier_required === true) return false;
          if (model.status && model.status.toLowerCase() !== "active") return false;
          if (model.metadata?.enable_api_chat_completions === false) return false;
          if (Array.isArray(model.input_modalities) && !model.input_modalities.includes("text")) return false;
          if (Array.isArray(model.output_modalities) && !model.output_modalities.includes("text")) return false;
        }
        seen.add(id);
        return true;
      });
      models.sort((a, b) => {
        const id = model => typeof model === "string" ? model : model.id;
        return FAST_MODEL_HINTS.indexOf(id(a)) - FAST_MODEL_HINTS.indexOf(id(b));
      });
      return models.map(model => typeof model === "string" ? model : model.id);
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

    function isModelBlocked(model) {
      const map = readModelFailures();
      const info = map[model];
      if (!info) return false;
      const hours6 = 6 * 60 * 60 * 1000;
      const isRecent = (Date.now() - info.last) < hours6;
      return isRecent && info.count >= 2;
    }

    function getModelOrder(preferred) {
      const base = context.currentModels;
      const timings = readModelTimings();
      const failures = readModelFailures();
      const filtered = base.filter(m => !isModelBlocked(m));
      const pool = filtered.length ? filtered : base;
      const sorted = pool.slice().sort((a, b) => {
        const recentFailures = model => Date.now() - (failures[model]?.last || 0) < 6 * 60 * 60 * 1000 ? failures[model].count : 0;
        if (recentFailures(a) !== recentFailures(b)) return recentFailures(a) - recentFailures(b);
        const ta = timings[a]?.avg ?? Number.POSITIVE_INFINITY;
        const tb = timings[b]?.avg ?? Number.POSITIVE_INFINITY;
        if (ta === tb) return 0;
        return ta - tb;
      });
      const ordered = [];
      if (preferred && pool.includes(preferred)) ordered.push(preferred);
      sorted.forEach(m => {
        if (!ordered.includes(m)) ordered.push(m);
      });
      return ordered;
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

    function answerQualityIssue(answer) {
      if (/(?:^|\n)\s*(?:user|response)\s+safety\s*:\s*(?:safe|unsafe)\b/i.test(answer)) return "safety_label";
      const prose = answer.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/https?:\/\/[^\s)]+/g, " ");
      const sentences = prose.split(/\n+/).reduce((count, line) => {
        const text = line.trim().replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "");
        if (!text || /^#{1,6}\s+/.test(text)) return count;
        return count + text.split(/(?<=[.!?。！？])\s+/u).filter(part => /[\p{L}\p{N}]/u.test(part)).length;
      }, 0);
      return sentences < 2 ? "too_short" : "";
    }

    async function fetchAnswerOnce(userQ, model, options = {}) {
      const { system = context.systemPrompt } = options;
      const startedAt = Date.now();
      const authMode = getCurrentApiKeyMode();
      let res;
      debugLog?.info("ai", "answer-start", {
        model,
        authMode,
        questionLength: String(userQ || "").length,
        hasAuthUser: !!context.authUser?.id
      });
      try {
        res = await callAiProxy({
          method: "POST",
          body: {
            model,
            messages: options.messages || [
              { role: "system", content: system },
              { role: "user",   content: userQ }
            ],
            temperature: 0.7,
            reasoning_content: false,
            max_completion_tokens: Math.min(1500, Math.max(1, Math.floor(Number(options.maxCompletionTokens) || 1000))),
            stream: false,
            userApiKey: getAuthKey() || null
          }
        });
      } catch (e) {
        debugLog?.warn("ai", "answer-proxy-failed", {
          model,
          authMode,
          durationMs: Date.now() - startedAt,
          message: String(e?.message || e || ""),
          code: String(e?.code || "")
        });
        const err = new Error("AI_REGION_UNAVAILABLE");
        err.code = "AI_REGION_UNAVAILABLE";
        err.detail = String(e?.message || e || "");
        err.authMode = authMode;
        err.model = model;
        throw err;
      }
      if (res.headers.get("x-qatodev-daily-limit") === "1") recordDailyLimit(model);
      if (!res.ok) {
        let detail = "";
        try {
          const errJson = await res.json();
          detail = errJson?.detail || errJson?.error?.message || "";
        } catch {}
        if (/insufficient credits for model\b/i.test(detail)) {
          recordModelFailure(model, "model_credits_exhausted");
          debugLog?.warn("ai", "model-credits-exhausted", { model });
          const err = new Error("MODEL_CREDITS_EXHAUSTED");
          err.code = "MODEL_CREDITS_EXHAUSTED";
          err.status = res.status;
          err.detail = detail;
          throw err;
        }
        if (res.status === 429) {
          const daily = /\b(?:TPD|RPD)\b|tokens per day|requests per day/i.test(detail);
          if (daily) recordDailyLimit(model);
          const err = new Error(daily ? "AI_DAILY_LIMITED" : "AI_RATE_LIMITED");
          err.code = daily ? "AI_DAILY_LIMITED" : "AI_RATE_LIMITED";
          err.status = res.status;
          err.detail = detail;
          const retry = Number(detail.match(/try again in\s+([\d.]+)s/i)?.[1]);
          if (!daily && Number.isFinite(retry) && retry > 0) err.retryAfterSeconds = Math.ceil(retry);
          throw err;
        }
        if (res.status === 401 || (detail && isApiKeyCredentialDetail(detail))) {
          const err = new Error("INVALID_API_KEY");
          err.code = "INVALID_API_KEY";
          err.status = res.status;
          err.detail = detail;
          err.authMode = authMode;
          throw err;
        }
        if (detail && isApiKeyQuotaDetail(detail)) {
          const err = new Error("API_KEY_QUOTA_EXCEEDED");
          err.code = "API_KEY_QUOTA_EXCEEDED";
          err.status = res.status;
          err.detail = detail;
          err.authMode = authMode;
          throw err;
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
        debugLog?.warn("ai", "answer-http-failed", {
          model,
          authMode,
          status: res.status,
          durationMs: Date.now() - startedAt,
          detail: detail || ""
        });
        throw err;
      }
      const json = await res.json();
      // Count every successful completion, including answers later rejected by quality checks.
      recordTokenUsage(model, json.usage);
      const msg = json.choices?.[0]?.message;
      const answer = msg?.content?.trim();
      if (!answer) {
        const hasReasoning = Array.isArray(msg?.reasoning_details) && msg.reasoning_details.length > 0;
        recordModelFailure(model, hasReasoning ? "reasoning_only" : "empty_content");
        debugLog?.warn("ai", "answer-empty", {
          model,
          authMode,
          durationMs: Date.now() - startedAt,
          hasReasoning
        });
        throw new Error("Empty AI answer");
      }
      const visibleAnswer = answer.replace(/<(qa-memory|qa-title|qa-icon|qa-next)>[\s\S]*?<\/\1>/gi, '')
        .replace(/<(?:qa-memory|qa-title|qa-icon|qa-next)>[\s\S]*$/i, '').trim();
      const qualityIssue = visibleAnswer ? answerQualityIssue(visibleAnswer) : 'empty_content';
      if (qualityIssue) {
        recordModelFailure(model, qualityIssue);
        debugLog?.warn("ai", "answer-low-quality", { model, reason: qualityIssue, durationMs: Date.now() - startedAt });
        const error = new Error("LOW_QUALITY_ANSWER");
        error.code = "LOW_QUALITY_ANSWER";
        throw error;
      }
      const elapsedMs = Date.now() - startedAt;
      recordModelTiming(model, elapsedMs);
      debugLog?.info("ai", "answer-success", {
        model,
        authMode,
        durationMs: elapsedMs,
        answerLength: answer.length
      });
      return {
        answer,
        elapsedMs,
        arrivedAt: Date.now()
      };
    }

    function requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options = {}) {
      const ATTEMPT_DELAY_MS = 5000;
      if (!order.length) return Promise.reject({ error: new Error("No accessible AI models"), total: 0, tried: [] });
      return new Promise((resolve, reject) => {
        let completed = 0;
        let inFlight = 0;
        let apiKeyFailureCount = 0;
        let lastApiKeyError = null;
        let modelCreditFailureCount = 0;
        let regionFailureCount = 0;
        let lastRegionError = null;
        let lastErr = null;
        let firstResolved = false;
        let availableSet = null;
        const launched = new Set();
        const timers = [];

        function rejectIfExhausted() {
          if (completed !== order.length || firstResolved) return;
          const allModelsOutOfCredits = modelCreditFailureCount === order.length;
          const error = allModelsOutOfCredits
            ? Object.assign(new Error("ALL_MODELS_CREDITS_EXHAUSTED"), { code: "ALL_MODELS_CREDITS_EXHAUSTED" })
            : lastErr?.code === "MODEL_CREDITS_EXHAUSTED" ? new Error("No AI answer") : lastErr || new Error("No AI answer");
          reject({
            error,
            apiKeyFailureCount,
            apiKeyError: lastApiKeyError,
            modelCreditFailureCount,
            regionFailureCount,
            regionError: lastRegionError,
            total: order.length,
            tried: order.slice(),
            availableModelsHint: availableSet ? Array.from(availableSet) : null
          });
        }

        function startNextIfIdle() {
          if (firstResolved || inFlight) return;
          const next = order.findIndex((_, idx) => !launched.has(idx));
          if (next >= 0) void startAttempt(next);
          else rejectIfExhausted();
        }

        async function startAttempt(idx) {
          if (launched.has(idx)) return;
          launched.add(idx);
          clearTimeout(timers[idx]);
          const model = order[idx];
          // Once an answer wins, scheduled models do not consume tokens.
          if (firstResolved) { completed += 1; return; }
          if (availableSet && !availableSet.has(model)) {
            completed += 1;
            startNextIfIdle();
            return;
          }
          inFlight += 1;
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
            if (isRecoverableApiKeyError(e)) {
              apiKeyFailureCount += 1;
              lastApiKeyError = e;
            }
            if (e?.code === "MODEL_CREDITS_EXHAUSTED") modelCreditFailureCount += 1;
            if (isAiRegionAvailabilityError(e)) {
              regionFailureCount += 1;
              lastRegionError = e;
            }
            if (e?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(e.availableModels) && e.availableModels.length) {
              availableSet = new Set(e.availableModels);
              applyAvailableModelsHint(e.availableModels);
              recordModelFailure(model, "chat_completions_unavailable");
            }
            if (e?.code !== "LOW_QUALITY_ANSWER" && e?.code !== "MODEL_CREDITS_EXHAUSTED") console.warn(`Model failed: ${model}`, e);
          } finally {
            inFlight -= 1;
            completed += 1;
            startNextIfIdle();
          }
        }

        order.forEach((_, idx) => { timers[idx] = setTimeout(() => startAttempt(idx), idx * ATTEMPT_DELAY_MS); });
      });
    }
    return { buildFunctionUrlCandidates, callAiProxy, isApiKeyQuotaDetail, isApiKeyCredentialDetail, isRecoverableApiKeyError, isAllModelsCreditsExhaustedError, isAiRegionAvailabilityError, getAiRegionUnavailableMessage, parseAvailableModelsFromDetail, normalizeAvailableChatModels, readModelTimings, writeModelTimings, recordModelTiming, readModelFailures, writeModelFailures, recordModelFailure, isModelBlocked, getModelOrder, updateLoaderText, getModelDisplayLabel, startLoaderPhases, stopLoaderPhases, fetchAnswerOnce, requestBatchWithTimeout, readTokenUsage, hasRecentDailyLimit };
  }
  window.QAtoDevAiClient = { create, models: FAST_MODEL_HINTS, modelCacheScope, nextComparisonOrder };
})();
