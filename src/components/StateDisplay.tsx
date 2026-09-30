import React from 'react';
import { StepKind } from '@/engine/protocol';
import { useVisualizationStore } from '@/store/visualizationStore';
import { describeTarget, hex, ValueNode, VarView, ViewState } from '@/viewmodel/view';

const KIND_LABEL: Record<number, { text: string; cls: string }> = {
  [StepKind.Stmt]: { text: 'statement', cls: 'bg-blue-900 text-blue-200' },
  [StepKind.Sub]: { text: 'update', cls: 'bg-blue-900 text-blue-200' },
  [StepKind.Expr]: { text: 'expression', cls: 'bg-cyan-900 text-cyan-200' },
  [StepKind.Call]: { text: 'call', cls: 'bg-orange-900 text-orange-200' },
  [StepKind.Ret]: { text: 'return', cls: 'bg-orange-900 text-orange-200' },
  [StepKind.Exit]: { text: 'exit', cls: 'bg-green-900 text-green-200' },
  [StepKind.Error]: { text: 'error', cls: 'bg-red-900 text-red-200' },
  [StepKind.Input]: { text: 'input', cls: 'bg-yellow-900 text-yellow-200' },
};

function shortValue(node: ValueNode): string {
  if (node.kind === 'array') {
    const items = (node.children ?? []).slice(0, 8).map((c) => shortValue(c.node));
    const more = (node.children?.length ?? 0) > 8 || node.more ? ', …' : '';
    if (node.type.k === 'array' && node.children?.every((c) => c.node.type.k === 'int' && (c.node.type as { char?: boolean }).char)) {
      // Show char arrays as strings up to the terminator.
      let s = '';
      for (const c of node.children ?? []) {
        if (c.node.text === "'\\0'" || c.node.uninit) break;
        s += c.node.text.slice(1, -1);
      }
      return `"${s}"`;
    }
    return `{${items.join(', ')}${more}}`;
  }
  if (node.kind === 'struct') {
    return `{${(node.children ?? []).slice(0, 4).map((c) => `.${c.label}=${shortValue(c.node)}`).join(', ')}${(node.children?.length ?? 0) > 4 ? ', …' : ''}}`;
  }
  return node.text;
}

