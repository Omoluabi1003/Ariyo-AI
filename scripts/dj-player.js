// scripts/dj-player.js

window.CrossfadePlayer = (() => {
    let audioContext;
    let player1, player2;
    let source1, source2;
    let gainNode1, gainNode2;
    let activePlayer, inactivePlayer;
    let activeGainNode, inactiveGainNode;

    let djAutoMixEnabled = false;
    let isCrossfading = false;
    let crossfadeDurationSeconds = 6;
    let preloadAheadSeconds = 8;

    let activeTrackMeta = null;
    let nextTrackMeta = null;

    let onTrackEndCallback = () => {};
    let onTimeUpdateCallback = null;
    let onCrossfadeStart = null;
    let onCrossfadeComplete = null;

    function init() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        player1 = _createAudioPlayer('djPlayer1');
        player2 = _createAudioPlayer('djPlayer2');

        source1 = audioContext.createMediaElementSource(player1);
        source2 = audioContext.createMediaElementSource(player2);

        gainNode1 = audioContext.createGain();
        gainNode2 = audioContext.createGain();

        source1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);

        source2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        activePlayer = player1;
        inactivePlayer = player2;
        activeGainNode = gainNode1;
        inactiveGainNode = gainNode2;

        _bindEvents();
    }

    function _createAudioPlayer(id) {
        const audio = document.createElement('audio');
        audio.id = id;
        audio.preload = 'auto';
        audio.style.display = 'none';
        document.body.appendChild(audio);
        return audio;
    }

    function _applyCrossOrigin(element, url) {
        try {
            const host = new URL(url, window.location.origin).hostname;
            const corsAllowedHosts = ['raw.githubusercontent.com', 'drive.google.com'];
            if (corsAllowedHosts.some(h => host.endsWith(h))) {
                element.crossOrigin = 'anonymous';
            } else {
                element.removeAttribute('crossorigin');
            }
        } catch (e) {
            element.removeAttribute('crossorigin');
        }
    }

    function _bindEvents() {
        player1.removeEventListener('timeupdate', _monitorTrackProgress);
        player2.removeEventListener('timeupdate', _monitorTrackProgress);
        player1.removeEventListener('timeupdate', _notifyTimeUpdate);
        player2.removeEventListener('timeupdate', _notifyTimeUpdate);

        activePlayer.addEventListener('timeupdate', _monitorTrackProgress);
        activePlayer.addEventListener('timeupdate', _notifyTimeUpdate);

        player1.removeEventListener('ended', _handleTrackEnd);
        player2.removeEventListener('ended', _handleTrackEnd);
        activePlayer.addEventListener('ended', _handleTrackEnd);
    }

    function _monitorTrackProgress() {
        if (!djAutoMixEnabled || isCrossfading || !activePlayer.duration || activePlayer.duration < crossfadeDurationSeconds) {
            return;
        }

        const remainingTime = activePlayer.duration - activePlayer.currentTime;
        if (remainingTime <= preloadAheadSeconds && inactivePlayer.src && inactivePlayer.readyState === HTMLMediaElement.HAVE_NOTHING) {
            inactivePlayer.load();
        }

        if (remainingTime <= crossfadeDurationSeconds && nextTrackMeta && nextTrackMeta.src) {
            _startCrossfade('auto');
        }
    }

    function _handleTrackEnd() {
        if (djAutoMixEnabled && nextTrackMeta && nextTrackMeta.src && !isCrossfading) {
            _startCrossfade('auto');
            return;
        }

        if (typeof onTrackEndCallback === 'function') {
            onTrackEndCallback(true);
        }
    }

    function _notifyTimeUpdate() {
        if (typeof onTimeUpdateCallback === 'function') {
            onTimeUpdateCallback({
                currentTime: activePlayer.currentTime,
                duration: activePlayer.duration,
                isCrossfading
            });
        }
    }

    function _safeGainRamp(node, element, from, to, durationSeconds) {
        if (node && node.gain && typeof node.gain.setValueAtTime === 'function') {
            const now = audioContext.currentTime;
            node.gain.setValueAtTime(from, now);
            node.gain.linearRampToValueAtTime(to, now + durationSeconds);
        } else {
            _volumeFallbackRamp(element, from, to, durationSeconds);
        }
    }

    function _volumeFallbackRamp(element, from, to, durationSeconds) {
        const start = performance.now();
        const diff = to - from;
        const step = () => {
            const elapsed = (performance.now() - start) / 1000;
            const progress = Math.min(elapsed / durationSeconds, 1);
            element.volume = from + diff * progress;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        element.volume = from;
        requestAnimationFrame(step);
    }

    function _swapPlayers() {
        [activePlayer, inactivePlayer] = [inactivePlayer, activePlayer];
        [activeGainNode, inactiveGainNode] = [inactiveGainNode, activeGainNode];
        activeTrackMeta = nextTrackMeta || activeTrackMeta;
        nextTrackMeta = null;
        _bindEvents();
    }

    function _startCrossfade(reason = 'manual', overrideDuration) {
        if (isCrossfading || !inactivePlayer.src) return;
        isCrossfading = true;

        const duration = overrideDuration || crossfadeDurationSeconds;
        if (typeof onCrossfadeStart === 'function') {
            onCrossfadeStart({ reason, incoming: nextTrackMeta, outgoing: activeTrackMeta });
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        inactiveGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        inactivePlayer.play().catch(e => console.error('Play failed during crossfade', e));
        _safeGainRamp(activeGainNode, activePlayer, activeGainNode.gain.value, 0, duration);
        _safeGainRamp(inactiveGainNode, inactivePlayer, 0, 1, duration);

        setTimeout(() => {
            _swapPlayers();
            inactivePlayer.pause();
            inactivePlayer.src = '';
            isCrossfading = false;
            if (typeof onCrossfadeComplete === 'function') {
                onCrossfadeComplete(activeTrackMeta);
            }
        }, duration * 1000);
    }

    function setConfig({ enabled, duration, preloadAhead, onCrossfadeStart: startCb, onCrossfadeComplete: completeCb, onTrackEnd, onTimeUpdate: timeUpdateCb }) {
        if (enabled !== undefined) {
            djAutoMixEnabled = enabled;
        }
        if (duration !== undefined) {
            crossfadeDurationSeconds = duration;
        }
        if (preloadAhead !== undefined) {
            preloadAheadSeconds = preloadAhead;
        }
        if (typeof startCb === 'function') {
            onCrossfadeStart = startCb;
        }
        if (typeof completeCb === 'function') {
            onCrossfadeComplete = completeCb;
        }
        if (typeof onTrackEnd === 'function') {
            onTrackEndCallback = onTrackEnd;
        }
        if (typeof timeUpdateCb === 'function') {
            onTimeUpdateCallback = timeUpdateCb;
            _bindEvents();
        }
    }

    function loadTrack(trackOrSrc, isNext = false) {
        const { src, meta } = typeof trackOrSrc === 'string' ? { src: trackOrSrc, meta: null } : trackOrSrc;
        const player = isNext ? inactivePlayer : activePlayer;
        _applyCrossOrigin(player, src);
        player.src = src;
        player.load();

        if (isNext) {
            nextTrackMeta = { ...(meta || {}), src };
        } else {
            activeTrackMeta = { ...(meta || {}), src };
        }
    }

    function play() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        activeGainNode.gain.setValueAtTime(1, audioContext.currentTime);
        inactiveGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        activePlayer.play().catch(e => console.error('Play failed', e));
    }

    function pause() {
        activePlayer.pause();
    }

    function crossfade(options = {}) {
        const { durationSeconds, immediate } = options;
        const fadeDuration = immediate ? Math.min(2.5, durationSeconds || crossfadeDurationSeconds) : (durationSeconds || crossfadeDurationSeconds);
        _startCrossfade('manual', fadeDuration);
    }

    function onTrackEnd(callback) {
        onTrackEndCallback = callback;
    }

    function onTimeUpdate(callback) {
        onTimeUpdateCallback = typeof callback === 'function' ? callback : null;
        _bindEvents();
    }

    function getCurrentTime() {
        return activePlayer.currentTime;
    }

    function getDuration() {
        return activePlayer.duration;
    }

    // Public API
    return {
        init,
        setConfig,
        loadTrack,
        play,
        pause,
        crossfade,
        onTrackEnd,
        onTimeUpdate,
        getCurrentTime,
        getDuration
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    CrossfadePlayer.init();
});
