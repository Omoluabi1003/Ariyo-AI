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
        navigator.share({
          title: 'Àríyò AI',
          text: 'Discover Naija vibes with Àríyò AI',
          url: window.location.href
        }).catch(() => {});
      });
    }
  }

  function setupPwaInstall() {
    let deferredPrompt;
    const installBtn = document.getElementById('installPwa');
    const statusText = document.getElementById('experienceStatus');
    if (!installBtn) return;
    installBtn.disabled = true;
    installBtn.setAttribute('aria-disabled', 'true');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.disabled = false;
      installBtn.removeAttribute('aria-disabled');
      if (statusText) {
        statusText.textContent = 'Àríyò AI is ready to be installed on your device.';
      }
    });
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        if (statusText) {
          statusText.textContent = 'Install prompt unavailable. Add to home screen from your browser menu.';
        }
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.disabled = true;
      installBtn.setAttribute('aria-disabled', 'true');
      if (statusText) {
        statusText.textContent = 'Thanks for installing! You can now launch Àríyò AI from your home screen.';
      }
    });
    window.addEventListener('appinstalled', () => {
      if (statusText) {
        statusText.textContent = 'App installed — enjoy the full experience from your home screen!';
      }
      installBtn.disabled = true;
      installBtn.setAttribute('aria-disabled', 'true');
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

  document.addEventListener('DOMContentLoaded', () => {
    setupDashboardToggle();
    setupTabs();
    setupProfileForm();
    setupShareButtons();
    setupPwaInstall();
    setupOnboardingCarousel();
  });
})();
