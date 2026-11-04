/* Код-полигон: SQL и API на локальном стенде. */
(() => {
  'use strict';

  const tasks = Array.isArray(window.QAtoDevCodeLabTasks?.tasks)
    ? window.QAtoDevCodeLabTasks.tasks
    : [];
  const tracks = Array.isArray(window.QAtoDevCodeLabTasks?.tracks)
    ? window.QAtoDevCodeLabTasks.tracks
    : [];
  const PROGRESS_KEY = 'qatodev_code_lab_v1';
  const SQL_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2';

  const el = {
    solved: document.getElementById('cl-solved'),
    tracks: document.getElementById('cl-tracks'),
    taskStrip: document.getElementById('cl-task-strip'),
    difficulty: document.getElementById('cl-difficulty'),
    topics: document.getElementById('cl-topics'),
    title: document.getElementById('cl-title'),
    description: document.getElementById('cl-description'),
    hints: document.getElementById('cl-hints'),
    editorLang: document.getElementById('cl-editor-lang'),
    editorNote: document.getElementById('cl-editor-note'),
    editor: document.getElementById('cl-editor'),
    reset: document.getElementById('cl-reset'),
    run: document.getElementById('cl-run'),
    result: document.getElementById('cl-result'),
    status: document.getElementById('cl-status'),
    resultBody: document.getElementById('cl-result-body')
  };

  if (!el.editor || !el.run || !tasks.length) return;

  let currentTrack = 'sql';
  let currentTask = null;
  let editor = null;
  let sqlRuntimePromise = null;
  let draftTimer = 0;
  let busy = false;

  function readProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      return {
        solved: Array.isArray(data.solved) ? data.solved.filter(Boolean) : [],
        drafts: data.drafts && typeof data.drafts === 'object' && !Array.isArray(data.drafts) ? data.drafts : {},
        track: data.track === 'api' ? 'api' : 'sql',
        taskId: typeof data.taskId === 'string' ? data.taskId : ''
      };
    } catch {
      return { solved: [], drafts: {}, track: 'sql', taskId: '' };
    }
  }

  let progress = readProgress();

  function saveProgress(patch = {}) {
    progress = { ...progress, ...patch };
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch {}
  }

  function saveDraft(taskId, code) {
    if (!taskId) return;
    const drafts = { ...(progress.drafts || {}), [taskId]: code };
    saveProgress({ drafts });
  }

  function makeFallbackEditor(container) {
    const textarea = document.createElement('textarea');
    textarea.className = 'cl-editor-fallback';
    textarea.spellcheck = false;
    container.textContent = '';
    container.appendChild(textarea);
    return {
      getValue: () => textarea.value,
      setValue: (value) => { textarea.value = value; },
      session: {
        setMode() {},
        on(event, callback) {
          if (event === 'change') textarea.addEventListener('input', callback);
        }
      },
      commands: { addCommand() {} },
      resize() {},
      setTheme() {},
      renderer: { setScrollMargin() {} }
    };
  }

  function createEditor() {
    if (!window.ace) return makeFallbackEditor(el.editor);
    const instance = window.ace.edit(el.editor);
    instance.setOptions({
      useWorker: false,
      showPrintMargin: false,
      fontSize: '13px',
      wrap: true,
      tabSize: 2,
      highlightActiveLine: true,
      displayIndentGuides: false
    });
    instance.renderer.setScrollMargin(8, 8, 0, 0);
    instance.session.on('change', () => {
      if (!currentTask) return;
      window.clearTimeout(draftTimer);
      draftTimer = window.setTimeout(() => saveDraft(currentTask.id, instance.getValue()), 350);
    });
    instance.commands.addCommand({
      name: 'run-code-lab',
      bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
      exec: () => runTask()
    });
    return instance;
  }

  function syncEditorTheme() {
    if (!editor || !window.ace) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    editor.setTheme(dark ? 'ace/theme/dracula' : 'ace/theme/chrome');
  }

  function trackTasks(trackId) {
    return tasks.filter(task => task.track === trackId);
  }

  function setStatus(text, kind) {
    el.status.textContent = text;
    el.status.className = `cl-status cl-status--${kind}`;
  }

  function setBusy(next) {
    busy = next;
    el.run.disabled = next;
    el.run.textContent = next ? 'Проверяю…' : 'Запустить';
  }

  function clearResult(message = 'Запустите решение, чтобы увидеть проверку.') {
    setStatus('—', 'idle');
    el.resultBody.replaceChildren();
    const p = document.createElement('p');
    p.className = 'cl-muted';
    p.textContent = message;
    el.resultBody.appendChild(p);
  }

  function updateSolvedCount() {
    const solved = new Set(progress.solved || []);
    const count = tasks.filter(task => solved.has(task.id)).length;
    el.solved.textContent = `${count} / ${tasks.length}`;
  }

  function renderTracks() {
    el.tracks.replaceChildren();
    tracks.forEach(track => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cl-track';
      button.dataset.track = track.id;
      button.classList.toggle('is-active', track.id === currentTrack);
      button.setAttribute('aria-pressed', String(track.id === currentTrack));
      button.textContent = track.label;
      button.title = track.note || track.label;
      button.addEventListener('click', () => selectTrack(track.id));
      el.tracks.appendChild(button);
    });
  }

  function renderTaskStrip() {
    el.taskStrip.replaceChildren();
    const solved = new Set(progress.solved || []);
    trackTasks(currentTrack).forEach((task, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cl-task-chip';
      button.classList.toggle('is-active', currentTask?.id === task.id);
      button.classList.toggle('is-solved', solved.has(task.id));
      button.setAttribute('aria-pressed', String(currentTask?.id === task.id));
      button.textContent = `${index + 1}. ${task.title}${solved.has(task.id) ? ' ✓' : ''}`;
      button.addEventListener('click', () => selectTask(task));
      el.taskStrip.appendChild(button);
    });
    const active = el.taskStrip.querySelector('.is-active');
    if (active) {
      const target = active.offsetLeft - (el.taskStrip.clientWidth - active.offsetWidth) / 2;
      el.taskStrip.scrollLeft = Math.max(0, target);
    }
  }

  function selectTask(task) {
    if (!task) return;
    if (currentTask && editor) saveDraft(currentTask.id, editor.getValue());
    currentTask = task;
    saveProgress({ track: task.track, taskId: task.id });

    el.difficulty.textContent = task.difficulty || 'Задача';
    el.topics.replaceChildren();
    (task.topics || []).forEach(topic => {
      const chip = document.createElement('span');
      chip.textContent = topic;
      el.topics.appendChild(chip);
    });
    el.title.textContent = task.title;
    el.description.textContent = task.description || '';
    el.hints.replaceChildren();
    (task.hints || []).forEach(hint => {
      const li = document.createElement('li');
      li.textContent = hint;
      el.hints.appendChild(li);
    });
    el.editorLang.textContent = task.track === 'sql' ? 'SQL' : 'JavaScript';
    el.editorNote.textContent = task.track === 'sql'
      ? 'SQLite выполняется локально в браузере'
      : 'Mock API выполняется локально в Worker';

    if (editor) {
      editor.session.setMode(task.track === 'sql' ? 'ace/mode/sql' : 'ace/mode/javascript');
      editor.setValue((progress.drafts || {})[task.id] || task.starterCode || '', -1);
      editor.resize();
    }
    clearResult();
    renderTaskStrip();
  }

  function selectTrack(trackId) {
    currentTrack = trackId;
    renderTracks();
    const saved = progress.taskId;
    const list = trackTasks(trackId);
    const task = list.find(item => item.id === saved) || list[0];
    selectTask(task);
  }

  function normalizeCell(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number(value);
    if (typeof value === 'boolean') return value;
    return String(value);
  }

  function normalizeRows(rows, ordered) {
    const normalized = (rows || []).map(row => row.map(normalizeCell));
    if (!ordered) {
      normalized.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return normalized;
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  function rowsMatch(actual, expected, ordered) {
    return stableStringify(normalizeRows(actual, ordered)) === stableStringify(normalizeRows(expected, ordered));
  }

  function loadSqlRuntime() {
    if (sqlRuntimePromise) return sqlRuntimePromise;
    sqlRuntimePromise = new Promise((resolve, reject) => {
      const start = () => {
        if (!window.initSqlJs) {
          reject(new Error('SQLite не загрузился.'));
          return;
        }
        window.initSqlJs({ locateFile: file => `${SQL_CDN}/${file}` })
          .then(resolve)
          .catch(reject);
      };
      if (window.initSqlJs) {
        start();
        return;
      }
      const script = document.createElement('script');
      script.src = `${SQL_CDN}/sql-wasm.js`;
      script.onload = start;
      script.onerror = () => reject(new Error('Не удалось загрузить SQLite. Проверьте соединение.'));
      document.head.appendChild(script);
    }).catch(error => {
      sqlRuntimePromise = null;
      throw error;
    });
    return sqlRuntimePromise;
  }

  function tableNode(columns, rows) {
    const wrap = document.createElement('div');
    wrap.className = 'cl-table-wrap';
    const table = document.createElement('table');
    table.className = 'cl-table';
    if (Array.isArray(columns) && columns.length) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
    }
    const tbody = document.createElement('tbody');
    (rows || []).forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(value => {
        const td = document.createElement('td');
        td.textContent = value === null || value === undefined ? 'NULL' : String(value);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function codeBlock(value) {
    const pre = document.createElement('pre');
    pre.className = 'cl-pre';
    pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return pre;
  }

  async function runSqlTask(task) {
    const SQL = await loadSqlRuntime();
    const results = [];
    for (const testCase of task.cases || []) {
      const db = new SQL.Database();
      try {
        db.run(testCase.seedSql || '');
        const output = db.exec(editor.getValue());
        const last = output[output.length - 1];
        if (!last) {
          results.push({ name: testCase.name, ok: false, error: 'Запрос не вернул таблицу.' });
          continue;
        }
        const ok = rowsMatch(last.values, testCase.expected, testCase.ordered === true);
        results.push({
          name: testCase.name,
          ok,
          columns: last.columns,
          rows: last.values,
          expected: testCase.expected
        });
      } catch (error) {
        results.push({ name: testCase.name, ok: false, error: String(error?.message || error) });
      } finally {
        db.close();
      }
    }
    renderSqlResults(results);
  }

  const API_WORKER_SOURCE = `
    self.onmessage = async (event) => {
      const data = event.data || {};
      const code = String(data.code || '');
      const mocks = Array.isArray(data.mocks) ? data.mocks : [];
      const calls = [];
      function makeResponse(spec) {
        const status = Number(spec && spec.status) || 200;
        const body = spec ? spec.body : null;
        const headers = Object.assign({ 'content-type': 'application/json' }, (spec && spec.headers) || {});
        return {
          ok: status >= 200 && status < 300,
          status,
          headers: {
            get(name) {
              const key = String(name || '').toLowerCase();
              return headers[key] ?? headers[name] ?? null;
            }
          },
          async json() { return JSON.parse(JSON.stringify(body)); },
          async text() { return typeof body === 'string' ? body : JSON.stringify(body); }
        };
      }
      async function mockFetch(input, init = {}) {
        const raw = typeof input === 'string' ? input : String(input?.url || input);
        let path = raw;
        try { path = new URL(raw, 'http://local').pathname; } catch {}
        const method = String(init?.method || 'GET').toUpperCase();
        const mock = mocks.find(item => item.method === method && item.path === path)
          || mocks.find(item => item.method === method && item.path === '*');
        const response = mock ? mock.response : { status: 404, body: { error: 'not found' } };
        calls.push({ method, url: raw, status: Number(response.status) || 200 });
        return makeResponse(response);
      }
      self.XMLHttpRequest = undefined;
      self.WebSocket = undefined;
      self.importScripts = () => { throw new Error('importScripts disabled'); };
      self.fetch = mockFetch;
      try {
        const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
        const fn = new AsyncFunction('fetch', code);
        const result = await fn(mockFetch);
        self.postMessage({ ok: true, result, calls });
      } catch (error) {
        self.postMessage({ ok: false, error: String(error?.message || error), calls });
      }
    };
  `;

  function runApiCase(code, mocks) {
    return new Promise(resolve => {
      const blob = new Blob([API_WORKER_SOURCE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(value);
      };
      const timer = window.setTimeout(() => {
        finish({ ok: false, error: 'Таймаут: код выполнялся дольше 3 секунд.', calls: [] });
      }, 3000);
      worker.onmessage = event => finish(event.data || { ok: false, error: 'Пустой ответ Worker.' });
      worker.onerror = event => finish({ ok: false, error: event.message || 'Ошибка Worker.', calls: [] });
      worker.postMessage({ code, mocks });
    });
  }

  async function runApiTask(task) {
    const results = [];
    for (const testCase of task.cases || []) {
      const response = await runApiCase(editor.getValue(), testCase.mocks || []);
      const ok = response.ok === true && stableStringify(response.result) === stableStringify(testCase.expected);
      results.push({
        name: testCase.name,
        ok,
        expected: testCase.expected,
        actual: response.result,
        calls: response.calls || [],
        error: response.error
      });
    }
    renderApiResults(results);
  }

  function caseRow(result) {
    const row = document.createElement('div');
    row.className = 'cl-case-row';
    const dot = document.createElement('span');
    dot.className = `cl-dot ${result.ok ? 'is-pass' : 'is-fail'}`;
    const name = document.createElement('span');
    name.className = 'cl-case-name';
    name.textContent = result.name || 'Проверка';
    const state = document.createElement('span');
    state.className = 'cl-case-state';
    state.textContent = result.ok ? 'OK' : 'Ошибка';
    row.append(dot, name, state);
    return row;
  }

  function renderSummary(results, kind) {
    const passed = results.filter(result => result.ok).length;
    const total = results.length;
    setStatus(passed === total ? 'Готово' : `${passed} / ${total}`, passed === total ? 'pass' : 'fail');
    el.resultBody.replaceChildren();

    const cases = document.createElement('div');
    cases.className = 'cl-cases';
    results.forEach(result => cases.appendChild(caseRow(result)));
    el.resultBody.appendChild(cases);

    results.forEach(result => {
      if (result.ok) return;
      const block = document.createElement('div');
      block.className = 'cl-fail-block';
      const title = document.createElement('div');
      title.className = 'cl-fail-title';
      title.textContent = result.name || 'Проверка';
      block.appendChild(title);

      if (result.error) {
        const error = document.createElement('p');
        error.className = 'cl-error-text';
        error.textContent = result.error;
        block.appendChild(error);
        el.resultBody.appendChild(block);
        return;
      }

      if (kind === 'sql') {
        const expectedLabel = document.createElement('p');
        expectedLabel.className = 'cl-label';
        expectedLabel.textContent = 'Ожидаемый результат';
        block.appendChild(expectedLabel);
        block.appendChild(tableNode(null, result.expected));
        const actualLabel = document.createElement('p');
        actualLabel.className = 'cl-label';
        actualLabel.textContent = 'Ваш результат';
        block.appendChild(actualLabel);
        block.appendChild(tableNode(result.columns, result.rows));
      } else {
        const expectedLabel = document.createElement('p');
        expectedLabel.className = 'cl-label';
        expectedLabel.textContent = 'Ожидаемое значение';
        block.appendChild(expectedLabel);
        block.appendChild(codeBlock(result.expected));
        const actualLabel = document.createElement('p');
        actualLabel.className = 'cl-label';
        actualLabel.textContent = 'Получено';
        block.appendChild(actualLabel);
        block.appendChild(codeBlock(result.actual));
      }

      if (result.calls?.length) {
        const calls = document.createElement('p');
        calls.className = 'cl-calls';
        calls.textContent = result.calls.map(call => `${call.method} ${call.url} → ${call.status}`).join(' · ');
        block.appendChild(calls);
      }
      el.resultBody.appendChild(block);
    });

    if (passed === total) {
      const first = results[0];
      if (kind === 'sql' && first?.rows) {
        const label = document.createElement('p');
        label.className = 'cl-label';
        label.textContent = 'Результат';
        el.resultBody.appendChild(label);
        el.resultBody.appendChild(tableNode(first.columns, first.rows));
      } else if (kind === 'api') {
        const label = document.createElement('p');
        label.className = 'cl-label';
        label.textContent = 'Результат';
        el.resultBody.appendChild(label);
        el.resultBody.appendChild(codeBlock(first?.actual));
        const calls = results.flatMap(result => result.calls || []);
        if (calls.length) {
          const callLine = document.createElement('p');
          callLine.className = 'cl-calls';
          callLine.textContent = calls.map(call => `${call.method} ${call.url} → ${call.status}`).join(' · ');
          el.resultBody.appendChild(callLine);
        }
      }
      const solved = new Set(progress.solved || []);
      if (currentTask && !solved.has(currentTask.id)) {
        solved.add(currentTask.id);
        saveProgress({ solved: [...solved] });
        updateSolvedCount();
        renderTaskStrip();
      }
    }
  }

  function renderSqlResults(results) {
    renderSummary(results, 'sql');
  }

  function renderApiResults(results) {
    renderSummary(results, 'api');
  }

  async function runTask() {
    if (busy || !currentTask || !editor) return;
    saveDraft(currentTask.id, editor.getValue());
    setBusy(true);
    setStatus('Проверяю…', 'loading');
    el.resultBody.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'cl-muted';
    loading.textContent = currentTask.track === 'sql' ? 'Загружаю SQLite…' : 'Выполняю локальный запрос…';
    el.resultBody.appendChild(loading);

    try {
      if (currentTask.track === 'sql') await runSqlTask(currentTask);
      else await runApiTask(currentTask);
    } catch (error) {
      setStatus('Ошибка', 'fail');
      el.resultBody.replaceChildren();
      const message = document.createElement('p');
      message.className = 'cl-error-text';
      message.textContent = String(error?.message || error);
      el.resultBody.appendChild(message);
    } finally {
      setBusy(false);
    }
  }

  function resetTask() {
    if (!currentTask || !editor) return;
    editor.setValue(currentTask.starterCode || '', -1);
    saveDraft(currentTask.id, currentTask.starterCode || '');
    clearResult('Шаблон восстановлен. Запустите решение.');
    editor.focus();
  }

  function init() {
    editor = createEditor();
    editor.setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'ace/theme/dracula' : 'ace/theme/chrome');
    new MutationObserver(syncEditorTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    renderTracks();
    updateSolvedCount();
    selectTrack(progress.track || 'sql');

    el.run.addEventListener('click', runTask);
    el.reset.addEventListener('click', resetTask);
  }

  init();
})();
