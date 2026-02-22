(function () {
  const SUPABASE_URL = "https://mbebpfbmnojlaggdroum.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";

  function create() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn("Supabase SDK is not loaded");
      return null;
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  const client = create();

  async function getUser() {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) {
      console.warn("Supabase getUser error", error.message || error);
      return null;
    }
    return data?.user || null;
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn("Supabase getSession error", error.message || error);
      return null;
    }
    return data?.session || null;
  }

  async function signInWithOtp(email, redirectTo) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || window.location.href
      }
    });
  }

  async function signInWithOAuth(provider, redirectTo) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || window.location.href
      }
    });
  }

  async function signOut() {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    try {
      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok && res.status !== 401) {
        const txt = await res.text();
        return { error: new Error(`Logout failed: ${res.status} ${txt}`) };
      }
    } catch (e) {
      return { error: e };
    }
    return client.auth.signOut();
  }

  async function saveAiAnswer(row) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client.from("ai_answers").insert(row).select("id").single();
  }

  async function saveAiAnswersBulk(rows) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    if (!Array.isArray(rows) || !rows.length) return { data: [], error: null };
    return client.from("ai_answers").insert(rows).select("id,question_id,answer_type,model,seconds,content,created_at");
  }

  async function loadAiAnswers(questionId, limit) {
    if (!client) return { data: [], error: new Error("Supabase client is not initialized") };
    let q = client
      .from("ai_answers")
      .select("*")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });
    if (limit) q = q.limit(limit);
    return q;
  }

  async function deleteAiAnswerById(id) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client.from("ai_answers").delete().eq("id", id).select("id");
  }

  async function upsertUserProfile(row) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client
      .from("user_it_profile")
      .upsert(row, { onConflict: "user_id" })
      .select("*")
      .single();
  }

  async function getUserProfile(userId) {
    if (!client) return { data: null, error: new Error("Supabase client is not initialized") };
    return client
      .from("user_it_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
  }

  async function upsertQuestionProgress(row) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    return client
      .from("question_progress")
      .upsert(row, { onConflict: "user_id,question_id" });
  }

  async function upsertQuestionProgressBulk(rows) {
    if (!client) return { error: new Error("Supabase client is not initialized") };
    if (!Array.isArray(rows) || !rows.length) return { data: [], error: null };
    return client
      .from("question_progress")
      .upsert(rows, { onConflict: "user_id,question_id" });
  }

  async function loadQuestionProgress() {
    if (!client) return { data: [], error: new Error("Supabase client is not initialized") };
    return client
      .from("question_progress")
      .select("*");
  }

  window.AppSupabase = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    client,
    getUser,
    getSession,
    signInWithOtp,
    signInWithOAuth,
    signOut,
    saveAiAnswer,
    loadAiAnswers,
    deleteAiAnswerById,
    upsertUserProfile,
    getUserProfile,
    upsertQuestionProgress,
    upsertQuestionProgressBulk,
    loadQuestionProgress,
    saveAiAnswersBulk
  };
})();
