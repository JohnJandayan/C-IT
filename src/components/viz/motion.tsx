import React from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import { useVisualizationStore } from '@/store/visualizationStore';

const loadFeatures = () => import('@/lib/motionFeatures').then((m) => m.default);

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduce = useVisualizationStore((s) => s.reduceMotion);
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
};

/** Animation duration (seconds) scaled to the playback speed. */
export function useStepDuration(): number {
  const speed = useVisualizationStore((s) => s.animationSpeed);
  const reduce = useVisualizationStore((s) => s.reduceMotion);
  if (reduce) return 0;
  return Math.max(0.12, Math.min(0.5, (speed / 1000) * 0.55));
}
