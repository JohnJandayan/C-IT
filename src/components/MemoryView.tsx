import React, { useEffect, useMemo, useRef, useState } from 'react';
import { timeline, useVisualizationStore } from '@/store/visualizationStore';
import { charLabel, hex, ViewState } from '@/viewmodel/view';

const ROW_BYTES = 16;
const ROW_H = 22;
const OVERSCAN = 12;
const MAX_ROWS_PER_REGION = 65536;

const PALETTE = [
  'bg-green-700/70', 'bg-purple-700/70', 'bg-sky-700/70', 'bg-amber-700/70', 'bg-pink-700/70',
  'bg-teal-700/70', 'bg-indigo-700/70', 'bg-lime-700/70', 'bg-rose-700/70', 'bg-cyan-700/70',
];

interface Owner {
  start: number;
  end: number;
  label: string;
  color: string;
}

type Item = { kind: 'header'; label: string; sub: string } | { kind: 'row'; addr: number; region: string };

type Word = 1 | 4 | 8;
type Radix = 'hex' | 'dec' | 'ascii';

function buildOwners(view: ViewState): Owner[] {
  const out: Owner[] = [];
  let c = 0;
  const add = (start: number, size: number, label: string) => {
    if (size <= 0) return;
    out.push({ start, end: start + size, label, color: PALETTE[c++ % PALETTE.length] });
  };
  for (const g of view.globals) add(g.node.addr, g.node.size, g.staticIn ? `${g.staticIn}::${g.name}` : g.name);
  for (const f of view.frames) for (const v of f.vars) add(v.node.addr, v.node.size, `${f.fn}: ${v.name}`);
  for (const h of view.heap) add(h.addr, h.size, `heap#${h.id}${h.freed ? ' (freed)' : ''}`);
  return out.sort((a, b) => a.start - b.start);
}

function ownerAt(owners: Owner[], addr: number): Owner | null {
  let lo = 0;
  let hi = owners.length - 1;
  let found: Owner | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const o = owners[mid];
    if (addr < o.start) hi = mid - 1;
    else if (addr >= o.end) lo = mid + 1;
    else {
      found = o;
      // Prefer the innermost (latest-starting) owner.
      lo = mid + 1;
    }
  }
  return found;
}

function buildItems(view: ViewState): Item[] {
  const items: Item[] = [];
  const p = timeline.program;
  if (!p) return items;
  const pushRegion = (label: string, sub: string, start: number, end: number, region: string) => {
    if (end <= start) return;
    items.push({ kind: 'header', label, sub });
    const first = Math.floor(start / ROW_BYTES) * ROW_BYTES;
    const rows = Math.min(Math.ceil((end - first) / ROW_BYTES), MAX_ROWS_PER_REGION);
    for (let r = 0; r < rows; r++) items.push({ kind: 'row', addr: first + r * ROW_BYTES, region });
  };
  // Stack: from the lowest live variable to the top of main's frame (addresses shown high → low like a real stack).
  const frameAddrs = view.frames.flatMap((f) => f.vars.map((v) => [v.node.addr, v.node.addr + v.node.size]));
  const tlFrames = timeline.frames;
  if (tlFrames.length) {
    const top = Math.max(...tlFrames.map((f) => f.fp + 16), ...frameAddrs.map((a) => a[1]));
    const low = Math.min(tlFrames[tlFrames.length - 1].fp - 32, ...frameAddrs.map((a) => a[0]));
    const start = Math.floor(low / ROW_BYTES) * ROW_BYTES;
    const end = Math.min(top, start + MAX_ROWS_PER_REGION * ROW_BYTES);
    items.push({ kind: 'header', label: 'Stack', sub: `${hex(start)} – ${hex(end)} · frames: ${view.frames.map((f) => f.fn).join(' → ')}` });
    const rows = Math.ceil((end - start) / ROW_BYTES);
    for (let r = rows - 1; r >= 0; r--) items.push({ kind: 'row', addr: start + r * ROW_BYTES, region: 'stack' });
  }
  const liveHeap = view.heap.filter((h) => !h.freed).slice(-64);
  if (liveHeap.length) {
    for (const h of liveHeap) {
      pushRegion(`Heap block #${h.id}`, `${h.size} bytes @ ${hex(h.addr)} · ${h.fn}() at line ${h.line}`, h.addr, h.addr + Math.max(h.size, 1), 'heap');
    }
  }
  if (view.globals.length) pushRegion('Globals (.data/.bss)', `${hex(p.regions.data.base)} · ${p.regions.data.size} bytes`, p.regions.data.base, p.regions.data.base + p.regions.data.size, 'data');
  pushRegion('String literals (.rodata, read-only)', `${hex(p.regions.rodata.base)} · ${p.regions.rodata.size} bytes`, p.regions.rodata.base, p.regions.rodata.base + p.regions.rodata.size, 'rodata');
  return items;
}

