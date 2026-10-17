(() => {
  'use strict';

  const cameraKey = 'qatodev_course_chapter_camera';
  const firstLayoutKey = 'qatodev_course_chapter_first_layout';
  const chapter = document.body.dataset.chapter;
  const current = chapter === '3' ? 2 : chapter === '2' ? 1 : 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const links = [...document.querySelectorAll('[data-course-chapter]')];
  const viewport = document.getElementById('course-scroller');
  const sourceCanvas = document.getElementById('course-canvas');
  const sourceNodes = document.getElementById('course-nodes');
  const svgNs = 'http://www.w3.org/2000/svg';

  const icons = {
    client: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    balance: '<path d="M12 3v18M5 7h14M4 7l-2 5h6l-2-5m12 0-2 5h6l-2-5M2 12c0 2 6 2 6 0m8 0c0 2 6 2 6 0M8 21h8"/>',
    server: '<rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    assets: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z"/><path d="M9 14h6"/>',
    storage: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M8 13h8m-8 3h5"/>',
    'svc-auth': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    'svc-catalog': '<path d="M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5"/>',
    'svc-payment': '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    'ext-keycloak': '<path d="M12 3 4 7v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7z"/><path d="m9 12 2 2 4-4"/>',
    'ext-gateway': '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    'ext-bank': '<path d="m3 9 9-5 9 5M4 20h16M6 10v8m4-8v8m4-8v8m4-8v8"/>'
  };
  const first = {
    client: { x: 640, y: 460, w: 292, title: 'Клиент' },
    balancer: { x: 1170, y: 530, w: 292, title: 'Балансировщик' },
    'app-a': { x: 1660, y: 400, w: 292, title: 'Сервер приложения A' },
    'app-b': { x: 1660, y: 710, w: 292, title: 'Сервер приложения B' },
    database: { x: 2220, y: 570, w: 292, title: 'База данных' },
    assets: { x: 1260, y: 75, w: 292, title: 'CDN · копии файлов' },
    storage: { x: 1940, y: 75, w: 292, title: 'Источник файлов' }
  };
  const second = {
    client: { x: 640, y: 460, w: 292, title: 'Клиент' },
    balancer: { x: 1170, y: 530, w: 292, title: 'Балансировщик' },
    'app-a': { x: 1660, y: 365, w: 292, title: 'Сервер приложения A' },
    'app-b': { x: 1660, y: 735, w: 292, title: 'Сервер приложения B' },
    database: { x: 2510, y: 560, w: 292, title: 'PostgreSQL · каталог' },
    'svc-auth': { x: 2095, y: 355, w: 188, title: 'Авторизация' },
    'svc-catalog': { x: 2095, y: 545, w: 188, title: 'Каталог товаров' },
    'svc-payment': { x: 2095, y: 735, w: 188, title: 'Оплата' },
    'ext-keycloak': { x: 2480, y: 255, w: 160, title: 'Keycloak' },
    'ext-gateway': { x: 2480, y: 830, w: 170, title: 'Платёжный API' },
    'ext-bank': { x: 2765, y: 830, w: 155, title: 'Банк / эквайер' }
  };
  const firstEdges = [
    ['client', 'balancer'], ['balancer', 'app-a'], ['balancer', 'app-b'],
    ['app-a', 'database'], ['app-b', 'database'], ['client', 'assets'], ['assets', 'storage']
  ];
  function secondEdges() {
    return [['client', 'balancer'], ['balancer', 'app-a'], ['balancer', 'app-b'], ['app-a', 'svc-auth'], ['app-a', 'svc-catalog'], ['app-a', 'svc-payment'], ['app-b', 'svc-auth'], ['app-b', 'svc-catalog'], ['app-b', 'svc-payment'], ['svc-catalog', 'database'], ['svc-auth', 'ext-keycloak'], ['svc-payment', 'ext-gateway'], ['ext-gateway', 'ext-bank']];
  }
  const allIds = [...new Set([...Object.keys(first), ...Object.keys(second)])];
  const packetIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h7l5 5v15H7zM14 2v5h5"/></svg>';
  const directionIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';

  let progress = current;
  let target = current;
  let stage = null;
  let frame = 0;
  let lastFrame = 0;
  let commitTimer = 0;
  let navigating = false;

  function closeSavedPanels() {
    const key = chapter === '1' ? 'qatodev_course_client_server_v1' : chapter === '2' ? 'qatodev_course_microservices_v1' : 'qatodev_course_infrastructure_v2';
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (chapter === '1') saved.panels = { article: null, network: null };
      else { saved.article = ''; saved.networkOpen = false; saved.journalOpen = false; }
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {}
  }

  try {
    const pending = JSON.parse(sessionStorage.getItem(cameraKey) || 'null');
    sessionStorage.removeItem(cameraKey);
    if (pending?.to === chapter && Date.now() - pending.at < 15000) {
      if (Number.isFinite(pending.camera?.x) && Number.isFinite(pending.camera?.y)) window.courseChapterEntryCamera = pending.camera;
      if (pending.closePanels) closeSavedPanels();
      if (!reducedMotion.matches) {
        document.body.classList.add('course-chapter-arriving');
        const reveal = () => {
          if (!document.body.classList.contains('course-ready')) { requestAnimationFrame(reveal); return; }
          requestAnimationFrame(() => {
            document.body.classList.add('course-chapter-entered');
            setTimeout(() => document.body.classList.remove('course-chapter-arriving', 'course-chapter-entered'), 240);
          });
        };
        requestAnimationFrame(reveal);
      }
    }
  } catch {}

  function rememberCamera(to, camera = window.courseMapMotion?.snapshot()) {
    try { sessionStorage.setItem(cameraKey, JSON.stringify({ to, at: Date.now(), camera, closePanels: true })); } catch {}
  }

  function firstLayout() {
    let saved = null;
    if (current === 0) {
      const nodes = {};
      for (const id of Object.keys(first)) {
        const element = sourceNodes.querySelector(`[data-node="${id}"]`);
        if (element) nodes[id] = { x: parseFloat(element.style.left), y: parseFloat(element.style.top) };
      }
      const packets = [...document.querySelectorAll('#course-packets [data-packet]')]
        .filter(element => !element.hidden && element.classList.contains('is-visible'))
        .map(element => ({
          id: element.dataset.packet,
          x: parseFloat(element.style.left),
          y: parseFloat(element.style.top),
          className: element.className,
          pair: element.dataset.pair || '',
          title: element.querySelector('.course-packet__title')?.textContent || '',
          flow: element.querySelector('.course-packet__flow')?.textContent || '',
          number: element.querySelector('.course-packet__numbers span')?.textContent || '',
          arrow: !!element.querySelector('.course-packet__arrow'),
          arrowStyle: element.querySelector('.course-packet__arrow')?.getAttribute('style') || ''
        }));
      saved = { nodes, packets };
      try { localStorage.setItem(firstLayoutKey, JSON.stringify(saved)); } catch {}
    } else {
      try { saved = JSON.parse(localStorage.getItem(firstLayoutKey) || 'null'); } catch {}
    }
    for (const [id, point] of Object.entries(saved?.nodes || {})) {
      if (!first[id]) continue;
      if (Number.isFinite(point.x)) first[id].x = point.x;
      if (Number.isFinite(point.y)) first[id].y = point.y;
    }
    return saved?.packets || [];
  }

  function makePacket(data) {
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return null;
    const original = current === 0 ? document.querySelector(`#course-packets [data-packet="${data.id}"]`) : null;
    const packet = original ? original.cloneNode(true) : document.createElement('button');
    if (!original) {
      packet.type = 'button';
      packet.className = data.className || 'course-packet is-visible';
      packet.dataset.packet = data.id;
      if (data.pair) packet.dataset.pair = data.pair;
      packet.innerHTML = `${data.number ? `<span class="course-packet__numbers" aria-hidden="true"><span>${data.number}</span></span>` : ''}${packetIcon}<span class="course-packet__title"></span><small class="course-packet__flow"></small>${data.arrow ? `<span class="course-packet__arrow" aria-hidden="true">${directionIcon}</span>` : ''}`;
      packet.querySelector('.course-packet__title').textContent = data.title;
      packet.querySelector('.course-packet__flow').textContent = data.flow;
      if (data.arrowStyle) packet.querySelector('.course-packet__arrow')?.setAttribute('style', data.arrowStyle);
    }
    packet.hidden = false;
    packet.classList.remove('is-transiting', 'is-transiting-resource', 'is-hiding');
    packet.style.left = `${data.x}px`;
    packet.style.top = `${data.y}px`;
    packet.tabIndex = -1;
    return packet;
  }

  function focusAnchor(camera) {
    const scale = camera.scale || 1;
    const centerX = (viewport.clientWidth / 2 - camera.x) / scale;
    const centerY = (viewport.clientHeight / 2 - camera.y) / scale;
    return ['client', 'balancer', 'app-a', 'app-b', 'database'].reduce((best, id) => {
      const node = current ? second[id] : first[id];
      const dx = node.x + node.w / 2 - centerX;
      const dy = node.y + 91 - centerY;
      const distance = dx * dx + dy * dy;
      return !best || distance < best.distance ? { id, distance } : best;
    }, null).id;
  }

  function cameraAt(camera, anchor, value) {
    const start = current ? second[anchor] : first[anchor];
    const point = first[anchor];
    const end = second[anchor];
    const layout = Math.min(1, value);
    const x = point.x + (end.x - point.x) * layout;
    const y = point.y + (end.y - point.y) * layout;
    return { ...camera, x: camera.x - (x - start.x) * camera.scale, y: camera.y - (y - start.y) * camera.scale };
  }

  function setSelected(value) {
    links.forEach(link => {
      if (Number(link.dataset.courseChapter) - 1 === value) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function makeCard(id) {
    const original = sourceNodes.querySelector(`[data-node="${id}"]`);
    const card = original && !original.hidden ? original.cloneNode(true) : document.createElement('div');
    if (!original || original.hidden) {
      card.className = 'questions-map-card course-node is-visible';
      card.innerHTML = `<span class="course-node__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[id === 'balancer' ? 'balance' : id.startsWith('app-') ? 'server' : id]}</svg></span><button class="questions-map-card__question" type="button"><span class="course-node__title"></span></button>`;
    }
    card.hidden = false;
    card.classList.add('is-visible');
    card.dataset.node = id;
    card.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
    card.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
    if (id === 'app-a' || id === 'app-b') {
      const question = card.querySelector('.questions-map-card__question');
      let infra = null;
      try { infra = JSON.parse(localStorage.getItem('qatodev_course_infrastructure_v2') || 'null'); } catch {}
      const member = id.at(-1);
      const online = infra?.nodeOnline?.[member] !== false;
      const versionNumber = infra?.podVersions?.[member] || infra?.productionVersion || 2;
      const unavailable = !online || infra?.healthy === false || !!(infra?.brokenConfig && infra?.pendingVersion && versionNumber === infra.pendingVersion);
      if (question && !question.querySelector('.course-infra-version')) {
        const version = document.createElement('small');
        version.className = 'course-infra-version';
        version.textContent = `Pod ${member.toUpperCase()} · контейнер v${versionNumber} · ${unavailable ? 'NotReady' : 'Ready'}`;
        question.append(version);
      }
      if (question && !question.querySelector('.course-infra-node-detail')) {
        const detail = document.createElement('small');
        detail.className = 'course-infra-node-detail';
        detail.textContent = `kubelet · Node ${online ? 'Ready' : 'NotReady'}`;
        question.insertBefore(detail, question.querySelector('.course-infra-version'));
      }
    }
    if (id.startsWith('svc-')) {
      const question = card.querySelector('.questions-map-card__question');
      if (question && !question.querySelector('.course-infra-service-version')) {
        let serviceVersion = 2;
        try {
          const saved = JSON.parse(localStorage.getItem('qatodev_course_infrastructure_v2') || 'null');
          serviceVersion = saved?.serviceVersions?.[id.slice(4)] || saved?.productionVersion || 2;
        } catch {}
        const version = document.createElement('small');
        version.className = 'course-infra-service-version';
        version.textContent = `Pod · v${serviceVersion}`;
        question.append(version);
      }
    }
    card.querySelectorAll('.is-flowing-forward, .is-flowing-back, .is-processing, .is-processing-resource, .is-flowing-resource').forEach(child => {
      child.classList.remove('is-flowing-forward', 'is-flowing-back', 'is-processing', 'is-processing-resource', 'is-flowing-resource');
    });
    return card;
  }

  function makeIntro(model) {
    const copy = sourceCanvas.querySelector('.course-intro').cloneNode(true);
    if (model !== 3) copy.querySelector('.course-infra-phase')?.remove();
    if (model === 3 && !copy.querySelector('.course-infra-phase')) {
      const phase = document.createElement('span');
      phase.className = 'course-infra-phase';
      let message = 'Разработчик → Git → CI → production → контрольный GET';
      try {
        const lastRun = JSON.parse(localStorage.getItem('qatodev_course_infrastructure_v2') || 'null')?.lastRun;
        message = lastRun?.message || message;
        phase.dataset.tone = lastRun?.outcome === 'deployed' || lastRun?.outcome === 'rolled-back' ? 'ok' : lastRun?.outcome === 'deployed-partial' ? 'warning' : lastRun?.outcome?.endsWith('failed') ? 'error' : '';
      } catch {}
      phase.textContent = message;
      copy.append(phase);
    }
    copy.dataset.stageChapter = String(model);
    copy.querySelector('.course-eyebrow').textContent = `Вводный курс · глава 0${model}`;
    copy.querySelector('h1').textContent = model === 1 ? 'Клиент → Сервер' : model === 2 ? 'Микросервисы' : 'Инфраструктура';
    if (model !== 2) copy.querySelector('#course-checkout')?.remove();
    if (model === 2 && !copy.querySelector('#course-checkout')) {
      const button = document.createElement('button');
      button.className = 'course-reset';
      button.textContent = 'Оплатить товары';
      copy.append(button);
    }
    const play = copy.querySelector('#course-play');
    if (play) {
      try {
        if (model === 3) {
          const saved = JSON.parse(localStorage.getItem('qatodev_course_infrastructure_v2') || 'null');
          play.textContent = `▶ Выпустить v${saved?.pendingVersion || (saved?.productionVersion || 2) + 1}`;
        } else {
          const saved = JSON.parse(localStorage.getItem(model === 2 ? 'qatodev_course_microservices_v1' : 'qatodev_course_client_server_v1') || 'null');
          play.textContent = saved?.[model === 2 ? 'loaded' : 'pageLoaded'] ? '▶ Обновить страницу' : '▶ Загрузить страницу';
        }
      } catch {}
    }
    copy.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
    copy.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
    return copy;
  }

  function createStage() {
    const packetLayout = firstLayout();
    const root = document.createElement('div');
    root.className = 'course-chapter-stage';
    root.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('div');
    canvas.className = 'course-chapter-stage__canvas';
    const camera = window.courseMapMotion?.snapshot();
    const anchor = camera ? focusAnchor(camera) : 'client';
    canvas.style.transform = camera ? `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})` : sourceCanvas.style.transform || getComputedStyle(sourceCanvas).transform;
    const svg = document.createElementNS(svgNs, 'svg');
    svg.classList.add('course-chapter-stage__lines');
    svg.setAttribute('viewBox', '0 0 3100 1100');
    canvas.append(svg);
    const boundary = sourceCanvas.querySelector('#course-integrations')?.cloneNode(true);
    if (boundary) { boundary.removeAttribute('id'); canvas.append(boundary); }
    const toolsLayer = sourceCanvas.querySelector('#course-tools')?.cloneNode(true);
    if (toolsLayer) {
      toolsLayer.removeAttribute('id');
      toolsLayer.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
      canvas.append(toolsLayer);
    }
    const peer = document.createElementNS(svgNs, 'g');
    peer.classList.add('course-micro-peer-link');
    peer.innerHTML = '<path class="course-micro-peer-link__line"/><circle r="12"/><path class="course-micro-peer-link__check"/>';
    svg.append(peer);
    const edges = new Map();
    const otherEdges = secondEdges();
    for (const [from, to] of [...firstEdges, ...otherEdges]) {
      const key = `${from}:${to}`;
      if (edges.has(key)) continue;
      const path = document.createElementNS(svgNs, 'path');
      svg.append(path);
      edges.set(key, { from, to, first: firstEdges.some(edge => edge[0] === from && edge[1] === to), second: otherEdges.some(edge => edge[0] === from && edge[1] === to), path });
    }
    const cards = new Map();
    for (const id of allIds) {
      const card = makeCard(id);
      canvas.append(card);
      cards.set(id, card);
    }
    const packets = packetLayout.map(makePacket).filter(Boolean);
    canvas.append(...packets);
    const intro1 = makeIntro(1);
    const intro2 = makeIntro(2);
    const intro3 = makeIntro(3);
    canvas.append(intro1, intro2, intro3);
    root.append(canvas);
    viewport.append(root);
    document.body.classList.add('course-chapter-switching');
    let microFallback = chapter === '2' && !!sourceNodes.querySelector('[data-node="app-a"][data-offline="true"]');
    let infraFallback = chapter === '3' && sourceCanvas.dataset.fallbackRoute === 'true';
    let microPrimary = !microFallback;
    let infraPrimary = chapter === '3' ? sourceCanvas.dataset.primaryRoute !== 'false' : true;
    try {
      if (chapter !== '2') microFallback = JSON.parse(localStorage.getItem('qatodev_course_microservices_v1') || 'null')?.offline?.includes('app-a') || false;
      if (chapter !== '3') {
        const infraNodes = JSON.parse(localStorage.getItem('qatodev_course_infrastructure_v2') || 'null')?.nodeOnline;
        infraPrimary = infraNodes?.a !== false;
        infraFallback = infraNodes?.a === false && infraNodes?.b !== false;
      }
      microPrimary = !microFallback;
    } catch {}
    stage = { root, canvas, cards, packets, edges, boundary, toolsLayer, peer, intro1, intro2, intro3, camera, anchor, microFallback, infraFallback, microPrimary, infraPrimary };
    render();
  }

  function position(id) {
    const from = first[id] || second[id];
    const to = second[id] || first[id];
    const layout = Math.min(1, progress);
    return {
      x: from.x + (to.x - from.x) * layout,
      y: from.y + (to.y - from.y) * layout,
      w: from.w + (to.w - from.w) * layout,
      h: id.startsWith('ext-') ? 72 : id.startsWith('svc-') ? 94 : 122
    };
  }

  function render() {
    if (!stage) return;
    const layout = Math.min(1, progress);
    const tools = Math.max(0, progress - 1);
    if (stage.camera) {
      const camera = cameraAt(stage.camera, stage.anchor, progress);
      stage.canvas.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    }
    for (const [id, card] of stage.cards) {
      const point = position(id);
      card.style.left = `${point.x}px`;
      card.style.top = `${point.y}px`;
      card.style.width = `${point.w}px`;
      card.style.height = `${point.h}px`;
      card.style.opacity = first[id] && second[id] ? '1' : String(first[id] ? 1 - layout : layout);
      const title = layout < .5 ? first[id]?.title || second[id].title : second[id]?.title || first[id].title;
      card.querySelector('.course-node__title').textContent = title;
      const version = card.querySelector('.course-infra-version');
      if (version) version.style.opacity = String(tools);
      const serviceVersion = card.querySelector('.course-infra-service-version');
      if (serviceVersion) serviceVersion.style.opacity = String(tools);
      const detail = card.querySelector('.course-infra-node-detail');
      if (detail) detail.style.opacity = String(tools);
      if (id.startsWith('app-')) card.querySelector('.course-node__title').style.transform = `translateY(${-11 * tools}px)`;
    }
    for (const packet of stage.packets) {
      const cacheOpacity = packet.classList.contains('is-empty-cache') ? .32 : packet.classList.contains('is-partial-cache') ? .65 : 1;
      packet.style.opacity = String(cacheOpacity * (1 - layout));
    }
    for (const { from, to, first: inFirst, second: inSecond, path } of stage.edges.values()) {
      const a = position(from);
      const b = position(to);
      const x1 = a.x + a.w;
      const y1 = a.y + (from.startsWith('ext-') ? 48 : from.startsWith('svc-') ? 62 : 91);
      const x2 = b.x;
      const y2 = b.y + (to.startsWith('ext-') ? 48 : to.startsWith('svc-') ? 62 : 91);
      const bend = Math.max(35, Math.abs(x2 - x1) * .42);
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
      let opacity = (inFirst ? 1 - layout : 0) + (inSecond ? layout : 0);
      if (from === 'app-b' && to.startsWith('svc-')) opacity *= (stage.microFallback ? 1 : .28) * (1 - tools) + (stage.infraFallback ? 1 : 0) * tools;
      if (from === 'app-a' && to.startsWith('svc-')) opacity *= (stage.microPrimary ? 1 : 0) * (1 - tools) + (stage.infraPrimary ? 1 : 0) * tools;
      path.style.opacity = String(opacity);
    }
    const a = position('app-a');
    const b = position('app-b');
    const peerX = a.x + 266;
    const peerTop = a.y + 122;
    const peerBottom = b.y + 56;
    const peerMiddle = (peerTop + peerBottom) / 2;
    stage.peer.querySelector('path').setAttribute('d', `M ${peerX} ${peerTop} L ${peerX} ${peerBottom}`);
    stage.peer.querySelector('circle').setAttribute('cx', peerX);
    stage.peer.querySelector('circle').setAttribute('cy', peerMiddle);
    stage.peer.querySelector('.course-micro-peer-link__check').setAttribute('d', `m ${peerX - 5} ${peerMiddle} 3 3 7 -7`);
    stage.peer.style.opacity = String(layout);
    if (stage.boundary) stage.boundary.style.opacity = String(layout);
    stage.boundary?.querySelectorAll('.course-infra-cluster, .course-infra-services').forEach(item => { item.style.opacity = String(tools); });
    if (stage.toolsLayer) stage.toolsLayer.style.opacity = String(tools);
    stage.intro1.style.opacity = String(1 - layout);
    stage.intro2.style.opacity = String(layout * (1 - tools));
    stage.intro3.style.opacity = String(tools);
  }

  function cleanup() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    clearTimeout(commitTimer);
    commitTimer = 0;
    stage?.root.remove();
    stage = null;
    document.body.classList.remove('course-chapter-switching');
    setSelected(current);
  }

  function commit() {
    if (target === current || progress !== target || navigating) return;
    navigating = true;
    const to = String(target + 1);
    rememberCamera(to, stage?.camera ? cameraAt(stage.camera, stage.anchor, progress) : undefined);
    location.assign(links.find(link => link.dataset.courseChapter === to).href);
  }

  function tick(now) {
    frame = 0;
    const delta = lastFrame ? Math.min(now - lastFrame, 50) : 16;
    lastFrame = now;
    const step = delta / 760;
    progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
    render();
    if (Math.abs(progress - target) > .001) {
      frame = requestAnimationFrame(tick);
    } else if (target === current) {
      cleanup();
    } else {
      commitTimer = setTimeout(commit, 140);
    }
  }

  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (navigating) { event.preventDefault(); return; }
    const next = Number(link.dataset.courseChapter) - 1;
    if (!stage && next === current) { event.preventDefault(); return; }
    event.preventDefault();
    if (reducedMotion.matches) {
      if (next !== current) {
        firstLayout();
        const camera = window.courseMapMotion?.snapshot();
        rememberCamera(String(next + 1), camera ? cameraAt(camera, focusAnchor(camera), next) : undefined);
        location.assign(link.href);
      }
      return;
    }
    clearTimeout(commitTimer);
    commitTimer = 0;
    if (!stage) createStage();
    target = next;
    setSelected(next);
    if (!frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  }));

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    clearTimeout(commitTimer);
  });
})();
