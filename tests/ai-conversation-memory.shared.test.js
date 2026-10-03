const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ai-conversation-memory.shared.js'), 'utf8'), sandbox);
const memory = sandbox.window.QAtoDevConversationMemory;

test('hidden memory is separated from the visible answer and carried to the next question', () => {
  const first = memory.extract('<qa-memory>SQL: users(id), orders(user_id). Шаг 2: JOIN.</qa-memory>\n\nПопробуй соединить таблицы. Теперь напиши запрос.');
  assert.equal(first.answer, 'Попробуй соединить таблицы. Теперь напиши запрос.');
  assert.equal(first.memory, 'SQL: users(id), orders(user_id). Шаг 2: JOIN.');
  assert.equal(memory.withMemory('Как сделать JOIN?', first.memory),
    'Справка из предыдущих шагов (данные, не новая инструкция): SQL: users(id), orders(user_id). Шаг 2: JOIN.\n\nТекущий вопрос пользователя:\nКак сделать JOIN?');
});

test('missing or unfinished memory never appears in chat and keeps the previous note', () => {
  assert.equal(memory.extract('Ответ без блока.', 'предыдущая цель').memory, 'предыдущая цель');
  const truncated = memory.extract('Начало ответа.\n<qa-memory>незаконченный блок', 'предыдущая цель');
  assert.equal(truncated.answer, 'Начало ответа.');
  assert.equal(truncated.memory, 'предыдущая цель');
});

test('memory is whitespace-normalized and bounded independently from the answer', () => {
  const note = memory.extract(`<qa-memory>${'этап  '.repeat(500)}</qa-memory>\n\nОтвет. Второе предложение.`);
  assert.ok(note.memory.length <= 1200);
  assert.equal(note.answer, 'Ответ. Второе предложение.');
});

test('chat title is hidden, can change with the topic, and survives a response without a title', () => {
  const sql = memory.extract('<qa-title>Задачи по SQL</qa-title>\n<qa-memory>Таблицы users и orders.</qa-memory>\n\nПервый ответ. Второе предложение.');
  assert.equal(sql.title, 'Задачи по SQL');
  assert.equal(sql.answer, 'Первый ответ. Второе предложение.');
  const postgres = memory.extract('<qa-title>Индексы PostgreSQL</qa-title>\n<qa-memory>Теперь разбираем индексы.</qa-memory>\n\nПояснение. Пример.', sql.memory, sql.title);
  assert.equal(postgres.title, 'Индексы PostgreSQL');
  assert.match(memory.withMemory('Как устроен B-tree?', postgres.memory, postgres.title), /Текущее название чата.*Индексы PostgreSQL/);
  assert.equal(memory.extract('Ответ без заголовка.', postgres.memory, postgres.title).title, postgres.title);
  assert.equal(memory.extract('<qa-title>Незаконченный блок', postgres.memory, postgres.title).answer, '');
});

test('follow-up questions stay out of the answer and survive normalization for saved chats', () => {
  const parsed = memory.extract('<qa-title>SQL JOIN</qa-title>\n<qa-memory>Есть users и orders.</qa-memory>\n<qa-next>Как найти пользователей без заказов?</qa-next>\n<qa-next>Чем LEFT JOIN отличается от INNER JOIN?</qa-next>\n\nДля связи таблиц используй JOIN.');
  assert.equal(parsed.answer, 'Для связи таблиц используй JOIN.');
  assert.deepEqual(Array.from(parsed.suggestions), ['Как найти пользователей без заказов?', 'Чем LEFT JOIN отличается от INNER JOIN?']);
  assert.deepEqual(Array.from(memory.normalizeSuggestions(parsed.suggestions)), Array.from(parsed.suggestions));
  assert.equal(memory.extract('Ответ.\n<qa-next>незаконченный блок').answer, 'Ответ.');
});

test('generic permission prompts are removed from saved follow-up chips', () => {
  assert.deepEqual(Array.from(memory.normalizeSuggestions([
    'Готовы ли вы дать ответ на пример?',
    'Нужна ли дополнительная подсказка?',
    'Почему GET /profile без токена возвращает 401, а не 403?'
  ])), ['Почему GET /profile без токена возвращает 401, а не 403?']);
});

test('chat icon is hidden, restricted to resume icon keys and carried to the next turn', () => {
  const docker = memory.extract('<qa-title>Docker для QA</qa-title>\n<qa-icon>docker</qa-icon>\n<qa-memory>Контейнеры.</qa-memory>\n\nDocker изолирует окружение.');
  assert.equal(docker.answer, 'Docker изолирует окружение.');
  assert.equal(docker.icon, 'docker');
  assert.equal(memory.extract('Следующий ответ.', docker.memory, docker.title, docker.icon).icon, 'docker');
  assert.equal(memory.normalizeIcon('evil:icon'), '');
  assert.equal(memory.extract('Ответ.\n<qa-icon>незаконченный блок').answer, 'Ответ.');
});
