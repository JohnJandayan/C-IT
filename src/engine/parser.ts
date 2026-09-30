// Recursive-descent C11 parser with integrated semantic analysis. Every
// expression node leaves here fully typed, with implicit conversions explicit.

import type {
  BinOp, CaseStmt, DefaultStmt, EnumConstSym, Expr, FuncDef, FuncSym, Init, InitItem, LocalDecl,
  Range, Scale, Stmt, Sym, TranslationUnit, TypedefSym, VarSym, VlaCalc,
} from './ast';
import { DiagnosticBag, FatalError, SrcPos } from './diagnostics';
import { decodeEscapes, Token } from './lexer';
import {
  alignOf, alignTo, arrayOf, commonType, compatible, CType, Field, findField, FuncType, IntType,
  isArith, isArray, isCharType, isComplete, isFloat, isFunc, isInteger, isPtr, isScalar, isStruct,
  isVla, isVoid, layoutStruct, newStruct, Param, promote, ptrTo, sameType, SIZE_T, sizeOf,
  StructType, T, typeToString, unqual, withConst, PTRDIFF_T,
} from './types';
import { checkFormatCall } from './formatcheck';

class ParseError extends Error {}

const KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return',
  'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', '_Bool', '_Complex', '_Imaginary', '_Alignas', '_Alignof', '_Atomic', '_Generic',
  '_Noreturn', '_Static_assert', '_Thread_local', '__inline', '__inline__', '__restrict', '__restrict__',
  '__attribute__', '__extension__', '__const', '__volatile__', 'typeof', '__typeof__', 'asm', '__asm__',
]);

const TYPE_KEYWORDS = new Set([
  'void', '_Bool', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned', 'struct',
  'union', 'enum', 'typedef', 'static', 'extern', 'auto', 'register', 'const', 'volatile', 'restrict',
  'inline', '_Noreturn', '_Alignas', '_Atomic', '_Thread_local', '__inline', '__inline__', '__restrict',
  '__restrict__', '__attribute__', '__extension__', '__const', 'typeof', '__typeof__', '_Complex',
]);

/** Macros/identifiers users often forget to include, mapped to their header. */
const IDENT_HEADERS: Record<string, string> = {
  NULL: 'stddef.h', EOF: 'stdio.h', stdin: 'stdio.h', stdout: 'stdio.h', stderr: 'stdio.h',
  true: 'stdbool.h', false: 'stdbool.h', bool: 'stdbool.h', INT_MAX: 'limits.h', INT_MIN: 'limits.h',
  LONG_MAX: 'limits.h', UINT_MAX: 'limits.h', CHAR_MAX: 'limits.h', RAND_MAX: 'stdlib.h',
  EXIT_SUCCESS: 'stdlib.h', EXIT_FAILURE: 'stdlib.h', M_PI: 'math.h', INFINITY: 'math.h', NAN: 'math.h',
  size_t: 'stddef.h', FILE: 'stdio.h', int32_t: 'stdint.h', uint8_t: 'stdint.h', int64_t: 'stdint.h',
  uint32_t: 'stdint.h', uint64_t: 'stdint.h', va_list: 'stdarg.h', time_t: 'time.h', assert: 'assert.h',
  errno: 'errno.h', DBL_MAX: 'float.h', FLT_MAX: 'float.h',
};

class Scope {
  vars = new Map<string, Sym>();
  tags = new Map<string, StructType | IntType>();
  constructor(readonly parent: Scope | null) {}

  lookup(name: string): Sym | undefined {
    for (let s: Scope | null = this; s; s = s.parent) {
      const v = s.vars.get(name);
      if (v) return v;
    }
    return undefined;
  }

  lookupTag(name: string): StructType | IntType | undefined {
    for (let s: Scope | null = this; s; s = s.parent) {
      const v = s.tags.get(name);
      if (v) return v;
    }
    return undefined;
  }
}

interface DeclSpec {
  ty: CType;
  storage: 'typedef' | 'extern' | 'static' | 'auto' | 'register' | null;
  isInline: boolean;
  loc: SrcPos;
}

interface ParamInfo {
  syms: VarSym[];
  vla: VlaCalc[];
  scope: Scope;
}

interface Declarator {
  name: string | null;
  ty: CType;
  loc: SrcPos;
  nameTok?: Token;
  /** Parameters when this declarator declares a function directly. */
  params?: ParamInfo;
}

interface SwitchCtx {
  cases: CaseStmt[];
  defaultCase?: DefaultStmt;
  condTy: CType;
}

interface FuncCtx {
  sym: FuncSym;
  frameSize: number;
  visible: number;
  loopDepth: number;
  breakDepth: number;
  switches: SwitchCtx[];
  labels: Map<string, { defined: boolean; pos: SrcPos }>;
  locals: VarSym[];
  /** Innermost VLA stack-save slots for enclosing loops (break/continue restore). */
  loopSpSlots: (number | undefined)[];
  blockSpSlots: (number | undefined)[];
  pendingVla: VlaCalc[];
}

export interface ParseOptions {
  /** Library prototypes (from every built-in header) used for implicit declarations. */
  library?: Map<string, FuncSym>;
  internal?: boolean;
  headers?: Set<string>;
}

let symCounter = 1;
let caseCounter = 1;

export class Parser {
  private i = 0;
  private scope: Scope;
  private fn: FuncCtx | null = null;
  readonly globals: VarSym[] = [];
  readonly funcs: FuncSym[] = [];
  private funcByName = new Map<string, FuncSym>();
  private anonCounter = 0;
  private internal: boolean;
  private headers: Set<string>;

  constructor(
    private toks: Token[],
    private diags: DiagnosticBag,
    private opts: ParseOptions = {},
    globalScope?: Scope
  ) {
    this.scope = globalScope ?? new Scope(null);
    this.internal = !!opts.internal;
    this.headers = opts.headers ?? new Set();
    this.installBuiltinTypedefs();
  }

  get globalScope(): Scope {
    let s = this.scope;
    while (s.parent) s = s.parent;
    return s;
  }

  /** Re-target the parser at a new token stream sharing the same global scope (prelude). */
  continueWith(toks: Token[], internal: boolean): void {
    this.toks = toks;
    this.i = 0;
    this.internal = internal;
  }

  private installBuiltinTypedefs(): void {
    if (!this.scope.vars.has('__builtin_va_list')) {
      this.scope.vars.set('__builtin_va_list', {
        kind: 'typedef',
        name: '__builtin_va_list',
        ty: { ...ptrTo(T.char), alias: 'va_list' },
      });
    }
  }

  // ------------------------------------------------------------------ tokens

  private get tok(): Token {
    return this.toks[this.i];
  }

  private peek(n = 1): Token {
    return this.toks[Math.min(this.i + n, this.toks.length - 1)];
  }

  private prev(): Token {
    return this.toks[Math.max(0, this.i - 1)];
  }

  private is(s: string): boolean {
    const t = this.tok;
    return t.s === s && (t.k === 'punct' || t.k === 'id');
  }

  private isKw(s: string): boolean {
    return this.tok.k === 'id' && this.tok.s === s;
  }

  private eat(s: string): boolean {
    if (this.is(s)) {
      this.i++;
      return true;
    }
    return false;
  }

  private next(): Token {
    const t = this.tok;
    if (t.k !== 'eof') this.i++;
    return t;
  }

  private describe(t: Token): string {
    if (t.k === 'eof') return 'end of input';
    if (t.k === 'id' && !KEYWORDS.has(t.s)) return `'${t.s}'`;
    if (t.k === 'num') return 'numeric constant';
    if (t.k === 'str') return 'string constant';
    if (t.k === 'char') return 'character constant';
    if (t.k === 'id') return `'${t.s}'`;
    return `'${t.s}' token`;
  }

  private expect(s: string, what?: string): Token {
    if (this.is(s)) return this.next();
    const t = this.tok;
    const where = t.k === 'eof' ? 'at end of input' : `before ${this.describe(t)}`;
    const msg = `expected ${what ?? `'${s}'`} ${where}`;
    // gcc reports missing terminators right after the previous token.
    if ([';', ')', ']', '}'].includes(s) && this.i > 0) {
      const p = this.prev();
      this.diags.error(msg, { line: p.endLine, col: p.endCol, file: p.file });
    } else {
      this.diags.error(msg, t, { line: t.endLine, col: t.endCol });
    }
    throw new ParseError(msg);
  }

  private fail(msg: string, t: Token = this.tok): never {
    this.diags.error(msg, t, { line: t.endLine, col: t.endCol });
    throw new ParseError(msg);
  }

  private rangeFrom(start: Token | SrcPos): Range {
    const end = this.prev();
    return { line: start.line, col: start.col, endLine: end.endLine, endCol: end.endCol, file: start.file };
  }

  private tokRange(t: Token): Range {
    return { line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol, file: t.file };
  }

  private skipBalanced(): void {
    // Assumes current token is '(' ; skips to after the matching ')'.
    let depth = 0;
    do {
      const t = this.next();
      if (t.k === 'eof') return;
      if (t.s === '(') depth++;
      else if (t.s === ')') depth--;
    } while (depth > 0);
  }

  // ------------------------------------------------------------------ top level

  parseTranslationUnit(): void {
    while (this.tok.k !== 'eof') {
      try {
        if (this.eat(';')) continue;
        if (this.isKw('_Static_assert')) {
          this.staticAssert();
          continue;
        }
        if (this.isKw('asm') || this.isKw('__asm__')) this.fail('inline assembly is not supported');
        this.externalDeclaration();
      } catch (e) {
        if (e instanceof FatalError) throw e;
        if (!(e instanceof ParseError)) throw e;
        this.fn = null;
        while (this.scope.parent) this.scope = this.scope.parent;
        this.recoverTopLevel();
      }
    }
  }

  private recoverTopLevel(): void {
    let depth = 0;
    while (this.tok.k !== 'eof') {
      const t = this.next();
      if (t.s === '{') depth++;
      else if (t.s === '}') {
        depth--;
        if (depth <= 0) return;
      } else if (t.s === ';' && depth === 0) return;
    }
  }

  result(): TranslationUnit {
    return { globals: this.globals, funcs: this.funcs, headers: this.headers };
  }

  private externalDeclaration(): void {
    const startTok = this.tok;
    const spec = this.declspec(true);
    if (this.eat(';')) return;
    let first = true;
    for (;;) {
      const d = this.declarator(spec.ty);
      if (!d.name) this.fail('expected identifier or \'(\'', this.tok);
      if (spec.storage === 'typedef') {
        this.defineTypedef(d);
      } else if (isFunc(d.ty)) {
        const sym = this.declareFunction(d, spec);
        if (first && this.is('{')) {
          this.functionDefinition(sym, d, startTok);
          return;
        }
      } else {
        this.globalVariable(d, spec);
      }
      first = false;
      if (this.eat(',')) continue;
      if (isFunc(d.ty) && this.is('{')) this.fail('expected \';\' before \'{\' token');
      this.expect(';', "';'");
      return;
    }
  }

  private defineTypedef(d: Declarator): void {
    const name = d.name!;
    const existing = this.scope.vars.get(name);
    const ty = { ...d.ty, alias: name } as CType;
    if (existing) {
      if (existing.kind !== 'typedef' || !sameType(unqual(existing.ty), unqual(d.ty))) {
        this.diags.error(`conflicting types for '${name}'`, d.loc);
      }
      return;
    }
    this.scope.vars.set(name, { kind: 'typedef', name, ty });
    if (this.fn && this.fn.pendingVla.length) {
      // VLA typedef inside a function: sizes are computed where the typedef appears.
    }
  }

  private declareFunction(d: Declarator, spec: DeclSpec): FuncSym {
    const name = d.name!;
    const ty = d.ty as FuncType;
    const global = this.globalScope;
    const existing = this.funcByName.get(name) ?? (global.vars.get(name) as FuncSym | undefined);
    if (existing && existing.kind === 'func') {
      if (!sameType(existing.ty, ty)) {
        const msg = `conflicting types for '${name}'; have '${typeToString(ty)}'`;
        this.diags.error(msg, d.loc);
        this.diags.note(`previous declaration of '${name}' with type '${typeToString(existing.ty)}'`, existing.loc);
      } else if (existing.ty.noProto && !ty.noProto) {
        existing.ty = ty;
      }
      if (this.scope !== global) this.scope.vars.set(name, existing);
      return existing;
    }
    if (existing) {
      this.diags.error(`'${name}' redeclared as different kind of symbol`, d.loc);
    }
    const sym: FuncSym = {
      kind: 'func',
      name,
      ty,
      id: symCounter++,
      addr: 0,
      loc: d.loc,
      isStatic: spec.storage === 'static',
      internal: this.internal,
      header: d.loc.file && d.loc.file.startsWith('<') ? d.loc.file.slice(1, -1) : undefined,
    };
    global.vars.set(name, sym);
    if (this.scope !== global) this.scope.vars.set(name, sym);
    this.funcByName.set(name, sym);
    this.funcs.push(sym);
    return sym;
  }

  private globalVariable(d: Declarator, spec: DeclSpec): void {
    const name = d.name!;
    if (isVoid(d.ty)) {
      this.diags.error(`variable or field '${name}' declared void`, d.loc);
    }
    if (isVla(d.ty)) {
      this.diags.error(`variably modified '${name}' at file scope`, d.loc);
    }
    const existing = this.globalScope.vars.get(name);
    let sym: VarSym;
    if (existing && existing.kind === 'var') {
      sym = existing;
      if (!compatibleDecl(sym.ty, d.ty)) {
        this.diags.error(`conflicting types for '${name}'; have '${typeToString(d.ty)}'`, d.loc);
      } else if (isArray(sym.ty) && sym.ty.len === null && isArray(d.ty) && d.ty.len !== null) {
        sym.ty = d.ty;
      }
    } else {
      if (existing) this.diags.error(`'${name}' redeclared as different kind of symbol`, d.loc);
      sym = {
        kind: 'var', name, ty: d.ty, storage: 'global', offset: 0, addr: 0, id: symCounter++, loc: d.loc,
      };
      this.globalScope.vars.set(name, sym);
      this.globals.push(sym);
    }
    if (spec.storage !== 'extern') sym.defined = true;
    else sym.isExtern = true;
    if (this.eat('=')) {
      if (sym.init) this.diags.error(`redefinition of '${name}'`, d.loc);
      if (spec.storage === 'extern') this.diags.warning(`'${name}' initialized and declared 'extern'`, d.loc);
      sym.defined = true;
      sym.init = this.initializer(sym, true);
    }
    if (sym.defined && !isComplete(sym.ty) && !this.is(',')) {
      if (isArray(sym.ty) && sym.ty.len === null && !sym.init) {
        // Tentative `int a[];` becomes one element, as gcc does (with a warning).
        this.diags.warning(`array '${name}' assumed to have one element`, d.loc);
        sym.ty = arrayOf(sym.ty.of, 1);
      } else if (!isComplete(sym.ty)) {
        this.diags.error(`storage size of '${name}' isn't known`, d.loc);
      }
    }
  }

