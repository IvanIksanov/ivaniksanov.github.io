(() => {
  const questionsUrl = 'over/questions_db_snapshot.json';
  const linksUrl = 'over/questions_map_links.json';
  const categoryLabels = new Map([
    ['ТЕОРИЯ ТЕСТИРОВАНИЯ + СОФТЫ', 'Теория'],
    ['WEB', 'Web'],
    ['API', 'API'],
    ['БАЗЫ ДАННЫХ', 'БД'],
    ['GIT + IDE + SELENIUM', 'Git + IDE'],
    ['DEVOPS', 'DevOps'],
    ['Вопросы к руководителю | команде | HR', 'HR'],
    ['AQA Java', 'Java'],
    ['AQA Python', 'Python'],
    ['AQA JS', 'JS']
  ]);
  const categoryColors = new Map([
    ['Теория', ['#e8edfb', '#405888']],
    ['Web', ['#e1f3f5', '#26757c']],
    ['API', ['#e7ecfa', '#485b91']],
    ['БД', ['#f0e9fa', '#6b4e92']],
    ['Git + IDE', ['#e8f1df', '#50773a']],
    ['DevOps', ['#f9eadc', '#9b612f']],
    ['HR', ['#f9e8ee', '#9e4d6a']]
  ]);
  const languageCategories = new Map([
    ['java', 'AQA Java'],
    ['python', 'AQA Python'],
    ['javascript', 'AQA JS']
  ]);
  const specializedCategories = new Set(languageCategories.values());

  const status = document.getElementById('questions-map-status');
  const workspace = document.getElementById('questions-map-workspace');
  const rootHost = document.getElementById('questions-map-root');
  const intro = document.getElementById('questions-map-intro');
  const canvas = document.getElementById('questions-map-canvas');
  const lines = document.getElementById('questions-map-lines');
  const traceLayer = document.getElementById('questions-map-trace');
  const scroller = document.querySelector('.questions-map-scroller');
  const phoneLayout = matchMedia('(max-width: 767px)');
  const answerFrame = document.getElementById('questions-map-answer-frame');
  const answerTitle = document.getElementById('questions-map-answer-title');
  const answerCategory = document.getElementById('questions-map-answer-category');
  const answerStatus = document.getElementById('questions-map-answer-status');
  const answerPanel = document.getElementById('questions-map-answer');
  const closeAnswer = document.getElementById('questions-map-answer-close');
  const headerNotch = document.getElementById('header-ai-notch');
  const headerNotchIcon = document.getElementById('header-ai-notch-icon');
  const headerNotchText = document.getElementById('header-ai-notch-text');
  const themeToggle = document.getElementById('theme-toggle');
  const languageFilters = [...document.querySelectorAll('.questions-map-filter')];
  const stateKey = 'qatodev_questions_map_state_v1';
  const dataCacheKey = 'qatodev_questions_map_data_v1';
  const dataCacheLifetime = 60 * 1000;
  const entryRoot = new URLSearchParams(location.search).get('root') || '';
  let questions = new Map();
  let nextById = new Map();
  const progressById = new Map();
  let roots = [];
  let shownRoots = [];
  let expandedOrder = [];
  let activeLanguage = 'java';
  let selectedId = '';
  let lineFrame = 0;
  const camera = { x: 0, y: 0, scale: 1 };
  const restCamera = { x: 0, y: 0 };
  let normalScale = 1;
  const pointers = new Map();
  let gesture = null;
  let panFrame = 0;
  let panTarget = null;
  let panPrevious = 0;
  let settleTimer = 0;
  let returnFrame = 0;
  let rootReturnTimer = 0;
  let wheelGesture = null;
  let transitionTimer = 0;
  let traceTimer = 0;
  let filterVersion = 0;
  let filterExitAnimation = null;
  let dragged = false;
  let suppressClick = false;
  let clickResetTimer = 0;
  let stateReady = false;
  let stateTimer = 0;

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey) || 'null');
      return saved?.entryRoot === entryRoot ? saved : null;
    } catch { return null; }
  }

  function refreshProgress() {
    progressById.clear();
    const categories = new Set([...questions.values()].map(question => question.category));
    for (const category of categories) {
      for (const status of ['studied', 'unclear']) {
        let ids;
        try { ids = JSON.parse(localStorage.getItem(`${status}_${category}`) || '[]'); }
        catch { continue; }
        if (!Array.isArray(ids)) continue;
        for (const id of ids) {
          if (id !== 'accordion_theory_q54' && questions.get(id)?.category === category) {
            progressById.set(id, status);
          }
        }
      }
    }
    rootHost.querySelectorAll('.questions-map-branch').forEach(branch => {
      const card = branch.querySelector(':scope > .questions-map-card');
      const progress = progressById.get(branch.dataset.questionId);
      card?.classList.toggle('is-studied', progress === 'studied');
      card?.classList.toggle('is-unclear', progress === 'unclear');
    });
  }

  window.addEventListener('storage', event => {
    if (event.key === null || /^(studied_|unclear_)/.test(event.key || '')) refreshProgress();
  });
  window.addEventListener('pageshow', refreshProgress);

  function pruneExpandedOrder() {
    const expanded = new Set([...rootHost.querySelectorAll('.questions-map-card__expand[aria-expanded="true"]')]
      .map(button => button.closest('.questions-map-branch')?.dataset.questionId));
    expandedOrder = expandedOrder.filter(id => expanded.has(id));
  }

  function saveState() {
    if (!stateReady) return;
    clearTimeout(stateTimer);
    pruneExpandedOrder();
    try {
      localStorage.setItem(stateKey, JSON.stringify({
        entryRoot,
        layoutVersion: 4,
        phoneLayout: phoneLayout.matches,
        language: activeLanguage,
        expanded: expandedOrder,
        selectedId,
        articleOpen: !answerPanel.hidden,
        camera: {
          scale: camera.scale,
          normalScale,
          centerX: (visibleMapWidth() / 2 - camera.x) / camera.scale,
          centerY: (scroller.clientHeight / 2 - camera.y) / camera.scale
        }
      }));
    } catch { /* The map remains usable when browser storage is unavailable. */ }
  }

  function scheduleStateSave() {
    if (!stateReady) return;
    clearTimeout(stateTimer);
    stateTimer = setTimeout(saveState, 140);
  }

  window.addEventListener('pagehide', saveState);
  scroller.addEventListener('selectstart', event => event.preventDefault());
  scroller.addEventListener('dragstart', event => event.preventDefault());
  document.addEventListener('copy', event => {
    const selection = document.getSelection();
    if (scroller.contains(event.target) || (selection?.anchorNode && scroller.contains(selection.anchorNode))) {
      event.preventDefault();
    }
  }, true);

  themeToggle.classList.toggle('active', document.documentElement.dataset.theme === 'dark');
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    themeToggle.classList.toggle('active', next === 'dark');
  });

  function isAllowedQuestion(id) {
    const category = questions.get(id)?.category;
    return !specializedCategories.has(category) || category === languageCategories.get(activeLanguage);
  }

  languageFilters.forEach(button => button.addEventListener('click', () => {
    const nextLanguage = button.dataset.language;
    if (!roots.length || nextLanguage === activeLanguage || !languageCategories.has(nextLanguage)) return;
    activeLanguage = nextLanguage;
    languageFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    clearTimeout(traceTimer);
    traceLayer.replaceChildren();
    switchLanguageRoot();
    scheduleStateSave();
  }));

  function visibleMapWidth() {
    return workspace.classList.contains('has-answer') &&
      !phoneLayout.matches
      ? answerPanel.getBoundingClientRect().left - scroller.getBoundingClientRect().left
      : scroller.clientWidth;
  }

  function mapTopInset() {
    return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')) || 0) + 24;
  }

  function mapCenterY() {
    return (mapTopInset() + scroller.clientHeight) / 2;
  }

  function hasExpandedBranches() {
    return !!rootHost.querySelector('.questions-map-card__expand[aria-expanded="true"]');
  }

  function bounds(scale = camera.scale) {
    const width = rootHost.offsetWidth * scale;
    const height = rootHost.offsetHeight * scale;
    const visibleWidth = visibleMapWidth();
    const left = rootHost.offsetLeft * scale;
    const top = rootHost.offsetTop * scale;
    const x = width <= visibleWidth
      ? [visibleWidth / 2 - left - width / 2, visibleWidth / 2 - left - width / 2]
      : [visibleWidth / 2 - left - width, visibleWidth / 2 - left];
    const centeredY = mapCenterY() - top - height / 2;
    const topY = mapTopInset() - top;
    const expanded = hasExpandedBranches();
    const minVisibleHeight = Math.min(140, (scroller.clientHeight - mapTopInset()) * 0.25);
    const y = expanded
      ? [mapTopInset() + minVisibleHeight - top - height,
        scroller.clientHeight - minVisibleHeight - top]
      : height <= scroller.clientHeight
        ? [Math.min(topY, centeredY), Math.max(topY, centeredY)]
        : [scroller.clientHeight / 2 - top - height, scroller.clientHeight / 2 - top];
    return {
      x,
      y,
      overshootX: Math.max(1, Math.min(visibleWidth * 0.45, width * 0.9)),
      overshootY: Math.max(1, Math.min(scroller.clientHeight * 0.45, height * 0.9))
    };
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function resist(value, min, max, overshoot) {
    const edge = clamp(value, min, max);
    const distance = value - edge;
    return edge + distance / (1 + Math.abs(distance) / overshoot);
  }

  function unresist(value, min, max, overshoot) {
    const edge = clamp(value, min, max);
    const distance = value - edge;
    if (!distance) return value;
    const fraction = Math.min(Math.abs(distance) / overshoot, 1 - 1e-6);
    return edge + distance / (1 - fraction);
  }

  function gestureOrigin(center, distance) {
    const limit = bounds();
    const now = performance.now();
    return {
      center,
      lastCenter: center,
      distance,
      x: unresist(camera.x, ...limit.x, limit.overshootX),
      y: unresist(camera.y, ...limit.y, limit.overshootY),
      scale: camera.scale,
      origin: { ...camera },
      startedAt: now,
      lastMoveAt: now,
      velocityX: 0,
      velocityY: 0,
      travel: 0
    };
  }

  function resistScale(value) {
    const edge = clamp(value, 0.65, 1.8);
    const distance = value - edge;
    return edge + distance / (1 + Math.abs(distance) / 0.35) * 0.25;
  }

  function renderCamera({ animate = false } = {}) {
    clearTimeout(transitionTimer);
    if (animate) void canvas.offsetWidth;
    canvas.classList.toggle('is-settling', animate && !matchMedia('(prefers-reduced-motion: reduce)').matches);
    canvas.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    if (animate) transitionTimer = setTimeout(() => canvas.classList.remove('is-settling'), 480);
    scheduleStateSave();
  }

  function stopCameraAnimation() {
    clearTimeout(rootReturnTimer);
    rootReturnTimer = 0;
    cancelAnimationFrame(returnFrame);
    returnFrame = 0;
    if (!canvas.classList.contains('is-settling')) return;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(canvas).transform);
    camera.x = matrix.m41;
    camera.y = matrix.m42;
    camera.scale = matrix.a;
    clearTimeout(transitionTimer);
    canvas.classList.remove('is-settling');
    renderCamera();
  }

  function returnCameraTo(target, { remember = true, softStart = false } = {}) {
    if (remember) {
      restCamera.x = target.x;
      restCamera.y = target.y;
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(camera, target);
      renderCamera();
      return;
    }
    if (softStart) {
      const start = { ...camera };
      const startedAt = performance.now();
      function tick(now) {
        const progress = clamp((now - startedAt) / 520, 0, 1);
        const eased = (1 - Math.cos(Math.PI * progress)) / 2;
        camera.x = start.x + (target.x - start.x) * eased;
        camera.y = start.y + (target.y - start.y) * eased;
        camera.scale = start.scale + (target.scale - start.scale) * eased;
        if (progress < 1) {
          returnFrame = requestAnimationFrame(tick);
        } else {
          Object.assign(camera, target);
          returnFrame = 0;
        }
        renderCamera();
      }
      returnFrame = requestAnimationFrame(tick);
      return;
    }
    const displacement = Math.hypot(target.x - camera.x, target.y - camera.y);
    const fullStretch = Math.max(220, Math.min(visibleMapWidth(), scroller.clientHeight) * 0.55);
    const responseTime = 420 - 180 * clamp(displacement / fullStretch, 0, 1);
    let previous = performance.now();
    function tick(now) {
      const progress = 1 - Math.exp(-Math.min(now - previous, 34) / responseTime);
      previous = now;
      camera.x += (target.x - camera.x) * progress;
      camera.y += (target.y - camera.y) * progress;
      camera.scale += (target.scale - camera.scale) * progress;
      if (Math.abs(target.x - camera.x) < 0.25 &&
          Math.abs(target.y - camera.y) < 0.25 &&
          Math.abs(target.scale - camera.scale) < 0.001) {
        Object.assign(camera, target);
        returnFrame = 0;
      } else {
        returnFrame = requestAnimationFrame(tick);
      }
      renderCamera();
    }
    returnFrame = requestAnimationFrame(tick);
  }

  function scheduleRootReturn(target, delay) {
    rootReturnTimer = setTimeout(() => {
      rootReturnTimer = 0;
      returnCameraTo(target, { softStart: true });
    }, delay);
  }

  function rootReturnTarget(origin) {
    const limit = bounds(normalScale);
    return {
      x: clamp(origin.x, ...limit.x),
      y: clamp(origin.y, ...limit.y),
      scale: normalScale
    };
  }

  function rootGlanceDelay(motion) {
    if (!motion?.origin || !answerPanel.hidden ||
        hasExpandedBranches() ||
        Math.abs(camera.scale - normalScale) > 0.001) return 0;
    const width = visibleMapWidth();
    const maxX = Math.min(300, width * 0.34);
    const maxY = Math.min(170, scroller.clientHeight * 0.22);
    if (motion.travel < 5 || motion.travel > Math.min(340, width * 0.45) ||
        Math.abs(camera.x - restCamera.x) > maxX ||
        Math.abs(camera.y - restCamera.y) > maxY) return 0;
    return 1350;
  }

  function releaseFlick(origin, velocityX, velocityY, rootDelay = 0) {
    const limit = bounds();
    const target = rootReturnTarget(origin);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (rootDelay) scheduleRootReturn(target, rootDelay);
      else returnCameraTo(target);
      return;
    }
    const speed = Math.hypot(velocityX, velocityY);
    const coastDistance = Math.min(65, speed * 75);
    const coastX = speed ? velocityX / speed * coastDistance : 0;
    const coastY = speed ? velocityY / speed * coastDistance : 0;
    const start = { x: camera.x, y: camera.y };
    const coast = {
      x: resist(unresist(start.x, ...limit.x, limit.overshootX) + coastX,
        ...limit.x, limit.overshootX),
      y: resist(unresist(start.y, ...limit.y, limit.overshootY) + coastY,
        ...limit.y, limit.overshootY)
    };
    const startedAt = performance.now();
    function tick(now) {
      const progress = clamp((now - startedAt) / 210, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.x = start.x + (coast.x - start.x) * eased;
      camera.y = start.y + (coast.y - start.y) * eased;
      renderCamera();
      if (progress < 1) {
        returnFrame = requestAnimationFrame(tick);
      } else {
        returnFrame = 0;
        if (rootDelay) scheduleRootReturn(target, rootDelay);
        else returnCameraTo(target, { softStart: true });
      }
    }
    returnFrame = requestAnimationFrame(tick);
  }

  function isShortFlick(motion, now = performance.now(), maxDuration = 650) {
    return motion && now - motion.startedAt < maxDuration &&
      now - motion.lastMoveAt < 105 && motion.travel < 175 &&
      Math.hypot(motion.velocityX, motion.velocityY) > 0.12 &&
      Math.abs(camera.scale - normalScale) < 0.001;
  }

  function settleCamera() {
    stopCameraAnimation();
    const scale = normalScale;
    const width = visibleMapWidth();
    const centerX = width / 2;
    const centerY = mapCenterY();
    const visibleTop = mapTopInset();
    const ratio = scale / camera.scale;
    const projectedX = centerX - (centerX - camera.x) * ratio;
    const projectedY = centerY - (centerY - camera.y) * ratio;
    const limit = bounds(scale);
    let targetX = clamp(projectedX, ...limit.x);
    let targetY = clamp(projectedY, ...limit.y);
    const overshoot = Math.hypot(projectedX - targetX, projectedY - targetY);

    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      return rect.right > 0 && rect.left < width &&
        rect.bottom > visibleTop && rect.top < scroller.clientHeight;
    };
    const expandedVisible = [...rootHost.querySelectorAll('.questions-map-card__expand[aria-expanded="true"]')]
      .some(button => {
        const branch = button.closest('.questions-map-branch');
        return branch && [...branch.querySelectorAll('.questions-map-card')].some(isVisible);
      });
    if (overshoot > Math.min(width, scroller.clientHeight) * 0.12 &&
        Math.abs(scale - camera.scale) < 0.001 && !expandedVisible && !isVisible(intro)) {
      const surface = canvas.getBoundingClientRect();
      const rect = intro.getBoundingClientRect();
      const localX = (rect.left + rect.width / 2 - surface.left) / camera.scale;
      const localY = (rect.top + rect.height / 2 - surface.top) / camera.scale;
      targetX = clamp(centerX - localX * scale, ...limit.x);
      targetY = clamp(centerY - localY * scale, ...limit.y);
    }
    if (Math.abs(targetX - camera.x) < 0.25 &&
        Math.abs(targetY - camera.y) < 0.25 &&
        Math.abs(scale - camera.scale) < 0.001) {
      restCamera.x = camera.x;
      restCamera.y = camera.y;
      return;
    }
    returnCameraTo({
      x: targetX,
      y: targetY,
      scale
    });
  }

  function pointInMap(event) {
    const rect = scroller.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function zoomAt(nextScale, point) {
    const oldScale = camera.scale;
    const scale = resistScale(nextScale);
    camera.x = point.x - (point.x - camera.x) * scale / oldScale;
    camera.y = point.y - (point.y - camera.y) * scale / oldScale;
    camera.scale = scale;
    const limit = bounds();
    camera.x = resist(camera.x, ...limit.x, limit.overshootX);
    camera.y = resist(camera.y, ...limit.y, limit.overshootY);
    renderCamera();
    refreshLinesFor();
  }

  function pointerCenter() {
    const points = [...pointers.values()];
    const center = { x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
    const distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    return { center, distance };
  }

  function stopPanFollow() {
    cancelAnimationFrame(panFrame);
    panFrame = 0;
    panTarget = null;
    panPrevious = 0;
  }

  function followPan(now) {
    if (!panTarget) {
      stopPanFollow();
      return;
    }
    const elapsed = Math.min(now - panPrevious, 34);
    panPrevious = now;
    const progressX = 1 - Math.exp(-elapsed / (panTarget.inwardX ? 55 : 190));
    const progressY = 1 - Math.exp(-elapsed / (panTarget.inwardY ? 55 : 190));
    camera.x += (panTarget.x - camera.x) * progressX;
    camera.y += (panTarget.y - camera.y) * progressY;
    if (Math.abs(panTarget.x - camera.x) < 0.2 && Math.abs(panTarget.y - camera.y) < 0.2) {
      camera.x = panTarget.x;
      camera.y = panTarget.y;
      panFrame = 0;
    } else {
      panFrame = requestAnimationFrame(followPan);
    }
    renderCamera();
  }

  function movePanToward(target) {
    panTarget = target;
    if (!panFrame) {
      panPrevious = performance.now();
      panFrame = requestAnimationFrame(followPan);
    }
  }

  function movePanAxis(axis, delta, min, max, overshoot) {
    const previous = panTarget?.[axis] ?? camera[axis];
    if (!delta) return { value: previous, inward: panTarget?.[axis === 'x' ? 'inwardX' : 'inwardY'] || false };
    const rest = restCamera[axis];
    const inward = (previous - rest) * delta < 0;
    const from = inward && Math.abs(camera[axis] - rest) < Math.abs(previous - rest)
      ? camera[axis] : previous;
    if (inward && (from + delta - rest) * (from - rest) >= 0) {
      return { value: from + delta, inward: true };
    }
    const raw = inward ? unresist(rest, min, max, overshoot) + delta - (rest - from)
      : unresist(from, min, max, overshoot) + delta;
    return { value: resist(raw, min, max, overshoot), inward: false };
  }

  scroller.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    clearTimeout(settleTimer);
    wheelGesture = null;
    clearTimeout(clickResetTimer);
    stopPanFollow();
    stopCameraAnimation();
    if (!pointers.size) {
      dragged = false;
      suppressClick = false;
    }
    pointers.set(event.pointerId, pointInMap(event));
    const { center, distance } = pointerCenter();
    gesture = gestureOrigin(center, distance);
  });
  scroller.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, pointInMap(event));
    const { center, distance } = pointerCenter();
    if (Math.hypot(center.x - gesture.center.x, center.y - gesture.center.y) > 4 ||
        (distance && Math.abs(distance - gesture.distance) > 4)) {
      dragged = true;
      scroller.classList.add('is-dragging');
      if (!scroller.hasPointerCapture(event.pointerId)) scroller.setPointerCapture(event.pointerId);
    }
    if (!dragged) return;
    if (distance && gesture.distance) {
      stopPanFollow();
      const scale = resistScale(gesture.scale * distance / gesture.distance);
      camera.scale = scale;
      camera.x = center.x - (gesture.center.x - gesture.x) * scale / gesture.scale;
      camera.y = center.y - (gesture.center.y - gesture.y) * scale / gesture.scale;
      const limit = bounds();
      camera.x = resist(camera.x, ...limit.x, limit.overshootX);
      camera.y = resist(camera.y, ...limit.y, limit.overshootY);
      renderCamera();
      return;
    }
    const limit = bounds();
    const deltaX = center.x - gesture.lastCenter.x;
    const deltaY = center.y - gesture.lastCenter.y;
    const now = performance.now();
    const elapsed = now - gesture.lastMoveAt;
    if (elapsed > 100) {
      gesture.velocityX = 0;
      gesture.velocityY = 0;
    } else if (elapsed > 0) {
      const blend = 0.55;
      gesture.velocityX = gesture.velocityX * (1 - blend) + deltaX / elapsed * blend;
      gesture.velocityY = gesture.velocityY * (1 - blend) + deltaY / elapsed * blend;
    }
    gesture.lastMoveAt = now;
    gesture.travel += Math.hypot(deltaX, deltaY);
    gesture.lastCenter = center;
    const x = movePanAxis('x', deltaX, ...limit.x, limit.overshootX);
    const y = movePanAxis('y', deltaY, ...limit.y, limit.overshootY);
    if (event.pointerType === 'mouse') {
      camera.x = x.value;
      camera.y = y.value;
      renderCamera();
    } else {
      movePanToward({
        x: x.value,
        y: y.value,
        inwardX: x.inward,
        inwardY: y.inward
      });
    }
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const releasedGesture = gesture;
    stopPanFollow();
    pointers.delete(event.pointerId);
    if (pointers.size) {
      const { center, distance } = pointerCenter();
      gesture = gestureOrigin(center, distance);
    } else {
      gesture = null;
      scroller.classList.remove('is-dragging');
      if (dragged) {
        suppressClick = true;
        const rootDelay = rootGlanceDelay(releasedGesture);
        if (event.type === 'pointerup' && !hasExpandedBranches() && isShortFlick(releasedGesture)) {
          releaseFlick(releasedGesture.origin,
            releasedGesture.velocityX, releasedGesture.velocityY, rootDelay);
        } else if (rootDelay && event.type === 'pointerup') {
          scheduleRootReturn(rootReturnTarget(releasedGesture.origin), rootDelay);
        } else {
          settleCamera();
        }
        clickResetTimer = setTimeout(() => { suppressClick = false; }, 120);
      }
      dragged = false;
    }
  }
  scroller.addEventListener('pointerup', endPointer);
  scroller.addEventListener('pointercancel', endPointer);
  scroller.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  scroller.addEventListener('wheel', event => {
    event.preventDefault();
    if (pointers.size) return;
    const now = performance.now();
    if (!wheelGesture || now - wheelGesture.lastMoveAt > 240) {
      wheelGesture = {
        origin: { ...camera }, startedAt: now, lastMoveAt: now,
        velocityX: 0, velocityY: 0, peakX: 0, peakY: 0,
        travel: 0, events: 0, maxStep: 0
      };
    }
    const elapsed = Math.max(12, now - wheelGesture.lastMoveAt);
    const deltaX = event.ctrlKey || event.metaKey ? 0 : -event.deltaX;
    const deltaY = event.ctrlKey || event.metaKey ? 0 : -event.deltaY;
    wheelGesture.velocityX = wheelGesture.velocityX * 0.55 + deltaX / elapsed * 0.45;
    wheelGesture.velocityY = wheelGesture.velocityY * 0.55 + deltaY / elapsed * 0.45;
    if (Math.hypot(wheelGesture.velocityX, wheelGesture.velocityY) >
        Math.hypot(wheelGesture.peakX, wheelGesture.peakY)) {
      wheelGesture.peakX = wheelGesture.velocityX;
      wheelGesture.peakY = wheelGesture.velocityY;
    }
    const step = Math.hypot(deltaX, deltaY);
    wheelGesture.travel += step;
    wheelGesture.maxStep = Math.max(wheelGesture.maxStep, step);
    wheelGesture.events += 1;
    wheelGesture.lastMoveAt = now;
    stopCameraAnimation();
    if (event.ctrlKey || event.metaKey) {
      stopPanFollow();
      zoomAt(camera.scale * Math.exp(-event.deltaY * 0.008), pointInMap(event));
    } else {
      const limit = bounds();
      const x = movePanAxis('x', -event.deltaX, ...limit.x, limit.overshootX);
      const y = movePanAxis('y', -event.deltaY, ...limit.y, limit.overshootY);
      movePanToward({
        x: x.value,
        y: y.value,
        inwardX: x.inward,
        inwardY: y.inward
      });
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      stopPanFollow();
      const motion = wheelGesture;
      wheelGesture = null;
      const rootDelay = rootGlanceDelay(motion);
      if (!hasExpandedBranches() && motion?.events > 1 && motion.maxStep < 60 &&
          isShortFlick({ ...motion, velocityX: motion.peakX,
        velocityY: motion.peakY }, motion.lastMoveAt, 850)) {
        releaseFlick(motion.origin, motion.peakX, motion.peakY, rootDelay);
      } else if (rootDelay) {
        scheduleRootReturn(rootReturnTarget(motion.origin), rootDelay);
      } else {
        settleCamera();
      }
    }, 180);
  }, { passive: false });

  function chipStyle(element, label) {
    const [light, dark] = categoryColors.get(label) || ['#eef2f7', '#45556b'];
    element.style.setProperty('--chip-bg', light);
    element.style.setProperty('--chip-color', dark);
    element.textContent = label;
  }

  function refreshExpandMarkers() {
    const visible = new Set([...rootHost.querySelectorAll('.questions-map-branch')]
      .map(node => node.dataset.questionId));
    for (const branch of rootHost.querySelectorAll('.questions-map-branch')) {
      const expand = branch.querySelector(':scope > .questions-map-card > .questions-map-card__expand');
      if (!expand) continue;
      const eligible = (nextById.get(branch.dataset.questionId) || []).filter(isAllowedQuestion);
      const linked = !expand.hidden && expand.getAttribute('aria-expanded') !== 'true' &&
        eligible.length > 0 && eligible.every(id => visible.has(id));
      expand.classList.toggle('is-linked', linked);
      if (!expand.hidden && expand.getAttribute('aria-expanded') !== 'true') {
        expand.title = linked ? 'Перейти к уже открытому вопросу' : 'Показать связанные вопросы';
        expand.setAttribute('aria-label', `${linked ? 'Перейти к уже открытому вопросу' : 'Показать следующие вопросы'} после: ${questions.get(branch.dataset.questionId)?.title || ''}`);
      }
    }
  }

  function openBranch(branch, { animate = true } = {}) {
    const id = branch.dataset.questionId;
    const expand = branch.querySelector(':scope > .questions-map-card > .questions-map-card__expand');
    const children = branch.querySelector(':scope > .questions-map-children');
    if (!expand || expand.hidden || expand.getAttribute('aria-expanded') === 'true') return null;
    const visible = new Set([...rootHost.querySelectorAll('.questions-map-branch')]
      .map(node => node.dataset.questionId));
    const eligible = (nextById.get(id) || []).filter(nextId => questions.has(nextId) && isAllowedQuestion(nextId));
    const next = eligible.filter(nextId => !visible.has(nextId));
    if (!next.length) return eligible.find(nextId => visible.has(nextId)) || null;
    const direction = branch.classList.contains('is-left') ? 'left' : 'right';
    children.append(...next.map(nextId => makeBranch(nextId, animate, direction)));
    expand.setAttribute('aria-expanded', 'true');
    expand.title = 'Свернуть ветвь';
    expandedOrder.push(id);
    refreshExpandMarkers();
    return true;
  }

  function makeBranch(id, appearing = false, direction = 'right', rootIndex = -1) {
    const question = questions.get(id);
    const branch = document.createElement('div');
    branch.className = `questions-map-branch${appearing ? ' is-appearing' : ''}`;
    branch.classList.toggle('is-left', direction === 'left');
    branch.classList.toggle('is-root', rootIndex >= 0);
    branch.dataset.questionId = id;

    const card = document.createElement('div');
    card.className = 'questions-map-card';
    card.classList.toggle('is-selected', selectedId === id);
    card.classList.toggle('is-studied', progressById.get(id) === 'studied');
    card.classList.toggle('is-unclear', progressById.get(id) === 'unclear');
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'questions-map-card__question';
    select.setAttribute('aria-label', `Открыть ответ: ${question.title}`);
    const title = document.createElement('span');
    title.className = 'questions-map-card__title';
    title.textContent = question.title;
    select.appendChild(title);
    select.addEventListener('click', () => selectQuestion(id));
    card.appendChild(select);

    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'questions-map-card__expand';
    expand.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    expand.title = 'Показать связанные вопросы';
    expand.setAttribute('aria-label', `Показать следующие вопросы после: ${question.title}`);
    expand.setAttribute('aria-expanded', 'false');
    expand.hidden = !(nextById.get(id) || []).some(isAllowedQuestion);
    card.appendChild(expand);

    const children = document.createElement('div');
    children.className = 'questions-map-children';
    if (rootIndex >= 0) {
      const row = String(Math.floor(rootIndex / 2) + 2);
      card.style.gridRow = row;
      children.style.gridRow = row;
    }
    expand.addEventListener('click', () => {
      const before = new Map([...rootHost.querySelectorAll('.questions-map-card')].map(node => [node, node.getBoundingClientRect()]));
      const wasExpanded = expand.getAttribute('aria-expanded') === 'true';
      const anchorBefore = wasExpanded ? card.getBoundingClientRect() : null;
      if (wasExpanded) {
        const selectedHidden = !!selectedId && [...children.querySelectorAll('.questions-map-branch')]
          .some(node => node.dataset.questionId === selectedId);
        children.replaceChildren();
        expand.setAttribute('aria-expanded', 'false');
        expand.title = 'Показать связанные вопросы';
        if (selectedHidden) clearSelection();
        refreshExpandMarkers();
      } else {
        const opened = openBranch(branch);
        if (opened !== true) {
          if (opened) {
            traceExistingConnection(expand, opened);
            focusQuestion(opened, { flash: true, flashDelay: 650 });
          }
          return;
        }
        status.textContent = '';
      }
      saveState();
      requestAnimationFrame(() => {
        if (anchorBefore) {
          const anchorAfter = card.getBoundingClientRect();
          camera.x += anchorBefore.left - anchorAfter.left;
          camera.y += anchorBefore.top - anchorAfter.top;
          restCamera.x = camera.x;
          restCamera.y = camera.y;
          renderCamera();
        }
        const group = !wasExpanded ? measureBranchGroup(branch) : null;
        for (const [node, oldRect] of before) {
          if (!node.isConnected) continue;
          const newRect = node.getBoundingClientRect();
          const dx = (oldRect.left - newRect.left) / camera.scale;
          const dy = (oldRect.top - newRect.top) / camera.scale;
          if (Math.abs(dx) + Math.abs(dy) > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
              duration: 330,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });
          }
        }
        refreshLinesFor(380);
        if (group) centerGroup(group);
      });
    });

    branch.append(card, children);
    return branch;
  }

  function selectQuestion(id, { focus = true } = {}) {
    const question = questions.get(id);
    if (!question) return;
    selectedId = id;
    rootHost.querySelectorAll('.questions-map-branch').forEach(branch => {
      branch.querySelector(':scope > .questions-map-card')?.classList.toggle('is-selected', branch.dataset.questionId === id);
    });
    answerTitle.textContent = question.title;
    chipStyle(answerCategory, categoryLabels.get(question.category) || question.category);
    answerStatus.textContent = '';
    answerPanel.hidden = false;
    workspace.classList.add('has-answer');
    if (!answerFrame.hasAttribute('src')) answerFrame.src = answerFrame.dataset.src;
    if (focus) requestAnimationFrame(() => focusQuestion(id));
    try {
      answerFrame.contentWindow?.QAtoDevMapEmbed?.showQuestion(id);
    } catch {
      answerStatus.textContent = 'Ответ загружается…';
    }
    saveState();
  }

  function clearSelection() {
    selectedId = '';
    rootHost.querySelectorAll('.questions-map-card.is-selected')
      .forEach(card => card.classList.remove('is-selected'));
    answerPanel.hidden = true;
    workspace.classList.remove('has-answer');
  }

  function measureCards(cards) {
    stopCameraAnimation();
    const surface = canvas.getBoundingClientRect();
    const rects = cards.filter(Boolean).map(card => card.getBoundingClientRect());
    return {
      left: (Math.min(...rects.map(rect => rect.left)) - surface.left) / camera.scale,
      right: (Math.max(...rects.map(rect => rect.right)) - surface.left) / camera.scale,
      top: (Math.min(...rects.map(rect => rect.top)) - surface.top) / camera.scale,
      bottom: (Math.max(...rects.map(rect => rect.bottom)) - surface.top) / camera.scale
    };
  }

  function measureBranchGroup(branch) {
    return measureCards([branch.querySelector(':scope > .questions-map-card'),
      ...branch.querySelectorAll(':scope > .questions-map-children > .questions-map-branch > .questions-map-card')]);
  }

  function centerGroup(group, { animate = true } = {}) {
    const availableWidth = visibleMapWidth();
    const margin = 32;
    camera.scale = Math.max(0.65, Math.min(1,
      (availableWidth - margin * 2) / (group.right - group.left),
      (scroller.clientHeight - mapTopInset() - margin * 2) / (group.bottom - group.top)));
    normalScale = camera.scale;
    camera.x = availableWidth / 2 - (group.left + group.right) / 2 * camera.scale;
    camera.y = mapCenterY() - (group.top + group.bottom) / 2 * camera.scale;
    const limit = bounds();
    camera.x = clamp(camera.x, ...limit.x);
    camera.y = clamp(camera.y, ...limit.y);
    restCamera.x = camera.x;
    restCamera.y = camera.y;
    renderCamera({ animate });
  }

  function traceExistingConnection(source, targetId) {
    const targetBranch = [...rootHost.querySelectorAll('.questions-map-branch')]
      .find(node => node.dataset.questionId === targetId);
    const target = targetBranch?.querySelector(':scope > .questions-map-card > .questions-map-card__question');
    if (!target) return;
    stopCameraAnimation();
    const surface = canvas.getBoundingClientRect();
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x1 = (from.left + from.width / 2 - surface.left) / camera.scale;
    const y1 = (from.top + from.height / 2 - surface.top) / camera.scale;
    const x2 = (to.left + to.width / 2 - surface.left) / camera.scale;
    const y2 = (to.top + to.height / 2 - surface.top) / camera.scale;
    const direction = Math.sign(x2 - x1) || 1;
    const bend = Math.min(180, Math.max(55, Math.abs(x2 - x1) * 0.45));
    const route = `M ${x1} ${y1} C ${x1 + direction * bend} ${y1}, ${x2 - direction * bend} ${y2}, ${x2} ${y2}`;
    const svgNS = 'http://www.w3.org/2000/svg';
    const make = name => document.createElementNS(svgNS, name);
    const defs = make('defs');
    const mask = make('mask');
    mask.id = 'questions-map-trace-reveal';
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', String(canvas.offsetWidth));
    mask.setAttribute('height', String(canvas.offsetHeight));
    const reveal = make('path');
    reveal.classList.add('questions-map-trace__mask-path');
    reveal.setAttribute('d', route);
    reveal.setAttribute('pathLength', '1000');
    mask.append(reveal);
    defs.append(mask);
    const line = make('path');
    line.classList.add('questions-map-trace__line');
    line.setAttribute('d', route);
    line.setAttribute('mask', 'url(#questions-map-trace-reveal)');
    traceLayer.setAttribute('viewBox', `0 0 ${canvas.offsetWidth} ${canvas.offsetHeight}`);
    traceLayer.replaceChildren(defs, line);
    clearTimeout(traceTimer);
    traceTimer = setTimeout(() => traceLayer.replaceChildren(), 1600);
  }

  function focusQuestion(id, { flash = false, flashDelay = 280 } = {}) {
    const branch = [...rootHost.querySelectorAll('.questions-map-branch')]
      .find(node => node.dataset.questionId === id);
    const pill = branch?.querySelector(':scope > .questions-map-card > .questions-map-card__question');
    if (!pill) return;
    stopCameraAnimation();
    const target = pill.getBoundingClientRect();
    const surface = canvas.getBoundingClientRect();
    const localX = (target.left + target.width / 2 - surface.left) / camera.scale;
    const localY = (target.top + target.height / 2 - surface.top) / camera.scale;
    camera.x = visibleMapWidth() / 2 - localX * camera.scale;
    camera.y = scroller.clientHeight / 2 - localY * camera.scale;
    const limit = bounds();
    camera.x = clamp(camera.x, ...limit.x);
    camera.y = clamp(camera.y, ...limit.y);
    restCamera.x = camera.x;
    restCamera.y = camera.y;
    renderCamera({ animate: true });
    if (flash) {
      const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : flashDelay;
      setTimeout(() => {
        pill.classList.remove('is-revisited');
        void pill.offsetWidth;
        pill.classList.add('is-revisited');
        setTimeout(() => pill.classList.remove('is-revisited'), 1000);
      }, delay);
    }
  }

  function drawLines() {
    const bounds = canvas.getBoundingClientRect();
    const svgNS = 'http://www.w3.org/2000/svg';
    const paths = document.createDocumentFragment();
    for (const branch of rootHost.querySelectorAll('.questions-map-branch')) {
      const parent = branch.querySelector(':scope > .questions-map-card');
      const children = branch.querySelector(':scope > .questions-map-children');
      if (!parent || !children) continue;
      const a = parent.getBoundingClientRect();
      for (const child of children.children) {
        const target = child.querySelector(':scope > .questions-map-card');
        if (!target) continue;
        const b = target.getBoundingClientRect();
        const leftward = branch.classList.contains('is-left');
        const x1 = ((leftward ? a.left : a.right) - bounds.left) / camera.scale;
        const y1 = (a.top + a.height / 2 - bounds.top) / camera.scale;
        const x2 = ((leftward ? b.right : b.left) - bounds.left) / camera.scale;
        const y2 = (b.top + b.height / 2 - bounds.top) / camera.scale;
        const turn = (leftward ? -1 : 1) * Math.max(24, Math.abs(x2 - x1) * 0.46);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + turn} ${y1}, ${x2 - turn} ${y2}, ${x2} ${y2}`);
        paths.appendChild(path);
      }
    }
    lines.setAttribute('viewBox', `0 0 ${canvas.offsetWidth} ${canvas.offsetHeight}`);
    lines.replaceChildren(paths);
  }

  function refreshLinesFor(duration = 0) {
    cancelAnimationFrame(lineFrame);
    const until = performance.now() + duration;
    function tick() {
      drawLines();
      if (performance.now() < until) lineFrame = requestAnimationFrame(tick);
    }
    lineFrame = requestAnimationFrame(tick);
  }

  function restoreState(saved) {
    const ids = Array.isArray(saved.expanded) ? saved.expanded.slice(0, questions.size) : [];
    for (const id of ids) {
      const branch = [...rootHost.querySelectorAll('.questions-map-branch')]
        .find(node => node.dataset.questionId === id);
      if (branch) openBranch(branch, { animate: false });
    }
    const selected = saved.articleOpen && typeof saved.selectedId === 'string' &&
      [...rootHost.querySelectorAll('.questions-map-branch')]
        .some(branch => branch.dataset.questionId === saved.selectedId);
    if (selected) {
      selectQuestion(saved.selectedId, { focus: false });
    }
    const savedCamera = saved.camera;
    if (![savedCamera?.centerX, savedCamera?.centerY, savedCamera?.scale].every(Number.isFinite)) return false;
    if (saved.phoneLayout !== undefined && saved.phoneLayout !== phoneLayout.matches) return false;
    if (phoneLayout.matches && saved.layoutVersion !== 4) return false;
    normalScale = clamp(savedCamera.normalScale ?? 1, 0.65, 1);
    camera.scale = normalScale;
    camera.x = visibleMapWidth() / 2 - savedCamera.centerX * camera.scale;
    camera.y = scroller.clientHeight / 2 - savedCamera.centerY * camera.scale;
    const limit = bounds();
    camera.x = clamp(camera.x, ...limit.x);
    camera.y = clamp(camera.y, ...limit.y);
    restCamera.x = camera.x;
    restCamera.y = camera.y;
    renderCamera();
    refreshLinesFor();
    return true;
  }

  function showRoots(focusId = '', saved = null) {
    selectedId = '';
    expandedOrder = [];
    shownRoots = roots.filter(isAllowedQuestion);
    const rootBranches = shownRoots.map((id, index) => {
      const branch = makeBranch(id, false, index % 2 === 0 ? 'left' : 'right', index);
      if (index === 3) branch.classList.add('is-language-root');
      return branch;
    });
    rootHost.replaceChildren(...rootBranches, intro);
    refreshExpandMarkers();
    camera.x = 0;
    camera.y = 0;
    camera.scale = 1;
    normalScale = 1;
    restCamera.x = 0;
    restCamera.y = 0;
    renderCamera();
    answerTitle.textContent = 'Выберите вопрос на карте';
    answerCategory.textContent = '';
    answerStatus.textContent = '';
    refreshLinesFor();
    requestAnimationFrame(() => {
      if (!saved || !restoreState(saved)) {
        const group = measureCards([intro, ...rootBranches.map(branch =>
          branch.querySelector(':scope > .questions-map-card'))]);
        if (selectedId || (focusId && shownRoots.includes(focusId))) {
          centerGroup(group, { animate: false });
          focusQuestion(selectedId || focusId);
        } else {
          centerGroup(group);
        }
      }
      stateReady = true;
      scheduleStateSave();
    });
  }

  function switchLanguageRoot() {
    const version = ++filterVersion;
    filterExitAnimation?.cancel();
    const oldRoot = rootHost.querySelector(':scope > .questions-map-branch.is-language-root');
    const nextId = roots.find(id => questions.get(id)?.category === languageCategories.get(activeLanguage));
    if (!oldRoot || !nextId) return;
    shownRoots[3] = nextId;
    for (const branch of [...rootHost.querySelectorAll('.questions-map-branch')]) {
      if (!branch.isConnected || branch === oldRoot || oldRoot.contains(branch)) continue;
      if (!isAllowedQuestion(branch.dataset.questionId)) {
        branch.remove();
        continue;
      }
      const expand = branch.querySelector(':scope > .questions-map-card > .questions-map-card__expand');
      const children = branch.querySelector(':scope > .questions-map-children');
      if (expand) {
        expand.hidden = !(nextById.get(branch.dataset.questionId) || []).some(isAllowedQuestion);
        if (!children?.children.length) expand.setAttribute('aria-expanded', 'false');
      }
    }
    if (selectedId && (oldRoot.dataset.questionId === selectedId ||
        oldRoot.querySelector(`.questions-map-branch[data-question-id="${selectedId}"]`) ||
        !rootHost.querySelector(`.questions-map-branch[data-question-id="${selectedId}"]`))) {
      selectedId = '';
      answerPanel.hidden = true;
      workspace.classList.remove('has-answer');
    }
    const nextRoot = makeBranch(nextId, false, 'right', 3);
    nextRoot.classList.add('is-language-root');
    const replace = () => {
      if (version !== filterVersion) return;
      const stableNodes = [intro, ...rootHost.querySelectorAll(
        ':scope > .questions-map-branch:not(.is-language-root) > .questions-map-card')];
      const positions = new Map(stableNodes.map(node => [node, node.getBoundingClientRect()]));
      oldRoot.replaceWith(nextRoot);
      refreshExpandMarkers();
      const card = nextRoot.querySelector(':scope > .questions-map-card');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (const [node, before] of positions) {
          const after = node.getBoundingClientRect();
          const dx = (before.left - after.left) / camera.scale;
          const dy = (before.top - after.top) / camera.scale;
          if (Math.abs(dx) + Math.abs(dy) > 1) {
            node.animate([
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: 'translate(0, 0)' }
            ], { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
          }
        }
        card.animate([
          { opacity: 0, transform: 'translateX(48px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ], { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
      const limit = bounds();
      if (camera.x < limit.x[0] || camera.x > limit.x[1] || camera.y < limit.y[0] || camera.y > limit.y[1]) {
        settleCamera();
      }
      saveState();
      refreshLinesFor(400);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      replace();
    } else {
      filterExitAnimation = oldRoot.querySelector(':scope > .questions-map-card').animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(42px)' }
      ], { duration: 180, easing: 'ease-in' });
      filterExitAnimation.finished.then(replace).catch(() => {});
    }
  }

  function syncFrameTheme() {
    try {
      const frameHtml = answerFrame.contentDocument?.documentElement;
      if (!frameHtml) return;
      const theme = document.documentElement.dataset.theme;
      if (theme) frameHtml.dataset.theme = theme;
      else frameHtml.removeAttribute('data-theme');
    } catch { /* The map still works if the answer frame is unavailable. */ }
  }

  function watchFrameStatus() {
    try {
      const notch = answerFrame.contentDocument?.getElementById('header-ai-notch');
      if (!notch) return;
      const update = () => {
        headerNotch.className = notch.className;
        headerNotch.setAttribute('aria-hidden', notch.getAttribute('aria-hidden') || 'true');
        headerNotchIcon.textContent = notch.querySelector('#header-ai-notch-icon')?.textContent || '◌';
        headerNotchText.textContent = notch.querySelector('#header-ai-notch-text')?.textContent || 'В процессе';
      };
      new MutationObserver(update).observe(notch, { attributes: true, childList: true, subtree: true });
      update();
    } catch { /* AI controls remain available inside the answer frame. */ }
  }

  answerFrame.addEventListener('load', () => {
    syncFrameTheme();
    watchFrameStatus();
    if (selectedId) answerFrame.contentWindow?.QAtoDevMapEmbed?.showQuestion(selectedId);
  });
  headerNotch.addEventListener('click', () => {
    try { answerFrame.contentDocument?.getElementById('header-ai-notch')?.click(); } catch {}
  });
  closeAnswer.addEventListener('click', () => {
    clearSelection();
    saveState();
  });
  new MutationObserver(syncFrameTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(() => {
    refreshLinesFor(420);
  }).observe(scroller);
  new ResizeObserver(() => refreshLinesFor(420)).observe(canvas);
  window.addEventListener('resize', () => {
    refreshLinesFor(420);
    requestAnimationFrame(() => {
      if (selectedId) focusQuestion(selectedId);
      else centerGroup(measureCards([intro,
        ...rootHost.querySelectorAll(':scope > .questions-map-branch > .questions-map-card')]));
    });
  });

  function loadMapData() {
    return Promise.all([
      fetch(questionsUrl, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Не удалось загрузить вопросы');
        return response.json();
      }),
      fetch(linksUrl, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Не удалось загрузить связи');
        return response.json();
      })
    ]);
  }

  function renderMap(payload, graph) {
    const sections = Array.isArray(payload) ? payload : payload.data;
    if (!Array.isArray(sections)) throw new Error('Некорректный список вопросов');
    questions.clear();
    nextById.clear();
    for (const section of sections) {
      for (const item of section.items || []) questions.set(item.id, { ...item, category: section.category });
    }
    for (const [from, to] of graph.links || []) {
      if (!questions.has(from) || !questions.has(to) || from === to) continue;
      const next = nextById.get(from) || [];
      if (!next.includes(to)) next.push(to);
      nextById.set(from, next);
    }
    roots = (graph.roots || []).filter(id => questions.has(id));
    if (!roots.length) throw new Error('В карте нет стартовых вопросов');
    refreshProgress();
    workspace.hidden = false;
    status.textContent = '';
    const saved = readState();
    if (saved && languageCategories.has(saved.language)) activeLanguage = saved.language;
    languageFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.language === activeLanguage)));
    showRoots(entryRoot, saved);
  }

  let cached = null;
  try {
    cached = JSON.parse(sessionStorage.getItem(dataCacheKey) || 'null');
    if (cached && !Number.isFinite(cached.checkedAt)) throw new Error('Invalid map cache');
    if (cached) renderMap(cached.payload, cached.graph);
  } catch {
    cached = null;
    try { sessionStorage.removeItem(dataCacheKey); } catch {}
  }

  if (!cached || Date.now() - cached.checkedAt >= dataCacheLifetime) {
    loadMapData().then(([payload, graph]) => {
      if (!cached) renderMap(payload, graph);
      try {
        sessionStorage.setItem(dataCacheKey, JSON.stringify({ checkedAt: Date.now(), payload, graph }));
      } catch { /* The map remains usable when session storage is unavailable. */ }
    }).catch(error => {
      if (!cached) status.textContent = `${error.message}. Обновите страницу и попробуйте ещё раз.`;
    });
  }
})();
