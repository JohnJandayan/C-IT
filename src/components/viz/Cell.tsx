import React from 'react';
import * as m from 'motion/react-m';
import { useVisualizationStore } from '@/store/visualizationStore';
import { hex, ValueNode } from '@/viewmodel/view';
import { useStepDuration } from './motion';

export function useSelected(addr: number, size: number): boolean {
  return useVisualizationStore((s) => {
    const sel = s.selection;
    if (!sel) return false;
    return sel.addr < addr + Math.max(size, 1) && addr < sel.addr + Math.max(sel.size, 1);
  });
}

interface CellProps {
  node: ValueNode;
  /** Tailwind classes for the value box (colors, size). */
  className?: string;
  label?: string;
  title?: string;
}

/** A single memory cell. Carries data-addr/data-size so arrows and moves can find it. */
export const Cell: React.FC<CellProps> = ({ node, className = '', title }) => {
  const stepKey = useVisualizationStore((s) => s.view?.index ?? 0);
  const select = useVisualizationStore((s) => s.select);
  const selected = useSelected(node.addr, node.size);
  const dur = useStepDuration();
  const isPtr = node.kind === 'pointer';
  const isNull = isPtr && !node.uninit && node.target === 0;
  const text = isPtr ? (node.uninit ? '?' : isNull ? 'NULL' : '') : node.text;
  return (
    <div
      data-addr={node.addr}
      data-size={node.size}
      data-ptr={isPtr && !node.uninit && !isNull ? node.target : undefined}
      data-ptr-size={isPtr ? node.targetSize : undefined}
      onClick={(e) => {
        e.stopPropagation();
        select(selected ? null : { addr: node.addr, size: node.size });
      }}
      title={title ?? `${node.type.str} @ ${hex(node.addr)}${node.uninit ? ' (uninitialized)' : ''}${isPtr && !node.uninit ? ` → ${hex(node.target ?? 0)}` : ''}`}
      className={`relative flex items-center justify-center font-mono cursor-pointer select-none transition-shadow duration-300 ${className} ${
        node.read && !node.changed ? 'ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''
      } ${selected ? 'outline outline-2 outline-offset-1 outline-blue-400' : ''} ${node.uninit ? 'text-gray-500 italic' : ''}`}
    >
      {node.changed && <span key={stepKey} className="cit-write-overlay" style={{ ['--cit-dur' as string]: `${Math.max(dur * 2, 0.3)}s` }} />}
      {isPtr && !node.uninit && !isNull ? (
        <span data-dot className="w-2.5 h-2.5 rounded-full bg-purple-300 shadow-[0_0_6px_rgba(216,180,254,0.9)]" />
      ) : (
        <m.span
          key={text}
          initial={dur ? { y: -8, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: dur }}
          className={`truncate px-1 ${isNull ? 'text-gray-400 text-xs' : ''}`}
        >
          {text}
        </m.span>
      )}
    </div>
  );
};

/** Compact recursive rendering of any value (used in the stack/heap diagram). */
export const ValueBox: React.FC<{ node: ValueNode; depth?: number }> = ({ node, depth = 0 }) => {
  if (node.kind === 'array') {
    const kids = node.children ?? [];
    const nested = kids.some((k) => k.node.kind === 'array' || k.node.kind === 'struct');
    return (
      <div data-addr={node.addr} data-size={node.size} className={`flex ${nested ? 'flex-col gap-1' : 'flex-row flex-wrap gap-0.5'}`}>
        {kids.map((k) => (
          <div key={k.label} className="flex flex-col items-center">
            {!nested && <span className="text-[9px] text-gray-500 leading-none mb-0.5">{k.label.slice(1, -1)}</span>}
            {nested ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 w-5 text-right">{k.label}</span>
                <ValueBox node={k.node} depth={depth + 1} />
              </div>
            ) : (
              <Cell node={k.node} className="min-w-[2.25rem] h-8 px-1 text-xs bg-gray-700 border border-gray-600 rounded" />
            )}
          </div>
        ))}
        {node.more ? <span className="text-xs text-gray-500 self-end">… +{node.more}</span> : null}
      </div>
    );
  }
  if (node.kind === 'struct') {
    return (
      <div data-addr={node.addr} data-size={node.size} className="border border-gray-600 rounded bg-gray-800/60">
        {(node.children ?? []).map((c) => (
          <div key={c.label} className="flex items-center gap-2 px-1.5 py-0.5 border-b border-gray-700 last:border-b-0">
            <span className="text-[11px] text-gray-400 font-mono min-w-[2.5rem]">{c.label}</span>
            {c.node.kind === 'array' || c.node.kind === 'struct' ? (
              <ValueBox node={c.node} depth={depth + 1} />
            ) : (
              <Cell node={c.node} className="min-w-[3rem] h-7 px-1 text-xs bg-gray-700 border border-gray-600 rounded" />
            )}
          </div>
        ))}
      </div>
    );
  }
  return <Cell node={node} className="min-w-[3rem] h-8 px-2 text-sm bg-gray-700 border border-gray-600 rounded" />;
};