  private staticAssert(): void {
    const kw = this.next();
    this.expect('(');
    const e = this.condExpr();
    let msg = 'static assertion failed';
    if (this.eat(',')) {
      const s = this.next();
      if (s.k === 'str') msg = `static assertion failed: ${s.s}`;
    }
    this.expect(')');
    this.expect(';');
    const v = this.constInt(e);
    if (v !== null && v === 0n) this.diags.error(msg, kw);
  }

  // ------------------------------------------------------------------ functions

  private functionDefinition(sym: FuncSym, d: Declarator, startTok: Token): void {
    if (sym.def) {
      this.diags.error(`redefinition of '${sym.name}'`, d.loc);
      this.diags.note(`previous definition of '${sym.name}' was here`, sym.def.range);
    }
    const ty = sym.ty;
    const params = d.params ?? { syms: [], vla: [], scope: new Scope(this.scope) };
    const ctx: FuncCtx = {
      sym, frameSize: 0, visible: 0, loopDepth: 0, breakDepth: 0, switches: [],
      labels: new Map(), locals: [], loopSpSlots: [], blockSpSlots: [], pendingVla: [],
    };
    this.fn = ctx;
    const def: FuncDef = {
      sym, params: params.syms, body: undefined as never, frameSize: 0, vlaPrologue: params.vla,
      range: this.tokRange(startTok), endLoc: startTok, locals: ctx.locals,
    };
    sym.def = def;
    if (isStruct(ty.ret)) {
      def.sret = this.allocLocal('__sret', ptrTo(ty.ret), startTok, true);
    }
    if (!isVoid(ty.ret) && !isComplete(ty.ret)) {
      this.diags.error(`return type is an incomplete type`, d.loc);
    }
    // Parameters live in the function's outermost scope.
    const paramScope = new Scope(this.scope);
    for (const p of params.syms) {
      if (!p.name) {
        this.diags.error('parameter name omitted', p.loc);
        continue;
      }
      if (!isComplete(p.ty) && !isArray(p.ty)) {
        this.diags.error(`parameter '${p.name}' has incomplete type`, p.loc);
      }
      this.placeLocal(p);
      paramScope.vars.set(p.name, p);
      ctx.visible++;
    }
    for (const calc of params.vla) {
      calc.info.sizeSlot = this.allocLocal('__vla_size', T.ulong, startTok, true).offset;
    }
    const saved = this.scope;
    this.scope = paramScope;
    // __func__
    const fnName = sym.name;
    const bytes = [...new TextEncoder().encode(fnName), 0];
    const funcNameSym: VarSym = {
      kind: 'var', name: '__func__', ty: withConst(arrayOf(withConst(T.char), bytes.length)), storage: 'global',
      offset: 0, addr: 0, id: symCounter++, loc: startTok, hidden: true, defined: true, staticIn: fnName,
      init: { kind: 'list', items: [{ off: 0, ty: arrayOf(T.char, bytes.length), e: this.strNode(bytes, this.tokRange(startTok)) }] },
    };
    paramScope.vars.set('__func__', funcNameSym);

    const body = this.compoundStatement(true);
    def.body = body;
    def.endLoc = { line: this.prev().line, col: this.prev().col, file: this.prev().file };
    def.range = this.rangeFrom(startTok);
    def.frameSize = alignTo(ctx.frameSize, 16);
    this.scope = saved;
    if (funcNameSym.used) this.globals.push(funcNameSym);

    for (const [name, l] of ctx.labels) {
      if (!l.defined) this.diags.error(`label '${name}' used but not defined`, l.pos);
    }
    if (!isVoid(ty.ret) && sym.name !== 'main' && !this.internal && !alwaysReturns(body)) {
      this.diags.warning('control reaches end of non-void function', def.endLoc);
    }
    for (const v of ctx.locals) {
      if (!v.used && !v.hidden && !v.isParam && !v.name.startsWith('__')) {
        this.diags.warning(`unused variable '${v.name}'`, v.loc);
      }
    }
    this.fn = null;
  }

  /** Allocate frame space for a local object (arrays/structs get red zones for overflow detection). */
  private allocLocal(name: string, ty: CType, loc: SrcPos, hidden = false): VarSym {
    const sym: VarSym = {
      kind: 'var', name, ty, storage: 'local', offset: 0, addr: 0, id: symCounter++, loc, hidden,
    };
    this.placeLocal(sym);
    return sym;
  }

  private placeLocal(sym: VarSym): void {
    const ctx = this.fn!;
    const ty = sym.ty;
    const size = sym.vlaPtr ? 8 : Math.max(sizeOf(ty), 1);
    const big = !sym.vlaPtr && (isArray(ty) || isStruct(ty));
    const align = sym.vlaPtr ? 8 : Math.max(alignOf(ty), big ? 16 : 1);
    if (big) ctx.frameSize += 16;
    ctx.frameSize = alignTo(ctx.frameSize + size, align);
    sym.offset = ctx.frameSize;
    if (big) ctx.frameSize += 16;
    if (ctx.frameSize > 8 * 1024 * 1024) {
      this.diags.error(`stack frame of '${ctx.sym.name}' is too large (${ctx.frameSize} bytes)`, sym.loc);
      throw new FatalError('frame too large');
    }
    ctx.locals.push(sym);
  }

  // ------------------------------------------------------------------ local declarations

  private isTypeStart(t: Token = this.tok): boolean {
    if (t.k !== 'id') return false;
    if (TYPE_KEYWORDS.has(t.s)) return true;
    const sym = this.scope.lookup(t.s);
    return sym?.kind === 'typedef';
  }

  private localDeclaration(): Stmt {
    const startTok = this.tok;
    const ctx = this.fn!;
    const spec = this.declspec(false);
    const items: LocalDecl[] = [];
    const statics: VarSym[] = [];
    const vla: VlaCalc[] = [];
    if (this.eat(';')) {
      return { k: 'decl', items, vla, statics, loc: this.rangeFrom(startTok) };
    }
    for (;;) {
      ctx.pendingVla = [];
      const d = this.declarator(spec.ty);
      vla.push(...ctx.pendingVla);
      ctx.pendingVla = [];
      if (!d.name) this.fail("expected identifier or '('");
      const name = d.name;
      if (spec.storage === 'typedef') {
        this.defineTypedef(d);
      } else if (isFunc(d.ty)) {
        this.declareFunction(d, spec);
        if (this.is('{')) this.fail('nested functions are not supported in C');
      } else if (spec.storage === 'extern') {
        const g = this.globalScope.vars.get(name);
        let sym: VarSym;
        if (g && g.kind === 'var') sym = g;
        else {
          sym = { kind: 'var', name, ty: d.ty, storage: 'global', offset: 0, addr: 0, id: symCounter++, loc: d.loc, isExtern: true };
          this.globalScope.vars.set(name, sym);
          this.globals.push(sym);
        }
        this.declareInScope(name, sym, d.loc);
      } else if (spec.storage === 'static') {
        const sym: VarSym = {
          kind: 'var', name, ty: d.ty, storage: 'global', offset: 0, addr: 0, id: symCounter++, loc: d.loc,
          defined: true, staticIn: ctx.sym.name,
        };
        if (isVla(d.ty)) this.diags.error(`storage size of '${name}' isn't constant`, d.loc);
        this.declareInScope(name, sym, d.loc);
        if (this.eat('=')) sym.init = this.initializer(sym, true);
        if (!isComplete(sym.ty)) this.diags.error(`storage size of '${name}' isn't known`, d.loc);
        this.globals.push(sym);
        statics.push(sym);
        sym.used = true;
      } else {
        if (isVoid(d.ty)) this.diags.error(`variable or field '${name}' declared void`, d.loc);
        const vlaVar = isVla(d.ty);
        const sym: VarSym = {
          kind: 'var', name, ty: d.ty, storage: 'local', offset: 0, addr: 0, id: symCounter++, loc: d.loc,
          vlaPtr: vlaVar,
        };
        let init: Init | undefined;
        if (this.is('=')) {
          // The variable is in scope inside its own initializer (C semantics).
          this.declareInScope(name, sym, d.loc);
          this.next();
          if (vlaVar) this.fail('variable-sized object may not be initialized');
          init = this.initializer(sym, false);
          if (!sym.offset) this.placeLocal(sym);
        } else {
          if (!isComplete(d.ty) && !vlaVar) {
            this.diags.error(`storage size of '${name}' isn't known`, d.loc);
          } else {
            this.placeLocal(sym);
          }
          this.declareInScope(name, sym, d.loc);
        }
        if (!sym.offset && !this.fn!.locals.includes(sym)) this.placeLocal(sym);
        items.push({ sym, init });
        ctx.visible++;
      }
      if (this.eat(',')) continue;
      this.expect(';', "';'");
      break;
    }
    return { k: 'decl', items, vla, statics, loc: this.rangeFrom(startTok) };
  }

  private declareInScope(name: string, sym: Sym, loc: SrcPos): void {
    const existing = this.scope.vars.get(name);
    if (existing && existing !== sym) {
      if (existing.kind === 'var' && sym.kind === 'var' && existing.isExtern && sym.isExtern) return;
      this.diags.error(
        existing.kind === 'var' && sym.kind === 'var' ? `redefinition of '${name}'` : `'${name}' redeclared as different kind of symbol`,
        loc
      );
      if ('loc' in existing && existing.loc) this.diags.note(`previous definition of '${name}' was here`, existing.loc);
    } else if (this.fn && sym.kind === 'var' && sym.storage === 'local' && !sym.isParam) {
      // Shadowing a parameter in the function's top block is an error in C.
      const outer = this.scope.parent?.vars.get(name);
      if (outer && outer.kind === 'var' && outer.isParam && this.scope.parent?.parent === this.globalScope) {
        this.diags.error(`'${name}' redeclared as different kind of symbol`, loc);
      }
    }
    this.scope.vars.set(name, sym);
  }

  // ------------------------------------------------------------------ declaration specifiers

  private declspec(allowImplicitInt: boolean): DeclSpec {
    const startTok = this.tok;
    let storage: DeclSpec['storage'] = null;
    let isConst = false;
    let isVolatile = false;
    let isInline = false;
    let ty: CType | null = null;
    let counter = 0;
    const VOID = 1, BOOL = 1 << 2, CHAR = 1 << 4, SHORT = 1 << 6, INT = 1 << 8, LONG = 1 << 10,
      FLOAT = 1 << 12, DOUBLE = 1 << 14, OTHER = 1 << 16, SIGNED = 1 << 17, UNSIGNED = 1 << 18;

    for (;;) {
      const t = this.tok;
      if (t.k !== 'id') break;
      const s = t.s;
      if (s === 'typedef' || s === 'extern' || s === 'static' || s === 'auto' || s === 'register') {
        if (storage && storage !== s) this.diags.error('multiple storage classes in declaration specifiers', t);
        storage = s;
        this.next();
        continue;
      }
      if (s === '_Thread_local') {
        this.next();
        continue;
      }
      if (s === 'const' || s === '__const') {
        isConst = true;
        this.next();
        continue;
      }
      if (s === 'volatile' || s === '__volatile__' || s === 'restrict' || s === '__restrict' || s === '__restrict__' || s === '_Atomic') {
        if (s === 'volatile' || s === '__volatile__') isVolatile = true;
        this.next();
        if (s === '_Atomic' && this.is('(')) this.fail('_Atomic types are not supported');
        continue;
      }
      if (s === 'inline' || s === '__inline' || s === '__inline__' || s === '_Noreturn' || s === '__extension__') {
        isInline = true;
        this.next();
        continue;
      }
      if (s === '__attribute__') {
        this.skipAttribute();
        continue;
      }
      if (s === '_Alignas') {
        this.next();
        this.skipBalanced();
        continue;
      }
      if (s === '_Complex' || s === '_Imaginary') this.fail('complex types are not supported');

      if (s === 'struct' || s === 'union' || s === 'enum' || s === 'typeof' || s === '__typeof__') {
        if (counter) this.fail(`two or more data types in declaration specifiers`);
        this.next();
        ty = s === 'enum' ? this.enumSpecifier() : s === 'typeof' || s === '__typeof__' ? this.typeofSpecifier() : this.structSpecifier(s === 'union');
        counter += OTHER;
        continue;
      }
      if (counter === 0 && !this.isBaseTypeKeyword(s)) {
        const sym = this.scope.lookup(s);
        if (sym?.kind === 'typedef') {
          ty = sym.ty;
          counter += OTHER;
          this.next();
          continue;
        }
      }
      if (!this.isBaseTypeKeyword(s)) break;
      this.next();
      switch (s) {
        case 'void': counter += VOID; break;
        case '_Bool': counter += BOOL; break;
        case 'char': counter += CHAR; break;
        case 'short': counter += SHORT; break;
        case 'int': counter += INT; break;
        case 'long': counter += LONG; break;
        case 'float': counter += FLOAT; break;
        case 'double': counter += DOUBLE; break;
        case 'signed': counter |= SIGNED; break;
        case 'unsigned': counter |= UNSIGNED; break;
      }
      if (counter & OTHER && counter !== OTHER) this.fail('two or more data types in declaration specifiers', t);
      switch (counter) {
        case VOID: ty = T.void; break;
        case BOOL: ty = T.bool; break;
        case CHAR: ty = T.char; break;
        case SIGNED + CHAR: ty = T.schar; break;
        case UNSIGNED + CHAR: ty = T.uchar; break;
        case SHORT: case SHORT + INT: case SIGNED + SHORT: case SIGNED + SHORT + INT: ty = T.short; break;
        case UNSIGNED + SHORT: case UNSIGNED + SHORT + INT: ty = T.ushort; break;
        case INT: case SIGNED: case SIGNED + INT: ty = T.int; break;
        case UNSIGNED: case UNSIGNED + INT: ty = T.uint; break;
        case LONG: case LONG + INT: case SIGNED + LONG: case SIGNED + LONG + INT: ty = T.long; break;
        case LONG + LONG: case LONG + LONG + INT: case SIGNED + LONG + LONG: case SIGNED + LONG + LONG + INT: ty = T.llong; break;
        case UNSIGNED + LONG: case UNSIGNED + LONG + INT: ty = T.ulong; break;
        case UNSIGNED + LONG + LONG: case UNSIGNED + LONG + LONG + INT: ty = T.ullong; break;
        case FLOAT: ty = T.float; break;
        case DOUBLE: ty = T.double; break;
        case LONG + DOUBLE: ty = T.ldouble; break;
        default:
          this.fail('invalid combination of type specifiers', t);
      }
    }
    if (!ty) {
      if (storage || isConst || isVolatile || isInline || allowImplicitInt) {
        if (!(storage || isConst || isVolatile || isInline)) {
          const t = this.tok;
          if (t.k === 'id' && !KEYWORDS.has(t.s) && this.peek().k === 'id' && !KEYWORDS.has(this.peek().s)) {
            this.fail(`unknown type name '${t.s}'`, t);
          }
          if (!(t.k === 'id' && this.peek().s === '(')) this.fail(`expected declaration specifiers before ${this.describe(t)}`, t);
        }
        this.diags.warning(`type defaults to 'int' in declaration`, startTok);
        ty = T.int;
      } else {
        this.fail(`expected declaration specifiers before ${this.describe(this.tok)}`);
      }
    }
    if (isConst) ty = withConst(ty);
    if (isVolatile) ty = { ...ty, isVolatile: true };
    return { ty, storage, isInline, loc: startTok };
  }

