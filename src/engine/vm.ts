// Stack-machine interpreter with explicit call frames. It can pause at any
// instruction (input, time slices, stop requests) and records a compact trace
// of per-step memory deltas and structural events for the visualizer.

import {
  CompiledFn, CompiledProgram, DeclVar, Ins, MT, MT_SIZE, mtOf, NativeRef, NK, OP, StepSite,
} from './compiler';
import { shortNumber } from './format';
import {
  CRuntimeError, FrameArea, HeapBlock, Memory, STACK_BASE, STACK_TOP, TEXT_BASE,
} from './memory';
import {
  DoneInfo, OutKind, OutSeg, ProgramInfo, RunLimits, RuntimeErrorInfo, StepKind, StepRec, TraceEvent,
  TypeDef, VarInfo, WriteRec,
} from './protocol';
import { NATIVES, NEED_INPUT } from './stdlib';
import { alignTo, CType, FuncType, isArray, isStruct, sizeOf, typeToString, unqual } from './types';

export interface Frame {
  fn: CompiledFn;
  pc: number;
  fp: number;
  /** Stack pointer of the caller at the time of the call (restored on return). */
  callerSp: number;
  base: number;
  id: number;
  visible: VarInfo[];
  area: FrameArea;
  internal: boolean;
}

export type RunStatus = 'running' | 'input' | 'done';

export class StdinBuffer {
  buf = '';
  pos = 0;
  eof = false;
  available(): number {
    return this.buf.length - this.pos;
  }
  push(text: string | null): void {
    if (text === null) this.eof = true;
    else this.buf = this.buf.slice(this.pos) + text;
    if (text !== null) this.pos = 0;
  }
}

const MAX_WARNINGS = 25;
const MAX_READS_PER_STEP = 48;

function isZero(v: unknown): boolean {
  return v === 0 || v === 0n;
}

const INT32_MIN = -2147483648;
const EMPTY = new Uint8Array(0);

export class VM {
  readonly mem: Memory;
  readonly stdin = new StdinBuffer();
  frames: Frame[] = [];
  S: unknown[] = [];
  private frameIds = 1;
  status: RunStatus = 'running';
  done: DoneInfo | null = null;
  instructions = 0;
  stepCount = 0;
  truncated = false;
  private recording = true;
  private outBytes = 0;

  // Per-step accumulators.
  private w: WriteRec[] = [];
  private ev: TraceEvent[] = [];
  private reads: number[] = [];
  private out: OutSeg[] = [];
  private warns: string[] = [];
  readonly steps: StepRec[] = [];

  // Type registry.
  private typeIds = new Map<string, number>();
  private typeCache = new WeakMap<object, number>();
  readonly typeDefs: TypeDef[] = [];
  newTypes: TypeDef[] = [];

  private warnedSites = new Set<string>();
  private warningCount = 0;
  private decoders: Record<string, TextDecoder> = {};
  lastLine = 1;
  lastCol = 1;
  blockTypes = new Map<number, number>();
  /** State shared with natives (strtok, rand). */
  nativeState: Record<string, unknown> = {};
  private exitRequested: number | null = null;

  constructor(readonly prog: CompiledProgram, readonly limits: RunLimits) {
    this.mem = new Memory(prog.rodata.length, prog.rodataBase, prog.data.length, prog.dataBase);
    this.mem.rodata.data.set(prog.rodata);
    this.mem.rodata.init.fill(1);
    this.mem.data.data.set(prog.data);
    this.mem.data.init.set(prog.dataInit);
    this.mem.globalObjects = prog.globalObjects;
    this.mem.textEnd = prog.textEnd;
    this.mem.onWrite = (addr, o, oi, n) => {
      if (this.recording) this.w.push({ a: addr, n, o, oi });
    };
  }

  // ------------------------------------------------------------------ program info

  programInfo(): ProgramInfo {
    const globals: VarInfo[] = this.prog.globals
      .filter((g) => !g.hidden)
      .map((g) => ({ name: g.name, type: this.typeId(g.ty), addr: g.addr, size: sizeOf(g.ty), staticIn: g.staticIn }));
    const info: ProgramInfo = {
      types: [],
      globals,
      funcs: [
        ...this.prog.fns.map((f) => ({ name: f.name, addr: f.addr, line: f.line, internal: f.internal })),
        ...this.prog.natives.map((n) => ({ name: n.name, addr: n.addr, line: 0, internal: true })),
      ],
      regions: {
        text: { base: TEXT_BASE, size: this.prog.textEnd - TEXT_BASE },
        rodata: { base: this.prog.rodataBase, size: this.prog.rodata.length },
        data: { base: this.prog.dataBase, size: this.prog.data.length },
        stackTop: STACK_TOP,
        stackBase: STACK_BASE,
        heapBase: 0x5555555592a0,
      },
      image: [
        { addr: this.prog.rodataBase, bytes: this.prog.rodata.slice() },
        { addr: this.prog.dataBase, bytes: this.prog.data.slice() },
      ],
    };
    info.types = this.takeNewTypes();
    return info;
  }

  takeNewTypes(): TypeDef[] {
    const t = this.newTypes;
    this.newTypes = [];
    return t;
  }

  private typeKey(ty: CType): string {
    switch (ty.kind) {
      case 'void':
        return 'v';
      case 'int':
        return `i:${ty.name}:${ty.enumTag ?? ''}:${ty.alias ?? ''}`;
      case 'float':
        return `f:${ty.name}`;
      case 'ptr':
        return `p:${this.typeKey(ty.to)}:${ty.alias ?? ''}`;
      case 'array':
        return `a:${ty.len ?? 0}:${this.typeKey(ty.of)}`;
      case 'struct':
        return `s:${ty.id}:${ty.alias ?? ''}`;
      case 'func':
        return `fn:${typeToString(ty)}`;
    }
  }

