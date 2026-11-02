/* Small, hidden carry-over note for chats that send only the latest turn. */
(() => {
  'use strict';
  const maxLength = 1200;
  const block = /<qa-memory>([\s\S]*?)<\/qa-memory>/gi;
  const titleBlock = /<qa-title>([\s\S]*?)<\/qa-title>/gi;
  const iconBlock = /<qa-icon>([\s\S]*?)<\/qa-icon>/gi;
  const nextBlock = /<qa-next>([\s\S]*?)<\/qa-next>/gi;
  const icons = new Set(['qa', 'sql', 'postgresql', 'api', 'docker', 'java', 'python', 'javascript', 'git', 'linux', 'web', 'test-design', 'bug', 'postman', 'swagger', 'kubernetes', 'ci-cd', 'interview', 'requirements', 'cases', 'automation', 'regression', 'security', 'performance', 'mobile', 'ui', 'testing', 'functional', 'integration', 'system', 'smoke', 'boundary', 'equivalence', 'decision-table', 'states', 'checklist']);

  function normalizeIcon(value) {
    const icon = String(value || '').trim().toLowerCase();
    return icons.has(icon) ? icon : '';
  }

  function normalize(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  const metaSuggestionPatterns = [
    /^(?:какой|какую|какие|какое)\s+(?:у\s+(?:тебя|вас)\s+)?(?:вопрос|тему|темы|задачу|задачи|проблему|проблемы)/i,
    /^(?:что|чем)\s+(?:ты|вы)?\s*(?:хочешь|хотите|хотел|хотела|хотелось|обсуд\w*|поговор\w*|занима\w*|изуча\w*|интересует|помочь|делать|делаешь|делаете)/i,
    /^(?:о\s+ч[её]м|про\s+что)\s+(?:поговор\w*|обсуд\w*|спрос\w*|рассказ\w*)/i,
    /^(?:как|чем)(?:\s+я)?(?:\s+могу)?\s+(?:тебе|вам)?\s*помочь(?:\s+(?:тебе|вам))?(?:\s+(?:сегодня|с\s+чем-то))?[\s?!.]*$/i,
    /^(?:что\s+(?:бы\s+)?ты\s+хотел|что\s+(?:бы\s+)?вы\s+хотели)/i,
    /^(?:на\s+какую|по\s+какой)\s+теме/i,
    /^(?:есть\s+ли\s+(?:у\s+(?:тебя|вас)\s+)?вопрос)/i,
    /^(?:что\s+дальше|как\s+продолжить|продолжим)/i,
    /^(?:готов[ыа]?\s+ли|хотите\s+ли|хочешь\s+ли|нужн[аоы]\s+ли)/i
  ];

  function isMetaSuggestion(value) {
    const text = normalize(value);
    return Boolean(text) && metaSuggestionPatterns.some(pattern => pattern.test(text));
  }

  const greeting = '(?:привет(?:ик)?|здравствуй(?:те)?|добр(?:ый|ое) (?:день|утро|вечер)|доброй ночи|хай|hello|hi|hey|good (?:morning|afternoon|evening))';
  const smallTalkCore = '(?:как дела|как ты|как настроение|как жизнь|что делаешь|что нового|как поживаешь|как у тебя дела|как твои дела|что происходит)';
  const smallTalkPatterns = [
    new RegExp(`^${greeting}[\\s!.,?]*$`, 'i'),
    new RegExp(`^${smallTalkCore}[\\s!.,?]*$`, 'i'),
    new RegExp(`^${greeting}[\\s!.,?]*${smallTalkCore}[\\s!.,?]*$`, 'i')
  ];

  function isSmallTalkQuestion(value) {
    const text = normalize(value);
    return Boolean(text) && smallTalkPatterns.some(pattern => pattern.test(text));
  }

  function normalizeTitle(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s#*`"«]+|[\s#*`"»]+$/g, '').trim().slice(0, 64);
  }

  function normalizeSuggestionList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.flatMap(item => {
      const text = String(item || '').replace(/<[^>]*>/g, ' ')
        .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
      const questions = text.match(/[^?？]+[?？]/g);
      return (questions?.length > 1 ? questions : [text])
        .map(question => question.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim().slice(0, 140));
    })
      .filter(item => item && !isMetaSuggestion(item)
        && !/^(?:готов[ыа] ли|хотите ли|хочешь ли|продолжим|есть ли (?:у вас|у тебя) вопросы|нужн[аоы] ли (?:вам |тебе )?(?:дополнительн[а-яё]* )?подсказк|как продолжить|что дальше)/i.test(item)))];
  }

  function normalizeSuggestions(value) {
    return normalizeSuggestionList(value).slice(0, 2);
  }

  function filterSuggestions(value, context = {}) {
    const question = normalizeText(context.question);
    const answer = normalizeText(context.answer);
    return normalizeSuggestionList(value).filter(item => {
      const text = normalizeText(item);
      if (!text) return false;
      if (question && text === question) return false;
      if (answer && text.length > 18 && answer.includes(text)) return false;
      return true;
    }).slice(0, 2);
  }

  function extractVisibleNext(answer) {
    const lines = answer.replace(/\r\n?/g, '\n').split('\n');
    let end = lines.length - 1;
    while (end >= 0 && !lines[end].trim()) end -= 1;
    const questions = [];
    let start = end;
    while (start >= 0) {
      if (questions.length && !lines[start].trim()) { start -= 1; continue; }
      const item = lines[start].match(/^\s*(?:[-*•]|\d+[.)])\s+(.+?)[ \t]*$/);
      if (!item || !/[?？]\s*$/.test(item[1])) break;
      questions.unshift(item[1]);
      start -= 1;
    }
    if (!questions.length || start < 0 ||
        !/^\s*(?:#{1,6}\s*)?(?:\*\*)?Следующие вопросы(?:\*\*)?:?\s*$/i.test(lines[start])) {
      return { answer, suggestions: [] };
    }
    while (start > 0 && !lines[start - 1].trim()) start -= 1;
    if (start > 0 && /^\s*-{3,}\s*$/.test(lines[start - 1])) start -= 1;
    return { answer: lines.slice(0, start).join('\n').trim(), suggestions: questions };
  }

  function extract(response, previousMemory = '', previousTitle = '', previousIcon = '') {
    const raw = String(response || '');
    const matches = [...raw.matchAll(block)];
    const titles = [...raw.matchAll(titleBlock)];
    const iconMatches = [...raw.matchAll(iconBlock)];
    const taggedSuggestions = [...raw.matchAll(nextBlock)].map(match => match[1]);
    const memory = matches.length ? normalize(matches.at(-1)[1]) : normalize(previousMemory);
    const title = normalizeTitle(titles.at(-1)?.[1]) || normalizeTitle(previousTitle);
    const icon = normalizeIcon(iconMatches.at(-1)?.[1]) || normalizeIcon(previousIcon);
    const visible = extractVisibleNext(raw.replace(block, '').replace(titleBlock, '').replace(iconBlock, '').replace(nextBlock, '')
      .replace(/<(?:qa-memory|qa-title|qa-icon|qa-next)>[\s\S]*$/i, '').trim());
    const suggestions = normalizeSuggestions([...taggedSuggestions, ...visible.suggestions]);
    return { answer: visible.answer, memory, title, icon, suggestions };
  }

  function withMemory(question, memory, title = '') {
    const note = normalize(memory);
    const chatTitle = normalizeTitle(title);
    if (!note && !chatTitle) return question;
    return window.QAtoDevAiPrompts.home.memoryQuestion(question, note, chatTitle);
  }

  window.QAtoDevConversationMemory = {
    normalize,
    normalizeTitle,
    normalizeIcon,
    normalizeSuggestions,
    filterSuggestions,
    isMetaSuggestion,
    isSmallTalkQuestion,
    extract,
    withMemory
  };
})();
