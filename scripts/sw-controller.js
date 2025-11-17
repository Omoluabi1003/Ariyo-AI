(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const SW_URL = '/service-worker.js';
  const VERSION_URL = '/version.json';
  let hasController = !!navigator.serviceWorker.controller;
  let reloadScheduled = false;
  let updateIntervalId = null;

  const scheduleReload = () => {
    if (reloadScheduled) {
      return;
    }
    reloadScheduled = true;
    window.location.reload();
  };

  const requestSkipWaiting = (worker) => {
    if (!worker) {
      return;
    }
    try {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      console.error('Failed to request skip waiting on service worker:', error);
    }
  };

  const watchInstallingWorker = (worker) => {
    if (!worker) {
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        requestSkipWaiting(worker);
      }
    });
  };

  const attachUpdateHandlers = (registration) => {
    if (!registration) {
      return;
    }

    if (registration.waiting) {
      requestSkipWaiting(registration.waiting);
    }

    if (registration.installing) {
      watchInstallingWorker(registration.installing);
    }

    registration.addEventListener('updatefound', () => {
      watchInstallingWorker(registration.installing);
    });
  };

  const refreshRegistrationPeriodically = (registration) => {
    if (!registration || updateIntervalId) {
      return;
    }
    const runUpdate = () => {
      registration.update().catch((error) => {
        console.error('Service worker update check failed:', error);
      });
    };
    runUpdate();
    updateIntervalId = setInterval(runUpdate, 5 * 60 * 1000);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    scheduleReload();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SERVICE_WORKER_UPDATED') {
      scheduleReload();
    }
  });

  const registerServiceWorker = async () => {
    let versionSuffix = '';
    try {
      const response = await fetch(VERSION_URL, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data && data.version) {
          versionSuffix = `?v=${encodeURIComponent(data.version)}`;
        }
      }
    } catch (error) {
      console.warn('Version lookup for service worker registration failed:', error);
    }

    try {
      const registration = await navigator.serviceWorker.register(`${SW_URL}${versionSuffix}`);
      attachUpdateHandlers(registration);
      navigator.serviceWorker.ready
        .then((readyRegistration) => {
          attachUpdateHandlers(readyRegistration);
          refreshRegistrationPeriodically(readyRegistration);
        })
        .catch((error) => {
          console.error('Failed to wait for service worker readiness:', error);
        });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
})();
