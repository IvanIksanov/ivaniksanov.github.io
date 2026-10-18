(() => {
  'use strict';

  const projects = [
    { id: 'web', title: 'Web UI · проект', detail: 'браузерные тесты', marks: [['TypeScript', 'Playwright'], ['Java', 'Selenium', 'JUnit']], x: 245, y: 380, width: 220 },
    { id: 'mobile', title: 'Mobile UI · проект', detail: 'Android и iOS', marks: [['Java', 'Appium', 'Android', 'iOS'], ['Android Studio', 'Kotlin', 'Espresso']], x: 245, y: 875, width: 220 },
    { id: 'api', title: 'API + SQL · проект', detail: 'проверка данных', marks: [['Java', 'REST Assured', 'JUnit', 'PostgreSQL']], x: 1005, y: 915, width: 190 },
    { id: 'load', title: 'Нагрузка · проект', detail: 'профиль нагрузки', marks: [['Java', 'JMeter', 'Groovy']], x: 1230, y: 915, width: 170 }
  ];
  // Те же наборы Iconify и фирменные цвета, что используются для стеков в resume.js.
  const techIcons = {
    'TypeScript': ['simple-icons:typescript', '#3178c6'],
    'Playwright': ['simple-icons:playwright', '#2ead33'],
    'Java': ['devicon-plain:java', '#f89820'],
    'Android': ['simple-icons:android', '#3ddc84'],
    'iOS': ['simple-icons:apple', '#9aa2af'],
    'Swift': ['simple-icons:swift', '#f05138'],
    'Selenium': ['simple-icons:selenium', '#43b02a'],
    'JUnit': ['simple-icons:junit5', '#dc524a'],
    'TestNG': ['tabler:test-pipe', '#ce8c42'],
    'Appium': ['simple-icons:appium', '#8f43fe'],
    'Android Studio': ['simple-icons:androidstudio', '#3ddc84'],
    'Kotlin': ['simple-icons:kotlin', '#7f52ff'],
    'Espresso': ['simple-icons:android', '#3ddc84'],
    'REST Assured': ['tabler:shield-check', '#10b981'],
    'PostgreSQL': ['simple-icons:postgresql', '#336791'],
    'JMeter': ['simple-icons:apachejmeter', '#d22128'],
    'Groovy': ['simple-icons:apachegroovy', '#4298b8']
  };
  const scenarioIcons = {
    web: ['TypeScript', 'Playwright'], selenium: ['Java', 'Selenium', 'JUnit'],
    mobile: ['Java', 'Appium', 'Android'], 'mobile-ios': ['Java', 'Appium', 'iOS'], espresso: ['Android Studio', 'Kotlin', 'Espresso'],
    api: ['Java', 'REST Assured', 'JUnit'], 'api-negative': ['Java', 'REST Assured', 'JUnit'], patch: ['Java', 'REST Assured', 'JUnit'],
    'payment-api': ['Java', 'REST Assured', 'JUnit'], sql: ['Java', 'PostgreSQL'], 'sql-negative': ['Java', 'PostgreSQL'], load: ['Java', 'JMeter', 'Groovy']
  };
  const techIcon = name => `<span class="course-test-tool__mark" style="color:${techIcons[name][1]}" title="${name}" aria-label="${name}"><iconify-icon icon="${techIcons[name][0]}"></iconify-icon></span>`;
  const projectForKind = { web: 'web', selenium: 'web', mobile: 'mobile', 'mobile-ios': 'mobile', espresso: 'mobile', api: 'api', 'api-negative': 'api', patch: 'api', 'payment-api': 'api', sql: 'api', 'sql-negative': 'api', load: 'load' };
  const projectForTool = { playwright: 'web', selenium: 'web', java: 'web', appium: 'mobile', 'appium-ios': 'mobile', 'android-studio': 'mobile', espresso: 'mobile', rest: 'api', jdbc: 'api', jmeter: 'load' };
  const toolForKind = { web: 'playwright', selenium: 'selenium', mobile: 'appium', 'mobile-ios': 'appium-ios', espresso: 'espresso', api: 'rest', 'api-negative': 'rest', patch: 'rest', 'payment-api': 'rest', sql: 'jdbc', 'sql-negative': 'jdbc', load: 'jmeter' };
  const projectScenarios = {
    web: [{ kind: 'web', label: 'Playwright', stack: 'TypeScript · Playwright' }, { kind: 'selenium', label: 'Selenium · Java', stack: 'Java · Selenium WebDriver · JUnit / TestNG' }],
    mobile: [{ kind: 'mobile', label: 'Appium · Android', stack: 'Java · Appium · UiAutomator2' }, { kind: 'mobile-ios', label: 'Appium · iOS', stack: 'Java · Appium · XCUITest' }, { kind: 'espresso', label: 'Espresso · Android', stack: 'Android Studio · Kotlin · Espresso' }],
    api: [{ kind: 'api', label: 'GET товара', stack: 'Java · REST Assured · JUnit / TestNG' }, { kind: 'api-negative', label: 'GET → 404', stack: 'Java · REST Assured · JUnit / TestNG' }, { kind: 'patch', label: 'PATCH товара', stack: 'Java · REST Assured · JUnit / TestNG' }, { kind: 'payment-api', label: 'Оплата', stack: 'Java · REST Assured · JUnit / TestNG' }, { kind: 'sql', label: 'SQL: есть строка', stack: 'Java · JDBC · PostgreSQL' }, { kind: 'sql-negative', label: 'SQL: 0 строк', stack: 'Java · JDBC · PostgreSQL' }],
    load: [{ kind: 'load', label: 'Нагрузка', stack: 'Java · JMeter · Groovy · Stepping Thread Group' }]
  };
  const testLinks = [
    { id: 'web:client', d: 'M 465 409 C 550 425, 620 480, 640 551' },
    { id: 'mobile:mobile', d: 'M 465 904 C 550 900, 620 860, 670 826' },
    { id: 'api:balancer', d: 'M 1100 947 C 1030 840, 1060 680, 1170 621' },
    { id: 'api:app-a', d: 'M 1195 947 C 1410 950, 1510 710, 1660 456', note: 'Прямой вход API-тестов к серверу A при отключённом балансировщике' },
    { id: 'load:balancer', d: 'M 1315 947 C 1230 850, 1200 730, 1230 650' },
    { id: 'load:app-a', d: 'M 1400 947 C 1510 825, 1490 505, 1660 456', note: 'Резервный прямой вход JMeter к серверу A при недоступном балансировщике' },
    { id: 'api:database', d: 'M 1195 947 C 1510 1080, 2400 1080, 2510 651', note: 'JDBC-проверка напрямую читает тестовую PostgreSQL, минуя HTTP-вход' }
  ];
  const layer = document.getElementById('course-test-tools');
  if (layer) {
    layer.innerHTML = `<svg class="course-test-tools__links" viewBox="0 0 3100 1100" aria-hidden="true">${testLinks.map(link => `<path data-test-route="${link.id}" d="${link.d}">${link.note ? `<title>${link.note}</title>` : ''}</path>`).join('')}</svg>${projects.map(project => `<button class="course-test-tool" data-test-project="${project.id}" style="left:${project.x}px;top:${project.y}px;width:${project.width}px" type="button" aria-label="${project.title}: ${project.detail}; стек: ${project.marks.map(group => group.join(', ')).join(' или ')}"><span class="course-test-tool__stack" aria-hidden="true">${project.marks.map(group => `<span class="course-test-tool__group">${group.map(techIcon).join('')}</span>`).join('')}</span><strong>${project.title}</strong><small>${project.detail}</small></button>`).join('')}`;
  }
  if (document.body.dataset.chapter !== '4') return;

  const KEY = 'qatodev_course_autotests_v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : ms));
  const icons = {
    client: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    balancer: '<path d="M12 3v18M5 7h14M4 7l-2 5h6l-2-5m12 0-2 5h6l-2-5M2 12c0 2 6 2 6 0m8 0c0 2 6 2 6 0M8 21h8"/>',
    server: '<rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    auth: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    catalog: '<path d="M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5"/>',
    payment: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    mock: '<path d="M5 4h14v16H5zM8 8h8m-8 4h5m-5 4h8"/><path d="m15 12 2 2 3-3"/>',
    keycloak: '<path d="M12 3 4 7v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7z"/><path d="m9 12 2 2 4-4"/>',
  };
  const nodes = [
    { id: 'client', title: 'Браузер · тестовый клиент', icon: 'client', x: 640, y: 460, width: 292 },
    { id: 'mobile', title: 'Android / iOS · тестовый клиент', icon: 'mobile', x: 640, y: 735, width: 292 },
    { id: 'balancer', title: 'Балансировщик', icon: 'balancer', x: 1170, y: 530, width: 292 },
    { id: 'app-a', title: 'Сервер приложения A', icon: 'server', x: 1660, y: 365, width: 292 },
    { id: 'app-b', title: 'Сервер приложения B', icon: 'server', x: 1660, y: 735, width: 292 },
    { id: 'svc-auth', title: 'Авторизация', icon: 'auth', x: 2095, y: 355, width: 188 },
    { id: 'svc-catalog', title: 'Каталог товаров', icon: 'catalog', x: 2095, y: 545, width: 188 },
    { id: 'svc-payment', title: 'Оплата', icon: 'payment', x: 2095, y: 735, width: 188 },
    { id: 'database', title: 'PostgreSQL', icon: 'database', x: 2510, y: 560, width: 292 },
    { id: 'ext-keycloak', title: 'Keycloak', icon: 'keycloak', x: 2480, y: 255, width: 160 },
    { id: 'ext-gateway', title: 'WireMock · оплата', icon: 'mock', x: 2480, y: 830, width: 170 }
  ];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = [['client', 'balancer'], ['mobile', 'balancer'], ['client', 'app-a'], ['mobile', 'app-a'], ['balancer', 'app-a'], ['balancer', 'app-b'], ['app-a', 'svc-auth'], ['app-a', 'svc-catalog'], ['app-a', 'svc-payment'], ['app-b', 'svc-auth'], ['app-b', 'svc-catalog'], ['app-b', 'svc-payment'], ['svc-catalog', 'database'], ['svc-auth', 'ext-keycloak'], ['svc-payment', 'ext-gateway']];
  const descriptions = {
    client: ['Браузер · тестовый клиент', 'Playwright или Selenium управляет браузером и проверяет UI. Страница делает реальные для учебной модели HTTP-запросы к тестовому стенду; это не production.'],
    mobile: ['Android / iOS · тестовый клиент', 'Appium проверяет Android через UiAutomator2 и iOS через XCUITest. Espresso работает только с Android. Здесь прогоны Appium написаны на Java.'],
    balancer: ['Балансировщик · test', 'Когда он доступен, HTTP-запросы идут через него. При отключении браузерный, мобильный и API-тестовый клиенты переходят на прямой адрес сервера A. JMeter тоже использует прямой вход.'],
    'app-a': ['Сервер A · test', 'В этой учебной конфигурации A также работает как прокси для нагрузки: принимает поток и передаёт часть на B по связи с галочкой. Это настроенный механизм, а не автоматическое свойство сервера.'],
    'app-b': ['Сервер B · test', 'При нагрузочном прогоне A передаёт B половину запросов. Если передача отключена или B недоступен, A ограничен 600 запросами за прогон.'],
    'svc-auth': ['Авторизация · test', 'Обрабатывает вход тестового пользователя и обращается к Keycloak за новым токеном. Если сервис отключён, Web UI и Mobile UI получают 503 до загрузки каталога.'],
    'svc-catalog': ['Каталог · test', 'Возвращает товары через API и читает тестовую PostgreSQL. API-проверка подтверждает HTTP и тело, а SQL-проверка отдельно подтверждает сохранённую строку.'],
    'svc-payment': ['Оплата · test', 'Отправляет HTTP-запрос в WireMock, который на тестовом стенде подменяет внешний платёжный API. UI-проверка проверяет итоговое состояние, а API-проверка — код и тело ответа; настоящего списания нет.'],
    database: ['PostgreSQL · test', 'Только тестовая база. Меняй таблицу SQL-командами и затем сравни ответ GET с JDBC SELECT. DELETE создаёт отрицательный сценарий с HTTP 404.'],
    'ext-keycloak': ['Keycloak · test', 'В учебном сценарии выдаёт новый токен для входа через Web UI и Mobile UI. При отключении новый вход не проходит; отдельная API-проверка использует заранее выданный тестовый токен.'],
    'ext-gateway': ['WireMock · оплата', 'WireMock на тестовом стенде имитирует внешний HTTP API оплаты. Стаб сопоставляет POST /gateway/payments и возвращает заданный HTTP-статус и JSON без обращения к банку. Переключи ответ с 200 на 503, чтобы проверить обработку отказа оплаты.'],
    'project-web': ['Web UI · проект', 'Один проект браузерных автотестов с двумя вариантами стека: TypeScript + Playwright или Java + Selenium WebDriver.'],
    'project-mobile': ['Mobile UI · проект', 'Appium с Java проверяет Android через UiAutomator2 и iOS через XCUITest. Kotlin + Espresso — отдельный Android-вариант.'],
    'project-api': ['API + SQL · проект', 'Java + REST Assured проверяет HTTP API. JDBC отдельно читает тестовую PostgreSQL после изменения данных.'],
    'project-load': ['Нагрузка · проект', 'JMeter поднимает 50 или 100 пользователей по 10 запросов. В этом тестовом стенде A настроен передавать половину потока B; порог каждой копии — 600. При отказе балансировщика браузерные, мобильные, API- и нагрузочные тесты используют прямой адрес A.']
  };
  const tasks = [
    { id: 'web', title: 'Web UI: покупка в браузере', steps: [['project-web', 'Выбери Playwright и запусти вход → каталог → WireMock.', 'Запустить Web UI'], ['client', 'Проследи путь браузер → балансировщик → сервисы.', 'Открыть клиент'], ['ext-gateway', 'Проверь ответ мока оплаты и итоговый 200.', 'Открыть WireMock']] },
    { id: 'selenium', title: 'Тот же Web UI через Selenium', steps: [['project-web', 'Переключи стек проекта на Java + Selenium WebDriver + JUnit и запусти сценарий.', 'Запустить Web UI'], ['client', 'Сравни маршрут с Playwright: браузер и тестовый стенд те же.', 'Открыть клиент']] },
    { id: 'mobile', title: 'Нативный UI на Android', steps: [['project-mobile', 'Выбери Appium · Android и запусти пользовательский сценарий.', 'Запустить Mobile UI'], ['mobile', 'Сравни маршрут с браузером: клиент другой, тестовый API тот же.', 'Открыть Android']] },
    { id: 'mobile-ios', title: 'Тот же сценарий на iOS', steps: [['project-mobile', 'Выбери Appium · iOS: Java-тест создаст XCUITest-сессию.', 'Запустить Mobile UI'], ['mobile', 'Сравни путь iPhone с Android: платформа другая, API и тестовый стенд те же.', 'Открыть iOS']] },
    { id: 'espresso', title: 'Android UI через Espresso', steps: [['project-mobile', 'Переключи стек на Android Studio + Espresso и запусти проверку.', 'Запустить Android UI'], ['mobile', 'Проверь, что HTTP-путь совпадает с Appium-сценарием.', 'Открыть Android']] },
    { id: 'payment', title: 'Сбой мока оплаты', steps: [['ext-gateway', 'Настрой в WireMock ответ 503 для POST /gateway/payments.', 'Вернуть 503'], ['project-api', 'В проекте API выбери оплату: POST /payments вернёт 503.', 'Проверить оплату'], ['project-web', 'Повтори Web UI-сценарий и найди тот же сбой.', 'Запустить Web UI'], ['ext-gateway', 'Верни стаб 200 и повтори сценарий.', 'Вернуть 200']] },
    { id: 'api-sql', title: 'API + SQL: обновлён ли товар', steps: [['project-api', 'Выбери PATCH и измени товар через API.', 'Изменить товар'], ['project-api', 'Переключи на GET и проверь JSON.', 'Запустить API'], ['project-api', 'Переключи на SQL-проверку и сравни сохранённое имя с API.', 'Проверить SQL']] },
    { id: 'load-1000', title: 'Нагрузка: 1000 запросов и отказ A', steps: [['project-load', 'Выбери 1000 запросов: A передаст B половину потока, по 500 на копию.', 'Запустить 1000'], ['app-a', 'Отключи A: балансировщик отправит все 1000 на B, который выдерживает 600.', 'Отключить'], ['project-load', 'Повтори прогон: ожидаются 600 × 200 и 400 × 503.', 'Запустить 1000'], ['app-a', 'Включи A и повтори нагрузку.', 'Включить']] },
    { id: 'db-negative', title: 'Негативный API-тест: товара нет', steps: [['database', 'Выполни DELETE FROM products WHERE id = 42; и посмотри таблицу.', 'Выполнить SQL'], ['project-api', 'GET с ожиданием 200 должен упасть: сервис вернёт 404.', 'Проверить GET'], ['project-api', 'Выбери GET → 404: отрицательная проверка должна пройти.', 'Проверить 404'], ['database', "Верни товар командой INSERT INTO products (id, name, price, currency) VALUES (42, 'Ноутбук QA Book', 79990, 'RUB');", 'Выполнить SQL']] },
    { id: 'db-update', title: 'SQL-изменение и проверка данных', steps: [['database', "Выполни UPDATE products SET name = 'QA Book Pro' WHERE id = 42;", 'Выполнить SQL'], ['project-api', 'Запусти GET: новое имя должно прийти в JSON.', 'Проверить GET'], ['project-api', 'Запусти JDBC SELECT: сравни сохранённое значение.', 'Проверить SQL']] },
    { id: 'db-empty', title: 'Пустая таблица и восстановление', steps: [['database', 'Выполни DELETE FROM products; — удалятся все пять строк.', 'Выполнить SQL'], ['project-api', 'Запусти GET → 404 и SQL: 0 строк.', 'Проверить данные'], ['database', "Верни товар 42: INSERT INTO products (id, name, price, currency) VALUES (42, 'Ноутбук QA Book', 79990, 'RUB'); Остальные четыре готовые команды INSERT раскрой в PostgreSQL.", 'Выполнить SQL']] },
    { id: 'db-offline', title: 'PostgreSQL недоступна', steps: [['database', 'Отключи тестовую базу.', 'Отключить'], ['project-api', 'GET вернёт 503, а JDBC-проверка не установит соединение.', 'Проверить GET и SQL'], ['database', 'Включи базу и повтори проверки.', 'Включить']] },
    { id: 'balancer', title: 'Резервный вход при отказе балансировщика', steps: [['balancer', 'Отключи общую точку входа.', 'Отключить'], ['project-web', 'Запусти Web UI: браузер направит запросы прямо на A.', 'Запустить Web UI'], ['project-mobile', 'Запусти Android или iOS: мобильный клиент тоже обойдёт балансировщик.', 'Запустить Mobile UI'], ['project-api', 'Запусти GET: API-тест дойдёт до A напрямую и получит товар.', 'Проверить GET'], ['project-load', 'Отправь 1000 запросов через прямой тестовый адрес A. A передаст половину на B: ожидаются 1000 × 200.', 'Запустить 1000'], ['balancer', 'Включи общую точку входа.', 'Включить']] },
    { id: 'peer-forward', title: 'Передача нагрузки с A на B', steps: [['app-a', 'Открой A и отключи «Передачу на B».', 'Отключить передачу'], ['project-load', 'Запусти 1000 запросов: A обработает 600, ещё 400 получат 503.', 'Запустить 1000'], ['app-a', 'Верни передачу на B.', 'Включить передачу'], ['project-load', 'Повтори прогон: зелёная волна A → B покажет распределение 500/500.', 'Запустить 1000']] },
    { id: 'server-b', title: 'Нагрузка после отказа B', steps: [['project-load', 'Выбери 1000 запросов.', 'Выбрать 1000'], ['app-b', 'Отключи B и направь весь поток на A.', 'Отключить'], ['project-load', 'Запусти прогон и сравни ошибки с двумя доступными копиями.', 'Запустить 1000'], ['app-b', 'Включи B.', 'Включить']] },
    { id: 'auth', title: 'Вход зависит от авторизации', steps: [['svc-auth', 'Отключи сервис авторизации.', 'Отключить'], ['project-web', 'Запусти Web UI: вход остановится до каталога с 503.', 'Запустить Web UI'], ['svc-auth', 'Включи авторизацию и повтори проверку.', 'Включить']] },
    { id: 'keycloak', title: 'Keycloak и уже выданный токен', steps: [['ext-keycloak', 'Отключи Keycloak: новый вход станет недоступен.', 'Отключить'], ['project-mobile', 'Запусти Mobile UI и проверь новый вход.', 'Запустить Mobile UI'], ['project-api', 'Выбери GET с заранее выданным тестовым токеном.', 'Проверить GET API'], ['ext-keycloak', 'Включи Keycloak и повтори вход.', 'Включить']] }
  ];
  const defaultProducts = () => [
    { id: 42, name: 'Ноутбук QA Book', price: 79990, currency: 'RUB' },
    { id: 43, name: 'Смартфон Pixel QA', price: 52990, currency: 'RUB' },
    { id: 44, name: 'Наушники Studio', price: 12990, currency: 'RUB' },
    { id: 45, name: 'Монитор View 27', price: 34990, currency: 'RUB' },
    { id: 46, name: 'Клавиатура Type', price: 6990, currency: 'RUB' }
  ];
  const initial = () => ({ online: { balancer: true, a: true, b: true, peer: true, auth: true, keycloak: true, catalog: true, database: true }, paymentStubStatus: 200, products: defaultProducts(), catalogVersion: 2, sqlDraft: '', sqlFeedback: '', sqlChanged: false, sqlApiVerified: false, sawDbGetFailure: false, sawPeerOverload: false, taskProgress: {}, loadCount: 500, lastRun: null, selectedStep: '', article: '', codeTab: 'code', projectScenario: { web: 'web', mobile: 'mobile', api: 'api', load: 'load' }, journalOpen: false, expandedTask: '', completed: [], camera: null, sawPaymentFailure: false, sawLoadFailure: false, sawLoad1000Failure: false, sawAuthWebFailure: false, sawKeycloakMobileFailure: false, apiAfterKeycloakFailure: false, apiChanged: false, apiVerified: false });
  const codeExamples = {
    'tool-playwright': { language: 'TypeScript · Playwright', code: ["test('покупка в браузере', async ({ page }) => {", '  await page.goto(TEST_URL);', "  await page.getByRole('button', { name: 'Войти' }).click();", "  await expect(page.getByText('Каталог')).toBeVisible();", "  await page.getByRole('button', { name: 'Оплатить' }).click();", "  await expect(page.getByText('Заказ оплачен')).toBeVisible();", '});'], lines: { runner: 2, client: 2, auth: 3, identity: 3, catalog: 4, db: 4, payment: 5, gateway: 5, bank: 6, assert: 6 }, checks: ['Вход открыл каталог', 'Кнопка оплаты доступна', 'Итоговый статус виден в UI'] },
    'tool-selenium': { language: 'Java · Selenium + JUnit', code: ['@Test void purchase() {', '  driver.get(TEST_URL);', '  driver.findElement(By.id("login")).click();', '  assertTrue(driver.findElement(By.id("catalog")).isDisplayed());', '  driver.findElement(By.id("pay")).click();', '  var status = driver.findElement(By.id("status"));', '  assertEquals("Заказ оплачен", status.getText());', '}'], lines: { prepare: 1, runner: 2, client: 2, auth: 3, identity: 3, catalog: 4, db: 4, payment: 5, gateway: 5, bank: 7, assert: 7 }, checks: ['Вход через WebDriver', 'Каталог отображается', 'JUnit сравнивает итоговый статус'] },
    'tool-appium': { language: 'Java · Appium', code: ['@Test void mobilePurchase() {', '  var login = AppiumBy.accessibilityId("Войти");', '  driver.findElement(login).click();', '  var catalog = AppiumBy.accessibilityId("Каталог");', '  assertTrue(driver.findElement(catalog).isDisplayed());', '  var pay = AppiumBy.accessibilityId("Оплатить");', '  driver.findElement(pay).click();', '  var status = AppiumBy.accessibilityId("Статус заказа");', '  assertEquals("Заказ оплачен",', '    driver.findElement(status).getText());', '}'], lines: { runner: 3, client: 3, auth: 3, identity: 3, catalog: 5, db: 5, payment: 7, gateway: 7, bank: 10, assert: 10 }, checks: ['Нативный экран входа', 'Нативный каталог', 'Статус заказа в приложении'] },
    'tool-appium-ios': { language: 'Java · Appium + XCUITest', code: ['@Test void iosPurchase() {', '  var options = new XCUITestOptions();', '  var driver = new IOSDriver(APPIUM_URL, options);', '  driver.findElement(AppiumBy.accessibilityId("Войти")).click();', '  assertTrue(driver.findElement(', '    AppiumBy.accessibilityId("Каталог")).isDisplayed());', '  driver.findElement(AppiumBy.accessibilityId("Оплатить")).click();', '  assertEquals("Заказ оплачен", driver.findElement(', '    AppiumBy.accessibilityId("Статус заказа")).getText());', '}'], lines: { runner: 3, client: 3, auth: 4, identity: 4, catalog: 6, db: 6, payment: 7, gateway: 7, bank: 9, assert: 9 }, checks: ['Appium создаёт сессию XCUITest для iOS', 'Доступность каталога проверяется на iPhone', 'Статус оплаты проверяется в нативном UI'] },
    'tool-espresso': { language: 'Kotlin · Espresso', code: ['@Test fun mobilePurchase() {', '  onView(withId(R.id.login)).perform(click())', '  val catalog = withId(R.id.catalog)', '  onView(catalog).check(matches(isDisplayed()))', '  onView(withId(R.id.pay)).perform(click())', '  val status = withText("Заказ оплачен")', '  onView(status).check(matches(isDisplayed()))', '}'], lines: { runner: 2, client: 2, auth: 2, identity: 2, catalog: 4, db: 4, payment: 5, gateway: 5, bank: 7, assert: 7 }, checks: ['Экран входа Android', 'Каталог в приложении', 'Видимый статус оплаты'] },
    'tool-rest': { language: 'Java · REST Assured', code: ['@Test void productApi() {', '  given().baseUri(TEST_URL)', '    .auth().oauth2(TEST_TOKEN)', '    .get("/api/products/42")', '    .then().statusCode(200)', '    .body("id", equalTo(42));', '}'], lines: { runner: 2, route: 4, catalog: 4, db: 6, payment: 4, gateway: 5, assert: 5 }, checks: ['HTTP-статус соответствует сценарию', 'Тело ответа содержит нужный товар', 'Браузер не участвует'] },
    'tool-jdbc': { language: 'SQL · PostgreSQL', code: ['SELECT name', 'FROM products', 'WHERE id = 42;'], lines: { connect: 1, assert: 3 }, checks: ['SELECT выполняется в тестовой БД', 'Сохранённое имя совпадает с ответом API'] },
    'tool-jmeter': { language: 'JMeter .jmx · JSR223 Groovy', code: ['Stepping Thread Group: 50 users', '  +10 users every 5 s', 'Loop Controller: 10 iterations', 'HTTP Request: GET /api/products/42', 'JSR223 Assertion (Groovy):', '  def code = prev.getResponseCode()', "  if (code != '200') {", '    AssertionResult.setFailure(true)', '    AssertionResult.setFailureMessage("HTTP " + code)', '  }'], lines: { runner: 1, route: 4, catalog: 4, 'peer-forward': 4, 'catalog-b': 4, db: 4, response: 6, assert: 7 }, checks: ['Плагин Stepping Thread Group: +10 пользователей каждые 5 секунд до 50', 'Loop Controller: 10 циклов на пользователя, всего 500 запросов', 'Groovy-проверка помечает HTTP 503 как ошибку', 'Сравнение ответов при одной и двух копиях сервера'] }
  };
  const runExamples = {
    'api-negative': { language: 'Java · REST Assured', code: ['@Test void missingProduct() {', '  given().baseUri(TEST_URL)', '    .auth().oauth2(TEST_TOKEN)', '    .get("/api/products/42")', '    .then().statusCode(404)', '    .body("error", equalTo("not_found"));', '}'], lines: { runner: 2, route: 4, catalog: 4, db: 4, response: 5, assert: 5 }, checks: ['Удалённый товар возвращает HTTP 404', 'Ошибка not_found проверяется в JSON'] },
    'sql-negative': { language: 'Java · JDBC + PostgreSQL', code: ['var rows = statement.executeQuery(', '  "SELECT name FROM products WHERE id = 42");', 'assertFalse(rows.next());'], lines: { connect: 2, assert: 3 }, checks: ['SELECT вернул 0 строк', 'JDBC-проверка отсутствия товара прошла'] },
    'payment-api': { language: 'Java · REST Assured', code: ['@Test void paymentApi() {', '  given().baseUri(TEST_URL)', '    .auth().oauth2(TEST_TOKEN)', '    .post("/payments")', '    .then().statusCode(200)', '    .body("status", equalTo("paid"));', '}'], lines: { runner: 2, route: 4, payment: 4, gateway: 4, bank: 6, response: 5, assert: 6 } },
    patch: { language: 'Java · REST Assured', code: ['@Test void updateProduct() {', '  given().baseUri(TEST_URL)', '    .auth().oauth2(TEST_TOKEN)', '    .body("{\\"name\\":\\"Ноутбук QA Book · обновлён\\"}")', '    .patch("/api/products/42")', '    .then().statusCode(200);', '}'], lines: { runner: 2, route: 5, catalog: 5, db: 5, response: 6, assert: 6 } }
  };
  function exampleForRun(run) {
    if (!run) return null;
    if (run.kind === 'load') {
      const count = run.loadCount || state.loadCount;
      const users = count / 10;
      const original = codeExamples['tool-jmeter'];
      return { ...original, code: original.code.map(line => line.replace('50 users', `${users} users`)), checks: [`Плагин Stepping Thread Group: +10 пользователей каждые 5 секунд до ${users}`, `Loop Controller: 10 циклов на пользователя, всего ${count} запросов`, ...original.checks.slice(2)] };
    }
    if (runExamples[run.kind]) return runExamples[run.kind];
    return codeExamples[`tool-${run.tool}`] || null;
  }
  function lineForStep(example, item) {
    if (!example || !item) return 0;
    const key = item.id.replace(/^(catalog|payment)-(?:client|route)$/, '$1');
    return example.lines[key] || (key === 'response' ? example.lines.assert : 0) || 0;
  }
  function sourceLines(example, currentLine) {
    return example.code.map((line, index) => `<span class="course-test-code__line ${currentLine === index + 1 ? 'is-current' : ''}"><span class="course-test-code__number">${index + 1}</span><span>${highlightLine(line)}</span></span>`).join('');
  }
  function highlightLine(line) {
    const tokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\b(?:await|async|test|fun|void|var|val|const|def|if|true|false|SELECT|FROM|WHERE|given|then|return|new)\b|\b\d+\b|@[A-Za-z]+|\b[A-Za-z_$][\w$]*(?=\())/g;
    let html = '';
    let cursor = 0;
    for (const match of line.matchAll(tokens)) {
      html += esc(line.slice(cursor, match.index));
      const value = match[0];
      const kind = /^["']/.test(value) ? 'string' : /^\d/.test(value) ? 'numeric' : value.startsWith('//') ? 'comment' : /^(?:await|async|test|fun|void|var|val|const|def|if|true|false|SELECT|FROM|WHERE|return|new|@)/.test(value) ? 'keyword' : 'call';
      html += `<span class="course-test-code__${kind}">${esc(value)}</span>`;
      cursor = match.index + value.length;
    }
    return html + esc(line.slice(cursor));
  }
  let state = initial();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      state = { ...state, ...saved, online: { ...state.online, ...saved.online }, projectScenario: { ...state.projectScenario, ...saved.projectScenario } };
      if (saved.paymentStubStatus === undefined && saved.online?.gateway === false) state.paymentStubStatus = 503;
      if (!Array.isArray(saved.products)) state.products[0].name = saved.productName || state.products[0].name;
      else if (saved.catalogVersion !== 2 && saved.products.length) {
        for (const row of defaultProducts().slice(2)) if (!state.products.some(item => item.id === row.id)) state.products.push(row);
        state.products.sort((a, b) => a.id - b.id);
      }
      state.catalogVersion = 2;
      delete state.online.gateway;
    }
  } catch {}
  if (![200, 503].includes(state.paymentStubStatus)) state.paymentStubStatus = 200;
  if (!state.taskProgress || typeof state.taskProgress !== 'object') state.taskProgress = {};
  if (!Array.isArray(state.products)) state.products = defaultProducts();
  state.products = state.products.filter(row => Number.isInteger(row.id) && row.id > 0 && row.id <= 9999 && typeof row.name === 'string' && Number.isFinite(row.price) && row.currency === 'RUB').slice(0, 17);
  if (![500, 1000].includes(state.loadCount)) state.loadCount = 500;
  const productById = id => state.products.find(row => row.id === id);
  if (state.article?.startsWith('tool-')) state.article = `project-${projectForTool[state.article.slice(5)] || 'web'}`;
  for (const project of projects) if (!projectScenarios[project.id].some(option => option.kind === state.projectScenario[project.id])) state.projectScenario[project.id] = projectScenarios[project.id][0].kind;
  if (!descriptions[state.article] && state.article !== 'tasks') state.article = '';
  const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
  const viewport = $('#course-scroller');
  const canvas = $('#course-canvas');
  const nodeHost = $('#course-nodes');
  const lineHost = $('#course-lines');
  const packetHost = $('#course-packets');
  const article = $('#course-article');
  const journal = $('#course-network-panel');
  const intro = $('.course-intro');
  const play = $('#course-play');
  const reset = $('#course-reset');
  let motion;
  let busy = false;
  let runId = 0;
  let saveTimer = 0;
  let replayId = 0;
  let replayCleanup = () => {};
  let selectedRouteCleanup = () => {};
  let reviewingStep = false;

  intro.querySelector('.course-eyebrow').textContent = 'Вводный курс · глава 04';
  intro.querySelector('h1').textContent = 'Автотесты и нагрузка';
  const launchScenarios = [['web', 'Web UI'], ['mobile', 'Mobile UI'], ['api', 'API + SQL'], ['load', 'Нагрузка']];
  const launcher = document.createElement('div');
  launcher.className = 'course-test-launches';
  launcher.setAttribute('role', 'group');
  launcher.setAttribute('aria-label', 'Запустить проверку');
  launcher.innerHTML = launchScenarios.map(([project, label]) => `<button type="button" data-test-project="${project}" title="Запустить выбранный сценарий · ${esc(label)}" aria-label="Запустить выбранный сценарий · ${esc(label)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5 12 8l-7 4.5z"/></svg><span>${esc(label)}</span></button>`).join('');
  play.hidden = true;
  intro.append(launcher);
  viewport.setAttribute('aria-label', 'Автотесты на тестовом стенде');
  journal.setAttribute('aria-label', 'Журнал автотестов');
  lineHost.setAttribute('viewBox', '0 0 3100 1100');

  function save() {
    state.completed = [...completed];
    state.journalOpen = !journal.hidden;
    syncButtons();
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, camera: motion?.snapshot() || state.camera })); } catch {}
  }
  const point = (id, side) => {
    const node = byId.get(id);
    return { x: node.x + (side === 'right' ? node.width : 0), y: node.y + (id.startsWith('svc-') ? 62 : id.startsWith('ext-') ? 48 : 91) };
  };
  function drawMap() {
    lineHost.replaceChildren();
    for (const [from, to] of edges) {
      const a = point(from, 'right');
      const b = point(to, 'left');
      const bend = Math.max(35, Math.abs(b.x - a.x) * .42);
      const directUi = to === 'app-a' && (from === 'client' || from === 'mobile');
      const mid = (a.x + b.x) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', directUi
        ? `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`
        : `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`);
      path.dataset.testRoute = `${from}:${to}`;
      path.classList.add('course-test-route');
      if (directUi) path.classList.add('is-direct');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      label.textContent = `${byId.get(from).title} → ${byId.get(to).title}`;
      path.append(label);
      lineHost.append(path);
    }
    const peer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    peer.classList.add('course-micro-peer-link');
    peer.innerHTML = '<path class="course-micro-peer-link__line course-test-route" data-test-route="app-a:app-b" d="M 1926 487 L 1926 791"/><circle cx="1926" cy="639" r="12"/><path class="course-micro-peer-link__check" d="m 1921 639 3 3 7 -7"/>';
    lineHost.append(peer);
    for (const node of nodes) {
      const element = document.createElement('div');
      element.className = 'questions-map-card course-node is-visible';
      element.dataset.node = node.id;
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      element.innerHTML = `<span class="course-node__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[node.icon]}</svg></span><button class="questions-map-card__question" type="button"><span class="course-node__title">${esc(node.title)}</span></button>${['ext-keycloak', 'database', 'ext-gateway'].includes(node.id) ? '<span class="course-test-badge" aria-hidden="true">TEST</span>' : ''}`;
      element.querySelector('button').addEventListener('click', () => showArticle(node.id));
      nodeHost.append(element);
    }
    refreshMap();
  }
  function refreshMap() {
    for (const card of nodeHost.querySelectorAll('[data-node]')) {
      const id = card.dataset.node;
      card.classList.toggle('is-selected', state.article === id);
      const offline = id === 'balancer' ? !state.online.balancer : id === 'app-a' ? !state.online.a : id === 'app-b' ? !state.online.b : id === 'svc-auth' ? !state.online.auth : id === 'svc-catalog' ? !state.online.catalog : id === 'database' ? !state.online.database : id === 'ext-keycloak' ? !state.online.keycloak : false;
      card.classList.toggle('is-removed', id === 'balancer' && offline);
      card.classList.toggle('is-faulty', (offline && id !== 'balancer') || (id === 'ext-gateway' && state.paymentStubStatus === 503));
      card.dataset.offline = String(offline);
    }
    layer.querySelectorAll('[data-test-project]').forEach(card => card.classList.toggle('is-selected', state.article === `project-${card.dataset.testProject}`));
    lineHost.querySelectorAll('[data-test-route]').forEach(path => {
      const [from, to] = path.dataset.testRoute.split(':');
      const directUi = path.classList.contains('is-direct');
      const forwardedLoad = state.lastRun?.kind === 'load' && state.online.peer && state.online.a;
      const hidden = (directUi && state.online.balancer) || (!state.online.balancer && (from === 'balancer' || to === 'balancer')) || (from === 'app-a' && !state.online.a) || (from === 'app-b' && (!state.online.b || (state.online.a && !forwardedLoad))) || (to === 'app-a' && !state.online.a && !directUi) || (to === 'app-b' && (!state.online.b || (from === 'balancer' && state.online.a))) || (from === 'app-a' && to === 'app-b' && !state.online.peer);
      path.classList.toggle('is-standby', hidden);
      path.classList.toggle('is-faulty', (directUi && !state.online.a) || ((from === 'balancer' || to === 'balancer') && !state.online.balancer) || (to === 'svc-auth' && !state.online.auth) || (to === 'ext-keycloak' && !state.online.keycloak) || (to === 'svc-catalog' && !state.online.catalog) || (to === 'database' && !state.online.database) || (to === 'ext-gateway' && state.paymentStubStatus === 503));
    });
    layer.querySelector('[data-test-route="load:balancer"]')?.classList.toggle('is-standby', !state.online.balancer);
    layer.querySelector('[data-test-route="load:app-a"]')?.classList.toggle('is-standby', state.online.balancer || !state.online.a);
    layer.querySelector('[data-test-route="api:balancer"]')?.classList.toggle('is-standby', !state.online.balancer);
    layer.querySelector('[data-test-route="api:app-a"]')?.classList.toggle('is-standby', state.online.balancer);
    layer.querySelector('[data-test-route="api:app-a"]')?.classList.toggle('is-faulty', !state.online.a);
    lineHost.querySelector('.course-micro-peer-link')?.classList.toggle('is-disabled', !state.online.peer || !state.online.a || !state.online.b);
  }
  function syncButtons() {
    play.disabled = busy;
    const original = defaultProducts();
    const changedProducts = state.products.length !== original.length || state.products.some((row, index) => ['id', 'name', 'price', 'currency'].some(key => row[key] !== original[index]?.[key]));
    reset.disabled = busy || !(state.lastRun || completed.size || changedProducts || state.paymentStubStatus !== 200 || state.loadCount !== 500 || Object.values(state.online).some(value => !value) || Object.entries(state.projectScenario).some(([project, kind]) => kind !== projectScenarios[project][0].kind) || state.sqlDraft || state.sqlFeedback);
    launcher.querySelectorAll('[data-test-project]').forEach(button => { button.disabled = busy; button.classList.toggle('is-running', busy && projectForKind[state.lastRun?.kind] === button.dataset.testProject); });
    article.querySelectorAll('#course-action-buttons button, [data-project-scenario]').forEach(button => { button.disabled = busy; });
  }
  const actionIcon = {
    run: '<path d="M8 5v14l11-7z"/>',
    power: '<path d="M12 2v10M6.2 5.4a9 9 0 1 0 11.6 0"/>',
    edit: '<path d="m4 17 12-12 3 3L7 20H4zM14 7l3 3"/>',
    response: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>'
  };
  const taskIcons = {
    'project-web': icons.client,
    'project-mobile': icons.mobile,
    'project-api': '<path d="M3 7h12m0 0-3-3m3 3-3 3M21 17H9m0 0 3-3m-3 3 3 3"/>',
    'project-load': '<path d="M4 18a8 8 0 1 1 16 0M12 18l4-6M8 18h8"/>'
  };
  function addAction(label, icon, handler, destructive = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = busy;
    button.classList.toggle('is-destructive', destructive);
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = label;
    button.title = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    button.addEventListener('click', () => { if (!busy) handler(); });
    $('#course-action-buttons').append(button);
  }
  function applySqlCommand(raw) {
    const command = raw.trim().replace(/;\s*$/, '').replace(/\s+/g, ' ');
    if (!command) return 'Введи SQL-команду.';
    if (!state.online.database) return 'PostgreSQL отключена: SQL-запрос не выполнен.';
    const selectTwo = command.match(/^SELECT\s+id,\s*name,\s*price(?:,\s*currency)?\s+FROM\s+products\s+WHERE\s+id\s+IN\s*\(\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\)$/i);
    if (selectTwo) {
      const rows = [...new Set([Number(selectTwo[1]), Number(selectTwo[2])])].map(productById).filter(Boolean);
      return `SELECT: ${rows.length} строк · ${rows.map(row => `${row.id}: ${row.name}`).join(' · ') || 'совпадений нет'}.`;
    }
    const select = command.match(/^SELECT\s+(?:id,\s*)?name(?:,\s*price(?:,\s*currency)?)?\s+FROM\s+products\s+WHERE\s+id\s*=\s*(\d{1,4})$/i);
    if (select) {
      const row = productById(Number(select[1]));
      return row ? `SELECT: 1 строка · ${row.id} · ${row.name} · ${row.price} RUB.` : 'SELECT: 0 строк.';
    }
    const remove = command.match(/^DELETE\s+FROM\s+products\s+WHERE\s+id\s*=\s*(\d{1,4})$/i);
    if (remove) {
      const before = state.products.length;
      state.products = state.products.filter(row => row.id !== Number(remove[1]));
      return `DELETE: удалено ${before - state.products.length} строк.`;
    }
    const removeTwo = command.match(/^DELETE\s+FROM\s+products\s+WHERE\s+id\s+IN\s*\(\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\)$/i);
    if (removeTwo) {
      const ids = new Set([Number(removeTwo[1]), Number(removeTwo[2])]);
      const before = state.products.length;
      state.products = state.products.filter(row => !ids.has(row.id));
      return `DELETE: удалено ${before - state.products.length} строк.`;
    }
    if (/^DELETE\s+FROM\s+products$/i.test(command)) {
      const count = state.products.length;
      state.products = [];
      return `DELETE: удалено ${count} строк. Таблица пуста.`;
    }
    const update = command.match(/^UPDATE\s+products\s+SET\s+name\s*=\s*'([^']{1,48})'\s+WHERE\s+id\s*=\s*(\d{1,4})$/i);
    if (update) {
      const row = productById(Number(update[2]));
      if (!row) return `UPDATE: строка ${update[2]} не найдена.`;
      row.name = update[1];
      state.sqlChanged = true;
      state.sqlApiVerified = false;
      return `UPDATE: строка ${row.id} изменена.`;
    }
    const insert = command.match(/^INSERT\s+INTO\s+products\s*\(\s*id\s*,\s*name\s*,\s*price\s*,\s*currency\s*\)\s*VALUES\s*\(\s*(\d{1,4})\s*,\s*'([^']{1,48})'\s*,\s*(\d{1,7})\s*,\s*'RUB'\s*\)$/i);
    if (insert) {
      const id = Number(insert[1]);
      if (productById(id)) return `INSERT: id ${id} уже занят.`;
      if (state.products.length >= 17) return 'INSERT: максимум 17 строк в учебной модели.';
      state.products.push({ id, name: insert[2], price: Number(insert[3]), currency: 'RUB' });
      state.products.sort((a, b) => a.id - b.id);
      if (state.taskProgress.dbNegative && productById(42)) completed.add('db-negative');
      if (state.taskProgress.dbEmpty && defaultProducts().every(row => productById(row.id))) completed.add('db-empty');
      return `INSERT: строка ${id} добавлена.`;
    }
    return 'Поддержаны SELECT и DELETE по id или двум ID, DELETE всей таблицы, UPDATE имени и INSERT (id, name, price, currency).';
  }
  function renderTasks() {
    const host = $('#course-article-primary');
    const scroll = article.querySelector('.course-article__scroll');
    const oldScroll = scroll.scrollTop;
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
      heading.innerHTML = `<span class="course-task__mark">${completed.has(task.id) ? '✓' : ''}</span><strong>${esc(task.title)}</strong><span class="course-task__chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
      const panel = document.createElement('div');
      panel.className = 'course-task__panel';
      panel.innerHTML = `<div class="course-task__steps">${task.steps.map(([place, instruction, action], index) => `<div class="course-task__step"><span class="course-task__number">${index + 1}.</span><span class="course-task__place course-task__hint" tabindex="0" role="img" aria-label="${esc(descriptions[place]?.[0] || place)}" data-tooltip="${esc(descriptions[place]?.[0] || place)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${taskIcons[place] || icons[byId.get(place)?.icon] || icons.client}</svg></span><span class="course-task__copy">${esc(instruction)} <span class="course-task__action"><span class="course-task__action-icon course-task__hint" tabindex="0" role="img" aria-label="Действие · ${esc(action)}" data-tooltip="Действие · ${esc(descriptions[place]?.[0] || place)}: ${esc(action)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${/Отключить|Включить/.test(action) ? actionIcon.power : /Вернуть/.test(action) ? actionIcon.response : /Изменить/.test(action) ? actionIcon.edit : actionIcon.run}</svg></span><small>${esc(action)}</small></span></span></div>`).join('')}</div>`;
      heading.addEventListener('click', () => { state.expandedTask = state.expandedTask === task.id ? '' : task.id; renderTasks(); save(); });
      item.append(heading, panel);
      host.append(item);
    }
    scroll.scrollTop = oldScroll;
  }
  function renderCodePanel() {
    const host = $('#course-article-primary');
    const project = state.article.startsWith('project-') ? state.article.slice(8) : '';
    if (!projectScenarios[project]) return;
    const selectedKind = state.projectScenario[project];
    const run = state.lastRun;
    const relevant = run && run.kind === selectedKind && (selectedKind !== 'load' || run.loadCount === state.loadCount);
    const example = exampleForRun(relevant ? run : { kind: selectedKind, tool: toolForKind[selectedKind] });
    if (!example) return;
    const tab = ['code', 'checks', 'result'].includes(state.codeTab) ? state.codeTab : 'code';
    const current = relevant ? run.steps.find(item => item.id === state.selectedStep) || run.steps.at(-1) : null;
    const currentLine = relevant ? lineForStep(example, current) : 0;
    const status = relevant ? current?.status === 'error' ? 'Ошибка' : run.result === 'выполняется' ? 'Выполняется' : run.result === 'ошибка' ? 'Ошибка' : run.result === 'успех' ? 'Успех' : 'Ожидание' : 'Ожидание';
    const body = tab === 'code'
      ? `<div class="course-test-code__language">${esc(example.language)}<span class="course-test-code__status" data-status="${status === 'Ошибка' ? 'error' : status === 'Успех' ? 'success' : status === 'Выполняется' ? 'running' : 'idle'}">${status}</span></div><pre class="course-test-code__source"><code>${sourceLines(example, currentLine)}</code></pre>`
      : tab === 'checks'
        ? `<div class="course-test-code__checks">${(example.checks || codeExamples[`tool-${toolForKind[selectedKind]}`]?.checks || []).map(check => `<div><span aria-hidden="true">✓</span>${esc(check)}</div>`).join('')}</div>`
        : `<div class="course-test-code__result"><strong>${status}</strong><p>${esc(relevant ? current?.detail || run.result : 'Запусти выбранный сценарий, чтобы увидеть результат проекта.')}</p></div>`;
    host.innerHTML = `<div class="course-test-code"><div class="course-test-code__tabs" role="tablist" aria-label="Пример автотеста"><button type="button" role="tab" data-code-tab="code" aria-selected="${tab === 'code'}">Код</button><button type="button" role="tab" data-code-tab="checks" aria-selected="${tab === 'checks'}">Проверки</button><button type="button" role="tab" data-code-tab="result" aria-selected="${tab === 'result'}">Результат</button></div><div class="course-test-code__body" role="tabpanel">${body}</div></div>`;
    host.querySelectorAll('[data-code-tab]').forEach(button => button.addEventListener('click', () => { state.codeTab = button.dataset.codeTab; renderCodePanel(); save(); }));
  }
  function renderArticle() {
    if (!state.article || article.hidden) return;
    const id = state.article;
    article.dataset.article = id;
    $('#course-article-title').textContent = id === 'tasks' ? 'Задания · test' : descriptions[id][0];
    $('#course-article-kicker').textContent = '';
    $('#course-article-devtools-icon').hidden = true;
    $('#course-article-subtitle').hidden = true;
    $('#course-article-body').innerHTML = id === 'tasks' ? '' : `<p>${esc(descriptions[id][1])}</p>`;
    $('#course-action-buttons').replaceChildren();
    $('#course-article-primary').replaceChildren();
    const visual = $('#course-article-visual');
    visual.className = 'course-test-viz';
    article.querySelector('.course-article__theory').hidden = id === 'tasks';
    if (id === 'tasks') {
      visual.className = '';
      visual.replaceChildren();
      $('#course-article-actions').hidden = true;
      renderTasks();
      return;
    }
    $('#course-article-actions').hidden = false;
    if (id.startsWith('project-')) {
      const project = id.slice(8);
      const scenarios = projectScenarios[project];
      const selected = scenarios.find(option => option.kind === state.projectScenario[project]) || scenarios[0];
      addAction(`Запустить · ${project === 'load' ? `${state.loadCount} запросов` : selected.label}`, actionIcon.run, () => run(selected.kind));
      visual.innerHTML = `<div class="course-test-project__choices" role="group" aria-label="${project === 'load' ? 'Количество запросов' : 'Сценарий проекта'}">${project === 'load' ? [500, 1000].map(count => `<button type="button" data-load-count="${count}" aria-pressed="${state.loadCount === count}">${count} запросов</button>`).join('') : scenarios.map(option => `<button type="button" data-project-scenario="${option.kind}" aria-pressed="${option.kind === selected.kind}">${esc(option.label)}</button>`).join('')}</div><div class="course-test-project__stack" aria-label="Стек: ${esc(selected.stack)}">${scenarioIcons[selected.kind].map(name => name === 'JUnit' ? `<span class="course-test-project__runner-pair"><span class="course-test-project__tech">${techIcon('JUnit')}<span>JUnit</span></span><span aria-hidden="true">/</span><span class="course-test-project__tech">${techIcon('TestNG')}<span>TestNG</span></span></span>` : `<span class="course-test-project__tech">${techIcon(name)}<span>${esc(name)}</span></span>`).join('')}</div>${project === 'load' ? `<div class="course-test-project__profile"><strong>Stepping Thread Group</strong><span>+10 пользователей / 5 с → ${state.loadCount / 10} · Loop Controller ×10</span></div>` : ''}`;
      if (selected.kind === 'mobile-ios') visual.insertAdjacentHTML('beforeend', `<div class="course-test-project__note">${techIcon('Swift')}<span>SwiftAppium · сторонняя альтернатива для Swift</span></div>`);
      visual.querySelectorAll('[data-project-scenario]').forEach(button => button.addEventListener('click', () => {
        if (busy) return;
        state.projectScenario[project] = button.dataset.projectScenario;
        state.codeTab = 'code';
        renderArticle(); save();
      }));
      visual.querySelectorAll('[data-load-count]').forEach(button => button.addEventListener('click', () => { if (busy) return; state.loadCount = Number(button.dataset.loadCount); renderArticle(); save(); }));
      renderCodePanel();
      return;
    }
    if (['balancer', 'app-a', 'app-b', 'svc-auth', 'svc-catalog', 'database', 'ext-keycloak'].includes(id)) {
      const key = { balancer: 'balancer', 'app-a': 'a', 'app-b': 'b', 'svc-auth': 'auth', 'svc-catalog': 'catalog', database: 'database', 'ext-keycloak': 'keycloak' }[id];
      addAction(state.online[key] ? 'Отключить' : 'Включить', actionIcon.power, () => {
        state.online[key] = !state.online[key];
        if (id === 'balancer' && state.online.balancer && state.taskProgress.balancerWeb && state.taskProgress.balancerMobile && state.taskProgress.balancerApi && state.taskProgress.balancerLoad) completed.add('balancer');
        if (id === 'database' && state.online.database && state.taskProgress.dbOffline) completed.add('db-offline');
        if (id === 'app-b' && state.online.b && state.taskProgress.serverBOverload) completed.add('server-b');
        refreshMap(); renderArticle(); save();
      }, state.online[key]);
    }
    if (id === 'app-a') addAction(state.online.peer ? 'Отключить передачу на B' : 'Включить передачу на B', actionIcon.response, () => { state.online.peer = !state.online.peer; refreshMap(); renderArticle(); save(); }, !state.online.peer);
    if (id === 'ext-gateway') addAction(state.paymentStubStatus === 200 ? 'Вернуть 503' : 'Вернуть 200', actionIcon.response, () => { state.paymentStubStatus = state.paymentStubStatus === 200 ? 503 : 200; refreshMap(); renderArticle(); save(); }, state.paymentStubStatus === 503);
    if (id === 'database') {
      const rows = state.products.map(row => `<tr><td>${row.id}</td><td>${esc(row.name)}</td><td>${row.price.toLocaleString('ru-RU')}</td><td>${row.currency}</td></tr>`).join('');
      visual.innerHTML = `<div class="course-test-viz__label">PostgreSQL · products <span>${state.products.length} строк</span></div><div class="course-test-db__table-wrap"><table class="course-test-db__table"><thead><tr><th>id</th><th>name</th><th>price</th><th>currency</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Нет строк</td></tr>'}</tbody></table></div><form class="course-test-db__form"><label for="course-test-sql">SQL для тестовой БД</label><div class="course-test-db__command"><input id="course-test-sql" type="text" spellcheck="false" autocomplete="off" placeholder="DELETE FROM products WHERE id = 42;" value="${esc(state.sqlDraft)}"><button type="submit">Выполнить</button></div></form>${state.sqlFeedback ? `<p class="course-test-db__feedback" role="status">${esc(state.sqlFeedback)}</p>` : ''}<details class="course-test-db__examples"><summary>Примеры команд</summary><code>UPDATE products SET name = 'QA Book Pro' WHERE id = 42;</code><code>DELETE FROM products WHERE id = 42;</code><code>DELETE FROM products;</code><code>INSERT INTO products (id, name, price, currency) VALUES (42, 'Ноутбук QA Book', 79990, 'RUB');</code><code>INSERT INTO products (id, name, price, currency) VALUES (43, 'Смартфон Pixel QA', 52990, 'RUB');</code></details>`;
      visual.querySelector('.course-test-db__examples').insertAdjacentHTML('beforeend', defaultProducts().slice(2).map(row => `<code>INSERT INTO products (id, name, price, currency) VALUES (${row.id}, '${esc(row.name)}', ${row.price}, 'RUB');</code>`).join(''));
      visual.querySelector('input').addEventListener('input', event => { state.sqlDraft = event.target.value; save(); });
      visual.querySelector('form').addEventListener('submit', event => { event.preventDefault(); if (busy) return; state.sqlFeedback = applySqlCommand(state.sqlDraft); renderArticle(); refreshMap(); save(); });
      renderCodePanel();
      $('#course-article-actions').hidden = false;
      return;
    }
    const source = ['client', 'mobile'].includes(id) ? 'тестовый клиент' : 'тестовый стенд';
    const rows = id === 'svc-auth' || id === 'ext-keycloak'
        ? [['Сервис', id === 'svc-auth' ? state.online.auth ? 'доступен' : 'отключён' : state.online.keycloak ? 'доступен' : 'отключён'], ['Новый вход', state.online.auth && state.online.keycloak ? 'токен выдаётся' : '503 · токен не выдан'], ['API с готовым токеном', 'проверяется отдельно']]
        : id === 'svc-catalog'
        ? [['GET /api/products/42', state.online.catalog && state.online.database ? productById(42) ? '200' : '404' : '503'], ['Товар 42', productById(42)?.name || 'строка отсутствует'], ['Проверка', 'статус · JSON · значения']]
        : id === 'ext-gateway'
          ? [['Стаб', 'POST /gateway/payments'], ['Ответ', state.paymentStubStatus === 200 ? '200 · {"status":"approved"}' : '503 · {"error":"payment_unavailable"}'], ['Списание', 'не выполняется']]
        : id === 'svc-payment'
          ? [['Внешний API', 'WireMock · HTTP-мок'], ['POST /payments', state.paymentStubStatus === 200 ? '200 · paid' : '503 · отказ мока']]
          : [['Контур', source], ['Последний прогон', state.lastRun?.result || 'ещё не запускался'], ...(id === 'app-a' || id === 'app-b' ? [['Нагрузка', `${state.lastRun?.serverLoads?.[id === 'app-a' ? 'a' : 'b'] || 0} / 600 запросов`]] : []), ...(id === 'app-a' ? [['Передача на B', state.online.peer ? 'включена' : 'отключена']] : []), ['Маршрут', !state.online.balancer ? 'UI, API и JMeter → напрямую к A' : state.online.a ? 'через сервер A' : state.online.b ? 'через сервер B' : 'нет доступных серверов']];
    visual.innerHTML = `<div class="course-test-viz__label">${esc(source)} <span>TEST</span></div>${rows.map(([label, value]) => `<div class="course-test-viz__row"><strong>${esc(label)}</strong><small>${esc(value)}</small></div>`).join('')}`;
    renderCodePanel();
    $('#course-article-actions').hidden = !$('#course-action-buttons').childElementCount;
  }
  function showArticle(id) {
    if (matchMedia('(max-width: 767px)').matches) {
      journal.hidden = true;
      replayId++;
      replayCleanup();
      replayCleanup = () => {};
      selectedRouteCleanup();
      selectedRouteCleanup = () => {};
    }
    state.article = id;
    article.hidden = false;
    article.querySelector('.course-article__theory').open = false;
    renderArticle();
    refreshMap();
    article.querySelector('.course-article__scroll').scrollTop = 0;
    save();
  }
  function renderJournal() {
    if (journal.hidden) return;
    const steps = state.lastRun?.steps || [];
    const selected = steps.find(step => step.id === state.selectedStep) || steps.at(-1);
    const example = exampleForRun(state.lastRun);
    const currentLine = lineForStep(example, selected);
    const type = !selected ? '' : selected.id === 'assert' ? 'Проверка' : selected.returning ? 'Ответ' : selected.route?.endsWith(':database') ? 'SQL' : /^(?:web|mobile):/.test(selected.route || '') ? 'Управление' : 'Запрос';
    const listScroll = $('#course-network-visual .course-infra-network__list')?.scrollTop || 0;
    $('#course-network-selection').textContent = state.lastRun?.title || 'Автотесты';
    $('#course-network-flow').textContent = 'тестовый стенд · ход проверки';
    $('#course-network-action-buttons').replaceChildren();
    $('#course-network-visual').innerHTML = `<div class="course-infra-network course-test-journal"><div class="course-infra-network__list">${steps.length ? steps.map(step => `<button type="button" data-step="${esc(step.id)}" data-tone="${step.status === 'error' ? 'error' : step.status === 'done' ? 'ok' : ''}" class="${selected?.id === step.id ? 'is-current' : ''}" aria-current="${selected?.id === step.id ? 'step' : 'false'}"><span>${esc(step.title)}</span><small>${step.status === 'error' ? 'сбой' : step.status === 'done' ? 'готово' : 'идёт'}</small></button>`).join('') : '<span class="course-infra-note">Выбери инструмент и запусти проверку.</span>'}</div><div class="course-infra-network__detail"><div class="course-test-journal__heading"><span class="course-test-journal__tag" data-tone="${selected?.status === 'error' ? 'error' : selected?.returning ? 'reply' : 'request'}">${esc(type || 'Ход проверки')}</span><strong>${esc(selected?.title || 'Что проверяем')}</strong></div><p>${esc(selected?.detail || 'Запусти Web UI, Mobile UI, API, SQL или нагрузку на тестовом стенде.')}</p>${example ? `<div class="course-test-journal__code-title"><span>Код теста</span><small>${esc(example.language)}</small></div><pre class="course-test-code__source course-test-journal__source"><code>${sourceLines(example, currentLine)}</code></pre>` : ''}</div></div>`;
    const list = $('#course-network-visual .course-infra-network__list');
    list.scrollTop = listScroll;
    if (busy && !reviewingStep) {
      const current = list.querySelector('.is-current');
      if (current) {
        const row = current.getBoundingClientRect();
        const frame = list.getBoundingClientRect();
        if (row.bottom > frame.bottom) list.scrollTop += row.bottom - frame.bottom + 5;
      }
    }
    $('#course-network-visual').querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
      const selectedStep = state.lastRun?.steps.find(item => item.id === button.dataset.step);
      if (!selectedStep) return;
      reviewingStep = true;
      state.selectedStep = selectedStep.id;
      renderJournal(); renderCodePanel(); save();
      replayStep(selectedStep);
    }));
  }
  function pathForRoute(route) {
    return lineHost.querySelector(`[data-test-route="${route}"]`) || layer.querySelector(`[data-test-route="${route}"]`);
  }
  function packetInfo(route, returning, flowLabel, replyCode) {
    const control = /^(?:web|mobile):/.test(route);
    const label = control ? returning ? 'Результат теста' : 'Управление UI'
      : route.endsWith(':database') ? returning ? 'Строки БД' : 'SQL SELECT'
        : route === 'svc-auth:ext-keycloak' ? returning ? replyCode === 503 ? 'Ошибка токена' : 'Токен' : 'POST /token'
          : route === 'svc-payment:ext-gateway' ? returning ? 'Ответ мока' : 'POST /gateway/payments'
            : returning ? `Ответ ${replyCode || 200}` : flowLabel || 'Запрос';
    return { label, kind: control ? 'control' : replyCode === 503 && returning ? 'error' : returning ? 'reply' : 'request' };
  }
  async function replayStep(item) {
    const ticket = ++replayId;
    replayCleanup();
    replayCleanup = () => {};
    selectedRouteCleanup();
    selectedRouteCleanup = () => {};
    const route = item.route || state.lastRun?.finalRoute;
    const path = route ? pathForRoute(route) : null;
    const midpoint = path?.getPointAtLength(path.getTotalLength() / 2);
    const project = projects.find(entry => entry.id === projectForTool[state.lastRun?.tool]);
    const target = midpoint || (project ? { x: project.x + project.width / 2, y: project.y + 30 } : null);
    if (!target) return;
    const selectedNodeId = route?.split(':')[item.returning ? 0 : 1];
    const selectedNode = selectedNodeId && nodeHost.querySelector(`[data-node="${selectedNodeId}"]`);
    const selectedTool = route && layer.querySelector(`[data-test-project="${route.split(':')[0]}"]`);
    path?.classList.add('is-journal-selected');
    selectedNode?.classList.add('is-journal-selected');
    selectedTool?.classList.add('is-journal-selected');
    selectedRouteCleanup = () => {
      path?.classList.remove('is-journal-selected');
      selectedNode?.classList.remove('is-journal-selected');
      selectedTool?.classList.remove('is-journal-selected');
    };
    const panelWidth = matchMedia('(max-width: 767px)').matches ? 0 : journal.getBoundingClientRect().width;
    const scale = motion.snapshot().scale;
    motion.focus(target.x + panelWidth / (2 * scale), target.y, true);
    await sleep(550);
    if (ticket !== replayId) return;
    const duration = 1250;
    const destination = route?.split(':')[item.returning ? 0 : 1];
    const node = destination && nodeHost.querySelector(`[data-node="${destination}"]`);
    const card = route && layer.querySelector(`[data-test-project="${route.split(':')[0]}"]`);
    path?.style.setProperty('--course-replay-duration', `${duration}ms`);
    path?.classList.add('is-replaying');
    path?.classList.toggle('is-replay-returning', Boolean(item.returning));
    node?.classList.add('is-test-replaying');
    card?.classList.add('is-test-replaying');
    let packet;
    if (midpoint) {
      const info = packetInfo(route, item.returning, item.flowLabel, item.replyCode || (item.status === 'error' ? 503 : 200));
      packet = document.createElement('span');
      packet.className = 'course-test-request-packet course-test-request-packet--replay';
      packet.dataset.kind = item.status === 'error' ? 'error' : info.kind;
      packet.textContent = info.label;
      packet.style.left = `${midpoint.x}px`;
      packet.style.top = `${midpoint.y}px`;
      packet.style.setProperty('--course-test-duration', `${duration}ms`);
      packetHost.append(packet);
    }
    replayCleanup = () => {
      path?.classList.remove('is-replaying', 'is-replay-returning');
      path?.style.removeProperty('--course-replay-duration');
      node?.classList.remove('is-test-replaying');
      card?.classList.remove('is-test-replaying');
      packet?.remove();
    };
    await new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 500 : duration));
    if (ticket === replayId) { replayCleanup(); replayCleanup = () => {}; }
  }
  function openJournal() {
    article.hidden = true;
    state.article = '';
    journal.hidden = false;
    refreshMap();
    renderJournal();
    save();
  }
  async function animate(route, run, tool = '', returning = false, extraDuration = 0) {
    const path = pathForRoute(route);
    const card = tool ? layer.querySelector(`[data-test-project="${projectForTool[tool]}"]`) : null;
    const destination = route.split(':')[returning ? 0 : 1];
    const node = nodeHost.querySelector(`[data-node="${destination}"]`);
    const control = /^(?:web|mobile):/.test(route);
    const length = path?.getTotalLength() || 0;
    const duration = (control ? 620 : Math.max(850, Math.min(1150, length * 1.7))) + extraDuration;
    path?.style.setProperty('--course-test-duration', `${duration}ms`);
    path?.classList.add('is-running');
    path?.classList.toggle('is-returning', returning);
    card?.classList.add('is-processing');
    node?.classList.add('is-test-processing');
    if (path && !reducedMotion.matches) {
      const info = packetInfo(route, returning, state.lastRun?.flowLabel, state.lastRun?.replyCode);
      const packet = document.createElement('span');
      packet.className = 'course-test-request-packet';
      packet.dataset.kind = info.kind;
      packet.dataset.route = route;
      packet.textContent = info.label;
      packet.style.setProperty('--course-test-duration', `${duration}ms`);
      const midpoint = path.getPointAtLength(length / 2);
      packet.style.left = `${midpoint.x}px`;
      packet.style.top = `${midpoint.y}px`;
      packetHost.append(packet);
      await sleep(duration);
      packet.remove();
    } else await sleep(duration);
    path?.classList.remove('is-running');
    path?.classList.remove('is-returning');
    path?.style.removeProperty('--course-test-duration');
    card?.classList.remove('is-processing');
    node?.classList.remove('is-test-processing');
    return run === runId;
  }
  async function step(id, title, detail, route, run, tool = '', returning = false, extraDuration = 0) {
    const item = { id, title, detail, route, tool, returning, flowLabel: state.lastRun.flowLabel, replyCode: state.lastRun.replyCode, status: 'running' };
    state.lastRun.steps.push(item);
    if (!reviewingStep) state.selectedStep = id;
    renderJournal(); renderCodePanel(); save();
    if (route) await animate(route, run, tool, returning, extraDuration);
    else await sleep(220);
    if (run !== runId) return false;
    item.status = 'done';
    renderJournal(); renderCodePanel(); save();
    return true;
  }
  function markStepFailure(id, detail, code = 503) {
    const item = state.lastRun.steps.find(step => step.id === id);
    if (item) { item.status = 'error'; item.detail = detail; item.replyCode = code; }
    state.lastRun.replyCode = code;
    renderJournal(); renderCodePanel(); save();
  }
  async function run(kind) {
    if (busy) return;
    busy = true;
    reviewingStep = false;
    replayId++;
    replayCleanup();
    replayCleanup = () => {};
    selectedRouteCleanup();
    selectedRouteCleanup = () => {};
    const run = ++runId;
    const name = { web: 'Web UI · Playwright', selenium: 'Web UI · Selenium + Java', mobile: 'Mobile UI · Appium Android', 'mobile-ios': 'Mobile UI · Appium iOS', espresso: 'Mobile UI · Android Studio + Espresso', api: 'API + SQL · GET', 'api-negative': 'API + SQL · GET → 404', 'payment-api': 'API + SQL · оплата', patch: 'API + SQL · PATCH', sql: 'API + SQL · JDBC SELECT', 'sql-negative': 'API + SQL · JDBC: 0 строк', load: 'Нагрузка · JMeter' }[kind];
    const mobile = kind === 'mobile' || kind === 'mobile-ios' || kind === 'espresso';
    const platform = kind === 'mobile-ios' ? 'iOS' : 'Android';
    const web = kind === 'web' || kind === 'selenium';
    const directUi = (web || mobile) && !state.online.balancer;
    const directLoad = kind === 'load' && !state.online.balancer;
    const directApi = projectForKind[kind] === 'api' && kind !== 'sql' && kind !== 'sql-negative' && !state.online.balancer;
    const clientId = mobile ? 'mobile' : 'client';
    const clientRoute = `${clientId}:${directUi ? 'app-a' : 'balancer'}`;
    const tool = toolForKind[kind];
    const firstRequest = web || mobile ? 'POST /auth/login' : kind === 'payment-api' ? 'POST /payments' : kind === 'patch' ? 'PATCH /api/products/42' : kind === 'load' ? `${state.loadCount} × GET /api/products/42` : kind === 'sql' || kind === 'sql-negative' ? 'SQL SELECT' : 'GET /api/products/42';
    state.lastRun = { title: name, kind, tool, project: projectForKind[kind], steps: [], result: 'выполняется', flowLabel: firstRequest, replyCode: 200, loadCount: kind === 'load' ? state.loadCount : undefined, serverLoads: { a: 0, b: 0 }, finalRoute: kind === 'sql' || kind === 'sql-negative' ? 'api:database' : '' };
    openJournal(); renderCodePanel(); syncButtons();
    let failed = false;
    let detail = '';
    let lastService = '';
    if (kind === 'sql' || kind === 'sql-negative') {
      if (!await step('connect', 'JDBC · подключение', 'Тестовый пользователь выполняет только SELECT; публичный API этот путь не проходит.', 'api:database', run, tool)) return;
      if (!state.online.database) { failed = true; detail = 'JDBC: соединение с PostgreSQL недоступно.'; markStepFailure('connect', detail); if (state.sawDbGetFailure) state.taskProgress.dbOffline = true; }
      else {
        const row = productById(42);
        failed = kind === 'sql' ? !row : !!row;
        detail = row ? `SELECT name FROM products WHERE id = 42 → 1 строка: «${row.name}». ${kind === 'sql-negative' ? 'Ожидали 0 строк: проверка не прошла.' : 'Сохранённое значение найдено.'}` : `SELECT name FROM products WHERE id = 42 → 0 строк. ${kind === 'sql' ? 'Ожидали строку: проверка не прошла.' : 'Ожидали пустой результат: проверка прошла.'}`;
        if (!row && kind === 'sql-negative' && !state.products.length) { state.taskProgress.dbEmptySql = true; state.taskProgress.dbEmpty = !!state.taskProgress.dbEmptyApi; }
      }
      if (!await animate('api:database', run, tool, true)) return;
      if (!failed && state.apiChanged && state.apiVerified) completed.add('api-sql');
    } else {
      const startRoute = web ? 'web:client' : mobile ? 'mobile:mobile' : directLoad ? 'load:app-a' : directApi ? 'api:app-a' : `${projectForKind[kind]}:balancer`;
      state.lastRun.finalRoute = startRoute;
      if (!await step('runner', name, web ? 'Тестовый код управляет браузером.' : mobile ? `Тестовый код управляет нативным приложением ${platform}.` : kind === 'load' ? `Stepping Thread Group поднимает ${state.loadCount / 10} пользователей; ${directLoad ? 'резервный адрес ведёт прямо на A' : 'вход идёт через балансировщик'}.` : 'Java-код отправляет HTTP-запрос без браузера.', startRoute, run, tool)) return;
      if (web || mobile) if (!await step('client', `${firstRequest} · ${mobile ? platform : 'браузер'}`, directUi ? 'Тестовый клиент отправляет запрос прямо на сервер A.' : 'Тестовый клиент отправляет запрос через балансировщик.', clientRoute, run)) return;
      const target = directLoad || directUi || directApi ? state.online.a ? 'app-a' : '' : !state.online.balancer ? '' : state.online.a ? 'app-a' : state.online.b ? 'app-b' : '';
      if (kind === 'load' && target) {
        const share = target === 'app-a' && state.online.b && state.online.peer ? state.lastRun.loadCount / 2 : state.lastRun.loadCount;
        state.lastRun.serverLoads = { a: target === 'app-a' ? share : 0, b: target === 'app-b' || share !== state.lastRun.loadCount ? share : 0 };
        renderArticle();
      }
      if (!target) { failed = true; detail = directLoad || directUi || directApi ? '503: прямой адрес сервера A недоступен.' : state.online.balancer ? '503: обе копии приложения недоступны.' : '503: балансировщик недоступен; запросы не дошли до серверов.'; state.lastRun.replyCode = 503; }
      else if (!directLoad && !directUi && !directApi && !await step('route', 'Балансировщик', `Запрос направлен на тестовый сервер ${target === 'app-a' ? 'A' : 'B'}.`, `balancer:${target}`, run)) return;
      if (!failed && (web || mobile)) {
        if (!await step('auth', 'Авторизация', 'Тестовый пользователь входит; токен используется в следующем запросе.', `${target}:svc-auth`, run)) return;
        lastService = 'svc-auth';
        if (!state.online.auth) { failed = true; detail = '503: сервис авторизации отключён; новый вход не выполнен.'; if (web) state.sawAuthWebFailure = true; markStepFailure('auth', detail); }
        if (!failed) {
          if (!await step('identity', 'Keycloak · test', state.online.keycloak ? 'Выдан тестовый токен.' : 'Новый токен не выдан: Keycloak недоступен.', 'svc-auth:ext-keycloak', run)) return;
          if (!state.online.keycloak) { failed = true; detail = '503: Keycloak недоступен; новый вход не выполнен.'; if (mobile) state.sawKeycloakMobileFailure = true; markStepFailure('identity', detail); }
          if (!await animate('svc-auth:ext-keycloak', run, '', true)) return;
          if (!failed) {
            if (!await animate(`${target}:svc-auth`, run, '', true)) return;
            lastService = '';
          }
        }
      }
      if (!failed && kind !== 'payment-api') {
        if (web || mobile) {
          if (!directUi && !await animate(`balancer:${target}`, run, '', true)) return;
          if (!await animate(clientRoute, run, '', true)) return;
          state.lastRun.flowLabel = 'GET /api/products/42';
          if (!await step('catalog-client', 'GET /api/products/42 · клиент', 'После входа клиент отдельно запрашивает товар.', clientRoute, run)) return;
          if (!directUi && !await step('catalog-route', 'GET /api/products/42 · сервер', 'Балансировщик передаёт запрос приложению.', `balancer:${target}`, run)) return;
        }
        const forwardLoad = kind === 'load' && target === 'app-a' && state.online.b && state.online.peer;
        const catalogDetail = kind === 'patch' ? 'PATCH /api/products/42 меняет товар через сервис каталога.' : kind === 'load' ? 'HTTP-сэмплер запрашивает /api/products/42 через сервис каталога.' : 'GET /api/products/42 возвращает товар через сервис каталога.';
        if (forwardLoad) {
          const catalogA = step('catalog', 'Каталог · сервер A', catalogDetail, 'app-a:svc-catalog', run, '', false, 650);
          if (!await step('peer-forward', 'A → B · передача', 'A передаёт половину потока серверу B через настроенный внутренний прокси.', 'app-a:app-b', run)) { await catalogA; return; }
          const catalogB = step('catalog-b', 'Каталог · сервер B', 'B параллельно обрабатывает переданную половину запросов.', 'app-b:svc-catalog', run);
          if ((await Promise.all([catalogA, catalogB])).some(result => !result)) return;
        } else if (!await step('catalog', 'Каталог · API', catalogDetail, `${target}:svc-catalog`, run)) return;
        lastService = 'svc-catalog';
        if (!state.online.catalog) { failed = true; detail = '503: каталог недоступен; UI и API не получают товар.'; markStepFailure('catalog', detail); }
        else {
          if (!await step('db', 'PostgreSQL · test', productById(42) ? `Сервис прочитал товар 42: «${productById(42).name}».` : 'SELECT по id = 42 вернул 0 строк.', 'svc-catalog:database', run)) return;
          if (!state.online.database) { failed = true; detail = '503: PostgreSQL отключена; каталог не может прочитать товар.'; markStepFailure('db', detail); if (kind === 'api') state.sawDbGetFailure = true; }
          else {
            if (!await animate('svc-catalog:database', run, '', true)) return;
            if (!await animate(`${target}:svc-catalog`, run, '', true)) return;
            lastService = '';
          }
        }
      }
      if (!failed && kind === 'patch') {
        const row = productById(42);
        if (!row) { failed = true; state.lastRun.replyCode = 404; detail = 'PATCH /api/products/42 → 404: строка удалена из тестовой БД.'; }
        else row.name = row.name === 'Ноутбук QA Book' ? 'Ноутбук QA Book · обновлён' : 'Ноутбук QA Book';
        if (!failed) {
          state.apiChanged = true;
          state.apiVerified = false;
          detail = `PATCH /api/products/42 → 200; имя сохранено: «${row.name}».`;
        }
      }
      if (!failed && (kind === 'api' || kind === 'api-negative')) {
        const row = productById(42);
        state.lastRun.replyCode = row ? 200 : 404;
        failed = kind === 'api' ? !row : !!row;
        if (kind === 'api' && row) { state.apiVerified = state.apiChanged; if (state.sqlChanged) state.sqlApiVerified = true; }
        if (kind === 'api' && state.sawKeycloakMobileFailure && !state.online.keycloak) state.apiAfterKeycloakFailure = true;
        detail = row ? `GET /api/products/42 → 200; JSON.name = «${row.name}». ${kind === 'api-negative' ? 'Ожидали 404: негативный тест не прошёл.' : 'Тест использует заранее выданный токен.'}` : `GET /api/products/42 → 404; JSON.error = not_found. ${kind === 'api' ? 'Ожидали 200: позитивный тест не прошёл.' : 'Ожидали 404: негативный тест прошёл.'}`;
        if (!row && kind === 'api-negative') { state.taskProgress.dbNegative = true; if (!state.products.length) { state.taskProgress.dbEmptyApi = true; state.taskProgress.dbEmpty = !!state.taskProgress.dbEmptySql; } }
      }
      if (!failed && (web || mobile) && !productById(42)) { failed = true; detail = 'GET /api/products/42 → 404: товар удалён, UI-проверка каталога не прошла.'; markStepFailure('db', detail, 404); }
      if (!failed && (web || mobile || kind === 'payment-api')) {
        if (web || mobile) {
          if (!directUi && !await animate(`balancer:${target}`, run, '', true)) return;
          if (!await animate(clientRoute, run, '', true)) return;
          state.lastRun.flowLabel = 'POST /payments';
          if (!await step('payment-client', 'POST /payments · клиент', 'Оплата — отдельный запрос после загрузки товара.', clientRoute, run)) return;
          if (!directUi && !await step('payment-route', 'POST /payments · сервер', 'Балансировщик передаёт платёжный запрос приложению.', `balancer:${target}`, run)) return;
        }
        if (!await step('payment', 'Оплата · test', 'Проверяем переход от UI к платёжному сервису.', `${target}:svc-payment`, run)) return;
        lastService = 'svc-payment';
        if (!await step('gateway', 'WireMock · POST /gateway/payments', state.paymentStubStatus === 200 ? 'Мок вернул HTTP 200 и {"status":"approved"}; реального списания нет.' : 'Мок вернул HTTP 503 и {"error":"payment_unavailable"}.', 'svc-payment:ext-gateway', run)) return;
        if (state.paymentStubStatus === 503) { failed = true; detail = kind === 'payment-api' ? 'POST /payments → 503; WireMock вернул отказ.' : '503: мок оплаты вернул отказ; UI-автотест обнаружил ошибку.'; state.sawPaymentFailure = true; markStepFailure('gateway', detail); }
        else {
          detail = kind === 'payment-api' ? 'POST /payments → 200; JSON.status = paid (ответ WireMock: approved).' : `${mobile ? `Нативный ${platform} UI` : 'Web UI'}: вход, каталог и мок оплаты прошли; HTTP 200.`;
          if (kind === 'web') completed.add('web');
          if (kind === 'selenium') completed.add('selenium');
          if (kind === 'mobile') completed.add('mobile');
          if (kind === 'mobile-ios') completed.add('mobile-ios');
          if (kind === 'espresso') completed.add('espresso');
          if (state.sawPaymentFailure) completed.add('payment');
          if (web && state.sawAuthWebFailure && state.online.auth) completed.add('auth');
          if (mobile && state.sawKeycloakMobileFailure && state.apiAfterKeycloakFailure && state.online.keycloak) completed.add('keycloak');
        }
        if (!await animate('svc-payment:ext-gateway', run, '', true)) return;
      }
      if (!failed && kind === 'load') {
        const count = state.lastRun.loadCount;
        const forwarded = target === 'app-a' && state.online.b && state.online.peer;
        const copies = forwarded ? 2 : 1;
        const perCopy = forwarded ? count / 2 : count;
        state.lastRun.serverLoads = { a: target === 'app-a' ? perCopy : 0, b: forwarded || target === 'app-b' ? perCopy : 0 };
        const errors = productById(42) ? Math.max(0, count - copies * 600) : count;
        failed = errors > 0;
        state.lastRun.replyCode = failed ? productById(42) ? 503 : 404 : 200;
        detail = productById(42) ? `${count - errors} × 200 · ${errors} × 503. A: ${state.lastRun.serverLoads.a}, B: ${state.lastRun.serverLoads.b}; предел 600 на копию.${directLoad ? ' Резервный вход JMeter → A.' : ''}` : `${count} × 404: товар 42 отсутствует в тестовой БД.`;
        if (errors) state.sawLoadFailure = true;
        if (count === 1000 && errors && productById(42)) state.sawLoad1000Failure = true;
        else if (count === 1000 && !errors && state.sawLoad1000Failure && state.online.a && state.online.b) completed.add('load-1000');
        if (count === 1000 && errors && target === 'app-a' && !state.online.peer && state.online.b) state.sawPeerOverload = true;
        if (count === 1000 && !errors && state.sawPeerOverload && forwarded) completed.add('peer-forward');
        if (errors && !state.online.b && state.online.a && count === 1000) state.taskProgress.serverBOverload = true;
      }
      if (kind === 'load' && directLoad && !failed && state.lastRun.loadCount === 1000 && state.lastRun.serverLoads.b === 500) state.taskProgress.balancerLoad = true;
      if (target) {
        if (kind === 'load' && target === 'app-a' && state.online.b && state.online.peer) {
          if (!await animate('app-b:svc-catalog', run, '', true)) return;
          if (!await animate('app-a:app-b', run, '', true)) return;
        }
        if (lastService && !await animate(`${target}:${lastService}`, run, '', true)) return;
        if (directUi && !await step('response', `HTTP ${state.lastRun.replyCode} · ответ`, 'Сервер A отвечает тестовому клиенту напрямую.', clientRoute, run, '', true)) return;
        if (!directLoad && !directUi && !directApi && !await step('response', `HTTP ${state.lastRun.replyCode} · ответ`, 'Результат возвращается через балансировщик тестовому клиенту.', `balancer:${target}`, run, '', true)) return;
        if (directLoad && !await step('response', `HTTP ${state.lastRun.replyCode} · ответ`, 'Результат возвращается JMeter через резервный прямой вход A.', startRoute, run, '', true)) return;
        if (directApi && !await step('response', `HTTP ${state.lastRun.replyCode} · ответ`, 'Сервер A отвечает API-тесту напрямую.', startRoute, run, '', true)) return;
        if ((web || mobile) && !directUi) if (!await animate(clientRoute, run, '', true)) return;
        if (!directLoad && !directApi && !await animate(startRoute, run, tool, true)) return;
      } else {
        const replyRoute = web || mobile ? clientRoute : startRoute;
        if (!await step('response', 'HTTP 503 · ответ', detail, replyRoute, run, '', true)) return;
        if (replyRoute !== startRoute && !await animate(startRoute, run, tool, true)) return;
      }
    }
    if (run !== runId) return;
    if (directUi && !failed) state.taskProgress[web ? 'balancerWeb' : 'balancerMobile'] = true;
    if (directApi && kind === 'api' && !failed) state.taskProgress.balancerApi = true;
    if (kind === 'sql' && state.sqlChanged && state.sqlApiVerified && productById(42)) completed.add('db-update');
    const result = { id: 'assert', title: failed ? 'Проверка не прошла' : 'Проверка прошла', detail, route: state.lastRun.finalRoute, tool, returning: true, flowLabel: state.lastRun.flowLabel, replyCode: state.lastRun.replyCode, status: failed ? 'error' : 'done' };
    state.lastRun.steps.push(result);
    state.lastRun.result = failed ? 'ошибка' : 'успех';
    if (!reviewingStep) state.selectedStep = result.id;
    busy = false;
    refreshMap(); renderArticle(); renderJournal(); syncButtons(); save();
  }

  drawMap();
  motion = window.createMapMotion({ viewport, canvas, getContentBounds: () => ({ left: 230, top: 50, right: 3020, bottom: 1080 }), onChange: () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }, touchPanGain: 1.25 });
  window.courseMapMotion = motion;
  if (window.courseChapterEntryCamera) motion.restore(window.courseChapterEntryCamera);
  else if (state.camera && Number.isFinite(state.camera.x)) motion.restore(state.camera);
  else motion.focus(1100, 430, false);
  launcher.addEventListener('click', event => { const button = event.target.closest('[data-test-project]'); if (button && !busy) run(state.projectScenario[button.dataset.testProject]); });
  reset.addEventListener('click', () => {
    runId++;
    replayId++;
    replayCleanup();
    replayCleanup = () => {};
    selectedRouteCleanup();
    selectedRouteCleanup = () => {};
    reviewingStep = false;
    state = initial();
    completed.clear();
    busy = false;
    article.hidden = true;
    journal.hidden = true;
    lineHost.querySelectorAll('.is-running').forEach(path => path.classList.remove('is-running'));
    layer.querySelectorAll('.is-running, .is-processing').forEach(item => item.classList.remove('is-running', 'is-processing'));
    packetHost.replaceChildren();
    nodeHost.querySelectorAll('.is-test-processing').forEach(item => item.classList.remove('is-test-processing'));
    refreshMap(); syncButtons(); save();
  });
  $('#course-tasks').addEventListener('click', () => showArticle('tasks'));
  $('#course-article-close').addEventListener('click', () => { article.hidden = true; state.article = ''; refreshMap(); save(); });
  $('#course-network-close').addEventListener('click', () => { journal.hidden = true; replayId++; replayCleanup(); replayCleanup = () => {}; selectedRouteCleanup(); selectedRouteCleanup = () => {}; save(); });
  layer.querySelectorAll('[data-test-project]').forEach(button => button.addEventListener('click', () => showArticle(`project-${button.dataset.testProject}`)));
  const hint = document.createElement('div');
  hint.className = 'course-task-tooltip';
  hint.hidden = true;
  document.body.append(hint);
  let hintTimer = 0;
  const hideHint = () => { clearTimeout(hintTimer); hint.hidden = true; };
  article.addEventListener('pointerover', event => {
    const target = event.target.closest('.course-task__hint');
    if (!target || target.contains(event.relatedTarget)) return;
    hideHint();
    hintTimer = setTimeout(() => { hint.textContent = target.dataset.tooltip; hint.hidden = false; const box = target.getBoundingClientRect(); hint.style.left = `${Math.max(8, Math.min(box.left, innerWidth - hint.offsetWidth - 8))}px`; hint.style.top = `${Math.max(8, box.top - hint.offsetHeight - 7)}px`; }, 500);
  });
  article.addEventListener('pointerout', event => { const target = event.target.closest('.course-task__hint'); if (target && !target.contains(event.relatedTarget)) hideHint(); });
  article.addEventListener('focusin', event => { const target = event.target.closest('.course-task__hint'); if (!target) return; hideHint(); hintTimer = setTimeout(() => { hint.textContent = target.dataset.tooltip; hint.hidden = false; const box = target.getBoundingClientRect(); hint.style.left = `${Math.max(8, Math.min(box.left, innerWidth - hint.offsetWidth - 8))}px`; hint.style.top = `${Math.max(8, box.top - hint.offsetHeight - 7)}px`; }, 500); });
  article.addEventListener('focusout', hideHint);
  window.addEventListener('pagehide', () => {
    if (busy && state.lastRun?.result === 'выполняется') {
      runId++;
      busy = false;
      state.lastRun.result = 'прервано';
      state.lastRun.steps.forEach(item => { if (item.status === 'running') item.status = 'error'; });
    }
    save();
  });
  if (state.article && !(state.journalOpen && matchMedia('(max-width: 767px)').matches)) { article.hidden = false; renderArticle(); }
  if (state.journalOpen) { journal.hidden = false; renderJournal(); }
  refreshMap(); syncButtons();
  document.body.classList.add('course-ready');
})();
