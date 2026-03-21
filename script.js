
/***********************
 * --- QA Skills ---
 ***********************/
document.addEventListener('DOMContentLoaded', function(){
  // Массив для хранения выбранных навыков
  let selectedSkills = [];
  const STUDY_PLAN_AUTH_BYPASS_KEY = 'study_plan_guest_auth_bypass_v1';
  const skillLinks = document.querySelectorAll('#qa-skills .skill-links a');
  const defaultSkillIds = [
    'test-design',
    'postman',
    'charles',
    'rest-api',
    'MySQL',
    'dbeaver',
    'jira',
    'java',
    'OOP',
    'selenium'
  ];

  // Восстанавливаем выбор из localStorage
  const savedSelected = localStorage.getItem('selectedSkills');
  let savedSkillIds = [];
  let hasSavedSelection = false;
  if (savedSelected) {
    try {
      const parsed = JSON.parse(savedSelected);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedSkillIds = parsed;
        hasSavedSelection = true;
      }
    } catch (e) {
      hasSavedSelection = false;
    }
  }
  if (!hasSavedSelection) {
    savedSkillIds = defaultSkillIds;
    localStorage.setItem('selectedSkills', JSON.stringify(savedSkillIds));
    localStorage.setItem('showStudyPlan', 'true');
  }
  skillLinks.forEach(skill => {
    const skillId = skill.getAttribute('data-skill-id');
    if (savedSkillIds.includes(skillId)) {
      skill.classList.add('selected');
      selectedSkills.push(skill);
    }
  });
  updateCounters();

  // Обработчик клика по навыку
  skillLinks.forEach(function(skill){
    skill.addEventListener('click', function(e){
      e.preventDefault();
      if (skill.classList.contains('selected')) {
        // Если навык уже выбран, снимаем выбор
        skill.classList.remove('selected');
        selectedSkills = selectedSkills.filter(function(item){
          return item !== skill;
        });
        let counter = skill.querySelector('.skill-counter');
        if (counter) {
          counter.textContent = '';
        }
        updateCounters();
        updateSelectedSkillsStorage();
      } else {
        // Ограничение выбора: максимум 20 навыков
        if (selectedSkills.length >= 20) {
          alert("Сконцентрируемся на 20 навыках!");
          return;
        }
        // Если лимит не достигнут — выбираем навык
        skill.classList.add('selected');
        selectedSkills.push(skill);
        updateCounters();
        updateSelectedSkillsStorage();
      }
    });
  });

  function updateCounters(){
    selectedSkills.forEach(function(skill, index){
      let counter = skill.querySelector('.skill-counter');
      if (counter) {
        counter.textContent = index + 1;
      }
    });
  }
  function updateSelectedSkillsStorage(){
    let selectedIds = selectedSkills.map(skill => skill.getAttribute('data-skill-id'));
    localStorage.setItem('selectedSkills', JSON.stringify(selectedIds));
  }

  const studyPlan = document.getElementById('study-plan');
  const planList = document.getElementById('plan-list');
  const planFilters = document.getElementById('plan-filters');

  function getActiveTypes() {
    if (!planFilters) return null;
    const active = new Set();
    planFilters.querySelectorAll('.plan-filter-chip').forEach(function(chip) {
      if (!chip.classList.contains('is-disabled')) {
        active.add(chip.dataset.type);
      }
    });
    return active;
  }

  function applyPlanFilters() {
    if (!planFilters || !planList) return;
    const activeTypes = getActiveTypes();
    if (!activeTypes) return;

    const groups = planList.querySelectorAll('.plan-group');
    groups.forEach(function(group) {
      const cards = group.querySelectorAll('.resource-card');
      let anyVisible = false;
      cards.forEach(function(card) {
        const type = card.dataset.type || '';
        const isVisible = activeTypes.has(type);
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) {
          anyVisible = true;
        }
      });
      group.style.display = anyVisible ? '' : 'none';
    });
  }

  if (planFilters) {
    planFilters.querySelectorAll('.plan-filter-chip').forEach(function(chip) {
      chip.classList.remove('is-disabled');
      chip.addEventListener('click', function() {
        chip.classList.toggle('is-disabled');
        applyPlanFilters();
      });
    });
  }
  const shouldShowPlan = localStorage.getItem('showStudyPlan') === 'true';
  if (shouldShowPlan && selectedSkills.length > 0) {
    renderStudyPlan(false);
  }

  // Обработка кнопки "Получить план изучения"
  const getPlanButton = document.getElementById('get-plan');
  function showStudyPlan(options) {
    localStorage.setItem('showStudyPlan', 'true');
    renderStudyPlan(!!options?.shouldScroll);
  }

  async function ensureAuthBeforeStudyPlan() {
    const sharedAuth = window.SharedAuth;
    if (!sharedAuth || typeof sharedAuth.requireAuthForAction !== 'function') {
      return true;
    }
    return sharedAuth.requireAuthForAction({
      action: { id: 'show-study-plan' },
      bypassStorageKey: STUDY_PLAN_AUTH_BYPASS_KEY,
      unavailableMessage: 'Авторизация недоступна. Закройте окно и продолжите без сохранения плана.'
    });
  }

  document.addEventListener('shared-auth:execute-action', function(event) {
    if (event?.detail?.action?.id !== 'show-study-plan') return;
    if (selectedSkills.length === 0) return;
    showStudyPlan({ shouldScroll: false });
    window.SharedAuth?.restorePendingScroll?.();
  });

  getPlanButton.addEventListener('click', async function(){
    if(selectedSkills.length === 0){
      alert('Выбери навык для изучения :)');
      return;
    }
    const allowed = await ensureAuthBeforeStudyPlan();
    if (!allowed) return;
    showStudyPlan({ shouldScroll: true });
  });

  function renderStudyPlan(shouldScroll) {
    planList.innerHTML = '';
    const visitedKey = 'studyPlanVisitedLinks';
    const visitedMap = loadVisitedLinks(visitedKey);
    selectedSkills.forEach(function(skill){
      let planLinkData = skill.getAttribute('data-plan') || '';
      let skillName = skill.firstChild.textContent.trim();
      let skillId = skill.getAttribute('data-skill-id') || '';

      let group = document.createElement('div');
      group.className = 'plan-group';
      if (skillId === 'java') {
        group.classList.add('plan-group-java');
      }

      let groupHeader = document.createElement('h3');
      groupHeader.textContent = skillName;
      group.appendChild(groupHeader);

      let grid = document.createElement('div');
      grid.className = 'plan-grid';

      let links = planLinkData.split('|');
      links.forEach(function(link, index){
        let url = link.trim();
        if (!url) return;

        let parsed = parseResourceUrl(url);
        let typeLabel = getResourceType(parsed);

        let card = document.createElement('a');
        card.href = url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'resource-card';
        card.dataset.url = url;
        card.dataset.type = typeLabel;
        if (visitedMap[url]) {
          card.classList.add('is-visited');
        }
        if (skillId === 'java') {
          card.classList.add('resource-java');
        }

        let top = document.createElement('div');
        top.className = 'resource-top';

        let number = document.createElement('span');
        number.className = 'resource-number';
        number.textContent = index + 1;

        let type = document.createElement('span');
        type.className = 'resource-type';
        type.textContent = typeLabel;

        let visited = document.createElement('span');
        visited.className = 'resource-visited';
        visited.textContent = 'Открыто';

        top.appendChild(number);
        top.appendChild(type);
        top.appendChild(visited);

        let title = document.createElement('div');
        title.className = 'resource-title';
        title.textContent = parsed.displayHost || parsed.fallback;

        let subtitle = document.createElement('div');
        subtitle.className = 'resource-subtitle';
        subtitle.textContent = parsed.displayPath || parsed.fallback;

        card.appendChild(top);
        card.appendChild(title);
        card.appendChild(subtitle);

        card.addEventListener('click', function(){
          visitedMap[url] = true;
          saveVisitedLinks(visitedKey, visitedMap);
          card.classList.add('is-visited');
        });

        grid.appendChild(card);
      });

      group.appendChild(grid);
      planList.appendChild(group);
    });
    studyPlan.style.display = 'block';
    applyPlanFilters();
    if (shouldScroll) {
      studyPlan.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function parseResourceUrl(url) {
    try {
      let parsed = new URL(url);
      let host = parsed.hostname.replace(/^www\./, '');
      let path = parsed.pathname.replace(/\/$/, '');
      let displayPath = path ? host + path : host;
      return {
        hostname: host,
        pathname: parsed.pathname || '',
        displayHost: host,
        displayPath: displayPath,
        fallback: url
      };
    } catch (e) {
      return { hostname: '', pathname: '', displayHost: url, displayPath: url, fallback: url };
    }
  }

  function loadVisitedLinks(key) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  function saveVisitedLinks(key, map) {
    localStorage.setItem(key, JSON.stringify(map));
  }

  function getResourceType(resource) {
    const host = (resource.hostname || '').toLowerCase();
    const path = (resource.pathname || '').toLowerCase();
    const videoHosts = [
      'youtube.com',
      'youtu.be',
      'rutube.ru',
      'vk.com',
      'vimeo.com',
      'live.dzen.ru'
    ];
    const trainerHosts = [
      'stepik.org',
      'karpov.courses',
      'sql-academy.org',
      'mystery.knightlab.com',
      'edclub.com',
      'keybr.com',
      'klava.org',
      'duolingo.com',
      'puzzle-english.com',
      'puzzle-movies.com',
      'learngitbranching.js.org',
      'hacksplaining.com'
    ];
    const postHosts = [
      't.me',
      'telegram.me',
      'set.ki'
    ];
    const courseHosts = [
      'stepik.org',
      'karpov.courses',
      'javarush.com'
    ];
    const courseHostSuffixes = [
      '.teachable.com'
    ];

    if (videoHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Видео';
    }
    if (postHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Пост';
    }
    if (
      courseHosts.some((item) => host === item || host.endsWith('.' + item)) ||
      courseHostSuffixes.some((item) => host.endsWith(item)) ||
      host.includes('course') ||
      path.includes('course')
    ) {
      return 'Курс';
    }
    if (trainerHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Тренажер';
    }
    return 'Статья';
  }
});

