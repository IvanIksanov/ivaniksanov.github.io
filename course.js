(() => {
  'use strict';

  const STORAGE_KEY = 'qatodev_course_client_server_v1';
  const nodes = [
    { id: 'client', title: 'Клиент', icon: 'client', x: 640, y: 460, next: ['balancer', 'assets'] },
    { id: 'balancer', title: 'Балансировщик', icon: 'balance', x: 1170, y: 530, next: ['app-a', 'app-b'] },
    { id: 'app-a', title: 'Сервер приложения A', icon: 'server', x: 1660, y: 400, next: ['database'] },
    { id: 'app-b', title: 'Сервер приложения B', icon: 'server', x: 1660, y: 710, next: ['database'] },
    { id: 'database', title: 'База данных', icon: 'database', x: 2220, y: 570, next: [] },
    { id: 'assets', title: 'CDN · копии файлов', icon: 'cdn', x: 1260, y: 75, next: ['storage'] },
    { id: 'storage', title: 'Источник файлов', icon: 'storage', x: 1940, y: 75, next: [] }
  ];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const baseX = new Map(nodes.map(node => [node.id, node.x]));
  const edges = [
    ['client', 'balancer'], ['balancer', 'app-a'], ['balancer', 'app-b'],
    ['app-a', 'database'], ['app-b', 'database'], ['client', 'assets'], ['assets', 'storage']
  ];
  const icons = {
    client: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    balance: '<path d="M12 3v18M5 7h14M4 7l-2 5h6l-2-5m12 0-2 5h6l-2-5M2 12c0 2 6 2 6 0m8 0c0 2 6 2 6 0M8 21h8"/>',
    server: '<rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    files: '<path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h8"/>',
    cdn: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z"/><path d="M9 14h6"/>',
    storage: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M8 13h8m-8 3h5"/>'
  };
  const packetIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h7l5 5v15H7zM14 2v5h5"/></svg>';
  const directionIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const packets = [
    { id: 'request', title: 'HTML', phase: 1, pair: 'html', flow: 'request', edge: ['client', 'balancer'], t: .14, when: 'balancer' },
    { id: 'html', title: 'HTML', phase: 1, pair: 'html', flow: 'response', edge: ['client', 'balancer'], t: .38, when: 'balancer' },
    { id: 'cookie', title: 'API', phase: 2, pair: 'api', flow: 'request', edge: ['client', 'balancer'], t: .62, when: 'balancer' },
    { id: 'json', title: 'JSON', phase: 2, pair: 'api', flow: 'response', edge: ['client', 'balancer'], t: .86, when: 'balancer' },
    { id: 'sql', title: 'SQL', phase: 1, pair: 'db', flow: 'request', edge: ['app-a', 'database'], t: .25, when: 'database' },
    { id: 'db-result', title: 'Результат БД', phase: 1, pair: 'db', flow: 'response', edge: ['app-a', 'database'], t: .75, when: 'database' },
    { id: 'origin', title: 'GET файл', flow: 'request', edge: ['assets', 'storage'], t: .5, when: 'storage' },
    { id: 'css-get', title: 'CSS', phase: 1, pair: 'css', flow: 'request', edge: ['client', 'assets'], t: .22, when: 'assets' },
    { id: 'js-get', title: 'JS', phase: 2, pair: 'js', flow: 'request', edge: ['client', 'assets'], t: .41, when: 'assets' },
    { id: 'css', title: 'CSS', phase: 1, pair: 'css', flow: 'response', edge: ['client', 'assets'], t: .61, when: 'assets' },
    { id: 'js', title: 'JS', phase: 2, pair: 'js', flow: 'response', edge: ['client', 'assets'], t: .88, when: 'assets' },
    { id: 'cache', title: 'Cache', flow: 'local', when: 'assets' }
  ];
  const resourcePackets = new Set(['request', 'html', 'origin', 'css-get', 'js-get', 'css', 'js', 'cache']);

  const baseProducts = [
    { id: 42, name: 'Ноутбук QA Book', price: 79990, currency: 'RUB' },
    { id: 43, name: 'Смартфон Pixel QA', price: 52990, currency: 'RUB' },
    { id: 44, name: 'Наушники Studio', price: 12990, currency: 'RUB' },
    { id: 45, name: 'Монитор View 27', price: 34990, currency: 'RUB' },
    { id: 46, name: 'Клавиатура Type', price: 6990, currency: 'RUB' }
  ];
  const extraProducts = [];
  const deletedProducts = new Set();
  let selectedProductId = 42;
  function productFor(id) { return [...baseProducts, ...extraProducts].find(product => product.id === Number(id) && !deletedProducts.has(product.id)); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function rowCountLabel(count) { return `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'строка' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'строки' : 'строк'}`; }
  function requestCountLabel(count) { return `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'запрос' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'запроса' : 'запросов'}`; }
  function productTableMarkup() {
    const rows = [...baseProducts, ...extraProducts].filter(product => !deletedProducts.has(product.id)).map(product => `<tr class="${product.id === selectedProductId ? 'is-current' : ''}"><td>${product.id}</td><td>${escapeHtml(product.name)}</td><td>${product.price.toLocaleString('ru-RU')}</td><td>${product.currency}</td></tr>`).join('');
    return `<div class="ai-table-shell course-table-shell"><div class="ai-table-wrap"><table class="ai-table"><thead><tr><th scope="col">id</th><th scope="col">name</th><th scope="col">price</th><th scope="col">currency</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="course-table-empty">Таблица пуста</td></tr>'}</tbody></table></div></div>`;
  }

  // Содержимое главы хранится здесь: структура карты и объяснения не зависят от базы вопросов.
  const articles = {
    client: { kicker: '01 / Откуда начинается запрос', title: 'Клиент', body: `
      <section class="course-load-settings" aria-label="Нагрузочное тестирование">
        <h3>Нагрузочное тестирование</h3>
        <p>Выбери число одновременных запросов. Схема покажет один проход по каждому маршруту, а серверы — общую нагрузку.</p>
        <div class="course-load-settings__choices" role="group" aria-label="Количество запросов">
          <button type="button" data-request-count="1">1 запрос</button>
          <button type="button" data-request-count="100">100 запросов</button>
          <button type="button" data-request-count="500">500 запросов</button>
          <button type="button" data-request-count="1000">1000 запросов</button>
        </div>
        <span class="course-load-settings__progress" id="course-load-progress" role="status" hidden></span>
      </section>
      <section class="course-algorithm" id="course-algorithm" aria-label="Алгоритм выполнения запросов">
        <div class="course-algorithm__heading"><h3>Алгоритм</h3><div class="course-algorithm__pager"><button id="course-algorithm-prev" type="button" aria-label="Предыдущий запуск">‹</button><span id="course-algorithm-count"></span><button id="course-algorithm-next" type="button" aria-label="Следующий запуск">›</button></div></div>
        <div class="course-algorithm__mode" id="course-algorithm-mode"></div>
        <ol class="course-algorithm__steps" id="course-algorithm-steps"></ol>
        <p class="course-algorithm__result" id="course-algorithm-result" hidden></p>
      </section>` },
    balancer: { kicker: '02 / Маршрутизация', title: 'Балансировщик', body: `<p>Балансировщик — точка входа перед экземплярами приложения A и B. Это может быть отдельный сервер, облачный сервис или программа на той же машине. На схеме он вынесен отдельно, чтобы было видно, кто выбирает обработчик запроса.</p><p><strong>Реальные примеры:</strong> NGINX и HAProxy как обратные прокси, AWS Application Load Balancer как облачный сервис. Клиент обращается к одному адресу, а балансировщик пересылает запрос выбранному экземпляру приложения.</p><p><strong>Подходы:</strong> round robin — по очереди A, B, A; least connections — серверу с меньшим числом активных соединений; проверки доступности — не отправлять запросы на недоступный сервер. В этой учебной модели один запрос идёт на A, а 1000 делятся поровну между A и B; это упрощение, а не точная симуляция NGINX или HAProxy. Сверху показана нагрузка последнего запуска.</p>` },
    'app-a': { kicker: '03 / Бизнес-логика', title: 'Сервер приложения A', body: `<p>Сервер A возвращает HTML на <code>GET /</code> и данные товара на <code>GET /api/products/{id}</code>. Для данных он проверяет сессию и обращается к общей базе.</p><p>Шкала сверху показывает нагрузку последнего запуска. В учебной модели больше 600 одновременных запросов перегружают один сервер.</p>` },
    'app-b': { kicker: '03 / Бизнес-логика', title: 'Сервер приложения B', body: `<p>Сервер B — второй экземпляр того же приложения. Он может вернуть HTML, обработать API-запрос и обратиться к той же базе, что и A.</p><p>Балансировщик направляет запросы на B при распределении нагрузки или когда A недоступен. Серверы не обязаны обмениваться запросами напрямую.</p>` },
    database: { kicker: '04 / Данные', title: 'База данных', body: `
      <p>Сервер приложения ищет товар в таблице <code>products</code> по ID из запроса. Браузер не подключается к базе напрямую.</p>
      <p id="course-db-state"></p>
      <p>База возвращает строку или <strong>0 строк</strong>. HTTP-статус выбирает приложение. Здесь можно воспроизвести намеренные ошибки: HTTP 200 с пустым телом или с <code>error.code: 404</code> внутри JSON.</p>` },
    assets: { kicker: '04 / Доставка файлов', title: 'CDN · копии файлов', body: `<p><strong>CDN</strong> — Content Delivery Network, сеть доставки содержимого. Она хранит копии CSS и JS ближе к пользователю. Сверху показаны копии, доступные в текущем режиме схемы.</p><p>При <strong>cache hit</strong> CDN отвечает сама. При <strong>cache miss</strong> она запрашивает оригинал в источнике. Кэш браузера — отдельное место: если файл уже есть там, запроса к CDN вообще не будет.</p>` },
    storage: { kicker: '05 / Оригиналы файлов', title: 'Источник файлов', body: `<p>Здесь лежат оригиналы <code>style.css</code> и <code>app.js</code>. CDN приходит сюда только при промахе своего кэша. Если источник отключён, готовые копии на CDN всё ещё могут работать.</p>` },
    origin: { kicker: 'Запрос CDN / к источнику', title: 'Получение файла', body: `<p>При промахе своего кэша CDN запрашивает оригинальный файл у источника. Это отдельный HTTP-запрос CDN → источник, а не запрос сервера приложения A или B. После ответа CDN может сохранить копию и отдать файл браузеру.</p>` },
    request: { kicker: 'Первый запрос страницы', title: 'HTML-запрос', body: `<p>Браузер отправляет <code>GET /</code> и получает HTML-документ. В Network сверху показан только этот запрос и его ответ.</p><p>В HTML есть адреса CSS и JavaScript, но браузер запрашивает эти файлы отдельно по ветке CDN. Данные товара тоже приходят позже, через отдельный <code>GET /api</code>.</p>` },
    'css-get': { kicker: 'Запрос браузера / к CDN', title: 'CSS-запрос', body: `<p>Браузер запрашивает <code>style.css</code> по адресу из HTML. Это отдельный запрос к CDN, не часть запроса за JavaScript.</p><p>Если свежая копия уже есть в кэше браузера, запрос к CDN не нужен. При cache miss CDN идёт за оригиналом в источник.</p>` },
    'js-get': { kicker: 'Запрос браузера / к CDN', title: 'JS-запрос', body: `<p>Браузер запрашивает <code>app.js</code> по адресу из HTML. Это отдельный запрос к CDN, не часть запроса за CSS.</p><p>Если свежая копия уже есть в кэше браузера, запрос к CDN не нужен. При cache miss CDN идёт за оригиналом в источник.</p>` },
    cookie: { kicker: 'Второй запрос браузера', title: 'API-запрос', body: `<p>После загрузки страницы JavaScript просит данные товара: <code>GET /api/products/{id}</code>. Это один HTTP-запрос. Сессионная cookie, если она есть, передаётся в его заголовке, а не отдельной плашкой или отдельным запросом.</p><p><strong>REST</strong> здесь означает привычный способ назвать ресурс в API: <code>products/42</code> — товар 42, а <code>GET</code> — получить его данные. REST не является ещё одним запросом на линии.</p><p>Для упражнения считаем, что пользователь вошёл раньше через <code>POST /auth/login</code> и получил сессию на пять минут. Она не продлевается автоматически. «Обновить сессию» имитирует <code>POST /auth/refresh</code>; «Получить сессию» — повторный вход. Без сессии API вернёт 401, без прав — 403.</p>` },
    sql: { kicker: 'Обращение к хранилищу', title: 'SQL-запрос', body: `<p>Сервер приложения выполняет <code>SELECT id, name, price FROM products WHERE id = $1</code>. Параметр <code>$1</code> — ID из запроса. Браузер SQL не отправляет.</p><p>Если строка не найдена, база вернёт 0 строк. Это ещё не HTTP 404: ответ клиенту формирует приложение.</p>` },
    'db-result': { kicker: 'Ответ базы / серверу', title: 'Результат SQL', body: `<p>Драйвер базы получает <strong>набор строк и столбцов</strong>. Конкретный формат обмена зависит от СУБД; здесь результат показан таблицей для чтения. Это ещё не HTTP-ответ и не JSON для браузера.</p><p>Сервер приложения получает строку товара или 0 строк, затем сам выбирает HTTP-статус и формирует JSON для клиента.</p>` },
    json: { kicker: 'Формат данных', title: 'JSON в ответе API', body: `<p><strong>JSON</strong> — текстовый формат обмена данными. В ответе API ключ <code>id</code> означает идентификатор, <code>name</code> — название, <code>price</code> — цену. JavaScript в браузере читает эти значения и показывает товар. JSON не является отдельным сетевым устройством или обязательным дополнительным запросом.</p><p>Сначала смотри <strong>HTTP-статус</strong>, затем тело ответа. <code>200 OK</code> не обещает, что внутри правильный товар: тело может быть пустым или содержать <code>error.code: 404</code>. Этот внутренний код не превращает HTTP 200 в HTTP 404.</p><div class="course-article__note"><strong>Что проверять QA</strong><p>Есть ли тело ответа, совпадают ли типы и значения полей с таблицей <code>products</code>, корректно ли клиент обрабатывает ошибку.</p></div>` },
    html: { kicker: 'Ответ на GET /', title: 'HTML', body: `<p><strong>HTML</strong> задаёт структуру страницы: заголовки, текст, области для данных и ссылки на другие ресурсы. В этой схеме выбранный балансировщиком сервер возвращает HTML на <code>GET /</code>.</p><p>Посмотри пример ниже: <code>link href</code> указывает браузеру адрес CSS, а <code>script src</code> — адрес JavaScript. Браузер сам запрашивает эти файлы у CDN. Если HTML получен, но CSS недоступен, структура может остаться видимой без оформления.</p><p><code>X-Served-By</code> здесь — условный заголовок для показа сервера A или B; на реальном сайте его может не быть.</p>` },
    css: { kicker: 'Ресурс страницы', title: 'CSS', body: `<p><strong>CSS</strong> описывает внешний вид HTML: цвета, отступы, размеры и расположение блоков. Браузер загружает <code>style.css</code> по адресу из HTML, здесь — с CDN. Запрос API за товаром от этого не становится запросом CSS.</p><p>Карточка CSS на линии — <strong>ответ с содержимым файла</strong>. Действие «Удалить style.css в источнике» удаляет его оригинал из хранилища. Это не точка остановки запроса: браузер всё ещё может получить старую копию из своего кэша или CDN. Чтобы увидеть ошибку, очисти кэш браузера, включи cache miss на CDN и запусти схему. Повреждение оригинала в этой модели тоже мешает получить пригодный файл при cache miss.</p><p>В примере ниже правило <code>.catalog</code> раскладывает карточки по колонкам, а <code>@media</code> меняет раскладку на узком экране.</p>` },
    js: { kicker: 'Ресурс страницы', title: 'JavaScript', body: `<p><strong>JavaScript</strong> выполняется в браузере и добавляет поведение странице: реагирует на кнопки, запрашивает данные и меняет HTML. В этой модели браузер получает <code>app.js</code> от CDN; уже выполняющийся скрипт отправляет <code>GET /api/products/42</code> через балансировщик.</p><p>Карточка JS на линии — <strong>ответ с содержимым файла</strong>. Действие «Удалить app.js в источнике» удаляет его оригинал из хранилища, а не прерывает текущий запрос как breakpoint. Копии браузера и CDN живут отдельно. Если очистить кэш браузера, включить cache miss CDN и удалить оригинал app.js или отключить источник, новый JS не придёт, локальный кэш не пополнится и запрос API не начнётся.</p><p>В примере ниже <code>fetch</code> получает ответ API, а затем код показывает название товара. При HTTP 200 с пустым телом <code>response.json()</code> завершится ошибкой разбора. При HTTP 200 с <code>error</code> внутри JSON проверка <code>response.ok</code> пройдёт, но нужного <code>product.name</code> не будет.</p><div class="course-article__note"><strong>Что проверить QA</strong><p>Не только HTTP-статус файла, но и ошибки выполнения скрипта, отображение товара и поведение при пустом или ошибочном ответе API.</p></div>` },
    cache: { kicker: 'Повторная загрузка', title: 'Кэш браузера', body: `<p>При первом запуске учебный кэш пуст. Полученные HTML, CSS и JS браузер сохраняет локально. Свежие CSS и JS при повторном запуске берутся из кэша без обращения к CDN. Плашка кэша остаётся тусклой, пока в нём нет ни CSS, ни JS: после неудачного запроса HTML может сохраниться отдельно, но недоступный файл в кэш не записывается. Ниже показано состояние каждого файла.</p><p>В реальном браузере повторное использование зависит от заголовков ответа и срока свежести. При проверке актуальности сервер может ответить <code>304 Not Modified</code> без повторной передачи тела.</p><div class="course-article__note"><strong>Что проверять QA</strong><p>В DevTools → Network сравни загрузку из сети, <code>memory cache</code>, <code>disk cache</code> и результат после очистки кэша.</p></div>` },
    tasks: { kicker: 'Практика / условия', title: 'Задания', body: `<p>Меняй элементы схемы и запускай запросы. «Сброс» восстанавливает схему, выполненные задания сохраняются. В этой учебной модели один сервер выдерживает до 600 одновременных запросов.</p><div id="course-task-list" class="course-task-list"></div>` }
  };
  const examples = {
    request: ['Запрос браузера → сервер:', 'GET / HTTP/1.1', 'Host: site.example', 'Accept: text/html', '', 'Ответ сервера → браузер:', 'HTTP/1.1 200 OK', 'Content-Type: text/html; charset=utf-8', '', '<html>…</html>'],
    'css-get': ['GET /style.css HTTP/1.1', 'Host: cdn.site.example'],
    'js-get': ['GET /app.js HTTP/1.1', 'Host: cdn.site.example'],
    cookie: ['Ранее, до начала упражнения:', 'POST /auth/login HTTP/1.1', 'Content-Type: application/json', '{"login":"student","password":"••••"}', '', 'HTTP/1.1 200 OK', 'Set-Cookie: session=demo123; Max-Age=300; Secure; HttpOnly; SameSite=Lax', '', 'Ручное продление до истечения срока:', 'POST /auth/refresh HTTP/1.1', 'Cookie: session=demo123', '', 'HTTP/1.1 200 OK', 'Set-Cookie: session=demo123; Max-Age=300; Secure; HttpOnly; SameSite=Lax', '', 'Следующий запрос к защищённому API:', 'GET /api/products/42 HTTP/1.1', 'Cookie: session=demo123'],
    sql: ['SELECT id, name, price', 'FROM products', 'WHERE id = $1;', '', 'Параметр $1 = 42'],
    html: ['HTTP/1.1 200 OK', 'Content-Type: text/html; charset=utf-8', '', '<!doctype html>', '<html lang="ru">', '  <head><link rel="stylesheet" href="https://cdn.site.example/style.css"></head>', '  <body>', '    <h1>Каталог</h1>', '    <main id="products">Загрузка товаров…</main>', '    <script defer src="https://cdn.site.example/app.js"></script>', '  </body>', '</html>'],
    css: ['body { margin: 0; font: 16px system-ui; }', '.catalog { display: grid; gap: 16px;', '  grid-template-columns: repeat(3, 1fr); }', '@media (max-width: 700px) {', '  .catalog { grid-template-columns: 1fr; }', '}'],
    js: ['const response = await fetch("/api/products/42");', 'if (!response.ok) throw new Error(`HTTP ${response.status}`);', 'const product = await response.json();', 'document.querySelector("#products").textContent = product.name;'],
    origin: ['GET /app.js HTTP/1.1', 'Host: origin.site.example', '', 'CDN запрашивает оригинал после cache miss.'],
    cache: ['Ключ: GET https://cdn.site.example/style.css', 'Место: HTTP-кэш браузера (память или диск)', 'Ответ: 200 OK, Cache-Control: public, max-age=3600', 'Повтор: браузер может использовать сохранённую копию.', 'Точный файловый путь определяет браузер, а не сайт.']
  };
  function exampleFor(id) {
    if (id === 'client' && !lastRun) return null;
    if (id === 'json' || id === 'client') {
      if (id === 'client' && lastRun && !lastRun.apiSent) return { title: 'Запрос API не отправлен', text: lastRun.documentAvailable ? 'HTML получен, но app.js не загрузился. Код fetch не выполнился, поэтому запроса к API и его HTTP-ответа не было.' : 'HTML не получен. Браузер не дошёл до выполнения JavaScript и не отправил запрос к API.' };
      const app = selectedVia === 'app-b' || (!selectedVia && lastRun?.routes?.[0] === 'app-b') ? 'B' : 'A';
      const apiResponse = apiResponseForCurrentState();
      const failed = apiResponse.code !== '200';
      const error = apiResponse.code === '401' ? 'SESSION_REQUIRED' : apiResponse.code === '403' ? 'ACCESS_DENIED' : apiResponse.code === '404' ? 'PRODUCT_NOT_FOUND' : 'SERVICE_UNAVAILABLE';
      const title = id === 'client' ? 'Что получил браузер от API' : 'Ответ API · JSON';
      if (apiResponse.bodyIssue === 'empty') return { title, text: ['HTTP/1.1 200 OK', 'Content-Length: 0'].join('\n') };
      if (apiResponse.bodyIssue === 'embedded-error') return { title, text: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', JSON.stringify({ error: { code: 404, message: 'PRODUCT_NOT_FOUND' } }, null, 2)].join('\n') };
      return { title, text: failed ? [apiResponse.code === '—' ? 'Ответ HTTP не получен' : 'HTTP/1.1 ' + apiResponse.code, ...(apiResponse.code === '—' ? [] : [...(apiResponse.code === '401' ? ['WWW-Authenticate: Session realm="training"'] : []), 'Content-Type: application/json', '', JSON.stringify({ error, message: apiResponse.label, servedBy: app }, null, 2)])].join('\n') : ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', JSON.stringify({ ...(lastRun?.product || productFor(42)), servedBy: app }, null, 2)].join('\n') };
    }
    if (!examples[id]) return null;
    let title = id === 'request' ? 'Запрос страницы и ответ сервера' : ['css-get', 'js-get'].includes(id) ? 'Запрос браузера к CDN' : id === 'origin' ? 'Запрос CDN к источнику' : id === 'cookie' ? 'Обмен заголовками сессии' : id === 'cache' ? 'Как выглядит запись кэша' : id === 'sql' ? 'SQL, который выполняет сервер' : 'Пример содержимого';
    let text = examples[id].join('\n');
    if (id === 'cookie') text = text.replaceAll('demo123', sessionToken);
    if (id === 'cache') text = [
      `HTML: ${cacheCleared ? 'нет копии' : 'копия сохранена после GET /'}`,
      `style.css: ${hasCachedAsset('css') ? 'есть копия в кэше браузера' : 'нет копии'}`,
      `app.js: ${hasCachedAsset('js') ? 'есть копия в кэше браузера' : 'нет копии'}`,
      '',
      'Место: HTTP-кэш браузера (память или диск).',
      'Копии CDN здесь не показаны: это другой кэш.'
    ].join('\n');
    if (id === 'sql') text = text.replace('Параметр $1 = 42', `Параметр $1 = ${lastRun?.productId || selectedProductId}`);
    if (id === 'cookie' && !hasSession()) text = ['GET /api/products/42 HTTP/1.1', 'Cookie: —', '', 'HTTP/1.1 401 Unauthorized', '', 'Чтобы войти повторно:', 'POST /auth/login HTTP/1.1', 'Content-Type: application/json', '{"login":"student","password":"••••"}', '', 'HTTP/1.1 200 OK', `Set-Cookie: session=${sessionToken}; Max-Age=300; Secure; HttpOnly; SameSite=Lax`].join('\n');
    if (id === 'cookie' && hasSession() && sessionRestricted) text += '\n\nHTTP/1.1 403 Forbidden — сессия есть, права недостаточны';
    if (id === 'html' && lastRun && !lastRun.documentAvailable) return { title: 'HTML не получен', text: 'GET / не вернул доступный HTML. Браузер не может прочитать ссылки на CSS и JS из документа.' };
    if (id === 'html' && lastRun?.documentRoute && !faults.has('html')) text = text.replace('Content-Type: text/html; charset=utf-8', `Content-Type: text/html; charset=utf-8\nX-Served-By: ${lastRun.documentRoute}`);
    if ((id === 'html' && faults.has('html')) || (['css', 'js'].includes(id) && lastRun?.assetOutcomes?.[id]?.state === 'failed')) {
      const cached = id === 'html' ? !cacheCleared : hasCachedAsset(id);
      title = cached ? 'Копия из кэша браузера' : 'Новый файл недоступен';
      text = cached ? `Браузер использует ранее сохранённый ${id.toUpperCase()}:\n\n${text}` : `${id.toUpperCase()}: ${lastRun?.assetOutcomes?.[id]?.reason === 'файл удалён в источнике' ? '404 Not Found' : '503 Service Unavailable'}\nСодержимое файла не получено.`;
    }
    return { title, text };
  }
  function renderExample(id) {
    const host = document.getElementById('course-example');
    const example = exampleFor(id);
    if (!host) return;
    host.hidden = !example;
    if (!example) return;
    host.querySelector('h3').textContent = example.title;
    const code = host.querySelector('code');
    code.replaceChildren();
    for (const line of example.text.split('\n')) {
      const row = document.createElement('span');
      row.className = 'course-example__line';
      const method = line.match(/^(GET|POST|PUT|PATCH|DELETE)\b(.*)$/);
      const status = line.match(/^(HTTP\/\d(?:\.\d)?\s+)(\d{3})(.*)$/);
      const header = line.match(/^([A-Za-z][A-Za-z-]*:)(.*)$/);
      const jsonKey = line.match(/^(\s*)("[^"]+":)(.*)$/);
      if (method) {
        const badge = document.createElement('span');
        badge.className = `course-method course-method--${method[1].toLowerCase()}`;
        badge.textContent = method[1];
        row.append(badge, document.createTextNode(method[2]));
      } else if (status) {
        const badge = document.createElement('span');
        badge.className = `course-status ${Number(status[2]) >= 400 ? 'is-error' : 'is-ok'}`;
        badge.textContent = status[2];
        row.append(document.createTextNode(status[1]), badge, document.createTextNode(status[3]));
      } else if (header) {
        const name = document.createElement('span');
        name.className = 'course-example__header';
        name.textContent = header[1];
        row.append(name, document.createTextNode(header[2]));
      } else if (jsonKey) {
        const name = document.createElement('span');
        name.className = 'course-example__json-key';
        name.textContent = jsonKey[2];
        row.append(document.createTextNode(jsonKey[1]), name, document.createTextNode(jsonKey[3]));
      } else if (id === 'sql' && /\b(SELECT|FROM|WHERE)\b/.test(line)) {
        for (const part of line.split(/\b(SELECT|FROM|WHERE)\b/g)) {
          const token = document.createElement('span');
          if (/^(SELECT|FROM|WHERE)$/.test(part)) token.className = 'course-example__keyword';
          token.textContent = part;
          row.append(token);
        }
      } else {
        if (line.endsWith(':') && !line.startsWith('{')) row.classList.add('is-caption');
        row.textContent = line || '\u00a0';
      }
      code.append(row);
    }
  }
  function renderProductTables() {
    document.querySelectorAll('[data-course-product-table]').forEach(host => { host.innerHTML = productTableMarkup(); });
    const state = document.getElementById('course-db-state');
    if (state) state.textContent = productFor(selectedProductId)
      ? `Товар ${selectedProductId} есть в таблице. Следующий запрос вернёт его данные.`
      : `Для id = ${selectedProductId} строк нет. Следующий запуск покажет, как приложение ответит на пустой результат.`;
  }

  const scroller = document.getElementById('course-scroller');
  const nodeHost = document.getElementById('course-nodes');
  const packetHost = document.getElementById('course-packets');
  const lines = document.getElementById('course-lines');
  const trace = document.getElementById('course-trace');
  const article = document.getElementById('course-article');
  let articleCloseTimer;
  const workspace = document.getElementById('course-workspace');
  const canvas = document.getElementById('course-canvas');
  const resetButton = document.getElementById('course-reset');
  const algorithmRuns = [];
  let algorithmIndex = -1;
  function renderAlgorithm() {
    const panel = document.getElementById('course-algorithm');
    if (!panel) return;
    const run = algorithmRuns[algorithmIndex];
    const steps = panel.querySelector('#course-algorithm-steps');
    const result = panel.querySelector('#course-algorithm-result');
    panel.querySelector('#course-algorithm-count').textContent = run ? `${algorithmIndex + 1} / ${algorithmRuns.length}` : '0 / 0';
    panel.querySelector('#course-algorithm-prev').disabled = algorithmIndex <= 0;
    panel.querySelector('#course-algorithm-next').disabled = algorithmIndex < 0 || algorithmIndex >= algorithmRuns.length - 1;
    panel.querySelector('#course-algorithm-mode').textContent = run?.mode || 'Ожидание запуска';
    steps.replaceChildren();
    for (const step of run?.steps || []) {
      const item = document.createElement('li');
      item.className = 'course-algorithm__step';
      item.dataset.tone = step.tone;
      item.textContent = step.text;
      steps.append(item);
    }
    if (!run) {
      const hint = document.createElement('li');
      hint.className = 'course-algorithm__step is-idle';
      hint.textContent = 'Загрузи страницу — здесь появится путь запроса и ответа.';
      steps.append(hint);
    }
    result.hidden = !run?.result;
    if (run?.result) {
      result.textContent = run.result.text;
      result.dataset.tone = run.result.tone;
    }
  }
  function resetAlgorithm() {
    algorithmRuns.length = 0;
    algorithmIndex = -1;
    renderAlgorithm();
  }
  function startAlgorithm(mode) {
    algorithmRuns.push({ mode, steps: [], result: null });
    if (algorithmRuns.length > 10) algorithmRuns.shift();
    algorithmIndex = algorithmRuns.length - 1;
    renderAlgorithm();
    save();
  }
  function algorithmStep(tone, message) {
    algorithmRuns.at(-1).steps.push({ tone, text: message });
    const steps = document.getElementById('course-algorithm-steps');
    if (steps && algorithmIndex === algorithmRuns.length - 1) {
      steps.querySelector('.is-idle')?.remove();
      const item = document.createElement('li');
      item.className = 'course-algorithm__step is-new';
      item.dataset.tone = tone;
      item.textContent = message;
      steps.append(item);
    }
    save();
  }
  function finishAlgorithm(code, label, tone) {
    algorithmRuns.at(-1).result = { text: `Итог: ${code} · ${label}`, tone };
    renderAlgorithm();
    save();
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const revealed = new Set(nodes.map(node => node.id));
  const shownPackets = new Set();
  let selected = '';
  let networkSelected = '';
  let selectedVia = null;
  let removed = false;
  const SESSION_MS = 5 * 60 * 1000;
  let sessionExpiresAt = Date.now() + SESSION_MS;
  let sessionToken = 'demo123';
  let sessionRestricted = false;
  function hasSession() { return sessionExpiresAt > Date.now(); }
  function rotateSessionToken() {
    let suffix;
    do { suffix = String(crypto.getRandomValues(new Uint16Array(1))[0] % 1000).padStart(3, '0'); }
    while (`demo${suffix}` === sessionToken);
    sessionToken = `demo${suffix}`;
  }
  let cacheCleared = true;
  const cachedAssets = new Map();
  const ASSET_CACHE_MS = 60 * 60 * 1000;
  function hasCachedAsset(id) { return (cachedAssets.get(id) || 0) > Date.now(); }
  let cdnBypass = false;
  let productMode = 'normal';
  let lastResponse = null;
  let lastRun = null;
  const LOAD_OPTIONS = new Set([1, 100, 500, 1000]);
  let configuredRequests = 1;
  let remainingRequests = null;
  let pageLoaded = false;
  const runHistory = [];
  const completedTasks = new Set();
  let liveRoutes = null;
  let savedPosition = null;
  const faults = new Map();
  const taskDefinitions = [
    { id: 'status-200', title: '200 · страница и данные получены', hint: 'Оставь серверы, базу и источник файлов включёнными. Получи действующую сессию, загрузи или обнови страницу и открой «Данные API» в Network клиента: там должны быть HTTP 200 и товар.' },
    { id: 'status-401', title: '401 · нет действующей сессии', hint: 'Сначала загрузи страницу. Затем открой «API · запрос» на линии и нажми «Удалить сессию» либо дождись конца пяти минут. Обнови страницу: HTML загрузится, но защищённый API ответит 401.' },
    { id: 'status-403', title: '403 · доступ запрещён', hint: 'В «API · запрос» сначала получи действующую сессию, затем нажми «Ограничить права». Обнови страницу: cookie уйдёт в API-запросе, но сервер вернёт 403.' },
    { id: 'status-404', title: '404 · ресурс не найден', hint: 'Для ошибки документа открой HTML и нажми «Удалить HTML на сервере», затем очисти кэш браузера. Следующая загрузка получит 404 для GET /. Другой вариант: запроси ID товара, которого нет в таблице, в обычном режиме API.' },
    { id: 'status-503', title: '503 · API недоступен', hint: 'Открой базу данных и нажми «Отключить базу». При действующей сессии обнови страницу: документ может прийти с 200, а запрос данных API завершится 503.' },
    { id: 'status-none', title: 'Нет HTTP-ответа', hint: 'Отключи балансировщик и останови сервер A. Теперь у клиента нет доступного маршрута: после запуска схема покажет отсутствие HTTP-ответа.' },
    { id: 'status-cache', title: '200 · файлы из кэша браузера', hint: 'Сначала загрузи страницу и сохрани CSS и JS. Затем отключи CDN, не очищая кэш браузера, и обнови страницу: файлы придут из локальной копии.' },
    { id: 'first-css', title: 'Запроси CSS у CDN', hint: 'Очисти кэш браузера и загрузи страницу: браузер отправит отдельный GET style.css.' },
    { id: 'css-cache', title: 'Загрузи CSS из кэша браузера', hint: 'Сначала загрузи страницу, затем отключи CDN и обнови её без очистки кэша браузера.' },
    { id: 'origin-miss', title: 'Получи CSS и JS из источника', hint: 'Очисти кэш браузера, включи cache miss на CDN и обнови страницу при работающем источнике.' },
    { id: 'missing-js', title: 'Найди пропавший JavaScript', hint: 'Очисти кэш браузера, включи cache miss на CDN, удали app.js в источнике и обнови страницу.' },
    { id: 'cdn-copy', title: 'Получи JS из копии CDN', hint: 'Удали app.js в источнике, очисти кэш браузера, верни cache hit на CDN и обнови страницу.' },
    { id: 'origin-offline', title: 'Проверь недоступный источник', hint: 'Очисти кэш браузера, включи cache miss на CDN, отключи источник файлов и обнови страницу.' },
    { id: 'empty-body', title: '200 · пустое тело ответа', hint: 'Выбери ID товара в Network клиента, открой базу и удали эту строку. Оставь режим «Пустое тело 200», обнови страницу и сравни HTTP-статус с вкладкой «Ответ».' },
    { id: 'body-error', title: '200 · ошибка внутри JSON', hint: 'Выбери ID товара в Network клиента, удали его из базы и переключи режим на «Ошибка в теле 200». Обнови страницу: HTTP покажет 200, а в JSON окажется error.code: 404.' },
    { id: 'route-b', title: 'Переведи запрос на сервер B', hint: 'Останови A при работающем балансировщике и обнови страницу.' },
    { id: 'balanced-load', title: 'Распредели 1000 запросов', hint: 'Оба сервера должны работать: балансировщик отправит по 500 каждому.' },
    { id: 'overload-a', title: 'Перегрузи сервер A', hint: 'Отключи балансировщик и отправь 1000 запросов напрямую.' },
    { id: 'failover-b', title: 'Продолжи работу через B', hint: 'После падения A восстанови балансировщик и запусти схему ещё раз.' },
    { id: 'overload-b', title: 'Перегрузи сервер B', hint: 'Оставь B единственным доступным сервером и отправь 1000 запросов.' }
  ];
  function renderTasks() {
    const host = document.getElementById('course-task-list');
    if (!host) return;
    host.replaceChildren();
    for (const task of taskDefinitions) {
      const item = document.createElement('div');
      item.className = 'course-task';
      item.classList.toggle('is-complete', completedTasks.has(task.id));
      const title = document.createElement('strong');
      title.textContent = `${completedTasks.has(task.id) ? '✓ ' : ''}${task.title}`;
      const hint = document.createElement('span');
      hint.textContent = task.hint;
      item.append(title, hint);
      host.append(item);
    }
  }
  function evaluateTasks(result) {
    const routes = result.routes;
    if (lastResponse?.code === '200' && lastResponse.mode === 'ok' && !lastResponse.bodyIssue && result.apiSent) completedTasks.add('status-200');
    if (lastResponse?.code === '401') completedTasks.add('status-401');
    if (lastResponse?.code === '403') completedTasks.add('status-403');
    if (lastResponse?.code === '404') completedTasks.add('status-404');
    if (lastResponse?.code === '503' && result.apiSent && result.apiResult?.code === '503') completedTasks.add('status-503');
    if (lastResponse?.code === '—' && !result.usedBalancer && faults.has('app-a')) completedTasks.add('status-none');
    if (lastResponse?.code === '200' && ['css', 'js'].every(file => result.assetOutcomes?.[file]?.source === 'browser') && result.assetsOffline) completedTasks.add('status-cache');
    if (result.usedBalancer && routes.length === 1 && routes[0] === 'app-b') completedTasks.add('route-b');
    if (result.documentAvailable && result.assetOutcomes?.css?.source === 'cdn') completedTasks.add('first-css');
    if (result.documentAvailable && result.assetOutcomes?.css?.source === 'browser' && result.assetsOffline) completedTasks.add('css-cache');
    if (result.documentAvailable && ['css', 'js'].every(id => result.assetOutcomes?.[id]?.source === 'origin' && result.assetOutcomes[id].state === 'ok')) completedTasks.add('origin-miss');
    if (result.documentAvailable && result.assetOutcomes?.js?.state === 'failed' && faults.get('js') === 'missing' && result.originMiss) completedTasks.add('missing-js');
    if (result.documentAvailable && result.assetOutcomes?.js?.source === 'cdn' && faults.get('js') === 'missing') completedTasks.add('cdn-copy');
    if (result.originOffline && Object.values(result.assetOutcomes || {}).some(outcome => outcome.state === 'failed')) completedTasks.add('origin-offline');
    if (result.apiSent && result.productMode === 'empty' && lastResponse?.bodyIssue === 'empty') completedTasks.add('empty-body');
    if (result.apiSent && result.productMode === 'embedded-error' && lastResponse?.bodyIssue === 'embedded-error') completedTasks.add('body-error');
    if (result.requestCount === 1000 && result.counts['app-a'] === 500 && result.counts['app-b'] === 500 && !result.overloaded.length) completedTasks.add('balanced-load');
    if (result.requestCount === 1000 && !result.usedBalancer && result.overloaded.includes('app-a')) completedTasks.add('overload-a');
    if (result.requestCount === 1000 && result.overloaded.includes('app-b')) completedTasks.add('overload-b');
    if (routes.includes('app-b') && runHistory.slice(0, -1).some(previous => previous.overloaded.includes('app-a'))) completedTasks.add('failover-b');
    renderTasks();
    save();
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.layout === 5 && Number.isFinite(saved.camera?.x) && Number.isFinite(saved.camera?.y) && Math.abs((saved.camera?.width ?? 0) - window.innerWidth) < 60) savedPosition = saved.camera;
    const knownTasks = new Set(taskDefinitions.map(task => task.id));
    if (Array.isArray(saved.completedTasks)) {
      for (const id of saved.completedTasks) if (knownTasks.has(id)) completedTasks.add(id);
    }
    for (const [id, expiry] of Object.entries(saved.cachedAssets || {})) {
      if (['css', 'js'].includes(id) && Number.isFinite(expiry) && expiry > Date.now()) cachedAssets.set(id, expiry);
    }
    cacheCleared = !saved.htmlCached;
    removed = !!saved.removed;
    sessionExpiresAt = Number.isFinite(saved.sessionExpiresAt) ? saved.sessionExpiresAt : saved.cookieCleared ? 0 : sessionExpiresAt;
    if (typeof saved.sessionToken === 'string' && /^demo\d{3}$/.test(saved.sessionToken)) sessionToken = saved.sessionToken;
    sessionRestricted = !!saved.sessionRestricted;
    cdnBypass = !!saved.cdnBypass;
    if (['empty', 'embedded-error'].includes(saved.productMode)) productMode = saved.productMode;
    if (Number.isInteger(saved.selectedProductId) && saved.selectedProductId >= 1 && saved.selectedProductId <= 9999) selectedProductId = saved.selectedProductId;
    if (Array.isArray(saved.extraProducts)) for (const product of saved.extraProducts.slice(0, 12)) {
      if (Number.isInteger(product?.id) && product.id >= 47 && product.id <= 9999 && typeof product.name === 'string' && Number.isFinite(product.price)) extraProducts.push(product);
    }
    if (Array.isArray(saved.deletedProducts)) {
      for (const id of saved.deletedProducts) if (Number.isInteger(id)) deletedProducts.add(id);
    } else if (saved.productMode && saved.productMode !== 'normal') deletedProducts.add(42);
    configuredRequests = LOAD_OPTIONS.has(saved.configuredRequests) ? saved.configuredRequests : 1;
    pageLoaded = saved.pageLoaded === true;
    if (Array.isArray(saved.faults)) for (const [id, value] of saved.faults) {
      if (byId.has(id) || ['html', 'css', 'js'].includes(id)) faults.set(id, value);
    }
    if (saved.lastResponse && typeof saved.lastResponse.code === 'string') lastResponse = saved.lastResponse;
    if (saved.lastRun && Array.isArray(saved.lastRun.routes) && Array.isArray(saved.lastRun.overloaded)) lastRun = saved.lastRun;
    if (Array.isArray(saved.shownPackets)) {
      for (const id of saved.shownPackets) if (packets.some(packet => packet.id === id)) shownPackets.add(id);
      // Older progress stored the replies but may lack the newly separated requests.
      for (const file of ['css', 'js']) {
        if (saved.shownPackets.includes('asset-get') || shownPackets.has(file)) shownPackets.add(`${file}-get`);
      }
    } else if (lastRun) {
      // Existing courses predate per-packet visibility; keep their explored map intact.
      for (const packet of packets) shownPackets.add(packet.id);
    }
    if (Array.isArray(saved.runHistory)) runHistory.push(...saved.runHistory.filter(item => item && Array.isArray(item.overloaded)).slice(-10));
    if (Array.isArray(saved.algorithm)) {
      for (const run of saved.algorithm.slice(-10)) {
        if (typeof run?.mode !== 'string' || !Array.isArray(run.steps)) continue;
        algorithmRuns.push({ mode: run.mode, steps: run.steps.filter(step => typeof step?.text === 'string').map(step => ({ tone: step.tone, text: step.text })), result: typeof run.result?.text === 'string' ? run.result : null });
      }
    } else if (Array.isArray(saved.algorithm?.steps)) {
      // Старый общий журнал делим по заголовкам запусков.
      for (const step of saved.algorithm.steps) {
        if (typeof step?.text !== 'string') continue;
        if (step.kind === 'heading') algorithmRuns.push({ mode: step.text, steps: [], result: null });
        else if (step.kind === 'result' && algorithmRuns.length) algorithmRuns.at(-1).result = { text: step.text, tone: step.tone };
        else if (step.kind === 'step') {
          if (!algorithmRuns.length) algorithmRuns.push({ mode: 'Предыдущий запуск', steps: [], result: null });
          algorithmRuns.at(-1).steps.push({ tone: step.tone, text: step.text });
        }
      }
      if (algorithmRuns.length && saved.algorithm.result) algorithmRuns.at(-1).result = saved.algorithm.result;
      if (algorithmRuns.length > 10) algorithmRuns.splice(0, algorithmRuns.length - 10);
    }
    algorithmIndex = algorithmRuns.length - 1;
  } catch {}

  const motion = window.createMapMotion({
    viewport: scroller,
    canvas,
    getContentBounds: () => {
      const visible = nodes.filter(node => revealed.has(node.id));
      return {
        left: Math.min(540, ...visible.map(node => node.x)),
        top: Math.min(190, ...visible.map(node => node.y)),
        right: Math.max(950, ...visible.map(node => node.x + 292)),
        bottom: Math.max(810, ...visible.map(node => node.y + 122))
      };
    },
    onChange: () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 220);
    }
  });
  let saveTimer;

  function hasResettableProgress() {
    return !!(pageLoaded || lastRun || lastResponse || runHistory.length || algorithmRuns.length || faults.size || removed || sessionRestricted || !hasSession() || !cacheCleared || cachedAssets.size || cdnBypass || productMode !== 'normal' || deletedProducts.size || extraProducts.length || selectedProductId !== 42 || configuredRequests !== 1);
  }
  function syncResetButton() { resetButton.disabled = !hasResettableProgress(); }
  function save() {
    syncResetButton();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: 5, camera: { ...motion.snapshot(), width: window.innerWidth }, completedTasks: [...completedTasks], shownPackets: [...shownPackets], cachedAssets: Object.fromEntries(cachedAssets), htmlCached: !cacheCleared, removed, sessionExpiresAt, sessionToken, sessionRestricted, cdnBypass, productMode, selectedProductId, deletedProducts: [...deletedProducts], extraProducts, configuredRequests, pageLoaded, faults: [...faults], lastResponse, lastRun, runHistory: runHistory.slice(-10), algorithm: algorithmRuns.slice(-10) })); } catch {}
  }
  function activeApp() {
    if (!faults.has('app-a')) return 'app-a';
    return !removed && !faults.has('app-b') ? 'app-b' : null;
  }
  function staticUnavailable() { return faults.has('assets') || (cdnBypass && faults.has('storage')); }
  function assetSource(file) {
    if (hasCachedAsset(file)) return { state: 'ok', source: 'browser' };
    if (faults.has('assets')) return { state: 'failed', source: 'cdn', reason: 'CDN отключён' };
    if (!cdnBypass) return { state: 'ok', source: 'cdn' };
    if (faults.has('storage')) return { state: 'failed', source: 'origin', reason: 'источник отключён' };
    if (faults.has(file)) return { state: 'failed', source: 'origin', reason: faults.get(file) === 'missing' ? 'файл удалён в источнике' : 'файл повреждён в источнике' };
    return { state: 'ok', source: 'origin' };
  }
  function displayRoutes() { return liveRoutes === null ? [activeApp()].filter(Boolean) : liveRoutes; }
  function syncPacketRoutes() {
    const route = displayRoutes()[0];
    for (const id of ['request', 'html', 'cookie', 'json']) packets.find(packet => packet.id === id).edge = ['client', removed ? 'app-a' : 'balancer'];
    if (!route) return;
    for (const packet of packets) {
      if (packet.id === 'sql' || packet.id === 'db-result') packet.edge = [route, 'database'];
    }
  }
  function packetVisible(packet) {
    return shownPackets.has(packet.id) && (!packet.edge || packet.edge.every(id => revealed.has(id)));
  }
  function pathBetween(from, to) {
    const startX = from.x + 284, startY = from.y + 91;
    const endX = to.x + 8, endY = to.y + 91;
    const mid = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${mid} ${startY}, ${mid} ${endY}, ${endX} ${endY}`;
  }
  let lineTracking = 0;
  const activeTraces = new Set();
  function trackLines(duration = 600) {
    cancelAnimationFrame(lineTracking);
    const until = performance.now() + duration;
    function tick() {
      if (!lines.classList.contains('is-resetting')) drawLines();
      if (performance.now() < until) lineTracking = requestAnimationFrame(tick);
      else lineTracking = 0;
    }
    lineTracking = requestAnimationFrame(tick);
  }
  function layoutNodes() {
    const requiredGap = (source, target) => {
      const baseGap = baseX.get(target) - baseX.get(source) - 292;
      const visible = packets.filter(packet => packet.edge?.[0] === source && packet.edge?.[1] === target);
      const width = visible.reduce((sum, packet) => sum + Math.max(66, packet.title.length * 7 + 16), 0);
      return Math.max(0, width + Math.max(0, visible.length - 1) * 24 + (visible.length ? 48 : 0) - baseGap,
        source === 'client' && target === 'balancer' && revealed.has('balancer') && !removed ? 280 - baseGap : 0);
    };
    const first = requiredGap('client', 'balancer');
    const route = displayRoutes()[0] || 'app-a';
    const second = requiredGap('balancer', route);
    const staticGap = Math.max(requiredGap('client', 'assets'), 450 - (baseX.get('assets') - baseX.get('client') - 292));
    const shift = { client: 0, balancer: first, 'app-a': first + second, 'app-b': first + second,
      database: first + second, assets: staticGap, storage: staticGap };
    let moved = false;
    for (const node of nodes) {
      const next = baseX.get(node.id) + shift[node.id];
      if (node.x === next) continue;
      node.x = next;
      nodeHost.querySelector(`[data-node="${node.id}"]`).style.left = `${next}px`;
      moved = true;
    }
    if (moved) trackLines();
  }
  function visualNode(node) {
    const element = nodeHost.querySelector(`[data-node="${node.id}"]`);
    return { ...node, x: element ? parseFloat(getComputedStyle(element).left) : node.x };
  }
  function positionPacket(marker, item, edge) {
    const geometry = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    geometry.setAttribute('d', pathBetween(visualNode(byId.get(edge[0])), visualNode(byId.get(edge[1]))));
    const length = geometry.getTotalLength();
    const point = geometry.getPointAtLength(length * item.t);
    marker.style.left = `${point.x - marker.offsetWidth / 2}px`;
    marker.style.top = `${point.y - marker.offsetHeight / 2}px`;
    const arrow = marker.querySelector('.course-packet__arrow');
    if (!arrow) return;
    const arrowT = Math.max(.02, Math.min(.98, item.t + (item.flow === 'response' ? -.12 : .12)));
    const arrowPoint = geometry.getPointAtLength(length * arrowT);
    const before = geometry.getPointAtLength(length * Math.max(0, arrowT - .01));
    const after = geometry.getPointAtLength(length * Math.min(1, arrowT + .01));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + (item.flow === 'response' ? 180 : 0);
    arrow.style.left = `${arrowPoint.x - parseFloat(marker.style.left) - 9.5}px`;
    arrow.style.top = `${arrowPoint.y - parseFloat(marker.style.top) - 9.5}px`;
    arrow.style.setProperty('--packet-angle', `${angle}deg`);
  }
  function drawLines() {
    lines.replaceChildren();
    const selectedPacketId = networkSelected || selected;
    const selectedPacket = packets.find(packet => packet.id === selectedPacketId);
    const routes = displayRoutes();
    for (const [source, target] of edges) {
      if (!revealed.has(source) || !revealed.has(target)) continue;
      if (removed && source === 'client' && target === 'balancer') continue;
      if (removed && source === 'balancer') continue;
      if (source === 'balancer' && !routes.includes(target)) continue;
      if ((source === 'app-a' || source === 'app-b') && !routes.includes(source) && !(source === 'app-b' && target === 'database')) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathBetween(visualNode(byId.get(source)), visualNode(byId.get(target))));
      if (faults.has(source) || faults.has(target) || (source === 'client' && target === 'assets' && ['css', 'js'].some(id => assetSource(id).state === 'failed')) || (source === 'client' && target === 'balancer' && faults.has('html'))) path.classList.add('is-faulty');
      if (source === 'assets' || target === 'assets' || source === 'storage') path.classList.add('is-resource-route');
      if (source === 'assets' && target === 'storage' && !cdnBypass) path.classList.add('is-idle');
      if (source === 'app-b' && target === 'database' && !routes.includes('app-b')) path.classList.add('is-available-route');
      const selectedEdge = !networkSelected && selectedVia === 'app-b' && selectedPacket?.edge && selectedPacket.edge.includes('app-a')
        ? selectedPacket.edge.map(id => id === 'app-a' ? 'app-b' : id)
        : selectedPacket?.edge;
      if (selectedEdge?.[0] === source && selectedEdge[1] === target) {
        path.classList.add('is-active-route');
        if (resourcePackets.has(selectedPacketId)) path.classList.add('is-resource-route');
        if (selectedPacket.flow === 'response') path.classList.add('is-return-route');
      }
      lines.append(path);
    }
    if (revealed.has('app-a') && revealed.has('app-b')) {
      const serverA = visualNode(byId.get('app-a'));
      const serverB = visualNode(byId.get('app-b'));
      const x = serverA.x + 266;
      const top = serverA.y + 122;
      const bottom = serverB.y + 56;
      const middle = (top + bottom) / 2;
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('course-no-link');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = 'Серверы A и B не обмениваются запросами напрямую';
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.classList.add('course-no-link__line');
      line.setAttribute('d', `M ${x} ${top} L ${x} ${bottom}`);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', middle);
      circle.setAttribute('r', 12);
      const cross = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      cross.classList.add('course-no-link__cross');
      cross.setAttribute('d', `M ${x - 4} ${middle - 4} L ${x + 4} ${middle + 4} M ${x + 4} ${middle - 4} L ${x - 4} ${middle + 4}`);
      group.append(title, line, circle, cross);
      lines.append(group);
    }
    if (removed && revealed.has('app-a')) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathBetween(visualNode(byId.get('client')), visualNode(byId.get('app-a'))));
      path.classList.add('is-direct');
      if (faults.has('app-a') || faults.has('html')) path.classList.add('is-faulty');
      if (selectedPacket?.edge?.[0] === 'client' && selectedPacket.edge[1] === 'app-a') {
        path.classList.add('is-active-route');
        if (resourcePackets.has(selected)) path.classList.add('is-resource-route');
        if (selectedPacket.flow === 'response') path.classList.add('is-return-route');
      }
      lines.append(path);
    }
    if (revealed.has('assets')) {
      const client = visualNode(byId.get('client'));
      const cache = packetHost.querySelector('[data-packet="cache"]');
      const cacheCenterX = client.x - 60;
      const cacheCenterY = client.y + 87;
      cache.style.left = `${cacheCenterX - cache.offsetWidth / 2}px`;
      cache.style.top = `${cacheCenterY - cache.offsetHeight / 2}px`;
      if (!cacheCleared || hasCachedAsset('css') || hasCachedAsset('js')) {
        const localPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cacheRight = cacheCenterX + cache.offsetWidth / 2;
        localPath.setAttribute('d', `M ${cacheRight} ${cacheCenterY} C ${cacheRight + 12} ${cacheCenterY}, ${client.x - 12} ${client.y + 91}, ${client.x} ${client.y + 91}`);
        localPath.classList.add('is-local', 'is-resource-route');
        localPath.dataset.courseLocalCache = '';
        if (selected === 'cache') localPath.classList.add('is-active-route');
        lines.append(localPath);
      }
    }
    for (const item of packets) {
      if (!item.edge) continue;
      const marker = packetHost.querySelector(`[data-packet="${item.id}"]`);
      if (!marker) continue;
      positionPacket(marker, item, item.edge);
    }
    for (const marker of packetHost.querySelectorAll('[data-parallel-packet]')) {
      const item = packets.find(packet => packet.id === marker.dataset.parallelPacket);
      if (item) positionPacket(marker, item, ['app-b', 'database']);
    }
    for (const item of activeTraces) {
      item.path.setAttribute('d', pathBetween(visualNode(byId.get(item.from)), visualNode(byId.get(item.to))));
    }
  }
  function setLiveRoutes(routes) {
    packetHost.querySelectorAll('[data-parallel-packet]').forEach(marker => marker.remove());
    if (!routes?.length || routes.length < 2) selectedVia = null;
    liveRoutes = routes;
    if (routes?.length === 2) {
      for (const id of ['sql', 'db-result']) {
        const original = packetHost.querySelector(`[data-packet="${id}"]`);
        const copy = original.cloneNode(true);
        copy.removeAttribute('data-packet');
        copy.dataset.parallelPacket = id;
        copy.hidden = !shownPackets.has(id);
        copy.classList.toggle('is-visible', shownPackets.has(id));
        copy.classList.remove('is-selected');
        copy.addEventListener('click', () => showArticle(id, 'app-b'));
        packetHost.append(copy);
      }
    }
    update();
    save();
  }
  function showPackets(ids) {
    let changed = false;
    for (const id of ids) {
      if (shownPackets.has(id)) continue;
      shownPackets.add(id);
      changed = true;
    }
    if (changed) { update(); save(); }
  }
  const pulsedPackets = new Set();
  function pulse(source, target, packetIds = null, channel = 'api') {
    if (packetIds?.length) showPackets(packetIds);
    if (reducedMotion.matches) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const reverse = edges.some(([from, to]) => from === target && to === source) || (source === 'app-a' && target === 'client');
    const from = reverse ? target : source;
    const to = reverse ? source : target;
    const active = { path, from, to };
    activeTraces.add(active);
    path.setAttribute('d', pathBetween(visualNode(byId.get(from)), visualNode(byId.get(to))));
    path.classList.add('course-trace__path');
    if (channel === 'resource') path.classList.add('is-resource-trace');
    if (faults.has(source) || faults.has(target) || (source === 'client' && target === 'assets' && staticUnavailable())) path.classList.add('is-faulty');
    if (reverse) path.classList.add('is-returning');
    trace.append(path);
    window.setTimeout(() => { path.remove(); activeTraces.delete(active); }, 1900);
    if (target === 'balancer') {
      const run = playRun;
      window.setTimeout(() => {
        if (run !== playRun) return;
        const card = nodeHost.querySelector('[data-node="balancer"] .questions-map-card__question');
        card.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-flowing-resource');
        void card.offsetWidth;
        if (channel === 'resource') card.classList.add('is-flowing-resource');
        card.classList.add(source === 'client' ? 'is-flowing-forward' : 'is-flowing-back');
        window.setTimeout(() => card.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-flowing-resource'), 760);
      }, source === 'client' ? 300 : 200);
    }
    for (const packet of packets) {
      if (packetIds && !packetIds.includes(packet.id)) continue;
      if (!packet.edge || !((packet.edge[0] === source && packet.edge[1] === target && packet.flow === 'request') || (packet.edge[0] === target && packet.edge[1] === source && packet.flow === 'response'))) continue;
      if ((packet.id === 'html' && faults.has('html')) || (['css', 'js'].includes(packet.id) && assetSource(packet.id).state === 'failed')) continue;
      if (pulsedPackets.has(packet.id)) continue;
      const element = packetHost.querySelector(`[data-packet="${packet.id}"]`);
      if (!element || element.hidden) continue;
      pulsedPackets.add(packet.id);
      element.classList.remove('is-transiting', 'is-transiting-resource');
      void element.offsetWidth;
      element.classList.add('is-transiting');
      if (channel === 'resource') element.classList.add('is-transiting-resource');
      window.setTimeout(() => element.classList.remove('is-transiting', 'is-transiting-resource'), 1100);
    }
    for (const marker of packetHost.querySelectorAll('[data-parallel-packet]')) {
      const packet = packets.find(item => item.id === marker.dataset.parallelPacket);
      if (packetIds && !packetIds.includes(packet.id)) continue;
      const edge = ['app-b', 'database'];
      if (!((edge[0] === source && edge[1] === target && packet.flow === 'request') || (edge[0] === target && edge[1] === source && packet.flow === 'response'))) continue;
      if (pulsedPackets.has(`${packet.id}:app-b`)) continue;
      pulsedPackets.add(`${packet.id}:app-b`);
      marker.classList.remove('is-transiting');
      void marker.offsetWidth;
      marker.classList.add('is-transiting');
      window.setTimeout(() => marker.classList.remove('is-transiting'), 1100);
    }
  }
  function centerOn(ids, smooth = true) {
    const targets = ids.map(id => nodeHost.querySelector(`[data-node="${id}"]`)).filter(Boolean);
    if (!targets.length) return;
    const x = targets.reduce((sum, node) => { const pill = node.querySelector('.questions-map-card__question'); return sum + node.offsetLeft + pill.offsetLeft + pill.offsetWidth / 2; }, 0) / targets.length;
    const y = targets.reduce((sum, node) => { const pill = node.querySelector('.questions-map-card__question'); return sum + node.offsetTop + pill.offsetTop + pill.offsetHeight / 2; }, 0) / targets.length;
    motion.focus(x, y, smooth);
  }
  function focusElement(id, smooth = true) {
    if (byId.has(id)) { centerOn([id], smooth); return; }
    const packet = selectedVia === 'app-b'
      ? packetHost.querySelector(`[data-parallel-packet="${id}"]`)
      : packetHost.querySelector(`[data-packet="${id}"]`);
    if (!packet || packet.hidden) return;
    motion.focus(packet.offsetLeft + packet.offsetWidth / 2, packet.offsetTop + packet.offsetHeight / 2, smooth);
  }
  function update() {
    syncPacketRoutes();
    layoutNodes();
    for (const node of nodes) {
      const element = nodeHost.querySelector(`[data-node="${node.id}"]`);
      const visible = revealed.has(node.id);
      if (visible) element.hidden = false;
      else if (!element.hidden) {
        element.classList.add('is-hiding');
        window.setTimeout(() => {
          if (!revealed.has(node.id)) element.hidden = true;
          element.classList.remove('is-hiding');
        }, 380);
      }
      element.classList.toggle('is-visible', visible);
      element.classList.toggle('is-selected', selected === node.id);
      element.classList.toggle('is-removed', node.id === 'balancer' && removed);
      element.classList.toggle('is-cache-miss', node.id === 'assets' && cdnBypass);
      element.classList.toggle('is-faulty', faults.has(node.id) || (node.id === 'assets' && ['css', 'js'].some(id => assetSource(id).state === 'failed')));
      element.classList.toggle('is-overloaded', faults.get(node.id) === 'overload');
    }
    for (const item of packets) {
      const element = packetHost.querySelector(`[data-packet="${item.id}"]`);
      const visible = packetVisible(item);
      if (visible) element.hidden = false;
      else if (!element.hidden) {
        element.classList.add('is-hiding');
        window.setTimeout(() => {
          if (!packetVisible(item)) element.hidden = true;
          element.classList.remove('is-hiding');
        }, 380);
      }
      element.classList.toggle('is-visible', visible);
      element.classList.toggle('is-selected', (selected === item.id && selectedVia !== 'app-b') || networkSelected === item.id);
      element.classList.toggle('is-faulty', (['css', 'js'].includes(item.id) ? assetSource(item.id).state === 'failed' : faults.has(item.id)) || (item.id === 'origin' && faults.has('storage')));
      element.classList.toggle('is-empty-cache', item.id === 'cache' && !hasCachedAsset('css') && !hasCachedAsset('js'));
      element.classList.toggle('is-partial-cache', item.id === 'cache' && hasCachedAsset('css') !== hasCachedAsset('js'));
    }
    packetHost.querySelectorAll('[data-parallel-packet]').forEach(element => {
      const visible = shownPackets.has(element.dataset.parallelPacket);
      element.hidden = !visible;
      element.classList.toggle('is-visible', visible);
      element.classList.toggle('is-selected', selected === element.dataset.parallelPacket && selectedVia === 'app-b');
    });
    renderClientPreview();
    if (selected) renderExample(selected);
    if (!lines.classList.contains('is-resetting')) drawLines();
  }
  function responseForCurrentState() {
    const cached = !cacheCleared;
    const staticFailure = staticUnavailable();
    const failedFile = ['js', 'css'].find(file => lastRun?.assetOutcomes?.[file]?.state === 'failed');
    if (failedFile && lastRun?.documentAvailable) {
      const outcome = lastRun.assetOutcomes[failedFile];
      const fileName = failedFile === 'js' ? 'app.js' : 'style.css';
      const code = outcome.reason === 'файл удалён в источнике' ? '404' : outcome.source === 'cdn' ? '—' : '503';
      return { code, label: failedFile === 'js' ? 'JavaScript не загружен' : 'CSS не загружен', mode: failedFile === 'js' ? 'partial' : 'unstyled', detail: `${fileName} не получен: ${outcome.reason}. ${failedFile === 'js' ? 'Запрос API не отправлен.' : 'HTML виден без оформления.'} В локальный кэш этот файл не записан.` };
    }
    if (faults.has('html')) {
      if (cached) return { code: '200', label: 'HTML из кэша', mode: 'cached', detail: 'Исходный HTML недоступен или повреждён, но браузер показывает сохранённую копию. После очистки кэша понадобится новый сетевой ответ.' };
      if (faults.get('html') === 'missing') return { code: '404', label: 'Нет страницы', mode: 'broken', detail: 'HTML-файл удалён и копии в кэше нет. Запрос документа получает 404, поэтому страница не строится.' };
      return { code: '200', label: 'HTML повреждён', mode: 'broken', detail: 'Сервер прислал HTML с кодом 200, но повреждённая разметка отображается неправильно. Успешный HTTP-статус не гарантирует исправный экран.' };
    }
    if (removed && faults.has('app-a')) return { code: '—', label: 'Нет ответа', mode: 'broken', detail: 'Балансировщик отключён, а единственный маршрут ведёт к упавшему серверу A. Ответ HTTP не пришёл: браузер видит ошибку соединения или тайм-аут. Сохранённая страница может оставаться на экране.' };
    if (!removed && faults.has('app-a') && faults.has('app-b')) return { code: '503', label: 'Нет приложения', mode: 'broken', detail: 'Оба сервера приложения недоступны. В этой учебной модели балансировщик возвращает 503; сохранённые файлы интерфейса не делают API рабочим.' };
    if (lastRun?.apiSent && lastRun.routes.length && lastRun.routes.every(id => lastRun.overloaded.includes(id) && faults.get(id) === 'overload')) return lastRun.usedBalancer
      ? { code: '503', label: 'Сервер перегружен', mode: 'broken', detail: 'Все серверы, получившие этот запрос API, перегружены. В учебной модели балансировщик возвращает 503.' }
      : { code: '—', label: 'Нет ответа API', mode: 'broken', detail: 'Запрос API ушёл напрямую на перегруженный сервер A и не получил HTTP-ответ.' };
    if (lastRun?.apiSent && lastRun.sessionState === 'missing') return { code: '401', label: 'Сессия истекла', mode: 'partial', detail: 'HTML страницы загрузился, но защищённый API не получил действующую сессию и вернул 401. Получи сессию и повтори запрос.' };
    if (lastRun?.apiSent && lastRun.sessionState === 'forbidden') return { code: '403', label: 'Нет права доступа', mode: 'partial', detail: 'Сессия действительна, но права на ресурс недостаточны. Защищённый API вернул 403; продление сессии само по себе прав не добавит.' };
    if (faults.has('database')) return { code: '503', label: 'Нет данных API', mode: 'partial', detail: 'База отключена: приложение не может получить данные для API. В этой модели API возвращает 503, хотя HTML страницы может загрузиться с кодом 200.' };
    if (lastRun?.apiSent && lastRun.productMissing && lastRun.productMode === 'empty') return { code: '200', label: 'Пустой ответ API', mode: 'partial', bodyIssue: 'empty', detail: `GET /api/products/${lastRun.productId} получил HTTP 200, но тело ответа пустое: SQL вернул 0 строк, а приложение ошибочно сообщило об успехе.` };
    if (lastRun?.apiSent && lastRun.productMissing && lastRun.productMode === 'embedded-error') return { code: '200', label: 'Ошибка внутри ответа', mode: 'partial', bodyIssue: 'embedded-error', detail: `GET /api/products/${lastRun.productId} получил HTTP 200, но внутри JSON находится error.code: 404 · PRODUCT_NOT_FOUND. Число в теле не заменяет HTTP-статус.` };
    if (lastRun?.apiSent && lastRun.productMissing) return { code: '404', label: 'Товар не найден', mode: 'partial', detail: `GET /api/products/${lastRun.productId}: в базе нет строки с таким ID, API вернул HTTP 404.` };
    for (const file of ['css', 'js']) {
      if (!faults.has(file) || !lastRun?.assetOutcomes?.[file]) continue;
      const source = lastRun.assetOutcomes[file].source;
      return { code: '200', label: `${file.toUpperCase()} из ${source === 'browser' ? 'кэша браузера' : 'копии CDN'}`, mode: 'cached', detail: `Оригинал ${file.toUpperCase()} в источнике удалён или повреждён, но браузер получил пригодную копию из ${source === 'browser' ? 'своего кэша' : 'CDN'}. После cache miss и очистки локального кэша проблема проявится.` };
    }
    if (staticFailure && hasCachedAsset('css') && hasCachedAsset('js')) return { code: '200', label: 'Файлы из кэша', mode: 'cached', detail: 'Браузер использует свежие копии CSS и JS из локального кэша и не обращается к CDN. После очистки кэша эти файлы понадобятся из сети.' };
    return { code: '200', label: 'Страница работает', mode: 'ok', detail: 'HTML и необходимые ресурсы доступны, приложение получило данные. Код 200 относится к успешному запросу; содержимое всё равно стоит проверить отдельно.' };
  }
  function apiResponseForCurrentState() {
    if (lastRun?.apiResult) return lastRun.apiResult;
    if (lastRun && !lastRun.apiSent) return { code: '—', label: 'Запрос API не отправлен' };
    if (removed && faults.has('app-a')) return { code: '—', label: 'Нет ответа API' };
    if (!removed && faults.has('app-a') && faults.has('app-b')) return { code: '503', label: 'Серверы приложения недоступны' };
    if (lastRun?.apiSent && lastRun.routes.length && lastRun.routes.every(id => lastRun.overloaded.includes(id) && faults.get(id) === 'overload')) return { code: lastRun.usedBalancer ? '503' : '—', label: 'Сервер перегружен' };
    if (lastRun?.apiSent && lastRun.sessionState === 'missing') return { code: '401', label: 'Сессия отсутствует или истекла' };
    if (lastRun?.apiSent && lastRun.sessionState === 'forbidden') return { code: '403', label: 'Недостаточно прав' };
    if (faults.has('database')) return { code: '503', label: 'База данных недоступна' };
    if (lastRun?.productMissing && lastRun.productMode === 'empty') return { code: '200', label: 'OK · пустое тело', bodyIssue: 'empty' };
    if (lastRun?.productMissing && lastRun.productMode === 'embedded-error') return { code: '200', label: 'OK · ошибка в теле', bodyIssue: 'embedded-error' };
    if (lastRun?.productMissing) return { code: '404', label: 'Товар не найден' };
    return { code: '200', label: 'OK' };
  }
  function renderLoadControls() {
    document.querySelectorAll('[data-request-count]').forEach(button => {
      const active = Number(button.dataset.requestCount) === configuredRequests;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = remainingRequests !== null;
    });
    const progress = document.getElementById('course-load-progress');
    if (progress) {
      progress.hidden = remainingRequests === null || configuredRequests === 1;
      if (!progress.hidden) progress.textContent = `Осталось отправить: ${remainingRequests} из ${configuredRequests}`;
    }
  }
  function renderClientPreview() {
    const preview = nodeHost.querySelector('.course-client-preview');
    if (!preview) return;
    preview.dataset.mode = lastResponse?.mode || 'waiting';
    preview.querySelector('.course-client-preview__code').textContent = lastResponse?.code || '';
    const explanation = document.getElementById('course-client-explanation');
    if (explanation) explanation.textContent = lastResponse?.detail || 'Нажми «Загрузить страницу»: здесь появится причина кода внутри иконки клиента.';
  }
  function receiveResponse() {
    lastResponse = responseForCurrentState();
    renderClientPreview();
    if (selected === 'client') renderExample('client');
    return `${lastResponse.code} · ${lastResponse.detail}`;
  }
  const browserPacketIds = new Set(['request', 'html', 'cookie', 'json', 'css-get', 'js-get', 'css', 'js']);
  const networkArticles = new Set(['client', ...browserPacketIds]);
  let networkKey = 'document';
  let networkTab = 'headers';
  function setNetworkSelection(id) {
    networkSelected = id;
    activeActionId = id;
    const packet = packets.find(item => item.id === id);
    document.getElementById('course-network-selection').textContent = packet?.title || id;
    document.getElementById('course-network-flow').textContent = packet?.flow === 'response' ? 'ответ' : 'запрос';
    document.getElementById('course-network-action-result').textContent = '';
    renderActions(id);
    update();
  }
  function syncNetworkSelection() {
    const request = { document: 'request', css: 'css-get', js: 'js-get', api: 'cookie' };
    const response = { document: 'html', css: 'css', js: 'js', api: 'json' };
    setNetworkSelection((networkTab === 'headers' ? request : response)[networkKey]);
  }
  function networkEntries(id) {
    const productId = selectedProductId;
    const pendingApi = !lastRun || lastRun.productId !== productId;
    const api = pendingApi ? { code: '—', label: '—' } : lastRun.apiResult;
    const fileEntry = file => {
      const outcome = lastRun?.assetOutcomes?.[file];
      const name = file === 'css' ? 'style.css' : 'app.js';
      const status = !lastRun ? '—' : !lastRun.documentAvailable ? '—' : outcome?.state === 'ok' ? '200' : outcome?.reason === 'файл удалён в источнике' ? '404' : outcome?.source === 'cdn' ? '—' : '503';
      const source = !lastRun || !lastRun.documentAvailable ? 'ожидает запроса' : outcome?.source === 'browser' ? 'кэш браузера' : outcome?.source === 'cdn' ? 'CDN' : 'источник через CDN';
      return { key: file, name, path: `https://cdn.site.example/${name}`, status, source,
        headers: `GET /${name} HTTP/1.1\nHost: cdn.site.example\n\n${status === '—' ? 'Ответа пока нет' : `Статус: ${status}\nContent-Type: ${file === 'css' ? 'text/css' : 'text/javascript'}`}`,
        preview: !lastRun ? 'Нажми «Загрузить страницу».' : outcome?.state === 'failed' ? `${name} не получен: ${outcome.reason}.` : `${name} получен: ${source}.`,
        response: outcome?.state === 'ok' ? examples[file].join('\n') : outcome?.state === 'failed' ? `${status} · ${outcome.reason}` : 'Ответ появится после запуска.' };
    };
    const document = { key: 'document', name: '/', path: 'https://site.example/', status: !lastRun ? '—' : lastRun.documentAvailable ? '200' : faults.get('html') === 'missing' ? '404' : '—', source: !lastRun ? 'ожидает запроса' : lastRun.cachedFiles?.includes('html') ? 'кэш браузера' : `сервер ${lastRun.documentRoute === 'app-b' ? 'B' : 'A'}`,
      headers: 'GET / HTTP/1.1\nHost: site.example\nAccept: text/html\n\nContent-Type: text/html; charset=utf-8',
      preview: lastRun?.documentAvailable ? 'HTML содержит ссылки на style.css и app.js.' : 'HTML ещё не получен.',
      response: lastRun?.documentAvailable ? examples.html.join('\n') : 'Ответ появится после запуска.' };
    const apiEntry = { key: 'api', name: `/api/products/${productId}`, path: `https://site.example/api/products/${productId}`, status: !pendingApi && lastRun.apiSent ? api.code : '—', source: pendingApi ? '—' : lastRun.apiSent ? `сервер ${lastRun.routes?.[0] === 'app-b' ? 'B' : 'A'}` : '—',
      headers: `GET /api/products/${productId} HTTP/1.1\nHost: site.example\nAccept: application/json\nCookie: session=${sessionToken}\n\nHTTP: ${!pendingApi && lastRun.apiSent ? api.code : '—'}`,
      preview: pendingApi ? '—' : !lastRun.apiSent ? 'JavaScript не отправил запрос API.' : api.bodyIssue === 'empty' ? 'Тело ответа пустое.' : api.bodyIssue === 'embedded-error' ? 'В JSON есть error.code: 404 при HTTP 200.' : api.code === '200' ? `${lastRun.product?.name || 'Товар'} · ${lastRun.product?.price?.toLocaleString('ru-RU') || ''} ₽` : api.label,
      response: pendingApi ? '—' : exampleFor('client')?.text || '—' };
    const entries = { document, css: fileEntry('css'), js: fileEntry('js'), api: apiEntry };
    const keys = ['request', 'html'].includes(id) ? ['document'] : ['cookie', 'json'].includes(id) ? ['api'] : ['css-get', 'css'].includes(id) ? ['css'] : ['js-get', 'js'].includes(id) ? ['js'] : ['document', 'css', 'js', 'api'];
    return keys.map(key => entries[key]);
  }
  function renderVisualization(id, host = document.getElementById('course-article-visual')) {
    if (!host || !id) return;
    if (id === 'client' && host.id === 'course-article-visual') { host.replaceChildren(); return; }
    if (networkArticles.has(id)) {
      const entries = networkEntries(id);
      if (!entries.some(entry => entry.key === networkKey)) networkKey = entries[0].key;
      const entry = entries.find(item => item.key === networkKey);
      const content = networkTab === 'headers' ? entry.headers : networkTab === 'preview' ? entry.preview : entry.response;
      const contentMarkup = entry.key === 'api' && networkTab === 'headers'
        ? content.split('\n').map(line => line.startsWith('Cookie: ')
          ? `<span class="course-network__cookie-line"><span data-session-cookie>${escapeHtml(line)}</span><span class="course-network__session-time" data-session-remaining></span></span>`
          : escapeHtml(line)).join('\n')
        : escapeHtml(content);
      const pairNames = { document: 'HTML · запрос → ответ', css: 'CSS · запрос → ответ', js: 'JS · запрос → ответ', api: 'API · запрос → JSON' };
      const help = { document: articles.request.body + articles.html.body, css: articles['css-get'].body + articles.css.body, js: articles['js-get'].body + articles.js.body, api: articles.cookie.body + articles.json.body };
      const urlMarkup = entry.key === 'api'
        ? `<span class="course-network__path">https://site.example/api/products/<input id="course-product-id" class="course-network__id-chip" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${selectedProductId}" aria-label="ID товара"></span>`
        : `<span class="course-network__path">${escapeHtml(entry.path)}</span>`;
      host.innerHTML = `<section class="course-viz course-network" aria-label="Учебный Network"><div class="course-network__split"><div class="course-network__requests">${entries.map(item => `<button type="button" data-network-key="${item.key}" class="${item.key === networkKey ? 'is-current' : ''}"><span class="course-method course-method--get">GET</span><span class="course-network__name">${escapeHtml(item.name)}</span><span class="course-network__status ${item.status === '200' ? 'is-ok' : item.status !== '—' ? 'is-error' : ''}">${item.status}</span></button>`).join('')}</div><div class="course-network__detail"><div class="course-network__url">${urlMarkup}${entry.source !== '—' ? `<span>${escapeHtml(entry.source)}</span>` : ''}</div><div class="course-network__tabs" role="tablist">${[['headers','Заголовки'],['preview','Просмотр'],['response','Ответ']].map(([key,label]) => `<button type="button" role="tab" aria-selected="${networkTab === key}" data-network-tab="${key}">${label}</button>`).join('')}</div><pre class="course-network__content">${contentMarkup}</pre></div></div><details class="course-network__help"><summary>${pairNames[entry.key]} · как это работает</summary><div>${help[entry.key]}</div></details></section>`;
      refreshSessionDisplay();
      host.querySelectorAll('[data-network-key]').forEach(button => button.addEventListener('click', () => { networkKey = button.dataset.networkKey; networkTab = 'headers'; syncNetworkSelection(); renderVisualization(id, host); }));
      host.querySelectorAll('[data-network-tab]').forEach(button => button.addEventListener('click', () => { networkTab = button.dataset.networkTab; syncNetworkSelection(); renderVisualization(id, host); }));
      const productInput = host.querySelector('#course-product-id');
      if (productInput) {
        productInput.addEventListener('input', () => {
          if (/^\d{1,4}$/.test(productInput.value)) selectedProductId = Math.max(1, Number(productInput.value));
        });
        let applied = false;
        const applyProductId = () => {
          if (applied) return;
          applied = true;
          selectedProductId = Math.min(9999, Math.max(1, Number(productInput.value) || 42));
          renderProductTables(); save(); if (selected) renderActions(selected); renderVisualization(id, host);
        };
        productInput.addEventListener('change', applyProductId);
        productInput.addEventListener('blur', applyProductId);
        productInput.addEventListener('keydown', event => { if (event.key === 'Enter') productInput.blur(); });
      }
      return;
    }
    if (id === 'database') {
      host.innerHTML = `<section class="course-viz"><div class="course-viz__heading"><span class="course-viz__icon">▦</span><strong>products</strong><span class="course-viz__caption">${rowCountLabel([...baseProducts, ...extraProducts].length - deletedProducts.size)}</span></div>${productTableMarkup()}<p class="course-viz__foot">SELECT … WHERE id = ${selectedProductId} → ${productFor(selectedProductId) ? '1 строка' : '0 строк'}</p></section>`;
      return;
    }
    if (id === 'db-result') {
      const rows = lastRun?.dbResult;
      const caption = !lastRun ? 'Ожидает запуска' : rows === null || rows === undefined ? 'Ответа нет' : rowCountLabel(rows.length);
      const table = Array.isArray(rows) ? `<div class="ai-table-shell course-table-shell"><div class="ai-table-wrap"><table class="ai-table"><thead><tr><th scope="col">id</th><th scope="col">name</th><th scope="col">price</th><th scope="col">currency</th></tr></thead><tbody>${rows.length ? rows.map(product => `<tr><td>${product.id}</td><td>${escapeHtml(product.name)}</td><td>${product.price.toLocaleString('ru-RU')}</td><td>${product.currency}</td></tr>`).join('') : '<tr><td colspan="4" class="course-table-empty">0 строк</td></tr>'}</tbody></table></div></div>` : '';
      host.innerHTML = `<section class="course-viz"><div class="course-viz__heading"><span class="course-viz__icon">▦</span><strong>Результат SELECT</strong><span class="course-viz__caption">${caption}</span></div>${table}<p class="course-viz__foot">${!lastRun ? 'Запусти схему, чтобы увидеть ответ базы.' : Array.isArray(rows) ? 'Драйвер передал серверу набор строк и столбцов. Приложение создаст HTTP-ответ отдельно.' : 'База не вернула результат: проверь сессию, сервер и доступность базы.'}</p></section>`;
      return;
    }
    if (id === 'balancer' || id === 'app-a' || id === 'app-b') {
      const countA = lastRun?.counts?.['app-a'] || 0, countB = lastRun?.counts?.['app-b'] || 0;
      const server = id === 'app-a' ? 'A' : 'B';
      const bars = id === 'balancer' ? [['A', countA], ['B', countB]] : [[server, server === 'A' ? countA : countB]];
      host.innerHTML = `<section class="course-viz"><div class="course-viz__heading"><span class="course-viz__icon">${id === 'balancer' ? '⇄' : '▥'}</span><strong>${id === 'balancer' ? 'Распределение запросов' : `Нагрузка сервера ${server}`}</strong><span class="course-viz__caption">${lastRun ? requestCountLabel(lastRun.requestCount) : 'Ожидает запуска'}</span></div>${bars.map(([name,count]) => `<div class="course-load"><span>Сервер ${name}</span><div class="course-load__track"><span class="${count > 600 ? 'is-overload' : ''}" style="width:${Math.min(100, count / 600 * 100)}%"></span></div><strong>${count} / 600</strong></div>`).join('')}<p class="course-viz__foot">${id === 'balancer' && removed ? 'Балансировщик отключён: запросы идут напрямую на A.' : id !== 'balancer' && faults.has(id) ? 'Сервер сейчас остановлен.' : 'До 600 одновременных запросов на сервер в этой модели.'}</p></section>`;
      return;
    }
    if (['assets', 'storage', 'cache', 'origin'].includes(id)) {
      const isBrowser = id === 'cache', isOrigin = id === 'storage' || id === 'origin';
      const title = isBrowser ? 'Кэш браузера' : isOrigin ? 'Источник файлов' : 'Копии CDN';
      const files = [...(isBrowser ? [['HTML', !cacheCleared]] : []), ['style.css', isBrowser ? hasCachedAsset('css') : isOrigin ? !faults.has('storage') && !faults.has('css') : !faults.has('assets') && !cdnBypass], ['app.js', isBrowser ? hasCachedAsset('js') : isOrigin ? !faults.has('storage') && !faults.has('js') : !faults.has('assets') && !cdnBypass]];
      host.innerHTML = `<section class="course-viz"><div class="course-viz__heading"><span class="course-viz__icon">▤</span><strong>${title}</strong><span class="course-viz__caption">${id === 'assets' && cdnBypass ? 'cache miss' : ''}</span></div><div class="course-files">${files.map(([name,available]) => `<div class="course-file ${available ? '' : 'is-missing'}"><span>▧</span><strong>${name}</strong><small>${available ? 'доступен' : isOrigin ? 'недоступен' : 'нет копии'}</small></div>`).join('')}</div><p class="course-viz__foot">${isBrowser ? 'Кэш браузера не равен копии CDN.' : isOrigin ? 'CDN обращается сюда только при cache miss.' : 'Браузер запрашивает файлы у CDN отдельно от API.'}</p></section>`;
      return;
    }
    host.replaceChildren();
  }
  function showArticle(id, via = null) {
    const data = articles[id];
    if (!data) return;
    clearTimeout(articleCloseTimer);
    article.classList.remove('is-closing');
    selected = id;
    activeActionId = id;
    selectedVia = via;
    document.getElementById('course-article-kicker').textContent = data.kicker.includes('/') ? data.kicker.split('/')[0].trim() : data.kicker.split(' ')[0];
    document.getElementById('course-article-title').textContent = data.title;
    document.getElementById('course-article-body').innerHTML = data.body;
    renderProductTables();
    if (!networkArticles.has(id) && exampleFor(id) && !document.getElementById('course-example')) document.getElementById('course-article-body').insertAdjacentHTML('beforeend', '<section class="course-example" id="course-example"><h3></h3><pre><code></code></pre></section>');
    renderExample(id);
    renderVisualization(id);
    refreshSessionDisplay();
    if (id === 'tasks') renderTasks();
    if (id === 'client') {
      document.querySelectorAll('[data-request-count]').forEach(button => button.addEventListener('click', () => {
        configuredRequests = Number(button.dataset.requestCount);
        renderLoadControls();
        save();
      }));
      renderLoadControls();
      renderClientPreview();
      renderAlgorithm();
      document.getElementById('course-algorithm-prev').addEventListener('click', () => { algorithmIndex--; renderAlgorithm(); });
      document.getElementById('course-algorithm-next').addEventListener('click', () => { algorithmIndex++; renderAlgorithm(); });
    }
    document.getElementById('course-action-result').textContent = '';
    article.hidden = false;
    workspace.classList.add('has-answer');
    article.querySelector('.course-article__scroll').scrollTop = 0;
    update();
    renderActions(id);
    const packet = packets.find(item => item.id === id);
    if (packet) {
      const edge = via === 'app-b' && packet.edge?.includes('app-a') ? packet.edge.map(node => node === 'app-a' ? 'app-b' : node) : packet.edge;
      report(id === 'cookie' ? 'Это один API-запрос; сессия передаётся в его заголовке Cookie.' : packet.flow === 'local' ? 'Локальные данные браузера: они не проходят по сетевой линии.' : `${packet.flow === 'request' ? 'Запрос' : 'Ответ'}: ${byId.get(edge[packet.flow === 'response' ? 1 : 0]).title} → ${byId.get(edge[packet.flow === 'response' ? 0 : 1]).title}. Стрелка на карте показывает направление.`);
    }
    if (faults.get(id) === 'overload') report('Сервер упал из-за нагрузки: в этой учебной модели его предел — 600 одновременных запросов. Восстанови сервер или нажми «Сброс».');
    requestAnimationFrame(() => focusElement(id));
  }
  function showNetworkPacket(id) {
    networkKey = ['request', 'html'].includes(id) ? 'document' : ['cookie', 'json'].includes(id) ? 'api' : ['js-get', 'js'].includes(id) ? 'js' : 'css';
    networkTab = ['html', 'json', 'css', 'js'].includes(id) ? 'response' : 'headers';
    document.getElementById('course-network-panel').hidden = false;
    setNetworkSelection(id);
    renderVisualization('client', document.getElementById('course-network-visual'));
  }
  for (const node of nodes) {
    const element = document.createElement('div');
    element.className = 'questions-map-card course-node';
    element.dataset.node = node.id;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.hidden = true;
    element.innerHTML = `${node.id === 'client' ? `<button class="course-node__icon course-client-preview" type="button" aria-label="Открыть результат запроса"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[node.icon]}</svg><span class="course-client-preview__code" aria-live="polite"></span></button>` : `<span class="course-node__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[node.icon]}</svg></span>`}<button class="questions-map-card__question" type="button"><span class="course-node__title"></span></button>`;
    element.querySelector('.course-node__title').textContent = node.title;
    element.querySelector('.questions-map-card__question').addEventListener('click', () => showArticle(node.id));
    if (node.id === 'client') element.querySelector('.course-client-preview').addEventListener('click', () => showArticle('client'));
    nodeHost.append(element);
  }
  for (const item of packets) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'course-packet';
    element.dataset.packet = item.id;
    if (item.pair) element.dataset.pair = item.pair;
    if (resourcePackets.has(item.id)) element.classList.add('is-resource');
    if (Number.isFinite(item.x)) element.style.left = `${item.x}px`;
    if (Number.isFinite(item.y)) element.style.top = `${item.y}px`;
    element.hidden = true;
    const numbers = item.phase ? [item.phase] : [];
    element.innerHTML = `${numbers.length ? `<span class="course-packet__numbers" aria-hidden="true">${numbers.map(number => `<span data-number="${number}">${number}</span>`).join('')}</span>` : ''}${packetIcon}<span class="course-packet__title"></span><small class="course-packet__flow"></small>${item.edge ? `<span class="course-packet__arrow" aria-hidden="true">${directionIcon}</span>` : ''}`;
    element.querySelector('.course-packet__title').textContent = item.title;
    const flowLabel = item.flow === 'request' ? 'запрос' : item.flow === 'response' ? 'ответ' : 'локально';
    element.querySelector('.course-packet__flow').textContent = flowLabel;
    element.setAttribute('aria-label', `${item.title}: ${item.phase ? `пара ${item.phase}, ${flowLabel}` : flowLabel}`);
    element.addEventListener('click', () => browserPacketIds.has(item.id) ? showNetworkPacket(item.id) : showArticle(item.id));
    packetHost.append(element);
  }
  let lastSessionValidity = hasSession();
  function refreshSessionDisplay() {
    const seconds = Math.max(0, Math.ceil((sessionExpiresAt - Date.now()) / 1000));
    const remaining = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const inactiveLabel = sessionExpiresAt === 0 ? 'удалена' : 'истекла';
    document.querySelectorAll('[data-session-cookie]').forEach(label => { label.textContent = `Cookie: session=${sessionToken}`; });
    document.querySelectorAll('[data-session-remaining]').forEach(badge => {
      badge.textContent = seconds ? remaining : inactiveLabel;
      badge.classList.toggle('is-expired', !seconds);
    });
    if (lastSessionValidity !== !!seconds) {
      lastSessionValidity = !!seconds;
      if (selected === 'cookie') renderActions(selected);
      if (networkSelected === 'cookie') renderActions(networkSelected);
      syncResetButton();
    }
  }
  refreshSessionDisplay();
  window.setInterval(refreshSessionDisplay, 1000);

  document.getElementById('course-article-close').addEventListener('click', () => {
    article.classList.add('is-closing');
    articleCloseTimer = setTimeout(() => { article.hidden = true; article.classList.remove('is-closing'); }, 280);
    workspace.classList.remove('has-answer');
    selected = '';
    selectedVia = null;
    update();
  });
  document.getElementById('course-network-close').addEventListener('click', () => {
    networkSelected = '';
    document.getElementById('course-network-panel').hidden = true;
    update();
  });
  let activeActionId = '';

  function report(message) {
    document.getElementById(browserPacketIds.has(activeActionId) ? 'course-network-action-result' : 'course-action-result').textContent = message;
  }
  function renderActions(id) {
    const networkAction = browserPacketIds.has(id);
    const actionButtons = document.getElementById(networkAction ? 'course-network-action-buttons' : 'course-action-buttons');
    actionButtons.replaceChildren();
    function add(label, handler, destructive = false) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.classList.toggle('is-destructive', destructive);
      button.addEventListener('click', () => {
        activeActionId = id;
        if (playButton.disabled) { report('Дождись завершения запуска.'); return; }
        handler();
        if (networkAction) renderVisualization('client', document.getElementById('course-network-visual'));
        else renderVisualization(selected);
      });
      actionButtons.append(button);
    }
    function toggleFault(target) {
      const active = faults.has(target);
      if (active) faults.delete(target);
      else faults.set(target, 'offline');
      setLiveRoutes(null);
      renderActions(id);
      report(active ? `${byId.get(target).title} снова доступен.` : `${byId.get(target).title} отключён. Запусти схему, чтобы проверить новый маршрут.`);
    }
    if (id === 'balancer') {
      add(removed ? 'Восстановить балансировщик' : 'Отключить балансировщик', () => {
        removed = !removed;
        setLiveRoutes(null);
        renderActions(id);
        report(removed ? 'Прямой маршрут ведёт только к серверу A. Запусти модель, чтобы увидеть результат.' : 'Балансировщик снова распределяет запросы между доступными серверами.');
      }, !removed);
    } else if (id === 'app-a' || id === 'app-b') {
      add(faults.has(id) ? 'Запустить сервер' : 'Остановить сервер', () => toggleFault(id), !faults.has(id));
    } else if (id === 'database') {
      add(faults.has(id) ? 'Включить базу' : 'Отключить базу', () => toggleFault(id), !faults.has(id));
      if (productFor(selectedProductId)) add(`Удалить товар ${selectedProductId}`, () => {
        deletedProducts.add(selectedProductId); productMode = 'empty'; renderProductTables(); renderActions(id); save();
        report(`Товар ${selectedProductId} удалён. После запуска SQL вернёт 0 строк; учебный API ответит 200 с пустым телом.`);
      }, true);
      else {
        if ([...baseProducts, ...extraProducts].some(product => product.id === selectedProductId)) add(`Восстановить товар ${selectedProductId}`, () => {
          deletedProducts.delete(selectedProductId); productMode = 'normal'; renderProductTables(); renderActions(id); save();
          report(`Товар ${selectedProductId} восстановлен. Обнови страницу, чтобы получить его данные.`);
        });
        add(productMode === 'empty' ? 'Ошибка в теле 200' : 'Пустое тело 200', () => {
          productMode = productMode === 'empty' ? 'embedded-error' : 'empty';
          renderProductTables(); renderActions(id); save();
          report(productMode === 'embedded-error' ? 'Обнови страницу: HTTP 200 придёт с кодом ошибки 404 внутри JSON.' : 'Обнови страницу: HTTP 200 придёт с пустым телом.');
        });
      }
      if (extraProducts.length < 12) add('Добавить строку', () => {
        const newId = 47 + extraProducts.length;
        extraProducts.push({ id: newId, name: `Товар для проверки ${newId}`, price: 4990 + extraProducts.length * 1000, currency: 'RUB' });
        renderProductTables(); renderActions(id); save();
        report(`Строка ${newId} добавлена в products. Укажи этот ID в Network и запусти запрос.`);
      });
    } else if (id === 'assets') {
      add(faults.has('assets') ? 'Включить CDN' : 'Отключить CDN', () => toggleFault('assets'), !faults.has('assets'));
      add(cdnBypass ? 'Вернуть cache hit' : 'Сымитировать cache miss', () => {
        cdnBypass = !cdnBypass;
        update();
        save();
        renderActions(id);
        report(cdnBypass ? 'Если браузер обратится к CDN, тот запросит файл у источника. Для проверки очисти локальный кэш.' : 'CDN снова отдаёт сохранённую копию без обращения к источнику.');
      });
    } else if (id === 'storage') {
      add(faults.has('storage') ? 'Включить источник' : 'Отключить источник', () => toggleFault('storage'), !faults.has('storage'));
    } else if (id === 'html' || id === 'css' || id === 'js') {
      const fileName = id === 'css' ? 'style.css' : id === 'js' ? 'app.js' : 'HTML';
      const place = id === 'html' ? 'на сервере' : 'в источнике';
      add(`Удалить ${fileName} ${place}`, () => {
        faults.set(id, 'missing'); setLiveRoutes(null); renderActions(id);
        report(`${fileName} удалён ${place}. Сохранённые копии браузера и CDN остаются: запусти схему, чтобы увидеть, откуда придёт файл.`);
      }, true);
      add(`Повредить ${fileName} ${place}`, () => {
        faults.set(id, 'corrupt'); setLiveRoutes(null); renderActions(id);
        report(`${fileName} повреждён ${place}. Сохранённые копии браузера и CDN остаются: запусти схему, чтобы увидеть результат.`);
      }, true);
      if (faults.has(id)) add(`Восстановить ${fileName}`, () => {
        faults.delete(id); setLiveRoutes(null); renderActions(id); report(`${fileName} восстановлен ${place}. Запусти схему, чтобы проверить результат.`);
      });
    } else if (id === 'cookie') {
      const applySessionAction = message => {
        refreshSessionDisplay();
        update();
        renderActions(id);
        renderExample(id);
        save();
        report(message);
      };
      add(hasSession() ? 'Обновить сессию' : 'Получить сессию', () => {
        const wasValid = hasSession();
        rotateSessionToken();
        sessionExpiresAt = Date.now() + SESSION_MS;
        if (!wasValid) sessionRestricted = false;
        applySessionAction(wasValid ? 'Сессия обновлена на пять минут.' : 'Новая сессия получена на пять минут.');
      });
      if (hasSession()) add('Удалить сессию', () => {
        sessionExpiresAt = 0;
        applySessionAction('Сессия удалена. Следующий запрос к защищённому API вернёт 401; HTML страницы останется доступен.');
      }, true);
      if (id === 'cookie' && hasSession()) add(sessionRestricted ? 'Вернуть право доступа' : 'Ограничить права', () => {
        sessionRestricted = !sessionRestricted;
        applySessionAction(sessionRestricted ? 'Сессия действительна, но права на ресурс нет: следующий запрос API вернёт 403.' : 'Право доступа возвращено: следующий запрос API может получить 200.');
      }, !sessionRestricted);
    } else if (id === 'cache') {
      add('Очистить кэш', () => { cacheCleared = true; cachedAssets.clear(); setLiveRoutes(null); renderActions(id); report('Локальный кэш браузера пуст. Копии CDN не изменились. Запусти схему, чтобы увидеть новые запросы файлов.'); });
    }
    if (!networkAction) actionButtons.closest('.course-article__actions').hidden = !actionButtons.childElementCount;
  }
  let playRun = 0;
  const playButton = document.getElementById('course-play');
  function syncPlayButton() {
    const label = pageLoaded ? '▶ Обновить страницу' : '▶ Загрузить страницу';
    playButton.textContent = label;
    playButton.title = label.slice(2);
  }
  document.getElementById('course-tasks').addEventListener('click', () => showArticle('tasks'));
  const wait = ms => new Promise(resolve => setTimeout(resolve, Math.round(ms * 1.8)));
  function pulseLocalCache() {
    showPackets(['cache']);
    if (pulsedPackets.has('cache')) return;
    pulsedPackets.add('cache');
    const marker = packetHost.querySelector('[data-packet="cache"]');
    const path = lines.querySelector('[data-course-local-cache]');
    for (const element of [marker, path]) {
      if (!element) continue;
      element.classList.remove(element === marker ? 'is-transiting' : 'is-flowing-cache');
      void element.offsetWidth;
      const name = element === marker ? 'is-transiting' : 'is-flowing-cache';
      element.classList.add(name);
      window.setTimeout(() => element.classList.remove(name), element === marker ? 1100 : 1450);
    }
  }
  playButton.addEventListener('click', async () => {
    const run = ++playRun;
    pulsedPackets.clear();
    const loadPage = true;
    playButton.disabled = true;
    const requestCount = configuredRequests;
    const productId = selectedProductId;
    const product = productFor(productId);
    const productMissing = !product;
    configuredRequests = requestCount;
    remainingRequests = requestCount;
    renderLoadControls();
    const usedBalancer = !removed;
    const available = usedBalancer ? ['app-a', 'app-b'].filter(id => !faults.has(id)) : (faults.has('app-a') ? [] : ['app-a']);
    const routes = available.length === 2 && requestCount > 1 ? available : available.slice(0, 1);
    const counts = { 'app-a': 0, 'app-b': 0 };
    if (routes.length === 2) {
      counts['app-a'] = Math.ceil(requestCount / 2);
      counts['app-b'] = Math.floor(requestCount / 2);
    } else if (routes.length) counts[routes[0]] = requestCount;
    const overloaded = routes.filter(id => counts[id] > 600);
    const assetOutcomes = Object.fromEntries(['css', 'js'].map(file => [file, assetSource(file)]));
    const originMiss = loadPage && Object.values(assetOutcomes).some(outcome => outcome.source === 'origin');
    const originOffline = originMiss && faults.has('storage');
    const cachedFiles = loadPage ? [...(faults.has('html') && !cacheCleared ? ['html'] : []), ...['css', 'js'].filter(hasCachedAsset)] : [];
    const documentRoute = routes[0];
    const documentAvailable = !loadPage || (!!documentRoute && (!faults.has('html') || !cacheCleared));
    const scriptAvailable = !loadPage || (documentAvailable && assetOutcomes.js.state === 'ok');
    const apiRoutes = scriptAvailable ? routes : [];
    const apiOverloaded = scriptAvailable ? overloaded : [];
    let sessionState = 'missing';
    startAlgorithm(pageLoaded ? 'Обновление страницы' : 'Первый запуск');
    if (loadPage && !pageLoaded) algorithmStep(hasSession() ? 'api' : 'error', hasSession()
      ? 'До загрузки: пользователь уже вошёл через POST /auth/login; сервер ранее выдал сессию на пять минут. Сброс начал упражнение с этого состояния.'
      : 'До загрузки: ранее выданная сессия удалена или истекла; для защищённого API потребуется новый вход.');
    setLiveRoutes(routes);
    if (loadPage) {
      algorithmStep('resource', 'Браузер отправил GET / за HTML.');
      pulse('client', usedBalancer ? 'balancer' : 'app-a', ['request'], 'resource');
      await wait(430);
      if (run !== playRun) return;
      if (usedBalancer && documentRoute) {
        pulse('balancer', documentRoute, [], 'resource');
        algorithmStep('resource', `Балансировщик передал запрос серверу ${documentRoute === 'app-a' ? 'A' : 'B'}.`);
      } else if (!usedBalancer && documentRoute) algorithmStep('resource', 'Без балансировщика GET / отправлен напрямую серверу A.');
      else algorithmStep('error', 'Доступного сервера для HTML нет.');
      await wait(400);
      if (run !== playRun) return;
      if (documentRoute && !faults.has('html')) {
        cacheCleared = false;
        showPackets(['cache']);
        save();
        algorithmStep('resource', `HTML получен от сервера ${documentRoute === 'app-a' ? 'A' : 'B'}.`);
        pulse(documentRoute, usedBalancer ? 'balancer' : 'client', [], 'resource');
        if (usedBalancer) {
          await wait(320);
          if (run !== playRun) return;
          pulse('balancer', 'client', ['html'], 'resource');
        } else pulse('app-a', 'client', ['html'], 'resource');
      }
      await wait(460);
      if (run !== playRun) return;
      if (documentAvailable && faults.has('html') && !cacheCleared) {
        algorithmStep('resource', 'HTML недоступен в сети; взята сохранённая копия.');
        pulseLocalCache();
      } else if (!documentAvailable) {
        if (faults.has('html')) showPackets(['html']);
        algorithmStep('error', 'HTML не получен — браузер не загрузил страницу.');
      }
      if (documentAvailable) {
        algorithmStep('resource', 'Браузер нашёл в HTML ссылки на CSS и JS.');
        for (const file of ['css', 'js']) {
          if (run !== playRun) return;
          const fileName = file === 'css' ? 'style.css' : 'app.js';
          const outcome = assetOutcomes[file];
          if (outcome.source === 'browser') {
            algorithmStep('resource', `${fileName} взят из локального кэша; CDN не запрашивали.`);
            pulseLocalCache();
            await wait(420);
            continue;
          }
          algorithmStep('resource', `Браузер запросил ${fileName} у CDN.`);
          pulse('client', 'assets', [file === 'css' ? 'css-get' : 'js-get'], 'resource');
          await wait(350);
          if (run !== playRun) return;
          if (outcome.source === 'origin') {
            pulse('assets', 'storage', ['origin'], 'resource');
            algorithmStep(outcome.state === 'failed' ? 'error' : 'resource', outcome.state === 'failed' ? `CDN не нашёл ${fileName}; ${outcome.reason}.` : `CDN не нашёл ${fileName} и обратился к источнику.`);
            await wait(300);
            if (run !== playRun) return;
            if (outcome.state === 'ok') pulse('storage', 'assets', [], 'resource');
          }
          if (outcome.state === 'ok') {
            pulse('assets', 'client', [file], 'resource');
            algorithmStep('resource', `${fileName} получен ${outcome.source === 'cdn' ? 'из копии CDN' : 'из источника через CDN'} и сохранён в кэше браузера.`);
            cachedAssets.set(file, Date.now() + ASSET_CACHE_MS);
            save();
            update();
          } else {
            showPackets([file]);
            algorithmStep('error', `${fileName} не удалось загрузить: ${outcome.reason}. Кэш браузера не заполняется.`);
          }
          await wait(350);
        }
      }
    }
    if (run !== playRun) return;
    if (scriptAvailable) {
      sessionState = !hasSession() ? 'missing' : sessionRestricted ? 'forbidden' : 'ok';
      algorithmStep('api', `JavaScript отправил ${requestCount === 1 ? `GET /api/products/${productId}` : `${requestCount} запросов к API для товара ${productId}`}.`);
      algorithmStep(sessionState === 'missing' ? 'error' : 'api', sessionState === 'missing' ? 'Сессионная cookie отсутствует или её срок истёк.' : 'Идентификатор сессии включён в заголовок этого же запроса.');
      pulse('client', usedBalancer ? 'balancer' : 'app-a', ['cookie']);
      await wait(400);
      if (run !== playRun) return;
      remainingRequests = Math.ceil(requestCount * .65);
      renderLoadControls();
      if (usedBalancer) {
        for (const id of routes) pulse('balancer', id, []);
        if (routes.length === 2) algorithmStep('api', `Балансировщик распределил запросы: A — ${counts['app-a']}, B — ${counts['app-b']}.`);
        else if (routes.length === 1) algorithmStep('api', `Балансировщик направил запросы серверу ${routes[0] === 'app-a' ? 'A' : 'B'}.`);
        else algorithmStep('error', 'Балансировщик не нашёл доступного сервера.');
        await wait(430);
        if (run !== playRun) return;
      } else algorithmStep(routes.length ? 'api' : 'error', routes.length ? 'Без балансировщика API-запросы идут напрямую на сервер A.' : 'Прямой маршрут к серверу A недоступен.');
      remainingRequests = Math.ceil(requestCount * .3);
      renderLoadControls();
      for (const id of routes) {
        if (!overloaded.includes(id) && sessionState === 'ok') pulse(id, 'database', ['sql']);
      }
      for (const id of overloaded) algorithmStep('error', `Сервер ${id === 'app-a' ? 'A' : 'B'} перегружен и не ответил.`);
      if (routes.length && !overloaded.length) algorithmStep(sessionState !== 'ok' || faults.has('database') || productMissing ? 'error' : 'api', sessionState === 'missing' ? 'Сервер отклонил запрос с кодом 401; SQL не выполнялся.' : sessionState === 'forbidden' ? 'Сервер отклонил запрос с кодом 403; SQL не выполнялся.' : faults.has('database') ? 'База данных отключена: SQL не выполнен.' : productMissing ? `SQL выполнен, но товар ${productId} не найден: база вернула 0 строк.` : `Сервер получил из базы строку товара ${productId}.`);
      await wait(500);
      if (run !== playRun) return;
      for (const id of overloaded) faults.set(id, 'overload');
      update();
      if (sessionState === 'ok' && !faults.has('database')) for (const id of routes.filter(item => !overloaded.includes(item))) pulse('database', id, ['db-result']);
      await wait(400);
      if (run !== playRun) return;
      for (const id of routes.filter(item => !overloaded.includes(item))) pulse(id, usedBalancer ? 'balancer' : 'client', usedBalancer ? [] : ['json']);
      await wait(400);
      if (run !== playRun) return;
      if (usedBalancer && routes.some(id => !overloaded.includes(id))) pulse('balancer', 'client', ['json']);
    } else {
      algorithmStep('error', documentAvailable ? 'JavaScript недоступен — запрос API не отправлен.' : 'Без HTML браузер не запустил JavaScript и API.');
    }
    remainingRequests = null;
    renderLoadControls();
    playButton.disabled = false;
    const sqlAttempted = scriptAvailable && sessionState === 'ok' && apiRoutes.some(id => !apiOverloaded.includes(id));
    lastRun = { requestCount, usedBalancer, routes: [...apiRoutes], documentRoute, counts, overloaded: apiOverloaded, cachedFiles, assetOutcomes, assetsOffline: faults.has('assets'), originMiss: originMiss && documentAvailable, originOffline, documentAvailable, apiSent: scriptAvailable, sessionState, productMode, productId, product, productMissing, dbResult: sqlAttempted && !faults.has('database') ? (product ? [product] : []) : null };
    lastRun.apiResult = apiResponseForCurrentState();
    if (loadPage) {
      pageLoaded = documentAvailable;
    }
    syncPlayButton();
    runHistory.push(lastRun);
    if (runHistory.length > 10) runHistory.shift();
    receiveResponse();
    renderVisualization(selected);
    if (networkSelected) renderVisualization('client', document.getElementById('course-network-visual'));
    const apiResponse = apiResponseForCurrentState();
    if (scriptAvailable) algorithmStep(apiResponse.code === '200' && !apiResponse.bodyIssue ? 'api' : 'error', `Ответ API: ${apiResponse.code} · ${apiResponse.label}.`);
    finishAlgorithm(lastResponse.code, lastResponse.label, ['broken', 'partial', 'unstyled'].includes(lastResponse.mode) || lastResponse.code === '—' ? 'error' : loadPage ? 'resource' : 'api');
    evaluateTasks(lastRun);
  });
  resetButton.addEventListener('click', () => {
    playRun++;
    pulsedPackets.clear();
    shownPackets.clear();
    packetHost.querySelectorAll('[data-packet]').forEach(marker => {
      marker.hidden = true;
      marker.classList.remove('is-visible', 'is-hiding', 'is-transiting', 'is-transiting-resource');
    });
    playButton.disabled = false;
    for (const item of activeTraces) item.path.remove();
    activeTraces.clear();
    setLiveRoutes(null);
    removed = false;
    rotateSessionToken();
    sessionExpiresAt = Date.now() + SESSION_MS;
    sessionRestricted = false;
    refreshSessionDisplay();
    cacheCleared = true;
    cachedAssets.clear();
    pageLoaded = false;
    syncPlayButton();
    cdnBypass = false;
    productMode = 'normal';
    selectedProductId = 42;
    deletedProducts.clear();
    extraProducts.length = 0;
    lastResponse = null;
    lastRun = null;
    networkSelected = '';
    document.getElementById('course-network-panel').hidden = true;
    selectedVia = null;
    configuredRequests = 1;
    remainingRequests = null;
    renderLoadControls();
    runHistory.length = 0;
    faults.clear();
    resetAlgorithm();
    update();
    renderTasks();
    if (selected) { renderActions(selected); renderExample(selected); renderVisualization(selected); }
    save();
  });
  let viewportWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - viewportWidth) < 60) return;
    viewportWidth = window.innerWidth;
    focusElement(selected || 'client', false);
    save();
  });

  if (lastRun) liveRoutes = lastRun.routes.length ? lastRun.routes : lastRun.documentRoute ? [lastRun.documentRoute] : null;
  update();
  if (liveRoutes?.length === 2) setLiveRoutes(liveRoutes);
  syncPlayButton();
  syncResetButton();
  window.addEventListener('pagehide', save);
  requestAnimationFrame(() => {
    if (savedPosition) motion.restore(savedPosition);
    else {
      const scale = .8;
      motion.restore({ x: scroller.clientWidth / 2 - 760 * scale, y: scroller.clientHeight / 2 + 60 - 475 * scale, scale });
    }
  });
})();
