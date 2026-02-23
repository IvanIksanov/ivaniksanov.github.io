(function () {
  function updateHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const isScrolled = window.scrollY > 0;
    header.classList.toggle('is-scrolled', isScrolled);
  }

  function isInternalLink(anchor) {
    if (!anchor || !anchor.href) return false;
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    return anchor.origin === window.location.origin;
  }

  function handleNavClick(event) {
    const link = event.currentTarget;
    if (!isInternalLink(link)) return;
    if (link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' ) return;

    const isSamePage = link.pathname === window.location.pathname && link.hash === '';
    if (window.scrollY <= 0 && isSamePage) return;

    event.preventDefault();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReducedMotion ? 0 : 260;

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

    window.setTimeout(() => {
      window.location.href = link.href;
    }, delay);
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

  function revealHeaderLogo() {
    const logoImg = document.querySelector('.logo img');
    if (!logoImg) return;
    if (logoImg.classList.contains('logo-ready')) return;

    const markReady = () => {
      logoImg.classList.add('logo-ready');
    };

    if (logoImg.complete) {
      markReady();
      return;
    }

    logoImg.addEventListener('load', markReady, { once: true });
    logoImg.addEventListener('error', markReady, { once: true });
  }

  function setupSiteTitleHomeLink() {
    const title = document.querySelector('.site-title');
    if (!title) return;

    // If title is already wrapped into a link on some page, do not override it.
    if (title.closest('a')) return;

    const goHome = () => {
      window.location.href = 'index.html';
    };

    title.setAttribute('role', 'link');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-label', 'Перейти на главную');

    title.addEventListener('click', goHome);
    title.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      goHome();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderState();
    if (!document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-footer-year]').forEach((el) => {
      el.textContent = year;
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.querySelectorAll('.site-header nav a').forEach((link) => {
      link.addEventListener('click', handleNavClick);
    });
    revealHeaderLogo();
    setupSiteTitleHomeLink();
  });
})();
