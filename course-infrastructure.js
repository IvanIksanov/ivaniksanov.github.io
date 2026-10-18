(() => {
  'use strict';
  if (document.body.dataset.chapter !== '3') return;

  const KEY = 'qatodev_course_infrastructure_v2';
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const icons = {
    client: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    balancer: '<path d="M12 3v18M5 7h14M4 7l-2 5h6l-2-5m12 0-2 5h6l-2-5M2 12c0 2 6 2 6 0m8 0c0 2 6 2 6 0M8 21h8"/>',
    server: '<rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    auth: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    catalog: '<path d="M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5"/>',
    payment: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    keycloak: '<path d="M12 3 4 7v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7z"/><path d="m9 12 2 2 4-4"/>',
    bank: '<path d="m3 9 9-5 9 5M4 20h16M6 10v8m4-8v8m4-8v8m4-8v8"/>'
  };
  const nodes = [
    { id: 'client', title: 'Клиент', icon: 'client', x: 640, y: 460, width: 292 },
    { id: 'balancer', title: 'Балансировщик', icon: 'balancer', x: 1170, y: 530, width: 292 },
    { id: 'app-a', title: 'Сервер приложения A', icon: 'server', x: 1660, y: 365, width: 292 },
    { id: 'app-b', title: 'Сервер приложения B', icon: 'server', x: 1660, y: 735, width: 292 },
    { id: 'svc-auth', title: 'Авторизация', icon: 'auth', x: 2095, y: 355, width: 188 },
    { id: 'svc-catalog', title: 'Каталог товаров', icon: 'catalog', x: 2095, y: 545, width: 188 },
    { id: 'svc-payment', title: 'Оплата', icon: 'payment', x: 2095, y: 735, width: 188 },
    { id: 'database', title: 'PostgreSQL · каталог', icon: 'database', x: 2510, y: 560, width: 292 },
    { id: 'ext-keycloak', title: 'Keycloak', icon: 'keycloak', x: 2480, y: 255, width: 160 },
    { id: 'ext-gateway', title: 'Платёжный API', icon: 'payment', x: 2480, y: 830, width: 170 },
    { id: 'ext-bank', title: 'Банк / эквайер', icon: 'bank', x: 2765, y: 830, width: 155 }
  ];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const articles = {
    'tool-developer': ['Компьютер разработчика', 'Разработчик меняет код локально и отправляет commit в Bitbucket. Кнопка выпуска проходит этот путь шаг за шагом. Изменение ещё не влияет на production, пока не завершатся проверки и rollout.'],
    'tool-bitbucket': ['Bitbucket · Git', 'Хранит исходный код и историю commit. Jenkins берёт код из репозитория для сборки. Если код повреждён, сборка остановится; уже работающая версия в production останется доступной.'],
    'tool-jenkins': ['Jenkins · CI/CD', 'Pipeline получает commit, собирает приложение и запускает проверки. Только успешная сборка с прошедшими тестами передаёт артефакт в Kubernetes. Тестовые стенды в реальном процессе возможны, но здесь показан выпуск в production.'],
    'tool-kubernetes': ['Kubernetes · production', 'Управляет Deployment входного приложения и отдельных микросервисов. Когда в шаблоне Pod меняется образ, Kubernetes сам проводит rollout. Если Deployment каталога не обновили, его работающий Pod останется на старом образе; перезапуск с тем же закреплённым образом проблему не решает.'],
    'tool-prometheus': ['Prometheus · метрики', 'По настройке опрашивает /metrics у приложения и экспортёров. Здесь показаны учебные показатели последнего запроса; Prometheus не собирает автоматически все логи и не чинит сбои.'],
    'tool-grafana': ['Grafana · дашборд', 'Запрашивает данные у Prometheus и строит графики. Отсутствие данных мониторинга не всегда означает отказ самого магазина.'],
    'tool-rabbitmq': ['RabbitMQ · брокер сообщений', 'Микросервис публикует событие в exchange, брокер направляет его в очередь конкретного подписчика. Отправка события ещё не означает успешную обработку. RabbitMQ не участвует в HTTP-запросе и не доставляет commit в production.'],
    'tool-pgadmin': ['pgAdmin · PostgreSQL', 'Служебный клиент для ручного подключения к базе каталога. Он не участвует ни в сборке приложения, ни в доставке артефакта.'],
    client: ['Клиент · запрос', 'Отправь запрос к каталогу, авторизации или оплате. Балансировщик выбирает готовый Pod A либо B, а тот обращается только к нужному микросервису. Деплой сам по себе не отправляет ответ браузеру: после выпуска выполняется отдельный контрольный GET.'],
    balancer: ['Балансировщик', 'Направляет новый запрос к готовой копии приложения через настроенный вход в Kubernetes. После обнаружения отказа узла его Pod исключается из маршрута; во время обнаружения возможны ошибки.'],
    'app-a': ['Сервер приложения A · Worker Node', 'Это узел Kubernetes, а не само приложение. На нём работает kubelet и Pod A с контейнером приложения. Отключение узла делает Pod недоступным; при работающем B новые запросы после обнаружения отказа идут через B.'],
    'app-b': ['Сервер приложения B · Worker Node', 'Это второй узел Kubernetes с kubelet и Pod B. В показанной модели нужные реплики микросервисов доступны на оставшемся узле; один работающий Pod входного приложения сам по себе не гарантирует работу зависимостей.'],
    'svc-auth': ['Авторизация', 'Сервис проверки доступа. Keycloak участвует в новом входе по выбранному сценарию; это не обязательный сетевой вызов на каждый запрос с действующим токеном. При отказе возможна частичная неисправность.'],
    'svc-catalog': ['Каталог товаров', 'Самостоятельный сервис с API, читающий и меняющий товары в PostgreSQL. Отказ каталога не обязан ломать оплату и все остальные функции.'],
    'svc-payment': ['Оплата', 'Сервис обращается к внешнему платёжному API. Принятие запроса ещё не равно подтверждению успешной оплаты. Только после подтверждения можно опубликовать событие PaymentSucceeded.'],
    database: ['PostgreSQL · каталог', 'Хранит товары для сервиса каталога. Деплой приложения не означает автоматического изменения таблиц. Отказ базы нарушает операции каталога, которым нужны данные.'],
    'ext-keycloak': ['Keycloak', 'Внешняя система входа. Существующие токены могут продолжать работать, когда новый вход недоступен.'],
    'ext-gateway': ['Платёжный API', 'Внешний провайдер; при таймауте платёж может остаться в неопределённом состоянии. Перед повтором важно проверить итоговый статус.'],
    'ext-bank': ['Банк / эквайер', 'Внешняя платёжная инфраструктура; в показанном pipeline не участвует.'],
    tasks: ['Задания · CI/CD', 'Проведи выпуск версии, воспроизведи сбои на разных этапах и проверь, какую версию видит клиент.']
  };
  const qaGuides = {
    'tool-jenkins': ['Сборка, тесты и запуск выпуска.', 'Получает commit из Bitbucket; после проверок публикует образ и инициирует rollout.', 'Сравни статус pipeline и версию production.', 'При сбое сборки или тестов прежняя версия остаётся работать.'],
    'tool-kubernetes': ['Поддерживает нужное число готовых Pod.', 'Отдельно обновляет Deployment приложения и микросервисов.', 'Сравни версии входных Pod и Pod каталога после выпуска.', 'Образ в реестре сам по себе не обновляет работающий Pod.'],
    'app-a': ['Worker Node A — машина Kubernetes.', 'kubelet запускает Pod A с контейнером приложения.', 'Отключи узел и проверь маршрут через B.', 'Node NotReady отличается от отказа одного Pod.'],
    'app-b': ['Worker Node B — вторая машина.', 'Поддерживает Pod B с теми же возможностями.', 'Проверь новую выдачу после отказа A.', 'Если оба узла недоступны, показанные Pod не работают.'],
    balancer: ['Направляет запрос к готовому Pod.', 'Использует настроенный вход в кластер.', 'Посмотри, в A или B попал запрос.', 'Переключение после отказа не обязано быть мгновенным.'],
    'svc-auth': ['Проверяет доступ.', 'Для нового входа может зависеть от Keycloak.', 'Сравни новый вход и запрос с действующим токеном.', 'Отказ входа не обязан останавливать каталог для уже вошедших пользователей.'],
    'svc-catalog': ['Отдаёт товары через API.', 'Читает данные из PostgreSQL.', 'Сравни запрос каталога и независимую оплату.', 'Сбой каталога даёт частичную неисправность.'],
    'svc-payment': ['Обрабатывает платёж.', 'Обращается к внешнему платёжному API; после подтверждения может публиковать событие.', 'Проверь итоговый статус и повторный запрос.', 'Таймаут не доказывает, что платёж не прошёл.'],
    'tool-rabbitmq': ['Передаёт фоновые события.', 'Маршрутизирует публикацию в очередь подписчика.', 'Проверь доставку и фактическую обработку отдельно.', 'Публикация не равна завершению фоновой задачи.'],
    'tool-prometheus': ['Собирает настроенные метрики.', 'Опрашивает /metrics у доступных источников.', 'Сравни готовность Pod и частоту ошибок.', 'Нет метрик не всегда значит, что магазин упал.'],
    'tool-grafana': ['Показывает метрики на дашборде.', 'Запрашивает сохранённые показатели у Prometheus.', 'Сопоставь момент сбоя и изменение графика.', 'Grafana сама не восстанавливает сервис.']
  };
  const tasks = [
    { id: 'release', title: 'Выпустить новую версию в production', steps: [['tool-developer', 'Подготовь изменение; код должен быть исправен.', 'Подготовить изменение'], ['tool-jenkins', 'Убедись, что тесты проходят.', 'Исправить тесты'], ['tool-kubernetes', 'Оставь конфигурацию production исправной.', 'Исправить конфигурацию'], ['tool-developer', 'Запусти выпуск и проследи путь commit через Bitbucket и Jenkins.', 'Выпустить версию'], ['client', 'Контрольный GET возвращает 200 с новой версией.', 'Открыть ответ']] },
    { id: 'build', title: 'Остановить релиз на сборке', steps: [['tool-developer', 'Повреди исходный код на компьютере разработчика.', 'Повредить код'], ['tool-developer', 'Запусти выпуск версии.', 'Выпустить версию'], ['client', 'Сравни: сборка упала, но прежняя версия в production всё ещё отвечает 200.', 'Открыть ответ']] },
    { id: 'tests', title: 'Остановить релиз на тестах', steps: [['tool-developer', 'Исправь код, если он повреждён.', 'Исправить код'], ['tool-jenkins', 'Включи падение тестов и запусти выпуск.', 'Провалить тесты'], ['client', 'В журнале проверь остановку pipeline; клиент получает старую версию с 200.', 'Открыть журнал']] },
    { id: 'rollout', title: 'Получить 503 после неудачного rollout', steps: [['tool-developer', 'Исправь исходный код, если он повреждён.', 'Исправить код'], ['tool-jenkins', 'Верни проходящие тесты.', 'Исправить тесты'], ['tool-kubernetes', 'Повреди конфигурацию production.', 'Повредить конфигурацию'], ['tool-developer', 'Запусти выпуск и дождись контрольного GET.', 'Выпустить версию'], ['client', 'Проверь 503: код прошёл CI, но оба экземпляра недоступны.', 'Открыть ответ']] },
    { id: 'rollback', title: 'Откатить сломанную версию', steps: [['tool-kubernetes', 'После неудачного rollout нажми «Откатить релиз».', 'Откатить релиз'], ['client', 'Контрольный GET снова возвращает 200 и прежнюю рабочую версию.', 'Открыть ответ']] },
    { id: 'observe', title: 'Найти сбой по метрикам', steps: [['tool-kubernetes', 'Воспроизведи неудачный rollout с ответом 503.', 'Повредить конфигурацию'], ['tool-grafana', 'Открой Grafana: сравни статус клиента и рост ошибок после выпуска.', 'Открыть карточку']] },
    { id: 'failover', title: 'Выключить узел A и проверить маршрут через B', steps: [['app-a', 'Выключи именно Worker Node A: его kubelet и Pod станут недоступны.', 'Выключить узел A'], ['client', 'Отправь запрос каталога после обнаружения сбоя.', 'Запросить каталог'], ['balancer', 'Убедись, что новый запрос прошёл через готовый Pod B. Оба нужных сервиса должны быть доступны.', 'Открыть карточку']] },
    { id: 'partial', title: 'Отличить отказ каталога от отказа сайта', steps: [['svc-catalog', 'Отключи сервис каталога, оставив узлы и оплату доступными.', 'Отключить'], ['client', 'Запроси каталог и получи ошибку.', 'Запросить каталог'], ['client', 'Проверь оплату: независимая операция может продолжить работать.', 'Проверить оплату']] },
    { id: 'events', title: 'Проследить событие оплаты', steps: [['client', 'Отправь запрос оплаты при доступном платёжном API.', 'Проверить оплату'], ['tool-rabbitmq', 'Открой брокер: PaymentSucceeded появился после подтверждения платежа. Проверь, что публикация ещё не означает обработку подписчиком.', 'Открыть карточку']] },
    { id: 'catalog-rollout', title: 'Найти старую версию каталога после релиза', steps: [['tool-kubernetes', 'Пропусти обновление Deployment каталога в учебном выпуске.', 'Пропустить rollout каталога'], ['tool-developer', 'Выпусти новую версию. Входные Pod обновятся, каталог останется на прежнем образе.', 'Выпустить версию'], ['client', 'Запроси каталог: HTTP 200 не доказывает, что ответила новая версия сервиса.', 'Запросить каталог'], ['svc-catalog', 'Сравни версию Pod каталога с версией выпуска.', 'Открыть карточку'], ['tool-kubernetes', 'Обнови образ Deployment каталога; Kubernetes заменит его Pod.', 'Обновить образ каталога'], ['client', 'Повтори запрос и проверь новую serviceVersion в ответе.', 'Запросить каталог']] }
  ];
  const initial = () => ({ productionVersion: 2, lastHealthyVersion: 2, podVersions: { a: 2, b: 2 }, serviceVersions: { auth: 2, catalog: 2, payment: 2 }, lastHealthyServiceVersions: null, skipCatalogRollout: false, staleCatalogSeen: false, catalogFixedAfterStale: false, pendingVersion: null, revision: 1, lastCommit: null, brokenSource: false, brokenTests: false, brokenConfig: false, healthy: true, nodeOnline: { a: true, b: true }, serviceOnline: { auth: true, catalog: true, payment: true, database: true, keycloak: true, gateway: true, rabbitmq: true, prometheus: true, grafana: true }, partialCatalogFailure: false, lastEvent: '', lastRun: null, response: { code: 200, version: 2, route: 'A', kind: 'catalog', body: { status: 'ok', version: 'v2', serviceVersion: 'v2', products: 2 } }, article: '', journalOpen: false, selectedStep: '', expandedTask: '', completed: [], camera: null });
  let state = initial();
  let savedState = null;
  try { savedState = JSON.parse(localStorage.getItem(KEY) || 'null'); if (savedState && typeof savedState === 'object') state = { ...state, ...savedState }; } catch {}
  state.nodeOnline = { a: true, b: true, ...state.nodeOnline };
  state.serviceOnline = { ...initial().serviceOnline, ...state.serviceOnline };
  state.podVersions = { a: state.productionVersion, b: state.productionVersion, ...state.podVersions };
  state.serviceVersions = { auth: state.productionVersion, catalog: state.productionVersion, payment: state.productionVersion, ...(savedState?.serviceVersions || {}) };
  state.lastHealthyServiceVersions = { ...state.serviceVersions, ...state.lastHealthyServiceVersions };
  if (state.article && !articles[state.article]) state.article = '';
  const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
  const viewport = $('#course-scroller');
  const canvas = $('#course-canvas');
  const nodeHost = $('#course-nodes');
  const lineHost = $('#course-lines');
  const toolHost = $('#course-tools');
  const article = $('#course-article');
  const journal = $('#course-network-panel');
  const playButton = $('#course-play');
  const resetButton = $('#course-reset');
  const intro = $('.course-intro');
  let motion;
  let busy = false;
  let runId = 0;
  let saveTimer = 0;
  let replayId = 0;
  let replayCleanup = () => {};
  const readyNodes = () => ['a', 'b'].filter(id => state.healthy && state.nodeOnline[id]);
  const serviceFor = { 'svc-auth': 'auth', 'svc-catalog': 'catalog', 'svc-payment': 'payment', database: 'database', 'ext-keycloak': 'keycloak', 'ext-gateway': 'gateway', 'tool-rabbitmq': 'rabbitmq', 'tool-prometheus': 'prometheus', 'tool-grafana': 'grafana' };

  intro.querySelector('.course-eyebrow').textContent = 'Вводный курс · глава 03';
  intro.querySelector('h1').textContent = 'Инфраструктура';
  $('#course-tasks').textContent = 'Задания';
  const phaseLabel = document.createElement('span');
  phaseLabel.className = 'course-infra-phase';
  phaseLabel.setAttribute('aria-live', 'polite');
  intro.append(phaseLabel);
  viewport.setAttribute('aria-label', 'Схема выпуска версии в production');
  journal.setAttribute('aria-label', 'Журнал выпуска версии');
  lineHost.setAttribute('viewBox', '0 0 3100 1100');

  function save() {
    state.completed = [...completed];
    state.journalOpen = !journal.hidden;
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, camera: motion?.snapshot() || state.camera })); } catch {}
  }
  function point(id, side) {
    const node = byId.get(id);
    return { x: node.x + (side === 'right' ? node.width : 0), y: node.y + (id.startsWith('svc-') ? 62 : id.startsWith('ext-') ? 48 : 91) };
  }
  function drawLines() {
    const edges = [['client', 'balancer'], ['balancer', 'app-a'], ['balancer', 'app-b'], ['app-a', 'svc-auth'], ['app-a', 'svc-catalog'], ['app-a', 'svc-payment'], ['app-b', 'svc-auth'], ['app-b', 'svc-catalog'], ['app-b', 'svc-payment'], ['svc-catalog', 'database'], ['svc-auth', 'ext-keycloak'], ['svc-payment', 'ext-gateway'], ['ext-gateway', 'ext-bank']];
    lineHost.replaceChildren();
    for (const [from, to] of edges) {
      const a = point(from, 'right');
      const b = point(to, 'left');
      const bend = Math.max(35, Math.abs(b.x - a.x) * .42);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`);
      path.dataset.infraRoute = `${from}:${to}`;
      path.dataset.infraKind = from === 'client' || from === 'balancer' ? 'request' : 'service';
      if (path.dataset.infraKind === 'service') path.dataset.infraService = [from, to].includes('svc-auth') ? 'auth' : [from, to].includes('svc-catalog') || to === 'database' ? 'catalog' : 'payment';
      path.classList.add('is-infra-runtime');
      if (from === 'app-a' && to.startsWith('svc-')) path.classList.add('is-primary-route');
      if (from === 'app-b' && to.startsWith('svc-')) path.classList.add('is-backup-route');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      label.textContent = `${byId.get(from).title} → ${byId.get(to).title}: ${path.dataset.infraKind === 'request' ? 'путь запроса к готовой копии' : 'вызов нужного API или зависимости'}`;
      path.append(label);
      lineHost.append(path);
    }
    const peer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    peer.classList.add('course-micro-peer-link');
    const peerX = byId.get('app-a').x + 266;
    const peerTop = byId.get('app-a').y + 122;
    const peerBottom = byId.get('app-b').y + 56;
    const middle = (peerTop + peerBottom) / 2;
    peer.innerHTML = `<title>A и B — две копии с одинаковыми возможностями; линия обозначает резервирование, а не обязательный прямой запрос между ними</title><path class="course-micro-peer-link__line" d="M ${peerX} ${peerTop} L ${peerX} ${peerBottom}"/><circle cx="${peerX}" cy="${middle}" r="12"/><path class="course-micro-peer-link__check" d="m ${peerX - 5} ${middle} 3 3 7 -7"/>`;
    lineHost.append(peer);
  }
  function drawNodes() {
    for (const node of nodes) {
      const element = document.createElement('div');
      element.className = 'questions-map-card course-node is-visible';
      element.dataset.node = node.id;
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      const icon = node.id === 'client'
        ? `<button class="course-node__icon course-client-preview" type="button" aria-label="Открыть журнал выпуска"><svg viewBox="0 0 24 24" aria-hidden="true">${icons.client}</svg><span class="course-client-preview__code"></span></button>`
        : `<span class="course-node__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[node.icon]}</svg></span>`;
      const version = node.id.startsWith('app-') ? '<small class="course-infra-node-detail"></small><small class="course-infra-version"></small>' : node.id.startsWith('svc-') ? '<small class="course-infra-service-version"></small>' : '';
      element.innerHTML = `${icon}<button class="questions-map-card__question" type="button"><span class="course-node__title">${escapeHtml(node.title)}</span>${version}</button>`;
      element.querySelector('.questions-map-card__question').addEventListener('click', () => showArticle(node.id));
      nodeHost.append(element);
    }
    refreshMap();
  }
  function refreshMap() {
    canvas.dataset.primaryRoute = String(state.nodeOnline.a);
    canvas.dataset.fallbackRoute = String(!state.nodeOnline.a && state.nodeOnline.b);
    for (const node of nodeHost.querySelectorAll('[data-node]')) {
      node.classList.toggle('is-selected', state.article === node.dataset.node);
      const member = node.dataset.node;
      const unavailable = member.startsWith('app-') ? !state.healthy || !state.nodeOnline[member.at(-1)] || (state.brokenConfig && state.pendingVersion && state.podVersions[member.at(-1)] === state.pendingVersion) : serviceFor[member] ? !state.serviceOnline[serviceFor[member]] || (member.startsWith('svc-') && !Object.values(state.nodeOnline).some(Boolean)) : false;
      node.classList.toggle('is-faulty', unavailable);
      node.classList.toggle('is-stale', state.healthy && member.startsWith('svc-') && state.serviceVersions[serviceFor[member]] < state.productionVersion);
      node.dataset.offline = String(unavailable);
      const version = node.querySelector('.course-infra-version');
      if (version) version.textContent = `Pod ${member.at(-1).toUpperCase()} · контейнер v${state.podVersions[member.at(-1)]} · ${unavailable ? 'NotReady' : 'Ready'}`;
      const serviceVersion = node.querySelector('.course-infra-service-version');
      if (serviceVersion) serviceVersion.textContent = `Pod · v${state.serviceVersions[serviceFor[member]]}`;
      const detail = node.querySelector('.course-infra-node-detail');
      if (detail) detail.textContent = `kubelet · Node ${state.nodeOnline[member.at(-1)] ? 'Ready' : 'NotReady'}`;
    }
    const preview = nodeHost.querySelector('.course-client-preview');
    preview.dataset.mode = state.response.code === 200 ? 'ok' : 'broken';
    preview.querySelector('.course-client-preview__code').textContent = state.response.code;
    for (const tool of toolHost.querySelectorAll('[data-tool]')) {
      tool.classList.toggle('is-selected', state.article === `tool-${tool.dataset.tool}`);
      const key = serviceFor[`tool-${tool.dataset.tool}`];
      tool.classList.toggle('is-faulty', !!key && !state.serviceOnline[key]);
    }
  }
  function syncButtons() {
    playButton.textContent = busy ? 'Выпуск версии…' : `▶ Выпустить v${state.pendingVersion || state.productionVersion + 1}`;
    playButton.disabled = busy;
    resetButton.disabled = busy || !(state.lastRun || state.pendingVersion || state.brokenSource || state.brokenTests || state.brokenConfig || state.skipCatalogRollout || !state.healthy || completed.size || readyNodes().length !== 2 || Object.values(state.serviceOnline).some(value => !value) || Object.values(state.serviceVersions).some(value => value !== state.productionVersion));
    phaseLabel.textContent = state.lastRun?.message || 'Разработчик → Git → CI → production → контрольный GET';
    phaseLabel.dataset.tone = state.lastRun?.outcome === 'deployed' || state.lastRun?.outcome === 'rolled-back' ? 'ok' : state.lastRun?.outcome === 'deployed-partial' ? 'warning' : state.lastRun?.outcome?.endsWith('failed') ? 'error' : '';
  }
  function prepareChange() {
    state.pendingVersion ||= state.productionVersion + 1;
    state.revision++;
    syncButtons();
    refreshArticle();
    save();
  }
  function addAction(label, icon, handler, destructive = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = busy;
    button.classList.toggle('is-destructive', destructive);
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = label;
    button.title = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    button.addEventListener('click', () => { if (busy) return; handler(); syncButtons(); refreshMap(); renderArticle(); renderJournal(); save(); });
    $('#course-action-buttons').append(button);
  }
  const actionIcons = {
    edit: '<path d="m4 16-1 5 5-1L20 8l-4-4L4 16zM14 6l4 4"/>',
    break: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M13 11l-2 3h3l-2 4"/>',
    fix: '<path d="M7 3h7l5 5v13H7zM14 3v5h5m-9 7 2 2 4-4"/>',
    tests: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
    config: '<path d="M4 7h16M4 17h16M9 4v6m6 4v6"/>',
    deploy: '<path d="M4 12h14m-6-6 6 6-6 6"/>',
    rollback: '<path d="M4 11a8 8 0 1 1 2 6M4 4v7h7"/>',
    skip: '<circle cx="12" cy="12" r="9"/><path d="M7 12h10"/>',
    power: '<path d="M12 2v10M6.2 5.4a9 9 0 1 0 11.6 0"/>',
    request: '<path d="M3 12h17m-7-7 7 7-7 7"/>'
  };
  function renderTasks() {
    const host = $('#course-article-primary');
    const scroll = article.querySelector('.course-article__scroll');
    const previousScroll = scroll.scrollTop;
    host.replaceChildren();
    for (const task of tasks) {
      const item = document.createElement('div');
      item.className = 'course-task';
      item.classList.toggle('is-complete', completed.has(task.id));
      item.classList.toggle('is-expanded', state.expandedTask === task.id);
      const heading = document.createElement('button');
      heading.type = 'button';
      heading.className = 'course-task__heading';
      heading.setAttribute('aria-expanded', String(state.expandedTask === task.id));
      heading.innerHTML = `<span class="course-task__mark">${completed.has(task.id) ? '✓' : ''}</span><strong>${escapeHtml(task.title)}</strong><span class="course-task__chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
      const panel = document.createElement('div');
      panel.className = 'course-task__panel';
      panel.innerHTML = `<div class="course-task__steps">${task.steps.map(([place, instruction, action], index) => {
        const tool = place.startsWith('tool-');
        const name = tool ? articles[place]?.[0] || place : byId.get(place)?.title || place;
        const symbol = tool ? (place === 'tool-developer' ? icons.client : '<path d="M20 7a5 5 0 0 1-6 5L7 19a2 2 0 0 1-3-3l7-7a5 5 0 0 1 6-6l-3 3 4 4z"/>') : icons[byId.get(place)?.icon] || icons.client;
        const actionIcon = action?.includes('Откатить') ? 'rollback' : action?.includes('Пропустить') ? 'skip' : /Выпустить|Обновить образ/.test(action || '') ? 'deploy' : /Выключить|Включить|Отключить/.test(action || '') ? 'power' : /Запросить|Проверить|Открыть/.test(action || '') ? 'request' : action?.includes('код') || action?.includes('изменение') ? 'edit' : action?.includes('тест') ? 'tests' : 'config';
        return `<div class="course-task__step"><span class="course-task__number">${index + 1}.</span><span class="course-task__place course-task__hint" tabindex="0" role="img" aria-label="${escapeHtml(name)}" data-tooltip="${escapeHtml(name)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${symbol}</svg></span><span class="course-task__copy">${escapeHtml(instruction)}${action ? ` <span class="course-task__action"><span class="course-task__action-icon course-task__hint" tabindex="0" role="img" aria-label="Действие · ${escapeHtml(name)}: ${escapeHtml(action)}" data-tooltip="Действие · ${escapeHtml(name)}: ${escapeHtml(action)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${actionIcons[actionIcon]}</svg></span><small>${escapeHtml(action)}</small></span>` : ''}</span></div>`;
      }).join('')}</div>`;
      heading.addEventListener('click', () => {
        const open = !item.classList.contains('is-expanded');
        host.querySelectorAll('.course-task.is-expanded').forEach(other => { other.classList.remove('is-expanded'); other.querySelector('.course-task__heading').setAttribute('aria-expanded', 'false'); });
        item.classList.toggle('is-expanded', open);
        heading.setAttribute('aria-expanded', String(open));
        state.expandedTask = open ? task.id : '';
        save();
      });
      item.append(heading, panel);
      host.append(item);
    }
    scroll.scrollTop = previousScroll;
  }
  function renderArticle() {
    const id = state.article;
    if (!id || !articles[id]) return;
    const [title, description] = articles[id];
    article.dataset.article = id;
    $('#course-article-title').textContent = title;
    $('#course-article-kicker').textContent = '';
    $('#course-article-devtools-icon').hidden = true;
    $('#course-article-subtitle').hidden = true;
    const guide = qaGuides[id];
    $('#course-article-body').innerHTML = guide ? `<div class="course-infra-guide"><p>${escapeHtml(description)}</p><dl>${['Роль', 'Взаимодействие', 'Что проверить', 'При сбое'].map((label, index) => `<div><dt>${label}</dt><dd>${escapeHtml(guide[index])}</dd></div>`).join('')}</dl></div>` : `<p>${escapeHtml(description)}</p>`;
    const actions = $('#course-action-buttons');
    actions.replaceChildren();
    const visual = $('#course-article-visual');
    visual.className = 'course-infra-viz';
    $('#course-article-primary').replaceChildren();
    article.querySelector('.course-article__theory').hidden = id === 'tasks';
    if (id === 'tasks') {
      visual.className = '';
      visual.replaceChildren();
      renderTasks();
      actions.closest('.course-article__actions').hidden = true;
      return;
    }
    if (id === 'tool-developer') {
      addAction('Подготовить изменение', actionIcons.edit, prepareChange);
      addAction(state.brokenSource ? 'Исправить код' : 'Повредить код', state.brokenSource ? actionIcons.fix : actionIcons.break, () => { state.brokenSource = !state.brokenSource; state.pendingVersion ||= state.productionVersion + 1; state.revision++; }, !state.brokenSource);
    }
    if (id === 'tool-jenkins') addAction(state.brokenTests ? 'Исправить тесты' : 'Провалить тесты', actionIcons.tests, () => { state.brokenTests = !state.brokenTests; }, !state.brokenTests);
    if (id === 'tool-jenkins') addAction('Открыть журнал CI/CD', actionIcons.deploy, openJournal);
    if (id === 'tool-kubernetes') {
      addAction(state.brokenConfig ? 'Исправить конфигурацию' : 'Повредить конфигурацию', actionIcons.config, () => { state.brokenConfig = !state.brokenConfig; }, !state.brokenConfig);
      addAction(state.skipCatalogRollout ? 'Включить rollout каталога' : 'Пропустить rollout каталога', state.skipCatalogRollout ? actionIcons.fix : actionIcons.skip, () => { state.skipCatalogRollout = !state.skipCatalogRollout; }, !state.skipCatalogRollout);
      if (state.healthy && state.serviceVersions.catalog < state.productionVersion) addAction('Обновить образ каталога', actionIcons.deploy, () => { state.serviceVersions.catalog = state.productionVersion; state.skipCatalogRollout = false; state.catalogFixedAfterStale = state.staleCatalogSeen; state.lastRun = { type: 'infrastructure', version: state.productionVersion, steps: [], outcome: 'catalog-updated', message: `Deployment каталога обновлён до v${state.productionVersion}` }; });
      if (!state.healthy) addAction('Откатить релиз', actionIcons.rollback, rollback);
    }
    if (id === 'client') {
      addAction('Запросить каталог', icons.catalog, () => request('catalog'));
      addAction('Проверить вход', icons.auth, () => request('auth'));
      addAction('Проверить оплату', icons.payment, () => request('payment'));
    }
    if (id === 'app-a' || id === 'app-b') {
      const member = id.at(-1);
      addAction(state.nodeOnline[member] ? `Выключить узел ${member.toUpperCase()}` : `Включить узел ${member.toUpperCase()}`, actionIcons.power, () => { state.nodeOnline[member] = !state.nodeOnline[member]; if (state.nodeOnline[member] && state.healthy) state.podVersions[member] = state.productionVersion; lineHost.querySelectorAll('.is-active-route').forEach(path => path.classList.remove('is-active-route')); state.lastRun = { type: 'infrastructure', version: state.productionVersion, steps: [], outcome: 'node-change', message: state.nodeOnline[member] ? `Узел ${member.toUpperCase()} снова доступен` : `Узел ${member.toUpperCase()} · NotReady` }; });
    }
    if (serviceFor[id]) {
      const key = serviceFor[id];
      addAction(state.serviceOnline[key] ? 'Отключить' : 'Включить', actionIcons.power, () => { state.serviceOnline[key] = !state.serviceOnline[key]; });
    }
    actions.closest('.course-article__actions').hidden = !actions.childElementCount;
    let rows = [];
    let code = '';
    let note = '';
    if (id === 'tool-developer') { rows = [['Рабочая версия', `v${state.productionVersion}`], ['Следующее изменение', state.pendingVersion ? `v${state.pendingVersion} готово` : 'ещё не подготовлено'], ['Локальный код', state.brokenSource ? 'синтаксическая ошибка' : 'корректен']]; code = state.brokenSource ? 'const start = () => {\n  return products.map(item => item.name;\n}' : 'const start = () => {\n  return products.map(item => item.name);\n}'; }
    else if (id === 'tool-bitbucket') { rows = [['Последний commit', state.lastCommit || 'ещё не отправлен'], ['Следующий commit', state.pendingVersion ? `c${String(state.revision).padStart(4, '0')}` : 'ожидает изменения']]; code = 'git push origin main\n        ↓\nJenkins забирает commit'; }
    else if (id === 'tool-jenkins') { rows = [['Build', state.brokenSource ? 'следующий запуск упадёт' : 'может пройти'], ['Tests', state.brokenTests ? 'следующий запуск упадёт' : 'могут пройти']]; code = 'checkout → build → test → deploy'; }
    else if (id === 'tool-kubernetes') { rows = [['Входные Pod', `v${state.productionVersion} · ${readyNodes().length} / 2`], ['Каталог · Pod', `v${state.serviceVersions.catalog}${state.serviceVersions.catalog < state.productionVersion ? ' · старый' : ''}`], ['Следующий релиз', state.skipCatalogRollout ? 'каталог пропущен' : 'все Deployment']]; if (state.serviceVersions.catalog < state.productionVersion) code = `kubectl set image deployment/catalog catalog=qatodev/catalog:v${state.productionVersion}`; note = 'Здесь выпуск включает образы трёх сервисов; в жизни их релизы независимы. Restart с закреплённым старым образом не обновит код.'; }
    else if (id === 'client') { rows = [['Последний запрос', { catalog: 'GET /api/products', auth: 'POST /auth/login', payment: 'POST /payments' }[state.response.kind || 'catalog']], ['HTTP', `${state.response.code}`], ['Маршрут', state.response.route ? `Pod ${state.response.route} · v${state.response.version}` : 'готовых Pod нет']]; code = `HTTP/1.1 ${state.response.code} ${state.response.code === 200 ? 'OK' : 'Service Unavailable'}\n${JSON.stringify(state.response.body, null, 2)}`; }
    else if (id === 'tool-grafana' || id === 'tool-prometheus') { const observed = state.serviceOnline.prometheus && (id !== 'tool-grafana' || state.serviceOnline.grafana); rows = [['Наблюдение', observed ? 'доступно' : 'недоступно'], ['Готовые Pod', observed ? `${readyNodes().length} / 2` : 'нет данных'], ['Последний HTTP', observed ? `${state.response.code}` : 'нет данных']]; note = 'Учебные показатели последней проверки. Нет данных мониторинга ≠ приложение обязательно упало.'; }
    else if (id.startsWith('app-')) { const member = id.at(-1); rows = [['Узел Kubernetes', state.nodeOnline[member] ? 'Node Ready' : 'Node NotReady'], ['Агент', 'kubelet'], [`Pod ${member.toUpperCase()}`, state.nodeOnline[member] && state.healthy ? `контейнер v${state.podVersions[member]} · Ready` : 'NotReady'], ['Готовые копии', `${readyNodes().length} / 2`]]; note = 'Отключение узла ≠ остановка одного Pod. При единственных двух узлах их совместный отказ затронет и размещённые на них микросервисы.'; }
    else if (id === 'balancer') { rows = [['Готовые копии', `${readyNodes().length} / 2`], ['Последний маршрут', state.response.route ? `Pod ${state.response.route}` : 'нет']]; note = 'После обнаружения сбоя трафик идёт к доступному Pod. В период переключения возможны ошибки.'; }
    else if (id === 'tool-rabbitmq') { rows = [['Брокер', state.serviceOnline.rabbitmq ? 'доступен' : 'недоступен'], ['Последнее событие', state.lastEvent || 'ещё нет']]; note = 'ProductUpdated и PaymentSucceeded — примеры. Сообщение получает только сервис с подходящей очередью и подпиской.'; }
    else if (serviceFor[id]) { const key = serviceFor[id]; const available = state.serviceOnline[key] && (!id.startsWith('svc-') || Object.values(state.nodeOnline).some(Boolean)); rows = [['Состояние', available ? 'доступен' : 'недоступен'], ...(id.startsWith('svc-') ? [['Образ Pod', `v${state.serviceVersions[key]}`], ['Версия выпуска', `v${state.productionVersion}`]] : [['Последний HTTP', `${state.response.code}`]])]; note = key === 'catalog' && state.serviceVersions.catalog < state.productionVersion ? 'Каталог отвечает, но его Deployment не получил новый образ. Проверь serviceVersion в ответе клиента.' : key === 'catalog' || key === 'database' ? 'Проверяй запрос каталога: остальные функции могут продолжить работать.' : key === 'payment' || key === 'gateway' ? 'Проверяй статус платежа перед повтором, чтобы не провести его дважды.' : id.startsWith('svc-') ? 'Это логическая группа: её Pod размещены на узлах Kubernetes. Если оба показанных узла выключены и других узлов нет, сервис тоже недоступен.' : 'Проверяй именно зависящие от этой системы действия.'; }
    else { rows = [['Роль', id.startsWith('tool-') ? 'смежный инструмент' : 'production'], ['Участие в CI/CD', 'нет']]; }
    visual.innerHTML = `${rows.map(([label, value]) => `<div class="course-infra-viz__row" ${value.includes('ошиб') || value.includes('0 / 2') || value === 'недоступен' ? 'data-tone="error"' : value.includes('старый') || value.includes('пропущен') ? 'data-tone="warning"' : ''}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div>`).join('')}${code ? `<pre class="course-infra-code">${escapeHtml(code)}</pre>` : ''}${note ? `<p class="course-infra-note">${escapeHtml(note)}</p>` : ''}`;
  }
  function refreshArticle() { if (!article.hidden && state.article) renderArticle(); }
  function showArticle(id) {
    if (matchMedia('(max-width: 767px)').matches) journal.hidden = true;
    state.article = id;
    article.hidden = false;
    article.querySelector('.course-article__theory').open = false;
    renderArticle();
    refreshMap();
    article.querySelector('.course-article__scroll').scrollTop = 0;
    if (id === 'tool-grafana' && state.lastRun?.outcome === 'rollout-failed') { completed.add('observe'); renderArticle(); }
    if (id === 'tool-rabbitmq' && String(state.lastEvent || '').startsWith('PaymentSucceeded')) { completed.add('events'); renderArticle(); }
    save();
  }
  function renderJournal() {
    if (journal.hidden) return;
    const steps = state.lastRun?.steps || [];
    $('#course-network-selection').textContent = state.lastRun?.type === 'request' ? 'Запрос клиента' : state.lastRun?.type === 'infrastructure' ? 'Узел Kubernetes' : state.lastRun ? `Выпуск v${state.lastRun.version}` : 'CI/CD';
    $('#course-network-flow').textContent = state.lastRun?.type === 'request' ? 'маршрут · ответ' : state.lastRun?.type === 'infrastructure' ? 'готовность · маршрут' : 'production · журнал';
    $('#course-network-action-buttons').replaceChildren();
    const selected = steps.find(step => step.id === state.selectedStep) || steps.at(-1);
    const emptyTitle = state.lastRun?.type === 'infrastructure' ? 'Состояние узла' : 'Как проходит выпуск';
    const emptyDetail = state.lastRun?.type === 'infrastructure' ? `${state.lastRun.message}. После обнаружения сбоя проверь новый запрос клиента и маршрут к готовому Pod.` : 'Разработчик отправит изменение в Bitbucket, Jenkins выполнит сборку и тесты, Kubernetes обновит production, затем клиент отправит контрольный GET.';
    $('#course-network-visual').innerHTML = `<div class="course-infra-network"><div class="course-infra-network__list">${steps.length ? steps.map(step => `<button type="button" data-step="${escapeHtml(step.id)}" data-tone="${step.status === 'error' ? 'error' : step.status === 'done' ? 'ok' : ''}" class="${selected?.id === step.id ? 'is-current' : ''}"><span>${escapeHtml(step.title)}</span><small>${step.status === 'error' ? 'сбой' : step.status === 'done' ? 'готово' : 'идёт'}</small></button>`).join('') : `<span class="course-infra-note">${state.lastRun?.type === 'infrastructure' ? 'Отправь новый запрос клиента.' : 'Запусти выпуск версии.'}</span>`}</div><div class="course-infra-network__detail"><strong>${escapeHtml(selected?.title || emptyTitle)}</strong><p>${escapeHtml(selected?.detail || emptyDetail)}</p></div></div>`;
    highlightJournalStep(selected);
    $('#course-network-visual').querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
      state.selectedStep = button.dataset.step;
      renderJournal(); save();
      if (!busy) replayStep(state.lastRun.steps.find(step => step.id === state.selectedStep));
    }));
  }
  function openJournal() {
    replayId++;
    replayCleanup(); replayCleanup = () => {};
    article.hidden = true;
    state.article = '';
    refreshMap();
    journal.hidden = false;
    renderJournal();
    save();
  }
  const sleep = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : ms));
  function routePath(route) { return toolHost.querySelector(`[data-infra-route="${route}"]`) || lineHost.querySelector(`[data-infra-route="${route}"]`); }
  function highlightJournalStep(step) {
    toolHost.querySelectorAll('.is-journal-selected').forEach(item => item.classList.remove('is-journal-selected'));
    lineHost.querySelectorAll('.is-journal-selected').forEach(item => item.classList.remove('is-journal-selected'));
    if (!step || journal.hidden) return;
    const routes = step.id === 'change' ? [] : step.routes?.length ? step.routes : step.route ? [step.route] : legacyStepRoutes(step);
    routes.forEach(route => routePath(route)?.classList.add('is-journal-selected'));
    const toolName = step.tool || { change: 'developer', tests: 'jenkins', 'catalog-deployment': 'kubernetes' }[step.id];
    if (toolName) toolHost.querySelector(`[data-tool="${toolName}"]`)?.classList.add('is-journal-selected');
  }
  function legacyStepRoutes(step) {
    const simple = { push: 'developer:bitbucket', build: 'bitbucket:jenkins', deploy: 'jenkins:kubernetes', rollback: 'kubernetes:app-a' };
    if (simple[step.id]) return [simple[step.id]];
    if (step.id !== 'smoke') return [];
    const route = state.response.route?.toLowerCase();
    const service = { catalog: 'svc-catalog', auth: 'svc-auth', payment: 'svc-payment' }[state.response.kind];
    const dependency = { catalog: 'database', auth: 'ext-keycloak', payment: 'ext-gateway' }[state.response.kind];
    return ['client:balancer', ...(route ? [`balancer:app-${route}`, `app-${route}:${service}`, `${service}:${dependency}`] : [])];
  }
  async function replayStep(step) {
    if (!step) return;
    const ticket = ++replayId;
    replayCleanup();
    replayCleanup = () => {};
    const routes = step.id === 'change' ? [] : step.routes?.length ? step.routes : step.route ? [step.route] : legacyStepRoutes(step);
    const toolName = step.tool || { change: 'developer', tests: 'jenkins', 'catalog-deployment': 'kubernetes' }[step.id];
    const tool = toolName && toolHost.querySelector(`[data-tool="${toolName}"]`);
    if (!routes.length && tool) {
      motion.focus(tool.offsetLeft + tool.offsetWidth / 2, tool.offsetTop + tool.offsetHeight / 2, true);
      tool.classList.add('is-processing');
      replayCleanup = () => tool.classList.remove('is-processing');
      await sleep(650);
      if (ticket === replayId) { replayCleanup(); replayCleanup = () => {}; }
      return;
    }
    for (const route of routes) {
      if (ticket !== replayId) return;
      const path = routePath(route);
      if (!path) continue;
      const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
      const panelWidth = matchMedia('(max-width: 767px)').matches ? 0 : journal.getBoundingClientRect().width;
      motion.focus(midpoint.x + panelWidth / (2 * motion.snapshot().scale), midpoint.y, true);
      path.classList.remove('is-replaying');
      void path.getBoundingClientRect();
      path.classList.add('is-replaying');
      tool?.classList.add('is-processing');
      const destination = route.split(':')[1];
      const node = nodeHost.querySelector(`[data-node="${destination}"] .questions-map-card__question`);
      node?.classList.add('is-processing');
      replayCleanup = () => { path.classList.remove('is-replaying'); tool?.classList.remove('is-processing'); node?.classList.remove('is-processing'); };
      await sleep(700);
      if (ticket !== replayId) return;
      replayCleanup(); replayCleanup = () => {};
    }
  }
  async function animateRoute(route, tool, run) {
    const path = route ? routePath(route) : null;
    const card = tool && toolHost.querySelector(`[data-tool="${tool}"]`);
    const group = route === 'services:rabbitmq' ? $('.course-infra-services') : null;
    path?.classList.add('is-deploying');
    card?.classList.add('is-processing');
    group?.classList.add('is-processing-event');
    await sleep(620);
    path?.classList.remove('is-deploying');
    card?.classList.remove('is-processing');
    group?.classList.remove('is-processing-event');
    return run === runId;
  }
  function pushStep(id, title, detail, route = '', tool = '') {
    const step = { id, title, detail, route, tool, status: 'running' };
    state.lastRun.steps.push(step);
    state.selectedStep = id;
    state.lastRun.message = title;
    syncButtons(); renderJournal(); refreshArticle(); save();
    return step;
  }
  async function perform(id, title, detail, route, tool, run, failed = false) {
    const step = pushStep(id, title, detail, route, tool);
    if (route || tool) await animateRoute(route, tool, run);
    else await sleep(420);
    if (run !== runId) return false;
    step.status = failed ? 'error' : 'done';
    if (tool) {
      const card = toolHost.querySelector(`[data-tool="${tool}"]`);
      if (card) card.dataset.state = failed ? 'failed' : 'done';
    }
    renderJournal(); refreshArticle(); save();
    return true;
  }
  function markOutcome(outcome, message, task) {
    state.lastRun.outcome = outcome;
    state.lastRun.message = message;
    if (task && (!['release', 'rollback'].includes(task) || state.response.code === 200)) completed.add(task);
    busy = false;
    syncButtons(); refreshMap(); refreshArticle(); renderJournal(); save();
  }
  async function smoke(run, kind = 'catalog') {
    const ready = readyNodes();
    const route = ready.includes('a') ? 'A' : ready.includes('b') ? 'B' : '';
    const service = { catalog: 'svc-catalog', auth: 'svc-auth', payment: 'svc-payment' }[kind];
    const dependency = { catalog: 'database', auth: 'keycloak', payment: 'gateway' }[kind];
    const available = !!route && state.serviceOnline[serviceFor[service]] && state.serviceOnline[dependency];
    const code = available ? 200 : 503;
    const version = state.productionVersion;
    const label = { catalog: 'GET /api/products', auth: 'POST /auth/login', payment: 'POST /payments' }[kind];
    const cause = !route ? 'нет готовых Pod' : !state.serviceOnline[serviceFor[service]] ? `${articles[service][0]} недоступен` : !state.serviceOnline[dependency] ? `${articles[dependency === 'database' ? 'database' : dependency === 'keycloak' ? 'ext-keycloak' : 'ext-gateway'][0]} недоступен` : '';
    const serviceVersion = state.serviceVersions[kind];
    const detail = code === 200 ? `${label} попал в Pod ${route} (v${version}); ${articles[service][0]} ответил из Pod v${serviceVersion}${serviceVersion < version ? ' — образ сервиса не обновлён' : ''}.` : `${label}: 503 · ${cause}. ${route ? `Входной Pod ${route} доступен, но зависимость не работает.` : 'Маршрут к приложению недоступен.'}`;
    const step = pushStep('smoke', `Клиент · ${label}`, detail);
    step.routes = [];
    const travel = async routeId => { step.routes.push(routeId); return animateRoute(routeId, null, run); };
    lineHost.querySelectorAll('.is-active-route').forEach(path => path.classList.remove('is-active-route'));
    await travel('client:balancer');
    if (route) {
      await travel(`balancer:app-${route.toLowerCase()}`);
      await travel(`app-${route.toLowerCase()}:${service}`);
      if (state.serviceOnline[serviceFor[service]]) await travel(`${service}:${dependency === 'database' ? 'database' : dependency === 'keycloak' ? 'ext-keycloak' : 'ext-gateway'}`);
    }
    if (run !== runId) return false;
    if (code === 200 && kind === 'payment') {
      state.lastEvent = state.serviceOnline.rabbitmq ? 'PaymentSucceeded → exchange → очередь подписчика' : 'Не отправлено · RabbitMQ недоступен';
      if (state.serviceOnline.rabbitmq) { step.routes.push('services:rabbitmq'); await animateRoute('services:rabbitmq', 'rabbitmq', run); }
    }
    if (run !== runId) return false;
    state.response = { code, version, route, kind, body: code === 200 ? { status: 'ok', version: `v${version}`, service: kind, serviceVersion: `v${serviceVersion}` } : { error: cause || 'SERVICE_UNAVAILABLE', service: kind } };
    if (kind === 'catalog' && code === 200 && serviceVersion < version) state.staleCatalogSeen = true;
    if (kind === 'catalog' && code === 200 && serviceVersion === version && state.catalogFixedAfterStale) { completed.add('catalog-rollout'); state.catalogFixedAfterStale = false; }
    if (kind === 'catalog' && code === 503 && ready.length && !state.serviceOnline.catalog) state.partialCatalogFailure = true;
    if (kind === 'payment' && code === 200 && state.partialCatalogFailure) completed.add('partial');
    if (kind === 'catalog' && code === 200 && route === 'B' && !state.nodeOnline.a) completed.add('failover');
    step.status = code === 200 ? 'done' : 'error';
    if (route) for (const key of ['client:balancer', `balancer:app-${route.toLowerCase()}`, `app-${route.toLowerCase()}:${service}`]) lineHost.querySelector(`[data-infra-route="${key}"]`)?.classList.add('is-active-route');
    refreshMap(); renderJournal(); refreshArticle(); save();
    return true;
  }
  async function request(kind) {
    if (busy) return;
    busy = true;
    const run = ++runId;
    state.lastRun = { type: 'request', version: state.productionVersion, steps: [], outcome: 'running', message: 'Пользовательский запрос' };
    openJournal(); syncButtons();
    if (await smoke(run, kind)) markOutcome(state.response.code === 200 ? 'request-ok' : 'request-failed', `${state.response.code} · ${state.response.route ? `Pod ${state.response.route}` : 'нет готовых Pod'}`);
  }
  async function release() {
    if (busy) return;
    if (!state.pendingVersion) prepareChange();
    busy = true;
    const run = ++runId;
    const version = state.pendingVersion;
    state.lastRun = { version, steps: [], outcome: 'running', message: 'Изменение на компьютере разработчика' };
    toolHost.querySelectorAll('[data-tool]').forEach(tool => { delete tool.dataset.state; });
    openJournal(); syncButtons();
    if (!await perform('change', 'Разработчик · изменение', `Подготовлено изменение для v${version}.`, null, 'developer', run)) return;
    if (!await perform('push', 'Bitbucket · commit', `Commit c${String(state.revision).padStart(4, '0')} отправлен в Git.`, 'developer:bitbucket', 'bitbucket', run)) return;
    state.lastCommit = `c${String(state.revision).padStart(4, '0')}`;
    if (!await perform('build', 'Jenkins · сборка', state.brokenSource ? 'Синтаксическая ошибка: артефакт не создан. Production не обновлён.' : 'Код собран в артефакт для v' + version + '.', 'bitbucket:jenkins', 'jenkins', run, state.brokenSource)) return;
    if (state.brokenSource) { if (await smoke(run)) markOutcome('build-failed', `Сборка не прошла · production v${state.productionVersion}`, 'build'); return; }
    if (!await perform('tests', 'Jenkins · тесты', state.brokenTests ? 'Тесты упали: Jenkins остановил pipeline до деплоя.' : 'Автоматические проверки прошли.', null, 'jenkins', run, state.brokenTests)) return;
    if (state.brokenTests) { if (await smoke(run)) markOutcome('tests-failed', `Тесты не прошли · production v${state.productionVersion}`, 'tests'); return; }
    const online = ['a', 'b'].filter(member => state.nodeOnline[member]);
    const rolloutError = state.brokenConfig || online.length === 0;
    const rolloutDetail = online.length === 0 ? 'Оба Worker Node недоступны: новую версию некуда развернуть.' : state.brokenConfig ? `Общая ошибочная конфигурация: ${online.map(member => member.toUpperCase()).join(' и ')} не проходят readiness.` : `Входное приложение v${version}: ${online.length} из 2 показанных узлов доступны.`;
    if (!await perform('deploy', 'Kubernetes · rollout', rolloutDetail, 'jenkins:kubernetes', 'kubernetes', run, rolloutError)) return;
    if (!online.length) { if (await smoke(run)) markOutcome('rollout-failed', `Rollout v${version} не прошёл · клиент 503`, 'rollout'); return; }
    for (const member of online) {
      if (!await animateRoute(`kubernetes:app-${member}`, null, run)) return;
      state.lastRun.steps.find(step => step.id === 'deploy').routes ||= ['jenkins:kubernetes'];
      state.lastRun.steps.find(step => step.id === 'deploy').routes.push(`kubernetes:app-${member}`);
      state.podVersions[member] = version;
      refreshMap(); refreshArticle(); save();
    }
    state.lastHealthyVersion = state.healthy ? state.productionVersion : state.lastHealthyVersion;
    state.lastHealthyServiceVersions = { ...state.serviceVersions };
    state.productionVersion = version;
    state.pendingVersion = null;
    state.healthy = !state.brokenConfig;
    if (state.healthy) {
      state.serviceVersions.auth = version;
      state.serviceVersions.payment = version;
      if (!state.skipCatalogRollout) state.serviceVersions.catalog = version;
      state.staleCatalogSeen = false;
      state.catalogFixedAfterStale = false;
      if (!await perform('catalog-deployment', 'Deployment каталога', state.skipCatalogRollout ? `Новый образ v${version} собран, но шаблон Deployment каталога не изменился: Pod остался на v${state.serviceVersions.catalog}.` : `Образ каталога обновлён до v${version}; Kubernetes заменил его Pod.`, null, 'kubernetes', run, state.skipCatalogRollout)) return;
    }
    refreshMap();
    if (!await smoke(run)) return;
    markOutcome(state.healthy ? state.skipCatalogRollout ? 'deployed-partial' : 'deployed' : 'rollout-failed', state.healthy ? state.skipCatalogRollout ? `Входные Pod v${version}; каталог остался v${state.serviceVersions.catalog}` : `Выпущена v${version} · клиент ${state.response.code}` : `Rollout v${version} не прошёл · клиент 503`, state.healthy && !state.skipCatalogRollout ? 'release' : !state.healthy ? 'rollout' : null);
  }
  async function rollback() {
    if (busy || state.healthy) return;
    busy = true;
    const run = ++runId;
    state.lastRun = { version: state.lastHealthyVersion, steps: [], outcome: 'running', message: 'Kubernetes · откат версии' };
    openJournal(); syncButtons();
    if (!await perform('rollback', 'Kubernetes · откат', `Возврат к последней рабочей версии v${state.lastHealthyVersion}.`, 'kubernetes:app-a', 'kubernetes', run)) return;
    if (!await animateRoute('kubernetes:app-b', null, run)) return;
    state.lastRun.steps.find(step => step.id === 'rollback').routes = ['kubernetes:app-a', 'kubernetes:app-b'];
    state.productionVersion = state.lastHealthyVersion;
    for (const member of ['a', 'b']) if (state.nodeOnline[member]) state.podVersions[member] = state.lastHealthyVersion;
    state.serviceVersions = { ...state.lastHealthyServiceVersions };
    state.healthy = true;
    refreshMap();
    if (!await smoke(run)) return;
    markOutcome('rolled-back', `Откат к v${state.productionVersion} · клиент 200`, 'rollback');
  }

  drawLines();
  drawNodes();
  motion = window.createMapMotion({ viewport, canvas, getContentBounds: () => ({ left: 530, top: 60, right: 3020, bottom: 1080 }), onChange: () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }, touchPanGain: 1.25 });
  window.courseMapMotion = motion;
  if (window.courseChapterEntryCamera) motion.restore(window.courseChapterEntryCamera);
  else if (state.camera && Number.isFinite(state.camera.x)) motion.restore(state.camera);
  else motion.focus(1100, 340, false);
  playButton.addEventListener('click', release);
  resetButton.addEventListener('click', () => {
    runId++;
    replayId++;
    replayCleanup(); replayCleanup = () => {};
    state = initial();
    completed.clear();
    busy = false;
    article.hidden = true;
    journal.hidden = true;
    toolHost.querySelectorAll('[data-tool]').forEach(tool => { delete tool.dataset.state; tool.classList.remove('is-processing'); });
    toolHost.querySelectorAll('.is-deploying').forEach(path => path.classList.remove('is-deploying'));
    lineHost.querySelectorAll('.is-deploying').forEach(path => path.classList.remove('is-deploying'));
    refreshMap(); syncButtons(); save();
  });
  $('#course-tasks').addEventListener('click', () => showArticle('tasks'));
  $('#course-article-close').addEventListener('click', () => { hideTooltip(); article.hidden = true; state.article = ''; refreshMap(); save(); });
  $('#course-network-close').addEventListener('click', () => { replayId++; replayCleanup(); replayCleanup = () => {}; journal.hidden = true; highlightJournalStep(null); save(); });
  nodeHost.querySelector('[data-node="client"] .course-client-preview').addEventListener('click', openJournal);
  toolHost.querySelectorAll('[data-tool]').forEach(tool => tool.addEventListener('click', () => showArticle(`tool-${tool.dataset.tool}`)));
  $('#course-article-body').addEventListener('click', event => { if (event.target.closest('a')) event.stopPropagation(); });
  const tooltip = document.createElement('div');
  tooltip.className = 'course-task-tooltip';
  tooltip.hidden = true;
  document.body.append(tooltip);
  let tooltipTimer = 0;
  function hideTooltip() { clearTimeout(tooltipTimer); tooltip.hidden = true; }
  article.addEventListener('pointerover', event => {
    const hint = event.target.closest('.course-task__hint');
    if (!hint || hint.contains(event.relatedTarget)) return;
    hideTooltip();
    tooltipTimer = setTimeout(() => {
      tooltip.textContent = hint.dataset.tooltip;
      tooltip.hidden = false;
      const box = hint.getBoundingClientRect();
      tooltip.style.left = `${Math.max(8, Math.min(box.left, innerWidth - tooltip.offsetWidth - 8))}px`;
      tooltip.style.top = `${Math.max(8, box.top - tooltip.offsetHeight - 7)}px`;
    }, 500);
  });
  article.addEventListener('pointerout', event => { const hint = event.target.closest('.course-task__hint'); if (hint && !hint.contains(event.relatedTarget)) hideTooltip(); });
  article.addEventListener('focusin', event => {
    const hint = event.target.closest('.course-task__hint');
    if (!hint) return;
    hideTooltip();
    tooltipTimer = setTimeout(() => { tooltip.textContent = hint.dataset.tooltip; tooltip.hidden = false; const box = hint.getBoundingClientRect(); tooltip.style.left = `${Math.max(8, Math.min(box.left, innerWidth - tooltip.offsetWidth - 8))}px`; tooltip.style.top = `${Math.max(8, box.top - tooltip.offsetHeight - 7)}px`; }, 500);
  });
  article.addEventListener('focusout', hideTooltip);
  window.addEventListener('pagehide', () => {
    if (busy && state.lastRun?.outcome === 'running') {
      runId++;
      busy = false;
      state.lastRun.outcome = 'interrupted';
      state.lastRun.message = 'Выпуск прерван при переходе между главами';
      state.lastRun.steps.forEach(step => { if (step.status === 'running') { step.status = 'error'; step.detail = 'Шаг прерван при переходе между главами.'; } });
      state.response = { code: readyNodes().length ? 200 : 503, version: state.productionVersion, route: readyNodes()[0]?.toUpperCase() || '', kind: 'catalog', body: readyNodes().length ? { status: 'ok', version: `v${state.productionVersion}`, products: 2 } : { error: 'SERVICE_UNAVAILABLE', version: `v${state.productionVersion}` } };
    }
    save();
  });
  if (state.article && !(state.journalOpen && matchMedia('(max-width: 767px)').matches)) { article.hidden = false; renderArticle(); }
  if (state.journalOpen) { journal.hidden = false; renderJournal(); }
  refreshMap(); syncButtons();
  document.body.classList.add('course-ready');
})();
