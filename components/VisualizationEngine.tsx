import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Points, PointMaterial, PerspectiveCamera } from "@react-three/drei";
import { Bloom, EffectComposer, Scanline, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

type AudioBands = {
  bass: number;
  mid: number;
  high: number;
  energy: number;
  spectrum: Float32Array;
};

export type VisualizationMode =
  | "orb"
  | "neon-bars"
  | "particle-field"
  | "wireframe-lattice"
  | "waveform-tunnel"
  | "holographic-rings";

export type VisualizationEngineProps = {
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;
  bufferLength: number;
  mode: VisualizationMode;
  onModeChange?: (mode: VisualizationMode) => void;
  lowQuality?: boolean;
  className?: string;
};

const MODE_LABELS: Record<VisualizationMode, string> = {
  orb: "🧊 Orb",
  "neon-bars": "📊 Neon Bars",
  "particle-field": "✨ Particle Field",
  "wireframe-lattice": "🕸️ Lattice",
  "waveform-tunnel": "🚇 Wave Tunnel",
  "holographic-rings": "🪩 Rings",
};

const BAND_COUNT = 64;
const NEON_COLORS = {
  cyan: new THREE.Color("#45f3ff"),
  purple: new THREE.Color("#b057ff"),
  gold: new THREE.Color("#ffb95e"),
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

const getBandEnergy = (spectrum: Float32Array, start: number, end: number) => {
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += spectrum[i] || 0;
  }
  return total / Math.max(1, end - start);
};

// Samples analyser data and smooths into bass/mid/high bands for all modes.
const AudioReactiveUpdater = ({
  analyser,
  dataArray,
  bufferLength,
  lowQuality,
  audioRef,
}: {
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;
  bufferLength: number;
  lowQuality?: boolean;
  audioRef: MutableRefObject<AudioBands>;
}) => {
  const lastUpdateRef = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const targetFrameTime = lowQuality ? 1 / 30 : 1 / 60;

    if (now - lastUpdateRef.current < targetFrameTime) {
      return;
    }

    lastUpdateRef.current = now;

    if (!analyser || !dataArray) {
      const idlePulse = 0.15 + Math.sin(now * 0.8) * 0.05;
      audioRef.current = {
        bass: idlePulse,
        mid: idlePulse * 0.8,
        high: idlePulse * 0.6,
        energy: idlePulse,
        spectrum: audioRef.current.spectrum,
      };
      return;
    }

    // Pull frequency bins and ease into a fixed-size spectrum for consistent visuals.
    analyser.getByteFrequencyData(dataArray);
    const spectrum = audioRef.current.spectrum;
    const step = Math.max(1, Math.floor(bufferLength / BAND_COUNT));

    for (let i = 0; i < BAND_COUNT; i += 1) {
      const value = dataArray[i * step] || 0;
      spectrum[i] = lerp(spectrum[i], value / 255, 0.4);
    }

    const bass = getBandEnergy(spectrum, 0, 10);
    const mid = getBandEnergy(spectrum, 10, 32);
    const high = getBandEnergy(spectrum, 32, 64);

    audioRef.current = {
      bass,
      mid,
      high,
      energy: clamp((bass + mid + high) / 3, 0, 1),
      spectrum,
    };
  });

  return null;
};

// Translucent icosahedron with bass-driven pulse + additive glow particles.
const OrbVisualizer = ({ audio }: { audio: MutableRefObject<AudioBands> }) => {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 1.6 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    const { bass, energy } = audio.current;
    const pulse = 1 + bass * 0.4;
    if (orbRef.current) {
      orbRef.current.scale.setScalar(pulse);
      orbRef.current.rotation.y = clock.elapsedTime * 0.25;
      orbRef.current.rotation.x = clock.elapsedTime * 0.15;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.3 + energy * 0.25);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.35 + energy * 0.45;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = clock.elapsedTime * 0.4;
      const scale = 1 + bass * 0.6;
      particlesRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[1.1, 3]} />
        <meshPhysicalMaterial
          transmission={0.9}
          roughness={0.1}
          thickness={1.2}
          envMapIntensity={1.4}
          clearcoat={1}
          color="#7af7ff"
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#ffbf7a"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particles}
            count={particles.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#b057ff"
          size={0.06}
          opacity={0.7}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
};