const MemoryView: React.FC = () => {
  const view = useVisualizationStore((s) => s.view)!;
  const selection = useVisualizationStore((s) => s.selection);
  const select = useVisualizationStore((s) => s.select);
  const [word, setWord] = useState<Word>(1);
  const [radix, setRadix] = useState<Radix>('hex');
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);
  const ref = useRef<HTMLDivElement>(null);

  const owners = useMemo(() => buildOwners(view), [view]);
  const items = useMemo(() => buildItems(view), [view]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Jump to the selection.
  useEffect(() => {
    if (!selection || !ref.current) return;
    const row = Math.floor(selection.addr / ROW_BYTES) * ROW_BYTES;
    const idx = items.findIndex((it) => it.kind === 'row' && it.addr === row);
    if (idx >= 0) {
      const y = idx * ROW_H;
      const el = ref.current;
      if (y < el.scrollTop || y > el.scrollTop + el.clientHeight - ROW_H * 2) el.scrollTop = Math.max(0, y - el.clientHeight / 3);
    }
  }, [selection, items]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(items.length, Math.ceil((scrollTop + height) / ROW_H) + OVERSCAN);
  const mem = timeline.mem;

  const formatWord = (addr: number): { text: string; uninit: boolean } => {
    const bytes = mem.bytes(addr, word);
    const uninit = !mem.allInit(addr, word);
    if (uninit) return { text: word === 1 ? '??' : '?'.repeat(word * 2), uninit };
    if (radix === 'ascii') return { text: Array.from(bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : b === 0 ? '·' : '.')).join(''), uninit };
    let v = 0n;
    for (let k = word - 1; k >= 0; k--) v = (v << 8n) | BigInt(bytes[k]);
    if (radix === 'dec') {
      const signed = BigInt.asIntN(word * 8, v);
      return { text: signed.toString(), uninit };
    }
    return { text: v.toString(16).padStart(word * 2, '0'), uninit };
  };

  const wordsPerRow = ROW_BYTES / word;
  const cellW = word === 1 ? (radix === 'dec' ? 'w-9' : 'w-7') : word === 4 ? 'w-[5.5rem]' : 'w-[9.5rem]';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-2 text-xs text-gray-400 border-b border-gray-800 flex-wrap">
        <span>Group:</span>
        {([1, 4, 8] as Word[]).map((w) => (
          <button key={w} onClick={() => setWord(w)} aria-pressed={word === w} className={`px-2 py-0.5 rounded ${word === w ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {w === 1 ? 'byte' : w === 4 ? '4 B' : '8 B'}
          </button>
        ))}
        <span className="ml-2">Show:</span>
        {(['hex', 'dec', 'ascii'] as Radix[]).map((r) => (
          <button key={r} onClick={() => setRadix(r)} aria-pressed={radix === r} className={`px-2 py-0.5 rounded ${radix === r ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {r}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> written</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm ring-2 ring-cyan-400 inline-block" /> read</span>
          <span className="flex items-center gap-1"><span className="text-gray-600 font-mono">??</span> uninitialized</span>
        </span>
      </div>
      <div ref={ref} className="flex-1 overflow-auto font-mono text-xs relative" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <div style={{ height: items.length * ROW_H, position: 'relative' }}>
          {items.slice(first, last).map((it, k) => {
            const top = (first + k) * ROW_H;
            if (it.kind === 'header') {
              return (
                <div key={`h-${first + k}`} style={{ top, height: ROW_H }} className="absolute left-0 right-0 px-6 flex items-center gap-3 bg-gray-800 border-y border-gray-700">
                  <span className="text-blue-300 font-semibold">{it.label}</span>
                  <span className="text-gray-500 truncate">{it.sub}</span>
                </div>
              );
            }
            const cells = [];
            for (let w = 0; w < wordsPerRow; w++) {
              const a = it.addr + w * word;
              const o = ownerAt(owners, a);
              const { text, uninit } = formatWord(a);
              const changed = view.changed.overlaps(a, word);
              const read = view.read.overlaps(a, word);
              const sel = selection && selection.addr < a + word && a < selection.addr + Math.max(selection.size, 1);
              cells.push(
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    if (!o) return select(null);
                    select({ addr: o.start, size: o.end - o.start, label: o.label });
                  }}
                  title={`${hex(a)}${o ? ` · ${o.label}` : ''}${uninit ? ' · uninitialized' : ''}`}
                  className={`${cellW} h-[18px] text-center rounded-sm ${o ? o.color : it.region === 'stack' ? 'bg-gray-800/40' : ''} ${
                    uninit ? 'text-gray-500' : 'text-gray-100'
                  } ${changed ? 'bg-orange-500 text-white cit-flash' : ''} ${read && !changed ? 'ring-1 ring-cyan-400' : ''} ${
                    sel ? 'outline outline-2 outline-blue-400 z-10' : ''
                  } ${!o && it.region === 'heap' ? 'cit-hatch' : ''}`}
                >
                  {text}
                </button>
              );
            }
            const ascii = Array.from(mem.bytes(it.addr, ROW_BYTES), (b, i) => (mem.isInit(it.addr + i) ? charLabel(b).length === 1 ? charLabel(b) : '.' : ' ')).join('');
            return (
              <div key={`r-${it.addr}-${it.region}`} style={{ top, height: ROW_H }} className="absolute left-0 right-0 px-6 flex items-center gap-2 hover:bg-gray-800/40">
                <span className="text-gray-500 w-32 flex-shrink-0">{hex(it.addr)}</span>
                <div className="flex gap-0.5">{cells}</div>
                <span className="text-gray-500 ml-3 whitespace-pre hidden 2xl:inline">{ascii}</span>
              </div>
            );
          })}
        </div>
      </div>
      {selection && (
        <div className="px-6 py-1 text-xs text-blue-300 border-t border-gray-800">
          Selected: {selection.label ?? 'object'} · {hex(selection.addr)} · {selection.size} bytes
        </div>
      )}
    </div>
  );
};

export default MemoryView;