  private isBaseTypeKeyword(s: string): boolean {
    return ['void', '_Bool', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned'].includes(s);
  }

  private skipAttribute(): void {
    this.next();
    if (this.is('(')) this.skipBalanced();
  }

  private typeofSpecifier(): CType {
    this.expect('(');
    let ty: CType;
    if (this.isTypeStart()) ty = this.typeName();
    else ty = this.expr().ty;
    this.expect(')');
    return ty;
  }

  private structSpecifier(union: boolean): CType {
    while (this.isKw('__attribute__')) this.skipAttribute();
    let tag: string | null = null;
    const tagTok = this.tok;
    if (this.tok.k === 'id' && !KEYWORDS.has(this.tok.s)) {
      tag = this.next().s;
    }
    if (tag && !this.is('{')) {
      // Reference (or forward declaration).
      const existing = this.is(';') ? this.scope.tags.get(tag) : this.scope.lookupTag(tag);
      if (existing) {
        if (existing.kind !== 'struct' || existing.union !== union) {
          this.diags.error(`'${tag}' defined as wrong kind of tag`, tagTok);
        }
        return existing;
      }
      const s = newStruct(tag, union);
      this.scope.tags.set(tag, s);
      return s;
    }
    if (!this.is('{')) this.fail(`expected '{' before ${this.describe(this.tok)}`);
    let s: StructType;
    const existing = tag ? this.scope.tags.get(tag) : undefined;
    if (existing && existing.kind === 'struct' && existing.fields === null && existing.union === union) {
      s = existing;
    } else {
      if (existing && tag) this.diags.error(`redefinition of '${union ? 'union' : 'struct'} ${tag}'`, tagTok);
      s = newStruct(tag, union);
      if (tag) this.scope.tags.set(tag, s);
    }
    this.expect('{');
    const members: { name: string; type: CType; loc: SrcPos }[] = [];
    while (!this.eat('}')) {
      if (this.tok.k === 'eof') this.fail("expected '}' at end of input");
      if (this.isKw('_Static_assert')) {
        this.staticAssert();
        continue;
      }
      const spec = this.declspec(false);
      if (this.is(';')) {
        this.next();
        if (isStruct(spec.ty) && !spec.ty.tag) {
          members.push({ name: '', type: spec.ty, loc: spec.loc });
        } else {
          this.diags.warning('declaration does not declare anything', spec.loc);
        }
        continue;
      }
      for (;;) {
        const d = this.declarator(spec.ty);
        if (this.is(':')) this.fail('bit-fields are not supported in C-It');
        if (!d.name) this.fail('expected member name');
        if (members.some((m) => m.name === d.name)) this.diags.error(`duplicate member '${d.name}'`, d.loc);
        if (isFunc(d.ty)) this.diags.error(`field '${d.name}' declared as a function`, d.loc);
        else if (isArray(d.ty) && d.ty.len === null && this.is(';') && this.peek().s === '}') {
          // Flexible array member.
          d.ty = arrayOf(d.ty.of, 0);
        } else if (!isComplete(d.ty)) {
          this.diags.error(`field '${d.name}' has incomplete type`, d.loc);
          d.ty = T.int;
        }
        members.push({ name: d.name, type: d.ty, loc: d.loc });
        if (this.eat(',')) continue;
        this.expect(';', "';'");
        break;
      }
    }
    while (this.isKw('__attribute__')) this.skipAttribute();
    layoutStruct(s, members);
    return s;
  }

  private enumSpecifier(): CType {
    let tag: string | null = null;
    const tagTok = this.tok;
    if (this.tok.k === 'id' && !KEYWORDS.has(this.tok.s)) tag = this.next().s;
    if (tag && !this.is('{')) {
      const existing = this.scope.lookupTag(tag);
      if (existing) {
        if (existing.kind !== 'int') this.diags.error(`'${tag}' defined as wrong kind of tag`, tagTok);
        return existing;
      }
      this.diags.error(`use of undefined enum '${tag}'`, tagTok);
      return { ...T.int, enumTag: tag };
    }
    const ty: IntType = { ...T.int, enumTag: tag, enumId: symCounter++ };
    if (tag) this.scope.tags.set(tag, ty);
    this.expect('{');
    let value = 0;
    while (!this.eat('}')) {
      const nameTok = this.next();
      if (nameTok.k !== 'id') this.fail('expected identifier', nameTok);
      if (this.eat('=')) {
        const v = this.constInt(this.condExpr());
        if (v === null) this.diags.error(`enumerator value for '${nameTok.s}' is not an integer constant`, nameTok);
        else value = Number(v);
      }
      const c: EnumConstSym = { kind: 'enumconst', name: nameTok.s, value, ty: T.int };
      this.declareInScope(nameTok.s, c, nameTok);
      value++;
      if (!this.eat(',')) {
        this.expect('}');
        break;
      }
    }
    return ty;
  }

  // ------------------------------------------------------------------ declarators

  private declarator(base: CType, abstract = false): Declarator {
    let ty = base;
    while (this.eat('*')) {
      ty = ptrTo(ty);
      for (;;) {
        if (this.isKw('const') || this.isKw('__const')) {
          this.next();
          ty = withConst(ty);
        } else if (this.isKw('volatile') || this.isKw('restrict') || this.isKw('__restrict') || this.isKw('__restrict__') || this.isKw('_Atomic')) {
          this.next();
        } else if (this.isKw('__attribute__')) {
          this.skipAttribute();
        } else break;
      }
    }
    if (this.is('(') && this.isNestedDeclarator()) {
      const start = this.i;
      this.skipBalanced();
      const suffix = this.typeSuffix(ty);
      const end = this.i;
      this.i = start + 1;
      const inner = this.declarator(suffix.ty, abstract);
      this.expect(')');
      this.i = end;
      return inner;
    }
    let name: string | null = null;
    let nameTok: Token | undefined;
    const loc: SrcPos = this.tok;
    if (this.tok.k === 'id' && !KEYWORDS.has(this.tok.s)) {
      nameTok = this.next();
      name = nameTok.s;
    } else if (!abstract && this.tok.k === 'id' && KEYWORDS.has(this.tok.s) && !TYPE_KEYWORDS.has(this.tok.s)) {
      this.fail(`expected identifier or '(' before ${this.describe(this.tok)}`);
    }
    const suffix = this.typeSuffix(ty);
    while (this.isKw('__attribute__') || this.isKw('__asm__') || this.isKw('asm')) this.skipAttribute();
    return { name, ty: suffix.ty, loc: nameTok ?? loc, nameTok, params: suffix.params };
  }

  private isNestedDeclarator(): boolean {
    const t = this.peek();
    if (t.s === '*' || t.s === '(' || t.s === '^') return true;
    if (t.k === 'id' && !KEYWORDS.has(t.s) && !this.isTypeStart(t)) return true;
    if (t.k === 'id' && t.s === '__attribute__') return true;
    return false;
  }

  private typeName(): CType {
    const spec = this.declspec(false);
    return this.declarator(spec.ty, true).ty;
  }

  private typeSuffix(ty: CType): { ty: CType; params?: ParamInfo } {
    if (this.is('(')) {
      this.next();
      return this.functionParams(ty);
    }
    if (this.eat('[')) {
      while (this.isKw('static') || this.isKw('const') || this.isKw('restrict') || this.isKw('volatile')) this.next();
      let len: number | null = null;
      let lenExpr: Expr | null = null;
      if (this.is('*') && this.peek().s === ']') {
        this.next();
      } else if (!this.is(']')) {
        const startTok = this.tok;
        const e = this.assign();
        if (!isInteger(e.ty)) this.diags.error('size of array has non-integer type', startTok);
        const v = this.constInt(e);
        if (v !== null) {
          if (v < 0n) this.diags.error('size of array is negative', startTok);
          else if (v > 0x7fffffffn) this.diags.error('size of array is too large', startTok);
          len = Number(v < 0n ? 0n : v);
        } else {
          lenExpr = e;
        }
      }
      this.expect(']');
      const inner = this.typeSuffix(ty);
      if (isFunc(inner.ty)) this.diags.error('declaration of array of functions', this.prev());
      if (isVoid(inner.ty)) this.diags.error('declaration of array of voids', this.prev());
      if (!isComplete(inner.ty) && !isVla(inner.ty) && inner.ty.kind !== 'func') {
        this.diags.error('array type has incomplete element type', this.prev());
      }
      const arr = arrayOf(inner.ty, len);
      if (lenExpr) {
        const info = { sizeSlot: -1 };
        arr.vla = info;
        const calc: VlaCalc = { info, len: this.convert(lenExpr, T.ulong), elem: inner.ty };
        if (this.paramVla) this.paramVla.push(calc);
        else if (this.fn) {
          info.sizeSlot = this.allocLocal('__vla_size', T.ulong, this.prev(), true).offset;
          this.fn.pendingVla.push(calc);
        } else {
          this.diags.error('variably modified type at file scope', this.prev());
          arr.vla = undefined;
          arr.len = 1;
        }
      }
      return { ty: arr };
    }
    return { ty };
  }

  private paramVla: VlaCalc[] | null = null;

  private functionParams(ret: CType): { ty: CType; params: ParamInfo } {
    const scope = new Scope(this.scope);
    const info: ParamInfo = { syms: [], vla: [], scope };
    const fty: FuncType = { kind: 'func', ret, params: [], variadic: false, noProto: false };
    if (isFunc(ret)) this.diags.error('function returning a function', this.prev());
    if (isArray(ret)) this.diags.error('function returning an array', this.prev());
    if (this.eat(')')) {
      fty.noProto = true;
      return { ty: fty, params: info };
    }
    if (this.isKw('void') && this.peek().s === ')') {
      this.next();
      this.next();
      return { ty: fty, params: info };
    }
    const savedScope = this.scope;
    const savedVla = this.paramVla;
    this.scope = scope;
    this.paramVla = info.vla;
    try {
      for (;;) {
        if (this.eat('...')) {
          fty.variadic = true;
          this.expect(')');
          break;
        }
        if (!this.isTypeStart()) {
          const t = this.tok;
          if (t.k === 'id' && !KEYWORDS.has(t.s)) this.fail(`unknown type name '${t.s}'`, t);
          this.fail(`expected declaration specifiers or '...' before ${this.describe(t)}`);
        }
        const spec = this.declspec(false);
        const d = this.declarator(spec.ty, true);
        let pty = d.ty;
        const declaredArray = isArray(pty) ? pty : undefined;
        if (isArray(pty)) pty = withConst(ptrTo(pty.of), false);
        else if (isFunc(pty)) pty = ptrTo(pty);
        if (isVoid(pty)) this.diags.error("'void' must be the only parameter", d.loc);
        fty.params.push({ name: d.name, type: pty });
        const sym: VarSym = {
          kind: 'var', name: d.name ?? '', ty: pty, storage: 'local', offset: 0, addr: 0, id: symCounter++,
          loc: d.loc, isParam: true, used: true, arrayParam: declaredArray,
        };
        info.syms.push(sym);
        if (d.name) {
          if (scope.vars.has(d.name)) this.diags.error(`redefinition of parameter '${d.name}'`, d.loc);
          scope.vars.set(d.name, sym);
        }
        if (this.eat(',')) continue;
        this.expect(')');
        break;
      }
    } finally {
      this.scope = savedScope;
      this.paramVla = savedVla;
    }
    return { ty: fty, params: info };
  }

  // ------------------------------------------------------------------ statements

  private compoundStatement(isFunctionBody = false): Stmt & { k: 'block' } {
    const startTok = this.expect('{');
    const ctx = this.fn!;
    const declsBefore = ctx.visible;
    if (!isFunctionBody) this.scope = new Scope(this.scope);
    const body: Stmt[] = [];
    const spSlotIndex = ctx.blockSpSlots.length;
    ctx.blockSpSlots.push(undefined);
    while (!this.is('}')) {
      if (this.tok.k === 'eof') {
        this.diags.error("expected '}' at end of input", startTok);
        break;
      }
      body.push(this.blockItem());
    }
    const endTok = this.tok;
    this.eat('}');
    const spSlot = ctx.blockSpSlots[spSlotIndex];
    ctx.blockSpSlots.pop();
    if (!isFunctionBody) this.scope = this.scope.parent!;
    ctx.visible = declsBefore;
    return {
      k: 'block', body, declsBefore, spSlot, endLoc: endTok, loc: this.rangeFrom(startTok),
    };
  }

  private blockItem(): Stmt {
    try {
      if (this.isKw('_Static_assert')) {
        const start = this.tok;
        this.staticAssert();
        return { k: 'empty', loc: this.rangeFrom(start) };
      }
      if (this.isTypeStart() && !(this.tok.k === 'id' && this.peek().s === ':' && !TYPE_KEYWORDS.has(this.tok.s))) {
        const d = this.localDeclaration();
        if (d.k === 'decl' && d.vla.length) this.noteVlaBlock();
        return d;
      }
      return this.statement();
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      return this.recoverStatement();
    }
  }

  /** Reserve a stack-pointer save slot for the innermost block that declares a VLA. */
  private noteVlaBlock(): void {
    const ctx = this.fn!;
    const idx = ctx.blockSpSlots.length - 1;
    if (idx >= 0 && ctx.blockSpSlots[idx] === undefined) {
      ctx.blockSpSlots[idx] = this.allocLocal('__vla_sp', T.ulong, this.tok, true).offset;
    }
  }

  private recoverStatement(): Stmt {
    const start = this.tok;
    let depth = 0;
    while (this.tok.k !== 'eof') {
      if (this.is('{')) depth++;
      if (this.is('}')) {
        if (depth === 0) break;
        depth--;
        this.next();
        if (depth === 0) break;
        continue;
      }
      if (this.is(';') && depth === 0) {
        this.next();
        break;
      }
      this.next();
    }
    return { k: 'empty', loc: this.rangeFrom(start) };
  }

  private statement(): Stmt {
    const t = this.tok;
    const ctx = this.fn!;
    if (t.k === 'id' && !KEYWORDS.has(t.s) && this.peek().s === ':' ) {
      this.next();
      this.next();
      const existing = ctx.labels.get(t.s);
      if (existing?.defined) this.diags.error(`duplicate label '${t.s}'`, t);
      ctx.labels.set(t.s, { defined: true, pos: t });
      const decls = ctx.visible;
      const body = this.is('}') ? ({ k: 'empty', loc: this.tokRange(t) } as Stmt) : this.statement();
      return { k: 'label', name: t.s, body, decls, loc: this.rangeFrom(t) };
    }
    if (t.k === 'id') {
      switch (t.s) {
        case 'if': return this.ifStatement();
        case 'while': return this.whileStatement();
        case 'do': return this.doStatement();
        case 'for': return this.forStatement();
        case 'switch': return this.switchStatement();
        case 'case': return this.caseStatement();
        case 'default': return this.defaultStatement();
        case 'return': return this.returnStatement();
        case 'break': {
          this.next();
          if (ctx.breakDepth === 0) this.diags.error('break statement not within loop or switch', t);
          this.expect(';', "';'");
          return { k: 'break', loc: this.rangeFrom(t) };
        }
        case 'continue': {
          this.next();
          if (ctx.loopDepth === 0) this.diags.error('continue statement not within a loop', t);
          this.expect(';', "';'");
          return { k: 'continue', loc: this.rangeFrom(t) };
        }
        case 'goto': {
          this.next();
          const l = this.next();
          if (l.k !== 'id') this.fail('expected identifier', l);
          if (!ctx.labels.has(l.s)) ctx.labels.set(l.s, { defined: false, pos: l });
          this.expect(';', "';'");
          return { k: 'goto', label: l.s, loc: this.rangeFrom(t) };
        }
        case 'else':
          this.fail(`'else' without a previous 'if'`);
      }
    }
    if (this.is('{')) return this.compoundStatement();
    if (this.eat(';')) return { k: 'empty', loc: this.rangeFrom(t) };
    if (t.k === 'id' && !KEYWORDS.has(t.s) && this.peek().k === 'id' && !KEYWORDS.has(this.peek().s) && !this.scope.lookup(t.s)) {
      this.fail(`unknown type name '${t.s}'`, t);
    }
    const e = this.expr();
    this.expect(';', "';'");
    this.checkUnusedValue(e);
    return { k: 'expr', e, loc: this.rangeFrom(t) };
  }

  private checkUnusedValue(e: Expr): void {
    if (e.k === 'binary' && ['==', '!=', '<', '>', '<=', '>='].includes(e.op)) {
      this.diags.warning('statement with no effect', e.loc);
    } else if (e.k === 'var' || e.k === 'int' || (e.k === 'binary' && !['<<', '>>'].includes(e.op))) {
      this.diags.warning('statement with no effect', e.loc);
    }
  }

  private condition(what: string): Expr {
    this.expect('(');
    const startTok = this.tok;
    if (this.is(')')) this.fail(`expected expression before ')' token`);
    const e = this.expr();
    this.expect(')');
    if (e.k === 'assign' && !(startTok.s === '(')) {
      this.diags.warning('suggest parentheses around assignment used as truth value', e.loc);
    }
    return this.scalarCondition(e, what);
  }

  private scalarCondition(e: Expr, what: string): Expr {
    const v = this.rv(e);
    if (!isScalar(v.ty)) {
      this.diags.error(`used ${typeToString(v.ty)} type value where scalar is required${what ? '' : ''}`, e.loc);
    }
    return v;
  }

  private ifStatement(): Stmt {
    const t = this.next();
    const c = this.condition('if');
    const hdr = this.rangeFrom(t);
    const then = this.subStatement();
    let f: Stmt | undefined;
    if (this.isKw('else')) {
      this.next();
      f = this.subStatement();
    }
    if (then.k === 'empty' && !f && this.prev().s === ';' && then.loc.line === hdr.endLine) {
      this.diags.warning("suggest braces around empty body in an 'if' statement", then.loc);
    }
    return { k: 'if', c, t: then, f, loc: hdr };
  }

  /** A sub-statement gets its own scope (C99 6.8.4p3) so declarations can't leak. */
  private subStatement(): Stmt {
    const ctx = this.fn!;
    const before = ctx.visible;
    this.scope = new Scope(this.scope);
    try {
      if (this.isTypeStart() && !(this.peek().s === ':')) {
        this.diags.error('a declaration is not a statement here; wrap it in braces', this.tok);
        return this.localDeclaration();
      }
      return this.statement();
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      return this.recoverStatement();
    } finally {
      this.scope = this.scope.parent!;
      ctx.visible = before;
    }
  }

  private loopBody(): Stmt {
    const ctx = this.fn!;
    ctx.loopDepth++;
    ctx.breakDepth++;
    try {
      return this.subStatement();
    } finally {
      ctx.loopDepth--;
      ctx.breakDepth--;
    }
  }

  private whileStatement(): Stmt {
    const t = this.next();
    const c = this.condition('while');
    const hdr = this.rangeFrom(t);
    const decls = this.fn!.visible;
    const body = this.loopBody();
    if (body.k === 'empty' && body.loc.line === hdr.endLine) {
      this.diags.warning("this 'while' clause does not guard its body (empty loop body)", body.loc);
    }
    return { k: 'while', c, body, decls, loc: hdr };
  }

  private doStatement(): Stmt {
    const t = this.next();
    const decls = this.fn!.visible;
    const body = this.loopBody();
    if (!this.isKw('while')) this.fail(`expected 'while' before ${this.describe(this.tok)}`);
    const w = this.next();
    const c = this.condition('do');
    this.expect(';', "';'");
    const condLoc = this.rangeFrom(w);
    return { k: 'do', body, c, decls, condLoc, loc: this.rangeFrom(t) };
  }

  private forStatement(): Stmt {
    const t = this.next();
    const ctx = this.fn!;
    const declsBefore = ctx.visible;
    this.expect('(');
    this.scope = new Scope(this.scope);
    const spSlotIndex = ctx.blockSpSlots.length;
    ctx.blockSpSlots.push(undefined);
    try {
      let init: Stmt | undefined;
      if (this.eat(';')) {
        init = undefined;
      } else if (this.isTypeStart()) {
        init = this.localDeclaration();
        if (init.k === 'decl') {
          for (const item of init.items) item.sym.used = true;
          if (init.vla.length) this.noteVlaBlock();
        }
      } else {
        const it = this.tok;
        const e = this.expr();
        this.expect(';', "';'");
        init = { k: 'expr', e, loc: this.rangeFrom(it) };
      }
      const declsInner = ctx.visible;
      let c: Expr | undefined;
      if (!this.is(';')) c = this.scalarCondition(this.expr(), 'for');
      this.expect(';', "';'");
      let step: Expr | undefined;
      if (!this.is(')')) step = this.expr();
      this.expect(')');
      const hdr = this.rangeFrom(t);
      const body = this.loopBody();
      return {
        k: 'for', init, c, step, body, declsBefore, declsInner, spSlot: ctx.blockSpSlots[spSlotIndex], loc: hdr,
      };
    } finally {
      ctx.blockSpSlots.pop();
      this.scope = this.scope.parent!;
      ctx.visible = declsBefore;
    }
  }

  private switchStatement(): Stmt {
    const t = this.next();
    const ctx = this.fn!;
    this.expect('(');
    let c = this.rv(this.expr());
    this.expect(')');
    const hdr = this.rangeFrom(t);
    if (!isInteger(c.ty)) {
      this.diags.error('switch quantity not an integer', c.loc);
    } else {
      c = this.convert(c, promote(c.ty));
    }
    const sw: SwitchCtx = { cases: [], condTy: c.ty };
    ctx.switches.push(sw);
    ctx.breakDepth++;
    const decls = ctx.visible;
    try {
      const body = this.subStatement();
      return { k: 'switch', c, body, cases: sw.cases, defaultCase: sw.defaultCase, decls, loc: hdr };
    } finally {
      ctx.switches.pop();
      ctx.breakDepth--;
    }
  }

  private caseStatement(): Stmt {
    const t = this.next();
    const ctx = this.fn!;
    const e = this.condExpr();
    const v = this.constInt(e);
    if (this.is('...')) this.fail('case ranges are not supported');
    this.expect(':', "':'");
    const sw = ctx.switches[ctx.switches.length - 1];
    let value: number | bigint = 0;
    if (v === null) this.diags.error('case label does not reduce to an integer constant', e.loc);
    if (!sw) this.diags.error("case label not within a switch statement", t);
    if (sw && v !== null) {
      value = runtimeInt(v, sw.condTy);
      if (sw.cases.some((cs) => cs.value === value)) this.diags.error('duplicate case value', e.loc);
    }
    const decls = ctx.visible;
    const node: CaseStmt = { k: 'case', value, body: { k: 'empty', loc: this.tokRange(t) }, decls, id: caseCounter++, loc: this.rangeFrom(t) };
    if (sw) sw.cases.push(node);
    node.body = this.is('}') ? { k: 'empty', loc: this.tokRange(t) } : this.caseBody();
    return node;
  }

  private caseBody(): Stmt {
    if (this.isTypeStart() && !(this.peek().s === ':')) {
      // C23 allows declarations after labels; gcc accepts them with a pedantic warning.
      const d = this.localDeclaration();
      return d;
    }
    return this.statement();
  }

  private defaultStatement(): Stmt {
    const t = this.next();
    const ctx = this.fn!;
    this.expect(':', "':'");
    const sw = ctx.switches[ctx.switches.length - 1];
    if (!sw) this.diags.error("'default' label not within a switch statement", t);
    else if (sw.defaultCase) this.diags.error('multiple default labels in one switch', t);
    const node: DefaultStmt = { k: 'default', body: { k: 'empty', loc: this.tokRange(t) }, decls: ctx.visible, id: caseCounter++, loc: this.rangeFrom(t) };
    if (sw) sw.defaultCase = node;
    node.body = this.is('}') ? { k: 'empty', loc: this.tokRange(t) } : this.caseBody();
    return node;
  }

  private returnStatement(): Stmt {
    const t = this.next();
    const ctx = this.fn!;
    const ret = ctx.sym.ty.ret;
    if (this.eat(';')) {
      if (!isVoid(ret)) {
        this.diags.warning(`'return' with no value, in function returning non-void`, t);
      }
      return { k: 'return', loc: this.rangeFrom(t) };
    }
    let e = this.rv(this.expr());
    this.expect(';', "';'");
    if (isVoid(ret)) {
      if (!isVoid(e.ty)) this.diags.warning(`'return' with a value, in function returning void`, t);
      return { k: 'return', e, loc: this.rangeFrom(t) };
    }
    e = this.assignConvert(e, ret, 'return', t);
    return { k: 'return', e, loc: this.rangeFrom(t) };
  }

  // ------------------------------------------------------------------ expressions

  expr(): Expr {
    const start = this.tok;
    let e = this.assign();
    while (this.is(',')) {
      this.next();
      const r = this.assign();
      const rr = this.rv(r);
      e = { k: 'comma', l: e, r: rr, ty: rr.ty, loc: this.rangeFrom(start) };
    }
    return e;
  }

  private static ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=']);

  private assign(): Expr {
    const start = this.tok;
    const l = this.condExpr();
    if (this.tok.k === 'punct' && Parser.ASSIGN_OPS.has(this.tok.s)) {
      const opTok = this.next();
      const r = this.assign();
      return this.makeAssign(opTok.s, l, r, start, opTok);
    }
    return l;
  }

  private condExpr(): Expr {
    const start = this.tok;
    const c = this.binaryExpr(0);
    if (!this.is('?')) return c;
    this.next();
    const t = this.is(':') ? c : this.expr(); // GNU `a ?: b`
    this.expect(':', "':'");
    const f = this.condExpr();
    return this.makeCond(this.scalarCondition(c, '?'), this.rv(t), this.rv(f), this.rangeFrom(start));
  }

  private makeCond(c: Expr, t: Expr, f: Expr, loc: Range): Expr {
    let ty: CType;
    if (isArith(t.ty) && isArith(f.ty)) {
      ty = commonType(t.ty, f.ty);
      t = this.convert(t, ty);
      f = this.convert(f, ty);
    } else if (isVoid(t.ty) || isVoid(f.ty)) {
      ty = T.void;
    } else if (isStruct(t.ty) && isStruct(f.ty) && t.ty.id === f.ty.id) {
      ty = t.ty;
    } else if (isPtr(t.ty) && isPtr(f.ty)) {
      ty = isVoid(t.ty.to) ? f.ty : t.ty;
      if (!compatible(t.ty, f.ty) && !isVoid(t.ty.to) && !isVoid(f.ty.to)) {
        this.diags.warning('pointer type mismatch in conditional expression', loc);
      }
      f = this.convert(f, ty);
      t = this.convert(t, ty);
    } else if (isPtr(t.ty) && this.isNullConst(f)) {
      ty = t.ty;
      f = this.convert(f, ty);
    } else if (isPtr(f.ty) && this.isNullConst(t)) {
      ty = f.ty;
      t = this.convert(t, ty);
    } else if ((isPtr(t.ty) && isInteger(f.ty)) || (isInteger(t.ty) && isPtr(f.ty))) {
      this.diags.warning('pointer/integer type mismatch in conditional expression', loc);
      ty = isPtr(t.ty) ? t.ty : f.ty;
      t = this.convert(t, ty);
      f = this.convert(f, ty);
    } else {
      this.diags.error('type mismatch in conditional expression', loc);
      ty = t.ty;
    }
    return { k: 'cond', c, t, f, ty, loc };
  }

  private static PREC: Record<string, number> = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6,
    '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
  };

