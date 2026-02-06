    function ensureHttps(url) {
      return url.startsWith('https://')
        ? url
        : `https://${url.replace(/^https?:\/\//i, '')}`;
    }

    let pendingSharedPlayback = null;

    /**
     * Builds a standardized, title-first share payload for music and radio experiences.
     * Uses simple text (no markdown) to keep share targets readable across apps.
     *
     * @param {string} title - The track or station title; falls back to "Àríyò AI" when empty.
     * @param {string} [artist] - Optional artist name appended to the title with "by".
     * @param {string[]} [details] - Optional detail lines (cultural notes, storyliner, etc.).
     * @param {string} url - The share target URL, automatically converted to HTTPS.
     * @returns {{ heading: string, url: string, shareText: string }}
     */
    function formatMusicSharePayload(title, artist, details, url) {
      const safeUrl = ensureHttps(url);
      const safeTitle = (title || 'Àríyò AI').trim();
      const safeArtist = (artist || '').trim();
      const heading = safeArtist ? `${safeTitle} by ${safeArtist}` : safeTitle;
      const detailLines = Array.isArray(details) ? details.filter(Boolean) : [];
      const shareText = [heading, ...detailLines].join('\n').trim();

      return {
        heading,
        url: safeUrl,
        shareText
      };
    }

    function normalizeShareTargetPath(url) {
      const target = new URL(url);

      if (target.pathname.endsWith('/about.html')) {
        target.pathname = target.pathname.replace(/about\.html$/, '/main.html');
      } else if (target.pathname === '/' || target.pathname.endsWith('/index.html')) {
        target.pathname = target.pathname.replace(/index\.html$/, 'main.html').replace(/\/$/, '/main.html');
      }

      return target;
    }

    function derivePlaybackFromUrl(url) {
      const params = new URL(url).searchParams;
      const stationParam = params.get('station');
      const albumParam = params.get('album');
      const trackParam = params.get('track');

      if (stationParam) {
        const stationIndex = radioStations.findIndex(s => slugify(s.name) === stationParam);
        if (stationIndex !== -1) {
          return { type: 'radio', index: stationIndex };
        }
      }

      if (albumParam && trackParam) {
        const albumIndex = albums.findIndex(a => slugify(a.name) === albumParam);
        if (albumIndex !== -1) {
          const trackIndex = albums[albumIndex].tracks.findIndex(t => slugify(t.title) === trackParam);
          if (trackIndex !== -1) {
            return { type: 'track', albumIndex, trackIndex };
          }
        }
      }

      return null;
    }

    function resolveTrackLocationFromPlayback(playback) {
      if (!playback) return null;
      if (Number.isInteger(playback.albumIndex) && Number.isInteger(playback.trackIndex)) {
        return { albumIndex: playback.albumIndex, trackIndex: playback.trackIndex };
      }
      const trackCatalogApi = window.AriyoTrackCatalog || {};
      const provider = trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : null;
      if (!provider) return null;
      if (playback.trackId && provider.trackLocationById?.[playback.trackId]) {
        return provider.trackLocationById[playback.trackId];
      }
      if (playback.src && provider.trackIdByAudioUrl?.[playback.src]) {
        const trackId = provider.trackIdByAudioUrl[playback.src];
        if (provider.trackLocationById?.[trackId]) {
          return provider.trackLocationById[trackId];
        }
      }
      return null;
    }

    function deriveActivePlaybackContext() {
      const livePlayback = typeof captureCurrentSource === 'function' ? captureCurrentSource() : null;
      const fallbackPlayback = livePlayback || window.AriyoPlaybackContext?.currentSource || null;
      const derivedPlayback = derivePlaybackFromUrl(window.location.href);
      const playback = fallbackPlayback || derivedPlayback;

      if (playback && playback.type === 'track') {
        const location = resolveTrackLocationFromPlayback(playback);
        const album = location ? albums[location.albumIndex] : null;
        const track = album && album.tracks ? album.tracks[location.trackIndex] : null;
        const title = track?.title || playback.title;
        const artist = track?.artist || playback.artist || album?.artist || null;
        if (title) {
          return {
            type: 'track',
            title,
            artist,
            albumSlug: album ? slugify(album.name) : null,
            trackSlug: track ? slugify(track.title) : null
          };
        }
      }

      if (playback && playback.type === 'radio') {
        const station = Array.isArray(radioStations) ? radioStations[playback.index] : null;
        if (station) {
          return {
            type: 'radio',
            title: station.name,
            albumSlug: null,
            trackSlug: null,
            artist: null,
            stationSlug: slugify(station.name)
          };
        }
      }

      return null;
    }

    function trySharedTrackPlayback(albumSlug, trackSlug) {
      const albumIndex = albums.findIndex(a => slugify(a.name) === albumSlug);
      if (albumIndex === -1) return false;

      const album = albums[albumIndex];
      const trackIndex = album.tracks.findIndex(t => slugify(t.title) === trackSlug);
      if (trackIndex === -1) return false;

      currentAlbumIndex = albumIndex;
      updateTrackListModal();
      selectTrack(album.tracks[trackIndex].src, album.tracks[trackIndex].title, trackIndex);
      if (typeof attemptPlay === 'function') {
        attemptPlay();
      }
      pendingSharedPlayback = null;
      return true;
    }

    function resolvePendingSharedPlayback(reason = 'library') {
      if (!pendingSharedPlayback) return false;
      const { albumSlug, trackSlug } = pendingSharedPlayback;
      const resolved = trySharedTrackPlayback(albumSlug, trackSlug);
      if (resolved) {
        console.log('[share] resolved pending playback', { reason, albumSlug, trackSlug });
        pendingSharedPlayback = null;
      }
      return resolved;
    }

    /* SHARE BUTTON (Web Share API) */
    function openShareMenu() {
      let modal = document.getElementById('shareOptionsModal');
      if (!modal) {
        const template = document.getElementById('shareOptionsTemplate');
        if (!template || !template.content) return;
        document.body.appendChild(template.content.cloneNode(true));
        modal = document.getElementById('shareOptionsModal');
      }
      if (!modal) return;
      const firstAction = modal.querySelector('.share-options-actions button');
      if (firstAction) {
        firstAction.focus();
      }
      if (window.AriyoScrollLock?.lockScroll) {
        window.AriyoScrollLock.lockScroll('modal:share');
      }
    }

    function closeShareMenu() {
      const modal = document.getElementById('shareOptionsModal');
      if (!modal) return;
      modal.remove();
      if (window.AriyoScrollLock?.unlockScroll) {
        window.AriyoScrollLock.unlockScroll('modal:share');
      }
    }

    function getPlaybackCulturalNote(playbackContext) {
      if (!playbackContext || playbackContext.type !== 'track') return null;
      const album = albums.find(item => slugify(item.name) === playbackContext.albumSlug);
      if (!album || !Array.isArray(album.tracks)) return null;
      const track = album.tracks.find(item => slugify(item.title) === playbackContext.trackSlug);
      return track ? track.culturalNote : null;
    }

    function getPlaybackStoryliner(playbackContext) {
      if (!playbackContext || playbackContext.type !== 'track') return null;
      const album = albums.find(item => slugify(item.name) === playbackContext.albumSlug);
      return album && album.storyliner ? album.storyliner : null;
    }

    function formatProverbSharePayload(proverb, url) {
      const safeUrl = ensureHttps(url);
      const heading = 'Proverb of the Day';
      const safeYo = proverb && proverb.yo ? proverb.yo : '';
      const safeEn = proverb && proverb.en ? proverb.en : '';
      const lines = [safeYo, safeEn].filter(Boolean).join('\n');
      const shareText = [heading, lines].filter(Boolean).join('\n').trim();
      return {
        heading,
        url: safeUrl,
        shareText
      };
    }

    function formatStorylinerSummary(storyliner) {
      if (!storyliner) return '';
      const summaryParts = [
        storyliner.origin ? `Origin: ${storyliner.origin}` : null,
        storyliner.inspiration ? `Inspiration: ${storyliner.inspiration}` : null,
        storyliner.whyItMatters ? `Why it matters: ${storyliner.whyItMatters}` : null
      ].filter(Boolean);
      return summaryParts.join(' • ');
    }

    function buildShareUrl(playbackContext, { includeProverbCard = false } = {}) {
      const baseTarget = normalizeShareTargetPath(window.location.href);
      const shareTarget = includeProverbCard
        ? new URL('share.html', baseTarget.toString())
        : new URL(baseTarget.toString());
      shareTarget.search = '';

      if (playbackContext && playbackContext.type === 'track') {
        if (playbackContext.albumSlug && playbackContext.trackSlug) {
          shareTarget.searchParams.set('album', playbackContext.albumSlug);
          shareTarget.searchParams.set('track', playbackContext.trackSlug);
        }
        shareTarget.searchParams.set('autoplay', '1');
        if (includeProverbCard) {
          shareTarget.searchParams.set('card', 'proverb');
        }
        return shareTarget.toString();
      }

      if (playbackContext && playbackContext.type === 'radio') {
        if (playbackContext.stationSlug) {
          shareTarget.searchParams.set('station', playbackContext.stationSlug);
        }
        shareTarget.searchParams.set('autoplay', '1');
        return shareTarget.toString();
      }

      return baseTarget.toString();
    }

    async function copyShareLink(url) {
      const safeUrl = ensureHttps(url);
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(safeUrl);
          alert('Link copied! Share it anywhere.');
          return true;
        } catch (error) {
          console.warn('Clipboard copy failed:', error);
        }
      }
      window.prompt('Copy this link to share:', safeUrl);
      return false;
    }

    async function shareContent({ includeProverbCard = false } = {}) {
      closeShareMenu();
      const playbackContext = deriveActivePlaybackContext();
      const defaultTitle = "Àríyò AI - Smart Naija AI";
      const storyliner = getPlaybackStoryliner(playbackContext);
      const storylinerSummary = formatStorylinerSummary(storyliner);
      let shareInfo = formatMusicSharePayload(
        defaultTitle,
        null,
        [],
        buildShareUrl(playbackContext, { includeProverbCard })
      );

      let proverbPayload = null;
      if (includeProverbCard && window.AriyoProverbUtils) {
        const culturalNote = getPlaybackCulturalNote(playbackContext);
        const proverb = window.AriyoProverbUtils.resolveProverb({ culturalNote });
        proverbPayload = formatProverbSharePayload(
          proverb,
          buildShareUrl(playbackContext, { includeProverbCard: true })
        );
      }

      if (playbackContext && playbackContext.type === 'track') {
        const detailLines = [];
        if (playbackContext.artist) {
          detailLines.push(`Artist: ${playbackContext.artist}`);
        }
        const culturalNote = getPlaybackCulturalNote(playbackContext);
        if (culturalNote) {
          detailLines.push(`Cultural note: ${culturalNote}`);
        }
        if (storylinerSummary) {
          detailLines.push(`Storyliner: ${storylinerSummary}`);
        }
        shareInfo = formatMusicSharePayload(
          playbackContext.title,
          playbackContext.artist,
          detailLines,
          buildShareUrl(playbackContext, { includeProverbCard })
        );
      } else if (playbackContext && playbackContext.type === 'radio') {
        shareInfo = formatMusicSharePayload(
          playbackContext.title,
          null,
          ['Listen live with Àríyò AI.'],
          buildShareUrl(playbackContext, { includeProverbCard })
        );
      }

      const activeShareInfo = proverbPayload || shareInfo;

      const sharePayload = {
        title: activeShareInfo.heading,
        text: activeShareInfo.shareText,
        url: activeShareInfo.url
      };

      if (navigator.share) {
        try {
          await navigator.share(sharePayload);
          return;
        } catch (err) {
          console.error('Share failed:', err);
        }
      } else {
        console.info('Web Share API not supported; falling back to copy link.');
      }

      await copyShareLink(activeShareInfo.url);
    }

    /* Utility to create URL-friendly slugs */
    function slugify(str) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    /* SEARCH BAR */
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchPanel = document.getElementById('searchPanel');

    if (searchInput && searchResults && searchPanel) {
      const searchUtils = window.AriyoSearchUtils || {};
      const normalizeSearchText = searchUtils.normalizeText || ((value) => String(value || '').toLowerCase().trim());
      const trackCatalogApi = window.AriyoTrackCatalog || {};
      let trackCatalogProvider = trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : null;
      const searchClear = document.getElementById('searchClear');
      let searchIndexRebuildTimeout = null;
      let lastCatalogCount = 0;
      let lastStationCount = 0;
      let lastFeedCount = 0;
      const SEARCH_TRACK_LIMIT = 7;
      const SEARCH_STATION_LIMIT = 3;
      const SEARCH_MAX_RESULTS = 10;
      const SEARCH_FEED_LIMIT = 3;

      const searchIndex = {
        tracks: [],
        stations: [],
        feeds: []
      };

      const searchState = {
        query: '',
        normalizedQuery: '',
        results: [],
        activeIndex: -1
      };

      const resetSearchIndex = () => {
        searchIndex.tracks.length = 0;
        searchIndex.stations.length = 0;
        searchIndex.feeds.length = 0;
      };

      const getStationList = () => {
        if (Array.isArray(window.mergedRadioStations) && window.mergedRadioStations.length) {
          return window.mergedRadioStations;
        }
        if (Array.isArray(window.radioStations)) {
          return window.radioStations;
        }
        return Array.isArray(radioStations) ? radioStations : [];
      };

      const getRssAlbums = () => (Array.isArray(albums) ? albums.filter(album => album?.rssFeed) : []);

      const buildTrackEntry = (track, { albumIndex, trackIndex, albumTitle, albumCover } = {}) => {
        const title = track.title || track.name || 'Untitled track';
        const artist = track.artist || '';
        const secondary = [artist, albumTitle].filter(Boolean).join(' • ');
        const searchText = normalizeSearchText([
          title,
          artist,
          albumTitle,
          Array.isArray(track.tags) ? track.tags.join(' ') : '',
          track.subtitle
        ].filter(Boolean).join(' '));

        return {
          id: track.id || `${albumIndex || 0}-${trackIndex || 0}`,
          type: 'track',
          trackId: track.id,
          title,
          artist,
          albumTitle,
          thumbnail: track.cover || track.coverUrl || track.thumbnail || track.image || track.artwork || albumCover,
          secondary,
          albumIndex,
          trackIndex,
          src: track.audioUrl || track.src || track.url,
          searchText
        };
      };

      const buildSearchIndex = ({ reason = 'init' } = {}) => {
        resetSearchIndex();

        if (Array.isArray(albums)) {
          const provider = (trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : null)
            || trackCatalogProvider
            || (trackCatalogApi.createProvider ? trackCatalogApi.createProvider(albums) : null);
          if (provider) {
            trackCatalogProvider = provider;
            if (trackCatalogApi.setProvider) {
              trackCatalogApi.setProvider(provider);
            }
            provider.trackCatalog.forEach((track) => {
              const location = provider.trackLocationById?.[track.id] || {};
              const entry = buildTrackEntry(track, {
                albumTitle: track.albumTitle,
                albumCover: track.coverUrl,
                albumIndex: location.albumIndex,
                trackIndex: location.trackIndex
              });
              searchIndex.tracks.push(entry);
            });
            lastCatalogCount = provider.trackCatalog.length;
          } else {
            albums.forEach((album, albumIndex) => {
              if (!Array.isArray(album.tracks)) {
                return;
              }
              const albumTitle = album.name || album.title || '';
              const albumCover = album.cover || album.coverImage;
              album.tracks.forEach((track, trackIndex) => {
                searchIndex.tracks.push(buildTrackEntry(track, {
                  albumIndex,
                  trackIndex,
                  albumTitle,
                  albumCover
                }));
              });
            });
            lastCatalogCount = searchIndex.tracks.length;
          }
        }

        const stationList = getStationList();
        if (Array.isArray(stationList) && stationList.length) {
          stationList.forEach((station, index) => {
            const name = station.name || `Station ${index + 1}`;
            const secondary = station.region || station.country || station.location || '';
            const searchText = normalizeSearchText([
              name,
              station.location,
              station.region,
              station.country,
              station.type,
              'radio'
            ].filter(Boolean).join(' '));

            searchIndex.stations.push({
              id: station.id || `${index}-${name}`,
              type: 'radio',
              name,
              secondary,
              index,
              searchText
            });
          });
        }

        const rssAlbums = getRssAlbums();
        if (rssAlbums.length) {
          rssAlbums.forEach((album, index) => {
            const name = album.name || album.title || `Podcast ${index + 1}`;
            const secondary = album.artist || 'Podcast Feed';
            const searchText = normalizeSearchText([
              name,
              album.artist,
              album.category,
              'podcast',
              'rss'
            ].filter(Boolean).join(' '));

            searchIndex.feeds.push({
              id: album.id || `rss-${index}-${name}`,
              type: 'rss',
              name,
              secondary,
              albumIndex: albums.indexOf(album),
              searchText
            });
          });
        }

        lastStationCount = searchIndex.stations.length;
        lastFeedCount = searchIndex.feeds.length;
        updateSearchResults();
        console.log('[search] index rebuilt', { reason, tracks: searchIndex.tracks.length });
      };

      const getSearchResults = (normalizedQuery) => {
        if (!normalizedQuery) {
          return [];
        }

        const trackMatches = searchIndex.tracks.filter(item => item.searchText.includes(normalizedQuery));
        const stationMatches = searchIndex.stations.filter(item => item.searchText.includes(normalizedQuery));
        const feedMatches = searchIndex.feeds.filter(item => item.searchText.includes(normalizedQuery));

        const tracks = trackMatches.slice(0, SEARCH_TRACK_LIMIT);
        const stations = stationMatches.slice(0, SEARCH_STATION_LIMIT);
        const feeds = feedMatches.slice(0, SEARCH_FEED_LIMIT);

        return [...tracks, ...stations, ...feeds].slice(0, SEARCH_MAX_RESULTS);
      };

      const normalizeTrackSrc = (value) => {
        if (!value) {
          return '';
        }
        try {
          return new URL(value, window.location.href).href;
        } catch (error) {
          return String(value).trim();
        }
      };

      const findTrackLocationBySrc = (src) => {
        if (!src || !Array.isArray(albums)) {
          return null;
        }
        const normalizedSrc = normalizeTrackSrc(src);
        for (let albumIndex = 0; albumIndex < albums.length; albumIndex += 1) {
          const album = albums[albumIndex];
          if (!album || !Array.isArray(album.tracks)) {
            continue;
          }
          for (let trackIndex = 0; trackIndex < album.tracks.length; trackIndex += 1) {
            const track = album.tracks[trackIndex];
            const candidateSrc = track?.src || track?.audioUrl || track?.url;
            if (candidateSrc && normalizeTrackSrc(candidateSrc) === normalizedSrc) {
              return { albumIndex, trackIndex };
            }
          }
        }
        return null;
      };

      const findTrackLocationByTitle = (title) => {
        if (!title || !Array.isArray(albums)) {
          return null;
        }
        const normalizedTitle = normalizeSearchText(title);
        for (let albumIndex = 0; albumIndex < albums.length; albumIndex += 1) {
          const album = albums[albumIndex];
          if (!album || !Array.isArray(album.tracks)) {
            continue;
          }
          const trackIndex = album.tracks.findIndex(track =>
            normalizeSearchText(track?.title || track?.name) === normalizedTitle);
          if (trackIndex >= 0) {
            return { albumIndex, trackIndex };
          }
        }
        return null;
      };

      const updateActiveOption = () => {
        const options = searchResults.querySelectorAll('.search-result[role="option"]');
        options.forEach((option) => {
          const index = Number(option.dataset.index || '-1');
          const isActive = index === searchState.activeIndex;
          option.dataset.active = isActive ? 'true' : 'false';
          option.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (searchState.activeIndex >= 0) {
          searchInput.setAttribute('aria-activedescendant', `search-option-${searchState.activeIndex}`);
        } else {
          searchInput.removeAttribute('aria-activedescendant');
        }
      };

      const renderSearchResults = () => {
        searchResults.innerHTML = '';

        if (!searchState.normalizedQuery) {
          searchResults.hidden = true;
          searchInput.setAttribute('aria-expanded', 'false');
          searchInput.removeAttribute('aria-activedescendant');
          return;
        }

        const trackResults = searchState.results.filter(result => result.type === 'track');
        const stationResults = searchState.results.filter(result => result.type === 'radio');
        const feedResults = searchState.results.filter(result => result.type === 'rss');
        const fragment = document.createDocumentFragment();
        let optionIndex = 0;

        const appendSection = (label, items) => {
          if (!items.length) {
            return;
          }
          const sectionLabel = document.createElement('div');
          sectionLabel.className = 'search-results-section';
          sectionLabel.textContent = label;
          fragment.appendChild(sectionLabel);

          items.forEach((item) => {
            const currentIndex = optionIndex;
            const option = document.createElement('div');
            option.className = 'search-result';
            option.setAttribute('role', 'option');
            option.dataset.index = String(currentIndex);
            option.id = `search-option-${currentIndex}`;

            const textWrapper = document.createElement('div');
            textWrapper.className = 'search-result-text';

            const title = document.createElement('div');
            title.className = 'search-result-title';
            title.textContent = item.type === 'track' ? item.title : item.name;
            textWrapper.appendChild(title);

            if (item.secondary) {
              const subtitle = document.createElement('div');
              subtitle.className = 'search-result-subtitle';
              subtitle.textContent = item.secondary;
              textWrapper.appendChild(subtitle);
            }

            const badge = document.createElement('span');
            badge.className = 'search-result-badge';
            if (item.type === 'track') {
              badge.textContent = 'Track';
            } else if (item.type === 'radio') {
              badge.textContent = 'Station';
            } else {
              badge.textContent = 'Podcast';
            }

            option.appendChild(textWrapper);
            option.appendChild(badge);

            option.addEventListener('click', () => {
              selectSearchResult(currentIndex);
            });

            fragment.appendChild(option);
            optionIndex += 1;
          });
        };

        appendSection('Tracks', trackResults);
        appendSection('Stations', stationResults);
        appendSection('Podcasts', feedResults);

        if (!optionIndex) {
          const empty = document.createElement('div');
          empty.className = 'search-result';
          empty.textContent = 'No results found.';
          empty.setAttribute('role', 'option');
          empty.dataset.index = '-1';
          fragment.appendChild(empty);
        }

        searchResults.appendChild(fragment);
        searchResults.hidden = false;
        searchInput.setAttribute('aria-expanded', 'true');

        updateActiveOption();
      };

      const updateSearchResults = () => {
        searchState.normalizedQuery = normalizeSearchText(searchState.query);
        searchState.results = getSearchResults(searchState.normalizedQuery);
        searchState.activeIndex = -1;

        renderSearchResults();
        if (searchClear) {
          searchClear.hidden = !searchState.query;
        }
      };

      const setSearchQuery = (value) => {
        searchState.query = value;
        searchInput.value = value;
        updateSearchResults();
      };

      const closeSearchResults = ({ clearQuery = false } = {}) => {
        if (clearQuery) {
          setSearchQuery('');
        }
        searchResults.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        searchState.activeIndex = -1;
      };

      const resolveSearchTrackLocation = (result) => {
        const provider = trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : trackCatalogProvider;
        if (result?.trackId && provider?.trackLocationById?.[result.trackId]) {
          return provider.trackLocationById[result.trackId];
        }
        if (result?.src && provider?.trackIdByAudioUrl?.[result.src]) {
          const trackId = provider.trackIdByAudioUrl[result.src];
          if (provider.trackLocationById?.[trackId]) {
            return provider.trackLocationById[trackId];
          }
        }
        if (Number.isInteger(result?.albumIndex) && Number.isInteger(result?.trackIndex)) {
          return { albumIndex: result.albumIndex, trackIndex: result.trackIndex };
        }
        const srcLocation = findTrackLocationBySrc(result?.src);
        if (srcLocation) {
          return srcLocation;
        }
        return findTrackLocationByTitle(result?.title);
      };

      const parseSearchFallbackMetadata = (result) => {
        if (!result || result.type !== 'track') {
          return null;
        }
        const title = result.title || '';
        let artist = result.artist || '';
        let album = result.albumTitle || '';
        if ((!artist || !album) && result.secondary) {
          const parts = String(result.secondary)
            .split('•')
            .map(part => part.trim())
            .filter(Boolean);
          if (!artist && parts.length) {
            [artist] = parts;
          }
          if (!album && parts.length > 1) {
            album = parts.slice(1).join(' • ');
          }
        }
        return {
          title,
          artist,
          album,
          thumbnail: result.thumbnail || ''
        };
      };

      const getTrackFromLocation = (location) => {
        if (!location || !Number.isInteger(location.albumIndex) || !Number.isInteger(location.trackIndex)) {
          return null;
        }
        const album = albums?.[location.albumIndex];
        const track = album?.tracks?.[location.trackIndex];
        if (!album || !track || !(track.src || track.audioUrl || track.url)) {
          return null;
        }
        return { album, track };
      };

      const selectTrackFromLocation = (location) => {
        const resolved = getTrackFromLocation(location);
        if (!resolved) {
          return false;
        }
        const { track } = resolved;
        pendingAlbumIndex = null;
        const resolvedSrc = track.src || track.audioUrl || track.url;
        selectTrack(resolvedSrc, track.title, location.trackIndex, true, null, location.albumIndex);
        return true;
      };

      const handleSearchSelection = (result) => {
        if (!result) {
          return;
        }
        if (result.type === 'track') {
          const location = resolveSearchTrackLocation(result);
          if (location && selectTrackFromLocation(location)) {
            return;
          }
          if (typeof window.loadFullLibraryData === 'function') {
            window.loadFullLibraryData({ reason: 'search-track-select', immediate: true })
              .then(() => {
                trackCatalogProvider = trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : trackCatalogProvider;
                const refreshedLocation = resolveSearchTrackLocation(result) || location;
                if (selectTrackFromLocation(refreshedLocation)) {
                  return;
                }
                throw new Error('Track location unavailable after refresh.');
              })
              .catch(() => {
                if (result.src) {
                  const fallbackIndex = Number.isInteger(result.trackIndex) ? result.trackIndex : 0;
                  const fallbackAlbumIndex = Number.isInteger(result.albumIndex) ? result.albumIndex : undefined;
                  const fallbackMeta = parseSearchFallbackMetadata(result);
                  selectTrack(result.src, result.title, fallbackIndex, true, null, fallbackAlbumIndex, fallbackMeta);
                }
              });
            return;
          }
          if (result.src) {
            const fallbackIndex = Number.isInteger(result.trackIndex) ? result.trackIndex : 0;
            const fallbackAlbumIndex = Number.isInteger(result.albumIndex) ? result.albumIndex : undefined;
            const fallbackMeta = parseSearchFallbackMetadata(result);
            selectTrack(result.src, result.title, fallbackIndex, true, null, fallbackAlbumIndex, fallbackMeta);
          }
        } else if (result.type === 'radio') {
          const stationList = getStationList();
          const station = stationList[result.index];
          if (!station) {
            return;
          }
          const stationDetail = station.location || station.region || station.country || '';
          const stationTitle = stationDetail ? `${station.name} - ${stationDetail}` : station.name;
          selectRadio(station.url, stationTitle, result.index, station.logo);
        } else if (result.type === 'rss') {
          if (!Number.isInteger(result.albumIndex)) {
            return;
          }
          pendingAlbumIndex = result.albumIndex;
          if (typeof window.openTrackList === 'function') {
            window.openTrackList();
          }
        }
      };

      const selectSearchResult = (index) => {
        const result = searchState.results[index];
        if (!result) {
          return;
        }
        handleSearchSelection(result);
        closeSearchResults({ clearQuery: true });
      };

      const moveActiveOption = (direction) => {
        const options = searchResults.querySelectorAll('.search-result[role="option"]');
        const selectable = Array.from(options).filter(option => Number(option.dataset.index || '-1') >= 0);
        if (!selectable.length) {
          return;
        }

        const maxIndex = selectable.length - 1;
        if (searchState.activeIndex === -1) {
          searchState.activeIndex = direction > 0 ? 0 : maxIndex;
        } else {
          const nextIndex = searchState.activeIndex + direction;
          if (nextIndex < 0) {
            searchState.activeIndex = maxIndex;
          } else if (nextIndex > maxIndex) {
            searchState.activeIndex = 0;
          } else {
            searchState.activeIndex = nextIndex;
          }
        }

        updateActiveOption();
        const activeElement = document.getElementById(`search-option-${searchState.activeIndex}`);
        if (activeElement) {
          activeElement.scrollIntoView({ block: 'nearest' });
        }
      };

      buildSearchIndex();

      const scheduleSearchIndexRebuild = (event) => {
        if (searchIndexRebuildTimeout) {
          window.clearTimeout(searchIndexRebuildTimeout);
        }
        const reason = event?.detail?.source || event?.type || 'catalog-update';
        searchIndexRebuildTimeout = window.setTimeout(() => {
          const provider = trackCatalogApi.getProvider ? trackCatalogApi.getProvider() : null;
          const providerCount = provider?.trackCatalog?.length || 0;
          const stationCount = getStationList().length;
          const feedCount = getRssAlbums().length;
          const isFullLoad = event?.detail?.isFullLoad || event?.detail?.source === 'full';
          const shouldSkip = providerCount
            && providerCount <= lastCatalogCount
            && stationCount <= lastStationCount
            && feedCount <= lastFeedCount
            && !isFullLoad;
          if (shouldSkip) {
            console.log('[search] index rebuild skipped', {
              reason,
              providerCount,
              lastCatalogCount,
              stationCount,
              lastStationCount,
              feedCount,
              lastFeedCount
            });
            return;
          }
          buildSearchIndex({ reason });
        }, 300);
      };

      window.addEventListener('ariyo:library-ready', scheduleSearchIndexRebuild);
      window.addEventListener('ariyo:library-updated', scheduleSearchIndexRebuild);

      searchInput.addEventListener('input', (e) => {
        setSearchQuery(e.target.value);
      });

      searchInput.addEventListener('focus', () => {
        if (searchState.normalizedQuery) {
          renderSearchResults();
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (!searchState.normalizedQuery && e.key !== 'Escape') {
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveActiveOption(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveActiveOption(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchState.activeIndex === -1 && searchState.results.length) {
            selectSearchResult(0);
            return;
          }
          selectSearchResult(searchState.activeIndex);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeSearchResults({ clearQuery: true });
        }
      });

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          closeSearchResults({ clearQuery: true });
          searchInput.focus();
        });
      }

      document.addEventListener('mousedown', (event) => {
        if (searchPanel.contains(event.target)) {
          return;
        }
        closeSearchResults({ clearQuery: false });
      });
    }

    /* NAVIGATE TO ABOUT PAGE & HOME */
    let aboutButtonGlobal = null;
    let originalAboutButtonText = '';
    let originalAboutButtonOnClick;

    const ensureAboutButtonReference = () => {
      if (aboutButtonGlobal) {
        return;
      }

      const sidebarButtons = document.querySelectorAll('.sidebar button');
      aboutButtonGlobal = Array.from(sidebarButtons).find(btn => btn.textContent.includes('About Us'));
      if (aboutButtonGlobal) {
        originalAboutButtonText = aboutButtonGlobal.textContent;
        originalAboutButtonOnClick = aboutButtonGlobal.onclick;
      }
    };

    let aboutViewActive = false;

    function ensureHomeViewForSharedPlayback() {
      if (typeof closeAboutModal === 'function') {
        closeAboutModal();
      }
      aboutViewActive = false;

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.classList.remove('about-us-active');
        mainContent.style.opacity = '1';
      }

      const currentPath = window.location.pathname;
      if (currentPath.endsWith('/about.html')) {
        const normalizedPath = currentPath.replace(/about\.html$/, '') || '/';
        history.replaceState({ page: 'home' }, 'Home', normalizedPath + window.location.search);
      }
    }

    function navigateToAbout(pushState = true) {
      ensureAboutButtonReference();
      const mainContent = document.getElementById('main-content');

      savePlayerState();

      let modalOpened = false;
      if (typeof openAboutModal === 'function') {
        openAboutModal();
        modalOpened = true;
      }

      if (!modalOpened) {
        window.location.href = 'about.html';
        return;
      }

      if (pushState && window.location.pathname !== '/about.html') {
        history.pushState({ page: 'about' }, 'About Us', 'about.html');
      }

      if (aboutButtonGlobal) {
        aboutButtonGlobal.textContent = '🎵 Back to Player';
        aboutButtonGlobal.onclick = () => navigateToHome();
      }

      if (mainContent) {
        mainContent.classList.add('about-us-active');
        mainContent.style.opacity = '1';
      }

      aboutViewActive = true;
    }

    function navigateToHome(pushState = true) {
      ensureAboutButtonReference();
      const mainContent = document.getElementById('main-content');

      if (!aboutViewActive) {
        if (pushState && window.location.pathname.endsWith('/about.html')) {
          const basePath = window.location.pathname.replace(/about\.html$/, '');
          history.replaceState({ page: 'home' }, 'Home', basePath || '/');
        }
        return;
      }

      if (typeof closeAboutModal === 'function') {
        closeAboutModal();
      }

      if (aboutButtonGlobal && originalAboutButtonText) {
        aboutButtonGlobal.textContent = originalAboutButtonText;
        if (typeof originalAboutButtonOnClick === 'function') {
          aboutButtonGlobal.onclick = originalAboutButtonOnClick;
        } else {
          aboutButtonGlobal.onclick = null;
        }
      }

      if (pushState) {
        let currentPath = window.location.pathname;
        if (currentPath.endsWith('/about.html')) {
          currentPath = currentPath.substring(0, currentPath.length - 'about.html'.length);
        }
        if (!currentPath) {
          currentPath = '/';
        }
        history.replaceState({ page: 'home' }, 'Home', currentPath);
      }

      if (mainContent) {
        mainContent.classList.remove('about-us-active');
        if (window.gsap) {
          window.gsap.to(mainContent, { opacity: 1, duration: 0.5 });
        } else {
          mainContent.style.opacity = '1';
        }
      }

      if (typeof updateEdgePanelHeight === 'function') {
        requestAnimationFrame(updateEdgePanelHeight);
      }

      aboutViewActive = false;
    }

    window.navigateToAbout = navigateToAbout;
    window.navigateToHome = navigateToHome;

    /* BACKGROUND CYCLER */
    const backgrounds = [
      'Naija AI1.png',
      'Naija AI2.png',
      'Naija AI3.png'
    ];

    // Preload background images to prevent flashing
    const preloadedBackgrounds = backgrounds.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    let currentBgIndex = 0;
    document.body.style.backgroundImage = `url('${backgrounds[currentBgIndex]}')`;

    const changeBackground = () => {
      const nextIndex = (currentBgIndex + 1) % backgrounds.length;
      const nextImage = preloadedBackgrounds[nextIndex];

      const applyBackground = () => {
        document.body.style.backgroundImage = `url('${backgrounds[nextIndex]}')`;
        currentBgIndex = nextIndex;
      };

      if (nextImage.complete) {
        applyBackground();
      } else {
        nextImage.onload = applyBackground;
      }
    };

    setInterval(changeBackground, 30000);

    /* MEDIA SESSION API */
    function updateMediaSession() {
      if ('mediaSession' in navigator) {
        const playbackContext = window.AriyoPlaybackContext || {};
        const fallbackMeta = playbackContext.currentSource?.fallbackMeta || {};
        const album = currentRadioIndex === -1 ? albums?.[currentAlbumIndex] : null;
        const track = currentRadioIndex === -1
          ? album?.tracks?.[currentTrackIndex]
          : radioStations?.[currentRadioIndex];
        const fallbackTitle = fallbackMeta.title || playbackContext.currentSource?.title || '';
        const fallbackArtist = fallbackMeta.artist || playbackContext.currentSource?.artist || '';
        const fallbackAlbum = fallbackMeta.album || playbackContext.currentSource?.album || '';
        const fallbackArtwork = fallbackMeta.thumbnail || playbackContext.currentSource?.thumbnail || '';
        const artwork = currentRadioIndex === -1
          ? (track?.cover || album?.cover || fallbackArtwork)
          : track?.logo;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentRadioIndex === -1
            ? (track?.title || fallbackTitle || 'Track')
            : track.name + ' - ' + track.location,
          artist: currentRadioIndex === -1
            ? (typeof deriveTrackArtist === 'function' && track?.title
              ? deriveTrackArtist(album?.artist, track.title)
              : (fallbackArtist || album?.artist || 'Omoluabi'))
            : '',
          album: currentRadioIndex === -1 ? (album?.name || fallbackAlbum) : '',
          artwork: [
            { src: artwork, sizes: '96x96', type: 'image/jpeg' },
            { src: artwork, sizes: '128x128', type: 'image/jpeg' },
            { src: artwork, sizes: '192x192', type: 'image/jpeg' },
            { src: artwork, sizes: '256x256', type: 'image/jpeg' },
            { src: artwork, sizes: '384x384', type: 'image/jpeg' },
            { src: artwork, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', playMusic);
        navigator.mediaSession.setActionHandler('pause', pauseMusic);
        navigator.mediaSession.setActionHandler('stop', stopMusic);
        navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);

        console.log('Media Session updated with artwork');
      }
    }

    audioPlayer.addEventListener('timeupdate', () => {
      if ('mediaSession' in navigator && audioPlayer.duration && currentRadioIndex === -1) {
        navigator.mediaSession.setPositionState({
          duration: audioPlayer.duration,
          playbackRate: audioPlayer.playbackRate,
          position: audioPlayer.currentTime
        });
      }
    });

    function announceResumePrompt(savedState) {
      if (!savedState) return;
      const resumePosition = Number.isFinite(savedState.playbackPosition) ? savedState.playbackPosition : 0;
      const formatter = typeof formatTime === 'function'
        ? formatTime
        : (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      const resumeMessage = resumePosition > 5
        ? `Resume from ${formatter(resumePosition)}? Tap play to continue.`
        : 'Ready when you are. Tap play to start.';
      if (typeof setPlaybackStatus === 'function' && typeof PlaybackStatus !== 'undefined') {
        setPlaybackStatus(PlaybackStatus.paused, { message: resumeMessage });
      }
      if (typeof setPlayIntent === 'function') {
        setPlayIntent(false);
      }
    }

    function initializePlayer() {
      const params = new URLSearchParams(window.location.search);
      const stationParam = params.get('station');
      const albumParam = params.get('album');
      const trackParam = params.get('track');
      const hasSharedRequest = Boolean(stationParam || (albumParam && trackParam));
      if (stationParam) {
        ensureHomeViewForSharedPlayback();
        const stationIndex = radioStations.findIndex(s => slugify(s.name) === stationParam);
        if (stationIndex !== -1) {
          const station = radioStations[stationIndex];
          selectRadio(
            station.url,
            `${station.name} - ${station.location}`,
            stationIndex,
            station.logo
          );
          if (typeof attemptPlay === 'function') {
            attemptPlay();
          }
          return;
        }
      }
      if (albumParam && trackParam) {
        ensureHomeViewForSharedPlayback();
        const foundTrack = trySharedTrackPlayback(albumParam, trackParam);
        if (foundTrack) return;

        pendingSharedPlayback = { albumSlug: albumParam, trackSlug: trackParam };
      }

      if (hasSharedRequest) {
        return;
      }

      const savedState = loadPlayerState();
      if (savedState) {
        currentAlbumIndex = savedState.albumIndex;
        currentTrackIndex = savedState.trackIndex;
        currentRadioIndex = savedState.radioIndex;
        // shuffleState restored below
        if (currentRadioIndex >= 0) {
          const station = radioStations[currentRadioIndex];
          if (typeof setPlaybackContext === 'function') {
            setPlaybackContext({
              mode: 'radio',
              source: {
                type: 'radio',
                index: currentRadioIndex,
                src: station?.url,
                title: `${station.name} - ${station.location}`,
                stationId: typeof resolveStationId === 'function' ? resolveStationId(station) : null
              }
            });
          }
          albumCover.src = station.logo;
          const normalizedStationUrl = normalizeMediaSrc(station.url);
          const streamUrl = buildTrackFetchUrl(normalizedStationUrl, { sourceType: 'stream', forceProxy: true });
          setCrossOrigin(audioPlayer, streamUrl);
          audioHealer.trackSource(streamUrl, station.name, { live: true });
          trackInfo.textContent = `${station.name} - ${station.location}`;
          trackArtist.textContent = '';
          trackYear.textContent = '';
          trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
          handleAudioLoad(streamUrl, `${station.name} - ${station.location}`, true, {
            autoPlay: false,
            resumeTime: savedState.playbackPosition,
            onReady: () => {
              updateTrackTime();
              manageVinylRotation();
            }
          });
        } else {
          albumCover.src = albums[currentAlbumIndex].cover;
          const track = albums[currentAlbumIndex].tracks[currentTrackIndex];
          applyTrackUiState(currentAlbumIndex, currentTrackIndex);
          const streamUrl = buildTrackFetchUrl(track.src);
          setCrossOrigin(audioPlayer, streamUrl);
          audioHealer.trackSource(streamUrl, track.title, { live: false });
          handleAudioLoad(streamUrl, track.title, false, {
            autoPlay: false,
            resumeTime: savedState.playbackPosition,
            onReady: () => {
              updateTrackTime();
              manageVinylRotation();
            },
            onError: () => {
              audioPlayer.src = streamUrl;
            }
          });
        }
        updateTrackListModal();
        announceResumePrompt(savedState);
        const controls = document.querySelector(".music-controls.icons-only");
        // Updated section for shuffle button text:
        const shuffleBtn = controls.querySelector("button[aria-label='Toggle shuffle']");
        const shuffleStatusInfo = document.getElementById('shuffleStatusInfo');

        const resolvedShuffleState = Number.isFinite(savedState.shuffleState)
          ? savedState.shuffleState
          : (savedState.shuffleScope === 'repeat'
            ? 1
            : (savedState.shuffleScope === 'album'
              ? 2
              : (savedState.shuffleScope === 'all' ? 3 : 0)));
        shuffleState = resolvedShuffleState;
        radioShuffleMode = Boolean(savedState.radioShuffleMode);

        if (currentRadioIndex !== -1) {
          if (radioShuffleMode) {
            shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">R</span>';
            shuffleStatusInfo.textContent = 'Shuffle: On (Radio)';
          } else {
            shuffleBtn.innerHTML = '🔀';
            shuffleStatusInfo.textContent = 'Shuffle: Off';
          }
        } else if (shuffleState === 1) {
          shuffleBtn.innerHTML = '🔂 <span class="shuffle-indicator">1</span>';
          shuffleStatusInfo.textContent = 'Repeat: On (Single Track)';
        } else if (shuffleState === 2) {
          shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">2</span>';
          shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
        } else if (shuffleState === 3) {
          shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">3</span>';
          shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
        } else {
          shuffleBtn.innerHTML = '🔀';
          shuffleStatusInfo.textContent = 'Shuffle: Off';
        }
        if (shuffleBtn) {
          shuffleBtn.setAttribute(
            'aria-pressed',
            (currentRadioIndex !== -1 ? radioShuffleMode : shuffleState !== 0) ? 'true' : 'false'
          );
        }
        buildShuffleQueue();
        console.log('Player restored from saved state:', savedState);
      } else {
        // Default state for a new session if no saved state
        shuffleState = 0;
        radioShuffleMode = false;
        document.getElementById('shuffleStatusInfo').textContent = 'Shuffle: Off';
        document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']").innerHTML = '🔀';
        buildShuffleQueue();
        ensureInitialTrackLoaded(true);
        console.log('No saved state found, initialized with default track loaded');
      }
      updateMediaSession();
    }

    // GSAP Sidebar Button Animations
    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        if (window.gsap) {
          window.gsap.to(button, { scale: 1.08, duration: 0.3, ease: "power2.out" });
        }
      });
      button.addEventListener('mouseleave', () => {
        if (window.gsap) {
          window.gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
        }
      });
      button.addEventListener('click', () => {
        if (window.gsap) {
          window.gsap.to(button, {
            scale: 0.95,
            duration: 0.1,
            ease: "power1.in",
            onComplete: () => window.gsap.to(button, { scale: 1, duration: 0.2, ease: "bounce.out" })
          });
        }
      });
    });

    document.addEventListener('podcastHydrated', event => {
      if (!pendingSharedPlayback) return;

      const hydratedAlbumSlug = slugify(event.detail?.albumName || '');
      if (hydratedAlbumSlug && hydratedAlbumSlug === pendingSharedPlayback.albumSlug) {
        resolvePendingSharedPlayback('podcast-hydrated');
      }
    });

    window.addEventListener('ariyo:library-ready', () => {
      resolvePendingSharedPlayback('library-ready');
    });

    window.addEventListener('ariyo:library-updated', () => {
      resolvePendingSharedPlayback('library-updated');
    });

    // Initialize player
    initializePlayer();
    resolvePendingSharedPlayback('init');

    // Save state before unloading
    window.addEventListener('beforeunload', savePlayerState);

    window.addEventListener('load', () => {
      showIosInstallBanner();
    });

    let deferredPrompt;
    const installContainer = document.createElement('div');
    installContainer.style.position = 'fixed';
    installContainer.style.bottom = '20px';
    installContainer.style.right = '20px';
    installContainer.style.zIndex = '1000';
    document.body.appendChild(installContainer);

    const installBtn = document.createElement('button');
    installBtn.textContent = 'Install Àríyò AI';
    installBtn.style.background = 'var(--theme-color)';
    installBtn.style.color = 'white';
    installBtn.style.padding = '10px 20px';
    installBtn.style.border = 'none';
    installBtn.style.borderRadius = '5px';
    installBtn.style.display = 'none';
    installContainer.appendChild(installBtn);

    const iosInstallBanner = document.createElement('div');
    iosInstallBanner.innerHTML = '<p>To install, tap the share button and then "Add to Home Screen".</p>';
    iosInstallBanner.style.background = 'rgba(0,0,0,0.8)';
    iosInstallBanner.style.color = 'white';
    iosInstallBanner.style.padding = '10px';
    iosInstallBanner.style.borderRadius = '5px';
    iosInstallBanner.style.display = 'none';
    installContainer.appendChild(iosInstallBanner);

    const closeBannerBtn = document.createElement('button');
    closeBannerBtn.innerHTML = '&times;';
    closeBannerBtn.style.position = 'absolute';
    closeBannerBtn.style.top = '0';
    closeBannerBtn.style.right = '5px';
    closeBannerBtn.style.background = 'none';
    closeBannerBtn.style.border = 'none';
    closeBannerBtn.style.color = 'white';
    closeBannerBtn.style.fontSize = '20px';
    closeBannerBtn.onclick = () => {
      iosInstallBanner.style.display = 'none';
    };
    iosInstallBanner.appendChild(closeBannerBtn);


    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isIOS()) {
        installBtn.style.display = 'block';
      }
      console.log('Install prompt available');
    });

    function showIosInstallBanner() {
      if (isIOS() && !navigator.standalone) {
        iosInstallBanner.style.display = 'block';
      }
    }

    installBtn.onclick = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed the app');
          }
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      }
    };

    function isIOS() {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test( userAgent );
    }

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    // Handle visibility change to fix track time bar after sleep
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !audioPlayer.paused) {
        audioPlayer.removeEventListener('timeupdate', updateTrackTime);
        audioPlayer.addEventListener('timeupdate', updateTrackTime);
        updateTrackTime();
        console.log('Page visible, reattached timeupdate listener');
      }
    });

    // Handle Browser Back/Forward Navigation for dynamically loaded content
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page === 'about') {
        navigateToAbout(false);
        return;
      }

      if (window.location.pathname.endsWith('/about.html')) {
        navigateToAbout(false);
      } else {
        navigateToHome(false);
      }
    });
    // Dynamic Edge Panel Height
    const rootElement = document.documentElement;
    const mainEdgePanel = document.getElementById('edgePanel');
    const mainEdgePanelContent = document.querySelector('.edge-panel-content');
    const musicPlayerElement = document.querySelector('.music-player');

    const BASE_EDGE_PANEL_APPS_VISIBLE = 4;
    const EDGE_PANEL_MIN_HEIGHT = 480;

    const updateEdgePanelHeight = () => {
        if (!mainEdgePanel || !mainEdgePanelContent) return;

        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const computedRoot = getComputedStyle(rootElement);
        const topOffset = parseFloat(computedRoot.getPropertyValue('--edge-panel-top-offset')) || 24;
        const isCompactLayout = window.matchMedia('(max-width: 900px)').matches;
        if (!isCompactLayout) {
            mainEdgePanelContent.style.paddingBottom = '';
        }

        if (isCompactLayout) {
            const measuredPlayerHeight = Math.ceil(musicPlayerElement?.getBoundingClientRect()?.height || 0);
            const guardTarget = Math.max(measuredPlayerHeight + 48, EDGE_PANEL_MIN_HEIGHT);
            const compactTop = Math.max(topOffset, 16);
            const maximumBottom = Math.max(viewportHeight - compactTop - EDGE_PANEL_MIN_HEIGHT, 0);
            const isVeryNarrowViewport = window.matchMedia('(max-width: 600px)').matches;
            const relaxedGuard = isVeryNarrowViewport
                ? Math.max(Math.round(measuredPlayerHeight * 0.55) + 32, EDGE_PANEL_MIN_HEIGHT * 0.7)
                : guardTarget;
            const guardPreference = isVeryNarrowViewport
                ? Math.min(guardTarget, relaxedGuard)
                : guardTarget;
            const compactBottom = Math.max(0, Math.min(guardPreference, maximumBottom));
            const compactMaxHeight = Math.max(viewportHeight - compactTop - compactBottom, EDGE_PANEL_MIN_HEIGHT);

            rootElement.style.setProperty('--edge-panel-bottom-guard', `${compactBottom}px`);
            rootElement.style.setProperty('--edge-panel-max-height', `${compactMaxHeight}px`);

            const rawCompactSpace = viewportHeight - compactTop - compactBottom;
            const compactHeightTarget = Math.max(rawCompactSpace, EDGE_PANEL_MIN_HEIGHT);
            const compactHeight = Math.max(Math.min(compactMaxHeight, compactHeightTarget), EDGE_PANEL_MIN_HEIGHT);
            const availableTopSpace = Math.max(viewportHeight - compactHeight, 0);
            const centeredTop = availableTopSpace / 2;
            const lowerBias = centeredTop + Math.max(0, compactHeight * 0.08);
            const maxTop = Math.max(viewportHeight - compactHeight - compactBottom, compactTop);
            const safeTop = Math.min(Math.max(compactTop, lowerBias), maxTop);
            const centerTarget = Math.min(Math.max(compactTop, centeredTop), maxTop);
            const blendedTop = isVeryNarrowViewport
                ? Math.min(Math.max(compactTop, (safeTop + centerTarget) / 2), maxTop)
                : safeTop;

            mainEdgePanel.style.height = '';
            mainEdgePanel.style.transform = 'none';
            mainEdgePanel.style.bottom = '';
            mainEdgePanel.style.top = `${Math.round(blendedTop)}px`;
            mainEdgePanelContent.style.maxHeight = '';
            mainEdgePanelContent.style.overflowY = 'auto';

            const privacyNote = mainEdgePanelContent.querySelector('.edge-panel-privacy');
            if (privacyNote) {
                const noteHeight = Math.ceil(privacyNote.getBoundingClientRect()?.height || 0);
                const extraGap = Math.max(noteHeight, 72);
                const currentPadding = parseFloat(window.getComputedStyle(mainEdgePanelContent).paddingBottom) || 0;
                if (extraGap > currentPadding) {
                    mainEdgePanelContent.style.paddingBottom = `${extraGap}px`;
                }
                const currentScrollPadding = parseFloat(window.getComputedStyle(mainEdgePanelContent).scrollPaddingBottom) || 0;
                const desiredScrollPadding = Math.max(Math.round(extraGap * 0.75), 64);
                if (desiredScrollPadding > currentScrollPadding) {
                    mainEdgePanelContent.style.scrollPaddingBottom = `${desiredScrollPadding}px`;
                }
            }
            return;
        }

        const verticalMargin = Math.max(topOffset, 24);
        const availableHeight = Math.max(viewportHeight - 2 * verticalMargin, EDGE_PANEL_MIN_HEIGHT);

        rootElement.style.setProperty('--edge-panel-bottom-guard', `${verticalMargin}px`);
        rootElement.style.setProperty('--edge-panel-max-height', `${availableHeight}px`);

        const contentStyles = window.getComputedStyle(mainEdgePanelContent);
        const paddingTop = parseFloat(contentStyles.paddingTop) || 0;
        const paddingBottom = parseFloat(contentStyles.paddingBottom) || 0;
        const gapValue = parseFloat(contentStyles.rowGap || contentStyles.gap || 0) || 0;
        const introEl = mainEdgePanelContent.querySelector('.edge-panel-intro');
        let introHeight = 0;
        let introMargins = 0;
        if (introEl) {
            const introRect = introEl.getBoundingClientRect();
            introHeight = introRect?.height || 0;
            const introStyles = window.getComputedStyle(introEl);
            introMargins = (parseFloat(introStyles.marginTop) || 0) + (parseFloat(introStyles.marginBottom) || 0);
        }

        const launcherItems = Array.from(mainEdgePanelContent.querySelectorAll('.edge-panel-item'));
        const totalLauncherCount = launcherItems.length;
        const visibleCount = Math.max(totalLauncherCount, BASE_EDGE_PANEL_APPS_VISIBLE);
        let launcherHeight = 0;
        if (launcherItems.length) {
            const itemRect = launcherItems[0].getBoundingClientRect();
            launcherHeight = itemRect?.height || 0;
            if (!launcherHeight) {
                const itemStyles = window.getComputedStyle(launcherItems[0]);
                launcherHeight = parseFloat(itemStyles.minHeight) || 56;
            }
        }
        if (!launcherHeight) {
            launcherHeight = 56;
        }

        const itemsHeight = visibleCount > 0
            ? (visibleCount * launcherHeight) + Math.max(0, visibleCount - 1) * gapValue
            : 0;
        const desiredContentHeight = paddingTop + paddingBottom + introHeight + introMargins + itemsHeight;
        const contentMaxHeight = Math.min(availableHeight, Math.max(desiredContentHeight, EDGE_PANEL_MIN_HEIGHT));

        mainEdgePanelContent.style.maxHeight = `${contentMaxHeight}px`;
        mainEdgePanelContent.style.overflowY = 'auto';
        mainEdgePanelContent.style.scrollPaddingBottom = '';

        mainEdgePanel.style.height = '';
        mainEdgePanel.style.bottom = '';
        mainEdgePanel.style.top = '50%';
        mainEdgePanel.style.transform = 'translateY(-50%)';

        const panelRect = mainEdgePanel.getBoundingClientRect();
        const measuredHeight = panelRect.height || contentMaxHeight;
        const centeredTop = (viewportHeight - measuredHeight) / 2;
        const maxTop = viewportHeight - measuredHeight - verticalMargin;
        const safeTop = Math.max(verticalMargin, Math.min(centeredTop, maxTop));

        if (Number.isFinite(safeTop)) {
            mainEdgePanel.style.top = `${safeTop}px`;
            mainEdgePanel.style.transform = 'none';
        }
    };

    if (mainEdgePanel && mainEdgePanelContent) {
        updateEdgePanelHeight();
        requestAnimationFrame(updateEdgePanelHeight);
        window.addEventListener('resize', updateEdgePanelHeight);
        window.addEventListener('orientationchange', updateEdgePanelHeight);
        window.addEventListener('load', updateEdgePanelHeight);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateEdgePanelHeight);
        }
        if ('ResizeObserver' in window && musicPlayerElement) {
            const playerResizeObserver = new ResizeObserver(updateEdgePanelHeight);
            playerResizeObserver.observe(musicPlayerElement);
        }
    }

    const sidebarNav = document.getElementById('sidebarNavigation');
    if (sidebarNav) {
        sidebarNav.removeAttribute('aria-hidden');
        sidebarNav.removeAttribute('tabindex');

        const enforceSidebarVisibility = () => {
            let changed = false;

            if (sidebarNav.hasAttribute('hidden')) {
                sidebarNav.removeAttribute('hidden');
                changed = true;
            }

            if (sidebarNav.getAttribute('aria-hidden') === 'true') {
                sidebarNav.removeAttribute('aria-hidden');
                changed = true;
            }

            if (sidebarNav.style.visibility !== 'visible') {
                sidebarNav.style.visibility = 'visible';
                changed = true;
            }

            if (sidebarNav.style.opacity !== '1') {
                sidebarNav.style.opacity = '1';
                changed = true;
            }

            return changed;
        };

        enforceSidebarVisibility();

        const sidebarGuard = new MutationObserver(() => {
            sidebarGuard.disconnect();
            enforceSidebarVisibility();
            sidebarGuard.observe(sidebarNav, { attributes: true, attributeFilter: ['hidden', 'style', 'aria-hidden', 'class'] });
        });

        sidebarGuard.observe(sidebarNav, { attributes: true, attributeFilter: ['hidden', 'style', 'aria-hidden', 'class'] });
        window.addEventListener('beforeunload', () => sidebarGuard.disconnect());
    }

    // Add this to your main.js file
    document.addEventListener('DOMContentLoaded', function() {
        // Your other DOM-dependent code here
    });

    if (typeof window !== 'undefined') {
      Object.assign(window, {
        openShareMenu,
        closeShareMenu,
        shareContent,
        navigateToAbout
      });
    }
