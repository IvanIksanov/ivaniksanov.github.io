/* Practice hub: local trainer progress. */
(() => {
  'use strict';

  const grid = document.querySelector('.practice-grid');
  if (!grid) return;

  // Filters are temporarily disabled: show every trainer on one page.
  grid.querySelectorAll('.practice-card').forEach(card => {
    card.hidden = false;
  });

  if (!window.QATrainers?.progress) return;
  document.querySelectorAll('[data-progress-key]').forEach(card => {
    const key = card.dataset.progressKey;
    const total = Number(card.dataset.progressTotal);
    if (!key || !Number.isFinite(total) || total <= 0) return;
    const progress = window.QATrainers.progress({ storageKey: key, total });
    if (!progress.answered) return;
    const badge = card.querySelector('.practice-progress');
    if (!badge) return;
    badge.hidden = false;
    badge.textContent = `${progress.answered}/${progress.total}`;
    badge.title = `Проверено: ${progress.answered} из ${progress.total} · Passed: ${progress.passed}, Failed: ${progress.failed}`;
    badge.setAttribute('aria-label', badge.title);
  });
})();
