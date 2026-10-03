/* Private, idempotent chat sync. Local state remains the offline queue. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.QAtoDevHomeChatSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function time(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    return Date.parse(value || '') || 0;
  }

  function signature(turn) {
    return `${String(turn.question || '').trim()}\u0000${String(turn.answer || '').trim()}`;
  }

  function mergeTurns(localTurns = [], remoteTurns = []) {
    const byId = new Set();
    const byContent = new Set();
    return [...localTurns, ...remoteTurns]
      .filter(turn => turn?.id && turn?.answer)
      .sort((a, b) => time(a.createdAt) - time(b.createdAt))
      .filter(turn => {
        const content = signature(turn);
        if (byId.has(turn.id) || byContent.has(content)) return false;
        byId.add(turn.id);
        byContent.add(content);
        return true;
      });
  }

  function merge(local, remoteChats = [], remoteTurns = []) {
    const deleted = new Map((local.deleted || []).map(entry => [entry.id, time(entry.deletedAt)]));
    const remoteById = new Map();
    const turnsByChat = new Map();
    for (const row of remoteTurns) {
      const list = turnsByChat.get(row.chat_id) || [];
      list.push({
        id: row.id, createdAt: time(row.created_at), question: row.question,
        answer: row.answer, memory: row.memory, title: row.title, icon: row.icon,
        suggestions: row.suggestions, offline: row.offline, starterId: row.starter_id
      });
      turnsByChat.set(row.chat_id, list);
    }
    for (const row of remoteChats) {
      remoteById.set(row.id, row);
      if (row.deleted_at) deleted.set(row.id, Math.max(deleted.get(row.id) || 0, time(row.deleted_at)));
    }

    const saved = [];
    const ids = new Set([...(local.saved || []).map(chat => chat.id), ...remoteById.keys()]);
    for (const id of ids) {
      if (deleted.has(id)) continue;
      const localChat = (local.saved || []).find(chat => chat.id === id);
      const remoteChat = remoteById.get(id);
      const localTime = time(localChat?.updatedAt);
      const remoteTime = time(remoteChat?.updated_at);
      const latest = remoteChat && (!localChat || remoteTime > localTime) ? remoteChat : localChat;
      if (!latest) continue;
      saved.push({
        id,
        title: latest.title || 'Чат без названия',
        icon: latest.icon || 'qa',
        createdAt: time(localChat?.createdAt) || time(remoteChat?.created_at) || Date.now(),
        updatedAt: Math.max(localTime, remoteTime),
        turns: mergeTurns(localChat?.turns, turnsByChat.get(id))
      });
    }
    saved.sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      saved,
      draft: local.draft || [],
      activeId: saved.some(chat => chat.id === local.activeId) ? local.activeId : null,
      deleted: [...deleted].map(([id, deletedAt]) => ({ id, deletedAt }))
    };
  }

  function create(options) {
    const getStore = options.getStore;
    const getState = options.getState;
    const applyState = options.applyState;
    let running = null;
    let rerunUserId = '';

    async function readAll(client, table, userId) {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await client.from(table).select('*')
          .eq('user_id', userId).order('id', { ascending: true }).range(start, start + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      return rows;
    }

    async function sync(userId) {
      if (!userId) return { ok: false, skipped: 'signed-out' };
      if (running) { rerunUserId = userId; return running; }
      running = (async () => {
        const store = getStore();
        const session = await store?.getSession?.();
        if (!store?.client || session?.user?.id !== userId) return { ok: false, skipped: 'session-changed' };

        const [remoteChats, remoteTurns] = await Promise.all([
          readAll(store.client, 'home_chats', userId),
          readAll(store.client, 'home_chat_turns', userId)
        ]);
        const combined = merge(getState(), remoteChats, remoteTurns);
        if (!applyState(userId, combined)) return { ok: false, skipped: 'user-changed' };

        const remoteById = new Map(remoteChats.map(chat => [chat.id, chat]));
        const remoteTurnIds = new Set(remoteTurns.map(turn => turn.id));
        const remoteSignatures = new Map();
        for (const turn of remoteTurns) {
          const signatures = remoteSignatures.get(turn.chat_id) || new Set();
          signatures.add(signature(turn));
          remoteSignatures.set(turn.chat_id, signatures);
        }

        const chatRows = combined.saved.map(chat => ({
          id: chat.id, user_id: userId, title: chat.title, icon: chat.icon,
          created_at: new Date(chat.createdAt || chat.updatedAt).toISOString(),
          updated_at: new Date(chat.updatedAt || Date.now()).toISOString(), deleted_at: null
        }));
        for (const entry of combined.deleted) {
          const previous = remoteById.get(entry.id);
          chatRows.push({
            id: entry.id, user_id: userId,
            title: previous?.title || 'Чат без названия', icon: previous?.icon || 'qa',
            created_at: previous?.created_at || new Date(entry.deletedAt).toISOString(),
            updated_at: new Date(entry.deletedAt).toISOString(),
            deleted_at: new Date(entry.deletedAt).toISOString()
          });
        }
        const changedChats = chatRows.filter(row => {
          const previous = remoteById.get(row.id);
          return !previous || time(row.updated_at) > time(previous.updated_at) ||
            (!!row.deleted_at && !previous.deleted_at);
        });
        for (let start = 0; start < changedChats.length; start += 100) {
          const { error } = await store.client.from('home_chats')
            .upsert(changedChats.slice(start, start + 100), { onConflict: 'id' });
          if (error) throw error;
        }

        const newTurns = combined.saved.flatMap(chat => chat.turns
          .filter(turn => turn.answer && !remoteTurnIds.has(turn.id) &&
            !remoteSignatures.get(chat.id)?.has(signature(turn)))
          .map(turn => ({
            id: turn.id, user_id: userId, chat_id: chat.id,
            question: turn.question, answer: turn.answer, memory: turn.memory || '',
            title: turn.title || '', icon: turn.icon || '', suggestions: turn.suggestions || [],
            offline: turn.offline === true, starter_id: turn.starterId || '',
            created_at: new Date(turn.createdAt || Date.now()).toISOString()
          })));
        for (let start = 0; start < newTurns.length; start += 100) {
          const { error } = await store.client.from('home_chat_turns')
            .upsert(newTurns.slice(start, start + 100), { onConflict: 'id', ignoreDuplicates: true });
          if (error) throw error;
        }
        return { ok: true, uploadedChats: changedChats.length, uploadedTurns: newTurns.length };
      })().finally(() => {
        running = null;
        if (rerunUserId) {
          const nextUserId = rerunUserId;
          rerunUserId = '';
          queueMicrotask(() => { sync(nextUserId).catch(() => {}); });
        }
      });
      return running;
    }

    return { sync };
  }

  return { merge, mergeTurns, create };
});
