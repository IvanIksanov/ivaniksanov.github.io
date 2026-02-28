#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mbebpfbmnojlaggdroum.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
const OUTPUT_PATH = process.env.PUBLIC_AI_APPEND_SNAPSHOT_OUT || "over/public_ai_append_snapshot.json";

async function loadJson(url, headers) {
  const { request } = await import("node:https");
  const { URL } = await import("node:url");
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        method: "GET",
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
            reject(new Error(`Request failed ${res.statusCode}: ${url}\n${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON response from ${url}: ${e?.message || e}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function keepLatestTwoPerQuestion(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row?.question_id || !row?.content) continue;
    const list = grouped.get(row.question_id) || [];
    list.push(row);
    grouped.set(row.question_id, list);
  }
  const compact = [];
  grouped.forEach((list) => {
    list.sort((a, b) => {
      const ta = Date.parse(a?.created_at || "") || 0;
      const tb = Date.parse(b?.created_at || "") || 0;
      return ta - tb;
    });
    compact.push(...list.slice(-2));
  });
  compact.sort((a, b) => {
    const ta = Date.parse(a?.created_at || "") || 0;
    const tb = Date.parse(b?.created_at || "") || 0;
    return ta - tb;
  });
  return compact;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY are required");
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };
  const rowsRaw = await loadJson(
    `${SUPABASE_URL}/rest/v1/ai_answers?select=id,question_id,answer_type,model,seconds,content,created_at&answer_type=eq.append&order=created_at.asc`,
    headers
  );
  const rows = Array.isArray(rowsRaw) ? rowsRaw.filter((r) => r?.question_id && r?.content) : [];
  const compactRows = keepLatestTwoPerQuestion(rows);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: "supabase",
    rows: compactRows
  };
  const fs = await import("node:fs/promises");
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
  process.stdout.write(
    `Snapshot saved to ${OUTPUT_PATH}. totalRows=${rows.length}, savedRows=${compactRows.length}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
