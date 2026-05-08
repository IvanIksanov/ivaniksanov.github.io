(function () {
  const STORAGE_KEY = 'qatodev_five_letters_state_v2';
  const STATS_KEY = 'qatodev_five_letters_stats_v1';
  const ALPHABET_RE = /[а-яё]/giu;
const dictionary = window.FIVE_LETTERS_DICTIONARY || { answers: [], allowed: [] };
const answers = dictionary.answers || [];
const allowed = new Set(dictionary.allowed || answers);
const HELPER_PRESENT_ROWS = 3;
const HELPER_EXCLUDED_ROWS = 4;

function createHelperColumns(rows) {
  return Array.from({ length: 5 }, () => Array(rows).fill(''));
}

  const defaultState = {
    mode: 'game',
    answer: '',
    guesses: [],
    currentGuess: '',
    startedAt: Date.now(),
    completedRecorded: false,
    helperOpenCount: 0,
    answerRevealed: false,
    finished: false,
    message: '',
    helperDetached: false,
    helper: {
      correct: ['', '', '', '', ''],
      present: createHelperColumns(HELPER_PRESENT_ROWS),
      excluded: createHelperColumns(HELPER_EXCLUDED_ROWS)
    }
  };

  const els = {
    tabs: Array.from(document.querySelectorAll('.five-tab')),
    panels: Array.from(document.querySelectorAll('.five-panel')),
    board: document.getElementById('five-board'),
    hiddenInput: document.getElementById('five-grid-input'),
    status: document.getElementById('five-game-status'),
    replayActions: document.getElementById('five-replay-actions'),
    playAgain: document.getElementById('five-play-again'),
    correctRow: document.getElementById('five-correct-row'),
    presentGrid: document.getElementById('five-present-grid'),
    excludedGrid: document.getElementById('five-excluded-grid'),
    clearHelper: document.getElementById('five-clear-helper'),
    candidatesHead: document.getElementById('five-candidates-head'),
    candidates: document.getElementById('five-candidates'),
    count: document.getElementById('five-candidates-count'),
    candidatesNote: document.getElementById('five-candidates-note'),
    probesWrap: document.getElementById('five-probes-wrap'),
    probes: document.getElementById('five-probes'),
    leaderboard: document.getElementById('five-leaderboard'),
    history: document.getElementById('five-history')
  };

  let state = loadState();
  let hintTimer = 0;
  let suppressFocusHintUntil = 0;
  const revealedCandidateKeys = new Set();

  function resetCandidateReveals() {
    revealedCandidateKeys.clear();
  }

  function getCandidateRevealKey(word, index) {
    return `${index}:${word}`;
  }

  function normalizeWord(value) {
    return (value || '').toLowerCase().replace(/ё/g, 'е').match(ALPHABET_RE)?.join('').slice(0, 5) || '';
  }

  function normalizeLetters(value) {
    return Array.from(new Set(((value || '').toLowerCase().replace(/ё/g, 'е').match(ALPHABET_RE) || []))).join('');
  }

  function normalizeHelperColumns(value, rows) {
    const columns = createHelperColumns(rows);

    if (Array.isArray(value)) {
      value.slice(0, 5).forEach((cell, index) => {
        const letters = Array.isArray(cell)
          ? cell.map((letter) => normalizeWord(letter).slice(0, 1))
          : normalizeLetters(cell || '').split('');

        letters.slice(0, rows).forEach((letter, rowIndex) => {
          columns[index][rowIndex] = letter;
        });
      });

      return columns;
    }

    normalizeLetters(value || '')
      .split('')
      .slice(0, rows * 5)
      .forEach((letter, offset) => {
        const index = offset % 5;
        const rowIndex = Math.floor(offset / 5);

        if (rowIndex < rows) {
          columns[index][rowIndex] = letter;
        }
      });

    return columns;
  }

  function getHelperColumnLetters(type, index) {
    return (state.helper[type][index] || []).filter(Boolean);
  }

  function getAllHelperLetters(type) {
    return normalizeLetters(
      state.helper[type]
        .flat()
        .filter(Boolean)
        .join('')
    );
  }

  function serializeHelperColumns(columns) {
    return columns.map((letters) => (letters || []).join('')).join('|');
  }

  function addHelperColumnLetter(columns, index, letter, limit) {
    if (!letter || columns[index].includes(letter)) return;

    const emptyIndex = columns[index].indexOf('');

    if (emptyIndex >= 0 && emptyIndex < limit) {
      columns[index][emptyIndex] = letter;
    }
  }

  function pickAnswer() {
    const daySeed = Math.floor(Date.now() / 86400000);
    const randomSeed = Math.floor(Math.random() * Math.max(answers.length, 1));
    return answers[(daySeed + randomSeed) % answers.length] || 'слово';
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const merged = { ...defaultState, ...(saved || {}) };
      merged.helper = { ...defaultState.helper, ...(saved?.helper || {}) };
      if (!Array.isArray(merged.helper.correct)) {
        merged.helper.correct = ['', '', '', '', ''];
      }
      if (!Array.isArray(merged.helper.present)) {
        const oldIncluded = normalizeLetters(merged.helper.included || '');
        merged.helper.present = ['', '', '', '', ''];
        merged.helper.present[0] = oldIncluded;
        delete merged.helper.included;
      }
      merged.helper.correct = Array.from({ length: 5 }, (_, index) => normalizeWord(merged.helper.correct[index] || ''));
      merged.helper.present = normalizeHelperColumns(merged.helper.present, HELPER_PRESENT_ROWS);
      merged.helper.excluded = normalizeHelperColumns(merged.helper.excluded, HELPER_EXCLUDED_ROWS);
      merged.currentGuess = normalizeWord(merged.currentGuess);
      if (!Number.isFinite(merged.startedAt)) merged.startedAt = Date.now();
      merged.completedRecorded = Boolean(merged.completedRecorded);
      merged.helperOpenCount = Number.isFinite(merged.helperOpenCount) ? merged.helperOpenCount : 0;
      merged.answerRevealed = Boolean(merged.answerRevealed);
      merged.helperDetached = Boolean(merged.helperDetached);
      if (!answers.includes(merged.answer)) merged.answer = pickAnswer();
      return merged;
    } catch {
      return { ...defaultState, answer: pickAnswer() };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadStats() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      return {
        leaderboard: Array.isArray(parsed?.leaderboard) ? parsed.leaderboard : [],
        history: Array.isArray(parsed?.history) ? parsed.history : []
      };
    } catch {
      return { leaderboard: [], history: [] };
    }
  }

  function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function scoreGuess(guess, answer) {
    const result = Array(5).fill('absent');
    const rest = answer.split('');
    guess.split('').forEach((letter, index) => {
      if (letter === answer[index]) {
        result[index] = 'correct';
        rest[index] = '';
      }
    });
    guess.split('').forEach((letter, index) => {
      if (result[index] === 'correct') return;
      const found = rest.indexOf(letter);
      if (found >= 0) {
        result[index] = 'present';
        rest[found] = '';
      }
    });
    return result;
  }

  function getRowWord(index) {
    if (state.guesses[index]) return state.guesses[index];
    if (!state.finished && index === state.guesses.length) return state.currentGuess;
    return '';
  }

  function renderBoard() {
    els.board.innerHTML = '';
    for (let rowIndex = 0; rowIndex < 6; rowIndex += 1) {
      const guess = getRowWord(rowIndex);
      const row = document.createElement('div');
      row.className = 'five-board-row';
      const score = state.guesses[rowIndex] ? scoreGuess(guess, state.answer) : [];
      const isWinningRow = state.guesses[rowIndex] === state.answer;
      for (let index = 0; index < 5; index += 1) {
        const cell = document.createElement('div');
        cell.className = 'five-cell';
        const letter = guess[index] || '';
        cell.textContent = letter;
        if (letter) cell.classList.add('is-filled');
        if (isWinningRow) cell.classList.add('is-win');
        if (score[index]) {
          cell.classList.add(`is-${score[index]}`);
          applyCellHint(cell, score[index], isWinningRow);
        }
        row.appendChild(cell);
      }
      els.board.appendChild(row);
    }
    els.status.textContent = state.message || '';
    els.hiddenInput.disabled = state.finished;
    els.hiddenInput.value = state.currentGuess;
    els.replayActions.hidden = !state.finished;
    renderStats();
  }

  function applyCellHint(cell, score, isWinningRow) {
    let hint = '';
    if (isWinningRow || score === 'correct') {
      hint = 'Буква на своём месте';
    } else if (score === 'present') {
      hint = 'Буква есть в слове';
    }
    if (!hint) return;
    cell.tabIndex = 0;
    cell.title = hint;
    cell.dataset.hint = hint;
    cell.setAttribute('aria-label', `${cell.textContent || 'Буква'}: ${hint}`);
  }

  function showCellHint(cell) {
    const hint = cell?.dataset?.hint;
    if (!hint) return;
    let bubble = document.querySelector('.five-cell-hint');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'five-cell-hint';
      bubble.setAttribute('role', 'status');
      document.body.appendChild(bubble);
    }
    bubble.textContent = hint;
    bubble.classList.add('is-visible');
    const rect = cell.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const top = Math.max(8, rect.top + window.scrollY - bubbleRect.height - 8);
    const left = Math.min(
      window.scrollX + window.innerWidth - bubbleRect.width - 8,
      Math.max(8, rect.left + window.scrollX + rect.width / 2 - bubbleRect.width / 2)
    );
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      bubble.classList.remove('is-visible');
      suppressFocusHintUntil = Date.now() + 350;
    }, 1500);
  }

  function submitGuess() {
    if (state.finished) return;
    const guess = normalizeWord(state.currentGuess);
    if (guess.length !== 5) {
      state.message = 'Нужно пять русских букв.';
    } else if (!allowed.has(guess)) {
      state.message = 'Такого слова нет в локальном словаре тренажера.';
    } else {
      state.guesses.push(guess);
      state.currentGuess = '';
      if (guess === state.answer) {
        finishGame(true);
      } else if (state.guesses.length >= 6) {
        finishGame(false);
      } else {
        state.message = '';
      }
    }
    saveState();
    renderBoard();
  }

  function finishGame(success) {
    state.finished = true;
    const durationMs = Math.max(0, Date.now() - state.startedAt);
    if (success) {
      state.message = `Поздравляю! ${state.answer.toUpperCase()} отгадано за ${formatDuration(durationMs)} и ${state.guesses.length} ${plural(state.guesses.length, ['попытку', 'попытки', 'попыток'])}.`;
    } else {
      state.message = `Попытки закончились. Ответ: ${state.answer.toUpperCase()}.`;
    }
    recordResult(success, durationMs);
    resetHelperConditions();
  }

  function resetHelperConditions() {
    state.helper = {
      correct: ['', '', '', '', ''],
      present: createHelperColumns(HELPER_PRESENT_ROWS),
      excluded: createHelperColumns(HELPER_EXCLUDED_ROWS)
    };
    state.helperDetached = false;
    renderHelperInputs();
    renderCandidates();
  }

  function recordResult(success, durationMs) {
    if (state.completedRecorded) return;
    state.completedRecorded = true;
    const result = {
      id: `${Date.now()}:${state.answer}:${state.guesses.length}`,
      word: state.answer,
      success,
      attempts: state.guesses.length,
      durationMs,
      helperOpenCount: state.helperOpenCount || 0,
      answerRevealed: Boolean(state.answerRevealed),
      completedAt: Date.now()
    };
    const stats = loadStats();
    stats.history = [result, ...stats.history].slice(0, 30);
    if (success && !result.helperOpenCount) {
      stats.leaderboard = [...stats.leaderboard, result]
        .sort(compareResults)
        .slice(0, 5);
    }
    saveStats(stats);
  }

  function handleTyping(event) {
    if (state.mode !== 'game' || state.finished) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      submitGuess();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      state.currentGuess = state.currentGuess.slice(0, -1);
      state.message = '';
      saveState();
      renderBoard();
      return;
    }
    const letter = normalizeWord(event.key);
    if (!letter) return;
    event.preventDefault();
    state.currentGuess = normalizeWord(state.currentGuess + letter);
    state.message = '';
    saveState();
    renderBoard();
  }

  function renderHelperInputs() {
    els.correctRow.innerHTML = '';
    els.presentGrid.innerHTML = '';
    els.excludedGrid.innerHTML = '';

    renderPresentRows();
    renderHelperRow(els.correctRow, 'correct', 'Буква на своём месте', normalizeWord);
    renderExcludedRows();
  }

  function renderExcludedRows() {
    for (let rowIndex = 0; rowIndex < HELPER_EXCLUDED_ROWS; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'five-helper-row five-helper-row--excluded';
      row.dataset.excludedRow = String(rowIndex);

      renderHelperRow(
        row,
        'excluded',
        'Буква исключена',
        normalizeWord,
        rowIndex
      );

      els.excludedGrid.appendChild(row);
    }
  }

  function renderPresentRows() {
    for (let rowIndex = 0; rowIndex < HELPER_PRESENT_ROWS; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'five-helper-row five-helper-row--present';
      row.dataset.presentRow = String(rowIndex);

      renderHelperRow(
        row,
        'present',
        'Буква есть в слове, но не на этом месте',
        normalizeWord,
        rowIndex
      );

      els.presentGrid.appendChild(row);
    }
  }

  function renderHelperRow(row, type, label, normalizer, presentRowIndex = 0) {
    for (let index = 0; index < 5; index += 1) {
      const input = document.createElement('input');
      input.maxLength = 1;
      input.inputMode = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = getHelperCell(type, index, presentRowIndex);
      input.className = `five-helper-tile five-helper-tile--${type}`;
      input.classList.toggle('has-value', Boolean(input.value));
      input.setAttribute('aria-label', `${label}, позиция ${index + 1}`);

      input.addEventListener('input', () => {
        state.helperDetached = true;
        resetCandidateReveals();

        const value = normalizer(input.value).slice(0, 1);
        setHelperCell(type, index, value, presentRowIndex);

        input.value = getHelperCell(type, index, presentRowIndex);
        input.classList.toggle('has-value', Boolean(input.value));

        saveState();
        renderCandidates();

        if (input.value) {
          const inputs = Array.from(row.querySelectorAll('input'));
          inputs[Math.min(index + 1, inputs.length - 1)]?.focus();
        }
      });

      input.addEventListener('paste', (event) => handleHelperGridPaste(event, type, index, presentRowIndex));
      input.addEventListener('keydown', (event) => handleHelperGridKeydown(event, type, index, presentRowIndex));

      row.appendChild(input);
    }
  }

  function getHelperCell(type, index, rowIndex = 0) {
    if (type === 'present' || type === 'excluded') {
      return state.helper[type][index]?.[rowIndex] || '';
    }

    return state.helper[type][index] || '';
  }

  function setHelperCell(type, index, value, rowIndex = 0) {
    const letter = normalizeWord(value).slice(0, 1);

    if (type === 'present' || type === 'excluded') {
      state.helper[type][index][rowIndex] = letter;
      return;
    }

    state.helper[type][index] = letter;
  }

  function getHelperInputRow(type, rowIndex = 0) {
    if (type === 'correct') return els.correctRow;

    if (type === 'present') {
      return els.presentGrid.querySelector(`[data-present-row="${rowIndex}"]`);
    }

    return els.excludedGrid.querySelector(`[data-excluded-row="${rowIndex}"]`);
  }

  function handleHelperGridPaste(event, type, index, presentRowIndex = 0) {
    const pasted = normalizeWord(event.clipboardData?.getData('text') || '');
    if (!pasted) return;

    event.preventDefault();
    state.helperDetached = true;
    resetCandidateReveals();

    pasted.split('').forEach((letter, offset) => {
      const targetIndex = index + offset;

      if (targetIndex < 5) {
        setHelperCell(type, targetIndex, letter, presentRowIndex);
      }
    });

    saveState();
    renderHelperInputs();
    renderCandidates();

    const row = getHelperInputRow(type, presentRowIndex);
    row?.querySelectorAll('input')[Math.min(index + pasted.length, 4)]?.focus();
  }

  function moveHelperFocus(type, index, rowIndex, rowDelta, indexDelta) {
    const nextIndex = Math.min(4, Math.max(0, index + indexDelta));

    if (type === 'excluded') {
      const nextRowIndex = Math.min(
        HELPER_EXCLUDED_ROWS - 1,
        Math.max(0, rowIndex + rowDelta)
      );

      getHelperInputRow('excluded', nextRowIndex)
        ?.querySelectorAll('input')
        ?.[nextIndex]
        ?.focus();

      return;
    }

    const currentVisualRow = type === 'correct' ? HELPER_PRESENT_ROWS : rowIndex;
    const nextVisualRow = Math.min(
      HELPER_PRESENT_ROWS,
      Math.max(0, currentVisualRow + rowDelta)
    );

    const nextType = nextVisualRow === HELPER_PRESENT_ROWS ? 'correct' : 'present';
    const nextRowIndex = nextType === 'correct' ? 0 : nextVisualRow;

    getHelperInputRow(nextType, nextRowIndex)
      ?.querySelectorAll('input')
      ?.[nextIndex]
      ?.focus();
  }

  function handleHelperGridKeydown(event, type, index, rowIndex = 0) {
    const row = getHelperInputRow(type, rowIndex);
    const inputs = Array.from(row?.querySelectorAll('input') || []);

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveHelperFocus(type, index, rowIndex, 0, -1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveHelperFocus(type, index, rowIndex, 0, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHelperFocus(type, index, rowIndex, -1, 0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHelperFocus(type, index, rowIndex, 1, 0);
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      inputs[Math.min(index + 1, inputs.length - 1)]?.focus();
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      state.helperDetached = true;
      resetCandidateReveals();

      if (type === 'correct') {
        state.helper.correct = ['', '', '', '', ''];
      } else if (type === 'present') {
        state.helper.present = createHelperColumns(HELPER_PRESENT_ROWS);
      } else if (type === 'excluded') {
        state.helper.excluded = createHelperColumns(HELPER_EXCLUDED_ROWS);
      }

      saveState();
      renderHelperInputs();
      renderCandidates();

      getHelperInputRow(type, rowIndex)?.querySelector('input')?.focus();
      return;
    }

    if (event.key === 'Backspace' && !getHelperCell(type, index, rowIndex)) {
      event.preventDefault();
      inputs[Math.max(index - 1, 0)]?.focus();
    }
  }

  function candidateMatches(word) {
    for (let index = 0; index < 5; index += 1) {
      const correct = state.helper.correct[index];

      if (correct && word[index] !== correct) return false;

      for (const present of getHelperColumnLetters('present', index)) {
        if (!word.includes(present) || word[index] === present) return false;
      }
    }

    const knownPresent = state.helper.correct.join('') + getAllHelperLetters('present');

    for (const letter of getAllHelperLetters('excluded')) {
      if (word.includes(letter) && !knownPresent.includes(letter)) return false;
    }

    return true;
  }

  function renderCandidates() {
    const candidates = (dictionary.allowed || []).filter(candidateMatches);
    const hasFilters = helperHasFilters();
    const shouldShowCandidates = hasFilters && candidates.length <= 10;
    const hiddenCount = Math.min(3, candidates.length);

    els.candidatesHead.hidden = !shouldShowCandidates;
    els.candidates.hidden = !shouldShowCandidates;
    els.count.textContent = `${candidates.length} ${plural(candidates.length, ['вариант', 'варианта', 'вариантов'])}`;

    els.candidatesNote.textContent = hiddenCount === 1
      ? 'В нашем словаре нашелся ответ. Нажми, чтобы открыть.'
      : `${hiddenCount} ${plural(hiddenCount, ['плашка скрыта', 'плашки скрыты', 'плашек скрыто'])}, чтобы не спойлерить подбор.`;

    els.candidates.innerHTML = '';

    if (shouldShowCandidates) {
      candidates.forEach((word, index) => {
        if (index < hiddenCount) {
          renderHiddenCandidate(word, index);
          return;
        }

        const chip = document.createElement('span');
        chip.className = 'five-word-chip';
        chip.textContent = word;
        els.candidates.appendChild(chip);
      });
    }

    renderProbes(candidates, hasFilters);
  }

  function renderHiddenCandidate(word, index) {
    const key = getCandidateRevealKey(word, index);
    const isRevealed = revealedCandidateKeys.has(key);

    const answer = document.createElement('button');
    answer.className = 'five-word-chip five-answer-reveal';
    answer.type = 'button';
    answer.setAttribute('aria-expanded', String(isRevealed));
    answer.textContent = isRevealed ? word : '?????';

    answer.addEventListener('click', () => {
      if (revealedCandidateKeys.has(key)) {
        revealedCandidateKeys.delete(key);
      } else {
        revealedCandidateKeys.add(key);
        state.answerRevealed = true;
        saveState();
      }

      renderCandidates();
    });

    els.candidates.appendChild(answer);
  }

  function helperHasFilters() {
    return Boolean(
      state.helper.correct.join('') ||
      getAllHelperLetters('present') ||
      getAllHelperLetters('excluded')
    );
  }

  function getKnownLetters() {
    return new Set(
      (
        state.helper.correct.join('') +
        getAllHelperLetters('present') +
        getAllHelperLetters('excluded')
      )
        .split('')
        .filter(Boolean)
    );
  }

  function scoreProbeWord(word, knownLetters, candidateSet) {
    const letters = word.split('');
    const unique = new Set(letters);
    const freshUnique = Array.from(unique).filter((letter) => !knownLetters.has(letter)).length;
    const knownUnique = unique.size - freshUnique;
    const repeatedCount = letters.length - unique.size;
    const knownHits = letters.filter((letter) => knownLetters.has(letter)).length;
    const isCandidate = candidateSet.has(word) ? 1 : 0;
    return {
      word,
      freshUnique,
      uniqueCount: unique.size,
      repeatedCount,
      knownHits,
      knownUnique,
      isCandidate
    };
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function getProbeSeed(hasFilters) {
    if (hasFilters) {
      return [
        state.helper.correct.join(''),
        serializeHelperColumns(state.helper.present),
        serializeHelperColumns(state.helper.excluded)
      ].join(':');
    }

    const bucket = Math.floor(Date.now() / 600000);
    return `${state.answer}:${state.startedAt}:${bucket}`;
  }

  function renderProbes(candidates, hasFilters) {
    els.probesWrap.hidden = false;
    els.probes.innerHTML = '';

    const knownLetters = getKnownLetters();
    const candidateSet = new Set(candidates);
    const scoredProbes = (dictionary.allowed || [])
      .map((word) => scoreProbeWord(word, knownLetters, candidateSet))
      .filter((probe) => probe.freshUnique > 0)
      .sort((a, b) => (
        b.freshUnique - a.freshUnique ||
        a.knownHits - b.knownHits ||
        b.uniqueCount - a.uniqueCount ||
        a.repeatedCount - b.repeatedCount ||
        a.isCandidate - b.isCandidate ||
        a.knownUnique - b.knownUnique ||
        stableHash(`${getProbeSeed(hasFilters)}:${a.word}`) - stableHash(`${getProbeSeed(hasFilters)}:${b.word}`)
      ));
    const probes = selectDiverseProbes(scoredProbes, knownLetters, 9, getProbeSeed(hasFilters));

    probes.forEach((probe) => {
      const chip = document.createElement('span');
      chip.className = 'five-word-chip five-word-chip--probe';
      chip.textContent = probe.word;
      chip.title = `${probe.freshUnique} ${plural(probe.freshUnique, ['новая буква', 'новые буквы', 'новых букв'])}`;
      els.probes.appendChild(chip);
    });
  }

  function selectDiverseProbes(scoredProbes, knownLetters, limit, seed) {
    const selected = [];
    const used = new Set(knownLetters);
    const pool = [...scoredProbes];
    while (selected.length < limit && pool.length) {
      pool.sort((a, b) => {
        const aNew = new Set(a.word.split('').filter((letter) => !used.has(letter))).size;
        const bNew = new Set(b.word.split('').filter((letter) => !used.has(letter))).size;
        return (
          bNew - aNew ||
          b.freshUnique - a.freshUnique ||
          a.knownHits - b.knownHits ||
          b.uniqueCount - a.uniqueCount ||
          a.repeatedCount - b.repeatedCount ||
          a.isCandidate - b.isCandidate ||
          stableHash(`${seed}:${a.word}`) - stableHash(`${seed}:${b.word}`)
        );
      });
      const next = pool.shift();
      selected.push(next);
      next.word.split('').forEach((letter) => used.add(letter));
    }
    return selected;
  }

  function plural(number, forms) {
    const n = Math.abs(number) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }

  function compareResults(a, b) {
    return a.attempts - b.attempts || a.durationMs - b.durationMs || a.completedAt - b.completedAt;
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds} сек`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function createEmptyNote(text) {
    const note = document.createElement('p');
    note.className = 'five-results-empty';
    note.textContent = text;
    return note;
  }

  function createResultRow(result, index) {
    const row = document.createElement(index == null ? 'div' : 'li');
    row.className = 'five-result-row';

    const word = document.createElement('span');
    word.className = `five-result-word ${result.success ? 'is-success' : 'is-fail'}`;
    word.textContent = result.word;
    applyInlineHint(word, result.success ? 'Слово угадано' : 'Слово не угадано');

    const meta = document.createElement('span');
    meta.className = 'five-result-meta';
    const prefix = index == null ? '' : `#${index + 1} · `;
    meta.textContent = `${prefix}${result.attempts} ${plural(result.attempts, ['попытка', 'попытки', 'попыток'])} · ${formatDuration(result.durationMs)}`;

    row.append(word, meta);
    if (index == null && result.helperOpenCount > 0) {
      const helperCount = document.createElement('span');
      helperCount.className = `five-helper-count ${result.answerRevealed ? 'is-answer' : 'is-probe'}`;
      helperCount.textContent = result.answerRevealed ? '!' : String(result.helperOpenCount || 0);
      const hint = result.answerRevealed ? 'Открыт ответ' : 'Открыт помощник';
      applyInlineHint(helperCount, hint);
      row.appendChild(helperCount);
    }
    return row;
  }

  function applyInlineHint(element, hint) {
    element.tabIndex = 0;
    element.title = hint;
    element.dataset.hint = hint;
    element.setAttribute('aria-label', hint);
  }

  function renderStats() {
    const stats = loadStats();
    els.leaderboard.innerHTML = '';
    els.history.innerHTML = '';

    if (!stats.leaderboard.length) {
      els.leaderboard.appendChild(createEmptyNote('Пока нет побед.'));
    } else {
      stats.leaderboard.sort(compareResults).slice(0, 5).forEach((result, index) => {
        els.leaderboard.appendChild(createResultRow(result, index));
      });
    }

    if (!stats.history.length) {
      els.history.appendChild(createEmptyNote('История появится после первой завершенной игры.'));
    } else {
      stats.history.slice(0, 12).forEach((result) => {
        els.history.appendChild(createResultRow(result));
      });
    }
  }

  function setMode(mode) {
    const previousMode = state.mode;
    state.mode = mode;
    if (mode === 'helper') {
      if (previousMode !== 'helper' && !state.finished) {
        state.helperOpenCount = (state.helperOpenCount || 0) + 1;
      }
      syncHelperFromGame();
    }
    saveState();
    els.tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    els.panels.forEach((panel) => {
      const active = panel.id === `five-panel-${mode}`;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    if (mode === 'game') focusGrid();
  }

  function startNewGame(message = 'Новое слово выбрано. Можно начинать.') {
    state.answer = pickAnswer();
    state.guesses = [];
    state.currentGuess = '';
    state.startedAt = Date.now();
    state.completedRecorded = false;
    state.helperOpenCount = 0;
    state.answerRevealed = false;
    state.helperDetached = false;
    resetCandidateReveals();
    state.finished = false;
    state.message = message;
    resetHelperConditions();
    saveState();
    renderBoard();
    focusGrid();
  }

  function syncHelperFromGame() {
    if (state.helperDetached) {
      renderHelperInputs();
      renderCandidates();
      return;
    }

    if (!state.guesses.length) {
      renderHelperInputs();
      renderCandidates();
      return;
    }

    const helper = {
      correct: ['', '', '', '', ''],
      present: createHelperColumns(HELPER_PRESENT_ROWS),
      excluded: createHelperColumns(HELPER_EXCLUDED_ROWS)
    };

    state.guesses.forEach((guess) => {
      const score = scoreGuess(guess, state.answer);

      guess.split('').forEach((letter, index) => {
        if (score[index] === 'correct') {
          helper.correct[index] = letter;
        } else if (score[index] === 'present') {
          addHelperColumnLetter(helper.present, index, letter, HELPER_PRESENT_ROWS);
        } else if (score[index] === 'absent') {
          addHelperColumnLetter(helper.excluded, index, letter, HELPER_EXCLUDED_ROWS);
        }
      });
    });

    state.helper = helper;
    renderHelperInputs();
    renderCandidates();
  }

  function focusGrid() {
    window.setTimeout(() => {
      if (!state.finished) els.hiddenInput.focus({ preventScroll: true });
    }, 0);
  }

  els.board.addEventListener('click', focusGrid);
  els.board.addEventListener('pointerup', (event) => {
    const cell = event.target.closest('.five-cell[data-hint]');
    if (cell) {
      suppressFocusHintUntil = Date.now() + 350;
      showCellHint(cell);
    }
  });
  els.board.addEventListener('focusin', (event) => {
    if (Date.now() < suppressFocusHintUntil) return;
    const cell = event.target.closest('.five-cell[data-hint]');
    if (cell) showCellHint(cell);
  });
  document.addEventListener('pointerup', (event) => {
    const target = event.target.closest('.five-result-word[data-hint], .five-helper-count[data-hint]');
    if (target) {
      suppressFocusHintUntil = Date.now() + 350;
      showCellHint(target);
    }
  });
  document.addEventListener('focusin', (event) => {
    if (Date.now() < suppressFocusHintUntil) return;
    const target = event.target.closest('.five-result-word[data-hint], .five-helper-count[data-hint]');
    if (target) showCellHint(target);
  });
  els.board.addEventListener('keydown', handleTyping);
  els.hiddenInput.addEventListener('keydown', handleTyping);
  els.hiddenInput.addEventListener('input', () => {
    state.currentGuess = normalizeWord(els.hiddenInput.value);
    state.message = '';
    saveState();
    renderBoard();
  });
  els.tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  els.playAgain.addEventListener('click', () => startNewGame(''));

  els.clearHelper.addEventListener('click', () => {
    state.helperDetached = true;
    resetCandidateReveals();
    state.helper = {
      correct: ['', '', '', '', ''],
      present: createHelperColumns(HELPER_PRESENT_ROWS),
      excluded: createHelperColumns(HELPER_EXCLUDED_ROWS)
    };
    saveState();
    renderHelperInputs();
    renderCandidates();
  });

  renderBoard();
  renderHelperInputs();
  renderCandidates();
  setMode(state.mode || 'game');
})();
