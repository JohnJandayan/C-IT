import React from 'react';
import * as m from 'motion/react-m';
import type { ContainerShape } from '@/viewmodel/shapes';
import { Cell } from '../viz/Cell';
import { useStepDuration } from '../viz/motion';

/** Array-based stack: bottom at the bottom, top marker on the right. */
const StackRenderer: React.FC<{ shape: ContainerShape }> = ({ shape }) => {
  const dur = useStepDuration();
  const occupied = new Set(shape.occupied);
  const shown = shape.cells.slice(0, Math.min(shape.cells.length, 24));
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="font-mono text-sm mb-3 text-red-300">
        stack <span className="text-gray-400">{shape.name}</span>
        <span className="ml-2 text-xs text-gray-500">
          top = {shape.top} · {shape.occupied.length}/{shape.cells.length} used
        </span>
      </div>
      <div className="flex flex-col-reverse gap-1.5 max-w-xs">
        {shown.map((c, idx) => {
          const used = occupied.has(idx);
          const isTop = idx === shape.top;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-6 text-right">[{idx}]</span>
              <m.div
                className="flex-1"
                initial={false}
                animate={{ opacity: used ? 1 : 0.35, x: used ? 0 : 6 }}
                transition={{ duration: dur }}
              >
                <Cell
                  node={c}
                  className={`w-full h-10 rounded font-bold shadow ${
                    used ? (isTop ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-300' : 'bg-red-600 text-white') : 'bg-gray-700 text-gray-500 border border-dashed border-gray-600'
                  }`}
                />
              </m.div>
              <span className="w-12 text-xs font-mono text-yellow-300">{isTop ? '← top' : ''}</span>
            </div>
          );
        })}
        <div className="w-full h-1 bg-gray-600 rounded ml-8" />
      </div>
      {shape.top !== undefined && shape.top < 0 && <div className="text-xs text-gray-500 mt-2 italic">empty (top = {shape.top})</div>}
    </div>
  );
};

export default StackRenderer;
