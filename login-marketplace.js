/* Login Sandbox: Petstore auth exercise and the first local shop screen. */
(() => {
  'use strict';

  // Some catalog, cart and promotion defects below are intentional QA exercises.
  const products = [
    { id: 'nova-12', name: 'Смартфон Nova 12', category: 'Смартфоны', note: '128 ГБ · графит', price: 42990, art: 'phone', image: '' },
    { id: 'atlas-14', name: 'Ноутбук Atlas 14', category: 'Компьютеры', note: '14″ · 16 ГБ · 512 ГБ', price: 89990, cartPrice: 90990, art: 'laptop', image: '' },
    { id: 'orbit', name: 'Наушники Orbit', category: 'Аудио', note: 'Беспроводные · шумоподавление', price: 11990, art: 'camera', image: '' },
    { id: 'slate-11', name: 'Планшет Slate 11', category: 'Компьютеры', note: '11″ · 256 ГБ', price: 34990, art: 'tablet', image: '' },
    { id: 'pulse', name: 'Часы Pulse', category: 'Гаджеты', note: 'GPS · защита от воды', price: 17990, art: 'watch', image: '' },
    { id: 'frame-x', name: 'Камера Frame X', category: 'Гаджеты', note: '4K · стабилизация', price: 54990, art: 'camera', image: '' },
    { id: 'chrono-2', name: 'Часы Chrono 2', category: 'Гаджеты', note: 'Сняты с продажи · 64 ГБ', price: 12990, art: 'watch', image: '', retired: true }
  ];
  const activeProducts = products.filter(product => !product.retired);
  const promoRates = { QA1: .01, QA3: .03, QA5: .05, 'ЛЕТО2026': .05 }; // Expired code intentionally accepted.
  const productById = new Map(products.map(product => [product.id, product]));
  const art = {
    phone: '<rect x="38" y="12" width="44" height="96" rx="10"/><path d="M55 20h10M56 99h8"/>',
    laptop: '<rect x="18" y="20" width="84" height="59" rx="5"/><path d="M8 88h104l-7 11H15L8 88Z"/>',
    headphones: '<path d="M23 64V59a37 37 0 0 1 74 0v5"/><rect x="17" y="58" width="18" height="32" rx="8"/><rect x="85" y="58" width="18" height="32" rx="8"/>',
    tablet: '<rect x="25" y="12" width="70" height="96" rx="8"/><path d="M57 100h6"/>',
    watch: '<rect x="36" y="31" width="48" height="58" rx="13"/><path d="M45 31V8h30v23M45 89v23h30V89M51 60h18"/>',
    camera: '<path d="M14 43h17l8-10h40l8 10h19v58H14V43Z"/><circle cx="60" cy="70" r="20"/><path d="M88 53h8"/>'
  };
  const formatPrice = amount => `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;
  const storageKey = 'qa_login_marketplace_cart_v1';
  const promoStorageKey = 'qa_login_marketplace_promo_v1';
  const sessionKey = 'qa_login_marketplace_session_v1';

  document.addEventListener('DOMContentLoaded', () => {
    const api = window.QAtoDevPetstore;
    const form = document.getElementById('login-form');
    const modeAction = document.getElementById('login-mode-action');
    const modePrompt = document.getElementById('login-mode-prompt-text');
    const introDescription = document.getElementById('login-intro-description');
    const contactSwitch = document.getElementById('login-segmented');
    const nameBox = document.getElementById('name-container');
    const nameInput = document.getElementById('name-input');
    const phoneInput = document.getElementById('phone-input');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('login-button');
    const feedback = document.getElementById('inline-error');
    const authLayout = document.getElementById('login-layout');
    const taskSlider = document.getElementById('login-task-slider');
    const shop = document.getElementById('login-marketplace');
    if (!api || !form || !shop) return;

    let activeUser = null;
    let category = 'Все';
    let cart = {};
    let promoCode = '';

    function message(text, success = false) {
      feedback.textContent = text;
      feedback.classList.toggle('show', Boolean(text));
      feedback.classList.toggle('is-success', success);
    }

    function setMode(mode) {
      const registering = mode === 'register';
      form.dataset.mode = mode;
      nameBox.hidden = !registering;
      passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
      submitButton.textContent = registering ? 'Создать аккаунт' : 'Войти';
      document.querySelector('.login-intro h1').textContent = registering ? 'Создать аккаунт' : 'Войти в магазин';
      introDescription.textContent = registering
        ? 'Создайте учебный аккаунт, чтобы попробовать путь покупателя.'
        : 'Войдите, чтобы открыть каталог учебного магазина.';
      modePrompt.textContent = registering ? 'Уже есть аккаунт?' : 'Впервые здесь?';
      modeAction.textContent = registering ? 'Войти' : 'Создать аккаунт';
      if (!registering) nameInput.value = '';
      message('');
    }
    modeAction.addEventListener('click', () => setMode(form.dataset.mode === 'register' ? 'login' : 'register'));

    function contact() {
      const method = contactSwitch.dataset.active === 'email' ? 'email' : 'phone';
      if (method === 'email') {
        const value = emailInput.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Введите корректный email.');
        return { method, value };
      }
      const value = phoneInput.value.replace(/\D/g, '');
      if (!/^7\d{10}$/.test(value)) throw new Error('Введите номер из 11 цифр, начиная с +7.');
      return { method, value };
    }

    async function responseData(response) {
      try { return await response.json(); } catch { return null; }
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitButton.disabled) return;
      message('');
      let identity;
      try { identity = contact(); }
      catch (error) { message(error.message); return; }
      const password = passwordInput.value;
      const registering = form.dataset.mode === 'register';
      if (!password || (registering && password.length < 6)) {
        message(registering ? 'Для регистрации придумайте пароль не короче 6 символов.' : 'Введите пароль.');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = registering ? 'Создаём аккаунт…' : 'Входим…';
      try {
        if (registering) {
          const user = {
            id: Date.now(), username: identity.value,
            firstName: nameInput.value.trim() || 'Покупатель', lastName: '',
            email: identity.method === 'email' ? identity.value : '',
            phone: identity.method === 'phone' ? identity.value : '',
            password, userStatus: 1
          };
          const response = await api.createUser(user);
          const data = await responseData(response);
          if (!response.ok || Number(data?.code) !== 200) {
            message(`Регистрация не выполнена. Ответ сервера: HTTP ${response.status}.`);
            return;
          }
          setMode('login');
          passwordInput.value = '';
          passwordInput.dispatchEvent(new Event('input'));
          message('Учебный аккаунт создан. Теперь войдите с тем же контактом и паролем.', true);
          passwordInput.focus();
        } else {
          const response = await api.loginUser(identity.value, password);
          const data = await responseData(response);
          if (!response.ok || Number(data?.code) !== 200) {
            message(`Вход не выполнен. Ответ сервера: HTTP ${response.status}.`);
            return;
          }
          activeUser = identity;
          try { sessionStorage.setItem(sessionKey, JSON.stringify(identity)); } catch {}
          passwordInput.value = '';
          passwordInput.dispatchEvent(new Event('input'));
          showShop();
        }
      } catch {
        message('Не удалось связаться с учебным API. Проверьте соединение и повторите попытку.');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = form.dataset.mode === 'register' ? 'Создать аккаунт' : 'Войти';
      }
    });

    function readCart() {
      try {
        const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const saved = all?.[activeUser.value] || {};
        return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) =>
          productById.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99));
      } catch { return {}; }
    }
    function saveCart() {
      try {
        const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
        all[activeUser.value] = cart;
        localStorage.setItem(storageKey, JSON.stringify(all));
      } catch {}
    }
    function readPromo() {
      try {
        const saved = JSON.parse(localStorage.getItem(promoStorageKey) || '{}');
        const code = saved?.[activeUser.value];
        return Object.hasOwn(promoRates, code) ? code : '';
      } catch { return ''; }
    }
    function savePromo() {
      try {
        const saved = JSON.parse(localStorage.getItem(promoStorageKey) || '{}');
        saved[activeUser.value] = promoCode;
        localStorage.setItem(promoStorageKey, JSON.stringify(saved));
      } catch {}
    }

    function productArt(product) {
      const media = document.createElement('div');
      media.className = `demo-shop__media demo-shop__media--${product.art}`;
      if (product.image) {
        const image = document.createElement('img');
        image.src = product.image;
        image.alt = product.name;
        image.loading = 'lazy';
        media.append(image);
      } else {
        media.innerHTML = `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[product.art]}</svg>`;
      }
      return media;
    }

    function renderFilters() {
      const host = document.getElementById('shop-filters');
      host.replaceChildren();
      for (const label of ['Все', ...new Set(activeProducts.map(product => product.category))]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-pressed', String(category === label));
        button.addEventListener('click', () => { category = label; renderFilters(); renderProducts(); });
        host.append(button);
      }
    }

    function renderProducts() {
      const search = document.getElementById('shop-search').value.trim().toLocaleLowerCase('ru');
      const shown = products.filter(product =>
        // Intentionally lets a retired item leak into search and hides the phone in its category.
        (!product.retired || search) &&
        !(category === 'Смартфоны' && product.id === 'nova-12') &&
        (category === 'Все' || product.category === category) &&
        `${product.name} ${product.note} ${product.category}`.toLocaleLowerCase('ru').includes(search));
      const host = document.getElementById('shop-products');
      host.replaceChildren();
      document.getElementById('shop-results').textContent = `${shown.length} из ${activeProducts.length}`;
      if (!shown.length) {
        const empty = document.createElement('p');
        empty.className = 'demo-shop__empty';
        empty.textContent = 'По этому запросу товаров нет. Попробуйте другую категорию или название.';
        host.append(empty);
      }
      for (const product of shown) {
        const card = document.createElement('article');
        card.className = 'demo-shop__product';
        card.append(productArt(product));
        const details = document.createElement('div');
        details.className = 'demo-shop__product-details';
        const label = document.createElement('span'); label.className = 'demo-shop__category'; label.textContent = product.category;
        const title = document.createElement('h3'); title.textContent = product.name;
        const note = document.createElement('p'); note.textContent = product.note;
        const foot = document.createElement('div'); foot.className = 'demo-shop__product-foot';
        const price = document.createElement('strong'); price.textContent = formatPrice(product.price);
        const add = document.createElement('button'); add.type = 'button'; add.textContent = 'В корзину';
        add.setAttribute('aria-label', `Добавить ${product.name} в корзину`);
        add.addEventListener('click', () => updateQuantity(product.id, 1));
        foot.append(price, add); details.append(label, title, note, foot); card.append(details); host.append(card);
      }
    }

    function updateQuantity(id, delta) {
      const next = Math.min(99, Math.max(0, (cart[id] || 0) + delta));
      if (next) cart[id] = next;
      else delete cart[id];
      saveCart();
      renderCart();
    }

    function renderCart() {
      const host = document.getElementById('shop-cart-items');
      host.replaceChildren();
      let count = 0;
      let total = 0;
      for (const [id, quantity] of Object.entries(cart)) {
        const product = productById.get(id);
        if (!product) continue;
        count += quantity;
        const unitPrice = product.cartPrice ?? product.price;
        total += unitPrice * quantity;
        const row = document.createElement('div'); row.className = 'demo-shop__cart-row';
        const title = document.createElement('strong'); title.textContent = product.name;
        const price = document.createElement('span'); price.textContent = formatPrice(unitPrice * quantity);
        const controls = document.createElement('div'); controls.className = 'demo-shop__quantity';
        const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Убрать один ${product.name}`);
        const number = document.createElement('span'); number.textContent = String(quantity);
        const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.dataset.quantityAction = 'plus'; plus.disabled = quantity >= 99; plus.setAttribute('aria-label', `Добавить ещё один ${product.name}`);
        minus.addEventListener('click', () => updateQuantity(id, -1));
        plus.addEventListener('click', () => updateQuantity(id, 1));
        controls.append(minus, number, plus); row.append(title, price, controls); host.append(row);
      }
      if (!count) {
        const empty = document.createElement('p'); empty.className = 'demo-shop__cart-empty';
        empty.textContent = 'Пока пусто. Добавьте товар из каталога — он появится здесь.';
        host.append(empty);
      }
      document.getElementById('shop-cart-count').textContent = String(count);
      document.getElementById('shop-cart-heading-count').textContent = `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'товар' : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'товара' : 'товаров'}`;
      const bulkCoupon = Object.values(cart).some(quantity => quantity >= 10);
      const rate = bulkCoupon ? .9 : (promoRates[promoCode] || 0);
      const discount = Math.round(total * rate);
      const discountRow = document.getElementById('shop-cart-discount');
      discountRow.hidden = !discount;
      document.getElementById('shop-discount-label').textContent = bulkCoupon ? 'Автокупон 90%' : `${promoCode} · скидка ${Math.round(rate * 100)}%`;
      document.getElementById('shop-discount-value').textContent = `−${formatPrice(discount)}`;
      document.getElementById('shop-cart-total').textContent = formatPrice(total - discount);
    }

    function showShop() {
      if (!activeUser) return;
      cart = readCart();
      promoCode = readPromo();
      document.getElementById('shop-promo-input').value = promoCode;
      document.getElementById('shop-promo-message').textContent = '';
      document.getElementById('shop-user-name').textContent = activeUser.method === 'phone'
        ? `+${activeUser.value}` : activeUser.value;
      authLayout.hidden = true;
      taskSlider.hidden = true;
      shop.hidden = false;
      renderFilters();
      renderProducts();
      renderCart();
      shop.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    document.getElementById('shop-search').addEventListener('input', renderProducts);
    document.getElementById('shop-promo-form').addEventListener('submit', event => {
      event.preventDefault();
      const code = document.getElementById('shop-promo-input').value.trim().toLocaleUpperCase('ru');
      const message = document.getElementById('shop-promo-message');
      if (code && !Object.hasOwn(promoRates, code)) {
        message.textContent = 'Промокод не найден.';
        return;
      }
      promoCode = code;
      savePromo();
      message.textContent = code ? `Промокод ${code} применён.` : 'Промокод убран.';
      renderCart();
    });
    document.getElementById('shop-cart-jump').addEventListener('click', () =>
      document.getElementById('shop-cart').scrollIntoView({ block: 'start', behavior: 'smooth' }));
    document.getElementById('shop-logout').addEventListener('click', () => {
      try { sessionStorage.removeItem(sessionKey); } catch {}
      void api.logout().catch(() => {});
      activeUser = null;
      shop.hidden = true;
      authLayout.hidden = false;
      taskSlider.hidden = false;
      setMode('login');
      passwordInput.value = '';
      authLayout.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
      if (saved && ['phone', 'email'].includes(saved.method) && typeof saved.value === 'string') {
        activeUser = saved;
        showShop();
      }
    } catch {}
  });
})();
