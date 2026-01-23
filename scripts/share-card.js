(function () {
  const params = new URLSearchParams(window.location.search);
  const cardType = params.get('card');

  const headingEl = document.getElementById('shareCardHeading');
  const titleEl = document.getElementById('shareCardTitle');
  const subtitleEl = document.getElementById('shareCardSubtitle');
  const proverbYoEl = document.getElementById('proverbYo');
  const proverbEnEl = document.getElementById('proverbEn');
  const sourceEl = document.getElementById('shareCardSource');

  const safeText = (value) => String(value || '').trim();

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
    const subtitle = trackData
      ? `From ${albumData ? albumData.name : 'your library'}`
      : (albumData ? 'Album Storyliner' : 'Cultural proverb');

    headingEl.textContent = 'Proverb of the Day';
    titleEl.textContent = safeText(title) || 'Àríyò AI';
    subtitleEl.textContent = subtitle;
    proverbYoEl.textContent = note.yo;
    proverbEnEl.textContent = note.en;
    sourceEl.textContent = trackData
      ? `Shared from Àríyò AI • ${window.location.origin}`
      : `Shared from Àríyò AI • ${window.location.origin}`;

    updateMeta({
      title: `Proverb of the Day • ${title}`,
      description: `${note.yo} — ${note.en}`.trim()
    });
  }

  if (cardType === 'proverb') {
    renderProverbCard();
  } else {
    headingEl.textContent = 'Àríyò AI';
    titleEl.textContent = 'Share a track to generate a card.';
    subtitleEl.textContent = 'Add ?card=proverb to your share link.';
  }
})();
