import React from 'react';

interface GraphicalVisualizerProps {
  step: Record<string, any>;
}

// Helper to render an arrow (SVG)
function Arrow({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width={Math.abs(dx) + 40} height={Math.abs(dy) + 40}>
      <g transform={`translate(${fromX},${fromY})`}>
        <line x1={0} y1={0} x2={dx} y2={dy} stroke="#6366f1" strokeWidth={2} markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,8 L8,4 Z" fill="#6366f1" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

// MVP: Visualize arrays, pointers, linked lists, and binary trees
export default function GraphicalVisualizer({ step }: GraphicalVisualizerProps) {
  // Detect arrays (e.g., arr[0], arr[1], ...)
  const arrayGroups: Record<string, number[]> = {};
  Object.keys(step).forEach((key) => {
    const match = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
    if (match) {
      const arrName = match[1];
      const idx = parseInt(match[2], 10);
      if (!arrayGroups[arrName]) arrayGroups[arrName] = [];
      arrayGroups[arrName][idx] = step[key];
    }
  });

  // Detect pointers (e.g., p=address)
  const pointers: { name: string; value: number }[] = [];
  Object.keys(step).forEach((key) => {
    if (key.endsWith('_ptr')) {
      pointers.push({ name: key.replace('_ptr', ''), value: step[key] });
    }
  });

  // Detect linked list nodes (heuristic: nodeX, nodeX_next)
  const nodes: { name: string; value: number; next?: string }[] = [];
  Object.keys(step).forEach((key) => {
    const nodeMatch = key.match(/(node\d+)_data/);
    if (nodeMatch) {
      const nodeName = nodeMatch[1];
      const value = step[key];
      const nextKey = nodeName + '_next';
      const next = step[nextKey] !== undefined ? step[nextKey] : undefined;
      nodes.push({ name: nodeName, value, next });
    }
  });

  // Detect binary tree nodes (heuristic: treeX, treeX_left, treeX_right)
  const treeNodes: { name: string; value: number; left?: string; right?: string }[] = [];
  Object.keys(step).forEach((key) => {
    const treeMatch = key.match(/(tree\d+)_data/);
    if (treeMatch) {
      const nodeName = treeMatch[1];
      const value = step[key];
      const leftKey = nodeName + '_left';
      const rightKey = nodeName + '_right';
      const left = step[leftKey] !== undefined ? step[leftKey] : undefined;
      const right = step[rightKey] !== undefined ? step[rightKey] : undefined;
      treeNodes.push({ name: nodeName, value, left, right });
    }
  });

  return (
    <div className="flex flex-col gap-6 items-center relative">
      {/* Arrays */}
      {Object.keys(arrayGroups).map((arr) => (
        <div key={arr} className="flex flex-col items-center">
          <div className="mb-1 font-semibold">{arr}[]</div>
          <div className="flex gap-2">
            {arrayGroups[arr].map((val, idx) => (
              <div key={idx} className="w-12 h-12 flex items-center justify-center border-2 border-primary-500 bg-primary-50 rounded font-mono text-lg">
                {val}
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Pointers (MVP: just show value) */}
      {pointers.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="mb-1 font-semibold">Pointers</div>
          <div className="flex gap-4">
            {pointers.map((ptr) => (
              <div key={ptr.name} className="flex flex-col items-center">
                <span className="font-mono">{ptr.name}</span>
                <span className="w-20 h-8 flex items-center justify-center border-2 border-accent-500 bg-accent-50 rounded font-mono text-base">{ptr.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Linked List Visualization */}
      {nodes.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="mb-1 font-semibold">Linked List</div>
          <div className="flex gap-4 items-center relative">
            {nodes.map((node, idx) => (
              <React.Fragment key={node.name}>
                <div className="w-16 h-16 flex flex-col items-center justify-center border-2 border-green-500 bg-green-50 rounded font-mono text-lg relative">
                  <span>{node.value}</span>
                  <span className="text-xs text-green-700">{node.name}</span>
                </div>
                {node.next !== undefined && idx < nodes.length - 1 && (
                  <span className="text-green-700 text-2xl">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* Binary Tree Visualization (simple horizontal layout) */}
      {treeNodes.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="mb-1 font-semibold">Binary Tree</div>
          <div className="flex gap-8 items-center relative">
            {treeNodes.map((node) => (
              <div key={node.name} className="w-16 h-16 flex flex-col items-center justify-center border-2 border-purple-500 bg-purple-50 rounded font-mono text-lg relative">
                <span>{node.value}</span>
                <span className="text-xs text-purple-700">{node.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 