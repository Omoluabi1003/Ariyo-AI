// Prevent automatic zooming on mobile orientation changes
// Applies only to touch devices to avoid affecting non-touch screens

document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(pointer: coarse)').matches) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    const lockZoom = () => {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    };

    lockZoom();
    window.addEventListener('orientationchange', () => {
      // Reapply the viewport settings after orientation change to avoid zoom
      setTimeout(lockZoom, 200);
    });
  }
});
