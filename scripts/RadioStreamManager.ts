/**
 * RadioStreamManager
 * ------------------
 * Dedicated controller for resilient live radio playback.
 *
 * What changed (stability + UX):
 * - The underlying HTMLAudioElement is now treated as a stable singleton; it is only reset when a
 *   different station is explicitly selected or when a recovery flow forces a reload. Metadata-only
 *   updates will no longer pause or seek the stream.
 * - Recovery timers avoid piling up retries; stalled/waiting events simply start the stall watchdog
 *   and a single retry timer. If playback recovers before the timer fires, the retry is skipped.
 * - Pause events triggered by intentional resets (station switch/stop) are suppressed so the UI does
 *   not bounce back to "0:00 / Live" during normal playback. Status updates now map cleanly to the
 *   audio element state without spurious resets.
 * - Cache-busted URLs are only issued for real reloads (station change/stream change/retry), so
 *   metadata refreshes no longer rewrite the source and reset playback time. Retry scheduling also
 *   checks for recent progress to avoid unnecessary reinitialization.
 *
 * Design goals:
 * - React-friendly, but framework agnostic module API.
 * - Backward compatible with the existing immutable station list shape (id/name/streamUrl/url/etc.).
 * - Centralized reconnection logic with exponential backoff and online/offline awareness.
 * - Single, shared HTMLAudioElement with strict listener/timer cleanup to avoid leaks during remounts.
 */

export type RadioStation = {
  id?: string | number;
  name: string;
  streamUrl?: string;
  url?: string;
  region?: string;
  metadata?: Record<string, unknown>;
  logo?: string;
  // Allow additional fields without breaking existing consumers.
  [key: string]: unknown;
};

export type RadioStatusType =
  | 'idle'
  | 'buffering'
  | 'playing'
  | 'stalled'
  | 'retrying'
  | 'offline'
  | 'error'
  | 'metadataUpdated'
  | 'stopped';

export interface RadioStatus {
  type: RadioStatusType;
  station: RadioStation | null;
  metadata: Record<string, unknown>;
  error?: Error;
  attempt?: number;
  retryDelayMs?: number;
  offline?: boolean;
}

export type StatusListener = (status: RadioStatus) => void;

export interface RadioStreamManagerOptions {
  /**
   * Provide an existing audio element if the host app manages one. When omitted a managed element is created.
   */
  audioElement?: HTMLAudioElement;
  /** Maximum reconnection attempts before surfacing a hard error. */
  maxRetries?: number;
  /** Maximum delay cap for exponential backoff (defaults to 16s). */
  maxBackoffMs?: number;
  /** Stall timeout that triggers recovery (defaults to 12s). */
  stallTimeoutMs?: number;
}

interface RetryState {
  count: number;
  timerId: number | null;
}

/**
 * Factory function to create an isolated radio stream manager instance.
 * The station list is accepted as a readonly dependency to ensure the original data remains immutable.
 */
