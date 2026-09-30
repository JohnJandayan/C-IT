// Compiles the typed AST into stack-machine bytecode, lays out static memory,
// and evaluates static initializers.

import type { Expr, FuncSym, Init, Range, Scale, Stmt, TranslationUnit, VarSym } from './ast';
import { DiagnosticBag, MAIN_FILE, SrcPos } from './diagnostics';
import { MemObject, TEXT_BASE } from './memory';
import { constEval, runtimeInt } from './parser';
import { StepKind } from './protocol';
import { NATIVES } from './stdlib';
import {
  alignOf, alignTo, CType, FuncType, isArray, isBool, isFloat, isFunc, isInteger, isPtr, isStruct,
  isVla, isVoid, sameType, sizeOf, unqual,
} from './types';

// ------------------------------------------------------------------ opcodes

export const OP = {
  PUSH: 0, POP: 1, DUP: 2, SWAP: 3, LEA: 4, LOAD: 5, STORE: 6, COPY: 7, ZERO: 8, OFFSET: 9,
  BIN: 10, CMP: 11, UN: 12, CONV: 13, PTRADD: 14, PTRADD_DYN: 15, PTRDIFF: 16, PTRDIFF_DYN: 17,
  JMP: 18, JZ: 19, JNZ: 20, SWITCH: 21, CALL: 22, CALLI: 23, NATIVE: 24, RET: 25, STEP: 26, EXPR: 27,
  DECL: 28, TRIM: 29, VLA_ALLOC: 30, SAVE_SP: 31, RESTORE_SP: 32, VA_ARG: 33, INCDEC: 34,
  FTEST: 35, TRAP: 36, CAST_HINT: 37, LINKERR: 38, TRUTH: 39,
} as const;

/** Memory access types. */
export const MT = { I8: 0, U8: 1, I16: 2, U16: 3, I32: 4, U32: 5, I64: 6, U64: 7, F32: 8, F64: 9, PTR: 10, BOOL: 11 } as const;
export const MT_SIZE = [1, 1, 2, 2, 4, 4, 8, 8, 4, 8, 8, 1];

/** Arithmetic representation kinds. */
export const NK = { I32: 0, U32: 1, I64: 2, U64: 3, F32: 4, F64: 5, PTR: 6 } as const;

export const BINOPS = ['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^'] as const;
export const CMPOPS = ['==', '!=', '<', '>', '<=', '>='] as const;

export interface Ins {
  op: number;
  a?: unknown;
  b?: unknown;
  c?: unknown;
  d?: unknown;
  line: number;
  col: number;
}

export interface StepSite {
  k: StepKind;
  l: number;
  c: number;
  el: number;
  ec: number;
}

export interface DeclVar {
  name: string;
  ty: CType;
  offset: number;
  vlaPtr: boolean;
  size: number;
  isParam?: boolean;
}

export interface CompiledFn {
  index: number;
  name: string;
  sym: FuncSym;
  code: Ins[];
  frameSize: number;
  params: VarSym[];
  paramDecl: DeclVar[];
  sretOffset: number | null;
  internal: boolean;
  line: number;
  addr: number;
  ty: FuncType;
  /** Frame objects relative to fp (negative offsets), sorted by address. */
  objects: { off: number; size: number; name: string }[];
  /** Hidden slots that must be zeroed on entry (VLA save slots). */
}

export interface NativeRef {
  name: string;
  addr: number;
  ty: FuncType;
}

export interface CompiledProgram {
  fns: CompiledFn[];
  natives: NativeRef[];
  byAddr: Map<number, { fn?: CompiledFn; native?: NativeRef }>;
  main: CompiledFn;
  textEnd: number;
  rodataBase: number;
  rodata: Uint8Array;
  dataBase: number;
  data: Uint8Array;
  dataInit: Uint8Array;
  globalObjects: MemObject[];
  globals: VarSym[];
}

export function mtOf(ty: CType): number {
  switch (ty.kind) {
    case 'int':
      if (ty.name === '_Bool') return MT.BOOL;
      if (ty.size === 1) return ty.signed ? MT.I8 : MT.U8;
      if (ty.size === 2) return ty.signed ? MT.I16 : MT.U16;
      if (ty.size === 4) return ty.signed ? MT.I32 : MT.U32;
      return ty.signed ? MT.I64 : MT.U64;
    case 'float':
      return ty.size === 4 ? MT.F32 : MT.F64;
    case 'ptr':
      return MT.PTR;
    default:
      return MT.I32;
  }
}

export function nkOf(ty: CType): number {
  switch (ty.kind) {
    case 'int':
      if (ty.size === 8) return ty.signed ? NK.I64 : NK.U64;
      if (ty.name === 'unsigned int') return NK.U32;
      return NK.I32;
    case 'float':
      return ty.size === 4 ? NK.F32 : NK.F64;
    case 'ptr':
      return NK.PTR;
    default:
      return NK.I32;
  }
}

interface Label {
  pos: number;
  refs: Ins[];
}