const VariableRow: React.FC<{ v: VarView; view: ViewState }> = ({ v, view }) => {
  const select = useVisualizationStore((s) => s.select);
  const selection = useVisualizationStore((s) => s.selection);
  const n = v.node;
  const selected = selection && selection.addr === n.addr;
  return (
    <button
      type="button"
      onClick={() => select(selected ? null : { addr: n.addr, size: n.size, label: v.name })}
      className={`w-full text-left p-2 bg-gray-800 rounded border-l-4 transition-all duration-300 hover:bg-gray-700 ${
        n.kind === 'pointer' ? 'border-purple-500' : 'border-green-500'
      } ${n.changed ? 'cit-flash' : ''} ${selected ? 'ring-2 ring-blue-400' : ''}`}
      title="Click to highlight in the Memory tab"
    >
      <div className="flex justify-between items-center gap-2">
        <span className="font-mono text-sm truncate">
          <span className="text-gray-400">{n.type.str}</span>{' '}
          <span className="text-white font-semibold">{v.name}</span>
        </span>
        <span className={`font-mono text-sm font-bold truncate ${n.uninit ? 'text-gray-500 italic' : 'text-yellow-300'}`}>
          = {n.uninit && n.kind !== 'array' && n.kind !== 'struct' ? '? (garbage)' : shortValue(n)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>@ {hex(n.addr)}{v.isParam ? ' · parameter' : ''}</span>
        {n.kind === 'pointer' && !n.uninit && (
          <span className="text-purple-300">→ {describeTarget(view, n.target, n.targetSize)}</span>
        )}
      </div>
    </button>
  );
};

/** Source text covered by a step's range (single- or multi-line). */
function sourceSlice(code: string, l: number, c: number, el: number, ec: number): string {
  const lines = code.split('\n');
  if (l < 1 || l > lines.length) return '';
  if (l === el) return lines[l - 1].slice(c - 1, ec - 1);
  const parts = [lines[l - 1].slice(c - 1), ...lines.slice(l, el - 1), (lines[el - 1] ?? '').slice(0, ec - 1)];
  return parts.join(' ').replace(/\s+/g, ' ');
}

const StateDisplay: React.FC = () => {
  const view = useVisualizationStore((s) => s.view);
  const status = useVisualizationStore((s) => s.status);
  const code = useVisualizationStore((s) => s.code);

  if (!view || !view.step) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900 p-4 text-center">
        <p>{status === 'compiling' ? 'Compiling…' : 'No execution trace available'}</p>
      </div>
    );
  }

  const step = view.step;
  const current = view.frames[view.frames.length - 1];
  const badge = KIND_LABEL[step.k] ?? KIND_LABEL[StepKind.Stmt];
  const heapLive = view.heap.filter((h) => !h.freed);
  const exprText = step.k === StepKind.Expr ? sourceSlice(code, step.l, step.c, step.el, step.ec).trim() : '';
  const explanation = exprText
    ? [`${exprText.length > 60 ? exprText.slice(0, 57) + '…' : exprText}  ⇒  ${step.v}`, ...view.explanation.slice(1)]
    : view.explanation;

  return (
    <div className="h-full overflow-auto p-4 bg-gray-900 text-white">
      <h3 className="text-lg font-bold mb-4 text-blue-400">Program State</h3>

      <div className="mb-4 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-400">Line:</span> <span className="font-mono text-blue-300">{step.l}</span>
          {view.prevLine !== null && view.prevLine !== step.l && (
            <span className="text-gray-500"> (after line {view.prevLine})</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.cls}`}>{badge.text}</span>
      </div>

      {explanation.length > 0 && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            step.k === StepKind.Error ? 'bg-red-900/40 border-red-500' : 'bg-blue-900/30 border-blue-500'
          }`}
          aria-live="polite"
        >
          <h4 className={`text-sm font-semibold mb-1 ${step.k === StepKind.Error ? 'text-red-300' : 'text-blue-300'}`}>
            {step.k === StepKind.Error ? 'Runtime error' : 'Explanation'}
          </h4>
          {explanation.map((l, i) => (
            <p key={i} className="text-sm text-gray-300 font-mono break-words">{l}</p>
          ))}
        </div>
      )}

      {view.warnings.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-yellow-600 bg-yellow-900/30">
          <h4 className="text-sm font-semibold mb-1 text-yellow-300">Warning</h4>
          {view.warnings.map((w, i) => (
            <p key={i} className="text-sm text-yellow-100">{w}</p>
          ))}
        </div>
      )}

      {current && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-green-400">
            Variables <span className="text-xs text-gray-500 font-normal">in {current.fn}()</span>
          </h4>
          {current.vars.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No local variables yet</div>
          ) : (
            <div className="space-y-2">
              {current.vars.map((v) => (
                <VariableRow key={`${current.id}-${v.name}-${v.node.addr}`} v={v} view={view} />
              ))}
            </div>
          )}
        </div>
      )}

      {view.globals.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-teal-400">Globals</h4>
          <div className="space-y-2">
            {view.globals.map((v) => (
              <VariableRow key={`g-${v.name}-${v.node.addr}`} v={{ ...v, name: v.staticIn ? `${v.staticIn}::${v.name}` : v.name }} view={view} />
            ))}
          </div>
        </div>
      )}

      {view.frames.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-orange-400">Call Stack</h4>
          <div className="space-y-2">
            {[...view.frames].reverse().slice(0, 30).map((f, idx) => (
              <div key={f.id} className={`p-2 bg-gray-800 rounded border-l-4 ${idx === 0 ? 'border-orange-400' : 'border-orange-700'}`}>
                <div className="font-mono text-sm font-semibold text-white">
                  {f.fn}(
                  <span className="text-gray-400 font-normal">
                    {f.vars.filter((v) => v.isParam).map((v) => `${v.name}=${v.node.text}`).join(', ')}
                  </span>
                  )
                </div>
                <div className="text-xs text-gray-400">
                  {idx === 0 ? `executing line ${step.l}` : `waiting at line ${view.frames[view.frames.length - idx]?.callLine ?? '?'}`}
                </div>
              </div>
            ))}
            {view.frames.length > 30 && <div className="text-xs text-gray-500">… {view.frames.length - 30} more frames</div>}
          </div>
        </div>
      )}

      {view.heap.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-red-400">
            Heap <span className="text-xs text-gray-500 font-normal">{heapLive.length} live · {heapLive.reduce((a, b) => a + b.size, 0)} bytes</span>
          </h4>
          <div className="space-y-2">
            {view.heap.slice(-20).map((h) => (
              <div key={h.id} className={`p-2 bg-gray-800 rounded border-l-4 text-sm font-mono ${h.freed ? 'border-gray-600 opacity-60' : 'border-red-500'}`}>
                <div>
                  <span className="text-gray-400">heap#{h.id}</span> @ <span className="text-red-300">{hex(h.addr)}</span>
                  {h.freed && <span className="ml-2 text-xs text-gray-400">(freed at line {h.freedLine})</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {h.size} bytes · {h.fn}() at line {h.line}{h.count > 1 && h.typeLabel !== 'bytes' ? ` · ${h.count} × ${h.typeLabel}` : h.typeLabel !== 'untyped' && h.typeLabel !== 'bytes' ? ` · ${h.typeLabel}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateDisplay;