// HUD-style neon bars with spectrum-driven height and emissive gradients.
const NeonBarsVisualizer = ({
  audio,
  lowQuality,
}: {
  audio: MutableRefObject<AudioBands>;
  lowQuality?: boolean;
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = lowQuality ? 48 : 72;
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const mix = i / count;
      return NEON_COLORS.cyan.clone().lerp(NEON_COLORS.purple, mix);
    });
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }
    colors.forEach((color, index) => {
      meshRef.current?.setColorAt(index, color);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [colors]);

  useFrame(() => {
    const { spectrum, energy } = audio.current;
    if (!meshRef.current) {
      return;
    }
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.4;
      const height = 0.6 + (spectrum[i] || 0) * 2.2;
      tempObject.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        -0.4 + Math.sin(angle * 2) * 0.3
      );
      tempObject.rotation.z = angle + Math.PI / 2;
      tempObject.scale.set(0.12, height, 0.2 + energy * 0.2);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        emissive="#7af7ff"
        emissiveIntensity={0.6}
        roughness={0.2}
      />
    </instancedMesh>
  );
};

// GPU-friendly points cloud that blooms with overall energy.
const ParticleFieldVisualizer = ({
  audio,
  lowQuality,
}: {
  audio: MutableRefObject<AudioBands>;
  lowQuality?: boolean;
}) => {
  const particleCount = lowQuality ? 1600 : 3200;
  const positions = useMemo(() => {
    const array = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      array[i * 3 + 2] = radius * Math.cos(phi);
    }
    return array;
  }, [particleCount]);
  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    const { energy } = audio.current;
    if (!pointsRef.current) {
      return;
    }
    pointsRef.current.rotation.y = clock.elapsedTime * 0.2;
    pointsRef.current.rotation.x = clock.elapsedTime * 0.1;
    pointsRef.current.scale.setScalar(1 + energy * 0.4);
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        color="#7af7ff"
        size={0.05}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={0.8}
      />
    </Points>
  );
};

// Glowing wireframe lattice that distorts on bass/highs for subtle glitch.
const WireframeLatticeVisualizer = ({
  audio,
}: {
  audio: MutableRefObject<AudioBands>;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const { bass, high } = audio.current;
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.4;
      meshRef.current.rotation.x = clock.elapsedTime * 0.2;
      meshRef.current.scale.setScalar(1.2 + bass * 0.5);
      (meshRef.current.material as THREE.MeshBasicMaterial).color.lerpColors(
        NEON_COLORS.purple,
        NEON_COLORS.cyan,
        high
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[1.6, 0]} />
      <meshBasicMaterial wireframe color="#b057ff" />
    </mesh>
  );
};

