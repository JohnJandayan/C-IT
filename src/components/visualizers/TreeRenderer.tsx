import React, { useMemo } from 'react';
import * as m from 'motion/react-m';
import { useVisualizationStore } from '@/store/visualizationStore';
import type { TreeNodeShape, TreeShape } from '@/viewmodel/shapes';
import { hex } from '@/viewmodel/view';
import { useStepDuration } from '../viz/motion';

interface Placed {
  n: TreeNodeShape;
  x: number;
  y: number;
  parent: Placed | null;
}

const H_GAP = 52;
const V_GAP = 70;
const R = 22;

/** In-order x positions give a tidy, non-overlapping binary tree layout. */
function layout(root: TreeNodeShape): { nodes: Placed[]; width: number; height: number } {
  const nodes: Placed[] = [];
  let col = 0;
  let maxDepth = 0;
  const walk = (n: TreeNodeShape | null, depth: number, parent: Placed | null) => {
    if (!n) return;
    const p: Placed = { n, x: 0, y: depth * V_GAP + 40, parent };
    walk(n.left, depth + 1, p);
    p.x = col++ * H_GAP + 36;
    nodes.push(p);
    walk(n.right, depth + 1, p);
    maxDepth = Math.max(maxDepth, depth);
  };
  walk(root, 0, null);
  return { nodes, width: col * H_GAP + 40, height: (maxDepth + 1) * V_GAP + 30 };
}

const TreeRenderer: React.FC<{ shape: TreeShape }> = ({ shape }) => {
  const dur = useStepDuration();
  const stepKey = useVisualizationStore((s) => s.view?.index ?? 0);
  const select = useVisualizationStore((s) => s.select);
  const { nodes, width, height } = useMemo(() => layout(shape.root), [shape.root]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-yellow-300">
        binary tree <span className="text-gray-400">{shape.name}</span>
        <span className="ml-2 text-xs text-gray-500">{shape.size} node{shape.size === 1 ? '' : 's'}</span>
      </div>
      <svg width={Math.max(width, 120)} height={height} className="mx-auto block" role="img" aria-label={`Binary tree with ${shape.size} nodes`}>
        {nodes.map((p) =>
          p.parent ? (
            <m.line
              key={`e-${p.n.addr}`}
              initial={false}
              animate={{ x1: p.parent.x, y1: p.parent.y, x2: p.x, y2: p.y }}
              transition={{ duration: dur }}
              stroke={p.n.changed ? '#fb923c' : '#a16207'}
              strokeWidth="2"
            />
          ) : null
        )}
        {nodes.map((p) => {
          const text = p.n.data.map((d) => (d.node.kind === 'struct' ? '{…}' : d.node.text)).join(',');
          return (
            <m.g
              key={`n-${p.n.addr}`}
              initial={dur ? { opacity: 0, scale: 0.4, x: p.x, y: p.y } : false}
              animate={{ opacity: 1, scale: 1, x: p.x, y: p.y }}
              transition={{ duration: dur }}
              style={{ cursor: 'pointer' }}
              onClick={() => p.n.node && select({ addr: p.n.addr, size: p.n.node.size })}
            >
              <title>{`node @ ${hex(p.n.addr)}`}</title>
              <circle r={R} fill={p.n.changed ? '#f97316' : '#eab308'} stroke="#fde68a" strokeWidth={p.n.labels.length ? 3 : 1.5} />
              {p.n.changed && (
                <m.circle key={stepKey} r={R} fill="none" stroke="#fb923c" strokeWidth="3" initial={{ r: R, opacity: 1 }} animate={{ r: R + 12, opacity: 0 }} transition={{ duration: Math.max(dur * 2, 0.3) }} />
              )}
              <text textAnchor="middle" dominantBaseline="central" fill="#1f2937" fontSize={text.length > 4 ? 10 : 14} fontWeight="bold" fontFamily="monospace">
                {text}
              </text>
              {p.n.labels.length > 0 && (
                <text y={-R - 6} textAnchor="middle" fill="#fde047" fontSize="11" fontFamily="monospace" fontWeight="600">
                  {p.n.labels.join(',')}
                </text>
              )}
              {p.n.leftDangling && <text x={-R - 4} y={R + 10} fill="#f87171" fontSize="10">⚠</text>}
              {p.n.rightDangling && <text x={R} y={R + 10} fill="#f87171" fontSize="10">⚠</text>}
            </m.g>
          );
        })}
      </svg>
    </div>
  );
};

export default TreeRenderer;