  private binaryExpr(minPrec: number): Expr {
    const start = this.tok;
    let left = this.castExpr();
    for (;;) {
      const t = this.tok;
      const prec = t.k === 'punct' ? Parser.PREC[t.s] : undefined;
      if (prec === undefined || prec <= minPrec) return left;
      this.next();
      const right = this.binaryExpr(prec);
      left = this.makeBinary(t.s, left, right, this.rangeFrom(start), t);
    }
  }

  private invalidOperands(op: string, l: Expr, r: Expr, loc: Range): Expr {
    this.diags.error(
      `invalid operands to binary ${op} (have '${typeToString(l.ty)}' and '${typeToString(r.ty)}')`,
      loc
    );
    return this.intNode(0n, T.int, loc);
  }

  private makeBinary(op: string, l0: Expr, r0: Expr, loc: Range, opTok?: Token): Expr {
    const l = this.rv(l0);
    const r = this.rv(r0);
    if (op === '&&' || op === '||') {
      if (!isScalar(l.ty) || !isScalar(r.ty)) return this.invalidOperands(op, l, r, loc);
      return { k: 'logic', op, l, r, ty: T.int, loc };
    }
    if (isVoid(l.ty) || isVoid(r.ty)) {
      this.diags.error('void value not ignored as it ought to be', loc);
      return this.intNode(0n, T.int, loc);
    }
    const arith = (): Expr => {
      const ct = commonType(l.ty, r.ty);
      return { k: 'binary', op: op as BinOp, l: this.convert(l, ct), r: this.convert(r, ct), opTy: ct, ty: ct, loc };
    };
    switch (op) {
      case '+':
        if (isArith(l.ty) && isArith(r.ty)) return arith();
        if (isPtr(l.ty) && isInteger(r.ty)) return this.ptrAdd(l, r, false, loc);
        if (isInteger(l.ty) && isPtr(r.ty)) return this.ptrAdd(r, l, false, loc);
        return this.invalidOperands(op, l, r, loc);
      case '-':
        if (isArith(l.ty) && isArith(r.ty)) return arith();
        if (isPtr(l.ty) && isInteger(r.ty)) return this.ptrAdd(l, r, true, loc);
        if (isPtr(l.ty) && isPtr(r.ty)) {
          if (!compatible(unqual(l.ty.to), unqual(r.ty.to))) {
            this.diags.error(`invalid operands to binary - (have '${typeToString(l.ty)}' and '${typeToString(r.ty)}')`, loc);
          }
          return { k: 'ptrdiff', l, r, scale: this.scaleOf(l.ty.to, loc), ty: PTRDIFF_T, loc };
        }
        return this.invalidOperands(op, l, r, loc);
      case '*':
      case '/':
        if (!isArith(l.ty) || !isArith(r.ty)) return this.invalidOperands(op, l, r, loc);
        if (op === '/' && isInteger(r.ty) && this.constInt(r) === 0n) this.diags.warning('division by zero', loc);
        return arith();
      case '%':
        if (!isInteger(l.ty) || !isInteger(r.ty)) return this.invalidOperands(op, l, r, loc);
        if (this.constInt(r) === 0n) this.diags.warning('division by zero', loc);
        return arith();
      case '&':
      case '|':
      case '^':
        if (!isInteger(l.ty) || !isInteger(r.ty)) return this.invalidOperands(op, l, r, loc);
        return arith();
      case '<<':
      case '>>': {
        if (!isInteger(l.ty) || !isInteger(r.ty)) return this.invalidOperands(op, l, r, loc);
        const ty = promote(l.ty);
        const cnt = this.constInt(r);
        if (cnt !== null) {
          if (cnt < 0n) this.diags.warning(`${op === '<<' ? 'left' : 'right'} shift count is negative`, loc);
          else if (cnt >= BigInt(sizeOf(ty) * 8)) this.diags.warning(`${op === '<<' ? 'left' : 'right'} shift count >= width of type`, loc);
        }
        return { k: 'binary', op, l: this.convert(l, ty), r: this.convert(r, ty), opTy: ty, ty, loc };
      }
      case '==': case '!=': case '<': case '>': case '<=': case '>=': {
        if (isArith(l.ty) && isArith(r.ty)) {
          const ct = commonType(l.ty, r.ty);
          if (isInteger(l.ty) && isInteger(r.ty) && (ct as IntType).signed === false && op !== '==' && op !== '!=') {
            const signedSide = (l.ty as IntType).signed && this.constInt(l) === null ? l : (r.ty as IntType).signed && this.constInt(r) === null ? r : null;
            if (signedSide && sizeOf(promote(signedSide.ty)) >= sizeOf(ct)) {
              this.diags.warning('comparison of integer expressions of different signedness', loc);
            }
          }
          return { k: 'binary', op: op as BinOp, l: this.convert(l, ct), r: this.convert(r, ct), opTy: ct, ty: T.int, loc };
        }
        if (isPtr(l.ty) && isPtr(r.ty)) {
          if (!compatible(l.ty, r.ty) && !isVoid(l.ty.to) && !isVoid(r.ty.to)) {
            this.diags.warning('comparison of distinct pointer types lacks a cast', loc);
          }
          return { k: 'binary', op: op as BinOp, l, r: this.convert(r, l.ty), opTy: l.ty, ty: T.int, loc };
        }
        if (isPtr(l.ty) && isInteger(r.ty)) {
          if (!this.isNullConst(r)) this.diags.warning('comparison between pointer and integer', loc);
          return { k: 'binary', op: op as BinOp, l, r: this.convert(r, l.ty), opTy: l.ty, ty: T.int, loc };
        }
        if (isInteger(l.ty) && isPtr(r.ty)) {
          if (!this.isNullConst(l)) this.diags.warning('comparison between pointer and integer', loc);
          return { k: 'binary', op: op as BinOp, l: this.convert(l, r.ty), r, opTy: r.ty, ty: T.int, loc };
        }
        return this.invalidOperands(op, l, r, loc);
      }
    }
    void opTok;
    return this.invalidOperands(op, l, r, loc);
  }

