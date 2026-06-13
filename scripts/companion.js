(function () {
  'use strict';

  const engine = window.AriyoMediaIntelligence;
  if (!engine) return;

  const { STORAGE_KEYS } = engine;
  const state = {
    country: engine.safeRead(STORAGE_KEYS.preferredRegion, 'All Africa'),
    mood: 'All moods',
    language: engine.safeRead(STORAGE_KEYS.preferredLanguage, 'English'),
    contentType: 'All content',
  };
  const countries = ['All Africa', 'Nigeria', 'Congo', 'Ghana', 'Kenya', 'South Africa', 'Cameroon', 'Global Africa'];
  const moods = [
    'All moods',
    'Focus',
    'Worship',
    'Reflection',
    'Motivation',
    'Celebration',
    'Study',
    'Evening Wind Down',
  ];
  const fallbackBriefing = {
    headline: 'African audiences are moving fluidly between news, live radio, and culturally grounded sound.',
    summary:
      'Ariyọ’s local media graph shows the opportunity in connecting information with relevant music, regional radio, language support, and cultural context rather than treating each format as a separate destination.',
  };

  function escapeHtml(value) {
    return String(value || '').replace(
      /[&<>'"]/g,
      (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character],
    );
  }

  function findLauncher(target) {
    return document.querySelector(`[data-open-target="${target}"]`);
  }

  function openPanel(target) {
    findLauncher(target)?.click();
  }

  function performAction(action) {
    if (action === 'music')
      typeof window.openTrackList === 'function'
        ? window.openTrackList()
        : document.getElementById('music')?.scrollIntoView({ behavior: 'smooth' });
    else if (action === 'radio')
      typeof window.openRadioList === 'function'
        ? window.openRadioList()
        : document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
    else if (action === 'news') openPanel('news-section');
    else if (action === 'stories') {
      const story = engine.getTracks().find((track) => /spoken|story|word/i.test(track.album?.name || track.title));
      if (story && typeof window.selectTrack === 'function') playTrack(story);
      else openPanel('ariyoChatbotContainer');
    } else if (action === 'creator') document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
    else if (action === 'games') openPanel('gamesHubContainer');
    else openPanel('ariyoChatbotContainer');
  }

  function routeCommand(command) {
    const text = command.trim();
    if (!text) return;
    const query = text.toLowerCase();
    let route = 'AI / GENERAL';
    let response = 'Opening Ariyọ Chat with your query and the current media context.';
    if (/game|puzzle|simulation/.test(query)) {
      route = 'GAMES / INTERACTIVE';
      response = 'Routing to the existing games and simulations hub.';
      performAction('games');
    } else if (/congo|lingala|rumba/.test(query) && /radio|station|stream|tuning/.test(query)) {
      state.country = 'Congo';
      engine.safeWrite(STORAGE_KEYS.preferredRegion, state.country);
      renderCountryFilters();
      renderStations();
      route = 'RADIO / CONGO / LINGALA';
      response = 'Radio intelligence filtered to Congo. Stations are ranked with Lingala and rumba context first.';
      document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/radio|station|stream|broadcast/.test(query)) {
      route = 'RADIO / DISCOVERY';
      response = 'Opening live radio intelligence with country, language, content, and use-case metadata.';
      document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/music|song|track|focus|worship|celebration|study/.test(query)) {
      const matchedMood = moods.find((mood) => query.includes(mood.toLowerCase()));
      if (matchedMood) state.mood = matchedMood;
      renderMoods();
      renderRecommendations();
      route = `MUSIC / ${state.mood.toUpperCase()}`;
      response = `Music intelligence is prioritizing ${state.mood.toLowerCase()} recommendations from the existing catalogue.`;
      document.getElementById('music')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/news|brief|headline|trend|summar|simple english/.test(query)) {
      route = 'NEWS / SYNTHESIS';
      response =
        'Opening the African Media Briefing with executive, simple English, Pidgin, and French interpretation paths.';
      document.getElementById('news')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/story|culture|proverb|spoken/.test(query)) {
      route = 'CULTURE / KNOWLEDGE';
      response =
        'Opening the cultural knowledge layer with paths into spoken word, regional radio, and reflective music.';
      document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/translate|french|pidgin|yoruba|igbo|hausa|lingala|language/.test(query)) {
      route = 'LANGUAGE / TRANSFORMATION';
      response = 'Opening language intelligence. Your preferred language will be stored only on this device.';
      document.getElementById('language')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/creator|metadata|title|description|cover|release/.test(query)) {
      route = 'CREATOR / FOUNDATION';
      response =
        'Opening Creator Studio Foundation. Backend-dependent generation tools are clearly marked Coming Soon.';
      document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
    } else if (/africa|trending|listeners|media/.test(query)) {
      route = 'ASK AFRICA / GRAPH QUERY';
      askAfrica(text);
      response = 'The local media graph has synthesized a structured Ask Africa response.';
      document.getElementById('ask-africa')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.setTimeout(() => performAction('ai'), 550);
    }
    const output = document.getElementById('aiCommandResponse');
    if (output) {
      output.innerHTML = `<span>${escapeHtml(route)}</span><p>${escapeHtml(response)}</p>`;
      output.hidden = false;
    }
    const log = document.getElementById('routingLog');
    if (log) log.textContent = `${route}: ${text}`;
  }

  function playTrack(track) {
    if (!track || typeof window.selectTrack !== 'function') return;
    engine.remember(
      STORAGE_KEYS.recentTracks,
      { title: track.title, src: track.src, album: track.album?.name, metadata: track.metadata },
      (item) => item.src || item.title,
    );
    window.selectTrack(track.src, track.title, track.trackIndex, true, null, track.albumIndex);
    renderRecent();
    updateTrackRecommendation(track);
  }

  function playStation(station) {
    if (!station?.url) {
      performAction('radio');
      const log = document.getElementById('routingLog');
      if (log)
        log.textContent = `${station?.name || 'Station'} is a directory preview; opening available live stations.`;
      return;
    }
    const stations = engine.getStations();
    const index = (Array.isArray(window.radioStations) ? window.radioStations : []).findIndex(
      (item) => item.url === station.url,
    );
    engine.remember(
      STORAGE_KEYS.recentStations,
      {
        name: station.name,
        url: station.url,
        location: station.location,
        logo: station.logo,
        metadata: station.metadata,
      },
      (item) => item.url || item.name,
    );
    if (typeof window.selectRadio === 'function')
      window.selectRadio(
        station.url,
        station.name,
        Math.max(index, 0),
        station.logo || station.thumbnail || 'Logo.jpg',
      );
    else if (stations.length) performAction('radio');
    renderStations();
    updateStationRecommendation(station);
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
        engine.safeWrite(STORAGE_KEYS.preferredRegion, country);
        renderCountryFilters();
        renderStations();
        updateProfile();
      });
      host.appendChild(button);
    });
  }

  function stationMatches(station) {
    const metadata = station.metadata;
    const countryMatch = state.country === 'All Africa' || metadata.country === state.country;
    const languageMatch =
      state.language === 'English' ||
      document.getElementById('radioLanguageFilter')?.value === 'All languages' ||
      metadata.language === document.getElementById('radioLanguageFilter')?.value;
    const type = document.getElementById('radioTypeFilter')?.value || 'All content';
    const typeMatch = type === 'All content' || metadata.category === type;
    return countryMatch && languageMatch && typeMatch;
  }

  function renderStations() {
    const host = document.getElementById('radioDiscoveryGrid');
    if (!host) return;
    const favorites = engine.safeRead(STORAGE_KEYS.favoriteStations, []);
    const favoriteIds = new Set(favorites.map((item) => item.url || item.name));
    let stations = engine.buildGraph().stations.filter(stationMatches);
    if (!stations.length)
      stations = engine
        .buildGraph()
        .stations.filter((station) => state.country === 'All Africa' || station.metadata.country === state.country);
    host.innerHTML = '';
    stations.slice(0, 8).forEach((station, position) => {
      const card = document.createElement('article');
      card.className = 'station-card';
      const id = station.url || station.name;
      card.innerHTML = `<div class="station-card__top"><span class="station-index">${String(position + 1).padStart(2, '0')}</span><span class="station-card__live"><i></i>${station.metadata.streamStatus}</span><button class="station-card__favorite" type="button" aria-label="${favoriteIds.has(id) ? 'Remove from' : 'Add to'} station favorites" aria-pressed="${favoriteIds.has(id)}">${favoriteIds.has(id) ? 'SAVED' : 'SAVE'}</button></div><h3>${escapeHtml(station.name)}</h3><p>${escapeHtml(station.metadata.country)} · ${escapeHtml(station.metadata.language)}</p><dl><div><dt>Format</dt><dd>${escapeHtml(station.metadata.category)}</dd></div><div><dt>Genre</dt><dd>${escapeHtml(station.metadata.genre)}</dd></div><div><dt>Best for</dt><dd>${escapeHtml(station.metadata.useCase)}</dd></div></dl><button class="station-play" type="button">Open live signal <span>→</span></button>`;
      card.querySelector('.station-play').addEventListener('click', () => playStation(station));
      card.querySelector('.station-card__favorite').addEventListener('click', () => {
        engine.toggleFavorite(
          STORAGE_KEYS.favoriteStations,
          { name: station.name, url: station.url, location: station.location, metadata: station.metadata },
          (item) => item.url || item.name,
        );
        renderStations();
      });
      host.appendChild(card);
    });
    if (!host.children.length)
      host.innerHTML =
        '<div class="empty-state">No exact station match is available. Change a filter to expand the intelligence view.</div>';
    updateMetrics();
  }

  function renderMoods() {
    const host = document.getElementById('moodGrid');
    if (!host) return;
    host.innerHTML = '';
    moods.forEach((mood) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = mood;
      button.classList.toggle('active', state.mood === mood);
      button.addEventListener('click', () => {
        state.mood = mood;
        renderMoods();
        renderRecommendations();
        updateProfile();
      });
      host.appendChild(button);
    });
  }

  function renderTrackCards(host, tracks, emptyMessage) {
    if (!host) return;
    const favorites = engine.safeRead(STORAGE_KEYS.favoriteTracks, []);
    const favoriteIds = new Set(favorites.map((item) => item.src || item.title));
    host.innerHTML = '';
    tracks.forEach((track) => {
      const id = track.src || track.title;
      const card = document.createElement('article');
      card.className = 'track-card';
      card.innerHTML = `<div class="track-card__art"><span>${escapeHtml((track.metadata?.mood || 'AI').slice(0, 2).toUpperCase())}</span><button type="button" aria-label="${favoriteIds.has(id) ? 'Remove from' : 'Add to'} track favorites" aria-pressed="${favoriteIds.has(id)}">${favoriteIds.has(id) ? 'SAVED' : 'SAVE'}</button></div><div><b>${escapeHtml(track.title)}</b><small>${escapeHtml(track.metadata?.genre || 'African media')} · ${escapeHtml(track.metadata?.language || 'English')}</small><p>${escapeHtml(track.metadata?.useCase || 'Daily listening')}</p></div><button class="track-play" type="button" aria-label="Play ${escapeHtml(track.title)}">PLAY</button>`;
      card.querySelector('.track-play').addEventListener('click', () => playTrack(track));
      card.querySelector('.track-card__art button').addEventListener('click', () => {
        engine.toggleFavorite(
          STORAGE_KEYS.favoriteTracks,
          { title: track.title, src: track.src, album: track.album?.name, metadata: track.metadata },
          (item) => item.src || item.title,
        );
        renderRecommendations();
      });
      host.appendChild(card);
    });
    if (!tracks.length) host.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
  }

  function hydrateStoredTrack(stored) {
    return (
      engine.getTracks().find((track) => track.src === stored.src || track.title === stored.title) || {
        ...stored,
        trackIndex: 0,
        albumIndex: 0,
        album: { name: stored.album || 'Ariyọ Catalogue' },
        metadata: stored.metadata || engine.trackMetadata(stored),
      }
    );
  }

  function renderRecommendations() {
    let tracks = engine.getTracks();
    if (state.mood !== 'All moods') {
      const matches = tracks.filter((track) => track.metadata.mood === state.mood);
      tracks = matches.length ? matches : tracks;
    }
    const recent = engine.safeRead(STORAGE_KEYS.recentTracks, []);
    if (recent.length) {
      const source = hydrateStoredTrack(recent[0]);
      tracks = engine.recommendRelated(source, 'track', 8);
    }
    renderTrackCards(
      document.getElementById('recommendedTracks'),
      tracks.slice(0, 8),
      'The music catalogue is still loading. Existing tracks will appear here automatically.',
    );
  }

  function renderRecent() {
    const recent = engine.safeRead(STORAGE_KEYS.recentTracks, []).map(hydrateStoredTrack);
    const section = document.getElementById('recentlyPlayedSection');
    if (!section) return;
    section.hidden = !recent.length;
    renderTrackCards(
      document.getElementById('recentlyPlayed'),
      recent.slice(0, 6),
      'Play a track to begin your private listening memory.',
    );
  }

  function updateTrackRecommendation(track) {
    const related = engine.recommendRelated(track, 'station', 2);
    const host = document.getElementById('radioRecommendation');
    if (!host || !related.length) return;
    host.innerHTML = `<span class="recommendation-code">GRAPH MATCH</span><div><strong>Because you played ${escapeHtml(track.title)}</strong><p>Try ${related.map((station) => station.name).join(' or ')}—matched through region, language, genre, and mood.</p></div>`;
  }

  function updateStationRecommendation(station) {
    const related = engine.recommendRelated(station, 'track', 3);
    const host = document.getElementById('radioRecommendation');
    if (!host || !related.length) return;
    host.innerHTML = `<span class="recommendation-code">NEXT PATH</span><div><strong>Continue beyond ${escapeHtml(station.name)}</strong><p>Related tracks: ${related.map((track) => track.title).join(', ')}.</p></div>`;
  }

  function renderBriefing() {
    const headline = document.getElementById('briefingHeadline');
    const summary = document.getElementById('briefingSummary');
    if (headline && !headline.dataset.live) headline.textContent = fallbackBriefing.headline;
    if (summary && !summary.dataset.live) summary.textContent = fallbackBriefing.summary;
    const track = engine.getTracks()[0];
    const station = engine.buildGraph().stations[0];
    if (track) document.getElementById('dailyTrackTitle').textContent = track.title;
    if (station) document.getElementById('dailyStationTitle').textContent = station.name;
    document.getElementById('playDailyTrack')?.addEventListener('click', () => playTrack(track), { once: true });
    document.getElementById('playDailyStation')?.addEventListener('click', () => playStation(station), { once: true });
  }

  function simplify(mode) {
    const summary = document.getElementById('briefingSummary');
    if (!summary) return;
    const versions = {
      executive:
        'Executive view: Ariyọ’s opportunity is the intelligence layer between fragmented African media formats—using language, region, and behavior to move audiences from information to relevant sound and culture.',
      simple:
        'Main point: African media works better when news, radio, music, language, and stories help people discover each other in one place.',
      pidgin:
        'Main gist be say African news, radio, music, language and stories go useful pass when one smart system connect all of dem for the listener.',
      fr: 'Point essentiel : les médias africains deviennent plus utiles lorsqu’une intelligence commune relie actualités, radio, musique, langues et récits culturels.',
    };
    summary.textContent = versions[mode] || fallbackBriefing.summary;
    document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function askAfrica(question) {
    const query = question.toLowerCase();
    const graph = engine.buildGraph();
    let result = {
      category: 'Cross-media',
      region: 'Africa',
      language: state.language,
      path: 'Query → Graph → Recommendation',
      answer: `The current local graph contains ${graph.tracks.length} tracks and ${graph.stations.length} stations. Ariyọ can connect these signals by region, language, genre, and mood while live trend APIs are integrated.`,
    };
    if (/nigerian gospel/.test(query))
      result = {
        category: 'Gospel / Radio / Music',
        region: 'Nigeria',
        language: 'English',
        path: 'Nigeria → Gospel → Radio + Tracks',
        answer:
          'The available local signal points to faith-led listening as a strong cross-format path. Start with Nigerian gospel or worship stations, then continue into worship-tagged tracks from the existing catalogue. This is curated local intelligence, not a claim of live market ranking.',
      };
    else if (/congo|congolese/.test(query))
      result = {
        category: 'Radio / Rumba / Culture',
        region: 'Congo',
        language: 'Lingala',
        path: 'Congo → Lingala → Rumba → Stories',
        answer:
          'Congolese discovery is best served through Lingala and rumba radio signals, followed by culturally adjacent evening listening and storytelling. Ariyọ will rank available Congo-tagged stations first.',
      };
    else if (/story|news|media story/.test(query))
      result = {
        category: 'News / Interpretation',
        region: 'Pan-African',
        language: state.language,
        path: 'News → Summary → Translation → Audio',
        answer:
          'The key media story is not only the headline; it is how audiences interpret and continue from it. Ariyọ provides an executive summary, simple English, Pidgin, French, and a related radio or music path.',
      };
    document.getElementById('askAfricaQuestion').textContent = question;
    document.getElementById('askAfricaAnswer').textContent = result.answer;
    document.getElementById('answerCategory').textContent = result.category;
    document.getElementById('answerRegion').textContent = result.region;
    document.getElementById('answerLanguage').textContent = result.language;
    document.getElementById('answerPath').textContent = result.path;
  }

  function updateMetrics() {
    const graph = engine.buildGraph();
    const entities = document.getElementById('metricEntities');
    const stations = document.getElementById('metricStations');
    if (entities) entities.textContent = String(graph.nodes.length).padStart(2, '0');
    if (stations)
      stations.textContent = String(graph.stations.filter((station) => station.url).length).padStart(2, '0');
  }

  function renderGraphPreview() {
    const host = document.getElementById('graphNodes');
    if (!host) return;
    host.innerHTML = engine.ENTITY_TYPES.map(
      (type, index) => `<span style="--node-index:${index}">${escapeHtml(type)}</span>`,
    ).join('');
  }

  function updateProfile() {
    const recent = engine.safeRead(STORAGE_KEYS.recentTracks, []);
    document.getElementById('profileMood').textContent =
      state.mood === 'All moods' ? recent[0]?.metadata?.mood || 'Focus' : state.mood;
    document.getElementById('profileRegion').textContent = state.country;
    document.getElementById('profileSignal').textContent = recent.length
      ? 'Signal established'
      : 'Building your signal';
  }

  function initLanguage() {
    const select = document.getElementById('intelligenceLanguage');
    if (!select) return;
    select.value = state.language;
    select.addEventListener('change', () => {
      state.language = select.value;
      engine.safeWrite(STORAGE_KEYS.preferredLanguage, state.language);
      document.getElementById('answerLanguage').textContent = state.language;
      renderStations();
    });
    window.addEventListener('ariyo:languageChanged', (event) => {
      const map = {
        en: 'English',
        'en-NG': 'Nigerian Pidgin',
        fr: 'French',
        yo: 'Yoruba',
        ig: 'Igbo',
        ha: 'Hausa',
        ln: 'Lingala',
      };
      state.language = map[event.detail?.language] || event.detail?.language || state.language;
      engine.safeWrite(STORAGE_KEYS.preferredLanguage, state.language);
    });
  }

  function bind() {
    document.getElementById('aiCommandForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      routeCommand(document.getElementById('aiCommandInput')?.value || '');
    });
    document.querySelectorAll('[data-ai-prompt]').forEach((button) =>
      button.addEventListener('click', () => {
        document.getElementById('aiCommandInput').value = button.dataset.aiPrompt;
        routeCommand(button.dataset.aiPrompt);
      }),
    );
    document
      .querySelectorAll('[data-companion-action]')
      .forEach((button) => button.addEventListener('click', () => performAction(button.dataset.companionAction)));
    document
      .querySelectorAll('[data-scroll-target]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth' }),
        ),
      );
    document
      .querySelectorAll('[data-simplify]')
      .forEach((button) => button.addEventListener('click', () => simplify(button.dataset.simplify)));
    document
      .querySelectorAll('[data-ask-africa]')
      .forEach((button) => button.addEventListener('click', () => askAfrica(button.dataset.askAfrica)));
    document.getElementById('radioLanguageFilter')?.addEventListener('change', renderStations);
    document.getElementById('radioTypeFilter')?.addEventListener('change', renderStations);
  }

  function refresh() {
    renderStations();
    renderRecommendations();
    renderRecent();
    renderBriefing();
    updateMetrics();
    updateProfile();
  }

  function init() {
    bind();
    initLanguage();
    renderCountryFilters();
    renderMoods();
    renderGraphPreview();
    refresh();
    const visits = Number(engine.safeRead('ariyo_intelligence_visits', 0));
    engine.safeWrite('ariyo_intelligence_visits', visits + 1);
    if (visits > 0) {
      const message = document.getElementById('returningMessage');
      message.textContent =
        'Personalization cache restored. Your language, region, favorites, and listening history remain on this device.';
      message.hidden = false;
    }
  }

  window.AriyoCompanion = { routeCommand, askAfrica, playTrack, playStation, refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('ariyo:library-ready', refresh);
  window.addEventListener('ariyo:library-updated', refresh);
})();
