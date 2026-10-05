/* Private Roadmap chat sync; localStorage remains the offline queue. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.QAtoDevRoadmapChatSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const table = 'roadmap_chat_turns';
  const time = value => typeof value === 'number' ? value : Date.parse(value || '') || 0;
  const answerKey = answer => `${answer.model || ''}\u0000${answer.answer || ''}`;

  function mergeTurn(local, remote) {
    const answers = [];
    const seen = new Set();
    for (const answer of [...(local.answers || []), ...(remote.answers || [])]) {
      if (!answer || typeof answer.answer !== 'string' || typeof answer.model !== 'string') continue;
      const key = answerKey(answer);
      if (!answer.answer || seen.has(key)) continue;
      seen.add(key);
      answers.push(answer);
    }
    const newer = time(remote.updatedAt) > time(local.updatedAt) ? remote : local;
    const selectedAnswer = newer.answers?.[newer.selected] || newer.answers?.[0];
    const selected = selectedAnswer ? Math.min(4, Math.max(0, answers.findIndex(answer => answerKey(answer) === answerKey(selectedAnswer)))) : 0;
    const createdAt = Math.min(time(local.createdAt) || Infinity, time(remote.createdAt) || Infinity);
    const combinedAnswers = answers.slice(0, 5);
    const hasNewAnswer = combinedAnswers.some(answer => !(newer.answers || []).some(existing => answerKey(existing) === answerKey(answer)));
    return {
      ...local, question: newer.question || local.question, answers: combinedAnswers,
      selected, modelOrder: newer.modelOrder?.length ? newer.modelOrder : local.modelOrder || [],
      comparisonCount: Math.max(local.comparisonCount || 0, remote.comparisonCount || 0),
      createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
      updatedAt: Math.max(time(local.updatedAt), time(remote.updatedAt), hasNewAnswer ? Date.now() : 0),
      error: '', errorCode: ''
    };
  }

  function merge(local, rows) {
    const result = Object.assign(Object.create(null), Object.fromEntries(Object.entries(local || {}).filter(([id, chat]) => /^[a-z\d_-]{1,100}$/i.test(id) && chat && typeof chat === 'object').map(([id, chat]) => [id, {
      turns: [...(chat.turns || [])], draft: chat.draft || ''
    }])));
    for (const row of rows || []) {
      if (!/^[a-z\d_-]{1,100}$/i.test(row?.topic_id || '') || !row.id || !Array.isArray(row.answers)) continue;
      const validAnswers = row.answers.filter(answer => answer && typeof answer.answer === 'string' && typeof answer.model === 'string').slice(0, 5);
      if (!validAnswers.length) continue;
      const chat = result[row.topic_id] ||= { turns: [], draft: '' };
      const remote = {
        id: row.id, question: row.question, answers: validAnswers,
        selected: row.selected || 0, modelOrder: row.model_order || [],
        comparisonCount: row.comparison_count || 0,
        createdAt: time(row.created_at), updatedAt: time(row.updated_at), error: '', errorCode: ''
      };
      const index = chat.turns.findIndex(turn => turn.id === row.id);
      if (index < 0) chat.turns.push(remote);
      else chat.turns[index] = mergeTurn(chat.turns[index], remote);
    }
    for (const chat of Object.values(result)) {
      chat.turns.sort((a, b) => time(a.createdAt) - time(b.createdAt));
      const seenContent = new Set();
      chat.turns = chat.turns.filter(turn => {
        if (!turn.answers?.length) return true;
        const content = `${turn.question}\u0000${turn.answers[0].answer}`;
        if (seenContent.has(content)) return false;
        seenContent.add(content);
        return true;
      }).slice(-12);
    }
    return Object.fromEntries(Object.entries(result)
      .sort(([, a], [, b]) => Math.max(...a.turns.map(t => time(t.updatedAt)), 0) - Math.max(...b.turns.map(t => time(t.updatedAt)), 0))
      .slice(-30));
  }

  function rowFor(userId, topicId, turn) {
    return {
      user_id: userId, topic_id: topicId, id: turn.id,
      question: turn.question, answers: turn.answers.map(answer => ({
        answer: answer.answer, model: answer.model, elapsedMs: Number(answer.elapsedMs) || 0,
        kind: answer.kind === 'comparison' ? 'comparison' : 'auto'
      })),
      selected: turn.selected || 0, model_order: turn.modelOrder || [],
      comparison_count: turn.comparisonCount || 0,
      created_at: new Date(time(turn.createdAt) || Date.now()).toISOString(),
      updated_at: new Date(time(turn.updatedAt) || Date.now()).toISOString()
    };
  }

  function changed(row, previous) {
    if (!previous) return true;
    return time(row.updated_at) > time(previous.updated_at) ||
      JSON.stringify([row.question, row.answers, row.selected, row.model_order, row.comparison_count]) !==
      JSON.stringify([previous.question, previous.answers, previous.selected, previous.model_order, previous.comparison_count]);
  }

  function create({ getStore, getState, applyState }) {
    let running = null;

    async function readAll(client, userId) {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await client.from(table).select('*')
          .eq('user_id', userId).order('topic_id', { ascending: true }).order('id', { ascending: true }).range(start, start + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      return rows;
    }

    async function sync(userId) {
      if (!userId) return { ok: false, skipped: 'signed-out' };
      if (running) return running.then(() => sync(userId), () => sync(userId));
      running = (async () => {
        const store = getStore();
        const session = await store?.getSession?.();
        if (!store?.client || session?.user?.id !== userId) return { ok: false, skipped: 'session-changed' };
        const remote = await readAll(store.client, userId);
        const combined = merge(getState(), remote);
        if (!applyState(userId, combined)) return { ok: false, skipped: 'user-changed' };
        const remoteByKey = new Map(remote.map(row => [`${row.topic_id}\u0000${row.id}`, row]));
        const updates = Object.entries(combined).flatMap(([topicId, chat]) => chat.turns
          .filter(turn => turn.answers?.length)
          .map(turn => rowFor(userId, topicId, turn)))
          .filter(row => changed(row, remoteByKey.get(`${row.topic_id}\u0000${row.id}`)));
        for (let start = 0; start < updates.length; start += 100) {
          const { error } = await store.client.from(table)
            .upsert(updates.slice(start, start + 100), { onConflict: 'user_id,topic_id,id' });
          if (error) throw error;
        }
        return { ok: true, uploadedTurns: updates.length };
      })().finally(() => { running = null; });
      return running;
    }
    return { sync };
  }

  return { merge, create };
});