  typeId(ty: CType): number {
    const cached = this.typeCache.get(ty);
    if (cached !== undefined) return cached;
    const key = this.typeKey(ty);
    let id = this.typeIds.get(key);
    if (id === undefined) {
      id = this.typeDefs.length;
      this.typeIds.set(key, id);
      const str = typeToString(ty.kind === 'struct' ? ty : { ...ty, isConst: false });
      // Reserve the slot before recursing (self-referential structs).
      const placeholder = { id, k: 'void', str } as TypeDef;
      this.typeDefs.push(placeholder);
      let def: TypeDef;
      switch (ty.kind) {
        case 'void':
          def = { id, k: 'void', str };
          break;
        case 'int':
          def = { id, k: 'int', str, size: ty.size, signed: ty.signed, bool: ty.name === '_Bool' || undefined, char: (ty.size === 1 && ty.name !== '_Bool') || undefined };
          break;
        case 'float':
          def = { id, k: 'float', str, size: ty.size };
          break;
        case 'ptr':
          def = { id, k: 'ptr', str, to: -1 };
          this.typeDefs[id] = def;
          (def as { to: number }).to = this.typeId(ty.to);
          break;
        case 'array':
          def = { id, k: 'array', str, of: -1, len: ty.len ?? 0 };
          this.typeDefs[id] = def;
          (def as { of: number }).of = this.typeId(ty.of);
          break;
        case 'struct': {
          const sdef: TypeDef = { id, k: 'struct', str, tag: ty.tag, union: ty.union, size: ty.size, fields: null };
          this.typeDefs[id] = sdef;
          if (ty.fields) sdef.fields = ty.fields.map((f) => ({ name: f.name, type: this.typeId(f.type), off: f.offset }));
          def = sdef;
          break;
        }
        case 'func':
          def = { id, k: 'func', str };
          break;
      }
      this.typeDefs[id] = def;
      this.newTypes.push(def);
    }
    this.typeCache.set(ty, id);
    return id;
  }

  /** Resolve runtime-sized arrays to concrete types for display. */
  private concreteType(ty: CType, fp: number): CType {
    if (!isArray(ty)) return ty;
    const of = this.concreteType(ty.of, fp);
    if (ty.vla) {
      const size = Number(this.load(fp - ty.vla.sizeSlot, MT.U64));
      const esz = Math.max(sizeOf(of), 1);
      return { kind: 'array', of, len: Math.floor(size / esz) };
    }
    return of === ty.of ? ty : { kind: 'array', of, len: ty.len };
  }

  // ------------------------------------------------------------------ recording

  private depth = 0;

  private visibleDepth(): number {
    return this.depth;
  }

  private pushStep(k: StepKind, l: number, c: number, el: number, ec: number, v?: string): void {
    this.lastLine = l;
    this.lastCol = c;
    if (!this.recording) return;
    const rec: StepRec = { k, l, c, el, ec, d: this.visibleDepth() };
    if (this.w.length) rec.w = this.w;
    if (this.ev.length) rec.ev = this.ev;
    if (this.reads.length) rec.r = this.reads;
    if (this.out.length) rec.out = this.out;
    if (this.warns.length) rec.warn = this.warns;
    if (v !== undefined) rec.v = v;
    this.steps.push(rec);
    this.w = [];
    this.ev = [];
    this.reads = [];
    this.out = [];
    this.warns = [];
    this.stepCount++;
    if (this.stepCount >= this.limits.maxSteps && k !== StepKind.Exit && k !== StepKind.Error) {
      this.recording = false;
      this.truncated = true;
      this.mem.onWrite = null;
      this.output('sys', `\n[C-It: visualization stopped after ${this.limits.maxSteps.toLocaleString()} steps; the program keeps running to show its output]\n`);
    }
  }

  private event(e: TraceEvent): void {
    if (this.recording) this.ev.push(e);
  }

