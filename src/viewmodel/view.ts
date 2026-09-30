// Builds the renderable view of program state at the timeline cursor.

import type { OutSeg, StepRec, TraceEvent, TypeDef, VarInfo } from '@/engine/protocol';
import { StepKind } from '@/engine/protocol';
import type { MirrorMemory, Timeline } from './timeline';
import { isLineStep } from './timeline';
import { detectShapes, Shape } from './shapes';

export const MAX_ELEMENTS = 128;

export interface ValueNode {
  addr: number;
  size: number;
  type: TypeDef;
  kind: 'scalar' | 'pointer' | 'array' | 'struct' | 'opaque';
  text: string;
  uninit: boolean;
  changed: boolean;
  read: boolean;
  /** Pointer target address. */
  target?: number;
  /** Size of the pointed-to type (lets arrows aim at whole structs). */
  targetSize?: number;
  children?: { label: string; node: ValueNode }[];
  /** Elements omitted from large arrays. */
  more?: number;
}

export interface VarView {
  name: string;
  node: ValueNode;
  isParam?: boolean;
  staticIn?: string;
}

export interface FrameView {
  id: number;
  fn: string;
  callLine: number;
  vars: VarView[];
  isCurrent: boolean;
}

export interface HeapView {
  id: number;
  addr: number;
  size: number;
  line: number;
  fn: string;
  freed: boolean;
  freedLine?: number;
  /** Typed view of the block (null when the type is unknown). */
  node: ValueNode | null;
  typeLabel: string;
  count: number;
}

export interface Move {
  from: number;
  to: number;
  size: number;
}

export interface ViewState {
  index: number;
  step: StepRec | null;
  /** Line that just executed (the previous visible step). */
  prevLine: number | null;
  frames: FrameView[];
  globals: VarView[];
  heap: HeapView[];
  changed: RangeSet;
  read: RangeSet;
  output: OutSeg[];
  moves: Move[];
  warnings: string[];
  explanation: string[];
  events: TraceEvent[];
  types: TypeDef[];
  /** Hidden frames (library internals) count, for depth display. */
  depth: number;
  shapes: Shape[];
}

// ------------------------------------------------------------------ ranges

export class RangeSet {
  private r: [number, number][] = [];
  add(a: number, size: number): void {
    if (size > 0) this.r.push([a, a + size]);
  }
  overlaps(a: number, size: number): boolean {
    const e = a + Math.max(size, 1);
    for (const [s, t] of this.r) if (s < e && a < t) return true;
    return false;
  }
  get size(): number {
    return this.r.length;
  }
  ranges(): [number, number][] {
    return this.r;
  }
}

// ------------------------------------------------------------------ scalars

export function readScalar(mem: MirrorMemory, addr: number, t: TypeDef): number | bigint {
  const b = mem.bytes(addr, t.k === 'ptr' ? 8 : 'size' in t ? t.size : 8);
  const dv = new DataView(b.buffer);
  if (t.k === 'ptr') return Number(dv.getBigUint64(0, true));
  if (t.k === 'float') return t.size === 4 ? dv.getFloat32(0, true) : dv.getFloat64(0, true);
  if (t.k === 'int') {
    switch (t.size) {
      case 1:
        return t.signed ? dv.getInt8(0) : dv.getUint8(0);
      case 2:
        return t.signed ? dv.getInt16(0, true) : dv.getUint16(0, true);
      case 4:
        return t.signed ? dv.getInt32(0, true) : dv.getUint32(0, true);
      default:
        return t.signed ? dv.getBigInt64(0, true) : dv.getBigUint64(0, true);
    }
  }
  return 0;
}

export function formatFloat(v: number, single: boolean): string {
  if (Number.isNaN(v)) return 'nan';
  if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf';
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return v.toFixed(1);
  return String(Number(v.toPrecision(single ? 7 : 15)));
}

export function charLabel(c: number): string {
  const map: Record<number, string> = { 0: '\\0', 9: '\\t', 10: '\\n', 13: '\\r', 39: "\\'", 92: '\\\\' };
  if (map[c] !== undefined) return map[c];
  if (c >= 32 && c < 127) return String.fromCharCode(c);
  return `\\x${(c & 0xff).toString(16).padStart(2, '0')}`;
}

