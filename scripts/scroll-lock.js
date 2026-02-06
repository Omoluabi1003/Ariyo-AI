(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (window.AriyoScrollLock) {
    return;
  }

  const body = document.body;
  const html = document.documentElement;
  const state = {
    count: 0,
    reasons: new Map(),
    restore: null
  };

  const captureStyles = () => ({
    body: {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      touchAction: body.style.touchAction,
      overscrollBehavior: body.style.overscrollBehavior,
      height: body.style.height
    },
    html: {
      overflow: html.style.overflow,
      touchAction: html.style.touchAction,
      overscrollBehavior: html.style.overscrollBehavior,
      height: html.style.height
    }
  });

  const applyStyles = (target, styles) => {
    Object.entries(styles).forEach(([key, value]) => {
      target.style[key] = value || '';
    });
  };

  const getScrollbarWidth = () => {
    const width = window.innerWidth - document.documentElement.clientWidth;
    return Number.isFinite(width) && width > 0 ? width : 0;
  };

  const applyLockStyles = () => {
    const scrollbarWidth = getScrollbarWidth();
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    html.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  };

  const restoreStyles = () => {
    if (!state.restore) return;
    applyStyles(body, state.restore.body);
    applyStyles(html, state.restore.html);
    state.restore = null;
  };

  const getActiveOverlays = () => {
    const selectors = [
      '.modal',
      '.chatbot-container',
      '.share-options-modal',
      '.email-gate:not([hidden])',
      '.news-panel',
      '.overlay',
      '.backdrop',
      '[data-overlay]'
    ];
    const nodes = document.querySelectorAll(selectors.join(','));
    return Array.from(nodes).filter(node => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      const hiddenByAttr = node.getAttribute('aria-hidden') === 'true';
      return !hiddenByAttr && style.display !== 'none' && style.visibility !== 'hidden';
    });
  };

  const lockScroll = (reason = 'unknown') => {
    const normalizedReason = String(reason || 'unknown');
    if (state.count === 0) {
      state.restore = captureStyles();
      applyLockStyles();
    }
    state.count += 1;
    state.reasons.set(normalizedReason, (state.reasons.get(normalizedReason) || 0) + 1);
    return state.count;
  };

  const unlockScroll = (reason = 'unknown') => {
    if (state.count === 0) return state.count;
    const normalizedReason = String(reason || 'unknown');
    if (state.reasons.has(normalizedReason)) {
      const nextCount = (state.reasons.get(normalizedReason) || 1) - 1;
      if (nextCount <= 0) {
        state.reasons.delete(normalizedReason);
      } else {
        state.reasons.set(normalizedReason, nextCount);
      }
    }
    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      restoreStyles();
    }
    return state.count;
  };

  const resetScrollLock = () => {
    state.count = 0;
    state.reasons.clear();
    restoreStyles();
  };

  const ensureUnlocked = ({ reason = 'unknown' } = {}) => {
    if (state.count === 0) return true;
    const overlays = getActiveOverlays();
    if (overlays.length) {
      return false;
    }
    const previousLocks = getLockReasons();
    resetScrollLock();
    if (window?.console) {
      console.warn('[scroll-lock] Reset lingering scroll locks', {
        reason,
        previousLocks
      });
    }
    return true;
  };

  const getLockCount = () => state.count;
  const getLockReasons = () => Array.from(state.reasons.entries());

  const scrollLockApi = {
    lockScroll,
    unlockScroll,
    resetScrollLock,
    ensureUnlocked,
    getLockCount,
    getLockReasons,
    getActiveOverlays
  };

  window.AriyoScrollLock = scrollLockApi;

  window.addEventListener('hashchange', () => ensureUnlocked({ reason: 'hashchange' }));
  window.addEventListener('popstate', () => ensureUnlocked({ reason: 'popstate' }));
  window.addEventListener('pageshow', () => ensureUnlocked({ reason: 'pageshow' }), { passive: true });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = scrollLockApi;
  }
})();
