/* QA workbench for the electronics marketplace. State is local to this browser. */
(() => {
  'use strict';

  const storageKey = 'qa_login_marketplace_workbench_v1';
  const checks = [
    { group: 'Каталог', id: 'catalog-count', text: 'Количество товаров в каталоге соответствует счётчику.' },
    { group: 'Каталог', id: 'catalog-filter', text: 'В фильтре «Смартфоны» есть смартфон Nova 12.' },
    { group: 'Каталог', id: 'catalog-search', text: 'Поиск находит товар по названию и показывает пустой результат для неизвестного товара.' },
    { group: 'Каталог', id: 'catalog-retired', text: 'Снятые с продажи часы Chrono 2 не появляются в поиске.' },
    { group: 'Карточки товаров', id: 'nova-card', text: 'У Nova 12 совпадают тип изображения, название, память 128 ГБ, цвет «графит» и цена 42 990 ₽.' },
    { group: 'Карточки товаров', id: 'atlas-card', text: 'У Atlas 14 совпадают название, 16 ГБ памяти, накопитель 512 ГБ и цена в карточке и корзине.' },
    { group: 'Карточки товаров', id: 'orbit-card', text: 'На карточке наушников Orbit изображены именно наушники, а название, описание и цена соответствуют товару.' },
    { group: 'Корзина', id: 'cart-add', text: 'Добавленный товар появляется в корзине с правильной ценой.' },
    { group: 'Корзина', id: 'cart-quantity', text: 'Изменение количества обновляет сумму и число товаров.' },
    { group: 'Корзина', id: 'cart-remove', text: 'После удаления последней единицы товара корзина становится пустой.' },
    { group: 'Корзина', id: 'cart-reload', text: 'После обновления страницы корзина сохраняется для этого учебного аккаунта.' },
    { group: 'Корзина', id: 'cart-bulk', text: 'При 10 одинаковых товарах не появляется неожиданная скидка 90%.' },
    { group: 'Промокоды', id: 'promo-qa1', text: 'Промокод QA1 уменьшает сумму корзины ровно на 1%.' },
    { group: 'Промокоды', id: 'promo-qa3', text: 'Промокод QA3 уменьшает сумму корзины ровно на 3%.' },
    { group: 'Промокоды', id: 'promo-qa5', text: 'Промокод QA5 уменьшает сумму корзины ровно на 5%.' },
    { group: 'Промокоды', id: 'promo-expired', text: 'Истёкший промокод ЛЕТО2026 больше не даёт скидку.' },
    { group: 'Промокоды', id: 'promo-invalid', text: 'Неизвестный промокод отклоняется без новой скидки.' },
    { group: 'Темы', id: 'theme-controls', text: 'Все элементы корзины, включая кнопку «+», меняют оформление при переключении светлой и тёмной темы.' },
    { group: 'Аккаунт', id: 'account-logout', text: 'После выхода каталог скрывается и снова открывается форма входа.' }
  ];
  const sampleReports = [
    {
      id: 'petstore-login', title: 'Вход с незарегистрированным контактом',
      steps: '1. Выйдите из магазина.\n2. Введите корректный по формату, но незарегистрированный email и любой пароль.\n3. Нажмите «Войти».',
      expected: 'Сервер отклоняет вход; каталог не открывается.',
      actual: 'Учебный Petstore API возвращает успешный ответ и открывает каталог.'
    },
    {
      id: 'smartphone-filter', title: 'Смартфон пропадает при выборе своей категории',
      steps: '1. Найдите Nova 12 во вкладке «Все».\n2. Выберите фильтр «Смартфоны».',
      expected: 'Nova 12 остаётся в каталоге как смартфон.',
      actual: 'Категория «Смартфоны» пуста, хотя товар есть во вкладке «Все».'
    },
    {
      id: 'bulk-coupon', title: 'Скидка 90% появляется после десятой единицы товара',
      steps: '1. Добавьте любой товар в корзину.\n2. Увеличьте количество этого товара до 10, не вводя промокод.',
      expected: 'Сумма равна цене 10 товаров; автоматический купон не применяется.',
      actual: 'Корзина применяет «Автокупон 90%» и резко уменьшает итоговую сумму.'
    },
    {
      id: 'expired-coupon', title: 'Истёкший промокод ЛЕТО2026 всё ещё действует',
      steps: '1. Добавьте в корзину один товар.\n2. Введите ЛЕТО2026 в поле промокода и нажмите «Применить».',
      expected: 'Промокод, срок которого закончился летом 2026 года, отклоняется.',
      actual: 'Промокод принимается и даёт скидку 5%.'
    },
    {
      id: 'orbit-image', title: 'На карточке наушников показана камера',
      steps: '1. Откройте каталог или категорию «Аудио».\n2. Посмотрите на иллюстрацию товара «Наушники Orbit».',
      expected: 'Иллюстрация соответствует наушникам.',
      actual: 'В карточке наушников отображается изображение камеры.'
    },
    {
      id: 'atlas-price', title: 'Цена ноутбука меняется при добавлении в корзину',
      steps: '1. Запомните цену Atlas 14 в каталоге — 89 990 ₽.\n2. Добавьте один ноутбук в корзину.',
      expected: 'Цена в корзине также составляет 89 990 ₽.',
      actual: 'Корзина показывает 90 990 ₽ — на 1 000 ₽ больше.'
    },
    {
      id: 'dark-plus', title: 'Кнопка «+» не переключается на тёмную тему',
      steps: '1. Добавьте товар в корзину.\n2. Включите тёмную тему сайта.\n3. Сравните кнопки «−» и «+» у количества.',
      expected: 'Обе кнопки используют оформление тёмной темы.',
      actual: 'Кнопка «+» остаётся светлой, в отличие от «−».'
    },
    {
      id: 'retired-search', title: 'Снятые с продажи часы доступны через поиск',
      steps: '1. Убедитесь, что Chrono 2 нет в обычном каталоге.\n2. Введите «Chrono 2» в строку поиска.',
      expected: 'Товар, снятый с продажи, не появляется в результатах и недоступен для покупки.',
      actual: 'Поиск показывает Chrono 2 и позволяет добавить его в корзину.'
    }
  ];
  const presetReportIds = new Set(sampleReports.map(report => report.id));

  document.addEventListener('DOMContentLoaded', () => {
    const shop = document.getElementById('login-marketplace');
    const panel = document.getElementById('shop-qa-panel');
    if (!shop || !panel) return;
    const fab = document.getElementById('shop-qa-fab');
    const close = document.getElementById('shop-qa-close');
    const tabChecks = document.getElementById('shop-qa-tab-checks');
    const tabBugs = document.getElementById('shop-qa-tab-bugs');
    const sectionChecks = document.getElementById('shop-qa-checks');
    const sectionBugs = document.getElementById('shop-qa-bugs');
    const list = document.getElementById('shop-qa-checklist');
    const progress = document.getElementById('shop-qa-progress');
    const result = document.getElementById('shop-qa-result');
    const reportsHost = document.getElementById('shop-qa-reports');

    function readState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch { return {}; }
    }
    const saved = readState();
    const state = {
      open: typeof saved.open === 'boolean' ? saved.open : matchMedia('(min-width: 1280px)').matches,
      tab: saved.tab === 'bugs' ? 'bugs' : 'checks',
      answers: saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers) ? saved.answers : {},
      verified: saved.verified === true,
      reports: Array.isArray(saved.reports) ? saved.reports.filter(item => item && typeof item.title === 'string').slice(0, 100) : [],
      reportStatuses: saved.reportStatuses && typeof saved.reportStatuses === 'object' ? saved.reportStatuses : {}
    };
    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }
    function setOpen(open) {
      state.open = open;
      panel.setAttribute('aria-hidden', String(!open));
      fab.setAttribute('aria-expanded', String(open));
      shop.classList.toggle('qa-open', open);
      save();
    }
    function setTab(tab) {
      state.tab = tab;
      const bugs = tab === 'bugs';
      tabChecks.setAttribute('aria-selected', String(!bugs));
      tabBugs.setAttribute('aria-selected', String(bugs));
      tabChecks.tabIndex = bugs ? -1 : 0;
      tabBugs.tabIndex = bugs ? 0 : -1;
      sectionChecks.hidden = bugs;
      sectionBugs.hidden = !bugs;
      save();
    }
    function updateProgress() {
      const values = checks.map(check => state.answers[check.id]);
      const answered = values.filter(value => value === 'pass' || value === 'fail').length;
      const failed = values.filter(value => value === 'fail').length;
      progress.textContent = `Проверено: ${answered} из ${checks.length}`;
      result.textContent = state.verified
        ? `Регресс: ${answered} из ${checks.length} проверок выполнено · Failed: ${failed}.`
        : '';
    }
    function renderChecks() {
      list.replaceChildren();
      for (const groupName of [...new Set(checks.map(check => check.group))]) {
        const section = document.createElement('section'); section.className = 'shop-qa__group';
        const heading = document.createElement('h3'); heading.textContent = groupName; section.append(heading);
        for (const check of checks.filter(item => item.group === groupName)) {
          const card = document.createElement('div'); card.className = 'shop-qa__check'; card.dataset.checkId = check.id;
          const text = document.createElement('p'); text.textContent = check.text;
          const choices = document.createElement('div'); choices.className = 'shop-qa__choice';
          for (const [value, label] of [['pass', 'Passed'], ['fail', 'Failed']]) {
            const button = document.createElement('button'); button.type = 'button';
            button.dataset.result = value; button.textContent = label;
            button.setAttribute('aria-pressed', String(state.answers[check.id] === value));
            choices.append(button);
          }
          card.append(text, choices); section.append(card);
        }
        list.append(section);
      }
      updateProgress();
    }
    function addReportDetail(listEl, label, value) {
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      listEl.append(term, description);
    }
    function renderReports() {
      reportsHost.replaceChildren();
      for (const report of [...sampleReports, ...state.reports]) {
        const card = document.createElement('article'); card.className = 'shop-qa__report'; card.dataset.reportId = report.id;
        const title = document.createElement('h3'); title.textContent = report.title;
        const details = document.createElement('dl');
        addReportDetail(details, 'Шаги', report.steps);
        addReportDetail(details, 'Ожидаемый результат', report.expected);
        addReportDetail(details, 'Фактический результат', report.actual);
        const actions = document.createElement('div'); actions.className = 'shop-qa__report-actions';
        const choices = document.createElement('div'); choices.className = 'shop-qa__choice';
        for (const [value, label] of [['open', 'Воспроизводится'], ['fixed', 'Исправлен']]) {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.reportStatus = value;
          button.dataset.result = value === 'open' ? 'fail' : 'pass'; button.textContent = label;
          button.setAttribute('aria-pressed', String(state.reportStatuses[report.id] === value));
          choices.append(button);
        }
        actions.append(choices);
        if (!presetReportIds.has(report.id)) {
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'shop-qa__delete';
          remove.dataset.removeReport = report.id; remove.textContent = 'Удалить';
          actions.append(remove);
        }
        card.append(title, details, actions); reportsHost.append(card);
      }
    }

    fab.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => { setOpen(false); fab.focus(); });
    tabChecks.addEventListener('click', () => setTab('checks'));
    tabBugs.addEventListener('click', () => setTab('bugs'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.open && !shop.hidden) { setOpen(false); fab.focus(); }
    });
    list.addEventListener('click', event => {
      const button = event.target.closest('button[data-result]');
      const card = button?.closest('[data-check-id]');
      if (!card) return;
      const next = state.answers[card.dataset.checkId] === button.dataset.result ? null : button.dataset.result;
      if (next) state.answers[card.dataset.checkId] = next;
      else delete state.answers[card.dataset.checkId];
      state.verified = false;
      card.querySelectorAll('button[data-result]').forEach(choice =>
        choice.setAttribute('aria-pressed', String(choice.dataset.result === next)));
      updateProgress(); save();
    });
    document.getElementById('shop-qa-verify').addEventListener('click', () => {
      state.verified = true; updateProgress(); save();
    });
    reportsHost.addEventListener('click', event => {
      const card = event.target.closest('[data-report-id]');
      if (!card) return;
      const statusButton = event.target.closest('button[data-report-status]');
      if (statusButton) {
        state.reportStatuses[card.dataset.reportId] = statusButton.dataset.reportStatus;
        card.querySelectorAll('button[data-report-status]').forEach(choice =>
          choice.setAttribute('aria-pressed', String(choice === statusButton)));
        save(); return;
      }
      if (event.target.closest('button[data-remove-report]')) {
        state.reports = state.reports.filter(report => report.id !== card.dataset.reportId);
        delete state.reportStatuses[card.dataset.reportId];
        save(); renderReports();
      }
    });
    renderChecks(); renderReports(); setTab(state.tab); setOpen(state.open);
  });
})();