export function formatScalar(v: number | bigint, t: TypeDef): string {
  if (t.k === 'ptr') return v === 0 ? 'NULL' : `0x${Number(v).toString(16)}`;
  if (t.k === 'float') return formatFloat(Number(v), t.size === 4);
  if (t.k === 'int') {
    if (t.bool) return Number(v) ? 'true' : 'false';
    if (t.char) return `'${charLabel(Number(v) & 0xff)}'`;
    return String(v);
  }
  return String(v);
}

export function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

// ------------------------------------------------------------------ nodes

interface Ctx {
  mem: MirrorMemory;
  types: TypeDef[];
  changed: RangeSet;
  read: RangeSet;
}

export function typeSize(types: TypeDef[], t: TypeDef): number {
  switch (t.k) {
    case 'int':
    case 'float':
    case 'struct':
      return t.size;
    case 'ptr':
      return 8;
    case 'array': {
      const of = types[t.of];
      return of ? t.len * typeSize(types, of) : 0;
    }
    default:
      return 1;
  }
}

export function buildNode(ctx: Ctx, addr: number, typeId: number, depth = 0): ValueNode {
  const t = ctx.types[typeId] ?? ({ id: typeId, k: 'void', str: '?' } as TypeDef);
  const size = typeSize(ctx.types, t);
  const base = {
    addr,
    size,
    type: t,
    changed: ctx.changed.overlaps(addr, size),
    read: ctx.read.overlaps(addr, size),
  };
  switch (t.k) {
    case 'int':
    case 'float': {
      const uninit = !ctx.mem.allInit(addr, size);
      const v = readScalar(ctx.mem, addr, t);
      return { ...base, kind: 'scalar', text: uninit ? '?' : formatScalar(v, t), uninit };
    }
    case 'ptr': {
      const uninit = !ctx.mem.allInit(addr, 8);
      const v = Number(readScalar(ctx.mem, addr, t));
      const to = ctx.types[t.to];
      const targetSize = to ? typeSize(ctx.types, to) : 1;
      return { ...base, kind: 'pointer', text: uninit ? '?' : formatScalar(v, t), uninit, target: uninit ? undefined : v, targetSize };
    }
    case 'array': {
      const of = ctx.types[t.of];
      const esz = of ? typeSize(ctx.types, of) : 1;
      const n = Math.min(t.len, depth > 1 ? 32 : MAX_ELEMENTS);
      const children = [];
      for (let i = 0; i < n; i++) children.push({ label: `[${i}]`, node: buildNode(ctx, addr + i * esz, t.of, depth + 1) });
      const uninit = children.length > 0 && children.every((c) => c.node.uninit);
      return { ...base, kind: 'array', text: t.str, uninit, children, more: t.len > n ? t.len - n : undefined };
    }
    case 'struct': {
      const children = (t.fields ?? []).map((f) => ({ label: f.name, node: buildNode(ctx, addr + f.off, f.type, depth + 1) }));
      const uninit = children.length > 0 && children.every((c) => c.node.uninit);
      return { ...base, kind: 'struct', text: t.str, uninit, children };
    }
    default:
      return { ...base, kind: 'opaque', text: t.str, uninit: false };
  }
}

/** Find the most specific node containing an address (for pointer targets). */
export function findNode(node: ValueNode, addr: number, size?: number): { node: ValueNode; path: string } | null {
  if (addr < node.addr || addr >= node.addr + Math.max(node.size, 1)) return null;
  // A pointer to a whole struct/array names the object, not its first member.
  if (size !== undefined && node.addr === addr && node.size === size) return { node, path: '' };
  if (node.children) {
    for (const c of node.children) {
      const inner = findNode(c.node, addr, size);
      if (inner) {
        const sep = c.label.startsWith('[') ? '' : '.';
        return { node: inner.node, path: `${sep}${c.label}${inner.path}` };
      }
    }
  }
  return { node, path: '' };
}

// ------------------------------------------------------------------ view

export function spanStart(tl: Timeline, index: number, lineMode: boolean): number {
  if (!lineMode) return index;
  for (let k = index - 1; k >= 0; k--) if (isLineStep(tl.steps[k].k)) return k + 1;
  return 0;
}

