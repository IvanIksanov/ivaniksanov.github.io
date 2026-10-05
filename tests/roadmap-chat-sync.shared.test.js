const test = require('node:test');
const assert = require('node:assert/strict');
const sync = require('../roadmap-chat-sync.shared.js');

const userId = '11111111-1111-4111-8111-111111111111';
const answer = (model, text, kind = 'auto') => ({ model, answer: text, elapsedMs: 100, kind });
const turn = (id, answers, updatedAt = 1000) => ({
  id, question: 'Что такое API?', answers, selected: 0, modelOrder: ['model-a', 'model-b'],
  comparisonCount: 0, createdAt: 1000, updatedAt
});
const row = (id, answers, updatedAt = 1000) => ({
  user_id: userId, topic_id: 'rest-api', id, question: 'Что такое API?', answers,
  selected: 0, model_order: ['model-a', 'model-b'], comparison_count: 0,
  created_at: new Date(1000).toISOString(), updated_at: new Date(updatedAt).toISOString()
});

test('merges local and cloud answers by turn ID while preserving the local draft', () => {
  const local = { 'rest-api': { draft: 'Мой следующий вопрос', turns: [turn('one', [answer('model-a', 'Первый ответ')])] } };
  const remote = [{ ...row('one', [answer('model-a', 'Первый ответ'), answer('model-b', 'Другой ответ', 'comparison')], 2000), selected: 1 }];
  const merged = sync.merge(local, remote);
  assert.equal(merged['rest-api'].draft, 'Мой следующий вопрос');
  assert.deepEqual(merged['rest-api'].turns[0].answers.map(item => item.answer), ['Первый ответ', 'Другой ответ']);
  assert.equal(merged['rest-api'].turns[0].selected, 1);
  assert.equal(merged['rest-api'].turns.length, 1);
});

test('does not show the same completed question-answer pair twice after two devices sync', () => {
  const local = { 'rest-api': { draft: '', turns: [turn('local', [answer('model-a', 'Один ответ')])] } };
  const merged = sync.merge(local, [row('remote', [answer('model-a', 'Один ответ')], 2000)]);
  assert.equal(merged['rest-api'].turns.length, 1);
});

test('uploads only completed local turns and skips unchanged data on the next sync', async () => {
  const rows = [];
  const uploaded = [];
  let local = { 'rest-api': { draft: 'Черновик', turns: [turn('done', [answer('model-a', 'Ответ')]), turn('pending', [])] } };
  const client = { from() { return {
    select() { return this; }, eq() { return this; }, order() { return this; },
    async range(start, end) { return { data: rows.slice(start, end + 1), error: null }; },
    async upsert(batch) { uploaded.push(...batch); rows.push(...batch); return { error: null }; }
  }; } };
  const controller = sync.create({
    getStore: () => ({ client, getSession: async () => ({ user: { id: userId } }) }),
    getState: () => local,
    applyState: (_, merged) => { local = merged; return true; }
  });
  assert.equal((await controller.sync(userId)).uploadedTurns, 1);
  assert.equal(uploaded[0].id, 'done');
  assert.equal((await controller.sync(userId)).uploadedTurns, 0);
  assert.equal(uploaded.length, 1);
  assert.equal(local['rest-api'].draft, 'Черновик');
});

test('a failed upload leaves the local turn available for the next attempt', async () => {
  let attempts = 0;
  let local = { 'rest-api': { draft: '', turns: [turn('offline', [answer('model-a', 'Ответ')])] } };
  const client = { from() { return {
    select() { return this; }, eq() { return this; }, order() { return this; },
    async range() { return { data: [], error: null }; },
    async upsert() { attempts += 1; return { error: attempts === 1 ? new Error('offline') : null }; }
  }; } };
  const controller = sync.create({
    getStore: () => ({ client, getSession: async () => ({ user: { id: userId } }) }),
    getState: () => local,
    applyState: (_, merged) => { local = merged; return true; }
  });
  await assert.rejects(controller.sync(userId), /offline/);
  assert.equal(local['rest-api'].turns[0].id, 'offline');
  assert.equal((await controller.sync(userId)).uploadedTurns, 1);
  assert.equal(attempts, 2);
});

test('a new turn arriving during sync is included in a second pass', async () => {
  const rows = [];
  let releaseFirstUpload;
  let firstUploadStarted;
  const started = new Promise(resolve => { firstUploadStarted = resolve; });
  const release = new Promise(resolve => { releaseFirstUpload = resolve; });
  let uploads = 0;
  let local = { 'rest-api': { draft: '', turns: [turn('first', [answer('model-a', 'Первый')])] } };
  const client = { from() { return {
    select() { return this; }, eq() { return this; }, order() { return this; },
    async range(start, end) { return { data: rows.slice(start, end + 1), error: null }; },
    async upsert(batch) {
      uploads += 1;
      if (uploads === 1) { firstUploadStarted(); await release; }
      rows.push(...batch);
      return { error: null };
    }
  }; } };
  const controller = sync.create({
    getStore: () => ({ client, getSession: async () => ({ user: { id: userId } }) }),
    getState: () => local,
    applyState: (_, merged) => { local = merged; return true; }
  });
  const first = controller.sync(userId);
  await started;
  local['rest-api'].turns.push(turn('second', [answer('model-b', 'Второй')], 2000));
  const second = controller.sync(userId);
  releaseFirstUpload();
  await first;
  await second;
  assert.deepEqual(rows.map(item => item.id).sort(), ['first', 'second']);
});
