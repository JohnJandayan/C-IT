import { useEffect } from 'react';
import { timeline, useVisualizationStore } from '@/store/visualizationStore';

/** Advances one step every `animationSpeed` ms while playing (waits if the trace is still streaming). */
export function usePlayback(): void {
  const isPlaying = useVisualizationStore((s) => s.isPlaying);
  const speed = useVisualizationStore((s) => s.animationSpeed);
  const cursor = useVisualizationStore((s) => s.cursor);
  const stepCount = useVisualizationStore((s) => s.stepCount);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      const st = useVisualizationStore.getState();
      if (!st.isPlaying) return;
      const before = st.cursor;
      st.nextStep();
      const after = useVisualizationStore.getState();
      const streaming = after.status === 'running' || after.status === 'compiling';
      if (after.cursor === before && !streaming) after.pause();
      // Stop at breakpoints while playing.
      const s = timeline.steps[after.cursor];
      if (s && after.cursor !== before && after.breakpoints.includes(s.l) && s.k === 0) after.pause();
    }, speed);
    return () => clearTimeout(timer);
  }, [isPlaying, speed, cursor, stepCount]);
}