export function createRadioStreamManager(
  stations: readonly RadioStation[],
  options: RadioStreamManagerOptions = {}
) {
  const audio: HTMLAudioElement = options.audioElement ?? new Audio();
  const listeners = new Set<StatusListener>();

  // Runtime session state (separate from immutable station list).
  let currentStation: RadioStation | null = null;
  let sessionMetadata: Record<string, unknown> = {};
  let isOffline = !navigator.onLine;
  let isBuffering = false;
  let suppressNextPauseEvent = false;
  let currentBaseStreamUrl: string | null = null;
  let currentResolvedStreamUrl: string | null = null;
  let lastProgressAt = 0;

  // Event guard to prevent duplicate listeners on remount/switch.
  let audioListenersAttached = false;

  // Recovery settings.
  const maxRetries = options.maxRetries ?? 6;
  const maxBackoffMs = options.maxBackoffMs ?? 16000;
  const stallTimeoutMs = options.stallTimeoutMs ?? 12000;
  const retryState: RetryState = { count: 0, timerId: null };
  let stallTimer: number | null = null;

  // Cleanup helpers --------------------------------------------------------
  const clearRetryTimer = () => {
    if (retryState.timerId != null) {
      window.clearTimeout(retryState.timerId);
      retryState.timerId = null;
    }
  };

  const clearStallTimer = () => {
    if (stallTimer != null) {
      window.clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  const resetRecoveryState = () => {
    clearRetryTimer();
    clearStallTimer();
    retryState.count = 0;
  };

  // Status emission --------------------------------------------------------
  const emitStatus = (type: RadioStatusType, payload: Partial<RadioStatus> = {}) => {
    const status: RadioStatus = {
      type,
      station: currentStation,
      metadata: sessionMetadata,
      ...payload,
    };
    listeners.forEach(cb => cb(status));
  };

  // Station resolution & cache busting ------------------------------------
  const matchesStationId = (station: RadioStation, stationId: string | number) => {
    return station.id === stationId || station.name === stationId;
  };

  const isSameStation = (a: RadioStation | null, b: RadioStation) => {
    if (!a) return false;
    if (a.id != null && b.id != null) {
      return a.id === b.id;
    }
    return a.name === b.name;
  };

  const findStation = (stationId: string | number): RadioStation | undefined => {
    return stations.find(station => matchesStationId(station, stationId));
  };

  const withCacheBusting = (url: string) => {
    try {
      const target = new URL(url, window.location.href);
      target.searchParams.set('_cb', Date.now().toString());
      return target.toString();
    } catch (_) {
      // Fallback for legacy URLs without parsing support.
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}_cb=${Date.now()}`;
    }
  };

  // Audio event handling ---------------------------------------------------
  const detachAudioListeners = () => {
    if (!audioListenersAttached) return;
    audio.removeEventListener('playing', handlePlaying);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('waiting', handleWaiting);
    audio.removeEventListener('stalled', handleStalled);
    audio.removeEventListener('error', handleError);
    audio.removeEventListener('timeupdate', handleProgress);
    audio.removeEventListener('ended', handleEnded);
    audioListenersAttached = false;
  };

  const attachAudioListeners = () => {
    if (audioListenersAttached) return;
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleProgress);
    audio.addEventListener('ended', handleEnded);
    audioListenersAttached = true;
  };

  const handlePlaying = () => {
    isBuffering = false;
    resetRecoveryState();
    emitStatus('playing');
    startStallWatch();
    lastProgressAt = Date.now();
  };

  const handlePause = () => {
    clearStallTimer();
    if (suppressNextPauseEvent) {
      suppressNextPauseEvent = false;
      return;
    }
    if (!audio.paused && !audio.ended) return;
    emitStatus(currentStation ? 'buffering' : 'stopped');
  };

  const handleWaiting = () => {
    isBuffering = true;
    emitStatus('buffering');
    startStallWatch();
  };

  const handleStalled = () => {
    emitStatus('stalled');
    startStallWatch();
    const progressedRecently = Date.now() - lastProgressAt < Math.max(2000, stallTimeoutMs / 3);
    if (!progressedRecently && !retryState.timerId) {
      scheduleRetry('stalled event');
    }
  };

  const handleError = () => {
    const error = audio.error ? new Error(audio.error.message) : new Error('Unknown audio error');
    emitStatus('error', { error });
    scheduleRetry('audio error');
  };

  const handleProgress = () => {
    // Any progress resets stall detection.
    startStallWatch();
    lastProgressAt = Date.now();
  };

  const handleEnded = () => {
    // Live streams should not end; treat as stall and attempt recovery.
    emitStatus('stalled');
    scheduleRetry('ended unexpectedly');
  };

  // Stall watchdog ---------------------------------------------------------
  const startStallWatch = () => {
    clearStallTimer();
    stallTimer = window.setTimeout(() => {
      emitStatus('stalled');
      scheduleRetry('stall-timeout');
    }, stallTimeoutMs);
  };

  // Online/offline handling -------------------------------------------------
  const handleOffline = () => {
    isOffline = true;
    clearRetryTimer();
    emitStatus('offline', { offline: true });
  };

  const handleOnline = () => {
    const wasOffline = isOffline;
    isOffline = false;
    if (wasOffline && currentStation) {
      scheduleRetry('network-restored', true);
    }
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  // Core playback ----------------------------------------------------------
  const resolveStreamUrl = (station: RadioStation): string | null => {
    return station.streamUrl || (station.url as string | undefined) || null;
  };

  const loadStation = (station: RadioStation) => {
    resetRecoveryState();
    const baseStreamUrl = resolveStreamUrl(station);
    if (!baseStreamUrl) {
      emitStatus('error', { error: new Error('Missing stream URL for station') });
      return;
    }

    const stationChanged = !isSameStation(currentStation, station);
    const streamChanged = currentBaseStreamUrl != null && currentBaseStreamUrl !== baseStreamUrl;

    currentStation = station;
    // Merge metadata into a runtime snapshot without mutating the source.
    sessionMetadata = { ...(station.metadata ?? {}), name: station.name, logo: station.logo, region: station.region };
    emitStatus('metadataUpdated');

    // If the station and stream did not change, keep the element stable and avoid a reset.
    if (!stationChanged && !streamChanged) {
      attachAudioListeners();
      // Only assign the source if nothing is currently set. Avoid cache-busted
      // churn for metadata updates which would otherwise force a reload.
      if (!audio.src) {
        currentBaseStreamUrl = baseStreamUrl;
        currentResolvedStreamUrl = withCacheBusting(baseStreamUrl);
        audio.src = currentResolvedStreamUrl;
      }
      if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(err => {
            emitStatus('error', { error: err instanceof Error ? err : new Error(String(err)) });
            scheduleRetry('resume-play-rejection');
          });
        }
      }
      startStallWatch();
      lastProgressAt = Date.now();
      emitStatus(isBuffering ? 'buffering' : 'playing');
      return;
    }

    // Station switch: perform a controlled reset with pause suppression so the UI
    // does not momentarily show "stopped" between streams.
    suppressNextPauseEvent = true;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    currentBaseStreamUrl = baseStreamUrl;
    currentResolvedStreamUrl = withCacheBusting(baseStreamUrl);
    audio.src = currentResolvedStreamUrl;
    audio.autoplay = true;
    attachAudioListeners();
    isBuffering = true;
    emitStatus('buffering');
    lastProgressAt = Date.now();
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(err => {
        emitStatus('error', { error: err instanceof Error ? err : new Error(String(err)) });
        scheduleRetry('play-rejection');
      });
    }
    startStallWatch();
  };

  const scheduleRetry = (reason: string, immediate = false) => {
    if (isOffline) {
      emitStatus('offline', { offline: true });
      return;
    }
    if (!currentStation) return;
    if (retryState.timerId != null) return;
    if (retryState.count >= maxRetries) {
      emitStatus('error', { error: new Error(`Failed to recover stream after ${maxRetries} attempts (${reason}).`) });
      return;
    }

    retryState.count += 1;
    const delay = immediate ? 0 : Math.min(maxBackoffMs, 1000 * 2 ** (retryState.count - 1));
    clearRetryTimer();
    emitStatus('retrying', { attempt: retryState.count, retryDelayMs: delay });

    retryState.timerId = window.setTimeout(() => {
      retryState.timerId = null;
      if (!currentStation) return;
      const now = Date.now();
      const progressedRecently = now - lastProgressAt < stallTimeoutMs;
      if (!audio.paused && !audio.ended && audio.currentTime > 0 && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && progressedRecently) {
        // Playback recovered on its own; skip the retry without touching the element.
        resetRecoveryState();
        emitStatus('playing');
        return;
      }
      const streamUrl = currentBaseStreamUrl;
      if (!streamUrl) {
        emitStatus('error', { error: new Error('Missing stream URL for station') });
        return;
      }
      isBuffering = true;
      emitStatus('buffering');
      currentResolvedStreamUrl = withCacheBusting(streamUrl);
      audio.src = currentResolvedStreamUrl;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(err => {
          emitStatus('error', { error: err instanceof Error ? err : new Error(String(err)) });
          scheduleRetry('retry-play-rejection');
        });
      }
      startStallWatch();
    }, delay);
  };

  // Public API -------------------------------------------------------------
  const playStation = (stationId: string | number) => {
    const station = findStation(stationId);
    if (!station) {
      emitStatus('error', { error: new Error(`Station with id "${stationId}" not found.`) });
      return;
    }
    loadStation(station);
  };

  const stopStation = () => {
    resetRecoveryState();
    detachAudioListeners();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    currentStation = null;
    sessionMetadata = {};
    emitStatus('stopped');
  };

  const togglePlay = () => {
    if (!currentStation) {
      emitStatus('idle');
      return;
    }
    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(err => {
          emitStatus('error', { error: err instanceof Error ? err : new Error(String(err)) });
          scheduleRetry('toggle-play-rejection');
        });
      }
      emitStatus(isBuffering ? 'buffering' : 'playing');
    } else {
      stopStation();
    }
  };

  const onStatusChange = (callback: StatusListener) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };

  const dispose = () => {
    stopStation();
    listeners.clear();
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    clearRetryTimer();
    clearStallTimer();
    detachAudioListeners();
  };

  return {
    playStation,
    stopStation,
    togglePlay,
    onStatusChange,
    dispose,
  };
}

export type RadioStreamManager = ReturnType<typeof createRadioStreamManager>;
