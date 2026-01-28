import { useMemo, useState } from "react";
import VisualizationEngine, {
  type VisualizationMode,
} from "./VisualizationEngine";

const DEFAULT_MODE: VisualizationMode = "orb";

type MusicPlayerProps = {
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;
  bufferLength: number;
};

const MusicPlayer = ({ analyser, dataArray, bufferLength }: MusicPlayerProps) => {
  const [mode, setMode] = useState<VisualizationMode>(DEFAULT_MODE);
  const lowQuality = useMemo(
    () => typeof window !== "undefined" && window.innerWidth < 768,
    []
  );

  return (
    <section className="music-player">
      <header className="music-player__header">
        <h2>Àríyò AI Visualizer</h2>
        <p>Premium, audio-reactive scenes for immersive listening.</p>
      </header>
      <VisualizationEngine
        analyser={analyser}
        dataArray={dataArray}
        bufferLength={bufferLength}
        mode={mode}
        onModeChange={setMode}
        lowQuality={lowQuality}
        className="music-player__visualizer"
      />
    </section>
  );
};

export default MusicPlayer;
