(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const debugEnabled = params.get('debug') === '1'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!debugEnabled) return;

  const log = (...args) => console.debug('[scroll-lock-auditor]', ...args);
  const body = document.body;

  if (!body) {
    document.addEventListener('DOMContentLoaded', () => window.requestAnimationFrame(() => {
      if (document.body) {
        log('body-ready');
      }
    }));
    return;
  }

  const observedProps = ['overflow', 'position', 'touchAction', 'overscrollBehavior', 'height'];
  const readStyleSnapshot = () => {
    const computed = window.getComputedStyle(body);
    return observedProps.reduce((acc, prop) => {
      acc[prop] = body.style[prop] || computed[prop];
      return acc;
    }, {});
  };

  let lastStyleSnapshot = readStyleSnapshot();
  let lastClassName = body.className;

  const classLockRegex = /(no-scroll|scroll|lock|modal-open|overflow-hidden)/i;

  const reportBodyChanges = () => {
    const nextSnapshot = readStyleSnapshot();
    const diff = {};
    observedProps.forEach(prop => {
      if (nextSnapshot[prop] !== lastStyleSnapshot[prop]) {
        diff[prop] = { from: lastStyleSnapshot[prop], to: nextSnapshot[prop] };
      }
    });
    if (Object.keys(diff).length) {
      log('body-style-change', diff);
      lastStyleSnapshot = nextSnapshot;
    }

    if (body.className !== lastClassName) {
      const classList = body.className.split(/\s+/).filter(Boolean);
      if (classList.some(cls => classLockRegex.test(cls))) {
        log('body-class-change', {
          from: lastClassName,
          to: body.className
        });
      }
      lastClassName = body.className;
    }
  };

  const overlaySelectors = [
    '.modal',
    '.chatbot-container',
    '.share-options-modal',
    '.email-gate',
    '.overlay',
    '.backdrop',
    '[data-overlay]'
  ];

  const describeOverlay = (el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      node: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      display: style.display,
      visibility: style.visibility,
      position: style.position,
      pointerEvents: style.pointerEvents,
      zIndex: style.zIndex,
      coversViewport: rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9
    };
  };

  const reportActiveOverlays = () => {
    const overlays = document.querySelectorAll(overlaySelectors.join(','));
    const active = Array.from(overlays).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (active.length) {
      log('active-overlays', active.map(describeOverlay));
    }
  };

  const reportPositionFixed = () => {
    const html = document.documentElement;
    const bodyStyle = window.getComputedStyle(body);
    const htmlStyle = window.getComputedStyle(html);
    if (bodyStyle.position === 'fixed' || htmlStyle.position === 'fixed') {
      log('fixed-position-detected', {
        html: htmlStyle.position,
        body: bodyStyle.position
      });
    }
  };

  const reportVhUsage = () => {
    const elements = document.querySelectorAll('[style*="vh"]');
    const offenders = Array.from(elements)
      .filter(el => {
        const styleValue = el.getAttribute('style') || '';
        return styleValue.includes('100vh') || styleValue.includes('100dvh');
      })
      .slice(0, 12)
      .map(el => ({
        node: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        style: el.getAttribute('style')
      }));
    if (offenders.length) {
      log('inline-vh-usage', offenders);
    }
  };

  const observer = new MutationObserver((mutations) => {
    let overlayMutation = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.target === body) {
        reportBodyChanges();
      }
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.(overlaySelectors.join(','))) {
            overlayMutation = true;
            log('overlay-mounted', describeOverlay(node));
          }
        });
        mutation.removedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.(overlaySelectors.join(','))) {
            overlayMutation = true;
            log('overlay-unmounted', describeOverlay(node));
          }
        });
      }
    });
    if (overlayMutation) {
      reportActiveOverlays();
      reportPositionFixed();
      reportVhUsage();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    childList: true,
    subtree: true
  });

  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const handlerMap = new WeakMap();

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    const isTrackedTarget = this === window || this === document;
    if (isTrackedTarget && ['touchmove', 'wheel', 'scroll'].includes(type) && typeof listener === 'function') {
      const wrapped = function (event) {
        listener.call(this, event);
        if (event.defaultPrevented) {
          log('preventDefault', { type, target: event.target });
        }
      };
      handlerMap.set(listener, wrapped);
      log('listener-added', { target: this === window ? 'window' : 'document', type, options });
      return originalAdd.call(this, type, wrapped, options);
    }
    return originalAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    const wrapped = handlerMap.get(listener);
    return originalRemove.call(this, type, wrapped || listener, options);
  };

  reportBodyChanges();
  reportActiveOverlays();
  reportPositionFixed();
  reportVhUsage();
})();