document.addEventListener("DOMContentLoaded", function() {
  const toggleHeader = document.getElementById("toggle-superpower");
  const skillsBlock = document.getElementById("superpower-skills");

  toggleHeader.addEventListener("click", function() {
    // Переключаем отображение блока с навыками
    if (skillsBlock.style.display === "none" || skillsBlock.style.display === "") {
      skillsBlock.style.display = "block";
    } else {
      skillsBlock.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", function() {
  const smoothTargets = [
    { hash: "#plan-list", id: "plan-list" },
    { hash: "#tg-links", id: "tg-links" }
  ];

  smoothTargets.forEach(function(target) {
    const section = document.getElementById(target.id);
    if (!section) return;

    const anchors = document.querySelectorAll(`.skills-cover a[href="${target.hash}"]`);
    anchors.forEach(function(anchor) {
      anchor.addEventListener("click", function(e) {
        e.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
});


// --- КАРУСЕЛЬ ИЗОБРАЖЕНИЙ ---
document.addEventListener('DOMContentLoaded', function () {
    const carousel = document.querySelector('#practice-covers .carousel');
    if (!carousel) return;
    const items = Array.from(carousel.querySelectorAll('.carousel-images .carousel-item'));
    if (!items.length) return;
    const prevBtn = carousel.querySelector('#prev');
    const nextBtn = carousel.querySelector('#next');
    if (!prevBtn || !nextBtn) return;

    let currentIndex = 0;
    let autoRotateId = null;
    let isSliding = false;
    const slideDurationMs = 560;

    function wrapIndex(index) {
        const len = items.length;
        return (index + len) % len;
    }

    function relativeOffset(index, activeIndex) {
        const len = items.length;
        let offset = index - activeIndex;
        if (offset > len / 2) offset -= len;
        if (offset < -len / 2) offset += len;
        return offset;
    }

    function renderSlides() {
        items.forEach((item, i) => {
            const offset = relativeOffset(i, currentIndex);
            item.classList.remove('active', 'prev', 'next', 'off-left', 'off-right');

            if (offset === 0) {
                item.classList.add('active');
            } else if (offset === -1) {
                item.classList.add('prev');
            } else if (offset === 1) {
                item.classList.add('next');
            } else if (offset < -1) {
                item.classList.add('off-left');
            } else {
                item.classList.add('off-right');
            }
        });
    }

    function goTo(index) {
        if (isSliding) return;
        isSliding = true;
        currentIndex = wrapIndex(index);
        renderSlides();
        setTimeout(function () {
            isSliding = false;
        }, slideDurationMs);
    }

    function startAutoRotate() {
        stopAutoRotate();
        autoRotateId = setInterval(function() {
            goTo(currentIndex + 1);
        }, 8000);
    }

    function stopAutoRotate() {
        if (autoRotateId) {
            clearInterval(autoRotateId);
            autoRotateId = null;
        }
    }

    prevBtn.addEventListener('click', function() {
        goTo(currentIndex - 1);
        startAutoRotate();
    });

    nextBtn.addEventListener('click', function() {
        goTo(currentIndex + 1);
        startAutoRotate();
    });

    carousel.addEventListener('click', function (event) {
        const clickedLink = event.target.closest('.skills-cover-link, .skills-cover-cta');
        if (!clickedLink || !carousel.contains(clickedLink)) return;

        const item = clickedLink.closest('.carousel-item');
        if (!item) return;

        if (item.classList.contains('prev')) {
            event.preventDefault();
            event.stopPropagation();
            goTo(currentIndex - 1);
            startAutoRotate();
            return;
        }

        if (item.classList.contains('next')) {
            event.preventDefault();
            event.stopPropagation();
            goTo(currentIndex + 1);
            startAutoRotate();
        }
    }, true);

    // Изначально показываем первое изображение без анимации
    renderSlides();
    requestAnimationFrame(function () {
        carousel.classList.add('is-ready');
    });
    startAutoRotate();

});

document.addEventListener('DOMContentLoaded', function () {
    const showcase = document.getElementById('tg-links');
    if (!showcase) return;

    const triggers = Array.from(showcase.querySelectorAll('.tg-preview-trigger'));
    const embedHost = document.getElementById('tg-preview-embed');
    const titleNode = document.getElementById('tg-preview-title');
    const linkNode = document.getElementById('tg-preview-link');
    const previewPanel = showcase.querySelector('.tg-preview-panel');
    const pickerPanel = showcase.querySelector('.tg-picker-panel');
    const pickerHead = showcase.querySelector('.tg-picker-head');
    const pickerGrid = showcase.querySelector('.tg-picker-grid');
    const EMBED_LOAD_TIMEOUT_MS = 6500;

    if (!triggers.length || !embedHost || !titleNode || !linkNode || !previewPanel || !pickerPanel || !pickerHead || !pickerGrid) return;

    let activeTrigger = triggers.find(function (trigger) {
        return trigger.classList.contains('is-active');
    }) || triggers[0];
    let embedLoadTimer = null;
    let embedMutationObserver = null;
    let embedReadyPollTimer = null;
    let embedRenderFrameId = null;
    let renderRequestId = 0;
    let embedSurface = null;
    let embedOverlay = null;
    let previewTouchState = null;

    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function isMobilePreviewLayout() {
        return window.innerWidth < 600;
    }

    function openActiveTelegramPost() {
        const url = activeTrigger?.dataset?.telegramUrl || linkNode?.href;
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function ensureEmbedLayers() {
        embedHost.classList.add('is-managed');

        if (!embedSurface) {
            embedSurface = document.createElement('div');
            embedSurface.className = 'tg-preview-surface';
            embedHost.appendChild(embedSurface);
        }

        if (!embedOverlay) {
            embedOverlay = document.createElement('div');
            embedOverlay.className = 'tg-preview-overlay';
            embedHost.appendChild(embedOverlay);
        }
    }

    function clearEmbedAsyncState() {
        if (embedLoadTimer) {
            clearTimeout(embedLoadTimer);
            embedLoadTimer = null;
        }

        if (embedMutationObserver) {
            embedMutationObserver.disconnect();
            embedMutationObserver = null;
        }

        if (embedReadyPollTimer) {
            clearInterval(embedReadyPollTimer);
            embedReadyPollTimer = null;
        }

        if (embedRenderFrameId) {
            cancelAnimationFrame(embedRenderFrameId);
            embedRenderFrameId = null;
        }
    }

    function createSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'tg-preview-skeleton';
        skeleton.setAttribute('aria-hidden', 'true');
        skeleton.innerHTML = [
            '<div class="tg-preview-skeleton-top">',
            '<div class="tg-preview-skeleton-avatar"></div>',
            '<div class="tg-preview-skeleton-lines">',
            '<div class="tg-preview-skeleton-line is-short"></div>',
            '<div class="tg-preview-skeleton-line is-medium"></div>',
            '</div>',
            '</div>',
            '<div class="tg-preview-skeleton-media"></div>',
            '<div class="tg-preview-skeleton-body">',
            '<div class="tg-preview-skeleton-line"></div>',
            '<div class="tg-preview-skeleton-line"></div>',
            '<div class="tg-preview-skeleton-line is-medium"></div>',
            '<div class="tg-preview-skeleton-line"></div>',
            '<div class="tg-preview-skeleton-line is-short"></div>',
            '</div>'
        ].join('');
        return skeleton;
    }

    function lockPreviewHeight(minHeight) {
        const currentHeight = Math.round(embedHost.getBoundingClientRect().height);
        const requestedMinHeight = Number(minHeight) || 0;
        const targetHeight = Math.max(currentHeight, requestedMinHeight);
        if (targetHeight > 120) {
            embedHost.style.minHeight = targetHeight + 'px';
        }
    }

    function releasePreviewHeight() {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                embedHost.style.removeProperty('min-height');
                syncPickerHeight();
            });
        });
    }

    function markEmbedAsReady(expectedRequestId, options) {
        if (expectedRequestId !== renderRequestId) return;
        clearEmbedAsyncState();
        if (embedOverlay) {
            embedOverlay.innerHTML = '';
        }
        embedHost.classList.remove('is-loading', 'is-error');
        if (options && options.preserveFrameHeight && !isMobilePreviewLayout()) {
            syncPickerHeight();
        } else {
            releasePreviewHeight();
        }
        syncPickerHeight();
    }

    function showEmbedFallback(expectedRequestId, telegramUrl, options) {
        if (expectedRequestId !== renderRequestId) return;
        clearEmbedAsyncState();
        embedHost.classList.remove('is-loading');
        embedHost.classList.add('is-error');
        if (embedOverlay) {
            embedOverlay.innerHTML = '';
        }
        if (embedSurface) {
            embedSurface.innerHTML = [
            '<div class="tg-preview-fallback">',
            '<h4 class="tg-preview-fallback-title">Не удалось быстро загрузить предпросмотр</h4>',
            '<p class="tg-preview-fallback-text">Не удалось загрузить пост в предпросмотре. Попробуйте открыть его напрямую.</p>',
            '<a class="tg-preview-fallback-link" href="' + telegramUrl + '" target="_blank" rel="noopener noreferrer">Открыть пост</a>',
            '</div>'
            ].join('');
        }
        if (options && options.preserveFrameHeight && !isMobilePreviewLayout()) {
            syncPickerHeight();
        } else {
            releasePreviewHeight();
        }
        syncPickerHeight();
    }

    function watchEmbedRendering(expectedRequestId, telegramUrl, widgetScript, options) {
        clearEmbedAsyncState();
        let observedIframe = null;

        function bindIframeLoad() {
            if (!embedSurface) return;
            const iframe = embedSurface.querySelector('iframe');
            if (!iframe || iframe === observedIframe) return;

            observedIframe = iframe;
            iframe.addEventListener('load', function () {
                markEmbedAsReady(expectedRequestId, options);
            }, { once: true });
        }

        embedMutationObserver = new MutationObserver(function () {
            bindIframeLoad();
        });

        if (embedSurface) {
            embedMutationObserver.observe(embedSurface, { childList: true, subtree: true });
        }

        widgetScript.addEventListener('load', function () {
            window.setTimeout(bindIframeLoad, 100);
        });

        widgetScript.addEventListener('error', function () {
            showEmbedFallback(expectedRequestId, telegramUrl, options);
        });

        embedLoadTimer = window.setTimeout(function () {
            if (!embedSurface || !embedSurface.querySelector('iframe')) {
                showEmbedFallback(expectedRequestId, telegramUrl, options);
            }
        }, EMBED_LOAD_TIMEOUT_MS);
    }

    function renderTelegramPost(trigger, options) {
        if (!trigger) return;
        const renderOptions = options || {};

        activeTrigger = trigger;
        renderRequestId += 1;
        triggers.forEach(function (item) {
            item.classList.toggle('is-active', item === trigger);
            item.setAttribute('aria-pressed', item === trigger ? 'true' : 'false');
        });

        const telegramPost = trigger.dataset.telegramPost;
        const telegramUrl = trigger.dataset.telegramUrl;
        const postTitle = trigger.dataset.title || trigger.textContent.trim();

        titleNode.textContent = postTitle;
        linkNode.href = telegramUrl;
        linkNode.setAttribute('aria-label', 'Открыть пост «' + postTitle + '» в Telegram');

        ensureEmbedLayers();
        clearEmbedAsyncState();
        embedHost.classList.remove('is-error');
        embedHost.classList.add('is-loading');
        if (embedOverlay) {
            embedOverlay.innerHTML = '';
            const skeleton = createSkeleton();
            embedOverlay.appendChild(skeleton);
            lockPreviewHeight(Math.ceil(skeleton.getBoundingClientRect().height));
        } else {
            lockPreviewHeight();
        }
        if (embedSurface) {
            embedSurface.innerHTML = '';
        }

        const currentRequestId = renderRequestId;
        embedRenderFrameId = requestAnimationFrame(function () {
            embedRenderFrameId = requestAnimationFrame(function () {
                embedRenderFrameId = null;
                if (currentRequestId !== renderRequestId) return;

                const widgetScript = document.createElement('script');
                widgetScript.async = true;
                widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
                widgetScript.setAttribute('data-telegram-post', telegramPost);
                widgetScript.setAttribute('data-width', '100%');

                if (isDarkTheme()) {
                    widgetScript.setAttribute('data-dark', '1');
                }

                if (embedSurface) {
                    embedSurface.appendChild(widgetScript);
                }
                watchEmbedRendering(currentRequestId, telegramUrl, widgetScript, renderOptions);
            });
        });
    }

    function bindMobilePreviewTap() {
        if (!embedHost) return;

        embedHost.addEventListener('touchstart', function (event) {
            if (!isMobilePreviewLayout() || embedHost.classList.contains('is-loading')) return;
            const touch = event.touches && event.touches[0];
            if (!touch) return;
            previewTouchState = {
                x: touch.clientX,
                y: touch.clientY,
                moved: false
            };
        }, { passive: true });

        embedHost.addEventListener('touchmove', function (event) {
            if (!isMobilePreviewLayout() || !previewTouchState) return;
            const touch = event.touches && event.touches[0];
            if (!touch) return;
            const dx = Math.abs(touch.clientX - previewTouchState.x);
            const dy = Math.abs(touch.clientY - previewTouchState.y);
            if (dx > 10 || dy > 10) {
                previewTouchState.moved = true;
            }
        }, { passive: true });

        embedHost.addEventListener('touchend', function () {
            if (!isMobilePreviewLayout() || !previewTouchState) {
                previewTouchState = null;
                return;
            }

            if (!previewTouchState.moved && !embedHost.classList.contains('is-loading')) {
                openActiveTelegramPost();
            }
            previewTouchState = null;
        }, { passive: true });
    }

    function syncPickerHeight() {
        if (window.innerWidth < 600) {
            pickerPanel.style.removeProperty('height');
            pickerGrid.style.removeProperty('--tg-picker-max-height');
            pickerGrid.style.removeProperty('max-height');
            return;
        }

        const panelStyles = window.getComputedStyle(pickerPanel);
        const panelPaddingTop = parseFloat(panelStyles.paddingTop) || 0;
        const panelPaddingBottom = parseFloat(panelStyles.paddingBottom) || 0;
        const headHeight = pickerHead.offsetHeight;
        const previewHeight = previewPanel.offsetHeight;
        const available = Math.max(220, previewHeight - headHeight - panelPaddingTop - panelPaddingBottom);

        pickerPanel.style.height = previewHeight + 'px';
        pickerGrid.style.maxHeight = available + 'px';
    }

    triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
            renderTelegramPost(trigger);
        });
    });

    const themeObserver = new MutationObserver(function (mutations) {
        const shouldRerender = mutations.some(function (mutation) {
            return mutation.type === 'attributes' && mutation.attributeName === 'data-theme';
        });

        if (shouldRerender && activeTrigger) {
            renderTelegramPost(activeTrigger, { preserveFrameHeight: true });
        }
    });

    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    const previewObserver = new ResizeObserver(function () {
        syncPickerHeight();
    });

    previewObserver.observe(previewPanel);
    previewObserver.observe(embedHost);
    window.addEventListener('resize', syncPickerHeight);
    bindMobilePreviewTap();

    renderTelegramPost(activeTrigger);
    syncPickerHeight();
});

// --- БУРГЕР-МЕНЮ ---
document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    if (!burgerMenu || !navLinks) return;

    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});