export function buildView(tl: Timeline, lineMode: boolean): ViewState {
  const index = tl.cursor;
  const step = index >= 0 ? tl.steps[index] : null;
  const from = spanStart(tl, index, lineMode);
  const changed = new RangeSet();
  const read = new RangeSet();
  const events: TraceEvent[] = [];
  const warnings: string[] = [];
  const moves: Move[] = [];
  const exprs: string[] = [];
  for (let k = from; k <= index && k >= 0; k++) {
    const s = tl.steps[k];
    for (const w of s.w ?? []) if (!w.u) changed.add(w.a, w.n.length);
    const r = s.r ?? [];
    for (let j = 0; j < r.length; j += 2) read.add(r[j], r[j + 1]);
    if (s.ev) events.push(...s.ev);
    if (s.warn) warnings.push(...s.warn);
    if (s.k === StepKind.Expr && s.v !== undefined && k < index) exprs.push(s.v);
    // Value moves: a write whose bytes equal a location read in the same step.
    for (const w of s.w ?? []) {
      if (w.u || w.n.length === 0 || w.n.length > 16) continue;
      for (let j = 0; j < r.length; j += 2) {
        if (r[j + 1] !== w.n.length || r[j] === w.a) continue;
        const src = tl.mem.bytes(r[j], r[j + 1]);
        if (src.every((b, q) => b === w.n[q])) {
          moves.push({ from: r[j], to: w.a, size: w.n.length });
          break;
        }
      }
    }
  }
  const ctx: Ctx = { mem: tl.mem, types: tl.types, changed, read };
  const mkVar = (v: VarInfo): VarView => ({ name: v.name, node: buildNode(ctx, v.addr, v.type), isParam: v.isParam, staticIn: v.staticIn });

  const visible = tl.frames.filter((f) => !f.internal);
  const frames: FrameView[] = visible.map((f, i) => ({
    id: f.id,
    fn: f.fn,
    callLine: f.callLine,
    vars: f.vars.map(mkVar),
    isCurrent: i === visible.length - 1,
  }));
  const globals = (tl.program?.globals ?? []).map(mkVar);
  const heap: HeapView[] = [...tl.heap.values()]
    .filter((b) => b.fn !== 'internal')
    .sort((a, b) => a.addr - b.addr)
    .map((b) => {
      let node: ValueNode | null = null;
      let typeLabel = 'untyped';
      let count = 0;
      if (b.type !== undefined && !b.freed) {
        const et = tl.types[b.type];
        const esz = et ? Math.max(typeSize(tl.types, et), 1) : 1;
        count = Math.floor(b.size / esz);
        typeLabel = et?.str ?? '?';
        if (count === 1) node = buildNode(ctx, b.addr, b.type);
        else if (count > 1) {
          const arr = arrayTypeOf(tl, b.type, count);
          node = buildNode(ctx, b.addr, arr.id);
        }
      } else if (!b.freed) {
        // Unknown element type: show raw bytes.
        const arr = arrayTypeOf(tl, byteType(tl).id, b.size);
        node = buildNode(ctx, b.addr, arr.id);
        typeLabel = 'bytes';
        count = b.size;
      }
      return { id: b.id, addr: b.addr, size: b.size, line: b.line, fn: b.fn, freed: b.freed, freedLine: b.freedLine, node, typeLabel, count };
    });

  const prevIdx = (() => {
    for (let k = index - 1; k >= 0; k--) {
      if (!lineMode || isLineStep(tl.steps[k].k)) return k;
    }
    return -1;
  })();
  const view: ViewState = {
    index,
    step,
    prevLine: prevIdx >= 0 ? tl.steps[prevIdx].l : null,
    frames,
    globals,
    heap,
    changed,
    read,
    output: tl.output,
    moves,
    warnings,
    explanation: [],
    events,
    types: tl.types,
    depth: visible.length,
    shapes: [],
  };
  view.explanation = explain(view, exprs);
  view.shapes = detectShapes(view, (addr, t) => buildNode(ctx, addr, t));
  return view;
}

// Synthetic types live in their own id range so they never collide with engine ids.
const SYNTHETIC_BASE = 1_000_000;

function synthetic(tl: Timeline, key: string, make: (id: number) => TypeDef): TypeDef {
  const cache = tl.synth;
  let t = cache.get(key);
  if (!t) {
    t = make(SYNTHETIC_BASE + cache.size);
    cache.set(key, t);
    tl.types[t.id] = t;
  }
  return t;
}

function byteType(tl: Timeline): TypeDef {
  return synthetic(tl, 'u8', (id) => ({ id, k: 'int', str: 'unsigned char', size: 1, signed: false }));
}

/** Synthesize an array type for typed heap blocks (added to the local type table). */
function arrayTypeOf(tl: Timeline, elem: number, len: number): TypeDef {
  return synthetic(tl, `${elem}[${len}]`, (id) => ({ id, k: 'array', str: `${tl.types[elem]?.str ?? '?'}[${len}]`, of: elem, len }));
}

