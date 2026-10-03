(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const narrow = matchMedia('(max-width: 900px)');
    const left = document.querySelector('.home-stage__cards--left');
    const right = document.querySelector('.home-stage__cards--right');
    const destinations = document.getElementById('home-mobile-destinations');
    const chats = document.getElementById('home-mobile-chats');
    if (!left || !right || !destinations || !chats) return;

    const leftCards = [...left.querySelectorAll(':scope > .home-stage__card')];
    const rightCards = [...right.querySelectorAll(':scope > .home-stage__card')];
    const leftChats = left.querySelector('.home-chat__saved-list');
    const rightChats = right.querySelector('.home-chat__saved-list');
    let currentMode = null;

    function arrange() {
      if (currentMode === narrow.matches) return;
      currentMode = narrow.matches;
      if (narrow.matches) {
        destinations.append(...leftCards, ...rightCards);
        chats.append(leftChats, rightChats);
        for (const card of [...leftCards, ...rightCards, ...chats.querySelectorAll('.home-chat__saved-card')]) {
          card.hidden = false;
          card.style.removeProperty('--home-card-padding');
          card.style.removeProperty('--home-card-title-size');
        }
      } else {
        if (!destinations.childElementCount && !chats.childElementCount) return;
        left.append(...leftCards, leftChats);
        right.append(...rightCards, rightChats);
      }
    }

    for (const rail of [destinations, chats]) {
      let startX = 0;
      let lastX = 0;
      let pointerId = null;
      let dragged = false;
      rail.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        pointerId = event.pointerId;
        startX = lastX = event.clientX;
        dragged = false;
      });
      rail.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId || !(event.buttons & 1)) return;
        if (!dragged && Math.abs(event.clientX - startX) < 5) return;
        if (!dragged) { dragged = true; rail.setPointerCapture(pointerId); rail.classList.add('is-dragging'); }
        rail.scrollLeft -= event.clientX - lastX;
        lastX = event.clientX;
      });
      const finish = () => {
        const endedId = pointerId;
        if (endedId !== null && rail.hasPointerCapture(endedId)) rail.releasePointerCapture(endedId);
        pointerId = null;
        rail.classList.remove('is-dragging');
        setTimeout(() => { dragged = false; }, 0);
      };
      rail.addEventListener('pointerup', finish);
      rail.addEventListener('pointercancel', finish);
      rail.addEventListener('click', event => { if (dragged) event.preventDefault(); }, true);
    }

    narrow.addEventListener('change', arrange);
    arrange();
  });
})();
