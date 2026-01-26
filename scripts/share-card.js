(function () {
  const params = new URLSearchParams(window.location.search);
  const cardType = params.get('card');

  const titleEl = document.getElementById('shareCardTitle');
  const linkEl = document.getElementById('shareCardLink');
  const qrEl = document.getElementById('shareCardQr');
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

  function updateMeta({ title, description }) {
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
    return baseUrl.toString();
  }

  function updateLinkAndQr({ albumSlug, trackSlug }) {
    if (!linkEl || !qrEl) return;
    const shareUrl = safeUrl(buildShareUrl({ albumSlug, trackSlug }));
    linkEl.textContent = shareUrl;
    linkEl.setAttribute('href', shareUrl);
    const qrPayload = `${shareUrl}`;
    qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`;
  }

  function renderProverbCard() {
    const albumSlug = params.get('album');
    const trackSlug = params.get('track');
    const albumOnlySlug = params.get('albumOnly');

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
    updateLinkAndQr({ albumSlug, trackSlug });

    updateMeta({
      title: `Proverb of the Day • ${title}`,
      description: `${note.yo} — ${note.en}`.trim()
    });
  }

  if (cardType === 'proverb') {
    renderProverbCard();
  } else {
    titleEl.textContent = 'Share a track to generate a card.';
    if (linkEl) {
      linkEl.textContent = safeUrl(window.location.origin);
      linkEl.setAttribute('href', safeUrl(window.location.origin));
    }
    if (qrEl) {
      qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(safeUrl(window.location.origin))}`;
    }
  }
})();
