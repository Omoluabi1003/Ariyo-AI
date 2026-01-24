// Deferred loader for the full catalog to keep initial paint light.
(function () {
  const FULL_DATA_SRC = 'scripts/data.js';
  const CACHE_KEY = 'ariyoFullCatalogLoadedAt';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  function isSlowConnection() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')));
  }

  function shouldRefreshCache() {
    try {
      const timestamp = Number(localStorage.getItem(CACHE_KEY) || 0);
      return !timestamp || (Date.now() - timestamp) > CACHE_TTL_MS;
    } catch (error) {
      return true;
    }
  }

  function markCache() {
    try {
      localStorage.setItem(CACHE_KEY, String(Date.now()));
    } catch (error) {
      // Ignore storage quota issues; cache is only an optimization.
    }
  }

  function loadScript() {
    if (window.__ariyoLibraryHydrated) {
      return Promise.resolve('already-loaded');
    }

    if (window.__ariyoLibraryLoadPromise) {
      return window.__ariyoLibraryLoadPromise;
    }

    window.__ariyoLibraryLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = FULL_DATA_SRC;
      script.async = true;
      script.onload = () => {
        window.__ariyoLibraryHydrated = true;
        window.__ariyoLibraryMode = 'full';
        markCache();
        resolve('loaded');
      };
      script.onerror = () => reject(new Error('Failed to load catalog'));
      document.head.appendChild(script);
    }).finally(() => {
      window.__ariyoLibraryLoadPromise = null;
    });

    return window.__ariyoLibraryLoadPromise;
  }

  function loadFullLibrary({ reason = 'idle', immediate = false } = {}) {
    const shouldRefresh = shouldRefreshCache();
    if (!shouldRefresh && window.__ariyoLibraryHydrated) {
      return Promise.resolve('cached');
    }

    if (!immediate && isSlowConnection()) {
      // Avoid pulling the full catalog on slow networks until the listener asks.
      return Promise.resolve('deferred');
    }

    return loadScript().catch(error => {
      console.warn('[catalog] Full catalog load failed:', error, { reason });
      return 'failed';
    });
  }

  function hasAlbumsLoaded() {
    return Array.isArray(window.albums) && window.albums.length > 0;
  }

  function scheduleIdleLoad() {
    if (!hasAlbumsLoaded()) {
      loadFullLibrary({ reason: 'bootstrap-missing', immediate: true });
      return;
    }

    if (isSlowConnection()) {
      return;
    }

    const schedule = typeof requestIdleCallback === 'function'
      ? cb => requestIdleCallback(cb, { timeout: 2500 })
      : cb => setTimeout(cb, 1200);

    schedule(() => {
      loadFullLibrary({ reason: 'idle' });
    });
  }

  window.loadFullLibraryData = loadFullLibrary;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleIdleLoad();
  } else {
    document.addEventListener('DOMContentLoaded', scheduleIdleLoad, { once: true });
  }
})();
