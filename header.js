(function () {
  const HEADER_SCROLL_ENTER_Y = 8;
  const HEADER_SCROLL_EXIT_Y = 2;
  let headerScrolled = false;

  function updateHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const y = window.scrollY || window.pageYOffset || 0;
    if (!headerScrolled && y > HEADER_SCROLL_ENTER_Y) {
      headerScrolled = true;
    } else if (headerScrolled && y < HEADER_SCROLL_EXIT_Y) {
      headerScrolled = false;
    }
    header.classList.toggle('is-scrolled', headerScrolled);
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

  function ensureAuthModalMarkup() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'auth-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="auth-card">
        <h3 id="auth-title">Сохранение прогресса</h3>
        <p id="auth-description" class="auth-text">Войдите, чтобы сохранить ответы ИИ и прогресс изучения.</p>
        <div id="auth-level-wrap" class="auth-level-wrap">
          <select id="auth-track-select" class="auth-select" aria-label="Направление в ИТ">
            <option value="QA">QA</option>
            <option value="AQA">AQA</option>
            <option value="QA Full Stack">QA Full Stack</option>
          </select>
          <select id="auth-grade-select" class="auth-select" aria-label="Уровень в ИТ">
            <option value="стажер">стажер</option>
            <option value="junior">junior</option>
            <option value="middle">middle</option>
            <option value="senior">senior</option>
            <option value="lead">lead</option>
          </select>
        </div>
        <div id="auth-oauth-row" class="auth-oauth-row">
          <button type="button" id="auth-google-btn" class="auth-oauth-btn auth-google-btn" aria-label="Войти через Google">
            <span class="auth-oauth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.18 3.54-8.87z"></path>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-10.74-3.79H1.33v3.09A12 12 0 0 0 12 24z"></path>
                <path fill="#FBBC05" d="M5.33 14.3A7.18 7.18 0 0 1 4.95 12c0-.8.14-1.58.38-2.3V6.61H1.33A12 12 0 0 0 0 12c0 1.93.46 3.76 1.33 5.39l4-3.09z"></path>
                <path fill="#EA4335" d="M12 4.77c1.77 0 3.36.61 4.61 1.8l3.45-3.45C17.95 1.16 15.24 0 12 0A12 12 0 0 0 1.33 6.61l4 3.09A7.2 7.2 0 0 1 12 4.77z"></path>
              </svg>
            </span>
            <span>Google</span>
          </button>
        </div>
        <button type="button" id="auth-email-toggle" class="auth-email-toggle" aria-expanded="false">Войти по email</button>
        <input type="email" id="auth-email-input" class="auth-email-input" placeholder="Ваш email" autocomplete="email">
        <p id="auth-status" class="auth-text auth-status"></p>
        <div class="auth-actions">
          <button type="button" id="auth-sync-btn" class="auth-sync-btn" title="Синхронизировать данные" aria-label="Синхронизировать данные"><span class="auth-sync-icon" aria-hidden="true">↻</span></button>
          <button type="button" id="auth-send-btn" class="auth-send-btn">Получить ссылку</button>
          <button type="button" id="auth-close-btn" class="auth-close-btn">Закрыть</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function ensureSharedAuthScript() {
    if (window.location.pathname.endsWith('/questions.html') || window.location.pathname.endsWith('questions.html')) return;
    if (document.querySelector('script[data-shared-auth="true"]')) return;
    const script = document.createElement('script');
    script.src = 'auth.shared.js';
    script.defer = true;
    script.dataset.sharedAuth = 'true';
    document.body.appendChild(script);
  }

  function ensureProfileButton() {
    const switcher = document.querySelector('.theme-switcher');
    if (!switcher) return;

    let authOpenBtn = document.getElementById('auth-open-btn');
    if (!authOpenBtn) {
      authOpenBtn = document.createElement('button');
      authOpenBtn.id = 'auth-open-btn';
      authOpenBtn.className = 'clean-btn toggleButton_gllP auth-open-btn';
      authOpenBtn.type = 'button';
      authOpenBtn.title = 'Синхронизация прогресса';
      authOpenBtn.setAttribute('aria-label', 'Синхронизация прогресса');
      authOpenBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z"/></svg>';

      const themeToggle = switcher.querySelector('#theme-toggle');
      if (themeToggle) {
        switcher.insertBefore(authOpenBtn, themeToggle);
      } else {
        switcher.prepend(authOpenBtn);
      }
    }

    const hasAuthModal = !!document.getElementById('auth-modal');
    if (hasAuthModal || authOpenBtn.dataset.fallbackBound === 'true') return;

    authOpenBtn.dataset.fallbackBound = 'true';
    authOpenBtn.addEventListener('click', () => {
      window.location.href = 'questions.html';
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
    ensureAuthModalMarkup();
    ensureProfileButton();
    ensureSharedAuthScript();
  });
})();