// ------------------------------------------------------------------ explanation

function changedLeaves(v: VarView, out: string[]): void {
  const walk = (node: ValueNode, label: string) => {
    if (!node.changed) return;
    if (node.children && node.children.length) {
      for (const c of node.children) walk(c.node, label + (c.label.startsWith('[') ? c.label : `.${c.label}`));
      return;
    }
    out.push(`${label} = ${node.text}`);
  };
  walk(v.node, v.name);
}

function explain(view: ViewState, exprs: string[]): string[] {
  const lines: string[] = [];
  const s = view.step;
  if (!s) return lines;
  switch (s.k) {
    case StepKind.Error:
      lines.push(s.v ?? 'Runtime error');
      return lines;
    case StepKind.Exit:
      lines.push(`Program finished (${s.v ?? 'exit'}).`);
      break;
    case StepKind.Input:
      lines.push('Waiting for input: type in the console and press Enter.');
      break;
    case StepKind.Ret:
      if (s.v) lines.push(s.v.replace(' returns ', ' returns ') + '.');
      break;
    case StepKind.Call: {
      const f = view.frames[view.frames.length - 1];
      if (f) {
        const args = f.vars.filter((v) => v.isParam).map((v) => `${v.name} = ${v.node.text}`);
        lines.push(`Called ${f.fn}(${args.join(', ')}).`);
      }
      break;
    }
    case StepKind.Expr:
      if (s.v !== undefined) lines.push(`Evaluated to ${s.v}.`);
      break;
  }
  for (const e of view.events) {
    if (e.t === 'alloc') lines.push(`${e.fn}(${e.size}) returned a new heap block at ${hex(e.a)}.`);
    if (e.t === 'free') lines.push(`Freed the heap block at ${hex(e.a)}.`);
  }
  const changes: string[] = [];
  for (const f of view.frames) for (const v of f.vars) changedLeaves(v, changes);
  for (const g of view.globals) changedLeaves(g, changes);
  for (const h of view.heap) {
    if (h.node) changedLeaves({ name: `heap#${h.id}`, node: h.node }, changes);
  }
  if (changes.length) {
    const shown = changes.slice(0, 5);
    lines.push(`Changed: ${shown.join(', ')}${changes.length > 5 ? `, … (+${changes.length - 5})` : ''}`);
  }
  if (exprs.length && s.k !== StepKind.Expr) {
    const last = exprs.slice(-3);
    lines.push(`Evaluated: ${last.join(' · ')}`);
  }
  return lines;
}

// ------------------------------------------------------------------ address lookup

export interface AddressOwner {
  label: string;
  node: ValueNode;
  /** Where the owner lives. */
  where: 'stack' | 'global' | 'heap';
  frameId?: number;
  heapId?: number;
}

/** Resolve an address to the most specific named object containing it. */
export function ownerOf(view: ViewState, addr: number, size?: number): AddressOwner | null {
  for (const f of view.frames) {
    for (const v of f.vars) {
      const hit = findNode(v.node, addr, size);
      if (hit) return { label: v.name + hit.path, node: hit.node, where: 'stack', frameId: f.id };
    }
  }
  for (const g of view.globals) {
    const hit = findNode(g.node, addr, size);
    if (hit) return { label: g.name + hit.path, node: hit.node, where: 'global' };
  }
  for (const h of view.heap) {
    if (addr < h.addr || addr >= h.addr + Math.max(h.size, 1)) continue;
    if (h.node) {
      const hit = findNode(h.node, addr, size);
      if (hit) return { label: `heap#${h.id}${hit.path}`, node: hit.node, where: 'heap', heapId: h.id };
    }
    return { label: `heap#${h.id}`, node: h.node ?? ({} as ValueNode), where: 'heap', heapId: h.id };
  }
  return null;
}

export function describeTarget(view: ViewState, addr: number | undefined, size?: number): string {
  if (addr === undefined) return 'uninitialized';
  if (addr === 0) return 'NULL';
  const h = view.heap.find((b) => addr >= b.addr && addr < b.addr + Math.max(b.size, 1));
  if (h?.freed) return `freed heap#${h.id} (dangling)`;
  const o = ownerOf(view, addr, size);
  if (o) return o.label;
  if (h && addr === h.addr + h.size) return `one past the end of heap#${h.id}`;
  return 'unknown memory';
}
