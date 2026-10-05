/* Roadmap owns conversations; the shared Questions engine owns model requests. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', async () => {
    const el = id => document.getElementById(`roadmap-chat-${id}`);
    const panel = document.getElementById('roadmap-chat');
    if (!panel || !window.QAtoDevAiClient) return;
    const LEGACY_STORAGE = 'roadmap_ai_conversations_v1';
    const STORAGE_PREFIX = 'roadmap_ai_conversations_v2_';
    const LEGACY_OWNER = 'roadmap_ai_legacy_owner_v1';
    const read = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    };
    let currentUserId = '';
    let storageKey = `${STORAGE_PREFIX}guest`;
    function loadConversations(userId = '') {
      let stored = read(`${STORAGE_PREFIX}${userId || 'guest'}`, null);
      let fromLegacy = false;
      if (!stored) {
        const owner = localStorage.getItem(LEGACY_OWNER);
        if ((!userId && !owner) || (userId && (!owner || owner === userId))) {
          stored = read(LEGACY_STORAGE, {});
          fromLegacy = !!userId;
          if (userId && !owner) localStorage.setItem(LEGACY_OWNER, userId);
        }
      }
      const result = new Map();
      // Persisted text is untrusted: validate records and render through textContent.
      for (const [id, value] of Object.entries(stored || {}).slice(-30)) {
        if (!/^[a-z\d_-]{1,100}$/i.test(id) || !value || !Array.isArray(value.turns)) continue;
        const turns = value.turns.filter(t => t && typeof t.question === 'string' && Array.isArray(t.answers)).slice(-12).map(t => {
          const answers = t.answers.filter(a => a && typeof a.answer === 'string' && typeof a.model === 'string').slice(0, 5).map(a => ({ answer: a.answer.slice(0, 16000), model: a.model, elapsedMs: Number(a.elapsedMs) || 0, kind: a.kind === 'comparison' ? 'comparison' : 'auto' }));
          const createdAt = Number(t.createdAt) || Number(t.id) || Date.now();
          return {
            id: String(t.id || crypto.randomUUID()).slice(0, 100), question: t.question.slice(0, 3000),
            selected: Number.isInteger(t.selected) ? Math.max(0, Math.min(t.selected, answers.length - 1)) : 0,
            modelOrder: Array.isArray(t.modelOrder) ? t.modelOrder.filter(model => typeof model === 'string').slice(0, 20) : [],
            comparisonCount: Math.min(2, Math.max(0, Number(t.comparisonCount) || answers.filter(a => a.kind === 'comparison').length)),
            answers, createdAt, updatedAt: Number(t.updatedAt) || createdAt,
            errorCode: t.errorCode === 'credits-exhausted' ? 'credits-exhausted' : '',
            error: t.errorCode === 'credits-exhausted' || answers.length ? '' : 'Ответ не сохранён. Отправьте вопрос ещё раз.'
          };
        });
        result.set(id, { turns, draft: typeof value.draft === 'string' ? value.draft.slice(0, 3000) : '' });
      }
      if (fromLegacy && [...result.values()].some(chat => chat.turns.some(turn => turn.answers.length))) {
        try { localStorage.setItem(`roadmap_ai_pending_sync_v1_${userId}`, crypto.randomUUID()); } catch {}
      }
      return result;
    }
    let conversations = loadConversations();
    const cloudSignature = () => JSON.stringify([...conversations].map(([id, chat]) => [id, chat.turns
      .filter(turn => turn.answers.length)
      .map(turn => [turn.id, turn.question, turn.answers, turn.selected, turn.modelOrder, turn.comparisonCount, turn.updatedAt])])
      .filter(([, turns]) => turns.length));
    let lastCloudSignature = cloudSignature();
    let cloudSyncTimer = null;
    let cloudRetryTimer = null;
    let cloudRetryDelay = 90_000;
    let cloudSyncController = null;
    let topic = window.QAtoDevRoadmapContext || { id: 'roadmap', title: 'Roadmap', summary: '', resources: [] };
    let models = window.QAtoDevAiClient.models.slice();
    let modelsScope = '';
    let modelsFetchedAt = 0;
    let authUser = null;
    let accessToken = null;
    let active = null;
    let cloudSyncAfterActive = false;
    let pendingAuthSession;
    let initialAuthResolved = false;
    let selectedExcerpt = '';
    let collapsed = read('roadmap_ai_collapsed_v1', false) === true;
    const client = window.QAtoDevAiClient.create({
      get supabaseStore() { return window.AppSupabase; },
      get lastKnownAccessToken() { return accessToken; },
      get authUser() { return authUser; },
      get currentModels() { return models; },
      systemPrompt: '',
      refreshRanking: renderModels,
      applyModelHint(list) { models = client.normalizeAvailableChatModels(list); renderModels(); }
    });
    function conversation(id = topic.id) {
      if (!conversations.has(id)) conversations.set(id, { turns: [], draft: '' });
      return conversations.get(id);
    }
    function persist() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries([...conversations].slice(-30))));
        const signature = cloudSignature();
        if (currentUserId && signature !== lastCloudSignature) {
          localStorage.setItem(`roadmap_ai_pending_sync_v1_${currentUserId}`, crypto.randomUUID());
          scheduleCloudSync(800, true);
        }
        lastCloudSignature = signature;
        el('storage').textContent = currentUserId ? 'История сохранена · синхронизация с аккаунтом' : 'История сохранена в этом браузере';
      } catch { el('storage').textContent = 'Не удалось сохранить: хранилище браузера недоступно или заполнено'; }
    }
    function scheduleCloudSync(delay = 250, force = false) {
      if (!currentUserId || !cloudSyncController || navigator.onLine === false) return;
      if (active) { cloudSyncAfterActive = true; return; }
      const userId = currentUserId;
      const pendingKey = `roadmap_ai_pending_sync_v1_${userId}`;
      const recentKey = `roadmap_ai_recent_sync_v1_${userId}`;
      const attemptKey = `roadmap_ai_sync_attempt_v1_${userId}`;
      try {
        const pending = localStorage.getItem(pendingKey);
        const attempt = JSON.parse(sessionStorage.getItem(attemptKey) || 'null');
        if (!force && pending && attempt?.stamp === pending && Date.now() - attempt.at < 60_000) return;
        if (!force && !pending && Date.now() - Number(sessionStorage.getItem(recentKey)) < 300_000) return;
      } catch {}
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = setTimeout(() => {
        let pendingStamp = null;
        try { pendingStamp = localStorage.getItem(pendingKey); } catch {}
        try {
          sessionStorage.setItem(attemptKey, JSON.stringify({ stamp: pendingStamp, at: Date.now() }));
          if (!pendingStamp) sessionStorage.setItem(recentKey, String(Date.now()));
        } catch {}
        cloudSyncController.sync(userId).then(result => {
          if (!result?.ok || currentUserId !== userId) return;
          try {
            sessionStorage.setItem(recentKey, String(Date.now()));
            if (localStorage.getItem(pendingKey) === pendingStamp) localStorage.removeItem(pendingKey);
          } catch {}
          clearTimeout(cloudRetryTimer);
          cloudRetryDelay = 90_000;
          el('storage').textContent = 'История синхронизирована с аккаунтом';
        }).catch(error => {
          console.warn('Roadmap chat sync will retry later', error);
          if (currentUserId !== userId) return;
          el('storage').textContent = 'История сохранена в браузере · синхронизация позже';
          try {
            if (localStorage.getItem(pendingKey)) {
              clearTimeout(cloudRetryTimer);
              cloudRetryTimer = setTimeout(() => scheduleCloudSync(0), cloudRetryDelay);
              cloudRetryDelay = Math.min(cloudRetryDelay * 2, 600_000);
            }
          } catch {}
        });
      }, delay);
    }
    function applyCloudState(userId, merged) {
      if (userId !== currentUserId) return false;
      if (active) { cloudSyncAfterActive = true; return false; }
      const before = JSON.stringify(conversation().turns);
      try {
        const serialized = JSON.stringify(merged);
        if (localStorage.getItem(storageKey) !== serialized) localStorage.setItem(storageKey, serialized);
        conversations = loadConversations(userId);
        lastCloudSignature = cloudSignature();
      } catch { return false; }
      if (before !== JSON.stringify(conversation().turns)) render();
      return true;
    }
    cloudSyncController = window.QAtoDevRoadmapChatSync?.create({
      getStore: () => window.AppSupabase,
      getState: () => Object.fromEntries(conversations),
      applyState: applyCloudState
    }) || null;
    function applyAuthSession(session, renderUi = true) {
      const nextUserId = session?.user?.id || '';
      if (active && nextUserId !== currentUserId) { pendingAuthSession = session; return; }
      if (nextUserId !== currentUserId) {
        persist();
        clearTimeout(cloudSyncTimer);
        clearTimeout(cloudRetryTimer);
        cloudRetryDelay = 90_000;
        currentUserId = nextUserId;
        storageKey = `${STORAGE_PREFIX}${nextUserId || 'guest'}`;
        if (nextUserId && !localStorage.getItem(LEGACY_OWNER) && localStorage.getItem(LEGACY_STORAGE)) {
          localStorage.setItem(LEGACY_OWNER, nextUserId);
        }
        conversations = loadConversations(nextUserId);
        lastCloudSignature = cloudSignature();
        if (renderUi) { el('input').value = conversation().draft; render(); }
      }
      authUser = session?.user || null;
      accessToken = session?.access_token || null;
      if (nextUserId) scheduleCloudSync(0);
    }
    function applyPendingAuthSession() {
      if (pendingAuthSession === undefined) return;
      const session = pendingAuthSession;
      pendingAuthSession = undefined;
      applyAuthSession(session);
    }
    function resumeCloudSyncAfterAnswer() {
      if (!cloudSyncAfterActive) return;
      cloudSyncAfterActive = false;
      scheduleCloudSync(0, true);
    }
    function button(label, title, action) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', action); return b;
    }
    function renderCreditNotice(section) {
      const notice = document.createElement('div');
      notice.className = 'roadmap-chat__answer roadmap-chat__limit-notice';
      notice.setAttribute('role', 'alert');
      const chip = document.createElement('span'); chip.className = 'roadmap-chat__chip'; chip.textContent = 'Помощник';
      const title = document.createElement('strong'); title.textContent = 'Сейчас модели не принимают запросы';
      const description = document.createElement('p');
      description.textContent = 'Groq сообщил о недостатке доступной квоты. Проверьте лимиты аккаунта и попробуйте позже. Если ошибка останется, проверьте используемый ключ или создайте новый:';
      const link = document.createElement('a');
      link.href = 'https://console.groq.com/keys'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = 'Открыть страницу создания ключа';
      const steps = document.createElement('ol');
      [
        'Нажмите Create API Key в кабинете Groq.',
        'Укажите любое имя ключа, например QAtoDev.',
        'Нажмите Create API Key и скопируйте созданный ключ.'
      ].forEach(text => { const step = document.createElement('li'); step.textContent = text; steps.append(step); });
      const openSettings = button('Проверить или заменить ключ', 'Открыть настройки моделей и ключа', () => {
        el('settings').hidden = false;
        el('settings-toggle').setAttribute('aria-expanded', 'true');
        el('key').focus();
      });
      openSettings.className = 'roadmap-chat__limit-action';
      notice.append(chip, title, description, link, steps, openSettings);
      section.append(notice);
    }
    function setTurnError(turn, error, fallback) {
      if (client.isAllModelsCreditsExhaustedError(error)) {
        turn.errorCode = 'credits-exhausted';
        turn.error = '';
        return;
      }
      turn.errorCode = '';
      turn.error = error?.code === 'AI_RATE_LIMITED' ? 'Лимит Groq временно достигнут. Попробуйте позже.' : client.isRecoverableApiKeyError(error) ? 'Проверьте личный ключ и доступную квоту в «Модели и ключ».' : client.isAiRegionAvailabilityError(error) ? client.getAiRegionUnavailableMessage() : fallback;
    }
    function syncInputHeight() {
      const input = el('input');
      input.style.height = '26px';
      input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
      input.style.overflowY = input.scrollHeight > 90 ? 'auto' : 'hidden';
    }
    function renderAnswer(container, text) {
      function externalSource(url) {
        try {
          const address = new URL(url);
          const host = address.hostname.toLowerCase();
          if (!['https:', 'http:'].includes(address.protocol) || address.username || address.password) return null;
          if (!/^[a-z0-9.-]+\.[a-z][a-z0-9-]{1,}$/i.test(host) || /\.(?:local|localhost|internal|test|invalid)$/.test(host)) return null;
          return address;
        } catch { return null; }
      }
      const sources = [];
      const seenSources = new Set();
      function addSource(url) {
        const address = externalSource(url);
        if (address && !seenSources.has(address.href)) {
          seenSources.add(address.href);
          sources.push(address);
        }
        return address;
      }
      function inline(parent, value) {
        const syntax = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()\]]+)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*/g;
        let cursor = 0;
        for (const match of value.matchAll(syntax)) {
          parent.append(document.createTextNode(value.slice(cursor, match.index)));
          if (match[2] || match[3]) {
            const rawUrl = match[2] || match[3].replace(/[.,;:!?]+$/, '');
            const address = addSource(rawUrl);
            const label = match[2] && !/^https?:\/\//.test(match[1]) ? match[1] : address ? address.hostname.replace(/^www\./, '') : rawUrl;
            parent.append(document.createTextNode(label));
            if (match[3]) parent.append(document.createTextNode(match[3].slice(rawUrl.length)));
          } else {
            const marked = document.createElement(match[4] ? 'strong' : match[5] ? 'code' : 'em');
            if (match[5]) marked.textContent = match[5];
            else inline(marked, match[4] || match[6]);
            parent.append(marked);
          }
          cursor = match.index + match[0].length;
        }
        parent.append(document.createTextNode(value.slice(cursor)));
      }
      function tableCells(line) {
        const trimmed = line.trim();
        if (!trimmed.includes('|')) return null;
        const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
        return cells.length >= 2 ? cells : null;
      }
      function isTableDivider(line, columns) {
        const cells = tableCells(line || '');
        return cells?.length === columns && cells.every(cell => /^:?-{3,}:?$/.test(cell));
      }
      function expandCompactTable(line) {
        const parts = line.split('||');
        if (parts.length < 3) return [line];
        const firstPipe = parts[0].indexOf('|');
        if (firstPipe < 0) return [line];
        const headers = tableCells(parts[0].slice(firstPipe));
        const divider = parts[1].trim().replace(/^\|/, '').replace(/\|$/, '');
        if (!headers || !isTableDivider(`|${divider}|`, headers.length)) return [line];
        const expanded = [];
        const precedingText = parts[0].slice(0, firstPipe).trim();
        if (precedingText) expanded.push(precedingText);
        expanded.push(`| ${headers.join(' | ')} |`, `| ${divider} |`);
        for (const part of parts.slice(2)) {
          const cells = part.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
          if (cells.length < headers.length) return [line];
          expanded.push(`| ${cells.slice(0, headers.length).join(' | ')} |`);
          const followingText = cells.slice(headers.length).join('|').trim();
          if (followingText) expanded.push(followingText);
        }
        return expanded;
      }
      let paragraph = null;
      let list = null;
      let code = null;
      const normalized = text.replace(/\r\n?/g, '\n').replace(/\]\s*\(\s*(https?:\/\/[^\s)]+)\s*\)/g, ']($1)');
      const hasSources = /https?:\/\//.test(normalized);
      const lines = normalized.split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        if (!code && lines[index].includes('||')) lines.splice(index, 1, ...expandCompactTable(lines[index]));
        const rawLine = lines[index];
        const line = rawLine.replace(/^(\s*)\*\*(\d+[.)]\s+.+)\*\*\s*$/, '$1$2');
        if (/^\s*```/.test(line)) {
          if (code) code = null;
          else {
            const pre = document.createElement('pre');
            code = document.createElement('code');
            pre.append(code); container.append(pre);
          }
          paragraph = null; list = null;
          continue;
        }
        if (code) { code.textContent += `${line}\n`; continue; }
        if (!line.trim()) { paragraph = null; list = null; continue; }
        const headers = tableCells(line);
        if (headers && isTableDivider(lines[index + 1], headers.length)) {
          const wrapper = document.createElement('div'); wrapper.className = 'roadmap-chat__table-wrap';
          const table = document.createElement('table'); table.className = 'roadmap-chat__table';
          const thead = document.createElement('thead'); const headerRow = document.createElement('tr');
          headers.forEach(value => { const th = document.createElement('th'); inline(th, value); headerRow.append(th); });
          thead.append(headerRow); table.append(thead);
          const tbody = document.createElement('tbody');
          index += 1;
          while (index + 1 < lines.length) {
            const cells = tableCells(lines[index + 1]);
            if (!cells || cells.length !== headers.length || isTableDivider(lines[index + 1], headers.length)) break;
            const row = document.createElement('tr');
            cells.forEach(value => { const td = document.createElement('td'); inline(td, value); row.append(td); });
            tbody.append(row); index += 1;
          }
          table.append(tbody); wrapper.append(table); container.append(wrapper);
          paragraph = null; list = null;
          continue;
        }
        if (hasSources && /^\s*(?:#{1,4}\s*)?(?:источники|ссылки|материалы)\s*:?\s*$/i.test(line)) continue;
        const linkOnly = line.match(/^\s*(?:[-*•]|\d+[.)])?\s*(?:\[(?:источник(?:\s*\d+)?|ссылка(?:\s*\d+)?|https?:\/\/[^\]]+)\]\(https?:\/\/[^\s)]+\)|https?:\/\/\S+)\s*$/i);
        if (linkOnly) {
          inline(document.createDocumentFragment(), line);
          paragraph = null; list = null; continue;
        }
        const heading = line.match(/^\s*(#{1,4})\s+(.+)$/);
        if (heading) {
          const title = document.createElement(heading[1].length < 3 ? 'h3' : 'h4');
          inline(title, heading[2]); container.append(title);
          paragraph = null; list = null; continue;
        }
        const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)$/);
        if (item) {
          const type = /^\s*\d/.test(line) ? 'ol' : 'ul';
          if (!list || list.tagName.toLowerCase() !== type) { list = document.createElement(type); container.append(list); }
          const li = document.createElement('li'); inline(li, item[1]); list.append(li);
          if (type === 'ol') li.value = Number(line.match(/^\s*(\d+)/)[1]);
          paragraph = null; continue;
        }
        list = null;
        if (!paragraph) { paragraph = document.createElement('p'); container.append(paragraph); }
        else paragraph.append(document.createElement('br'));
        inline(paragraph, line);
      }
      if (sources.length) {
        const row = document.createElement('div');
        row.className = 'roadmap-chat__sources';
        row.setAttribute('aria-label', 'Источники');
        sources.forEach((address, index) => {
          const item = document.createElement('span'); item.className = 'roadmap-chat__source';
          const link = document.createElement('a'); link.href = address.href;
          link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.setAttribute('aria-label', `Открыть ${address.hostname} в новой вкладке`);
          const visual = document.createElement('span'); visual.className = 'roadmap-chat__source-visual';
          visual.setAttribute('aria-hidden', 'true');
          const globe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          globe.setAttribute('class', 'roadmap-chat__source-globe');
          globe.setAttribute('viewBox', '0 0 24 24');
          globe.setAttribute('fill', 'none');
          globe.setAttribute('stroke', 'currentColor');
          globe.setAttribute('stroke-width', '1.7');
          globe.setAttribute('stroke-linecap', 'round');
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '9');
          const meridians = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          meridians.setAttribute('d', 'M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21M12 3C9.5 5.4 8.2 8.4 8.2 12s1.3 6.6 3.8 9');
          globe.append(circle, meridians);
          const image = document.createElement('img'); image.className = 'roadmap-chat__source-icon';
          image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
          image.addEventListener('load', () => { if (image.naturalWidth) visual.classList.add('is-loaded'); }, { once: true });
          image.src = `${address.origin}/favicon.ico`;
          const domain = document.createElement('span'); domain.textContent = address.hostname.replace(/^www\./, '');
          visual.append(globe, image);
          link.append(visual, domain); item.append(link);
          if (index < sources.length - 1) item.append(document.createTextNode(','));
          row.append(item);
        });
        container.append(row);
      }
    }
    function modelFamily(model) {
      const [provider = '', id = ''] = String(model || '').split('/');
      const family = id.split('-')[0].toLowerCase();
      if (provider === 'openai') return 'OpenAI';
      return ({ llama: 'LLaMA', gemma: 'Gemma', glm: 'GLM', deepseek: 'DeepSeek', nemotron: 'Nemotron' })[family]
        || id.split('-')[0] || provider || 'ИИ';
    }
    function modelOptionLabel(model, duplicateFamilies) {
      const family = modelFamily(model);
      if (!duplicateFamilies.has(family)) return family;
      const id = String(model).split('/').pop();
      const size = id.match(/(?:^|-)(\d+(?:\.\d+)?)b(?:-|$)/i)?.[1];
      return `${family} ${size ? `${size}B` : id.split('-').slice(1, 3).join(' ')}`.trim();
    }
    function comparisonOrder(turn, answer) {
      const ranked = client.getModelOrder();
      return window.QAtoDevAiClient.nextComparisonOrder(turn.modelOrder || ranked, answer.model, turn.answers.map(item => item.model), ranked);
    }
    function render(focusTurnId) {
      selectedExcerpt = '';
      el('refine').hidden = true;
      el('topic').textContent = topic.title;
      el('input').placeholder = `Спросить про ${topic.title}…`;
      syncInputHeight();
      el('body').inert = collapsed;
      el('body').setAttribute('aria-hidden', String(collapsed));
      panel.querySelector('.roadmap-chat__footer').inert = collapsed;
      el('toggle-label').textContent = collapsed ? 'Развернуть' : 'Свернуть';
      el('toggle').setAttribute('aria-expanded', String(!collapsed));
      panel.classList.toggle('is-collapsed', collapsed);
      const history = el('history'); history.replaceChildren();
      const current = conversation();
      if (!current.turns.length) {
        const p = document.createElement('p'); p.className = 'roadmap-chat__empty';
        p.textContent = 'Запутались в теме? Разберём на примере, попробуем практику или обсудим вашу точку зрения.'; history.append(p);
      }
      current.turns.forEach(turn => {
        const section = document.createElement('section'); section.className = 'roadmap-chat__turn';
        section.dataset.turnId = turn.id;
        const q = document.createElement('div'); q.className = 'roadmap-chat__question';
        const userLabel = document.createElement('span'); userLabel.className = 'roadmap-chat__chip'; userLabel.textContent = 'Вы';
        const userText = document.createElement('p'); userText.textContent = turn.question; userText.title = turn.question;
        q.append(userLabel, userText); section.append(q);
        const selectedIndex = Math.max(0, Math.min(turn.selected, turn.answers.length - 1));
        const selectedAnswer = turn.answers[selectedIndex];
        const nextModel = turn.answers.length === 1 && turn.comparisonCount < 2
          ? comparisonOrder(turn, selectedAnswer)[0] : null;
        if (selectedAnswer) {
          const answer = selectedAnswer;
          const content = document.createElement('div'); content.className = 'roadmap-chat__answer';
          const head = document.createElement('div'); head.className = 'roadmap-chat__answer-head';
          const identity = document.createElement('div'); identity.className = 'roadmap-chat__answer-identity';
          const aiLabel = document.createElement('span'); aiLabel.className = 'roadmap-chat__chip'; aiLabel.textContent = 'Помощник';
          const modelLabel = document.createElement('span'); modelLabel.className = 'roadmap-chat__model-family'; modelLabel.textContent = modelFamily(answer.model);
          identity.append(aiLabel, modelLabel); head.append(identity);
          const actions = document.createElement('div'); actions.className = 'roadmap-chat__answer-actions';
          if (turn.answers.length > 1) {
            const nav = document.createElement('div'); nav.className = 'roadmap-chat__answer-nav';
            nav.append(
              button('‹', 'Предыдущий ответ', () => { turn.selected = (selectedIndex + turn.answers.length - 1) % turn.answers.length; turn.updatedAt = Date.now(); persist(); render(turn.id); }),
              document.createTextNode(`${selectedIndex + 1}/${turn.answers.length}`),
              button('›', 'Следующий ответ', () => { turn.selected = (selectedIndex + 1) % turn.answers.length; turn.updatedAt = Date.now(); persist(); render(turn.id); })
            );
            actions.append(nav);
          }
          if (turn.answers.length === 1 && nextModel) {
            const compare = button('Другой вариант ответа', 'Сначала спросить другие модели; если они недоступны — повторить запрос к текущей', () => compareAnswer(current, turn, answer));
            compare.className = 'roadmap-chat__compare'; compare.disabled = !!active;
            actions.append(compare);
          }
          if (actions.childNodes.length) head.append(actions);
          content.append(head);
          const answerText = document.createElement('div'); answerText.className = 'roadmap-chat__answer-text';
          renderAnswer(answerText, answer.answer); content.append(answerText); section.append(content);
        }
        if (turn.errorCode === 'credits-exhausted') renderCreditNotice(section);
        else if (turn.error) { const error = document.createElement('p'); error.className = 'roadmap-chat__error'; error.textContent = turn.error; section.append(error); }
        history.append(section);
      });
      const target = focusTurnId
        ? [...history.children].find(item => item.dataset.turnId === focusTurnId)
        : history.lastElementChild;
      if (target && current.turns.length) history.scrollTop += target.getBoundingClientRect().top - history.getBoundingClientRect().top;
      el('send').disabled = !!active;
      panel.querySelectorAll('[data-chat-action]').forEach(b => { b.disabled = !!active; });
      el('status').hidden = !active || active.topic.id !== topic.id;
    }
    function renderModels() {
      const select = el('model');
      const preferred = localStorage.getItem('roadmap_ai_selected_model_v1') || '';
      select.replaceChildren();
      const timings = client.readModelTimings();
      const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Авто · быстрые модели'; select.append(auto);
      const ranked = client.getModelOrder();
      const ordered = [...ranked, ...models.filter(model => !ranked.includes(model))];
      const familyCounts = ordered.reduce((counts, model) => {
        const family = modelFamily(model);
        counts.set(family, (counts.get(family) || 0) + 1);
        return counts;
      }, new Map());
      const duplicateFamilies = new Set([...familyCounts].filter(([, count]) => count > 1).map(([family]) => family));
      ordered.forEach(model => {
        const option = document.createElement('option'); option.value = model;
        option.textContent = modelOptionLabel(model, duplicateFamilies) + (timings[model]?.avg ? ` · ~${Math.round(timings[model].avg / 1000)} сек.` : ''); select.append(option);
      });
      select.value = models.includes(preferred) ? preferred : '';
    }
    async function prepare() {
      const api = window.AppSupabase;
      const session = await Promise.resolve().then(() => api?.getSession?.()).catch(() => null);
      authUser = session?.user || null; accessToken = session?.access_token || null;
      if (authUser && !localStorage.getItem('groq_api_key_override')) {
        const result = await Promise.resolve().then(() => api.getUserApiKey?.(authUser.id, 'groq')).catch(() => null);
        const key = result?.data?.api_key;
        if (typeof key === 'string' && key.trim()) {
          localStorage.setItem('groq_api_key_override', key.trim());
          localStorage.setItem('groq_api_key_override_meta_v1', JSON.stringify({ updatedAt: result.data.updated_at, userId: authUser.id, source: 'cloud' }));
        }
      }
      const key = localStorage.getItem('groq_api_key_override') || '';
      if (key && (!/^[\x21-\x7e]+$/.test(key) || /[<>]/.test(key))) throw Object.assign(new Error('Ключ содержит посторонний текст. Замените его в «Модели и ключ».'), { code: 'INVALID_API_KEY' });
      const scope = window.QAtoDevAiClient.modelCacheScope(key);
      if (scope !== modelsScope || Date.now() - modelsFetchedAt > 15 * 60 * 1000) {
        models = window.QAtoDevAiClient.models.slice();
        try {
          const response = await client.callAiProxy({ body: { action: 'models', userApiKey: key || null } });
          if (response.ok) {
            const json = await response.json();
            const available = client.normalizeAvailableChatModels(json.data);
            if (available.length) {
              models = available;
            }
          }
        } catch { /* Use the seven known accessible models if discovery is unavailable. */ }
        modelsScope = scope;
        modelsFetchedAt = Date.now();
      }
      renderModels();
    }
    function prompt(context, question) {
      return window.QAtoDevAiPrompts.roadmap.system(context, question);
    }
    function latestPair(chat, answerMode = 'selected') {
      const previous = chat.turns.findLast(item => item.answers.length);
      if (!previous) return null;
      const answer = answerMode === 'latest' ? previous.answers.at(-1) : previous.answers[previous.selected] || previous.answers.at(-1);
      return { question: previous.question, answer: answer.answer };
    }
    function messagesForTurn(context, question, pair) {
      return [
        { role: 'system', content: prompt(context, question) },
        ...(pair ? [{ role: 'user', content: pair.question }, { role: 'assistant', content: pair.answer }] : []),
        { role: 'user', content: question }
      ];
    }
    function messagesForComparison(context, turn, reference) {
      return messagesForTurn(context, window.QAtoDevAiPrompts.roadmap.alternative, {
        question: turn.question,
        answer: reference.answer
      });
    }
    async function compareAnswer(chat, turn, reference) {
      if (active || !chat.turns.includes(turn) || turn.answers.length >= 3 || turn.comparisonCount >= 2) return;
      const context = { ...topic, resources: [...(topic.resources || [])] };
      active = { topic: context, turn };
      turn.comparing = true; turn.error = ''; turn.errorCode = '';
      el('status').replaceChildren();
      const label = document.createElement('span'); label.className = 'ai-loader-text'; el('status').append(label);
      const timer = client.startLoaderPhases(el('status'));
      render(turn.id);
      try {
        await prepare();
        const order = comparisonOrder(turn, reference);
        if (!order.length) throw new Error('No comparison models');
        const result = await client.requestBatchWithTimeout(turn.question, order, model => {
          el('status').dataset.waitingModel = model;
          client.updateLoaderText(el('status'), `Жду ответ от ${model}`);
        }, null, { messages: messagesForComparison(context, turn, reference) });
        if (chat.turns.includes(turn) && turn.answers.length < 3) {
          turn.answers.push({ ...result, kind: 'comparison' });
          turn.comparisonCount += 1;
          turn.selected = turn.answers.length - 1;
          turn.updatedAt = Date.now();
          persist();
        }
      } catch (batch) {
        const error = batch.error || batch;
        setTurnError(turn, error, 'Не удалось получить другой ответ. Попробуйте ещё раз.');
      } finally {
        turn.comparing = false;
        client.stopLoaderPhases(timer); active = null;
        if (topic.id === context.id) { render(turn.id); el('history').scrollTop = el('history').scrollHeight; }
        persist();
        applyPendingAuthSession();
        resumeCloudSyncAfterAnswer();
      }
    }
    async function submit(question, options = {}) {
      question = question.trim(); if (!question || active) return;
      const context = { ...topic, resources: [...(topic.resources || [])] };
      const chat = conversation(context.id);
      const pair = options.contextPair || latestPair(chat);
      const now = Date.now();
      const turn = { id: crypto.randomUUID(), question, answers: [], selected: 0, modelOrder: [], comparisonCount: 0, createdAt: now, updatedAt: now, error: '', errorCode: '' };
      chat.turns.push(turn); chat.turns = chat.turns.slice(-12); chat.draft = ''; el('input').value = '';
      syncInputHeight();
      active = { topic: context, turn }; collapsed = false;
      el('status').replaceChildren();
      const label = document.createElement('span'); label.className = 'ai-loader-text'; el('status').append(label);
      const timer = client.startLoaderPhases(el('status'));
      persist(); render();
      const addAnswer = result => {
        if (!chat.turns.includes(turn) || turn.answers.length >= (turn.comparing ? 2 : 3) || turn.answers.some(answer => answer.model === result.model)) return;
        turn.answers.push({ ...result, kind: 'auto' }); turn.updatedAt = Date.now(); persist(); if (topic.id === context.id) render();
      };
      try {
        await prepare();
        const messages = messagesForTurn(context, question, pair);
        turn.modelOrder = client.getModelOrder(el('model').value);
        const result = await client.requestBatchWithTimeout(question, turn.modelOrder, model => {
          el('status').dataset.waitingModel = model;
          client.updateLoaderText(el('status'), `Жду ответ от ${model}`);
        }, addAnswer, { messages });
        addAnswer(result);
      } catch (batch) {
        const error = batch.error || batch;
        setTurnError(turn, error, 'Не удалось получить ответ. Можно повторить вопрос.');
        if (client.isRecoverableApiKeyError(error)) { el('settings').hidden = false; el('settings-toggle').setAttribute('aria-expanded', 'true'); }
        persist();
      } finally { client.stopLoaderPhases(timer); active = null; render(); applyPendingAuthSession(); resumeCloudSyncAfterAnswer(); }
    }
    el('form').addEventListener('submit', e => { e.preventDefault(); submit(el('input').value); });
    function updateSelectedExcerpt() {
      const selection = window.getSelection();
      const node = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0).commonAncestorContainer : null;
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const answer = element?.closest?.('.roadmap-chat__answer-text');
      selectedExcerpt = answer && el('history').contains(answer) ? selection.toString().trim().slice(0, 500) : '';
      el('refine').hidden = !selectedExcerpt;
    }
    el('history').addEventListener('mouseup', updateSelectedExcerpt);
    el('history').addEventListener('keyup', updateSelectedExcerpt);
    el('refine').addEventListener('click', () => {
      if (!selectedExcerpt) return;
      const input = el('input');
      const draft = input.value.trim();
      input.value = `Уточни фрагмент предыдущего ответа: «${selectedExcerpt}».${draft ? ` ${draft}` : ' '}`;
      syncInputHeight();
      conversation().draft = input.value;
      persist();
      selectedExcerpt = '';
      el('refine').hidden = true;
      window.getSelection()?.removeAllRanges();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    el('input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); el('form').requestSubmit(); } });
    let saveDraftTimer;
    el('input').addEventListener('input', () => { syncInputHeight(); conversation().draft = el('input').value; clearTimeout(saveDraftTimer); saveDraftTimer = setTimeout(persist, 400); });
    window.addEventListener('pagehide', persist);
    window.addEventListener('online', () => scheduleCloudSync(0, true));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleCloudSync(0);
    });
    window.addEventListener('storage', event => {
      if (event.key !== storageKey || active) return;
      conversations = loadConversations(currentUserId);
      lastCloudSignature = cloudSignature();
      el('input').value = conversation().draft;
      render();
      scheduleCloudSync(0);
    });
    window.AppSupabase?.client?.auth?.onAuthStateChange?.((event, session) => {
      if (!session && event !== 'SIGNED_OUT') return;
      setTimeout(() => applyAuthSession(session, initialAuthResolved), 0);
    });
    el('toggle').addEventListener('click', () => { collapsed = !collapsed; try { localStorage.setItem('roadmap_ai_collapsed_v1', JSON.stringify(collapsed)); } catch {} render(); });
    el('settings-toggle').addEventListener('click', () => { el('settings').hidden = !el('settings').hidden; el('settings-toggle').setAttribute('aria-expanded', String(!el('settings').hidden)); });
    el('model').addEventListener('change', () => { try { localStorage.setItem('roadmap_ai_selected_model_v1', el('model').value); } catch {} });
    panel.querySelectorAll('[data-chat-action]').forEach(b => b.addEventListener('click', () => {
      const contextPair = latestPair(conversation(), 'latest');
      const prompts = window.QAtoDevAiPrompts.roadmap.actions(topic.title, Boolean(contextPair));
      submit(prompts[b.dataset.chatAction], { contextPair });
    }));
    el('key-form').addEventListener('submit', async e => {
      e.preventDefault(); const key = el('key').value.trim();
      if (!/^[\x21-\x7e]+$/.test(key) || /[<>]/.test(key)) { el('key-status').textContent = 'Вставьте только API-ключ, без HTML, пробелов и Bearer.'; return; }
      try {
        const updatedAt = new Date().toISOString();
        const session = await window.AppSupabase?.getSession?.();
        localStorage.setItem('groq_api_key_override', key);
        localStorage.setItem('groq_api_key_override_meta_v1', JSON.stringify({ updatedAt, userId: session?.user?.id || null, source: 'local' }));
        el('key').value = ''; el('key-status').textContent = 'Ключ сохранён в браузере.';
        if (session?.user && window.AppSupabase?.upsertUserApiKey) {
          const result = await window.AppSupabase.upsertUserApiKey({ user_id: session.user.id, service: 'groq', api_key: key, updated_at: updatedAt });
          el('key-status').textContent = result.error ? 'Ключ сохранён в браузере, но не удалось синхронизировать его с аккаунтом.' : 'Ключ сохранён и синхронизирован.';
        }
      } catch { el('key-status').textContent = 'Не удалось завершить сохранение ключа.'; }
    });
    let panelHeightAnimation;
    let historyAnimation;
    window.addEventListener('qatodev:roadmap-topic', e => {
      if (!initialAuthResolved) { topic = e.detail; return; }
      const canAnimate = panel.getClientRects().length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const startHeight = panel.getBoundingClientRect().height;
      panelHeightAnimation?.cancel();
      topic = e.detail; el('input').value = conversation().draft; render();
      if (!canAnimate) return;
      historyAnimation?.cancel();
      if (!collapsed) historyAnimation = el('history').animate([{ opacity: .45, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
      const endHeight = panel.getBoundingClientRect().height;
      if (Math.abs(endHeight - startHeight) < 2) return;
      panel.style.overflow = 'hidden';
      const animation = panel.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      panelHeightAnimation = animation;
      const finish = () => { if (panelHeightAnimation === animation) { panel.style.overflow = ''; panelHeightAnimation = null; } };
      animation.onfinish = finish;
      animation.oncancel = finish;
    });
    const initialSession = await Promise.resolve().then(() => window.AppSupabase?.getSession?.()).catch(() => null);
    if (initialSession || !authUser) applyAuthSession(initialSession, false);
    initialAuthResolved = true;
    el('input').value = conversation().draft; renderModels(); render();
  });
})();
