(function () {
  const IO_API_BASE = "https://api.intelligence.io.solutions/api/v1";
  const MODEL_LIST_CACHE_KEY = "model_list_cache_v1";
  const MODEL_CHAT_VALIDATED_CACHE_KEY = "model_chat_validated_cache_v1";
  const MODEL_WARMUP_KEY = "model_warmup_ts_v1";
  const MODEL_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const WARMUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const FAST_MODEL_HINTS = [
    "openai/gpt-oss-20b",
    "mistralai/Mistral-Nemo-Instruct-2407",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "moonshotai/Kimi-K2-Instruct-0905",
    "deepseek-ai/DeepSeek-V3.2"
  ];
  const WARMUP_SYSTEM_PROMPT =
    "You are an AI assistant for interview preparation in the IT field, specializing in roles such as Test Engineer, QA, AQA, and Test Automation. " +
    "Answer all user queries in Russian and maintain the context of software testing throughout. " +
    "If the user submits only a single term or skill (for example, Postman or SQL), provide a clear definition, explain its purpose, and describe typical use cases. " +
    "If the user submits a full interview question, respond with a detailed, structured answer in Russian, without generating additional follow-up questions. " +
    "Provide a concise but rich summary with practical examples. " +
    "Total answer length should be within 1000 tokens. " +
    "Do not use markdown tables, charts, or extra formatting.";
  const WARMUP_USER_PROMPT = "Тема: API. Вопрос: Что такое REST API и как тестировать его на собеседовании QA?";

  function getAuthKey() {
    const p1 = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.";
    const p2 = "eyJvd25lciI6IjVhNzhhY2I4LTJkZmUtNGRiNi04N2QxLTkxODZmNTFmZDllZSIsImV4cCI6NDkyNDc3MTU3OH0.";
    const p3 = "EMXKUEfcMvAbtMt_WodTcNcENyqOXwfuF16wtC4-8i2sJgak6KJODACg3c3tyzwjbacXC1XHUu3jS9E4C14VLw";
    return p1 + p2 + p3;
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

  function normalizeAvailableChatModels(apiModels) {
    const list = Array.isArray(apiModels) ? apiModels.filter(Boolean) : [];
    const noReasoning = list.filter((name) => {
      const n = String(name).toLowerCase();
      return !(
        n.includes("thinking") ||
        n.includes("reasoning") ||
        n.includes("deepseek-r1") ||
        n.includes("/r1") ||
        n.endsWith("-r1") ||
        n.includes("o1") ||
        n.includes("o3") ||
        n.includes("vl") ||
        n.includes("vision")
      );
    });
    const hinted = FAST_MODEL_HINTS.filter((m) => noReasoning.includes(m));
    const pool = hinted.length ? hinted : (noReasoning.length ? noReasoning : list);
    return pool.slice(0, 5);
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.models) || !parsed.ts) return null;
      if ((Date.now() - parsed.ts) > MODEL_LIST_CACHE_TTL_MS) return null;
      return parsed.models.filter(Boolean);
    } catch {
      return null;
    }
  }

  function writeCache(key, models) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), models: models.slice(0, 5) }));
    } catch {}
  }

  function shouldWarmup() {
    const last = Number(localStorage.getItem(MODEL_WARMUP_KEY) || 0);
    if (!last) return true;
    return (Date.now() - last) > WARMUP_INTERVAL_MS;
  }

  async function warmupModelOnce(model) {
    const startedAt = Date.now();
    const res = await fetch(`${IO_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: WARMUP_SYSTEM_PROMPT },
          { role: "user", content: WARMUP_USER_PROMPT }
        ],
        temperature: 0.7,
        reasoning_content: false,
        max_completion_tokens: 1000,
        stream: false
      })
    });
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.detail || "";
      } catch {}
      const availableModels = parseAvailableModelsFromDetail(detail);
      if (res.status === 400 && availableModels.length) {
        const err = new Error("MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS");
        err.code = "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS";
        err.availableModels = availableModels;
        throw err;
      }
      throw new Error(`Warmup failed: ${res.status}`);
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const answer = msg?.content?.trim();
    if (!answer) throw new Error("Warmup empty");
    return Date.now() - startedAt;
  }

  async function loadModelsFromApi() {
    const res = await fetch(`${IO_API_BASE}/models?page_size=100`, {
      headers: {
        Authorization: `Bearer ${getAuthKey()}`
      }
    });
    if (!res.ok) throw new Error(`Models list failed: ${res.status}`);
    const json = await res.json();
    const apiModels = (json?.data || [])
      .filter((m) => {
        const status = (m?.status || "").toLowerCase();
        if (status && status !== "active") return false;
        const enable = m?.metadata?.enable_api_chat_completions;
        if (enable === false) return false;
        return true;
      })
      .map((m) => m?.name || m?.id)
      .filter(Boolean);
    return normalizeAvailableChatModels(apiModels);
  }

  async function preflight() {
    const validated = readCache(MODEL_CHAT_VALIDATED_CACHE_KEY);
    if (validated && validated.length && !shouldWarmup()) return;

    let pool = validated && validated.length ? validated.slice(0, 5) : readCache(MODEL_LIST_CACHE_KEY);
    if (!pool || !pool.length) {
      try {
        pool = await loadModelsFromApi();
      } catch {
        pool = FAST_MODEL_HINTS.slice(0, 5);
      }
    }
    if (!pool.length) return;

    const valid = [];
    let availableHint = [];

    try {
      const ms = await warmupModelOnce(pool[0]);
      valid.push({ model: pool[0], ms });
    } catch (e) {
      if (e?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(e.availableModels) && e.availableModels.length) {
        availableHint = e.availableModels;
        pool = normalizeAvailableChatModels(e.availableModels);
      }
    }

    const remaining = pool
      .filter((m) => !valid.some((x) => x.model === m))
      .slice(0, Math.max(0, 5 - valid.length));

    if (remaining.length) {
      const settled = await Promise.allSettled(remaining.map(async (model) => {
        const ms = await warmupModelOnce(model);
        return { model, ms };
      }));
      settled.forEach((entry) => {
        if (entry.status === "fulfilled") valid.push(entry.value);
      });
    }

    if (!valid.length && availableHint.length) {
      const retryPool = normalizeAvailableChatModels(availableHint);
      const retrySettled = await Promise.allSettled(retryPool.map(async (model) => {
        const ms = await warmupModelOnce(model);
        return { model, ms };
      }));
      retrySettled.forEach((entry) => {
        if (entry.status === "fulfilled") valid.push(entry.value);
      });
    }

    if (!valid.length) return;
    valid.sort((a, b) => a.ms - b.ms);
    const ordered = valid.map((x) => x.model).slice(0, 5);
    writeCache(MODEL_LIST_CACHE_KEY, ordered);
    writeCache(MODEL_CHAT_VALIDATED_CACHE_KEY, ordered);
    try {
      localStorage.setItem(MODEL_WARMUP_KEY, String(Date.now()));
    } catch {}
  }

  if (window.__qatodevModelPreflightStarted) return;
  window.__qatodevModelPreflightStarted = true;
  preflight().catch((e) => {
    console.warn("Shared model preflight failed", e);
  });
})();
