(function () {
  // Keep staging branding tied to its URL, even after merging branches.
  document.documentElement.dataset.siteEnvironment =
    /^\/test(?:\/|$)/.test(window.location.pathname) ? 'test' : 'production';

  if (document.documentElement.dataset.siteEnvironment === 'test') {
    // Replace all default favicons so browsers cannot pick the orange variant.
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(icon => icon.remove());
    const testFavicon = document.createElement('link');
    testFavicon.rel = 'icon';
    testFavicon.type = 'image/svg+xml';
    testFavicon.setAttribute('sizes', 'any');
    testFavicon.href = '/test/img/favicon-blueprint.svg?v=1';
    document.head.appendChild(testFavicon);
  }

  const HEADER_SCROLL_ENTER_Y = 8;
  const HEADER_SCROLL_EXIT_Y = 2;
  const AUTH_VISUAL_STATE_KEY = 'auth_visual_state_v1';
  const ARCHITECTURE_VISITED_KEY = 'qa_architecture_visited_v1';
  const SHARED_ASSET_VERSION = '8.9.4';
  let headerScrolled = false;

  function withVersion(src) {
    if (!src || /^https?:\/\//i.test(src) || src.includes('?')) return src;
    return `${src}?v=${SHARED_ASSET_VERSION}`;
  }

  function readStoredAuthVisualState() {
    try {
      return localStorage.getItem(AUTH_VISUAL_STATE_KEY) || '';
    } catch {
      return '';
    }
  }

  function updateHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    if (header.hasAttribute('data-glass-always')) {
      headerScrolled = true;
      header.classList.add('is-scrolled');
      return;
    }
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

    if (link.classList.contains('is-active') && link.pathname === window.location.pathname) {
      event.preventDefault();
      window.location.reload();
      return;
    }

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

  function setupCompactNavigation() {
    const header = document.querySelector('.site-header');
    const nav = header?.querySelector('nav');
    const links = nav?.querySelector('ul');
    if (!header || !nav || !links) return;

    const narrowScreen = window.matchMedia('(max-width: 900px)');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'header-menu-toggle';
    button.setAttribute('aria-label', 'Открыть меню');
    button.setAttribute('aria-expanded', 'false');
    links.id ||= 'site-header-links';
    button.setAttribute('aria-controls', links.id);
    button.innerHTML = '<span></span><span></span><span></span>';
    nav.insertBefore(button, links);
    header.classList.add('has-compact-menu');
    let previousNavRect = nav.getBoundingClientRect();
    let previousCompactState = narrowScreen.matches;
    let morphCleanup = null;
    let morphFrame = 0;
    let previousLinkMetrics;
    const controls = header.querySelector('.theme-switcher');
    const themeButton = controls?.querySelector('#theme-toggle');
    const home = header.querySelector('header.welcome');
    let previousHomeRect = home?.getBoundingClientRect();
    let previousControlsRect = controls?.getBoundingClientRect();
    let anchorAnimations = [];

    function readLinkMetrics() {
      const link = links.querySelector('a');
      const item = links.querySelector('li');
      if (!link) return { fontSize: '12px', padding: '6px 12px', margin: '6px' };
      const style = getComputedStyle(link);
      return {
        fontSize: style.fontSize,
        padding: style.padding,
        margin: item ? getComputedStyle(item).marginRight : '6px'
      };
    }

    previousLinkMetrics = readLinkMetrics();

    function alignMenuBelowHeader() {
      header.style.setProperty('--header-controls-width', `${controls?.getBoundingClientRect().width || 0}px`);
      const availableStart = (home?.offsetLeft || 0) + (home?.offsetWidth || 0);
      const availableEnd = nav.offsetLeft;
      const availableWidth = Math.max(0, availableEnd - availableStart - 6);
      header.style.setProperty('--header-nav-center-offset', `${(availableStart + availableEnd) / 2 - availableEnd}px`);
      header.style.setProperty('--header-nav-gap-width', `${availableWidth}px`);
      const linksWidth = [...links.children].reduce((width, item) => {
        return width + item.offsetWidth + (parseFloat(getComputedStyle(item).marginRight) || 0);
      }, 18);
      const inlineRoom = window.innerWidth > 600 && window.innerWidth <= 900 && linksWidth + 12 <= availableWidth;
      header.classList.toggle('has-inline-room', inlineRoom);
      header.classList.toggle('is-stacked-menu', narrowScreen.matches && !inlineRoom);
      header.style.setProperty('--compact-menu-height', `${links.scrollHeight}px`);
      if (themeButton) {
        const { width, height } = themeButton.getBoundingClientRect();
        header.style.setProperty('--header-menu-button-width', `${width}px`);
        header.style.setProperty('--header-menu-button-height', `${height}px`);
      }
    }

    alignMenuBelowHeader();
    document.fonts?.ready.then(alignMenuBelowHeader);
    if (controls && 'ResizeObserver' in window) {
      const observer = new ResizeObserver(alignMenuBelowHeader);
      observer.observe(controls);
      if (themeButton) observer.observe(themeButton);
    }

    function setOpen(open) {
      const expanded = open && narrowScreen.matches;
      header.classList.toggle('is-menu-open', expanded);
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
      links.inert = narrowScreen.matches && !expanded;
      if (expanded) alignMenuBelowHeader();
    }

    button.addEventListener('click', () => setOpen(!header.classList.contains('is-menu-open')));
    document.addEventListener('pointerdown', event => {
      if (header.classList.contains('is-menu-open') && !header.contains(event.target)) setOpen(false);
    });
    document.addEventListener('focusin', event => {
      if (header.classList.contains('is-menu-open') && !header.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !header.classList.contains('is-menu-open')) return;
      setOpen(false);
      button.focus();
    });
    narrowScreen.addEventListener('change', () => {
      const from = morphCleanup
        ? document.querySelector('.header-nav-morph')?.getBoundingClientRect() || previousNavRect
        : previousNavRect;
      const homeFrom = anchorAnimations.length ? home?.getBoundingClientRect() : previousHomeRect;
      const controlsFrom = anchorAnimations.length ? controls?.getBoundingClientRect() : previousControlsRect;
      anchorAnimations.forEach(animation => animation.cancel());
      anchorAnimations = [];
      morphCleanup?.();
      const collapsing = narrowScreen.matches;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const hasGlass = header.hasAttribute('data-glass-always') || window.scrollY > HEADER_SCROLL_ENTER_Y;
      let ghost = null;
      let ghostLinks = null;
      let ghostBurger = null;
      if (!reduceMotion && from.width) {
        ghost = document.createElement('div');
        ghost.className = 'header-nav-morph';
        ghost.classList.toggle('is-scrolled', hasGlass);
        ghost.style.left = `${from.left}px`;
        ghost.style.top = `${from.top}px`;
        ghost.style.width = `${from.width}px`;
        ghost.style.height = `${from.height}px`;
        ghost.style.borderRadius = collapsing ? '16px' : '50%';
        const linkMetrics = collapsing ? previousLinkMetrics : readLinkMetrics();
        ghost.style.setProperty('--morph-link-size', linkMetrics.fontSize);
        ghost.style.setProperty('--morph-link-padding', linkMetrics.padding);
        ghost.style.setProperty('--morph-link-margin', linkMetrics.margin);
        ghostLinks = links.cloneNode(true);
        ghostLinks.removeAttribute('id');
        ghostLinks.className = 'header-nav-morph-links';
        // The moving copy is visual only. Page-wide link styles can otherwise
        // flash on its anchors while the viewport crosses the breakpoint.
        ghostLinks.querySelectorAll('a').forEach(link => {
          const label = document.createElement('span');
          label.className = `header-nav-morph-label${link.classList.contains('is-active') ? ' is-active' : ''}`;
          label.replaceChildren(...link.childNodes);
          link.replaceWith(label);
        });
        ghostBurger = document.createElement('span');
        ghostBurger.className = 'header-nav-morph-burger';
        ghostBurger.innerHTML = '<i></i><i></i><i></i>';
        ghostLinks.style.opacity = collapsing ? '1' : '0';
        ghostBurger.style.opacity = collapsing ? '0' : '1';
        ghost.append(ghostLinks, ghostBurger);
        document.body.appendChild(ghost);
        header.classList.add('is-nav-morphing');
        header.classList.toggle('is-nav-morph-without-glass', !hasGlass);
        nav.style.visibility = 'hidden';
        morphCleanup = () => {
          cancelAnimationFrame(morphFrame);
          ghost.remove();
          header.classList.remove('is-nav-morphing');
          header.classList.remove('is-nav-morph-without-glass');
          nav.style.visibility = '';
          morphCleanup = null;
        };
      }
      setOpen(false);
      requestAnimationFrame(() => {
        const to = nav.getBoundingClientRect();
        if (!reduceMotion) {
          for (const [element, start] of [[home, homeFrom], [controls, controlsFrom]]) {
            if (!element || !start) continue;
            const end = element.getBoundingClientRect();
            const dx = start.left - end.left;
            const dy = start.top - end.top;
            if (Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
            anchorAnimations.push(element.animate([
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: 'translate(0px, 0px)' }
            ], { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
          }
        }
        if (ghost && to.width) {
          const cleanup = morphCleanup;
          const started = performance.now();
          const duration = 420;
          const fromRight = from.right;
          const lerp = (a, b, amount) => a + (b - a) * amount;
          const tick = now => {
            if (morphCleanup !== cleanup) return;
            const progress = Math.min(1, (now - started) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const target = nav.getBoundingClientRect();
            const width = lerp(from.width, target.width, eased);
            ghost.style.width = `${width}px`;
            ghost.style.left = `${lerp(fromRight, target.right, eased) - width}px`;
            ghost.style.top = `${lerp(from.top, target.top, eased)}px`;
            ghost.style.height = `${lerp(from.height, target.height, eased)}px`;
            ghost.style.borderRadius = `${lerp(collapsing ? 16 : 50, collapsing ? 50 : 16, eased)}px`;
            const linkOpacity = collapsing ? 1 - Math.min(1, progress / .38) : Math.max(0, (progress - .46) / .54);
            ghostLinks.style.opacity = String(linkOpacity);
            ghostBurger.style.opacity = String(1 - linkOpacity);
            if (progress < 1) morphFrame = requestAnimationFrame(tick);
            else cleanup();
          };
          morphFrame = requestAnimationFrame(tick);
        } else {
          morphCleanup?.();
        }
        previousNavRect = to;
        previousHomeRect = home?.getBoundingClientRect();
        previousControlsRect = controls?.getBoundingClientRect();
        previousCompactState = narrowScreen.matches;
        previousLinkMetrics = readLinkMetrics();
      });
    });
    window.addEventListener('resize', () => {
      alignMenuBelowHeader();
      if (previousCompactState === narrowScreen.matches && !morphCleanup) {
        previousNavRect = nav.getBoundingClientRect();
        previousHomeRect = home?.getBoundingClientRect();
        previousControlsRect = controls?.getBoundingClientRect();
        previousLinkMetrics = readLinkMetrics();
      }
    });
    setOpen(false);
  }

  function getCurrentPageName() {
    return decodeURIComponent(window.location.pathname.split('/').pop() || '');
  }

  function syncArchitectureNewBadge() {
    const isArchitecture = getCurrentPageName() === 'course.html';
    let visited = false;
    try {
      if (isArchitecture) localStorage.setItem(ARCHITECTURE_VISITED_KEY, '1');
      visited = localStorage.getItem(ARCHITECTURE_VISITED_KEY) === '1';
    } catch {
      visited = isArchitecture;
    }

    const link = document.querySelector('.site-header nav a[href^="course.html"], nav a[href^="course.html"]');
    if (visited || isArchitecture) {
      document.querySelectorAll('.header-nav-new-badge').forEach(badge => badge.remove());
      return;
    }
    if (!link || link.querySelector('.header-nav-new-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'header-nav-new-badge';
    badge.textContent = 'new';
    badge.setAttribute('aria-hidden', 'true');
    link.append(badge);
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

  function setupSiteTitleHomeLink() {
    const title = document.querySelector('.site-title');
    if (!title) return;

    // If title is already wrapped into a link on some page, do not override it.
    if (title.closest('a')) return;

    const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isHomePage = () => window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html');
    const art = title.querySelector('.site-title-ascii');
    const originalArt = art?.textContent || '';
    let animationTimer;

    const animateTitle = () => {
      if (!art || prefersReducedMotion()) return;
      clearTimeout(animationTimer);
      title.classList.add('is-assembling');
      const fragment = document.createDocumentFragment();
      let index = 0;
      originalArt.split('\n').forEach(line => {
        const row = document.createElement('span');
        row.className = 'site-title-ascii__line';
        for (const char of line) {
          if (char === ' ') {
            row.appendChild(document.createTextNode(char));
            continue;
          }
          const symbol = document.createElement('span');
          symbol.className = 'site-title-ascii__char';
          symbol.textContent = char;
          const seed = (Math.imul(index + 1, 2654435761) >>> 0);
          symbol.style.setProperty('--site-title-delay', `${seed % 360}ms`);
          symbol.style.setProperty('--site-title-x', `${(((seed >>> 8) % 100) - 50) / 80}em`);
          symbol.style.setProperty('--site-title-y', `${(((seed >>> 16) % 100) - 50) / 90}em`);
          symbol.style.setProperty('--site-title-r', `${((seed >>> 24) % 19) - 9}deg`);
          row.appendChild(symbol);
          index += 1;
        }
        fragment.appendChild(row);
      });
      art.replaceChildren(fragment);
      animationTimer = setTimeout(() => {
        title.classList.remove('is-assembling');
        art.textContent = originalArt;
      }, 760);
    };

    const activateHomeLink = () => {
      if (title.dataset.siteTitleNavigating === 'true') return;

      if (isHomePage()) {
        animateTitle();
        if (window.scrollY > 0) {
          window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
        return;
      }

      title.dataset.siteTitleNavigating = 'true';
      animateTitle();
      window.setTimeout(() => {
        window.location.href = 'index.html';
      }, art && !prefersReducedMotion() ? 720 : 0);
    };

    title.addEventListener('click', activateHomeLink);
    title.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activateHomeLink();
    });
  }

  function setupHeaderLogoHomeLink() {
    const logo = document.querySelector('.logo');
    if (!logo) return;
    const pageName = getCurrentPageName();
    if (pageName === '' || pageName === 'index.html') return;

    const goHome = () => { window.location.href = 'index.html'; };
    logo.classList.add('logo--home-link');
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', 'Перейти на главную');
    logo.addEventListener('click', goHome);
    logo.addEventListener('keydown', (event) => {
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
        <div id="auth-identity" class="auth-identity" aria-live="polite">
          <div id="auth-chip-row" class="auth-chip-row"></div>
          <p id="auth-user-email" class="auth-user-email"></p>
        </div>
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
          <button type="button" id="auth-github-btn" class="auth-oauth-btn auth-github-btn" aria-label="Войти через GitHub">
            <span class="auth-oauth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true">
                <path fill="currentColor" d="M12 .5C5.65.5.5 5.7.5 12.12c0 5.14 3.3 9.49 7.88 11.03.58.11.79-.25.79-.57 0-.28-.01-1.02-.02-2-3.2.71-3.88-1.56-3.88-1.56-.53-1.35-1.28-1.71-1.28-1.71-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.19 1.75 1.19 1.02 1.77 2.67 1.26 3.32.96.1-.75.4-1.26.72-1.55-2.55-.29-5.24-1.29-5.24-5.72 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.18a10.8 10.8 0 0 1 5.72 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.44-2.69 5.42-5.25 5.71.41.36.78 1.08.78 2.18 0 1.58-.01 2.85-.01 3.24 0 .32.21.69.8.57 4.57-1.55 7.86-5.89 7.86-11.03C23.5 5.7 18.35.5 12 .5z"></path>
              </svg>
            </span>
            <span>GitHub</span>
          </button>
        </div>
        <button type="button" id="auth-email-toggle" class="auth-email-toggle" aria-expanded="false">Войти по email</button>
        <input type="email" id="auth-email-input" class="auth-email-input" placeholder="Ваш email" autocomplete="email">
        <p id="auth-email-error" class="auth-email-error" aria-live="polite"></p>
        <p class="auth-legal-note">Продолжая вход, вы подтверждаете согласие на обработку персональных данных на условиях <a href="personal-data-consent.html" target="_blank" rel="noopener noreferrer">Согласия</a> и ознакомление с <a href="privacy-policy.html" target="_blank" rel="noopener noreferrer">Политикой</a>.</p>
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
    const appendDebugScript = (onReady) => {
      if (document.querySelector('script[data-debug-shared="true"]')) {
        if (typeof onReady === 'function') onReady();
        return;
      }
      const script = document.createElement('script');
      script.src = withVersion('debug.shared.js');
      script.async = false;
      script.dataset.debugShared = 'true';
      if (typeof onReady === 'function') {
        script.addEventListener('load', onReady, { once: true });
      }
      document.body.appendChild(script);
    };
    const appendSharedAuthScript = () => {
      if (document.querySelector('script[data-shared-auth="true"]')) return;
      const script = document.createElement('script');
      script.src = withVersion('auth.shared.js');
      script.async = false;
      script.dataset.sharedAuth = 'true';
      document.body.appendChild(script);
    };
    const appendSyncCoordinatorScript = () => {
      if (document.querySelector('script[data-sync-shared="true"]')) {
        appendSharedAuthScript();
        return;
      }
      const script = document.createElement('script');
      script.src = withVersion('sync.shared.js');
      script.async = false;
      script.dataset.syncShared = 'true';
      script.addEventListener('load', appendSharedAuthScript, { once: true });
      document.body.appendChild(script);
    };
    const appendQuestionsCloudSyncScript = () => {
      if (document.querySelector('script[data-questions-cloud-sync-shared="true"]')) {
        appendSyncCoordinatorScript();
        return;
      }
      const script = document.createElement('script');
      script.src = withVersion('questions-cloud-sync.shared.js');
      script.async = false;
      script.dataset.questionsCloudSyncShared = 'true';
      script.addEventListener('load', appendSyncCoordinatorScript, { once: true });
      document.body.appendChild(script);
    };
    const appendCoreScript = () => {
      if (document.querySelector('script[data-auth-core-shared="true"]')) {
        appendQuestionsCloudSyncScript();
        return;
      }
      const script = document.createElement('script');
      script.src = withVersion('auth.core.shared.js');
      script.async = false;
      script.dataset.authCoreShared = 'true';
      script.addEventListener('load', appendQuestionsCloudSyncScript, { once: true });
      document.body.appendChild(script);
    };
    if (document.querySelector('script[data-auth-state-shared="true"]')) {
      appendDebugScript(appendCoreScript);
      return;
    }
    const stateScript = document.createElement('script');
    stateScript.src = withVersion('auth.state.shared.js');
    stateScript.async = false;
    stateScript.dataset.authStateShared = 'true';
    stateScript.addEventListener('load', () => appendDebugScript(appendCoreScript), { once: true });
    document.body.appendChild(stateScript);
  }

  function ensureModelPreflightScript() {
    const explicitOptIn = document.documentElement.dataset.modelPreflight === 'true'
      || document.body?.dataset?.modelPreflight === 'true';
    if (!explicitOptIn) return;
    const hasQuestionsScript = Array.from(document.scripts).some((s) => String(s.src || "").includes("questions.js"));
    if (hasQuestionsScript) return;
    if (document.querySelector('script[data-model-preflight="true"]')) return;
    const appendPreflight = () => {
      const script = document.createElement('script');
      script.src = withVersion('model-preflight.shared.js');
      script.dataset.modelPreflight = 'true';
      document.body.appendChild(script);
    };
    if (window.QAtoDevAiPrompts) { appendPreflight(); return; }
    const prompts = document.createElement('script');
    prompts.src = 'ai-prompts.shared.js?v=1.0.0';
    prompts.addEventListener('load', appendPreflight, { once: true });
    document.body.appendChild(prompts);
  }

  function ensureProfileButton() {
    const switcher = document.querySelector('.theme-switcher');
    if (!switcher) return;
    const storedAuthVisualState = readStoredAuthVisualState();

    const authOpenBtn = switcher.querySelector('#auth-open-btn');
    if (!authOpenBtn) return;

    authOpenBtn.className = 'clean-btn toggleButton_gllP auth-open-btn';
    authOpenBtn.type = 'button';
    authOpenBtn.title = 'Войти и сохранить прогресс';
    authOpenBtn.setAttribute('aria-label', 'Войти и сохранить прогресс');
    authOpenBtn.classList.toggle('is-guest', storedAuthVisualState !== 'auth');
    authOpenBtn.classList.toggle('is-auth', storedAuthVisualState === 'auth');
    const labelEl = authOpenBtn.querySelector('.auth-open-btn__label');
    if (labelEl) {
      labelEl.textContent = storedAuthVisualState === 'auth' ? '' : 'Войти';
    }

    const hasAuthModal = !!document.getElementById('auth-modal');
    if (hasAuthModal || authOpenBtn.dataset.fallbackBound === 'true') return;

    authOpenBtn.dataset.fallbackBound = 'true';
    authOpenBtn.addEventListener('click', () => {
      window.location.href = 'questions.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupCompactNavigation();
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
    syncArchitectureNewBadge();
    window.addEventListener('pageshow', syncArchitectureNewBadge);
    window.addEventListener('storage', event => {
      if (event.key === ARCHITECTURE_VISITED_KEY) syncArchitectureNewBadge();
    });
    setupHeaderLogoHomeLink();
    setupSiteTitleHomeLink();
    ensureAuthModalMarkup();
    ensureProfileButton();
    ensureSharedAuthScript();
    ensureModelPreflightScript();
  });
})();
