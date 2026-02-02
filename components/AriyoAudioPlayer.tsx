"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AriyoAudioPlayerProps = {
  src: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  initialPlaybackRate?: number;
  onClose?: () => void;
  onDownload?: () => void;
};

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const WAVEFORM_SAMPLES = 96;
const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 60;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const buildSmoothPath = (yValues: Float32Array) => {
  const points = yValues.length;
  const width = VIEWBOX_WIDTH;
  const height = VIEWBOX_HEIGHT;
  if (points === 0) return "";
  const step = width / (points - 1);
  let d = `M 0 ${clamp(yValues[0], 0, height)}`;
  for (let i = 1; i < points - 1; i += 1) {
    const x = i * step;
    const y = clamp(yValues[i], 0, height);
    const nextX = (i + 1) * step;
    const nextY = clamp(yValues[i + 1], 0, height);
    const controlX = x;
    const controlY = y;
    const midX = (x + nextX) / 2;
    const midY = (y + nextY) / 2;
    d += ` Q ${controlX} ${controlY} ${midX} ${midY}`;
  }
  const lastX = (points - 1) * step;
  const lastY = clamp(yValues[points - 1], 0, height);
  d += ` T ${lastX} ${lastY}`;
  return d;
};

const AriyoAudioPlayer: React.FC<AriyoAudioPlayerProps> = ({
  src,
  title = "Untitled audio",
  className = "",
  autoPlay = false,
  initialPlaybackRate = 1,
  onClose,
  onDownload,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const yValuesRef = useRef<Float32Array>(new Float32Array(WAVEFORM_SAMPLES));
  const overlayValuesRef = useRef<Float32Array>(
    new Float32Array(WAVEFORM_SAMPLES),
  );

  const bluePathRef = useRef<SVGPathElement | null>(null);
  const greenPathRef = useRef<SVGPathElement | null>(null);
  const purplePathRef = useRef<SVGPathElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(initialPlaybackRate);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [visualActive, setVisualActive] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.findIndex(
      (rate) => rate === playbackRate,
    );
    const nextRate =
      PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
  };

  const ensureAudioContext = useCallback(async () => {
    if (audioContextRef.current || !audioRef.current) return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const sourceNode = context.createMediaElementSource(audioRef.current);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    sourceNode.connect(analyser);
    analyser.connect(context.destination);
    audioContextRef.current = context;
    sourceNodeRef.current = sourceNode;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.fftSize);
  }, []);

  const stopRafLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const updatePaths = useCallback(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const yValues = yValuesRef.current;
    const overlayValues = overlayValuesRef.current;
    const bluePath = bluePathRef.current;
    const greenPath = greenPathRef.current;
    const purplePath = purplePathRef.current;
    if (!bluePath || !greenPath || !purplePath) return;

    const mid = VIEWBOX_HEIGHT / 2;
    const amplitude = VIEWBOX_HEIGHT * 0.38;
    if (analyser && dataArray) {
      analyser.getByteTimeDomainData(dataArray);
      const step = Math.floor(dataArray.length / WAVEFORM_SAMPLES);
      for (let i = 0; i < WAVEFORM_SAMPLES; i += 1) {
        const v = dataArray[i * step] / 128.0 - 1;
        yValues[i] = mid + v * amplitude;
      }
    } else {
      timeRef.current += 0.016;
      const t = timeRef.current;
      for (let i = 0; i < WAVEFORM_SAMPLES; i += 1) {
        const phase = (i / WAVEFORM_SAMPLES) * Math.PI * 2;
        const beat = Math.sin(t * 2.2) * 0.5 + 0.5;
        const wave =
          Math.sin(phase * 2 + t * 2.4) * 0.4 +
          Math.sin(phase * 3 - t * 1.7) * 0.25 +
          Math.sin(phase * 5 + t * 1.2) * 0.15;
        yValues[i] = mid + wave * amplitude * (0.6 + beat * 0.4);
      }
    }

    const corePath = buildSmoothPath(yValues);
    for (let i = 0; i < WAVEFORM_SAMPLES; i += 1) {
      overlayValues[i] = mid + (yValues[i] - mid) * 0.85;
    }
    const overlayPath = buildSmoothPath(overlayValues);
    for (let i = 0; i < WAVEFORM_SAMPLES; i += 1) {
      overlayValues[i] = mid + (yValues[i] - mid) * 0.7;
    }
    const echoPath = buildSmoothPath(overlayValues);

    bluePath.setAttribute("d", corePath);
    greenPath.setAttribute("d", overlayPath);
    purplePath.setAttribute("d", echoPath);
  }, []);

  const startRafLoop = useCallback(() => {
    stopRafLoop();
    const loop = () => {
      updatePaths();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stopRafLoop, updatePaths]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await ensureAudioContext();
      try {
        await audio.play();
      } catch (error) {
        // playback failed (autoplay policy)
      }
    } else {
      audio.pause();
    }
  };

  const handleSkip = (offset: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = clamp(audio.currentTime + offset, 0, duration);
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    audio.currentTime = ratio * duration;
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const link = document.createElement("a");
    link.href = src;
    link.download = src.split("/").pop() || "audio";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(audio.currentTime || 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setVisualActive(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setVisualActive(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setVisualActive(false);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (visualActive) {
      startRafLoop();
    } else {
      stopRafLoop();
    }
  }, [startRafLoop, stopRafLoop, visualActive]);

  useEffect(() => {
    if (!autoPlay) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {
      // ignore autoplay failure
    });
  }, [autoPlay]);

  useEffect(() => {
    return () => {
      stopRafLoop();
      if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stopRafLoop]);

  const waveformClasses = useMemo(
    () =>
      `absolute inset-0 flex items-center justify-center transition-all duration-300 ${
        visualActive ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`,
    [visualActive],
  );

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[#0a0a0a] text-white shadow-[0_0_30px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="relative h-[240px] sm:h-[260px] md:h-[280px]">
        <div className="absolute inset-0">
          {!isPlaying ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-[4px] w-[92%] rounded-full bg-[#60a5fa] shadow-[0_0_10px_rgba(96,165,250,0.6)]" />
            </div>
          ) : (
            <div className={waveformClasses}>
              <svg
                className="h-full w-full"
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="ariyoWaveBlue" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <path
                  ref={purplePathRef}
                  d=""
                  fill="none"
                  stroke="#a78bfa"
                  strokeOpacity="0.35"
                  strokeWidth="2.5"
                />
                <path
                  ref={greenPathRef}
                  d=""
                  fill="none"
                  stroke="#34d399"
                  strokeOpacity="0.75"
                  strokeWidth="2.6"
                />
                <path
                  ref={bluePathRef}
                  d=""
                  fill="none"
                  stroke="url(#ariyoWaveBlue)"
                  strokeWidth="3"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player"
              className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="min-w-0 flex-1 text-center text-base font-semibold sm:text-lg">
              <span className="block truncate">{title}</span>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download audio"
              className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div
                className="h-2 w-full cursor-pointer rounded-full bg-white/10"
                onClick={handleProgressClick}
                ref={progressBarRef}
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-[#60a5fa]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cyclePlaybackRate}
                  aria-label="Change playback speed"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {playbackRate}X
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLiked((prev) => !prev);
                    setDisliked(false);
                  }}
                  aria-label="Like"
                  className={`rounded-full border border-white/10 px-2 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    liked ? "bg-blue-500/30 text-white" : "text-white/70"
                  }`}
                >
                  👍
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisliked((prev) => !prev);
                    setLiked(false);
                  }}
                  aria-label="Dislike"
                  className={`rounded-full border border-white/10 px-2 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    disliked ? "bg-blue-500/30 text-white" : "text-white/70"
                  }`}
                >
                  👎
                </button>
              </div>

              <div className="flex flex-1 items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  aria-label="Skip back 10 seconds"
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  ↺10
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isPlaying
                      ? "bg-[#3b82f6] text-white shadow-[0_0_18px_rgba(59,130,246,0.6)]"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {isPlaying ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="currentColor"
                    >
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  aria-label="Skip forward 10 seconds"
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  ↻10
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

export default AriyoAudioPlayer;

// <AriyoAudioPlayer src="/path/to/track.mp3" title="Why The Archer Pulls You Back" />
