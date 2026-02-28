#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mbebpfbmnojlaggdroum.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
const OUTPUT_PATH = process.env.QUESTIONS_SNAPSHOT_OUT || "over/questions_db_snapshot.json";

function mapQuestionsPayload(sections, questions) {
  const grouped = new Map();
  for (const q of questions || []) {
    const list = grouped.get(q.section_id) || [];
    list.push({
      id: q.id,
      title: q.title,
      answer: q.answer_html,
      moreLink: q.more_link || "",
      authorCheck: q.author_check || "",
      avatar: q.avatar || ""
    });
    grouped.set(q.section_id, list);
  }
  return (sections || [])
    .map((s) => ({
      category: s.title,
      items: grouped.get(s.id) || []
    }))
    .filter((s) => s.items.length);
}

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

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY are required");
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };
  const [sections, questions] = await Promise.all([
    loadJson(`${SUPABASE_URL}/rest/v1/question_sections?select=id,title,sort_order&order=sort_order.asc`, headers),
    loadJson(`${SUPABASE_URL}/rest/v1/questions?select=id,section_id,title,answer_html,more_link,author_check,avatar,sort_order&order=sort_order.asc`, headers)
  ]);
  const data = mapQuestionsPayload(sections, questions);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: "supabase",
    data
  };

  const fs = await import("node:fs/promises");
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
  process.stdout.write(
    `Snapshot saved to ${OUTPUT_PATH}. sections=${data.length}, questions=${questions.length}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
