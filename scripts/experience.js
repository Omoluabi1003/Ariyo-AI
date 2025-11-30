(function() {
  const state = {
    dashboardVisible: false,
    activeTab: 'music',
    favoriteMood: localStorage.getItem('ariyoFavoriteMood') || 'chill',
    language: localStorage.getItem('ariyoLanguage') || 'en'
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
      case 'SET_LANGUAGE':
        state.language = action.language;
        localStorage.setItem('ariyoLanguage', action.language);
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

  const playlists = [
    { mood: 'chill', title: 'Afrobeats for Chill', description: 'Burna Boy, Tems, and mellow percussions for late nights.', playlistId: 'PL8fVUTBmJhHJZTW4QCCqC90qzGyU1EIVu' },
    { mood: 'party', title: 'Amapiano Turns', description: 'Log drum bounce with Mayorkun and Falz for the dance floor.', playlistId: 'PLdUVQ9bLAaqJFnq2iC2IZgmxvJMuAdxpv' },
    { mood: 'focus', title: 'Alté Focus', description: 'Soft vocals and clean instrumentals for deep work.', playlistId: 'PLw-VjHDlEOguvkAD9TkoJ8gzzb_kJiw6R' },
    { mood: 'worship', title: 'Soulful Worship', description: 'Elevation rhythms with spirit-lifting hooks.', playlistId: 'PLU8wpH_LfhmuSL4rXHLCEeAuWkjk9apJb' },
    { mood: 'chill', title: 'Lush Palmwine', description: 'Highlife guitars and palmwine groove to unwind.', playlistId: 'PLfP6i5T0-Dk70dwZ0pniS0WAs5UkvYjs9' },
    { mood: 'party', title: 'Street Cruise', description: 'Portable energy and street anthems to raise the roof.', playlistId: 'PLufpEx4Jr49aiiV9t3-1xbJkLwTWY7UuO' },
    { mood: 'focus', title: 'Instrumental Drift', description: 'Neo-soul chords and soft drums to keep flow states alive.', playlistId: 'PLVbe9rjS7rm-f3GFM4enTcNn_0FoKDT3h' },
    { mood: 'worship', title: 'Sunday Sunrise', description: 'Gentle harmonies and choruses for reflective mornings.', playlistId: 'PLSpY6i4Q7sNC4u6UjC_8sELpAo-VP5Ndw' }
  ];

  let playlistCursor = 0;
  const batchSize = 3;
  const playerMap = new Map();
  let youTubeReady = false;
  let youTubeReadyPromise;

  function loadYouTubeApi() {
    if (youTubeReadyPromise) return youTubeReadyPromise;
    youTubeReadyPromise = new Promise(resolve => {
      if (window.YT && window.YT.Player) {
        youTubeReady = true;
        resolve();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        youTubeReady = true;
        resolve();
      };
    });
    return youTubeReadyPromise;
  }

  function renderPlaylistCard(item) {
    const card = document.createElement('article');
    card.className = 'playlist-card';
    card.dataset.mood = item.mood;
    card.innerHTML = `
      <div class="playlist-meta">
        <p class="eyebrow">${item.mood}</p>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <button type="button" class="badge-button" data-action="play">Play</button>
        <button type="button" class="ghost" data-action="pause">Pause</button>
      </div>
      <div class="player-shell" id="player-${item.playlistId}"></div>
    `;

    card.addEventListener('click', async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      await loadYouTubeApi();
      const playerHost = card.querySelector('.player-shell');
      let player = playerMap.get(playerHost);
      if (!player) {
        player = new YT.Player(playerHost, {
          height: '200',
          width: '320',
          playerVars: {
            listType: 'playlist',
            list: item.playlistId,
            modestbranding: 1,
            rel: 0
          }
        });
        playerMap.set(playerHost, player);
      }
      if (action === 'play') {
        player.playVideo ? player.playVideo() : null;
      } else if (action === 'pause') {
        player.pauseVideo ? player.pauseVideo() : null;
      }
    });
    return card;
  }

  function loadMorePlaylists() {
    const stream = document.getElementById('playlistStream');
    if (!stream) return;
    const next = playlists.slice(playlistCursor, playlistCursor + batchSize);
    next.forEach(item => stream.appendChild(renderPlaylistCard(item)));
    playlistCursor += batchSize;
    if (playlistCursor >= playlists.length) {
      const sentinel = document.getElementById('playlistSentinel');
      if (sentinel) sentinel.remove();
    }
  }

  function setupInfiniteScroll() {
    const sentinel = document.getElementById('playlistSentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMorePlaylists();
        }
      });
    });
    observer.observe(sentinel);
    loadMorePlaylists();
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
    if (launchButton) {
      launchButton.addEventListener('click', () => dispatch({ type: 'TOGGLE_DASHBOARD' }));
    }
    subscribe(({ dashboardVisible, favoriteMood }) => {
      if (dashboard) {
        dashboard.hidden = !dashboardVisible;
      }
      const playlistTitle = document.getElementById('moodPlaylists');
      if (playlistTitle) {
        playlistTitle.textContent = `Stream Naija vibes for ${favoriteMood} moods`;
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

  function setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.language-toggle button');
    const translations = {
      en: {
        stories: 'From Highlife roots to global charts, Naija creators shape the groove—share your take below.'
      },
      pcm: {
        stories: 'From Highlife to today charts, Naija creatives dey guide the sound—drop your gist.'
      },
      yo: {
        stories: 'Lati orin Highlife de orin òde òní, àwọn akéwì Naija ló ń dari àwọ̀n; sọ ìtàn tirẹ.'
      }
    };

    langButtons.forEach(btn => {
      btn.addEventListener('click', () => dispatch({ type: 'SET_LANGUAGE', language: btn.dataset.lang }));
    });

    subscribe(({ language }) => {
      langButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === language));
      const story = document.querySelector('.story-snippet p');
      if (story && translations[language]) {
        story.textContent = translations[language].stories;
      }
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
    if (!installBtn) return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.disabled = false;
    });
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  }

  function setupPushAlerts() {
    const alertsBtn = document.getElementById('playlistAlerts');
    if (!alertsBtn) return;
    alertsBtn.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alertsBtn.textContent = 'Alerts on';
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification('New playlist drops', {
            body: 'We will ping you when fresh mixes land.',
            icon: '/icons/Ariyo.png'
          });
        }
      } else {
        alertsBtn.textContent = 'Alerts blocked';
      }
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
    setupLanguageSwitcher();
    setupShareButtons();
    setupPwaInstall();
    setupPushAlerts();
    setupInfiniteScroll();
    setupOnboardingCarousel();
  });
})();
