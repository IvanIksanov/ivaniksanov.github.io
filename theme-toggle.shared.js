(() => {
  const button = document.getElementById('theme-toggle');
  if (!button || button.dataset.themeBound) return;
  button.dataset.themeBound = 'true';
  const sync = () => button.classList.toggle('active', document.documentElement.dataset.theme === 'dark');
  sync();
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    sync();
  });
})();
