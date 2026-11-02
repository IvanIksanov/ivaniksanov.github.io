# Trainer kit

Общие компоненты для тренажёров QAtoDev. Подключаются только на страницах,
которые их используют.

## Файлы

- `shared.css` — QA-панель, чек-лист, прогресс, fab/close/verify, тёмная тема,
  мобильный режим.
- `shared.js` — `QATrainers.state`, `QATrainers.progress`,
  `QATrainers.panel`, `QATrainers.checklist`.

## Подключение

```html
<link rel="stylesheet" href="trainers/shared.css?v=1">
...
<script src="trainers/shared.js?v=1"></script>
```

Скрипт должен загружаться до скрипта конкретного тренажёра.

## Checklist

```js
window.QATrainers.checklist({
  id: 'my-trainer-qa',
  storageKey: 'qatodev_my_trainer_qa_v1',
  version: 1,
  versionKey: 'checklistVersion',
  groups: [
    {
      title: 'Первый экран',
      checks: [
        ['first-check', 'Первый экран открывается без ошибок.'],
        ['second-check', 'Кнопка «Далее» доступна с клавиатуры.']
      ]
    }
  ],
  fab: '#my-qa-fab',
  panel: '#my-qa-panel',
  close: '#my-qa-close',
  body: '.trainer-qa-body',
  list: '#my-qa-checklist',
  progress: '#my-qa-progress',
  verify: '#my-qa-verify',
  openClass: 'trainer-qa-open',
  verifyLabel: 'Проверить',
  formatProgress: ({ answered, total }) => `Проверено: ${answered} из ${total}`,
  formatVerified: ({ passed, total }) => `Верно: ${passed} из ${total}`
});
```

Компонент сам:

- рендерит группы и кнопки `Passed`/`Failed`;
- хранит ответы в `localStorage` с версией;
- обновляет прогресс и кнопку проверки;
- открывает/закрывает панель, ставит `aria-hidden`/`inert`,
  возвращает фокус и закрывается по `Escape`;
- сохраняет позицию скролла.

## State

```js
const state = QATrainers.state('my-trainer', {
  version: 1,
  defaults: { level: 1, step: 0, answers: {}, completed: [] }
});

state.get();
state.patch({ level: 2 });
state.reset();
```

Ключ по умолчанию: `qatodev.trainer.<id>.v1`. Для миграции старого
тренажёра можно передать `storageKey` и `versionKey`.

## Progress

```js
const progress = QATrainers.progress({
  storageKey: 'qatodev_my_trainer_qa_v1',
  total: 20
});
// { total, passed, failed, answered, percent }
```

## CSS

Основные классы:

- `.trainer-qa-fab`, `.trainer-qa-panel`
- `.trainer-qa-head`, `.trainer-qa-body`, `.trainer-qa-close`
- `.trainer-qa-progress`
- `.trainer-qa-group`, `.trainer-qa-check`, `.trainer-qa-check-row`,
  `.trainer-qa-check-text`, `.trainer-qa-choices`
- `.trainer-qa-verify`

Токены задаются на `.trainer-qa-panel`:

- `--trainer-qa-surface`, `--trainer-qa-line`, `--trainer-qa-ink`,
  `--trainer-qa-muted`
- `--trainer-qa-accent`, `--trainer-qa-progress-color`
- `--trainer-qa-pass-*`, `--trainer-qa-fail-*`

Страница может добавить свой skin, не переопределяя структуру:

```css
.my-qa-panel {
  --trainer-qa-accent: #44bbc1;
}
```

## Правила

- Не копировать разметку чек-листа в новый тренажёр.
- Не добавлять новый `localStorage`-ключ без версии.
- Не переопределять layout компонента без необходимости; для уникального
  расположения используйте отдельный класс страницы.
- Проверять 320px, тёмную тему, клавиатуру и `prefers-reduced-motion`.
