const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

function fixture(fetch) {
  const storage = new Map();
  const timers = [];
  const sandbox = {
    window: {}, console, AbortController, fetch,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: (run, delay) => { const timer = { run, delay }; timers.push(timer); return timer; },
    clearTimeout: timer => { timer.cancelled = true; }, clearInterval() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ai-client.shared.js'), 'utf8'), sandbox);
  const context = { currentModels: ['slow', 'fast', 'unused'], systemPrompt: 'Existing Questions prompt' };
  return { client: sandbox.window.QAtoDevAiClient.create(context), context, timers, storage, fallbackModels: sandbox.window.QAtoDevAiClient.models, modelCacheScope: sandbox.window.QAtoDevAiClient.modelCacheScope, nextComparisonOrder: sandbox.window.QAtoDevAiClient.nextComparisonOrder };
}
const answer = text => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));

function edgeFixture(fetch) {
  let handler;
  const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/ai-chat/index.ts'), 'utf8')
    .replace(/^import \{ createClient \} from .*;\n/, '');
  const env = new Map([
    ['SUPABASE_URL', 'https://example.supabase.co'],
    ['SUPABASE_ANON_KEY', 'publishable-test'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'service-test'],
    ['GROQ_API_KEY', 'gsk-default'],
    ['IO_API_BASE', 'https://api.io.net/v1'],
    ['IO_API_KEY', 'io-default']
  ]);
  vm.runInNewContext(stripTypeScriptTypes(source), {
    Deno: { env: { get: key => env.get(key) }, serve: callback => { handler = callback; } },
    createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    fetch, Request, Response, URL, Set, Number, String
  });
  const call = body => handler(new Request('https://example.functions.supabase.co/ai-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }));
  return { call, env };
}

test('Groq proxy lists only supported chat models and sends no IO-only fields', async () => {
  const calls = [];
  const { call } = edgeFixture(async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [
      { id: 'whisper-large-v3', active: true },
      { id: 'openai/gpt-oss-20b', active: true },
      { id: 'qwen/qwen3.8-27b', active: false }
    ] }));
    return answer('Первое полезное предложение. Второе полезное предложение.');
  });
  const catalog = await (await call({ provider: 'groq', action: 'models' })).json();
  assert.deepEqual(catalog.data.map(model => model.id), ['openai/gpt-oss-20b']);
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/models');
  const response = await call({ provider: 'groq', model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: 'Вопрос' }], max_completion_tokens: 9999, reasoning_content: false });
  assert.equal(response.status, 200);
  const payload = JSON.parse(calls[1].init.body);
  assert.equal(calls[1].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer gsk-default');
  assert.equal(payload.max_completion_tokens, 1000);
  assert.equal(payload.reasoning_effort, 'low');
  assert.equal(payload.reasoning_content, undefined);
  assert.equal(payload.stream, false);
});

test('Groq proxy rejects unsupported models and accepts a personal Groq key', async () => {
  const calls = [];
  const { call } = edgeFixture(async (url, init) => { calls.push({ url, init }); return answer('Первое предложение. Второе предложение.'); });
  const blocked = await call({ provider: 'groq', model: 'whisper-large-v3', messages: [{ role: 'user', content: 'Вопрос' }] });
  assert.equal(blocked.status, 400);
  assert.equal(calls.length, 0);
  const allowed = await call({ provider: 'groq', model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content: 'Вопрос' }], userApiKey: 'gsk-personal' });
  assert.equal(allowed.status, 200);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer gsk-personal');
  assert.equal(JSON.parse(calls[0].init.body).reasoning_effort, undefined);
});

test('staging requests without provider keep the existing IO route', async () => {
  const calls = [];
  const { call } = edgeFixture(async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/models')) return new Response(JSON.stringify({ data: [{ id: 'legacy-io-model' }] }));
    return answer('Первое предложение. Второе предложение.');
  });
  const catalog = await (await call({ action: 'models' })).json();
  assert.equal(catalog.data[0].id, 'legacy-io-model');
  assert.equal(calls[0].url, 'https://api.io.net/v1/models?page_size=100');
  await call({ model: 'legacy-io-model', messages: [{ role: 'user', content: 'Вопрос' }], reasoning_content: false });
  assert.equal(calls[1].url, 'https://api.io.net/v1/chat/completions');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer io-default');
  assert.equal(JSON.parse(calls[1].init.body).reasoning_content, false);
});

test('guest requests preserve the Questions prompt and limit; chat can pass bounded history', async () => {
  const calls = [];
  const { client, storage } = fixture(async (url, options) => { calls.push({ url, ...options }); return answer('Вот первый ответ. Он достаточно подробный.'); });
  await client.fetchAnswerOnce('Вопрос', 'fast');
  let body = JSON.parse(calls[0].body);
  assert.deepEqual(body.messages, [{ role: 'system', content: 'Existing Questions prompt' }, { role: 'user', content: 'Вопрос' }]);
  assert.equal(body.max_completion_tokens, 1000);
  assert.equal(body.provider, 'groq');
  assert.equal(body.userApiKey, null);
  assert.equal(calls[0].headers.Authorization, undefined);
  storage.set('groq_api_key_override', 'test-key');
  const messages = [{ role: 'system', content: 'Roadmap' }, { role: 'user', content: 'Практика' }];
  await client.fetchAnswerOnce('Практика', 'fast', { messages });
  body = JSON.parse(calls[1].body);
  assert.deepEqual(body.messages, messages);
  assert.equal(body.userApiKey, 'test-key');
});

