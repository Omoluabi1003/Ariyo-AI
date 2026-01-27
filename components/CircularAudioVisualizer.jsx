import { useEffect, useRef } from "react";

const DEFAULT_SIZE = 300;
const BAR_COUNT = 72;
const FFT_SIZE = 1024;

const CircularAudioVisualizer = ({ audioRef, isPlaying, size = DEFAULT_SIZE }) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioElementRef = useRef(null);
  const rafRef = useRef(null);
  const dataArrayRef = useRef(null);
  const barLevelsRef = useRef(new Float32Array(BAR_COUNT));
  const rotationRef = useRef(0);
  const lastFrameRef = useRef(0);

  const supportsAudio =
    typeof window !== "undefined" &&
    (window.AudioContext || window.webkitAudioContext);

  useEffect(() => {
    // Only spin up the audio graph after the first user-initiated play.
    if (!supportsAudio || !isPlaying || !audioRef?.current) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (!analyserRef.current) {
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
    }

    const currentAudioElement = audioRef.current;
    if (
      !sourceRef.current ||
      (audioElementRef.current && audioElementRef.current !== currentAudioElement)
    ) {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current =
        audioContextRef.current.createMediaElementSource(currentAudioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      audioElementRef.current = currentAudioElement;
    }

    if (!dataArrayRef.current && analyserRef.current) {
      dataArrayRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );
    }
  }, [audioRef, isPlaying, supportsAudio]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const restartAnimation = (element) => {
      if (!element) {
        return;
      }
      const previousAnimation = element.style.animation;
      const previousWebkitAnimation = element.style.webkitAnimation;
      element.style.webkitAnimation = "none";
      element.style.animation = "none";
      void element.offsetHeight;
      element.style.webkitAnimation = previousWebkitAnimation;
      element.style.animation = previousAnimation;
    };

    restartAnimation(canvas);
    if (canvas.parentElement) {
      restartAnimation(canvas.parentElement);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    const handleResize = () => {
      const parent = canvas.parentElement;
      const parentWidth = parent?.clientWidth || size;
      const parentHeight = parent?.clientHeight || size;
      const dimension = Math.min(parentWidth, parentHeight, size || DEFAULT_SIZE);
      const dpr = window.devicePixelRatio || 1;

      canvas.style.width = `${dimension}px`;
      canvas.style.height = `${dimension}px`;
      canvas.width = dimension * dpr;
      canvas.height = dimension * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    const draw = (timestamp) => {
      rafRef.current = requestAnimationFrame(draw);

      const delta = timestamp - (lastFrameRef.current || timestamp);
      lastFrameRef.current = timestamp;

      const width = canvas.clientWidth || size;
      const height = canvas.clientHeight || size;
      const radius = Math.min(width, height) / 2;
      const innerRadius = radius * 0.35;
      const maxBarLength = radius * 0.3;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(centerX, centerY);

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      const hasAudioData = analyser && dataArray && isPlaying;

      if (hasAudioData) {
        analyser.getByteFrequencyData(dataArray);
      }

      // Average low bins for a simple beat pulse / breathing glow.
      const basePulse = hasAudioData
        ? getLowFrequencyAverage(dataArray, 20) / 255
        : 0.15 + 0.1 * Math.sin(timestamp / 500);

      const glowIntensity = 0.25 + basePulse * 0.9;
      const ringGradient = ctx.createRadialGradient(
        0,
        0,
        innerRadius * 0.6,
        0,
        0,
        innerRadius + maxBarLength
      );
      ringGradient.addColorStop(0, `rgba(255, 184, 108, ${glowIntensity})`);
      ringGradient.addColorStop(0.6, `rgba(180, 120, 255, ${glowIntensity})`);
      ringGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = innerRadius * 0.2;
      ctx.shadowColor = `rgba(255, 140, 64, ${glowIntensity})`;
      ctx.shadowBlur = 20;
      ctx.arc(0, 0, innerRadius + maxBarLength * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const angleStep = (Math.PI * 2) / BAR_COUNT;
      const rotationSpeed = hasAudioData ? 0.002 : 0.0006;
      rotationRef.current += rotationSpeed * (delta / 16.6);

      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.5, radius * 0.012);

      for (let i = 0; i < BAR_COUNT; i += 1) {
        const barIndex = hasAudioData ? i : 0;
        const intensity = hasAudioData
          ? getFrequencySliceAverage(dataArray, barIndex, BAR_COUNT) / 255
          : 0.15 + 0.08 * Math.sin(timestamp / 700 + i);
        const easedLevel =
          barLevelsRef.current[i] + (intensity - barLevelsRef.current[i]) * 0.25;
        barLevelsRef.current[i] = easedLevel;

        const barLength = maxBarLength * (0.3 + easedLevel * 1.2);
        const angle = i * angleStep + rotationRef.current;
        const startX = Math.cos(angle) * innerRadius;
        const startY = Math.sin(angle) * innerRadius;
        const endX = Math.cos(angle) * (innerRadius + barLength);
        const endY = Math.sin(angle) * (innerRadius + barLength);

        const hue = 20 + (i / BAR_COUNT) * 240;
        const saturation = 85 + easedLevel * 10;
        const lightness = 50 + easedLevel * 20;

        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      const centerPulse = 0.8 + basePulse * 0.6;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 214, 153, ${0.25 + basePulse})`;
      ctx.shadowColor = `rgba(255, 180, 120, ${0.6 + basePulse})`;
      ctx.shadowBlur = 20 * centerPulse;
      ctx.arc(0, 0, innerRadius * 0.2 * centerPulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, size]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }

      dataArrayRef.current = null;
      barLevelsRef.current = new Float32Array(BAR_COUNT);
    };
  }, []);

  if (!supportsAudio) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06), rgba(0,0,0,0.2))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.75rem",
        }}
      >
        Audio visualizer unavailable
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="circular-visualizer"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
};

const getFrequencySliceAverage = (dataArray, index, barCount) => {
  if (!dataArray) {
    return 0;
  }

  const sliceSize = Math.floor(dataArray.length / barCount) || 1;
  const start = index * sliceSize;
  const end = Math.min(start + sliceSize, dataArray.length);
  let sum = 0;

  for (let i = start; i < end; i += 1) {
    sum += dataArray[i];
  }

  return sum / (end - start || 1);
};

const getLowFrequencyAverage = (dataArray, maxIndex) => {
  if (!dataArray) {
    return 0;
  }

  const end = Math.min(maxIndex, dataArray.length - 1);
  let sum = 0;

  for (let i = 0; i <= end; i += 1) {
    sum += dataArray[i];
  }

  return sum / (end + 1);
};

export default CircularAudioVisualizer;
