(() => {
  const button = document.getElementById('enableNotifications');
  const statusEl = document.getElementById('notificationStatus');

  const unsupported = !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window);

  const setStatus = (message, state = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const fetchPublicKey = async () => {
    const response = await fetch('/api/push/public-key');
    if (!response.ok) {
      throw new Error('Unable to load VAPID public key.');
    }
    const data = await response.json();
    if (!data.publicKey) {
      throw new Error('VAPID public key missing.');
    }
    return data.publicKey;
  };

  const sendSubscriptionToServer = async (subscription) => {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Subscription save failed');
    }
  };

  const ensureSubscribed = async () => {
    const permission = Notification.permission;
    if (permission === 'denied') {
      setStatus('Notifications are blocked. Enable them in your browser settings.', 'error');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      setStatus('Notifications are active. You will hear about fresh drops.', 'success');
      button?.setAttribute('disabled', 'true');
      return;
    }

    const publicKey = await fetchPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    await sendSubscriptionToServer(subscription);
    setStatus('Notifications enabled. We will ping you for new drops.', 'success');
    button?.setAttribute('disabled', 'true');
  };

  const handleClick = async () => {
    if (unsupported) {
      setStatus('Push notifications are not supported on this device.', 'error');
      return;
    }

    try {
      setStatus('Requesting permission…');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('We need notification permission to send drop alerts.', 'error');
        return;
      }
      await ensureSubscribed();
    } catch (error) {
      console.error('Push enable failed', error);
      setStatus('Unable to enable notifications right now. Please try again.', 'error');
    }
  };

  const init = () => {
    if (!button) {
      return;
    }

    if (unsupported) {
      setStatus('Push notifications are not supported on this device.', 'error');
      button.setAttribute('disabled', 'true');
      return;
    }

    button.addEventListener('click', handleClick, { once: false });

    navigator.permissions?.query({ name: 'notifications' }).then((permissionStatus) => {
      if (permissionStatus.state === 'denied') {
        setStatus('Notifications are blocked in your browser settings.', 'error');
        button.setAttribute('disabled', 'true');
        return;
      }
      if (permissionStatus.state === 'granted') {
        ensureSubscribed().catch((error) => {
          console.error('Auto-subscribe failed', error);
        });
      }
      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          ensureSubscribed().catch(() => {});
        }
      };
    }).catch(() => {
      if (Notification.permission === 'granted') {
        ensureSubscribed().catch(() => {});
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
