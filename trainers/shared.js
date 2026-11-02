/* Shared trainer kit: state, QA panel, checklist and progress helpers. */
(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const NS = root.QATrainers = root.QATrainers || {};

  function clone(value) {
    if (value == null || typeof value !== 'object') return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return Array.isArray(value) ? [] : {};
    }
  }

  function readJSON(key, fallback) {
    try {
      const raw = root.localStorage.getItem(key);
      if (!raw) return clone(fallback);
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }

  function writeJSON(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  NS.clone = clone;
  NS.readJSON = readJSON;
  NS.writeJSON = writeJSON;

  NS.state = function state(id, options) {
    const config = options || {};
    const storageKey = config.storageKey || `qatodev.trainer.${id}.v1`;
    const version = config.version || 1;
    const versionKey = config.versionKey || 'version';
    const defaults = clone(config.defaults || {});
    let data = null;

    function normalize(value) {
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      if (source[versionKey] !== version) return clone(defaults);
      return Object.assign(clone(defaults), source);
    }

    function load() {
      if (!data) data = normalize(readJSON(storageKey, {}));
      return data;
    }

    function save() {
      const value = load();
      value[versionKey] = version;
      writeJSON(storageKey, value);
      return clone(value);
    }

    return {
      key: storageKey,
      get() {
        return clone(load());
      },
      patch(partial) {
        data = Object.assign(load(), partial || {});
        save();
        return clone(data);
      },
      set(next) {
        data = normalize(next || {});
        save();
        return clone(data);
      },
      reset() {
        data = clone(defaults);
        save();
        return clone(data);
      },
      save
    };
  };

  NS.progress = function progress(options) {
    const config = options || {};
    const data = readJSON(config.storageKey, {});
    const answers = data && typeof data.answers === 'object' && !Array.isArray(data.answers) ? data.answers : {};
    const total = Number(config.total) || 0;
    const passed = Object.values(answers).filter(value => value === 'pass').length;
    const failed = Object.values(answers).filter(value => value === 'fail').length;
    const answered = passed + failed;
    return {
      total,
      passed,
      failed,
      answered,
      percent: total ? Math.round((answered / total) * 100) : 0
    };
  };

  function splitClasses(value) {
    return String(value || '').split(/\s+/).filter(Boolean);
  }

  NS.panel = function panel(options) {
    const config = options || {};
    const fab = config.fab;
    const panelEl = config.panel;
    const close = config.close;
    const body = config.body;
    const store = config.state || null;
    const openClasses = splitClasses(config.openClass || 'trainer-qa-open');
    if (!fab || !panelEl) return null;

    let scrollFrame = 0;
    let restoringScroll = false;

    function isOpen() {
      return panelEl.getAttribute('aria-hidden') === 'false';
    }

    function saveScroll() {
      if (!body || !store) return;
      store.patch({ scrollTop: Math.max(0, body.scrollTop) });
    }

    function setOpen(open, settings) {
      const next = Boolean(open);
      const silent = settings?.silent === true;
      if (!next && isOpen()) saveScroll();
      panelEl.setAttribute('aria-hidden', String(!next));
      panelEl.inert = !next;
      fab.setAttribute('aria-expanded', String(next));
      openClasses.forEach(className => document.body.classList.toggle(className, next));
      if (next) {
        if (body && store) {
          restoringScroll = true;
          requestAnimationFrame(() => {
            body.scrollTop = Math.max(0, Number(store.get().scrollTop) || 0);
            restoringScroll = false;
          });
        }
        if (settings?.focus !== false) close?.focus({ preventScroll: true });
        config.onOpen?.();
      } else {
        if (settings?.focus !== false) fab.focus({ preventScroll: true });
        config.onClose?.();
      }
      if (!silent) config.onChange?.(next);
      return next;
    }

    fab.addEventListener('click', () => setOpen(true));
    close?.addEventListener('click', () => setOpen(false));

    if (body && store) {
      body.addEventListener('scroll', () => {
        if (restoringScroll || scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          saveScroll();
        });
      }, { passive: true });
      window.addEventListener('pagehide', () => {
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        if (isOpen()) saveScroll();
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isOpen()) setOpen(false);
    });

    return {
      isOpen,
      setOpen,
      saveScroll
    };
  };

  NS.checklist = function checklist(options) {
    const config = options || {};
    const groups = Array.isArray(config.groups) ? config.groups : [];
    const total = groups.reduce((count, group) => count + (Array.isArray(group.checks) ? group.checks.length : 0), 0);
    const store = NS.state(config.id || 'checklist', {
      storageKey: config.storageKey,
      version: config.version || 1,
      versionKey: config.versionKey || 'version',
      defaults: {
        open: false,
        answers: {},
        verified: false,
        scrollTop: 0
      }
    });
    const state = store.get();
    let answers = state.answers && typeof state.answers === 'object' && !Array.isArray(state.answers)
      ? Object.assign({}, state.answers) : {};
    let verified = state.verified === true;

    const fab = document.querySelector(config.fab);
    const panelEl = document.querySelector(config.panel);
    const close = document.querySelector(config.close);
    const body = document.querySelector(config.body);
    const list = document.querySelector(config.list);
    const progress = document.querySelector(config.progress);
    const verify = document.querySelector(config.verify);
    if (!fab || !panelEl || !list || !progress || !verify) return null;

    function persist(partial) {
      store.patch(Object.assign({ answers, verified }, partial || {}));
    }

    function updateSummary() {
      const values = groups.flatMap(group => (group.checks || []).map(([id]) => answers[id]));
      const passed = values.filter(value => value === 'pass').length;
      const failed = values.filter(value => value === 'fail').length;
      const answered = passed + failed;
      const summary = { total, passed, failed, answered };
      progress.textContent = config.formatProgress?.(summary) || `Проверено: ${answered} из ${total}`;
      verify.classList.toggle('is-verified', verified);
      verify.style.setProperty('--trainer-qa-pass-width', `${total ? (passed / total) * 100 : 0}%`);
      verify.textContent = verified
        ? (config.formatVerified?.(summary) || `Верно: ${passed} из ${total}`)
        : (config.verifyLabel || 'Проверить регресс');
      verify.setAttribute('aria-label', verified
        ? (config.verifyAriaLabel?.(summary)
          || `Результат: Passed — ${passed}, Failed — ${failed}, без оценки — ${total - answered}`)
        : (config.verifyLabel || 'Проверить регресс'));
    }

    function render() {
      list.replaceChildren();
      groups.forEach(group => {
        const section = document.createElement('section');
        section.className = 'trainer-qa-group';
        const heading = document.createElement('h3');
        heading.textContent = group.title || '';
        const checks = document.createElement('ul');
        (group.checks || []).forEach(([id, description]) => {
          const item = document.createElement('li');
          item.className = 'trainer-qa-check';
          item.dataset.checkId = id;
          const row = document.createElement('div');
          row.className = 'trainer-qa-check-row';
          const text = document.createElement('span');
          text.className = 'trainer-qa-check-text';
          text.textContent = description;
          const choices = document.createElement('div');
          choices.className = 'trainer-qa-choices';
          choices.setAttribute('role', 'group');
          choices.setAttribute('aria-label', `Результат: ${description}`);
          [['pass', 'Passed'], ['fail', 'Failed']].forEach(([value, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.result = value;
            button.textContent = label;
            button.setAttribute('aria-pressed', String(answers[id] === value));
            choices.append(button);
          });
          row.append(text, choices);
          item.append(row);
          checks.append(item);
        });
        section.append(heading, checks);
        list.append(section);
      });
      updateSummary();
    }

    const panel = NS.panel({
      fab,
      panel: panelEl,
      close,
      body,
      state: store,
      openClass: config.openClass || 'trainer-qa-open',
      onOpen: config.onOpen,
      onClose: config.onClose,
      onChange: open => persist({ open })
    });

    list.addEventListener('click', event => {
      const button = event.target.closest('button[data-result]');
      const item = button?.closest('[data-check-id]');
      if (!item || !button) return;
      const id = item.dataset.checkId;
      const value = button.dataset.result;
      if (answers[id] === value) delete answers[id];
      else answers[id] = value;
      verified = false;
      item.querySelectorAll('button[data-result]').forEach(choice => {
        choice.setAttribute('aria-pressed', String(answers[id] === choice.dataset.result));
      });
      updateSummary();
      persist();
    });

    verify.addEventListener('click', () => {
      verified = true;
      updateSummary();
      persist();
    });

    render();
    panel?.setOpen(state.open === true, { focus: false, silent: true });
    return { store, panel, updateSummary, render };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})();
