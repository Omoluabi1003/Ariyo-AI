(() => {
  const resolveSunoAudioSrc = window.resolveSunoAudioSrc || (async src => src);
  const audioEngine = window.audioEngine;

  const turntableDisc = document.querySelector('.turntable-disc');
  const turntableGrooves = document.querySelector('.turntable-grooves');
  const turntableSheen = document.querySelector('.turntable-sheen');
  const albumGrooveOverlay = document.querySelector('.album-groove-overlay');
  const nowPlayingThumb = document.getElementById('nowPlayingThumb');
  const trackInfo = document.getElementById('trackInfo');
  const trackArtist = document.getElementById('trackArtist');
  const trackAlbum = document.getElementById('trackAlbum');
  const trackYear = document.getElementById('trackYear');
  const trackDuration = document.getElementById('trackDuration');
  const nextTrackInfo = document.getElementById('nextTrackInfo');
  const progressBarFill = document.getElementById('progressBarFill');
  const seekBar = document.getElementById('seekBar');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusMessage = document.getElementById('statusMessage');
  const playlistElement = document.getElementById('playlist');
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const stopButton = document.getElementById('stopButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const shuffleButton = document.getElementById('shuffleButton');
  const refreshButton = document.getElementById('refreshButton');
  const volumeControl = document.getElementById('volumeControl');
  const djToggle = document.getElementById('djToggle');
  const crossfadeDurationSelect = document.getElementById('crossfadeDuration');
  const crossfadeStatus = document.getElementById('crossfadeStatus');
  const visualizerCanvas = document.getElementById('audioVisualizer');
  const visualizerToggle = document.getElementById('visualizerToggle');
  const visualizerMotionToggle = document.getElementById('visualizerMotionToggle');
  const visualizerStatus = document.getElementById('visualizerStatus');
  const visualizerModeButtons = document.querySelectorAll('[data-visualizer-mode]');
  const visualizerModeStatus = document.getElementById('visualizerModeStatus');
  const visualizerModeAdvice = document.getElementById('visualizerModeAdvice');
  const visualizerModeRoot = document.querySelector('.music-player');

  if (nowPlayingThumb) {
    nowPlayingThumb.onerror = () => {
      nowPlayingThumb.onerror = null;
      nowPlayingThumb.src = '../../Logo.jpg';
      nowPlayingThumb.alt = 'Album cover unavailable';
    };
  }

  const SOURCE_RESOLVE_TIMEOUT_MS = 1200;
  const PROGRESS_UPDATE_FPS = 30;

  if (!audioEngine) {
    statusMessage.textContent = 'Audio engine failed to initialize.';
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const deriveTrackArtist = (baseArtist, trackTitle) => {
    const artistName = baseArtist || 'Omoluabi';
    if (!trackTitle) return artistName;

    const match = trackTitle.match(/ft\.?\s+(.+)/i);
    if (match && match[1]) {
      return `${artistName} ft. ${match[1].trim()}`;
    }

    return artistName;
  };

  const hasAlbums = typeof albums !== 'undefined' && Array.isArray(albums) && albums.length;
  if (!hasAlbums) {
    statusMessage.textContent = 'No tracks available. Please refresh the page.';
    shuffleButton.disabled = true;
    refreshButton.disabled = true;
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const albumTrackMap = new Map();
  const trackDurationLabels = new Map();
  const allTracks = [];
  const trackDataById = {};
  const fallbackCover = typeof NAIJA_HITS_COVER !== 'undefined' ? NAIJA_HITS_COVER : '../../Logo.jpg';
  const trackCatalogProvider = window.AriyoTrackCatalog
    || window.AriyoTrackCatalogBuilder?.createTrackCatalogProvider?.(albums, { fallbackCover });

  if (trackCatalogProvider?.trackCatalog?.length) {
    trackCatalogProvider.trackCatalog.forEach(track => {
      const location = trackCatalogProvider.trackLocationsById?.[track.id];
      const albumIndex = location?.albumIndex ?? -1;
      const trackIndex = location?.trackIndex ?? -1;
      const album = albums[albumIndex] || {};
      const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : null;
      const albumName = track.albumTitle || album.name || album.title || `Album ${albumIndex + 1}`;
      const originalTrack = album?.tracks?.[trackIndex] || {};
      const trackData = {
        id: track.id,
        title: track.title,
        src: track.audioUrl,
        cover: track.coverUrl || album.cover || album.coverImage || fallbackCover,
        album: albumName,
        artist: deriveTrackArtist(track.artist || album.artist, track.title),
        releaseYear,
        albumIndex,
        albumTrackIndex: trackIndex,
        isLive: Boolean(originalTrack.isLive || originalTrack.sourceType === 'stream'),
        sourceType: originalTrack.sourceType || (originalTrack.isLive ? 'stream' : 'file'),
        duration: Number.isFinite(track.durationSec) ? track.durationSec : null
      };

      allTracks.push(trackData);
      trackDataById[track.id] = trackData;
      const list = albumTrackMap.get(albumIndex) || [];
      list.push(trackData);
      albumTrackMap.set(albumIndex, list);
    });
  } else {
    albums.forEach((album, albumIndex) => {
      if (!album || !Array.isArray(album.tracks)) {
        return;
      }

      const artist = album.artist || 'Omoluabi';
      const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : null;
      const cover = album.cover || album.coverImage || fallbackCover;
      const albumName = album.name || album.title || `Album ${albumIndex + 1}`;
      const collectedTracks = [];

      album.tracks.forEach((track, trackIndex) => {
        if (!track) {
          return;
        }

        const trackSrc = track.src || track.url;
        if (!trackSrc) {
          return;
        }

        const title = track.title || `Track ${trackIndex + 1}`;
        const trackData = {
          id: track.id || `${albumIndex}-${trackIndex}`,
          title,
          src: trackSrc,
          cover,
          album: albumName,
          artist: deriveTrackArtist(track.artist || artist, title),
          releaseYear: typeof track.releaseYear !== 'undefined' ? track.releaseYear : releaseYear,
          albumIndex,
          albumTrackIndex: trackIndex,
          isLive: Boolean(track.isLive || track.sourceType === 'stream'),
          sourceType: track.sourceType || (track.isLive ? 'stream' : 'file'),
          duration: typeof track.duration === 'number' ? track.duration : null,
        };

        allTracks.push(trackData);
        trackDataById[trackData.id] = trackData;
        collectedTracks.push(trackData);
      });

      if (collectedTracks.length) {
        albumTrackMap.set(albumIndex, collectedTracks);
      }
    });
  }

  if (!allTracks.length) {
    statusMessage.textContent = 'No playable tracks were found.';
    return;
  }

  const isLiveStreamTrack = track => Boolean(track && (track.isLive || track.sourceType === 'stream'));

  let playbackOrder = allTracks.map(track => track.id);
  const baseOrder = [...playbackOrder];
  let currentOrderIndex = 0;
  let isShuffleEnabled = false;
  let userSeeking = false;
  let isLoading = false;
  let currentTrack = trackDataById[playbackOrder[currentOrderIndex]];
  let currentDuration = currentTrack && currentTrack.duration ? currentTrack.duration : 0;
  let currentSourceId = null;
  let progressFrame = null;
  let pendingSeekValue = 0;
  let sourceRequestId = 0;
  let playIntent = false;
  let userPauseRequested = false;
  let spinHoldUntil = 0;
  let spinHoldTimer = null;

  const LOADING_SPIN_GRACE_MS = 300;
  const VISUALIZER_MODES = ['dual', 'turntable', 'spectrum'];

  const updateVisualizerModeStatus = mode => {
    if (!visualizerModeStatus) return;
    const label = mode === 'turntable' ? 'Turntable only' : mode === 'spectrum' ? 'Spectrum only' : 'Dual visuals';
    visualizerModeStatus.textContent = `Showing: ${label}`;
    if (!visualizerModeAdvice) return;
    const advice = mode === 'turntable'
      ? 'Best for focus: keep the vinyl motion while reducing spectrum activity.'
      : mode === 'spectrum'
        ? 'Best for detail: highlight beats and vocals in the spectrum.'
        : 'Best for most tracks: layered visuals with balanced motion.';
    visualizerModeAdvice.textContent = advice;
  };

  const setVisualizerMode = mode => {
    if (!visualizerModeRoot) return;
    const nextMode = VISUALIZER_MODES.includes(mode) ? mode : 'dual';
    visualizerModeRoot.setAttribute('data-visualizer-mode', nextMode);
    visualizerModeButtons.forEach(button => {
      const isActive = button.getAttribute('data-visualizer-mode') === nextMode;
      button.setAttribute('aria-pressed', String(isActive));
    });
    updateVisualizerModeStatus(nextMode);
  };

  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const setStatus = message => {
    statusMessage.textContent = message;
  };

  const scheduleSpinHold = durationMs => {
    const now = Date.now();
    spinHoldUntil = Math.max(spinHoldUntil, now + durationMs);
    if (spinHoldTimer) {
      window.clearTimeout(spinHoldTimer);
    }
    const remaining = Math.max(spinHoldUntil - now, 0);
    spinHoldTimer = window.setTimeout(() => {
      spinHoldTimer = null;
      updateSpinState();
    }, remaining);
  };

  const showLoading = message => {
    isLoading = true;
    loadingSpinner.style.display = 'inline-block';
    setStatus(message);
    scheduleSpinHold(LOADING_SPIN_GRACE_MS);
    updateSpinState();
  };

  const hideLoading = () => {
    isLoading = false;
    loadingSpinner.style.display = 'none';
    updateSpinState();
  };

  const spinController = window.AriyoVinylSpinController;
  const applySpinState = spinController && spinController.updateVinylSpinState
    ? spinController.updateVinylSpinState
    : (elements, isSpinning, options = {}) => {
      const { spinClass = 'spin', activeClass = 'spinning' } = options;
      const list = Array.isArray(elements) ? elements : [elements];
      list.forEach(element => {
        if (!element) return;
        if (spinClass) {
          element.classList.toggle(spinClass, isSpinning);
        }
        if (activeClass) {
          element.classList.toggle(activeClass, isSpinning);
        }
        element.style.animationPlayState = isSpinning ? 'running' : 'paused';
      });
    };

  const vinylElements = [turntableDisc, turntableGrooves, turntableSheen, albumGrooveOverlay];

  const updateVinylSpinState = isSpinning => {
    applySpinState(vinylElements, isSpinning, { spinClass: 'spin', activeClass: 'spinning' });
  };

  const updateSpinState = () => {
    const state = audioEngine.getState();
    const isSpinning = state === 'playing'
      || isLoading
      || (playIntent && state !== 'error')
      || Date.now() < spinHoldUntil;
    updateVinylSpinState(isSpinning);
  };

  const setupAudioVisualizer = () => {
    if (!visualizerCanvas || !visualizerToggle || !visualizerMotionToggle || !visualizerStatus) return null;
    if (!window.Howler || !window.Howler.ctx) {
      visualizerToggle.disabled = true;
      visualizerToggle.setAttribute('aria-pressed', 'false');
      visualizerToggle.textContent = 'Visualizer Loading';
      visualizerMotionToggle.disabled = true;
      visualizerMotionToggle.setAttribute('aria-pressed', 'false');
      visualizerMotionToggle.textContent = 'Motion: Full';
      visualizerStatus.textContent = 'Waiting for audio';
      return null;
    }

    visualizerToggle.disabled = false;
    visualizerToggle.setAttribute('aria-pressed', 'true');
    visualizerToggle.textContent = 'Visualizer On';

    const analyzer = window.Howler.ctx.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.82;

    const resumeAudioContext = () => {
      if (!window.Howler || !window.Howler.ctx) return;
      if (window.Howler.ctx.state === 'suspended') {
        window.Howler.ctx.resume().catch(() => {});
      }
    };

    let mediaElementSource = null;
    let mediaElementNode = null;

    const connectAnalyzer = () => {
      if (!window.Howler || !window.Howler.ctx || !window.Howler.ctx.destination) {
        return;
      }
      const { ctx } = window.Howler;
      try {
        analyzer.disconnect();
      } catch (_) {
        // Ignore disconnect errors.
      }

      if (window.Howler.usingWebAudio && window.Howler.masterGain) {
        const { masterGain } = window.Howler;
        try {
          masterGain.disconnect(ctx.destination);
        } catch (_) {
          // Ignore disconnect errors.
        }
        try {
          masterGain.disconnect(analyzer);
        } catch (_) {
          // Ignore disconnect errors.
        }
        masterGain.connect(analyzer);
        analyzer.connect(ctx.destination);
        return;
      }

      if (!audioEngine || typeof audioEngine.getAudioElement !== 'function') {
        return;
      }
      const audioElement = audioEngine.getAudioElement();
      if (!audioElement) {
        return;
      }
      if (mediaElementNode !== audioElement) {
        if (mediaElementSource) {
          try {
            mediaElementSource.disconnect();
          } catch (_) {
            // Ignore disconnect errors.
          }
        }
        mediaElementSource = ctx.createMediaElementSource(audioElement);
        mediaElementNode = audioElement;
      }
      try {
        mediaElementSource.disconnect();
      } catch (_) {
        // Ignore disconnect errors.
      }
      mediaElementSource.connect(analyzer);
      analyzer.connect(ctx.destination);
    };

    const unlockVisualizer = () => {
      resumeAudioContext();
      connectAnalyzer();
    };

    unlockVisualizer();

    const canvasContext = visualizerCanvas.getContext('2d');
    if (!canvasContext) return null;

    const circularCanvas = document.getElementById('circularVisualizer');
    const circularContext = circularCanvas ? circularCanvas.getContext('2d') : null;

    const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
    const lastFrame = new Uint8Array(analyzer.frequencyBinCount);
    const lowEnergyHistory = [];
    const historySize = 30;

    const barCount = 48;
    let beatPulse = 0;
    let animationFrameId = null;
    let isPlaying = audioEngine.getState() === 'playing';
    let isEnabled = true;
    let reduceMotion = false;
    let motionOverride = false;
    let resizeObserver = null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shouldSuppressMotion = () => reduceMotion && !motionOverride;
    const updateMotionToggle = () => {
      if (!visualizerMotionToggle) return;
      visualizerMotionToggle.disabled = !reduceMotion;
      visualizerMotionToggle.setAttribute('aria-pressed', String(motionOverride));
      if (!reduceMotion) {
        visualizerMotionToggle.textContent = 'Motion: Full';
        return;
      }
      visualizerMotionToggle.textContent = motionOverride ? 'Motion: Override' : 'Motion: Reduced';
    };
    const setReduceMotion = () => {
      reduceMotion = prefersReducedMotion.matches;
      if (!reduceMotion) {
        motionOverride = false;
      }
      updateMotionToggle();
      updateVisualizerState();
    };

    if (prefersReducedMotion.addEventListener) {
      prefersReducedMotion.addEventListener('change', setReduceMotion);
    } else if (prefersReducedMotion.addListener) {
      prefersReducedMotion.addListener(setReduceMotion);
    }

    const setCanvasSize = (canvas, context, width, height) => {
      if (!canvas || !context) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const resizeCanvases = () => {
      const visualTarget = visualizerCanvas.parentElement || visualizerCanvas;
      if (visualTarget) {
        const { width, height } = visualTarget.getBoundingClientRect();
        setCanvasSize(visualizerCanvas, canvasContext, width, height);
      }
      if (circularCanvas && circularContext) {
        const circularTarget = circularCanvas.parentElement || circularCanvas;
        if (circularTarget) {
          const { width, height } = circularTarget.getBoundingClientRect();
          setCanvasSize(circularCanvas, circularContext, width, height);
        }
      }
      drawBarsFrame({ dimmed: !isPlaying, useLastFrame: true });
      drawCircularFrame({ dimmed: !isPlaying, useLastFrame: true });
    };

    const handleResize = entries => {
      entries.forEach(entry => {
        const { width, height } = entry.contentRect;
        if (entry.target === visualizerCanvas.parentElement || entry.target === visualizerCanvas) {
          setCanvasSize(visualizerCanvas, canvasContext, width, height);
        }
        if (circularCanvas && circularContext && (entry.target === circularCanvas.parentElement || entry.target === circularCanvas)) {
          setCanvasSize(circularCanvas, circularContext, width, height);
        }
      });
      drawBarsFrame({ dimmed: !isPlaying, useLastFrame: true });
      drawCircularFrame({ dimmed: !isPlaying, useLastFrame: true });
    };

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resizeCanvases, { passive: true });
      resizeCanvases();
    } else {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(visualizerCanvas.parentElement || visualizerCanvas);
      if (circularCanvas) {
        resizeObserver.observe(circularCanvas.parentElement || circularCanvas);
      }
    }

    const setStatusText = () => {
      if (!isEnabled) {
        visualizerStatus.textContent = 'Off';
        return;
      }
      if (shouldSuppressMotion()) {
        visualizerStatus.textContent = 'Static (reduced motion)';
        return;
      }
      if (reduceMotion && motionOverride) {
        visualizerStatus.textContent = isPlaying ? 'Live (override)' : 'Paused (override)';
        return;
      }
      visualizerStatus.textContent = isPlaying ? 'Live' : 'Paused';
    };

    const getLowEnergy = data => {
      const nyquist = window.Howler.ctx.sampleRate / 2;
      const lowStart = Math.max(0, Math.floor((20 / nyquist) * data.length));
      const lowEnd = Math.min(data.length - 1, Math.floor((250 / nyquist) * data.length));
      let sum = 0;
      let count = 0;
      for (let i = lowStart; i <= lowEnd; i += 1) {
        sum += data[i];
        count += 1;
      }
      return count ? sum / count / 255 : 0;
    };

    const updateBeatPulse = energy => {
      lowEnergyHistory.push(energy);
      if (lowEnergyHistory.length > historySize) {
        lowEnergyHistory.shift();
      }
      const avgEnergy = lowEnergyHistory.reduce((acc, value) => acc + value, 0) / lowEnergyHistory.length;
      const isBeat = energy > Math.max(0.15, avgEnergy * 1.35);
      beatPulse = isBeat ? 1 : Math.max(beatPulse * 0.86, 0);
    };

    const drawBarsFrame = ({ dimmed, useLastFrame } = {}) => {
      const width = visualizerCanvas.clientWidth;
      const height = visualizerCanvas.clientHeight;
      if (!width || !height) return;

      const data = useLastFrame ? lastFrame : frequencyData;
      canvasContext.clearRect(0, 0, width, height);
      canvasContext.fillStyle = 'rgba(5, 6, 16, 0.65)';
      canvasContext.fillRect(0, 0, width, height);

      const gradient = canvasContext.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#2b3cff');
      gradient.addColorStop(0.5, '#7b37ff');
      gradient.addColorStop(0.85, '#ff3f7f');
      gradient.addColorStop(1, '#ff9857');

      canvasContext.fillStyle = gradient;
      canvasContext.shadowColor = `rgba(108, 79, 255, ${0.45 + beatPulse * 0.35})`;
      canvasContext.shadowBlur = 18 + beatPulse * 24;

      const barGap = 3;
      const availableWidth = width - barGap * (barCount - 1);
      const barWidth = Math.max(2, availableWidth / barCount);

      const binsPerBar = Math.max(1, Math.floor(data.length / barCount));
      const maxBarHeight = height * 0.85;

      for (let i = 0; i < barCount; i += 1) {
        let sum = 0;
        const start = i * binsPerBar;
        const end = Math.min(data.length, start + binsPerBar);
        for (let j = start; j < end; j += 1) {
          sum += data[j];
        }
        const average = sum / (end - start || 1);
        const lowBoost = i < 6 ? 1 + beatPulse * 0.45 : 1;
        const barHeight = Math.max(4, (average / 255) * maxBarHeight * (1 + beatPulse * 0.2) * lowBoost);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        const opacity = dimmed ? 0.35 : 0.95;
        canvasContext.globalAlpha = opacity;
        canvasContext.fillRect(x, y, barWidth, barHeight);
      }

      canvasContext.globalAlpha = 1;
      canvasContext.shadowBlur = 0;
    };

    const drawCircularFrame = ({ dimmed, useLastFrame } = {}) => {
      if (!circularCanvas || !circularContext) return;
      const width = circularCanvas.clientWidth;
      const height = circularCanvas.clientHeight;
      if (!width || !height) return;

      const data = useLastFrame ? lastFrame : frequencyData;
      const ctx = circularContext;
      ctx.clearRect(0, 0, width, height);

      const radius = Math.min(width, height) * 0.36;
      const maxBarHeight = Math.min(width, height) * 0.16;
      const barCount = 84;
      const angleStep = (Math.PI * 2) / barCount;
      const binsPerBar = Math.max(1, Math.floor(data.length / barCount));

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.2;

      const ringGradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius + maxBarHeight);
      ringGradient.addColorStop(0, 'rgba(64, 113, 255, 0.65)');
      ringGradient.addColorStop(0.55, 'rgba(142, 91, 255, 0.9)');
      ringGradient.addColorStop(1, 'rgba(255, 120, 178, 0.85)');

      ctx.strokeStyle = ringGradient;
      ctx.globalAlpha = dimmed ? 0.4 : 0.95;
      ctx.shadowColor = `rgba(142, 91, 255, ${0.35 + beatPulse * 0.35})`;
      ctx.shadowBlur = 18 + beatPulse * 26;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < barCount; i += 1) {
        let sum = 0;
        const start = i * binsPerBar;
        const end = Math.min(data.length, start + binsPerBar);
        for (let j = start; j < end; j += 1) {
          sum += data[j];
        }
        const average = sum / (end - start || 1);
        const strength = average / 255;
        const barHeight = Math.max(2, strength * maxBarHeight * (1 + beatPulse * 0.45));
        const angle = i * angleStep;
        const x1 = Math.cos(angle) * radius;
        const y1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle) * (radius + barHeight);
        const y2 = Math.sin(angle) * (radius + barHeight);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
      ctx.shadowBlur = 0;
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);
      if (!isEnabled) return;
      if (isPlaying) {
        analyzer.getByteFrequencyData(frequencyData);
        lastFrame.set(frequencyData);
        const lowEnergy = getLowEnergy(frequencyData);
        updateBeatPulse(lowEnergy);
        drawBarsFrame({ dimmed: false, useLastFrame: false });
        drawCircularFrame({ dimmed: false, useLastFrame: false });
      } else {
        beatPulse = Math.max(beatPulse * 0.92, 0);
        drawBarsFrame({ dimmed: true, useLastFrame: true });
        drawCircularFrame({ dimmed: true, useLastFrame: true });
      }
    };

    const stopLoop = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const startLoop = () => {
      if (!animationFrameId) {
        animationFrameId = window.requestAnimationFrame(renderLoop);
      }
    };

    const updateVisualizerState = () => {
      setStatusText();
      if (!isEnabled) {
        stopLoop();
        drawBarsFrame({ dimmed: true, useLastFrame: true });
        drawCircularFrame({ dimmed: true, useLastFrame: true });
        return;
      }
      if (shouldSuppressMotion()) {
        stopLoop();
        drawBarsFrame({ dimmed: !isPlaying, useLastFrame: true });
        drawCircularFrame({ dimmed: !isPlaying, useLastFrame: true });
        return;
      }
      startLoop();
    };

    visualizerToggle.addEventListener('click', () => {
      isEnabled = !isEnabled;
      visualizerToggle.setAttribute('aria-pressed', String(isEnabled));
      visualizerToggle.textContent = isEnabled ? 'Visualizer On' : 'Visualizer Off';
      updateVisualizerState();
    });

    visualizerMotionToggle.addEventListener('click', () => {
      if (!reduceMotion) return;
      motionOverride = !motionOverride;
      updateMotionToggle();
      updateVisualizerState();
    });

    window.addEventListener('audioengine:state', event => {
      const nextState = event.detail && event.detail.state;
      isPlaying = nextState === 'playing';
      if (isPlaying) {
        resumeAudioContext();
        connectAnalyzer();
      }
      setStatusText();
      if (shouldSuppressMotion()) {
        drawBarsFrame({ dimmed: !isPlaying, useLastFrame: true });
        drawCircularFrame({ dimmed: !isPlaying, useLastFrame: true });
      }
    });

    window.addEventListener('audioengine:source', () => {
      resumeAudioContext();
      connectAnalyzer();
    });

    setReduceMotion();
    updateVisualizerState();

    const teardown = () => {
      stopLoop();
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      } else {
        window.removeEventListener('resize', resizeCanvases);
      }
      if (mediaElementSource) {
        try {
          mediaElementSource.disconnect();
        } catch (_) {
          // Ignore disconnect errors.
        }
        mediaElementSource = null;
        mediaElementNode = null;
      }
      if (prefersReducedMotion.removeEventListener) {
        prefersReducedMotion.removeEventListener('change', setReduceMotion);
      } else if (prefersReducedMotion.removeListener) {
        prefersReducedMotion.removeListener(setReduceMotion);
      }
    };

    return { teardown, unlock: unlockVisualizer };
  };

  const updateNextTrackLabel = () => {
    if (!nextTrackInfo) return;
    if (playbackOrder.length <= 1) {
      nextTrackInfo.textContent = '';
      return;
    }
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const nextTrack = trackDataById[playbackOrder[nextIndex]];
    nextTrackInfo.textContent = nextTrack ? `Next: ${nextTrack.title}` : '';
  };

  const updatePlaylistHighlight = () => {
    const items = playlistElement.querySelectorAll('.album-track');
    let activeItem = null;
    items.forEach(item => {
      const orderIndex = Number(item.dataset.orderIndex);
      const isActive = orderIndex === currentOrderIndex;
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        activeItem = item;
      } else {
        item.removeAttribute('aria-current');
      }
    });

    if (activeItem) {
      const group = activeItem.closest('.album-group');
      if (group) {
        expandAlbumGroup(group);
      }
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  };

  const updateTrackMetadata = track => {
    const isLive = isLiveStreamTrack(track);
    trackInfo.textContent = track.title;
    trackArtist.textContent = `Artist: ${track.artist}`;
    trackAlbum.textContent = `Album: ${track.album}`;
    trackYear.textContent = `Release Year: ${track.releaseYear || 'Unknown'}`;
    if (nowPlayingThumb) {
      nowPlayingThumb.src = track.cover || '../../Logo.jpg';
      nowPlayingThumb.alt = `Album cover for ${track.title}`;
    }
    progressBarFill.style.width = '0%';
    seekBar.value = 0;
    seekBar.disabled = isLive;
    seekBar.setAttribute('aria-disabled', String(isLive));
    trackDuration.textContent = isLive ? 'Live • Afrobeats' : '0:00 / 0:00';
    updatePlaylistHighlight();
    updateNextTrackLabel();
  };

  const updateProgressDisplay = (position, duration) => {
    if (audioEngine.isLive()) {
      trackDuration.textContent = 'Live • Afrobeats';
      progressBarFill.style.width = '0%';
      seekBar.value = 0;
      return;
    }
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const safePosition = Number.isFinite(position) ? Math.min(Math.max(position, 0), safeDuration || 0) : 0;
    const progressValue = safeDuration ? (safePosition / safeDuration) * 100 : 0;
    progressBarFill.style.width = `${progressValue}%`;
    seekBar.value = progressValue;
    trackDuration.textContent = `${formatTime(safePosition)} / ${formatTime(safeDuration)}`;
  };

  const startProgressLoop = () => {
    if (progressFrame) return;
    const frameDelay = 1000 / PROGRESS_UPDATE_FPS;

    const tick = () => {
      progressFrame = null;
      if (audioEngine.getState() !== 'playing') return;
      if (!userSeeking) {
        const position = audioEngine.seek();
        currentDuration = audioEngine.getDuration() || currentDuration;
        updateProgressDisplay(position, currentDuration);
      }
      progressFrame = window.setTimeout(tick, frameDelay);
    };

    progressFrame = window.setTimeout(tick, frameDelay);
  };

  const stopProgressLoop = () => {
    if (!progressFrame) return;
    window.clearTimeout(progressFrame);
    progressFrame = null;
  };

  const collapseAlbumGroup = group => {
    if (!group) return;
    group.classList.remove('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
    if (list) {
      list.hidden = true;
      list.setAttribute('aria-hidden', 'true');
    }
  };

  const expandAlbumGroup = group => {
    if (!group) return;
    const groups = playlistElement.querySelectorAll('.album-group');
    groups.forEach(other => {
      if (other !== group) {
        collapseAlbumGroup(other);
      }
    });
    group.classList.add('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    if (list) {
      list.hidden = false;
      list.setAttribute('aria-hidden', 'false');
    }
  };

  const renderPlaylist = () => {
    playlistElement.innerHTML = '';
    const orderLookup = new Map();
    playbackOrder.forEach((trackId, orderIndex) => {
      orderLookup.set(trackId, orderIndex);
    });

    albumTrackMap.forEach((tracks, albumIndex) => {
      if (!tracks || !tracks.length) {
        return;
      }

      const album = albums[albumIndex] || {};
      const albumGroup = document.createElement('li');
      albumGroup.className = 'album-group';
      albumGroup.dataset.albumIndex = albumIndex;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'album-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const trackListId = `albumTracks-${albumIndex}`;
      toggle.setAttribute('aria-controls', trackListId);

      const thumb = document.createElement('img');
      thumb.className = 'album-thumb';
      thumb.src = tracks[0].cover || album.cover || '../../Logo.jpg';
      thumb.alt = `${tracks[0].album} cover art`;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.onerror = () => {
        thumb.onerror = null;
        thumb.src = '../../Logo.jpg';
      };

      const textWrap = document.createElement('span');
      textWrap.className = 'album-toggle-text';

      const name = document.createElement('span');
      name.className = 'album-name';
      name.textContent = tracks[0].album;

      const meta = document.createElement('span');
      meta.className = 'album-meta';
      const releaseYear = (typeof album.releaseYear !== 'undefined' && album.releaseYear) ? album.releaseYear : tracks[0].releaseYear;
      const trackCount = tracks.length;
      const safeYear = releaseYear || 'Unknown';
      meta.textContent = `${safeYear} • ${trackCount} track${trackCount === 1 ? '' : 's'}`;

      const durationLabel = document.createElement('span');
      durationLabel.className = 'album-duration';
      const totalDuration = tracks.every(track => Number.isFinite(track.duration))
        ? tracks.reduce((sum, track) => sum + track.duration, 0)
        : 0;
      if (totalDuration > 0) {
        durationLabel.textContent = ` • ${formatTime(totalDuration)}`;
      }
      meta.appendChild(durationLabel);

      textWrap.appendChild(name);
      textWrap.appendChild(meta);

      const icon = document.createElement('span');
      icon.className = 'album-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▾';

      toggle.appendChild(thumb);
      toggle.appendChild(textWrap);
      toggle.appendChild(icon);

      const trackList = document.createElement('ol');
      trackList.className = 'album-track-list';
      trackList.id = trackListId;
      trackList.hidden = true;
      trackList.setAttribute('role', 'list');
      trackList.setAttribute('aria-hidden', 'true');

      tracks.forEach(track => {
        const orderIndex = orderLookup.get(track.id);
        if (typeof orderIndex !== 'number') {
          return;
        }

        const listItem = document.createElement('li');
        listItem.className = 'album-track';
        listItem.tabIndex = 0;
        listItem.dataset.orderIndex = orderIndex;

        const title = document.createElement('span');
        title.className = 'album-track-title';
        title.textContent = track.title;

        const trackMeta = document.createElement('span');
        trackMeta.className = 'album-track-meta';
        const trackLabel = isLiveStreamTrack(track)
          ? 'Live • Afrobeats'
          : `Track ${track.albumTrackIndex + 1}`;
        trackMeta.textContent = `${track.artist} • ${trackLabel}`;

        const trackDurationLabel = document.createElement('span');
        trackDurationLabel.className = 'album-track-duration';
        trackMeta.appendChild(trackDurationLabel);

        if (isLiveStreamTrack(track)) {
          trackDurationLabel.textContent = 'Live stream';
        } else if (Number.isFinite(track.duration)) {
          trackDurationLabel.textContent = formatTime(track.duration);
        } else {
          trackDurationLabel.textContent = '—';
          trackDurationLabels.set(track.src, trackDurationLabel);
        }

        listItem.appendChild(title);
        listItem.appendChild(trackMeta);

        listItem.addEventListener('click', () => {
          loadTrack(orderIndex, { autoplay: true });
        });
        listItem.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            loadTrack(orderIndex, { autoplay: true });
          }
        });

        trackList.appendChild(listItem);
      });

      if (!trackList.children.length) {
        return;
      }

      toggle.addEventListener('click', () => {
        if (albumGroup.classList.contains('is-open')) {
          collapseAlbumGroup(albumGroup);
        } else {
          expandAlbumGroup(albumGroup);
        }
      });

      toggle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (albumGroup.classList.contains('is-open')) {
            collapseAlbumGroup(albumGroup);
          } else {
            expandAlbumGroup(albumGroup);
          }
        }
      });

      albumGroup.appendChild(toggle);
      albumGroup.appendChild(trackList);
      playlistElement.appendChild(albumGroup);
    });

    updatePlaylistHighlight();
  };

  const updatePlaybackOrder = newOrder => {
    const currentTrackId = playbackOrder[currentOrderIndex];
    playbackOrder = [...newOrder];
    currentOrderIndex = Math.max(0, playbackOrder.indexOf(currentTrackId));
    renderPlaylist();
    updateNextTrackLabel();
  };

  const shufflePlaybackOrder = () => {
    const currentTrackId = playbackOrder[currentOrderIndex];
    if (trackCatalogProvider?.buildQueue) {
      const shuffled = trackCatalogProvider.buildQueue('ALL_TRACKS', {
        seed: Date.now(),
        startTrackId: currentTrackId
      });
      updatePlaybackOrder(shuffled);
      return;
    }
    const shuffled = [...playbackOrder];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    updatePlaybackOrder(shuffled);
  };

  const handleLoadError = message => {
    hideLoading();
    setStatus(message);
    updateSpinState();
  };

  const resolveWithTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
    promise
      .then(value => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        window.clearTimeout(timer);
        reject(error);
      });
  });

  const loadTrack = async (orderIndex, { autoplay = false } = {}) => {
    const trackId = playbackOrder[orderIndex];
    const track = trackDataById[trackId];
    if (!track) return;

    currentOrderIndex = orderIndex;
    currentTrack = track;
    currentDuration = track.duration || 0;
    updateTrackMetadata(track);

    const sourceRequest = ++sourceRequestId;
    if (autoplay) {
      playIntent = true;
    }
    userPauseRequested = false;
    showLoading(isLiveStreamTrack(track) ? 'Connecting to live stream…' : 'Loading track…');

    try {
      const resolvedSrc = await resolveWithTimeout(resolveSunoAudioSrc(track.src), SOURCE_RESOLVE_TIMEOUT_MS);
      if (sourceRequest !== sourceRequestId) return;

      currentSourceId = track.src;
      if (isLiveStreamTrack(track)) {
        audioEngine.loadStream({ id: track.id, url: resolvedSrc, title: track.title, region: track.album });
      } else {
        audioEngine.loadTrack({
          id: track.id,
          url: resolvedSrc,
          title: track.title,
          artist: track.artist,
          artwork: track.cover,
        });
      }

      if (autoplay) {
        audioEngine.play();
      }
    } catch (error) {
      console.warn('[player] source-resolve-failed', error);
      handleLoadError('We could not load this track right now.');
    }
  };

  const ensureTrackLoaded = async ({ autoplay = false } = {}) => {
    if (currentTrack && currentSourceId === currentTrack.src) {
      if (autoplay) {
        audioEngine.play();
      }
      return;
    }
    await loadTrack(currentOrderIndex, { autoplay });
  };

  const playCurrentTrack = async () => {
    if (!currentTrack) return;
    if (audioEngine.getState() === 'playing') return;
    playIntent = true;
    userPauseRequested = false;
    updateSpinState();
    if (visualizerControls && typeof visualizerControls.unlock === 'function') {
      visualizerControls.unlock();
    }
    if (window.Howler && window.Howler.ctx && window.Howler.ctx.state === 'suspended') {
      try {
        await window.Howler.ctx.resume();
      } catch (_) {
        // Ignore resume errors.
      }
    }
    await ensureTrackLoaded({ autoplay: true });
  };

  const stopPlayback = () => {
    playIntent = false;
    userPauseRequested = true;
    audioEngine.stop();
    updateProgressDisplay(0, currentDuration);
    hideLoading();
    setStatus('Playback stopped.');
  };

  const playNextTrack = async (autoAdvance = false) => {
    if (!playbackOrder.length) return;
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const shouldAutoplay = autoAdvance || audioEngine.getState() === 'playing';
    await loadTrack(nextIndex, { autoplay: shouldAutoplay });
  };

  const playPreviousTrack = async () => {
    if (!playbackOrder.length) return;
    const prevIndex = (currentOrderIndex - 1 + playbackOrder.length) % playbackOrder.length;
    const shouldAutoplay = audioEngine.getState() === 'playing';
    await loadTrack(prevIndex, { autoplay: shouldAutoplay });
  };

  const toggleShuffle = () => {
    isShuffleEnabled = !isShuffleEnabled;
    shuffleButton.setAttribute('aria-pressed', String(isShuffleEnabled));
    if (isShuffleEnabled) {
      setStatus('Shuffle enabled.');
      shufflePlaybackOrder();
    } else {
      setStatus('Shuffle disabled.');
      updatePlaybackOrder(baseOrder);
    }
  };

  const syncVolume = value => {
    audioEngine.setVolume(value);
  };

  const updateDjMixUi = () => {
    if (djToggle) {
      djToggle.checked = false;
      djToggle.disabled = true;
    }
    if (crossfadeDurationSelect) {
      crossfadeDurationSelect.disabled = true;
    }
    if (crossfadeStatus) {
      crossfadeStatus.textContent = 'DJ Mix off';
    }
  };

  let visualizerControls = null;
  const ensureVisualizer = () => {
    if (visualizerControls) return;
    const controls = setupAudioVisualizer();
    if (controls) {
      visualizerControls = controls;
      visualizerToggle.disabled = false;
    }
  };

  const forceResumeAudioContext = () => {
    if (window.Howler && window.Howler.ctx && window.Howler.ctx.state === 'suspended') {
      window.Howler.ctx.resume().catch(() => {});
    }
    if (visualizerControls && typeof visualizerControls.unlock === 'function') {
      visualizerControls.unlock();
    }
  };

  ensureVisualizer();
  if (visualizerModeRoot) {
    const initialMode = visualizerModeRoot.getAttribute('data-visualizer-mode') || 'dual';
    setVisualizerMode(initialMode);
  }
  visualizerModeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-visualizer-mode');
      if (mode) {
        setVisualizerMode(mode);
      }
    });
  });

  window.addEventListener('beforeunload', () => {
    if (visualizerControls) {
      visualizerControls.teardown();
    }
  });

  window.addEventListener('audioengine:source', ensureVisualizer);

  playButton.addEventListener('click', () => {
    ensureVisualizer();
    forceResumeAudioContext();
    playCurrentTrack();
  });
  pauseButton.addEventListener('click', () => {
    playIntent = false;
    userPauseRequested = true;
    audioEngine.pause();
  });
  stopButton.addEventListener('click', stopPlayback);
  prevButton.addEventListener('click', playPreviousTrack);
  nextButton.addEventListener('click', () => playNextTrack(false));
  shuffleButton.addEventListener('click', toggleShuffle);
  refreshButton.addEventListener('click', shufflePlaybackOrder);

  volumeControl.addEventListener('input', event => {
    const value = Number(event.target.value);
    syncVolume(Number.isFinite(value) ? value : 1);
  });

  seekBar.addEventListener('input', event => {
    if (audioEngine.isLive()) return;
    userSeeking = true;
    const value = Number(event.target.value) || 0;
    const duration = currentDuration || audioEngine.getDuration();
    pendingSeekValue = duration ? (value / 100) * duration : 0;
    updateProgressDisplay(pendingSeekValue, duration);
  });

  seekBar.addEventListener('change', () => {
    if (audioEngine.isLive()) return;
    audioEngine.seek(pendingSeekValue);
    userSeeking = false;
  });

  window.addEventListener('audioengine:state', event => {
    const { state } = event.detail;
    if (state === 'loading') {
      if (!isLoading) {
        showLoading('Connecting…');
      }
      return;
    }

    if (state === 'playing') {
      hideLoading();
      setStatus(`Now playing: ${currentTrack ? currentTrack.title : ''}`.trim());
      startProgressLoop();
      playIntent = true;
      userPauseRequested = false;
      updateSpinState();
      return;
    }

    if (state === 'paused') {
      const wasUserPause = userPauseRequested;
      if (wasUserPause) {
        playIntent = false;
      }
      userPauseRequested = false;
      hideLoading();
      stopProgressLoop();
      updateSpinState();
      if (!audioEngine.isLive()) {
        updateProgressDisplay(audioEngine.seek(), audioEngine.getDuration() || currentDuration);
      }
      setStatus(wasUserPause ? 'Playback paused.' : 'Ready to play.');
      return;
    }

    if (state === 'idle') {
      hideLoading();
      stopProgressLoop();
      updateSpinState();
      return;
    }

    if (state === 'error') {
      stopProgressLoop();
      handleLoadError('Playback error. Tap play to retry.');
    }
  });

  window.addEventListener('audioengine:loaded', event => {
    if (audioEngine.isLive()) {
      currentDuration = 0;
      return;
    }
    const duration = Number(event.detail.duration);
    if (Number.isFinite(duration) && duration > 0) {
      currentDuration = duration;
      updateProgressDisplay(audioEngine.seek(), currentDuration);
      if (currentTrack && trackDurationLabels.has(currentTrack.src)) {
        trackDurationLabels.get(currentTrack.src).textContent = formatTime(duration);
        trackDurationLabels.delete(currentTrack.src);
      }
    }
  });

  window.addEventListener('audioengine:ended', () => {
    stopProgressLoop();
    hideLoading();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  });

  updateDjMixUi();
  renderPlaylist();
  updateTrackMetadata(currentTrack);
  updateNextTrackLabel();
  syncVolume(Number(volumeControl.value || 1));
})();
