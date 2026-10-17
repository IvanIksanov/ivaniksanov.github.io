// Механика камеры для схем: сопротивление у границ, инерция жеста и плавный возврат.
// Формулы движения совпадают с картой вопросов; содержимое и допустимую область задаёт страница.
window.createMapMotion = function createMapMotion({ viewport, canvas, getContentBounds, onChange, touchPanGain = 1 }) {
  const camera = { x: 0, y: 0, scale: 1 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let frame = 0;
  let followFrame = 0;
  let followTarget = null;
  let settleTimer = 0;
  let wheelMotion = null;
  let pointerMotion = null;
  const pointers = new Map();
  let pinch = null;
  let dragged = false;
  let suppressClick = false;

  function bounds(scale = camera.scale) {
    const box = getContentBounds();
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const contentWidth = (box.right - box.left) * scale;
    const contentHeight = (box.bottom - box.top) * scale;
    const centeredX = width / 2 - (box.left + box.right) * scale / 2;
    const centeredY = height / 2 - (box.top + box.bottom) * scale / 2;
    const x = contentWidth <= width ? [centeredX - Math.min(180, width * .32), centeredX + Math.min(180, width * .32)]
      : [width / 2 - box.right * scale - 80, width / 2 - box.left * scale + 80];
    const y = contentHeight <= height ? [centeredY - Math.min(200, height * .27), centeredY + Math.min(200, height * .27)]
      : [height / 2 - box.bottom * scale - 60, height / 2 - box.top * scale + 60];
    return { x, y, overshootX: Math.max(1, Math.min(width * .45, contentWidth * .9)), overshootY: Math.max(1, Math.min(height * .45, contentHeight * .9)) };
  }
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
  function draw() {
    canvas.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    onChange?.();
  }
  function stop() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(followFrame);
    frame = followFrame = 0;
    followTarget = null;
    clearTimeout(settleTimer);
  }
  function animateTo(target, duration = 520) {
    stop();
    if (reduced.matches) { Object.assign(camera, target); draw(); return; }
    const start = { ...camera };
    const startAt = performance.now();
    function tick(now) {
      const t = clamp((now - startAt) / duration, 0, 1);
      const ease = (1 - Math.cos(Math.PI * t)) / 2;
      camera.x = start.x + (target.x - start.x) * ease;
      camera.y = start.y + (target.y - start.y) * ease;
      camera.scale = start.scale + (target.scale - start.scale) * ease;
      draw();
      if (t < 1) frame = requestAnimationFrame(tick);
      else frame = 0;
    }
    frame = requestAnimationFrame(tick);
  }
  function settle(delay = 0) {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const limit = bounds();
      const target = { x: clamp(camera.x, ...limit.x), y: clamp(camera.y, ...limit.y), scale: clamp(camera.scale, .7, 1.6) };
      if (Math.hypot(target.x - camera.x, target.y - camera.y) > .25 || Math.abs(target.scale - camera.scale) > .001) animateTo(target);
    }, delay);
  }
  function focus(x, y, smooth = true) {
    const limit = bounds();
    const target = { x: clamp(viewport.clientWidth / 2 - x * camera.scale, ...limit.x), y: clamp(viewport.clientHeight / 2 - y * camera.scale, ...limit.y), scale: camera.scale };
    if (smooth) animateTo(target);
    else { stop(); Object.assign(camera, target); draw(); }
  }
  function restore(saved) {
    stop();
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      camera.x = saved.x;
      camera.y = saved.y;
      camera.scale = clamp(saved.scale || 1, .7, 1.6);
      const limit = bounds();
      camera.x = clamp(camera.x, ...limit.x);
      camera.y = clamp(camera.y, ...limit.y);
      draw();
    }
  }
  function snapshot() { return { ...camera }; }
  function zoom(delta, point) {
    const old = camera.scale;
    const next = clamp(old * Math.exp(-delta * .008), .7, 1.6);
    camera.x = point.x - (point.x - camera.x) * next / old;
    camera.y = point.y - (point.y - camera.y) * next / old;
    camera.scale = next;
    const limit = bounds();
    camera.x = resist(camera.x, ...limit.x, limit.overshootX);
    camera.y = resist(camera.y, ...limit.y, limit.overshootY);
    draw();
    settle(180);
  }
  function follow(now) {
    if (!followTarget) return;
    const ease = 1 - Math.exp(-Math.min(now - (follow.previous || now), 34) / 190);
    follow.previous = now;
    camera.x += (followTarget.x - camera.x) * ease;
    camera.y += (followTarget.y - camera.y) * ease;
    draw();
    if (Math.hypot(followTarget.x - camera.x, followTarget.y - camera.y) > .3) followFrame = requestAnimationFrame(follow);
    else { Object.assign(camera, followTarget); followTarget = null; followFrame = 0; draw(); }
  }
  function move(dx, dy, smooth = false) {
    const limit = bounds();
    const origin = followTarget || camera;
    const next = { x: resist(unresist(origin.x, ...limit.x, limit.overshootX) + dx, ...limit.x, limit.overshootX),
      y: resist(unresist(origin.y, ...limit.y, limit.overshootY) + dy, ...limit.y, limit.overshootY) };
    if (smooth && !reduced.matches) {
      followTarget = next;
      if (!followFrame) { follow.previous = performance.now(); followFrame = requestAnimationFrame(follow); }
    } else { camera.x = next.x; camera.y = next.y; draw(); }
  }
  function coast(vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < .12 || reduced.matches) { settle(); return; }
    const distance = Math.min(65, speed * 75);
    const limit = bounds();
    const target = {
      x: resist(unresist(camera.x, ...limit.x, limit.overshootX) + vx / speed * distance, ...limit.x, limit.overshootX),
      y: resist(unresist(camera.y, ...limit.y, limit.overshootY) + vy / speed * distance, ...limit.y, limit.overshootY),
      scale: camera.scale
    };
    animateTo(target, 210);
    settle(245);
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('input, textarea, select')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    stop();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { camera: { ...camera }, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
      pointerMotion = null;
      dragged = true;
      viewport.classList.add('is-dragging');
      return;
    }
    pointerMotion = { x: event.clientX, y: event.clientY, at: performance.now(), vx: 0, vy: 0, travel: 0 };
    dragged = false;
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size > 1) {
      const [a, b] = [...pointers.values()];
      const scale = clamp(pinch.camera.scale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(pinch.distance, 1), .7, 1.6);
      const rect = viewport.getBoundingClientRect();
      const x = (a.x + b.x) / 2 - rect.left;
      const y = (a.y + b.y) / 2 - rect.top;
      camera.scale = scale;
      camera.x = x - (pinch.x - rect.left - pinch.camera.x) * scale / pinch.camera.scale;
      camera.y = y - (pinch.y - rect.top - pinch.camera.y) * scale / pinch.camera.scale;
      const limit = bounds();
      camera.x = resist(camera.x, ...limit.x, limit.overshootX);
      camera.y = resist(camera.y, ...limit.y, limit.overshootY);
      draw();
      return;
    }
    if (!pointerMotion) return;
    const dx = event.clientX - pointerMotion.x;
    const dy = event.clientY - pointerMotion.y;
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    dragged = true;
    if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    const now = performance.now();
    const elapsed = Math.max(now - pointerMotion.at, 1);
    pointerMotion.vx = pointerMotion.vx * .45 + dx / elapsed * .55;
    pointerMotion.vy = pointerMotion.vy * .45 + dy / elapsed * .55;
    pointerMotion.travel += Math.hypot(dx, dy);
    pointerMotion.x = event.clientX; pointerMotion.y = event.clientY; pointerMotion.at = now;
    const isTouch = event.pointerType === 'touch';
    move(dx * (isTouch ? touchPanGain : 1), dy * (isTouch ? touchPanGain : 1), !isTouch && event.pointerType !== 'mouse');
  });
  function release(event) {
    pointers.delete(event.pointerId);
    if (pinch) {
      pinch = null;
      pointerMotion = null;
      viewport.classList.remove('is-dragging');
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 120);
      settle();
      return;
    }
    if (!pointerMotion) return;
    viewport.classList.remove('is-dragging');
    cancelAnimationFrame(followFrame); followFrame = 0; followTarget = null;
    if (dragged) {
      suppressClick = true;
      settle(pointerMotion.travel < 180 ? 850 : 0);
      setTimeout(() => { suppressClick = false; }, 120);
    }
    pointerMotion = null;
    dragged = false;
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('click', event => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; } }, true);
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (pointerMotion) return;
    if (event.ctrlKey || event.metaKey) {
      const rect = viewport.getBoundingClientRect();
      zoom(event.deltaY, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      return;
    }
    const now = performance.now();
    if (!wheelMotion || now - wheelMotion.at > 240) wheelMotion = { at: now, vx: 0, vy: 0, travel: 0 };
    const elapsed = Math.max(12, now - wheelMotion.at);
    wheelMotion.vx = wheelMotion.vx * .55 - event.deltaX / elapsed * .45;
    wheelMotion.vy = wheelMotion.vy * .55 - event.deltaY / elapsed * .45;
    wheelMotion.travel += Math.hypot(event.deltaX, event.deltaY);
    wheelMotion.at = now;
    move(-event.deltaX, -event.deltaY, true);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      cancelAnimationFrame(followFrame); followFrame = 0; followTarget = null;
      wheelMotion = null;
      settle();
    }, 180);
  }, { passive: false });
  return { focus, restore, snapshot, settle, stop };
};
