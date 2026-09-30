import React, { useLayoutEffect, useRef, useState } from 'react';
import * as m from 'motion/react-m';
import type { Move } from '@/viewmodel/view';
import { useStepDuration } from './motion';

interface Flight {
  key: string;
  text: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
}

/** Animates values "flying" from the cell they were read from to the cell they were written to. */
export const MoveOverlay: React.FC<{ container: React.RefObject<HTMLDivElement | null>; moves: Move[]; stepIndex: number }> = ({
  container,
  moves,
  stepIndex,
}) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const prev = useRef(stepIndex);
  const dur = useStepDuration();

  useLayoutEffect(() => {
    const forward = stepIndex > prev.current;
    prev.current = stepIndex;
    const root = container.current;
    if (!root || !forward || dur === 0 || moves.length === 0) {
      setFlights([]);
      return;
    }
    const base = root.getBoundingClientRect();
    const find = (addr: number, size: number) =>
      root.querySelector<HTMLElement>(`[data-addr="${addr}"][data-size="${size}"]`);
    const rect = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left + root.scrollLeft, y: r.top - base.top + root.scrollTop, w: r.width, h: r.height };
    };
    const out: Flight[] = [];
    moves.slice(0, 6).forEach((mv, i) => {
      const src = find(mv.from, mv.size);
      const dst = find(mv.to, mv.size);
      if (!src || !dst) return;
      out.push({ key: `${stepIndex}-${i}`, text: dst.textContent ?? '', from: rect(src), to: rect(dst) });
    });
    setFlights(out);
    const t = setTimeout(() => setFlights([]), dur * 1000 * 1.6 + 50);
    return () => clearTimeout(t);
  }, [stepIndex, moves, container, dur]);

  return (
    <>
      {flights.map((f) => (
        <m.div
          key={f.key}
          className="absolute z-30 pointer-events-none flex items-center justify-center rounded bg-orange-500 text-white font-mono font-bold text-sm shadow-lg shadow-orange-500/50"
          style={{ left: 0, top: 0, width: f.from.w, height: f.from.h }}
          initial={{ x: f.from.x, y: f.from.y, opacity: 0.95, scale: 1.05 }}
          animate={{ x: f.to.x, y: f.to.y, opacity: [0.95, 0.95, 0], scale: [1.1, 1.15, 1], width: f.to.w, height: f.to.h }}
          transition={{ duration: dur * 1.5, ease: 'easeInOut' }}
        >
          {f.text}
        </m.div>
      ))}
    </>
  );
};
