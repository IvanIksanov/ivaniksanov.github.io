/* QA checklist for the five-letter trainer. Results are the tester's observations. */
(() => {
  'use strict';

  const groups = [
    {
      title: 'Начало игры',
      checks: [
        ['demo', 'При первом посещении показан пример с цветными подсказками и кнопкой «Сыграть».'],
        ['start', 'После нажатия «Сыграть» пример исчезает и открывается пустое поле для новой игры.'],
        ['active-row', 'Перед вводом первая ячейка только активной строки слегка подсвечивается.'],
        ['board', 'Игровое поле содержит шесть строк по пять ячеек.']
      ]
    },
    {
      title: 'Ввод и попытки',
      checks: [
        ['letters', 'Русские буквы появляются в текущей строке слева направо; лишняя шестая буква не добавляется.'],
        ['delete', 'Удаление убирает последнюю введённую букву, не меняя предыдущие попытки.'],
        ['short-word', 'Попытка из четырёх букв не принимается: появляется сообщение о пяти буквах.'],
        ['unknown-word', 'Слово, которого нет в словаре, не расходует попытку.'],
        ['valid-word', 'После подтверждения допустимого слова строка фиксируется и ввод переходит на следующую.'],
        ['invalid-character', 'Цифры и латинские буквы не попадают в слово; неверный символ отмечается отдельно.']
      ]
    },
    {
      title: 'Подсказки и результат',
      checks: [
        ['correct-letter', 'Буква на правильном месте отмечается жёлтым.'],
        ['present-letter', 'Буква, которая есть в ответе, но стоит не на своём месте, отмечается серым.'],
        ['absent-letter', 'Буква, которой нет в ответе, не получает цветной подсказки.'],
        ['repeated-letter', 'Для повторяющихся букв подсказка учитывает, сколько раз буква встречается в ответе.'],
        ['win', 'После угаданного слова игра завершается и показывает итог попыток.'],
        ['loss', 'После шестой неудачной попытки игра завершается и показывает ответ.'],
        ['replay', 'Кнопка «Играть снова» очищает поле и начинает новую игру.']
      ]
    },
    {
      title: 'Помощник',
      checks: [
        ['switch-mode', 'Переход между «Игрой» и «Помощником» не стирает текущую попытку.'],
        ['sync', 'При включённой синхронизации помощник переносит подсказки из подтверждённых попыток.'],
        ['manual', 'После выключения синхронизации условия помощника можно вводить вручную.'],
        ['filters', 'Буквы на точных местах, буквы не на своих местах и исключённые буквы меняют список вариантов.'],
        ['clear', 'Кнопка «Очистить условия» видна только при выключенной синхронизации и убирает заданные вручную ограничения.'],
        ['probes', 'Подходящие проверочные слова отображаются отдельно от вариантов ответа.']
      ]
    },
    {
      title: 'Сохранение и экран',
      checks: [
        ['reload', 'После обновления страницы незавершённая игра и условия помощника сохраняются.'],
        ['history', 'Завершённая игра появляется в истории; победа без помощника может попасть в топ-5.'],
        ['mobile', 'На узком экране игровое поле, кнопки и помощник помещаются без горизонтальной прокрутки.'],
        ['theme', 'В светлой и тёмной теме текст, ячейки и цветные подсказки остаются различимыми.']
      ]
    }
  ];

  const storageKey = 'qatodev_five_letters_qa_v1';
  const fab = document.getElementById('five-qa-fab');
  const panel = document.getElementById('five-qa-panel');
  const scrollBody = panel?.querySelector('.five-qa-body');
  const close = document.getElementById('five-qa-close');
  const list = document.getElementById('five-qa-checklist');
  const progress = document.getElementById('five-qa-progress');
  const verify = document.getElementById('five-qa-verify');
  if (!fab || !panel || !scrollBody || !close || !list || !progress || !verify) return;

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  const saved = readState();
  const state = {
    open: saved.open === true,
    answers: saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers)
      ? saved.answers : {},
    verified: saved.verified === true,
    scrollTop: Number.isFinite(saved.scrollTop) ? Math.max(0, saved.scrollTop) : 0
  };
  const total = groups.reduce((count, group) => count + group.checks.length, 0);
  let scrollFrame = 0;
  let restoringScroll = false;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  function setOpen(open) {
    if (!open && state.open) state.scrollTop = scrollBody.scrollTop;
    state.open = open;
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    fab.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('five-qa-open', open);
    save();
    if (open) {
      restoringScroll = true;
      requestAnimationFrame(() => {
        scrollBody.scrollTop = state.scrollTop;
        restoringScroll = false;
      });
    }
  }

  function updateSummary() {
    const answers = groups.flatMap(group => group.checks.map(([id]) => state.answers[id]));
    const passed = answers.filter(answer => answer === 'pass').length;
    const failed = answers.filter(answer => answer === 'fail').length;
    const answered = passed + failed;
    progress.textContent = `Проверено: ${answered} из ${total}`;
    verify.classList.toggle('is-verified', state.verified);
    verify.style.setProperty('--five-correct-width', `${(passed / total) * 100}%`);
    verify.textContent = state.verified ? `Верно: ${passed} из ${total}` : 'Проверить регресс';
    verify.setAttribute('aria-label', state.verified
      ? `Результат регресса: Passed — ${passed}, Failed — ${failed}, без оценки — ${total - answered}`
      : 'Проверить регресс');
  }

  function render() {
    list.replaceChildren();
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'five-qa-group';
      const heading = document.createElement('h3');
      heading.textContent = group.title;
      const checks = document.createElement('ul');
      for (const [id, description] of group.checks) {
        const item = document.createElement('li');
        item.className = 'five-qa-check';
        item.dataset.checkId = id;
        const row = document.createElement('div');
        row.className = 'five-qa-check-row';
        const text = document.createElement('span');
        text.className = 'five-qa-check-text';
        text.textContent = description;
        const choices = document.createElement('div');
        choices.className = 'five-qa-choices';
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', `Результат: ${description}`);
        for (const [value, label] of [['pass', 'Passed'], ['fail', 'Failed']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.result = value;
          button.textContent = label;
          button.setAttribute('aria-pressed', String(state.answers[id] === value));
          choices.append(button);
        }
        row.append(text, choices);
        item.append(row);
        checks.append(item);
      }
      section.append(heading, checks);
      list.append(section);
    }
    updateSummary();
  }

  fab.addEventListener('click', () => {
    setOpen(true);
    close.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => {
    setOpen(false);
    fab.focus({ preventScroll: true });
  });
  scrollBody.addEventListener('scroll', () => {
    if (restoringScroll || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      state.scrollTop = scrollBody.scrollTop;
      save();
    });
  }, { passive: true });
  window.addEventListener('pagehide', () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (state.open && !restoringScroll) state.scrollTop = scrollBody.scrollTop;
    save();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !state.open) return;
    setOpen(false);
    fab.focus({ preventScroll: true });
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('button[data-result]');
    const item = button?.closest('[data-check-id]');
    if (!item) return;
    const id = item.dataset.checkId;
    const value = button.dataset.result;
    if (state.answers[id] === value) delete state.answers[id];
    else state.answers[id] = value;
    state.verified = false;
    item.querySelectorAll('button[data-result]').forEach(choice => {
      choice.setAttribute('aria-pressed', String(state.answers[id] === choice.dataset.result));
    });
    updateSummary();
    save();
  });
  verify.addEventListener('click', () => {
    state.verified = true;
    updateSummary();
    save();
  });

  render();
  setOpen(state.open);
  document.documentElement.classList.remove('five-qa-preopen');
})();
