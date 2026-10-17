(() => {
  'use strict';
  const chapter = document.body.dataset.chapter;
  if (chapter !== '2') return;

  const KEY = chapter === '3' ? 'qatodev_course_infrastructure_v1' : 'qatodev_course_microservices_v1';
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icons = {
    client: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    balance: '<path d="M12 3v18M5 7h14M4 7l-2 5h6l-2-5m12 0-2 5h6l-2-5M2 12c0 2 6 2 6 0m8 0c0 2 6 2 6 0M8 21h8"/>',
    server: '<rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    auth: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    catalog: '<path d="M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5"/>',
    payment: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    keycloak: '<path d="M12 3 4 7v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7z"/><path d="m9 12 2 2 4-4"/>',
    gateway: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    bank: '<path d="m3 9 9-5 9 5M4 20h16M6 10v8m4-8v8m4-8v8m4-8v8"/>'
  };
  const nodes = [
    { id: 'client', title: 'Клиент', icon: 'client', x: 640, y: 460, width: 292 },
    { id: 'balancer', title: 'Балансировщик', icon: 'balance', x: 1170, y: 530, width: 292 },
    { id: 'app-a', title: 'Сервер приложения A', icon: 'server', x: 1660, y: 365, width: 292 },
    { id: 'app-b', title: 'Сервер приложения B', icon: 'server', x: 1660, y: 735, width: 292 },
    { id: 'svc-auth', title: 'Авторизация', icon: 'auth', x: 2095, y: 355, width: 188 },
    { id: 'svc-catalog', title: 'Каталог товаров', icon: 'catalog', x: 2095, y: 545, width: 188 },
    { id: 'svc-payment', title: 'Оплата', icon: 'payment', x: 2095, y: 735, width: 188 },
    { id: 'database', title: 'PostgreSQL · каталог', icon: 'database', x: 2510, y: 560, width: 292 },
    { id: 'ext-keycloak', title: 'Keycloak', icon: 'keycloak', x: 2480, y: 255, width: 160 },
    { id: 'ext-gateway', title: 'Платёжный API', icon: 'gateway', x: 2480, y: 830, width: 170 },
    { id: 'ext-bank', title: 'Банк / эквайер', icon: 'bank', x: 2765, y: 830, width: 155 }
  ];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const articles = {
    client: ['Клиент', 'Здесь показаны запросы к серверу приложения и микросервисам. Доставку CSS и JavaScript разбирает первая глава. POST оплаты появляется только после нажатия «Оплатить товары». В Network видны браузерные HTTP-запросы, а внутренние вызовы сервисов — на карте.'],
    balancer: ['Балансировщик', 'Выбирает доступный экземпляр приложения A или B. Он не решает, к каким микросервисам обратиться: запросы между сервисами организует приложение.'],
    'app-a': ['Сервер приложения A', 'Экземпляр приложения собирает API-ответ: проверяет сессию через сервис авторизации и получает товары через сервис каталога. При оплате вызывает сервис оплаты. Пунктир между A и B показывает возможный внутренний канал обмена событиями, а не обязательный путь каждого запроса: обычный трафик распределяет балансировщик.'],
    'app-b': ['Сервер приложения B', 'Второй экземпляр той же логики. Если A остановлен, балансировщик направляет браузерные запросы сюда. Пунктир с галочкой показывает, что внутренний канал между экземплярами доступен; для обычной работы двух экземпляров прямой обмен не обязателен.'],
    'svc-auth': ['Сервис авторизации', 'Проверяет действительность учебной сессии для GET товаров и POST оплаты: нет сессии — 401, сервис недоступен — 503. Keycloak справа показан как пример внешнего провайдера идентификации по OpenID Connect. В этой симуляции вход выполнен ранее; каждый GET не обращается к Keycloak. <a href="https://www.keycloak.org/securing-apps/overview" target="_blank" rel="noopener noreferrer">Keycloak и OIDC ↗</a>'],
    'svc-catalog': ['Сервис каталога', 'Отвечает за список товаров и единственный на этой схеме обращается к своей PostgreSQL. Серверы приложения не читают таблицу products напрямую. Сбой каталога приводит к 503 для GET товаров.'],
    'svc-payment': ['Сервис оплаты', 'Вызывается только при POST /api/checkout. Отправляет платёж внешнему провайдеру (например, Stripe), который взаимодействует с банком или эквайером. Ответ может потеряться после списания; повтор с тем же ключом идемпотентности не должен создавать второе списание. В реальной интеграции итог оплаты также подтверждают серверным webhook-событием. <a href="https://docs.stripe.com/api/idempotent_requests" target="_blank" rel="noopener noreferrer">Идемпотентность ↗</a>'],
    database: ['PostgreSQL · каталог', 'Это приватное хранилище сервиса каталога. Приложение A/B и сервис оплаты не отправляют сюда SQL напрямую. В реальных системах каждый сервис владеет своими данными; отдельные хранилища авторизации и оплаты для компактности не показаны. <a href="https://microservices.io/patterns/data/database-per-service" target="_blank" rel="noopener noreferrer">Database per service ↗</a>'],
    'ext-keycloak': ['Keycloak · пример', 'Внешний провайдер идентификации: приложение или сервис авторизации может направить пользователя на вход через OpenID Connect и получить токены. Здесь показана точка интеграции, а не реальный запущенный Keycloak. Учебная сессия создана до открытия схемы и проверяется сервисом авторизации локально.'],
    'ext-gateway': ['Платёжный провайдер', 'Внешняя платёжная система: сервис оплаты создаёт платёж с ключом идемпотентности. Провайдер передаёт операцию дальше банку/эквайеру и возвращает результат. Stripe — пример такого API, но схема не подключена к реальной платёжной системе.'],
    'ext-bank': ['Банк / эквайер', 'За пределами нашего приложения банк или эквайер участвует в обработке платежа. Наш сервер не обращается к нему напрямую: путь идёт через платёжного провайдера.'],
    'tool-bitbucket': ['Bitbucket · Git', 'Хранит исходный код и историю изменений. Разработчик отправляет commit и pull request; Jenkins получает код из репозитория и выполняет Jenkinsfile. Bitbucket не обрабатывает запросы покупателей. <a href="https://support.atlassian.com/bitbucket-cloud/docs/integrations/" target="_blank" rel="noopener noreferrer">Интеграции Bitbucket ↗</a>'],
    'tool-jenkins': ['Jenkins · CI/CD', 'После изменения кода запускает pipeline: сборку, проверки и публикацию артефакта. Затем процесс развёртывания обновляет приложение через Kubernetes. Точечная связь показывает путь выпуска версии, не HTTP-запрос страницы. <a href="https://www.jenkins.io/doc/book/pipeline/" target="_blank" rel="noopener noreferrer">Jenkins Pipeline ↗</a>'],
    'tool-kubernetes': ['Kubernetes · deploy', 'Оркестратор размещает и обновляет экземпляры приложения. На этой карте серверы A и B — два учебных экземпляра; Kubernetes показан как возможный способ их развёртывания, а не как обязательная часть каждого запроса. <a href="https://kubernetes.io/docs/concepts/workloads/controllers/deployment/" target="_blank" rel="noopener noreferrer">Deployment ↗</a>'],
    'tool-prometheus': ['Сбор метрик · Prometheus', 'Prometheus периодически считывает показатели с HTTP-адреса сервера A, например /metrics: число запросов, ошибок и задержки. На карте это прямая точечная связь с сервером A; через Kubernetes сами метрики не проходят. Сбор идёт отдельно от пользовательского запроса и не формирует ответ клиенту. <a href="https://prometheus.io/docs/introduction/first_steps/" target="_blank" rel="noopener noreferrer">Как Prometheus собирает метрики ↗</a>'],
    'tool-grafana': ['Grafana · дашборды', 'Читает метрики из Prometheus как из источника данных и показывает графики и предупреждения. Сервис приложения не отправляет ответ браузера в Grafana при каждом GET. <a href="https://grafana.com/docs/grafana/latest/datasources/prometheus/" target="_blank" rel="noopener noreferrer">Источник Prometheus ↗</a>'],
    'tool-rabbitmq': ['RabbitMQ · брокер сообщений', 'RabbitMQ может обслуживать разные микросервисы: Авторизация могла бы публиковать SessionRevoked, Каталог — ProductUpdated, Оплата — PaymentSucceeded. Отправитель публикует событие в exchange; правила маршрутизации направляют его в очереди заинтересованных подписчиков. Подписчиком может быть другой микросервис или отдельный фоновый обработчик. Это возможные асинхронные сценарии, а не обязательный путь каждого GET или POST на карте. Один общий брокер не означает одну общую очередь для всех событий. <a href="https://www.rabbitmq.com/tutorials/amqp-concepts" target="_blank" rel="noopener noreferrer">Как работают exchange и очереди ↗</a>'],
    'tool-pgadmin': ['pgAdmin · клиент PostgreSQL', 'Администратор подключается к PostgreSQL через pgAdmin для просмотра таблиц и ручных SQL-запросов. Это отдельное служебное соединение с ограниченными правами, а не запрос браузера через сервер A/B. <a href="https://www.pgadmin.org/docs/pgadmin4/latest/connect_to_server.html" target="_blank" rel="noopener noreferrer">Подключение к серверу ↗</a>'],
    tasks: ['Задания · микросервисы', 'Раскрой задание, выполни шаги и сравни HTTP-статус с внутренними вызовами на карте.'],
  };
  const tasks = [
    { id: 'success', title: 'Получить товары через каталог', steps: [['svc-auth', 'Оставь сервисы включёнными и сессию действительной.'], ['client', 'Загрузи страницу.', 'Загрузить страницу'], ['svc-catalog', 'В Network открой GET /api/products: 200 и два товара. Только Каталог обращается к PostgreSQL.']] },
    { id: 'unauthorized', title: 'Отличить 401 от сбоя сервиса', steps: [['svc-auth', 'Удали сессию в Авторизации.', 'Удалить сессию'], ['client', 'Обнови страницу.', 'Обновить страницу'], ['svc-catalog', 'В GET /api/products увидишь 401: до Каталога и PostgreSQL запрос не дошёл.']] },
    { id: 'auth-down', title: 'Получить 503 при недоступной авторизации', steps: [['svc-auth', 'Восстанови сессию и отключи сервис Авторизации.', 'Отключить сервис'], ['client', 'Обнови страницу.', 'Обновить страницу'], ['svc-auth', 'GET /api/products получает 503: сессию технически нельзя проверить, это не 401.']] },
    { id: 'catalog-down', title: 'Локализовать сбой каталога', steps: [['svc-auth', 'Включи Авторизацию и восстанови сессию.'], ['svc-catalog', 'Отключи Каталог товаров.', 'Отключить сервис'], ['client', 'Обнови страницу: GET /api/products получает 503, до PostgreSQL запрос не доходит.', 'Обновить страницу']] },
    { id: 'payment-retry', title: 'Повторить оплату без второго списания', steps: [['svc-payment', 'Включи сервисы, загрузи страницу и выбери «Тайм-аут после списания».', 'Тайм-аут после списания'], ['client', 'Оплати товары: Network покажет 504, хотя списание произошло.', 'Оплатить товары'], ['client', 'Повтори оплату с тем же ключом: получишь 200 без второго списания.', 'Повторить оплату']] }
  ];

  const defaults = () => ({ loaded: false, offline: [], sessionValid: true, paymentTimeout: false, paymentCount: 0, paymentRecords: {}, pendingKey: null, lastPage: null, lastCheckout: null, lastRun: null, completed: [], expandedTask: '', article: '', networkOpen: false, networkRequest: 'html', networkTab: 'headers' });
  let state = defaults();
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') state = { ...state, ...saved }; } catch {}
  if (chapter === '2' && state.article?.startsWith('tool-')) state.article = '';
  if (state.article && !articles[state.article]) state.article = '';
  const offline = new Set(Array.isArray(state.offline) ? state.offline : []);
  const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
  const scroller = $('#course-scroller');
  const canvas = $('#course-canvas');
  const lineHost = $('#course-lines');
  const nodeHost = $('#course-nodes');
  const article = $('#course-article');
  const networkPanel = $('#course-network-panel');
  const playButton = $('#course-play');
  const resetButton = $('#course-reset');
  const intro = $('.course-intro');
  const checkoutButton = document.createElement('button');
  checkoutButton.type = 'button';
  checkoutButton.id = 'course-checkout';
  checkoutButton.className = 'course-reset';
  intro.querySelector('.course-eyebrow').textContent = `Вводный курс · глава 0${chapter}`;
  intro.querySelector('h1').textContent = chapter === '3' ? 'Инфраструктура' : 'Микросервисы';
  intro.append(checkoutButton);
  scroller.setAttribute('aria-label', chapter === '3' ? 'Инструменты и инфраструктура микросервисов' : 'Интерактивная схема взаимодействия микросервисов');
  lineHost.setAttribute('viewBox', '0 0 3100 1100');
  let busy = false;
  let runId = 0;
  let saveTimer = 0;
  let motion;
  function save() {
    state.offline = [...offline];
    state.completed = [...completed];
    state.networkOpen = !networkPanel.hidden;
    resetButton.disabled = !(state.loaded || state.lastRun || offline.size || !state.sessionValid || state.paymentTimeout || state.paymentCount || state.pendingKey || completed.size);
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, camera: motion?.snapshot() })); } catch {}
  }
  function activeApp() { return !offline.has('app-a') ? 'app-a' : !offline.has('app-b') ? 'app-b' : null; }
  function edges() {
    return [
      ['client', 'balancer'],
      ['balancer', 'app-a'], ['balancer', 'app-b'],
      ['app-a', 'svc-auth'], ['app-a', 'svc-catalog'], ['app-a', 'svc-payment'],
      ['app-b', 'svc-auth'], ['app-b', 'svc-catalog'], ['app-b', 'svc-payment'],
      ['svc-catalog', 'database'],
      ['svc-auth', 'ext-keycloak'],
      ['svc-payment', 'ext-gateway'],
      ['ext-gateway', 'ext-bank']
    ];
  }
  function nodePoint(id, side) {
    const node = byId.get(id);
    return { x: node.x + (side === 'right' ? node.width : 0), y: node.y + (id.startsWith('ext-') ? 48 : id.startsWith('svc-') ? 62 : 91) };
  }
  function lineBetween(a, b) {
    const from = nodePoint(a, 'right');
    const to = nodePoint(b, 'left');
    const bend = Math.max(35, Math.abs(to.x - from.x) * .42);
    return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  }
  function drawLines() {
    lineHost.replaceChildren();
    for (const [from, to] of edges()) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', lineBetween(from, to));
      path.dataset.route = `${from}:${to}`;
      path.classList.add('is-micro-route');
      if (from.startsWith('app-') && offline.has(from) && to.startsWith('svc-')) path.classList.add('is-offline-app-route');
      if ((from.startsWith('app-') && from !== activeApp()) || (to.startsWith('app-') && to !== activeApp())) path.classList.add('is-standby-route');
      if (offline.has(from) || offline.has(to)) path.classList.add('is-faulty');
      if (state.article === from || state.article === to) path.classList.add('is-active-route');
      lineHost.append(path);
    }
    const peer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    peer.classList.add('course-micro-peer-link');
    const centerX = byId.get('app-a').x + 266;
    const top = byId.get('app-a').y + 122;
    const bottom = byId.get('app-b').y + 56;
    peer.innerHTML = `<path class="course-micro-peer-link__line" d="M ${centerX} ${top} L ${centerX} ${bottom}"/><circle cx="${centerX}" cy="${(top + bottom) / 2}" r="12"/><path class="course-micro-peer-link__check" d="m ${centerX - 5} ${(top + bottom) / 2} 3 3 7 -7"/>`;
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
        ? `<button class="course-node__icon course-client-preview" type="button" aria-label="Открыть Network"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[node.icon]}</svg><span class="course-client-preview__code" aria-live="polite"></span></button>`
        : `<span class="course-node__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[node.icon]}</svg></span>`;
      element.innerHTML = `${icon}<button class="questions-map-card__question" type="button"><span class="course-node__title">${escapeHtml(node.title)}</span></button>`;
      element.querySelector('.questions-map-card__question').addEventListener('click', () => showArticle(node.id));
      nodeHost.append(element);
    }
    refreshNodes();
  }
  function refreshNodes() {
    nodeHost.querySelectorAll('[data-node]').forEach(node => {
      node.dataset.offline = String(offline.has(node.dataset.node));
      node.classList.toggle('is-faulty', offline.has(node.dataset.node));
      node.classList.toggle('is-selected', state.article === node.dataset.node);
    });
    if (chapter === '3') document.querySelectorAll('#course-tools [data-tool]').forEach(tool => tool.classList.toggle('is-selected', state.article === `tool-${tool.dataset.tool}`));
    drawLines();
  }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function hop(from, to, kind = 'request') {
    const path = lineHost.querySelector(`[data-route="${from}:${to}"]`) || lineHost.querySelector(`[data-route="${to}:${from}"]`);
    if (!path) return;
    const back = kind === 'response';
    path.classList.remove('is-flowing', 'is-flowing-back');
    void path.getBoundingClientRect();
    path.classList.add('is-flowing');
    if (back) path.classList.add('is-flowing-back');
    const node = nodeHost.querySelector(`[data-node="${to}"] .questions-map-card__question`);
    if (node) {
      node.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-processing');
      void node.offsetWidth;
      node.classList.add(back ? 'is-flowing-back' : ['database', 'svc-auth', 'svc-catalog', 'svc-payment', 'ext-keycloak', 'ext-gateway', 'ext-bank'].includes(to) ? 'is-processing' : 'is-flowing-forward');
      setTimeout(() => node.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-processing'), 700);
    }
    await wait(660);
    path.classList.remove('is-flowing', 'is-flowing-back');
  }
  function response(code, body, source, trace = []) { return { code, body, source, trace, at: Date.now() }; }
  function products() { return [{ id: 42, name: 'Ноутбук QA Book', price: 79990 }, { id: 43, name: 'Смартфон Pixel QA', price: 52990 }]; }
  function keyForPurchase() { return `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
  function markTasks(kind, result) {
    if (kind === 'page' && result.code === 200 && result.body?.products?.length === 2) completed.add('success');
    if (kind === 'page' && result.code === 401 && !state.sessionValid) completed.add('unauthorized');
    if (kind === 'page' && result.code === 503 && result.source === 'Авторизация') completed.add('auth-down');
    if (kind === 'page' && result.code === 503 && result.source === 'Каталог товаров') completed.add('catalog-down');
    if (kind === 'checkout' && result.code === 200 && result.idempotent) completed.add('payment-retry');
  }
  function finish(kind, result) {
    state.lastRun = { kind, ...result };
    if (kind === 'page') { state.lastPage = result; state.loaded = result.htmlCode === 200; }
    else state.lastCheckout = result;
    const preview = nodeHost.querySelector('.course-client-preview');
    preview.dataset.mode = result.code === 200 ? 'ok' : 'broken';
    preview.querySelector('.course-client-preview__code').textContent = result.code === '—' ? '' : result.code;
    markTasks(kind, result);
    busy = false;
    playButton.disabled = false;
    checkoutButton.disabled = !state.loaded;
    syncButtons();
    refreshArticle();
    renderNetwork();
    save();
  }
  async function run(kind) {
    if (busy) return;
    if (kind === 'checkout' && !state.loaded) return;
    busy = true;
    const current = ++runId;
    state.lastRun = { kind, code: '…', source: 'Запрос отправлен', trace: [], htmlCode: 0 };
    renderNetwork();
    playButton.disabled = true;
    checkoutButton.disabled = true;
    const app = activeApp();
    let trace = [];
    const log = (label, code) => { trace.push({ label, code }); state.lastRun = { kind, code: '…', source: label, trace: [...trace], htmlCode: kind === 'page' && !trace.some(item => item.label.includes('HTML')) ? 0 : 200 }; refreshArticle(); renderNetwork(); };
    const done = result => { if (current === runId) finish(kind, { ...result, trace }); };
    await hop('client', 'balancer');
    if (current !== runId) return;
    if (!app) { log('Нет доступного сервера A/B', '—'); done({ ...response('—', { error: 'NO_APP_SERVER' }, 'Балансировщик'), htmlCode: kind === 'page' ? 0 : 200 }); return; }
    await hop('balancer', app);
    if (current !== runId) return;
    if (kind === 'page') {
      log(`${app === 'app-a' ? 'A' : 'B'} → HTML`, 200);
      await hop(app, 'balancer', 'response');
      await hop('balancer', 'client', 'response');
      await hop('client', 'balancer');
      await hop('balancer', app);
    }
    await hop(app, 'svc-auth');
    if (current !== runId) return;
    if (offline.has('svc-auth')) { log('Авторизация недоступна', 503); await hop('svc-auth', app, 'response'); done({ ...response(503, { error: 'AUTH_UNAVAILABLE' }, 'Авторизация'), htmlCode: 200 }); return; }
    if (!state.sessionValid) { log('Сессия не действительна', 401); await hop('svc-auth', app, 'response'); done({ ...response(401, { error: 'SESSION_REQUIRED' }, 'Авторизация'), htmlCode: 200 }); return; }
    log('Авторизация → сессия действительна', 200);
    await hop('svc-auth', app, 'response');
    await hop(app, 'svc-catalog');
    if (current !== runId) return;
    if (offline.has('svc-catalog')) { log('Каталог недоступен', 503); await hop('svc-catalog', app, 'response'); done({ ...response(503, { error: 'CATALOG_UNAVAILABLE' }, 'Каталог товаров'), htmlCode: 200 }); return; }
    await hop('svc-catalog', 'database');
    if (current !== runId) return;
    if (offline.has('database')) { log('PostgreSQL каталога недоступна', 503); await hop('database', 'svc-catalog', 'response'); done({ ...response(503, { error: 'CATALOG_DB_UNAVAILABLE' }, 'PostgreSQL · каталог'), htmlCode: 200 }); return; }
    log('Каталог → PostgreSQL → 2 строки', 200);
    await hop('database', 'svc-catalog', 'response');
    await hop('svc-catalog', app, 'response');
    if (kind === 'page') {
      await hop(app, 'balancer', 'response');
      await hop('balancer', 'client', 'response');
      done({ ...response(200, { products: products() }, 'Каталог товаров'), htmlCode: 200 });
      return;
    }
    await hop(app, 'svc-payment');
    if (current !== runId) return;
    if (offline.has('svc-payment')) { log('Оплата недоступна; списания нет', 503); await hop('svc-payment', app, 'response'); done({ ...response(503, { error: 'PAYMENT_UNAVAILABLE' }, 'Оплата'), htmlCode: 200 }); return; }
    await hop('svc-payment', 'ext-gateway');
    if (current !== runId) return;
    const key = state.pendingKey || keyForPurchase();
    state.pendingKey = key;
    let record = state.paymentRecords[key];
    const idempotent = !!record;
    if (!record) {
      await hop('ext-gateway', 'ext-bank');
      if (current !== runId) return;
      record = { paymentId: `pay_${(state.paymentCount + 1).toString().padStart(3, '0')}`, amount: 132980 };
      state.paymentRecords[key] = record;
      state.paymentCount++;
    }
    if (state.paymentTimeout && !idempotent) {
      state.paymentTimeout = false;
      log('Оплата проведена; ответ потерян', 504);
      await hop('ext-bank', 'ext-gateway', 'response');
      await hop('ext-gateway', 'svc-payment', 'response');
      await hop('svc-payment', app, 'response');
      done({ ...response(504, { error: 'PAYMENT_TIMEOUT', status: 'unknown', idempotencyKey: key }, 'Оплата'), htmlCode: 200, idempotent: false });
      return;
    }
    log(idempotent ? 'Оплата → прежний результат без списания' : 'Оплата → списание выполнено', 200);
    if (!idempotent) await hop('ext-bank', 'ext-gateway', 'response');
    await hop('ext-gateway', 'svc-payment', 'response');
    await hop('svc-payment', app, 'response');
    await hop(app, 'balancer', 'response');
    await hop('balancer', 'client', 'response');
    state.pendingKey = null;
    done({ ...response(200, { paymentId: record.paymentId, amount: record.amount, status: 'paid', idempotencyKey: key }, 'Оплата'), htmlCode: 200, idempotent });
  }
  function syncButtons() {
    playButton.textContent = state.loaded ? '▶ Обновить страницу' : '▶ Загрузить страницу';
    playButton.title = state.loaded ? 'Обновить страницу и данные' : 'Загрузить страницу';
    checkoutButton.textContent = state.pendingKey ? '↻ Повторить оплату' : state.paymentCount ? 'Новая покупка' : 'Оплатить товары';
    checkoutButton.disabled = busy || !state.loaded;
  }
  const taskTooltip = document.createElement('div');
  taskTooltip.className = 'course-task-tooltip';
  taskTooltip.hidden = true;
  document.body.append(taskTooltip);
  let taskTooltipTimer;
  function hideTaskTooltip() { clearTimeout(taskTooltipTimer); taskTooltip.hidden = true; }
  function showTaskTooltip(icon) {
    if (!icon.isConnected || state.article !== 'tasks' || article.hidden) return;
    taskTooltip.textContent = icon.dataset.tooltip;
    taskTooltip.hidden = false;
    const anchor = icon.getBoundingClientRect();
    const tip = taskTooltip.getBoundingClientRect();
    taskTooltip.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - tip.width - 8))}px`;
    taskTooltip.style.top = `${anchor.top - tip.height - 6 >= 8 ? anchor.top - tip.height - 6 : anchor.bottom + 6}px`;
  }
  function bindTaskTooltip(icon) {
    icon.addEventListener('pointerenter', () => { hideTaskTooltip(); taskTooltipTimer = setTimeout(() => showTaskTooltip(icon), 500); });
    icon.addEventListener('pointerleave', hideTaskTooltip);
    icon.addEventListener('focus', () => { hideTaskTooltip(); showTaskTooltip(icon); });
    icon.addEventListener('blur', hideTaskTooltip);
  }
  article.querySelector('.course-article__scroll').addEventListener('scroll', hideTaskTooltip);
  window.addEventListener('resize', hideTaskTooltip);
  const taskActionIcon = label => {
    const path = label === 'Удалить сессию' ? '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7"/>'
      : label === 'Отключить сервис' ? '<path d="M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0"/>'
      : label === 'Тайм-аут после списания' ? '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
      : label === 'Оплатить товары' ? icons.payment
      : label === 'Загрузить страницу' ? '<path d="m8 5 11 7-11 7z"/>'
      : '<path d="M20 7v5h-5M4 17v-5h5M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  };
  function renderTasks() {
    const host = $('#course-article-visual');
    hideTaskTooltip();
    const scroll = article.querySelector('.course-article__scroll');
    const previousScroll = scroll.scrollTop;
    host.className = 'course-task-list';
    host.replaceChildren();
    for (const task of tasks) {
      const item = document.createElement('div');
      item.className = 'course-task';
      item.dataset.taskId = task.id;
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
        const placeName = byId.get(place)?.title || place;
        const symbol = icons[byId.get(place)?.icon] || icons.client;
        const actionHint = `Действие · ${placeName}: ${action}`;
        return `<div class="course-task__step"><span class="course-task__number">${index + 1}.</span><span class="course-task__place course-task__hint" tabindex="0" role="img" aria-label="${escapeHtml(placeName)}" data-tooltip="${escapeHtml(placeName)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${symbol}</svg></span><span class="course-task__copy"><span>${escapeHtml(instruction)}</span>${action ? `<span class="course-task__action"><span class="course-task__action-icon course-task__hint" tabindex="0" role="img" aria-label="${escapeHtml(actionHint)}" data-tooltip="${escapeHtml(actionHint)}">${taskActionIcon(action)}</span><small>${escapeHtml(action)}</small></span>` : ''}</span></div>`;
      }).join('')}</div>`;
      panel.querySelectorAll('.course-task__hint').forEach(bindTaskTooltip);
      heading.addEventListener('click', () => {
        hideTaskTooltip();
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
    if (!id) return;
    const data = articles[id];
    $('#course-article-title').textContent = data[0];
    $('#course-article-kicker').textContent = '';
    $('#course-article-devtools-icon').hidden = true;
    $('#course-article-subtitle').hidden = true;
    $('#course-article-primary').replaceChildren();
    const theory = article.querySelector('.course-article__theory');
    theory.hidden = id === 'tasks';
    $('#course-article-body').innerHTML = `<p>${data[1]}</p>`;
    const actions = $('#course-action-buttons');
    actions.replaceChildren();
    const actionIcons = {
      'Отключить': '<path d="M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0"/>',
      'Включить': '<path d="M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0"/>',
      'Удалить сессию': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2M10 15l4 4m0-4-4 4"/>',
      'Восстановить сессию': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M9 16l2 2 4-4"/>',
      'Тайм-аут после списания': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M17 3l3 2"/>',
      'Отменить тайм-аут': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M7 3l-3 2"/>'
    };
    const add = (label, handler, destructive = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = busy;
      button.classList.toggle('is-destructive', destructive);
      button.setAttribute('aria-label', label);
      button.dataset.tooltip = label;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${actionIcons[label]}</svg>`;
      button.addEventListener('click', () => { if (busy) return; handler(); refreshNodes(); renderArticle(); renderNetwork(); save(); });
      actions.append(button);
    };
    if (['app-a', 'app-b', 'svc-auth', 'svc-catalog', 'svc-payment', 'database'].includes(id)) add(offline.has(id) ? 'Включить' : 'Отключить', () => { if (offline.has(id)) offline.delete(id); else offline.add(id); }, !offline.has(id));
    if (id === 'svc-auth') add(state.sessionValid ? 'Удалить сессию' : 'Восстановить сессию', () => { state.sessionValid = !state.sessionValid; }, state.sessionValid);
    if (id === 'svc-payment') add(state.paymentTimeout ? 'Отменить тайм-аут' : 'Тайм-аут после списания', () => { state.paymentTimeout = !state.paymentTimeout; }, !state.paymentTimeout);
    actions.closest('.course-article__actions').hidden = !actions.childElementCount;
    if (id === 'tasks') { renderTasks(); return; }
    const host = $('#course-article-visual');
    host.className = 'course-micro-viz';
    const isOffline = offline.has(id);
    const status = id.startsWith('tool-') ? 'Смежный инструмент' : id.startsWith('ext-') ? 'Пример интеграции' : id === 'svc-auth' ? (isOffline ? 'Недоступен' : state.sessionValid ? 'Сессия действительна' : 'Сессия удалена') : id === 'svc-payment' ? (isOffline ? 'Недоступен' : `${state.paymentCount} списаний`) : isOffline ? 'Недоступен' : 'Доступен';
    const related = (state.lastRun?.trace || []).filter(item => item.label.toLowerCase().includes(data[0].toLowerCase().split(' ')[0]) || (id === 'database' && item.label.includes('PostgreSQL')));
    const messageExamples = id === 'tool-rabbitmq' ? '<ul class="course-micro-viz__trace"><li><span>Авторизация</span><code>SessionRevoked</code></li><li><span>Каталог</span><code>ProductUpdated</code></li><li><span>Оплата</span><code>PaymentSucceeded</code></li></ul>' : '';
    host.innerHTML = `<div class="course-micro-viz__state" data-tone="${isOffline ? 'error' : 'ok'}"><strong>${escapeHtml(data[0])}</strong><small>${escapeHtml(status)}</small></div>${id.startsWith('tool-') ? '<div class="course-micro-viz__state"><span>Связь точками</span><small>не участвует в текущем запуске</small></div>' : ''}${messageExamples}${id === 'svc-payment' ? `<div class="course-micro-viz__state"><span>Следующий вызов</span><small>${state.paymentTimeout ? 'ответ потеряется после списания' : state.pendingKey ? 'повтор с прежним ключом' : 'новый платёж'}</small></div>` : ''}${id === 'svc-catalog' ? `<div class="course-micro-viz__state"><span>Своя PostgreSQL</span><small>${offline.has('database') ? 'недоступна' : 'products: 2 строки'}</small></div>` : ''}${id === 'ext-keycloak' ? '<div class="course-micro-viz__state"><span>OpenID Connect</span><small>вход до открытия схемы</small></div>' : ''}${id === 'ext-gateway' ? `<div class="course-micro-viz__state"><span>Записано платежей</span><small>${state.paymentCount}</small></div>` : ''}${id === 'ext-bank' ? '<div class="course-micro-viz__state"><span>Канал</span><small>через провайдера оплаты</small></div>' : ''}${related.length ? `<ul class="course-micro-viz__trace">${related.map(item => `<li><span>${escapeHtml(item.label)}</span><code>${escapeHtml(item.code)}</code></li>`).join('')}</ul>` : ''}`;
  }
  function refreshArticle() { if (state.article && !article.hidden) renderArticle(); }
  function showArticle(id) {
    if (matchMedia('(max-width: 767px)').matches) networkPanel.hidden = true;
    state.article = id;
    article.hidden = false;
    article.querySelector('.course-article__theory').open = false;
    $('#course-article-visual').className = '';
    renderArticle();
    refreshNodes();
    article.querySelector('.course-article__scroll').scrollTop = 0;
    save();
  }
  function networkRequests() {
    const livePage = busy && state.lastRun?.kind === 'page' ? state.lastRun : null;
    const liveCheckout = busy && state.lastRun?.kind === 'checkout' ? state.lastRun : null;
    const page = livePage || state.lastPage;
    const checkout = liveCheckout || state.lastCheckout;
    return [
      { id: 'login', method: 'POST', name: '/auth/login', code: 200, source: 'до открытия схемы', body: { message: 'Сессия была создана ранее', session: 'demo' } },
      { id: 'html', method: 'GET', name: 'HTML', code: page?.htmlCode || '—', source: page?.htmlCode === 200 ? 'сервер приложения' : 'ожидает', body: page?.htmlCode === 200 ? '<!doctype html>…' : null },
      { id: 'api', method: 'GET', name: '/api/products', code: page?.code ?? '—', source: page?.source || 'ожидает', body: page?.body },
      ...(checkout ? [{ id: 'checkout', method: 'POST', name: '/api/checkout', code: checkout.code, source: checkout.source, body: checkout.body }] : [])
    ];
  }
  function renderNetwork() {
    if (networkPanel.hidden) return;
    const requests = networkRequests();
    if (!requests.some(item => item.id === state.networkRequest)) state.networkRequest = 'html';
    const selected = requests.find(item => item.id === state.networkRequest);
    $('#course-network-selection').textContent = selected.id === 'api' ? 'Товары' : selected.id === 'checkout' ? 'Оплата' : selected.id === 'login' ? 'Авторизация' : selected.name;
    $('#course-network-flow').textContent = state.networkTab === 'response' ? 'ответ' : 'запрос';
    $('#course-network-action-buttons').replaceChildren();
    const body = state.networkTab === 'headers'
      ? `${selected.method} ${selected.name === 'HTML' ? '/' : selected.name} HTTP/1.1\nHost: qatodev.ru\n${selected.id === 'checkout' ? `Idempotency-Key: ${state.lastCheckout?.body?.idempotencyKey || state.pendingKey || 'будет создан'}\nContent-Type: application/json\n` : ''}${['api', 'checkout'].includes(selected.id) ? `Cookie: session=${state.sessionValid ? 'demo' : 'отсутствует'}\n` : ''}\nHTTP ${selected.code}${selected.id === 'login' ? '\nSet-Cookie: session=demo; HttpOnly; Secure; SameSite=Lax' : ''}${selected.source ? `\nИсточник ответа: ${selected.source}` : ''}`
      : state.networkTab === 'preview' ? (selected.id === 'html' ? (selected.code === 200 ? `qa market\n${pageHasProducts() ? 'Ноутбук QA Book · Смартфон Pixel QA' : 'Товары ещё не получены'}` : 'Страница ещё не загружена') : selected.body && typeof selected.body === 'object' ? Object.entries(selected.body).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n') : selected.body || 'Ответ ещё не получен')
      : selected.body && typeof selected.body === 'object' ? JSON.stringify(selected.body, null, 2) : selected.body || 'Ответ ещё не получен';
    $('#course-network-visual').innerHTML = `<div class="course-micro-network"><div class="course-micro-network__list">${requests.map(item => `<button type="button" data-request="${item.id}" class="${item.id === selected.id ? 'is-current' : ''}"><strong>${item.method}</strong><span>${escapeHtml(item.name)}</span><small>${item.code}</small></button>`).join('')}</div><div class="course-micro-network__detail"><div class="course-micro-network__url">https://qatodev.ru${selected.name === 'HTML' ? '/' : selected.name}</div><div class="course-micro-network__tabs">${[['headers', 'Заголовки'], ['preview', 'Просмотр'], ['response', 'Ответ']].map(([id, label]) => `<button type="button" data-tab="${id}" class="${state.networkTab === id ? 'is-current' : ''}">${label}</button>`).join('')}</div><div class="course-micro-network__body"><code>${escapeHtml(body)}</code></div></div></div>`;
    $('#course-network-visual').querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', () => { state.networkRequest = button.dataset.request; renderNetwork(); save(); }));
    $('#course-network-visual').querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { state.networkTab = button.dataset.tab; renderNetwork(); save(); }));
  }
  function pageHasProducts() {
    return busy && state.lastRun?.kind === 'page' ? false : state.lastPage?.code === 200;
  }
  function openNetwork() { if (matchMedia('(max-width: 767px)').matches) { article.hidden = true; state.article = ''; refreshNodes(); } networkPanel.hidden = false; renderNetwork(); save(); }

  drawNodes();
  motion = window.createMapMotion({ viewport: scroller, canvas, getContentBounds: () => ({ left: 530, top: 60, right: 3020, bottom: 1080 }), onChange: () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }, touchPanGain: 1.25 });
  window.courseMapMotion = motion;
  if (window.courseChapterEntryCamera) motion.restore(window.courseChapterEntryCamera);
  else if (state.camera && Number.isFinite(state.camera.x)) motion.restore(state.camera);
  else motion.focus(860, 540, false);
  playButton.addEventListener('click', () => run('page'));
  checkoutButton.addEventListener('click', () => run('checkout'));
  $('#course-tasks').addEventListener('click', () => showArticle('tasks'));
  $('#course-article-close').addEventListener('click', () => { article.hidden = true; state.article = ''; refreshNodes(); save(); });
  $('#course-network-close').addEventListener('click', () => { networkPanel.hidden = true; save(); });
  nodeHost.querySelector('[data-node="client"] .course-node__icon').addEventListener('click', openNetwork);
  if (chapter === '3') document.querySelectorAll('#course-tools [data-tool]').forEach(tool => tool.addEventListener('click', () => showArticle(`tool-${tool.dataset.tool}`)));
  $('#course-article-body').addEventListener('click', event => { if (event.target.closest('a')) event.stopPropagation(); });
  resetButton.addEventListener('click', () => {
    runId++;
    Object.assign(state, defaults());
    offline.clear(); completed.clear(); busy = false;
    article.hidden = true; networkPanel.hidden = true;
    playButton.disabled = false;
    const preview = nodeHost.querySelector('.course-client-preview');
    preview.removeAttribute('data-mode');
    preview.querySelector('.course-client-preview__code').textContent = '';
    nodeHost.querySelectorAll('.course-node .questions-map-card__question').forEach(node => node.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-processing'));
    lineHost.querySelectorAll('path').forEach(path => path.classList.remove('is-flowing', 'is-flowing-back'));
    refreshNodes(); syncButtons(); save();
  });
  syncButtons();
  if (state.lastRun) {
    const preview = nodeHost.querySelector('.course-client-preview');
    preview.dataset.mode = state.lastRun.code === 200 ? 'ok' : 'broken';
    preview.querySelector('.course-client-preview__code').textContent = state.lastRun.code === '—' ? '' : state.lastRun.code;
  }
  if (state.article && !(state.networkOpen && matchMedia('(max-width: 767px)').matches)) { article.hidden = false; renderArticle(); }
  if (state.networkOpen) { networkPanel.hidden = false; renderNetwork(); }
  resetButton.disabled = !(state.loaded || state.lastRun || offline.size || !state.sessionValid || state.paymentCount || completed.size);
  document.body.classList.add('course-ready');
})();
