// ----------------------------
// Инициализация вкладок
// ----------------------------

document.addEventListener("DOMContentLoaded", function () {
    const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
    const sections = Array.from(document.querySelectorAll(".tech-content"));
    const iframes = Array.from(document.querySelectorAll(".tech-iframe"));

    function activateTech(techKey) {
        tabButtons.forEach((btn) => {
            if (btn.dataset.tech === techKey) {
                btn.classList.add("tab-button--active");
            } else {
                btn.classList.remove("tab-button--active");
            }
        });

        sections.forEach((section) => {
            if (section.dataset.tech === techKey) {
                section.classList.add("tech-content--active");
            } else {
                section.classList.remove("tech-content--active");
            }
        });
    }

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const techKey = btn.dataset.tech;
            activateTech(techKey);
        });
    });

    // ----------------------------
    // Создание srcdoc для iframes
    // ----------------------------

    function createBoundaryFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Boundaries</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 16px 18px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f1f5f9;
        color: #0f172a;
    }
    .row-title {
        font-size: 13px;
        margin-bottom: 8px;
        color: #6b7280;
    }
    .track {
        position: relative;
        height: 18px;
        border-radius: 999px;
        background: #e5e7eb;
        overflow: hidden;
        margin-bottom: 18px;
    }
    .segment {
        position: absolute;
        top: 0;
        bottom: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: #111827;
        transition: filter 0.15s ease, transform 0.08s ease;
    }
    .segment:hover {
        filter: brightness(1.05);
        transform: translateY(-1px);
    }
    .segment.selected {
        box-shadow: inset 0 0 0 2px #0f172a;
    }
    .segment.invalid {
        background: #fecaca;
    }
    .segment.valid {
        background: #bbf7d0;
    }

    .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
        font-size: 11px;
    }
    .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.15);
    }
    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
    }
    .legend-dot.invalid { background: #f97373; }
    .legend-dot.valid { background: #22c55e; }
</style>
</head>
<body>
    <div class="row-title">Возраст пользователя (допустимо от 18 до 65 лет)</div>
    <div class="track" aria-hidden="true">
        <div class="segment invalid" data-id="belowMin"
             style="left:0; width:18%;" title="Меньше минимума">
            17−
        </div>
        <div class="segment valid" data-id="insideRange"
             style="left:18%; width:64%;" title="Допустимый диапазон">
            18–65
        </div>
        <div class="segment invalid" data-id="aboveMax"
             style="left:82%; width:18%;" title="Больше максимума">
            66+
        </div>
    </div>

    <div class="row-title">Граница кредитного лимита (0–100&nbsp;000)</div>
    <div class="track">
        <div class="segment invalid" data-id="negative"
             style="left:0; width:20%;" title="Отрицательное значение">
            &lt; 0
        </div>
        <div class="segment valid" data-id="creditRange"
             style="left:20%; width:60%;" title="Корректный лимит">
            0–100&nbsp;000
        </div>
        <div class="segment invalid" data-id="tooHigh"
             style="left:80%; width:20%;" title="Слишком большой лимит">
            &gt; 100&nbsp;000
        </div>
    </div>

    <div class="legend">
        <span class="legend-item">
            <span class="legend-dot invalid"></span> недопустимые значения
        </span>
        <span class="legend-item">
            <span class="legend-dot valid"></span> допустимые значения
        </span>
        <span class="legend-item">
            нажми на любую зону
        </span>
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        var segments = document.querySelectorAll(".segment");
        segments.forEach(function(seg) {
            seg.classList.remove("selected");
        });
    }

    var messages = {
        belowMin: {
            title: "Ниже минимального значения",
            description: "Эти значения помогают проверить, как система реагирует на ввод младше допустимого порога. Тестировщик ожидает ошибку валидации и понятное сообщение для пользователя."
        },
        insideRange: {
            title: "Внутри допустимого диапазона",
            description: "Основной позитивный сценарий: значения от 18 до 65 лет должны успешно проходить валидацию и позволять продолжить оформление заявки."
        },
        aboveMax: {
            title: "Выше максимального значения",
            description: "Такие значения проверяют верхнюю границу. Система не должна молча принимать возраст старше 65 лет — важно наличие корректного сообщения и запрета дальнейших действий."
        },
        negative: {
            title: "Отрицательный лимит",
            description: "Отрицательные числа — типичный источник дефектов. Если поле не ограничено, возможны странные эффекты, например отрицательный баланс или некорректные расчёты."
        },
        creditRange: {
            title: "Рабочий диапазон лимита",
            description: "Нормальный диапазон — от 0 до 100 000. Здесь проверяется корректный расчёт платежей, отображение форматов и сохранение значений."
        },
        tooHigh: {
            title: "Слишком высокий лимит",
            description: "Здесь тестировщик убеждается, что бизнес-ограничения соблюдаются: лимит выше допустимого должен блокироваться и сопровождаться понятной ошибкой."
        }
    };

    document.querySelectorAll(".segment").forEach(function(seg) {
        seg.addEventListener("click", function() {
            var id = seg.getAttribute("data-id");
            clearSelection();
            seg.classList.add("selected");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    function createEquivalenceFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Equivalence</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 16px 18px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f9fafb;
        color: #0f172a;
    }
    .strip {
        height: 18px;
        border-radius: 999px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        padding: 0 10px;
        font-size: 11px;
        color: #0f172a;
        cursor: pointer;
        transition: transform 0.08s ease, box-shadow 0.12s ease, opacity 0.12s ease;
    }
    .strip:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(15, 23, 42, 0.18);
    }
    .strip.selected {
        outline: 2px solid #0f172a;
        outline-offset: 1px;
    }
    .strip.valid {
        background: linear-gradient(90deg, #22c55e, #a3e635);
    }
    .strip.invalid {
        background: linear-gradient(90deg, #fb7185, #f97316);
        color: #111827;
    }
    .strip.edge {
        background: linear-gradient(90deg, #38bdf8, #6366f1);
        color: #f9fafb;
    }

    .caption {
        font-size: 12px;
        margin-top: 10px;
        color: #6b7280;
    }
</style>
</head>
<body>
    <div class="strip invalid" data-id="tooSmall">
        Сумма покупки &lt; 0 ₽
    </div>
    <div class="strip.valid" data-id="withoutDiscount" style="width: 70%;">
        0–999 ₽ — без скидки
    </div>
    <div class="strip edge" data-id="edgeDiscount" style="width: 85%;">
        1000–4999 ₽ — 5% скидка
    </div>
    <div class="strip edge" data-id="bigDiscount" style="width: 100%;">
        ≥ 5000 ₽ — 10% скидка
    </div>
    <div class="strip invalid" data-id="tooLarge" style="width: 80%;">
        &gt; 100&nbsp;000 ₽ — ошибка, подозрительная операция
    </div>

    <div class="caption">
        Каждый цвет — отдельный класс эквивалентности. Нажми на полоску, чтобы увидеть его смысл.
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        document.querySelectorAll(".strip").forEach(function(s) {
            s.classList.remove("selected");
        });
    }

    var messages = {
        tooSmall: {
            title: "Невалидный класс: сумма меньше нуля",
            description: "Фактически такой класс эквивалентности не должен существовать в реальной жизни, но в ПО отрицательные значения иногда проскакивают. Этот класс используется для негативных проверок."
        },
        withoutDiscount: {
            title: "Валидный класс: без скидки",
            description: "Любое значение от 0 до 999 ₽ даёт одинаковый результат — клиент не получает скидку. Достаточно протестировать 1–2 представителя, например 0 ₽ и 500 ₽."
        },
        edgeDiscount: {
            title: "Валидный класс: малая скидка",
            description: "Здесь система должна начислять фиксированную скидку 5%. Значения 1000 ₽ и 4999 ₽ — хорошие кандидаты для граничных проверок этого класса."
        },
        bigDiscount: {
            title: "Валидный класс: большая скидка",
            description: "Все суммы от 5000 ₽ и выше приводят к одинаковому поведению: применяется скидка 10%. Тестировщик выбирает репрезентативные значения, например 5000 ₽ и 20 000 ₽."
        },
        tooLarge: {
            title: "Невалидный класс: подозрительно большая сумма",
            description: "Для таких значений может действовать отдельная бизнес-логика: блокировка операции, запрос подтверждения или дополнительная проверка безопасности."
        }
    };

    document.querySelectorAll(".strip").forEach(function(strip) {
        strip.addEventListener("click", function() {
            clearSelection();
            strip.classList.add("selected");
            var id = strip.getAttribute("data-id");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    function createPairwiseFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Pairwise</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 12px 14px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f1f5f9;
        color: #0f172a;
    }
    .grid-labels {
        font-size: 11px;
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        color: #6b7280;
    }
    .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
    }
    .pill {
        padding: 4px 6px;
        border-radius: 999px;
        background: #e5e7eb;
        font-size: 11px;
        text-align: center;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: transform 0.08s ease, box-shadow 0.12s ease, background-color 0.12s ease;
    }
    .pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(15, 23, 42, 0.2);
        background: #e0f2fe;
    }
    .pill.selected {
        background: linear-gradient(90deg, #6366f1, #22c55e);
        color: #f9fafb;
        box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.6);
    }

    .hint {
        margin-top: 8px;
        font-size: 11px;
        color: #6b7280;
    }
</style>
</head>
<body>
    <div class="grid-labels">
        <span>Устройство</span>
        <span>Способ оплаты</span>
    </div>
    <div class="grid">
        <div class="pill" data-id="desktopCard">Desktop · Карта</div>
        <div class="pill" data-id="desktopCash">Desktop · Наличные</div>
        <div class="pill" data-id="desktopWallet">Desktop · Кошелёк</div>
        <div class="pill" data-id="desktopBonus">Desktop · Бонусы</div>

        <div class="pill" data-id="mobileCard">Mobile · Карта</div>
        <div class="pill" data-id="mobileCash">Mobile · Наличные</div>
        <div class="pill" data-id="mobileWallet">Mobile · Кошелёк</div>
        <div class="pill" data-id="mobileBonus">Mobile · Бонусы</div>

        <div class="pill" data-id="tabletCard">Tablet · Карта</div>
        <div class="pill" data-id="tabletCash">Tablet · Наличные</div>
        <div class="pill" data-id="tabletWallet">Tablet · Кошелёк</div>
        <div class="pill" data-id="tabletBonus">Tablet · Бонусы</div>
    </div>
    <div class="hint">
        Каждая «таблетка» — одна комбинация пары параметров. В реальном pairwise-наборе таких комбинаций было бы меньше, но все пары были бы покрыты.
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        document.querySelectorAll(".pill").forEach(function(p) {
            p.classList.remove("selected");
        });
    }

    var messages = {
        desktopCard: {
            title: "Desktop · Банковская карта",
            description: "Комбинация для проверки классического сценария оплаты. Часто становится базовой для регресс-наборов."
        },
        desktopCash: {
            title: "Desktop · Наличные",
            description: "Полезна, если интерфейс интернет-витрины используется кассирами в салоне продаж."
        },
        desktopWallet: {
            title: "Desktop · Электронный кошелёк",
            description: "Здесь важно проверить редиректы на сторонние платёжные сервисы и возврат результата в веб-приложение."
        },
        desktopBonus: {
            title: "Desktop · Бонусные баллы",
            description: "Покрывает пару «Desktop + бонусы». В pairwise-подходе нет необходимости проверять все остальные варианты бонусов с другими устройствами."
        },
        mobileCard: {
            title: "Mobile · Банковская карта",
            description: "Типичный сценарий для мобильного клиента: важно поведение при отсутствии сети и при возврате из приложения банка."
        },
        mobileCash: {
            title: "Mobile · Наличные",
            description: "Нужна, если заказ оформляется в оффлайне, а приложение — только интерфейс для менеджера."
        },
        mobileWallet: {
            title: "Mobile · Кошелёк",
            description: "Позволяет проверить связку «мобильное устройство + webview платёжной системы»."
        },
        mobileBonus: {
            title: "Mobile · Бонусные баллы",
            description: "Закрывает пару «Mobile + бонусы» без необходимости повторять все остальные платежи для мобильного устройства."
        },
        tabletCard: {
            title: "Tablet · Банковская карта",
            description: "Используется для проверки адаптивной верстки и корректного поведения при повороте экрана."
        },
        tabletCash: {
            title: "Tablet · Наличные",
            description: "Актуально для точек продаж, где используют планшеты вместо кассовых терминалов."
        },
        tabletWallet: {
            title: "Tablet · Кошелёк",
            description: "Ещё одна комбинация для кросс-проверки взаимосвязи интерфейса и внешнего платёжного сервиса."
        },
        tabletBonus: {
            title: "Tablet · Бонусные баллы",
            description: "Демонстрирует, как pairwise-подход позволяет выбрать ограниченный набор, но всё же покрыть все пары «устройство–способ оплаты»."
        }
    };

    document.querySelectorAll(".pill").forEach(function(pill) {
        pill.addEventListener("click", function() {
            clearSelection();
            pill.classList.add("selected");
            var id = pill.getAttribute("data-id");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    function createDecisionTableFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Decision table</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 14px 14px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #eff6ff;
        color: #111827;
    }
    .row {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        gap: 8px;
        font-size: 11px;
    }
    .row-label {
        width: 110px;
        color: #4b5563;
    }
    .badge {
        padding: 4px 7px;
        border-radius: 999px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.08s ease, box-shadow 0.12s ease, background-color 0.12s ease;
    }
    .badge.condition {
        background: #d1fae5;
        color: #064e3b;
    }
    .badge.action {
        background: #fee2e2;
        color: #7f1d1d;
    }
    .badge.selected {
        box-shadow: 0 0 0 2px #0f172a;
        transform: translateY(-1px);
    }
    .badge:hover {
        box-shadow: 0 4px 8px rgba(15, 23, 42, 0.25);
    }
    .hint {
        margin-top: 8px;
        font-size: 11px;
        color: #6b7280;
    }
</style>
</head>
<body>
    <div class="row">
        <div class="row-label">Тип клиента</div>
        <div class="badge condition" data-id="condNew">Новый</div>
        <div class="badge condition" data-id="condRegular">Постоянный</div>
        <div class="badge condition" data-id="condVip">VIP</div>
    </div>
    <div class="row">
        <div class="row-label">Канал</div>
        <div class="badge condition" data-id="condOnline">Онлайн</div>
        <div class="badge condition" data-id="condOffice">Офис</div>
    </div>
    <div class="row">
        <div class="row-label">Скидка</div>
        <div class="badge action" data-id="act5">Скидка 5%</div>
        <div class="badge action" data-id="act10">Скидка 10%</div>
        <div class="badge action" data-id="act15">Скидка 15%</div>
        <div class="badge action" data-id="actNo">Без скидки</div>
    </div>
    <div class="row">
        <div class="row-label">Бонусы</div>
        <div class="badge action" data-id="actBonus">
            Начислить бонусы
        </div>
        <div class="badge action" data-id="actBlock">
            Отказать
        </div>
    </div>

    <div class="hint">
        Условия и действия представлены отдельно. При построении таблицы каждое сочетание условий
        сопоставляется конкретному набору действий.
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        document.querySelectorAll(".badge").forEach(function(badge) {
            badge.classList.remove("selected");
        });
    }

    var messages = {
        condNew: {
            title: "Условие: новый клиент",
            description: "В таблице решений для новых клиентов часто действует ограничение по максимальной скидке и дополнительные проверки (KYC, скоринг)."
        },
        condRegular: {
            title: "Условие: постоянный клиент",
            description: "Постоянным клиентам могут быть доступны стандартные скидки и бонусы лояльности, поэтому для них выделяется отдельный набор правил."
        },
        condVip: {
            title: "Условие: VIP-клиент",
            description: "Для VIP-клиентов бизнес-логика обычно отличается: повышенные лимиты, индивидуальные тарифы и приоритетное обслуживание."
        },
        condOnline: {
            title: "Условие: онлайн-канал",
            description: "Некоторые акции действуют только онлайн, а часть правил безопасности, наоборот, жёстче для удалённых операций."
        },
        condOffice: {
            title: "Условие: оформление в офисе",
            description: "В офисе сотрудник может запросить дополнительные документы, поэтому в таблице решений появляются отдельные ветки правил."
        },
        act5: {
            title: "Действие: применить скидку 5%",
            description: "Типичное действие для комбинации «постоянный клиент + онлайн». Тест-кейс должен подтвердить корректный расчёт суммы."
        },
        act10: {
            title: "Действие: применить скидку 10%",
            description: "Может относиться к акциям для VIP-клиентов или специальным предложениям. Важно, чтобы правило было однозначно связано с условиями."
        },
        act15: {
            title: "Действие: применить скидку 15%",
            description: "Чаще всего это промо-кампании. Таблица решений помогает убедиться, что скидка не применяется по ошибке к неподходящим комбинациям условий."
        },
        actNo: {
            title: "Действие: без скидки",
            description: "Явно прописанное действие в таблице нужен, чтобы не возникало «словесных договорённостей» типа «ну если не попали ни под одно правило, то скидки нет»."
        },
        actBonus: {
            title: "Действие: начислить бонусы лояльности",
            description: "Дополнительное действие, которое выполняется вместе со скидкой или вместо неё. Таблица помогает зафиксировать, когда именно бонусы начисляются."
        },
        actBlock: {
            title: "Действие: отказать в операции",
            description: "Для рискованных комбинаций (например, новый клиент, большой чек, онлайн) может быть отдельное правило с жёстким отказом."
        }
    };

    document.querySelectorAll(".badge").forEach(function(badge) {
        badge.addEventListener("click", function() {
            clearSelection();
            badge.classList.add("selected");
            var id = badge.getAttribute("data-id");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    function createErrorGuessingFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Error guessing</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 14px 18px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
    }
    .canvas {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-auto-rows: 60px;
        gap: 8px;
        align-items: center;
        justify-items: center;
    }
    .block {
        width: 90%;
        height: 100%;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        text-align: center;
        padding: 4px;
        cursor: pointer;
        transition: transform 0.1s ease, box-shadow 0.15s ease, filter 0.15s ease;
        color: #0f172a;
    }
    .block:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.25);
        filter: brightness(1.05);
    }
    .block.selected {
        box-shadow: 0 0 0 3px #0f172a;
    }
    .block.dom { background: #fbbf24; }
    .block.tech { background: #a5b4fc; }
    .block.history { background: #6ee7b7; }
    .block.data { background: #fca5a5; }
    .block.security { background: #f9a8d4; }
    .block.stress { background: #67e8f9; }

    .center {
        grid-column: 2 / span 1;
        grid-row: 2 / span 1;
    }
    .note {
        margin-top: 8px;
        font-size: 11px;
        color: #6b7280;
        text-align: center;
    }
</style>
</head>
<body>
    <div class="canvas">
        <div class="block dom" data-id="domain">
            Знание предметной области
        </div>
        <div class="block tech" data-id="tech">
            Опыт с технологией
        </div>
        <div class="block history" data-id="history">
            История прошлых багов
        </div>
        <div class="block center block data" data-id="data">
            «Странные» данные<br>(пустые, длинные, спецсимволы)
        </div>
        <div class="block security" data-id="security">
            Безопасность и злоупотребления
        </div>
        <div class="block stress" data-id="stress">
            Нагрузочные и стресс-сценарии
        </div>
    </div>
    <div class="note">
        Нажимай на блоки — это источники идей для предугадывания ошибок.
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        document.querySelectorAll(".block").forEach(function(b) {
            b.classList.remove("selected");
        });
    }

    var messages = {
        domain: {
            title: "Предметная область",
            description: "Зная, как ведёт себя реальный бизнес-процесс, тестировщик может предположить типичные ошибки: некорректные статусы, неверные комиссии, неправильные сроки и т.п."
        },
        tech: {
            title: "Опыт с технологией",
            description: "Опыт с конкретным фреймворком или платформой подсказывает, где чаще всего ломается логика: кеширование, обработка времени, асинхронность, работа с файловой системой."
        },
        history: {
            title: "История прошлых багов",
            description: "Список ранее найденных дефектов — отличный источник гипотез. Если функция ломалась на границах диапазона или при определённом формате данных, новые изменения стоит проверять особенно тщательно."
        },
        data: {
            title: "Нестандартные данные",
            description: "Пустые значения, очень длинные строки, спецсимволы, эмодзи, редкие локали — всё это часто приводит к неожиданным ошибкам, особенно валидации и отображения."
        },
        security: {
            title: "Безопасность и злоупотребления",
            description: "Попытки обойти ограничения через прямые запросы, подмену параметров, SQL-инъекции или XSS — часть предугадывания ошибок, ориентированного на защиту системы."
        },
        stress: {
            title: "Нагрузка и стресс-сценарии",
            description: "Переполнение очередей, массовые запросы, отключение сети, резкая смена времени на устройстве — сценарии, которые легко забыть, если опираться только на формальные техники."
        }
    };

    document.querySelectorAll(".block").forEach(function(block) {
        block.addEventListener("click", function() {
            clearSelection();
            block.classList.add("selected");
            var id = block.getAttribute("data-id");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    function createStateTransitionFrame(targetId) {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>State transition</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 14px 14px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f9fafb;
        color: #111827;
    }
    .states {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
        font-size: 11px;
    }
    .state-chip {
        padding: 4px 6px;
        border-radius: 999px;
        background: #e5e7eb;
        text-align: center;
    }
    .row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 6px;
    }
    .action-btn {
        padding: 5px 6px;
        border-radius: 999px;
        border: none;
        font-size: 11px;
        cursor: pointer;
        background: #bfdbfe;
        color: #1e3a8a;
        transition: transform 0.08s ease, box-shadow 0.12s ease, background-color 0.12s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(30, 64, 175, 0.35);
    }
    .action-btn.selected {
        background: #2563eb;
        color: #eff6ff;
        box-shadow: 0 0 0 2px #0f172a;
    }
    .hint {
        margin-top: 6px;
        font-size: 11px;
        color: #6b7280;
    }
</style>
</head>
<body>
    <div class="states">
        <div class="state-chip">Черновик</div>
        <div class="state-chip">Отправлена</div>
        <div class="state-chip">Подтверждена</div>
        <div class="state-chip">Отклонена</div>
        <div class="state-chip">Отменена</div>
        <div class="state-chip">Завершена</div>
    </div>

    <div class="row">
        <button class="action-btn" data-id="draftToSent">
            Черновик → Отправить
        </button>
        <button class="action-btn" data-id="sentToConfirm">
            Отправлена → Подтвердить
        </button>
        <button class="action-btn" data-id="sentToReject">
            Отправлена → Отклонить
        </button>
    </div>
    <div class="row">
        <button class="action-btn" data-id="confirmToFinish">
            Подтверждена → Завершить
        </button>
        <button class="action-btn" data-id="draftToCancel">
            Черновик → Отменить
        </button>
        <button class="action-btn" data-id="finishToDraft">
            Завершена → Черновик (недопустимо)
        </button>
    </div>

    <div class="hint">
        Нажми на переход, чтобы увидеть, является ли он допустимым по правилам процесса.
    </div>

<script>
(function() {
    function sendMessage(elementId, title, description) {
        if (!window.parent) return;
        window.parent.postMessage({
            type: "testDesignClick",
            targetId: "${targetId}",
            elementId: elementId,
            title: title,
            description: description
        }, "*");
    }

    function clearSelection() {
        document.querySelectorAll(".action-btn").forEach(function(btn) {
            btn.classList.remove("selected");
        });
    }

    var messages = {
        draftToSent: {
            title: "Переход: Черновик → Отправлена",
            description: "Классический допустимый переход. Тестировщик проверяет, что после отправки заявка перестаёт редактироваться и попадает в очередь обработки."
        },
        sentToConfirm: {
            title: "Переход: Отправлена → Подтверждена",
            description: "Основной позитивный сценарий: по результатам проверки заявка подтверждается. Важно отследить корректную смену статуса и побочные действия (уведомления, создание договора)."
        },
        sentToReject: {
            title: "Переход: Отправлена → Отклонена",
            description: "Негативный, но разрешённый переход. Тестировщик проверяет причины отказа, текст уведомления и невозможность дальнейшего редактирования заявки."
        },
        confirmToFinish: {
            title: "Переход: Подтверждена → Завершена",
            description: "Финальный этап процесса. После завершения заявка становится только для чтения, а повторные операции невозможны."
        },
        draftToCancel: {
            title: "Переход: Черновик → Отменена",
            description: "Допустимый переход по инициативе клиента. Нужно убедиться, что отменённый черновик не попадает в обработку и не влияет на статистику."
        },
        finishToDraft: {
            title: "Недопустимый переход: Завершена → Черновик",
            description: "Пример перехода, который должен быть запрещён моделью состояний. Тестировщик проверяет, что система не позволяет вернуться к редактированию завершённой заявки ни через UI, ни через прямые запросы."
        }
    };

    document.querySelectorAll(".action-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            clearSelection();
            btn.classList.add("selected");
            var id = btn.getAttribute("data-id");
            var msg = messages[id];
            if (msg) {
                sendMessage(id, msg.title, msg.description);
            }
        });
    });
})();
</script>
</body>
</html>
        `;
    }

    // ----------------------------
    // Мапинг айфреймов к шаблонам
    // ----------------------------

    const iframeTemplateByTech = {
        boundaries: createBoundaryFrame,
        equivalence: createEquivalenceFrame,
        pairwise: createPairwiseFrame,
        "decision-table": createDecisionTableFrame,
        "error-guessing": createErrorGuessingFrame,
        "state-transition": createStateTransitionFrame
    };

    iframes.forEach((frame) => {
        const section = frame.closest(".tech-content");
        if (!section) return;
        const techKey = section.dataset.tech;
        const targetId = frame.getAttribute("data-target-desc-id");
        const factory = iframeTemplateByTech[techKey];
        if (factory && targetId) {
            frame.srcdoc = factory(targetId);
        }
    });

    // ----------------------------
    // Обработка сообщений от iframe
    // ----------------------------

    window.addEventListener("message", function (event) {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if (data.type !== "testDesignClick") return;

        const targetId = data.targetId;
        const container = document.getElementById(targetId);
        if (!container) return;

        const title = data.title || "Элемент";
        const description =
            data.description ||
            "Для этого элемента пока нет подробного описания.";

        container.innerHTML =
            '<strong>' +
            title +
            ":</strong> " +
            description;
    });
});
