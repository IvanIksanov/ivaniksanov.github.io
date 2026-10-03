/* Keep both side columns at one card height; shrink them together as chats appear. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const columns = [...document.querySelectorAll('.home-stage__cards')];
    const mobile = matchMedia('(max-width: 760px)');
    const minimumHeight = 52;
    const bottomClearance = 8;
    let scheduled = false;
    const cardCounts = new Map();
    const removalTimers = new Map();
    const firstCardTops = new Map();

    function savedCount(column) {
      return column.querySelectorAll('.home-chat__saved-card').length;
    }

    function visibleCards(column) {
      return [...column.querySelectorAll('.home-stage__card, .home-chat__saved-card')]
        .filter(card => !card.hidden);
    }

    function measure() {
      for (const column of columns) {
        column.classList.remove('is-collapsing');
        column.style.removeProperty('--home-card-height');
        for (const card of column.querySelectorAll('.home-stage__card, .home-chat__saved-card')) {
          card.hidden = false;
          card.style.removeProperty('height');
          card.style.removeProperty('min-height');
          card.style.removeProperty('--home-card-padding');
          card.style.removeProperty('--home-card-title-size');
        }
      }
      if (mobile.matches || !columns.some(column => column.querySelector('.home-chat__saved-card'))) {
        for (const column of columns) {
          const first = visibleCards(column)[0];
          if (first && !removalTimers.has(column)) firstCardTops.set(column, first.getBoundingClientRect().top);
        }
        return;
      }

      let baseHeight = 0;
      let shrinkNeeded = 0;
      for (const column of columns) {
        const first = visibleCards(column)[0];
        if (!first) continue;
        baseHeight = first.getBoundingClientRect().height;
        const promotions = [...column.querySelectorAll('.home-stage__card')];
        const saved = [...column.querySelectorAll('.home-chat__saved-card')].reverse();
        const removable = [...promotions, ...saved];

        let cards = visibleCards(column);
        let overflow = Math.max(0, column.scrollHeight - column.clientHeight + bottomClearance);
        while (removable.length && overflow > (baseHeight - minimumHeight) * cards.length) {
          removable.shift().hidden = true;
          cards = visibleCards(column);
          overflow = Math.max(0, column.scrollHeight - column.clientHeight + bottomClearance);
        }
        if (cards.length) shrinkNeeded = Math.max(shrinkNeeded, overflow / cards.length);
      }

      const height = Math.max(minimumHeight, baseHeight - shrinkNeeded);
      const ratio = baseHeight > minimumHeight ? (height - minimumHeight) / (baseHeight - minimumHeight) : 1;
      for (const column of columns) {
        column.classList.toggle('is-collapsing', shrinkNeeded > 0);
        column.style.setProperty('--home-card-height', `${height}px`);
        for (const card of visibleCards(column)) {
          card.style.setProperty('--home-card-padding', `${7 + 8 * ratio}px`);
          if (card.classList.contains('home-chat__saved-card')) {
            card.style.setProperty('--home-card-title-size', `${11 + 4 * ratio}px`);
          }
        }
      }
      for (const column of columns) {
        const first = visibleCards(column)[0];
        if (first && !removalTimers.has(column)) firstCardTops.set(column, first.getBoundingClientRect().top);
      }
    }

    function scheduleMeasure() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; measure(); });
    }

    for (const column of columns) {
      cardCounts.set(column, savedCount(column));
      const observer = new MutationObserver(() => {
        const count = savedCount(column);
        const previous = cardCounts.get(column) || 0;
        cardCounts.set(column, count);
        clearTimeout(removalTimers.get(column));
        if (count < previous && !mobile.matches) {
          const first = visibleCards(column)[0];
          const oldTop = firstCardTops.get(column);
          if (first && Number.isFinite(oldTop)) {
            const offset = oldTop - first.getBoundingClientRect().top;
            column.style.transition = 'opacity 240ms ease';
            column.style.transform = `translateY(${offset}px)`;
          }
          removalTimers.set(column, setTimeout(() => {
            measure();
            column.style.transition = '';
            column.style.transform = '';
            requestAnimationFrame(() => {
              const current = visibleCards(column)[0];
              if (current) firstCardTops.set(column, current.getBoundingClientRect().top);
            });
            removalTimers.delete(column);
          }, 1000));
          return;
        }
        if (removalTimers.has(column)) {
          removalTimers.delete(column);
          column.style.transition = '';
          column.style.transform = '';
        }
        scheduleMeasure();
      });
      observer.observe(column, { childList: true });
      const savedList = column.querySelector('.home-chat__saved-list');
      if (savedList) observer.observe(savedList, { childList: true });
    }
    addEventListener('resize', scheduleMeasure);
    measure();
  });
})();
