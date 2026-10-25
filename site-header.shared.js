// The navigation, home link, sign-in button and theme control are shared by every page.
// Render synchronously at the script position so the header is present before page scripts run.
(() => {
  const mount = document.currentScript;
  if (!mount) return;
  const page = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  const active = {
    'course.html': 'course.html',
    'roadmap.html': 'roadmap.html',
    'roadmap-tests.html': 'roadmap.html',
    'questions.html': 'questions.html',
    'questions-map.html': 'questions.html',
    'resume.html': 'resume.html',
    'practice.html': 'practice.html',
  }[page];
  const glassAlways = new Set(['course.html', 'questions-map.html']).has(page);
  const showAiNotch = page === 'questions.html' || page === 'questions-map.html';
  const markup = String.raw`<div class="site-header" data-shared-header="true">
<nav>
    <ul>
        <li style="position: relative;"><a href="course.html?chapter=1&amp;v=20261018c">Архитектура</a></li>
        <li style="position: relative;"><a href="roadmap.html">Roadmap</a></li>
        <li style="position: relative;"><a href="questions.html">Вопросы</a></li>
        <li style="position: relative;"><a href="resume.html">Резюме</a></li>
        <li style="position: relative;"><a href="practice.html">Практика</a></li>
    </ul>
</nav>

<header class="welcome">
    <div class="header-container">
        <div class="logo">
            <span class="logo-art" role="img" aria-label="Логотип QAtoDev"></span>
        </div>
        <h3 class="site-title" role="link" tabindex="0" aria-label="Перейти на главную"><span class="site-title-ascii" aria-hidden="true">                            _
               _           | |
  ____ _____ _| |_ ___   __| |_____ _   _
 / _  (____ (_   _) _ \ / _  | ___ | | | |
| |_| / ___ | | || |_| ( (_| | ____|\ V /
 \__  \_____|  \__)___/ \____|_____) \_/
    |_|</span></h3>
    </div>

</header>
<!-- выносим кнопку -->
<div class="theme-switcher">
    <button id="auth-open-btn" class="clean-btn toggleButton_gllP auth-open-btn" type="button" title="Войти и сохранить прогресс" aria-label="Войти и сохранить прогресс">
        <span class="auth-open-btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z"/></svg></span>
        <span class="auth-open-btn__label">Войти</span>
    </button>
    <button
            id="theme-toggle"
            class="clean-btn toggleButton_gllP"
            type="button"
            title="Переключить тему"
            aria-label="Переключить тему"
            aria-live="polite"
    >
        <!-- Солнце для светлой темы -->
        <svg viewBox="0 0 24 24" width="24" height="24" class="lightToggleIcon_pyhR">
            <path fill="currentColor" d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"></path>
        </svg>
        <!-- Полумесяц для тёмной темы -->
        <svg viewBox="0 0 24 24" width="24" height="24" class="darkToggleIcon_wfgR">
            <path fill="currentColor" d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"></path>
        </svg>
    </button>
</div>
</div>`;
  mount.insertAdjacentHTML('afterend', markup);
  const header = mount.nextElementSibling;
  if (glassAlways) {
    header.dataset.glassAlways = '';
    header.classList.add('is-scrolled');
  }
  if (active) {
    const link = [...header.querySelectorAll('nav a')].find(item =>
      new URL(item.href).pathname.endsWith('/' + active));
    if (link) {
      if (page === 'questions-map.html') link.href = 'questions-map.html';
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  }
  if (showAiNotch) header.insertAdjacentHTML('beforeend', `    <button id="header-ai-notch" class="header-ai-notch" type="button" aria-live="polite" aria-hidden="true">
        <span class="header-ai-notch-icon" id="header-ai-notch-icon" aria-hidden="true">◌</span>
        <span class="header-ai-notch-text" id="header-ai-notch-text">В процессе</span>
    </button>`);
  mount.remove();
})();
