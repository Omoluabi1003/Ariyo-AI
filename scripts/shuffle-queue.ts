type Track = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
};

type ShuffleMode = 'all' | 'album' | null;

type ShuffleOptions = {
  /**
   * If true, apply a lightweight smoothing pass to avoid consecutive
   * same-artist tracks. Default is false for true randomness.
   */
  perceivedRandomness?: boolean;
};

const cryptoRng = (() => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto;
  }
  return null;
})();

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error(`maxExclusive must be > 0, got ${maxExclusive}`);
  }
  if (!cryptoRng) {
    // As a fallback, use Math.random if crypto is unavailable.
    return Math.floor(Math.random() * maxExclusive);
  }

  // Rejection sampling for unbiased modulo reduction.
  const range = maxExclusive;
  const maxUint32 = 0xffffffff;
  const limit = Math.floor((maxUint32 + 1) / range) * range - 1;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    cryptoRng.getRandomValues(buffer);
    value = buffer[0];
  } while (value > limit);
  return value % range;
}

function fisherYatesShuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function applyPerceivedRandomness(ids: string[], trackById: Map<string, Track>): string[] {
  const result = [...ids];
  for (let i = 1; i < result.length; i += 1) {
    const prev = trackById.get(result[i - 1]);
    const current = trackById.get(result[i]);
    if (!prev || !current || prev.artist !== current.artist) continue;

    const swapIndex = result.findIndex((id, idx) => {
      if (idx <= i) return false;
      const track = trackById.get(id);
      return track?.artist !== prev.artist;
    });

    if (swapIndex !== -1) {
      [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
    }
  }
  return result;
}

let shuffleQueue: string[] = [];
let currentIndex = -1;
let isShuffleEnabled = false;
let shuffleMode: ShuffleMode = null;
let perceivedRandomness = false;

let getTracksForMode: (mode: ShuffleMode) => Track[] = () => [];
let getCurrentTrackId: () => string | null = () => null;

export function configureShuffleContext({
  trackProvider,
  currentTrackProvider,
  options
}: {
  trackProvider: (mode: ShuffleMode) => Track[];
  currentTrackProvider: () => string | null;
  options?: ShuffleOptions;
}): void {
  getTracksForMode = trackProvider;
  getCurrentTrackId = currentTrackProvider;
  perceivedRandomness = Boolean(options?.perceivedRandomness);
}

export function generateFullShuffle(tracks: Track[], startWithTrackId?: string): string[] {
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  const ids = tracks.map((track) => track.id);
  const startIndex = startWithTrackId ? ids.indexOf(startWithTrackId) : -1;

  const remaining = startIndex >= 0
    ? ids.filter((id) => id !== startWithTrackId)
    : [...ids];
  const shuffledRemaining = fisherYatesShuffle(remaining);
  const fullQueue = startIndex >= 0 && startWithTrackId
    ? [startWithTrackId, ...shuffledRemaining]
    : shuffledRemaining;

  if (!perceivedRandomness) return fullQueue;
  const trackMap = new Map(tracks.map((track) => [track.id, track]));
  return applyPerceivedRandomness(fullQueue, trackMap);
}

export function peekNextTrackId(): string | null {
  if (!isShuffleEnabled || shuffleQueue.length === 0) return null;
  const nextIndex = currentIndex + 1;
  return nextIndex >= 0 && nextIndex < shuffleQueue.length ? shuffleQueue[nextIndex] : null;
}

export function selectTrackManually(trackId: string): void {
  const tracks = getTracksForMode(shuffleMode);
  shuffleQueue = generateFullShuffle(tracks, trackId);
  currentIndex = shuffleQueue.length > 0 ? 0 : -1;
}

export function advanceToNext(): string | null {
  if (!isShuffleEnabled || shuffleQueue.length === 0) return null;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= shuffleQueue.length) {
    return null;
  }
  currentIndex = nextIndex;
  return shuffleQueue[currentIndex] ?? null;
}

export function toggleShuffle(mode?: 'all' | 'album'): void {
  const currentTrackId = getCurrentTrackId();
  if (mode) {
    shuffleMode = mode;
    isShuffleEnabled = true;
  } else {
    isShuffleEnabled = !isShuffleEnabled;
  }

  if (!isShuffleEnabled) {
    shuffleQueue = [];
    currentIndex = -1;
    return;
  }

  const tracks = getTracksForMode(shuffleMode);
  shuffleQueue = generateFullShuffle(tracks, currentTrackId ?? undefined);
  currentIndex = shuffleQueue.length > 0 ? 0 : -1;
}

export function getShuffleState(): {
  shuffleQueue: string[];
  currentIndex: number;
  isShuffleEnabled: boolean;
  shuffleMode: ShuffleMode;
} {
  return {
    shuffleQueue: [...shuffleQueue],
    currentIndex,
    isShuffleEnabled,
    shuffleMode
  };
}
