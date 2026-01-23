(function () {
  const STRUCTURED_DATA_ID = 'ariyo-structured-data';

  function ensureStructuredDataNode() {
    let node = document.getElementById(STRUCTURED_DATA_ID);
    if (!node) {
      node = document.createElement('script');
      node.type = 'application/ld+json';
      node.id = STRUCTURED_DATA_ID;
      document.head.appendChild(node);
    }
    return node;
  }

  function setStructuredData(schema) {
    const node = ensureStructuredDataNode();
    node.textContent = JSON.stringify(schema, null, 2);
  }

  function buildMusicRecordingSchema({ track, album, url }) {
    if (!track || !album) return null;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: track.title || 'Track',
      url,
      byArtist: {
        '@type': 'MusicGroup',
        name: track.artist || album.artist || 'Omoluabi'
      },
      inAlbum: {
        '@type': 'MusicAlbum',
        name: album.name || album.title || 'Album'
      }
    };

    if (typeof track.duration === 'number' && Number.isFinite(track.duration)) {
      schema.duration = `PT${Math.max(0, Math.round(track.duration))}S`;
    }

    return schema;
  }

  function buildRadioStationSchema({ station, url }) {
    if (!station) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'RadioStation',
      name: station.name || 'Live radio',
      url,
      areaServed: station.location || 'Global'
    };
  }

  function updateStructuredDataForPlayback({ type, track, album, station } = {}) {
    if (typeof document === 'undefined') return;
    const url = window.location.href;
    if (type === 'track') {
      const schema = buildMusicRecordingSchema({ track, album, url });
      if (schema) setStructuredData(schema);
      return;
    }
    if (type === 'radio') {
      const schema = buildRadioStationSchema({ station, url });
      if (schema) setStructuredData(schema);
      return;
    }
  }

  if (typeof window !== 'undefined') {
    window.AriyoSeo = {
      buildMusicRecordingSchema,
      buildRadioStationSchema,
      updateStructuredDataForPlayback
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      buildMusicRecordingSchema,
      buildRadioStationSchema
    };
  }
})();
