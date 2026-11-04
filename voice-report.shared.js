/* Отчёты голосовых собеседований: локальная очередь + фоновая обработка. */
(function (root) {
  'use strict';
  if (root.QAtoDevVoiceReport) return;
  const api = {};

  const QUEUE_KEY = 'qatodev_voice_report_jobs_v1';
  const HISTORY_KEY = 'interview_history_v1';
  const HISTORY_LIMIT = 50;
  const DEFAULT_MODEL = 'openai/gpt-oss-20b';
  const SUPABASE_URL = 'https://mbebpfbmnojlaggdroum.supabase.co';
  const FUNCTIONS_BASE = 'https://mbebpfbmnojlaggdroum.functions.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_T3nVktglpWOrhAtjsYQggw_2ywfFs8C';

  let promptsPromise = null;

  function readJson(key, fallback) {
    try {
      const raw = root.localStorage?.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      root.localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function readQueue() {
    const list = readJson(QUEUE_KEY, []);
    return Array.isArray(list) ? list.filter(job => job && job.id) : [];
  }

  function writeQueue(list) {
    writeJson(QUEUE_KEY, (Array.isArray(list) ? list : []).slice(-10));
  }

  function readHistory() {
    const list = readJson(HISTORY_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function writeHistory(list) {
    writeJson(HISTORY_KEY, (Array.isArray(list) ? list : []).slice(0, HISTORY_LIMIT));
  }

  function ensurePrompts() {
    if (root.QAtoDevAiPrompts?.interview?.voiceAnalysis) return Promise.resolve();
    if (promptsPromise) return promptsPromise;
    promptsPromise = new Promise((resolve, reject) => {
      if (root.QAtoDevAiPrompts?.interview?.voiceAnalysis) {
        resolve();
        return;
      }
      const script = root.document.createElement('script');
      script.src = 'ai-prompts.shared.js?v=1.0.14';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Не удалось загрузить промпты отчёта.'));
      root.document.head.appendChild(script);
    }).finally(() => { promptsPromise = null; });
    return promptsPromise;
  }

  function parseAiJson(raw) {
    let text = String(raw || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI JSON not found');
    return JSON.parse(text.slice(start, end + 1));
  }

  function stringList(value, limit = 5) {
    return Array.isArray(value)
      ? value.map(item => String(item || '').trim()).filter(Boolean).slice(0, limit)
      : [];
  }

  function normalizeAnalysis(raw) {
    const rawScore = raw?.score;
    const score = rawScore === null || rawScore === undefined || rawScore === '' ? NaN : Number(rawScore);
    const allowed = new Set(['good', 'partial', 'weak', 'skipped', 'unknown']);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
      verdict: allowed.has(raw?.verdict) ? raw.verdict : 'unknown',
      summary: String(raw?.summary || '').slice(0, 600),
      strengths: stringList(raw?.strengths),
      gaps: stringList(raw?.gaps),
      improvedAnswer: String(raw?.improvedAnswer || '').slice(0, 1200),
      cleanedAnswer: String(raw?.cleanedAnswer || '').slice(0, 1200)
    };
  }

  async function getHeaders() {
    const store = root.AppSupabase;
    const headers = {
      apikey: store?.anonKey || SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    try {
      const session = store?.getSession ? await store.getSession() : null;
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch {}
    return headers;
  }

  async function callAi(body) {
    const urls = Array.from(new Set([
      `${FUNCTIONS_BASE}/ai-chat`,
      `${root.AppSupabase?.url || SUPABASE_URL}/functions/v1/ai-chat`
    ]));
    let lastError = null;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        const res = await fetch(urls[i], {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty AI answer');
        return content;
      } catch (error) {
        lastError = error;
        if (i === urls.length - 1) throw error;
      }
    }
    throw lastError || new Error('AI request failed');
  }

  async function requestAnalysis(answer) {
    await ensurePrompts();
    const prompts = root.QAtoDevAiPrompts.interview;
    const content = await callAi({
      provider: 'groq',
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: prompts.voiceAnalysisSystem },
        {
          role: 'user',
          content: prompts.voiceAnalysis({
            category: answer.categoryLabel || answer.category,
            title: answer.title,
            referenceAnswer: answer.referenceAnswer || '',
            transcript: answer.transcript || '',
            durationSeconds: answer.durationSeconds,
            status: answer.status
          })
        }
      ],
      temperature: 0.2,
      stream: false
    });
    return normalizeAnalysis(parseAiJson(content));
  }

  const ASR_CREDIT_MARKER = /(редактор\s+субтитров|корректор\s*:?\s*[А-ЯЁA-Z]|субтитры\s+(?:подготовлены|сделаны|созданы|переведены))/i;

  const ASR_ARTIFACT_PATTERNS = [
    /рекомендуемые\s+данные[^\n]*/gi,
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /продолжение\s+следует[.!…]*/gi,
    /подписывайтесь\s+на\s+канал[^.!?\n]*/gi,
    /спасибо\s+за\s+внимание[.!?]*/gi,
    /до\s+новых\s+встреч[.!?]*/gi,
  ];

  function sanitizeTranscript(value) {
    let text = String(value || '');
    const creditIndex = text.search(ASR_CREDIT_MARKER);
    if (creditIndex >= 0) text = text.slice(0, creditIndex);
    ASR_ARTIFACT_PATTERNS.forEach((pattern) => {
      text = text.replace(pattern, ' ');
    });
    return text.replace(/\s{2,}/g, ' ').trim();
  }

  function isShortTranscript(value) {
    const text = sanitizeTranscript(value);
    if (!text) return true;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 4 || text.length < 18) return true;
    const normalized = text.toLowerCase().replace(/[.,!?…]/g, ' ').replace(/\s+/g, ' ').trim();
    return /^(не знаю|не помню|не уверен|не уверена|сложно сказать|затрудняюсь ответить|не могу ответить)(?:\s|$)/.test(normalized);
  }

  function wordsForEcho(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2);
  }

  function isQuestionEcho(answer, question) {
    const answerWords = wordsForEcho(answer);
    const questionWords = wordsForEcho(question);
    if (answerWords.length < 3 || questionWords.length < 3) return false;
    const questionSet = new Set(questionWords);
    const overlap = answerWords.filter((word) => questionSet.has(word)).length;
    const ratio = overlap / answerWords.length;
    return ratio >= 0.75 && answerWords.length <= questionWords.length + 4;
  }

  function answerHasSpeech(answer) {
    return answer.status === 'accepted'
      && !answer.shortAnswer
      && !answer.echoQuestion
      && !isShortTranscript(answer.transcript);
  }

  async function requestReportSummary(report) {
    await ensurePrompts();
    const prompts = root.QAtoDevAiPrompts.interview;
    const evaluatedCategories = report.categories
      .map(category => ({
        ...category,
        questions: category.questions.filter(question =>
          answerHasSpeech(question) && Number.isFinite(Number(question.analysis?.score))
        )
      }))
      .filter(category => category.questions.length > 0 && Number.isFinite(category.score));
    const questions = evaluatedCategories.flatMap(category =>
      category.questions.map(question => ({
        category: category.label,
        title: question.title,
        answered: true,
        score: Number(question.analysis.score),
        verdict: question.analysis?.verdict || 'unknown',
        summary: String(question.analysis?.summary || '').slice(0, 300)
      }))
    );
    const content = await callAi({
      provider: 'groq',
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: prompts.voiceReportSystem },
        {
          role: 'user',
          content: prompts.voiceReport({
            overallScore: report.overallScore,
            answered: report.answered,
            skipped: report.skipped,
            categories: evaluatedCategories.map(category => ({
              label: category.label,
              score: category.score,
              answered: category.answered,
              skipped: category.skipped
            })),
            skippedQuestions: [],
            questions
          })
        }
      ],
      temperature: 0.2,
      stream: false
    });
    const parsed = parseAiJson(content);
    return {
      summary: String(parsed?.summary || '').slice(0, 800),
      weakCategories: stringList(parsed?.weakCategories, 3),
      recommendations: stringList(parsed?.recommendations, 3)
    };
  }

  function buildReport(job, answers) {
    const byCategory = new Map();
    answers.forEach(answer => {
      const key = answer.category || 'Без категории';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(answer);
    });
    const categories = [...byCategory.entries()].map(([key, questions]) => {
      const answeredQuestions = questions.filter(answerHasSpeech);
      const scores = answeredQuestions.map(question => question.analysis?.score).filter(value => Number.isFinite(value));
      const answered = answeredQuestions.length;
      return {
        category: key,
        label: questions[0]?.categoryLabel || key,
        score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
        answered,
        skipped: questions.length - answered,
        questions
      };
    });
    const answerScores = answers.filter(answerHasSpeech).map(answer => answer.analysis?.score).filter(value => Number.isFinite(value));
    const overallScore = answerScores.length
      ? Math.round(answerScores.reduce((sum, value) => sum + value, 0) / answerScores.length)
      : null;
    const answered = answers.filter(answerHasSpeech).length;
    const weakCategories = categories
      .filter(category => Number.isFinite(category.score) && category.score < 60)
      .sort((a, b) => a.score - b.score)
      .map(category => category.label)
      .slice(0, 3);
    let summary;
    if (!answered) {
      summary = 'Ни один ответ не был распознан, поэтому вывод по темам невозможен.';
    } else if (overallScore == null) {
      summary = 'Ответы были, но ни один не удалось оценить, поэтому вывод по темам невозможен.';
    } else {
      summary = `Средний балл — ${overallScore}%. ${weakCategories.length ? `Стоит подтянуть: ${weakCategories.join(', ')}.` : 'Слабых разделов не выявлено.'}`;
    }
    const recommendations = overallScore == null
      ? []
      : weakCategories.length
        ? weakCategories.map(category => `Повторить тему «${category}» и вернуться к вопросам.`)
        : ['Продолжать тренироваться на вопросах и голосовых раундах.'];
    return {
      id: job.id,
      ts: Date.now(),
      mode: 'voice',
      overallScore,
      answered,
      skipped: answers.length - answered,
      total: answers.length,
      categories,
      weakCategories,
      summary,
      recommendations
    };
  }

  function historyEntry(job, report) {
    const questions = report.categories.flatMap(category => category.questions);
    const number = readHistory().reduce((max, entry) => Math.max(max, Number(entry.number) || 0), 0) + 1;
    return {
      id: job.id,
      number,
      ts: report.ts,
      mode: 'voice',
      categories: Array.isArray(job.categories) ? job.categories : [],
      accepted: report.answered,
      skipped: report.skipped,
      total: report.total,
      percent: report.overallScore == null ? 0 : report.overallScore,
      questions,
      report
    };
  }

  function saveLocalHistory(job, report) {
    const entry = historyEntry(job, report);
    const history = readHistory();
    const index = history.findIndex(item => item.id === job.id);
    if (index >= 0) history[index] = entry;
    else history.unshift(entry);
    history.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
    writeHistory(history);
  }

  async function saveCloudHistory(job, report) {
    const store = root.AppSupabase;
    if (!store?.client) return;
    try {
      const session = await store.getSession?.();
      if (!session?.user?.id) return;
      const entry = historyEntry(job, report);
      const row = {
        user_id: session.user.id,
        id: entry.id,
        number: entry.number,
        created_at: new Date(entry.ts).toISOString(),
        categories: entry.categories,
        accepted: entry.accepted,
        skipped: entry.skipped,
        total: entry.total,
        percent: entry.percent,
        questions: entry.questions,
        mode: 'voice',
        report: entry.report
      };
      const { error } = await store.client.from('interview_history').upsert(row, { onConflict: 'user_id,id' });
      if (error) console.warn('Voice report cloud save failed', error);
    } catch (error) {
      console.warn('Voice report cloud save failed', error);
    }
  }

  async function processJob(job, callbacks) {
    await ensurePrompts();
    const answers = (Array.isArray(job.answers) ? job.answers : []).map(answer => {
      const isSkipped = answer.status === 'skipped';
      const transcript = sanitizeTranscript(answer.transcript);
      const echoQuestion = !isSkipped && (!!answer.echoQuestion || isQuestionEcho(transcript, answer.title));
      const shortAnswer = !isSkipped && (!!answer.shortAnswer || isShortTranscript(transcript) || echoQuestion);
      return {
        ...answer,
        transcript,
        shortAnswer,
        echoQuestion,
        analysis: isSkipped
          ? normalizeAnalysis(answer.analysis || { score: null, verdict: 'skipped', summary: 'Вопрос пропущен.' })
          : shortAnswer ? null : answer.analysis ? normalizeAnalysis(answer.analysis) : null
      };
    });
    // Ответы, которые уже разобрал бэкенд voice-answer, повторно не анализируем.
    const toAnalyze = answers.filter(answer =>
      answer.status === 'accepted' && !answer.shortAnswer && answer.transcript?.trim() && !answer.analysis
    );
    const alreadyAnalyzed = answers.length - toAnalyze.length;
    let cursor = 0;
    let done = 0;
    callbacks?.onProgress?.(job, alreadyAnalyzed, answers.length);
    const worker = async () => {
      while (cursor < toAnalyze.length) {
        const answer = toAnalyze[cursor++];
        let analysis;
        try {
          analysis = await requestAnalysis(answer);
        } catch (error) {
          console.warn('Voice analysis failed', error);
          analysis = {
            score: null,
            verdict: 'unknown',
            summary: 'ИИ не смог разобрать этот ответ.',
            strengths: [],
            gaps: [],
            improvedAnswer: ''
          };
        }
        answer.analysis = analysis;
        done += 1;
        callbacks?.onProgress?.(job, alreadyAnalyzed + done, answers.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, Math.max(1, toAnalyze.length)) }, () => worker()));

    const localReport = buildReport(job, answers);
    let aiReport = null;
    if (localReport.overallScore != null && localReport.answered > 0) {
      try {
        aiReport = await requestReportSummary(localReport);
      } catch (error) {
        console.warn('Voice report summary failed', error);
      }
    }
    const report = { ...localReport };
    if (aiReport) {
      const unscoredLabels = localReport.categories
        .filter(category => !Number.isFinite(category.score) || category.answered === 0)
        .map(category => String(category.label).toLowerCase());
      const summaryText = String(aiReport.summary || '').toLowerCase();
      const mentionsUnscored = unscoredLabels.some(label => label && summaryText.includes(label));
      if (aiReport.summary && !mentionsUnscored) report.summary = aiReport.summary;
      const validWeak = new Set(localReport.weakCategories);
      const aiWeak = aiReport.weakCategories.filter(category => validWeak.has(category));
      if (aiWeak.length) report.weakCategories = aiWeak;
      if (aiReport.recommendations.length) report.recommendations = aiReport.recommendations;
    }
    saveLocalHistory(job, report);
    await saveCloudHistory(job, report);
    callbacks?.onComplete?.(job, report);
    root.dispatchEvent(new CustomEvent('qatodev:voice-report-ready', { detail: { jobId: job.id, report } }));
    return report;
  }

  async function withLock(task) {
    if (root.navigator?.locks?.request) {
      return root.navigator.locks.request('qatodev-voice-report-queue', task);
    }
    return task();
  }

  api.enqueue = function enqueue(job) {
    if (!job?.id) return null;
    const queue = readQueue();
    if (!queue.some(item => item.id === job.id)) queue.push(job);
    writeQueue(queue);
    return job;
  };

  api.processPending = function processPending(callbacks = {}) {
    return withLock(async () => {
      const queue = readQueue();
      const reports = [];
      for (const job of queue) {
        if (callbacks.onlyId && job.id !== callbacks.onlyId) continue;
        try {
          const report = await processJob(job, callbacks);
          reports.push({ job, report });
          writeQueue(readQueue().filter(item => item.id !== job.id));
        } catch (error) {
          console.warn('Voice report job failed', error);
          callbacks?.onError?.(job, error);
        }
      }
      return reports;
    });
  };

  api.getPending = readQueue;
// Повторная попытка, если отчёт не успел обработаться при загрузке страницы.
if (root.addEventListener) {
  root.addEventListener('online', () => {
    if (readQueue().length) api.processPending().catch(() => {});
  });
  root.document?.addEventListener('visibilitychange', () => {
    if (root.document.visibilityState === 'visible' && readQueue().length) {
      api.processPending().catch(() => {});
    }
  });
  root.document?.addEventListener('shared-auth:ready', () => {
    if (readQueue().length) api.processPending().catch(() => {});
  });
  root.setInterval(() => {
    if (root.document?.hidden === true) return;
    if (readQueue().length) api.processPending().catch(() => {});
  }, 60 * 1000);
}

  root.QAtoDevVoiceReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
