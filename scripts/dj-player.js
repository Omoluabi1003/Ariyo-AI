// scripts/dj-player.js

function useDjAutomix({
  playlist,
  initialAutoMixEnabled,
  initialCrossfadeSeconds,
  loopPlaylist,
}) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const [deckA, deckB] = [document.createElement('audio'), document.createElement('audio')];
  const [sourceA, sourceB] = [
    audioContext.createMediaElementSource(deckA),
    audioContext.createMediaElementSource(deckB),
  ];
  const [gainA, gainB] = [audioContext.createGain(), audioContext.createGain()];

  sourceA.connect(gainA);
  gainA.connect(audioContext.destination);
  sourceB.connect(gainB);
  gainB.connect(audioContext.destination);

  let state = {
    isPlaying: false,
    activeDeck: 'A',
    isCrossfading: false,
  };

  let currentTrackIndex = 0;
  let autoMixEnabled = initialAutoMixEnabled;
  let crossfadeSeconds = initialCrossfadeSeconds;

  const updateState = (newState) => {
    state = { ...state, ...newState };
    window.dispatchEvent(new CustomEvent('djStateChange', { detail: state }));
  };

  const loadTrack = (deck, trackIndex) => {
    if (trackIndex < 0 || trackIndex >= playlist.length) return;
    deck.src = playlist[trackIndex].src;
    deck.load();
  };

  const play = () => {
    if (playlist.length === 0) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const activeDeck = state.activeDeck === 'A' ? deckA : deckB;
    activeDeck.play();
    updateState({ isPlaying: true });
  };

  const pause = () => {
    const activeDeck = state.activeDeck === 'A' ? deckA : deckB;
    activeDeck.pause();
    updateState({ isPlaying: false });
  };

  const crossfade = () => {
    updateState({ isCrossfading: true });

    const [fadeOutGain, fadeInGain] = state.activeDeck === 'A' ? [gainA, gainB] : [gainB, gainA];
    const fadeInDeck = state.activeDeck === 'A' ? deckB : deckA;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    fadeInDeck.play();

    const now = audioContext.currentTime;
    fadeOutGain.gain.linearRampToValueAtTime(0, now + crossfadeSeconds);
    fadeInGain.gain.setValueAtTime(0, now);
    fadeInGain.gain.linearRampToValueAtTime(1, now + crossfadeSeconds);

    setTimeout(() => {
      (state.activeDeck === 'A' ? deckA : deckB).pause();
      updateState({ isCrossfading: false, activeDeck: state.activeDeck === 'A' ? 'B' : 'A' });
    }, crossfadeSeconds * 1000);
  };

  const skipToNext = () => {
    let nextTrackIndex = currentTrackIndex + 1;
    if (loopPlaylist && nextTrackIndex >= playlist.length) {
      nextTrackIndex = 0;
    }
    if (nextTrackIndex >= playlist.length) return;

    loadTrack(state.activeDeck === 'A' ? deckB : deckA, nextTrackIndex);
    currentTrackIndex = nextTrackIndex;

    if (autoMixEnabled) {
      crossfade();
    } else {
      pause();
      updateState({ activeDeck: state.activeDeck === 'A' ? 'B' : 'A' });
      play();
    }
  };

  const skipToPrevious = () => {
    let prevTrackIndex = currentTrackIndex - 1;
    if (loopPlaylist && prevTrackIndex < 0) {
      prevTrackIndex = playlist.length - 1;
    }
    if (prevTrackIndex < 0) return;

    loadTrack(state.activeDeck === 'A' ? deckB : deckA, prevTrackIndex);
    currentTrackIndex = prevTrackIndex;

    if (autoMixEnabled) {
      crossfade();
    } else {
      pause();
      updateState({ activeDeck: state.activeDeck === 'A' ? 'B' : 'A' });
      play();
    }
  };

  [deckA, deckB].forEach(deck => {
    deck.addEventListener('ended', () => {
      if (autoMixEnabled && deck === (state.activeDeck === 'A' ? deckA : deckB)) {
        skipToNext();
      }
    });
  });

  if (playlist.length > 0) {
    loadTrack(deckA, currentTrackIndex);
  }

  return {
    play,
    pause,
    skipToNext,
    skipToPrevious,
    setConfig: ({ autoMix, crossfade }) => {
      if (autoMix !== undefined) autoMixEnabled = autoMix;
      if (crossfade !== undefined) crossfadeSeconds = crossfade;
    },
    getCurrentTime: () => (state.activeDeck === 'A' ? deckA : deckB).currentTime,
    getDuration: () => (state.activeDeck === 'A' ? deckA : deckB).duration,
    get currentTrack() {
      return playlist[currentTrackIndex];
    },
    get nextTrack() {
      const nextIndex = currentTrackIndex + 1;
      return playlist[nextIndex < playlist.length ? nextIndex : (loopPlaylist ? 0 : -1)];
    },
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const djPlayerShell = document.querySelector('.dj-player-shell');
  if (djPlayerShell) {
    const djPlayButton = document.getElementById('dj-play-button');
    const djPauseButton = document.getElementById('dj-pause-button');
    const djPrevButton = document.getElementById('dj-prev-button');
    const djNextButton = document.getElementById('dj-next-button');
    const djAutomixToggle = document.getElementById('dj-automix-toggle');
    const djCrossfadeSlider = document.getElementById('dj-crossfade-slider');
    const djCrossfadeValue = document.getElementById('dj-crossfade-value');
    const djCurrentTrack = document.getElementById('dj-current-track');
    const djNextTrackContainer = document.getElementById('dj-next-track-container');
    const djNextTrack = document.getElementById('dj-next-track');
    const djStatusPill = document.getElementById('dj-status-pill');

    const playlist = albums.flatMap(album => album.tracks);

    const dj = useDjAutomix({
      playlist,
      initialAutoMixEnabled: true,
      initialCrossfadeSeconds: 8,
      loopPlaylist: true,
    });

    const updateUI = (e) => {
      const state = e.detail;
      const { currentTrack, nextTrack } = dj;
      djPlayButton.style.display = state.isPlaying ? 'none' : 'inline-block';
      djPauseButton.style.display = state.isPlaying ? 'inline-block' : 'none';
      djCurrentTrack.textContent = currentTrack?.title ?? 'Nothing yet';

      if (nextTrack) {
        djNextTrack.textContent = nextTrack.title;
        djNextTrackContainer.style.display = 'block';
      } else {
        djNextTrackContainer.style.display = 'none';
      }

      djStatusPill.textContent = `Deck: ${state.activeDeck} | ${state.isCrossfading ? 'Crossfading' : 'Stable mix'} | ${state.isPlaying ? 'Live' : 'Paused'}`;
    };

    djPlayButton.addEventListener('click', dj.play);
    djPauseButton.addEventListener('click', dj.pause);
    djPrevButton.addEventListener('click', dj.skipToPrevious);
    djNextButton.addEventListener('click', dj.skipToNext);

    djAutomixToggle.addEventListener('change', (e) => {
      dj.setConfig({ autoMix: e.target.checked });
    });

    djCrossfadeSlider.addEventListener('input', (e) => {
      const seconds = Number(e.target.value);
      djCrossfadeValue.textContent = seconds;
      dj.setConfig({ crossfade: seconds });
    });

    window.addEventListener('djStateChange', updateUI);
    // Expose dj instance for player.js to access
    window.dj = dj;
  }
});