test('first completed model wins; late answers stay available and unsent models cost nothing', async () => {
  const pending = new Map();
  const { client, timers } = fixture((url, options) => new Promise(resolve => pending.set(JSON.parse(options.body).model, resolve)));
  const additional = [];
  const result = client.requestBatchWithTimeout('Вопрос', ['slow', 'fast', 'unused'], null, value => additional.push(value));
  const attempts = timers.slice();
  assert.deepEqual(attempts.map(t => t.delay), [0, 5000, 10000]);
  const slow = attempts[0].run();
  const fast = attempts[1].run();
  pending.get('fast')(answer('Быстрый ответ готов. Он содержит пояснение.'));
  assert.equal((await result).model, 'fast');
  await fast;
  await attempts[2].run();
  assert.equal(pending.has('unused'), false);
  pending.get('slow')(answer('Поздний ответ готов. Он содержит пояснение.'));
  await slow;
  assert.equal(additional.length, 1);
  assert.equal(additional[0].model, 'slow');
  assert.equal(client.readModelTimings().fast.count, 1);
});

test('network failure tries the second existing endpoint and never treats reasoning as an answer', async () => {
  let calls = 0;
  const { client } = fixture(async () => {
    if (++calls === 1) throw new TypeError('Network unavailable');
    return new Response(JSON.stringify({ choices: [{ message: { content: '', reasoning_content: 'internal' } }] }));
  });
  await assert.rejects(client.fetchAnswerOnce('Вопрос', 'fast'), /Empty AI answer/);
  assert.equal(calls, 2);
  assert.equal(client.readModelFailures().fast.count, 1);
});

test('safety labels and one-sentence answers never win; the next model starts immediately', async () => {
  for (const rejectedAnswer of ['User Safety: safe', 'Откройте Chrome и нажмите кнопку входа.']) {
    const calls = [];
    const { client, timers } = fixture(async (_url, options) => {
      const model = JSON.parse(options.body).model;
      calls.push(model);
      return answer(model === 'slow' ? rejectedAnswer : 'Откройте Chrome через Selenium. Затем нажмите кнопку входа.');
    });
    const result = client.requestBatchWithTimeout('Как войти?', ['slow', 'fast'], null, null);
    await timers[0].run();
    assert.equal((await result).model, 'fast');
    assert.deepEqual(calls, ['slow', 'fast']);
    assert.equal(timers[1].cancelled, true);
    assert.equal(client.readModelFailures().slow.count, 1);
    assert.equal(client.readModelTimings().slow, undefined);
  }
});

test('a late safety-only response is not added as an alternative answer', async () => {
  const pending = new Map();
  const { client, timers } = fixture((_url, options) => new Promise(resolve => pending.set(JSON.parse(options.body).model, resolve)));
  const additional = [];
  const result = client.requestBatchWithTimeout('Вопрос', ['slow', 'fast'], null, value => additional.push(value));
  const slow = timers[0].run();
  const fast = timers[1].run();
  pending.get('fast')(answer('Первое полезное предложение. Второе полезное предложение.'));
  assert.equal((await result).model, 'fast');
  await fast;
  pending.get('slow')(answer('User Safety: safe'));
  await slow;
  assert.equal(additional.length, 0);
});

