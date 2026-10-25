(() => {
  // Keep browser navigation and page zoom from stealing gestures intended for the release map.
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  }, { capture: true, passive: false });

  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, event => event.preventDefault(), { passive: false });
  }

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (['+', '=', '-', '_', '0'].includes(event.key)) event.preventDefault();
  }, { capture: true });

  let edgeTouch = null;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { edgeTouch = null; return; }
    const touch = event.touches[0];
    const edge = 32;
    edgeTouch = touch.clientX <= edge || touch.clientX >= innerWidth - edge
      ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!edgeTouch || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - edgeTouch.x;
    const dy = touch.clientY - edgeTouch.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.25) event.preventDefault();
  }, { capture: true, passive: false });
  document.addEventListener('touchend', () => { edgeTouch = null; }, { passive: true });
  document.addEventListener('touchcancel', () => { edgeTouch = null; }, { passive: true });
})();