interface LoopCtx {
  brk: Label;
  cont: Label | null;
  /** Depth of the VLA block stack when the loop started. */
  blockDepth: number;
}

const INTERESTING_EXPR = new Set(['binary', 'logic', 'unary', 'call', 'cond', 'deref', 'member', 'assign', 'compound', 'incdec']);

class FnCompiler {
  code: Ins[] = [];
  private line = 0;
  private col = 0;
  private loops: LoopCtx[] = [];
  private spBlocks: (number | undefined)[] = [];
  private labels = new Map<string, Label>();
  private internal: boolean;

  constructor(private cg: Compiler, private fn: FuncSym) {
    this.internal = !!fn.internal;
  }

  private at(loc: SrcPos | Range): void {
    this.line = loc.line;
    this.col = loc.col;
  }

  emit(op: number, a?: unknown, b?: unknown, c?: unknown, d?: unknown): Ins {
    const ins: Ins = { op, a, b, c, d, line: this.line, col: this.col };
    this.code.push(ins);
    return ins;
  }

  private newLabel(): Label {
    return { pos: -1, refs: [] };
  }

  private jump(op: number, l: Label): void {
    const ins = this.emit(op, -1);
    if (l.pos >= 0) ins.a = l.pos;
    else l.refs.push(ins);
  }

  private place(l: Label): void {
    l.pos = this.code.length;
    for (const r of l.refs) r.a = l.pos;
    l.refs = [];
  }

  private step(k: StepKind, loc: Range): void {
    if (this.internal || (loc.file && loc.file !== MAIN_FILE)) return;
    this.at(loc);
    const site: StepSite = { k, l: loc.line, c: loc.col, el: loc.endLine, ec: loc.endCol };
    this.emit(OP.STEP, site);
  }

  // ---------------------------------------------------------------- functions

  compileBody(): void {
    const def = this.fn.def!;
    this.at(def.range);
    for (const calc of def.vlaPrologue) this.vlaSize(calc);
    this.step(StepKind.Call, { ...def.range, endLine: def.range.line, endCol: def.range.col + 1 });
    this.block(def.body);
    // Falling off the end of the function.
    const end = def.endLoc;
    this.step(StepKind.Ret, { line: end.line, col: end.col, endLine: end.line, endCol: end.col + 1, file: end.file });
    this.at(end);
    if (isVoid(this.fn.ty.ret)) this.emit(OP.RET, 0);
    else {
      this.emit(OP.PUSH, this.fn.name === 'main' ? 0 : zeroOf(this.fn.ty.ret));
      this.emit(OP.RET, 1, this.fn.name === 'main' ? 'implicit' : 'garbage');
    }
    for (const [name, l] of this.labels) {
      if (l.pos < 0) this.cg.diags.error(`label '${name}' used but not defined`, def.range);
    }
  }

  private vlaSize(calc: { info: { sizeSlot: number }; len: Expr; elem: CType }): void {
    this.emit(OP.LEA, -calc.info.sizeSlot);
    this.value(calc.len);
    this.sizeOfType(calc.elem);
    this.emit(OP.BIN, 2, NK.U64);
    this.emit(OP.TRAP, 'vla-check');
    this.emit(OP.STORE, MT.U64);
    this.emit(OP.POP);
  }

  /** Push the byte size of a type as an unsigned long. */
  private sizeOfType(ty: CType): void {
    if (isArray(ty) && ty.vla) {
      this.emit(OP.LEA, -ty.vla.sizeSlot);
      this.emit(OP.LOAD, MT.U64);
      return;
    }
    if (isArray(ty) && isVla(ty.of)) {
      this.sizeOfType(ty.of);
      this.emit(OP.PUSH, BigInt(ty.len ?? 0));
      this.emit(OP.BIN, 2, NK.U64);
      return;
    }
    this.emit(OP.PUSH, BigInt(sizeOf(ty)));
  }

  // ---------------------------------------------------------------- statements

  private block(b: Stmt & { k: 'block' }): void {
    if (b.spSlot !== undefined) this.emit(OP.SAVE_SP, -b.spSlot);
    this.spBlocks.push(b.spSlot);
    for (const s of b.body) this.stmt(s);
    this.spBlocks.pop();
    this.at(b.endLoc);
    if (b.spSlot !== undefined) this.emit(OP.RESTORE_SP, -b.spSlot);
    this.emit(OP.TRIM, b.declsBefore);
  }

  /** Restore the stack pointer for VLA blocks being exited by a jump. */
  private restoreVlaTo(depth: number): void {
    for (let i = depth; i < this.spBlocks.length; i++) {
      const slot = this.spBlocks[i];
      if (slot !== undefined) {
        this.emit(OP.RESTORE_SP, -slot);
        return;
      }
    }
  }

