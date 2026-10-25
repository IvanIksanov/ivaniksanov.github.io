(() => {
  const stage = document.querySelector('.home-stage');
  const center = stage?.querySelector('.home-stage__center');
  const intro = stage?.querySelector('.home-stage__intro');
  const windowEl = intro?.querySelector('.home-stage__guide-window');
  const baseTrack = windowEl?.querySelector('.home-stage__guide-track--base');
  const steps = [...(baseTrack?.querySelectorAll('.home-stage__guide-step') || [])];
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('nav');
  if (!stage || !center || !intro || !windowEl || !baseTrack || !header || !nav || steps.length !== 5) return;

  steps.slice(0, 3).forEach(step => {
    const clone = step.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    baseTrack.append(clone);
  });
  const baseSteps = [...baseTrack.querySelectorAll('.home-stage__guide-step')];
  baseSteps.forEach((step, index) => step.classList.toggle('is-active', index % steps.length === 0));

  const desktop = matchMedia('(min-width: 901px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const svgNS = 'http://www.w3.org/2000/svg';
  const guide = document.createElementNS(svgNS, 'svg');
  guide.classList.add('home-intro-guide');
  guide.setAttribute('aria-hidden', 'true');
  guide.innerHTML = '<path fill="none"/><g></g>';
  document.body.append(guide);

  const geometry = guide.querySelector('path');
  const dotLayer = guide.querySelector('g');
  const duration = 1450;
  const trailDelay = 320;
  let offset = 0;
  let isSliding = false;
  let slideTimer = 0;
  let squares = [];
  let phaseStarted = performance.now();
  let layoutFrame = 0;
  let animationFrame = 0;
  let wasVisible = false;

  function currentStep() {
    return baseSteps[offset];
  }

  function shiftTracks(nextOffset, instant = false) {
    if (instant) {
      baseTrack.style.transition = 'none';
    }
    const shift = `translateY(-${nextOffset * 1.28}em)`;
    baseTrack.style.transform = shift;
    if (instant) {
      baseTrack.getBoundingClientRect();
      baseTrack.style.removeProperty('transition');
    }
  }

  function paint(now) {
    const elapsed = Math.max(0, now - phaseStarted);
    const head = reducedMotion.matches ? 1 : Math.min(1, elapsed / duration);
    const tail = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, (elapsed - trailDelay) / duration));
    const reached = Math.floor(head * squares.length);
    const erased = Math.floor(tail * squares.length);
    squares.forEach((square, index) => {
      square.style.opacity = index >= erased && index < reached ? '1' : '0';
    });
    currentStep().querySelector('.home-stage__guide-dot').style.opacity =
      reducedMotion.matches || elapsed < trailDelay ? '1' : '0';
    return reducedMotion.matches ? 1 : Math.min(1, elapsed / (duration + trailDelay));
  }

  function animate(now) {
    animationFrame = 0;
    if (!wasVisible) return;
    if (paint(now) < 1) animationFrame = requestAnimationFrame(animate);
  }

  function startAnimation() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    phaseStarted = performance.now();
    paint(phaseStarted);
    if (!reducedMotion.matches) animationFrame = requestAnimationFrame(animate);
  }

  function hide(keepDotHidden = false) {
    guide.classList.remove('is-visible');
    if (!keepDotHidden) currentStep().querySelector('.home-stage__guide-dot').style.removeProperty('opacity');
    wasVisible = false;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function update() {
    layoutFrame = 0;
    if (isSliding) {
      hide(true);
      return;
    }
    const step = currentStep();
    const dot = step.querySelector('.home-stage__guide-dot');
    const target = [...nav.querySelectorAll('a')].find(link =>
      link.getAttribute('href')?.split('?')[0] === step.dataset.guideTarget);
    const headerRect = header.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const introRect = intro.getBoundingClientRect();
    const navList = nav.querySelector('ul');
    if (!desktop.matches || document.hidden ||
        center.classList.contains('has-conversation') || header.classList.contains('is-nav-morphing') ||
        header.classList.contains('is-menu-open') || !target || !dot || !navList ||
        getComputedStyle(navList).display === 'none' || getComputedStyle(nav).visibility === 'hidden' ||
        stageRect.bottom <= headerRect.bottom + 30 || introRect.top >= innerHeight) {
      hide();
      return;
    }

    const source = dot.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    const x1 = source.left + source.width / 2;
    const y1 = source.top + source.height / 2;
    const x2 = destination.left + destination.width / 2;
    const atPageTop = window.scrollY < 2;
    const y2 = destination.bottom + (atPageTop ? 3 : 8);
    const visibleSteps = baseSteps.slice(offset, offset + 3);
    const maxTextRight = Math.max(...visibleSteps.map(item => item.getBoundingClientRect().right));
    const firstTextTop = Math.min(...visibleSteps.map(item => item.getBoundingClientRect().top));
    const corridorX = maxTextRight + 30;
    const clearY = firstTextTop - 34;
    if (corridorX + 38 > innerWidth - 20 ||
        source.bottom <= headerRect.bottom + 6 || y1 > innerHeight + 10) {
      hide();
      return;
    }

    const bend = Math.min(82, (clearY - y2) * .24);
    const openPoints = [
      [x1, y1],
      [corridorX, y1 - 12],
      [corridorX + 38, clearY + 4],
      [corridorX + 8, clearY - bend],
      [corridorX - 108, clearY - bend * .48],
      [corridorX - 166, clearY - bend * 1.75],
      [x2 + 72, y2 + 76],
      [x2, y2]
    ];
    const compactHeight = Math.max(18, Math.min(72, (y1 - y2) * .55));
    const compactPoints = [
      [x1, y1],
      [corridorX, y1 - 10],
      [corridorX + 34, y2 + compactHeight],
      [corridorX + 24, y2 + compactHeight * .8],
      [corridorX - 40, y2 + compactHeight * .67],
      [x2 + 108, y2 + compactHeight * .8],
      [x2 + 54, y2 + compactHeight * .58],
      [x2, y2]
    ];
    const openness = Math.max(0, Math.min(1, (clearY - y2 - 60) / 100));
    const points = openPoints.map(([x, y], index) => [
      compactPoints[index][0] * (1 - openness) + x * openness,
      compactPoints[index][1] * (1 - openness) + y * openness
    ]);
    // A clamped cubic spline follows the old waypoints without forcing a
    // sharp change of direction at each one.
    const knots = [points[0], points[0], ...points, points.at(-1), points.at(-1)];
    const weighted = (a, b, c) => [
      (a[0] + 4 * b[0] + c[0]) / 6,
      (a[1] + 4 * b[1] + c[1]) / 6
    ];
    const commands = [];
    for (let index = 1; index < knots.length - 2; index += 1) {
      const a = knots[index - 1];
      const b = knots[index];
      const c = knots[index + 1];
      const d = knots[index + 2];
      const start = weighted(a, b, c);
      const control1 = [(4 * b[0] + 2 * c[0]) / 6, (4 * b[1] + 2 * c[1]) / 6];
      const control2 = [(2 * b[0] + 4 * c[0]) / 6, (2 * b[1] + 4 * c[1]) / 6];
      const end = weighted(b, c, d);
      if (index === 1) commands.push(`M ${start[0]} ${start[1]}`);
      commands.push(`C ${control1[0]} ${control1[1]}, ${control2[0]} ${control2[1]}, ${end[0]} ${end[1]}`);
    }
    geometry.setAttribute('d', commands.join(' '));
    guide.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    const length = geometry.getTotalLength();
    const size = source.width;
    const spacing = length / Math.max(10, Math.min(90, Math.round(length / (size * 1.7))));
    const distances = [];
    for (let distance = spacing; distance < length - spacing / 2; distance += spacing) {
      distances.push(distance);
    }
    distances.push(length);
    const count = distances.length;
    while (squares.length < count) {
      const square = document.createElementNS(svgNS, 'rect');
      square.classList.add('home-intro-guide__dot');
      dotLayer.append(square);
      squares.push(square);
    }
    while (squares.length > count) squares.pop().remove();
    squares.forEach((square, index) => {
      const point = geometry.getPointAtLength(distances[index]);
      square.setAttribute('x', point.x - size / 2);
      square.setAttribute('y', point.y - size / 2);
      square.setAttribute('width', size);
      square.setAttribute('height', size);
    });
    const newlyVisible = !wasVisible;
    wasVisible = true;
    guide.classList.add('is-visible');
    if (newlyVisible) startAnimation();
    else paint(performance.now());
  }

  function schedule() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(update);
  }

  function advance() {
    if (!desktop.matches || document.hidden || isSliding || center.classList.contains('has-conversation')) return;
    const departingDot = currentStep().querySelector('.home-stage__guide-dot');
    hide(true);
    offset += 1;
    baseSteps.forEach((step, index) =>
      step.classList.toggle('is-active', index % steps.length === offset % steps.length));
    isSliding = true;
    shiftTracks(offset);
    squares.forEach(square => square.remove());
    squares = [];
    clearTimeout(slideTimer);
    slideTimer = setTimeout(() => {
      departingDot.style.removeProperty('opacity');
      if (offset === steps.length) {
        offset = 0;
        shiftTracks(0, true);
      }
      isSliding = false;
      update();
    }, reducedMotion.matches ? 0 : 670);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);
  desktop.addEventListener('change', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(header, { attributes: true, attributeFilter: ['class'] });
  observer.observe(stage, { attributes: true, attributeFilter: ['class'] });
  observer.observe(center, { attributes: true, attributeFilter: ['class'] });
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(intro);
  resizeObserver.observe(nav);
  if (!reducedMotion.matches) setInterval(advance, 3300);
  schedule();
})();
