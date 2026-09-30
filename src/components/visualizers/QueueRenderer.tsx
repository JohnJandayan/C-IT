import React from 'react';
import * as m from 'motion/react-m';
import type { ContainerShape } from '@/viewmodel/shapes';
import { Cell } from '../viz/Cell';
import { useStepDuration } from '../viz/motion';

const QueueRenderer: React.FC<{ shape: ContainerShape }> = ({ shape }) => {
  const dur = useStepDuration();
  const occupied = new Set(shape.occupied);
  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-cyan-300">
        queue <span className="text-gray-400">{shape.name}</span>
        <span className="ml-2 text-xs text-gray-500">
          front = {shape.front} · rear = {shape.rear} · {shape.occupied.length}/{shape.cells.length} used
        </span>
      </div>
      <div className="flex gap-2">
        {shape.cells.slice(0, 32).map((c, idx) => {
          const used = occupied.has(idx);
          return (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 mb-1">[{idx}]</span>
              <m.div initial={false} animate={{ opacity: used ? 1 : 0.35, y: used ? 0 : 4 }} transition={{ duration: dur }}>
                <Cell
                  node={c}
                  className={`w-14 h-14 rounded font-bold shadow ${used ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-500 border border-dashed border-gray-600'}`}
                />
              </m.div>
              <div className="h-8 flex flex-col items-center text-[11px] font-mono font-semibold leading-tight">
                {idx === shape.front && <span className="text-green-300">↑front</span>}
                {idx === shape.rear && <span className="text-pink-300">↑rear</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueRenderer;
