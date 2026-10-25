(() => {
  if (!/^\/test(?:\/|$)/.test(window.location.pathname)) return;

  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/png';
  icon.sizes = '100x100';
  icon.href = '/test/img/QAtoDev_small_test.png';
  document.head.append(icon);
})();
