(function() {
  const tests = window.ROADMAP_SKILL_TESTS || {};
  const blocks = window.ROADMAP_TEST_BLOCKS || [];
  const blockTestIds = window.ROADMAP_BLOCK_TEST_IDS || {};

  function getTestKey(testId) {
    return 'qatodev:roadmap:skill-test:' + testId;
  }

  function getDraftKey(testId) {
    return 'qatodev:roadmap:skill-test-draft:' + testId;
  }

  function readJson(key) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  }

  function readResult(testId) {
    return readJson(getTestKey(testId));
  }

  function readDraft(testId) {
    return readJson(getDraftKey(testId));
  }

  function saveDraft(testId, form, total) {
    const answers = [];
    for (let index = 0; index < total; index += 1) {
      const selected = form.querySelector('input[name="roadmap-test-' + CSS.escape(testId) + '-' + index + '"]:checked');
      answers[index] = selected?.value || '';
    }
    localStorage.setItem(getDraftKey(testId), JSON.stringify({
      answers,
      updatedAt: new Date().toISOString()
    }));
  }

  function shuffleOptions(options) {
    const normalized = options.map(function(option) {
      return typeof option === 'string' ? { text: option, explanation: '' } : option;
    });
    for (let index = normalized.length - 1; index > 0; index -= 1) {
      const nextIndex = Math.floor(Math.random() * (index + 1));
      const current = normalized[index];
      normalized[index] = normalized[nextIndex];
      normalized[nextIndex] = current;
    }
    return normalized;
  }

  function applyResultState(form, test, testId) {
    form.classList.add('is-completed');
    test.questions.forEach(function(question, questionIndex) {
      const fieldset = form.querySelectorAll('.roadmap-skill-test__question')[questionIndex];
      const selected = form.querySelector('input[name="roadmap-test-' + CSS.escape(testId) + '-' + questionIndex + '"]:checked');
      const isQuestionWrong = selected?.value !== question.answer;
      fieldset?.querySelectorAll('.roadmap-skill-test__option').forEach(function(optionLabel) {
        const optionInput = optionLabel.querySelector('input');
        const isAnswer = optionInput?.value === question.answer;
        const isSelected = optionInput?.checked;
        optionLabel.classList.toggle('is-correct', Boolean(isSelected && isAnswer));
        optionLabel.classList.toggle('is-wrong', Boolean(isSelected && !isAnswer));
        optionLabel.classList.toggle('has-explanation', Boolean(isQuestionWrong && isSelected && !isAnswer));
      });
    });
  }

  function createTest(testId) {
    const test = tests[testId];
    if (!test) return null;

    const section = document.createElement('section');
    section.className = 'roadmap-skill-test';

    const title = document.createElement('h3');
    title.textContent = test.title;
    section.appendChild(title);

    if (test.summary) {
      const summary = document.createElement('p');
      summary.className = 'roadmap-test-summary';
      summary.textContent = test.summary;
      section.appendChild(summary);
    }

    const form = document.createElement('form');
    form.className = 'roadmap-skill-test__form';
    form.noValidate = true;

    const savedDraft = readDraft(testId);
    const savedAnswers = Array.isArray(savedDraft?.answers) ? savedDraft.answers : [];
    const savedResult = readResult(testId);
    let result;

    test.questions.forEach(function(question, questionIndex) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'roadmap-skill-test__question';
      const legend = document.createElement('legend');
      legend.textContent = (questionIndex + 1) + '. ' + question.text;
      fieldset.appendChild(legend);

      shuffleOptions(question.options).forEach(function(normalizedOption) {
        const label = document.createElement('label');
        label.className = 'roadmap-skill-test__option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'roadmap-test-' + testId + '-' + questionIndex;
        input.value = normalizedOption.text;
        input.required = true;
        if (savedAnswers[questionIndex] === normalizedOption.text) input.checked = true;

        const text = document.createElement('span');
        text.className = 'roadmap-skill-test__option-text';
        text.textContent = normalizedOption.text;

        const explanation = document.createElement('span');
        explanation.className = 'roadmap-skill-test__explanation';
        const explanationToggle = document.createElement('button');
        explanationToggle.type = 'button';
        explanationToggle.className = 'roadmap-skill-test__explanation-toggle';
        explanationToggle.textContent = '!';
        explanationToggle.setAttribute('aria-label', 'Показать пояснение');
        explanationToggle.setAttribute('aria-expanded', 'false');
        const explanationText = document.createElement('span');
        explanationText.className = 'roadmap-skill-test__explanation-text';
        explanationText.textContent = normalizedOption.explanation || (normalizedOption.text === question.answer ? 'Этот вариант соответствует ожидаемому ответу.' : 'Этот вариант не закрывает условие вопроса.');
        explanation.append(explanationToggle, explanationText);

        explanationToggle.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          const isOpen = explanation.classList.toggle('is-open');
          explanationToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        input.addEventListener('change', function() {
          fieldset.classList.remove('is-missing');
          fieldset.querySelectorAll('.roadmap-skill-test__option').forEach(function(optionLabel) {
            const checked = optionLabel.querySelector('input')?.checked;
            optionLabel.classList.toggle('is-selected', Boolean(checked));
            optionLabel.classList.remove('is-correct', 'is-wrong', 'has-explanation');
            optionLabel.querySelector('.roadmap-skill-test__explanation')?.classList.remove('is-open');
            optionLabel.querySelector('.roadmap-skill-test__explanation-toggle')?.setAttribute('aria-expanded', 'false');
          });
          form.classList.remove('is-completed');
          if (result) {
            result.textContent = '';
            result.classList.remove('is-passed');
          }
          saveDraft(testId, form, test.questions.length);
        });

        label.addEventListener('click', function(event) {
          if (event.target.closest('.roadmap-skill-test__explanation-toggle')) return;
        });

        label.append(input, text, explanation);
        label.classList.toggle('is-selected', input.checked);
        fieldset.appendChild(label);
      });
      form.appendChild(fieldset);
    });

    const actions = document.createElement('div');
    actions.className = 'roadmap-skill-test__actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'roadmap-skill-test__submit';
    submit.textContent = 'Завершить';
    result = document.createElement('p');
    result.className = 'roadmap-skill-test__result';
    result.setAttribute('aria-live', 'polite');
    actions.append(submit, result);
    form.appendChild(actions);

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      let firstMissing = null;
      test.questions.forEach(function(question, questionIndex) {
        const fieldset = form.querySelectorAll('.roadmap-skill-test__question')[questionIndex];
        const selected = form.querySelector('input[name="roadmap-test-' + CSS.escape(testId) + '-' + questionIndex + '"]:checked');
        const isMissing = !selected;
        fieldset?.classList.toggle('is-missing', isMissing);
        if (isMissing && !firstMissing) firstMissing = fieldset;
      });
      if (firstMissing) {
        firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      let score = 0;
      test.questions.forEach(function(question, questionIndex) {
        const selected = form.querySelector('input[name="roadmap-test-' + CSS.escape(testId) + '-' + questionIndex + '"]:checked');
        if (selected?.value === question.answer) score += 1;
      });
      const total = test.questions.length;
      const passed = score === total;
      localStorage.setItem(getTestKey(testId), JSON.stringify({
        passed,
        score,
        total,
        passedAt: passed ? new Date().toISOString() : null
      }));
      result.textContent = passed ? 'Готово: ' + score + ' из ' + total : 'Правильно: ' + score + ' из ' + total + '.';
      result.classList.toggle('is-passed', passed);
      applyResultState(form, test, testId);
      syncCatalogCards();
    });

    if (savedResult) applyResultState(form, test, testId);

    section.appendChild(form);
    return section;
  }

  function createCard(testId, index) {
    const test = tests[testId];
    const card = document.createElement('article');
    card.className = 'resource-card roadmap-block-test-card';
    card.dataset.testId = testId;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Открыть тест ' + test.title);

    const top = document.createElement('div');
    top.className = 'resource-top';
    const number = document.createElement('span');
    number.className = 'resource-number';
    number.textContent = index + 1;
    const type = document.createElement('span');
    type.className = 'resource-type';
    type.textContent = 'Тест';
    top.append(number, type);

    const title = document.createElement('div');
    title.className = 'resource-title';
    title.textContent = test.title;

    const main = document.createElement('div');
    main.className = 'resource-main-link';
    main.append(top, title);
    card.appendChild(main);

    function openCard() {
      const section = card.closest('.roadmap-tests-block');
      const frame = section?.querySelector('.roadmap-block-test-frame');
      if (!frame) return;
      const isSameOpen = card.classList.contains('is-active') && frame.classList.contains('is-open');
      if (isSameOpen) {
        card.classList.remove('is-active');
        frame.classList.remove('is-open');
        frame.replaceChildren();
        if (location.hash === '#test-' + encodeURIComponent(testId)) {
          history.replaceState(null, '', location.pathname + location.search);
        }
        return;
      }
      section.querySelectorAll('.roadmap-block-test-card.is-active').forEach(function(item) {
        item.classList.remove('is-active');
      });
      card.classList.add('is-active');
      frame.replaceChildren(createTest(testId));
      frame.classList.add('is-open');
      history.replaceState(null, '', '#test-' + encodeURIComponent(testId));
    }

    card.addEventListener('click', openCard);
    card.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openCard();
    });
    syncCardStatus(card);
    return card;
  }

  function syncCardStatus(card) {
    const testId = card.dataset.testId;
    const result = readResult(testId);
    card.classList.remove('is-passed', 'is-failed');
    if (result?.passed === true) {
      card.classList.add('is-passed');
    } else if (result) {
      card.classList.add('is-failed');
    }
  }

  function syncCatalogCards() {
    document.querySelectorAll('.roadmap-block-test-card[data-test-id]').forEach(syncCardStatus);
  }

  function renderCatalog() {
    const catalog = document.getElementById('roadmap-tests-catalog');
    if (!catalog) return;

    blocks.forEach(function(block) {
      const ids = (blockTestIds[block.id] || []).filter(function(testId) {
        return Boolean(tests[testId]);
      });
      if (!ids.length) return;

      const section = document.createElement('section');
      section.className = 'roadmap-card roadmap-tests-block';
      const title = document.createElement('h3');
      title.textContent = block.title;
      const grid = document.createElement('div');
      grid.className = 'plan-grid roadmap-resource-grid roadmap-block-test-links';
      ids.forEach(function(testId, index) {
        grid.appendChild(createCard(testId, index));
      });
      const frame = document.createElement('div');
      frame.className = 'roadmap-block-test-frame roadmap-tests-frame';
      frame.setAttribute('aria-live', 'polite');
      section.append(title, grid, frame);
      catalog.appendChild(section);
    });

    const initialId = decodeURIComponent((location.hash || '').replace(/^#test-/, ''));
    if (initialId && tests[initialId]) {
      document.querySelector('[data-test-id="' + CSS.escape(initialId) + '"]')?.click();
    }
  }

  document.addEventListener('DOMContentLoaded', renderCatalog);
})();
