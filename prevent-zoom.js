// Prevent automatic zooming on mobile orientation changes
// Applies only to touch devices to avoid affecting non-touch screens

document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(pointer: coarse)').matches) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    const applyViewport = () => {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    };

    const resetZoom = () => {
      applyViewport();
      const parent = viewport.parentNode;
      parent.removeChild(viewport);
      parent.appendChild(viewport);
    };

    resetZoom();
    window.addEventListener('orientationchange', () => {
      setTimeout(resetZoom, 200);
    });
  }
});