  private stmt(s: Stmt): void {
    this.at(s.loc);
    switch (s.k) {
      case 'expr':
        this.step(StepKind.Stmt, s.loc);
        this.value(s.e, false);
        this.emit(OP.POP);
        return;
      case 'decl':
        this.decl(s);
        return;
      case 'block':
        this.block(s);
        return;
      case 'if': {
        this.step(StepKind.Stmt, s.loc);
        const lElse = this.newLabel();
        const lEnd = this.newLabel();
        this.value(s.c, true);
        this.jump(OP.JZ, lElse);
        this.stmt(s.t);
        if (s.f) {
          this.jump(OP.JMP, lEnd);
          this.place(lElse);
          this.stmt(s.f);
          this.place(lEnd);
        } else {
          this.place(lElse);
        }
        return;
      }
      case 'while': {
        const lTop = this.newLabel();
        const lEnd = this.newLabel();
        this.place(lTop);
        this.step(StepKind.Stmt, s.loc);
        this.value(s.c, true);
        this.jump(OP.JZ, lEnd);
        this.loops.push({ brk: lEnd, cont: lTop, blockDepth: this.spBlocks.length });
        this.stmt(s.body);
        this.loops.pop();
        this.emit(OP.TRIM, s.decls);
        this.jump(OP.JMP, lTop);
        this.place(lEnd);
        this.emit(OP.TRIM, s.decls);
        return;
      }
      case 'do': {
        const lTop = this.newLabel();
        const lCont = this.newLabel();
        const lEnd = this.newLabel();
        this.place(lTop);
        this.loops.push({ brk: lEnd, cont: lCont, blockDepth: this.spBlocks.length });
        this.stmt(s.body);
        this.loops.pop();
        this.place(lCont);
        this.emit(OP.TRIM, s.decls);
        this.step(StepKind.Stmt, s.condLoc);
        this.value(s.c, true);
        this.jump(OP.JNZ, lTop);
        this.place(lEnd);
        this.emit(OP.TRIM, s.decls);
        return;
      }
      case 'for': {
        if (s.spSlot !== undefined) this.emit(OP.SAVE_SP, -s.spSlot);
        this.spBlocks.push(s.spSlot);
        if (s.init) this.stmt(s.init);
        const lTop = this.newLabel();
        const lCont = this.newLabel();
        const lEnd = this.newLabel();
        this.place(lTop);
        this.at(s.loc);
        if (s.c) {
          this.step(StepKind.Stmt, s.c.loc);
          this.value(s.c, true);
          this.jump(OP.JZ, lEnd);
        } else {
          this.step(StepKind.Stmt, s.loc);
        }
        this.loops.push({ brk: lEnd, cont: lCont, blockDepth: this.spBlocks.length });
        this.stmt(s.body);
        this.loops.pop();
        this.place(lCont);
        this.emit(OP.TRIM, s.declsInner);
        if (s.step) {
          this.step(StepKind.Sub, s.step.loc);
          this.value(s.step, false);
          this.emit(OP.POP);
        }
        this.jump(OP.JMP, lTop);
        this.place(lEnd);
        this.spBlocks.pop();
        if (s.spSlot !== undefined) this.emit(OP.RESTORE_SP, -s.spSlot);
        this.emit(OP.TRIM, s.declsBefore);
        return;
      }
      case 'switch': {
        this.step(StepKind.Stmt, s.loc);
        this.value(s.c, true);
        const table = new Map<string, number>();
        const sw = this.emit(OP.SWITCH, table, -1);
        const lEnd = this.newLabel();
        // Cases get their positions as the body is compiled.
        this.switchCases.push({ table, sw });
        this.loops.push({ brk: lEnd, cont: this.loops.length ? this.loops[this.loops.length - 1].cont : null, blockDepth: this.spBlocks.length });
        this.stmt(s.body);
        this.loops.pop();
        this.switchCases.pop();
        this.place(lEnd);
        if (sw.b === -1) sw.b = lEnd.pos;
        this.emit(OP.TRIM, s.decls);
        return;
      }
      case 'case': {
        const sc = this.switchCases[this.switchCases.length - 1];
        if (sc) sc.table.set(String(s.value), this.code.length);
        this.emit(OP.TRIM, s.decls);
        this.stmt(s.body);
        return;
      }
      case 'default': {
        const sc = this.switchCases[this.switchCases.length - 1];
        if (sc) sc.sw.b = this.code.length;
        this.emit(OP.TRIM, s.decls);
        this.stmt(s.body);
        return;
      }
      case 'return': {
        this.step(StepKind.Stmt, s.loc);
        const ret = this.fn.ty.ret;
        const def = this.fn.def!;
        if (s.e && isStruct(ret) && def.sret) {
          this.emit(OP.LEA, -def.sret.offset);
          this.emit(OP.LOAD, MT.PTR);
          this.addr(s.e);
          this.emit(OP.COPY, sizeOf(ret));
          this.step(StepKind.Ret, s.loc);
          this.emit(OP.RET, 1);
        } else if (s.e && !isVoid(ret)) {
          this.value(s.e, true);
          this.step(StepKind.Ret, s.loc);
          this.emit(OP.RET, 1);
        } else {
          if (s.e) {
            this.value(s.e, true);
            this.emit(OP.POP);
          }
          this.step(StepKind.Ret, s.loc);
          if (isVoid(ret)) this.emit(OP.RET, 0);
          else {
            this.emit(OP.PUSH, zeroOf(ret));
            this.emit(OP.RET, 1, 'garbage');
          }
        }
        return;
      }
      case 'break': {
        this.step(StepKind.Stmt, s.loc);
        const loop = this.loops[this.loops.length - 1];
        if (!loop) return;
        this.restoreVlaTo(loop.blockDepth);
        this.jump(OP.JMP, loop.brk);
        return;
      }
      case 'continue': {
        this.step(StepKind.Stmt, s.loc);
        for (let i = this.loops.length - 1; i >= 0; i--) {
          const l = this.loops[i];
          if (l.cont) {
            this.restoreVlaTo(l.blockDepth);
            this.jump(OP.JMP, l.cont);
            return;
          }
        }
        return;
      }
      case 'goto': {
        this.step(StepKind.Stmt, s.loc);
        this.jump(OP.JMP, this.label(s.label));
        return;
      }
      case 'label': {
        this.place(this.label(s.name));
        this.emit(OP.TRIM, s.decls);
        this.stmt(s.body);
        return;
      }
      case 'empty':
        return;
    }
  }