  private scaleOf(elem: CType, loc: Range): Scale {
    if (isVla(elem)) return this.sizeExpr(elem, loc);
    if (isFunc(elem)) return 1;
    if (!isComplete(elem) && !isVoid(elem)) {
      this.diags.error(`invalid use of undefined type '${typeToString(elem)}'`, loc);
      return 1;
    }
    return sizeOf(elem);
  }

  private ptrAdd(p: Expr, i: Expr, neg: boolean, loc: Range): Expr {
    return { k: 'ptradd', p, i: this.convert(i, T.long), scale: this.scaleOf((p.ty as { to: CType }).to, loc), neg, ty: p.ty, loc };
  }

  /** Byte size of a type as an expression (runtime for VLAs). */
  private sizeExpr(ty: CType, loc: Range): Expr {
    if (isArray(ty) && ty.vla) return { k: 'vlasize', slot: ty.vla, ty: SIZE_T, loc };
    if (isArray(ty) && isVla(ty.of) && ty.len !== null) {
      const inner = this.sizeExpr(ty.of, loc);
      return { k: 'binary', op: '*', l: this.intNode(BigInt(ty.len), SIZE_T, loc), r: inner, opTy: SIZE_T, ty: SIZE_T, loc };
    }
    return this.intNode(BigInt(sizeOf(ty)), SIZE_T, loc);
  }

  private isLvalue(e: Expr): boolean {
    switch (e.k) {
      case 'var':
      case 'deref':
      case 'str':
      case 'complit':
        return true;
      case 'member':
        return this.isLvalue(e.e) || e.e.k === 'call';
      default:
        return false;
    }
  }

  private checkModifiable(e: Expr, what: 'assignment' | 'increment' | 'decrement', loc: Range): boolean {
    if (!this.isLvalue(e) || (e.k === 'member' && e.e.k === 'call')) {
      const msg =
        what === 'assignment'
          ? 'lvalue required as left operand of assignment'
          : `lvalue required as ${what} operand`;
      this.diags.error(msg, loc);
      return false;
    }
    if (isArray(e.ty)) {
      this.diags.error(
        what === 'assignment' ? 'assignment to expression with array type' : `lvalue required as ${what} operand`,
        loc
      );
      return false;
    }
    if (e.ty.isConst || (isStruct(e.ty) && e.ty.fields?.some((f) => f.type.isConst))) {
      const verb = what === 'assignment' ? 'assignment of' : `${what} of`;
      if (e.k === 'var') this.diags.error(`${verb} read-only variable '${e.sym.name}'`, loc);
      else if (e.k === 'member') this.diags.error(`${verb} read-only member '${e.field.name}'`, loc);
      else this.diags.error(`${verb} read-only location`, loc);
      return false;
    }
    if (e.k === 'str') {
      this.diags.error('assignment to string literal', loc);
      return false;
    }
    return true;
  }

  private makeAssign(op: string, l: Expr, r: Expr, start: Token, opTok: Token): Expr {
    const loc = this.rangeFrom(start);
    if (l.k === 'var') l.sym.used = true;
    if (!this.checkModifiable(l, 'assignment', loc)) return l;
    const lty = unqual(l.ty);
    if (op === '=') {
      if (isStruct(lty)) {
        const rr = this.rv(r);
        if (!isStruct(rr.ty) || rr.ty.id !== lty.id) {
          this.diags.error(
            `incompatible types when assigning to type '${typeToString(l.ty)}' from type '${typeToString(rr.ty)}'`,
            loc
          );
        }
        return { k: 'assign', l, r: rr, ty: lty, loc };
      }
      return { k: 'assign', l, r: this.assignConvert(r, lty, 'assign', opTok), ty: lty, loc };
    }
    const bop = op.slice(0, -1) as BinOp;
    const rr = this.rv(r);
    if (isPtr(lty) && (bop === '+' || bop === '-') && isInteger(rr.ty)) {
      return { k: 'compound', op: bop, l, r: this.convert(rr, T.long), opTy: lty, scale: this.scaleOf(lty.to, loc), ty: lty, loc };
    }
    const intOnly = ['%', '<<', '>>', '&', '|', '^'].includes(bop);
    if (!isArith(lty) || !isArith(rr.ty) || (intOnly && (!isInteger(lty) || !isInteger(rr.ty)))) {
      this.diags.error(
        `invalid operands to binary ${bop} (have '${typeToString(l.ty)}' and '${typeToString(rr.ty)}')`,
        loc
      );
      return l;
    }
    if ((bop === '/' || bop === '%') && isInteger(rr.ty) && this.constInt(rr) === 0n) this.diags.warning('division by zero', loc);
    const opTy = bop === '<<' || bop === '>>' ? promote(lty) : commonType(lty, rr.ty);
    return { k: 'compound', op: bop, l, r: this.convert(rr, opTy), opTy, ty: lty, loc };
  }

  private castExpr(): Expr {
    if (this.is('(') && this.isTypeStart(this.peek())) {
      const start = this.tok;
      this.next();
      const ty = this.typeName();
      this.expect(')');
      if (this.is('{')) {
        const lit = this.compoundLiteral(ty, start);
        return this.postfixOps(lit, start);
      }
      const e = this.castExpr();
      return this.makeCast(e, ty, this.rangeFrom(start));
    }
    return this.unary();
  }

  private makeCast(e0: Expr, ty: CType, loc: Range): Expr {
    const e = this.rv(e0);
    const target = unqual(ty);
    if (isVoid(target)) return { k: 'cast', e, ty: T.void, loc };
    if (isStruct(target) || isArray(target) || isFunc(target)) {
      this.diags.error(`conversion to non-scalar type requested`, loc);
      return e;
    }
    if (!isScalar(e.ty)) {
      this.diags.error(isVoid(e.ty) ? 'void value not ignored as it ought to be' : `used ${typeToString(e.ty)} type value where scalar is required`, loc);
      return this.intNode(0n, T.int, loc);
    }
    if (isFloat(e.ty) && isPtr(target)) {
      this.diags.error('cannot convert to a pointer type', loc);
      return e;
    }
    if (isPtr(e.ty) && isFloat(target)) {
      this.diags.error('pointer value used where a floating-point was expected', loc);
      return e;
    }
    if (isPtr(e.ty) && isInteger(target) && sizeOf(target) < 8 && target.name !== '_Bool') {
      this.diags.warning('cast from pointer to integer of different size', loc);
    }
    const c = this.convert(e, target);
    if (c === e) return { k: 'cast', e, ty: target, loc };
    return { ...c, loc } as Expr;
  }

  private compoundLiteral(ty: CType, start: Token): Expr {
    const loc0 = this.tokRange(start);
    if (!this.fn) {
      const sym: VarSym = {
        kind: 'var', name: `__complit${this.anonCounter++}`, ty, storage: 'global', offset: 0, addr: 0,
        id: symCounter++, loc: start, hidden: true, defined: true,
      };
      sym.init = this.initializer(sym, true);
      this.globals.push(sym);
      return { k: 'var', sym, ty: sym.ty, loc: this.rangeFrom(start) };
    }
    const sym: VarSym = {
      kind: 'var', name: `__complit${this.anonCounter++}`, ty, storage: 'local', offset: 0, addr: 0,
      id: symCounter++, loc: start, hidden: true,
    };
    const init = this.initializer(sym, false);
    this.placeLocal(sym);
    void loc0;
    return { k: 'complit', sym, init, ty: sym.ty, loc: this.rangeFrom(start) };
  }

  private unary(): Expr {
    const t = this.tok;
    if (t.k === 'punct') {
      switch (t.s) {
        case '++':
        case '--': {
          this.next();
          const e = this.unary();
          return this.makeIncDec(e, true, t.s === '++', this.rangeFrom(t));
        }
        case '&': {
          this.next();
          const e = this.castExpr();
          return this.makeAddr(e, this.rangeFrom(t));
        }
        case '*': {
          this.next();
          const e = this.castExpr();
          return this.makeDeref(e, this.rangeFrom(t));
        }
        case '+':
        case '-':
        case '~':
        case '!': {
          this.next();
          const e = this.rv(this.castExpr());
          const loc = this.rangeFrom(t);
          if (t.s === '!') {
            if (!isScalar(e.ty)) {
              this.diags.error(`wrong type argument to unary exclamation mark`, loc);
              return this.intNode(0n, T.int, loc);
            }
            return { k: 'unary', op: 'lnot', e, ty: T.int, loc };
          }
          if (t.s === '~' ? !isInteger(e.ty) : !isArith(e.ty)) {
            this.diags.error(`wrong type argument to ${t.s === '~' ? 'bit-complement' : `unary ${t.s === '+' ? 'plus' : 'minus'}`}`, loc);
            return this.intNode(0n, T.int, loc);
          }
          const pt = promote(e.ty);
          const pe = this.convert(e, pt);
          if (t.s === '+') return { ...pe, loc } as Expr;
          if (t.s === '-' && pe.k === 'int') return this.intNode(-BigInt(pe.v), pt, loc);
          if (t.s === '-' && pe.k === 'float') return { k: 'float', v: -pe.v, ty: pt, loc };
          return { k: 'unary', op: t.s === '-' ? 'neg' : 'bitnot', e: pe, ty: pt, loc };
        }
      }
    }
    if (t.k === 'id' && t.s === 'sizeof') {
      this.next();
      return this.sizeofExpr(t);
    }
    if (t.k === 'id' && (t.s === '_Alignof' || t.s === '__alignof__')) {
      this.next();
      this.expect('(');
      const ty = this.isTypeStart() ? this.typeName() : this.expr().ty;
      this.expect(')');
      return this.intNode(BigInt(alignOf(ty)), SIZE_T, this.rangeFrom(t));
    }
    return this.postfix();
  }

