import React from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { useVisualizationStore } from '@/store/visualizationStore';
import type { ListShape } from '@/viewmodel/shapes';
import { hex } from '@/viewmodel/view';
import { useStepDuration } from '../viz/motion';

const Arrow: React.FC<{ doubly: boolean }> = ({ doubly }) => (
  <svg width="44" height="24" className="text-purple-400 flex-shrink-0" aria-hidden="true">
    <line x1="2" y1={doubly ? 8 : 12} x2="36" y2={doubly ? 8 : 12} stroke="currentColor" strokeWidth="2" />
    <polygon points={`36,${doubly ? 3 : 7} 44,${doubly ? 8 : 12} 36,${doubly ? 13 : 17}`} fill="currentColor" />
    {doubly && (
      <>
        <line x1="8" y1="17" x2="42" y2="17" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="8,13 0,17 8,21" fill="#a78bfa" />
      </>
    )}
  </svg>
);

const LinkedListRenderer: React.FC<{ shape: ListShape }> = ({ shape }) => {
  const dur = useStepDuration();
  const stepKey = useVisualizationStore((s) => s.view?.index ?? 0);
  const select = useVisualizationStore((s) => s.select);
  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-purple-300">
        {shape.doubly ? 'doubly linked list' : 'linked list'} <span className="text-gray-400">{shape.name}</span>
        <span className="ml-2 text-xs text-gray-500">{shape.nodes.length} node{shape.nodes.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex items-center pt-6 pb-1 min-w-max">
        <AnimatePresence initial={false}>
          {shape.nodes.map((n, idx) => (
            <m.div
              key={n.addr}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.8 }}
              transition={{ duration: dur }}
              className="flex items-center"
            >
              <div className="relative flex flex-col items-center">
                {n.labels.length > 0 && (
                  <div className="absolute -top-6 flex gap-1 whitespace-nowrap">
                    {n.labels.map((l) => (
                      <m.span key={l} layoutId={`lbl-${shape.key}-${l}`} className="text-[11px] font-mono text-yellow-300 font-semibold">
                        {l}↓
                      </m.span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => n.node && select({ addr: n.addr, size: n.node.size })}
                  className={`relative flex rounded-lg overflow-hidden shadow-lg border-2 ${n.changed ? 'border-orange-400' : 'border-purple-400/60'}`}
                  title={`node @ ${hex(n.addr)}`}
                >
                  {n.changed && <span key={stepKey} className="cit-write-overlay" />}
                  <div className="bg-purple-600 px-3 py-2 min-w-[3.5rem] text-center">
                    {n.data.map((d) => (
                      <div key={d.label} className="text-white font-bold text-lg leading-tight font-mono" title={d.label}>
                        {d.node.kind === 'struct' ? '{…}' : d.node.text}
                      </div>
                    ))}
                    <div className="text-[9px] text-purple-200 mt-0.5">{hex(n.addr).slice(-6)}</div>
                  </div>
                  <div className="bg-purple-800 w-6 flex items-center justify-center" title="next">
                    <span className="w-2 h-2 rounded-full bg-purple-200" />
                  </div>
                </button>
              </div>
              {idx < shape.nodes.length - 1 && <Arrow doubly={shape.doubly} />}
            </m.div>
          ))}
        </AnimatePresence>
        {shape.cycleTo !== null ? (
          <div className="flex items-center ml-1 text-sm text-pink-300 font-mono">
            <Arrow doubly={false} /> ↺ back to node #{shape.cycleTo + 1} (cycle!)
          </div>
        ) : shape.dangling ? (
          <div className="flex items-center ml-1 text-sm text-red-400 font-mono">
            <Arrow doubly={false} /> ⚠ {shape.dangling}
          </div>
        ) : (
          <div className="flex items-center">
            <svg width="40" height="20" className="text-gray-500" aria-hidden="true">
              <line x1="0" y1="10" x2="35" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
            </svg>
            <div className="text-gray-500 text-sm font-mono">NULL</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedListRenderer;
