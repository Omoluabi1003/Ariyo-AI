/**
 * Normalise viewport-dependent layout across mobile browsers.
 *
 * Many mobile browsers (notably Safari on iPad/iOS) report 100vh as the
 * full device height instead of the visible viewport, which causes the app
 * to extend below the fold and forces users to scroll before seeing the
 * content.  This helper keeps a CSS custom property in sync with the
 * currently visible viewport dimensions so layouts can rely on
 * `var(--app-height)` instead of the unreliable 100vh unit.
 */
(function () {
  const root = document.documentElement;

  const setViewportVars = () => {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    const width = viewport ? viewport.width : window.innerWidth;
    const offsetTop = viewport ? viewport.offsetTop : 0;
    const offsetLeft = viewport ? viewport.offsetLeft : 0;

    root.style.setProperty('--app-height', `${height}px`);
    root.style.setProperty('--app-width', `${width}px`);
    root.style.setProperty('--app-offset-top', `${offsetTop}px`);
    root.style.setProperty('--app-offset-left', `${offsetLeft}px`);
  };

  const scheduleUpdate = () => {
    window.requestAnimationFrame(setViewportVars);
  };

  const init = () => {
    setViewportVars();

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', () => {
      // Allow the viewport to settle after the orientation has flipped.
      setTimeout(setViewportVars, 250);
    });
    window.addEventListener('pageshow', setViewportVars);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleUpdate);
      window.visualViewport.addEventListener('scroll', scheduleUpdate);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