  output(kind: OutKind, bytes: string): void {
    if (bytes.length === 0) return;
    let text = bytes;
    if (kind === 'out' || kind === 'err') {
      // Program output is a byte string; decode UTF-8 incrementally per stream.
      const dec = (this.decoders[kind] ??= new TextDecoder('utf-8', { fatal: false }));
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i) & 0xff;
      text = dec.decode(arr, { stream: true });
      this.outBytes += bytes.length;
      if (this.outBytes > this.limits.maxOutput) {
        throw new CRuntimeError('output-limit', `output limit exceeded (${Math.round(this.limits.maxOutput / 1024)} KB); is the program printing in an infinite loop?`);
      }
    }
    if (!text) return;
    const last = this.out[this.out.length - 1];
    if (last && last.k === kind) last.s += text;
    else this.out.push({ k: kind, s: text });
  }

  warn(message: string, site?: string): void {
    const key = site ?? message;
    if (this.warnedSites.has(key) || this.warningCount >= MAX_WARNINGS) return;
    this.warnedSites.add(key);
    this.warningCount++;
    const text = `line ${this.curLine}: ${message}`;
    if (this.recording) this.warns.push(text);
    this.output('sys', `warning: ${text}\n`);
  }

  private get curLine(): number {
    const f = this.frames[this.frames.length - 1];
    if (!f) return this.lastLine;
    const ins = f.fn.code[Math.max(0, f.pc - 1)];
    return ins ? ins.line : this.lastLine;
  }

  // ------------------------------------------------------------------ memory access

  load(addr: number, mt: number, site?: string): number | bigint {
    const size = MT_SIZE[mt];
    const r = this.mem.resolve(addr, size, false);
    const d = r.data;
    const o = r.off;
    for (let i = 0; i < size; i++) {
      if (!d.length || !r.init[o + i]) {
        if (site !== '__hidden') this.warn(`reading uninitialized value${site ? ` of '${site}'` : ''} (it contains garbage)`, `uninit:${site ?? ''}:${this.curLine}`);
        break;
      }
    }
    if (this.recording && this.reads.length < MAX_READS_PER_STEP * 2) this.reads.push(addr, size);
    switch (mt) {
      case MT.I8:
        return (d[o] << 24) >> 24;
      case MT.U8:
        return d[o];
      case MT.BOOL:
        return d[o] ? 1 : 0;
      case MT.I16:
        return ((d[o] | (d[o + 1] << 8)) << 16) >> 16;
      case MT.U16:
        return d[o] | (d[o + 1] << 8);
      case MT.I32:
        return d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24);
      case MT.U32:
        return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;
      case MT.I64:
      case MT.U64:
      case MT.PTR: {
        const lo = (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;
        const hi = (d[o + 4] | (d[o + 5] << 8) | (d[o + 6] << 16) | (d[o + 7] << 24)) >>> 0;
        if (mt === MT.PTR) return hi * 4294967296 + lo;
        const u = (BigInt(hi) << 32n) | BigInt(lo);
        return mt === MT.I64 ? BigInt.asIntN(64, u) : u;
      }
      case MT.F32: {
        const dv = this.mem.scratch;
        for (let i = 0; i < 4; i++) dv.setUint8(i, d[o + i]);
        return dv.getFloat32(0, true);
      }
      case MT.F64: {
        const dv = this.mem.scratch;
        for (let i = 0; i < 8; i++) dv.setUint8(i, d[o + i]);
        return dv.getFloat64(0, true);
      }
    }
    return 0;
  }

  encode(mt: number, v: unknown): Uint8Array {
    const size = MT_SIZE[mt];
    const b = new Uint8Array(size);
    switch (mt) {
      case MT.I8:
      case MT.U8:
      case MT.BOOL:
        b[0] = Number(v) & 0xff;
        break;
      case MT.I16:
      case MT.U16: {
        const n = Number(v);
        b[0] = n & 0xff;
        b[1] = (n >> 8) & 0xff;
        break;
      }
      case MT.I32:
      case MT.U32: {
        const n = Number(v) | 0;
        b[0] = n & 0xff;
        b[1] = (n >> 8) & 0xff;
        b[2] = (n >> 16) & 0xff;
        b[3] = (n >>> 24) & 0xff;
        break;
      }
      case MT.I64:
      case MT.U64:
      case MT.PTR: {
        let big: bigint;
        if (typeof v === 'bigint') big = BigInt.asUintN(64, v);
        else {
          const n = Number(v);
          big = Number.isSafeInteger(n) ? BigInt.asUintN(64, BigInt(n)) : BigInt.asUintN(64, BigInt(Math.trunc(n)));
        }
        const lo = Number(big & 0xffffffffn);
        const hi = Number(big >> 32n);
        b[0] = lo & 0xff; b[1] = (lo >>> 8) & 0xff; b[2] = (lo >>> 16) & 0xff; b[3] = (lo >>> 24) & 0xff;
        b[4] = hi & 0xff; b[5] = (hi >>> 8) & 0xff; b[6] = (hi >>> 16) & 0xff; b[7] = (hi >>> 24) & 0xff;
        break;
      }
      case MT.F32: {
        const dv = this.mem.scratch;
        dv.setFloat32(0, Number(v), true);
        for (let i = 0; i < 4; i++) b[i] = dv.getUint8(i);
        break;
      }
      case MT.F64: {
        const dv = this.mem.scratch;
        dv.setFloat64(0, Number(v), true);
        for (let i = 0; i < 8; i++) b[i] = dv.getUint8(i);
        break;
      }
    }
    return b;
  }

  store(addr: number, mt: number, v: unknown): void {
    this.mem.write(addr, this.encode(mt, v));
  }

  /** Write bytes into frame bookkeeping space without bounds checks (still traced). */
  private writeRaw(addr: number, bytes: Uint8Array): void {
    const off = addr - STACK_BASE;
    const st = this.mem.stack;
    if (this.recording) {
      const old = st.data.slice(off, off + bytes.length);
      let allInit = true;
      for (let i = 0; i < bytes.length; i++) if (!st.init[off + i]) allInit = false;
      this.w.push({ a: addr, n: bytes.slice(), o: old, oi: allInit ? null : st.init.slice(off, off + bytes.length) });
    }
    st.data.set(bytes, off);
    st.init.fill(1, off, off + bytes.length);
  }

  readCString(addr: number, max = Infinity): string {
    let s = '';
    for (let i = 0; i < max; i++) {
      const r = this.mem.resolve(addr + i, 1, false);
      const b = r.data[r.off];
      if (b === 0) break;
      s += String.fromCharCode(b);
      if (s.length > 1 << 20) throw new CRuntimeError('SEGV', 'string is not NUL-terminated');
    }
    if (this.recording && this.reads.length < MAX_READS_PER_STEP * 2) this.reads.push(addr, Math.min(s.length + 1, 4096));
    return s;
  }

  writeBytes(addr: number, bytes: string | number[] | Uint8Array): void {
    const arr = typeof bytes === 'string' ? Uint8Array.from(bytes, (c) => c.charCodeAt(0) & 0xff) : Uint8Array.from(bytes);
    if (arr.length) this.mem.write(addr, arr);
  }

  // ------------------------------------------------------------------ heap (used by natives)

  malloc(size: number, fn: string): number {
    if (!Number.isFinite(size) || size < 0 || size > 16 * 1024 * 1024) {
      this.warn(`${fn}(${size}) failed: C-It limits the heap to 16 MB, so it returned NULL`);
      return 0;
    }
    const b = this.mem.malloc(size, this.curLine, fn);
    if (!b) {
      this.warn(`${fn} failed: out of heap memory (16 MB limit), returned NULL`);
      return 0;
    }
    this.event({ t: 'alloc', id: b.id, a: b.addr, size, line: b.line, fn });
    return b.addr;
  }

  free(addr: number, fn = 'free'): HeapBlock | null {
    if (addr === 0) return null;
    const block = this.mem.heapBlockStartingAt(addr);
    if (!block) {
      if (addr >= STACK_BASE && addr < STACK_TOP) {
        throw new CRuntimeError('bad-free', `${fn}() of a stack address (${this.mem.describeAddress(addr)}); only memory from malloc/calloc/realloc can be freed`, addr);
      }
      if (addr >= this.prog.dataBase && addr < this.prog.dataBase + this.prog.data.length) {
        throw new CRuntimeError('bad-free', `${fn}() of a global variable; only memory from malloc/calloc/realloc can be freed`, addr);
      }
      throw new CRuntimeError('bad-free', `${fn}() of 0x${addr.toString(16)}, which was not returned by malloc (pointer into the middle of a block?)`, addr);
    }
    if (block.freed) {
      throw new CRuntimeError('double-free', `double free: the block at 0x${addr.toString(16)} was already freed at line ${block.freedLine}`, addr);
    }
    this.mem.free(block, this.curLine);
    this.event({ t: 'free', a: addr, line: this.curLine });
    return block;
  }

  setBlockType(addr: number, ty: CType): void {
    const b = this.mem.heapBlockStartingAt(addr);
    if (!b || b.freed || this.blockTypes.has(addr)) return;
    const id = this.typeId(unqual(ty));
    this.blockTypes.set(addr, id);
    this.event({ t: 'htype', a: addr, type: id });
  }

  requestExit(code: number): void {
    this.exitRequested = code;
  }

  // ------------------------------------------------------------------ calls

  start(): void {
    const main = this.prog.main;
    const params = main.params;
    const args: unknown[] = [];
    if (params.length >= 1) args.push(1);
    if (params.length >= 2) {
      // argv = { "main", NULL } placed at the top of the stack.
      const strAddr = STACK_TOP - 16;
      const argvAddr = STACK_TOP - 32;
      this.writeRaw(strAddr, new TextEncoder().encode('main\0'));
      this.writeRaw(argvAddr, this.encode(MT.PTR, strAddr));
      this.writeRaw(argvAddr + 8, this.encode(MT.PTR, 0));
      this.mem.sp = STACK_TOP - 64;
      this.mem.frames.push({ lo: STACK_TOP - 64, hi: STACK_TOP, objects: [
        { addr: argvAddr, size: 16, name: 'argv' }, { addr: strAddr, size: 5, name: 'argv[0]' },
      ], name: '_start' });
      args.push(argvAddr);
    }
    while (args.length < params.length) args.push(0);
    this.S.push(...args);
    this.enter(main, args.length, [], 0);
  }

  private enter(cf: CompiledFn, argc: number, extras: number[], callLine: number): void {
    const args = this.S.splice(this.S.length - argc, argc);
    const mem = this.mem;
    const vaBytes = extras.length * 8;
    let sp = mem.sp - alignTo(vaBytes, 16);
    const vaBase = sp;
    const fp = sp - 16;
    const newSp = Math.floor((fp - cf.frameSize) / 16) * 16;
    if (newSp < STACK_BASE + 256 || this.frames.length > 100_000) {
      throw new CRuntimeError('stack-overflow', `stack overflow in ${cf.name}() after ${this.frames.length} nested calls (infinite recursion?)`);
    }
    const objects = cf.objects.map((o) => ({ addr: fp - o.off, size: o.size, name: o.name }));
    if (vaBytes) objects.push({ addr: vaBase, size: vaBytes, name: '...' });
    const area: FrameArea = { lo: newSp, hi: vaBase + alignTo(vaBytes, 16), objects, name: cf.name };
    mem.frames.push(area);
    const callerSp = mem.sp;
    mem.sp = newSp;
    sp = newSp;
    const frame: Frame = {
      fn: cf, pc: 0, fp, callerSp, base: this.S.length, id: this.frameIds++, visible: [], area, internal: cf.internal,
    };
    this.frames.push(frame);
    if (!cf.internal) this.depth++;
    this.event({ t: 'push', id: frame.id, fn: cf.name, fp, callLine, internal: cf.internal });
    // Return address and saved frame pointer, as a real x86-64 frame would have.
    const caller = this.frames[this.frames.length - 2];
    const retAddr = caller ? caller.fn.addr + 8 : TEXT_BASE;
    const saved = new Uint8Array(16);
    saved.set(this.encode(MT.PTR, caller ? caller.fp : 0), 0);
    saved.set(this.encode(MT.PTR, retAddr), 8);
    this.writeRaw(fp, saved);
    // Variadic arguments.
    const nFixed = args.length - extras.length;
    extras.forEach((mt, i) => {
      let v = args[nFixed + i];
      if (mt === MT.F32) v = Number(v);
      const slotMt = mt === MT.F32 ? MT.F64 : mt;
      const bytes = new Uint8Array(8);
      bytes.set(this.encode(slotMt, v));
      this.writeRaw(vaBase + i * 8, bytes);
    });
    // Parameters.
    let ai = 0;
    if (cf.sretOffset !== null) {
      this.store(fp - cf.sretOffset, MT.PTR, args[ai++]);
    }
    const decl: VarInfo[] = [];
    for (const p of cf.params) {
      const v = args[ai++];
      const addr = fp - p.offset;
      if (isStruct(p.ty)) mem.copy(addr, Number(v), sizeOf(p.ty));
      else this.store(addr, mtOf(p.ty), v ?? 0);
      if (p.name) decl.push({ name: p.name, type: this.typeId(p.ty), addr, size: sizeOf(p.ty), isParam: true });
    }
    if (decl.length) {
      frame.visible.push(...decl);
      this.event({ t: 'decl', vars: decl });
    }
  }

  private leave(value: unknown): void {
    if (this.frames.length === 1) {
      // Keep main's frame in the final picture so the end state stays visible.
      this.finish('exit', Number(value ?? 0) | 0);
      return;
    }
    const frame = this.frames.pop()!;
    if (!frame.internal) this.depth--;
    this.event({ t: 'pop', id: frame.id });
    this.S.length = frame.base;
    this.mem.frames.pop();
    this.mem.sp = frame.callerSp;
    if (this.frames.length === 0) {
      this.finish('exit', Number(value ?? 0) | 0);
      return;
    }
    this.S.push(value);
  }

  private callAddress(target: number, argc: number, extras: number[], argTypes: CType[], fnTy: FuncType): void {
    const entry = this.prog.byAddr.get(target);
    if (!entry) {
      if (target === 0) throw new CRuntimeError('null-deref', 'call through a NULL function pointer');
      throw new CRuntimeError('SEGV', `call through an invalid function pointer (0x${target.toString(16)})`);
    }
    if (entry.fn) {
      const expected = entry.fn.params.length + (entry.fn.sretOffset !== null ? 1 : 0);
      while (argc < expected) {
        this.S.push(0);
        argc++;
      }
      this.enter(entry.fn, argc, extras, this.curLine);
    } else {
      this.callNative(entry.native!, argc, argTypes, fnTy.ret);
    }
  }

  private callNative(ref: NativeRef, argc: number, argTypes: CType[], retTy: CType): boolean {
    const fn = NATIVES[ref.name];
    const args = this.S.slice(this.S.length - argc);
    const res = fn(this, args, argTypes, retTy);
    if (res === NEED_INPUT) return false;
    this.S.length -= argc;
    this.S.push(coerceReturn(res, retTy));
    return true;
  }

  // ------------------------------------------------------------------ main loop

  /** Execute up to `budget` instructions. */
  run(budget: number): RunStatus {
    if (this.status === 'done') return 'done';
    this.status = 'running';
    try {
      this.loop(budget);
    } catch (e) {
      if (e instanceof CRuntimeError) this.fail(e);
      else if (e instanceof RangeError) this.fail(new CRuntimeError('internal', `interpreter limit reached: ${e.message}`));
      else throw e;
    }
    return this.status;
  }

  private loop(budget: number): void {
    const S = this.S;
    const maxIns = this.limits.maxInstructions;
    let frame = this.frames[this.frames.length - 1];
    let code = frame.fn.code;
    let n = 0;
    while (n++ < budget) {
      if (++this.instructions > maxIns) {
        throw new CRuntimeError('limit', `execution limit reached (${(maxIns / 1e6).toFixed(0)} million instructions); possible infinite loop near line ${this.curLine}`);
      }
      const ins: Ins = code[frame.pc++];
      switch (ins.op) {
        case OP.PUSH:
          S.push(ins.a);
          break;
        case OP.POP:
          S.pop();
          break;
        case OP.DUP:
          S.push(S[S.length - 1]);
          break;
        case OP.SWAP: {
          const a = S.pop();
          const b = S.pop();
          S.push(a, b);
          break;
        }
        case OP.LEA:
          S.push(frame.fp + (ins.a as number));
          break;
        case OP.OFFSET:
          S.push((S.pop() as number) + (ins.a as number));
          break;
        case OP.LOAD:
          S.push(this.load(S.pop() as number, ins.a as number, ins.b as string | undefined));
          break;
        case OP.STORE: {
          const v = S.pop();
          const addr = S.pop() as number;
          this.store(addr, ins.a as number, v);
          S.push(v);
          break;
        }
        case OP.COPY: {
          const src = S.pop() as number;
          const dst = S.pop() as number;
          const size = ins.a as number;
          this.mem.copy(dst, src, size);
          if (this.recording && this.reads.length < MAX_READS_PER_STEP * 2) this.reads.push(src, size);
          S.push(dst);
          break;
        }
        case OP.ZERO: {
          const dst = S.pop() as number;
          const size = ins.a as number;
          if (size > 0) this.mem.write(dst, new Uint8Array(size));
          break;
        }
        case OP.BIN: {
          const b = S.pop();
          const a = S.pop();
          S.push(this.binop(ins.a as number, ins.b as number, a, b));
          break;
        }
        case OP.CMP: {
          const b = S.pop() as number;
          const a = S.pop() as number;
          let r: boolean;
          switch (ins.a as number) {
            case 0: r = a === b; break;
            case 1: r = a !== b; break;
            case 2: r = a < b; break;
            case 3: r = a > b; break;
            case 4: r = a <= b; break;
            default: r = a >= b;
          }
          S.push(r ? 1 : 0);
          break;
        }
        case OP.UN:
          S.push(this.unop(ins.a as number, ins.b as number, S.pop()));
          break;
        case OP.TRUTH:
          S.push(isZero(S.pop()) ? 0 : 1);
          break;
        case OP.CONV:
          S.push(convert(S.pop(), ins.a as number, ins.b as number));
          break;
        case OP.PTRADD:
        case OP.PTRADD_DYN: {
          const scale = ins.op === OP.PTRADD ? (ins.a as number) : Number(S.pop());
          const i = Number(S.pop());
          const p = S.pop() as number;
          S.push(p + (ins.b ? -i : i) * scale);
          break;
        }
        case OP.PTRDIFF:
        case OP.PTRDIFF_DYN: {
          const scale = ins.op === OP.PTRDIFF ? (ins.a as number) : Number(S.pop());
          const b = S.pop() as number;
          const a = S.pop() as number;
          S.push(BigInt(Math.trunc((a - b) / (scale || 1))));
          break;
        }
        case OP.JMP:
          frame.pc = ins.a as number;
          break;
        case OP.JZ:
          if (isZero(S.pop())) frame.pc = ins.a as number;
          break;
        case OP.JNZ:
          if (!isZero(S.pop())) frame.pc = ins.a as number;
          break;
        case OP.SWITCH: {
          const v = S.pop();
          const t = (ins.a as Map<string, number>).get(String(v));
          frame.pc = t ?? (ins.b as number);
          break;
        }
        case OP.CALL: {
          const cf = ins.a as CompiledFn;
          this.enter(cf, ins.b as number, ins.c as number[], ins.line);
          frame = this.frames[this.frames.length - 1];
          code = frame.fn.code;
          break;
        }
        case OP.CALLI: {
          const argc = ins.b as number;
          const target = S[S.length - argc - 1] as number;
          S.splice(S.length - argc - 1, 1);
          const fnTy = ins.a as FuncType;
          this.callAddress(target, argc, ins.c as number[], ins.d as CType[], fnTy);
          frame = this.frames[this.frames.length - 1];
          code = frame.fn.code;
          break;
        }
        case OP.NATIVE: {
          const ok = this.callNative(ins.a as NativeRef, ins.b as number, ins.c as CType[], ins.d as CType);
          if (this.exitRequested !== null) {
            this.finish('exit', this.exitRequested);
            return;
          }
          if (!ok) {
            frame.pc--;
            this.instructions--;
            this.pushStep(StepKind.Input, ins.line, ins.col, ins.line, ins.col + 1, 'waiting for input');
            this.status = 'input';
            return;
          }
          if (this.status === 'done') return;
          break;
        }
        case OP.RET: {
          const v = ins.a ? S.pop() : 0;
          this.leave(v);
          if (this.status === 'done') return;
          frame = this.frames[this.frames.length - 1];
          code = frame.fn.code;
          break;
        }
        case OP.STEP: {
          if (frame.internal) break;
          const s = ins.a as StepSite;
          let v: string | undefined;
          if (s.k === StepKind.Ret) {
            const f = frame.fn;
            const retTy = f.ty.ret;
            if (retTy.kind !== 'void' && S.length > frame.base) {
              v = isStruct(retTy) ? `${f.name} returns a struct` : `${f.name} returns ${this.formatValue(S[S.length - 1], retTy)}`;
            } else {
              v = `${f.name} returns`;
            }
          }
          this.pushStep(s.k, s.l, s.c, s.el, s.ec, v);
          break;
        }
        case OP.EXPR: {
          if (frame.internal) break;
          const s = ins.a as { l: number; c: number; el: number; ec: number };
          this.pushStep(StepKind.Expr, s.l, s.c, s.el, s.ec, this.formatValue(S[S.length - 1], ins.b as CType));
          break;
        }
        case OP.DECL:
          this.decl(frame, ins.a as DeclVar[]);
          break;
        case OP.TRIM: {
          const n = ins.a as number;
          if (frame.visible.length > n) {
            frame.visible.length = n;
            this.event({ t: 'trim', n });
          }
          break;
        }
        case OP.VLA_ALLOC: {
          const size = Number(S.pop());
          const total = alignTo(Math.max(size, 1), 16) + 32;
          const sp = this.mem.sp - total;
          if (sp < STACK_BASE + 256) throw new CRuntimeError('stack-overflow', `stack overflow: variable length array '${ins.a}' needs ${size} bytes`);
          const addr = sp + 16;
          this.mem.sp = sp;
          frame.area.lo = sp;
          frame.area.objects.push({ addr, size, name: ins.a as string });
          frame.area.objects.sort((x, y) => x.addr - y.addr);
          S.push(addr);
          break;
        }
        case OP.SAVE_SP:
          this.store(frame.fp + (ins.a as number), MT.U64, BigInt(this.mem.sp));
          break;
        case OP.RESTORE_SP: {
          const sp = Number(this.load(frame.fp + (ins.a as number), MT.U64, '__hidden'));
          if (sp > this.mem.sp && sp <= frame.fp) {
            this.mem.sp = sp;
            frame.area.lo = Math.min(sp, frame.fp - frame.fn.frameSize);
            frame.area.objects = frame.area.objects.filter((o) => o.addr >= sp);
          }
          break;
        }
        case OP.VA_ARG: {
          const apAddr = S.pop() as number;
          const ap = this.load(apAddr, MT.PTR) as number;
          const mt = ins.a as number;
          const v = mt === MT.F32 ? Math.fround(this.load(ap, MT.F64) as number) : this.load(ap, mt);
          this.store(apAddr, MT.PTR, ap + 8);
          S.push(v);
          break;
        }
        case OP.INCDEC:
          this.incdec(ins);
          break;
        case OP.FTEST: {
          const v = Number(S.pop());
          let r = 0;
          switch (ins.a) {
            case 'isnan': r = Number.isNaN(v) ? 1 : 0; break;
            case 'isinf': r = v === Infinity ? 1 : v === -Infinity ? -1 : 0; break;
            case 'isfinite': r = Number.isFinite(v) ? 1 : 0; break;
            case 'signbit': r = v < 0 || Object.is(v, -0) ? 1 : 0; break;
          }
          S.push(r);
          break;
        }
        case OP.CAST_HINT: {
          const p = S[S.length - 1];
          if (typeof p === 'number' && p >= 0x555555550000 && p < STACK_BASE) this.setBlockType(p, ins.a as CType);
          break;
        }
        case OP.TRAP:
          if (ins.a === 'vla-check') {
            const size = S[S.length - 1] as bigint;
            if (size > 1n << 20n) {
              throw new CRuntimeError('vla-size', `variable length array size is invalid or too large (${BigInt.asIntN(64, size)} bytes); was the length negative or uninitialized?`);
            }
            break;
          }
          throw new CRuntimeError('trap', 'reached __builtin_unreachable()/__builtin_trap()');
        case OP.LINKERR:
          throw new CRuntimeError('link', `undefined reference to '${ins.a}'`);
        default:
          throw new CRuntimeError('internal', `bad opcode ${ins.op}`);
      }
    }
  }

  private decl(frame: Frame, vars: DeclVar[]): void {
    const infos: VarInfo[] = [];
    for (const v of vars) {
      const addr = v.vlaPtr ? (this.load(frame.fp - v.offset, MT.PTR, '__hidden') as number) : frame.fp - v.offset;
      const ty = v.vlaPtr ? this.concreteType(v.ty, frame.fp) : v.ty;
      const size = sizeOf(ty);
      if (size > 0) {
        const oi = this.mem.markUninit(addr, size);
        // Kept in the write list so it stays ordered with the initializer's writes.
        if (oi && this.recording) this.w.push({ a: addr, n: EMPTY, o: EMPTY, oi, u: size });
      }
      infos.push({ name: v.name, type: this.typeId(ty), addr, size });
    }
    frame.visible.push(...infos);
    this.event({ t: 'decl', vars: infos });
  }

  private incdec(ins: Ins): void {
    const S = this.S;
    const mt = ins.a as number;
    const inc = ins.b as boolean;
    const pre = ins.c as boolean;
    const scale = ins.d === 'dyn' ? Number(S.pop()) : (ins.d as number);
    const addr = S.pop() as number;
    const old = this.load(addr, mt);
    const delta = inc ? 1 : -1;
    let nv: number | bigint;
    switch (mt) {
      case MT.PTR:
        nv = (old as number) + delta * scale;
        break;
      case MT.F32:
        nv = Math.fround((old as number) + delta);
        break;
      case MT.F64:
        nv = (old as number) + delta;
        break;
      case MT.I64: {
        const r = (old as bigint) + BigInt(delta);
        nv = BigInt.asIntN(64, r);
        if (nv !== r) this.warn(`signed integer overflow: ${old} ${inc ? '+' : '-'} 1 cannot be represented in type 'long'`, `ovf:${this.curLine}`);
        break;
      }
      case MT.U64:
        nv = BigInt.asUintN(64, (old as bigint) + BigInt(delta));
        break;
      case MT.I32: {
        const r = (old as number) + delta;
        nv = r | 0;
        if (nv !== r) this.warn(`signed integer overflow: ${old} ${inc ? '+' : '-'} 1 cannot be represented in type 'int'`, `ovf:${this.curLine}`);
        break;
      }
      default:
        nv = convert((old as number) + delta, NK.I32, mt) as number;
    }
    this.store(addr, mt, nv);
    S.push(pre ? nv : old);
  }

  private binop(op: number, nk: number, a: unknown, b: unknown): unknown {
    switch (nk) {
      case NK.I32: {
        const x = a as number;
        const y = b as number;
        let r: number;
        switch (op) {
          case 0: r = x + y; break;
          case 1: r = x - y; break;
          case 2: {
            r = Math.imul(x, y);
            const exact = x * y;
            if (exact !== r && Math.abs(exact) > 2147483647) this.overflow(x, '*', y, 'int');
            return r;
          }
          case 3:
            if (y === 0) throw new CRuntimeError('div-zero', 'integer division by zero');
            if (x === INT32_MIN && y === -1) throw new CRuntimeError('div-zero', 'integer overflow in division (INT_MIN / -1)');
            return (x / y) | 0;
          case 4:
            if (y === 0) throw new CRuntimeError('div-zero', 'integer modulo by zero');
            if (y === -1) return 0;
            return x % y | 0;
          case 5:
            if (y < 0 || y > 31) this.warn(`shift exponent ${y} is too large for 32-bit type 'int'`, `shift:${this.curLine}`);
            return x << (y & 31);
          case 6:
            if (y < 0 || y > 31) this.warn(`shift exponent ${y} is too large for 32-bit type 'int'`, `shift:${this.curLine}`);
            return x >> (y & 31);
          case 7: return x & y;
          case 8: return x | y;
          default: return x ^ y;
        }
        const w = r | 0;
        if (w !== r) this.overflow(x, op === 0 ? '+' : '-', y, 'int');
        return w;
      }
      case NK.U32: {
        const x = a as number;
        const y = b as number;
        switch (op) {
          case 0: return (x + y) >>> 0;
          case 1: return (x - y) >>> 0;
          case 2: return Math.imul(x, y) >>> 0;
          case 3:
            if (y === 0) throw new CRuntimeError('div-zero', 'integer division by zero');
            return Math.floor(x / y) >>> 0;
          case 4:
            if (y === 0) throw new CRuntimeError('div-zero', 'integer modulo by zero');
            return (x % y) >>> 0;
          case 5: return (x << (y & 31)) >>> 0;
          case 6: return x >>> (y & 31);
          case 7: return (x & y) >>> 0;
          case 8: return (x | y) >>> 0;
          default: return (x ^ y) >>> 0;
        }
      }
      case NK.I64:
      case NK.U64: {
        const x = a as bigint;
        const y = b as bigint;
        const signed = nk === NK.I64;
        const wrap = (v: bigint) => (signed ? BigInt.asIntN(64, v) : BigInt.asUintN(64, v));
        switch (op) {
          case 0:
          case 1:
          case 2: {
            const r = op === 0 ? x + y : op === 1 ? x - y : x * y;
            const w = wrap(r);
            if (signed && w !== r) this.overflow(x, op === 0 ? '+' : op === 1 ? '-' : '*', y, 'long');
            return w;
          }
          case 3:
            if (y === 0n) throw new CRuntimeError('div-zero', 'integer division by zero');
            return wrap(x / y);
          case 4:
            if (y === 0n) throw new CRuntimeError('div-zero', 'integer modulo by zero');
            return wrap(x % y);
          case 5: return wrap(x << (y & 63n));
          case 6: return wrap(x >> (y & 63n));
          case 7: return wrap(x & y);
          case 8: return wrap(x | y);
          default: return wrap(x ^ y);
        }
      }
      case NK.F32:
      case NK.F64: {
        const x = a as number;
        const y = b as number;
        let r: number;
        switch (op) {
          case 0: r = x + y; break;
          case 1: r = x - y; break;
          case 2: r = x * y; break;
          case 3: r = x / y; break;
          default: r = NaN;
        }
        return nk === NK.F32 ? Math.fround(r) : r;
      }
      default: {
        const x = Number(a);
        const y = Number(b);
        return op === 0 ? x + y : x - y;
      }
    }
  }

  private overflow(x: unknown, op: string, y: unknown, ty: string): void {
    this.warn(`signed integer overflow: ${x} ${op} ${y} cannot be represented in type '${ty}'`, `ovf:${this.curLine}`);
  }

  private unop(op: number, nk: number, a: unknown): unknown {
    if (op === 2) return isZero(a) ? 1 : 0;
    switch (nk) {
      case NK.I32: {
        const x = a as number;
        if (op === 0) {
          if (x === INT32_MIN) this.warn(`negation of -2147483648 cannot be represented in type 'int'`, `ovf:${this.curLine}`);
          return -x | 0;
        }
        return ~x;
      }
      case NK.U32:
        return op === 0 ? -(a as number) >>> 0 : ~(a as number) >>> 0;
      case NK.I64:
        return BigInt.asIntN(64, op === 0 ? -(a as bigint) : ~(a as bigint));
      case NK.U64:
        return BigInt.asUintN(64, op === 0 ? -(a as bigint) : ~(a as bigint));
      case NK.F32:
        return Math.fround(-(a as number));
      default:
        return -(a as number);
    }
  }

  // ------------------------------------------------------------------ formatting

  formatValue(v: unknown, ty: CType): string {
    const t = unqual(ty);
    switch (t.kind) {
      case 'int':
        if (t.name === '_Bool') return isZero(v) ? 'false' : 'true';
        if (t.size === 1) {
          const n = Number(v);
          const c = n & 0xff;
          return c >= 32 && c < 127 ? `${n} '${String.fromCharCode(c)}'` : String(n);
        }
        return String(v);
      case 'float':
        return shortNumber(Number(v), t.size === 4);
      case 'ptr': {
        const p = Number(v);
        return p === 0 ? 'NULL' : `0x${p.toString(16)}`;
      }
      default:
        return String(v);
    }
  }

  // ------------------------------------------------------------------ termination

  private finish(reason: DoneInfo['reason'], code: number | null, error?: RuntimeErrorInfo): void {
    if (this.status === 'done') return;
    const leaks = this.mem.heap
      .filter((b) => !b.freed && b.fn !== 'internal')
      .map((b) => ({ addr: b.addr, size: b.size, line: b.line }));
    if (reason === 'exit') {
      if (leaks.length) {
        const total = leaks.reduce((s, l) => s + l.size, 0);
        this.output('sys', `\nLeakSanitizer: ${total} byte${total === 1 ? '' : 's'} leaked in ${leaks.length} allocation${leaks.length === 1 ? '' : 's'} (never freed):\n`);
        const byLine = new Map<number, { bytes: number; count: number }>();
        for (const l of leaks) {
          const e = byLine.get(l.line) ?? { bytes: 0, count: 0 };
          e.bytes += l.size;
          e.count++;
          byLine.set(l.line, e);
        }
        for (const [line, e] of [...byLine].slice(0, 10)) {
          this.output('sys', `  ${e.bytes} bytes in ${e.count} block${e.count === 1 ? '' : 's'} allocated at line ${line}\n`);
        }
      }
      this.output('sys', `\nProgram exited with code ${code}.\n`);
    }
    this.recording = true;
    const k = reason === 'error' ? StepKind.Error : StepKind.Exit;
    const v = reason === 'error' ? error?.message : reason === 'stopped' ? 'Stopped' : `exit code ${code}`;
    this.pushStep(k, error?.line ?? this.lastLine, error?.col ?? this.lastCol, error?.line ?? this.lastLine, (error?.col ?? this.lastCol) + 1, v);
    this.done = {
      exitCode: code,
      reason,
      error,
      leaks,
      steps: this.stepCount,
      instructions: this.instructions,
      truncated: this.truncated,
    };
    this.status = 'done';
  }

  private fail(e: CRuntimeError): void {
    const f = this.frames[this.frames.length - 1];
    let line = this.lastLine;
    let col = this.lastCol;
    if (f) {
      // Report the innermost user-visible frame's location.
      for (let i = this.frames.length - 1; i >= 0; i--) {
        const fr = this.frames[i];
        if (!fr.internal) {
          const ins = fr.fn.code[Math.max(0, fr.pc - 1)];
          if (ins) {
            line = ins.line;
            col = ins.col;
          }
          break;
        }
      }
    }
    const reason = e.kind === 'limit' ? 'limit' : 'error';
    const info: RuntimeErrorInfo = { kind: e.kind, message: e.message, line, col, addr: e.addr };
    const label = errorLabel(e.kind);
    this.output('sys', `\n${label}: ${e.message}\n    at line ${line}${f ? ` in ${f.fn.name}()` : ''}\n`);
    this.finish(reason, null, info);
    if (this.done) this.done.reason = reason;
  }

  stop(): void {
    if (this.status === 'done') return;
    this.output('sys', '\n[Stopped by user]\n');
    this.finish('stopped', null);
  }

  provideInput(text: string | null): void {
    if (text === null) {
      this.stdin.push(null);
      this.output('in', '^D\n');
    } else {
      // stdin holds bytes (one char per byte), so encode as UTF-8.
      const bytes = new TextEncoder().encode(text + '\n');
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      this.stdin.push(s);
      this.output('in', text + '\n');
    }
  }
}