  private switchCases: { table: Map<string, number>; sw: Ins }[] = [];

  private label(name: string): Label {
    let l = this.labels.get(name);
    if (!l) {
      l = this.newLabel();
      this.labels.set(name, l);
    }
    return l;
  }

  private decl(s: Stmt & { k: 'decl' }): void {
    if (s.items.length === 0 && s.vla.length === 0) return;
    this.step(StepKind.Stmt, s.loc);
    for (const calc of s.vla) this.vlaSize(calc);
    for (const item of s.items) {
      const sym = item.sym;
      this.at(sym.loc);
      if (sym.vlaPtr) {
        this.emit(OP.LEA, -sym.offset);
        this.sizeOfType(sym.ty);
        this.emit(OP.VLA_ALLOC, sym.name);
        this.emit(OP.STORE, MT.PTR);
        this.emit(OP.POP);
      }
      if (!sym.hidden) {
        const dv: DeclVar = { name: sym.name, ty: sym.ty, offset: sym.offset, vlaPtr: !!sym.vlaPtr, size: sizeOf(sym.ty) };
        this.emit(OP.DECL, [dv]);
      }
      if (item.init) this.initLocal(sym, item.init);
    }
  }

  private initLocal(sym: VarSym, init: Init): void {
    if (init.kind === 'expr') {
      const e = init.e;
      this.varAddr(sym);
      if (isStruct(sym.ty)) {
        this.addr(e);
        this.emit(OP.COPY, sizeOf(sym.ty));
      } else {
        this.value(e, true);
        this.emit(OP.STORE, mtOf(sym.ty));
      }
      this.emit(OP.POP);
      return;
    }
    this.varAddr(sym);
    this.emit(OP.ZERO, sizeOf(sym.ty));
    for (const item of init.items) this.initItem(() => this.varAddr(sym), item.off, item.ty, item.e);
  }

  private initItem(base: () => void, off: number, ty: CType, e: Expr): void {
    base();
    if (off) this.emit(OP.OFFSET, off);
    if (isArray(ty) && e.k === 'str') {
      const n = Math.min(sizeOf(ty), e.bytes.length);
      this.emit(OP.PUSH, this.cg.stringAddr(e.bytes));
      this.emit(OP.COPY, n);
    } else if (isStruct(ty)) {
      this.addr(e);
      this.emit(OP.COPY, sizeOf(ty));
    } else {
      this.value(e, true);
      this.emit(OP.STORE, mtOf(ty));
    }
    this.emit(OP.POP);
  }

  private varAddr(sym: VarSym): void {
    if (sym.storage === 'global') {
      this.emit(OP.PUSH, sym.addr);
    } else if (sym.vlaPtr) {
      this.emit(OP.LEA, -sym.offset);
      this.emit(OP.LOAD, MT.PTR);
    } else {
      this.emit(OP.LEA, -sym.offset);
    }
  }

  // ---------------------------------------------------------------- expressions

  /** Push an lvalue's address (or the address holding an aggregate value). */
  addr(e: Expr): void {
    this.at(e.loc);
    switch (e.k) {
      case 'var':
        this.varAddr(e.sym);
        return;
      case 'str':
        this.emit(OP.PUSH, this.cg.stringAddr(e.bytes));
        return;
      case 'deref':
        this.value(e.e, true);
        return;
      case 'member':
        this.addr(e.e);
        if (e.field.offset) this.emit(OP.OFFSET, e.field.offset);
        return;
      case 'complit':
        this.initLocal(e.sym, e.init);
        this.varAddr(e.sym);
        return;
      case 'func':
        this.emit(OP.PUSH, e.sym.addr);
        return;
      default:
        // Struct-valued expressions (calls, assignments, ?:) evaluate to an address.
        this.value(e, true);
    }
  }

