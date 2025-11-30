(function () {
  const THEME_STORAGE_KEY = 'ariyo-theme-preference';
  const DEFAULT_THEME = 'dark';

  const getPreferredTheme = () => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return DEFAULT_THEME;
  };

  const applyTheme = (theme) => {
    const safeTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', safeTheme);
    document.body && document.body.setAttribute('data-theme', safeTheme);

    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      const labelTarget = toggle.querySelector('.theme-toggle-label');
      const iconTarget = toggle.querySelector('.theme-toggle-icon');
      toggle.setAttribute('aria-pressed', safeTheme === 'dark' ? 'false' : 'true');
      toggle.setAttribute('aria-label', safeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      if (labelTarget) {
        labelTarget.textContent = safeTheme === 'dark' ? 'Light mode' : 'Dark mode';
      }
      if (iconTarget) {
        iconTarget.textContent = safeTheme === 'dark' ? '🌞' : '🌙';
      }
    });
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  const attachToggleHandlers = () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', toggleTheme);
      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleTheme();
        }
      });
    });
  };

  const ensureAltText = () => {
    const FALLBACK_ALT = 'Decorative image';
    document.querySelectorAll('img:not([alt]), img[alt=""]').forEach((img) => {
      img.setAttribute('alt', FALLBACK_ALT);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    attachToggleHandlers();
    ensureAltText();
  });
})();
