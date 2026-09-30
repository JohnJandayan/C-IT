import React, { useLayoutEffect, useState } from 'react';
import * as m from 'motion/react-m';
import { useStepDuration } from './motion';

interface Arrow {
  key: string;
  d: string;
  dangling: boolean;
  x2: number;
  y2: number;
}

interface Props {
  container: React.RefObject<HTMLDivElement | null>;
  /** Changes whenever the rendered state changes. */
  version: unknown;
  /** Returns true when an address points into freed/invalid memory. */
  isDangling?: (addr: number) => boolean;
}

/** Draws curved arrows from every [data-ptr] cell to the most specific [data-addr] element it points into. */
export const PointerArrows: React.FC<Props> = ({ container, version, isDangling }) => {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dur = useStepDuration();

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const compute = () => {
      const base = root.getBoundingClientRect();
      const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-addr]')).map((el) => ({
        el,
        addr: Number(el.dataset.addr),
        size: Math.max(Number(el.dataset.size) || 1, 1),
      }));
      const out: Arrow[] = [];
      const sources = root.querySelectorAll<HTMLElement>('[data-ptr]');
      sources.forEach((src, i) => {
        const target = Number(src.dataset.ptr);
        const wantSize = Number(src.dataset.ptrSize) || 0;
        let best: { el: HTMLElement; size: number } | null = null;
        let exact: { el: HTMLElement; size: number } | null = null;
        for (const t of targets) {
          if (t.el === src || t.el.contains(src)) continue;
          if (t.addr === target && t.size === wantSize && (!exact || t.el.contains(exact.el))) exact = t;
          if (target >= t.addr && target < t.addr + t.size && (!best || t.size < best.size || (t.size === best.size && t.el.contains(best.el)))) {
            best = t;
          }
        }
        // Prefer the element that is exactly the pointed-to object (e.g. a whole struct node).
        if (exact && wantSize > 8) best = exact;
        const dot = src.querySelector<HTMLElement>('[data-dot]') ?? src;
        const a = dot.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - base.left + root.scrollLeft;
        const y1 = a.top + a.height / 2 - base.top + root.scrollTop;
        let x2: number;
        let y2: number;
        let dangling = false;
        if (best) {
          const b = best.el.getBoundingClientRect();
          const left = b.left - base.left + root.scrollLeft;
          const right = b.right - base.left + root.scrollLeft;
          const top = b.top - base.top + root.scrollTop;
          const cx = (left + right) / 2;
          // Enter from whichever side is closer.
          if (Math.abs(left - x1) < Math.abs(right - x1) || left > x1) {
            x2 = left - 2;
          } else {
            x2 = right + 2;
          }
          if (Math.abs(cx - x1) < 30 && b.height < 60) x2 = cx;
          y2 = top + Math.min(b.height / 2, 16);
          dangling = isDangling?.(target) ?? false;
        } else {
          // Pointer into memory we are not drawing: short stub.
          x2 = x1 + 28;
          y2 = y1 - 14;
          dangling = true;
        }
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        const dir = x2 >= x1 ? 1 : -1;
        const d = `M ${x1} ${y1} C ${x1 + dx * dir} ${y1}, ${x2 - dx * dir * 0.3} ${y2}, ${x2} ${y2}`;
        out.push({ key: src.dataset.addr ?? String(i), d, dangling, x2, y2 });
      });
      setArrows(out);
      setSize({ w: root.scrollWidth, h: root.scrollHeight });
    };
    compute();
    // Re-measure after layout animations settle and when exiting elements are removed.
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    const t = setTimeout(compute, Math.max(dur * 1000, 50) + 60);
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [container, version, dur, isDangling]);

  return (
    <svg className="absolute top-0 left-0 pointer-events-none z-20 overflow-visible" width={size.w} height={size.h} aria-hidden="true">
      <defs>
        <marker id="cit-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#c084fc" />
        </marker>
        <marker id="cit-arrow-bad" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#f87171" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <m.path
          key={a.key}
          initial={false}
          animate={{ d: a.d }}
          transition={{ duration: dur }}
          fill="none"
          stroke={a.dangling ? '#f87171' : '#c084fc'}
          strokeWidth={1.75}
          strokeDasharray={a.dangling ? '4 3' : undefined}
          markerEnd={a.dangling ? 'url(#cit-arrow-bad)' : 'url(#cit-arrow)'}
          opacity={0.9}
        />
      ))}
    </svg>
  );
};
