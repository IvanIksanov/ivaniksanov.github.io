(function () {
  const root = document.getElementById('team-flow');
  if (!root || !window.createMapMotion) return;

  const viewport = document.getElementById('team-flow-viewport');
  const frame = root.querySelector('.team-flow-frame');
  const workspace = root.querySelector('.team-flow-workspace');
  const canvas = document.getElementById('team-flow-canvas');
  const lines = document.getElementById('team-flow-lines');
  const nodesRoot = document.getElementById('team-flow-nodes');
  const roster = document.getElementById('team-flow-roster');
  const bottomBar = document.getElementById('team-flow-bottom-bar');
  const hirePanel = document.getElementById('team-flow-hire');
  const hireButton = document.createElement('button');
  const hireChoices = document.createElement('div');
  const article = document.getElementById('team-flow-article');
  const articleTitle = document.getElementById('team-flow-article-title');
  const articleContent = document.getElementById('team-flow-article-content');
  const runButton = document.getElementById('team-flow-run');
  const resetButton = document.getElementById('team-flow-reset');
  const completion = document.getElementById('team-flow-complete');
  const completionTitle = document.getElementById('team-flow-complete-title');
  const completionText = document.getElementById('team-flow-complete-text');
  const completionNext = document.getElementById('team-flow-complete-next');
  const completionRetry = document.getElementById('team-flow-complete-retry');
  const completionTasks = document.getElementById('team-flow-complete-tasks');
  const statusLine = document.getElementById('team-flow-status');
  const scenarioLine = document.getElementById('team-flow-scenario');
  const rolePanels = new Map([...document.querySelectorAll('#team .stage-panel')].map(panel => [panel.dataset.stage, panel]));
  const roleNames = new Map([...rolePanels].map(([id, panel]) => [id, panel.querySelector('h4').textContent]));
  const roleImages = new Map([...rolePanels].map(([id, panel]) => [id, panel.querySelector('img').getAttribute('src')]));

  const stages = [
    { id: 'idea', title: 'Идея', kind: 'work', x: 125, y: 390, roles: ['owner'], detail: 'Команда решает, какую задачу пользователя будет решать новая функция и зачем она нужна.' },
    { id: 'business', title: 'Бизнес-анализ', kind: 'work', x: 385, y: 390, roles: ['business-analyst', 'owner'], detail: 'Уточняют потребности пользователей, ограничения и бизнес-правила будущей функции.' },
    { id: 'design', title: 'Дизайн', kind: 'work', x: 650, y: 170, roles: ['designer', 'business-analyst'], detail: 'Прорабатывают пользовательский путь, экраны и разные состояния интерфейса.' },
    { id: 'system', title: 'Системный анализ', kind: 'work', x: 650, y: 390, roles: ['system-analyst', 'business-analyst'], detail: 'Описывают данные, API и взаимодействие частей системы.' },
    { id: 'development', title: 'Разработка', kind: 'work', x: 915, y: 390, roles: ['developer'], detail: 'Пишут код функции и unit-тесты — небольшие автоматические проверки отдельных частей кода. При новых сборках они помогают заметить поломку прежнего поведения.' },
    { id: 'test-design', title: 'Подготовка проверок', kind: 'test', x: 650, y: 610, roles: ['tester', 'business-analyst'], detail: 'Готовят первые сценарии и чек-листы, пока уточняются требования, дизайн и техническое решение.' },
    { id: 'unit', title: 'Модульные проверки', kind: 'test', x: 915, y: 610, roles: ['tester', 'developer'], detail: 'Проверяют готовый модуль на тестовом стенде: основные сценарии, ошибки и граничные значения. Этот этап идёт параллельно разработке.' },
    { id: 'integration', title: 'Интеграционные', kind: 'test', x: 1180, y: 610, roles: ['tester', 'developer'], detail: 'Проверяют взаимодействие компонентов и сервисов: запросы, ответы и передачу данных.' },
    { id: 'system-test', title: 'Системные', kind: 'test', x: 1445, y: 610, roles: ['tester', 'system-analyst'], detail: 'Проверяют поведение готовой системы целиком, включая пользовательские сценарии и ошибки.' },
    { id: 'acceptance', title: 'Приёмочные', kind: 'test', x: 1710, y: 610, roles: ['tester', 'owner', 'business-analyst'], detail: 'Сверяют готовую функцию с критериями приёмки и выясняют, решена ли исходная задача.' },
    { id: 'hotfix', title: 'Hotfix', kind: 'work', x: 1975, y: 150, optional: true, roles: ['developer'], replacements: {}, detail: 'Здесь разработчик со специалистом по проблеме готовят срочное исправление и новую сборку для тестового стенда. В прод её пока не отправляют: сначала тестировщик проверит исправление и другие функции, затем команда выпустит его на этапе «Релиз».' },
    { id: 'retesting', title: 'Подтверждающее тестирование', kind: 'test', x: 1710, y: 365, optional: true, roles: ['tester'], detail: 'На тестовом стенде тестировщик повторяет шаги, на которых проявился дефект. Если ошибка больше не возникает, исправление подтверждено. Это также называют повторным тестированием (retesting).' },
    { id: 'regression', title: 'Регресс', kind: 'test', x: 1975, y: 365, optional: true, roles: ['tester'], detail: 'После проверки исправленного бага тестировщик проверяет другие функции, чтобы убедиться, что изменение не сломало их.' },
    { id: 'release', title: 'Релиз', kind: 'work', x: 1975, y: 610, roles: ['release-manager', 'scrum-master'], requiredRoles: ['release-manager', 'tester', 'developer'], replacements: { 'release-manager': ['scrum-master'], tester: ['business-analyst'] }, detail: 'Подготовленную версию выпускают в рабочую среду и проверяют, что выпуск прошёл как задумано.' },
    { id: 'smoke', title: 'Smoke', kind: 'test', x: 2240, y: 610, roles: ['tester', 'developer'], detail: 'Сразу после релиза быстро проверяют, что приложение открывается и основные сценарии доступны. Это короткая проверка, а не полный регресс.' },
    { id: 'support', title: 'Передача в поддержку', kind: 'work', x: 2505, y: 610, roles: ['release-manager', 'tester'], detail: 'После Smoke передают сведения о версии и известных ограничениях службе поддержки.' }
  ];
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const edges = [
    ['idea', 'business'], ['business', 'design'], ['business', 'system'],
    ['design', 'development'], ['system', 'development'],
    ['business', 'test-design'], ['development', 'integration'],
    ['unit', 'integration'], ['test-design', 'integration'],
    ['integration', 'system-test'], ['system-test', 'acceptance'],
    ['acceptance', 'release'], ['release', 'smoke'], ['smoke', 'hotfix'], ['hotfix', 'retesting'], ['retesting', 'regression'], ['regression', 'release'],
    ['smoke', 'support']
  ];
  const waves = [
    ['idea'], ['business'], ['design', 'system', 'test-design'],
    ['development', 'unit'], ['integration'],
    ['system-test'], ['acceptance'], ['release'], ['smoke'], ['hotfix'], ['retesting'], ['regression'], ['release'], ['smoke'], ['support']
  ];
  const hotfixWaveIndex = waves.findIndex(wave => wave[0] === 'hotfix');
  const repeatReleaseIndex = hotfixWaveIndex + 3;
  const repeatSmokeIndex = hotfixWaveIndex + 4;
  const presence = Object.fromEntries([...rolePanels.keys()].map(id => [id, 'active']));
  const assignments = Object.fromEntries(stages.map(stage => [stage.id, {}]));
  const progress = Object.fromEntries(stages.map(stage => [stage.id, 'idle']));
  const stageButtons = new Map();
  const stageSlots = new Map();
  const rosterButtons = new Map();
  const edgePaths = new Map();
  let selected = null;
  let waveIndex = 0;
  let running = false;
  let runToken = 0;
  let zoomTimer = 0;
  let pendingSlot = null;
  let scenarioIndex = 1;
  let scenarioStart = null;
  let smokeNeedsHotfix = false;
  let hotfixTriggered = false;
  let observedOverloadFailure = false;
  let hiredRole = null;
  let hireMenuOpen = false;
  let scenarioComplete = false;
  let courseCompleted = false;
  let introDismissed = false;
  let storageAvailable = true;
  let saveTimer = 0;
  let restoring = true;
  const storageKey = 'qatodev.team-flow.scenarios.v1';
  const scenarioCopy = [
    '',
    'Назначьте команду на этапы и проведите первый релиз.',
    'На Smoke каталог вернул 500 после изменения API. Подберите команду для подготовки срочного исправления, подтверждающего тестирования и регресса.',
    'На Smoke экран оплаты остался в старом стиле: макет не обновили под новую дизайн-систему. Подберите команду для подготовки срочного исправления, подтверждающего тестирования и регресса.',
    'На Smoke тестировщик обнаружил скидку на доставку, хотя акция действует только на товары. При разборе нашли ошибку в бизнес-требовании. Подготовьте исправление, проведите подтверждающее тестирование и регресс.',
    'Исполнитель дизайна заболел. Найдите ему замену и проведите релиз.',
    'В команде возникла перегрузка. Найдите её причину, исправьте назначения и проведите релиз.',
    'Трое сотрудников ушли из команды. Можно нанять только одного — перераспределите работу и проведите релиз.'
  ];
  const scenarioTopics = {
    2: { label: 'Бэкенд', topic: 'backend' },
    3: { label: 'Дизайн', topic: 'interface' },
    4: { label: 'Бизнес-логика', topic: 'business' }
  };
  const scenarioHelp = [
    '',
    'Назначьте людей через плюсы и запустите обычный релиз.',
    'Каталог вернул 500 после изменения API. Подберите людей для подготовки исправления, подтверждающего тестирования и регресса.',
    'Макет экрана оплаты остался в старом стиле. Подберите команду для обновления макета и кода, затем проверьте исправление и другие функции.',
    'Тестировщик нашёл лишнюю скидку на доставку. Исправьте бизнес-правило и расчёт, затем проверьте исправление и другие функции.',
    'Исполнитель дизайна заболел: найдите замену для всех его назначений.',
    'Изучите назначения на карте, найдите причину перегрузки и исправьте состав команды.',
    'Трое сотрудников ушли. Выберите одного нового коллегу в нижней панели, перераспределите обязанности и запустите релиз.'
  ];
  const completionCopy = [
    '',
    'Команда провела первый релиз. Теперь разберите дефект, найденный на Smoke.',
    'Ошибка API исправлена, а другие функции прошли регресс. Дальше — дефект интерфейса.',
    'Экран оплаты исправлен, а другие функции прошли регресс. Дальше — ошибка бизнес-логики.',
    'Бизнес-правило исправлено, а другие функции прошли регресс. Дальше проверьте работу команды при отсутствии коллеги.',
    'Команда нашла замену заболевшему участнику и довела релиз до конца.',
    'Вы сняли перегрузку и распределили задачи между коллегами.',
    'Вы наняли одного сотрудника, распределили обязанности и провели релиз.'
  ];
  const branchEnabled = () => scenarioIndex >= 2 && scenarioIndex <= 4;
  const startsAfterSmoke = () => scenarioIndex >= 2 && scenarioIndex <= 4;
  const hotfixSpecialist = () => scenarioIndex === 2 ? 'system-analyst' : scenarioIndex === 3 ? 'designer' : 'business-analyst';
  const releaseHandoffHint = () => ({
    2: 'Вспомните, кто разбирал API и помогал разработчику с бэкенд-ошибкой.',
    3: 'Вспомните, кто отвечал за макет экрана оплаты и исправлял его стиль.',
    4: 'Вспомните, кто уточнял ошибочное правило скидки в требованиях.'
  })[scenarioIndex];
  const stageRoles = stage => stage.id === 'hotfix' ? ['developer', hotfixSpecialist()]
    : stage.requiredRoles || stage.roles.slice(0, 1);
  function defaultAssignments() {
    return Object.fromEntries(stages.map(stage => [stage.id, stage.optional ? {} : Object.fromEntries(
      (stage.requiredRoles || stage.roles.slice(0, 1)).map(role => [role, role])
    )]));
  }
  function overloadedAssignments() {
    const start = defaultAssignments();
    start.design.designer = 'business-analyst';
    start['test-design'].tester = 'business-analyst';
    return start;
  }
  function firedTeamStart() {
    const team = Object.fromEntries([...rolePanels.keys()].map(role => [role, 'active']));
    ['developer', 'business-analyst', 'release-manager'].forEach(role => { team[role] = 'left'; });
    return { assignments: Object.fromEntries(stages.map(stage => [stage.id, {}])), presence: team };
  }
  function replayStart(index) {
    if (index === 7) return firedTeamStart();
    const team = Object.fromEntries([...rolePanels.keys()].map(role => [role, 'active']));
    if (index === 5) team.designer = 'sick';
    return {
      assignments: index === 1 ? Object.fromEntries(stages.map(stage => [stage.id, {}]))
        : index === 6 ? overloadedAssignments() : defaultAssignments(),
      presence: team
    };
  }
  const allowedRoles = (stage, slot) => scenarioIndex === 7 && stage.id === 'support'
    ? ['release-manager', 'scrum-master']
    : branchEnabled() && stage.id === 'release' && slot === 'tester'
      ? ['tester', hotfixSpecialist()]
      : [slot, ...(stage.replacements ? stage.replacements[slot] || [] : stage.roles.slice(1)),
        ...(scenarioIndex === 7 && stage.id === 'release' && slot === 'release-manager' ? ['owner'] : [])];
  const assignedRole = (stage, slot) => assignments[stage.id][slot] || null;
  const visibleStage = stage => !stage.optional || branchEnabled();

  let mapScrollActive = false;
  function setMapScrollActive(active) {
    mapScrollActive = active;
    frame.classList.toggle('is-scroll-active', active);
  }
  document.addEventListener('pointerdown', event => {
    setMapScrollActive(frame.contains(event.target));
  }, true);
  frame.addEventListener('focusin', () => setMapScrollActive(true));
  frame.addEventListener('focusout', event => {
    if (!frame.contains(event.relatedTarget)) setMapScrollActive(false);
  });

  const motion = window.createMapMotion({
    viewport,
    canvas,
    getContentBounds: () => ({ left: 0, top: 0, right: 2700, bottom: 800 }),
    touchPanGain: 1.45,
    minScale: .4,
    shouldHandleWheel: () => mapScrollActive && completion.hidden,
    onChange: () => { if (!restoring) scheduleSave(); }
  });

  const activeEdges = () => edges.filter(([from, to]) => branchEnabled()
    || !['hotfix', 'retesting', 'regression'].includes(from) && !['hotfix', 'retesting', 'regression'].includes(to));
  function joinList(items) {
    return items.length > 1 ? `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}` : items[0];
  }
  function matchStageRoles(stage) {
    const slots = stageRoles(stage);
    const people = slots.map(slot => assignedRole(stage, slot));
    let best = {};
    function search(index, used, mapping) {
      if (Object.keys(mapping).length > Object.keys(best).length) best = { ...mapping };
      if (index === slots.length) return;
      const slot = slots[index];
      people.forEach((role, personIndex) => {
        if (role && !used.has(personIndex) && allowedRoles(stage, slot).includes(role)) {
          used.add(personIndex);
          mapping[slot] = role;
          search(index + 1, used, mapping);
          delete mapping[slot];
          used.delete(personIndex);
        }
      });
      search(index + 1, used, mapping);
    }
    search(0, new Set(), {});
    return { people, mapping: best, complete: Object.keys(best).length === slots.length };
  }
  function stageProblem(stage, wave) {
    const slots = stageRoles(stage);
    const result = matchStageRoles(stage);
    const { people, mapping } = result;
    if (people.some(role => !role)) {
      if (scenarioIndex === 7 && stage.id === 'support') return { type: 'empty', message: 'На этапе «Передача в поддержку» пока никого нет. Выберите того, у кого сейчас меньше всего задач в команде.' };
      if (branchEnabled() && stage.id === 'release' && waveIndex === repeatReleaseIndex) return { type: 'empty', message: 'На повторном релизе осталось пустое место для проверки готовности выпуска. Назначьте коллегу вместо занятого проверками тестировщика.' };
      const missing = slots.find(slot => !mapping[slot]);
      const expected = roleNames.get(missing);
      return { type: 'empty', message: `На этапе «${stage.title}» есть пустое место: не назначена роль «${expected}».` };
    }
    for (const role of people) {
      if (presence[role] !== 'active') {
        if (scenarioIndex === 7 && stage.id === 'support') return { type: 'absent', message: 'Назначенный на передачу в поддержку сотрудник уже не в команде. Выберите того, у кого сейчас меньше всего задач.' };
        const absence = presence[role] === 'left' ? 'уволился' : 'на больничном';
        const possible = slots.some(slot => allowedRoles(stage, slot).some(candidate => presence[candidate] === 'active' && !people.includes(candidate)));
        return { type: 'absent', message: `${roleNames.get(role)} ${absence}: ${possible ? `выберите другого участника для этапа «${stage.title}»` : `на этапе «${stage.title}» его заменить некем — релиз остановлен`}.` };
      }
    }
    if (new Set(people).size !== people.length) return { type: 'same-stage', message: `На этапе «${stage.title}» один человек назначен сразу на две обязательные задачи — распределите их между коллегами.` };
    if (!result.complete) {
      if (scenarioIndex === 7 && stage.id === 'support') return { type: 'wrong-role', message: 'Для передачи в поддержку выбран неподходящий человек. Попробуйте назначить того, у кого сейчас меньше всего задач в команде.' };
      if (branchEnabled() && stage.id === 'release' && waveIndex === repeatReleaseIndex) {
        const wrong = people.find(role => !Object.values(mapping).includes(role));
        return { type: 'wrong-role', message: `На повторном релизе ${roleNames.get(wrong)} не подходит для замены тестировщика. ${releaseHandoffHint()}` };
      }
      const missing = slots.find(slot => !mapping[slot]);
      const expected = roleNames.get(missing);
      const wrong = people.find(role => !Object.values(mapping).includes(role));
      if (stage.id === 'idea') return { type: 'wrong-role', message: `${roleNames.get(wrong)} не подходит для этапа «Идея»: цель функции определяет владелец продукта.` };
      const availableReplacements = allowedRoles(stage, missing).filter(role => role !== missing && presence[role] === 'active' && !people.includes(role));
      if (presence[missing] !== 'active' && availableReplacements.length) {
        const absence = presence[missing] === 'sick' ? 'на больничном' : 'уже не в команде';
        const hint = stage.id === 'design'
          ? 'Подумайте, кто из команды работает с требованиями к экрану и может временно помочь с макетом.'
          : 'Подумайте, кто из команды знаком с задачей этапа и может временно подменить коллегу.';
        return { type: 'wrong-role', message: `На этапе «${stage.title}» «${roleNames.get(wrong)}» не подходит. ${expected} ${absence}. ${hint}` };
      }
      return { type: 'wrong-role', message: `На этапе «${stage.title}» выбран «${roleNames.get(wrong)}», но для этой задачи нужен «${expected}». Замените неподходящего участника.` };
    }
    if (branchEnabled() && stage.id === 'release' && waveIndex === repeatReleaseIndex && mapping.tester === 'tester') {
      return { type: 'qa-handoff', message: 'В этом задании повторный релиз готовят параллельно подтверждающему тестированию и регрессу. Тестировщик занят проверками — назначьте на его место в релизе другого подходящего участника.' };
    }
    const orderedStages = [...new Set(waves.flat())].map(id => stageById.get(id)).filter(visibleStage);
    for (const slot of slots) {
      const role = mapping[slot];
      const extra = orderedStages.flatMap(item => {
        const resolved = matchStageRoles(item);
        if (!resolved.complete) return [];
        return stageRoles(item).map(key => ({ item, key, role: resolved.mapping[key] }));
      }).filter(item => item.role === role && item.key !== role);
      if (extra.length > 2 && extra[2].item.id === stage.id && extra[2].key === slot) {
        if (scenarioIndex === 7 && stage.id === 'support') return { type: 'overload', message: 'Назначенный на передачу в поддержку сотрудник уже занят на других этапах. Выберите того, у кого сейчас меньше всего задач в команде.' };
        const earlier = joinList(extra.slice(0, 2).map(({ item }) => `«${item.title}»`));
        return { type: 'overload', message: `${roleNames.get(role)} уже заменяет коллег на этапах ${earlier}; «${stage.title}» стал третьей дополнительной задачей. Верните одного из этих этапов профильному участнику.` };
      }
    }
    for (const other of wave) {
      if (other.id === stage.id) continue;
      for (const role of people) {
        if (stageRoles(other).some(slot => assignedRole(other, slot) === role)) {
          return { type: 'parallel', message: `${roleNames.get(role)} не может одновременно работать на этапах «${stage.title}» и «${other.title}» — назначьте другого человека.` };
        }
      }
    }
    return null;
  }

  function setStatus(message, tone = '') {
    statusLine.textContent = message;
    statusLine.dataset.tone = tone;
    scheduleSave();
  }
  const copy = value => JSON.parse(JSON.stringify(value));
  const currentSnapshot = () => ({ assignments: copy(assignments), presence: { ...presence } });
  function restoreSnapshot(snapshot) {
    stages.forEach(stage => { assignments[stage.id] = { ...(snapshot.assignments[stage.id] || {}) }; });
    Object.keys(presence).forEach(role => { presence[role] = snapshot.presence[role] || 'active'; });
  }
  function saveState() {
    if (restoring || !storageAvailable) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 13, scenarioIndex, scenarioStart, assignments, presence, progress,
        waveIndex, smokeNeedsHotfix, hotfixTriggered, observedOverloadFailure, hiredRole, scenarioComplete, courseCompleted, introDismissed, selected, pendingSlot,
        status: statusLine.textContent, tone: statusLine.dataset.tone, camera: motion.snapshot()
      }));
    } catch (_) {
      storageAvailable = false;
      statusLine.textContent = 'Браузер не разрешил сохранить прогресс: после обновления страницы он может исчезнуть.';
      statusLine.dataset.tone = 'error';
    }
  }
  function scheduleSave() {
    if (restoring || !storageAvailable) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 120);
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(state.version) || !Number.isInteger(state.scenarioIndex) || state.scenarioIndex < 1 || state.scenarioIndex > (state.version === 1 ? 5 : 7)
        || !state.assignments || !state.presence || !state.scenarioStart?.assignments || !state.scenarioStart?.presence || !state.progress) return null;
      if (stages.some(stage => stage.id !== 'retesting' && (!state.assignments[stage.id] || !state.scenarioStart.assignments[stage.id] || !state.progress[stage.id]))) return null;
      if ([...rolePanels.keys()].some(role => !['active', 'sick', 'left'].includes(state.presence[role]))) return null;
      if (state.version === 1) {
        state.scenarioIndex = [0, 1, 2, 5, 6, 7][state.scenarioIndex];
        for (const snapshot of [state, state.scenarioStart]) {
          const hotfix = snapshot.assignments.hotfix;
          if (hotfix.clarification) {
            hotfix[hotfix.clarification] = hotfix.clarification;
            delete hotfix.clarification;
          }
        }
        if (state.pendingSlot?.stageId === 'hotfix' && state.pendingSlot.slot === 'clarification') state.pendingSlot = null;
        state.version = 2;
      }
      if (state.version === 2) {
        for (const snapshot of [state, state.scenarioStart]) delete snapshot.assignments.hotfix.tester;
        if (state.pendingSlot?.stageId === 'hotfix' && state.pendingSlot.slot === 'tester') state.pendingSlot = null;
        if (state.scenarioIndex > 1) {
          Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
          state.waveIndex = 0;
        }
        state.smokeNeedsHotfix = false;
        state.hotfixTriggered = false;
        state.scenarioComplete = false;
        state.status = scenarioHelp[state.scenarioIndex];
        state.tone = '';
        state.version = 3;
      }
      if (state.version === 3) {
        if (state.scenarioIndex >= 2 && state.scenarioIndex <= 4 && state.waveIndex < hotfixWaveIndex) {
          for (let i = 0; i < hotfixWaveIndex; i += 1) waves[i].forEach(id => { state.progress[id] = 'done'; });
          state.waveIndex = hotfixWaveIndex;
          state.smokeNeedsHotfix = true;
          state.hotfixTriggered = true;
          state.status = scenarioHelp[state.scenarioIndex];
          state.tone = '';
        }
        state.version = 4;
      }
      if (state.version === 4) {
        if (state.scenarioIndex >= 2 && state.scenarioIndex <= 4 && !state.scenarioComplete) {
          let removedPreset = false;
          for (const stageId of ['hotfix', 'regression']) {
            const preset = state.scenarioStart.assignments[stageId];
            for (const [slot, role] of Object.entries(preset)) {
              if (role && state.assignments[stageId][slot] === role) {
                delete state.assignments[stageId][slot];
                removedPreset = true;
              }
            }
            state.scenarioStart.assignments[stageId] = {};
          }
          if (removedPreset) {
            Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
            for (let i = 0; i < hotfixWaveIndex; i += 1) waves[i].forEach(id => { state.progress[id] = 'done'; });
            state.waveIndex = hotfixWaveIndex;
            state.smokeNeedsHotfix = true;
            state.hotfixTriggered = true;
            state.status = scenarioHelp[state.scenarioIndex];
            state.tone = '';
          }
        }
        state.version = 5;
      }
      if (state.version === 5) {
        if (state.scenarioIndex === 6 && !state.scenarioComplete) {
          Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
          state.waveIndex = 0;
          state.status = scenarioHelp[6];
          state.tone = '';
        }
        state.version = 6;
      }
      if (state.version === 6) {
        if (state.scenarioIndex === 6) {
          const atScenarioStart = !state.scenarioComplete
            && JSON.stringify(state.assignments) === JSON.stringify(state.scenarioStart.assignments)
            && JSON.stringify(state.presence) === JSON.stringify(state.scenarioStart.presence);
          state.scenarioStart = {
            assignments: overloadedAssignments(),
            presence: Object.fromEntries([...rolePanels.keys()].map(role => [role, 'active']))
          };
          if (atScenarioStart) {
            state.assignments = copy(state.scenarioStart.assignments);
            state.presence = { ...state.scenarioStart.presence };
          }
          if (!state.scenarioComplete) {
            Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
            state.waveIndex = 0;
            state.status = scenarioHelp[6];
            state.tone = '';
          }
        }
        state.version = 7;
      }
      if (state.version === 7) {
        if (state.scenarioIndex === 6) {
          const atScenarioStart = !state.scenarioComplete
            && JSON.stringify(state.assignments) === JSON.stringify(state.scenarioStart.assignments)
            && JSON.stringify(state.presence) === JSON.stringify(state.scenarioStart.presence);
          state.scenarioStart = {
            assignments: overloadedAssignments(),
            presence: Object.fromEntries([...rolePanels.keys()].map(role => [role, 'active']))
          };
          if (atScenarioStart) {
            state.assignments = copy(state.scenarioStart.assignments);
            state.presence = { ...state.scenarioStart.presence };
          }
          if (!state.scenarioComplete) {
            Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
            state.waveIndex = 0;
            state.status = scenarioHelp[6];
            state.tone = '';
          }
        }
        state.version = 8;
      }
      if (state.version === 8) {
        if (state.scenarioIndex === 6 && !state.scenarioComplete && state.waveIndex === 0) {
          state.progress.design = 'idle';
          state.progress['test-design'] = 'idle';
          state.status = scenarioHelp[6];
          state.tone = '';
        }
        state.version = 9;
      }
      if (state.version === 9) {
        if (state.scenarioIndex === 7) {
          state.scenarioStart = firedTeamStart();
          state.assignments = copy(state.scenarioStart.assignments);
          state.presence = { ...state.scenarioStart.presence };
          Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
          state.waveIndex = 0;
          state.scenarioComplete = false;
          state.selected = null;
          state.pendingSlot = null;
          state.status = scenarioHelp[7];
          state.tone = '';
        }
        state.hiredRole = null;
        state.version = 10;
      }
      if (state.version === 10) {
        if (state.scenarioIndex === 7) {
          state.scenarioStart = firedTeamStart();
          state.assignments = copy(state.scenarioStart.assignments);
          state.presence = { ...state.scenarioStart.presence };
          Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
          state.waveIndex = 0;
          state.hiredRole = null;
          state.scenarioComplete = false;
          state.selected = null;
          state.pendingSlot = null;
          state.status = scenarioHelp[7];
          state.tone = '';
        }
        state.version = 11;
      }
      if (state.version === 11) {
        if (state.scenarioIndex === 7) {
          state.scenarioStart = firedTeamStart();
          state.assignments = copy(state.scenarioStart.assignments);
          state.presence = { ...state.scenarioStart.presence };
          Object.keys(state.progress).forEach(id => { state.progress[id] = 'idle'; });
          state.waveIndex = 0;
          state.hiredRole = null;
          state.scenarioComplete = false;
          state.selected = null;
          state.pendingSlot = null;
          state.status = scenarioHelp[7];
          state.tone = '';
        }
        state.version = 12;
      }
      if (state.version === 12) {
        state.assignments.retesting = {};
        state.scenarioStart.assignments.retesting = {};
        state.progress.retesting = 'idle';
        if (state.scenarioIndex >= 2 && state.scenarioIndex <= 4 && !state.scenarioComplete && state.waveIndex > hotfixWaveIndex) {
          state.waveIndex = hotfixWaveIndex + 1;
          state.progress.hotfix = 'done';
          state.progress.regression = 'idle';
          state.progress.support = 'idle';
          state.smokeNeedsHotfix = true;
          state.hotfixTriggered = true;
          state.status = 'Исправление готово на тестовом стенде. Проверьте дефект и другие функции перед повторным релизом.';
          state.tone = '';
        }
        state.version = 13;
      }
      if (!state.assignments.retesting || !state.scenarioStart.assignments.retesting || !state.progress.retesting) return null;
      return state;
    } catch (_) { storageAvailable = false; return null; }
  }
  function paragraph(text, className = '') {
    const p = document.createElement('p');
    p.textContent = text;
    p.className = className;
    return p;
  }

  function renderRoleArticle(roleId) {
    const panel = rolePanels.get(roleId);
    const state = presence[roleId];
    articleTitle.textContent = roleNames.get(roleId);
    articleContent.replaceChildren();
    const image = document.createElement('img');
    image.src = roleImages.get(roleId);
    image.alt = panel.querySelector('img').alt;
    image.dataset.role = roleId;
    image.classList.toggle('is-absent', state !== 'active');
    articleContent.append(image);
    const presenceLine = paragraph(state === 'active' ? 'В команде' : state === 'sick' ? 'На больничном' : 'Вне команды', `team-flow-presence${state === 'active' ? '' : ' is-absent'}`);
    const meta = document.createElement('div');
    meta.className = 'team-flow-article__meta';
    meta.append(presenceLine);
    const topic = panel.querySelector('.team-topic-chip');
    if (topic) meta.append(topic.cloneNode(true));
    articleContent.append(meta);
    panel.querySelectorAll('p').forEach(p => articleContent.append(p.cloneNode(true)));
    if (state === 'sick') articleContent.append(paragraph('Участник остаётся на карте с отметкой больничного. Нажмите его место и назначьте другого человека.', 'team-flow-article__hint'));
    if (state === 'left') articleContent.append(paragraph(scenarioIndex === 7 && ['developer', 'business-analyst', 'release-manager'].includes(roleId)
      ? 'Этот участник ушёл из команды. В задании можно нанять только одного сотрудника; остальные обязанности придётся распределить.'
      : 'Участник исчезает с карты. Если подходящей замены нет, запуск остановится на его этапе.', 'team-flow-article__hint'));
  }

  function renderStageArticle(stage) {
    articleTitle.textContent = stage.title;
    articleContent.replaceChildren(paragraph(stage.detail));
    if (stage.id === 'retesting') {
      articleContent.append(
        paragraph('Регресс — другая проверка: не сломались ли после исправления остальные функции.'),
        paragraph('Верификация отвечает на вопрос «соответствует ли результат требованиям?», а валидация — «решает ли он задачу пользователя?». Это более широкие понятия, чем проверка одного исправленного дефекта.', 'team-flow-article__hint')
      );
    }
    if (stage.id === 'release' && branchEnabled()) {
      articleContent.append(paragraph('На повторном релизе проверенное срочное исправление выпускают в прод. До этого оно оставалось на тестовом стенде.', 'team-flow-article__hint'));
    }
    if (stage.id === 'smoke' && smokeNeedsHotfix) {
      articleContent.append(paragraph('После релиза Smoke обнаружил дефект. Команда готовит срочное исправление; в прод оно попадёт после проверок на повторном релизе.', 'team-flow-article__hint'));
    }
    stageRoles(stage).forEach((slot, index) => {
      const role = assignedRole(stage, slot);
      const prefix = stageRoles(stage).length > 1 ? `Участник ${index + 1}: ` : 'Вы назначили: ';
      articleContent.append(paragraph(`${prefix}${role ? roleNames.get(role) : 'пока никого'}.`, 'team-flow-article__assignment'));
    });
    if (progress[stage.id] === 'blocked') {
      const wave = waves.find(item => item.includes(stage.id))?.map(id => stageById.get(id)) || [stage];
      const problem = stageProblem(stage, wave);
      if (problem) articleContent.append(paragraph(`Почему остановилось: ${problem.message}`, 'team-flow-article__problem'));
    }
    articleContent.append(paragraph('Чтобы заменить человека, нажмите значок замены у его портрета. Подходит ли выбор, станет ясно при запуске.', 'team-flow-article__hint'));
    if (stage.id === 'support') articleContent.append(paragraph('Здесь показана передача информации службе поддержки после релиза.', 'team-flow-article__hint'));
  }

  function openArticle(type, id) {
    selected = { type, id };
    article.hidden = false;
    if (type === 'role') renderRoleArticle(id);
    else renderStageArticle(stageById.get(id));
    scheduleSave();
  }
  function refreshArticle() {
    if (selected) openArticle(selected.type, selected.id);
  }

  function portrait(role) {
    const image = document.createElement('img');
    image.src = roleImages.get(role);
    image.alt = '';
    image.dataset.role = role;
    return image;
  }
  function portraitFrame(role) {
    const frame = document.createElement('span');
    frame.className = 'team-flow-photo';
    frame.append(portrait(role));
    return frame;
  }
  function presenceBadge(state) {
    const badge = document.createElement('span');
    badge.className = `team-flow-presence-badge is-${state}`;
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = state === 'sick'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16v12H4zM9 8V5h6v3M12 11v6M9 14h6"></path></svg>'
      : state === 'new'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5M13 8l4 4-4 4M9 12h8"></path></svg>';
    return badge;
  }
  const replacementIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/></svg>';
  function chooseSlot(stage, slot) {
    hireMenuOpen = false;
    if (pendingSlot?.stageId === stage.id && pendingSlot.slot === slot) {
      pendingSlot = null;
      renderRoster();
      scheduleSave();
      return;
    }
    pendingSlot = { stageId: stage.id, slot };
    selected = null;
    article.hidden = true;
    renderRoster();
    const currentRole = assignedRole(stage, slot);
    setStatus(currentRole && presence[currentRole] === 'sick'
      ? `${roleNames.get(currentRole)} на больничном. Выберите в нижней панели коллегу, который временно возьмёт задачу на этапе «${stage.title}». Подходит ли замена, станет ясно при запуске.`
      : `Выберите участника в нижней панели для этапа «${stage.title}». Правильность назначения проверится при запуске.`);
  }
  function renderStageSlots(stage) {
    const container = stageSlots.get(stage.id);
    container.replaceChildren();
    for (const key of stageRoles(stage)) {
      const slot = document.createElement('div');
      slot.className = 'team-flow-slot';
      const role = assignedRole(stage, key);
      const state = role ? presence[role] : null;
      const possibleReplacement = [...rolePanels.keys()].some(candidate => presence[candidate] === 'active' && allowedRoles(stage, key).includes(candidate));
      if (role && state !== 'left') {
        const avatar = document.createElement('button');
        avatar.type = 'button';
        avatar.className = `team-flow-avatar${state === 'sick' ? ' is-sick' : ''}`;
        avatar.setAttribute('aria-label', `${roleNames.get(role)} — открыть карточку участника`);
        avatar.append(portraitFrame(role));
        avatar.addEventListener('click', () => openArticle('role', role));
        slot.append(avatar);
        if (state === 'sick') slot.append(presenceBadge('sick'));
      }
      if (!role || state === 'left' || state === 'sick') {
        if (!role || possibleReplacement) {
          const choose = document.createElement('button');
          choose.type = 'button';
          choose.className = `team-flow-slot__choose${state === 'sick' ? ' is-small' : ''}${pendingSlot?.stageId === stage.id && pendingSlot.slot === key ? ' is-pending' : ''}`;
          if (role) choose.innerHTML = replacementIcon;
          else choose.textContent = '+';
          choose.setAttribute('aria-label', `Выбрать участника для этапа «${stage.title}»`);
          choose.addEventListener('click', () => chooseSlot(stage, key));
          slot.append(choose);
        } else if (state === 'left') {
          const vacant = document.createElement('span');
          vacant.className = 'team-flow-slot__vacant';
          vacant.setAttribute('aria-label', 'Участник уволился; доступной замены нет');
          vacant.textContent = '—';
          slot.append(vacant);
        }
      } else {
        const change = document.createElement('button');
        change.type = 'button';
        change.className = `team-flow-slot__choose is-small${pendingSlot?.stageId === stage.id && pendingSlot.slot === key ? ' is-pending' : ''}`;
        change.innerHTML = replacementIcon;
        change.setAttribute('aria-label', `Заменить участника на этапе «${stage.title}»`);
        change.addEventListener('click', () => chooseSlot(stage, key));
        slot.append(change);
      }
      container.append(slot);
    }
  }
  function renderRoster() {
    stages.forEach(stage => {
      renderStageSlots(stage);
      stageButtons.get(stage.id).classList.toggle('is-branch-inactive', !visibleStage(stage));
      stageSlots.get(stage.id).classList.toggle('is-branch-inactive', !visibleStage(stage));
      stageButtons.get(stage.id).hidden = !visibleStage(stage);
      stageSlots.get(stage.id).hidden = !visibleStage(stage);
    });
    edgePaths.forEach(path => {
      if (path.classList.contains('is-hotfix')) path.classList.toggle('is-branch-hidden', !branchEnabled());
    });
    roster.classList.toggle('is-selecting', Boolean(pendingSlot));
    hirePanel.hidden = scenarioIndex !== 7;
    hireButton.hidden = scenarioIndex !== 7 || hireMenuOpen;
    hireButton.disabled = Boolean(pendingSlot || running || scenarioComplete);
    hireButton.setAttribute('aria-expanded', String(hireMenuOpen));
    hireButton.setAttribute('aria-label', hiredRole ? 'Заменить нанятого сотрудника' : 'Нанять сотрудника');
    const hireIcon = hireButton.querySelector('.team-flow-roster__hire-icon');
    if (hiredRole) hireIcon.innerHTML = replacementIcon;
    else hireIcon.textContent = '+';
    hireButton.querySelector('.team-flow-roster__hire-label').textContent = hiredRole
      ? 'Заменить сотрудника' : 'Нанять сотрудника';
    hireChoices.hidden = scenarioIndex !== 7 || !hireMenuOpen;
    hireChoices.querySelectorAll('.team-flow-roster__hire-option').forEach(option => {
      option.hidden = option.dataset.role === hiredRole;
    });
    rosterButtons.forEach((button, role) => {
      const state = presence[role];
      button.classList.toggle('is-sick', state === 'sick');
      button.classList.toggle('is-left', state === 'left');
      button.classList.toggle('is-candidate', Boolean(pendingSlot && state === 'active'));
      button.classList.toggle('is-unavailable', Boolean(pendingSlot && state !== 'active'));
      if (!hireMenuOpen) button.classList.remove('is-hire-preview');
      button.querySelector('.team-flow-presence-badge')?.remove();
      if (state !== 'active') button.append(presenceBadge(state));
      else if (scenarioIndex === 7 && role === hiredRole) button.append(presenceBadge('new'));
      button.setAttribute('aria-label', `${roleNames.get(role)} — ${role === hiredRole && scenarioIndex === 7 ? 'нанят, открыть карточку' : state === 'active' ? pendingSlot ? 'назначить' : 'открыть карточку' : state === 'sick' ? 'на больничном' : 'уволился'}`);
    });
    refreshArticle();
    updateControls();
  }
  function renderProgress() {
    stages.forEach(stage => {
      const button = stageButtons.get(stage.id);
      ['processing', 'done', 'blocked'].forEach(value => button.classList.toggle(`is-${value}`, progress[stage.id] === value));
      const needsHotfix = stage.id === 'smoke' && progress.smoke === 'done' && smokeNeedsHotfix;
      button.classList.toggle('is-review', needsHotfix);
      if (stage.kind === 'test') button.querySelector('small').textContent = {
        idle: stage.id === 'regression' ? 'Проверка других функций' : stage.id === 'retesting' ? 'На тестовом стенде' : stage.optional ? 'Если найден баг' : 'Тестирование',
        processing: 'Проверка', done: 'Пройдено', blocked: 'Остановлено'
      }[progress[stage.id]];
      if (needsHotfix) button.querySelector('small').textContent = 'Не пройдено';
    });
    updateControls();
  }
  function syncEdgeProgress() {
    edgePaths.forEach((path, key) => {
      const [from, to] = key.split(':');
      path.classList.remove('is-flowing', 'is-done', 'is-blocked', 'is-review');
      if (key === 'smoke:hotfix') path.setAttribute('marker-end', `url(#team-flow-${hotfixTriggered ? 'review' : 'feedback'}-arrow)`);
      if (key === 'smoke:hotfix' && hotfixTriggered && branchEnabled()) {
        path.classList.add('is-review');
        return;
      }
      if (!activeEdges().some(edge => edge[0] === from && edge[1] === to) || progress[from] !== 'done') return;
      if (progress[to] === 'done') path.classList.add('is-done');
      else if (progress[to] === 'blocked') path.classList.add('is-blocked');
    });
  }
  function renderScenario() {
    scenarioLine.replaceChildren(`${scenarioIndex}/7 · `);
    const topic = scenarioTopics[scenarioIndex];
    if (topic) {
      const chip = document.createElement('span');
      chip.className = 'team-topic-chip';
      chip.dataset.topic = topic.topic;
      chip.textContent = topic.label;
      scenarioLine.append(chip, ' ');
    }
    scenarioLine.append(scenarioCopy[scenarioIndex]);
  }
  function updateControls() {
    runButton.disabled = running || scenarioComplete;
    runButton.textContent = startsAfterSmoke() && waveIndex === hotfixWaveIndex ? '▶ Начать исправление'
      : waveIndex > 0 && waveIndex < waves.length ? '▶ Продолжить релиз' : '▶ Запустить релиз';
    resetButton.disabled = !running && waveIndex === (startsAfterSmoke() ? hotfixWaveIndex : 0) && !scenarioComplete && !observedOverloadFailure && !hiredRole
      && JSON.stringify({ assignments, presence }) === JSON.stringify({ assignments: scenarioStart?.assignments, presence: scenarioStart?.presence });
  }
  function showCompletion(focus = false) {
    completionTitle.textContent = `Задание ${scenarioIndex} выполнено`;
    completionText.textContent = completionCopy[scenarioIndex];
    completionNext.textContent = scenarioIndex === 7 ? 'К заданию 1' : `Перейти к заданию ${scenarioIndex + 1}`;
    completionRetry.hidden = courseCompleted;
    completionNext.hidden = courseCompleted;
    completionTasks.hidden = !courseCompleted;
    completion.hidden = false;
    frame.classList.add('is-overlay-open');
    frame.querySelector('.team-flow-header').inert = true;
    workspace.inert = true;
    if (focus) (courseCompleted ? completionTasks.querySelector('button') : completionNext).focus({ preventScroll: true });
  }
  function showIntro() {
    completionTitle.textContent = 'Начните с первого задания';
    completionText.textContent = 'Соберите команду для первого релиза. Выбирайте участников на карте и проверяйте результат запуском.';
    completionNext.textContent = 'Перейти к заданию 1';
    completionRetry.hidden = true;
    completionNext.hidden = false;
    completionTasks.hidden = true;
    completion.hidden = false;
    frame.classList.add('is-overlay-open');
    frame.querySelector('.team-flow-header').inert = true;
    workspace.inert = true;
  }
  function hideCompletion() {
    completion.hidden = true;
    frame.classList.remove('is-overlay-open');
    frame.querySelector('.team-flow-header').inert = false;
    workspace.inert = false;
  }
  function resetProgress() {
    stages.forEach(stage => { progress[stage.id] = 'idle'; });
    smokeNeedsHotfix = false;
    hotfixTriggered = false;
    edgePaths.forEach(path => path.classList.remove('is-flowing', 'is-done', 'is-blocked', 'is-review'));
    edgePaths.get('smoke:hotfix')?.setAttribute('marker-end', 'url(#team-flow-feedback-arrow)');
    waveIndex = 0;
    renderProgress();
  }
  function startAfterFailedSmoke() {
    if (!startsAfterSmoke()) return;
    for (let i = 0; i < hotfixWaveIndex; i += 1) waves[i].forEach(id => { progress[id] = 'done'; });
    waveIndex = hotfixWaveIndex;
    smokeNeedsHotfix = true;
    hotfixTriggered = true;
    renderProgress();
    syncEdgeProgress();
  }
  function invalidateFrom(stageId) {
    const affected = waves.findIndex(wave => wave.includes(stageId));
    if (affected < 0 || affected > waveIndex) return;
    if (affected <= hotfixWaveIndex - 1) {
      smokeNeedsHotfix = false;
      hotfixTriggered = false;
    }
    waveIndex = affected;
    for (let i = affected; i < waves.length; i += 1) waves[i].forEach(id => { progress[id] = 'idle'; });
    edgePaths.forEach(path => path.classList.remove('is-flowing', 'is-done', 'is-blocked', 'is-review'));
    renderProgress();
    syncEdgeProgress();
  }
  function rosterChanged(message, stageId = null) {
    if (running) { runToken += 1; running = false; resetProgress(); startAfterFailedSmoke(); }
    if (scenarioComplete) scenarioComplete = false;
    if (stageId === 'release' && startsAfterSmoke() && waveIndex >= repeatReleaseIndex) {
      waveIndex = repeatReleaseIndex;
      for (let i = repeatReleaseIndex; i < waves.length; i += 1) waves[i].forEach(id => { progress[id] = 'idle'; });
      edgePaths.forEach(path => path.classList.remove('is-flowing', 'is-done', 'is-blocked', 'is-review'));
      renderProgress();
      syncEdgeProgress();
    } else if (stageId && startsAfterSmoke() && waves.findIndex(wave => wave.includes(stageId)) < hotfixWaveIndex) {
      resetProgress();
      startAfterFailedSmoke();
    } else if (stageId) invalidateFrom(stageId);
    else {
      resetProgress();
      startAfterFailedSmoke();
    }
    renderRoster();
    renderProgress();
    setStatus(`${message} — запустите ${startsAfterSmoke() ? 'подготовку исправления' : 'релиз'}, чтобы проверить результат.`);
    scheduleSave();
  }
  function enterScenario(next, replay = false) {
    if (!replay && next >= 2 && next <= 4) {
      assignments.hotfix = {};
      assignments.retesting = {};
      assignments.regression = {};
    }
    runToken += 1;
    running = false;
    pendingSlot = null;
    hiredRole = null;
    hireMenuOpen = false;
    selected = null;
    article.hidden = true;
    hideCompletion();
    scenarioIndex = next;
    scenarioComplete = false;
    observedOverloadFailure = false;
    if (replay) {
      restoreSnapshot(replayStart(next));
    } else if (next === 1) {
      stages.forEach(stage => { assignments[stage.id] = {}; });
      Object.keys(presence).forEach(role => { presence[role] = 'active'; });
    } else if (next === 5) {
      const sickRole = assignedRole(stageById.get('design'), 'designer');
      if (sickRole) presence[sickRole] = 'sick';
    } else if (next === 6) {
      Object.keys(presence).forEach(role => { presence[role] = 'active'; });
      Object.assign(assignments, overloadedAssignments());
    } else if (next === 7) {
      restoreSnapshot(firedTeamStart());
    }
    resetProgress();
    startAfterFailedSmoke();
    if (startsAfterSmoke()) motion.focus(stageById.get('smoke').x, stageById.get('smoke').y, true);
    scenarioStart = currentSnapshot();
    renderScenario();
    renderRoster();
    renderProgress();
    setStatus(scenarioHelp[next]);
    saveState();
  }
  function scenarioFinished() {
    scenarioComplete = true;
    if (scenarioIndex === 7) courseCompleted = true;
    setStatus(`Задание ${scenarioIndex} выполнено.`, 'success');
    showCompletion(true);
    updateControls();
    saveState();
  }

  function makePath(from, to) {
    const start = stageById.get(from);
    const end = stageById.get(to);
    if (from === 'smoke' && to === 'hotfix') return 'M 2240 571 C 2240 300, 2185 165, 2077 150';
    if (from === 'hotfix' && to === 'retesting') return 'M 1883 150 C 1780 150, 1710 153, 1710 219';
    if (from === 'retesting' && to === 'regression') return 'M 1802 365 C 1828 365, 1848 365, 1873 365';
    if (from === 'regression' && to === 'release') return 'M 1975 404 C 1975 430, 1975 445, 1975 463';
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
    if (['hotfix', 'retesting', 'regression'].includes(from) || ['hotfix', 'retesting', 'regression'].includes(to)) {
      path.classList.add('is-hotfix');
      path.setAttribute('marker-end', 'url(#team-flow-feedback-arrow)');
    }
    lines.append(path);
    edgePaths.set(`${from}:${to}`, path);
  });
  stages.forEach(stage => {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'team-flow-node';
    node.dataset.kind = stage.kind;
    if (stage.optional) node.dataset.optional = 'true';
    node.style.left = `${stage.x}px`;
    node.style.top = `${stage.y}px`;
    const eyebrow = document.createElement('small');
    eyebrow.textContent = stage.id === 'regression' ? 'Проверка других функций'
      : stage.id === 'retesting' ? 'На тестовом стенде'
        : stage.id === 'hotfix' ? 'Подготовка исправления'
        : stage.optional ? 'Если найден баг' : stage.kind === 'test' ? 'Тестирование' : 'Этап';
    const name = document.createElement('strong');
    name.textContent = stage.title;
    node.append(eyebrow, name);
    node.addEventListener('click', () => openArticle('stage', stage.id));
    nodesRoot.append(node);
    stageButtons.set(stage.id, node);

    const avatars = document.createElement('div');
    avatars.className = 'team-flow-avatars';
    avatars.style.left = `${stage.x}px`;
    avatars.style.top = `${stage.y - 130}px`;
    nodesRoot.append(avatars);
    stageSlots.set(stage.id, avatars);
  });
  const roleTooltip = document.createElement('div');
  roleTooltip.className = 'team-flow-roster__tooltip';
  roleTooltip.setAttribute('role', 'tooltip');
  roleTooltip.hidden = true;
  workspace.append(roleTooltip);
  let roleTooltipArmTimer = 0;
  let roleTooltipArmed = false;
  let roleTooltipTarget = null;
  function hideRoleTooltip() {
    roleTooltip.hidden = true;
    roleTooltipTarget = null;
  }
  function disarmRoleTooltip() {
    clearTimeout(roleTooltipArmTimer);
    roleTooltipArmTimer = 0;
    roleTooltipArmed = false;
    hideRoleTooltip();
  }
  function armRoleTooltip() {
    if (roleTooltipArmed || roleTooltipArmTimer) return;
    roleTooltipArmTimer = setTimeout(() => {
      roleTooltipArmTimer = 0;
      roleTooltipArmed = true;
      if (roleTooltipTarget) showRoleTooltip(roleTooltipTarget);
    }, 1000);
  }
  function showRoleTooltip(button) {
    if (!roleTooltipArmed || !button.isConnected) return;
    roleTooltip.textContent = roleNames.get(button.dataset.role).split(' — ')[0];
    roleTooltip.hidden = false;
    const area = workspace.getBoundingClientRect();
    const icon = button.getBoundingClientRect();
    const center = icon.left + icon.width / 2 - area.left;
    const halfWidth = roleTooltip.offsetWidth / 2;
    roleTooltip.style.left = `${Math.max(halfWidth + 8, Math.min(area.width - halfWidth - 8, center))}px`;
    roleTooltip.style.top = `${Math.max(8, icon.top - area.top - roleTooltip.offsetHeight - 9)}px`;
  }
  function selectRoleTooltip(button) {
    roleTooltipTarget = button;
    armRoleTooltip();
    showRoleTooltip(button);
  }
  function leaveRoleTooltip(button) {
    if (roleTooltipTarget !== button) return;
    hideRoleTooltip();
  }
  bottomBar.addEventListener('pointerenter', armRoleTooltip);
  bottomBar.addEventListener('pointerleave', disarmRoleTooltip);
  bottomBar.addEventListener('focusin', armRoleTooltip);
  bottomBar.addEventListener('focusout', event => {
    if (!bottomBar.contains(event.relatedTarget)) disarmRoleTooltip();
  });
  roster.addEventListener('scroll', hideRoleTooltip);
  window.addEventListener('resize', hideRoleTooltip);
  rolePanels.forEach((panel, role) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'team-flow-roster__person';
    button.dataset.role = role;
    button.append(portraitFrame(role));
    button.addEventListener('pointerenter', () => selectRoleTooltip(button));
    button.addEventListener('pointerleave', () => leaveRoleTooltip(button));
    button.addEventListener('focus', () => selectRoleTooltip(button));
    button.addEventListener('blur', () => leaveRoleTooltip(button));
    button.addEventListener('click', () => {
      hideRoleTooltip();
      if (hireMenuOpen) {
        hireMenuOpen = false;
        renderRoster();
      }
      if (!pendingSlot) {
        openArticle('role', role);
        return;
      }
      const stage = stageById.get(pendingSlot.stageId);
      const slot = pendingSlot.slot;
      if (presence[role] !== 'active') {
        setStatus(`${roleNames.get(role)} сейчас отсутствует — выберите человека, который находится в команде.`, 'error');
        return;
      }
      const previous = assignedRole(stage, slot);
      assignments[stage.id][slot] = role;
      pendingSlot = null;
      rosterChanged(`${roleNames.get(role)} ${previous ? 'теперь назначен' : 'назначен'} на этап «${stage.title}»`, stage.id);
    });
    roster.append(button);
    rosterButtons.set(role, button);
  });
  hireButton.type = 'button';
  hireButton.className = 'team-flow-roster__hire';
  hireButton.innerHTML = '<span class="team-flow-slot__choose team-flow-roster__hire-icon" aria-hidden="true">+</span><span class="team-flow-roster__hire-label">Нанять сотрудника</span>';
  hireButton.addEventListener('click', () => {
    if (scenarioIndex !== 7 || pendingSlot || running || scenarioComplete) return;
    hideRoleTooltip();
    hireMenuOpen = true;
    renderRoster();
    setStatus(hiredRole ? 'Выберите другого кандидата в плашке найма.' : 'Можно нанять только одного сотрудника. Выберите кандидата в плашке найма.');
  });
  hireChoices.className = 'team-flow-roster__hire-options';
  hireChoices.id = 'team-flow-hire-options';
  hireButton.setAttribute('aria-controls', hireChoices.id);
  hireChoices.setAttribute('role', 'group');
  hireChoices.setAttribute('aria-label', 'Кого нанять');
  for (const role of ['developer', 'business-analyst', 'release-manager']) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'team-flow-roster__person team-flow-roster__hire-option';
    option.dataset.role = role;
    option.setAttribute('aria-label', `Нанять: ${roleNames.get(role)}`);
    option.append(portraitFrame(role));
    option.addEventListener('pointerenter', () => selectRoleTooltip(option));
    option.addEventListener('pointerenter', () => rosterButtons.get(role).classList.add('is-hire-preview'));
    option.addEventListener('pointerleave', () => {
      leaveRoleTooltip(option);
      rosterButtons.get(role).classList.remove('is-hire-preview');
    });
    option.addEventListener('focus', () => {
      selectRoleTooltip(option);
      rosterButtons.get(role).classList.add('is-hire-preview');
    });
    option.addEventListener('blur', () => {
      leaveRoleTooltip(option);
      rosterButtons.get(role).classList.remove('is-hire-preview');
    });
    option.addEventListener('click', () => {
      if (scenarioIndex !== 7 || running || role === hiredRole || presence[role] !== 'left') return;
      const previous = hiredRole;
      if (previous) {
        presence[previous] = 'left';
        stages.forEach(stage => {
          Object.keys(assignments[stage.id]).forEach(slot => {
            if (assignments[stage.id][slot] === previous) delete assignments[stage.id][slot];
          });
        });
      }
      hiredRole = role;
      presence[role] = 'active';
      hireMenuOpen = false;
      hideRoleTooltip();
      rosterChanged(previous ? `${roleNames.get(role)} нанят вместо ${roleNames.get(previous)}. Назначения прежнего сотрудника освободились` : `${roleNames.get(role)} принят в команду`);
      hireButton.focus();
    });
    hireChoices.append(option);
  }
  hirePanel.append(hireButton, hireChoices);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 45 : ms));
  async function runRelease() {
    if (running || scenarioComplete) return;
    if (waveIndex === waves.length) resetProgress();
    pendingSlot = null;
    hireMenuOpen = false;
    article.hidden = true;
    selected = null;
    running = true;
    renderRoster();
    const token = ++runToken;
    updateControls();
    scheduleSave();
    while (waveIndex < waves.length) {
      if (!branchEnabled() && waveIndex >= hotfixWaveIndex && waveIndex <= repeatSmokeIndex) { waveIndex += 1; continue; }
      const wave = waves[waveIndex].map(id => stageById.get(id)).filter(visibleStage);
      if (!wave.length) { waveIndex += 1; continue; }
      const center = wave.reduce((sum, stage) => ({ x: sum.x + stage.x, y: sum.y + stage.y }), { x: 0, y: 0 });
      motion.focus(center.x / wave.length, center.y / wave.length, true);
      setStatus(wave.length === 1
        ? `Команда выполняет этап «${wave[0].title}».`
        : `Команда одновременно выполняет этапы ${joinList(wave.map(stage => `«${stage.title}»`))}.`);
      const incomingEdges = activeEdges().filter(([from, to]) => wave.some(stage => stage.id === to)
        && (to !== 'release' || (waveIndex === repeatReleaseIndex ? from === 'regression' : from !== 'regression')));
      const incoming = incomingEdges.map(([from, to]) => edgePaths.get(`${from}:${to}`));
      incoming.forEach(path => { path.classList.remove('is-blocked'); path.classList.add('is-flowing'); });
      await wait(650);
      if (token !== runToken) return;
      incoming.forEach(path => path.classList.remove('is-flowing'));
      wave.forEach(stage => { progress[stage.id] = 'processing'; });
      renderProgress();
      await wait(340);
      if (token !== runToken) return;
      const problems = wave.map(stage => ({ stage, problem: stageProblem(stage, wave) }));
      const first = problems.find(item => item.problem);
      problems.forEach(({ stage, problem }) => {
        progress[stage.id] = problem ? 'blocked' : 'done';
        incomingEdges.filter(([, to]) => to === stage.id).forEach(([from, to]) => {
          const path = edgePaths.get(`${from}:${to}`);
          path.classList.remove('is-blocked', 'is-done');
          path.classList.add(problem ? 'is-blocked' : 'is-done');
        });
      });
      if (!first && wave.some(stage => stage.id === 'smoke') && branchEnabled()) {
        if (waveIndex === hotfixWaveIndex - 1) {
          smokeNeedsHotfix = true;
          hotfixTriggered = true;
        } else if (waveIndex === repeatSmokeIndex) {
          smokeNeedsHotfix = false;
        }
      }
      renderProgress();
      syncEdgeProgress();
      if (first) {
        running = false;
        renderRoster();
        if (scenarioIndex === 6 && first.problem.type === 'parallel') {
          observedOverloadFailure = true;
        }
        setStatus(first.problem.message, 'error');
        updateControls();
        saveState();
        return;
      }
      waveIndex += 1;
      saveState();
      await wait(170);
      if (token !== runToken) return;
    }
    running = false;
    scenarioFinished();
  }

  function zoomBy(factor) {
    const current = motion.snapshot();
    const nextScale = Math.max(.4, Math.min(1.6, current.scale * factor));
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
  completionNext.addEventListener('click', () => {
    if (!introDismissed) {
      introDismissed = true;
      hideCompletion();
      saveState();
      return;
    }
    enterScenario(scenarioIndex === 7 ? 1 : scenarioIndex + 1);
  });
  completionRetry.addEventListener('click', resetScenario);
  for (let task = 1; task <= 7; task += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(task);
    button.dataset.tooltip = `Перейти к заданию ${task}`;
    button.setAttribute('aria-label', `Перейти к заданию ${task}`);
    button.addEventListener('click', () => enterScenario(task, true));
    completionTasks.append(button);
  }
  frame.addEventListener('wheel', event => {
    if (!completion.hidden) return;
    if (!mapScrollActive) return;
    if (viewport.contains(event.target)) return;
    if (roster.contains(event.target)) {
      event.preventDefault();
      roster.scrollLeft += event.deltaX + event.deltaY;
      return;
    }
    event.preventDefault();
  }, { passive: false });
  frame.addEventListener('touchmove', event => {
    if (!completion.hidden) return;
    if (viewport.contains(event.target) || roster.contains(event.target)) return;
    event.preventDefault();
  }, { passive: false });
  frame.addEventListener('keydown', event => {
    if (!completion.hidden) return;
    if (viewport.contains(event.target) || roster.contains(event.target)) return;
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
  });
  function resetScenario() {
    runToken += 1;
    running = false;
    pendingSlot = null;
    hideCompletion();
    restoreSnapshot(scenarioStart);
    hiredRole = null;
    hireMenuOpen = false;
    observedOverloadFailure = false;
    scenarioComplete = false;
    resetProgress();
    startAfterFailedSmoke();
    renderRoster();
    renderScenario();
    setStatus(`Сценарий ${scenarioIndex} начат заново. ${scenarioHelp[scenarioIndex]}`);
    saveState();
  }
  resetButton.addEventListener('click', resetScenario);
  document.getElementById('team-flow-article-close').addEventListener('click', () => {
    article.hidden = true;
    selected = null;
    scheduleSave();
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
  bottomBar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && hireMenuOpen) {
      hireMenuOpen = false;
      renderRoster();
      hireButton.focus();
      setStatus(scenarioHelp[7]);
      return;
    }
    if (event.key === 'Escape' && pendingSlot) {
      pendingSlot = null;
      renderRoster();
      setStatus('Выбор участника отменён — состав команды не изменился.');
    }
  });
  workspace.addEventListener('pointerdown', event => {
    if (!hireMenuOpen || bottomBar.contains(event.target)) return;
    hireMenuOpen = false;
    renderRoster();
  });

  const saved = loadState();
  if (saved) {
    scenarioIndex = saved.scenarioIndex;
    introDismissed = saved.introDismissed ?? (scenarioIndex > 1 || saved.waveIndex > 0
      || Object.values(saved.assignments).some(roles => Object.keys(roles).length > 0)
      || Object.values(saved.presence).some(state => state !== 'active'));
    scenarioStart = saved.scenarioStart;
    restoreSnapshot(saved);
    stages.forEach(stage => { progress[stage.id] = saved.progress[stage.id] === 'processing' ? 'idle' : saved.progress[stage.id]; });
    waveIndex = Math.max(0, Math.min(waves.length, Number(saved.waveIndex) || 0));
    hotfixTriggered = saved.hotfixTriggered ?? (scenarioIndex > 1 && waveIndex >= hotfixWaveIndex);
    smokeNeedsHotfix = saved.smokeNeedsHotfix ?? (hotfixTriggered && waveIndex <= repeatSmokeIndex && progress.smoke === 'done');
    observedOverloadFailure = Boolean(saved.observedOverloadFailure);
    hiredRole = saved.hiredRole || null;
    scenarioComplete = Boolean(saved.scenarioComplete);
    courseCompleted = Boolean(saved.courseCompleted || scenarioIndex === 7 && scenarioComplete);
    let staleBlock = false;
    stages.forEach(stage => {
      if (progress[stage.id] !== 'blocked') return;
      const wave = waves.find(item => item.includes(stage.id))?.map(id => stageById.get(id)) || [stage];
      if (stageProblem(stage, wave)) return;
      progress[stage.id] = 'idle';
      staleBlock = true;
    });
    selected = saved.selected && (saved.selected.type === 'role' ? rolePanels.has(saved.selected.id) : stageById.has(saved.selected.id)) ? saved.selected : null;
    pendingSlot = saved.pendingSlot && stageById.has(saved.pendingSlot.stageId)
      && stageRoles(stageById.get(saved.pendingSlot.stageId)).includes(saved.pendingSlot.slot) ? saved.pendingSlot : null;
    motion.restore(saved.camera || { x: 0, y: 0, scale: .78 });
    if (staleBlock) { statusLine.textContent = 'Назначенные роли подходят — порядок портретов не важен. Продолжите релиз.'; statusLine.dataset.tone = ''; }
    else if (saved.status) { statusLine.textContent = saved.status; statusLine.dataset.tone = saved.tone || ''; }
  } else {
    scenarioStart = currentSnapshot();
    motion.restore({ x: 0, y: 0, scale: .78 });
    motion.focus(500, 320, false);
    statusLine.textContent = scenarioHelp[1];
  }
  restoring = false;
  renderScenario();
  renderRoster();
  renderProgress();
  syncEdgeProgress();
  if (scenarioComplete) showCompletion();
  else if (!introDismissed) showIntro();
  if (!storageAvailable) setStatus('Браузер не разрешил сохранить прогресс: после обновления страницы он может исчезнуть.', 'error');
  else saveState();
})();