// Infinite ring tunnel with mid-driven expansion and forward motion.
const WaveformTunnelVisualizer = ({
  audio,
}: {
  audio: MutableRefObject<AudioBands>;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(
    () =>
      new Array(40).fill(0).map((_, index) => ({
        id: index,
        z: -index * 0.6,
      })),
    []
  );

  useFrame(({ clock }) => {
    const { mid, energy } = audio.current;
    if (!groupRef.current) {
      return;
    }
    groupRef.current.rotation.z = clock.elapsedTime * 0.1;
    groupRef.current.children.forEach((child, index) => {
      const progress = (clock.elapsedTime * (1 + energy * 1.2) + index) % 24;
      child.position.z = -progress;
      const scale = 1 + (mid * 0.4 + index * 0.01);
      child.scale.setScalar(scale);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring) => (
        <line key={ring.id} position={[0, 0, ring.z]}>
          <ringGeometry args={[1.4, 1.6, 64]} />
          <lineBasicMaterial color="#7af7ff" transparent opacity={0.6} />
        </line>
      ))}
    </group>
  );
};

// Floating holographic rings with scanline-ready opacity shifts.
const HolographicRingsVisualizer = ({
  audio,
}: {
  audio: MutableRefObject<AudioBands>;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => new Array(6).fill(0).map((_, i) => i), []);

  useFrame(({ clock }) => {
    const { bass, mid, high } = audio.current;
    if (!groupRef.current) {
      return;
    }
    groupRef.current.rotation.y = clock.elapsedTime * 0.2;
    groupRef.current.children.forEach((child, index) => {
      const tilt = Math.sin(clock.elapsedTime * 0.6 + index) * 0.2;
      child.rotation.x = tilt + bass * 0.4;
      child.scale.setScalar(1 + index * 0.2 + mid * 0.4);
      (child as THREE.Mesh).material.opacity = 0.3 + high * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring) => (
        <mesh key={ring} position={[0, 0, ring * -0.1]}>
          <torusGeometry args={[1.2 + ring * 0.2, 0.02, 16, 100]} />
          <meshBasicMaterial
            color={NEON_COLORS.cyan}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

const VisualizationSwitcher = ({
  mode,
  audio,
  lowQuality,
}: {
  mode: VisualizationMode;
  audio: MutableRefObject<AudioBands>;
  lowQuality?: boolean;
}) => {
  switch (mode) {
    case "orb":
      return <OrbVisualizer audio={audio} />;
    case "neon-bars":
      return <NeonBarsVisualizer audio={audio} lowQuality={lowQuality} />;
    case "particle-field":
      return <ParticleFieldVisualizer audio={audio} lowQuality={lowQuality} />;
    case "wireframe-lattice":
      return <WireframeLatticeVisualizer audio={audio} />;
    case "waveform-tunnel":
      return <WaveformTunnelVisualizer audio={audio} />;
    case "holographic-rings":
      return <HolographicRingsVisualizer audio={audio} />;
    default:
      return null;
  }
};

export const VisualizationSelector = ({
  mode,
  onChange,
}: {
  mode: VisualizationMode;
  onChange: (mode: VisualizationMode) => void;
}) => {
  return (
    <div className="visualizer-selector" role="tablist" aria-label="Visualizer">
      {Object.entries(MODE_LABELS).map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`visualizer-selector__button${
            mode === key ? " visualizer-selector__button--active" : ""
          }`}
          onClick={() => onChange(key as VisualizationMode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export const VisualizationEngine = ({
  analyser,
  dataArray,
  bufferLength,
  mode,
  onModeChange,
  lowQuality,
  className,
}: VisualizationEngineProps) => {
  const audioRef = useRef<AudioBands>({
    bass: 0,
    mid: 0,
    high: 0,
    energy: 0,
    spectrum: new Float32Array(BAND_COUNT),
  });
  const [controlsEnabled] = useState(false);

  return (
    <div className={className ?? "visualization-engine"}>
      <Canvas
        dpr={lowQuality ? 1 : [1, 2]}
        gl={{ antialias: !lowQuality, alpha: true }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <color attach="background" args={["#05050d"]} />
        <ambientLight intensity={0.4} color={NEON_COLORS.cyan} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={0.8}
          color={NEON_COLORS.gold}
        />
        <AudioReactiveUpdater
          analyser={analyser}
          dataArray={dataArray}
          bufferLength={bufferLength}
          lowQuality={lowQuality}
          audioRef={audioRef}
        />
        <VisualizationSwitcher mode={mode} audio={audioRef} lowQuality={lowQuality} />
        {!lowQuality && (
          <EffectComposer>
            <Bloom intensity={1.2} luminanceThreshold={0.1} mipmapBlur />
            <Scanline density={1.1} opacity={0.1} />
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
          </EffectComposer>
        )}
        {controlsEnabled && <OrbitControls enableZoom={false} />}
      </Canvas>
      {onModeChange && (
        <VisualizationSelector mode={mode} onChange={onModeChange} />
      )}
    </div>
  );
};

export default VisualizationEngine;