  private isAggregate(ty: CType): boolean {
    return isArray(ty) || isStruct(ty) || isFunc(ty);
  }

  value(e: Expr, mark = true): void {
    this.at(e.loc);
    switch (e.k) {
      case 'int':
      case 'float':
        this.emit(OP.PUSH, e.v);
        return;
      case 'str':
        this.addr(e);
        return;
      case 'var':
        if (this.isAggregate(e.ty)) this.addr(e);
        else {
          this.addr(e);
          this.emit(OP.LOAD, mtOf(e.ty), e.sym.name);
        }
        return;
      case 'func':
        this.emit(OP.PUSH, e.sym.addr);
        return;
      case 'unary':
        this.value(e.e);
        this.at(e.loc);
        if (e.op === 'lnot') this.emit(OP.UN, 2, nkOf(e.e.ty));
        else this.emit(OP.UN, e.op === 'neg' ? 0 : 1, nkOf(e.ty));
        break;
      case 'binary': {
        this.value(e.l);
        this.value(e.r);
        this.at(e.loc);
        const cmp = (CMPOPS as readonly string[]).indexOf(e.op);
        if (cmp >= 0) this.emit(OP.CMP, cmp, nkOf(e.opTy));
        else this.emit(OP.BIN, (BINOPS as readonly string[]).indexOf(e.op), nkOf(e.opTy));
        break;
      }
      case 'logic': {
        const lShort = this.newLabel();
        const lEnd = this.newLabel();
        this.value(e.l);
        this.jump(e.op === '&&' ? OP.JZ : OP.JNZ, lShort);
        this.value(e.r);
        this.emit(OP.TRUTH);
        this.jump(OP.JMP, lEnd);
        this.place(lShort);
        this.emit(OP.PUSH, e.op === '&&' ? 0 : 1);
        this.place(lEnd);
        break;
      }
      case 'ptradd':
        this.value(e.p);
        this.value(e.i);
        this.at(e.loc);
        this.scaled(OP.PTRADD, OP.PTRADD_DYN, e.scale, e.neg);
        return;
      case 'ptrdiff':
        this.value(e.l);
        this.value(e.r);
        this.at(e.loc);
        this.scaled(OP.PTRDIFF, OP.PTRDIFF_DYN, e.scale, false);
        break;
      case 'assign':
        if (isStruct(e.ty)) {
          this.addr(e.l);
          this.addr(e.r);
          this.at(e.loc);
          this.emit(OP.COPY, sizeOf(e.ty));
          return;
        }
        this.addr(e.l);
        this.value(e.r);
        this.at(e.loc);
        this.emit(OP.STORE, mtOf(e.l.ty));
        break;
      case 'compound': {
        const lty = unqual(e.l.ty);
        this.addr(e.l);
        this.emit(OP.DUP);
        this.emit(OP.LOAD, mtOf(lty), e.l.k === 'var' ? e.l.sym.name : undefined);
        if (e.scale !== undefined) {
          this.value(e.r);
          this.at(e.loc);
          this.scaled(OP.PTRADD, OP.PTRADD_DYN, e.scale, e.op === '-');
        } else {
          this.conv(lty, e.opTy);
          this.value(e.r);
          this.at(e.loc);
          this.emit(OP.BIN, (BINOPS as readonly string[]).indexOf(e.op), nkOf(e.opTy));
          this.conv(e.opTy, lty);
        }
        this.emit(OP.STORE, mtOf(lty));
        break;
      }
      case 'incdec': {
        const ty = unqual(e.e.ty);
        this.addr(e.e);
        this.at(e.loc);
        if (e.scale !== undefined && typeof e.scale !== 'number') {
          this.value(e.scale);
          this.emit(OP.INCDEC, mtOf(ty), e.inc, e.pre, 'dyn');
        } else {
          this.emit(OP.INCDEC, mtOf(ty), e.inc, e.pre, e.scale ?? 1);
        }
        break;
      }
      case 'cond': {
        const lElse = this.newLabel();
        const lEnd = this.newLabel();
        this.value(e.c);
        this.jump(OP.JZ, lElse);
        if (isStruct(e.ty)) this.addr(e.t);
        else this.value(e.t);
        this.jump(OP.JMP, lEnd);
        this.place(lElse);
        if (isStruct(e.ty)) this.addr(e.f);
        else this.value(e.f);
        this.place(lEnd);
        break;
      }
      case 'comma':
        this.value(e.l, false);
        this.emit(OP.POP);
        this.value(e.r, mark);
        return;
      case 'call':
        this.call(e);
        break;
      case 'deref':
        this.value(e.e);
        this.at(e.loc);
        if (!this.isAggregate(e.ty) && !isVoid(e.ty)) this.emit(OP.LOAD, mtOf(e.ty));
        break;
      case 'addr':
        this.addr(e.e);
        return;
      case 'decay':
        this.addr(e.e);
        return;
      case 'member':
        this.addr(e);
        if (!this.isAggregate(e.ty)) this.emit(OP.LOAD, mtOf(e.ty), e.field.name);
        break;
      case 'cast':
        this.value(e.e, mark);
        this.at(e.loc);
        if (isVoid(e.ty)) return;
        if (isPtr(e.ty) && isPtr(e.e.ty) && isVoid(e.e.ty.to) && !isVoid(e.ty.to)) {
          // void* → T*: lets the VM learn the type of heap blocks.
          this.emit(OP.CAST_HINT, this.cg.typeRef(e.ty.to));
        }
        this.conv(e.e.ty, e.ty);
        return;
      case 'vlasize':
        this.emit(OP.LEA, -e.slot.sizeSlot);
        this.emit(OP.LOAD, MT.U64);
        return;
      case 'complit':
        this.addr(e);
        if (!this.isAggregate(e.ty)) this.emit(OP.LOAD, mtOf(e.ty));
        return;
      case 'builtin':
        this.builtin(e);
        return;
    }
    if (mark && !this.internal && INTERESTING_EXPR.has(e.k) && !isVoid(e.ty) && !isStruct(e.ty) && (!e.loc.file || e.loc.file === MAIN_FILE)) {
      this.emit(OP.EXPR, { l: e.loc.line, c: e.loc.col, el: e.loc.endLine, ec: e.loc.endCol }, e.ty);
    }
  }

