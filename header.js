(function () {
  function updateHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const isScrolled = window.scrollY > 0;
    header.classList.toggle('is-scrolled', isScrolled);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateHeaderState();
      ticking = false;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderState();
    window.addEventListener('scroll', onScroll, { passive: true });
  });
})();
