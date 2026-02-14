/****************************************************
 *  БЛОК 1. Карусель, Ace-редакторы, визуал, fetch(...)
 *  Старая логика сетевых вызовов сохранена, добавлена
 *  «сказочная» логика поверх ответов + прогресс-карточки.
 ****************************************************/

document.addEventListener('DOMContentLoaded', function() {
    // --- 4.1. Логика карусели ---
    const slides = document.querySelectorAll('.api-slide');
    const prevBtn = document.getElementById('api-prev');
    const nextBtn = document.getElementById('api-next');
    const progressStripEl = document.getElementById('progress-strip');

    let currentSlide = 0; // индекс текущего слайда

    function showSlide(index) {
        slides.forEach((slide, i) => {
            const wasActive = slide.classList.contains('active');
            slide.classList.toggle('active', i === index);

            // Если слайд стал активным — ресайзим все Ace на нём
            if (!wasActive && i === index) {
                requestAnimationFrame(() => {
                    slide.querySelectorAll('.json-editor').forEach(div => {
                        if (div && editors[div.id]) {
                            editors[div.id].resize(true);
                            editors[div.id].renderer.updateFull();
                        }
                    });
                });
            }
        });
    }
    function goToSlide(idx) {
        currentSlide = (idx + slides.length) % slides.length;
        showSlide(currentSlide);
    }
    showSlide(currentSlide);

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });

    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    // --- 4.2. Общие переменные ---
    const hostname = "https://petstore.swagger.io/v2";

    // Игровые константы (картинки и описания)
    const IMAGES = {
        characters: {
            WizardMaleBlue: 'img/wizard/WizardMaleBlue.webp',
            WizardFemaleFire: 'img/wizard/WizardFemaleFire.webp'
        },
        scenes: {
            magicPlaceM: 'img/wizard/magicPlaceMaleBlue.webp',
            magicPlaceF: 'img/wizard/magicPlaceFemaleFire.webp',
            totemTempleM: 'img/wizard/totemTempleMaleBlue.webp',
            totemTempleF: 'img/wizard/totemTempleFemaleFire.webp',
            totemTravel: 'img/wizard/totem_travel.webp',
            uniteMCatFire: 'img/wizard/uniteMCatFire.webp',
            uniteMCatGreen: 'img/wizard/uniteMCatGreen.webp',
            uniteMCatPurple: 'img/wizard/uniteMCatPurple.webp',
            uniteMCatSnow: 'img/wizard/uniteMCatSnow.webp',
            uniteFCatFire: 'img/wizard/uniteFCatFire.webp',
            uniteFCatGreen: 'img/wizard/uniteFCatGreen.webp',
            uniteFCatPurple: 'img/wizard/uniteFCatPurple.webp',
            uniteFCatSnow: 'img/wizard/uniteFCatSnow.webp',
            vanishCat: 'img/wizard/vanishCat.webp',
            vanishChar: 'img/wizard/vanishChar.webp',
            // placeholder для ошибок
            placeholder: 'img/wizard/placeholder.webp'
        },
        totems: {
            // Сами тотем-животные (показываются в шаге 5)
            catFire: 'img/wizard/catFire.webp',
            catGreen: 'img/wizard/catGreen.webp',
            catPurple: 'img/wizard/catPurple.webp',
            catSnow: 'img/wizard/catSnow.webp',

            // ПРЕДПРОСМОТР/ПЕТ-иконки для шага 4 (по задаче)
            PawCatFire: 'img/wizard/PawCatFire.webp',
            PawCatGreen: 'img/wizard/PawCatGreen.webp',
            PawCatPurple: 'img/wizard/PawCatPurple.webp',
            PawCatSnow: 'img/wizard/PawCatSnow.webp',

            // Бегущие тотемы для шага 6 (по задаче)
            RunCatFire: 'img/wizard/RunCatFire.webp',
            RunCatGreen: 'img/wizard/RunCatGreen.webp',
            RunCatPurple: 'img/wizard/RunCatPurple.webp',
            RunCatSnow: 'img/wizard/RunCatSnow.webp'
        }
    };

    const TOTEM_INFO = {
        catFire:  { title: 'catFire',  power: 'Пылающий рывок — прожигает преграды, устойчив к огню.' },
        catGreen: { title: 'catGreen', power: 'Лесной лекарь — лечит союзников, маскируется в листве.' },
        catPurple:{ title: 'catPurple',power: 'Теневой скачок — короткий телепорт, устойчив к контролю.' },
        catSnow:  { title: 'catSnow',  power: 'Морозный щит — замедляет врагов, оставляет скользкие лужи.' }
    };

    const ALLOWED_CHARACTERS = ['WizardMaleBlue', 'WizardFemaleFire'];
    const ALLOWED_TOTEMS = Object.keys(TOTEM_INFO);

    // Заглушка ТОЛЬКО для карточек прогресса
    const PROGRESS_PLACEHOLDER = 'img/wizard/placePaw.webp'; // положите вашу картинку по этому пути

    // ----------------------------
    // Прогресс: карточки и last image
    // ----------------------------
    const PROGRESS_KEY = 'qa_magic_progress';       // массив из 9 строк (имя файла) или null

    function getBasename(path) {
        if (!path) return '';
        try {
            const q = path.split('?')[0];
            const h = q.split('#')[0];
            return h.split('/').pop() || '';
        } catch { return ''; }
    }
    function buildPathFromName(name) {
        const n = String(name || '').trim();
        return n ? `img/wizard/${n}` : PROGRESS_PLACEHOLDER;
    }

    function ensureProgressInit() {
        try {
            const raw = localStorage.getItem(PROGRESS_KEY);
            if (!raw) {
                const arr = Array(9).fill(getBasename(PROGRESS_PLACEHOLDER));
                localStorage.setItem(PROGRESS_KEY, JSON.stringify(arr));
                return arr;
            }
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === 9) return parsed;
            const fixed = Array(9).fill(getBasename(PROGRESS_PLACEHOLDER));
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(fixed));
            return fixed;
        } catch {
            const arr = Array(9).fill(getBasename(PROGRESS_PLACEHOLDER));
            try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(arr)); } catch {}
            return arr;
        }
    }

    function readProgress() {
        return ensureProgressInit();
    }
    function writeProgress(arr) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(arr)); } catch {}
    }
    function setProgress(stepIndex1to9, imgPath) {
        const idx = Math.min(9, Math.max(1, Number(stepIndex1to9))) - 1;
        const arr = readProgress();
        arr[idx] = getBasename(imgPath) || getBasename(PROGRESS_PLACEHOLDER);
        writeProgress(arr);
    }

    function renderProgressCards() {
        const wrap = document.getElementById('progress-strip');
        if (!wrap) return;
        const arr = readProgress();
        let html = '';
        for (let i = 0; i < 9; i++) {
            const name = arr[i];
            const stepNum = i + 1;
            const src = buildPathFromName(name);
            html += `
              <div class="progress-card" data-step="${stepNum}" title="Этап ${stepNum}" role="button" tabindex="0" aria-label="Перейти к этапу ${stepNum}">
                <div class="progress-card__badge">${stepNum}</div>
                <img loading="lazy" src="${src}" alt="Этап ${stepNum}" onerror="this.src='${PROGRESS_PLACEHOLDER}'" />
              </div>
            `;
        }
        wrap.innerHTML = html;
    }

    // При загрузке — отрисовать карточки
    renderProgressCards();

    // Делегирование кликов/клавиш на полосу прогресса — открыть нужный слайд
    if (progressStripEl) {
        progressStripEl.addEventListener('click', (e) => {
            const card = e.target.closest('.progress-card');
            if (!card) return;
            const step = Number(card.dataset.step) || 1;
            goToSlide(step - 1);
        });
        progressStripEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('.progress-card');
            if (!card) return;
            e.preventDefault();
            const step = Number(card.dataset.step) || 1;
            goToSlide(step - 1);
        });
    }

    // Состояние игры, храним в localStorage (как было)
    let gameState = loadState();

    function loadState() {
        try {
            const raw = localStorage.getItem('qa_magic_state');
            return raw ? JSON.parse(raw) : {
                character: { type: null, name: null, payload: null },
                totem: { type: null, id: null, payload: null },
                order: { id: null, payload: null }
            };
        } catch {
            return {
                character: { type: null, name: null, payload: null },
                totem: { type: null, id: null, payload: null },
                order: { id: null, payload: null }
            };
        }
    }
    function saveState() {
        try { localStorage.setItem('qa_magic_state', JSON.stringify(gameState)); } catch {}
    }
    function clearState() {
        gameState = {
            character: { type: null, name: null, payload: null },
            totem: { type: null, id: null, payload: null },
            order: { id: null, payload: null }
        };
        saveState();
    }

    // Вспомогательный визуал (оставлено, без изменения)
    function updateVisual(containerId, imgSrc, caption) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const src = imgSrc || IMAGES.scenes.placeholder;
        const safeCaption = caption || '';
        el.innerHTML = `
            <figure class="story-visual__figure">
                <img src="${src}" alt="visual" onerror="this.src='${IMAGES.scenes.placeholder}'" />
                <figcaption>${safeCaption}</figcaption>
            </figure>
        `;
        el.classList.add('visible');
    }

    // Хелперы выбора изображений
    function isMaleWizard() {
        return gameState?.character?.type === 'WizardMaleBlue';
    }
    function getMagicPlaceImage() {
        if (isMaleWizard()) return IMAGES.scenes.magicPlaceM;
        if (gameState?.character?.type === 'WizardFemaleFire') return IMAGES.scenes.magicPlaceF;
        return IMAGES.scenes.placeholder;
    }
    function getTotemTempleImage() {
        if (isMaleWizard()) return IMAGES.scenes.totemTempleM;
        if (gameState?.character?.type === 'WizardFemaleFire') return IMAGES.scenes.totemTempleF;
        return IMAGES.scenes.placeholder;
    }
    function getUniteImage(charType, totemType) {
        const isM = charType === 'WizardMaleBlue';
        const isF = charType === 'WizardFemaleFire';
        const t = String(totemType || '').trim();
        if (isM) {
            if (t === 'catFire')   return IMAGES.scenes.uniteMCatFire;
            if (t === 'catGreen')  return IMAGES.scenes.uniteMCatGreen;
            if (t === 'catPurple') return IMAGES.scenes.uniteMCatPurple;
            if (t === 'catSnow')   return IMAGES.scenes.uniteMCatSnow;
        }
        if (isF) {
            if (t === 'catFire')   return IMAGES.scenes.uniteFCatFire;
            if (t === 'catGreen')  return IMAGES.scenes.uniteFCatGreen;
            if (t === 'catPurple') return IMAGES.scenes.uniteFCatPurple;
            if (t === 'catSnow')   return IMAGES.scenes.uniteFCatSnow;
        }
        return IMAGES.scenes.placeholder;
    }
    function getPawImageForTag(tagName) {
        switch (String(tagName || '').trim()) {
            case 'catFire':   return IMAGES.totems.PawCatFire;
            case 'catGreen':  return IMAGES.totems.PawCatGreen;
            case 'catPurple': return IMAGES.totems.PawCatPurple;
            case 'catSnow':   return IMAGES.totems.PawCatSnow;
            default:          return IMAGES.scenes.placeholder;
        }
    }
    function getRunImageForTag(tagName) {
        switch (String(tagName || '').trim()) {
            case 'catFire':   return IMAGES.totems.RunCatFire;
            case 'catGreen':  return IMAGES.totems.RunCatGreen;
            case 'catPurple': return IMAGES.totems.RunCatPurple;
            case 'catSnow':   return IMAGES.totems.RunCatSnow;
            default:          return IMAGES.scenes.placeholder;
        }
    }

    // ==========================================================
    // Ace Editors: инициализация, шаблоны, тулбар
    // ==========================================================
    const editors = {}; // id -> aceEditor instance
    if (window.ace && ace.config) {
        ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.4/');
    }

    // Шаблоны корректного JSON
    const templates = {
        editor_create_user: `{
  "id": 34764558494,
  "username": "Merlin123",
  "firstName": "Мерлин",
  "lastName": "Синклер",
  "email": "MerlinSyncler@mail.com",
  "password": "12345",
  "phone": "+79996276400",
  "userStatus": 5,
  "character": "WizardMaleWhite"
}`,
        editor_get_user: `{
  "path": {
    "username": "Merlin133"
  }
}`,
        editor_login: `{
  "query": {
    "username": "Merlin123",
    "password": "55555"
  }
}`,
        editor_create_pet: `{
  "id": 156941428,
  "category": { "id": 1, "name": "" },
  "name": "Кавендиш",
  "photoUrls": ["string"],
  "tags": [
    { "id": 2, "name": "" }
  ],
  "status": "available"
}`,
        editor_get_pet: `{
  "path": {
    "petId": 156941429
  }
}`,
        editor_create_order: `{
  "id": 1987,
  "petId": 156941429,
  "quantity": 1,
  "shipDate": "2024-04-10T19:16:28.625+0000",
  "status": "placed",
  "complete": true
}`,
        editor_get_order: `{
  "path": {
    "orderId":
  }
}`,
        editor_delete_order: `{
  "path": {
    "orderId": 1983
  }
}`,
        editor_delete_user: `{
  path": {
    "username": "Merlen321"
  }
}`
    };

    // «Поломанные» JSON – задания на исправление
    const brokenTemplates = {
        editor_create_user: `{
  "id": 777
  "username": "Merlin123",
  "firstName": "Мерлин",
  "lastName": "Синклер",
  "email": "barin@gmail.com",
  "password": 12345,
  "phone": "89000995903",
  "userStatus": 5,
  "character": WizardMaleBlue,
}`,

        editor_login: `{
  "query": {
    "username": Merleen555,
    password: "55555",
  }
}`,

        editor_create_pet: `{
  "id": 15
  "category": { id: 1, name: "Кошка" },
  "name": "",
  "photoUrls": ["string"],
  "tags": [
    { "id": 2, name: catFire }
  ],
  "status": "available",
}`
    };

    const stepMeta = {
        editor_create_user: {
            main: "Создай персонажа: заполни обязательные поля и укажи character.",
            info: "Допустимый character: WizardMaleBlue или WizardFemaleFire. Для тренировки ошибок можно нажать «Задание: исправь ошибки».",
            troubleshoot: "Если не сработало: проверь запятые, кавычки и значение character.",
            devtools: "Network -> Fetch/XHR -> POST /user: проверь Request Payload и код ответа."
        },
        editor_get_user: {
            main: "Получи персонажа: укажи path.username.",
            info: "Используй username из шага 1.",
            troubleshoot: "Если не сработало: сравни path.username с username из шага 1.",
            devtools: "Проверь GET /user/{username} и поле username в URL."
        },
        editor_login: {
            main: "Выполни вход: заполни query.username и query.password.",
            info: "Нужны username/password из шага 1. В этом шаге есть режим «исправь ошибки».",
            troubleshoot: "Если не сработало: логин/пароль должны полностью совпадать с шагом 1.",
            devtools: "Открой GET /user/login и проверь query params."
        },
        editor_create_pet: {
            main: "Создай тотема: заполни тело и выбери tags[0].name.",
            info: "Допустимые значения tags[0].name: catFire/catGreen/catPurple/catSnow.",
            troubleshoot: "Если не сработало: проверь tags[0].name и структуру массива tags.",
            devtools: "В POST /pet проверь body: id и tags[0].name."
        },
        editor_get_pet: {
            main: "Проверь тотема: укажи path.petId.",
            info: "Используй id тотема из шага 4.",
            troubleshoot: "Если не сработало: сверь path.petId с id из шага 4.",
            devtools: "Проверь URL GET /pet/{petId}."
        },
        editor_create_order: {
            main: "Создай заказ: заполни id, petId, quantity, shipDate, status, complete.",
            info: "petId должен указывать на тотем из шага 4.",
            troubleshoot: "Если не сработало: проверь формат shipDate и соответствие petId.",
            devtools: "В POST /store/order проверь отправленный JSON."
        },
        editor_get_order: {
            main: "Проверь заказ: укажи path.orderId.",
            info: "Используй orderId из шага 6.",
            troubleshoot: "Если не сработало: сверяй orderId из шага 6 и petId тотема.",
            devtools: "Проверь GET /store/order/{orderId}."
        },
        editor_delete_order: {
            main: "Отмени выбор тотема: укажи path.orderId.",
            info: "Нужен актуальный orderId.",
            troubleshoot: "Если не сработало: заказ уже удален или orderId неверный.",
            devtools: "Проверь DELETE /store/order/{orderId}."
        },
        editor_delete_user: {
            main: "Отмени выбор персонажа: укажи path.username.",
            info: "Используй username из шага 1.",
            troubleshoot: "Если не сработало: проверь username из шага 1.",
            devtools: "Проверь DELETE /user/{username}."
        }
    };

    const quickChips = {
        editor_create_user: [
            { keyLabel: "character", valueLabel: "\"WizardMaleBlue\"", path: "character", value: "WizardMaleBlue" },
            { keyLabel: "character", valueLabel: "\"WizardFemaleFire\"", path: "character", value: "WizardFemaleFire" },
            { keyLabel: "firstName", valueLabel: "\"Merlin\"", path: "firstName", value: "Merlin" },
            { keyLabel: "firstName", valueLabel: "\"Asha\"", path: "firstName", value: "Asha" }
        ],
        editor_get_user: [
            { keyLabel: "path.username", valueLabel: "(из шага 1)", path: "path.username", fromState: "character.payload.username" },
            { keyLabel: "path.username", valueLabel: "\"Merlin123\"", path: "path.username", value: "Merlin123" }
        ],
        editor_login: [
            { keyLabel: "query.username", valueLabel: "(из шага 1)", path: "query.username", fromState: "character.payload.username" },
            { keyLabel: "query.password", valueLabel: "(из шага 1)", path: "query.password", fromState: "character.payload.password" },
            { keyLabel: "query.password", valueLabel: "\"12345\"", path: "query.password", value: "12345" }
        ],
        editor_create_pet: [
            { keyLabel: "tags[0].name", valueLabel: "\"catFire\"", path: "tags.0.name", value: "catFire" },
            { keyLabel: "tags[0].name", valueLabel: "\"catGreen\"", path: "tags.0.name", value: "catGreen" },
            { keyLabel: "tags[0].name", valueLabel: "\"catPurple\"", path: "tags.0.name", value: "catPurple" },
            { keyLabel: "tags[0].name", valueLabel: "\"catSnow\"", path: "tags.0.name", value: "catSnow" }
        ],
        editor_get_pet: [
            { keyLabel: "path.petId", valueLabel: "(из шага 4)", path: "path.petId", fromState: "totem.id" }
        ],
        editor_create_order: [
            { keyLabel: "petId", valueLabel: "(из шага 4)", path: "petId", fromState: "totem.id" },
            { keyLabel: "status", valueLabel: "\"placed\"", path: "status", value: "placed" },
            { keyLabel: "status", valueLabel: "\"approved\"", path: "status", value: "approved" },
            { keyLabel: "complete", valueLabel: "true", path: "complete", value: true }
        ],
        editor_get_order: [
            { keyLabel: "path.orderId", valueLabel: "(из шага 6)", path: "path.orderId", fromState: "order.id" }
        ],
        editor_delete_order: [
            { keyLabel: "path.orderId", valueLabel: "(из шага 6)", path: "path.orderId", fromState: "order.id" }
        ],
        editor_delete_user: [
            { keyLabel: "path.username", valueLabel: "(из шага 1)", path: "path.username", fromState: "character.payload.username" }
        ]
    };

    const stepRuntime = {};
    const feedbackEls = {};

    function getByPath(obj, dotPath) {
        if (!dotPath) return undefined;
        return String(dotPath).split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
    }

    function setByPath(obj, dotPath, value) {
        const parts = String(dotPath).split('.');
        let ref = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            const nextKey = parts[i + 1];
            const needsArray = /^\d+$/.test(nextKey);
            if (ref[key] === undefined || ref[key] === null || typeof ref[key] !== 'object') {
                ref[key] = needsArray ? [] : {};
            }
            ref = ref[key];
        }
        ref[parts[parts.length - 1]] = value;
    }

    function parseEditorOrTemplate(editorId) {
        const current = editors[editorId]?.getValue() || "{}";
        try {
            return JSON.parse(current);
        } catch {
            try {
                return JSON.parse(templates[editorId] || "{}");
            } catch {
                return {};
            }
        }
    }

    function escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function tryPatchEditorText(editorId, chip, resolvedValue) {
        const ed = editors[editorId];
        if (!ed) return false;
        const text = ed.getValue();
        let next = text;
        const jsonValue = JSON.stringify(resolvedValue);

        // Спец-кейс шага 4: не трогаем формат, меняем только tags[0].name
        if (editorId === 'editor_create_pet' && chip.path === 'tags.0.name') {
            const reTagsName = /("tags"\s*:\s*\[\s*\{[\s\S]*?"name"\s*:\s*)(?:"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?)/;
            next = text.replace(reTagsName, `$1${jsonValue}`);
        } else {
            const key = String(chip.path || '').split('.').pop();
            if (!key) return false;
            const re = new RegExp(`("${escapeRegExp(key)}"\\s*:\\s*)(?:"(?:\\\\.|[^"\\\\])*"|true|false|null|-?\\d+(?:\\.\\d+)?)`);
            next = text.replace(re, `$1${jsonValue}`);
        }

        if (next !== text) {
            ed.session.setValue(next);
            requestAnimationFrame(() => {
                ed.resize(true);
                ed.renderer.updateFull();
            });
            return true;
        }
        return false;
    }

    function refreshEditor(editorId, valueObj) {
        const ed = editors[editorId];
        if (!ed) return;
        ed.session.setValue(JSON.stringify(valueObj, null, 2));
        requestAnimationFrame(() => {
            ed.resize(true);
            ed.renderer.updateFull();
        });
    }

    function setStepFeedback(editorId, type, message, addTroubleshoot = false) {
        const meta = stepMeta[editorId];
        const target = feedbackEls[editorId];
        if (!target) return;
        target.className = `step-feedback is-${type}`;
        let html = `<strong>${message}</strong>`;
        if (addTroubleshoot && meta?.troubleshoot) {
            html += `<span>${meta.troubleshoot}</span>`;
        }
        target.innerHTML = html;
    }

    function markAttempt(editorId) {
        if (!stepRuntime[editorId]) stepRuntime[editorId] = { attempts: 0, fails: 0 };
        stepRuntime[editorId].attempts += 1;
    }

    function markFailure(editorId, message) {
        if (!stepRuntime[editorId]) stepRuntime[editorId] = { attempts: 0, fails: 0 };
        stepRuntime[editorId].fails += 1;
        const showTroubleshoot = stepRuntime[editorId].fails >= 2;
        setStepFeedback(editorId, "error", message, showTroubleshoot);
    }

    function markSuccess(editorId, message) {
        if (!stepRuntime[editorId]) stepRuntime[editorId] = { attempts: 0, fails: 0 };
        stepRuntime[editorId].fails = 0;
        setStepFeedback(editorId, "success", message, false);
    }

    function applyQuickChip(editorId, chip) {
        const resolvedValue = chip.fromState ? getByPath(gameState, chip.fromState) : chip.value;
        if (resolvedValue === undefined || resolvedValue === null || resolvedValue === "") {
            setStepFeedback(editorId, "warn", "Нет данных из предыдущих шагов. Сначала пройди предыдущий этап.", false);
            return;
        }

        // Сначала пробуем точечную замену без переформатирования текущего JSON
        const patched = tryPatchEditorText(editorId, chip, resolvedValue);
        if (!patched) {
            const payload = parseEditorOrTemplate(editorId);
            setByPath(payload, chip.path, resolvedValue);
            refreshEditor(editorId, payload);
        }

        const keyView = chip.keyLabel || chip.path || "field";
        setStepFeedback(editorId, "info", `Подставлено поле: ${keyView}`, false);
    }

    function renderStepAssist() {
        document.querySelectorAll('.api-slide').forEach((slide) => {
            const editorEl = slide.querySelector('.json-editor');
            if (!editorEl) return;
            const editorId = editorEl.id;
            const meta = stepMeta[editorId];
            if (!meta) return;

            const assignment = slide.querySelector('.assignment');
            if (assignment) {
                assignment.innerHTML = `
                    <div class="assignment-core"><strong>Задание:</strong> ${meta.main}</div>
                    <div class="info-hints">
                        <div class="info-hint">
                            <button type="button" class="info-hint__btn" aria-label="Подсказка к шагу">!</button>
                            <div class="info-hint__panel">${meta.info}</div>
                        </div>
                        <div class="info-hint">
                            <button type="button" class="info-hint__btn" aria-label="Подсказка по devtools">!</button>
                            <div class="info-hint__panel">${meta.devtools}</div>
                        </div>
                    </div>
                `;
            }

            const editorWrap = slide.querySelector('.json-editor-container');
            if (editorWrap) {
                const panel = document.createElement('div');
                panel.className = 'quick-builder';
                panel.innerHTML = `
                    <div class="quick-builder__head">
                        <div class="quick-builder__head-title">Быстрое заполнение</div>
                        <div class="info-hint">
                            <button type="button" class="info-hint__btn" aria-label="Подсказка по чипам">!</button>
                            <div class="info-hint__panel">Чипы подставляют конкретные поля JSON. Формат: ключ = значение.</div>
                        </div>
                    </div>
                    <div class="quick-builder__chips" data-editor="${editorId}"></div>
                    <div class="step-feedback is-hidden" data-feedback="${editorId}"></div>
                `;
                editorWrap.appendChild(panel);
                feedbackEls[editorId] = panel.querySelector(`[data-feedback="${editorId}"]`);

                const chipsHost = panel.querySelector('.quick-builder__chips');
                (quickChips[editorId] || []).forEach((chip) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'quick-chip';
                    btn.innerHTML = `<span class="quick-chip__key">${chip.keyLabel || chip.path}</span> <span class="quick-chip__eq">=</span> <span class="quick-chip__val">${chip.valueLabel || "(value)"}</span>`;
                    btn.addEventListener('click', () => applyQuickChip(editorId, chip));
                    chipsHost.appendChild(btn);
                });
            }
        });

        document.querySelectorAll('.info-hint__btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const wrap = btn.closest('.info-hint');
                if (!wrap) return;
                const wasOpen = wrap.classList.contains('is-open');
                document.querySelectorAll('.info-hint.is-open').forEach(el => el.classList.remove('is-open'));
                if (!wasOpen) wrap.classList.add('is-open');
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.info-hint')) return;
            document.querySelectorAll('.info-hint.is-open').forEach(el => el.classList.remove('is-open'));
        });
    }

    function setEditorTheme(ed) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ed.setTheme(isDark ? "ace/theme/dracula" : "ace/theme/chrome");
    }

    function applyEditorViewportMode(ed) {
        if (!ed) return;
        const isMobile = window.matchMedia('(max-width: 900px)').matches;
        if (isMobile) {
            ed.setOption('maxLines', Infinity);
            ed.setOption('minLines', 12);
        } else {
            ed.setOption('maxLines', 0);
            ed.setOption('minLines', 0);
        }
    }

    function initEditor(editorId, initialValue) {
        const el = document.getElementById(editorId);
        if (!el || !window.ace) return null;

        const ed = ace.edit(editorId);
        ed.session.setMode("ace/mode/json");
        ed.setOptions({
            fontSize: "13px",
            wrap: true,
            tabSize: 2,
            useSoftTabs: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: false,
            showPrintMargin: false
        });
        applyEditorViewportMode(ed);
        setEditorTheme(ed);
        ed.session.setValue(initialValue || "{}");

        requestAnimationFrame(() => {
            ed.resize(true);
            ed.renderer.updateFull();
        });

        editors[editorId] = ed;
        return ed;
    }

    const themeObserver = new MutationObserver(() => {
        Object.values(editors).forEach(ed => setEditorTheme(ed));
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Инициализация всех редакторов
    initEditor("editor_create_user",   templates.editor_create_user);
    initEditor("editor_get_user",      templates.editor_get_user);
    initEditor("editor_login",         templates.editor_login);
    initEditor("editor_create_pet",    templates.editor_create_pet);
    initEditor("editor_get_pet",       templates.editor_get_pet);
    initEditor("editor_create_order",  templates.editor_create_order);
    initEditor("editor_get_order",     templates.editor_get_order);
    initEditor("editor_delete_order",  templates.editor_delete_order);
    initEditor("editor_delete_user",   templates.editor_delete_user);
    renderStepAssist();

    // Тулбар: reset / broken / format
    document.querySelectorAll('.json-toolbar button').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const target = btn.getAttribute('data-target');
            const ed = editors[target];
            if (!ed) return;

            if (action === 'reset') {
                ed.session.setValue(templates[target] || "{}");
            } else if (action === 'broken') {
                if (brokenTemplates[target]) {
                    ed.session.setValue(brokenTemplates[target]);
                } else {
                    alert("Для этого шага нет задания с ошибками.");
                }
            } else if (action === 'format') {
                try {
                    const parsed = JSON.parse(ed.getValue());
                    ed.session.setValue(JSON.stringify(parsed, null, 2));
                    setStepFeedback(target, "info", "JSON отформатирован.", false);
                } catch (e) {
                    setStepFeedback(target, "warn", `Форматирование не выполнено: ${e.message}`, false);
                }
            }

            requestAnimationFrame(() => {
                ed.resize(true);
                ed.renderer.updateFull();
                ed.focus();
            });
        });
    });

    window.addEventListener('resize', () => {
        Object.values(editors).forEach(ed => applyEditorViewportMode(ed));
        document.querySelectorAll('.json-editor').forEach(div => {
            const ed = editors[div.id];
            if (ed) ed.resize(true);
        });
    });

    // Утилиты
    function safeJSONStringify(obj) {
        try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
    }
    function showError(preId, message) {
        const pre = document.getElementById(preId);
        if (pre) pre.textContent = "Ошибка: " + message;
    }
    function equalsSubset(obj, ref, keys) {
        return keys.every(k => String(obj?.[k]) === String(ref?.[k]));
    }

    // Хелпер: записать прогресс + глобальное изображение и перерисовать карточки
    function recordProgress(stepIndex, imgPath) {
        setProgress(stepIndex, imgPath);
        renderProgressCards(); // делегирование событий остаётся на контейнере
    }

    // ==========================================================
    // 4.3. Функции для запросов (+ сказочная визуализация)
    // ==========================================================

    // (1) Создание персонажа
    window.createUser = function() {
        const editorId = 'editor_create_user';
        const preId = 'user_create_response';
        const visualId = 'user_create_visual';
        let bodyData;
        markAttempt(editorId);

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            // Даже placeholder фиксируем в прогрессе
            recordProgress(1, IMAGES.scenes.placeholder);
            return;
        }

        const charType = bodyData?.character;
        const isAllowedCharacter = ALLOWED_CHARACTERS.includes(charType);

        fetch(`${hostname}/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "accept": "application/json" },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            // Успешный ответ от бэка
            if (data && Number(data.code) === 200 && isAllowedCharacter) {
                // Сохраняем состояние + ЛОГИН/ПАРОЛЬ для шага 3
                gameState.character.type = charType;
                gameState.character.name = bodyData?.firstName || bodyData?.username || 'Герой';
                gameState.character.payload = bodyData;
                saveState();

                const img = IMAGES.characters[charType] || IMAGES.scenes.placeholder;
                updateVisual(
                    visualId,
                    img,
                    `Поздравляю, вы создали персонажа <strong>${gameState.character.name}</strong>!`
                );
                markSuccess(editorId, "Шаг пройден. Персонаж создан успешно.");

                // Прогресс: шаг 1
                recordProgress(1, img);
            } else {
                updateVisual(visualId, IMAGES.scenes.placeholder, 'Здесь точно что-то не так...Проверь тип персонажа (character) и повтори отправку.');
                markFailure(editorId, "Шаг не пройден. Проверь обязательные поля и character.");
                // Фиксируем placeholder в прогрессе
                recordProgress(1, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            // Фиксируем placeholder в прогрессе
            recordProgress(1, IMAGES.scenes.placeholder);
        });
    };

    // (2) Отправка персонажа на миссию (получить пользователя)
    window.getUserByName = function() {
        const editorId = 'editor_get_user';
        const preId = 'get_user_response';
        const visualId = 'get_user_visual';
        let dataPath;
        markAttempt(editorId);

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(2, IMAGES.scenes.placeholder);
            return;
        }
        const usernameValue = dataPath?.path?.username;
        if (!usernameValue) {
            showError(preId, "Укажи username в { \"path\": { \"username\": \"...\" } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан username.');
            markFailure(editorId, "Шаг не пройден. Не заполнен path.username.");
            recordProgress(2, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/user/${encodeURIComponent(usernameValue)}`, {
            method: "GET",
            headers: { "accept": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            // Сравниваем с тем, что отправляли при создании персонажа
            const keys = ['id','username','firstName','lastName','email','phone','userStatus'];
            if (gameState.character.payload && equalsSubset(data, gameState.character.payload, keys)) {
                const heroName = gameState.character.name || data.firstName || 'Герой';
                // Выбираем сцену по персонажу (magicPlaceM/F)
                const img = getMagicPlaceImage();
                updateVisual(
                    visualId,
                    img,
                    `${heroName} в волшебных землях!`
                );
                markSuccess(editorId, "Шаг пройден. Персонаж найден и подтвержден.");

                // Прогресс: шаг 2
                recordProgress(2, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Данные персонажа на сервере не совпали с созданием. Данный запрос отдает информацию через раз...Попробуй снова. Здесь нужен username из 1 запроса'
                );
                markFailure(editorId, "Шаг не пройден. Проверь username и совпадение данных с шагом 1.");
                recordProgress(2, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(2, IMAGES.scenes.placeholder);
        });
    };

    // (3) Врата Святилища Тотемов (login)
    window.loginUser = function() {
        const editorId = 'editor_login';
        const preId = 'login_response';
        const visualId = 'login_visual';
        let dataQuery;
        markAttempt(editorId);

        try {
            dataQuery = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(3, IMAGES.scenes.placeholder);
            return;
        }

        const usernameValue = dataQuery?.query?.username;
        const passwordValue = dataQuery?.query?.password;

        if (!usernameValue || !passwordValue) {
            showError(preId, "Укажи \"query\": { \"username\": \"...\", \"password\": \"...\" }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Требуются username и password.');
            markFailure(editorId, "Шаг не пройден. Заполни query.username и query.password.");
            recordProgress(3, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/user/login?username=${encodeURIComponent(usernameValue)}&password=${encodeURIComponent(passwordValue)}`, {
            method: "GET",
            headers: { "accept": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            // БЭК часто отдаёт 200 вне зависимости от фактической пары логин/пароль.
            // Поэтому ДОПОЛНИТЕЛЬНО сверяем с сохранёнными данными регистрации (шаг 1).
            const registered = gameState?.character?.payload;
            if (!registered) {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Сначала создайте персонажа (шаг 1), затем входите в святилище.'
                );
                markFailure(editorId, "Шаг не пройден. Сначала заверши шаг 1.");
                recordProgress(3, IMAGES.scenes.placeholder);
                return;
            }

            const sameUser = String(usernameValue) === String(registered.username);
            const samePass = String(passwordValue) === String(registered.password);

            if (Number(data.code) === 200 && sameUser && samePass) {
                // Врата святилища — картинка зависит от персонажа (totemTempleM/F)
                const img = getTotemTempleImage();
                updateVisual(
                    visualId,
                    img,
                    'Врата святилища открыты — теперь переходи к выбору своего тотема!'
                );
                markSuccess(editorId, "Шаг пройден. Вход выполнен корректно.");

                // Прогресс: шаг 3
                recordProgress(3, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Ваш логин и/или пароль отличаются от указанных при регистрации.'
                );
                markFailure(editorId, "Шаг не пройден. Логин/пароль не совпали с шагом 1.");
                recordProgress(3, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(3, IMAGES.scenes.placeholder);
        });
    };

    // (4) Создание своего тотема — показываем PawCat...
    window.createPet = function() {
        const editorId = 'editor_create_pet';
        const preId = 'pet_create_response';
        const visualId = 'pet_create_visual';
        let bodyData;
        markAttempt(editorId);

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(4, IMAGES.scenes.placeholder);
            return;
        }

        const chosenTag = bodyData?.tags?.[0]?.name;
        const isAllowedTotem = ALLOWED_TOTEMS.includes(chosenTag);

        fetch(`${hostname}/pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "accept": "application/json" },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            if (data && data.id !== undefined && isAllowedTotem) {
                gameState.totem.type = chosenTag;
                gameState.totem.id = bodyData.id;
                gameState.totem.payload = bodyData;
                saveState();

                const info = TOTEM_INFO[chosenTag];
                // ВАЖНО: здесь показываем PawCat... (иконку), а НЕ animal-картинку
                const img = getPawImageForTag(chosenTag);
                updateVisual(
                    visualId,
                    img,
                    `Тотем выбран: <strong>${info.title}</strong>. ${info.power}`
                );
                markSuccess(editorId, "Шаг пройден. Тотем создан и сохранен.");

                // Прогресс: шаг 4
                recordProgress(4, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Проверь выбор тотема в tags[0].name (catFire/catGreen/catPurple/catSnow).'
                );
                markFailure(editorId, "Шаг не пройден. Неверный tags[0].name или структура тела.");
                recordProgress(4, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(4, IMAGES.scenes.placeholder);
        });
    };

    // (5) Проверка создания тотема — ОСТАВЛЯЕМ животных Cat... (как и просили)
    window.getPetById = function() {
        const editorId = 'editor_get_pet';
        const preId = 'get_pet_response';
        const visualId = 'get_pet_visual';
        let dataPath;
        markAttempt(editorId);
        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(5, IMAGES.scenes.placeholder);
            return;
        }

        const getPetIdValue = dataPath?.path?.petId;
        if (getPetIdValue === undefined || getPetIdValue === null || getPetIdValue === "") {
            showError(preId, "Укажи petId в { \"path\": { \"petId\": 15 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан petId.');
            markFailure(editorId, "Шаг не пройден. Не заполнен path.petId.");
            recordProgress(5, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/pet/${encodeURIComponent(getPetIdValue)}`, {
            method: "GET",
            headers: { "accept": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            // Проверим соответствие id и известного тотема
            if ((String(data?.id) === String(gameState.totem.id)) && ALLOWED_TOTEMS.includes(gameState.totem.type)) {
                // ЗДЕСЬ — животные Cat..., как и раньше
                const img = IMAGES.totems[gameState.totem.type] || IMAGES.scenes.placeholder;
                const info = TOTEM_INFO[gameState.totem.type] || { title: 'Тотем', power: '' };
                updateVisual(
                    visualId,
                    img,
                    `Тотем подтверждён: <strong>${info.title}</strong>. ${info.power}`
                );
                markSuccess(editorId, "Шаг пройден. Тотем подтвержден.");

                // Прогресс: шаг 5
                recordProgress(5, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Тотем не подтверждён. Проверь petId или создай тотем заново. Важно. что petId = Id из прошлого запроса.'
                );
                markFailure(editorId, "Шаг не пройден. petId не совпал с созданным тотемом.");
                recordProgress(5, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(5, IMAGES.scenes.placeholder);
        });
    };

    // (6) Вызов тотема (создание заказа) — ВЫВОДИМ RunCat... по выбранному тотему
    window.createOrder = function() {
        const editorId = 'editor_create_order';
        const preId = 'create_order_response';
        const visualId = 'create_order_visual';
        let bodyData;
        markAttempt(editorId);

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(6, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/store/order`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "accept": "application/json" },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            if (data && data.id !== undefined) {
                gameState.order.id = data.id;
                gameState.order.payload = data;
                saveState();

                // НОВОЕ: показываем бегущего тотема RunCat... по ранее выбранному тэгу
                const runImg = getRunImageForTag(gameState?.totem?.type);
                const caption = runImg === IMAGES.scenes.placeholder
                  ? 'Тотем откликнулся и уже в пути!'
                  : 'Тотем мчится на зов!';
                updateVisual(
                    visualId,
                    runImg,
                    caption
                );
                markSuccess(editorId, "Шаг пройден. Заказ создан, тотем в пути.");

                // Прогресс: шаг 6
                recordProgress(6, runImg);
            } else {
                updateVisual(visualId, IMAGES.scenes.placeholder, 'Не удалось вызвать тотема. Важно, что orderId = Id из прошлого запроса.');
                markFailure(editorId, "Шаг не пройден. Проверь поля заказа и petId.");
                recordProgress(6, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(6, IMAGES.scenes.placeholder);
        });
    };

    // (7) Проверка воссоединения тотема и персонажа (найти заказ)
    window.getOrderById = function() {
        const editorId = 'editor_get_order';
        const preId = 'get_order_response';
        const visualId = 'get_order_visual';
        let dataPath;
        markAttempt(editorId);

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(7, IMAGES.scenes.placeholder);
            return;
        }

        const getOrderIdValue = dataPath?.path?.orderId;
        if (getOrderIdValue === undefined || getOrderIdValue === null || getOrderIdValue === "") {
            showError(preId, "Укажи orderId в { \"path\": { \"orderId\": 1 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан orderId.');
            markFailure(editorId, "Шаг не пройден. Не заполнен path.orderId.");
            recordProgress(7, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/store/order/${encodeURIComponent(getOrderIdValue)}`, {
            method: "GET",
            headers: { "accept": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById(preId).textContent = safeJSONStringify(data);

            const sameOrder = String(data?.id) === String(gameState.order.id);
            const sameTotem  = String(data?.petId) === String(gameState.totem.id);
            if (sameOrder && sameTotem && gameState.character.type) {
                // Картинка воссоединения зависит от пола персонажа и типа тотема
                const uniteImg = getUniteImage(gameState.character.type, gameState.totem.type);
                updateVisual(
                    visualId,
                    uniteImg,
                    'Воссоединение состоялось: персонаж и тотем вместе!'
                );
                markSuccess(editorId, "Шаг пройден. Заказ и тотем совпали.");

                // Прогресс: шаг 7
                recordProgress(7, uniteImg);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Не удалось подтвердить воссоединение. Проверь petId из 5 и 6 запросов, они должны совпадать при отправке. В этом (7) запросе orderId = Id из 6 запроса.'
                );
                markFailure(editorId, "Шаг не пройден. Несовпадение orderId/petId между шагами.");
                recordProgress(7, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(7, IMAGES.scenes.placeholder);
        });
    };

    // (8) Отмена выбора тотема (удалить заказ)
    window.deleteOrder = function() {
        const editorId = 'editor_delete_order';
        const preId = 'delete_order_response';
        const visualId = 'delete_order_visual';
        let dataPath;
        markAttempt(editorId);

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(8, IMAGES.scenes.placeholder);
            return;
        }

        const deleteOrderIdValue = dataPath?.path?.orderId;
        if (deleteOrderIdValue === undefined || deleteOrderIdValue === null || deleteOrderIdValue === "") {
            showError(preId, "Укажи orderId в { \"path\": { \"orderId\": 1 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан orderId.');
            markFailure(editorId, "Шаг не пройден. Не заполнен path.orderId.");
            recordProgress(8, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/store/order/${encodeURIComponent(deleteOrderIdValue)}`, {
            method: "DELETE",
            headers: { "accept": "application/json" }
        })
        .then(async res => {
            try {
                const data = await res.json();
                document.getElementById(preId).textContent = safeJSONStringify(data);
                if (Number(data.code) === 200) {
                    updateVisual(visualId, IMAGES.scenes.vanishCat, 'Вы отменили выбор тотема. Он растворился в воздухе...');
                    markSuccess(editorId, "Шаг пройден. Заказ удален.");
                    // Сбрасываем состояние заказа
                    gameState.order = { id: null, payload: null };
                    saveState();

                    // Прогресс: шаг 8
                    recordProgress(8, IMAGES.scenes.vanishCat);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить тотем, похоже его не существует.');
                    markFailure(editorId, "Шаг не пройден. Заказ не найден или уже удален.");
                    recordProgress(8, IMAGES.scenes.placeholder);
                }
            } catch {
                document.getElementById(preId).textContent = `Статус: ${res.status} ${res.statusText}`;
                if (res.ok) {
                    updateVisual(visualId, IMAGES.scenes.vanishCat, 'Вы отменили выбор тотема. Он растворился в воздухе...');
                    markSuccess(editorId, "Шаг пройден. Заказ удален.");
                    gameState.order = { id: null, payload: null };
                    saveState();

                    // Прогресс: шаг 8
                    recordProgress(8, IMAGES.scenes.vanishCat);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить тотем.');
                    markFailure(editorId, "Шаг не пройден. Заказ не удален.");
                    recordProgress(8, IMAGES.scenes.placeholder);
                }
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(8, IMAGES.scenes.placeholder);
        });
    };

    // (9) Отмена выбора персонажа (удалить пользователя)
    window.deleteUser = function() {
        const editorId = 'editor_delete_user';
        const preId = 'delete_user_response';
        const visualId = 'delete_user_visual';
        let dataPath;
        markAttempt(editorId);

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            markFailure(editorId, `Ошибка JSON: ${e.message}`);
            recordProgress(9, IMAGES.scenes.placeholder);
            return;
        }

        const deleteUsernameValue = dataPath?.path?.username;
        if (!deleteUsernameValue) {
            showError(preId, "Укажи username в { \"path\": { \"username\": \"...\" } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан username.');
            markFailure(editorId, "Шаг не пройден. Не заполнен path.username.");
            recordProgress(9, IMAGES.scenes.placeholder);
            return;
        }

        fetch(`${hostname}/user/${encodeURIComponent(deleteUsernameValue)}`, {
            method: "DELETE",
            headers: { "accept": "application/json" }
        })
        .then(async res => {
            try {
                const data = await res.json();
                document.getElementById(preId).textContent = safeJSONStringify(data);
                if (Number(data.code) === 200) {
                    updateVisual(visualId, IMAGES.scenes.vanishChar, 'Вы отменили выбор персонажа. Он исчезает...');
                    markSuccess(editorId, "Шаг пройден. Персонаж удален.");
                    // Полный сброс прогресса
                    clearState();

                    // Прогресс: шаг 9
                    recordProgress(9, IMAGES.scenes.vanishChar);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить персонажа. Проверь username и сравни его в 1 запросе.');
                    markFailure(editorId, "Шаг не пройден. username не найден.");
                    recordProgress(9, IMAGES.scenes.placeholder);
                }
            } catch {
                document.getElementById(preId).textContent = `Статус: ${res.status} ${res.statusText}`;
                if (res.ok) {
                    updateVisual(visualId, IMAGES.scenes.vanishChar, 'Вы отменили выбор персонажа. Он исчезает... Теперь попробуй выбрать другой тотем и персонажа...');
                    markSuccess(editorId, "Шаг пройден. Персонаж удален.");
                    clearState();

                    // Прогресс: шаг 9
                    recordProgress(9, IMAGES.scenes.vanishChar);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить персонажа. Проверь username и сравни его в 1 запросе');
                    markFailure(editorId, "Шаг не пройден. Персонаж не удален.");
                    recordProgress(9, IMAGES.scenes.placeholder);
                }
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            markFailure(editorId, "Сетевая ошибка. Повтори запрос.");
            recordProgress(9, IMAGES.scenes.placeholder);
        });
    };
});

document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    if (burgerMenu && navLinks) {
        burgerMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});