  private scaled(op: number, dynOp: number, scale: Scale, neg: boolean): void {
    if (typeof scale === 'number') this.emit(op, scale, neg);
    else {
      this.value(scale, false);
      this.emit(dynOp, 0, neg);
    }
  }

  conv(from: CType, to: CType): void {
    if (isVoid(to)) return;
    const f = unqual(from);
    const t = unqual(to);
    if (isStruct(t) || isArray(t) || isFunc(t)) return;
    const fk = nkOf(f);
    const tk = nkOf(t);
    const sameRep = fk === tk && (sizeOf(t) >= 4 || sameType(f, t)) && !(isBool(t) && !isBool(f));
    if (sameRep && !(isFloat(t) && t.size === 4 && !(isFloat(f) && f.size === 4))) return;
    this.emit(OP.CONV, fk, mtOf(t));
  }

  private call(e: Expr & { k: 'call' }): void {
    const direct = e.callee.k === 'addr' && e.callee.e.k === 'func' ? e.callee.e.sym : null;
    const fnTy = e.fnTy;
    const nFixed = fnTy.noProto ? e.args.length : fnTy.params.length;
    const extras = e.args.slice(nFixed).map((a) => mtOf(a.ty));
    const argTypes = e.args.map((a) => a.ty);
    if (!direct) this.value(e.callee);
    if (e.sret) this.emit(OP.LEA, -e.sret.offset);
    for (const a of e.args) {
      if (isStruct(a.ty)) this.addr(a);
      else this.value(a);
    }
    this.at(e.loc);
    const argc = e.args.length + (e.sret ? 1 : 0);
    if (direct) {
      const target = this.cg.fnFor(direct);
      if (target) {
        this.emit(OP.CALL, target, argc, extras, argTypes);
      } else {
        const native = this.cg.nativeFor(direct);
        // Struct-returning natives (div) receive the result address as their first argument.
        if (native) this.emit(OP.NATIVE, native, argc, argTypes, e.ty);
        else this.emit(OP.LINKERR, direct.name);
      }
    } else {
      this.emit(OP.CALLI, fnTy, argc, extras, argTypes);
    }
  }

  private builtin(e: Expr & { k: 'builtin' }): void {
    switch (e.name) {
      case 'va_start':
        this.addr(e.args[0]);
        this.emit(OP.LEA, 16);
        this.emit(OP.STORE, MT.PTR);
        return;
      case 'va_end':
        this.value(e.args[0], false);
        this.emit(OP.POP);
        this.emit(OP.PUSH, 0);
        return;
      case 'va_copy':
        this.addr(e.args[0]);
        this.value(e.args[1], false);
        this.emit(OP.STORE, MT.PTR);
        return;
      case 'va_arg':
        this.addr(e.args[0]);
        this.emit(OP.VA_ARG, mtOf(e.argTy!));
        return;
      case 'trap':
        this.emit(OP.TRAP, 'unreachable');
        this.emit(OP.PUSH, 0);
        return;
      default:
        this.value(e.args[0], false);
        this.emit(OP.FTEST, e.name);
    }
  }
}

function zeroOf(ty: CType): number | bigint {
  return isInteger(ty) && ty.size === 8 ? 0n : 0;
}

// ------------------------------------------------------------------ program

export class Compiler {
  private fns = new Map<FuncSym, CompiledFn>();
  private nativeRefs = new Map<string, NativeRef>();
  private strings = new Map<string, number>();
  private rodataChunks: number[][] = [];
  private rodataSize = 0;
  rodataBase = 0;
  private typeRefs: CType[] = [];

  constructor(private unit: TranslationUnit, readonly diags: DiagnosticBag) {}