test('Groq discovery keeps active free chat models and ignores audio and guard models', () => {
  const { client } = fixture(async () => answer('Ответ готов. Есть пояснение.'));
  const models = client.normalizeAvailableChatModels([
    { id: 'whisper-large-v3', active: true },
    { id: 'openai/gpt-oss-120b', active: true },
    { id: 'openai/gpt-oss-safeguard-20b', active: true },
    { id: 'openai/gpt-oss-20b', active: false },
    { id: 'qwen/qwen3.8-27b', active: true },
    { id: 'llama-3.3-70b-versatile', active: true }
  ]);
  assert.deepEqual(models, ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b']);
});

test('a recent bad answer demotes its model before the next question', () => {
  const { client, context } = fixture(async () => answer('Ответ готов. Есть пояснение.'));
  context.currentModels = ['openai/gpt-oss-20b', 'alternative'];
  client.recordModelFailure('openai/gpt-oss-20b', 'safety_label');
  assert.deepEqual(Array.from(client.getModelOrder()), ['alternative', 'openai/gpt-oss-20b']);
});

test('cached model lists are scoped to the key without saving the key itself', () => {
  const { modelCacheScope } = fixture(async () => answer('Ответ готов. Есть пояснение.'));
  assert.equal(modelCacheScope(''), 'primary');
  assert.notEqual(modelCacheScope('user-key-one'), modelCacheScope('user-key-two'));
  assert.equal(modelCacheScope('user-key-one').includes('user-key-one'), false);
});

test('fallback contains only Groq models listed in its free plan', () => {
  const { fallbackModels } = fixture(async () => answer('Ответ готов. Есть пояснение.'));
  assert.deepEqual(Array.from(fallbackModels).sort(), [
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b'
  ].sort());
});

test('Groq rate-limit errors do not ask the user to replace a valid key', async () => {
  const { client } = fixture(async () => new Response(JSON.stringify({ error: { message: 'Rate limit reached for model openai/gpt-oss-20b' } }), { status: 429 }));
  await assert.rejects(client.fetchAnswerOnce('Вопрос', 'openai/gpt-oss-20b'), error => error.code === 'AI_RATE_LIMITED');
});

test('manual comparison tries other available models in a circle, then the current model', () => {
  const { nextComparisonOrder } = fixture(async () => answer('Ответ готов. Есть пояснение.'));
  const original = ['llama', 'gemma', 'glm', 'nemotron'];
  const available = ['llama', 'glm', 'nemotron'];
  assert.deepEqual(Array.from(nextComparisonOrder(original, 'llama', ['llama', 'glm'], available)), ['nemotron', 'llama']);
  assert.deepEqual(Array.from(nextComparisonOrder(original, 'nemotron', ['nemotron'], available)), ['llama', 'glm', 'nemotron']);
  assert.deepEqual(Array.from(nextComparisonOrder(original, 'llama', ['llama', 'glm', 'nemotron'], available)), ['llama']);
});

test('manual comparison keeps the existing fallback when its first model fails', async () => {
  const calls = [];
  const { client, timers } = fixture(async (_url, options) => {
    const model = JSON.parse(options.body).model;
    calls.push(model);
    return answer(model === 'gemma' ? 'User Safety: safe' : 'Первое объяснение понятно. Второе предложение раскрывает тему.');
  });
  const result = client.requestBatchWithTimeout('Тот же вопрос', ['gemma', 'glm'], null, null);
  await timers[0].run();
  assert.equal((await result).model, 'glm');
  assert.deepEqual(calls, ['gemma', 'glm']);
});

test('model-specific credit failure tries the next model without treating the key as exhausted', async () => {
  const calls = [];
  const { client, timers } = fixture(async (_url, options) => {
    const model = JSON.parse(options.body).model;
    calls.push(model);
    if (model === 'alternative') {
      return new Response(JSON.stringify({ detail: 'Insufficient credits for model alternative' }), { status: 402 });
    }
    return answer('Повторный ответ готов. Он содержит другое пояснение.');
  });
  const result = client.requestBatchWithTimeout('Тот же вопрос', ['alternative', 'current'], null, null);
  await timers[0].run();
  assert.equal((await result).model, 'current');
  assert.deepEqual(calls, ['alternative', 'current']);
  assert.equal(client.readModelFailures().alternative.reasons.model_credits_exhausted, 1);
});

test('all models without credits produce a distinct key-replacement error', async () => {
  const { client, timers } = fixture(async (_url, options) => {
    const model = JSON.parse(options.body).model;
    return new Response(JSON.stringify({ detail: `Insufficient credits for model ${model}` }), { status: 402 });
  });
  const result = client.requestBatchWithTimeout('Тот же вопрос', ['alternative', 'current'], null, null);
  await timers[0].run();
  await assert.rejects(result, batch => {
    assert.equal(batch.modelCreditFailureCount, 2);
    assert.equal(batch.apiKeyFailureCount, 0);
    assert.equal(client.isAllModelsCreditsExhaustedError(batch.error), true);
    return true;
  });
});

test('failed cloud save queues an AI answer and retries it when the connection returns', async () => {
  const stored = new Map();
  const storage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  };
  let attempts = 0;
  const sandbox = {
    console, AbortController, setTimeout, clearTimeout, localStorage: storage,
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return new Response(JSON.stringify([{ id: 'saved-answer-id' }]), { status: 201 });
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../questions-cloud-sync.shared.js'), 'utf8'), sandbox);
  const controller = sandbox.QuestionsCloudSyncShared.create({
    localStorage: storage,
    getSupabaseStore: () => ({ url: 'https://example.supabase.co', anonKey: 'publishable-test' }),
    getAuthUser: () => ({ id: 'user-id' }),
    getActiveSession: async () => ({ access_token: 'session-token' }),
    ensureAuthContext: async () => true,
    cloudOpTimeoutMs: 100,
    restTimeoutMs: 100
  });
  const response = { answer: 'Сохранённый ответ', model: 'openai/gpt-oss-20b' };
  assert.equal(await controller.saveAiAnswer('question-id', 'append', response), null);
  assert.equal(controller.hasPendingCloudWork(), true);
  assert.equal(controller.readPendingMutations()[0].type, 'saveAiAnswer');
  await controller.flushPendingMutations();
  assert.equal(controller.readPendingMutations().length, 0);
  assert.equal(attempts, 2);
});
