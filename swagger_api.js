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

    function setEditorTheme(ed) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ed.setTheme(isDark ? "ace/theme/dracula" : "ace/theme/chrome");
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
                } catch (e) {
                    alert("Невалидный JSON: " + e.message);
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

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
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

                // Прогресс: шаг 1
                recordProgress(1, img);
            } else {
                updateVisual(visualId, IMAGES.scenes.placeholder, 'Здесь точно что-то не так...Проверь тип персонажа (character) и повтори отправку.');
                // Фиксируем placeholder в прогрессе
                recordProgress(1, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
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

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(2, IMAGES.scenes.placeholder);
            return;
        }
        const usernameValue = dataPath?.path?.username;
        if (!usernameValue) {
            showError(preId, "Укажи username в { \"path\": { \"username\": \"...\" } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан username.');
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

                // Прогресс: шаг 2
                recordProgress(2, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Данные персонажа на сервере не совпали с созданием. Сервер мог не успеть сохранить данные...Попробуй снова'
                );
                recordProgress(2, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(2, IMAGES.scenes.placeholder);
        });
    };

    // (3) Врата Святилища Тотемов (login)
    window.loginUser = function() {
        const editorId = 'editor_login';
        const preId = 'login_response';
        const visualId = 'login_visual';
        let dataQuery;

        try {
            dataQuery = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(3, IMAGES.scenes.placeholder);
            return;
        }

        const usernameValue = dataQuery?.query?.username;
        const passwordValue = dataQuery?.query?.password;

        if (!usernameValue || !passwordValue) {
            showError(preId, "Укажи \"query\": { \"username\": \"...\", \"password\": \"...\" }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Требуются username и password.');
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

                // Прогресс: шаг 3
                recordProgress(3, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Ваш логин и/или пароль отличаются от указанных при регистрации.'
                );
                recordProgress(3, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(3, IMAGES.scenes.placeholder);
        });
    };

    // (4) Создание своего тотема — показываем PawCat...
    window.createPet = function() {
        const editorId = 'editor_create_pet';
        const preId = 'pet_create_response';
        const visualId = 'pet_create_visual';
        let bodyData;

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
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

                // Прогресс: шаг 4
                recordProgress(4, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Проверь выбор тотема в tags[0].name (catFire/catGreen/catPurple/catSnow).'
                );
                recordProgress(4, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(4, IMAGES.scenes.placeholder);
        });
    };

    // (5) Проверка создания тотема — ОСТАВЛЯЕМ животных Cat... (как и просили)
    window.getPetById = function() {
        const editorId = 'editor_get_pet';
        const preId = 'get_pet_response';
        const visualId = 'get_pet_visual';
        let dataPath;
        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(5, IMAGES.scenes.placeholder);
            return;
        }

        const getPetIdValue = dataPath?.path?.petId;
        if (getPetIdValue === undefined || getPetIdValue === null || getPetIdValue === "") {
            showError(preId, "Укажи petId в { \"path\": { \"petId\": 15 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан petId.');
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

                // Прогресс: шаг 5
                recordProgress(5, img);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Тотем не подтверждён. Проверь petId или создай тотем заново. Важно. что petId = Id из прошлого запроса.'
                );
                recordProgress(5, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(5, IMAGES.scenes.placeholder);
        });
    };

    // (6) Вызов тотема (создание заказа) — ВЫВОДИМ RunCat... по выбранному тотему
    window.createOrder = function() {
        const editorId = 'editor_create_order';
        const preId = 'create_order_response';
        const visualId = 'create_order_visual';
        let bodyData;

        try {
            bodyData = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
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

                // Прогресс: шаг 6
                recordProgress(6, runImg);
            } else {
                updateVisual(visualId, IMAGES.scenes.placeholder, 'Не удалось вызвать тотема. Важно, что orderId = Id из прошлого запроса.');
                recordProgress(6, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(6, IMAGES.scenes.placeholder);
        });
    };

    // (7) Проверка воссоединения тотема и персонажа (найти заказ)
    window.getOrderById = function() {
        const editorId = 'editor_get_order';
        const preId = 'get_order_response';
        const visualId = 'get_order_visual';
        let dataPath;

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(7, IMAGES.scenes.placeholder);
            return;
        }

        const getOrderIdValue = dataPath?.path?.orderId;
        if (getOrderIdValue === undefined || getOrderIdValue === null || getOrderIdValue === "") {
            showError(preId, "Укажи orderId в { \"path\": { \"orderId\": 1 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан orderId.');
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

                // Прогресс: шаг 7
                recordProgress(7, uniteImg);
            } else {
                updateVisual(
                    visualId,
                    IMAGES.scenes.placeholder,
                    'Не удалось подтвердить воссоединение. Проверь petId из 5 и 6 запросов, они должны совпадать при отправке. В этом (7) запросе orderId = Id из 6 запроса.'
                );
                recordProgress(7, IMAGES.scenes.placeholder);
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(7, IMAGES.scenes.placeholder);
        });
    };

    // (8) Отмена выбора тотема (удалить заказ)
    window.deleteOrder = function() {
        const editorId = 'editor_delete_order';
        const preId = 'delete_order_response';
        const visualId = 'delete_order_visual';
        let dataPath;

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(8, IMAGES.scenes.placeholder);
            return;
        }

        const deleteOrderIdValue = dataPath?.path?.orderId;
        if (deleteOrderIdValue === undefined || deleteOrderIdValue === null || deleteOrderIdValue === "") {
            showError(preId, "Укажи orderId в { \"path\": { \"orderId\": 1 } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан orderId.');
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
                    // Сбрасываем состояние заказа
                    gameState.order = { id: null, payload: null };
                    saveState();

                    // Прогресс: шаг 8
                    recordProgress(8, IMAGES.scenes.vanishCat);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить тотем, похоже его не существует.');
                    recordProgress(8, IMAGES.scenes.placeholder);
                }
            } catch {
                document.getElementById(preId).textContent = `Статус: ${res.status} ${res.statusText}`;
                if (res.ok) {
                    updateVisual(visualId, IMAGES.scenes.vanishCat, 'Вы отменили выбор тотема. Он растворился в воздухе...');
                    gameState.order = { id: null, payload: null };
                    saveState();

                    // Прогресс: шаг 8
                    recordProgress(8, IMAGES.scenes.vanishCat);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить тотем.');
                    recordProgress(8, IMAGES.scenes.placeholder);
                }
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
            recordProgress(8, IMAGES.scenes.placeholder);
        });
    };

    // (9) Отмена выбора персонажа (удалить пользователя)
    window.deleteUser = function() {
        const editorId = 'editor_delete_user';
        const preId = 'delete_user_response';
        const visualId = 'delete_user_visual';
        let dataPath;

        try {
            dataPath = JSON.parse(editors[editorId].getValue());
        } catch (e) {
            showError(preId, e.message);
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Невалидный JSON.');
            recordProgress(9, IMAGES.scenes.placeholder);
            return;
        }

        const deleteUsernameValue = dataPath?.path?.username;
        if (!deleteUsernameValue) {
            showError(preId, "Укажи username в { \"path\": { \"username\": \"...\" } }");
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Не указан username.');
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
                    // Полный сброс прогресса
                    clearState();

                    // Прогресс: шаг 9
                    recordProgress(9, IMAGES.scenes.vanishChar);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить персонажа.');
                    recordProgress(9, IMAGES.scenes.placeholder);
                }
            } catch {
                document.getElementById(preId).textContent = `Статус: ${res.status} ${res.statusText}`;
                if (res.ok) {
                    updateVisual(visualId, IMAGES.scenes.vanishChar, 'Вы отменили выбор персонажа. Он исчезает...');
                    clearState();

                    // Прогресс: шаг 9
                    recordProgress(9, IMAGES.scenes.vanishChar);
                } else {
                    updateVisual(visualId, IMAGES.scenes.placeholder, 'Не получилось отменить персонажа.');
                    recordProgress(9, IMAGES.scenes.placeholder);
                }
            }
        })
        .catch(err => {
            document.getElementById(preId).textContent = "Ошибка: " + err;
            updateVisual(visualId, IMAGES.scenes.placeholder, 'Произошла ошибка сети.');
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