export function errorLabel(kind: string): string {
  switch (kind) {
    case 'null-deref':
    case 'SEGV':
      return 'Segmentation fault';
    case 'heap-buffer-overflow':
    case 'stack-buffer-overflow':
    case 'global-buffer-overflow':
    case 'heap-use-after-free':
    case 'stack-use-after-return':
    case 'double-free':
    case 'bad-free':
    case 'wild-pointer':
    case 'write-to-readonly':
      return `AddressSanitizer: ${kind}`;
    case 'div-zero':
      return 'Floating point exception';
    case 'stack-overflow':
      return 'Stack overflow';
    case 'limit':
    case 'output-limit':
      return 'Stopped';
    case 'abort':
    case 'assert':
      return 'Aborted';
    default:
      return 'Runtime error';
  }
}

/** Convert a native function's JS result into the VM representation of its C return type. */
function coerceReturn(res: unknown, ret: CType): unknown {
  if (ret.kind === 'void' || ret.kind === 'struct') return res ?? 0;
  if (res === undefined || res === null) return ret.kind === 'int' && ret.size === 8 ? 0n : 0;
  if (typeof res === 'boolean') res = res ? 1 : 0;
  const fk = typeof res === 'bigint' ? NK.I64 : ret.kind === 'float' ? NK.F64 : Number.isInteger(res) ? NK.I32 : NK.F64;
  if (fk === NK.I32 && ret.kind === 'int' && ret.size === 8) return BigInt(res as number);
  if (fk === NK.I32 && ret.kind === 'ptr') return res;
  return convert(res, fk, mtOf(ret));
}

