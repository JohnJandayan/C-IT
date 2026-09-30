// Main-thread mirror of program state. Steps are applied forward and undone
// backward, so any step can be reached quickly without storing snapshots.

import type { OutSeg, ProgramInfo, StepRec, TraceEvent, TypeDef, VarInfo } from '@/engine/protocol';
import { StepKind } from '@/engine/protocol';

const PAGE = 4096;

interface Page {
  d: Uint8Array;
  i: Uint8Array;
}

export class MirrorMemory {
  private pages = new Map<number, Page>();

  private page(addr: number, create: boolean): Page | undefined {
    const key = Math.floor(addr / PAGE);
    let p = this.pages.get(key);
    if (!p && create) {
      p = { d: new Uint8Array(PAGE), i: new Uint8Array(PAGE) };
      this.pages.set(key, p);
    }
    return p;
  }

  write(addr: number, bytes: Uint8Array, init: Uint8Array | null | 1): void {
    for (let k = 0; k < bytes.length; k++) {
      const a = addr + k;
      const p = this.page(a, true)!;
      const o = a % PAGE;
      p.d[o] = bytes[k];
      p.i[o] = init === 1 || init === null ? 1 : init[k];
    }
  }

  setInit(addr: number, flags: Uint8Array | null, value = 0): void {
    const len = flags ? flags.length : 0;
    for (let k = 0; k < len; k++) {
      const a = addr + k;
      const p = this.page(a, true)!;
      p.i[a % PAGE] = value === -1 ? flags![k] : value;
    }
  }

  fillInit(addr: number, len: number, value: number): void {
    for (let k = 0; k < len; k++) {
      const a = addr + k;
      this.page(a, true)!.i[a % PAGE] = value;
    }
  }

  byte(addr: number): number {
    const p = this.page(addr, false);
    return p ? p.d[addr % PAGE] : 0;
  }

  isInit(addr: number): boolean {
    const p = this.page(addr, false);
    return p ? p.i[addr % PAGE] === 1 : false;
  }

  bytes(addr: number, size: number): Uint8Array {
    const out = new Uint8Array(size);
    for (let k = 0; k < size; k++) out[k] = this.byte(addr + k);
    return out;
  }

  allInit(addr: number, size: number): boolean {
    for (let k = 0; k < size; k++) if (!this.isInit(addr + k)) return false;
    return true;
  }
}

export interface FrameState {
  id: number;
  fn: string;
  fp: number;
  callLine: number;
  internal: boolean;
  vars: VarInfo[];
}

export interface BlockState {
  id: number;
  addr: number;
  size: number;
  line: number;
  fn: string;
  freed: boolean;
  freedLine?: number;
  type?: number;
}

type Saved = TraceEvent & { _saved?: unknown };

export class Timeline {
  program: ProgramInfo | null = null;
  types: TypeDef[] = [];
  steps: StepRec[] = [];
  /** Index of the last applied step (-1 = initial image). */
  cursor = -1;
  mem = new MirrorMemory();
  frames: FrameState[] = [];
  heap = new Map<number, BlockState>();
  output: OutSeg[] = [];
  /** Number of output segments appended by each applied step. */
  private outAdded: number[] = [];
  /** Indices of steps visible in line mode. */
  lineSteps: number[] = [];
  /** View-only synthetic types (e.g. arrays for typed heap blocks). */
  synth = new Map<string, TypeDef>();

  reset(): void {
    this.program = null;
    this.synth = new Map();
    this.types = [];
    this.steps = [];
    this.cursor = -1;
    this.mem = new MirrorMemory();
    this.frames = [];
    this.heap = new Map();
    this.output = [];
    this.outAdded = [];
    this.lineSteps = [];
  }

  setProgram(p: ProgramInfo): void {
    this.program = p;
    this.addTypes(p.types);
    for (const img of p.image) this.mem.write(img.addr, img.bytes, 1);
  }

