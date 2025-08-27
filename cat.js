
    const CatImageCacheMode = {
      NONE: 'none',              // Не кэшировать (каждый раз грузим с сети)
      LOCAL_STORAGE: 'localStorage', // Сохранять в localStorage как data:URL
    };

    /** Текущий режим */
    const CAT_IMAGE_CACHE_MODE = CatImageCacheMode.LOCAL_STORAGE;

    /** Закругление углов изображений (CSS значение) */
    const CAT_IMG_BORDER_RADIUS = '12px';

    /** Флаг: ставим true, если хотим логгировать шаги в консоль */
    const CAT_DEBUG_LOGS = false;

    /** Флаг: принудительно обновить кэш (альтернатива query-параметру refreshCats=1) */
    const FORCE_REFRESH_CACHE = false;

    /* ===================== УТИЛИТЫ ===================== */

    /** Простенький логгер под флаг */
    function catLog(...args) {
      if (CAT_DEBUG_LOGS) console.log('[Cats]', ...args);
    }

    /** Получаем параметр URL */
    function getQueryParam(name) {
      const url = new URL(window.location.href);
      return url.searchParams.get(name);
    }

    /** Генерация URL для котика по тегу */
    function buildCatUrl(tag) {
      // Конечная точка возвращает изображение (не JSON). Тег кодируем.
      // Прим.: некоторые теги в исходном списке содержат пробелы/символы — безопасно кодируем.
      const safe = encodeURIComponent(String(tag || 'cat').trim());
      // Можно просить ресайз у cataas через параметры (поддерживает? чаще используются модификаторы/фильтры, оставим размер как есть).
      // На практике cataas хорошо отдаёт квадратные фото. При желании можно убрать параметры ширины/высоты.
      return `https://cataas.com/cat/${safe}`;
    }

    /** Преобразование Blob -> dataURL */
    function blobToDataURL(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    /** Ключ для localStorage на основе id карточки */
    function storageKeyForCardId(id) {
      return `qa2dev:cataas:img:${id}`;
    }

    /** Получаем ID поста из href (например, https://t.me/QAtoDev/409 -> "409") */
    function getPostIdFromHref(href) {
      try {
        const match = String(href || '').match(/\/(\d+)(\/)?$/);
        if (match && match[1]) return match[1];
      } catch (e) {}
      // Фолбэк — берем хеш от href
      return 'key_' + btoa(unescape(encodeURIComponent(href))).replace(/=+$/g, '');
    }

    /** Безопасный setItem в localStorage (с перехватом quota exceeded) */
    function safeSetLocalStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err) {
        console.warn('[Cats] Не удалось сохранить изображение в localStorage (возможно, переполнен):', err);
        return false;
      }
    }

    /** Удалить весь кэш котиков (вызовите из консоли window.clearCatImageCache()) */
    window.clearCatImageCache = function clearCatImageCache() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith('qa2dev:cataas:img:')) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      console.info(`[Cats] Очищено изображений из кэша: ${keys.length}`);
    };

    /* ===================== ПОДБОР ТЕГОВ ПО НАЗВАНИЮ ПЛАШКИ ===================== */

    /**
     * Карта "заголовок карточки" -> "тег cataas".
     * Ключи — в нижнем регистре, без лишних пробелов.
     * Если название не найдено в карте, будет использован фолбэк.
     */
    const TITLE_TO_TAG_MAP = {
      'шпора по git': 'sun',
      'шпора по charles': 'network',
      'шпора по docker': 'box',
      'большая шпора по ит': 'sun',
      'git для тестировщика': 'thinking',
      'курс по kibana': 'eyes',
      'тестирование безопасности': 'mask',
      'karpov курсы': 'reading',
      'карпов курсы': 'reading', // на всякий случай
      'курс белый хакер': 'maskcat',
      'большой учебник по тестированию': 'working',
      'публичные api': 'smile',
      'навигация': 'look',
      'вопросы по языкам программирования': 'supermodel',
      'устные задания qa': 'speaking',
      'что почитать?': 'swimming'
    };

    /** Дополнительные фолбэк-теги (если конкретного маппинга нет) — попробуем выбрать что-то тематичное */
    const FALLBACK_TAGS_ROTATION = [
      'cute',
      'cat',
      'smol',
      'loaf',
      'resting',
      'working',
      'santa',
      'wakup'
    ];
    let fallbackIndex = 0;

    function pickTagForTitle(titleText) {
      const norm = String(titleText || '').trim().toLowerCase();
      if (TITLE_TO_TAG_MAP[norm]) return TITLE_TO_TAG_MAP[norm];

      // не нашли — вернем что-то милое из ротации
      const tag = FALLBACK_TAGS_ROTATION[fallbackIndex % FALLBACK_TAGS_ROTATION.length];
      fallbackIndex += 1;
      return tag;
    }

    /* ===================== ОСНОВНАЯ ЛОГИКА ===================== */

    async function fetchCatAsDataUrl(tag) {
      const url = buildCatUrl(tag);
      const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке котика: ${url}`);
      const blob = await res.blob();
      return blobToDataURL(blob);
    }

    /** Вставить <img> с котиком вместо svg.tg-logo в конкретной карточке */
    async function applyCatToCard(cardEl, options) {
      const { useCache, forceRefresh } = options || {};
      const titleEl = cardEl.querySelector('.tg-title');
      const href = cardEl.getAttribute('href') || (cardEl.href || '');
      const postId = getPostIdFromHref(href);
      const title = titleEl ? titleEl.textContent.trim() : '';
      const tag = pickTagForTitle(title);

      const svg = cardEl.querySelector('svg.tg-logo');
      if (!svg) {
        // Возможно, уже заменяли ранее — не дублируем
        const already = cardEl.querySelector('img.tg-logo.cat-img');
        if (already) {
          catLog('Пропуск: картинка уже стоит', { title, href });
          return;
        }
      }

      // Создаем <img> заранее, поставим плейсхолдер и стили
      const img = document.createElement('img');
      img.className = 'tg-logo cat-img';
      img.alt = `Cat: ${tag}`;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';

      // Стили, чтобы сохранить визуал и сделать скругление
      img.style.display = 'block';
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = CAT_IMG_BORDER_RADIUS;
      img.style.objectFit = 'cover';

      // Вставляем img на место svg (если svg есть) — в начало карточки
      if (svg && svg.parentNode) {
        svg.parentNode.insertBefore(img, svg);
        svg.remove();
      } else {
        // svg не нашелся — вставим перед заголовком (сохраняем структуру карточки)
        const titleNode = cardEl.querySelector('.tg-title') || cardEl.firstChild;
        if (titleNode) {
          cardEl.insertBefore(img, titleNode);
        } else {
          cardEl.appendChild(img);
        }
      }

      // Работа с кэшем
      const cacheKey = storageKeyForCardId(postId);
      const mustRefresh = forceRefresh || (getQueryParam('refreshCats') === '1');

      if (useCache && !mustRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          // Используем локальную картинку без сети
          img.src = cached;
          catLog('Изображение взято из localStorage', { title, tag, postId });
          return;
        }
      }

      // Если кэш выключен или в кэше нет — грузим из сети
      try {
        if (useCache) {
          const dataUrl = await fetchCatAsDataUrl(tag);
          img.src = dataUrl;
          const saved = safeSetLocalStorage(cacheKey, dataUrl);
          if (saved) {
            catLog('Изображение сохранено в localStorage', { title, tag, postId });
          }
        } else {
          // Без кэша — просто ставим прямой URL (браузер сам закэширует по своим правилам)
          img.src = buildCatUrl(tag);
          catLog('Изображение загружено без кэша', { title, tag, postId });
        }
      } catch (err) {
        console.warn('[Cats] Ошибка загрузки котика, поставим фолбэк', err);
        // На случай сетевой ошибки поставим безопасный фолбэк
        img.src = buildCatUrl('cat');
      }
    }

    /** Обходим все карточки в блоке и заменяем иконки */
    async function replaceTgIconsWithCats() {
      const container = document.querySelector('#tg-links .tg-links-grid');
      if (!container) {
        catLog('Контейнер #tg-links .tg-links-grid не найден — пропуск.');
        return;
      }

      // Применим CSS-фикс к сетке (если нужно), чтобы картинки смотрелись аккуратно
      injectOnceCss(`
        #tg-links .tg-links-grid .tg-card .cat-img {
          border-radius: ${CAT_IMG_BORDER_RADIUS};
          display: block;
        }
      `);

      const cards = Array.from(container.querySelectorAll('a.tg-card'));
      if (!cards.length) {
        catLog('Карточки .tg-card не найдены — пропуск.');
        return;
      }

      const useCache = CAT_IMAGE_CACHE_MODE === CatImageCacheMode.LOCAL_STORAGE;
      const forceRefresh = FORCE_REFRESH_CACHE || (getQueryParam('refreshCats') === '1');

      await Promise.all(
        cards.map(card => applyCatToCard(card, { useCache, forceRefresh }))
      );
    }

    /** Вспомогательная функция для одноразовой инъекции CSS */
    function injectOnceCss(cssText) {
      const markerId = 'qa2dev-cats-style';
      if (document.getElementById(markerId)) return;
      const style = document.createElement('style');
      style.id = markerId;
      style.textContent = cssText;
      document.head.appendChild(style);
    }

    /* ===================== ИНИЦИАЛИЗАЦИЯ ===================== */

    document.addEventListener('DOMContentLoaded', () => {
      replaceTgIconsWithCats();
    });