  private sizeofExpr(t: Token): Expr {
    let ty: CType;
    let operand: Expr | null = null;
    if (this.is('(') && this.isTypeStart(this.peek())) {
      this.next();
      ty = this.typeName();
      this.expect(')');
      if (this.is('{')) {
        const lit = this.postfixOps(this.compoundLiteral(ty, t), t);
        ty = lit.ty;
      }
    } else {
      operand = this.unary();
      ty = operand.ty;
    }
    const loc = this.rangeFrom(t);
    if (operand && operand.k === 'var' && operand.sym.arrayParam) {
      this.diags.warning(
        `'sizeof' on array function parameter '${operand.sym.name}' will return size of '${typeToString(operand.sym.ty)}'`,
        loc
      );
    }
    if (isFunc(ty)) {
      this.diags.warning("invalid application of 'sizeof' to a function type", loc);
      return this.intNode(1n, SIZE_T, loc);
    }
    if (isVoid(ty)) {
      this.diags.warning("invalid application of 'sizeof' to a void type", loc);
      return this.intNode(1n, SIZE_T, loc);
    }
    if (!isComplete(ty) && !isVla(ty)) {
      this.diags.error(`invalid application of 'sizeof' to incomplete type '${typeToString(ty)}'`, loc);
      return this.intNode(0n, SIZE_T, loc);
    }
    return this.sizeExpr(ty, loc);
  }

  private makeIncDec(e: Expr, pre: boolean, inc: boolean, loc: Range): Expr {
    if (e.k === 'var') e.sym.used = true;
    if (!this.checkModifiable(e, inc ? 'increment' : 'decrement', loc)) return e;
    const ty = unqual(e.ty);
    if (!isScalar(ty)) {
      this.diags.error(`wrong type argument to ${inc ? 'increment' : 'decrement'}`, loc);
      return e;
    }
    return { k: 'incdec', pre, inc, e, ty, scale: isPtr(ty) ? this.scaleOf(ty.to, loc) : undefined, loc };
  }

  private makeAddr(e: Expr, loc: Range): Expr {
    if (e.k === 'func') return { k: 'addr', e, ty: ptrTo(e.ty), loc };
    if (e.k === 'deref') {
      // &*p is just p (but keep the pointer type of the lvalue).
      return { k: 'addr', e, ty: ptrTo(e.ty), loc };
    }
    if (!this.isLvalue(e)) {
      this.diags.error("lvalue required as unary '&' operand", loc);
      return this.intNode(0n, T.int, loc);
    }
    if (e.k === 'var') e.sym.used = true;
    return { k: 'addr', e, ty: ptrTo(e.ty), loc };
  }

  private makeDeref(e0: Expr, loc: Range): Expr {
    const e = this.rv(e0);
    if (!isPtr(e.ty)) {
      this.diags.error(`invalid type argument of unary '*' (have '${typeToString(e.ty)}')`, loc);
      return this.intNode(0n, T.int, loc);
    }
    const to = e.ty.to;
    if (isVoid(to)) this.diags.warning("dereferencing 'void *' pointer", loc);
    else if (!isComplete(to) && !isFunc(to) && !isVla(to)) {
      this.diags.error(`dereferencing pointer to incomplete type '${typeToString(to)}'`, loc);
    }
    return { k: 'deref', e, ty: to, loc };
  }

  private postfix(): Expr {
    const start = this.tok;
    const e = this.primary();
    return this.postfixOps(e, start);
  }

  private postfixOps(e0: Expr, start: Token): Expr {
    let e = e0;
    for (;;) {
      const t = this.tok;
      if (t.k !== 'punct') return e;
      if (t.s === '[') {
        this.next();
        const idx = this.expr();
        this.expect(']');
        e = this.makeIndex(e, idx, this.rangeFrom(start));
      } else if (t.s === '(') {
        this.next();
        e = this.makeCall(e, start);
      } else if (t.s === '.' || t.s === '->') {
        this.next();
        const nameTok = this.next();
        if (nameTok.k !== 'id') this.fail(`expected identifier before ${this.describe(nameTok)}`, nameTok);
        e = this.makeMember(e, nameTok, t.s === '->', this.rangeFrom(start));
      } else if (t.s === '++' || t.s === '--') {
        this.next();
        e = this.makeIncDec(e, false, t.s === '++', this.rangeFrom(start));
      } else {
        return e;
      }
    }
  }

  private makeIndex(base0: Expr, idx0: Expr, loc: Range): Expr {
    let base = this.rv(base0);
    let idx = this.rv(idx0);
    if (isInteger(base.ty) && isPtr(idx.ty)) [base, idx] = [idx, base];
    if (!isPtr(base.ty)) {
      this.diags.error('subscripted value is neither array nor pointer nor vector', loc);
      return this.intNode(0n, T.int, loc);
    }
    if (!isInteger(idx.ty)) {
      this.diags.error('array subscript is not an integer', idx.loc);
      return this.intNode(0n, T.int, loc);
    }
    if (isCharType(idx.ty) && idx.k !== 'int' && !(idx.k === 'cast' && idx.e.k === 'int')) {
      this.diags.warning("array subscript has type 'char'", idx.loc);
    }
    // Constant out-of-bounds indexes into a known-size array.
    const arrTy = base0.ty;
    const ci = this.constInt(idx);
    if (ci !== null && isArray(arrTy) && arrTy.len !== null && arrTy.len > 0 && (ci < 0n || ci > BigInt(arrTy.len))) {
      this.diags.warning(
        `array subscript ${ci} is ${ci < 0n ? 'below' : 'above'} array bounds of '${typeToString(arrTy)}'`,
        loc
      );
    }
    const sum = this.ptrAdd(base, idx, false, loc);
    return this.makeDeref(sum, loc);
  }

  private makeMember(e0: Expr, nameTok: Token, arrow: boolean, loc: Range): Expr {
    let base = e0;
    if (arrow) {
      const p = this.rv(e0);
      if (!isPtr(p.ty) || !isStruct(p.ty.to)) {
        if (isStruct(p.ty)) {
          this.diags.error(`invalid type argument of '->' (have '${typeToString(p.ty)}'); did you mean to use '.'?`, loc);
        } else {
          this.diags.error(`invalid type argument of '->' (have '${typeToString(p.ty)}')`, loc);
        }
        return this.intNode(0n, T.int, loc);
      }
      base = { k: 'deref', e: p, ty: p.ty.to, loc: p.loc };
    }
    if (!isStruct(base.ty)) {
      if (isPtr(base.ty) && isStruct(base.ty.to)) {
        this.diags.error(
          `'${exprText(e0)}' is a pointer; did you mean to use '->'?`,
          loc
        );
      } else {
        this.diags.error(`request for member '${nameTok.s}' in something not a structure or union`, loc);
      }
      return this.intNode(0n, T.int, loc);
    }
    const st = base.ty;
    if (!st.fields) {
      this.diags.error(`invalid use of undefined type '${typeToString(st)}'`, loc);
      return this.intNode(0n, T.int, loc);
    }
    const path = findField(st, nameTok.s);
    if (!path) {
      this.diags.error(`'${typeToString(st)}' has no member named '${nameTok.s}'`, nameTok, { line: nameTok.endLine, col: nameTok.endCol });
      return this.intNode(0n, T.int, loc);
    }
    let cur = base;
    for (const f of path) {
      const fty = base.ty.isConst ? withConst(f.type) : f.type;
      cur = { k: 'member', e: cur, field: f, ty: fty, loc };
    }
    return cur;
  }

  private makeCall(callee0: Expr, start: Token): Expr {
    const callee = this.rv(callee0);
    const args: Expr[] = [];
    if (!this.is(')')) {
      for (;;) {
        args.push(this.assign());
        if (this.eat(',')) continue;
        break;
      }
    }
    this.expect(')');
    const loc = this.rangeFrom(start);
    const name = callee0.k === 'func' ? callee0.sym.name : callee0.k === 'var' ? callee0.sym.name : undefined;
    if (!isPtr(callee.ty) || !isFunc(callee.ty.to)) {
      this.diags.error(`called object ${name ? `'${name}' ` : ''}is not a function or function pointer`, loc);
      return this.intNode(0n, T.int, loc);
    }
    const fnTy = callee.ty.to;
    const fname = name ?? 'function';
    if (!fnTy.noProto) {
      if (args.length < fnTy.params.length) {
        this.diags.error(`too few arguments to function '${fname}'`, loc);
      } else if (args.length > fnTy.params.length && !fnTy.variadic) {
        this.diags.error(`too many arguments to function '${fname}'`, loc);
      }
    }
    const conv: Expr[] = args.map((a, idx) => {
      const p: Param | undefined = fnTy.noProto ? undefined : fnTy.params[idx];
      if (p) return this.assignConvert(a, unqual(p.type), 'arg', start, idx + 1, fname);
      // Default argument promotions.
      const v = this.rv(a);
      if (isVoid(v.ty)) this.diags.error('invalid use of void expression', v.loc);
      if (isFloat(v.ty) && v.ty.size === 4) return this.convert(v, T.double);
      if (isInteger(v.ty)) return this.convert(v, promote(v.ty));
      if (isStruct(v.ty) && fnTy.variadic) this.diags.error('passing structs through ... is not supported', v.loc);
      return v;
    });
    let sret: VarSym | undefined;
    if (isStruct(fnTy.ret)) {
      if (!this.fn) this.fail('function call in constant expression');
      sret = this.allocLocal(`__ret${this.anonCounter++}`, fnTy.ret, start, true);
    }
    if (callee0.k === 'func') callee0.sym.used = true;
    if (name) checkFormatCall(name, conv, this.diags, loc);
    return { k: 'call', callee, args: conv, fnTy, sret, ty: fnTy.ret, name, loc };
  }

  private undeclaredReported = new Set<string>();

  private primary(): Expr {
    const t = this.tok;
    if (t.k === 'punct' && t.s === '(') {
      this.next();
      if (this.is('{')) this.fail('statement expressions are not supported');
      const e = this.expr();
      this.expect(')');
      return { ...e, loc: this.rangeFrom(t) } as Expr;
    }
    if (t.k === 'num') {
      this.next();
      return this.numberLiteral(t);
    }
    if (t.k === 'char') {
      this.next();
      return this.charLiteral(t);
    }
    if (t.k === 'str') {
      const bytes: number[] = [];
      while (this.tok.k === 'str') {
        const s = this.next();
        if (/^[LuU]/.test(s.s) && !s.s.startsWith('u8')) this.fail('wide string literals are not supported', s);
        const body = s.s.slice(s.s.indexOf('"') + 1, -1);
        bytes.push(...decodeEscapes(body, (m) => this.diags.warning(m, s)));
      }
      bytes.push(0);
      return this.strNode(bytes, this.rangeFrom(t));
    }
    if (t.k === 'id') {
      if (t.s === '_Generic') this.fail('_Generic is not supported');
      if (t.s.startsWith('__builtin_')) return this.builtin();
      if (KEYWORDS.has(t.s)) this.fail(`expected expression before ${this.describe(t)}`);
      this.next();
      const sym = this.scope.lookup(t.s);
      const loc = this.tokRange(t);
      if (!sym) {
        if (this.is('(')) return this.implicitFunction(t);
        const key = `${this.fn?.sym.name ?? ''}:${t.s}`;
        if (!this.undeclaredReported.has(key)) {
          this.undeclaredReported.add(key);
          const suggestion = this.suggest(t.s);
          const where = this.fn ? ' (first use in this function)' : ' here (not in a function)';
          this.diags.error(`'${t.s}' undeclared${where}${suggestion ? `; did you mean '${suggestion}'?` : ''}`, t, { line: t.endLine, col: t.endCol });
          const header = IDENT_HEADERS[t.s];
          if (header) this.diags.note(`'${t.s}' is defined in header '<${header}>'; did you forget to '#include <${header}>'?`, t);
        }
        return this.intNode(0n, T.int, loc);
      }
      switch (sym.kind) {
        case 'var':
          sym.used = true;
          return { k: 'var', sym, ty: sym.ty, loc };
        case 'func':
          sym.used = true;
          return { k: 'func', sym, ty: sym.ty, loc };
        case 'enumconst':
          return this.intNode(BigInt(sym.value), T.int, loc);
        case 'typedef':
          this.fail(`expected expression before '${t.s}'`, t);
      }
    }
    if (t.k === 'eof') this.fail('expected expression at end of input');
    this.fail(`expected expression before ${this.describe(t)}`);
  }

  private suggest(name: string): string | null {
    let best: string | null = null;
    let bestD = name.length <= 3 ? 1 : 2;
    for (let s: Scope | null = this.scope; s; s = s.parent) {
      for (const cand of s.vars.keys()) {
        if (cand.startsWith('__')) continue;
        const d = editDistance(name, cand);
        if (d > 0 && d <= bestD) {
          bestD = d;
          best = cand;
        }
      }
    }
    return best;
  }

  private implicitFunction(t: Token): Expr {
    const lib = this.opts.library?.get(t.s);
    const loc = this.tokRange(t);
    this.diags.warning(`implicit declaration of function '${t.s}'`, t, { line: t.endLine, col: t.endCol });
    if (lib) {
      if (lib.header) this.diags.note(`include '<${lib.header}>' or provide a declaration of '${t.s}'`, t);
      const sym: FuncSym = { ...lib, id: symCounter++, addr: 0, def: undefined, used: true, loc: t };
      this.globalScope.vars.set(t.s, sym);
      this.funcByName.set(t.s, sym);
      this.funcs.push(sym);
      return { k: 'func', sym, ty: sym.ty, loc };
    }
    const sym: FuncSym = {
      kind: 'func', name: t.s, ty: { kind: 'func', ret: T.int, params: [], variadic: false, noProto: true },
      id: symCounter++, addr: 0, loc: t, used: true,
    };
    this.globalScope.vars.set(t.s, sym);
    this.funcByName.set(t.s, sym);
    this.funcs.push(sym);
    return { k: 'func', sym, ty: sym.ty, loc };
  }

