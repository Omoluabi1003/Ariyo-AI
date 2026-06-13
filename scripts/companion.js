(function () {
  'use strict';

  const STORAGE = {
    favorites: 'ariyo.favoriteStations',
    recent: 'ariyo.recentTracks',
    regions: 'ariyo.preferredRegions',
    visits: 'ariyo.companionVisits',
    personality: 'ariyo.mediaPersonality',
  };

  const state = { country: 'All Africa', mood: 'Happy' };
  const countries = ['All Africa', 'Nigeria', 'Congo', 'Ghana', 'Kenya', 'South Africa', 'Cameroon', 'Global Africa'];
  const moods = [
    ['Happy', '☀', '#d66a43', 'Bright & joyful'],
    ['Worship', '✦', '#73634a', 'Faith & gratitude'],
    ['Focus', '◎', '#2c5c55', 'Deep work'],
    ['Motivation', '↑', '#8a4b33', 'Move forward'],
    ['Relaxation', '≈', '#315b70', 'Slow your mind'],
    ['Celebration', '✺', '#8a3f5c', 'Big energy'],
    ['Deep Thinking', '◌', '#443f65', 'Reflect & reset'],
  ];
  const personalities = [
    ['Afrobeat Scholar', 'You hear the history inside every drum and always have a deeper cut ready.'],
    ['Lagos Night Rider', 'Your soundtrack starts after sunset: bold rhythms, bright streets, zero dull moments.'],
    ['Gospel Warrior', 'You carry hope loudly and choose sound that lifts the whole room.'],
    ['Congo Rumba Soul', 'You move with elegance, guitar lines, and the warm patience of a timeless groove.'],
    ['Story Keeper', 'You collect wisdom, proverbs, and voices so important memories keep travelling.'],
    ['Radio Explorer', 'You cross borders through sound and always know which frequency carries home.'],
  ];

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getAlbums() {
    return Array.isArray(window.albums)
      ? window.albums
      : Array.isArray(window.libraryState?.local)
        ? window.libraryState.local
        : [];
  }

  function getStations() {
    const playerStations = Array.isArray(window.radioStations) ? window.radioStations : [];
    const merged = Array.isArray(window.mergedRadioStations) ? window.mergedRadioStations : [];
    return playerStations.length >= merged.length ? playerStations : merged;
  }

  function stationCountry(station) {
    const text = `${station?.location || ''} ${station?.country || ''} ${station?.name || ''}`.toLowerCase();
    if (/congo|kinshasa|lubumbashi|rdc/.test(text)) return 'Congo';
    if (/ghana|accra|kumasi/.test(text)) return 'Ghana';
    if (/kenya|nairobi|mombasa/.test(text)) return 'Kenya';
    if (/south africa|johannesburg|cape town|durban/.test(text)) return 'South Africa';
    if (/cameroon|douala|yaound/.test(text)) return 'Cameroon';
    if (/nigeria|lagos|abuja|ibadan|port harcourt|enugu|kano|kaduna|ondo|benin/.test(text)) return 'Nigeria';
    return 'Global Africa';
  }

  function stationMeta(station) {
    const text = `${station?.name || ''} ${station?.genre || ''} ${station?.tags || ''}`.toLowerCase();
    if (/gospel|worship|christian/.test(text)) return 'Gospel · Worship';
    if (/news|talk|info/.test(text)) return 'News · Talk';
    if (/rumba|congo/.test(text)) return 'Rumba · Lingala';
    if (/afro|hits|music/.test(text)) return 'Afrobeats · Music';
    return 'Music · Culture';
  }

  function findLauncher(target) {
    return document.querySelector(`[data-open-target="${target}"]`);
  }

  function openPanel(target) {
    const launcher = findLauncher(target);
    if (launcher) launcher.click();
  }

  function performAction(action) {
    if (action === 'music') {
      if (typeof window.openTrackList === 'function') window.openTrackList();
      else document.getElementById('music')?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'radio') {
      if (typeof window.openRadioList === 'function') window.openRadioList();
      else document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'news') openPanel('news-section');
    else if (action === 'stories') {
      const albums = getAlbums();
      const storyIndex = albums.findIndex((album) => /spoken|story|word/i.test(album.name || ''));
      if (storyIndex >= 0 && typeof window.selectAlbum === 'function') window.selectAlbum(storyIndex);
      else openPanel('ariyoChatbotContainer');
    } else if (action === 'ai') openPanel('ariyoChatbotContainer');
  }

  function routeCommand(command) {
    const text = command.trim();
    const query = text.toLowerCase();
    let action = 'ai';
    let response = `I’m opening the Ariyọ conversation so we can explore “${text}” together.`;
    if (/congo|rumba|lingala/.test(query) && /radio|play|stream/.test(query)) {
      action = 'radio';
      state.country = 'Congo';
      renderCountryFilters();
      renderStations();
      response = 'I found the Congo frequency for you—start with rumba and Lingala voices.';
    } else if (/radio|station|stream/.test(query)) {
      action = 'radio';
      response = 'Opening intelligent radio. Search by country, language, genre, or mood.';
    } else if (/music|song|track|playlist|afrobeat|worship|focus/.test(query)) {
      action = 'music';
      response = 'Opening your music library with mood-based discovery.';
    } else if (/news|brief|headline|summar/.test(query)) {
      action = 'news';
      response = 'Here is today’s Africa briefing. You can simplify or translate every summary.';
    } else if (/story|proverb|spoken/.test(query)) {
      action = 'stories';
      response = 'Opening African stories and spoken word from the existing library.';
    } else if (/game|play a game|puzzle/.test(query)) {
      openPanel('gamesHubContainer');
      response = 'Opening the games hub—pick your challenge.';
    } else if (/translate|pidgin|french|yoruba|igbo|hausa|lingala/.test(query)) {
      action = 'ai';
      response = 'Opening Ariyọ AI for language help. Your preferred language is remembered on this device.';
    }
    const output = document.getElementById('aiCommandResponse');
    if (output) {
      output.textContent = response;
      output.hidden = false;
    }
    window.setTimeout(() => performAction(action), 300);
  }

  function trackLabels(track, album, index) {
    const title = `${track?.title || ''} ${album?.name || ''}`.toLowerCase();
    const genre = /spoken|story|life|father|truth/.test(title)
      ? 'Spoken word'
      : /holy|lord|oluwa|worship/.test(title)
        ? 'Gospel'
        : 'Afro-fusion';
    const language = / pidgin| no be| dey | wahala| na /.test(` ${title} `)
      ? 'Pidgin'
      : /yoruba|omoluabi|boda/.test(title)
        ? 'Yorùbá'
        : 'English';
    const mood = moods[index % moods.length][0];
    return `${genre} · ${language} · ${mood}`;
  }

  function flattenTracks() {
    return getAlbums().flatMap((album, albumIndex) =>
      (album.tracks || []).map((track, trackIndex) => ({ album, albumIndex, track, trackIndex })),
    );
  }

  function rememberTrack(item) {
    const recent = read(STORAGE.recent, []).filter((entry) => entry.src !== item.track.src);
    recent.unshift({
      title: item.track.title,
      src: item.track.src,
      album: item.album.name,
      albumIndex: item.albumIndex,
      trackIndex: item.trackIndex,
      at: Date.now(),
    });
    write(STORAGE.recent, recent.slice(0, 8));
    renderRecent();
  }

  function playTrackItem(item) {
    if (!item?.track || typeof window.selectTrack !== 'function') return;
    rememberTrack(item);
    window.selectTrack(item.track.src, item.track.title, item.trackIndex, true, null, item.albumIndex);
  }

  function playStation(station) {
    const stations = getStations();
    const index = stations.indexOf(station);
    const playerIndex = (window.radioStations || []).findIndex((item) => item.url === station.url);
    const useIndex = playerIndex >= 0 ? playerIndex : index;
    if (useIndex >= 0 && typeof window.selectRadio === 'function') {
      window.selectRadio(station.url, station.name, useIndex, station.logo);
      write(STORAGE.regions, [stationCountry(station)]);
    }
  }

  function renderCountryFilters() {
    const host = document.getElementById('countryFilters');
    if (!host) return;
    host.innerHTML = '';
    countries.forEach((country) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = country;
      button.classList.toggle('active', state.country === country);
      button.addEventListener('click', () => {
        state.country = country;
        write(STORAGE.regions, [country]);
        renderCountryFilters();
        renderStations();
      });
      host.appendChild(button);
    });
  }

  function renderStations() {
    const host = document.getElementById('radioDiscoveryGrid');
    if (!host) return;
    const favorites = read(STORAGE.favorites, []);
    let stations = getStations();
    const selected = state.country;
    if (selected !== 'All Africa') stations = stations.filter((station) => stationCountry(station) === selected);
    if (!stations.length) stations = getStations();
    host.innerHTML = '';
    stations.slice(0, 4).forEach((station, index) => {
      const card = document.createElement('article');
      const country = stationCountry(station);
      card.className = 'station-card';
      card.style.setProperty('--station-color', ['#254d38', '#553d28', '#3b315c', '#214c55'][index % 4]);
      card.innerHTML = `<div class="station-card__top"><span class="station-card__live">● Live</span><button class="station-card__favorite" type="button" aria-label="Favorite ${station.name}">${favorites.includes(station.url) ? '♥' : '♡'}</button></div><div class="station-card__mark">◉</div><h3>${station.name}</h3><p>${country} · ${stationMeta(station)}</p>`;
      card.addEventListener('click', (event) => {
        if (!event.target.closest('.station-card__favorite')) playStation(station);
      });
      card.querySelector('.station-card__favorite').addEventListener('click', () => {
        const next = read(STORAGE.favorites, []);
        const exists = next.includes(station.url);
        write(STORAGE.favorites, exists ? next.filter((url) => url !== station.url) : [...next, station.url]);
        renderStations();
      });
      host.appendChild(card);
    });
  }

  function renderMoods() {
    const host = document.getElementById('moodGrid');
    if (!host) return;
    host.innerHTML = '';
    moods.forEach(([name, icon, color, copy]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mood-card';
      button.style.setProperty('--mood-bg', color);
      button.innerHTML = `<span>${icon}</span><b>${name}</b><small>${copy}</small>`;
      button.addEventListener('click', () => {
        state.mood = name;
        renderRecommendations();
        document.getElementById('recommendedTracks')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      host.appendChild(button);
    });
  }

  function trackCard(item, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'track-card';
    button.innerHTML = `<span class="track-card__art" style="--track-color:${['#446b51', '#6c4b36', '#384f6c'][index % 3]}">♫</span><span><b>${item.track.title}</b><small>${trackLabels(item.track, item.album, index)}</small></span><span>▶</span>`;
    button.addEventListener('click', () => playTrackItem(item));
    return button;
  }

  function renderRecommendations() {
    const host = document.getElementById('recommendedTracks');
    if (!host) return;
    const tracks = flattenTracks();
    host.innerHTML = '';
    const offset = moods.findIndex((mood) => mood[0] === state.mood);
    tracks
      .slice(Math.max(0, offset), Math.max(0, offset) + 3)
      .forEach((item, index) => host.appendChild(trackCard(item, index)));
  }

  function renderRecent() {
    const section = document.getElementById('recentlyPlayedSection');
    const host = document.getElementById('recentlyPlayed');
    if (!section || !host) return;
    const albums = getAlbums();
    const items = read(STORAGE.recent, [])
      .map((entry) => ({
        ...entry,
        album: albums[entry.albumIndex],
        track: albums[entry.albumIndex]?.tracks?.[entry.trackIndex],
      }))
      .filter((item) => item.album && item.track);
    section.hidden = !items.length;
    host.innerHTML = '';
    items.slice(0, 3).forEach((item, index) => host.appendChild(trackCard(item, index)));
  }

  function renderBriefing() {
    fetch('data/news.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        const item = Array.isArray(items) ? items[0] : null;
        if (!item) return;
        const title = document.getElementById('briefingHeadline');
        const summary = document.getElementById('briefingSummary');
        if (title) title.textContent = item.title;
        if (summary) summary.textContent = item.summary;
      })
      .catch(() => {});
    const tracks = flattenTracks();
    const stations = getStations();
    if (tracks[0]) document.getElementById('dailyTrackTitle').textContent = tracks[0].track.title;
    if (stations[0]) document.getElementById('dailyStationTitle').textContent = stations[0].name;
    document.getElementById('playDailyTrack')?.addEventListener('click', () => playTrackItem(flattenTracks()[0]));
    document.getElementById('playDailyStation')?.addEventListener('click', () => playStation(getStations()[0]));
  }

  function initSmartRadioSearch() {
    const input = document.getElementById('smartRadioSearch');
    const host = document.getElementById('smartRadioResults');
    if (!input || !host) return;
    const search = (query) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = getStations()
        .filter((station) => {
          const haystack =
            `${station.name} ${station.location || ''} ${station.country || ''} ${station.genre || ''} ${stationMeta(station)} ${stationCountry(station)}`.toLowerCase();
          return words.every(
            (word) =>
              haystack.includes(word) ||
              (word === 'nigerian' && haystack.includes('nigeria')) ||
              (word === 'congolese' && haystack.includes('congo')) ||
              (word === 'focus' && /music|classic|jazz/.test(haystack)),
          );
        })
        .slice(0, 8);
      host.innerHTML = '';
      matches.forEach((station) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'smart-radio-result';
        button.innerHTML = `<span>${station.name}<br><small>${stationCountry(station)} · ${stationMeta(station)}</small></span><b>▶</b>`;
        button.addEventListener('click', () => playStation(station));
        host.appendChild(button);
      });
      if (query && !matches.length)
        host.innerHTML = '<p>No exact match yet. Try a country, “news,” “gospel,” or “music.”</p>';
    };
    input.addEventListener('input', () => search(input.value));
    document.querySelectorAll('[data-radio-query]').forEach((button) =>
      button.addEventListener('click', () => {
        input.value = button.dataset.radioQuery;
        search(input.value);
      }),
    );
  }

  function simplify(mode) {
    const summary = document.getElementById('briefingSummary');
    if (!summary) return;
    const versions = {
      simple: 'Here is the main point: a new African culture and music update is available now. Open it to learn more.',
      pidgin: 'See the main gist: new African culture and music update don land. Open am make you see everything.',
      fr: 'Voici l’essentiel : une nouvelle actualité sur la culture et la musique africaines est disponible. Ouvrez-la pour en savoir plus.',
    };
    summary.textContent = versions[mode] || summary.textContent;
  }

  function setPersonality(forceRandom) {
    const saved = read(STORAGE.personality, null);
    const activity = read(STORAGE.recent, []).length + read(STORAGE.favorites, []).length;
    const index = forceRandom
      ? Math.floor(Math.random() * personalities.length)
      : (saved?.index ?? activity % personalities.length);
    const [name, copy] = personalities[index];
    write(STORAGE.personality, { index, name });
    document.getElementById('personalityName').textContent = name;
    document.getElementById('personalityCopy').textContent = copy;
  }

  function initPersonality() {
    setPersonality(false);
    document.getElementById('generatePersonality')?.addEventListener('click', () => setPersonality(true));
    document.getElementById('sharePersonality')?.addEventListener('click', async () => {
      const name = document.getElementById('personalityName')?.textContent || 'Radio Explorer';
      const text = `My African Media Personality is “${name}” on Ariyọ AI — Africa's AI Media Companion. What’s yours?`;
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById('personalityStatus').textContent = 'Copied—share your cultural frequency.';
      } catch (_) {
        window.prompt('Copy your result:', text);
      }
    });
  }

  function initReturningUser() {
    const visits = Number(read(STORAGE.visits, 0));
    write(STORAGE.visits, visits + 1);
    const host = document.getElementById('returningMessage');
    if (!host || visits < 1) return;
    const favorites = read(STORAGE.favorites, []);
    const station = getStations().find((item) => favorites.includes(item.url));
    host.textContent = station
      ? `Welcome back—${station.name}, your favorite station, is ready.`
      : 'Welcome back—your daily African soundtrack is ready.';
    host.hidden = false;
  }

  function initLanguageMemory() {
    window.addEventListener('ariyo:languageChanged', (event) => {
      try {
        localStorage.setItem('ariyo.preferredLanguage', event.detail.language);
      } catch (_) {}
    });
  }

  function bind() {
    document.getElementById('aiCommandForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('aiCommandInput');
      if (input?.value.trim()) routeCommand(input.value);
    });
    document.querySelectorAll('[data-ai-prompt]').forEach((button) =>
      button.addEventListener('click', () => {
        const input = document.getElementById('aiCommandInput');
        input.value = button.dataset.aiPrompt;
        routeCommand(button.dataset.aiPrompt);
      }),
    );
    document
      .querySelectorAll('[data-companion-action]')
      .forEach((button) => button.addEventListener('click', () => performAction(button.dataset.companionAction)));
    document
      .querySelectorAll('[data-simplify]')
      .forEach((button) => button.addEventListener('click', () => simplify(button.dataset.simplify)));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-result[role="option"]')) return;
      window.setTimeout(() => document.querySelector('.music-player')?.scrollIntoView({ block: 'center' }), 50);
    });
    document.querySelectorAll('[data-creator-tool]').forEach((button) =>
      button.addEventListener('click', () => {
        const output = document.getElementById('aiCommandResponse');
        output.textContent = `${button.textContent} is queued for Creator Studio. AI publishing tools are coming soon.`;
        output.hidden = false;
        document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
      }),
    );
  }

  function refreshLibraryUi() {
    renderStations();
    renderRecommendations();
    renderRecent();
    renderBriefing();
  }
  function init() {
    bind();
    renderCountryFilters();
    renderMoods();
    refreshLibraryUi();
    initSmartRadioSearch();
    initPersonality();
    initReturningUser();
    initLanguageMemory();
  }

  window.AriyoCompanion = { routeCommand, stationCountry, stationMeta, read, write };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('ariyo:library-ready', refreshLibraryUi);
  window.addEventListener('ariyo:library-updated', refreshLibraryUi);
})();
