import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { hex, ViewState, VarView } from '@/viewmodel/view';
import { ValueBox } from './Cell';
import { useStepDuration } from './motion';

const MAX_FRAMES = 12;

const VarRow: React.FC<{ v: VarView }> = ({ v }) => (
  <div className="flex items-start gap-3 py-1 border-b border-gray-700/60 last:border-b-0">
    <span className="font-mono text-sm text-gray-200 min-w-[4rem] pt-1.5 text-right" title={v.node.type.str}>
      {v.name}
      {v.isParam && <span className="block text-[9px] text-gray-500 leading-none">param</span>}
    </span>
    <ValueBox node={v.node} />
  </div>
);

export const FramesHeapView: React.FC<{ view: ViewState }> = ({ view }) => {
  const dur = useStepDuration();
  const [showFreed, setShowFreed] = useState(true);
  const frames = view.frames;
  const hidden = Math.max(0, frames.length - MAX_FRAMES);
  const shownFrames = hidden ? frames.slice(-MAX_FRAMES) : frames;
  const heap = view.heap.filter((h) => showFreed || !h.freed).slice(-40);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
      {/* Stack */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-md font-semibold text-orange-400">Stack</h4>
          <span className="text-[10px] text-gray-500">grows toward lower addresses ↓</span>
        </div>
        {view.globals.length > 0 && (
          <div className="mb-3 rounded-lg border border-teal-700 bg-gray-800/80 overflow-hidden">
            <div className="px-3 py-1 bg-teal-900/60 text-teal-200 text-xs font-semibold font-mono">globals</div>
            <div className="px-3 py-1">
              {view.globals.map((g) => (
                <VarRow key={`${g.name}-${g.node.addr}`} v={{ ...g, name: g.staticIn ? `${g.staticIn}::${g.name}` : g.name }} />
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {hidden > 0 && (
            <div className="text-xs text-gray-500 italic text-center">… {hidden} outer frames hidden (deep recursion) …</div>
          )}
          <AnimatePresence initial={false}>
            {shownFrames.map((f, i) => (
                <m.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: dur } }}
                  transition={{ duration: dur }}
                  className={`rounded-lg border bg-gray-800/80 overflow-hidden ${f.isCurrent ? 'border-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.25)]' : 'border-gray-600'}`}
                >
                  <div className={`px-3 py-1 text-xs font-semibold font-mono flex justify-between ${f.isCurrent ? 'bg-orange-900/60 text-orange-200' : 'bg-gray-700/60 text-gray-300'}`}>
                    <span>{f.fn}()</span>
                    {(i > 0 || hidden > 0) && f.callLine > 0 && <span className="text-gray-400 font-normal">called at line {f.callLine}</span>}
                  </div>
                  <div className="px-3 py-1">
                    {f.vars.length === 0 ? (
                      <div className="text-xs text-gray-500 italic py-1">no variables yet</div>
                    ) : (
                      f.vars.map((v) => <VarRow key={`${v.name}-${v.node.addr}`} v={v} />)
                    )}
                  </div>
                </m.div>
            ))}
          </AnimatePresence>
          {frames.length === 0 && <div className="text-sm text-gray-500 italic">No active function calls</div>}
        </div>
      </div>

      {/* Heap */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-md font-semibold text-red-400">Heap</h4>
          {view.heap.some((h) => h.freed) && (
            <label className="text-[11px] text-gray-400 flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showFreed} onChange={(e) => setShowFreed(e.target.checked)} className="accent-red-500" />
              show freed
            </label>
          )}
        </div>
        {heap.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No dynamic allocations (malloc/calloc)</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {heap.map((h) => (
                <m.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: h.freed ? 0.45 : 1, scale: 1, filter: h.freed ? 'grayscale(1)' : 'grayscale(0)' }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: dur }}
                  data-addr={h.addr}
                  data-size={h.size}
                  className={`rounded-lg border overflow-hidden bg-gray-800/80 ${h.freed ? 'border-dashed border-gray-600' : 'border-red-700'}`}
                >
                  <div className={`px-3 py-1 text-xs font-mono flex justify-between gap-2 ${h.freed ? 'bg-gray-700/60 text-gray-400' : 'bg-red-900/50 text-red-200'}`}>
                    <span className="font-semibold">
                      heap#{h.id} <span className="font-normal text-gray-400">{h.count > 1 && h.typeLabel !== 'bytes' ? `${h.typeLabel}[${h.count}]` : h.typeLabel}</span>
                    </span>
                    <span className="text-gray-400">
                      {h.size} B · {hex(h.addr)} · line {h.line}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    {h.freed ? (
                      <div className="text-xs text-gray-400 italic">freed at line {h.freedLine} — using this memory now is a bug</div>
                    ) : h.node ? (
                      <ValueBox node={h.node} />
                    ) : (
                      <div className="text-xs text-gray-500">(empty)</div>
                    )}
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