  private builtin(): Expr {
    const t = this.next();
    const name = t.s;
    const loc = () => this.rangeFrom(t);
    this.expect('(');
    switch (name) {
      case '__builtin_va_start': {
        const ap = this.assign();
        this.expect(',');
        this.assign();
        this.expect(')');
        if (!this.fn?.sym.ty.variadic) this.diags.error("'va_start' used in function with fixed arguments", t);
        return { k: 'builtin', name: 'va_start', args: [ap], ty: T.void, loc: loc() };
      }
      case '__builtin_va_end': {
        const ap = this.assign();
        this.expect(')');
        return { k: 'builtin', name: 'va_end', args: [ap], ty: T.void, loc: loc() };
      }
      case '__builtin_va_copy': {
        const d = this.assign();
        this.expect(',');
        const s = this.assign();
        this.expect(')');
        return { k: 'builtin', name: 'va_copy', args: [d, this.rv(s)], ty: T.void, loc: loc() };
      }
      case '__builtin_va_arg': {
        const ap = this.assign();
        this.expect(',');
        const ty = this.typeName();
        this.expect(')');
        if (isStruct(ty)) this.diags.error('va_arg with struct types is not supported', t);
        const p = promote(ty);
        if (isInteger(ty) && sizeOf(ty) < 4) {
          this.diags.warning(`'${typeToString(ty)}' is promoted to '${typeToString(p)}' when passed through '...'`, t);
        }
        if (isFloat(ty) && ty.size === 4) this.diags.warning(`'float' is promoted to 'double' when passed through '...'`, t);
        return { k: 'builtin', name: 'va_arg', args: [ap], argTy: ty, ty: unqual(ty), loc: loc() };
      }
      case '__builtin_offsetof': {
        const ty = this.typeName();
        this.expect(',');
        let off = 0;
        let cur: CType = ty;
        for (;;) {
          const m = this.next();
          if (!isStruct(cur) || !cur.fields) this.fail('offsetof requires a struct type', m);
          const path = findField(cur, m.s);
          if (!path) this.fail(`'${typeToString(cur)}' has no member named '${m.s}'`, m);
          for (const f of path) off += f.offset;
          cur = path[path.length - 1].type;
          if (this.eat('.')) continue;
          while (this.eat('[')) {
            const e = this.constInt(this.expr());
            this.expect(']');
            if (!isArray(cur)) this.fail('subscripted value is not an array', m);
            off += Number(e ?? 0n) * sizeOf(cur.of);
            cur = cur.of;
          }
          if (this.eat('.')) continue;
          break;
        }
        this.expect(')');
        return this.intNode(BigInt(off), SIZE_T, loc());
      }
      case '__builtin_inff':
        this.expect(')');
        return { k: 'float', v: Infinity, ty: T.float, loc: loc() };
      case '__builtin_huge_val':
        this.expect(')');
        return { k: 'float', v: Infinity, ty: T.double, loc: loc() };
      case '__builtin_nanf':
        if (this.tok.k === 'str') this.next();
        this.expect(')');
        return { k: 'float', v: NaN, ty: T.float, loc: loc() };
      case '__builtin_isnan':
      case '__builtin_isinf':
      case '__builtin_isfinite':
      case '__builtin_signbit': {
        const e = this.rv(this.assign());
        this.expect(')');
        if (!isArith(e.ty)) this.diags.error(`non-floating-point argument in call to function '${name}'`, t);
        return { k: 'builtin', name: name.slice(10), args: [this.convert(e, T.double)], ty: T.int, loc: loc() };
      }
      case '__builtin_expect': {
        const e = this.assign();
        this.expect(',');
        this.assign();
        this.expect(')');
        return e;
      }
      case '__builtin_unreachable':
      case '__builtin_trap':
        this.expect(')');
        return { k: 'builtin', name: 'trap', args: [], ty: T.void, loc: loc() };
    }
    this.fail(`'${name}' is not supported`, t);
  }

  // ------------------------------------------------------------------ literals

  private numberLiteral(t: Token): Expr {
    const s = t.s;
    const loc = this.tokRange(t);
    const isHex = /^0[xX]/.test(s);
    const isFloatLit = isHex ? /[pP]/.test(s) || s.includes('.') : /[.eE]/.test(s) && !/^0[bB]/.test(s);
    if (isFloatLit) {
      const m = /^(.*?)([fFlL]?)$/.exec(s)!;
      let body = m[1];
      const suffix = m[2].toLowerCase();
      let v: number;
      if (isHex) {
        const hm = /^0[xX]([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?[pP]([+-]?\d+)$/.exec(body);
        if (!hm) {
          this.diags.error(`invalid suffix on floating constant`, t);
          return { k: 'float', v: 0, ty: T.double, loc };
        }
        const intPart = hm[1] ? parseInt(hm[1], 16) : 0;
        const frac = hm[2] ? parseInt(hm[2], 16) / Math.pow(16, hm[2].length) : 0;
        v = (intPart + frac) * Math.pow(2, Number(hm[3]));
      } else {
        if (!/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(body)) {
          const bad = body.replace(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/, '');
          this.diags.error(`invalid suffix "${bad}" on floating constant`, t);
          body = body.slice(0, body.length - bad.length) || '0';
        }
        v = Number(body);
      }
      if (suffix === 'f') return { k: 'float', v: Math.fround(v), ty: T.float, loc };
      if (suffix === 'l') return { k: 'float', v, ty: T.ldouble, loc };
      return { k: 'float', v, ty: T.double, loc };
    }
    const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]*|[1-9][0-9]*)([uUlL]*)$/.exec(s);
    if (!m || !/^(u|l|ul|lu|ll|ull|llu|)$/i.test(m[2]) || /^(lL|Ll)/.test(m[2].replace(/[uU]/g, ''))) {
      if (/^0[0-7]*[89]/.test(s)) this.diags.error(`invalid digit "${s.match(/[89]/)![0]}" in octal constant`, t);
      else {
        const digits = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)/.exec(s)?.[0] ?? '';
        this.diags.error(`invalid suffix "${s.slice(digits.length)}" on integer constant`, t);
      }
      return this.intNode(0n, T.int, loc);
    }
    const body = m[1];
    const suffix = m[2].toLowerCase();
    let v: bigint;
    if (/^0[bB]/.test(body)) v = BigInt(body);
    else if (/^0[0-7]+$/.test(body)) v = BigInt('0o' + body.slice(1));
    else v = BigInt(body);
    const decimal = !/^0[xXbB0-7]/.test(body) || body === '0';
    const unsigned = suffix.includes('u');
    const longCount = (suffix.match(/l/g) ?? []).length;
    const candidates: IntType[] = [];
    if (longCount === 0) candidates.push(...(unsigned ? [T.uint, T.ulong] : decimal ? [T.int, T.long] : [T.int, T.uint, T.long, T.ulong]));
    else if (longCount === 1) candidates.push(...(unsigned ? [T.ulong] : decimal ? [T.long] : [T.long, T.ulong]));
    else candidates.push(...(unsigned ? [T.ullong] : decimal ? [T.llong] : [T.llong, T.ullong]));
    for (const ct of candidates) {
      const max = ct.signed ? (1n << BigInt(ct.size * 8 - 1)) - 1n : (1n << BigInt(ct.size * 8)) - 1n;
      if (v <= max) return this.intNode(v, ct, loc);
    }
    if (v <= 0xffffffffffffffffn) {
      this.diags.warning('integer constant is so large that it is unsigned', t);
      return this.intNode(v, T.ulong, loc);
    }
    this.diags.warning('integer constant is too large for its type', t);
    return this.intNode(BigInt.asUintN(64, v), T.ulong, loc);
  }

  private charLiteral(t: Token): Expr {
    const loc = this.tokRange(t);
    const wide = /^[LuU]/.test(t.s);
    const body = t.s.slice(t.s.indexOf("'") + 1, -1);
    if (body.length === 0) {
      this.diags.error('empty character constant', t);
      return this.intNode(0n, T.int, loc);
    }
    const bytes = decodeEscapes(body, (m) => this.diags.warning(m, t));
    if (wide) {
      const cp = body.startsWith('\\') ? bytes[0] : body.codePointAt(0)!;
      return this.intNode(BigInt(cp), T.int, loc);
    }
    if (bytes.length > 1) {
      this.diags.warning('multi-character character constant', t);
      let v = 0;
      for (const b of bytes) v = ((v << 8) | b) >>> 0;
      return this.intNode(BigInt(v | 0), T.int, loc);
    }
    // Plain char is signed on x86-64.
    return this.intNode(BigInt((bytes[0] << 24) >> 24), T.int, loc);
  }

  strNode(bytes: number[], loc: Range): Expr {
    return { k: 'str', bytes, ty: arrayOf(T.char, bytes.length), loc };
  }

  intNode(v: bigint, ty: CType, loc: Range): Expr {
    return { k: 'int', v: runtimeInt(v, ty), ty, loc };
  }

  // ------------------------------------------------------------------ conversions

  rv(e: Expr): Expr {
    if (isArray(e.ty)) return { k: 'decay', e, ty: ptrTo(e.ty.of), loc: e.loc };
    if (isFunc(e.ty)) return { k: 'addr', e, ty: ptrTo(e.ty), loc: e.loc };
    return e;
  }

  convert(e0: Expr, to: CType): Expr {
    const e = this.rv(e0);
    const from = e.ty;
    if (isVoid(to)) return { k: 'cast', e, ty: T.void, loc: e.loc };
    if (sameType(unqual(from), unqual(to))) {
      if (from.alias || from.isConst) return { ...e, ty: to } as Expr;
      return e;
    }
    // Fold constant conversions.
    if (e.k === 'int' && isInteger(to)) return this.intNode(BigInt(e.v), to, e.loc);
    if (e.k === 'int' && isFloat(to)) return { k: 'float', v: floatValue(Number(e.v), to), ty: to, loc: e.loc };
    if (e.k === 'float' && isFloat(to)) return { k: 'float', v: floatValue(e.v, to), ty: to, loc: e.loc };
    if (e.k === 'float' && isInteger(to) && Number.isFinite(e.v)) {
      if (to.name === '_Bool') return this.intNode(e.v !== 0 ? 1n : 0n, to, e.loc);
      return this.intNode(BigInt(Math.trunc(e.v)), to, e.loc);
    }
    return { k: 'cast', e, ty: to, loc: e.loc };
  }

  isNullConst(e: Expr): boolean {
    if (isInteger(e.ty)) return this.constInt(e) === 0n;
    if (e.k === 'cast' && isPtr(e.ty) && isVoid(e.ty.to)) return this.isNullConst(e.e);
    return false;
  }

  private assignConvert(
    e0: Expr,
    to: CType,
    ctx: 'assign' | 'init' | 'return' | 'arg',
    at: Token,
    argN?: number,
    fname?: string
  ): Expr {
    const e = this.rv(e0);
    const from = e.ty;
    const loc = e.loc;
    const ts = (t: CType) => `'${typeToString(t)}'`;
    const phrase = (kind: 'incompatible' | 'ptrFromInt' | 'intFromPtr' | 'const'): string => {
      const verb = { assign: 'assignment to', init: 'initialization of', return: 'returning', arg: 'passing argument' }[ctx];
      if (ctx === 'arg') {
        const base = `passing argument ${argN} of '${fname}'`;
        if (kind === 'incompatible') return `${base} from incompatible pointer type`;
        if (kind === 'ptrFromInt') return `${base} makes pointer from integer without a cast`;
        if (kind === 'intFromPtr') return `${base} makes integer from pointer without a cast`;
        return `${base} discards 'const' qualifier from pointer target type`;
      }
      if (ctx === 'return') {
        if (kind === 'incompatible') return `returning ${ts(from)} from a function with incompatible return type ${ts(to)}`;
        if (kind === 'ptrFromInt') return `returning ${ts(from)} from a function with return type ${ts(to)} makes pointer from integer without a cast`;
        if (kind === 'intFromPtr') return `returning ${ts(from)} from a function with return type ${ts(to)} makes integer from pointer without a cast`;
        return `return discards 'const' qualifier from pointer target type`;
      }
      if (kind === 'incompatible') return `${verb} ${ts(to)} from incompatible pointer type ${ts(from)}`;
      if (kind === 'ptrFromInt') return `${verb} ${ts(to)} from ${ts(from)} makes pointer from integer without a cast`;
      if (kind === 'intFromPtr') return `${verb} ${ts(to)} from ${ts(from)} makes integer from pointer without a cast`;
      return `${verb} ${ts(to)} discards 'const' qualifier from pointer target type`;
    };
    const argNote = () => {
      if (ctx === 'arg') this.diags.note(`expected ${ts(to)} but argument is of type ${ts(from)}`, loc);
    };
    void at;

    if (isVoid(from)) {
      this.diags.error('void value not ignored as it ought to be', loc);
      return this.intNode(0n, to.kind === 'int' ? to : T.int, loc);
    }
    if (isArith(to) && isArith(from)) {
      if (isInteger(to) && to.name !== '_Bool') {
        const cv = this.constEval(e);
        if (typeof cv === 'bigint') {
          const wrapped = BigInt(runtimeInt(cv, to));
          if (wrapped !== cv && !(isInteger(from) && !from.signed && !to.signed)) {
            // Negative constant into unsigned is common and well-defined; skip that case.
            if (!(cv < 0n && !to.signed && isInteger(from) && sizeOf(from) <= sizeOf(to))) {
              this.diags.warning(
                `overflow in conversion from ${ts(promote(from))} to ${ts(to)} changes value from '${cv}' to '${wrapped}'`,
                loc
              );
            }
          }
        } else if (isFloat(from) && e.k === 'float' && !Number.isInteger(e.v)) {
          this.diags.warning(`conversion from ${ts(from)} to ${ts(to)} changes value from '${e.v}' to '${Math.trunc(e.v)}'`, loc);
        }
      }
      return this.convert(e, to);
    }
    if (isPtr(to)) {
      if (isPtr(from)) {
        const fromTo = from.to;
        const toTo = to.to;
        if (!isVoid(fromTo) && !isVoid(toTo) && !compatible(unqual(fromTo), unqual(toTo))) {
          this.diags.warning(phrase('incompatible'), loc);
          argNote();
        } else if (fromTo.isConst && !toTo.isConst) {
          this.diags.warning(phrase('const'), loc);
          argNote();
        }
        return this.convert(e, to);
      }
      if (this.isNullConst(e)) return this.convert(e, to);
      if (isInteger(from)) {
        this.diags.warning(phrase('ptrFromInt'), loc);
        argNote();
        return this.convert(e, to);
      }
    }
    if (isInteger(to) && isPtr(from)) {
      if (to.name !== '_Bool') {
        this.diags.warning(phrase('intFromPtr'), loc);
        argNote();
      }
      return this.convert(e, to);
    }
    if (isStruct(to) && isStruct(from) && to.id === from.id) return e;
    const what = ctx === 'arg' ? `for argument ${argN} of '${fname}'` : ctx === 'return' ? 'when returning' : ctx === 'init' ? 'when initializing' : 'when assigning to';
    this.diags.error(`incompatible types ${what} type ${ts(to)}${ctx === 'arg' ? '' : ` from type ${ts(from)}`}`, loc);
    argNote();
    return e;
  }

  // ------------------------------------------------------------------ initializers

  private initializer(sym: VarSym, isStatic: boolean): Init {
    void isStatic;
    const ty = sym.ty;
    const startTok = this.tok;
    if (!this.is('{') && !(isArray(ty) && this.tok.k === 'str')) {
      const e = this.assign();
      if (isArray(ty)) {
        this.diags.error('invalid initializer', e.loc);
        return { kind: 'list', items: [] };
      }
      if (isStruct(ty)) {
        const r = this.rv(e);
        if (!isStruct(r.ty) || r.ty.id !== ty.id) {
          this.diags.error(
            `invalid initializer: cannot initialize '${typeToString(ty)}' with '${typeToString(r.ty)}'`,
            e.loc
          );
        }
        return { kind: 'expr', e: r };
      }
      return { kind: 'expr', e: this.assignConvert(e, unqual(ty), 'init', startTok) };
    }
    const items: InitItem[] = [];
    sym.ty = this.initValue(ty, 0, items);
    return { kind: 'list', items };
  }

  private initValue(ty: CType, off: number, items: InitItem[]): CType {
    if (isArray(ty)) {
      if (isVla(ty)) this.fail('variable-sized object may not be initialized');
      const strAhead =
        this.tok.k === 'str' || (this.is('{') && this.peek().k === 'str' && (this.peek(2).s === '}' || (this.peek(2).s === ',' && this.peek(3).s === '}')));
      if (isCharType(ty.of) && strAhead) {
        const braced = this.eat('{');
        const e = this.primary();
        if (braced) {
          this.eat(',');
          this.expect('}');
        }
        if (e.k !== 'str') return ty;
        const len = ty.len ?? e.bytes.length;
        if (e.bytes.length - 1 > len) {
          this.diags.warning(`initializer-string for array of '${typeToString(ty.of)}' is too long`, e.loc);
        }
        items.push({ off, ty: arrayOf(ty.of, len), e });
        return ty.len === null ? arrayOf(ty.of, e.bytes.length) : ty;
      }
      if (this.eat('{')) {
        const n = this.initArrayElems(ty, off, items, true);
        return ty.len === null ? arrayOf(ty.of, n) : ty;
      }
      if (ty.len === null) {
        this.diags.error('invalid initializer', this.tok);
        return arrayOf(ty.of, 0);
      }
      this.initArrayElems(ty, off, items, false);
      return ty;
    }
    if (isStruct(ty)) {
      if (!ty.fields) {
        this.fail(`variable has incomplete type '${typeToString(ty)}'`);
      }
      if (this.eat('{')) {
        this.initStructFields(ty, off, items, true);
        return ty;
      }
      const save = this.i;
      const bag = this.diags.items.length;
      try {
        const e = this.rv(this.assign());
        if (isStruct(e.ty) && e.ty.id === ty.id) {
          items.push({ off, ty, e });
          return ty;
        }
      } catch (err) {
        if (!(err instanceof ParseError)) throw err;
      }
      // Brace elision: re-parse the tokens as field initializers.
      this.i = save;
      this.diags.items.length = bag;
      this.initStructFields(ty, off, items, false);
      return ty;
    }
    if (this.eat('{')) {
      if (this.is('}')) {
        this.next();
        items.push({ off, ty, e: this.convert(this.intNode(0n, T.int, this.tokRange(this.prev())), unqual(ty)) });
        return ty;
      }
      this.initValue(ty, off, items);
      while (this.eat(',')) {
        if (this.is('}')) break;
        this.diags.warning('excess elements in scalar initializer', this.tok);
        this.initValue(ty, 0, []);
      }
      this.expect('}');
      return ty;
    }
    const start = this.tok;
    const e = this.assign();
    items.push({ off, ty, e: this.assignConvert(e, unqual(ty), 'init', start) });
    return ty;
  }

  private moreElided(): boolean {
    if (!this.is(',')) return false;
    const n = this.peek();
    if (n.s === '}' || n.s === '[' || n.s === '.') return false;
    this.next();
    return true;
  }

  private initArrayElems(ty: CType & { kind: 'array' }, off: number, items: InitItem[], braced: boolean): number {
    const esz = sizeOf(ty.of);
    let idx = 0;
    let max = 0;
    let warned = false;
    for (;;) {
      if (braced && this.eat('}')) break;
      if (!braced && ((ty.len !== null && idx >= ty.len) || this.is('}'))) break;
      if (braced && this.is('[')) {
        this.next();
        const dt = this.tok;
        const v = this.constInt(this.condExpr());
        this.expect(']');
        this.eat('=');
        if (v === null) this.diags.error('array index in initializer not of integer type', dt);
        idx = Number(v ?? 0n);
        if (idx < 0 || (ty.len !== null && idx >= ty.len)) {
          this.diags.error('array index in initializer exceeds array bounds', dt);
          idx = 0;
        }
      }
      if (ty.len !== null && idx >= ty.len) {
        if (!warned) this.diags.warning('excess elements in array initializer', this.tok);
        warned = true;
        this.initValue(ty.of, 0, []);
      } else {
        this.initValue(ty.of, off + idx * esz, items);
      }
      idx++;
      max = Math.max(max, idx);
      if (braced) {
        if (!this.eat(',')) {
          this.expect('}');
          break;
        }
      } else if ((ty.len !== null && idx >= ty.len) || !this.moreElided()) {
        break;
      }
    }
    return max;
  }

  private initStructFields(st: StructType, off: number, items: InitItem[], braced: boolean): void {
    const fields = st.fields!;
    let fi = 0;
    let warned = false;
    let count = 0;
    for (;;) {
      if (braced && this.eat('}')) break;
      if (!braced && (fi >= fields.length || this.is('}') || (st.union && count > 0))) break;
      let target: { f: Field; extra: number } | null = null;
      if (braced && this.is('.')) {
        this.next();
        const nameTok = this.next();
        const path = findField(st, nameTok.s);
        this.eat('=');
        if (!path) {
          this.diags.error(`'${typeToString(st)}' has no member named '${nameTok.s}'`, nameTok);
          this.initValue(T.int, 0, []);
          if (!this.eat(',')) {
            this.expect('}');
            break;
          }
          continue;
        }
        fi = fields.indexOf(path[0]);
        let extra = 0;
        for (let k = 1; k < path.length; k++) extra += path[k].offset;
        target = { f: path[path.length - 1], extra: path[0].offset + extra - path[path.length - 1].offset };
      }
      if (target) {
        this.initValue(target.f.type, off + target.extra + target.f.offset, items);
      } else if (fi >= fields.length || (st.union && count > 0)) {
        if (!warned) this.diags.warning(`excess elements in ${st.union ? 'union' : 'struct'} initializer`, this.tok);
        warned = true;
        this.initValue(T.int, 0, []);
      } else {
        const f = fields[fi];
        this.initValue(f.type, off + f.offset, items);
      }
      fi++;
      count++;
      if (braced) {
        if (!this.eat(',')) {
          this.expect('}');
          break;
        }
      } else if (fi >= fields.length || st.union || !this.moreElided()) {
        break;
      }
    }
  }

  // ------------------------------------------------------------------ constant evaluation

  constInt(e: Expr): bigint | null {
    const v = this.constEval(e);
    return typeof v === 'bigint' ? v : null;
  }

  /** Evaluate an integer/floating constant expression, or null when not constant. */
  constEval(e: Expr): bigint | number | null {
    return constEval(e);
  }
}