  addTypes(defs: TypeDef[]): void {
    for (const t of defs) this.types[t.id] = t;
  }

  addSteps(steps: StepRec[]): void {
    const base = this.steps.length;
    for (let k = 0; k < steps.length; k++) {
      this.steps.push(steps[k]);
      if (isLineStep(steps[k].k)) this.lineSteps.push(base + k);
    }
  }

  seek(target: number): void {
    const t = Math.max(-1, Math.min(target, this.steps.length - 1));
    while (this.cursor < t) this.apply(++this.cursor);
    while (this.cursor > t) this.undo(this.cursor--);
  }

  private apply(idx: number): void {
    const s = this.steps[idx];
    if (s.w) {
      for (const w of s.w) {
        if (w.u) this.mem.fillInit(w.a, w.u, 0);
        else this.mem.write(w.a, w.n, 1);
      }
    }
    if (s.ev) for (const e of s.ev) this.applyEvent(e as Saved);
    const n = s.out?.length ?? 0;
    if (n) this.output.push(...s.out!);
    this.outAdded[idx] = n;
  }

  private undo(idx: number): void {
    const s = this.steps[idx];
    const n = this.outAdded[idx] ?? 0;
    if (n) this.output.length -= n;
    if (s.ev) for (let k = s.ev.length - 1; k >= 0; k--) this.undoEvent(s.ev[k] as Saved);
    if (s.w) {
      for (let k = s.w.length - 1; k >= 0; k--) {
        const w = s.w[k];
        if (w.u) this.mem.setInit(w.a, w.oi, -1);
        else this.mem.write(w.a, w.o, w.oi);
      }
    }
  }

  private applyEvent(e: Saved): void {
    switch (e.t) {
      case 'push':
        this.frames.push({ id: e.id, fn: e.fn, fp: e.fp, callLine: e.callLine, internal: e.internal, vars: [] });
        break;
      case 'pop': {
        const idx = this.frames.findIndex((f) => f.id === e.id);
        if (idx >= 0) e._saved = this.frames.splice(idx, 1)[0];
        break;
      }
      case 'decl': {
        const f = this.frames[this.frames.length - 1];
        if (f) f.vars.push(...e.vars);
        break;
      }
      case 'trim': {
        const f = this.frames[this.frames.length - 1];
        if (f) e._saved = f.vars.splice(e.n);
        break;
      }
      case 'alloc':
        this.heap.set(e.a, { id: e.id, addr: e.a, size: e.size, line: e.line, fn: e.fn, freed: false });
        break;
      case 'free': {
        const b = this.heap.get(e.a);
        if (b) {
          b.freed = true;
          b.freedLine = e.line;
        }
        break;
      }
      case 'htype': {
        const b = this.heap.get(e.a);
        if (b) {
          e._saved = b.type;
          b.type = e.type;
        }
        break;
      }
    }
  }

  private undoEvent(e: Saved): void {
    switch (e.t) {
      case 'push':
        this.frames = this.frames.filter((f) => f.id !== e.id);
        break;
      case 'pop':
        if (e._saved) this.frames.push(e._saved as FrameState);
        break;
      case 'decl': {
        const f = this.frames[this.frames.length - 1];
        if (f) f.vars.length = Math.max(0, f.vars.length - e.vars.length);
        break;
      }
      case 'trim': {
        const f = this.frames[this.frames.length - 1];
        if (f && e._saved) f.vars.push(...(e._saved as VarInfo[]));
        break;
      }
      case 'alloc':
        this.heap.delete(e.a);
        break;
      case 'free': {
        const b = this.heap.get(e.a);
        if (b) {
          b.freed = false;
          b.freedLine = undefined;
        }
        break;
      }
      case 'htype': {
        const b = this.heap.get(e.a);
        if (b) b.type = e._saved as number | undefined;
        break;
      }
    }
  }
}

export function isLineStep(k: number): boolean {
  return k !== StepKind.Expr && k !== StepKind.Sub;
}
