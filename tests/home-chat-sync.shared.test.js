const test = require('node:test');
const assert = require('node:assert/strict');
const syncShared = require('../home-chat-sync.shared.js');

const id = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const secondTurnId = '33333333-3333-4333-8333-333333333333';
const now = Date.parse('2026-10-03T10:00:00Z');

function localChat(turns = []) {
  return { id, title: 'Docker для QA', icon: 'docker', createdAt: now, updatedAt: now, turns };
}

test('same request-answer pair is not duplicated after cloud replay', () => {
  const localTurn = { id: turnId, createdAt: now, question: 'Что такое Docker?', answer: 'Контейнеры.' };
  const remoteTurn = { id: secondTurnId, chat_id: id, created_at: new Date(now).toISOString(),
    question: localTurn.question, answer: localTurn.answer };
  const state = syncShared.merge(
    { saved: [localChat([localTurn])], draft: [], activeId: id, deleted: [] },
    [{ id, title: 'Docker для QA', icon: 'docker', created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }],
    [remoteTurn]
  );
  assert.equal(state.saved[0].turns.length, 1);
  assert.equal(state.activeId, id);
});

test('completed turns from two devices merge without replacing one another', () => {
  const localTurn = { id: turnId, createdAt: now, question: 'Первый?', answer: 'Первый ответ.' };
  const remoteTurn = { id: secondTurnId, chat_id: id, created_at: new Date(now + 1000).toISOString(),
    question: 'Второй?', answer: 'Второй ответ.' };
  const state = syncShared.merge(
    { saved: [localChat([localTurn])], draft: [], activeId: id, deleted: [] },
    [{ id, title: 'Docker для QA', icon: 'docker', created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }],
    [remoteTurn]
  );
  assert.deepEqual(state.saved[0].turns.map(turn => turn.question), ['Первый?', 'Второй?']);
});

test('deleted chat cannot reappear from another device', () => {
  const state = syncShared.merge(
    { saved: [localChat()], draft: [], activeId: id, deleted: [] },
    [{ id, title: 'Docker для QA', icon: 'docker', deleted_at: new Date(now + 1000).toISOString() }], []
  );
  assert.equal(state.saved.length, 0);
  assert.equal(state.activeId, null);
  assert.equal(state.deleted[0].id, id);
});

test('cloud sync refuses a session belonging to another user', async () => {
  let queried = false;
  const controller = syncShared.create({
    getStore: () => ({ getSession: async () => ({ user: { id: 'other-user' } }),
      client: { from: () => { queried = true; throw new Error('should not query'); } } }),
    getState: () => ({ saved: [], draft: [], deleted: [] }),
    applyState: () => true
  });
  assert.deepEqual(await controller.sync('current-user'), { ok: false, skipped: 'session-changed' });
  assert.equal(queried, false);
});

test('sync uploads one completed pair once and pulls it onto a second device', async () => {
  const userId = 'owner';
  const rows = { home_chats: [], home_chat_turns: [] };
  const client = { from(table) {
    return {
      select() {
        return {
          eq(_field, owner) {
            return {
              order() {
                return { range: async (start, end) => ({
                  data: rows[table].filter(row => row.user_id === owner).slice(start, end + 1), error: null
                }) };
              }
            };
          }
        };
      },
      async upsert(items) {
        for (const item of items) {
          const existing = rows[table].findIndex(row => row.id === item.id);
          if (existing >= 0) rows[table][existing] = item;
          else rows[table].push(item);
        }
        return { error: null };
      }
    };
  } };
  const store = { client, getSession: async () => ({ user: { id: userId } }) };
  const pair = { id: turnId, createdAt: now, question: 'Что такое Docker?', answer: 'Контейнеры.' };
  let firstState = { saved: [localChat([pair])], draft: [], activeId: id, deleted: [] };
  const first = syncShared.create({ getStore: () => store, getState: () => firstState,
    applyState: (_user, state) => { firstState = state; return true; } });
  await first.sync(userId);
  await first.sync(userId);
  assert.equal(rows.home_chats.length, 1);
  assert.equal(rows.home_chat_turns.length, 1);

  let secondState = { saved: [], draft: [], activeId: null, deleted: [] };
  const second = syncShared.create({ getStore: () => store, getState: () => secondState,
    applyState: (_user, state) => { secondState = state; return true; } });
  await second.sync(userId);
  assert.equal(secondState.saved[0].turns[0].answer, 'Контейнеры.');
});
