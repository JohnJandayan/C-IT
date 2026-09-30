import React, { useState } from 'react';
import * as m from 'motion/react-m';
import { useVisualizationStore } from '@/store/visualizationStore';
import type { ArrayShape, Marker } from '@/viewmodel/shapes';
import { hex, ValueNode } from '@/viewmodel/view';
import { Cell } from '../viz/Cell';
import { useStepDuration } from '../viz/motion';

const MARKER_COLORS = ['text-yellow-300', 'text-pink-300', 'text-sky-300', 'text-lime-300', 'text-orange-300', 'text-violet-300'];

function markerColor(name: string, markers: Marker[]): string {
  const idx = [...new Set(markers.map((m) => m.name))].indexOf(name);
  return MARKER_COLORS[idx % MARKER_COLORS.length];
}

const Bump: React.FC<{ changed: boolean; children: React.ReactNode }> = ({ changed, children }) => {
  const stepKey = useVisualizationStore((s) => s.view?.index ?? 0);
  const dur = useStepDuration();
  return (
    <m.div key={changed ? `c${stepKey}` : 's'} initial={changed && dur ? { scale: 1.18, y: -4 } : false} animate={{ scale: 1, y: 0 }} transition={{ duration: dur, type: 'spring', bounce: 0.5 }}>
      {children}
    </m.div>
  );
};

const ArrayRenderer: React.FC<{ shape: ArrayShape }> = ({ shape }) => {
  const [bars, setBars] = useState(false);
  const node = shape.node;
  const cells = node.children ?? [];
  const elemType = cells[0]?.node.type;
  const numeric = elemType && (elemType.k === 'int' || elemType.k === 'float') && !(elemType as { char?: boolean }).char;
  const len = (node.type as { len?: number }).len ?? cells.length;

  if (shape.kind === 'matrix') return <MatrixView shape={shape} />;

  const values = cells.map((c) => (c.node.uninit ? 0 : Number(c.node.text)));
  const maxAbs = Math.max(1, ...values.map((v) => (Number.isFinite(v) ? Math.abs(v) : 0)));
  const isString = shape.kind === 'string';

  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className={`font-mono text-sm ${isString ? 'text-emerald-300' : 'text-green-300'}`}>
          {elemType?.str ?? '?'} {shape.name}[{len}]
          {isString && <span className="ml-2 text-gray-400">= "{stringValue(cells.map((c) => c.node))}"</span>}
          <span className="ml-2 text-[10px] text-gray-500">@ {hex(node.addr)}</span>
        </div>
        {numeric && cells.length > 1 && (
          <button
            onClick={() => setBars((b) => !b)}
            className="text-[10px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
            title="Toggle bar chart view"
          >
            {bars ? 'cells' : 'bars'}
          </button>
        )}
      </div>
      <div className={`flex gap-2 ${bars ? 'items-end min-h-[8rem]' : 'flex-wrap'}`}>
        {cells.map((c, idx) => {
          const ms = shape.markers.filter((mk) => mk.index === idx);
          const n = c.node;
          const state = n.changed ? 'text-orange-400 font-bold' : n.read ? 'text-cyan-400 font-bold' : ms.length ? 'text-yellow-400 font-bold' : 'text-gray-500';
          return (
            <div key={idx} className="flex flex-col items-center">
              {!bars && <div className={`text-xs mb-1 transition-colors duration-300 ${state}`}>[{idx}]</div>}
              <Bump changed={n.changed}>
                {bars ? (
                  <BarCell node={n} value={values[idx]} max={maxAbs} />
                ) : (
                  <Cell
                    node={n}
                    className={`${isString ? 'w-10 h-10' : 'w-16 h-16'} rounded text-white font-bold shadow-lg ${
                      n.uninit ? 'bg-gray-600 opacity-60' : isString ? (n.text === "'\\0'" ? 'bg-gray-700 text-gray-400' : 'bg-emerald-700') : 'bg-green-600'
                    }`}
                  />
                )}
              </Bump>
              {bars && <div className={`text-[10px] mt-1 ${state}`}>[{idx}]</div>}
              {!bars && !isString && <div className="text-[9px] text-gray-500 mt-1">{hex(n.addr).slice(-6)}</div>}
              <div className="h-8 flex flex-col items-center">
                {ms.map((mk) => (
                  <m.span
                    key={mk.name}
                    layoutId={`marker-${shape.key}-${mk.name}`}
                    className={`text-[11px] font-mono font-semibold leading-tight ${markerColor(mk.name, shape.markers)}`}
                  >
                    ↑{mk.name}
                  </m.span>
                ))}
              </div>
            </div>
          );
        })}
        {node.more ? <div className="text-xs text-gray-500 self-center">… {node.more} more</div> : null}
        {!node.more && !bars && shape.markers.some((mk) => mk.index >= cells.length) && (
          // An index one past the end: show where it would land (a classic off-by-one).
          <div className="flex flex-col items-center" title="Out of bounds: this index is past the end of the array">
            <div className="text-xs mb-1 text-red-400 font-bold">[{cells.length}]</div>
            <div className={`${isString ? 'w-10 h-10' : 'w-16 h-16'} rounded border-2 border-dashed border-red-500 text-red-400 flex items-center justify-center text-xs font-bold`}>
              out of
              <br />
              bounds
            </div>
            <div className="text-[9px] text-gray-500 mt-1">&nbsp;</div>
            <div className="h-8 flex flex-col items-center">
              {shape.markers
                .filter((mk) => mk.index >= cells.length)
                .map((mk) => (
                  <span key={mk.name} className="text-[11px] font-mono font-semibold leading-tight text-red-300">↑{mk.name}</span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BarCell: React.FC<{ node: ValueNode; value: number; max: number }> = ({ node, value, max }) => {
  const dur = useStepDuration();
  const h = Math.max(4, (Math.abs(value) / max) * 110);
  return (
    <div data-addr={node.addr} data-size={node.size} className="flex flex-col items-center justify-end" title={node.text}>
      <span className="text-[10px] text-gray-300 font-mono mb-0.5">{node.uninit ? '?' : node.text}</span>
      <m.div
        className={`w-7 rounded-t ${node.changed ? 'bg-orange-500' : node.read ? 'bg-cyan-500' : value < 0 ? 'bg-rose-600' : 'bg-green-600'}`}
        initial={false}
        animate={{ height: h }}
        transition={{ duration: dur, type: 'spring', bounce: 0.25 }}
      />
    </div>
  );
};

function stringValue(cells: ValueNode[]): string {
  let s = '';
  for (const c of cells) {
    if (c.uninit || c.text === "'\\0'") break;
    s += c.text.slice(1, -1);
  }
  return s;
}

const MatrixView: React.FC<{ shape: ArrayShape }> = ({ shape }) => {
  const rows = shape.node.children ?? [];
  const cols = rows[0]?.node.children?.length ?? 0;
  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-green-300">
        {rows[0]?.node.children?.[0]?.node.type.str ?? '?'} {shape.name}[{rows.length}][{cols}]
      </div>
      <table className="border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: cols }, (_, j) => (
              <th key={j} className="text-xs text-gray-500 font-normal">[{j}]</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="text-xs text-gray-500 pr-1">[{i}]</td>
              {(r.node.children ?? []).map((c, j) => (
                <td key={j}>
                  <Bump changed={c.node.changed}>
                    <Cell node={c.node} className={`w-12 h-12 rounded text-white font-bold text-sm ${c.node.uninit ? 'bg-gray-600 opacity-60' : 'bg-green-600'}`} />
                  </Bump>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArrayRenderer;
