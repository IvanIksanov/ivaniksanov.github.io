const test = require('node:test');
const assert = require('node:assert/strict');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

globalThis.localStorage = createStorage();
const shared = require('../trainers/shared.js');

test('state returns defaults and persists a versioned patch', () => {
  const state = shared.state('demo', {
    storageKey: 'test_state_patch',
    version: 2,
    versionKey: 'checklistVersion',
    defaults: { open: false, answers: {}, verified: false }
  });

  assert.deepEqual(state.get(), { open: false, answers: {}, verified: false });
  state.patch({ open: true, answers: { demo: 'pass' } });

  const restored = shared.state('demo', {
    storageKey: 'test_state_patch',
    version: 2,
    versionKey: 'checklistVersion',
    defaults: { open: false, answers: {}, verified: false }
  });

  assert.equal(restored.get().open, true);
  assert.deepEqual(restored.get().answers, { demo: 'pass' });
  assert.equal(JSON.parse(localStorage.getItem('test_state_patch')).checklistVersion, 2);
});

test('state resets data from an older checklist version', () => {
  localStorage.setItem('test_state_version', JSON.stringify({
    checklistVersion: 1,
    open: true,
    answers: { old: 'pass' }
  }));

  const state = shared.state('demo-version', {
    storageKey: 'test_state_version',
    version: 2,
    versionKey: 'checklistVersion',
    defaults: { open: false, answers: {}, verified: false }
  });

  assert.deepEqual(state.get(), { open: false, answers: {}, verified: false });
});

test('progress counts passed, failed and answered checks', () => {
  localStorage.setItem('test_progress', JSON.stringify({
    answers: { first: 'pass', second: 'fail', third: 'pass', fourth: '' }
  }));

  assert.deepEqual(shared.progress({ storageKey: 'test_progress', total: 5 }), {
    total: 5,
    passed: 2,
    failed: 1,
    answered: 3,
    percent: 60
  });
});