// ------------------------------------------------------------------ helpers

export function constEval(e: Expr): bigint | number | null {
  switch (e.k) {
    case 'int':
      return BigInt(e.v);
    case 'float':
      return e.v;
    case 'cast': {
      const v = constEval(e.e);
      if (v === null) return null;
      if (isInteger(e.ty)) {
        if (typeof v === 'number') {
          if (!Number.isFinite(v)) return null;
          return BigInt(runtimeInt(e.ty.name === '_Bool' ? (v !== 0 ? 1n : 0n) : BigInt(Math.trunc(v)), e.ty));
        }
        return BigInt(runtimeInt(v, e.ty));
      }
      if (isFloat(e.ty)) return floatValue(Number(v), e.ty);
      if (isPtr(e.ty) && typeof v === 'bigint') return v;
      return null;
    }
    case 'unary': {
      const v = constEval(e.e);
      if (v === null) return null;
      if (e.op === 'lnot') return (typeof v === 'bigint' ? v === 0n : v === 0) ? 1n : 0n;
      if (typeof v === 'number') return e.op === 'neg' ? floatValue(-v, e.ty) : null;
      const r = e.op === 'neg' ? -v : ~v;
      return BigInt(runtimeInt(r, e.ty));
    }
    case 'binary': {
      const l = constEval(e.l);
      const r = constEval(e.r);
      if (l === null || r === null) return null;
      const cmp = ['==', '!=', '<', '>', '<=', '>='].includes(e.op);
      if (typeof l === 'number' || typeof r === 'number') {
        const a = Number(l);
        const b = Number(r);
        if (cmp) return compare(e.op, a, b) ? 1n : 0n;
        let x: number;
        switch (e.op) {
          case '+': x = a + b; break;
          case '-': x = a - b; break;
          case '*': x = a * b; break;
          case '/': x = a / b; break;
          default: return null;
        }
        return floatValue(x, e.ty);
      }
      if (cmp) {
        const ot = e.opTy;
        const a = isInteger(ot) ? BigInt(runtimeInt(l, ot)) : l;
        const b = isInteger(ot) ? BigInt(runtimeInt(r, ot)) : r;
        return compare(e.op, a, b) ? 1n : 0n;
      }
      let x: bigint;
      switch (e.op) {
        case '+': x = l + r; break;
        case '-': x = l - r; break;
        case '*': x = l * r; break;
        case '/': if (r === 0n) return null; x = l / r; break;
        case '%': if (r === 0n) return null; x = l % r; break;
        case '<<': x = l << (r & 63n); break;
        case '>>': x = l >> (r & 63n); break;
        case '&': x = l & r; break;
        case '|': x = l | r; break;
        case '^': x = l ^ r; break;
        default: return null;
      }
      return BigInt(runtimeInt(x, e.ty));
    }
    case 'logic': {
      const l = constEval(e.l);
      if (l === null) return null;
      const lt = typeof l === 'bigint' ? l !== 0n : l !== 0;
      if (e.op === '&&' && !lt) return 0n;
      if (e.op === '||' && lt) return 1n;
      const r = constEval(e.r);
      if (r === null) return null;
      return (typeof r === 'bigint' ? r !== 0n : r !== 0) ? 1n : 0n;
    }
    case 'cond': {
      const c = constEval(e.c);
      if (c === null) return null;
      return (typeof c === 'bigint' ? c !== 0n : c !== 0) ? constEval(e.t) : constEval(e.f);
    }
    default:
      return null;
  }
}

function compare(op: string, a: bigint | number, b: bigint | number): boolean {
  switch (op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    default: return a >= b;
  }
}

/** Wrap an integer to a C type, returning the VM's runtime representation. */
export function runtimeInt(v: bigint, ty: CType): number | bigint {
  if (ty.kind !== 'int') return ty.kind === 'ptr' ? Number(BigInt.asUintN(64, v)) : Number(v);
  if (ty.name === '_Bool') return v !== 0n ? 1 : 0;
  const bits = ty.size * 8;
  if (ty.size === 8) return ty.signed ? BigInt.asIntN(64, v) : BigInt.asUintN(64, v);
  return Number(ty.signed ? BigInt.asIntN(bits, v) : BigInt.asUintN(bits, v));
}

export function floatValue(v: number, ty: CType): number {
  return ty.kind === 'float' && ty.size === 4 ? Math.fround(v) : v;
}

function compatibleDecl(a: CType, b: CType): boolean {
  if (isArray(a) && isArray(b)) {
    return compatible(a.of, b.of) && (a.len === null || b.len === null || a.len === b.len);
  }
  return compatible(a, b);
}

/** Conservative "all paths return" check for -Wreturn-type. */
function alwaysReturns(s: Stmt): boolean {
  switch (s.k) {
    case 'return':
      return true;
    case 'block':
      return s.body.some((x) => alwaysReturns(x));
    case 'if':
      return !!s.f && alwaysReturns(s.t) && alwaysReturns(s.f);
    case 'while':
    case 'for': {
      const v = s.c ? constEval(s.c) : 1n;
      const infinite = v !== null && v !== 0n && v !== 0;
      return infinite && !containsBreak(s.body);
    }
    case 'do': {
      const v = constEval(s.c);
      return alwaysReturns(s.body) || (v !== null && v !== 0n && v !== 0 && !containsBreak(s.body));
    }
    case 'switch':
      // Conservative: assume a switch with a default label returns (avoids false positives).
      return !!s.defaultCase;
    case 'label':
    case 'case':
    case 'default':
      return alwaysReturns(s.body);
    case 'expr':
      return s.e.k === 'call' && ['exit', 'abort', '__assert_fail', '_Exit', 'quick_exit'].includes(s.e.name ?? '');
    case 'goto':
      return true;
    default:
      return false;
  }
}

function containsBreak(s: Stmt): boolean {
  switch (s.k) {
    case 'break':
      return true;
    case 'block':
      return s.body.some(containsBreak);
    case 'if':
      return containsBreak(s.t) || (!!s.f && containsBreak(s.f));
    case 'label':
    case 'case':
    case 'default':
      return containsBreak(s.body);
    default:
      return false; // nested loops/switches own their breaks
  }
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function exprText(e: Expr): string {
  switch (e.k) {
    case 'var':
      return e.sym.name;
    case 'member':
      return `${exprText(e.e)}.${e.field.name}`;
    case 'deref':
      return `*${exprText(e.e)}`;
    default:
      return 'expression';
  }
}

export type { Scope };
export { Scope as ParserScope };
export type { TypedefSym, FuncDef };
