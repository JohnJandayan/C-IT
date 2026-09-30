// Typed AST produced by the parser (which also performs semantic analysis).

import type { SrcPos, SrcRange } from './diagnostics';
import type { CType, Field, FuncType } from './types';

export type Range = SrcRange;

export interface VarSym {
  kind: 'var';
  name: string;
  ty: CType;
  storage: 'local' | 'global';
  /** Locals: the object lives at `fp - offset`. */
  offset: number;
  /** Globals: absolute address, assigned by the compiler. */
  addr: number;
  id: number;
  loc: SrcPos;
  /** Compiler-generated temporaries are not shown to the user. */
  hidden?: boolean;
  /** Local VLA: the slot at `offset` holds a pointer to the runtime-allocated data. */
  vlaPtr?: boolean;
  isParam?: boolean;
  /** Parameter written with array syntax (adjusted to a pointer). */
  arrayParam?: CType;
  isExtern?: boolean;
  /** Global has a definition (possibly tentative) in this translation unit. */
  defined?: boolean;
  init?: Init;
  /** Static local variable: the function it belongs to. */
  staticIn?: string;
  used?: boolean;
}

export interface FuncSym {
  kind: 'func';
  name: string;
  ty: FuncType;
  id: number;
  addr: number;
  loc: SrcPos;
  def?: FuncDef;
  isStatic?: boolean;
  used?: boolean;
  /** Part of the built-in prelude (stepping skips over it). */
  internal?: boolean;
  /** Header that declares this function (for implicit-declaration notes). */
  header?: string;
}

export interface TypedefSym {
  kind: 'typedef';
  name: string;
  ty: CType;
}

export interface EnumConstSym {
  kind: 'enumconst';
  name: string;
  value: number;
  ty: CType;
}

export type Sym = VarSym | FuncSym | TypedefSym | EnumConstSym;

/** Runtime computation of a VLA dimension's byte size, stored in a hidden frame slot. */
export interface VlaCalc {
  info: { sizeSlot: number };
  len: Expr;
  elem: CType;
}

export interface FuncDef {
  sym: FuncSym;
  params: VarSym[];
  body: Stmt & { k: 'block' };
  frameSize: number;
  /** Hidden local holding the caller-provided address for struct return values. */
  sret?: VarSym;
  vlaPrologue: VlaCalc[];
  /** Hidden slots zeroed on entry (used for VLA stack-pointer save areas). */
  range: Range;
  endLoc: SrcPos;
  locals: VarSym[];
}

// ------------------------------------------------------------------ initializers

export interface InitItem {
  off: number;
  ty: CType;
  e: Expr;
}

export type Init =
  | { kind: 'expr'; e: Expr }
  | { kind: 'list'; items: InitItem[] };

// ------------------------------------------------------------------ expressions

export type BinOp =
  | '+' | '-' | '*' | '/' | '%' | '<<' | '>>' | '&' | '|' | '^'
  | '==' | '!=' | '<' | '>' | '<=' | '>=';

export type Scale = number | Expr;

interface EB {
  ty: CType;
  loc: Range;
}

export type Expr =
  | (EB & { k: 'int'; v: number | bigint })
  | (EB & { k: 'float'; v: number })
  | (EB & { k: 'str'; bytes: number[] })
  | (EB & { k: 'var'; sym: VarSym })
  | (EB & { k: 'func'; sym: FuncSym })
  | (EB & { k: 'unary'; op: 'neg' | 'bitnot' | 'lnot'; e: Expr })
  | (EB & { k: 'binary'; op: BinOp; l: Expr; r: Expr; opTy: CType })
  | (EB & { k: 'logic'; op: '&&' | '||'; l: Expr; r: Expr })
  | (EB & { k: 'ptradd'; p: Expr; i: Expr; scale: Scale; neg: boolean })
  | (EB & { k: 'ptrdiff'; l: Expr; r: Expr; scale: Scale })
  | (EB & { k: 'assign'; l: Expr; r: Expr })
  | (EB & { k: 'compound'; op: BinOp; l: Expr; r: Expr; opTy: CType; scale?: Scale })
  | (EB & { k: 'incdec'; pre: boolean; inc: boolean; e: Expr; scale?: Scale })
  | (EB & { k: 'cond'; c: Expr; t: Expr; f: Expr })
  | (EB & { k: 'comma'; l: Expr; r: Expr })
  | (EB & { k: 'call'; callee: Expr; args: Expr[]; fnTy: FuncType; sret?: VarSym; name?: string })
  | (EB & { k: 'deref'; e: Expr })
  | (EB & { k: 'addr'; e: Expr })
  | (EB & { k: 'decay'; e: Expr })
  | (EB & { k: 'member'; e: Expr; field: Field })
  | (EB & { k: 'cast'; e: Expr })
  | (EB & { k: 'vlasize'; slot: { sizeSlot: number } })
  | (EB & { k: 'complit'; sym: VarSym; init: Init })
  | (EB & { k: 'builtin'; name: string; args: Expr[]; argTy?: CType });

export type ExprKind = Expr['k'];

// ------------------------------------------------------------------ statements

export interface LocalDecl {
  sym: VarSym;
  init?: Init;
}

interface SB {
  loc: Range;
}

export type Stmt =
  | (SB & { k: 'expr'; e: Expr })
  | (SB & { k: 'decl'; items: LocalDecl[]; vla: VlaCalc[]; statics: VarSym[] })
  | (SB & { k: 'block'; body: Stmt[]; declsBefore: number; spSlot?: number; endLoc: SrcPos })
  | (SB & { k: 'if'; c: Expr; t: Stmt; f?: Stmt })
  | (SB & { k: 'while'; c: Expr; body: Stmt; decls: number })
  | (SB & { k: 'do'; body: Stmt; c: Expr; decls: number; condLoc: Range })
  | (SB & { k: 'for'; init?: Stmt; c?: Expr; step?: Expr; body: Stmt; declsBefore: number; declsInner: number; spSlot?: number })
  | (SB & { k: 'return'; e?: Expr })
  | (SB & { k: 'break'; vlaRestore?: number })
  | (SB & { k: 'continue'; vlaRestore?: number })
  | (SB & { k: 'goto'; label: string })
  | (SB & { k: 'label'; name: string; body: Stmt; decls: number })
  | (SB & { k: 'switch'; c: Expr; body: Stmt; cases: CaseStmt[]; defaultCase?: DefaultStmt; decls: number })
  | CaseStmt
  | DefaultStmt
  | (SB & { k: 'empty' });

export type CaseStmt = SB & { k: 'case'; value: number | bigint; body: Stmt; decls: number; id: number };
export type DefaultStmt = SB & { k: 'default'; body: Stmt; decls: number; id: number };

export interface TranslationUnit {
  globals: VarSym[];
  funcs: FuncSym[];
  /** Headers included by the program. */
  headers: Set<string>;
}
