(function () {
  const root = document.getElementById('team-flow');
  if (!root || !window.createMapMotion) return;

  const viewport = document.getElementById('team-flow-viewport');
  const frame = root.querySelector('.team-flow-frame');
  const canvas = document.getElementById('team-flow-canvas');
  const lines = document.getElementById('team-flow-lines');
  const nodesRoot = document.getElementById('team-flow-nodes');
  const article = document.getElementById('team-flow-article');
  const articleTitle = document.getElementById('team-flow-article-title');
  const articleActions = document.getElementById('team-flow-article-actions');
  const articleContent = document.getElementById('team-flow-article-content');
  const runButton = document.getElementById('team-flow-run');
  const resetButton = document.getElementById('team-flow-reset');
  const statusLine = document.getElementById('team-flow-status');
  const rolePanels = new Map([...document.querySelectorAll('#team .stage-panel')].map(panel => [panel.dataset.stage, panel]));
  const roleNames = new Map([...rolePanels].map(([id, panel]) => [id, panel.querySelector('h4').textContent]));
  const roleImages = new Map([...rolePanels].map(([id, panel]) => [id, panel.querySelector('img').getAttribute('src')]));

  const stages = [
    { id: 'idea', title: 'Идея', kind: 'work', x: 125, y: 315, roles: ['owner'], detail: 'Владелец продукта определяет цель и ценность новой функции. Scrum-мастер помогает обсудить работу, но не решает, что строить.' },
    { id: 'business', title: 'Бизнес-анализ', kind: 'work', x: 365, y: 315, roles: ['business-analyst', 'owner'], detail: 'Уточняют потребности пользователей и бизнес-правила. Отсюда уже можно начинать готовить проверки требований.' },
    { id: 'design', title: 'Дизайн', kind: 'work', x: 610, y: 105, roles: ['designer', 'business-analyst'], detail: 'Дизайнер прорабатывает пользовательский путь и состояния интерфейса. Макеты обсуждают с командой до реализации.' },
    { id: 'system', title: 'Системный анализ', kind: 'work', x: 610, y: 315, roles: ['system-analyst', 'business-analyst'], detail: 'Описывают данные, API и взаимодействие частей системы. На время больничного системного аналитика бизнес-аналитика можно назначить подменой.' },
    { id: 'development', title: 'Разработка', kind: 'work', x: 860, y: 210, roles: ['developer'], detail: 'Разработчик реализует функцию по согласованным требованиям и макетам. Проверки не ждут окончания всего этапа.' },
    { id: 'test-design', title: 'Подготовка проверок', kind: 'test', x: 610, y: 525, roles: ['tester', 'business-analyst'], detail: 'Тестировщик ведёт подготовку: делает первые сценарии и чек-листы сразу после бизнес-анализа, пока уточняются дизайн и системное решение.' },
    { id: 'unit', title: 'Модульные проверки', kind: 'test', x: 860, y: 420, roles: ['developer'], detail: 'Во время разработки разработчик пишет unit-тесты и проверяет свой код. Позже тестировщик получает готовую функцию на тестовом стенде и проверяет модуль как часть продукта. Это два разных вида проверок.' },
    { id: 'integration', title: 'Интеграционные', kind: 'test', x: 1105, y: 315, roles: ['tester', 'developer'], detail: 'Тестировщик ведёт проверки взаимодействия компонентов и сервисов: запросов, ответов и передачи данных. Разработчик помогает разбирать сбои интеграции.' },
    { id: 'system-test', title: 'Системные', kind: 'test', x: 1345, y: 315, roles: ['tester', 'system-analyst'], detail: 'Тестировщик проверяет поведение готовой системы целиком, включая пользовательские сценарии и ошибки. Системный аналитик помогает уточнить ожидаемое поведение.' },
    { id: 'acceptance', title: 'Приёмочные', kind: 'test', x: 1585, y: 315, roles: ['tester', 'owner', 'business-analyst'], detail: 'Тестировщик организует проверку критериев приёмки и показывает результат владельцу продукта. Решение о принятии функции остаётся за владельцем продукта или заказчиком. Фиолетовая стрелка показывает возможный возврат к разработке, если здесь нашли баг.' },
    { id: 'release', title: 'Релиз', kind: 'work', x: 1825, y: 315, roles: ['release-manager', 'scrum-master'], detail: 'Релиз-менеджер согласует выпуск и план отката. Scrum-мастер может помочь с координацией, но его отсутствие само по себе не является техническим запретом релиза.' },
    { id: 'support', title: 'Передача в поддержку', kind: 'work', x: 2065, y: 315, roles: ['release-manager', 'tester'], detail: 'После выпуска команда передаёт сведения о версии и известных ограничениях службе поддержки. Тестировщик может помочь проверить проблему пользователя.' }
  ];
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const edges = [
    ['idea', 'business'], ['business', 'design'], ['business', 'system'],
    ['design', 'development'], ['system', 'development'], ['system', 'unit'],
    ['business', 'test-design'], ['development', 'integration'],
    ['unit', 'integration'], ['test-design', 'integration'],
    ['integration', 'system-test'], ['system-test', 'acceptance'],
    ['acceptance', 'release'], ['release', 'support']
  ];
  const waves = [
    ['idea'], ['business'], ['design', 'system', 'test-design'],
    ['development', 'unit'], ['integration'],
    ['system-test'], ['acceptance'], ['release'], ['support']
  ];
  const presence = Object.fromEntries([...rolePanels.keys()].map(id => [id, 'active']));
  const backups = Object.fromEntries(stages.map(stage => [stage.id, null]));
  const progress = Object.fromEntries(stages.map(stage => [stage.id, 'idle']));
  const stageButtons = new Map();
  const edgePaths = new Map();
  let selected = null;
  let waveIndex = 0;
  let running = false;
  let runToken = 0;
  let zoomTimer = 0;

  const motion = window.createMapMotion({
    viewport,
    canvas,
    getContentBounds: () => ({ left: 0, top: 0, right: 2250, bottom: 760 }),
    touchPanGain: 1.45
  });

  const extraAssignments = roleId => Object.values(backups).filter(candidate => candidate === roleId).length;

  // Подмена назначается отдельно для каждого этапа и помогает только при больничном.
  function missingFor(stage) {
    const lead = stage.roles[0];
    if (presence[lead] === 'active') return [];
    const backup = backups[stage.id];
    return presence[lead] === 'sick' && backup && presence[backup] === 'active' ? [] : [lead];
  }
  function joinList(items) {
    return items.length > 1 ? `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}` : items[0];
  }
  function releaseFailureMessage(failedStages, beforeRun = false) {
    const stopped = beforeRun ? 'Релиз остановится' : 'Релиз остановился';
    const byRole = new Map();
    failedStages.forEach(stage => {
      const lead = stage.roles[0];
      if (!byRole.has(lead)) byRole.set(lead, []);
      byRole.get(lead).push(stage);
    });
    const reasons = [];
    const actions = [];
    byRole.forEach((affectedStages, lead) => {
      const name = lead === 'owner' ? 'владелец продукта' : roleNames.get(lead).toLowerCase();
      const fullName = roleNames.get(lead);
      if (presence[lead] === 'left') {
        if (byRole.size === 1) {
          actions.push(`${stopped}: ${name} уволился, поэтому верните его в команду.`);
          return;
        }
        reasons.push(`${name} уволился`);
        actions.push(`вернуть в команду участника «${fullName}»`);
        return;
      }
      const canReplaceEverywhere = affectedStages.every(stage => stage.roles.slice(1).some(candidate =>
        presence[candidate] === 'active' && (backups[stage.id] === candidate || extraAssignments(candidate) < 2)
      ));
      if (byRole.size === 1) {
        actions.push(canReplaceEverywhere
          ? `${stopped}: ${name} на больничном, поэтому назначьте замену ${affectedStages.length === 1 ? `на этапе «${affectedStages[0].title}»` : 'на каждом затронутом этапе'}.`
          : `${stopped}: ${name} на больничном и заменить его некем, поэтому верните его в команду.`);
        return;
      }
      reasons.push(`${name} на больничном`);
      if (canReplaceEverywhere) {
        actions.push(affectedStages.length === 1
          ? `назначить замену в карточке этапа «${affectedStages[0].title}»`
          : `назначить замену на всех этапах участника «${fullName}»`);
      } else {
        actions.push(`вернуть с больничного участника «${fullName}», которого сейчас некем заменить`);
      }
    });
    if (byRole.size === 1) return actions[0];
    return `${stopped}, потому что ${joinList(reasons)}; ${beforeRun ? 'перед запуском' : 'чтобы продолжить,'} нужно ${joinList(actions)}.`;
  }
  function setStatus(message, tone = '') {
    statusLine.textContent = message;
    statusLine.dataset.tone = tone;
  }
  function actionButton(label, handler, className = '', disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = className;
    button.disabled = disabled;
    button.addEventListener('click', handler);
    return button;
  }
  function headerAction(label, icon, handler, destructive = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `team-flow-article__action${destructive ? ' is-danger' : ''}`;
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"></path></svg>`;
    button.addEventListener('click', handler);
    return button;
  }
  function paragraph(text, className = '') {
    const p = document.createElement('p');
    p.textContent = text;
    p.className = className;
    return p;
  }

  function renderRoleArticle(roleId) {
    const panel = rolePanels.get(roleId);
    articleTitle.textContent = roleNames.get(roleId);
    articleActions.replaceChildren();
    articleContent.replaceChildren();
    const image = document.createElement('img');
    image.src = roleImages.get(roleId);
    image.alt = panel.querySelector('img').alt;
    articleContent.append(image);
    panel.querySelectorAll('p').forEach(p => articleContent.append(p.cloneNode(true)));

    const state = presence[roleId];
    const presenceLine = paragraph(state === 'active' ? 'В команде' : state === 'sick' ? 'На больничном' : 'Вне команды', `team-flow-presence${state === 'active' ? '' : ' is-absent'}`);
    articleContent.append(presenceLine);
    if (state === 'sick') articleContent.append(paragraph('Назначить временную замену можно в карточке нужного этапа.', 'team-flow-article__hint'));
    if (state === 'left') articleContent.append(paragraph('При увольнении этап останавливается: временная подмена не помогает.', 'team-flow-article__hint'));
    if (state === 'active') {
      articleActions.append(
        headerAction('Уйти на больничный', 'M4 8h16v12H4zM9 8V5h6v3M12 11v6M9 14h6', () => setPresence(roleId, 'sick'), true),
        headerAction('Уволиться', 'M10 4H5v16h5m3-12 4 4-4 4m-5-4h10', () => setPresence(roleId, 'left'), true)
      );
    } else {
      articleActions.append(headerAction('Вернуть в команду', 'M20 11a8 8 0 1 1-2.4-5.7M20 4v5h-5', () => setPresence(roleId, 'active')));
    }

  }

  function renderStageArticle(stage) {
    articleTitle.textContent = stage.title;
    articleActions.replaceChildren();
    articleContent.replaceChildren(paragraph(stage.detail));
    const missing = missingFor(stage);
    const lead = stage.roles[0];
    const backup = backups[stage.id];
    articleContent.append(paragraph(`Основной участник: ${roleNames.get(lead)}.`));
    articleContent.append(paragraph(missing.length ? presence[lead] === 'left' ? 'Этап остановлен: основной участник уволился.' : 'Этап остановлен: основной участник на больничном без доступной замены.' : presence[lead] === 'sick' ? `Этап ведёт ${roleNames.get(backup)} на время больничного.` : 'Основной участник ведёт этап.', `team-flow-presence${missing.length ? ' is-absent' : ''}`));
    const heading = document.createElement('h5');
    heading.textContent = 'Кто заменит на больничном';
    articleContent.append(heading);
    const candidates = stage.roles.slice(1);
    if (candidates.length) {
      articleContent.append(paragraph('Выбор действует только на этом этапе. Основные этапы считаются одной занятостью; дополнительно можно взять не более двух чужих этапов.', 'team-flow-article__hint'));
      const actions = document.createElement('div');
      actions.className = 'team-flow-action-row';
      candidates.forEach(candidate => {
        const selectedBackup = backup === candidate;
        const load = extraAssignments(candidate);
        const button = actionButton(
          `${selectedBackup ? '✓ ' : ''}${roleNames.get(candidate)} · ${load}/2`,
          () => {
            backups[stage.id] = selectedBackup ? null : candidate;
            rosterChanged(selectedBackup
              ? `Замена на этапе «${stage.title}» снята`
              : `${roleNames.get(candidate)} назначен заменой на этапе «${stage.title}»`);
          },
          selectedBackup ? 'is-active' : '',
          !selectedBackup && (presence[candidate] !== 'active' || presence[lead] === 'left' || load >= 2)
        );
        button.setAttribute('aria-pressed', String(selectedBackup));
        actions.append(button);
      });
      articleContent.append(actions);
    } else {
      articleContent.append(paragraph('В этой учебной модели для этапа нет подходящей временной замены.', 'team-flow-article__hint'));
    }
    if (stage.id === 'support') articleContent.append(paragraph('Специалист поддержки находится за пределами этой команды; здесь показана передача ему информации после релиза.', 'team-flow-article__hint'));
  }

  function openArticle(type, id) {
    selected = { type, id };
    article.hidden = false;
    if (type === 'role') renderRoleArticle(id);
    else renderStageArticle(stageById.get(id));
  }
  function refreshArticle() {
    if (selected) openArticle(selected.type, selected.id);
  }

  function renderRoster() {
    nodesRoot.querySelectorAll('.team-flow-avatar').forEach(button => {
      const role = button.dataset.role;
      const stage = stageById.get(button.dataset.stage);
      const lead = stage.roles[0];
      const isLead = role === lead;
      const isBackup = !isLead && presence[lead] !== 'left' && backups[stage.id] === role;
      const image = button.querySelector('img');
      image.src = roleImages.get(role);
      image.alt = '';
      button.classList.toggle('is-potential', !isLead && !isBackup && presence[role] === 'active');
      button.classList.toggle('is-assigned', isBackup && presence[role] === 'active');
      button.classList.toggle('is-sick', presence[role] === 'sick');
      button.classList.toggle('is-left', presence[role] === 'left');
      const label = `${roleNames.get(role)} — ${presence[role] === 'left' ? 'уволился' : presence[role] === 'sick' ? 'на больничном' : isBackup ? `назначен заменой для этапа «${stage.title}»` : isLead ? 'основной участник' : 'можно назначить временной заменой'}`;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    stages.forEach(stage => stageButtons.get(stage.id).classList.toggle('is-unavailable', missingFor(stage).length > 0));
    refreshArticle();
    updateControls();
  }

  function renderProgress() {
    stages.forEach(stage => {
      const button = stageButtons.get(stage.id);
      ['processing', 'done', 'blocked'].forEach(value => button.classList.toggle(`is-${value}`, progress[stage.id] === value));
      if (stage.kind === 'test') button.querySelector('small').textContent = {
        idle: 'Тестирование', processing: 'Проверка', done: 'Пройдено', blocked: 'Остановлено'
      }[progress[stage.id]];
    });
    updateControls();
  }

  function updateControls() {
    runButton.disabled = running;
    runButton.textContent = waveIndex > 0 && waveIndex < waves.length ? '▶ Продолжить релиз' : '▶ Запустить релиз';
    resetButton.disabled = !running && waveIndex === 0 && Object.values(presence).every(state => state === 'active') && Object.values(backups).every(role => !role);
  }

  function resetProgress() {
    stages.forEach(stage => { progress[stage.id] = 'idle'; });
    edgePaths.forEach(path => { path.classList.remove('is-flowing', 'is-done', 'is-blocked'); });
    waveIndex = 0;
    renderProgress();
  }
  function rosterChanged(change) {
    let restart = false;
    if (running) {
      runToken += 1;
      running = false;
      resetProgress();
      restart = true;
    }
    renderRoster();
    if (waveIndex === waves.length || waves.slice(0, waveIndex).some(wave => wave.some(id => missingFor(stageById.get(id)).length))) {
      resetProgress();
      restart = true;
    }
    const blockedStages = stages.filter(stage => missingFor(stage).length);
    if (blockedStages.length) {
      setStatus(releaseFailureMessage(blockedStages, true), 'error');
      return;
    }
    const next = restart ? 'запустите релиз заново' : waveIndex > 0 ? 'продолжите релиз' : 'запустите релиз';
    setStatus(`${change} — ${next}.`);
  }
  function setPresence(roleId, next) {
    presence[roleId] = next;
    if (next === 'left') Object.keys(backups).forEach(stageId => { if (backups[stageId] === roleId) backups[stageId] = null; });
    const name = roleNames.get(roleId);
    rosterChanged(next === 'sick' ? `${name} ушёл на больничный` : next === 'left' ? `${name} уволился` : `${name} вернулся в команду`);
  }

  function makePath(from, to) {
    const start = stageById.get(from);
    const end = stageById.get(to);
    if (from === 'test-design' && to === 'integration') {
      return `M ${start.x + 92} ${start.y} C ${start.x + 260} ${start.y + 50}, ${end.x - 95} ${start.y + 35}, ${end.x} ${end.y + 42}`;
    }
    if (start.x === end.x) {
      const side = start.x + 92;
      return `M ${side} ${start.y} C ${side + 64} ${start.y + 48}, ${side + 64} ${end.y - 48}, ${side} ${end.y}`;
    }
    const sx = start.x + 92;
    const ex = end.x - 92;
    const bend = Math.max(16, Math.min(70, (ex - sx) * .32));
    return `M ${sx} ${start.y} C ${sx + bend} ${start.y}, ${ex - bend} ${end.y}, ${ex} ${end.y}`;
  }

  edges.forEach(([from, to]) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', makePath(from, to));
    lines.append(path);
    edgePaths.set(`${from}:${to}`, path);
  });
  stages.forEach(stage => {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'team-flow-node';
    node.dataset.kind = stage.kind;
    node.style.left = `${stage.x}px`;
    node.style.top = `${stage.y}px`;
    const eyebrow = document.createElement('small');
    eyebrow.textContent = stage.kind === 'test' ? 'Тестирование' : 'Этап';
    const name = document.createElement('strong');
    name.textContent = stage.title;
    node.append(eyebrow, name);
    node.addEventListener('click', () => openArticle('stage', stage.id));
    nodesRoot.append(node);
    stageButtons.set(stage.id, node);

    const avatars = document.createElement('div');
    avatars.className = 'team-flow-avatars';
    avatars.style.left = `${stage.x}px`;
    avatars.style.top = `${stage.y - 89}px`;
    stage.roles.forEach(role => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'team-flow-avatar';
      button.dataset.role = role;
      button.dataset.stage = stage.id;
      const image = document.createElement('img');
      image.src = roleImages.get(role);
      image.alt = '';
      button.append(image);
      button.addEventListener('click', () => openArticle('role', role));
      avatars.append(button);
    });
    nodesRoot.append(avatars);
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 45 : ms));
  async function runRelease() {
    if (running) return;
    if (waveIndex === waves.length) resetProgress();
    article.hidden = true;
    selected = null;
    running = true;
    const token = ++runToken;
    updateControls();
    for (; waveIndex < waves.length; waveIndex += 1) {
      const wave = waves[waveIndex].map(id => stageById.get(id)).filter(stage => progress[stage.id] !== 'done');
      if (!wave.length) continue;
      const center = wave.reduce((sum, stage) => ({ x: sum.x + stage.x, y: sum.y + stage.y }), { x: 0, y: 0 });
      motion.focus(center.x / wave.length, center.y / wave.length, true);
      setStatus(wave.length === 1
        ? `Команда выполняет этап «${wave[0].title}».`
        : `Команда одновременно выполняет этапы ${joinList(wave.map(stage => `«${stage.title}»`))}.`);
      const incoming = edges.filter(([, to]) => wave.some(stage => stage.id === to)).map(([from, to]) => edgePaths.get(`${from}:${to}`));
      incoming.forEach(path => {
        path.classList.remove('is-blocked');
        path.classList.add('is-flowing');
      });
      await wait(650);
      if (token !== runToken) return;
      incoming.forEach(path => path.classList.remove('is-flowing'));
      wave.forEach(stage => { progress[stage.id] = 'processing'; });
      renderProgress();
      await wait(340);
      if (token !== runToken) return;
      const failed = [];
      wave.forEach(stage => {
        const missing = missingFor(stage);
        progress[stage.id] = missing.length ? 'blocked' : 'done';
        if (missing.length) failed.push(stage);
        edges.filter(([, to]) => to === stage.id).forEach(([from, to]) => {
          const path = edgePaths.get(`${from}:${to}`);
          path.classList.remove('is-blocked', 'is-done');
          path.classList.add(missing.length ? 'is-blocked' : 'is-done');
        });
      });
      renderProgress();
      if (failed.length) {
        running = false;
        updateControls();
        setStatus(releaseFailureMessage(failed), 'error');
        return;
      }
      await wait(170);
      if (token !== runToken) return;
    }
    running = false;
    updateControls();
    setStatus('Релиз выпущен: проверки пройдены, информация передана в поддержку.', 'success');
  }

  function zoomBy(factor) {
    const current = motion.snapshot();
    const nextScale = Math.max(.7, Math.min(1.6, current.scale * factor));
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    if (!reducedMotion.matches) {
      canvas.classList.add('is-zooming');
      clearTimeout(zoomTimer);
      zoomTimer = setTimeout(() => canvas.classList.remove('is-zooming'), 350);
    }
    motion.restore({
      x: centerX - (centerX - current.x) * nextScale / current.scale,
      y: centerY - (centerY - current.y) * nextScale / current.scale,
      scale: nextScale
    });
  }

  runButton.addEventListener('click', runRelease);
  frame.addEventListener('wheel', event => {
    if (viewport.contains(event.target)) return;
    event.preventDefault();
  }, { passive: false });
  frame.addEventListener('touchmove', event => {
    if (viewport.contains(event.target)) return;
    event.preventDefault();
  }, { passive: false });
  frame.addEventListener('keydown', event => {
    if (viewport.contains(event.target)) return;
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
  });
  resetButton.addEventListener('click', () => {
    runToken += 1;
    running = false;
    Object.keys(presence).forEach(role => { presence[role] = 'active'; });
    Object.keys(backups).forEach(stageId => { backups[stageId] = null; });
    resetProgress();
    renderRoster();
    motion.focus(500, 320, true);
    setStatus('Состав команды и ход релиза сброшены — назначьте нужные замены или запустите релиз.');
  });
  document.getElementById('team-flow-article-close').addEventListener('click', () => {
    article.hidden = true;
    selected = null;
  });
  document.getElementById('team-flow-zoom-in').addEventListener('click', () => zoomBy(1.18));
  document.getElementById('team-flow-zoom-out').addEventListener('click', () => zoomBy(1 / 1.18));
  viewport.addEventListener('pointerdown', () => {
    clearTimeout(zoomTimer);
    canvas.classList.remove('is-zooming');
  }, true);
  viewport.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(1.18); }
    else if (event.key === '-') { event.preventDefault(); zoomBy(1 / 1.18); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const current = motion.snapshot();
      motion.restore({ x: current.x + (event.key === 'ArrowLeft' ? 65 : event.key === 'ArrowRight' ? -65 : 0), y: current.y + (event.key === 'ArrowUp' ? 65 : event.key === 'ArrowDown' ? -65 : 0), scale: current.scale });
    }
  });

  renderRoster();
  renderProgress();
  motion.restore({ x: 0, y: 0, scale: .78 });
  motion.focus(500, 320, false);
})();
