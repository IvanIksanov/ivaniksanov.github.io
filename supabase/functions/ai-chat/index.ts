import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const USER_API_KEY_SERVICE = "io_net";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
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
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !ioApiBase || !defaultIoApiKey) {
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
        .eq("service", USER_API_KEY_SERVICE)
        .maybeSingle();
      persistedUserApiKey = String(keyRow?.api_key || "").trim() || null;
    }

    const localOverrideKey = String(body?.userApiKey || "").trim() || null;
    const finalApiKey = localOverrideKey || persistedUserApiKey || defaultIoApiKey;

    if (!finalApiKey) {
      return jsonResponse({
        error: "api_key_missing",
        detail: "No API key is available for upstream requests.",
      }, 500);
    }

    if (isModelsRequest) {
      const upstreamRes = await fetch(`${ioApiBase}/models?page_size=100`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${finalApiKey}`,
        },
      });
      const text = await upstreamRes.text();
      return new Response(text, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
        },
      });
    }

    const model = String(body?.model || "").trim();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const temperature = Number(body?.temperature ?? 0.7);
    const reasoning_content = !!body?.reasoning_content;
    const max_completion_tokens = Number(body?.max_completion_tokens ?? 1000);
    const stream = !!body?.stream;

    if (!model || !messages.length) {
      return jsonResponse({
        error: "bad_request",
        detail: "model and messages are required.",
      }, 400);
    }

    const upstreamRes = await fetch(`${ioApiBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${finalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        reasoning_content,
        max_completion_tokens,
        stream,
      }),
    });

    const text = await upstreamRes.text();
    return new Response(text, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    return jsonResponse({
      error: "edge_function_failed",
      detail: String(e?.message || e || "unknown error"),
    }, 500);
  }
});
