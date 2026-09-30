import React, { Suspense, useCallback, useRef, useState } from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';
import type { Shape } from '@/viewmodel/shapes';
import ArrayRenderer from './visualizers/ArrayRenderer';
import LinkedListRenderer from './visualizers/LinkedListRenderer';
import TreeRenderer from './visualizers/TreeRenderer';
import StackRenderer from './visualizers/StackRenderer';
import QueueRenderer from './visualizers/QueueRenderer';
import { FramesHeapView } from './viz/FramesHeapView';
import { PointerArrows } from './viz/PointerArrows';
import { MoveOverlay } from './viz/MoveOverlay';
import { MotionProvider } from './viz/motion';

const MemoryView = React.lazy(() => import('./MemoryView'));

const SECTION: Record<string, { title: string; color: string }> = {
  array: { title: 'Arrays', color: 'text-green-400' },
  string: { title: 'Strings', color: 'text-emerald-400' },
  matrix: { title: 'Matrices', color: 'text-green-400' },
  stack: { title: 'Stacks', color: 'text-red-400' },
  queue: { title: 'Queues', color: 'text-cyan-400' },
  list: { title: 'Linked Lists', color: 'text-purple-400' },
  tree: { title: 'Trees', color: 'text-yellow-400' },
};

const ShapeView: React.FC<{ shape: Shape }> = ({ shape }) => {
  switch (shape.kind) {
    case 'array':
    case 'string':
    case 'matrix':
      return <ArrayRenderer shape={shape} />;
    case 'list':
      return <LinkedListRenderer shape={shape} />;
    case 'tree':
      return <TreeRenderer shape={shape} />;
    case 'stack':
      return <StackRenderer shape={shape} />;
    case 'queue':
      return <QueueRenderer shape={shape} />;
  }
};

const Collapsible: React.FC<{ title: string; color: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  color,
  count,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="fade-in">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-md font-semibold mb-3 flex items-center gap-2 ${color} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded`}
        aria-expanded={open}
      >
        <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
        {title}
        {count !== undefined && <span className="text-xs text-gray-500 font-normal">({count})</span>}
      </button>
      {open && children}
    </section>
  );
};

const EmptyState: React.FC<{ status: string }> = ({ status }) => (
  <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
    <div className="text-center">
      <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
      <p className="text-lg">{status === 'compiling' ? 'Compiling…' : 'Click "Execute Code" to visualize your code'}</p>
      <p className="text-xs text-gray-500 mt-2">Runs entirely in your browser: nothing is sent to a server.</p>
    </div>
  </div>
);

const StructuresTab: React.FC = () => {
  const view = useVisualizationStore((s) => s.view)!;
  const scrollRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const isDangling = useCallback(
    (addr: number) => view.heap.some((h) => h.freed && addr >= h.addr && addr < h.addr + Math.max(h.size, 1)),
    [view]
  );
  const groups = new Map<string, Shape[]>();
  for (const s of view.shapes) {
    const key = s.kind === 'string' || s.kind === 'matrix' ? s.kind : s.kind;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <div ref={scrollRef} className="relative h-full overflow-auto p-6 bg-gray-900" onClick={() => useVisualizationStore.getState().select(null)}>
      <MoveOverlay container={scrollRef} moves={view.moves} stepIndex={view.index} />
      <div className="space-y-8">
        {[...groups.entries()].map(([kind, shapes]) => (
          <Collapsible key={kind} title={SECTION[kind].title} color={SECTION[kind].color} count={shapes.length}>
            <div className="space-y-4">
              {shapes.map((s) => (
                <ShapeView key={s.key} shape={s} />
              ))}
            </div>
          </Collapsible>
        ))}
        <Collapsible title="Stack & Heap" color="text-blue-400">
          <div ref={diagramRef} className="relative">
            <FramesHeapView view={view} />
            <PointerArrows container={diagramRef} version={view} isDangling={isDangling} />
          </div>
        </Collapsible>
      </div>
    </div>
  );
};

const VisualizationCanvas: React.FC = () => {
  const hasView = useVisualizationStore((s) => !!s.view);
  const status = useVisualizationStore((s) => s.status);
  const tab = useVisualizationStore((s) => s.vizTab);
  const setTab = useVisualizationStore((s) => s.setVizTab);
  const reduce = useVisualizationStore((s) => s.reduceMotion);

  return (
    <div className={`h-full flex flex-col bg-gray-900 ${reduce ? 'cit-reduce-motion' : ''}`}>
      <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-800">
        <h3 className="text-lg font-bold text-blue-400">Data Visualization</h3>
        <div className="flex rounded-md overflow-hidden border border-gray-600 text-xs" role="tablist" aria-label="Visualization view">
          {(
            [
              ['structures', 'Structures'],
              ['memory', 'Memory'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 font-semibold transition-colors ${tab === id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {!hasView ? (
          <EmptyState status={status} />
        ) : (
          <MotionProvider>
            {tab === 'structures' ? (
              <StructuresTab />
            ) : (
              <Suspense fallback={<div className="p-6 text-gray-500">Loading memory view…</div>}>
                <MemoryView />
              </Suspense>
            )}
          </MotionProvider>
        )}
      </div>
    </div>
  );
};

export default VisualizationCanvas;
