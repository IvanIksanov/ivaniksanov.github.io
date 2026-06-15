document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "resume_builder_state_v2";
  const MAX_EXPERIENCES = 5;
  const MAX_EDUCATIONS = 3;
  const DEFAULT_RESUME_PHOTO = "img/QAtoDev_square.png";
  const LEGACY_DEFAULT_RESUME_PHOTOS = ["img/QAtoDev_(Flappy_Bird_style).png"];
  const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const MONTH_NAMES_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const NOW = new Date();
  const CURRENT_MONTH = NOW.getMonth();
  const CURRENT_YEAR = NOW.getFullYear();
  const YEAR_OPTIONS = Array.from({ length: 18 }, (_, index) => CURRENT_YEAR + 1 - index);
  const EDUCATION_INSTITUTIONS = [
    "Колледж информационных технологий",
    "Политехнический колледж",
    "Техникум информатики и связи",
    "Учебный центр",
    "Университет"
  ];
  const EDUCATION_SPECIALTIES = [
    "Информационные системы и программирование",
    "Прикладная информатика",
    "Тестирование программного обеспечения",
    "Компьютерные сети",
    "Разработка программного обеспечения"
  ];
  const OVERRIDE_API_KEY_STORAGE = "io_api_key_override";
  const SUPABASE_URL_DIRECT = "https://mbebpfbmnojlaggdroum.supabase.co";
  const SUPABASE_FUNCTIONS_BASE_DIRECT = "https://mbebpfbmnojlaggdroum.functions.supabase.co";
  const SUPABASE_ANON_KEY_DIRECT = "sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C";
  const DEFAULT_MODEL = "openai/gpt-oss-20b";
  const FAST_MODEL_HINTS = [
    "openai/gpt-oss-20b",
    "mistralai/Mistral-Nemo-Instruct-2407",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "moonshotai/Kimi-K2-Instruct-0905",
    "deepseek-ai/DeepSeek-V3.2"
  ];
  const MODEL_LIST_CACHE_KEY = "model_list_cache_v1";
  const MODEL_CHAT_VALIDATED_CACHE_KEY = "model_chat_validated_cache_v1";
  const MODEL_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const AI_PROXY_TIMEOUT_MS = 30000;
  const EXPERIENCE_MISMATCH_TOLERANCE_MONTHS = 1;
  const GENDERED_REPLACEMENTS = [
    ["Выполнял", "Выполняла"],
    ["Подготовил", "Подготовила"],
    ["Сократил", "Сократила"],
    ["Проводил", "Проводила"],
    ["Составлял", "Составляла"],
    ["Проверял", "Проверяла"],
    ["Участвовал", "Участвовала"],
    ["Автоматизировал", "Автоматизировала"],
    ["Создавал", "Создавала"],
    ["Локализовывал", "Локализовывала"],
    ["Моделировал", "Моделировала"],
    ["Тестировал", "Тестировала"],
    ["Использовал", "Использовала"],
    ["Поддерживал", "Поддерживала"],
    ["Работал", "Работала"],
    ["Анализировал", "Анализировала"],
    ["Выявлял", "Выявляла"],
    ["Описывал", "Описывала"],
    ["Разрабатывал", "Разрабатывала"],
    ["Настраивал", "Настраивала"],
    ["Подключал", "Подключала"],
    ["Писал", "Писала"],
    ["Собирал", "Собирала"],
    ["Фиксировал", "Фиксировала"],
    ["Готовил", "Готовила"],
    ["Предлагал", "Предлагала"],
    ["Воспроизводил", "Воспроизводила"],
    ["Контролировал", "Контролировала"],
    ["Синхронизировал", "Синхронизировала"],
    ["Подготавливал", "Подготавливала"],
    ["Находил", "Находила"],
    ["Применял", "Применяла"],
    ["Валидировал", "Валидировала"],
    ["Мониторил", "Мониторила"],
    ["Обеспечивал", "Обеспечивала"],
    ["Оптимизировал", "Оптимизировала"],
    ["Сопровождал", "Сопровождала"],
    ["Уточнял", "Уточняла"],
    ["Исследовал", "Исследовала"],
    ["Запускал", "Запускала"],
    ["Оценивал", "Оценивала"],
    ["Взаимодействовал", "Взаимодействовала"],
    ["Оформлял", "Оформляла"],
    ["Заводил", "Заводила"]
  ];
  const SKILL_ICONS = {
    "Ручное тестирование": "tabler:hand-click",
    "Функциональное тестирование": "tabler:checkup-list",
    "Регрессионное тестирование": "tabler:repeat",
    "Интеграционное тестирование": "tabler:plug-connected",
    "Системное тестирование": "tabler:binary-tree-2",
    "Приемочное тестирование": "tabler:rosette-discount-check",
    "E2E testing": "tabler:route-alt-right",
    "Кроссбраузерное тестирование": "tabler:browser-check",
    "Кроссплатформенное тестирование": "tabler:devices-code",
    "Мобильное тестирование": "tabler:device-mobile-check",
    "Desktop testing": "tabler:device-desktop-check",
    "UI/UX testing": "tabler:paint",
    "Нагрузочное тестирование": "tabler:gauge",
    "Smoke testing": "tabler:flame",
    "API testing": "tabler:api",
    "REST API": "tabler:api-app",
    "SOAP": "tabler:brackets-contain",
    "Swagger/OpenAPI": "simple-icons:swagger",
    "Postman": "simple-icons:postman",
    "Bruno": "tabler:box-model-2",
    "Insomnia": "simple-icons:insomnia",
    "Swagger": "simple-icons:swagger",
    "SoapUI": "tabler:stack-2",
    "cURL": "tabler:terminal-2",
    "Newman": "tabler:arrow-forward-up-double",
    "SQL": "tabler:database-search",
    "PostgreSQL": "simple-icons:postgresql",
    "MongoDB": "simple-icons:mongodb",
    "Redis": "simple-icons:redis",
    "DBeaver": "simple-icons:dbeaver",
    "DevTools": "tabler:tool",
    "Kibana": "simple-icons:kibana",
    "Wireshark": "simple-icons:wireshark",
    "Charles Proxy": "tabler:route-scan",
    "Jira": "simple-icons:jira",
    "Confluence": "simple-icons:confluence",
    "YouTrack": "simple-icons:youtrack",
    "Redmine": "simple-icons:redmine",
    "Git": "simple-icons:git",
    "CI/CD": "tabler:route-2",
    "Jenkins": "simple-icons:jenkins",
    "TeamCity": "simple-icons:teamcity",
    "GitLab CI": "simple-icons:gitlab",
    "Argo CD": "simple-icons:argo",
    "Linux": "simple-icons:linux",
    "Bash": "simple-icons:gnubash",
    "Python": "simple-icons:python",
    // Devicon tends to be more reliable in Iconify runtime than some Simple Icons.
    "Java": "devicon-plain:java",
    "JavaScript": "simple-icons:javascript",
    "C++": "devicon-plain:cplusplus",
    "Docker": "simple-icons:docker",
    "Selenium": "simple-icons:selenium",
    "Playwright": "simple-icons:playwright",
    "Cypress": "simple-icons:cypress",
    "Appium": "simple-icons:appium",
    "Cucumber": "simple-icons:cucumber",
    "Rest Assured": "tabler:shield-check",
    "JUnit": "simple-icons:junit5",
    "Apache JMeter": "simple-icons:apachejmeter",
    "TestRail": "tabler:clipboard-check",
    "Test IT": "tabler:checklist",
    "TestLink": "tabler:link",
    "TestCaseLab": "tabler:list-details",
    "JSON": "tabler:braces",
    "XML": "tabler:file-code",
    "OAuth 2.0": "tabler:lock-access",
    "JWT": "tabler:key",
    "Basic Auth": "tabler:lock",
    "TCP/IP": "tabler:network",
    "Клиент-серверная архитектура": "tabler:server-2",
    "Анализ требований": "tabler:file-search",
    "Тест-дизайн": "tabler:ruler-2",
    "Микросервисы": "tabler:apps",
    "Анализ логов": "tabler:file-analytics",
    "Анализ трафика": "tabler:chart-dots-3",
    "Kafka": "simple-icons:apachekafka",
    "RabbitMQ": "simple-icons:rabbitmq",
    "Allure": "simple-icons:allure",
    "Zephyr": "tabler:wind",
    "Figma": "simple-icons:figma",
    "Android Studio": "simple-icons:androidstudio",
    "Unity": "simple-icons:unity",
    "OpenShift": "simple-icons:redhatopenshift",
    "Kubernetes": "simple-icons:kubernetes",
    "gRPC": "tabler:plug-connected-x",
    "CRUD": "tabler:database-cog",
    "Test documentation": "tabler:file-description",
    "Bug reporting": "tabler:bug",
    "Scrum": "tabler:users-group"
  };
  const SKILL_ICON_COLORS = {
    "Ручное тестирование": "#f59e0b",
    "Функциональное тестирование": "#22c55e",
    "Регрессионное тестирование": "#ef4444",
    "Интеграционное тестирование": "#3b82f6",
    "Системное тестирование": "#8b5cf6",
    "Приемочное тестирование": "#16a34a",
    "E2E testing": "#0f766e",
    "Кроссбраузерное тестирование": "#2563eb",
    "Кроссплатформенное тестирование": "#7c3aed",
    "Мобильное тестирование": "#14b8a6",
    "Desktop testing": "#475569",
    "UI/UX testing": "#ec4899",
    "Нагрузочное тестирование": "#b91c1c",
    "Smoke testing": "#fb7185",
    "API testing": "#06b6d4",
    "REST API": "#0ea5e9",
    "SOAP": "#9333ea",
    "Swagger/OpenAPI": "#85ea2d",
    "Postman": "#ff6c37",
    "Bruno": "#f97316",
    "Insomnia": "#6d28d9",
    "Swagger": "#85ea2d",
    "SoapUI": "#7c2d12",
    "cURL": "#111827",
    "Newman": "#fb7185",
    "SQL": "#2563eb",
    "PostgreSQL": "#336791",
    "MongoDB": "#13aa52",
    "Redis": "#dc382d",
    "DBeaver": "#382923",
    "DevTools": "#f97316",
    "Kibana": "#005571",
    "Wireshark": "#1679a7",
    "Charles Proxy": "#ef4444",
    "Jira": "#0052cc",
    "Confluence": "#172b4d",
    "YouTrack": "#111827",
    "Redmine": "#b32024",
    "Git": "#f05032",
    "CI/CD": "#14b8a6",
    "Jenkins": "#d24939",
    "TeamCity": "#111111",
    "GitLab CI": "#fc6d26",
    "Argo CD": "#ef7b4d",
    "Linux": "#111827",
    "Bash": "#4eaa25",
    "Python": "#3776ab",
    "Java": "#f89820",
    "JavaScript": "#f7df1e",
    "C++": "#00599c",
    "Docker": "#2496ed",
    "Selenium": "#43b02a",
    "Playwright": "#2ead33",
    "Cypress": "#69d3a7",
    "Appium": "#8f43fe",
    "Cucumber": "#23d96c",
    "Rest Assured": "#10b981",
    "JUnit": "#dc524a",
    "Apache JMeter": "#d22128",
    "TestRail": "#65c179",
    "Test IT": "#0ea5e9",
    "TestLink": "#0f766e",
    "TestCaseLab": "#4f46e5",
    "JSON": "#f59e0b",
    "XML": "#f97316",
    "OAuth 2.0": "#1d4ed8",
    "JWT": "#111827",
    "Basic Auth": "#b45309",
    "TCP/IP": "#0f766e",
    "Клиент-серверная архитектура": "#6366f1",
    "Анализ требований": "#a16207",
    "Тест-дизайн": "#ec4899",
    "Микросервисы": "#7c3aed",
    "Анализ логов": "#64748b",
    "Анализ трафика": "#0284c7",
    "Kafka": "#111827",
    "RabbitMQ": "#ff6600",
    "Allure": "#7c3aed",
    "Zephyr": "#38bdf8",
    "Figma": "#f24e1e",
    "Android Studio": "#3ddc84",
    "Unity": "#111111",
    "OpenShift": "#ee0000",
    "Kubernetes": "#326ce5",
    "gRPC": "#0f766e",
    "CRUD": "#2563eb",
    "Test documentation": "#475569",
    "Bug reporting": "#dc2626",
    "Scrum": "#0ea5e9"
  };
  const MARKET_SALARY_GUIDE = {
    junior: {
      label: "Junior",
      recommended: "80 000 — 115 000 ₽",
      sources: [
        {
          name: "Getmatch",
          range: "50 000 — 100 000 ₽",
          url: "https://getmatch.ru/salaries/qa_manual"
        },
        {
          name: "Хабр Карьера",
          range: "80 000 — 115 000 ₽",
          url: "https://career.habr.com/salaries?qualification=Junior&spec_aliases%5B%5D=manual_testing"
        }
      ]
    },
    middle: {
      label: "Middle",
      recommended: "120 000 — 180 000 ₽",
      sources: [
        {
          name: "Getmatch",
          range: "114 000 — 280 000 ₽",
          url: "https://getmatch.ru/salaries/qa_manual"
        },
        {
          name: "Хабр Карьера",
          range: "92 000 — 171 000 ₽",
          url: "https://career.habr.com/salaries?qualification=Middle&spec_aliases%5B%5D=manual_testing"
        }
      ]
    },
    senior: {
      label: "Senior",
      recommended: "190 000 — 280 000 ₽",
      sources: [
        {
          name: "Getmatch",
          range: "170 000 — 310 000 ₽",
          url: "https://getmatch.ru/salaries/qa_manual"
        },
        {
          name: "Хабр Карьера",
          range: "190 000 — 268 000 ₽",
          url: "https://career.habr.com/salaries?qualification=Senior&spec_aliases%5B%5D=manual_testing"
        }
      ]
    }
  };
  const EMPLOYERS = ["Сбер", "Альфа-Банк", "Авито", "Т-Банк", "Яндекс", "VK", "Ozon"];
  const ROLES = ["QA Engineer", "Инженер по тестированию", "Middle QA Engineer", "QA Automation Engineer", "Senior QA Engineer"];
  const SKILL_GROUPS = [
    [
      "Ручное тестирование", "Функциональное тестирование", "Регрессионное тестирование", "Интеграционное тестирование",
      "Системное тестирование", "Приемочное тестирование", "E2E testing", "Smoke testing", "Кроссбраузерное тестирование",
      "Кроссплатформенное тестирование", "Мобильное тестирование", "Desktop testing", "UI/UX testing", "Нагрузочное тестирование",
      "Анализ требований", "Тест-дизайн", "Scrum", "Cucumber", "Test documentation", "Bug reporting"
    ],
    [
      "API testing", "REST API", "SOAP", "gRPC", "Postman", "Bruno", "Insomnia", "Swagger", "Swagger/OpenAPI",
      "SoapUI", "cURL", "Newman", "DevTools", "Charles Proxy", "Kibana", "Wireshark", "JSON", "XML",
      "OAuth 2.0", "JWT", "Basic Auth", "TCP/IP", "Анализ логов", "Анализ трафика"
    ],
    [
      "SQL", "CRUD", "PostgreSQL", "MongoDB", "Redis", "DBeaver"
    ],
    [
      "Jira", "Confluence", "YouTrack", "Redmine", "Git", "CI/CD", "Jenkins", "TeamCity", "GitLab CI",
      "Argo CD", "TestRail", "Test IT", "TestLink", "TestCaseLab", "Zephyr"
    ],
    [
      "Linux", "Bash", "Python", "Java", "JavaScript", "C++", "Android Studio", "Unity"
    ],
    [
      "Docker", "Kubernetes", "OpenShift", "Selenium", "Playwright", "Cypress", "Appium", "Rest Assured",
      "JUnit", "Apache JMeter", "Allure", "Kafka", "RabbitMQ", "Клиент-серверная архитектура", "Микросервисы","Figma"
    ]
  ];
  const SKILLS = SKILL_GROUPS.flat();
  const EXPERIENCE_LIBRARY = [
    {
      title: "Web / Mobile / Desktop / AQA",
      source: "Playwright, Postman, Bruno, JMeter, CI/CD",
      suggestions: [
        "Анализировал проектную и техническую документацию, уточнял требования и оценивал риски тестирования перед началом работ.",
        "Проводил функциональное, регрессионное и интеграционное тестирование web, mobile и desktop/Unity-приложений.",
        "Проверял UI/UX, адаптивность и соответствие интерфейсов макетам, спецификациям и гайдлайнам.",
        "Тестировал REST API через Postman, Bruno и Swagger/OpenAPI, валидировал статусы, JSON-схемы и бизнес-логику.",
        "Разрабатывал и поддерживал автотесты на Python и Playwright для критичных пользовательских сценариев.",
        "Использовал Python для генерации тестовых данных, обработки логов и автоматизации повторяемых QA-задач.",
        "Проводил нагрузочное тестирование в Apache JMeter и анализировал поведение системы под нагрузкой.",
        "Интегрировал автотесты в CI/CD-пайплайны TeamCity, GitLab CI и Newman, подготавливал стенды перед запуском прогонов.",
        "Мониторил результаты прогонов, анализировал падения тестов и отправлял команде уведомления о статусе сборок.",
        "Работал с PostgreSQL, MongoDB и Redis: писал SQL-запросы, проверял данные и связи между сервисами.",
        "Оформлял тест-кейсы, чек-листы, тест-планы и баг-репорты, поддерживал тестовую документацию в актуальном состоянии.",
        "Взаимодействовал с разработчиками по дефектам, проводил ретест и участвовал в подготовке релизов."
      ]
    },
    {
      title: "Backend / Интеграции / Billing",
      source: "REST, SOAP, SQL, Kibana, Jenkins, Argo CD",
      suggestions: [
        "Проводил backend- и интеграционное тестирование сервисов, проверяя взаимодействие между API, БД и внешними системами.",
        "Тестировал REST и SOAP API с помощью Postman и cURL, валидировал JSON/XML-ответы и сценарии авторизации OAuth 2.0, JWT и Basic Auth.",
        "Писал SQL-запросы с JOIN и агрегатными функциями для проверки CRUD-операций, целостности и консистентности данных.",
        "Анализировал логи в Kibana и локализовывал дефекты на уровне API, базы данных и интеграционных цепочек.",
        "Запускал и контролировал автотесты в Jenkins, сопровождал тестовые поставки через Argo CD.",
        "Создавал и поддерживал тест-кейсы в TestLink и TestCaseLab, вёл дефекты в Jira и Redmine.",
        "Проводил функциональное, регрессионное и приемочное тестирование релизов и новых фич.",
        "Участвовал в Scrum-процессах, синхронизировался с разработчиками, аналитиками и PM по качеству релизов.",
        "Тестировал расчётные и биллинговые сценарии, проверял бизнес-правила, налоговые ставки и пограничные кейсы.",
        "Проводил UI-проверки web-приложения на разных разрешениях и мобильных устройствах, выявляя критичные пользовательские дефекты.",
        "Подготавливал отчётность по результатам тестирования и помогал команде принимать релизные решения."
      ]
    },
    {
      title: "Manual QA / Web / POS / Desktop",
      source: "DevTools, Postman, Charles, Figma, SQL",
      suggestions: [
        "Проводил ручное тестирование web- и desktop-приложений, включая frontend, backend и API-уровень.",
        "Работал с DevTools, Postman, Charles Proxy и Figma при проверке пользовательских сценариев, верстки и сетевого взаимодействия.",
        "Собирал, анализировал и уточнял требования, подготавливал тест-кейсы, чек-листы и тест-планы.",
        "Выполнял функциональное, регрессионное, smoke и sanity-тестирование новых фич и релизов.",
        "Писал SQL-запросы и проверял данные в DBeaver, валидировал изменения в товарных сущностях и бизнес-объектах.",
        "Тестировал интеграции с ККТ, сканерами, эквайрингом и смежными сервисами.",
        "Заводил и сопровождал дефекты в Jira, YouTrack и Redmine, контролировал исправления и повторное тестирование.",
        "Поддерживал автотесты на внутреннем фреймворке команды и участвовал в развитии QA-процессов.",
        "Работал с логами, Git и тестовыми сборками, воспроизводил ошибки в разных конфигурациях окружения.",
        "Проверял работу системы в тестовой среде через видеопотоки и воспроизводил сценарии на виртуальных машинах.",
        "Использовал Linux для базовой диагностики, запуска проверок и анализа окружения.",
        "Участвовал в Scrum-процессах и оценке трудозатрат на тестирование."
      ]
    }
  ];
  const ATS_KEYWORD_GROUPS = [
    {
      title: "hh.ru и общий поиск",
      source: "ключевые навыки и поиск по резюме",
      keywords: ["QA Engineer", "Тестировщик", "Инженер по тестированию", "Ключевые навыки", "Опыт работы", "Тест-кейсы", "Чек-листы", "Баг-репорты", "Тест-дизайн", "Jira"]
    },
    {
      title: "Сбер",
      source: "API, backend, fullstack QA",
      keywords: ["REST API", "gRPC", "Postman", "Swagger/OpenAPI", "SQL", "PostgreSQL", "CI/CD", "JMeter", "Kubernetes", "Kafka", "Jenkins", "Allure"]
    },
    {
      title: "Яндекс",
      source: "manual QA, web/mobile, backend",
      keywords: ["Мануальное тестирование", "Микросервисная архитектура", "RESTful API", "Postman", "SQL", "CRUD", "PostgreSQL", "JSON", "gRPC", "Оптимизация процессов тестирования"]
    },
    {
      title: "Ozon Tech",
      source: "junior-middle QA ориентиры",
      keywords: ["Chrome DevTools", "Postman", "GIT", "SQL", "Тест-кейсы", "Баг-трекер", "Чтение логов", "Граничные значения", "Классы эквивалентности", "API и GUI"]
    },
    {
      title: "Авито",
      source: "качество процесса и исследовательское тестирование",
      keywords: ["Качество на всех этапах", "Тест-планы", "Чек-листы", "Code Review тестов", "API", "E2E", "Unit", "Исследовательское тестирование", "Тестовые модели", "Оптимизация тестирования"]
    }
  ];
  const ATS_RULES = [
    "Повторяйте формулировки из целевых вакансий буквально: `REST API`, `Postman`, `SQL`, `Jira`, `регрессионное тестирование`, если вы реально с этим работали.",
    "В навыках перечисляйте только профессиональные технологии и методы, а личные качества оставляйте для блока `О себе`.",
    "В каждом пункте опыта связывайте действие и объект: не `работал с API`, а `тестировал REST API, валидировал JSON-ответы и проверял бизнес-логику`.",
    "Добавляйте слова, по которым ищут кандидатов: `тест-кейсы`, `чек-листы`, `баг-репорты`, `SQL`, `PostgreSQL`, `DevTools`, `CI/CD`, `микросервисы`.",
    "Если опыт смешанный, лучше писать полные связки `web + mobile + API`, `backend + БД + логи`, `ручное тестирование + автотесты`, а не разрозненные слова.",
    "Для ATS полезнее конкретные инструменты и протоколы, чем общие фразы: `OAuth 2.0`, `JWT`, `SOAP`, `Kafka`, `RabbitMQ`, `JMeter`, `Playwright`.",
    "Избегайте расплывчатых формулировок вроде `участвовал в тестировании проекта`; лучше `проводил функциональное и интеграционное тестирование web-приложения и API`."
  ];
  const ATS_EXAMPLE_BULLETS = [
    "Проводил функциональное, регрессионное и интеграционное тестирование web-приложения, мобильного клиента и REST API.",
    "Тестировал backend-сервисы через Postman и Swagger/OpenAPI, валидировал JSON/XML-ответы и бизнес-логику.",
    "Писал SQL-запросы к PostgreSQL для проверки CRUD-операций, целостности данных и результатов интеграций.",
    "Анализировал логи и локализовывал дефекты на уровне UI, API, БД и микросервисного взаимодействия.",
    "Поддерживал тестовую документацию: тест-кейсы, чек-листы, тест-планы, баг-репорты; сопровождал дефекты в Jira.",
    "Интегрировал автотесты в CI/CD и контролировал результаты прогонов в Jenkins, GitLab CI или TeamCity."
  ];
  const EXPERIENCE_BLOCK_COLORS = ["#0f766e", "#2563eb", "#e11d48", "#7c3aed", "#ca8a04"];
  const PDF_STYLE_OPTIONS = [
    { value: "hh", label: "hh" },
    { value: "classic", label: "classic" },
    { value: "min", label: "min" }
  ];
  const ALL_EXPERIENCE_SUGGESTIONS = EXPERIENCE_LIBRARY.flatMap((library, libraryIndex) => (
    library.suggestions.map((text, suggestionIndex) => ({
      key: `${libraryIndex}:${suggestionIndex}`,
      text,
      libraryIndex,
      suggestionIndex,
      title: library.title,
      source: library.source
    }))
  ));

  const defaultState = createDefaultState();
  let state = loadState();

  const inputs = {
    fullName: document.getElementById("full-name"),
    headline: document.getElementById("headline"),
    experienceTotal: document.getElementById("experience-total"),
    city: document.getElementById("city"),
    phone: document.getElementById("phone"),
    email: document.getElementById("email"),
    telegram: document.getElementById("telegram"),
    specialization: document.getElementById("specialization"),
    employmentType: document.getElementById("employment-type"),
    workFormat: document.getElementById("work-format"),
    commuteTime: document.getElementById("commute-time"),
    grade: document.getElementById("grade"),
    salary: document.getElementById("salary"),
    showSalary: document.getElementById("show-salary"),
    showSkillIcons: document.getElementById("show-skill-icons"),
    summary: document.getElementById("summary")
  };

  const avatarPreview = document.getElementById("avatar-preview");
  const photoInput = document.getElementById("photo-input");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const profileExtraToggle = document.getElementById("profile-extra-toggle");
  const profileExtraFields = document.getElementById("profile-extra-fields");
  const addPhotoBtn = document.querySelector('label[for="photo-input"]');
  const addExperienceBtn = document.getElementById("add-experience-btn");
  const showEducationBtn = document.getElementById("show-education-btn");
  const educationSectionEl = document.getElementById("resume-section-education");
  const educationListEl = document.getElementById("education-list");
  const addEducationBtn = document.getElementById("add-education-btn");
  const skillsLibraryEl = document.getElementById("skills-library");
  const selectedSkillsCountEl = document.getElementById("selected-skills-count");
  const experienceListEl = document.getElementById("experience-list");
  const experienceBlockTabsEl = document.getElementById("experience-block-tabs");
  const experienceSuggestionSliderEl = document.getElementById("experience-suggestion-slider");
  const experienceActiveLibraryMetaEl = document.getElementById("experience-active-library-meta");
  const atsInlineSkillsEl = document.getElementById("ats-inline-skills");
  const atsInlineExperienceEl = document.getElementById("ats-inline-experience");
  const atsInlineSuggestionsEl = document.getElementById("ats-inline-suggestions");
  const experienceTotalInfoBtn = document.getElementById("experience-total-info-btn");
  const experienceTotalPopoverEl = document.getElementById("experience-total-popover");
  const experienceCoverageWarningEl = document.getElementById("experience-coverage-warning");
  const exportStatusEl = document.getElementById("export-status");
  const resumeSidebarEl = document.querySelector(".resume-builder-sidebar");
  const resumeSidebarCardEl = document.querySelector(".resume-builder-sidebar__card");
  const printHintCardEl = document.querySelector(".resume-print-hint-card");
  const educationHintCardEl = document.querySelector(".resume-education-hint-card");
  const suggestionsSectionEl = document.getElementById("resume-section-suggestions");
  const previewSectionEl = document.getElementById("resume-section-preview");
  const previewStylePrevBtn = document.getElementById("preview-style-prev-btn");
  const previewStyleNextBtn = document.getElementById("preview-style-next-btn");
  const downloadResumeBtn = document.getElementById("download-resume-btn");
  const exportFormatMenu = document.getElementById("export-format-menu");
  const exportFormatOptionButtons = Array.from(document.querySelectorAll("[data-export-format-option]"));
  const generateSummaryBtn = document.getElementById("generate-summary-btn");
  const summaryStatusEl = document.getElementById("summary-status");
  const summaryAiNavEl = document.getElementById("summary-ai-nav");
  const summaryPrevBtn = document.getElementById("summary-prev-btn");
  const summaryNextBtn = document.getElementById("summary-next-btn");
  const summaryAiIndexEl = document.getElementById("summary-ai-index");
  const summaryAiModelEl = document.getElementById("summary-ai-model");
  const salaryMarketNoteEl = document.getElementById("salary-market-note");
  let currentModels = readValidatedChatModelsCache() || readModelListCache() || FAST_MODEL_HINTS.slice(0, 5);
  let activeExperienceIndex = 0;
  let activeSuggestionEditKey = "";
  let activeSuggestionAiPromptKey = "";
  let isSuggestionAiGeneratingKey = "";
  let isSummaryGenerating = false;

  const preview = {
    photo: document.getElementById("preview-photo"),
    name: document.getElementById("preview-name"),
    headline: document.getElementById("preview-headline"),
    experience: document.getElementById("preview-experience"),
    city: document.getElementById("preview-city"),
    salary: document.getElementById("preview-salary"),
    targetHeadline: document.getElementById("preview-target-headline"),
    targetSalary: document.getElementById("preview-target-salary"),
    targetSpecialization: document.getElementById("preview-target-specialization"),
    targetEmployment: document.getElementById("preview-target-employment"),
    targetWorkFormat: document.getElementById("preview-target-work-format"),
    targetCommute: document.getElementById("preview-target-commute"),
    contacts: document.getElementById("preview-contacts"),
    summary: document.getElementById("preview-summary"),
    skills: document.getElementById("preview-skills"),
    experienceList: document.getElementById("preview-experience-list"),
    educationSection: document.querySelector('.resume-preview-section[data-section="education"]'),
    educationList: document.getElementById("preview-education-list")
  };

  bindInputs();
  bindButtons();
  render();
  bindHorizontalDragScroll();
  bindResponsiveRender();
  bindPrintHintPosition();

  function createDefaultState() {
    return {
      profile: {
        fullName: "Иванов Иван",
        headline: "Middle QA Engineer",
        experienceTotal: "3 года 8 месяцев",
        city: "Москва",
        phone: "+7 (999) 123-45-67",
        email: "ivan.qa@mail.ru",
        telegram: "@ivan_qa",
        specialization: "Тестировщик",
        employmentType: "полная занятость",
        workFormat: "удалённо",
        commuteTime: "не имеет значения",
        grade: "junior",
        salary: "80 000 — 120 000 ₽",
        showSalary: true,
        showSkillIcons: false,
        summary: "QA-инженер с опытом в web, mobile, API и интеграционном тестировании.",
        photoDataUrl: DEFAULT_RESUME_PHOTO
      },
      skills: [
        "Ручное тестирование", "Функциональное тестирование", "Регрессионное тестирование", "Интеграционное тестирование",
        "API testing", "REST API", "Postman", "Swagger", "SQL", "PostgreSQL", "Jira", "Git", "Linux", "Bash", "Тест-дизайн"
      ],
      experiences: [createExperience(0)],
      educations: [],
      educationSectionOpened: false,
      experienceGender: "male",
      generatedSummaries: [],
      generatedSummaryIndex: 0,
      pdfStyle: "hh",
      exportFormat: "pdf",
      customSuggestions: [],
      nextCustomSuggestionId: 1
    };
  }

  function createExperience(libraryIndex) {
    return {
      libraryIndex,
      employerIndex: libraryIndex,
      roleIndex: Math.min(2, ROLES.length - 1),
      useCustomEmployer: false,
      useCustomRole: false,
      customEmployer: "",
      customRole: "",
      location: libraryIndex === 0 ? "Москва" : "",
      startMonth: libraryIndex === 0 ? 4 : CURRENT_MONTH,
      startYear: libraryIndex === 0 ? 2024 : CURRENT_YEAR,
      endMonth: CURRENT_MONTH,
      endYear: CURRENT_YEAR,
      endPresent: true,
      selectedSuggestionKeys: libraryIndex === 0 ? ["0:0", "0:2", "0:3"] : [],
      suggestionOverrides: {},
      suggestionAiVariants: {}
    };
  }

  function createEducation(index = 0) {
    const startYear = Math.max(CURRENT_YEAR - 8, CURRENT_YEAR - 4 + index);
    const endYear = Math.min(CURRENT_YEAR + 1, startYear + 3);
    return {
      institutionIndex: Math.min(index, EDUCATION_INSTITUTIONS.length - 1),
      specialtyIndex: Math.min(index, EDUCATION_SPECIALTIES.length - 1),
      useCustomInstitution: false,
      useCustomSpecialty: false,
      customInstitution: "",
      customSpecialty: "",
      startMonth: 8,
      startYear,
      endMonth: 5,
      endYear,
      endPresent: false
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return {
        profile: normalizeProfile(parsed.profile),
        skills: Array.isArray(parsed.skills) ? parsed.skills.filter((item) => typeof item === "string") : structuredClone(defaultState).skills,
        experiences: normalizeExperiences(parsed.experiences),
        educations: normalizeEducations(parsed.educations),
        educationSectionOpened: normalizeBooleanValue(
          parsed.educationSectionOpened,
          Array.isArray(parsed.educations) && parsed.educations.length > 0
        ),
        experienceGender: parsed.experienceGender === "female" ? "female" : "male",
        generatedSummaries: normalizeGeneratedSummaries(parsed.generatedSummaries),
        generatedSummaryIndex: normalizeGeneratedSummaryIndex(parsed.generatedSummaryIndex, parsed.generatedSummaries),
        pdfStyle: normalizePdfStyle(parsed.pdfStyle),
        exportFormat: normalizeExportFormat(parsed.exportFormat),
        customSuggestions: normalizeCustomSuggestions(parsed.customSuggestions),
        nextCustomSuggestionId: normalizeNextCustomSuggestionId(parsed.nextCustomSuggestionId, parsed.customSuggestions)
      };
    } catch (error) {
      console.warn("Failed to load resume builder state", error);
      return structuredClone(defaultState);
    }
  }

  function normalizeProfile(profile) {
    const next = {
      ...structuredClone(defaultState).profile,
      ...(profile || {})
    };
    next.showSalary = normalizeBooleanValue(next.showSalary, true);
    next.showSkillIcons = normalizeBooleanValue(next.showSkillIcons, false);
    if (LEGACY_DEFAULT_RESUME_PHOTOS.includes(next.photoDataUrl)) {
      next.photoDataUrl = DEFAULT_RESUME_PHOTO;
    }
    return next;
  }

  function normalizeBooleanValue(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    return fallback;
  }

  function normalizePdfStyle(value) {
    const next = String(value || "").trim();
    if (next === "hh" || next === "min" || next === "classic") return next;
    return "hh";
  }

  function normalizeExportFormat(value) {
    const next = String(value || "").trim();
    if (next === "txt" || next === "pdf") return next;
    return "pdf";
  }

  function normalizeExperiences(items) {
    if (!Array.isArray(items) || !items.length) return [createExperience(0)];
    return items.slice(0, MAX_EXPERIENCES).map((item, index) => normalizeExperienceItem(item, index));
  }

  function normalizeEducations(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, MAX_EDUCATIONS).map((item, index) => normalizeEducationItem(item, index));
  }

  function normalizeEducationItem(item, index) {
    const base = {
      ...createEducation(index),
      ...(item || {})
    };
    const legacyPeriod = parseLegacyPeriod(base.period);
    const startMonth = normalizeMonthValue(base.startMonth, legacyPeriod?.startMonth ?? createEducation(index).startMonth);
    const startYear = normalizeYearValue(base.startYear, legacyPeriod?.startYear ?? createEducation(index).startYear);
    const endPresent = typeof base.endPresent === "boolean" ? base.endPresent : (legacyPeriod?.endPresent ?? false);
    const endMonth = normalizeMonthValue(base.endMonth, legacyPeriod?.endMonth ?? createEducation(index).endMonth);
    const endYear = normalizeYearValue(base.endYear, legacyPeriod?.endYear ?? createEducation(index).endYear);
    const institutionIndex = Math.max(0, Math.min(Number(base.institutionIndex) || 0, EDUCATION_INSTITUTIONS.length - 1));
    const specialtyIndex = Math.max(0, Math.min(Number(base.specialtyIndex) || 0, EDUCATION_SPECIALTIES.length - 1));
    return {
      ...base,
      institutionIndex,
      specialtyIndex,
      useCustomInstitution: normalizeBooleanValue(base.useCustomInstitution, false),
      useCustomSpecialty: normalizeBooleanValue(base.useCustomSpecialty, false),
      customInstitution: String(base.customInstitution || ""),
      customSpecialty: String(base.customSpecialty || ""),
      startMonth,
      startYear,
      endMonth,
      endYear,
      endPresent
    };
  }

  function normalizeExperienceItem(item, index) {
    const base = {
      ...createExperience(Math.min(index, EXPERIENCE_LIBRARY.length - 1)),
      ...(item || {})
    };
    const legacyPeriod = parseLegacyPeriod(base.period);
    const startMonth = normalizeMonthValue(base.startMonth, legacyPeriod?.startMonth ?? createExperience(index).startMonth);
    const startYear = normalizeYearValue(base.startYear, legacyPeriod?.startYear ?? createExperience(index).startYear);
    const endPresent = typeof base.endPresent === "boolean" ? base.endPresent : (legacyPeriod?.endPresent ?? true);
    const endMonth = normalizeMonthValue(base.endMonth, legacyPeriod?.endMonth ?? CURRENT_MONTH);
    const endYear = normalizeYearValue(base.endYear, legacyPeriod?.endYear ?? CURRENT_YEAR);
    return {
      ...base,
      selectedSuggestionKeys: normalizeSuggestionKeys(base.selectedSuggestionKeys, base.selectedSuggestionIds, base.libraryIndex),
      suggestionOverrides: normalizeSuggestionOverrides(base.suggestionOverrides),
      startMonth,
      startYear,
      endMonth,
      endYear,
      endPresent,
      suggestionAiVariants: normalizeSuggestionAiVariants(base.suggestionAiVariants)
    };
  }

  function normalizeMonthValue(value, fallback) {
    const next = Number(value);
    if (Number.isInteger(next) && next >= 0 && next <= 11) return next;
    return fallback;
  }

  function normalizeYearValue(value, fallback) {
    const next = Number(value);
    if (Number.isInteger(next) && next >= CURRENT_YEAR - 40 && next <= CURRENT_YEAR + 1) return next;
    return fallback;
  }

  function normalizeSuggestionKeys(keys, legacyIds, libraryIndex) {
    if (Array.isArray(keys) && keys.length) {
      return keys.filter((item) => typeof item === "string" && isValidSuggestionKey(item));
    }
    if (Array.isArray(legacyIds) && legacyIds.length) {
      return legacyIds
        .map((id) => `${Number.isInteger(libraryIndex) ? libraryIndex : 0}:${id}`)
        .filter((key) => isValidSuggestionKey(key));
    }
    return [];
  }

  function normalizeSuggestionOverrides(value) {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, text]) => isValidSuggestionKey(key) && typeof text === "string")
        .map(([key, text]) => [key, text])
    );
  }

  function normalizeSuggestionAiVariants(value) {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, items]) => isValidSuggestionKey(key) && Array.isArray(items))
        .map(([key, items]) => [
          key,
          items
            .filter((item) => item && typeof item.text === "string" && item.text.trim())
            .map((item) => ({
              text: String(item.text).trim(),
              model: String(item.model || "").trim()
            }))
            .slice(-4)
        ])
        .filter(([, items]) => items.length)
    );
  }

  function normalizeCustomSuggestions(items) {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item && typeof item.id !== "undefined" && typeof item.text === "string")
      .map((item) => ({
        id: String(item.id),
        text: String(item.text).trim() || "Новая формулировка"
      }));
  }

  function normalizeNextCustomSuggestionId(value, items) {
    const normalized = normalizeCustomSuggestions(items);
    const numericIds = normalized
      .map((item) => Number(item.id))
      .filter((item) => Number.isInteger(item) && item > 0);
    const fallback = numericIds.length ? Math.max(...numericIds) + 1 : 1;
    const next = Number(value);
    return Number.isInteger(next) && next > 0 ? Math.max(next, fallback) : fallback;
  }

  function parseLegacyPeriod(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    const monthMap = new Map(MONTH_NAMES_GENITIVE.map((name, index) => [name, index]));
    const parts = text.split("—").map((item) => item.trim()).filter(Boolean);
    if (!parts.length) return null;
    const start = parseLegacyPeriodPart(parts[0], monthMap);
    if (!start) return null;
    const endRaw = parts[1] || "";
    if (/настоящее/i.test(endRaw)) {
      return { ...start, endMonth: CURRENT_MONTH, endYear: CURRENT_YEAR, endPresent: true };
    }
    const end = parseLegacyPeriodPart(endRaw, monthMap);
    if (!end) return null;
    return { ...start, endMonth: end.startMonth, endYear: end.startYear, endPresent: false };
  }

  function parseLegacyPeriodPart(text, monthMap) {
    const match = String(text || "").trim().toLowerCase().match(/^([а-яё]+)\s+(\d{4})$/i);
    if (!match) return null;
    const month = monthMap.get(match[1]);
    const year = Number(match[2]);
    if (!Number.isInteger(month) || !Number.isInteger(year)) return null;
    return { startMonth: month, startYear: year };
  }

  function normalizeGeneratedSummaries(items) {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item && typeof item.answer === "string" && item.answer.trim())
      .map((item) => ({
        answer: String(item.answer).trim(),
        model: String(item.model || "").trim()
      }));
  }

  function normalizeGeneratedSummaryIndex(index, items) {
    const normalizedItems = normalizeGeneratedSummaries(items);
    if (!normalizedItems.length) return 0;
    const safe = Number(index);
    if (!Number.isInteger(safe)) return 0;
    return Math.max(0, Math.min(safe, normalizedItems.length - 1));
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function bindInputs() {
    Object.entries(inputs).forEach(([key, node]) => {
      if (!node) return;
      const isCheckbox = node.type === "checkbox";
      if (isCheckbox) {
        node.checked = typeof state.profile[key] === "boolean" ? state.profile[key] : Boolean(state.profile[key]);
      } else {
        node.value = state.profile[key] || "";
      }
      const eventName = node.tagName === "SELECT" || isCheckbox ? "change" : "input";
      node.addEventListener(eventName, () => {
        state.profile[key] = isCheckbox ? node.checked : node.value;
        if (key === "grade") applySalaryByGrade({ force: true });
        if (key === "showSkillIcons") {
          renderSkills({ forceStructure: true });
          renderPreview();
        }
        if (key === "summary") {
          syncCurrentGeneratedSummaryFromInput();
          adjustSummaryTextareaHeight();
          renderSummaryButton();
        }
        persist();
      });
    });

    photoInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      state.profile.photoDataUrl = await fileToDataUrl(file);
      photoInput.value = "";
      persist("Фото добавлено.");
    });

    removePhotoBtn.addEventListener("click", () => {
      state.profile.photoDataUrl = "";
      persist("Фото удалено.");
    });
  }

  function bindButtons() {
    profileExtraToggle?.addEventListener("click", () => {
      const shouldOpen = Boolean(profileExtraFields?.hidden);
      if (profileExtraFields) profileExtraFields.hidden = !shouldOpen;
      profileExtraToggle.setAttribute("aria-expanded", String(shouldOpen));
    });

    addExperienceBtn.addEventListener("click", () => {
      if (state.experiences.length >= MAX_EXPERIENCES) {
        setExportStatus(`Можно добавить максимум ${MAX_EXPERIENCES} блоков опыта.`, "info");
        return;
      }
      state.experiences.push(createExperience(state.experiences.length));
      activeExperienceIndex = state.experiences.length - 1;
      activeSuggestionEditKey = "";
      activeSuggestionAiPromptKey = "";
      isSuggestionAiGeneratingKey = "";
      persist("", { preserveSuggestionScroll: false });
    });

    showEducationBtn?.addEventListener("click", () => {
      addEducationBlock({ scrollIntoView: true });
    });

    addEducationBtn?.addEventListener("click", () => {
      addEducationBlock();
    });

    previewStylePrevBtn?.addEventListener("click", () => {
      shiftPdfStyle(-1);
    });

    previewStyleNextBtn?.addEventListener("click", () => {
      shiftPdfStyle(1);
    });

    downloadResumeBtn?.addEventListener("click", () => {
      toggleExportFormatMenu();
    });

    exportFormatOptionButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const format = normalizeExportFormat(button.dataset.exportFormatOption);
        state.exportFormat = format;
        saveState();
        closeExportFormatMenu();
        await exportResume(format);
      });
    });

    generateSummaryBtn?.addEventListener("click", async () => {
      await generateSummaryFromSelections();
    });

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-salary-popover-toggle]");
      const helpToggle = event.target.closest("[data-help-toggle]");
      const experienceTotalToggle = event.target.closest("[data-experience-total-toggle]");
      const insidePopover = event.target.closest(".salary-market-popover");
      const insideHelpPopover = event.target.closest(".builder-inline-help__popover");
      const insideExperienceTotalPopover = event.target.closest(".experience-total-popover");
      const insideExportMenu = event.target.closest(".export-download-menu");
      if (toggle) {
        const key = toggle.dataset.salaryPopoverToggle;
        toggleSalaryPopover(key);
        return;
      }
      if (helpToggle) {
        const key = helpToggle.dataset.helpToggle;
        toggleHelpPopover(key);
        return;
      }
      if (experienceTotalToggle) {
        toggleExperienceTotalPopover();
        return;
      }
      if (!insideExportMenu) closeExportFormatMenu();
      if (!insidePopover) {
        closeSalaryPopovers();
      }
      if (!insideHelpPopover) {
        closeHelpPopovers();
      }
      if (!insideExperienceTotalPopover) {
        closeExperienceTotalPopover();
      }
    });

    summaryPrevBtn?.addEventListener("click", () => {
      if (!state.generatedSummaries.length) return;
      state.generatedSummaryIndex = (state.generatedSummaryIndex - 1 + state.generatedSummaries.length) % state.generatedSummaries.length;
      applyCurrentGeneratedSummary();
      persist();
    });

    summaryNextBtn?.addEventListener("click", () => {
      if (!state.generatedSummaries.length) return;
      state.generatedSummaryIndex = (state.generatedSummaryIndex + 1) % state.generatedSummaries.length;
      applyCurrentGeneratedSummary();
      persist();
    });

    document.querySelectorAll("[data-field-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const fieldId = button.dataset.fieldAction;
        const target = inputs[toCamel(fieldId)];
        if (!target) return;
        if (target.value) {
          target.value = "";
          state.profile[toCamel(fieldId)] = "";
          persist();
        } else {
          target.focus();
        }
      });
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gender-switch]");
      if (!button) return;
      state.experienceGender = button.dataset.gender === "female" ? "female" : "male";
      persist("", { preserveSuggestionScroll: true });
    });

  }

  function addEducationBlock(options = {}) {
    state.educationSectionOpened = true;

    if (educationHintCardEl) {
      educationHintCardEl.hidden = true;
      resetFixedHintCardPosition(educationHintCardEl);
    }

    if (state.educations.length >= MAX_EDUCATIONS) {
      setExportStatus(`Можно добавить максимум ${MAX_EDUCATIONS} блока образования.`, "info");
      persist("", { preserveSuggestionScroll: true });
      return;
    }

    state.educations.push(createEducation(state.educations.length));
    persist("", { preserveSuggestionScroll: true });

    if (options.scrollIntoView) {
      requestAnimationFrame(() => educationSectionEl?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function syncInputs() {
    Object.entries(inputs).forEach(([key, node]) => {
      if (!node) return;
      if (node.type === "checkbox") {
        node.checked = normalizeBooleanValue(state.profile[key], key === "showSalary");
      } else {
        node.value = state.profile[key] || "";
      }
    });
    adjustSummaryTextareaHeight();
    renderSummaryButton();
  }

  function persist(message, options = {}) {
    saveState();
    if (options.preserveSuggestionScroll !== false) {
      withPreservedSuggestionScroll(() => render(message));
      return;
    }
    render(message);
  }

  function persistTypingChange() {
    saveState();
    renderPreview();
    renderExportControls();
    updateEducationHintPosition();
    updatePrintHintPosition();
  }

  function render(message) {
    fillAvatar(avatarPreview, state.profile.photoDataUrl, state.profile.fullName);
    renderPhotoActions();
    renderFieldActions();
    renderGenderSwitch();
    renderSalaryMarketNote();
    renderSummaryAiNav();
    renderSummaryButton();
    adjustSummaryTextareaHeight();
    renderSkills();
    renderExperiences();
    renderEducations();
    renderInlineAtsHints();
    renderExperienceCoverage();
    renderPreview();
    renderExportControls();
    updateEducationHintPosition();
    updatePrintHintPosition();
    if (message) setExportStatus(message, "info");
  }

  function captureSuggestionScrollState() {
    const rootRect = experienceSuggestionSliderEl?.getBoundingClientRect();
    return {
      viewportTop: rootRect ? rootRect.top : null,
      rootScrollTop: experienceSuggestionSliderEl?.scrollTop || 0,
      tabsScrollLeft: experienceBlockTabsEl?.scrollLeft || 0,
      sliderScrollLeftByKey: Object.fromEntries(
        Array.from(experienceSuggestionSliderEl?.querySelectorAll(".experience-suggestion-slider") || [])
          .map((slider) => [slider.dataset.suggestionLibrary || "", slider.scrollLeft])
      )
    };
  }

  function restoreSuggestionScrollState(snapshot) {
    if (!snapshot) return;
    if (experienceBlockTabsEl) experienceBlockTabsEl.scrollLeft = snapshot.tabsScrollLeft || 0;
    if (experienceSuggestionSliderEl) {
      experienceSuggestionSliderEl.scrollTop = snapshot.rootScrollTop || 0;
      experienceSuggestionSliderEl.querySelectorAll(".experience-suggestion-slider").forEach((slider) => {
        const key = slider.dataset.suggestionLibrary || "";
        if (Object.prototype.hasOwnProperty.call(snapshot.sliderScrollLeftByKey || {}, key)) {
          slider.scrollLeft = snapshot.sliderScrollLeftByKey[key];
        }
      });
    }
    if (typeof snapshot.viewportTop === "number" && experienceSuggestionSliderEl) {
      const nextTop = experienceSuggestionSliderEl.getBoundingClientRect().top;
      const delta = nextTop - snapshot.viewportTop;
      if (Math.abs(delta) > 1) window.scrollBy(0, delta);
    }
  }

  function withPreservedSuggestionScroll(callback) {
    const snapshot = captureSuggestionScrollState();
    callback();
    restoreSuggestionScrollState(snapshot);
    requestAnimationFrame(() => restoreSuggestionScrollState(snapshot));
  }

  function renderExportControls() {
    document.body.dataset.pdfStyle = normalizePdfStyle(state.pdfStyle);
    state.exportFormat = normalizeExportFormat(state.exportFormat);
    exportFormatOptionButtons.forEach((button) => {
      const isActive = normalizeExportFormat(button.dataset.exportFormatOption) === state.exportFormat;
      button.classList.toggle("is-active", isActive);
    });
    preparePrintTemplate(state.pdfStyle);
  }

  function toggleExportFormatMenu() {
    const isOpen = downloadResumeBtn?.getAttribute("aria-expanded") === "true";
    if (isOpen) closeExportFormatMenu();
    else openExportFormatMenu();
  }

  function openExportFormatMenu() {
    if (!downloadResumeBtn || !exportFormatMenu) return;
    downloadResumeBtn.setAttribute("aria-expanded", "true");
    exportFormatMenu.setAttribute("aria-hidden", "false");
    exportFormatMenu.classList.add("is-open");
  }

  function closeExportFormatMenu() {
    if (!downloadResumeBtn || !exportFormatMenu) return;
    downloadResumeBtn.setAttribute("aria-expanded", "false");
    exportFormatMenu.setAttribute("aria-hidden", "true");
    exportFormatMenu.classList.remove("is-open");
  }

  async function exportResume(format) {
    const normalized = normalizeExportFormat(format);
    if (normalized === "txt") {
      downloadAtsTextResume();
      return;
    }
    preparePrintTemplate(state.pdfStyle);
    await preparePdfAssetsForPrint();
    window.print();
  }

  async function preparePdfAssetsForPrint() {
    renderSkills({ forceStructure: true });
    renderPreview();
    renderExportControls();
    await waitForPrintAssets();
  }

  async function waitForPrintAssets() {
    const waits = [];
    if (document.fonts?.ready) waits.push(withTimeout(document.fonts.ready, 1200));
    if (window.customElements?.whenDefined) waits.push(withTimeout(customElements.whenDefined("iconify-icon"), 1200));
    await Promise.allSettled(waits);
    for (let index = 0; index < 8; index += 1) {
      await nextFrame();
      const icons = Array.from(document.querySelectorAll("iconify-icon"));
      if (!icons.length || icons.every((icon) => icon.shadowRoot || icon.innerHTML.trim())) break;
      await delay(80);
    }
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      delay(timeoutMs)
    ]);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function getCurrentPdfStyleOption() {
    const normalized = normalizePdfStyle(state.pdfStyle);
    return PDF_STYLE_OPTIONS.find((item) => item.value === normalized) || PDF_STYLE_OPTIONS[0];
  }

  function getCurrentPdfStyleIndex() {
    const normalized = normalizePdfStyle(state.pdfStyle);
    return Math.max(0, PDF_STYLE_OPTIONS.findIndex((item) => item.value === normalized));
  }

  function shiftPdfStyle(offset) {
    const currentIndex = getCurrentPdfStyleIndex();
    const nextIndex = (currentIndex + offset + PDF_STYLE_OPTIONS.length) % PDF_STYLE_OPTIONS.length;
    state.pdfStyle = PDF_STYLE_OPTIONS[nextIndex].value;
    persist(`Стиль предпросмотра: ${PDF_STYLE_OPTIONS[nextIndex].label}.`);
  }

  function preparePrintTemplate(style) {
    const normalized = normalizePdfStyle(style);
    // Adjust section titles for print templates (CSS can't change text content reliably).
    const titles = getPrintTitles(normalized);
    document.querySelectorAll("[data-print-title]").forEach((node) => node.removeAttribute("data-print-title"));
    const aboutStrong = document.querySelector('.resume-preview-section[data-section="about"] strong');
    const skillsStrong = document.querySelector('.resume-preview-section[data-section="skills"] strong');
    const expStrong = document.querySelector('.resume-preview-section[data-section="exp"] strong');
    const educationStrong = document.querySelector('.resume-preview-section[data-section="education"] strong');
    if (aboutStrong) aboutStrong.textContent = titles.about;
    if (skillsStrong) skillsStrong.textContent = titles.skills;
    if (expStrong) expStrong.textContent = titles.exp;
    if (educationStrong) educationStrong.textContent = titles.education;
  }

  function getPrintTitles(style) {
    if (style === "hh" || style === "min") {
      return { about: "О себе", skills: "Навыки", exp: "Опыт работы", education: "Образование" };
    }
    return { about: "О себе", skills: "Навыки", exp: "Опыт", education: "Образование" };
  }

  // After print, restore preview titles back to Russian defaults (to avoid "sticky" changes in UI).
  window.addEventListener("afterprint", () => {
    preparePrintTemplate(state.pdfStyle);
  });

  function renderPhotoActions() {
    const hasPhoto = Boolean(state.profile.photoDataUrl);
    if (addPhotoBtn) addPhotoBtn.hidden = hasPhoto;
    if (removePhotoBtn) removePhotoBtn.hidden = !hasPhoto;
  }

  function renderFieldActions() {
    document.querySelectorAll("[data-field-action]").forEach((button) => {
      const fieldId = button.dataset.fieldAction;
      const target = inputs[toCamel(fieldId)];
      const hasValue = Boolean(target?.value);
      button.textContent = hasValue ? "✕" : "✎";
      button.setAttribute("aria-label", hasValue ? "Очистить поле" : "Редактировать поле");
      button.setAttribute("title", hasValue ? "Очистить поле" : "Редактировать поле");
    });

  }

  function renderGenderSwitch() {
    document.body.classList.toggle("gender-male", state.experienceGender !== "female");
    document.body.classList.toggle("gender-female", state.experienceGender === "female");
    document.querySelectorAll("[data-gender-switch]").forEach((button) => {
      const isActive = (button.dataset.gender === "female") === (state.experienceGender === "female");
      button.classList.toggle("is-active", isActive);
    });
  }

  function applySalaryByGrade(options = {}) {
    const grade = String(state.profile.grade || "").trim();
    const guide = MARKET_SALARY_GUIDE[grade];
    if (!guide) return;
    if (options.force || !String(state.profile.salary || "").trim()) {
      state.profile.salary = guide.recommended;
      if (inputs.salary) inputs.salary.value = state.profile.salary;
    }
  }

  function renderSalaryMarketNote() {
    if (!salaryMarketNoteEl) return;
    const grade = String(state.profile.grade || "").trim();
    const guide = MARKET_SALARY_GUIDE[grade];
    if (!guide) {
      salaryMarketNoteEl.innerHTML = "";
      return;
    }
    salaryMarketNoteEl.innerHTML = `
      <button class="salary-market-info" type="button" data-salary-popover-toggle="guide" aria-expanded="false" aria-label="Показать ориентир по зарплате">!</button>
      <div class="info-popover salary-market-popover" data-salary-popover="guide">
        <strong>Ориентир для ${escapeHtml(guide.label)}</strong>
        <p>${escapeHtml(guide.recommended)}</p>
        <div class="salary-market-links">
          ${guide.sources.map((source) => `
            <div class="salary-market-source">
              <strong>${escapeHtml(source.name)}</strong>
              <span>${escapeHtml(source.range)}</span>
              <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function toggleSalaryPopover(key) {
    const target = salaryMarketNoteEl?.querySelector(`[data-salary-popover="${key}"]`);
    const button = salaryMarketNoteEl?.querySelector(`[data-salary-popover-toggle="${key}"]`);
    if (!target || !button) return;
    const isOpen = target.classList.contains("is-open");
    closeSalaryPopovers();
    if (!isOpen) {
      target.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  }

  function closeSalaryPopovers() {
    salaryMarketNoteEl?.querySelectorAll("[data-salary-popover]").forEach((node) => {
      node.classList.remove("is-open");
    });
    salaryMarketNoteEl?.querySelectorAll("[data-salary-popover-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function renderSkills(options = {}) {
    selectedSkillsCountEl.textContent = String(state.skills.length);
    const isMobileRows = window.matchMedia("(max-width: 760px)").matches;
    const iconsMode = shouldShowSkillIcons() ? "icons" : "no-icons";
    const mode = `${isMobileRows ? "mobile-rows" : "desktop-groups"}-${iconsMode}`;
    document.body.classList.toggle("skill-icons-hidden", !shouldShowSkillIcons());
    if (options.forceStructure || skillsLibraryEl.dataset.renderMode !== mode) {
      skillsLibraryEl.dataset.renderMode = mode;
      renderSkillLibraryStructure(isMobileRows);
    }
    skillsLibraryEl.querySelectorAll("[data-skill-chip]").forEach((button) => {
      updateSkillChip(button, state.skills.includes(button.dataset.skillChip));
    });
  }

  function renderSkillLibraryStructure(isMobileRows) {
    skillsLibraryEl.innerHTML = "";
    if (isMobileRows) {
      const rows = Array.from({ length: 10 }, (_, index) => {
        const row = document.createElement("div");
        row.className = "skills-mobile-row";
        row.dataset.skillRow = String(index + 1);
        skillsLibraryEl.append(row);
        return row;
      });
      SKILLS.forEach((skill, index) => {
        rows[index % rows.length].append(createSkillChip(skill));
      });
      return;
    }

      SKILL_GROUPS.forEach((group) => {
        const wrap = document.createElement("div");
        wrap.className = "skills-group";
        wrap.dataset.skillGroup = "true";
        group.forEach((skill) => wrap.append(createSkillChip(skill)));
        skillsLibraryEl.append(wrap);
      });
  }

  function createSkillChip(skill) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.skillChip = skill;
    button.className = "builder-chip";
    button.innerHTML = `${renderSkillIcon(skill)}${escapeHtml(skill)}`;
    button.addEventListener("click", () => {
      state.skills = state.skills.includes(skill)
        ? state.skills.filter((item) => item !== skill)
        : [...state.skills, skill];
      saveState();
      renderSkills();
      renderPreview();
    });
    return button;
  }

  function updateSkillChip(button, selected) {
    button.classList.toggle("is-selected", !!selected);
  }

  function shouldShowSkillIcons() {
    return normalizeBooleanValue(state.profile.showSkillIcons, false);
  }

  function renderExperiences() {
    experienceListEl.innerHTML = "";
    addExperienceBtn.hidden = false;
    addExperienceBtn.disabled = state.experiences.length >= MAX_EXPERIENCES;
    addExperienceBtn.setAttribute("aria-disabled", String(state.experiences.length >= MAX_EXPERIENCES));
    addExperienceBtn.title = state.experiences.length >= MAX_EXPERIENCES
      ? `Можно добавить максимум ${MAX_EXPERIENCES} блоков опыта`
      : "Добавить блок опыта";
    activeExperienceIndex = Math.max(0, Math.min(activeExperienceIndex, state.experiences.length - 1));
    ensureExperienceDatalists();

    state.experiences.forEach((experience, index) => {
      const blockColor = EXPERIENCE_BLOCK_COLORS[index] || "#475569";
      const card = document.createElement("section");
      card.className = `experience-card${index === activeExperienceIndex ? " is-active" : ""}`;
      card.style.setProperty("--block-color", blockColor);
      card.innerHTML = `
        <div class="experience-card__title">
          <div>
            <h3>Блок ${index + 1}</h3>
          </div>
          <div class="builder-topline__actions">
            <span class="experience-card__selection-chip experience-block-tab">
              <span>Для опыта выбрано</span>
              <span class="experience-card__selection-chip-count experience-block-tab__count">${experience.selectedSuggestionKeys.length}</span>
            </span>
          </div>
        </div>

        <div class="experience-card__body">
          <div class="experience-card__grid">
            <div class="builder-field">
              <span>Работодатель</span>
              ${buildExperienceChoice(index, "employer")}
            </div>
            <div class="builder-field">
              <span>Должность</span>
              ${buildExperienceChoice(index, "role")}
            </div>
          </div>

          <div class="experience-card__meta">
            <label class="builder-field">
              <span>Период</span>
              <div class="experience-period-grid">
                <div class="builder-field-control">
                  ${buildMonthYearSelect(index, "start")}
                </div>
                <div class="builder-field-control">
                  ${buildMonthYearSelect(index, "end", experience.endPresent)}
                </div>
              </div>
              <label class="experience-period-current">
                <input type="checkbox" data-exp-index="${index}" data-end-present="true" ${experience.endPresent ? "checked" : ""}>
                <span>По настоящее время</span>
              </label>
            </label>
          </div>
        </div>
        ${index > 0 ? `<div class="experience-card__footer"><button class="builder-button builder-button--ghost builder-button--small" type="button" data-remove-exp="${index}">Убрать</button></div>` : ""}
      `;
      experienceListEl.append(card);
    });

    renderSharedExperienceSuggestions();
    bindExperienceEvents();
  }

  function renderEducations() {
    if (!educationSectionEl || !educationListEl) return;

    const hasEducations = state.educations.length > 0;
    const shouldShowSection = state.educationSectionOpened || hasEducations;

    educationSectionEl.hidden = !shouldShowSection;
    educationListEl.innerHTML = "";

    if (addEducationBtn) {
      addEducationBtn.disabled = state.educations.length >= MAX_EDUCATIONS;
      addEducationBtn.setAttribute("aria-disabled", String(state.educations.length >= MAX_EDUCATIONS));
      addEducationBtn.title = state.educations.length >= MAX_EDUCATIONS
        ? `Можно добавить максимум ${MAX_EDUCATIONS} блока образования`
        : "Добавить образование";
    }

    if (!hasEducations) return;

    state.educations.forEach((education, index) => {
      const card = document.createElement("section");
      card.className = "experience-card education-card";
      card.innerHTML = `
        <div class="experience-card__title">
          <div>
            <h3>Образование ${index + 1}</h3>
          </div>
        </div>

        <div class="experience-card__body">
          <div class="experience-card__grid">
            <div class="builder-field">
              <span>Учебное заведение</span>
              ${buildEducationChoice(index, "institution")}
            </div>
            <div class="builder-field">
              <span>Специальность</span>
              ${buildEducationChoice(index, "specialty")}
            </div>
          </div>

          <div class="experience-card__meta">
            <label class="builder-field">
              <span>Период обучения</span>
              <div class="experience-period-grid">
                <div class="builder-field-control">
                  ${buildEducationMonthYearSelect(index, "start")}
                </div>
                <div class="builder-field-control">
                  ${buildEducationMonthYearSelect(index, "end", education.endPresent)}
                </div>
              </div>
              <label class="experience-period-current">
                <input type="checkbox" data-edu-index="${index}" data-edu-end-present="true" ${education.endPresent ? "checked" : ""}>
                <span>Учусь сейчас</span>
              </label>
            </label>
          </div>
        </div>
        <div class="experience-card__footer"><button class="builder-button builder-button--ghost builder-button--small" type="button" data-remove-edu="${index}">Убрать</button></div>
      `;
      educationListEl.append(card);
    });

    bindEducationEvents();
  }

  function renderInlineAtsHints() {
    if (atsInlineSkillsEl) {
      const keywords = ATS_KEYWORD_GROUPS
        .flatMap((group) => group.keywords)
        .filter((item, index, list) => list.indexOf(item) === index)
        .slice(0, 12);
      atsInlineSkillsEl.innerHTML = keywords.map((keyword) => `
        <span class="builder-chip ats-chip" aria-hidden="true">${escapeHtml(keyword)}</span>
      `).join("");
    }

    if (atsInlineExperienceEl) {
      atsInlineExperienceEl.innerHTML = ATS_RULES.map((rule) => `
        <li>${escapeHtml(rule)}</li>
      `).join("");
    }

    if (atsInlineSuggestionsEl) {
      atsInlineSuggestionsEl.innerHTML = ATS_EXAMPLE_BULLETS.map((bullet) => `
        <li>${escapeHtml(applyGenderToText(bullet))}</li>
      `).join("");
    }
  }

  function toggleHelpPopover(key) {
    const target = document.querySelector(`[data-help-popover="${key}"]`);
    const button = document.querySelector(`[data-help-toggle="${key}"]`);
    if (!target || !button) return;
    const isOpen = target.classList.contains("is-open");
    closeHelpPopovers();
    if (!isOpen) {
      target.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  }

  function closeHelpPopovers() {
    document.querySelectorAll("[data-help-popover]").forEach((node) => {
      node.classList.remove("is-open");
    });
    document.querySelectorAll("[data-help-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function toggleExperienceTotalPopover() {
    if (!experienceTotalInfoBtn || !experienceTotalPopoverEl || experienceTotalInfoBtn.hidden) return;
    const isOpen = experienceTotalPopoverEl.classList.contains("is-open");
    closeExperienceTotalPopover();
    if (!isOpen) {
      experienceTotalPopoverEl.hidden = false;
      experienceTotalPopoverEl.classList.add("is-open");
      experienceTotalInfoBtn.setAttribute("aria-expanded", "true");
    }
  }

  function closeExperienceTotalPopover() {
    if (!experienceTotalPopoverEl || !experienceTotalInfoBtn) return;
    experienceTotalPopoverEl.classList.remove("is-open");
    experienceTotalPopoverEl.hidden = true;
    experienceTotalInfoBtn.setAttribute("aria-expanded", "false");
  }

  function setNavBadge(section, visible) {
    const badge = document.querySelector(`[data-nav-badge="${section}"]`);
    if (!badge) return;
    badge.hidden = !visible;
  }

  function ensureExperienceDatalists() {
    if (!document.getElementById("resume-employer-options")) {
      const employers = document.createElement("datalist");
      employers.id = "resume-employer-options";
      EMPLOYERS.forEach((item) => {
        const option = document.createElement("option");
        option.value = item;
        employers.append(option);
      });
      document.body.append(employers);
    }
    if (!document.getElementById("resume-role-options")) {
      const roles = document.createElement("datalist");
      roles.id = "resume-role-options";
      ROLES.forEach((item) => {
        const option = document.createElement("option");
        option.value = item;
        roles.append(option);
      });
      document.body.append(roles);
    }
  }

  function renderSharedExperienceSuggestions() {
    if (!experienceBlockTabsEl || !experienceSuggestionSliderEl || !state.experiences.length) return;
    const activeExperience = state.experiences[activeExperienceIndex] || state.experiences[0];

    experienceBlockTabsEl.innerHTML = "";
    state.experiences.forEach((experience, index) => {
      const color = EXPERIENCE_BLOCK_COLORS[index] || "#475569";
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `experience-block-tab${index === activeExperienceIndex ? " is-active" : ""}`;
      tab.style.setProperty("--block-color", color);
      tab.innerHTML = `Блок ${index + 1}<span class="experience-block-tab__count">${experience.selectedSuggestionKeys.length}</span>`;
      tab.addEventListener("click", () => {
        activeExperienceIndex = index;
        withPreservedSuggestionScroll(() => renderExperiences());
      });
      experienceBlockTabsEl.append(tab);
    });
    if (addExperienceBtn) {
      addExperienceBtn.classList.add("experience-block-add");
      addExperienceBtn.disabled = state.experiences.length >= MAX_EXPERIENCES;
      addExperienceBtn.setAttribute("aria-disabled", String(state.experiences.length >= MAX_EXPERIENCES));
      addExperienceBtn.title = state.experiences.length >= MAX_EXPERIENCES
        ? `Можно добавить максимум ${MAX_EXPERIENCES} блоков опыта`
        : "Добавить блок опыта";
      experienceBlockTabsEl.append(addExperienceBtn);
    }

    if (experienceActiveLibraryMetaEl) {
      experienceActiveLibraryMetaEl.textContent = `Активный блок: Блок ${activeExperienceIndex + 1}`;
    }

    experienceSuggestionSliderEl.innerHTML = "";
    EXPERIENCE_LIBRARY.forEach((libraryItem, libraryIndex) => {
      const group = document.createElement("section");
      group.className = "experience-suggestion-group";
      group.innerHTML = `
        <div class="experience-suggestion-group__meta">${escapeHtml(libraryItem.title)} · ${escapeHtml(libraryItem.source)}</div>
        <div class="experience-suggestion-slider" data-suggestion-library="${libraryIndex}"></div>
      `;
      const slider = group.querySelector(`[data-suggestion-library="${libraryIndex}"]`);
      libraryItem.suggestions.forEach((text, id) => {
        const key = `${libraryIndex}:${id}`;
        const selectedInCurrent = activeExperience.selectedSuggestionKeys.includes(key);
        const chip = createSuggestionChip(activeExperienceIndex, key, applyGenderToText(text), selectedInCurrent);
        slider.append(chip);
      });
      experienceSuggestionSliderEl.append(group);
    });

    const customGroup = document.createElement("section");
    customGroup.className = "experience-suggestion-group";
    customGroup.innerHTML = `
      <div class="experience-suggestion-group__meta">Добавить свою формулировку</div>
      <div class="experience-suggestion-slider" data-suggestion-library="custom"></div>
    `;
    const customSlider = customGroup.querySelector('[data-suggestion-library="custom"]');
    customSlider.append(createAddSuggestionChip());
    state.customSuggestions.forEach((item) => {
      const key = `custom:${item.id}`;
      const selectedInCurrent = activeExperience.selectedSuggestionKeys.includes(key);
      const chip = createSuggestionChip(activeExperienceIndex, key, getSuggestionTextForExperience(activeExperience, key), selectedInCurrent);
      customSlider.append(chip);
    });
    experienceSuggestionSliderEl.append(customGroup);
  }

  function createAddSuggestionChip() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "builder-chip suggestion-chip--adder";
    button.innerHTML = `<span class="suggestion-chip__adder-plus">+</span>`;
    button.addEventListener("click", () => {
      const id = String(state.nextCustomSuggestionId || 1);
      state.nextCustomSuggestionId = Number(id) + 1;
      state.customSuggestions.push({ id, text: "Новая формулировка" });
      const key = `custom:${id}`;
      const exp = state.experiences[activeExperienceIndex];
      if (exp && !exp.selectedSuggestionKeys.includes(key)) {
        exp.selectedSuggestionKeys = [...exp.selectedSuggestionKeys, key];
      }
      activeSuggestionEditKey = key;
      persist("", { preserveSuggestionScroll: true });
    });
    return button;
  }

  function createSuggestionChip(expIndex, suggestionKey, text, selected) {
    const activeExperience = state.experiences[expIndex];
    const blockColor = EXPERIENCE_BLOCK_COLORS[expIndex] || "#475569";
    const isEditing = activeSuggestionEditKey === suggestionKey && selected;
    const button = document.createElement(isEditing ? "div" : "button");
    if (!isEditing) button.type = "button";
    button.className = `builder-chip${selected ? " is-selected" : ""}${isEditing ? " is-editing" : ""}`;
    button.style.setProperty("--active-block-color", blockColor);
    const badges = getSuggestionUsageBadges(suggestionKey);
    if (isEditing) {
      const currentText = getSuggestionTextForExperience(activeExperience, suggestionKey);
      const isAiPromptOpen = activeSuggestionAiPromptKey === suggestionKey;
      const isAiGenerating = isSuggestionAiGeneratingKey === suggestionKey;
      const aiVariants = getSuggestionAiVariants(activeExperience, suggestionKey);
      button.innerHTML = `
        <textarea class="suggestion-chip__editor" rows="3" data-inline-suggestion-editor="${escapeHtml(suggestionKey)}">${escapeHtml(currentText)}</textarea>
        <span class="suggestion-chip__badges">${badges.map((badge) => `
          <span class="suggestion-chip__badge" style="background:${escapeHtml(badge.color)}" title="Выбрано в блоке ${badge.block}">
            ${badge.block}
          </span>
        `).join("")}</span>
        <span class="suggestion-chip__actions">
          <button class="builder-button builder-button--ghost builder-button--small" type="button" data-inline-suggestion-save="${escapeHtml(suggestionKey)}">OK</button>
          <button class="builder-button builder-button--ghost builder-button--small" type="button" data-inline-suggestion-cancel="${escapeHtml(suggestionKey)}">Отмена</button>
          <button class="builder-button builder-button--ghost builder-button--small suggestion-chip__ai-button" type="button" data-inline-suggestion-ai="${escapeHtml(suggestionKey)}" ${isAiGenerating ? "disabled" : ""}>
            ${isAiGenerating ? `
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--full">Корректирую...</span>
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--medium">Корректирую...</span>
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--short">ИИ думает</span>
            ` : `
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--full">Скорректировать под меня</span>
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--medium">Скорректировать</span>
              <span class="suggestion-chip__ai-label suggestion-chip__ai-label--short">Изменить с ИИ</span>
            `}
          </button>
        </span>
        ${isAiPromptOpen ? `
          <span class="suggestion-chip__ai-panel is-open">
            <textarea class="suggestion-chip__ai-prompt" rows="2" data-inline-suggestion-ai-prompt="${escapeHtml(suggestionKey)}" placeholder="Пожелание к правке: усилить результат, добавить конкретику, сделать короче..."></textarea>
          </span>
        ` : ""}
        ${aiVariants.length ? `
          <span class="suggestion-chip__ai-variants">
            ${aiVariants.map((variant, variantIndex) => `
              <span class="suggestion-chip__ai-variant">
                <span>${escapeHtml(variant.text)}</span>
                <span class="suggestion-chip__ai-variant-meta">${escapeHtml(getModelDisplayLabel(variant.model) || "AI")}</span>
                <button class="builder-button builder-button--ghost builder-button--small" type="button" data-inline-suggestion-use-ai="${escapeHtml(suggestionKey)}" data-ai-variant-index="${variantIndex}">Использовать</button>
              </span>
            `).join("")}
          </span>
        ` : ""}
      `;
    } else {
      button.innerHTML = `
        <span class="suggestion-chip__text">${escapeHtml(text)}</span>
        <span class="suggestion-chip__badges">${badges.map((badge) => `
          <span class="suggestion-chip__badge" style="background:${escapeHtml(badge.color)}" title="Выбрано в блоке ${badge.block}">
            ${badge.block}
          </span>
        `).join("")}</span>
        ${selected ? `<button class="suggestion-chip__edit" type="button" data-inline-suggestion-edit="${escapeHtml(suggestionKey)}" aria-label="Редактировать формулировку" title="Редактировать формулировку">✎</button>` : ""}
      `;
      button.addEventListener("click", (event) => {
        if (event.target.closest("[data-inline-suggestion-edit]")) return;
        const exp = state.experiences[expIndex];
        const willSelect = !exp.selectedSuggestionKeys.includes(suggestionKey);
        exp.selectedSuggestionKeys = willSelect
          ? [...exp.selectedSuggestionKeys, suggestionKey]
          : exp.selectedSuggestionKeys.filter((item) => item !== suggestionKey);
        if (!willSelect) {
          delete exp.suggestionOverrides[suggestionKey];
          if (activeSuggestionEditKey === suggestionKey) activeSuggestionEditKey = "";
        }
        persist("", { preserveSuggestionScroll: true });
      });
    }
    return button;
  }

  function getSuggestionUsageBadges(suggestionKey) {
    return state.experiences.flatMap((experience, index) => (
      experience.selectedSuggestionKeys.includes(suggestionKey)
        ? [{ block: index + 1, color: EXPERIENCE_BLOCK_COLORS[index] || "#475569" }]
        : []
    ));
  }

  function getSuggestionAiVariants(experience, suggestionKey) {
    const list = experience?.suggestionAiVariants?.[suggestionKey];
    return Array.isArray(list) ? list.filter((item) => item?.text).slice(-4) : [];
  }

  function bindExperienceEvents() {
    experienceSuggestionSliderEl?.querySelectorAll("[data-inline-suggestion-edit]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        activeSuggestionEditKey = button.dataset.inlineSuggestionEdit || "";
        withPreservedSuggestionScroll(() => renderExperiences());
      });
    });

    experienceSuggestionSliderEl?.querySelectorAll("[data-inline-suggestion-cancel]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        activeSuggestionEditKey = "";
        activeSuggestionAiPromptKey = "";
        withPreservedSuggestionScroll(() => renderExperiences());
      });
    });

    experienceSuggestionSliderEl?.querySelectorAll("[data-inline-suggestion-save]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const key = button.dataset.inlineSuggestionSave;
        const exp = state.experiences[activeExperienceIndex];
        const textarea = experienceSuggestionSliderEl.querySelector(`[data-inline-suggestion-editor="${key}"]`);
        if (!exp || !key || !textarea) return;
        saveSuggestionEdit(exp, key, textarea.value);
        activeSuggestionEditKey = "";
        activeSuggestionAiPromptKey = "";
        persist("", { preserveSuggestionScroll: true });
      });
    });

    experienceSuggestionSliderEl?.querySelectorAll("[data-inline-suggestion-ai]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const key = button.dataset.inlineSuggestionAi;
        if (!key || isSuggestionAiGeneratingKey) return;
        if (!isDesktopSuggestionAiEnabled()) {
          activeSuggestionAiPromptKey = "";
          return;
        }
        if (activeSuggestionAiPromptKey !== key) {
          activeSuggestionAiPromptKey = key;
          withPreservedSuggestionScroll(() => renderExperiences());
          return;
        }
        const promptNode = experienceSuggestionSliderEl.querySelector(`[data-inline-suggestion-ai-prompt="${key}"]`);
        await generateSuggestionCorrection(key, promptNode?.value || "");
      });
    });

    experienceSuggestionSliderEl?.querySelectorAll("[data-inline-suggestion-use-ai]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const key = button.dataset.inlineSuggestionUseAi;
        const variantIndex = Number(button.dataset.aiVariantIndex);
        const exp = state.experiences[activeExperienceIndex];
        const variant = getSuggestionAiVariants(exp, key)[variantIndex];
        const textarea = experienceSuggestionSliderEl.querySelector(`[data-inline-suggestion-editor="${key}"]`);
        if (!exp || !key || !variant?.text) return;
        if (textarea) textarea.value = variant.text;
        saveSuggestionEdit(exp, key, variant.text);
        activeSuggestionAiPromptKey = "";
        persist("", { preserveSuggestionScroll: true });
      });
    });

    experienceListEl.querySelectorAll("[data-remove-exp]").forEach((button) => {
      button.addEventListener("click", () => {
        state.experiences.splice(Number(button.dataset.removeExp), 1);
        activeExperienceIndex = Math.max(0, Math.min(activeExperienceIndex, state.experiences.length - 1));
        persist();
      });
    });

    experienceListEl.querySelectorAll("input[data-exp-index], textarea[data-exp-index]").forEach((node) => {
      node.addEventListener("input", () => {
        if (node.dataset.endPresent) return;

        const exp = state.experiences[Number(node.dataset.expIndex)];
        if (!exp) return;

        if (node.dataset.expMeta === "employer") {
          exp.customEmployer = node.value;
          exp.useCustomEmployer = true;
        } else if (node.dataset.expMeta === "role") {
          exp.customRole = node.value;
          exp.useCustomRole = true;
        } else {
          exp[node.dataset.field] = node.value;
        }

        activeExperienceIndex = Number(node.dataset.expIndex);
        persistTypingChange();
      });
    });

    experienceListEl.querySelectorAll("select[data-exp-index]:not([data-exp-choice])").forEach((node) => {
      node.addEventListener("change", () => {
        const exp = state.experiences[Number(node.dataset.expIndex)];
        if (!exp) return;
        exp[node.dataset.field] = Number(node.value);
        clampExperienceDates(exp);
        activeExperienceIndex = Number(node.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("select[data-exp-choice]").forEach((node) => {
      node.addEventListener("change", () => {
        const exp = state.experiences[Number(node.dataset.expIndex)];
        const type = node.dataset.expChoice;
        if (!exp) return;
        const indexField = type === "employer" ? "employerIndex" : "roleIndex";
        const toggleField = type === "employer" ? "useCustomEmployer" : "useCustomRole";
        const valueField = type === "employer" ? "customEmployer" : "customRole";
        exp[indexField] = Number(node.value);
        exp[toggleField] = false;
        exp[valueField] = "";
        activeExperienceIndex = Number(node.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("[data-exp-edit-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const exp = state.experiences[Number(button.dataset.expIndex)];
        const type = button.dataset.expEditChoice;
        if (!exp) return;
        const toggleField = type === "employer" ? "useCustomEmployer" : "useCustomRole";
        const valueField = type === "employer" ? "customEmployer" : "customRole";
        exp[toggleField] = true;
        exp[valueField] = getCurrentPickerLabel(exp, type);
        activeExperienceIndex = Number(button.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("[data-exp-choice-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        const exp = state.experiences[Number(button.dataset.expIndex)];
        const type = button.dataset.expChoiceReset;
        if (!exp) return;
        const toggleField = type === "employer" ? "useCustomEmployer" : "useCustomRole";
        const valueField = type === "employer" ? "customEmployer" : "customRole";
        exp[toggleField] = false;
        exp[valueField] = "";
        activeExperienceIndex = Number(button.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("input[data-end-present]").forEach((node) => {
      node.addEventListener("change", () => {
        const exp = state.experiences[Number(node.dataset.expIndex)];
        if (!exp) return;
        exp.endPresent = !!node.checked;
        if (exp.endPresent) {
          exp.endMonth = CURRENT_MONTH;
          exp.endYear = CURRENT_YEAR;
        }
        clampExperienceDates(exp);
        activeExperienceIndex = Number(node.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("[data-picker-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const exp = state.experiences[Number(button.dataset.expIndex)];
        const type = button.dataset.type;
        const list = type === "employer" ? EMPLOYERS : ROLES;
        const indexField = type === "employer" ? "employerIndex" : "roleIndex";
        const toggleField = type === "employer" ? "useCustomEmployer" : "useCustomRole";
        const valueField = type === "employer" ? "customEmployer" : "customRole";

        if (button.dataset.pickerAction === "prev") {
          exp[indexField] = (exp[indexField] - 1 + list.length) % list.length;
          exp[toggleField] = false;
          exp[valueField] = "";
        }
        if (button.dataset.pickerAction === "next") {
          exp[indexField] = (exp[indexField] + 1) % list.length;
          exp[toggleField] = false;
          exp[valueField] = "";
        }
        if (button.dataset.pickerAction === "custom") {
          exp[toggleField] = true;
          exp[valueField] = getCurrentPickerLabel(exp, type);
        }
        activeExperienceIndex = Number(button.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("[data-exp-clear]").forEach((button) => {
      button.addEventListener("click", () => {
        const exp = state.experiences[Number(button.dataset.expClear)];
        const field = button.dataset.expField;
        if (!exp || !field) return;
        if (exp[field]) {
          exp[field] = "";
          persist();
        } else {
          const target = experienceListEl.querySelector(`[data-exp-index="${button.dataset.expClear}"][data-field="${field}"]`);
          target?.focus();
        }
      });
    });

    experienceListEl.querySelectorAll("[data-picker-inline]").forEach((node) => {
      node.addEventListener("input", () => {
        const exp = state.experiences[Number(node.dataset.expIndex)];
        if (!exp) return;

        exp[node.dataset.field] = node.value;
        exp[node.dataset.toggleField] = true;
        activeExperienceIndex = Number(node.dataset.expIndex);

        persistTypingChange();
      });

      node.addEventListener("focus", () => {
        if (!node.readOnly) {
          const length = node.value.length;
          node.setSelectionRange?.(length, length);
        }
      });

      node.addEventListener("blur", () => {
        const exp = state.experiences[Number(node.dataset.expIndex)];
        const type = node.dataset.type;
        const toggleField = node.dataset.toggleField;
        const valueField = node.dataset.field;
        const fallback = type === "employer"
          ? (EMPLOYERS[exp.employerIndex] || EMPLOYERS[0])
          : (ROLES[exp.roleIndex] || ROLES[0]);

        const trimmed = node.value.trim();
        if (!trimmed) {
          exp[toggleField] = false;
          exp[valueField] = "";
        } else if (trimmed === fallback) {
          exp[toggleField] = false;
          exp[valueField] = "";
        } else {
          exp[toggleField] = true;
          exp[valueField] = trimmed;
        }
        activeExperienceIndex = Number(node.dataset.expIndex);
        persist();
      });
    });

    experienceListEl.querySelectorAll("[data-picker-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const expIndex = button.dataset.expIndex;
        const type = button.dataset.type;
        const input = experienceListEl.querySelector(`[data-picker-inline="true"][data-exp-index="${expIndex}"][data-type="${type}"]`);
        if (!input) return;
        input.readOnly = false;
        input.focus();
      });
    });
  }

  function bindEducationEvents() {
    if (!educationListEl) return;

    educationListEl.querySelectorAll("[data-remove-edu]").forEach((button) => {
      button.addEventListener("click", () => {
        state.educations.splice(Number(button.dataset.removeEdu), 1);
        persist();
      });
    });

    educationListEl.querySelectorAll("input[data-edu-index]").forEach((node) => {
      node.addEventListener("input", () => {
        const education = state.educations[Number(node.dataset.eduIndex)];
        if (!education) return;

        if (node.dataset.eduMeta === "institution") {
          education.customInstitution = node.value;
          education.useCustomInstitution = true;
        } else if (node.dataset.eduMeta === "specialty") {
          education.customSpecialty = node.value;
          education.useCustomSpecialty = true;
        } else if (node.dataset.eduField) {
          education[node.dataset.eduField] = node.value;
        }

        persistTypingChange();
      });
    });

    educationListEl.querySelectorAll("select[data-edu-index]:not([data-edu-choice])").forEach((node) => {
      node.addEventListener("change", () => {
        const education = state.educations[Number(node.dataset.eduIndex)];
        if (!education) return;
        education[node.dataset.eduField] = Number(node.value);
        clampEducationDates(education);
        persist();
      });
    });

    educationListEl.querySelectorAll("select[data-edu-choice]").forEach((node) => {
      node.addEventListener("change", () => {
        const education = state.educations[Number(node.dataset.eduIndex)];
        const type = node.dataset.eduChoice;
        if (!education) return;
        const indexField = type === "institution" ? "institutionIndex" : "specialtyIndex";
        const toggleField = type === "institution" ? "useCustomInstitution" : "useCustomSpecialty";
        const valueField = type === "institution" ? "customInstitution" : "customSpecialty";
        education[indexField] = Number(node.value);
        education[toggleField] = false;
        education[valueField] = "";
        persist();
      });
    });

    educationListEl.querySelectorAll("[data-edu-edit-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const education = state.educations[Number(button.dataset.eduIndex)];
        const type = button.dataset.eduEditChoice;
        if (!education) return;
        const toggleField = type === "institution" ? "useCustomInstitution" : "useCustomSpecialty";
        const valueField = type === "institution" ? "customInstitution" : "customSpecialty";
        education[toggleField] = true;
        education[valueField] = getCurrentEducationLabel(education, type);
        persist();
      });
    });

    educationListEl.querySelectorAll("[data-edu-choice-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        const education = state.educations[Number(button.dataset.eduIndex)];
        const type = button.dataset.eduChoiceReset;
        if (!education) return;
        const toggleField = type === "institution" ? "useCustomInstitution" : "useCustomSpecialty";
        const valueField = type === "institution" ? "customInstitution" : "customSpecialty";
        education[toggleField] = false;
        education[valueField] = "";
        persist();
      });
    });

    educationListEl.querySelectorAll("input[data-edu-end-present]").forEach((node) => {
      node.addEventListener("change", () => {
        const education = state.educations[Number(node.dataset.eduIndex)];
        if (!education) return;
        education.endPresent = !!node.checked;
        if (education.endPresent) {
          education.endMonth = CURRENT_MONTH;
          education.endYear = CURRENT_YEAR;
        }
        clampEducationDates(education);
        persist();
      });
    });
  }

  function buildPicker(index, type, currentLabel) {
    const exp = state.experiences[index];
    const toggleField = type === "employer" ? "useCustomEmployer" : "useCustomRole";
    const valueField = type === "employer" ? "customEmployer" : "customRole";
    const currentValue = exp[toggleField] ? (exp[valueField] || currentLabel) : currentLabel;
    return `
      <div class="picker-strip">
        <button class="picker-button" type="button" data-picker-action="prev" data-exp-index="${index}" data-type="${type}">‹</button>
        <div class="picker-edit-wrap">
          <input
            class="picker-inline-input"
            type="text"
            readonly
            data-picker-inline="true"
            data-exp-index="${index}"
            data-type="${type}"
            data-field="${valueField}"
            data-toggle-field="${toggleField}"
            value="${escapeHtml(currentValue)}"
          >
          <button class="picker-edit-button" type="button" data-picker-edit="true" data-exp-index="${index}" data-type="${type}" aria-label="Редактировать поле">✎</button>
        </div>
        <button class="picker-button" type="button" data-picker-action="next" data-exp-index="${index}" data-type="${type}">›</button>
      </div>
    `;
  }

  function buildExperienceChoice(index, type) {
    const exp = state.experiences[index];
    const isEmployer = type === "employer";
    const list = isEmployer ? EMPLOYERS : ROLES;
    const indexField = isEmployer ? "employerIndex" : "roleIndex";
    const toggleField = isEmployer ? "useCustomEmployer" : "useCustomRole";
    const valueField = isEmployer ? "customEmployer" : "customRole";
    const placeholder = isEmployer ? "Например, Сбер" : "Например, QA Engineer";
    const label = isEmployer ? "работодателя" : "должность";
    const safeIndex = Math.max(0, Math.min(Number(exp[indexField]) || 0, list.length - 1));

    if (exp[toggleField]) {
      return `
        <div class="builder-field-control experience-choice">
          <input type="text" data-exp-index="${index}" data-field="${valueField}" data-exp-meta="${type}" value="${escapeHtml(exp[valueField] || getCurrentPickerLabel(exp, type))}" placeholder="${escapeHtml(placeholder)}">
          <button class="field-inline-action" type="button" data-exp-choice-reset="${type}" data-exp-index="${index}" aria-label="Вернуться к списку ${label}" title="Вернуться к списку">✕</button>
        </div>
      `;
    }

    return `
      <div class="builder-field-control builder-field-control--select experience-choice">
        <select data-exp-index="${index}" data-exp-choice="${type}" aria-label="Выбрать ${label}">
          ${list.map((item, optionIndex) => `<option value="${optionIndex}" ${optionIndex === safeIndex ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
        <button class="field-inline-action field-inline-action--choice-edit" type="button" data-exp-edit-choice="${type}" data-exp-index="${index}" aria-label="Редактировать ${label}" title="Редактировать">✎</button>
      </div>
    `;
  }

  function buildEducationChoice(index, type) {
    const education = state.educations[index];
    const isInstitution = type === "institution";
    const list = isInstitution ? EDUCATION_INSTITUTIONS : EDUCATION_SPECIALTIES;
    const indexField = isInstitution ? "institutionIndex" : "specialtyIndex";
    const toggleField = isInstitution ? "useCustomInstitution" : "useCustomSpecialty";
    const valueField = isInstitution ? "customInstitution" : "customSpecialty";
    const placeholder = isInstitution ? "Например, Политехнический колледж" : "Например, Тестирование ПО";
    const label = isInstitution ? "учебное заведение" : "специальность";
    const safeIndex = Math.max(0, Math.min(Number(education[indexField]) || 0, list.length - 1));

    if (education[toggleField]) {
      return `
        <div class="builder-field-control experience-choice">
          <input type="text" data-edu-index="${index}" data-edu-field="${valueField}" data-edu-meta="${type}" value="${escapeHtml(education[valueField] || getCurrentEducationLabel(education, type))}" placeholder="${escapeHtml(placeholder)}">
          <button class="field-inline-action" type="button" data-edu-choice-reset="${type}" data-edu-index="${index}" aria-label="Вернуться к списку ${label}" title="Вернуться к списку">✕</button>
        </div>
      `;
    }

    return `
      <div class="builder-field-control builder-field-control--select experience-choice">
        <select data-edu-index="${index}" data-edu-choice="${type}" aria-label="Выбрать ${label}">
          ${list.map((item, optionIndex) => `<option value="${optionIndex}" ${optionIndex === safeIndex ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
        <button class="field-inline-action field-inline-action--choice-edit" type="button" data-edu-edit-choice="${type}" data-edu-index="${index}" aria-label="Редактировать ${label}" title="Редактировать">✎</button>
      </div>
    `;
  }

  function buildEducationMonthYearSelect(index, side, disabled = false) {
    const education = state.educations[index];
    const monthField = side === "start" ? "startMonth" : "endMonth";
    const yearField = side === "start" ? "startYear" : "endYear";
    const monthValue = Number(education[monthField]);
    const yearValue = Number(education[yearField]);
    return `
      <div class="experience-period-grid">
        <select data-edu-index="${index}" data-edu-field="${monthField}" ${disabled ? "disabled" : ""}>
          ${MONTH_NAMES.map((month, monthIndex) => `
            <option value="${monthIndex}" ${monthIndex === monthValue ? "selected" : ""}>${escapeHtml(month)}</option>
          `).join("")}
        </select>
        <select data-edu-index="${index}" data-edu-field="${yearField}" ${disabled ? "disabled" : ""}>
          ${YEAR_OPTIONS.map((year) => `
            <option value="${year}" ${year === yearValue ? "selected" : ""}>${year}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function renderPreview() {
    const isSalaryVisible = normalizeBooleanValue(state.profile.showSalary, true);
    const hasPhoto = Boolean(state.profile.photoDataUrl);
    preview.name.textContent = state.profile.fullName || "Имя Фамилия";
    preview.headline.textContent = state.profile.headline || "QA Engineer";
    preview.experience.textContent = state.profile.experienceTotal || "Опыт";
    preview.city.textContent = state.profile.city || "Город";
    preview.salary.textContent = state.profile.salary || "Зарплата";
    preview.salary.hidden = !isSalaryVisible;
    preview.salary.style.display = isSalaryVisible ? "" : "none";
    preview.salary.setAttribute("aria-hidden", String(!isSalaryVisible));
    preview.targetHeadline.textContent = state.profile.headline || "QA Engineer";
    preview.targetSalary.textContent = state.profile.salary || "Зарплата";
    preview.targetSalary.hidden = !isSalaryVisible;
    preview.targetSalary.style.display = isSalaryVisible ? "" : "none";
    preview.targetSalary.setAttribute("aria-hidden", String(!isSalaryVisible));
    preview.targetSpecialization.textContent = `— ${state.profile.specialization || "Тестировщик"}`;
    preview.targetEmployment.textContent = `Тип занятости: ${state.profile.employmentType || "полная занятость"}`;
    preview.targetWorkFormat.textContent = `Формат работы: ${state.profile.workFormat || "удалённо"}`;
    preview.targetCommute.textContent = `Желательное время в пути до работы: ${state.profile.commuteTime || "не имеет значения"}`;
    preview.summary.textContent = state.profile.summary || "Короткое описание профиля.";
    preview.photo.hidden = !hasPhoto;
    preview.photo.closest(".resume-preview-header")?.classList.toggle("resume-preview-header--no-photo", !hasPhoto);
    if (hasPhoto) fillAvatar(preview.photo, state.profile.photoDataUrl, state.profile.fullName);
    else preview.photo.innerHTML = "";

    preview.contacts.innerHTML = "";
    [state.profile.phone, state.profile.email, state.profile.telegram].filter(Boolean).forEach((item) => {
      const span = document.createElement("span");
      span.textContent = item;
      preview.contacts.append(span);
    });

    preview.skills.innerHTML = "";
    state.skills.forEach((skill) => {
      const button = document.createElement("button");
      button.type = "button";
      // Exactly the same chip as in the skill constructor list.
      // In preview it is non-interactive; we soften only the colors via CSS.
      button.className = "builder-chip is-selected";
      button.disabled = true;
      button.tabIndex = -1;
      button.innerHTML = `${renderSkillIcon(skill, "builder-chip__icon")}${escapeHtml(skill)}`;
      preview.skills.append(button);
    });

    preview.experienceList.innerHTML = "";
    state.experiences.forEach((experience) => {
      const block = document.createElement("div");
      block.className = "resume-preview-job";
      block.innerHTML = `
        <div class="resume-preview-job__dates">
          ${escapeHtml(formatExperiencePeriod(experience))}
        </div>
        <div class="resume-preview-job__content">
          <div class="resume-preview-job__head">
            <strong>${escapeHtml(getEmployerName(experience))} - ${escapeHtml(getRoleName(experience))}</strong>
          </div>
          <p class="resume-preview-job__meta">${escapeHtml(formatExperiencePeriod(experience))}</p>
        </div>
      `;
      const content = block.querySelector(".resume-preview-job__content");

      const bullets = getSelectedBullets(experience);
      if (bullets.length) {
        const list = document.createElement("div");
        list.className = "resume-preview-bullets";
        bullets.forEach((text) => {
          const item = document.createElement("p");
          item.className = "resume-preview-bullet";
          item.textContent = text;
          list.append(item);
        });
        content.append(list);
      }
      preview.experienceList.append(block);
    });

    if (preview.educationSection && preview.educationList) {
      const hasEducations = state.educations.length > 0;
      preview.educationSection.hidden = !hasEducations;
      preview.educationSection.style.display = hasEducations ? "" : "none";
      preview.educationList.innerHTML = "";
      state.educations.forEach((education) => {
        const block = document.createElement("div");
        block.className = "resume-preview-job resume-preview-education";
        block.innerHTML = `
          <div class="resume-preview-job__dates">
            ${escapeHtml(formatEducationPeriod(education))}
          </div>
          <div class="resume-preview-job__content">
            <div class="resume-preview-job__head">
              <strong>${escapeHtml(getEducationInstitutionName(education))} - ${escapeHtml(getEducationSpecialtyName(education))}</strong>
            </div>
            <p class="resume-preview-job__meta">${escapeHtml(formatEducationPeriod(education))}</p>
          </div>
        `;
        preview.educationList.append(block);
      });
    }
  }

  function getEmployerName(experience) {
    const fallback = EMPLOYERS[experience.employerIndex] || EMPLOYERS[0];
    return experience.useCustomEmployer ? experience.customEmployer.trim() || fallback : fallback;
  }

  function getRoleName(experience) {
    const fallback = ROLES[experience.roleIndex] || ROLES[0];
    return experience.useCustomRole ? experience.customRole.trim() || fallback : fallback;
  }

  function getEducationInstitutionName(education) {
    const fallback = EDUCATION_INSTITUTIONS[education.institutionIndex] || EDUCATION_INSTITUTIONS[0];
    return education.useCustomInstitution ? education.customInstitution.trim() || fallback : fallback;
  }

  function getEducationSpecialtyName(education) {
    const fallback = EDUCATION_SPECIALTIES[education.specialtyIndex] || EDUCATION_SPECIALTIES[0];
    return education.useCustomSpecialty ? education.customSpecialty.trim() || fallback : fallback;
  }

  function getCurrentEducationLabel(education, type) {
    return type === "institution"
      ? getEducationInstitutionName(education)
      : getEducationSpecialtyName(education);
  }

  function getCurrentPickerLabel(experience, type) {
    return type === "employer"
      ? getEmployerName(experience)
      : getRoleName(experience);
  }

  function getSelectedBullets(experience) {
    return experience.selectedSuggestionKeys
      .map((key) => getSuggestionTextForExperience(experience, key))
      .filter(Boolean);
  }

  function getSuggestionTextForExperience(experience, key) {
    const suggestion = findSuggestionByKey(key);
    if (!suggestion) return "";
    const override = experience?.suggestionOverrides?.[key];
    if (typeof override === "string" && override.trim()) return override.trim();
    return applyGenderToText(suggestion.text);
  }

  function findSuggestionByKey(key) {
    if (String(key).startsWith("custom:")) {
      const id = String(key).slice("custom:".length);
      const item = state.customSuggestions.find((entry) => entry.id === id);
      return item ? { key, text: item.text, title: "Пользовательская", source: "Добавлено вручную" } : null;
    }
    return ALL_EXPERIENCE_SUGGESTIONS.find((item) => item.key === key) || null;
  }

  function isValidSuggestionKey(key) {
    const value = String(key || "");
    if (value.startsWith("custom:")) return value.length > "custom:".length;
    return ALL_EXPERIENCE_SUGGESTIONS.some((item) => item.key === value);
  }

  function saveSuggestionEdit(experience, key, value) {
    const nextText = String(value || "").trim() || "Новая формулировка";
    if (String(key).startsWith("custom:")) {
      const id = String(key).slice("custom:".length);
      const target = state.customSuggestions.find((item) => item.id === id);
      if (target) {
        const usageCount = state.experiences.filter((item) => item.selectedSuggestionKeys.includes(key)).length;
        if (usageCount <= 1) {
          target.text = nextText;
          delete experience.suggestionOverrides[key];
        } else if (nextText === target.text) {
          delete experience.suggestionOverrides[key];
        } else {
          experience.suggestionOverrides[key] = nextText;
        }
      }
    } else {
      experience.suggestionOverrides[key] = nextText;
    }
  }

  function buildMonthYearSelect(index, side, disabled = false) {
    const exp = state.experiences[index];
    const monthField = side === "start" ? "startMonth" : "endMonth";
    const yearField = side === "start" ? "startYear" : "endYear";
    const monthValue = Number(exp[monthField]);
    const yearValue = Number(exp[yearField]);
    return `
      <div class="experience-period-grid">
        <select data-exp-index="${index}" data-field="${monthField}" ${disabled ? "disabled" : ""}>
          ${MONTH_NAMES.map((month, monthIndex) => `
            <option value="${monthIndex}" ${monthIndex === monthValue ? "selected" : ""}>${escapeHtml(month)}</option>
          `).join("")}
        </select>
        <select data-exp-index="${index}" data-field="${yearField}" ${disabled ? "disabled" : ""}>
          ${YEAR_OPTIONS.map((year) => `
            <option value="${year}" ${year === yearValue ? "selected" : ""}>${year}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function clampExperienceDates(experience) {
    if (!experience) return;
    if (experience.endPresent) {
      experience.endMonth = CURRENT_MONTH;
      experience.endYear = CURRENT_YEAR;
      return;
    }
    const startIndex = experience.startYear * 12 + experience.startMonth;
    const endIndex = experience.endYear * 12 + experience.endMonth;
    if (endIndex < startIndex) {
      experience.endYear = experience.startYear;
      experience.endMonth = experience.startMonth;
    }
  }

  function clampEducationDates(education) {
    if (!education) return;
    if (education.endPresent) {
      education.endMonth = CURRENT_MONTH;
      education.endYear = CURRENT_YEAR;
      return;
    }
    const startIndex = education.startYear * 12 + education.startMonth;
    const endIndex = education.endYear * 12 + education.endMonth;
    if (endIndex < startIndex) {
      education.endYear = education.startYear;
      education.endMonth = education.startMonth;
    }
  }

  function formatExperiencePeriod(experience) {
    if (!experience) return "";

    const startMonth = String(MONTH_NAMES[experience.startMonth] || "").toLowerCase();
    const endMonth = String(MONTH_NAMES[experience.endMonth] || "").toLowerCase();

    const start = `${startMonth} ${experience.startYear}`;
    const end = experience.endPresent
      ? "настоящее время"
      : `${endMonth} ${experience.endYear}`;

    return `${capitalize(start)} — ${end}`;
  }

  function formatEducationPeriod(education) {
    return formatExperiencePeriod(education);
  }

  function capitalize(value) {
    const text = String(value || "");
    return text ? text[0].toUpperCase() + text.slice(1) : "";
  }

  function calculateExperienceMonths(experience) {
    if (!experience) return 0;
    const startIndex = Number(experience.startYear) * 12 + Number(experience.startMonth);
    const endYear = experience.endPresent ? CURRENT_YEAR : Number(experience.endYear);
    const endMonth = experience.endPresent ? CURRENT_MONTH : Number(experience.endMonth);
    const endIndex = endYear * 12 + endMonth;
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || endIndex < startIndex) return 0;
    return endIndex - startIndex + 1;
  }

  function parseClaimedExperienceMonths(raw) {
    const text = String(raw || "").trim().toLowerCase();
    if (!text) return 0;
    let months = 0;
    const yearsMatch = text.match(/(\d+)\s*(год|года|лет)/);
    const monthsMatch = text.match(/(\d+)\s*(месяц|месяца|месяцев)/);
    if (yearsMatch) months += Number(yearsMatch[1]) * 12;
    if (monthsMatch) months += Number(monthsMatch[1]);
    if (!months) {
      const onlyNumber = text.match(/^\d+$/);
      if (onlyNumber) months = Number(onlyNumber[0]) * 12;
    }
    return months;
  }

  function formatMonthsHuman(months) {
    const total = Math.max(0, Number(months) || 0);
    const years = Math.floor(total / 12);
    const restMonths = total % 12;
    const parts = [];
    if (years) parts.push(`${years} ${pluralizeYears(years)}`);
    if (restMonths) parts.push(`${restMonths} ${pluralizeMonths(restMonths)}`);
    return parts.join(" ") || `0 ${pluralizeMonths(0)}`;
  }

  function pluralizeYears(value) {
    const n = Math.abs(Number(value)) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return "лет";
    if (n1 > 1 && n1 < 5) return "года";
    if (n1 === 1) return "год";
    return "лет";
  }

  function pluralizeMonths(value) {
    const n = Math.abs(Number(value)) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return "месяцев";
    if (n1 > 1 && n1 < 5) return "месяца";
    if (n1 === 1) return "месяц";
    return "месяцев";
  }

  function renderExperienceCoverage() {
    const declaredMonths = parseClaimedExperienceMonths(state.profile.experienceTotal);
    const describedMonths = state.experiences.reduce((sum, item) => sum + calculateExperienceMonths(item), 0);
    const missingMonths = declaredMonths - describedMonths;
    const toleranceMonths = Math.max(
      EXPERIENCE_MISMATCH_TOLERANCE_MONTHS,
      Array.isArray(state.experiences) ? state.experiences.length : 1
    );
    const normalizedMissingMonths = missingMonths > toleranceMonths ? missingMonths : 0;
    const hasMismatch = declaredMonths > 0 && normalizedMissingMonths > 0;

    inputs.experienceTotal.classList.toggle("is-invalid", hasMismatch);

    if (experienceTotalInfoBtn && experienceTotalPopoverEl) {
      if (hasMismatch) {
        experienceTotalInfoBtn.hidden = false;
        experienceTotalPopoverEl.innerHTML = `<strong>Проверка опыта</strong><p>В блоках опыта сейчас описано ${escapeHtml(formatMonthsHuman(describedMonths))}. Не хватает ${escapeHtml(formatMonthsHuman(normalizedMissingMonths))}.</p>`;
      } else {
        experienceTotalInfoBtn.hidden = true;
        closeExperienceTotalPopover();
        experienceTotalPopoverEl.innerHTML = "";
      }
    }

    if (experienceCoverageWarningEl) {
      if (hasMismatch) {
        experienceCoverageWarningEl.textContent = `В описании работы не хватает ${formatMonthsHuman(normalizedMissingMonths)} до указанного общего опыта. Добавьте еще блоки или скорректируйте значение поля «Опыт».`;
        experienceCoverageWarningEl.style.color = "#dc2626";
      } else {
        experienceCoverageWarningEl.textContent = declaredMonths > 0
          ? `Общий опыт по блокам: ${formatMonthsHuman(describedMonths)}.`
          : "Заполните общий опыт, чтобы конструктор проверял соответствие между шапкой и блоками работы.";
        experienceCoverageWarningEl.style.color = "#666";
      }
    }

    setNavBadge("profile", hasMismatch);
    setNavBadge("experience", hasMismatch);
    setNavBadge("skills", false);
    setNavBadge("suggestions", false);
    setNavBadge("preview", false);
  }

  function applyGenderToText(text) {
    if (state.experienceGender !== "female") return String(text || "");
    let next = String(text || "");
    GENDERED_REPLACEMENTS.forEach(([male, female]) => {
      // Avoid matching male form inside already-female words, e.g. "Подготовил" in "Подготовила".
      // We only replace when the male token is not surrounded by letters.
      const re = new RegExp(`(^|[^A-Za-zА-Яа-яЁё])(${escapeRegExp(male)})(?![A-Za-zА-Яа-яЁё])`, "gi");
      next = next.replace(re, (full, prefix, match) => {
        const normalized = match === match.toLowerCase() ? female.toLowerCase() : female;
        return `${prefix}${normalized}`;
      });
    });
    return next;
  }

  function fillAvatar(container, dataUrl, fullName) {
    container.innerHTML = "";
    container.classList.toggle("is-empty", !dataUrl);
    if (dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = fullName || "Фото";
      container.append(img);
      return;
    }
    const initials = (fullName || "QA").split(/\s+/).filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase() || "").join("");
    container.textContent = initials || "QA";
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function downloadAtsTextResume() {
    const text = buildAtsTextResume();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getResumeFileBaseName()}-ats.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportStatus("ATS TXT скачан: чистый текст без визуальных элементов.", "success");
  }

  function getResumeFileBaseName() {
    const raw = String(state.profile.fullName || "resume")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return raw || "resume";
  }

  function buildAtsTextResume() {
    const lines = [];
    const isSalaryVisible = normalizeBooleanValue(state.profile.showSalary, true);
    const contacts = [state.profile.phone, state.profile.email, state.profile.telegram].filter(Boolean);

    pushTextLine(lines, state.profile.fullName || "Имя Фамилия");
    pushTextLine(lines, state.profile.headline || "QA Engineer");
    pushTextLine(lines, state.profile.experienceTotal);
    pushTextLine(lines, state.profile.city);
    contacts.forEach((item) => pushTextLine(lines, item));

    lines.push("");
    lines.push("Желаемая должность и зарплата");
    pushTextLine(lines, state.profile.headline || "QA Engineer");
    if (isSalaryVisible) pushTextLine(lines, state.profile.salary);
    pushTextLine(lines, `Специализация: ${state.profile.specialization || "Тестировщик"}`);
    pushTextLine(lines, `Тип занятости: ${state.profile.employmentType || "полная занятость"}`);
    pushTextLine(lines, `Формат работы: ${state.profile.workFormat || "удалённо"}`);
    pushTextLine(lines, `Желательное время в пути до работы: ${state.profile.commuteTime || "не имеет значения"}`);

    lines.push("");
    lines.push("Навыки");
    pushTextLine(lines, state.skills.join(", "));

    lines.push("");
    lines.push("Опыт работы");
    state.experiences.forEach((experience, index) => {
      if (index) lines.push("");
      pushTextLine(lines, `${getEmployerName(experience)} - ${getRoleName(experience)}`);
      pushTextLine(lines, formatExperiencePeriod(experience));
      getSelectedBullets(experience).forEach((item) => pushTextLine(lines, `- ${item}`));
    });

    if (state.educations.length) {
      lines.push("");
      lines.push("Образование");
      state.educations.forEach((education, index) => {
        if (index) lines.push("");
        pushTextLine(lines, `${getEducationInstitutionName(education)} - ${getEducationSpecialtyName(education)}`);
        pushTextLine(lines, formatEducationPeriod(education));
      });
    }

    lines.push("");
    lines.push("О себе");
    pushTextLine(lines, state.profile.summary);

    return lines
      .map((line) => String(line || "").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n";
  }

  function pushTextLine(lines, value) {
    const text = String(value || "").trim();
    if (text) lines.push(text);
  }

  function setExportStatus(message, tone) {
    exportStatusEl.textContent = message;
    exportStatusEl.style.color = tone === "success" ? "#176b37" : tone === "error" ? "#b42318" : "#666";
  }

  function setSummaryStatus(message, tone) {
    if (!summaryStatusEl) return;
    summaryStatusEl.textContent = message;
    summaryStatusEl.style.color = tone === "success" ? "#176b37" : tone === "error" ? "#b42318" : "#666";
  }

  function getSummaryGenerationMode() {
    const hasText = Boolean(String(state.profile.summary || inputs.summary?.value || "").trim());
    if (state.generatedSummaries.length) return "version";
    return hasText ? "extend" : "create";
  }

  function getSummaryButtonLabel() {
    if (isSummaryGenerating) return "Генерирую описание";
    const mode = getSummaryGenerationMode();
    if (mode === "version") return "Новая версия описания";
    if (mode === "extend") return "Дополнить описание";
    return "Сгенерировать описание";
  }

  function renderSummaryButton() {
    if (!generateSummaryBtn) return;
    generateSummaryBtn.textContent = getSummaryButtonLabel();
    generateSummaryBtn.classList.toggle("is-loading", isSummaryGenerating);
    generateSummaryBtn.disabled = isSummaryGenerating;
    generateSummaryBtn.setAttribute("aria-busy", String(isSummaryGenerating));
  }

  function setSummaryGenerating(next) {
    isSummaryGenerating = Boolean(next);
    renderSummaryButton();
  }

  function syncCurrentGeneratedSummaryFromInput() {
    if (!state.generatedSummaries.length) return;
    const safeIndex = Math.max(0, Math.min(state.generatedSummaryIndex || 0, state.generatedSummaries.length - 1));
    const current = state.generatedSummaries[safeIndex];
    if (!current) return;
    state.generatedSummaryIndex = safeIndex;
    current.answer = String(inputs.summary?.value || "");
  }

  function adjustSummaryTextareaHeight() {
    const textarea = inputs.summary;
    if (!textarea) return;
    const currentHeight = textarea.getBoundingClientRect().height || 132;
    textarea.style.height = "auto";
    const nextHeight = Math.max(textarea.scrollHeight, 132);
    textarea.style.height = `${currentHeight}px`;
    requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`;
    });
  }

  async function generateSummaryFromSelections() {
    const bullets = collectSelectedExperienceBullets();
    const mode = getSummaryGenerationMode();
    const currentSummary = String(state.profile.summary || inputs.summary?.value || "").trim();
    if (!state.skills.length && !bullets.length && !currentSummary) {
      setSummaryStatus("Сначала выберите навыки или формулировки опыта.", "error");
      return;
    }

    setSummaryGenerating(true);
    setSummaryStatus("Собираю описание по выбранным навыкам и опыту...", "info");
    renderSummaryAiNav();

    const prompt = buildSummaryPrompt(state.skills, bullets, { mode, currentSummary });
    let activatedNewAnswer = false;
    try {
      const preferredModel = getPreferredModel(currentModels);
      const result = await requestWithFallback(
        prompt,
        preferredModel,
        (model, index, total) => {
          setSummaryStatus(`Генерирую описание: модель ${index}/${total} (${getModelDisplayLabel(model)})`, "info");
        },
        (extraResult) => {
          pushGeneratedSummary({
            answer: extraResult.answer,
            model: extraResult.model
          }, { activate: !activatedNewAnswer });
          activatedNewAnswer = true;
          setSummaryStatus(`Получен дополнительный вариант от ${getModelDisplayLabel(extraResult.model)}.`, "success");
        },
        { system: getSummarySystemPrompt() }
      );
      pushGeneratedSummary({
        answer: result.answer,
        model: result.model
      }, { activate: !activatedNewAnswer });
      setSummaryStatus("Описание сгенерировано.", "success");
    } catch (error) {
      console.warn("Summary generation failed", error);
      setSummaryStatus(
        error?.code === "AI_REGION_UNAVAILABLE"
          ? "Не удалось получить ответ от моделей в текущем регионе."
          : "Не удалось сгенерировать описание. Попробуйте еще раз.",
        "error"
      );
    } finally {
      setSummaryGenerating(false);
    }
  }

  function pushGeneratedSummary(item, options = {}) {
    const answer = String(item?.answer || "").trim();
    if (!answer) return;
    const model = String(item?.model || "").trim();
    const exists = state.generatedSummaries.some((entry) => entry.answer === answer && entry.model === model);
    if (exists) return;
    state.generatedSummaries.push({ answer, model });
    if (options.activate || state.generatedSummaries.length === 1) {
      state.generatedSummaryIndex = state.generatedSummaries.length - 1;
    } else {
      state.generatedSummaryIndex = Math.max(0, Math.min(state.generatedSummaryIndex, state.generatedSummaries.length - 1));
    }
    applyCurrentGeneratedSummary();
    persist();
    syncInputs();
  }

  function applyCurrentGeneratedSummary() {
    if (!state.generatedSummaries.length) return;
    const current = state.generatedSummaries[state.generatedSummaryIndex] || state.generatedSummaries[0];
    state.profile.summary = current?.answer || "";
    if (inputs.summary) inputs.summary.value = state.profile.summary;
    adjustSummaryTextareaHeight();
    renderSummaryAiNav();
    renderSummaryButton();
    renderFieldActions();
    renderPreview();
  }

  function renderSummaryAiNav() {
    const list = Array.isArray(state.generatedSummaries) ? state.generatedSummaries : [];
    if (!summaryAiNavEl) return;
    if (list.length <= 1) {
      summaryAiNavEl.hidden = true;
      return;
    }
    const safeIndex = Math.max(0, Math.min(state.generatedSummaryIndex || 0, list.length - 1));
    const current = list[safeIndex] || list[0];
    state.generatedSummaryIndex = safeIndex;
    summaryAiNavEl.hidden = false;
    if (summaryAiIndexEl) summaryAiIndexEl.textContent = `${safeIndex + 1} / ${list.length}`;
    if (summaryAiModelEl) summaryAiModelEl.textContent = current?.model ? `ответила: ${getModelDisplayLabel(current.model)}` : "AI";
    if (summaryPrevBtn) summaryPrevBtn.disabled = list.length < 2;
    if (summaryNextBtn) summaryNextBtn.disabled = list.length < 2;
  }

  function collectSelectedExperienceBullets() {
    return state.experiences.flatMap((experience) => {
      return getSelectedBullets(experience);
    });
  }

  function buildSummaryPrompt(skills, bullets, options = {}) {
    const mode = options.mode || "create";
    const currentSummary = String(options.currentSummary || "").trim();
    const genderLabel = state.experienceGender === "female" ? "женский" : "мужской";
    const lines = [
      "Составь краткий блок «О себе» для резюме QA-инженера на русском языке.",
      "Нужен один связный абзац без списков и без markdown.",
      "Пиши как текст для моего резюме от первого лица, без повествования со стороны.",
      "Не начинай с формулировок вроде «Опытный QA-инженер», «Кандидат», «Специалист» или описания меня в третьем лице.",
      "Лучше использовать естественные формулировки в духе «Занимаюсь...», «Работаю с...», «Имею опыт...» или безличную, но живую подачу для блока резюме.",
      "Объем: 3-5 предложений, уверенный деловой стиль, без воды.",
      "Не перечисляй все навыки подряд через запятую, а собери из них цельный профиль.",
      "Не выдумывай опыт, опирайся только на переданные данные.",
      `Согласуй формулировки с выбранным полом пользователя: ${genderLabel}.`
    ];
    if (mode === "extend" && currentSummary) {
      lines.push("Пользователь уже указал дополнительную информацию в поле «О себе». Обязательно используй её как важный контекст, аккуратно дополни и отредактируй итоговый абзац.");
      lines.push(`Текущий текст пользователя: ${currentSummary}`);
    }
    if (mode === "version" && currentSummary) {
      lines.push("Нужно подготовить новую версию описания на основе текущего текста в поле «О себе».");
      lines.push("Если в текущем тексте есть правки, ошибки, черновые заметки или дополнительный промпт пользователя, используй полезный смысл, исправь ошибки и верни готовый чистовой абзац для резюме.");
      lines.push(`Текущий текст в поле «О себе»: ${currentSummary}`);
    }
    if (state.profile.headline) lines.push(`Желаемая должность: ${state.profile.headline}`);
    if (state.profile.experienceTotal) lines.push(`Общий опыт: ${state.profile.experienceTotal}`);
    lines.push(`Пол для формулировок опыта и блока «О себе»: ${genderLabel}`);
    if (skills.length) lines.push(`Выбранные навыки: ${skills.join(", ")}`);
    if (bullets.length) lines.push(`Формулировки опыта: ${bullets.join(" ")}`);
    return lines.join("\n");
  }

  function getSummarySystemPrompt() {
    return "Ты помогаешь составить блок «О себе» для резюме QA-инженера. " +
      "Отвечай только на русском языке. " +
      "Верни один компактный абзац для резюме без markdown, без списков, без заголовков и без приветствий. " +
      "Текст должен звучать профессионально, естественно и по-человечески. " +
      "Пиши этот блок как самопрезентацию для резюме от первого лица, а не как описание кандидата со стороны. " +
      "Не используй конструкции в третьем лице вроде «опытный QA-инженер», «специализирующийся», «кандидат», «он/она». " +
      "Не придумывай технологии или достижения, которых нет в данных пользователя.";
  }

  function isDesktopSuggestionAiEnabled() {
    return window.matchMedia("(min-width: 761px)").matches;
  }

  async function generateSuggestionCorrection(suggestionKey, userPrompt = "") {
    const exp = state.experiences[activeExperienceIndex];
    const textarea = experienceSuggestionSliderEl?.querySelector(`[data-inline-suggestion-editor="${suggestionKey}"]`);
    if (!exp || !suggestionKey || !textarea) return;
    const currentText = String(textarea.value || getSuggestionTextForExperience(exp, suggestionKey)).trim();
    if (!currentText) return;

    isSuggestionAiGeneratingKey = suggestionKey;
    withPreservedSuggestionScroll(() => renderExperiences());
    try {
      const prompt = buildSuggestionCorrectionPrompt(exp, suggestionKey, currentText, userPrompt);
      const preferredModel = getPreferredModel(currentModels);
      const result = await requestWithFallback(
        prompt,
        preferredModel,
        null,
        (extraResult) => {
          addSuggestionAiVariant(exp, suggestionKey, extraResult.answer, extraResult.model);
          withPreservedSuggestionScroll(() => renderExperiences());
        },
        {
          system: getSuggestionCorrectionSystemPrompt(),
          maxCompletionTokens: 320,
          temperature: 0.82
        }
      );
      addSuggestionAiVariant(exp, suggestionKey, result.answer, result.model);
      activeSuggestionAiPromptKey = "";
      persist("", { preserveSuggestionScroll: true });
    } catch (error) {
      console.warn("Suggestion correction failed", error);
      setExportStatus(
        error?.code === "AI_REGION_UNAVAILABLE"
          ? "Не удалось скорректировать формулировку: модели недоступны в текущем регионе."
          : "Не удалось скорректировать формулировку. Попробуйте еще раз.",
        "info"
      );
      withPreservedSuggestionScroll(() => renderExperiences());
    } finally {
      isSuggestionAiGeneratingKey = "";
      withPreservedSuggestionScroll(() => renderExperiences());
    }
  }

  function addSuggestionAiVariant(experience, suggestionKey, rawText, model) {
    const text = normalizeAiSuggestionText(rawText);
    if (!text) return;
    if (!experience.suggestionAiVariants || typeof experience.suggestionAiVariants !== "object") {
      experience.suggestionAiVariants = {};
    }
    const list = Array.isArray(experience.suggestionAiVariants[suggestionKey])
      ? experience.suggestionAiVariants[suggestionKey]
      : [];
    if (list.some((item) => String(item.text || "").trim() === text)) return;
    experience.suggestionAiVariants[suggestionKey] = [...list, { text, model: String(model || "").trim() }].slice(-4);
    saveState();
  }

  function normalizeAiSuggestionText(value) {
    return String(value || "")
      .replace(/^[-*•\d.)\s]+/, "")
      .replace(/^["«]|["»]$/g, "")
      .trim();
  }

  function buildSuggestionCorrectionPrompt(experience, suggestionKey, currentText, userPrompt) {
    const genderLabel = state.experienceGender === "female" ? "женский" : "мужской";
    const selectedInExperience = getSelectedBullets(experience)
      .filter((text) => text !== currentText);
    const selectedEverywhere = state.experiences.flatMap((item, index) => (
      getSelectedBullets(item)
        .filter((text) => !(index === activeExperienceIndex && text === currentText))
        .map((text) => `Блок ${index + 1}: ${text}`)
    ));
    const lines = [
      "Скорректируй одну формулировку для блока опыта в QA-резюме.",
      "Важно: сохрани исходный смысл карточки и тему, не переписывай ее в другую задачу.",
      "Сделай формулировку более продающей, конкретной и заметной для рекрутера.",
      "Верни только одну готовую формулировку без markdown, без кавычек и без пояснений.",
      "Пиши в прошедшем времени от первого лица без местоимения «я».",
      "Не выдумывай метрики, инструменты, компании и достижения, которых нет в контексте.",
      "Не повторяй формулировки, которые уже выбраны в других карточках.",
      `Пол пользователя для согласования глаголов: ${genderLabel}.`,
      `Компания/работодатель в этом блоке: ${getEmployerName(experience)}.`,
      `Должность в этом блоке: ${getRoleName(experience)}.`,
      `Период: ${formatExperiencePeriod(experience)}.`,
      `Исходная формулировка: ${currentText}`
    ];
    if (state.profile.headline) lines.push(`Целевая должность в резюме: ${state.profile.headline}.`);
    if (state.profile.experienceTotal) lines.push(`Общий опыт: ${state.profile.experienceTotal}.`);
    if (state.skills.length) lines.push(`Выбранные навыки: ${state.skills.join(", ")}.`);
    if (selectedInExperience.length) lines.push(`Другие выбранные формулировки этого блока: ${selectedInExperience.join(" | ")}`);
    if (selectedEverywhere.length) lines.push(`Уже выбранные формулировки, с которыми нельзя повторяться: ${selectedEverywhere.join(" | ")}`);
    const custom = String(userPrompt || "").trim();
    if (custom) {
      lines.push(`Дополнительное пожелание пользователя: ${custom}`);
    } else {
      lines.push("Дополнительного пожелания нет: автоматически улучши формулировку под профиль пользователя и выбранный опыт.");
    }
    return lines.join("\n");
  }

  function getSuggestionCorrectionSystemPrompt() {
    return "Ты карьерный редактор для QA-резюме. " +
      "Твоя задача — аккуратно улучшать одну выбранную формулировку опыта, сохраняя ее смысл. " +
      "Отвечай только на русском языке одной строкой. " +
      "Не добавляй списки, markdown, кавычки, заголовки и объяснения. " +
      "Не выдумывай факты, метрики, инструменты и достижения. " +
      "Формулировка должна быть сильной, конкретной и не дублировать уже выбранные пункты.";
  }

  function getAuthKey() {
    try {
      const raw = localStorage.getItem(OVERRIDE_API_KEY_STORAGE);
      return raw ? String(raw).trim() : "";
    } catch {
      return "";
    }
  }

  function readModelListCache() {
    return readModelCache(MODEL_LIST_CACHE_KEY);
  }

  function readValidatedChatModelsCache() {
    return readModelCache(MODEL_CHAT_VALIDATED_CACHE_KEY);
  }

  function readModelCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.models) || !parsed.ts) return null;
      if ((Date.now() - parsed.ts) > MODEL_LIST_CACHE_TTL_MS) return null;
      return parsed.models.filter(Boolean).slice(0, 5);
    } catch {
      return null;
    }
  }

  function writeModelCache(key, models) {
    try {
      localStorage.setItem(key, JSON.stringify({
        ts: Date.now(),
        models: (Array.isArray(models) ? models : []).filter(Boolean).slice(0, 5)
      }));
    } catch {}
  }

  function getPreferredModel(models) {
    const list = Array.isArray(models) && models.length ? models : FAST_MODEL_HINTS;
    const savedModel = localStorage.getItem("selectedModel");
    if (savedModel && list.includes(savedModel)) return savedModel;
    if (list.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
    return list[0] || DEFAULT_MODEL;
  }

  function getModelOrder(preferred) {
    const base = Array.isArray(currentModels) && currentModels.length ? currentModels : FAST_MODEL_HINTS.slice(0, 5);
    const ordered = [];
    if (preferred && base.includes(preferred)) ordered.push(preferred);
    base.forEach((model) => {
      if (!ordered.includes(model)) ordered.push(model);
    });
    return ordered;
  }

  function getRequestOrder(preferred) {
    const validated = readValidatedChatModelsCache();
    if (validated && validated.length) {
      currentModels = validated.slice(0, 5);
      return getModelOrder(preferred && currentModels.includes(preferred) ? preferred : getPreferredModel(currentModels));
    }
    const cached = readModelListCache();
    if (cached && cached.length) {
      currentModels = cached.slice(0, 5);
      return getModelOrder(preferred && currentModels.includes(preferred) ? preferred : getPreferredModel(currentModels));
    }
    currentModels = FAST_MODEL_HINTS.slice(0, 5);
    return getModelOrder(preferred);
  }

  function getModelDisplayLabel(model) {
    const raw = String(model || "").trim();
    if (!raw) return "";
    return raw.split("/")[0]?.trim() || raw;
  }

  async function callAiProxy(payload) {
    const urls = Array.from(new Set([
      `${SUPABASE_FUNCTIONS_BASE_DIRECT}/ai-chat`,
      `${SUPABASE_URL_DIRECT}/functions/v1/ai-chat`
    ]));
    let lastError = null;
    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_PROXY_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY_DIRECT,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: controller.signal
        });
        clearTimeout(timer);
        return response;
      } catch (error) {
        clearTimeout(timer);
        lastError = error?.name === "AbortError" ? Object.assign(new Error("AI_PROXY_TIMEOUT"), { code: "AI_PROXY_TIMEOUT" }) : error;
      }
    }
    throw lastError || new Error("AI proxy request failed");
  }

  async function fetchAnswerOnce(userQ, model, options = {}) {
    const { system } = options;
    let res;
    try {
      res = await callAiProxy({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userQ }
        ],
        temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
        reasoning_content: false,
        max_completion_tokens: Number.isInteger(options.maxCompletionTokens) ? options.maxCompletionTokens : 700,
        stream: false,
        userApiKey: getAuthKey() || null
      });
    } catch (error) {
      const err = new Error("AI_REGION_UNAVAILABLE");
      err.code = "AI_REGION_UNAVAILABLE";
      err.detail = String(error?.message || error || "");
      throw err;
    }

    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.detail || "";
      } catch {}
      const availableModels = parseAvailableModelsFromDetail(detail);
      if (res.status === 400 && availableModels.length) {
        const err = new Error("MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS");
        err.code = "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS";
        err.availableModels = availableModels;
        throw err;
      }
      throw new Error(`AI request failed: ${res.status}`);
    }

    const json = await res.json();
    const answer = json?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty AI answer");
    return { answer };
  }

  function parseAvailableModelsFromDetail(detail) {
    const text = String(detail || "");
    if (!/available models\s*:/i.test(text)) return [];
    const bracketMatch = text.match(/available models\s*:\s*\[([\s\S]*?)\]/i);
    const source = bracketMatch ? bracketMatch[1] : text;
    const result = [];
    const rx = /'([^']+)'|"([^"]+)"/g;
    let match;
    while ((match = rx.exec(source))) {
      const model = String(match[1] || match[2] || "").trim();
      if (model && !result.includes(model)) result.push(model);
    }
    return result;
  }

  function normalizeAvailableChatModels(apiModels, exclude = []) {
    const excluded = new Set(Array.isArray(exclude) ? exclude : []);
    const list = Array.isArray(apiModels) ? apiModels.filter(Boolean).filter((item) => !excluded.has(item)) : [];
    const noReasoning = list.filter((name) => {
      const n = String(name).toLowerCase();
      return !(
        n.includes("thinking") ||
        n.includes("reasoning") ||
        n.includes("deepseek-r1") ||
        n.includes("/r1") ||
        n.endsWith("-r1") ||
        n.includes("o1") ||
        n.includes("o3") ||
        n.includes("vl") ||
        n.includes("vision")
      );
    });
    const hinted = FAST_MODEL_HINTS.filter((model) => noReasoning.includes(model) && !excluded.has(model));
    const pool = hinted.length ? hinted : (noReasoning.length ? noReasoning : list);
    return pool.slice(0, 5);
  }

  function applyAvailableModelsHint(apiModels, options = {}) {
    const nextModels = normalizeAvailableChatModels(apiModels, options.exclude || []);
    if (!nextModels.length) return [];
    currentModels = nextModels.slice(0, 5);
    writeModelCache(MODEL_LIST_CACHE_KEY, currentModels);
    writeModelCache(MODEL_CHAT_VALIDATED_CACHE_KEY, currentModels);
    return currentModels;
  }

  function requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options = {}) {
    const ATTEMPT_DELAY_MS = 5000;
    return new Promise((resolve, reject) => {
      let completed = 0;
      let firstResolved = false;
      let lastError = null;
      let regionFailureCount = 0;
      let lastRegionError = null;
      let availableSet = null;

      order.forEach((model, index) => {
        setTimeout(async () => {
          if (firstResolved) {
            completed += 1;
            return;
          }
          if (availableSet && !availableSet.has(model)) {
            completed += 1;
            if (completed === order.length && !firstResolved) {
              reject({
                error: lastError || new Error("No AI answer"),
                regionFailureCount,
                regionError: lastRegionError,
                total: order.length,
                tried: order.slice(),
                availableModelsHint: availableSet ? Array.from(availableSet) : null
              });
            }
            return;
          }
          try {
            onAttempt?.(model, index + 1, order.length);
            const result = await fetchAnswerOnce(userQ, model, options);
            const payload = { answer: result.answer, model };
            if (!firstResolved) {
              firstResolved = true;
              resolve(payload);
            } else {
              onAdditional?.(payload);
            }
          } catch (error) {
            lastError = error;
            if (error?.code === "AI_REGION_UNAVAILABLE") {
              regionFailureCount += 1;
              lastRegionError = error;
            }
            if (error?.code === "MODEL_NOT_AVAILABLE_FOR_CHAT_COMPLETIONS" && Array.isArray(error.availableModels) && error.availableModels.length) {
              availableSet = new Set(error.availableModels);
              applyAvailableModelsHint(error.availableModels);
            }
          } finally {
            completed += 1;
            if (completed === order.length && !firstResolved) {
              reject({
                error: lastError || new Error("No AI answer"),
                regionFailureCount,
                regionError: lastRegionError,
                total: order.length,
                tried: order.slice(),
                availableModelsHint: availableSet ? Array.from(availableSet) : null
              });
            }
          }
        }, index * ATTEMPT_DELAY_MS);
      });
    });
  }

  async function requestWithFallback(userQ, preferredModel, onAttempt, onAdditional, options = {}) {
    const order = getRequestOrder(preferredModel);
    try {
      return await requestBatchWithTimeout(userQ, order, onAttempt, onAdditional, options);
    } catch (batchErr) {
      if (Array.isArray(batchErr?.availableModelsHint) && batchErr.availableModelsHint.length) {
        const hinted = applyAvailableModelsHint(batchErr.availableModelsHint, { exclude: batchErr.tried || [] });
        if (hinted.length) {
          const retryOrder = hinted.filter((model) => !(batchErr.tried || []).includes(model));
          if (retryOrder.length) {
            return requestBatchWithTimeout(userQ, retryOrder, onAttempt, onAdditional, options);
          }
        }
      }
      if (batchErr?.regionFailureCount === batchErr?.total) {
        throw batchErr.regionError || Object.assign(new Error("AI_REGION_UNAVAILABLE"), { code: "AI_REGION_UNAVAILABLE" });
      }
      throw batchErr?.error || new Error("No AI answer");
    }
  }

  function createHint(text) {
    const p = document.createElement("p");
    p.className = "builder-hint";
    p.textContent = text;
    return p;
  }

  function bindHorizontalDragScroll() {
    const selector = "#skills-library, .experience-block-tabs, .experience-suggestion-slider, .suggestion-chip__ai-variants";
    let drag = null;

    document.addEventListener("pointerdown", (event) => {
      const target = event.target.closest(selector);
      if (!target || target.scrollWidth <= target.clientWidth) return;
      drag = {
        target,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: target.scrollLeft,
        moved: false,
        captured: false
      };
    });

    document.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
        drag.moved = true;
        if (!drag.captured) {
          drag.captured = true;
          drag.target.classList.add("is-scroll-dragging");
          drag.target.setPointerCapture?.(event.pointerId);
        }
        drag.target.scrollLeft = drag.scrollLeft - dx;
        event.preventDefault();
      }
    }, { passive: false });

    function finishDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.target.classList.remove("is-scroll-dragging");
      drag.target.dataset.scrollDragged = drag.moved ? "true" : "";
      if (drag.captured) {
        drag.target.releasePointerCapture?.(event.pointerId);
      }
      const target = drag.target;
      drag = null;
      if (target.dataset.scrollDragged) {
        setTimeout(() => {
          delete target.dataset.scrollDragged;
        }, 0);
      }
    }

    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);

    document.addEventListener("click", (event) => {
      const target = event.target.closest(selector);
      if (!target?.dataset.scrollDragged) return;
      event.preventDefault();
      event.stopPropagation();
      delete target.dataset.scrollDragged;
    }, true);
  }

  function bindResponsiveRender() {
    const skillsMedia = window.matchMedia("(max-width: 760px)");
    const rerenderSkills = () => renderSkills();
    skillsMedia.addEventListener?.("change", rerenderSkills);
    if (!skillsMedia.addEventListener) {
      skillsMedia.addListener?.(rerenderSkills);
    }
  }

  function bindPrintHintPosition() {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;

        // Сначала ставим образование, потом от него тормозим настройку печати.
        updateEducationHintPosition();
        updatePrintHintPosition();
      });
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  }

  function isResumeSidebarVisible() {
    return resumeSidebarEl && getComputedStyle(resumeSidebarEl).display !== "none";
  }

  function resetFixedHintCardPosition(card) {
    if (!card) return;
    card.style.removeProperty("top");
    card.style.removeProperty("left");
    card.style.removeProperty("width");
  }

  function updatePrintHintPosition() {
    if (!resumeSidebarEl || !resumeSidebarCardEl || !printHintCardEl || !previewSectionEl) return;

    if (!isResumeSidebarVisible()) {
      resetFixedHintCardPosition(printHintCardEl);
      return;
    }

    const sidebarRect = resumeSidebarEl.getBoundingClientRect();
    const contentRect = resumeSidebarCardEl.getBoundingClientRect();
    const previewRect = previewSectionEl.getBoundingClientRect();
    const gap = 12;

    let top = Math.max(previewRect.top, contentRect.bottom + gap);

    // Если плашка образования видна, настройка печати не должна на неё налезать.
    if (educationHintCardEl && !educationHintCardEl.hidden) {
      const educationRect = educationHintCardEl.getBoundingClientRect();
      const educationTouchesViewport = educationRect.top < window.innerHeight;

      if (educationTouchesViewport) {
        top = Math.max(top, educationRect.bottom + gap);
      }
    }

    printHintCardEl.style.top = `${Math.round(top)}px`;
    printHintCardEl.style.left = `${Math.round(sidebarRect.left)}px`;
    printHintCardEl.style.width = `${Math.round(sidebarRect.width)}px`;
  }

  function updateEducationHintPosition() {
    if (!resumeSidebarEl || !resumeSidebarCardEl || !educationHintCardEl || !suggestionsSectionEl) return;

    const shouldHide =
      !isResumeSidebarVisible()
      || state.educationSectionOpened
      || state.educations.length > 0;

    educationHintCardEl.hidden = shouldHide;

    if (shouldHide) {
      resetFixedHintCardPosition(educationHintCardEl);
      return;
    }

    const sidebarRect = resumeSidebarEl.getBoundingClientRect();
    const contentRect = resumeSidebarCardEl.getBoundingClientRect();
    const suggestionsRect = suggestionsSectionEl.getBoundingClientRect();
    const hintRect = educationHintCardEl.getBoundingClientRect();
    const gap = 12;

    const minTop = contentRect.bottom + gap;

    // Плашка прикреплена к нижней границе блока «Список задач и достижений».
    // Пока эта граница ниже экрана, сама плашка тоже будет ниже экрана,
    // то есть она не скрывается через hidden, а просто уезжает за viewport.
    const attachedTop = suggestionsRect.bottom - hintRect.height;

    // Тормозим об «Содержание», но не тормозим об нижнюю границу экрана.
    const top = Math.max(minTop, attachedTop);

    educationHintCardEl.style.top = `${Math.round(top)}px`;
    educationHintCardEl.style.left = `${Math.round(sidebarRect.left)}px`;
    educationHintCardEl.style.width = `${Math.round(sidebarRect.width)}px`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toCamel(value) {
    return String(value).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderSkillIcon(skill, className = "builder-chip__icon") {
    if (!shouldShowSkillIcons()) return "";
    const icon = SKILL_ICONS[skill] || "tabler:hash";
    const color = SKILL_ICON_COLORS[skill] || "#f59e0b";
    const tone = isDarkColor(color) ? "dark" : "normal";
    return `<span class="${className}" data-icon-tone="${tone}" style="color:${escapeHtml(color)}" aria-hidden="true"><iconify-icon icon="${escapeHtml(icon)}"></iconify-icon></span>`;
  }

  function isDarkColor(hex) {
    const value = String(hex || "").trim();
    const m = value.match(/^#([0-9a-f]{6})$/i);
    if (!m) return false;
    const rgb = parseInt(m[1], 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    // Relative luminance approximation (sRGB-ish). Threshold tuned for tiny icons on dark chips.
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.34;
  }
});
