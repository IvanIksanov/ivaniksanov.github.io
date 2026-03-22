
/***********************
 * --- QA Skills ---
 ***********************/
document.addEventListener('DOMContentLoaded', function(){
  // Массив для хранения выбранных навыков
  let selectedSkills = [];
  const STUDY_PLAN_AUTH_BYPASS_KEY = 'study_plan_guest_auth_bypass_v1';
  const RESOURCE_STATUS_STORAGE_KEY = 'studyPlanResourceStatuses';
  const LEGACY_VISITED_STORAGE_KEY = 'studyPlanVisitedLinks';
  const RESOURCE_STATUS_CLOUD_SYNC_TS_KEY = 'studyPlanResourceStatusesCloudSyncTsV1';
  const RESOURCE_STATUS_TABLE = 'study_plan_resource_progress';
  const RESOURCE_STATUS_SYNC_TTL_MS = 20000;
  const RESOURCE_STATUSES = {
    priority: {
      label: 'Приоритет',
      className: 'status-priority'
    },
    opened: {
      label: 'Открыто',
      className: 'status-opened'
    },
    studied: {
      label: 'Изучено',
      className: 'status-studied'
    },
    verified: {
      label: 'Подтверждено',
      className: 'status-verified'
    }
  };
  const PRESET_TRACKS = {
    'manual-qa': ['scrum', 'test-design', 'quality-assurance', 'web-mobile-testing', 'mindmap', 'cross-browser', 'bdd-tdd', 'rest-api', 'postman', 'insomnia', 'charles', 'proxyman', 'devtools', 'jira', 'confluence', 'bitbucket', 'MySQL', 'postgresql', 'mongodb', 'dbeaver', 'figma', 'pixso'],
    'auto-java': ['java', 'idea', 'OOP', 'ci-cd', 'jenkins', 'selenium', 'selenide', 'rest-assured', 'allure', 'junit', 'rest-api', 'postman', 'insomnia', 'charles', 'devtools', 'MySQL', 'postgresql', 'oracle', 'dbeaver', 'git', 'github', 'docker'],
    'auto-js': ['javascript', 'vscode', 'OOP', 'ci-cd', 'cypress', 'allure', 'rest-api', 'postman', 'insomnia', 'charles', 'devtools', 'MySQL', 'mongodb', 'dbeaver', 'git', 'github', 'docker'],
    'auto-python': ['python', 'pycharm', 'OOP', 'ci-cd', 'appium', 'selenium', 'allure', 'rest-api', 'postman', 'insomnia', 'charles', 'devtools', 'MySQL', 'postgresql', 'dbeaver', 'git', 'android-studio', 'kotlin', 'xcode', 'swift'],
    'load-qa': ['jmeter', 'cypress', 'allure', 'ci-cd', 'rest-api', 'postman', 'insomnia', 'charles', 'devtools', 'MySQL', 'postgresql', 'mongodb', 'dbeaver', 'docker', 'git']
  };
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
      if (Array.isArray(parsed)) {
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
  const clearPlanFiltersButton = document.getElementById('clear-plan-filters');
  const resetPlanFiltersButton = document.getElementById('reset-plan-filters');
  const planTrackModal = document.getElementById('plan-track-modal');
  const infoToggles = Array.from(document.querySelectorAll('.info-toggle'));
  let openStatusMenu = null;
  let closeStatusMenuTimer = null;
  let openInfoPopover = null;
  let resourceStatusSyncPromise = null;
  let resourceStatusAuthSubscriptionBound = false;

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

    syncResetPlanFiltersButton();
  }

  function resetPlanFilterChips() {
    if (!planFilters) return;
    planFilters.querySelectorAll('.plan-filter-chip').forEach(function(chip) {
      chip.classList.remove('is-disabled');
    });
    applyPlanFilters();
  }

  function syncResetPlanFiltersButton() {
    if (!planFilters || !resetPlanFiltersButton) return;
    const hasDisabled = Array.from(planFilters.querySelectorAll('.plan-filter-chip')).some(function(chip) {
      return chip.classList.contains('is-disabled');
    });
    resetPlanFiltersButton.classList.toggle('is-visible', hasDisabled);
    resetPlanFiltersButton.setAttribute('aria-hidden', hasDisabled ? 'false' : 'true');
    resetPlanFiltersButton.disabled = !hasDisabled;
  }

  function clearSelectedSkills() {
    skillLinks.forEach(function(skill) {
      skill.classList.remove('selected');
      const counter = skill.querySelector('.skill-counter');
      if (counter) {
        counter.textContent = '';
      }
    });
    selectedSkills = [];
    updateSelectedSkillsStorage();
    localStorage.setItem('showStudyPlan', 'false');
    if (studyPlan) {
      studyPlan.style.display = 'none';
    }
    if (planList) {
      planList.innerHTML = '';
    }
    if (openInfoPopover) {
      closeInfoPopover(openInfoPopover);
    }
    closeTrackModal();
  }

  function setSelectedSkillsByIds(skillIds) {
    const normalized = new Set(skillIds);
    selectedSkills = [];

    skillLinks.forEach(function(skill) {
      const skillId = skill.getAttribute('data-skill-id');
      const isSelected = normalized.has(skillId);
      skill.classList.toggle('selected', isSelected);
      const counter = skill.querySelector('.skill-counter');
      if (counter) {
        counter.textContent = '';
      }
      if (isSelected) {
        selectedSkills.push(skill);
      }
    });

    updateCounters();
    updateSelectedSkillsStorage();
  }

  function closeInfoPopover(toggle) {
    if (!toggle) return;
    const targetId = toggle.dataset.infoTarget;
    const popover = targetId ? document.getElementById(targetId) : null;
    toggle.setAttribute('aria-expanded', 'false');
    if (popover) {
      popover.classList.remove('is-open');
    }
    if (openInfoPopover === toggle) {
      openInfoPopover = null;
    }
  }

  function openInfoPopoverFor(toggle) {
    const targetId = toggle?.dataset?.infoTarget;
    const popover = targetId ? document.getElementById(targetId) : null;
    if (!popover) return;
    if (openInfoPopover && openInfoPopover !== toggle) {
      closeInfoPopover(openInfoPopover);
    }
    toggle.setAttribute('aria-expanded', 'true');
    popover.classList.add('is-open');
    openInfoPopover = toggle;
  }

  function bindInfoPopovers() {
    if (!infoToggles.length) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

    infoToggles.forEach(function(toggle) {
      const targetId = toggle.dataset.infoTarget;
      const popover = targetId ? document.getElementById(targetId) : null;
      if (!popover) return;

      toggle.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        if (toggle.getAttribute('aria-expanded') === 'true') {
          closeInfoPopover(toggle);
          return;
        }
        openInfoPopoverFor(toggle);
      });

      toggle.addEventListener('touchstart', function(event) {
        event.stopPropagation();
      }, { passive: true });

      if (canHover.matches) {
        toggle.addEventListener('mouseenter', function() {
          openInfoPopoverFor(toggle);
        });

        toggle.parentElement?.addEventListener('mouseleave', function() {
          closeInfoPopover(toggle);
        });
      }
    });

    document.addEventListener('click', function(event) {
      if (!openInfoPopover) return;
      if (event.target.closest('.info-chip')) return;
      closeInfoPopover(openInfoPopover);
    });
  }

  function openTrackModal() {
    if (!planTrackModal) return;
    planTrackModal.hidden = false;
    planTrackModal.setAttribute('aria-hidden', 'false');
  }

  function closeTrackModal() {
    if (!planTrackModal) return;
    planTrackModal.hidden = true;
    planTrackModal.setAttribute('aria-hidden', 'true');
  }

  if (planFilters) {
    planFilters.querySelectorAll('.plan-filter-chip').forEach(function(chip) {
      chip.classList.remove('is-disabled');
      chip.addEventListener('click', function() {
        chip.classList.toggle('is-disabled');
        applyPlanFilters();
      });
    });
    syncResetPlanFiltersButton();
  }

  if (clearPlanFiltersButton) {
    clearPlanFiltersButton.addEventListener('click', function() {
      clearSelectedSkills();
    });
  }

  if (resetPlanFiltersButton) {
    resetPlanFiltersButton.addEventListener('click', function() {
      resetPlanFilterChips();
    });
  }

  if (planTrackModal) {
    planTrackModal.addEventListener('click', async function(event) {
      const closeTrigger = event.target.closest('[data-close-track-modal]');
      if (closeTrigger) {
        closeTrackModal();
        return;
      }

      const trackTrigger = event.target.closest('[data-track-id]');
      if (!trackTrigger) return;

      const trackSkillIds = PRESET_TRACKS[trackTrigger.dataset.trackId] || [];
      if (!trackSkillIds.length) return;

      setSelectedSkillsByIds(trackSkillIds);
      closeTrackModal();

      const allowed = await ensureAuthBeforeStudyPlan();
      if (!allowed) return;
      showStudyPlan({ shouldScroll: true });
    });
  }

  bindInfoPopovers();
  bindStudyPlanCloudSync();
  document.addEventListener('shared-auth:ready', function() {
    queueStudyPlanStatusSync({ force: true });
  });
  queueStudyPlanStatusSync({ force: false });
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
      openTrackModal();
      return;
    }
    const allowed = await ensureAuthBeforeStudyPlan();
    if (!allowed) return;
    showStudyPlan({ shouldScroll: true });
  });

  function renderStudyPlan(shouldScroll) {
    planList.innerHTML = '';
    const statusMap = loadResourceStatuses();
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

        let card = document.createElement('article');
        card.className = 'resource-card';
        card.dataset.url = url;
        card.dataset.type = typeLabel;
        card.dataset.priority = index === 0 ? 'true' : 'false';
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', 'Открыть материал в новой вкладке');
        if (skillId === 'java') {
          card.classList.add('resource-java');
        }

        let currentStatus = getResourceStatus(statusMap[url]);
        setCardStatus(card, currentStatus);

        let top = document.createElement('div');
        top.className = 'resource-top';

        let number = document.createElement('span');
        number.className = 'resource-number';
        number.textContent = index + 1;

        let type = document.createElement('span');
        type.className = 'resource-type';
        type.textContent = typeLabel;

        let statusWrap = document.createElement('div');
        statusWrap.className = 'resource-status-wrap';

        let statusButton = document.createElement('button');
        statusButton.type = 'button';
        statusButton.className = 'resource-status-button';
        statusButton.setAttribute('aria-haspopup', 'menu');
        statusButton.setAttribute('aria-expanded', 'false');

        let statusText = document.createElement('span');
        statusText.className = 'resource-status-text';
        statusButton.appendChild(statusText);

        let statusMenu = document.createElement('div');
        statusMenu.className = 'resource-status-menu';
        statusMenu.setAttribute('role', 'menu');
        statusMenu.innerHTML = [
          '<button type="button" class="resource-status-option" data-status="opened" role="menuitem">Открыто</button>',
          '<button type="button" class="resource-status-option" data-status="studied" role="menuitem">Изучено</button>',
          '<button type="button" class="resource-status-option resource-status-option-disabled" disabled aria-disabled="true">Тест скоро</button>'
        ].join('');

        statusWrap.appendChild(statusButton);
        statusWrap.appendChild(statusMenu);

        top.appendChild(number);
        top.appendChild(type);
        top.appendChild(statusWrap);

        let title = document.createElement('div');
        title.className = 'resource-title';
        title.textContent = parsed.displayHost || parsed.fallback;

        let mainLink = document.createElement('div');
        mainLink.className = 'resource-main-link';
        mainLink.appendChild(top);
        mainLink.appendChild(title);

        let suppressNextClick = false;

        function openResource() {
          const savedStatus = getResourceStatus(statusMap[url]);
          if (!savedStatus) {
            updateCardStatus('opened');
          }
          window.open(url, '_blank', 'noopener,noreferrer');
        }

        function updateCardStatus(nextStatus) {
          const normalizedStatus = getResourceStatus(nextStatus);
          if (!normalizedStatus) return;
          const nextEntry = setResourceStatusEntry(statusMap, url, normalizedStatus, {
            skillId: skillId,
            resourceType: typeLabel
          });
          syncCardIndicator(card, statusButton, getResourceStatus(nextEntry));
        }

        syncCardIndicator(card, statusButton, currentStatus);

        card.addEventListener('click', function(event){
          if (event.target.closest('.resource-status-wrap')) return;
          if (suppressNextClick) {
            suppressNextClick = false;
            return;
          }
          openResource();
        });

        card.addEventListener('keydown', function(event) {
          if (event.target.closest('.resource-status-wrap')) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openResource();
        });

        statusButton.addEventListener('click', function(event) {
          if (statusButton.dataset.readonly === 'true') {
            event.preventDefault();
            event.stopPropagation();
            openResource();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          toggleStatusMenu(card, statusButton);
        });

        statusButton.addEventListener('mouseenter', function() {
          if (statusButton.dataset.readonly === 'true') return;
          if (window.matchMedia('(hover: hover)').matches) {
            clearScheduledStatusMenuClose();
            openCardStatusMenu(card, statusButton);
          }
        });

        statusWrap.addEventListener('mouseenter', function() {
          if (window.matchMedia('(hover: hover)').matches) {
            clearScheduledStatusMenuClose();
          }
        });

        statusWrap.addEventListener('mouseleave', function() {
          if (window.matchMedia('(hover: hover)').matches) {
            scheduleStatusMenuClose(card, statusButton);
          }
        });

        card.addEventListener('mouseleave', function() {
          if (window.matchMedia('(hover: hover)').matches) {
            clearScheduledStatusMenuClose();
            closeCardStatusMenu(card, statusButton);
          }
        });

        statusMenu.querySelectorAll('.resource-status-option[data-status]').forEach(function(option) {
          option.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            updateCardStatus(option.dataset.status);
            closeCardStatusMenu(card, statusButton);
          });
        });

        bindLongPressMenu(card, function() {
          if (statusButton.dataset.readonly === 'true') return;
          suppressNextClick = true;
          openCardStatusMenu(card, statusButton);
        });

        card.appendChild(mainLink);

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

  function loadResourceStatuses() {
    const nextMap = {};
    const savedStatuses = loadVisitedLinks(RESOURCE_STATUS_STORAGE_KEY);
    Object.keys(savedStatuses || {}).forEach(function(url) {
      const entry = normalizeResourceStatusEntry(savedStatuses[url]);
      const status = getResourceStatus(entry);
      if (status) {
        nextMap[url] = entry;
      }
    });

    const legacyVisitedMap = loadVisitedLinks(LEGACY_VISITED_STORAGE_KEY);
    Object.keys(legacyVisitedMap || {}).forEach(function(url) {
      if (legacyVisitedMap[url] && !nextMap[url]) {
        nextMap[url] = buildResourceStatusEntry('opened', { updatedAt: null });
      }
    });

    return nextMap;
  }

  function saveResourceStatuses(map) {
    localStorage.setItem(RESOURCE_STATUS_STORAGE_KEY, JSON.stringify(map));
  }

  function normalizeResourceStatusEntry(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      return RESOURCE_STATUSES[value] ? {
        status: value,
        updatedAt: null,
        skillId: null,
        resourceType: null
      } : null;
    }
    if (typeof value !== 'object') return null;
    const status = RESOURCE_STATUSES[value.status] ? value.status : null;
    if (!status) return null;
    return {
      status: status,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
      skillId: typeof value.skillId === 'string' ? value.skillId : null,
      resourceType: typeof value.resourceType === 'string' ? value.resourceType : null
    };
  }

  function buildResourceStatusEntry(status, options) {
    const normalizedStatus = RESOURCE_STATUSES[status] ? status : null;
    if (!normalizedStatus) return null;
    const nextOptions = options || {};
    return {
      status: normalizedStatus,
      updatedAt: nextOptions.updatedAt || new Date().toISOString(),
      skillId: nextOptions.skillId || null,
      resourceType: nextOptions.resourceType || null
    };
  }

  function getResourceStatus(value) {
    if (typeof value === 'string' && RESOURCE_STATUSES[value]) {
      return value;
    }
    if (value && typeof value === 'object' && RESOURCE_STATUSES[value.status]) {
      return value.status;
    }
    return null;
  }

  function getResourceStatusUpdatedAt(value) {
    const entry = normalizeResourceStatusEntry(value);
    if (!entry?.updatedAt) return 0;
    const ts = Date.parse(entry.updatedAt);
    return Number.isFinite(ts) ? ts : 0;
  }

  function setResourceStatusEntry(map, url, status, options) {
    const nextEntry = buildResourceStatusEntry(status, options);
    if (!nextEntry) return null;
    map[url] = nextEntry;
    saveResourceStatuses(map);
    queueStudyPlanStatusSync({ force: true });
    return nextEntry;
  }

  function getResourceSyncLastTs() {
    try {
      return Number(localStorage.getItem(RESOURCE_STATUS_CLOUD_SYNC_TS_KEY) || 0);
    } catch (e) {
      return 0;
    }
  }

  function markResourceSyncTs() {
    try {
      localStorage.setItem(RESOURCE_STATUS_CLOUD_SYNC_TS_KEY, String(Date.now()));
    } catch (e) {}
  }

  function isStudyPlanCloudReady() {
    return !!(window.AppSupabase?.url && window.AppSupabase?.anonKey);
  }

  async function ensureStudyPlanAuthUser() {
    if (!isStudyPlanCloudReady()) return null;
    const supabaseStore = window.AppSupabase;
    try {
      const session = typeof supabaseStore.getSession === 'function'
        ? await supabaseStore.getSession()
        : null;
      if (session?.user) return session.user;
      if (typeof supabaseStore.getUser === 'function') {
        return await supabaseStore.getUser();
      }
    } catch (e) {
      console.warn('Study plan auth context failed', e);
    }
    return null;
  }

  async function studyPlanRestRequest(pathName, options) {
    const supabaseStore = window.AppSupabase;
    if (!isStudyPlanCloudReady() || !supabaseStore) {
      throw new Error('Supabase is not ready');
    }
    const nextOptions = options || {};
    const method = nextOptions.method || 'GET';
    const query = nextOptions.query || '';
    const prefer = Object.prototype.hasOwnProperty.call(nextOptions, 'prefer') ? nextOptions.prefer : 'return=representation';
    const body = nextOptions.body || null;
    const session = typeof supabaseStore.getSession === 'function'
      ? await supabaseStore.getSession()
      : null;
    const url = new URL('/rest/v1/' + pathName, supabaseStore.url);
    if (query) {
      url.search = query;
    }
    const headers = {
      apikey: supabaseStore.anonKey,
      Authorization: 'Bearer ' + (session?.access_token || supabaseStore.anonKey)
    };
    if (prefer) {
      headers.Prefer = prefer;
    }
    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url.toString(), {
      method: method,
      headers: headers,
      body: body !== null ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      throw new Error('Study plan REST ' + method + ' ' + pathName + ' failed: ' + response.status + ' ' + await response.text());
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadCloudResourceStatuses(userId) {
    if (!userId || !isStudyPlanCloudReady()) return [];
    const data = await studyPlanRestRequest(RESOURCE_STATUS_TABLE, {
      method: 'GET',
      query: 'select=resource_url,status,skill_id,resource_type,updated_at&user_id=eq.' + encodeURIComponent(userId),
      prefer: ''
    });
    return Array.isArray(data) ? data : [];
  }

  async function upsertCloudResourceStatuses(rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    await studyPlanRestRequest(RESOURCE_STATUS_TABLE, {
      method: 'POST',
      query: 'on_conflict=user_id,resource_url',
      body: rows,
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  function mergeStudyPlanStatusMaps(localMap, cloudRows, userId) {
    const mergedMap = Object.assign({}, localMap);
    const rowsToUpload = [];

    (cloudRows || []).forEach(function(row) {
      if (!row?.resource_url) return;
      const cloudEntry = buildResourceStatusEntry(row.status, {
        updatedAt: row.updated_at || null,
        skillId: row.skill_id || null,
        resourceType: row.resource_type || null
      });
      if (!cloudEntry) return;

      const localEntry = normalizeResourceStatusEntry(mergedMap[row.resource_url]);
      const localTs = getResourceStatusUpdatedAt(localEntry);
      const cloudTs = getResourceStatusUpdatedAt(cloudEntry);

      if (!localEntry || cloudTs >= localTs) {
        mergedMap[row.resource_url] = cloudEntry;
      } else {
        rowsToUpload.push({
          user_id: userId,
          resource_url: row.resource_url,
          status: localEntry.status,
          skill_id: localEntry.skillId || null,
          resource_type: localEntry.resourceType || null,
          updated_at: localEntry.updatedAt || new Date().toISOString()
        });
      }
    });

    Object.keys(localMap || {}).forEach(function(url) {
      const entry = normalizeResourceStatusEntry(localMap[url]);
      if (!entry) return;
      const hasCloudRow = (cloudRows || []).some(function(row) {
        return row?.resource_url === url;
      });
      if (!hasCloudRow) {
        rowsToUpload.push({
          user_id: userId,
          resource_url: url,
          status: entry.status,
          skill_id: entry.skillId || null,
          resource_type: entry.resourceType || null,
          updated_at: entry.updatedAt || new Date().toISOString()
        });
      }
    });

    return {
      mergedMap: mergedMap,
      rowsToUpload: rowsToUpload
    };
  }

  async function syncStudyPlanResourceStatuses(options) {
    const nextOptions = options || {};
    const force = !!nextOptions.force;
    if (!isStudyPlanCloudReady()) return { ok: false, skipped: 'cloud-unavailable' };
    const authUser = await ensureStudyPlanAuthUser();
    if (!authUser?.id) return { ok: false, skipped: 'guest' };
    if (!force && resourceStatusSyncPromise) return resourceStatusSyncPromise;
    if (!force && (Date.now() - getResourceSyncLastTs()) < RESOURCE_STATUS_SYNC_TTL_MS) {
      return { ok: true, skipped: 'ttl' };
    }

    resourceStatusSyncPromise = (async function() {
      try {
        const localMap = loadResourceStatuses();
        const cloudRows = await loadCloudResourceStatuses(authUser.id);
        const merged = mergeStudyPlanStatusMaps(localMap, cloudRows, authUser.id);

        saveResourceStatuses(merged.mergedMap);

        if (merged.rowsToUpload.length) {
          await upsertCloudResourceStatuses(merged.rowsToUpload);
        }

        if (merged.rowsToUpload.length || cloudRows.length) {
          const finalCloudRows = await loadCloudResourceStatuses(authUser.id);
          const finalMap = {};
          finalCloudRows.forEach(function(row) {
            const entry = buildResourceStatusEntry(row.status, {
              updatedAt: row.updated_at || null,
              skillId: row.skill_id || null,
              resourceType: row.resource_type || null
            });
            if (entry && row.resource_url) {
              finalMap[row.resource_url] = entry;
            }
          });
          saveResourceStatuses(finalMap);
        }

        markResourceSyncTs();
        if (studyPlan && studyPlan.style.display !== 'none') {
          renderStudyPlan(false);
        }
        return { ok: true };
      } catch (e) {
        console.warn('Study plan status sync failed', e);
        return { ok: false, error: e };
      } finally {
        resourceStatusSyncPromise = null;
      }
    })();

    return resourceStatusSyncPromise;
  }

  function queueStudyPlanStatusSync(options) {
    const nextOptions = options || {};
    setTimeout(function() {
      syncStudyPlanResourceStatuses(nextOptions).catch(function(error) {
        console.warn('Queued study plan status sync failed', error);
      });
    }, 0);
  }

  function bindStudyPlanCloudSync() {
    if (resourceStatusAuthSubscriptionBound) return;

    const bindSubscription = function() {
      const client = window.AppSupabase?.client;
      if (!client?.auth?.onAuthStateChange || resourceStatusAuthSubscriptionBound) return;
      resourceStatusAuthSubscriptionBound = true;
      client.auth.onAuthStateChange(function(event, session) {
        if (session?.user) {
          queueStudyPlanStatusSync({ force: true });
        }
      });
    };

    bindSubscription();
    [600, 1800, 4000].forEach(function(delay) {
      setTimeout(function() {
        bindSubscription();
        queueStudyPlanStatusSync({ force: false });
      }, delay);
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        queueStudyPlanStatusSync({ force: true });
      }
    });

    setInterval(function() {
      if (document.visibilityState !== 'visible') return;
      queueStudyPlanStatusSync({ force: false });
    }, 60000);
  }

  function setCardStatus(card, status) {
    const normalizedStatus = getResourceStatus(status);
    card.dataset.status = normalizedStatus || '';
    card.classList.remove('has-status', 'status-priority', 'status-opened', 'status-studied', 'status-verified');
    if (normalizedStatus) {
      const meta = RESOURCE_STATUSES[normalizedStatus];
      card.classList.add('has-status', meta.className);
      return;
    }
    if (card.dataset.priority === 'true') {
      card.classList.add('has-status', 'status-priority');
    }
  }

  function updateStatusButton(button, status, card) {
    const normalizedStatus = getResourceStatus(status);
    button.classList.remove('status-priority', 'status-opened', 'status-studied', 'status-verified');
    if (!normalizedStatus && card?.dataset.priority === 'true') {
      const meta = RESOURCE_STATUSES.priority;
      button.dataset.status = 'priority';
      button.dataset.readonly = 'true';
      button.classList.add(meta.className);
      button.querySelector('.resource-status-text').textContent = meta.label;
      button.setAttribute('aria-label', 'Приоритетный материал.');
      return;
    }
    if (!normalizedStatus) {
      button.dataset.status = '';
      button.dataset.readonly = 'false';
      button.querySelector('.resource-status-text').textContent = '';
      button.setAttribute('aria-label', 'Открыть меню статуса');
      return;
    }
    const meta = RESOURCE_STATUSES[normalizedStatus];
    button.dataset.status = normalizedStatus;
    button.dataset.readonly = 'false';
    button.classList.add(meta.className);
    button.querySelector('.resource-status-text').textContent = meta.label;
    button.setAttribute('aria-label', 'Статус: ' + meta.label + '. Нажмите, чтобы изменить.');
  }

  function syncCardIndicator(card, button, status) {
    setCardStatus(card, status);
    updateStatusButton(button, status, card);
  }

  function openCardStatusMenu(card, button) {
    clearScheduledStatusMenuClose();
    if (openStatusMenu && openStatusMenu.card !== card) {
      closeCardStatusMenu(openStatusMenu.card, openStatusMenu.button);
    }
    card.classList.add('status-menu-open');
    button.setAttribute('aria-expanded', 'true');
    updateStatusMenuViewport(card);
    openStatusMenu = { card: card, button: button };
  }

  function closeCardStatusMenu(card, button) {
    clearScheduledStatusMenuClose();
    card.classList.remove('status-menu-open');
    button.setAttribute('aria-expanded', 'false');
    const wrap = card.querySelector('.resource-status-wrap');
    if (wrap) {
      wrap.classList.remove('menu-open-up', 'menu-open-left');
      wrap.style.removeProperty('--status-menu-shift-x');
    }
    if (openStatusMenu && openStatusMenu.card === card) {
      openStatusMenu = null;
    }
  }

  function toggleStatusMenu(card, button) {
    if (card.classList.contains('status-menu-open')) {
      closeCardStatusMenu(card, button);
      return;
    }
    openCardStatusMenu(card, button);
  }

  function scheduleStatusMenuClose(card, button) {
    clearScheduledStatusMenuClose();
    closeStatusMenuTimer = setTimeout(function() {
      closeCardStatusMenu(card, button);
    }, 120);
  }

  function clearScheduledStatusMenuClose() {
    if (!closeStatusMenuTimer) return;
    clearTimeout(closeStatusMenuTimer);
    closeStatusMenuTimer = null;
  }

  function updateStatusMenuViewport(card) {
    const wrap = card.querySelector('.resource-status-wrap');
    const menu = card.querySelector('.resource-status-menu');
    if (!wrap || !menu) return;

    wrap.classList.remove('menu-open-up', 'menu-open-left');
    wrap.style.removeProperty('--status-menu-shift-x');

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      wrap.classList.add('menu-open-left');
    }
    if (rect.bottom > window.innerHeight - 8) {
      wrap.classList.add('menu-open-up');
    }

    const nextRect = menu.getBoundingClientRect();
    let shiftX = 0;
    if (nextRect.left < 8) {
      shiftX = 8 - nextRect.left;
    } else if (nextRect.right > window.innerWidth - 8) {
      shiftX = (window.innerWidth - 8) - nextRect.right;
    }
    if (shiftX !== 0) {
      wrap.style.setProperty('--status-menu-shift-x', shiftX + 'px');
    }
  }

  function bindLongPressMenu(card, onLongPress) {
    let timerId = null;
    let longPressTriggered = false;

    function clearLongPress() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    }

    card.addEventListener('touchstart', function(event) {
      if (event.target.closest('.resource-status-button') || event.target.closest('.resource-status-menu')) return;
      longPressTriggered = false;
      clearLongPress();
      timerId = setTimeout(function() {
        longPressTriggered = true;
        onLongPress();
      }, 420);
    }, { passive: true });

    card.addEventListener('touchend', clearLongPress, { passive: true });
    card.addEventListener('touchmove', clearLongPress, { passive: true });
    card.addEventListener('touchcancel', clearLongPress, { passive: true });

    card.addEventListener('contextmenu', function(event) {
      event.preventDefault();
      onLongPress();
    });

    card.addEventListener('click', function(event) {
      if (longPressTriggered) {
        event.preventDefault();
        event.stopPropagation();
        longPressTriggered = false;
      }
    }, true);
  }

  document.addEventListener('click', function(event) {
    if (!openStatusMenu) return;
    if (event.target.closest('.resource-status-wrap')) return;
    closeCardStatusMenu(openStatusMenu.card, openStatusMenu.button);
  });

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
