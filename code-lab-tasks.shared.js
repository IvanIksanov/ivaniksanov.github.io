/* Code Lab: локальные задачи по SQL и API. */
(() => {
  'use strict';

  const sqlSeed = `
    create table users (id integer primary key, name text, city text, active integer);
    insert into users (id, name, city, active) values
      (1, 'Анна', 'Москва', 1),
      (2, 'Борис', 'Казань', 0),
      (3, 'Вера', 'Москва', 1),
      (4, 'Глеб', 'Сочи', 1);

    create table orders (id integer primary key, user_id integer, total integer);
    insert into orders (id, user_id, total) values
      (1, 1, 1200),
      (2, 1, 3400),
      (3, 3, 800),
      (4, 4, 6000),
      (5, 4, 500);
  `;

  const tasks = [
    {
      id: 'sql-active-users',
      track: 'sql',
      title: 'Активные пользователи',
      difficulty: 'Легко',
      topics: ['SELECT', 'WHERE'],
      description: 'Выведи имена пользователей, у которых active = 1. Порядок строк не важен.',
      starterCode: 'SELECT\n  -- какие колонки нужны?\nFROM users\nWHERE ...;',
      hints: [
        'Нужна только колонка name.',
        'Условие по полю active: active = 1.'
      ],
      cases: [{
        name: 'Активные пользователи',
        seedSql: sqlSeed,
        expected: [['Анна'], ['Вера'], ['Глеб']],
        ordered: false
      }]
    },
    {
      id: 'sql-order-totals',
      track: 'sql',
      title: 'Крупные заказы',
      difficulty: 'Средне',
      topics: ['JOIN', 'GROUP BY', 'HAVING'],
      description: 'Выведи имя пользователя и сумму его заказов, если сумма больше 3000. Колонки: name, total.',
      starterCode: 'SELECT\n  u.name,\n  sum(o.total) AS total\nFROM users u\nJOIN orders o ON ...\nGROUP BY ...\nHAVING ...;',
      hints: [
        'Соедини users и orders по user_id.',
        'Сгруппируй по пользователю и проверь sum(o.total) через HAVING.'
      ],
      cases: [{
        name: 'Сумма заказов больше 3000',
        seedSql: sqlSeed,
        expected: [['Анна', 4600], ['Глеб', 6500]],
        ordered: false
      }]
    },
    {
      id: 'sql-orders-count',
      track: 'sql',
      title: 'Заказы у каждого',
      difficulty: 'Средне',
      topics: ['LEFT JOIN', 'COUNT'],
      description: 'Посчитай количество заказов у каждого пользователя, включая тех, у кого заказов нет. Колонки: name, orders_count.',
      starterCode: 'SELECT\n  u.name,\n  count(o.id) AS orders_count\nFROM users u\n...\nGROUP BY ...;',
      hints: [
        'Обычный JOIN потеряет пользователей без заказов.',
        'Нужен LEFT JOIN и count(o.id).'
      ],
      cases: [{
        name: 'Все пользователи и число заказов',
        seedSql: sqlSeed,
        expected: [['Анна', 2], ['Борис', 0], ['Вера', 1], ['Глеб', 2]],
        ordered: false
      }]
    },
    {
      id: 'sql-city-totals',
      track: 'sql',
      title: 'Города и суммы',
      difficulty: 'Средне',
      topics: ['JOIN', 'GROUP BY', 'HAVING'],
      description: 'Выведи город и сумму заказов его пользователей, если сумма больше 1000. Колонки: city, total.',
      starterCode: 'SELECT\n  u.city,\n  sum(o.total) AS total\nFROM users u\nJOIN orders o ON ...\nGROUP BY ...\nHAVING ...;',
      hints: [
        'Группировка нужна по городу.',
        'Сумма заказов считается по всем заказам пользователей города.'
      ],
      cases: [{
        name: 'Города с суммой больше 1000',
        seedSql: sqlSeed,
        expected: [['Москва', 5400], ['Сочи', 6500]],
        ordered: false
      }]
    },
    {
      id: 'api-list-users',
      track: 'api',
      title: 'Список пользователей',
      difficulty: 'Легко',
      topics: ['GET', 'JSON'],
      description: 'Запроси GET /api/users и верни массив имён пользователей.',
      starterCode: `async function solve() {
  const res = await fetch('/api/users');
  const data = await res.json();
  // верни массив имён
  return [];
}

return solve();`,
      hints: [
        'Ответ сервера — массив объектов.',
        'Используй data.map(user => user.name).'
      ],
      cases: [{
        name: 'GET /api/users',
        mocks: [{
          method: 'GET',
          path: '/api/users',
          response: {
            status: 200,
            body: [
              { id: 1, name: 'Анна' },
              { id: 2, name: 'Борис' }
            ]
          }
        }],
        expected: ['Анна', 'Борис']
      }]
    },
    {
      id: 'api-create-user',
      track: 'api',
      title: 'Создание пользователя',
      difficulty: 'Легко',
      topics: ['POST', 'JSON body'],
      description: 'Отправь POST /api/users с именем «Вера» и верни id созданного пользователя.',
      starterCode: `async function solve() {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Вера' })
  });
  const data = await res.json();
  // верни id
  return null;
}

return solve();`,
      hints: [
        'Метод и заголовок Content-Type обязательны.',
        'Тело запроса — JSON.stringify({ name: "Вера" }).'
      ],
      cases: [{
        name: 'POST /api/users',
        mocks: [{
          method: 'POST',
          path: '/api/users',
          response: {
            status: 201,
            body: { id: 3, name: 'Вера' }
          }
        }],
        expected: 3
      }]
    },
    {
      id: 'api-not-found',
      track: 'api',
      title: 'Обработка 404',
      difficulty: 'Легко',
      topics: ['status', 'ошибки'],
      description: 'Запроси GET /api/profile. Если сервер вернул 404, верни строку not found.',
      starterCode: `async function solve() {
  const res = await fetch('/api/profile');
  // проверь статус
  return 'unexpected';
}

return solve();`,
      hints: [
        'res.status содержит HTTP-код.',
        'Сравни status с 404.'
      ],
      cases: [{
        name: 'GET /api/profile → 404',
        mocks: [{
          method: 'GET',
          path: '/api/profile',
          response: {
            status: 404,
            body: { error: 'not found' }
          }
        }],
        expected: 'not found'
      }]
    },
    {
      id: 'api-paid-orders',
      track: 'api',
      title: 'Оплаченные заказы',
      difficulty: 'Средне',
      topics: ['GET', 'query', 'filter'],
      description: 'Запроси GET /api/orders?status=paid и верни количество заказов со статусом paid.',
      starterCode: `async function solve() {
  const res = await fetch('/api/orders?status=paid');
  const data = await res.json();
  // отфильтруй paid и посчитай
  return 0;
}

return solve();`,
      hints: [
        'Ответ содержит массив items.',
        'Отфильтруй items по status === "paid".'
      ],
      cases: [{
        name: 'GET /api/orders?status=paid',
        mocks: [{
          method: 'GET',
          path: '/api/orders',
          response: {
            status: 200,
            body: {
              items: [
                { id: 1, total: 1200, status: 'paid' },
                { id: 2, total: 800, status: 'paid' },
                { id: 3, total: 500, status: 'new' }
              ]
            }
          }
        }],
        expected: 2
      }]
    }
  ];

  window.QAtoDevCodeLabTasks = {
    tracks: [
      { id: 'sql', label: 'SQL', note: 'SQLite в браузере' },
      { id: 'api', label: 'API', note: 'локальный mock' }
    ],
    tasks
  };
})();
