(function() {
  const state = {
    dashboardVisible: false,
    activeTab: 'music',
    favoriteMood: localStorage.getItem('ariyoFavoriteMood') || 'chill'
  };

  const subscribers = [];
  function dispatch(action) {
    switch (action.type) {
      case 'TOGGLE_DASHBOARD':
        state.dashboardVisible = true;
        break;
      case 'SET_TAB':
        state.activeTab = action.tab;
        break;
      case 'SET_MOOD':
        state.favoriteMood = action.mood;
        localStorage.setItem('ariyoFavoriteMood', action.mood);
        break;
      default:
        break;
    }
    subscribers.forEach(cb => cb({ ...state }));
  }

  function subscribe(cb) {
    subscribers.push(cb);
    cb({ ...state });
  }
  function setupTabs() {
    const dashboard = document.querySelector('.pillar-dashboard');
    const tabButtons = dashboard ? dashboard.querySelectorAll('[role="tab"]') : [];
    const panels = dashboard ? dashboard.querySelectorAll('[role="tabpanel"]') : [];

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        dispatch({ type: 'SET_TAB', tab: btn.dataset.tab });
      });
    });

    subscribe(({ activeTab }) => {
      tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === activeTab;
        btn.setAttribute('aria-selected', String(isActive));
      });
      panels.forEach(panel => {
        const isActive = panel.dataset.panel === activeTab;
        panel.hidden = !isActive;
      });
    });
  }

  function setupDashboardToggle() {
    const dashboard = document.querySelector('.pillar-dashboard');
    const launchButton = document.getElementById('launchExperience');
    const statusText = document.getElementById('experienceStatus');
    if (launchButton) {
      launchButton.addEventListener('click', () => {
        dispatch({ type: 'TOGGLE_DASHBOARD' });
        if (dashboard) {
          dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const firstTab = dashboard.querySelector('[role="tab"]');
          if (firstTab) {
            firstTab.focus();
          }
        }
        if (statusText) {
          statusText.textContent = 'Dashboard unlocked. Scroll down to explore the tabs.';
        }
      });
    }
    subscribe(({ dashboardVisible }) => {
      if (dashboard) {
        dashboard.hidden = !dashboardVisible;
      }
    });
  }

  function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const select = document.getElementById('favoriteMood');
    if (!form || !select) return;
    select.value = state.favoriteMood;
    form.addEventListener('submit', event => {
      event.preventDefault();
      dispatch({ type: 'SET_MOOD', mood: select.value });
      form.querySelector('button[type="submit"]').textContent = 'Saved';
    });
  }

  function setupShareButtons() {
    const shareButton = document.getElementById('shareVibe');
    if (shareButton && navigator.share) {
      shareButton.addEventListener('click', () => {
        const heading = 'Àríyò AI by Smart Naija AI';
        const shareUrl = window.location.href.replace(/^http:\/\//i, 'https://');
        navigator.share({
          title: heading,
          text: `**${heading}**`,
          url: shareUrl
        }).catch(() => {});
      });
    }
  }

  function setupPwaInstall() {
    let deferredPrompt;
    const installBtn = document.getElementById('installPwa');
    const statusText = document.getElementById('experienceStatus');
    if (!installBtn) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    const disableInstallButton = () => {
      installBtn.disabled = true;
      installBtn.setAttribute('aria-disabled', 'true');
    };

    const enableInstallButton = () => {
      installBtn.disabled = false;
      installBtn.removeAttribute('aria-disabled');
    };

    if (isStandalone) {
      disableInstallButton();
      if (statusText) {
        statusText.textContent = 'App installed — enjoy the full experience from your home screen!';
      }
    } else {
      enableInstallButton();
      if (statusText) {
        statusText.textContent = isIos
          ? 'Tap Install PWA, then use Safari Share → Add to Home Screen.'
          : 'Tap Install PWA to add Àríyò AI to your home screen.';
      }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      enableInstallButton();
      if (statusText) {
        statusText.textContent = 'Àríyò AI is ready to be installed on your device.';
      }
    });

    installBtn.addEventListener('click', async () => {
      if (isStandalone) {
        if (statusText) {
          statusText.textContent = 'Àríyò AI is already installed on this device.';
        }
        return;
      }

      if (!deferredPrompt) {
        if (statusText) {
          statusText.textContent = isIos
            ? 'In Safari, tap Share and choose Add to Home Screen to install Àríyò AI.'
            : 'Install prompt is not available yet. Use your browser menu to install or pin this app.';
        }
        return;
      }

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (choice && choice.outcome === 'accepted') {
        disableInstallButton();
        if (statusText) {
          statusText.textContent = 'Thanks for installing! You can now launch Àríyò AI from your home screen.';
        }
      } else if (statusText) {
        statusText.textContent = 'Install canceled. You can tap Install PWA again anytime.';
      }
    });

    window.addEventListener('appinstalled', () => {
      if (statusText) {
        statusText.textContent = 'App installed — enjoy the full experience from your home screen!';
      }
      disableInstallButton();
    });
  }

  function setupOnboardingCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (!slides.length) return;
    let index = 0;
    setInterval(() => {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      index = (index + 1) % slides.length;
    }, 3500);
  }

  function initExperienceShell() {
    setupDashboardToggle();
    setupTabs();
    setupProfileForm();
    setupShareButtons();
    setupPwaInstall();
    setupOnboardingCarousel();
  }

  window.deferExperienceInit = initExperienceShell;
})();
