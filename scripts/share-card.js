(function () {
  const params = new URLSearchParams(window.location.search);
  const cardType = params.get('card');

  const titleEl = document.getElementById('shareCardTitle');
  const linkEl = document.getElementById('shareCardLink');
  const artworkEl = document.getElementById('shareCardArtwork');
  const trackMetaEl = document.getElementById('shareCardTrack');
  const albumMetaEl = document.getElementById('shareCardAlbum');
  const audioMetaEl = document.getElementById('shareCardAudio');
  const proverbYoEl = document.getElementById('proverbYo');
  const proverbEnEl = document.getElementById('proverbEn');
  const sourceEl = document.getElementById('shareCardSource');

  const safeText = (value) => String(value || '').trim();
  const safeUrl = (value) => ensureHttps(String(value || '').trim());

  function findTrackBySlug(albumSlug, trackSlug) {
    if (!Array.isArray(window.albums)) return null;
    const album = window.albums.find(item => slugify(item.name) === albumSlug);
    if (!album || !Array.isArray(album.tracks)) return null;
    const track = album.tracks.find(item => slugify(item.title) === trackSlug);
    if (!track) return null;
    return { album, track };
  }

  function findAlbumBySlug(albumSlug) {
    if (!Array.isArray(window.albums)) return null;
    return window.albums.find(item => slugify(item.name) === albumSlug) || null;
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function updateMeta({ title, description, image }) {
    if (title) {
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
    }
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', description);
    }
    if (image) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', image);
    }
  }

  function ensureHttps(url) {
    if (!url) return '';
    return url.startsWith('https://')
      ? url
      : `https://${url.replace(/^https?:\/\//i, '')}`;
  }

  function buildShareUrl({ albumSlug, trackSlug }) {
    const baseUrl = new URL('main.html', window.location.href);
    if (albumSlug) {
      baseUrl.searchParams.set('album', albumSlug);
    }
    if (trackSlug) {
      baseUrl.searchParams.set('track', trackSlug);
    }
    if (albumSlug || trackSlug) {
      baseUrl.searchParams.set('autoplay', '1');
    }
    return baseUrl.toString();
  }

  function buildPlaybackUrl({ albumSlug, trackSlug, stationSlug }) {
    const baseUrl = new URL('main.html', window.location.href);
    baseUrl.search = '';
    if (albumSlug && trackSlug) {
      baseUrl.searchParams.set('album', albumSlug);
      baseUrl.searchParams.set('track', trackSlug);
    }
    if (stationSlug) {
      baseUrl.searchParams.set('station', stationSlug);
    }
    if (albumSlug || trackSlug || stationSlug) {
      baseUrl.searchParams.set('autoplay', '1');
    }
    return baseUrl.toString();
  }

  function maybeRedirectToPlayback({ albumSlug, trackSlug, stationSlug }) {
    const previewMode = params.get('preview') === '1';
    if (previewMode) return false;
    const hasTrackShare = albumSlug && trackSlug;
    const hasStationShare = stationSlug;
    if (!hasTrackShare && !hasStationShare) return false;
    const playbackUrl = buildPlaybackUrl({ albumSlug, trackSlug, stationSlug });
    if (playbackUrl) {
      window.location.replace(playbackUrl);
      return true;
    }
    return false;
  }

  function resolveUrl(value) {
    if (!value) return '';
    try {
      return new URL(value, window.location.href).toString();
    } catch (error) {
      return value;
    }
  }

  function updateLinkAndMeta({ albumSlug, trackSlug, trackData, albumData }) {
    if (!linkEl) return;
    const shareUrl = safeUrl(buildShareUrl({ albumSlug, trackSlug }));
    linkEl.textContent = shareUrl;
    linkEl.setAttribute('href', shareUrl);
    const fallbackCover = resolveUrl('icons/Ariyo.png');
    const cover = albumData && albumData.cover ? resolveUrl(albumData.cover) : fallbackCover;
    if (artworkEl) {
      artworkEl.src = cover;
      artworkEl.alt = albumData ? `${albumData.name} album cover` : 'Àríyò AI cover art';
    }
    if (trackMetaEl) {
      trackMetaEl.textContent = trackData ? safeText(trackData.title) : 'Select a track to share.';
    }
    if (albumMetaEl) {
      albumMetaEl.textContent = albumData ? safeText(albumData.name) : 'Àríyò AI';
    }
    if (audioMetaEl) {
      const audioSource = trackData && trackData.src ? resolveUrl(trackData.src) : shareUrl;
      audioMetaEl.textContent = audioSource;
    }
    return { shareUrl, cover };
  }

  function renderProverbCard() {
    const albumSlug = params.get('album');
    const trackSlug = params.get('track');
    const albumOnlySlug = params.get('albumOnly');
    const stationSlug = params.get('station');

    if (maybeRedirectToPlayback({ albumSlug, trackSlug, stationSlug })) {
      return;
    }

    let trackData = null;
    let albumData = null;
    if (albumSlug && trackSlug) {
      const result = findTrackBySlug(albumSlug, trackSlug);
      if (result) {
        trackData = result.track;
        albumData = result.album;
      }
    } else if (albumOnlySlug) {
      albumData = findAlbumBySlug(albumOnlySlug);
    }

    const note = window.AriyoProverbUtils
      ? window.AriyoProverbUtils.resolveProverb({ culturalNote: trackData && trackData.culturalNote })
      : { yo: '', en: '' };

    const title = trackData ? trackData.title : (albumData ? albumData.name : 'Àríyò AI');

    titleEl.textContent = safeText(title) || 'Àríyò AI';
    proverbYoEl.textContent = note.yo;
    proverbEnEl.textContent = note.en;
    sourceEl.textContent = trackData
      ? `Shared from Àríyò AI • ${window.location.origin}`
      : `Shared from Àríyò AI • ${window.location.origin}`;
    const metaInfo = updateLinkAndMeta({ albumSlug, trackSlug, trackData, albumData });

    updateMeta({
      title: `Proverb of the Day • ${title}`,
      description: `${note.yo} — ${note.en}`.trim(),
      image: metaInfo && metaInfo.cover
    });
  }

  if (cardType === 'proverb') {
    renderProverbCard();
  } else {
    const albumSlug = params.get('album');
    const trackSlug = params.get('track');
    const stationSlug = params.get('station');
    if (maybeRedirectToPlayback({ albumSlug, trackSlug, stationSlug })) {
      return;
    }
    titleEl.textContent = 'Share a track to generate a card.';
    if (linkEl) {
      linkEl.textContent = safeUrl(window.location.origin);
      linkEl.setAttribute('href', safeUrl(window.location.origin));
    }
    const fallbackCover = resolveUrl('icons/Ariyo.png');
    if (artworkEl) {
      artworkEl.src = fallbackCover;
      artworkEl.alt = 'Àríyò AI cover art';
    }
    if (trackMetaEl) trackMetaEl.textContent = 'Select a track to share.';
    if (albumMetaEl) albumMetaEl.textContent = 'Àríyò AI';
    if (audioMetaEl) audioMetaEl.textContent = safeUrl(window.location.origin);
  }
})();
