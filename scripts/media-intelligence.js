/**
 * Ariyọ Media Intelligence Graph
 * A dependency-free entity and relationship layer for cross-media discovery.
 */
(function () {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    preferredLanguage: 'ariyo_preferred_language',
    preferredRegion: 'ariyo_preferred_region',
    favoriteTracks: 'ariyo_favorite_tracks',
    favoriteStations: 'ariyo_favorite_stations',
    recentTracks: 'ariyo_recent_tracks',
    recentStations: 'ariyo_recent_stations',
  });

  const ENTITY_TYPES = Object.freeze([
    'Artist',
    'Track',
    'Radio Station',
    'Country',
    'Language',
    'Genre',
    'Mood',
    'Story',
    'News Topic',
    'User Preference',
  ]);

  const TRACK_PROFILES = Object.freeze([
    {
      match: /holy|oluwa|hail mary|worship|pastor/i,
      genre: 'Gospel',
      language: 'English',
      region: 'Nigeria',
      mood: 'Worship',
      useCase: 'Faith and reflection',
    },
    {
      match: /algorithm|forex|oil money|efcc|election|freedom|truth/i,
      genre: 'Afro-conscious',
      language: 'Nigerian Pidgin',
      region: 'Nigeria',
      mood: 'Reflection',
      useCase: 'Ideas and analysis',
    },
    {
      match: /party|detty|gbedu|stir|abula/i,
      genre: 'Afrobeats',
      language: 'Nigerian Pidgin',
      region: 'Nigeria',
      mood: 'Celebration',
      useCase: 'Social energy',
    },
    {
      match: /wisdom|kindness|omoluabi|ubuntu|home|mummy/i,
      genre: 'Spoken Soul',
      language: 'English',
      region: 'Global Africa',
      mood: 'Reflection',
      useCase: 'Cultural grounding',
    },
    {
      match: /working|risk|destiny|forerunner|motivation/i,
      genre: 'Afro-inspirational',
      language: 'English',
      region: 'Nigeria',
      mood: 'Motivation',
      useCase: 'Momentum',
    },
  ]);

  const STATION_PROFILES = Object.freeze([
    {
      match: /congo|kinshasa|lubumbashi|rdc/i,
      country: 'Congo',
      language: 'Lingala',
      category: 'Music',
      genre: 'Rumba',
      mood: 'Evening Wind Down',
      useCase: 'Cultural discovery',
    },
    {
      match: /ghana|accra|kumasi/i,
      country: 'Ghana',
      language: 'English',
      category: 'Music',
      genre: 'Highlife',
      mood: 'Celebration',
      useCase: 'Regional discovery',
    },
    {
      match: /kenya|nairobi|mombasa/i,
      country: 'Kenya',
      language: 'English',
      category: 'Music',
      genre: 'East African',
      mood: 'Focus',
      useCase: 'Daily listening',
    },
    {
      match: /south africa|johannesburg|cape town|durban/i,
      country: 'South Africa',
      language: 'English',
      category: 'Music',
      genre: 'Amapiano',
      mood: 'Celebration',
      useCase: 'New sound discovery',
    },
    {
      match: /cameroon|douala|yaound/i,
      country: 'Cameroon',
      language: 'French',
      category: 'Music',
      genre: 'Makossa',
      mood: 'Celebration',
      useCase: 'Francophone discovery',
    },
    {
      match: /gospel|worship|christian/i,
      country: 'Nigeria',
      language: 'English',
      category: 'Gospel',
      genre: 'Gospel',
      mood: 'Worship',
      useCase: 'Faith and reflection',
    },
    {
      match: /news|talk|bbc|radio nigeria|info/i,
      country: 'Global Africa',
      language: 'English',
      category: 'News',
      genre: 'News and Talk',
      mood: 'Focus',
      useCase: 'Current affairs',
    },
    {
      match: /nigeria|naija|lagos|abuja|ibadan|enugu|kano|kaduna/i,
      country: 'Nigeria',
      language: 'English',
      category: 'Music',
      genre: 'Afrobeats',
      mood: 'Motivation',
      useCase: 'Daily listening',
    },
  ]);

  const FALLBACK_STATIONS = Object.freeze([
    { name: 'Naija Hits (Live)', location: 'Nigeria', url: 'https://stream.zeno.fm/thbqnu2wvmzuv', logo: 'Logo.jpg' },
    {
      name: 'Radio Nigeria',
      location: 'Abuja, Nigeria',
      url: 'https://stream.radionigeria.gov.ng/live',
      logo: 'Logo.jpg',
    },
    {
      name: 'BBC World Service',
      location: 'Global Africa',
      url: 'https://utulsa.streamguys1.com/KWGSHD3-MP3',
      logo: 'Logo.jpg',
    },
    { name: 'Kinshasa Rumba Directory Preview', location: 'Kinshasa, Congo', logo: 'Logo.jpg' },
    { name: 'Accra Highlife Directory Preview', location: 'Accra, Ghana', logo: 'Logo.jpg' },
    { name: 'Nairobi Culture Directory Preview', location: 'Nairobi, Kenya', logo: 'Logo.jpg' },
    { name: 'Johannesburg Amapiano Directory Preview', location: 'Johannesburg, South Africa', logo: 'Logo.jpg' },
    { name: 'Douala Makossa Directory Preview', location: 'Douala, Cameroon', logo: 'Logo.jpg' },
  ]);

  function safeRead(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function unique(items, identity) {
    const seen = new Set();
    return items.filter((item) => {
      const key = identity(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function inferProfile(value, profiles, fallback) {
    const text = [value?.name, value?.title, value?.location, value?.country, value?.genre, value?.tags]
      .filter(Boolean)
      .join(' ');
    return { ...fallback, ...(profiles.find((profile) => profile.match.test(text)) || {}) };
  }

  function stationMetadata(station) {
    const fallback = {
      country: 'Global Africa',
      language: 'English',
      category: 'Music',
      genre: 'African Media',
      mood: 'Focus',
      useCase: 'Open discovery',
    };
    const profile = inferProfile(station, STATION_PROFILES, fallback);
    const explicitCountry = station?.country || station?.location;
    if (explicitCountry && /nigeria/i.test(explicitCountry)) profile.country = 'Nigeria';
    return { ...profile, streamStatus: station?.url ? 'Available' : 'Unavailable' };
  }

  function trackMetadata(track, album) {
    const fallback = {
      genre: 'African Contemporary',
      language: 'English',
      region: 'Nigeria',
      mood: 'Focus',
      useCase: 'Daily listening',
      duration: track?.duration || '—',
    };
    const profile = inferProfile(track, TRACK_PROFILES, fallback);
    return { ...profile, artist: track?.artist || 'Omoluabi Productions', album: album?.name || 'Ariyọ Catalogue' };
  }

  function getStations() {
    const direct = Array.isArray(window.radioStations) ? window.radioStations : [];
    const merged = Array.isArray(window.mergedRadioStations) ? window.mergedRadioStations : [];
    return unique([...merged, ...direct, ...FALLBACK_STATIONS], (station) => normalize(station.url || station.name));
  }

  function getTracks() {
    const albums = Array.isArray(window.albums)
      ? window.albums
      : Array.isArray(window.libraryState?.local)
        ? window.libraryState.local
        : [];
    return albums.flatMap((album, albumIndex) =>
      (album.tracks || []).map((track, trackIndex) => ({
        ...track,
        album,
        albumIndex,
        trackIndex,
        metadata: trackMetadata(track, album),
      })),
    );
  }

  function buildGraph() {
    const tracks = getTracks();
    const stations = getStations().map((station, stationIndex) => ({
      ...station,
      stationIndex,
      metadata: stationMetadata(station),
    }));
    const node = (type, id, label, metadata = {}) => ({ type, id, label, metadata });
    const nodes = [
      ...tracks.map((track) =>
        node('Track', `track:${normalize(track.src || track.title)}`, track.title, track.metadata),
      ),
      ...stations.map((station) =>
        node('Radio Station', `station:${normalize(station.url || station.name)}`, station.name, station.metadata),
      ),
    ];
    const dimensions = [
      ['Country', [...tracks.map((t) => t.metadata.region), ...stations.map((s) => s.metadata.country)]],
      ['Language', [...tracks.map((t) => t.metadata.language), ...stations.map((s) => s.metadata.language)]],
      ['Genre', [...tracks.map((t) => t.metadata.genre), ...stations.map((s) => s.metadata.genre)]],
      ['Mood', [...tracks.map((t) => t.metadata.mood), ...stations.map((s) => s.metadata.mood)]],
    ];
    dimensions.forEach(([type, values]) =>
      unique(
        values.filter(Boolean).map((label) => ({ label })),
        (item) => normalize(item.label),
      ).forEach(({ label }) => nodes.push(node(type, `${normalize(type)}:${normalize(label)}`, label))),
    );
    const edges = [];
    tracks.forEach((track) =>
      ['region', 'language', 'genre', 'mood'].forEach((key) =>
        edges.push({
          from: `track:${normalize(track.src || track.title)}`,
          to: `${key === 'region' ? 'country' : key}:${normalize(track.metadata[key])}`,
          relation: `HAS_${key.toUpperCase()}`,
        }),
      ),
    );
    stations.forEach((station) =>
      ['country', 'language', 'genre', 'mood'].forEach((key) =>
        edges.push({
          from: `station:${normalize(station.url || station.name)}`,
          to: `${key}:${normalize(station.metadata[key])}`,
          relation: `HAS_${key.toUpperCase()}`,
        }),
      ),
    );
    return { entityTypes: ENTITY_TYPES, nodes, edges, tracks, stations };
  }

  function scoreMatch(sourceMetadata, targetMetadata, preferredLanguage) {
    let score = 0;
    if (normalize(sourceMetadata.language) === normalize(targetMetadata.language)) score += 4;
    if (
      normalize(sourceMetadata.region || sourceMetadata.country) ===
      normalize(targetMetadata.region || targetMetadata.country)
    )
      score += 4;
    if (normalize(sourceMetadata.genre) === normalize(targetMetadata.genre)) score += 3;
    if (normalize(sourceMetadata.mood) === normalize(targetMetadata.mood)) score += 2;
    if (preferredLanguage && normalize(targetMetadata.language) === normalize(preferredLanguage)) score += 2;
    return score;
  }

  function recommendRelated(source, targetType, limit = 3) {
    const graph = buildGraph();
    const sourceMetadata =
      source?.metadata || (source?.url ? stationMetadata(source) : trackMetadata(source, source?.album));
    const candidates = targetType === 'station' ? graph.stations : graph.tracks;
    const preferredLanguage = safeRead(STORAGE_KEYS.preferredLanguage, 'English');
    return candidates
      .map((candidate) => ({
        ...candidate,
        intelligenceScore: scoreMatch(sourceMetadata, candidate.metadata, preferredLanguage),
      }))
      .sort((a, b) => b.intelligenceScore - a.intelligenceScore)
      .slice(0, limit);
  }

  function remember(key, item, identity, limit = 8) {
    const existing = safeRead(key, []);
    safeWrite(key, [item, ...existing.filter((entry) => identity(entry) !== identity(item))].slice(0, limit));
  }

  function toggleFavorite(key, item, identity) {
    const existing = safeRead(key, []);
    const id = identity(item);
    const isFavorite = existing.some((entry) => identity(entry) === id);
    const next = isFavorite ? existing.filter((entry) => identity(entry) !== id) : [item, ...existing];
    safeWrite(key, next);
    return !isFavorite;
  }

  window.AriyoMediaIntelligence = Object.freeze({
    STORAGE_KEYS,
    ENTITY_TYPES,
    safeRead,
    safeWrite,
    stationMetadata,
    trackMetadata,
    getStations,
    getTracks,
    buildGraph,
    recommendRelated,
    remember,
    toggleFavorite,
  });
})();
