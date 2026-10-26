(function () {
  const root = document.getElementById('team-photo');
  const data = window.QAToDevTeamPhotoContours;
  if (!root || !data || data.image.width !== 1672 || data.image.height !== 941) return;

  const scene = document.getElementById('team-photo-scene');
  const photo = scene.querySelector('.team-photo__image img');
  const revealPhoto = () => {
    Promise.resolve().then(() => photo.decode?.()).catch(() => {}).then(() => {
      scene.classList.remove('is-image-loading');
    });
  };
  if (photo.complete) {
    revealPhoto();
  } else {
    photo.addEventListener('load', revealPhoto, { once: true });
    photo.addEventListener('error', () => scene.classList.remove('is-image-loading'), { once: true });
  }

  const roles = [
    { id: 'owner', title: 'Владелец продукта', source: 'owner', salary: 350000, summary: 'Решает, какие функции нужны сайту или приложению и что команда сделает сначала.' },
    { id: 'business-analyst', title: 'Бизнес-аналитик', source: 'business-analyst', salary: 250000, summary: 'Узнаёт, что нужно людям, и записывает правила работы сайта или приложения.' },
    { id: 'designer', title: 'Дизайнер', source: 'designer', salary: 180000, summary: 'Рисует, как будут выглядеть страницы сайта или экраны приложения и где будут кнопки.' },
    { id: 'system-analyst', title: 'Системный аналитик', source: 'system-analyst', salary: 260000, summary: 'Продумывает, как части сайта или приложения будут работать вместе и передавать данные.' },
    { id: 'backend-developer', title: 'Фронтенд-разработчик', source: 'frontend-developer', salary: 240000, summary: 'Делает страницы сайта и кнопки, с которыми взаимодействует пользователь.' },
    { id: 'frontend-developer', title: 'Бэкенд-разработчик', source: 'developer', salary: 270000, summary: 'Создаёт бэкенд — невидимую часть сайта или приложения. Бэкенд хранит данные и считает сумму заказа.' },
    { id: 'tester', title: 'Тестировщик', source: 'tester', salary: 130000, summary: 'Проверяет сайт или приложение, находит ошибки и смотрит, исправили ли их.' },
    { id: 'release-manager', title: 'Релиз-менеджер', source: 'release-manager', salary: 160000, summary: 'Организует выпуск готового обновления сайта или приложения и помогает команде, если после выпуска что-то сломалось.' },
    { id: 'scrum-master', title: 'Scrum-мастер', source: 'scrum-master', salary: 160000, summary: 'Помогает команде договариваться и решать проблемы, которые мешают работе.' },
    { id: 'project-manager', title: 'Менеджер проекта', source: 'project-manager', salary: 190000, summary: 'Следит за всей работой над сайтом или приложением: кто какую задачу делает и успевает ли к сроку.' },
    { id: 'devops', title: 'DevOps-инженер', source: 'devops', salary: 280000, summary: 'Настраивает компьютеры и программы, на которых работает сайт или приложение, и помогает с обновлениями.' }
  ];

  const svgNS = 'http://www.w3.org/2000/svg';
  const defs = document.getElementById('team-photo-defs');
  const shades = document.getElementById('team-photo-shades');
  const regions = document.getElementById('team-photo-regions');
  const caption = document.getElementById('team-photo-caption');
  const captionTitle = document.getElementById('team-photo-caption-title');
  const captionText = document.getElementById('team-photo-caption-text');
  const captionSalary = document.getElementById('team-photo-caption-salary');
  const captionDetails = document.getElementById('team-photo-caption-details');
  const compactView = window.matchMedia('(max-width: 650px), (hover: none) and (pointer: coarse)');
  let activeId = null;
  let pinnedId = null;
  let leaveTimer = null;
  let detailsCleanupTimer = null;
  let activeShade = null;
  let shadeSequence = 0;

  function pathFor(points) {
    return `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
  }

  function makeCutout(points) {
    const cutout = document.createElementNS(svgNS, 'path');
    cutout.classList.add('team-photo__cutout');
    cutout.setAttribute('d', pathFor(points));
    cutout.setAttribute('fill', 'black');
    cutout.setAttribute('filter', 'url(#team-photo-feather)');
    return cutout;
  }

  function makeShade(points) {
    const mask = document.createElementNS(svgNS, 'mask');
    mask.id = `team-photo-spot-${++shadeSequence}`;
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', String(data.image.width));
    mask.setAttribute('height', String(data.image.height));
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('mask-type', 'luminance');
    const background = document.createElementNS(svgNS, 'rect');
    background.setAttribute('width', String(data.image.width));
    background.setAttribute('height', String(data.image.height));
    background.setAttribute('fill', 'white');
    const cutout = makeCutout(points);
    mask.append(background, cutout);
    defs.append(mask);

    const rect = document.createElementNS(svgNS, 'rect');
    rect.classList.add('team-photo__shade');
    rect.setAttribute('width', String(data.image.width));
    rect.setAttribute('height', String(data.image.height));
    rect.setAttribute('mask', `url(#${mask.id})`);
    shades.append(rect);
    return { mask, rect, cutout };
  }

  function moveCutout(shade, points) {
    const previous = shade.cutout;
    const next = makeCutout(points);
    next.style.opacity = '0';
    shade.mask.append(next);
    getComputedStyle(next).opacity;
    previous.style.opacity = '0';
    next.style.opacity = '1';
    shade.cutout = next;
    setTimeout(() => previous.remove(), 350);
  }

  function retireShade(shade) {
    shade.rect.classList.remove('is-full');
    setTimeout(() => {
      shade.rect.remove();
      shade.mask.remove();
    }, 950);
  }

  function setActive(role) {
    clearTimeout(leaveTimer);
    if (activeId === role.id) return;
    const points = data.contours[role.id];
    if (!points) return;
    if (activeShade) {
      moveCutout(activeShade, points);
    } else {
      activeShade = makeShade(points);
      activeShade.rect.getBoundingClientRect();
      activeShade.rect.classList.add('is-full');
    }
    activeId = role.id;
    captionTitle.textContent = role.title;
    captionText.textContent = role.summary;
    captionSalary.textContent = `Зарплата: ${new Intl.NumberFormat('ru-RU').format(role.salary)} ₽/мес.`;
    const xValues = points.map(([x]) => x);
    const center = (Math.min(...xValues) + Math.max(...xValues)) / 2;
    caption.classList.toggle('is-left', center > data.image.width / 2);
    caption.classList.add('is-visible');
    caption.setAttribute('aria-hidden', 'false');
    caption.classList.remove('is-appearing');
    caption.offsetWidth;
    caption.classList.add('is-appearing');
  }

  function clearActive() {
    clearTimeout(leaveTimer);
    activeId = null;
    if (activeShade) retireShade(activeShade);
    activeShade = null;
    caption.classList.remove('is-appearing');
    caption.classList.remove('is-visible');
    caption.setAttribute('aria-hidden', 'true');
  }

  function scheduleClear(role) {
    if (pinnedId || activeId !== role.id) return;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (!pinnedId && activeId === role.id) clearActive();
    }, 1000);
  }

  function updateRegionButtons() {
    regions.querySelectorAll('.team-photo__hit').forEach(hit => {
      const isPinned = hit.dataset.roleId === pinnedId;
      hit.setAttribute('aria-pressed', String(isPinned));
      hit.setAttribute('aria-label', `${isPinned ? 'Скрыть подробности' : 'Открыть'}: ${hit.dataset.roleTitle}`);
    });
  }

  function openRole(role) {
    clearTimeout(detailsCleanupTimer);
    pinnedId = role.id;
    updateRegionButtons();
    setActive(role);
    if (compactView.matches) {
      caption.classList.remove('is-expanded');
      captionDetails.classList.remove('is-revealed');
      captionDetails.style.height = '0px';
      captionDetails.replaceChildren();
      return;
    }
    const previousHeight = caption.classList.contains('is-expanded') ? captionDetails.getBoundingClientRect().height : 0;
    captionDetails.style.height = `${previousHeight}px`;
    captionDetails.classList.remove('is-revealed');
    const source = role.source && document.querySelector(`#team .stage-panel[data-stage="${role.source}"]`);
    const paragraphs = source ? Array.from(source.querySelectorAll(':scope > p'), p => p.cloneNode(true)) : [];
    if (role.intro && paragraphs.length) {
      const first = document.createElement('p');
      first.textContent = role.intro;
      paragraphs[0] = first;
    }
    if (!paragraphs.length) {
      for (const text of role.details || [role.summary]) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        paragraphs.push(paragraph);
      }
    }
    captionDetails.replaceChildren(...paragraphs);
    caption.classList.add('is-expanded', 'is-visible');
    caption.setAttribute('aria-hidden', 'false');
    caption.scrollTop = 0;
    captionDetails.style.height = 'auto';
    const targetHeight = captionDetails.getBoundingClientRect().height;
    captionDetails.style.height = `${previousHeight}px`;
    captionDetails.getBoundingClientRect();
    captionDetails.style.height = `${targetHeight}px`;
    captionDetails.classList.add('is-revealed');
  }

  function closeRole(keepHover = false) {
    pinnedId = null;
    updateRegionButtons();
    captionDetails.style.height = `${captionDetails.getBoundingClientRect().height}px`;
    captionDetails.classList.remove('is-revealed');
    captionDetails.getBoundingClientRect();
    captionDetails.style.height = '0px';
    caption.classList.remove('is-expanded');
    if (!keepHover) clearActive();
    clearTimeout(detailsCleanupTimer);
    detailsCleanupTimer = setTimeout(() => {
      if (!pinnedId) captionDetails.replaceChildren();
    }, 500);
  }

  for (const role of roles) {
    const points = data.contours[role.id];
    if (!Array.isArray(points) || points.length < 3) continue;
    const group = document.createElementNS(svgNS, 'g');
    group.classList.add('team-photo__region');
    const hit = document.createElementNS(svgNS, 'path');
    hit.classList.add('team-photo__hit');
    hit.setAttribute('d', pathFor(points));
    hit.setAttribute('role', 'button');
    hit.setAttribute('tabindex', '0');
    hit.dataset.roleId = role.id;
    hit.dataset.roleTitle = role.title;
    hit.setAttribute('aria-pressed', 'false');
    hit.setAttribute('aria-label', `Открыть: ${role.title}`);
    hit.addEventListener('pointerenter', () => { if (!pinnedId) setActive(role); });
    hit.addEventListener('pointerleave', () => scheduleClear(role));
    hit.addEventListener('focus', () => { if (!pinnedId) setActive(role); });
    hit.addEventListener('blur', () => scheduleClear(role));
    function toggleRole() {
      if (pinnedId === role.id) {
        closeRole(!compactView.matches && hit.matches(':hover, :focus'));
      } else {
        openRole(role);
      }
    }
    hit.addEventListener('click', toggleRole);
    hit.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleRole();
    });
    group.append(hit);
    regions.append(group);
  }

  caption.addEventListener('animationend', event => {
    if (event.animationName === 'team-photo-caption-enter') caption.classList.remove('is-appearing');
  });
  window.addEventListener('resize', () => {
    if (!caption.classList.contains('is-expanded')) return;
    captionDetails.style.height = 'auto';
    const height = captionDetails.getBoundingClientRect().height;
    captionDetails.style.height = `${height}px`;
  });
  compactView.addEventListener('change', event => {
    if (!pinnedId) return;
    const role = roles.find(item => item.id === pinnedId);
    if (role) openRole(role);
  });

  document.getElementById('team-photo-scene').addEventListener('click', event => {
    if (event.target.id === 'team-photo-scene' || event.target.tagName === 'IMG') closeRole();
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pinnedId) closeRole();
  });
})();