// ------------------------------------------------------------------ conversions

function floatToBig(v: number): bigint {
  if (!Number.isFinite(v) || Math.abs(v) >= 9223372036854775808) return -9223372036854775808n;
  return BigInt(Math.trunc(v));
}

function toI32(v: unknown, fk: number): number {
  if (typeof v === 'bigint') return Number(BigInt.asIntN(32, v));
  if (fk === NK.F32 || fk === NK.F64) {
    const n = v as number;
    const t = Math.trunc(n);
    if (!Number.isFinite(t) || t > 2147483647 || t < -2147483648) return INT32_MIN;
    return t;
  }
  return (v as number) | 0;
}

export function convert(v: unknown, fk: number, tm: number): unknown {
  const isF = fk === NK.F32 || fk === NK.F64;
  switch (tm) {
    case MT.BOOL:
      return isZero(v) ? 0 : 1;
    case MT.I8:
      return (toI32(isF ? Number(v) : v, fk) << 24) >> 24;
    case MT.U8:
      return (isF ? Number(BigInt.asUintN(8, floatToBig(Number(v)))) : toI32(v, fk)) & 0xff;
    case MT.I16:
      return (toI32(v, fk) << 16) >> 16;
    case MT.U16:
      return (isF ? Number(BigInt.asUintN(16, floatToBig(Number(v)))) : toI32(v, fk)) & 0xffff;
    case MT.I32:
      return toI32(v, fk);
    case MT.U32:
      if (isF) return Number(BigInt.asUintN(32, floatToBig(v as number)));
      return toI32(v, fk) >>> 0;
    case MT.I64:
      if (typeof v === 'bigint') return BigInt.asIntN(64, v);
      if (isF) return floatToBig(v as number);
      return BigInt(Math.trunc(v as number));
    case MT.U64:
      if (typeof v === 'bigint') return BigInt.asUintN(64, v);
      if (isF) {
        const n = v as number;
        if (n >= 9223372036854775808 && n < 18446744073709551616) return BigInt(Math.trunc(n));
        return BigInt.asUintN(64, floatToBig(n));
      }
      return BigInt.asUintN(64, BigInt(Math.trunc(v as number)));
    case MT.F32:
      return Math.fround(Number(v));
    case MT.F64:
      return Number(v);
    case MT.PTR:
      if (typeof v === 'bigint') return Number(BigInt.asUintN(64, v));
      if ((v as number) < 0) return Number(BigInt.asUintN(64, BigInt(Math.trunc(v as number))));
      return v;
  }
  return v;
}
