# Circular Audio Visualizer (React)

This component is built to drop into a Next.js/React player UI and uses the Web Audio API + `<canvas>` for a lightweight, zero-dependency circular frequency bar visualizer.

## Usage

```jsx
import CircularAudioVisualizer from "../components/CircularAudioVisualizer";

export default function NowPlaying({ audioRef, isPlaying }) {
  return (
    <div
      className="visualizer-container"
      style={{ width: "300px", height: "300px", margin: "auto" }}
    >
      <CircularAudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />
    </div>
  );
}
```

## Container styles

```css
.visualizer-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(200px, 40vw, 340px);
  aspect-ratio: 1;
  margin: 0 auto;
  position: relative;
}

.visualizer-container canvas {
  width: 100%;
  height: 100%;
}
```

## Integration notes

- Create the `AudioContext` in response to a user gesture (play button click). The visualizer resumes the context when `isPlaying` becomes true.
- If your audio sources are remote, add `crossOrigin="anonymous"` to the `<audio>` element.
- The component renders a subtle idle glow when paused and switches to full reactive animation while playing.
- A low-frequency average drives the center pulse/glow for a lightweight beat accent.
