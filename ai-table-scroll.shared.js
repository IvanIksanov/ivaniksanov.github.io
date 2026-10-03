/* Drag-friendly horizontal scrollbar for AI answer tables. */
(() => {
  'use strict';

  function enhance(root, selector = '.ai-table-wrap') {
    root.querySelectorAll(selector).forEach(viewport => {
      if (viewport.parentElement?.classList.contains('ai-table-shell')) return;
      const shell = document.createElement('div');
      shell.className = 'ai-table-shell';
      viewport.parentNode.insertBefore(shell, viewport);
      shell.append(viewport);

      const track = document.createElement('div');
      track.className = 'ai-table-scroll-track';
      track.setAttribute('aria-hidden', 'true');
      const thumb = document.createElement('div');
      thumb.className = 'ai-table-scroll-thumb';
      track.append(thumb);
      shell.append(track);

      let showTimer;
      let hideTimer;
      let dragging = false;
      let dragPointerId = null;
      let dragX = 0;
      let dragScrollLeft = 0;

      function update() {
        const overflow = viewport.scrollWidth - viewport.clientWidth;
        shell.classList.toggle('ai-table-shell--scrollable', overflow > 1);
        if (overflow <= 1) return;
        const trackWidth = track.clientWidth;
        const thumbWidth = Math.min(trackWidth, Math.max(36, trackWidth * viewport.clientWidth / viewport.scrollWidth));
        const travel = Math.max(0, trackWidth - thumbWidth);
        thumb.style.width = `${thumbWidth}px`;
        thumb.style.transform = `translateX(${travel * viewport.scrollLeft / overflow}px)`;
      }

      shell.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(hideTimer);
        update();
        showTimer = setTimeout(() => shell.classList.add('ai-table-shell--visible'), 500);
      });
      shell.addEventListener('pointerleave', () => {
        clearTimeout(showTimer);
        if (!dragging) hideTimer = setTimeout(() => shell.classList.remove('ai-table-shell--visible'), 500);
      });
      viewport.addEventListener('scroll', update, { passive: true });
      track.addEventListener('pointerdown', event => {
        if (event.button !== 0 || dragging) return;
        event.preventDefault();
        update();
        dragging = true;
        dragPointerId = event.pointerId;
        dragX = event.clientX;
        dragScrollLeft = viewport.scrollLeft;
        if (event.target !== thumb) {
          const thumbWidth = thumb.getBoundingClientRect().width;
          const travel = track.clientWidth - thumbWidth;
          viewport.scrollLeft = (event.clientX - track.getBoundingClientRect().left - thumbWidth / 2)
            / Math.max(1, travel) * (viewport.scrollWidth - viewport.clientWidth);
          dragScrollLeft = viewport.scrollLeft;
        }
        track.setPointerCapture(event.pointerId);
      });
      track.addEventListener('pointermove', event => {
        if (!dragging || event.pointerId !== dragPointerId) return;
        if (!(event.buttons & 1)) { endDrag(); return; }
        const travel = track.clientWidth - thumb.getBoundingClientRect().width;
        viewport.scrollLeft = dragScrollLeft + (event.clientX - dragX)
          / Math.max(1, travel) * (viewport.scrollWidth - viewport.clientWidth);
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        const pointerId = dragPointerId;
        dragPointerId = null;
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
        if (!shell.matches(':hover')) {
          hideTimer = setTimeout(() => shell.classList.remove('ai-table-shell--visible'), 500);
        }
      }
      track.addEventListener('pointerup', event => {
        if (event.pointerId === dragPointerId) endDrag();
      });
      track.addEventListener('pointercancel', endDrag);
      track.addEventListener('lostpointercapture', endDrag);
      requestAnimationFrame(update);
    });
  }

  window.QAtoDevAiTableScroll = { enhance };
})();
