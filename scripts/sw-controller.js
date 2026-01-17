(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const SW_URL = '/service-worker.js';
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SERVICE_WORKER_UPDATED') {
      window.location.reload();
    }
  });

  const registerServiceWorker = async () => {
    let version = '';
    try {
      const response = await fetch('/version.json', { cache: 'no-store' });
      const data = await response.json();
      version = data.version;
    } catch (error) {
      console.error('Failed to fetch version for SW registration:', error);
    }

    const swUrl = version ? `${SW_URL}?v=${encodeURIComponent(version)}` : SW_URL;

    try {
      const registration = await navigator.serviceWorker.register(swUrl);
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          if (reg.scope !== registration.scope) {
            reg.unregister();
          }
        });
      });
    } catch (error) {
      console.log('Service worker registration failed:', error);
    }
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
})();