  typeRef(ty: CType): CType {
    this.typeRefs.push(ty);
    return ty;
  }

  fnFor(sym: FuncSym): CompiledFn | undefined {
    return this.fns.get(sym) ?? [...this.fns.values()].find((f) => f.name === sym.name);
  }

  nativeFor(sym: FuncSym): NativeRef | undefined {
    const ref = this.nativeRefs.get(sym.name);
    if (ref) return ref;
    return undefined;
  }

  stringAddr(bytes: number[]): number {
    const key = bytes.join(',');
    let addr = this.strings.get(key);
    if (addr === undefined) {
      addr = this.rodataBase + this.rodataSize;
      this.strings.set(key, addr);
      this.rodataChunks.push(bytes);
      this.rodataSize += bytes.length;
    }
    return addr;
  }

  compile(): CompiledProgram | null {
    const unit = this.unit;
    // Text layout: user functions first, then referenced library functions.
    let textAddr = TEXT_BASE;
    const defined = unit.funcs.filter((f) => f.def);
    const byName = new Map<string, FuncSym>();
    for (const f of unit.funcs) if (!byName.has(f.name) || f.def) byName.set(f.name, f);
    let index = 0;
    for (const f of defined) {
      f.addr = textAddr;
      textAddr += 16;
      const def = f.def!;
      const objects = def.locals
        .map((v) => ({ off: v.offset, size: v.vlaPtr ? 8 : Math.max(sizeOf(v.ty), 1), name: v.name }))
        .sort((a, b) => b.off - a.off);
      this.fns.set(f, {
        index: index++,
        name: f.name,
        sym: f,
        code: [],
        frameSize: def.frameSize,
        params: def.params,
        paramDecl: def.params
          .filter((p) => p.name)
          .map((p) => ({ name: p.name, ty: p.ty, offset: p.offset, vlaPtr: false, size: sizeOf(p.ty), isParam: true })),
        sretOffset: def.sret ? def.sret.offset : null,
        internal: !!f.internal,
        line: def.range.line,
        addr: f.addr,
        ty: f.ty,
        objects,
      });
    }
    for (const f of unit.funcs) {
      if (f.def) continue;
      const impl = byName.get(f.name);
      if (impl && impl.def) {
        f.addr = impl.addr;
        continue;
      }
      if (NATIVES[f.name]) {
        let ref = this.nativeRefs.get(f.name);
        if (!ref) {
          ref = { name: f.name, addr: textAddr, ty: f.ty };
          textAddr += 16;
          this.nativeRefs.set(f.name, ref);
        }
        f.addr = ref.addr;
      } else if (f.used) {
        this.diags.error(`undefined reference to \`${f.name}'`, f.loc);
      } else {
        f.addr = 0;
      }
    }
    // Declared-but-used functions resolved to a definition with a different symbol object.
    for (const f of unit.funcs) {
      if (!f.def && byName.get(f.name)?.def) this.fns.set(f, this.fns.get(byName.get(f.name)!)!);
    }
    const textEnd = textAddr;
    this.rodataBase = alignTo(textEnd, 0x1000);
    // Leave room for rodata before placing data (we don't know its size yet, so place data far enough).
    const dataBase = 0x404000 > this.rodataBase + 0x10000 ? 0x404000 : alignTo(this.rodataBase + 0x10000, 0x1000);

    // Data layout with red zones between globals.
    const globals = unit.globals.filter((g) => (g.defined || g.used || g.init) && !isFunc(g.ty));
    let dataSize = 0;
    const globalObjects: MemObject[] = [];
    for (const g of globals) {
      const size = Math.max(sizeOf(g.ty), 1);
      const big = isArray(g.ty) || isStruct(g.ty);
      if (big) dataSize += 16;
      dataSize = alignTo(dataSize, Math.max(alignOf(g.ty), big ? 16 : 1));
      g.addr = dataBase + dataSize;
      dataSize += size;
      if (big) dataSize += 16;
      globalObjects.push({ addr: g.addr, size, name: g.staticIn ? `${g.staticIn}::${g.name}` : g.name });
      if (g.isExtern && !g.defined && g.used) {
        if (g.name === 'errno') continue;
        this.diags.error(`undefined reference to \`${g.name}'`, g.loc);
      }
    }
    dataSize = alignTo(dataSize + 16, 16);
    const data = new Uint8Array(dataSize);

    // Code.
    for (const [sym, cf] of this.fns) {
      if (cf.sym !== sym) continue;
      const fc = new FnCompiler(this, sym);
      fc.compileBody();
      cf.code = fc.code;
    }

    // Static initializers (may intern more strings, so run before freezing rodata).
    for (const g of globals) {
      if (!g.init) continue;
      this.staticInit(g, data, dataBase);
    }

    const rodata = new Uint8Array(Math.max(this.rodataSize, 1));
    let off = 0;
    for (const chunk of this.rodataChunks) {
      rodata.set(chunk, off);
      off += chunk.length;
    }
    if (this.rodataBase + rodata.length > dataBase) {
      this.diags.error('too much constant data (string literals exceed 64 KB)', { line: 1, col: 1 });
    }
    if (this.diags.hasErrors()) return null;

    const main = [...this.fns.values()].find((f) => f.name === 'main');
    if (!main) return null;
    const byAddr = new Map<number, { fn?: CompiledFn; native?: NativeRef }>();
    for (const f of this.fns.values()) byAddr.set(f.addr, { fn: f });
    for (const n of this.nativeRefs.values()) byAddr.set(n.addr, { native: n });
    const dataInit = new Uint8Array(dataSize).fill(1);
    return {
      fns: [...new Set(this.fns.values())],
      natives: [...this.nativeRefs.values()],
      byAddr,
      main,
      textEnd,
      rodataBase: this.rodataBase,
      rodata,
      dataBase,
      data,
      dataInit,
      globalObjects,
      globals,
    };
  }

