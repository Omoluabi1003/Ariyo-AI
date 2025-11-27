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

    let onTrackEndCallback = () => {};

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
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.style.display = 'none';
        document.body.appendChild(audio);
        return audio;
    }

    function _bindEvents() {
        // Remove old listeners before adding new ones
        player1.removeEventListener('timeupdate', _monitorTrackProgress);
        player2.removeEventListener('timeupdate', _monitorTrackProgress);
        activePlayer.addEventListener('timeupdate', _monitorTrackProgress);

        player1.removeEventListener('ended', _handleTrackEnd);
        player2.removeEventListener('ended', _handleTrackEnd);
        activePlayer.addEventListener('ended', _handleTrackEnd);
    }

    function _monitorTrackProgress() {
        if (!djAutoMixEnabled || isCrossfading || activePlayer.duration < crossfadeDurationSeconds) {
            return;
        }

        const remainingTime = activePlayer.duration - activePlayer.currentTime;
        if (remainingTime <= crossfadeDurationSeconds) {
             if (typeof onTrackEndCallback === 'function') {
                onTrackEndCallback();
            }
        }
    }

    function _handleTrackEnd() {
        if (!djAutoMixEnabled) {
            if (typeof onTrackEndCallback === 'function') {
                onTrackEndCallback(true); // Signal that it was a natural end
            }
        }
    }

    function setConfig({ enabled, duration }) {
        if (enabled !== undefined) {
            djAutoMixEnabled = enabled;
        }
        if (duration !== undefined) {
            crossfadeDurationSeconds = duration;
        }
    }

    function loadTrack(src, isNext = false) {
        const player = isNext ? inactivePlayer : activePlayer;
        player.src = src;
        player.load();
    }

    function play() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        activePlayer.play().catch(e => console.error("Play failed", e));
        activeGainNode.gain.setValueAtTime(1, audioContext.currentTime);
        inactiveGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    }

    function pause() {
        activePlayer.pause();
    }

    function crossfade() {
        if (isCrossfading) return;
        isCrossfading = true;

        const now = audioContext.currentTime;

        // Fade out the active player
        activeGainNode.gain.linearRampToValueAtTime(0, now + crossfadeDurationSeconds);

        // Swap players
        [activePlayer, inactivePlayer] = [inactivePlayer, activePlayer];
        [activeGainNode, inactiveGainNode] = [inactiveGainNode, activeGainNode];

        _bindEvents();

        // Play and fade in the new active player
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        activePlayer.play().catch(e => console.error("Play failed during crossfade", e));
        activeGainNode.gain.setValueAtTime(0, now);
        activeGainNode.gain.linearRampToValueAtTime(1, now + crossfadeDurationSeconds);

        setTimeout(() => {
            isCrossfading = false;
            inactivePlayer.pause();
            inactivePlayer.src = ''; // Clear the source of the inactive player
        }, crossfadeDurationSeconds * 1000);
    }

    function onTrackEnd(callback) {
        onTrackEndCallback = callback;
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
        getCurrentTime,
        getDuration
    };
})();

// Initialize the player when the script is loaded
document.addEventListener('DOMContentLoaded', () => {
    CrossfadePlayer.init();
});
