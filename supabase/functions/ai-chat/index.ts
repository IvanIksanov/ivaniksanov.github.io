import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-QAtoDev-Daily-Limit, X-QAtoDev-Daily-Reset-At",
};

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const CHAT_MODELS = new Set([
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
]);
const FREE_TOKENS_PER_MODEL_PER_KEY = 200_000;

function chargedUsage(usage: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | undefined) {
  const prompt = Number(usage?.prompt_tokens);
  const completion = Number(usage?.completion_tokens);
  if (!Number.isSafeInteger(prompt) || prompt < 0 || !Number.isSafeInteger(completion) || completion < 0) return null;
  const rawCached = Number(usage?.prompt_tokens_details?.cached_tokens || 0);
  const cached = Number.isSafeInteger(rawCached) ? Math.min(prompt, Math.max(0, rawCached)) : 0;
  return { prompt_tokens: prompt, completion_tokens: completion, cached_tokens: cached,
    charged_tokens: prompt - cached + completion };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function shouldTryNextKey(status: number, responseBody: string) {
  return [401, 402, 403, 429].includes(status) || status >= 500 ||
    /insufficient credits|quota exceeded|rate limit exceeded|invalid api key/i.test(responseBody);
}

function validGroqMessages(messages: unknown[]) {
  if (messages.length > 4) return false;
  let totalChars = 0;
  for (const item of messages) {
    const message = item as { role?: string; content?: string } | null;
    if (!message || !["system", "user", "assistant"].includes(message.role || "") || typeof message.content !== "string") return false;
    totalChars += message.content.length;
    if (totalChars > 24000) return false;
  }
  return true;
}

async function requestUpstream(url: string, init: RequestInit, keys: string[], onSuccess?: (text: string, keyIndex: number) => Promise<void>) {
  let dailyLimitHit = false;
  let dailyResetAt: number | null = null;
  for (const [index, key] of keys.entries()) {
    try {
      const upstreamRes = await fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${key}` },
      });
      const text = await upstreamRes.text();
      if (upstreamRes.status === 429 && /\b(?:TPD|RPD)\b|tokens per day|requests per day/i.test(text)) {
        dailyLimitHit = true;
        const retryHeader = upstreamRes.headers.get("retry-after") || "";
        const retrySeconds = Number(retryHeader) || Number(text.match(/try again in\s+([\d.]+)s/i)?.[1]);
        const retryDate = Date.parse(retryHeader);
        const resetAt = Number.isFinite(retrySeconds) && retrySeconds > 0
          ? Date.now() + retrySeconds * 1000
          : Number.isFinite(retryDate) && retryDate > Date.now() ? retryDate : null;
        if (resetAt) dailyResetAt = dailyResetAt ? Math.min(dailyResetAt, resetAt) : resetAt;
      }
      if (!upstreamRes.ok && index < keys.length - 1 && shouldTryNextKey(upstreamRes.status, text)) continue;
      if (upstreamRes.ok && onSuccess) {
        try { await onSuccess(text, index); }
        catch (error) { console.warn("Groq usage could not be recorded", error); }
      }
      return new Response(text, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
          ...(dailyLimitHit ? { "X-QAtoDev-Daily-Limit": "1" } : {}),
          ...(dailyResetAt ? { "X-QAtoDev-Daily-Reset-At": String(Math.round(dailyResetAt)) } : {}),
        },
      });
    } catch (error) {
      if (index === keys.length - 1) throw error;
    }
  }
  return jsonResponse({ error: "api_key_missing", detail: "No API key is available for upstream requests." }, 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const ioApiBase = Deno.env.get("IO_API_BASE") || "";
    const defaultIoApiKey = Deno.env.get("IO_API_KEY") || "";
    const primaryIoApiKey = Deno.env.get("IO_API_KEY_PRIMARY") || "";
    const defaultGroqApiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GROQ_API_KEY_PRIMARY") || "";
    const backupGroqApiKey = Deno.env.get("GROQ_API_KEY_BACKUP") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({
        error: "edge_function_config_missing",
        detail: "Required Supabase or AI secrets are not configured.",
      }, 500);
    }

    const reqUrl = new URL(req.url);

    let body: Record<string, unknown> = {};
    if (req.method !== "GET") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const isModelsRequest =
      (req.method === "GET" && reqUrl.searchParams.get("action") === "models") ||
      String(body?.action || "") === "models";
    const provider = String(body?.provider || reqUrl.searchParams.get("provider") || "") === "groq" ? "groq" : "io_net";
    const isUsageRequest = (req.method === "GET" && reqUrl.searchParams.get("action") === "usage") ||
      String(body?.action || "") === "usage";

    if (isUsageRequest) {
      if (provider !== "groq") return jsonResponse({ error: "bad_request" }, 400);
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await adminClient.rpc("ai_token_usage_last_24h");
      if (error) return jsonResponse({ error: "usage_unavailable" }, 503);
      const siteKeyCount = new Set([defaultGroqApiKey, backupGroqApiKey].filter(Boolean)).size;
      const byModel = [...CHAT_MODELS].map(model => {
        const rows = (Array.isArray(data) ? data : []).filter(row => row.model === model);
        const used = rows.reduce((sum, row) => sum + Math.max(0, Number(row.charged_tokens) || 0), 0);
        return { model, used, remaining: Math.max(0, FREE_TOKENS_PER_MODEL_PER_KEY * siteKeyCount - used),
          requests: rows.reduce((sum, row) => sum + Math.max(0, Number(row.request_count) || 0), 0) };
      });
      const limit = FREE_TOKENS_PER_MODEL_PER_KEY * CHAT_MODELS.size * siteKeyCount;
      const used = byModel.reduce((sum, row) => sum + row.used, 0);
      return jsonResponse({ window: "rolling_24h", limit, used, remaining: Math.max(0, limit - used), byModel });
    }

    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    let persistedUserApiKey: string | null = null;
    if (userId) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: keyRow } = await adminClient
        .from("user_api_keys")
        .select("api_key")
        .eq("user_id", userId)
        .eq("service", provider)
        .maybeSingle();
      persistedUserApiKey = String(keyRow?.api_key || "").trim() || null;
    }

    const localOverrideKey = String(body?.userApiKey || "").trim() || null;
    const userApiKey = localOverrideKey || persistedUserApiKey;
    if (userApiKey && (!/^[\x21-\x7e]+$/.test(userApiKey) || /[<>]/.test(userApiKey))) {
      return jsonResponse({ error: "invalid_api_key", detail: "API key contains invalid characters." }, 400);
    }
    const defaultKeys = provider === "groq" ? [defaultGroqApiKey, backupGroqApiKey] : [primaryIoApiKey, defaultIoApiKey];
    const apiKeys = userApiKey ? [userApiKey] : [...new Set(defaultKeys.filter(Boolean))];

    if (!apiKeys.length) {
      return jsonResponse({
        error: "api_key_missing",
        detail: "No API key is available for upstream requests.",
      }, 500);
    }
    if (provider === "io_net" && !ioApiBase) {
      return jsonResponse({ error: "edge_function_config_missing", detail: "IO_API_BASE is not configured." }, 500);
    }

    if (isModelsRequest) {
      const modelsUrl = provider === "groq" ? `${GROQ_API_BASE}/models` : `${ioApiBase}/models?page_size=100`;
      const response = await requestUpstream(modelsUrl, {
        method: "GET",
      }, apiKeys);
      if (!response.ok || provider === "io_net") return response;
      const catalog = await response.json();
      return jsonResponse({ ...catalog, data: (Array.isArray(catalog.data) ? catalog.data : []).filter((model: { id?: string; active?: boolean }) => CHAT_MODELS.has(model.id || "") && model.active !== false) });
    }

    const model = String(body?.model || "").trim();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const requestedTemperature = Number(body?.temperature ?? 0.7);
    const temperature = Number.isFinite(requestedTemperature) ? Math.min(2, Math.max(0.01, requestedTemperature)) : 0.7;
    const requestedMaxTokens = Number(body?.max_completion_tokens ?? 1000);
    const max_completion_tokens = Number.isFinite(requestedMaxTokens) ? Math.min(1500, Math.max(1, Math.floor(requestedMaxTokens))) : 1000;

    if (!model || !messages.length || (provider === "groq" && (!CHAT_MODELS.has(model) || !validGroqMessages(messages)))) {
      return jsonResponse({
        error: "bad_request",
        detail: "Unsupported model or invalid messages.",
      }, 400);
    }

    const requestBody = provider === "groq"
      ? {
        model,
        messages,
        temperature,
        max_completion_tokens,
        stream: false,
        ...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low" } : {}),
      }
      : {
        model,
        messages,
        temperature: Number(body?.temperature ?? 0.7),
        reasoning_content: !!body?.reasoning_content,
        max_completion_tokens: Number(body?.max_completion_tokens ?? 1000),
        stream: !!body?.stream,
      };
    const chatUrl = provider === "groq" ? `${GROQ_API_BASE}/chat/completions` : `${ioApiBase}/chat/completions`;
    const siteKeySlots = apiKeys.map(key => key === defaultGroqApiKey ? "primary" : "backup");
    const recordUsage = provider === "groq" && !userApiKey ? async (text: string, keyIndex: number) => {
      const result = JSON.parse(text);
      const usage = chargedUsage(result?.usage);
      if (!usage) return;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error } = await adminClient.from("ai_token_usage").insert({
        response_id: typeof result.id === "string" ? result.id : null,
        model, key_slot: siteKeySlots[keyIndex], ...usage,
      });
      if (error && error.code !== "23505") throw error;
    } : undefined;
    return await requestUpstream(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }, apiKeys, recordUsage);
  } catch (e) {
    return jsonResponse({
      error: "edge_function_failed",
      detail: String(e?.message || e || "unknown error"),
    }, 500);
  }
});