  // ---------------------------------------------------------------- static init

  private staticInit(g: VarSym, data: Uint8Array, base: number): void {
    const init = g.init!;
    const dv = new DataView(data.buffer);
    const put = (off: number, ty: CType, e: Expr) => {
      const at = g.addr - base + off;
      if (isArray(ty) && e.k === 'str') {
        data.set(e.bytes.slice(0, sizeOf(ty)), at);
        return;
      }
      if (isStruct(ty)) {
        // Struct copy from another constant object is not a constant expression in C.
        this.diags.error('initializer element is not constant', e.loc);
        return;
      }
      const v = this.constValue(e, ty);
      if (v === null) {
        this.diags.error('initializer element is not constant', e.loc);
        return;
      }
      writeScalar(dv, at, mtOf(ty), v);
    };
    if (init.kind === 'expr') put(0, g.ty, init.e);
    else for (const item of init.items) put(item.off, item.ty, item.e);
  }

  /** Compile-time value of a scalar initializer (numbers or link-time addresses). */
  private constValue(e: Expr, ty: CType): number | bigint | null {
    if (isPtr(ty) || (isInteger(ty) && ty.size === 8)) {
      const a = this.addrConst(e);
      if (a !== null) return isPtr(ty) ? a : BigInt(a);
    }
    const v = constEval(e);
    if (v === null) return null;
    if (isFloat(ty)) return Number(v);
    if (isPtr(ty)) return typeof v === 'bigint' ? Number(BigInt.asUintN(64, v)) : null;
    if (typeof v === 'number') return runtimeInt(BigInt(Math.trunc(v)), ty);
    return runtimeInt(v, ty);
  }

  private addrConst(e: Expr): number | null {
    switch (e.k) {
      case 'decay':
      case 'addr':
        return this.lvalueAddr(e.e);
      case 'cast': {
        const inner = this.addrConst(e.e);
        if (inner !== null) return inner;
        const v = constEval(e.e);
        return typeof v === 'bigint' ? Number(BigInt.asUintN(64, v)) : null;
      }
      case 'ptradd': {
        const p = this.addrConst(e.p);
        const i = constEval(e.i);
        if (p === null || typeof i !== 'bigint' || typeof e.scale !== 'number') return null;
        return p + (e.neg ? -1 : 1) * Number(i) * e.scale;
      }
      case 'func':
        return e.sym.addr;
      default:
        return null;
    }
  }

  private lvalueAddr(e: Expr): number | null {
    switch (e.k) {
      case 'var':
        return e.sym.storage === 'global' ? e.sym.addr : null;
      case 'str':
        return this.stringAddr(e.bytes);
      case 'func':
        return e.sym.addr;
      case 'member': {
        const b = this.lvalueAddr(e.e);
        return b === null ? null : b + e.field.offset;
      }
      case 'deref':
        return this.addrConst(e.e);
      default:
        return null;
    }
  }
}

export function writeScalar(dv: DataView, at: number, mt: number, v: number | bigint): void {
  switch (mt) {
    case MT.I8:
    case MT.U8:
    case MT.BOOL:
      dv.setUint8(at, Number(v) & 0xff);
      break;
    case MT.I16:
    case MT.U16:
      dv.setUint16(at, Number(v) & 0xffff, true);
      break;
    case MT.I32:
    case MT.U32:
      dv.setUint32(at, Number(v) >>> 0, true);
      break;
    case MT.I64:
    case MT.U64:
      dv.setBigUint64(at, BigInt.asUintN(64, typeof v === 'bigint' ? v : BigInt(Math.trunc(v))), true);
      break;
    case MT.PTR:
      dv.setBigUint64(at, BigInt.asUintN(64, BigInt(Math.trunc(Number(v)))), true);
      break;
    case MT.F32:
      dv.setFloat32(at, Number(v), true);
      break;
    case MT.F64:
      dv.setFloat64(at, Number(v), true);
      break;
  }
}

export function compileProgram(unit: TranslationUnit, diags: DiagnosticBag): CompiledProgram | null {
  return new Compiler(unit, diags).compile();
}
