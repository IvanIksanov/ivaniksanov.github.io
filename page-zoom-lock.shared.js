/* Keep ordinary pages at their layout scale while embedded maps manage their own zoom. */
(() => {
  const preventZoom = event => event.preventDefault();
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (['+', '=', '-', '_', '0'].includes(event.key) ||
        ['NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code)) {
      event.preventDefault();
    }
  }, { capture: true });
})();
