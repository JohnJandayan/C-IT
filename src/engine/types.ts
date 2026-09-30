// C type system with x86-64 (LP64) sizes and alignment.

export type IntName =
  | '_Bool'
  | 'char'
  | 'signed char'
  | 'unsigned char'
  | 'short'
  | 'unsigned short'
  | 'int'
  | 'unsigned int'
  | 'long'
  | 'unsigned long'
  | 'long long'
  | 'unsigned long long';

interface Quals {
  isConst?: boolean;
  isVolatile?: boolean;
  /** Typedef name this type was spelled with (display only). */
  alias?: string;
}

export interface VoidType extends Quals {
  kind: 'void';
}

export interface IntType extends Quals {
  kind: 'int';
  name: IntName;
  size: 1 | 2 | 4 | 8;
  signed: boolean;
  /** Set for enum types (which behave as int). */
  enumTag?: string | null;
  enumId?: number;
}

export interface FloatType extends Quals {
  kind: 'float';
  name: 'float' | 'double' | 'long double';
  size: 4 | 8 | 16;
}

export interface PointerType extends Quals {
  kind: 'ptr';
  to: CType;
}

/** Runtime-sized array dimension (C99 VLA). */
export interface VlaInfo {
  /** Hidden frame slot (offset from frame pointer) holding the array's total byte size. */
  sizeSlot: number;
}

export interface ArrayType extends Quals {
  kind: 'array';
  of: CType;
  /** null = incomplete (e.g. `int a[]` before its initializer, or a VLA). */
  len: number | null;
  vla?: VlaInfo;
}

export interface Field {
  name: string;
  type: CType;
  offset: number;
}

export interface StructType extends Quals {
  kind: 'struct';
  tag: string | null;
  union: boolean;
  /** null while incomplete (forward-declared). */
  fields: Field[] | null;
  size: number;
  align: number;
  id: number;
}

export interface Param {
  name: string | null;
  type: CType;
}

export interface FuncType extends Quals {
  kind: 'func';
  ret: CType;
  params: Param[];
  variadic: boolean;
  /** Declared with an empty parameter list `f()`: no prototype. */
  noProto: boolean;
}

export type CType = VoidType | IntType | FloatType | PointerType | ArrayType | StructType | FuncType;

// ------------------------------------------------------------------ builtins

function int(name: IntName, size: 1 | 2 | 4 | 8, signed: boolean): IntType {
  return { kind: 'int', name, size, signed };
}

export const T = {
  void: { kind: 'void' } as VoidType,
  bool: int('_Bool', 1, false),
  char: int('char', 1, true),
  schar: int('signed char', 1, true),
  uchar: int('unsigned char', 1, false),
  short: int('short', 2, true),
  ushort: int('unsigned short', 2, false),
  int: int('int', 4, true),
  uint: int('unsigned int', 4, false),
  long: int('long', 8, true),
  ulong: int('unsigned long', 8, false),
  llong: int('long long', 8, true),
  ullong: int('unsigned long long', 8, false),
  float: { kind: 'float', name: 'float', size: 4 } as FloatType,
  double: { kind: 'float', name: 'double', size: 8 } as FloatType,
  ldouble: { kind: 'float', name: 'long double', size: 16 } as FloatType,
};

export const SIZE_T = T.ulong;
export const PTRDIFF_T = T.long;

export function ptrTo(to: CType): PointerType {
  return { kind: 'ptr', to };
}

export function arrayOf(of: CType, len: number | null): ArrayType {
  return { kind: 'array', of, len };
}

let structCounter = 1;
export function newStruct(tag: string | null, union: boolean): StructType {
  return { kind: 'struct', tag, union, fields: null, size: 0, align: 1, id: structCounter++ };
}

// ------------------------------------------------------------------ queries

export const isInteger = (t: CType): t is IntType => t.kind === 'int';
export const isFloat = (t: CType): t is FloatType => t.kind === 'float';
export const isArith = (t: CType): t is IntType | FloatType => t.kind === 'int' || t.kind === 'float';
export const isPtr = (t: CType): t is PointerType => t.kind === 'ptr';
export const isScalar = (t: CType): boolean => isArith(t) || isPtr(t);
export const isArray = (t: CType): t is ArrayType => t.kind === 'array';
export const isFunc = (t: CType): t is FuncType => t.kind === 'func';
export const isStruct = (t: CType): t is StructType => t.kind === 'struct';
export const isVoid = (t: CType): t is VoidType => t.kind === 'void';
export const isBool = (t: CType): boolean => t.kind === 'int' && t.name === '_Bool';
export const isVla = (t: CType): boolean =>
  t.kind === 'array' && (t.vla !== undefined || isVla(t.of));

export function isCharType(t: CType): boolean {
  return t.kind === 'int' && t.size === 1 && t.name !== '_Bool';
}

export function isComplete(t: CType): boolean {
  if (t.kind === 'void') return false;
  if (t.kind === 'struct') return t.fields !== null;
  if (t.kind === 'array') return (t.len !== null || t.vla !== undefined) && isComplete(t.of);
  return true;
}

/** Static size in bytes; VLAs return 0 (their size lives in a runtime slot). */
export function sizeOf(t: CType): number {
  switch (t.kind) {
    case 'void':
      return 1; // GNU extension: sizeof(void) == 1 for pointer arithmetic
    case 'int':
    case 'float':
      return t.size;
    case 'ptr':
      return 8;
    case 'array':
      return t.len === null ? 0 : t.len * sizeOf(t.of);
    case 'struct':
      return t.size;
    case 'func':
      return 1;
  }
}

export function alignOf(t: CType): number {
  switch (t.kind) {
    case 'int':
    case 'float':
      return t.size;
    case 'ptr':
      return 8;
    case 'array':
      return alignOf(t.of);
    case 'struct':
      return t.align;
    default:
      return 1;
  }
}

export function alignTo(n: number, a: number): number {
  return Math.ceil(n / a) * a;
}

export function unqual<U extends CType>(t: U): U {
  if (!t.isConst && !t.isVolatile && !t.alias) return t;
  const c = { ...t };
  delete c.isConst;
  delete c.isVolatile;
  delete c.alias;
  return c;
}

export function withConst<U extends CType>(t: U, isConst = true): U {
  if (!!t.isConst === isConst) return t;
  return { ...t, isConst };
}

/** Lay out struct/union fields, computing offsets, size and alignment. */
export function layoutStruct(s: StructType, members: { name: string; type: CType }[]): void {
  let offset = 0;
  let align = 1;
  const fields: Field[] = [];
  for (const m of members) {
    const a = alignOf(m.type);
    align = Math.max(align, a);
    if (s.union) {
      fields.push({ name: m.name, type: m.type, offset: 0 });
      offset = Math.max(offset, sizeOf(m.type));
    } else {
      offset = alignTo(offset, a);
      fields.push({ name: m.name, type: m.type, offset });
      offset += sizeOf(m.type);
    }
  }
  s.fields = fields;
  s.align = align;
  s.size = alignTo(offset, align);
}

/** Find a member, searching anonymous struct/union members too. Returns the path of fields. */
export function findField(s: StructType, name: string): Field[] | null {
  if (!s.fields) return null;
  for (const f of s.fields) {
    if (f.name === name) return [f];
    if (f.name === '' && f.type.kind === 'struct') {
      const inner = findField(f.type, name);
      if (inner) return [f, ...inner];
    }
  }
  return null;
}

// ------------------------------------------------------------------ conversions

const RANK: Record<IntName, number> = {
  _Bool: 0,
  char: 1,
  'signed char': 1,
  'unsigned char': 1,
  short: 2,
  'unsigned short': 2,
  int: 3,
  'unsigned int': 3,
  long: 4,
  'unsigned long': 4,
  'long long': 5,
  'unsigned long long': 5,
};

export function intRank(t: IntType): number {
  return RANK[t.name];
}

export function promote(t: CType): CType {
  if (t.kind === 'int' && intRank(t) < 3) return T.int;
  if (t.kind === 'int') return unqual({ ...t, enumTag: undefined, enumId: undefined, alias: undefined });
  return unqual(t);
}

function unsignedOf(t: IntType): IntType {
  switch (t.name) {
    case 'int':
      return T.uint;
    case 'long':
      return T.ulong;
    case 'long long':
      return T.ullong;
    default:
      return t;
  }
}

/** Usual arithmetic conversions. */
export function commonType(a: CType, b: CType): CType {
  if (a.kind === 'float' || b.kind === 'float') {
    const fa = a.kind === 'float' ? a.size : 0;
    const fb = b.kind === 'float' ? b.size : 0;
    const size = Math.max(fa, fb);
    return size === 16 ? T.ldouble : size === 8 ? T.double : T.float;
  }
  const pa = promote(a) as IntType;
  const pb = promote(b) as IntType;
  if (pa.name === pb.name) return pa;
  if (pa.signed === pb.signed) return intRank(pa) >= intRank(pb) ? pa : pb;
  const [u, s] = pa.signed ? [pb, pa] : [pa, pb];
  if (intRank(u) >= intRank(s)) return u;
  if (s.size > u.size) return s;
  return unsignedOf(s);
}

export function sameType(a: CType, b: CType): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'void':
      return true;
    case 'int':
      return a.name === (b as IntType).name && (a.enumId ?? 0) === ((b as IntType).enumId ?? 0);
    case 'float':
      return a.name === (b as FloatType).name;
    case 'ptr':
      return sameType(a.to, (b as PointerType).to) && !!a.to.isConst === !!(b as PointerType).to.isConst;
    case 'array': {
      const bb = b as ArrayType;
      return sameType(a.of, bb.of) && (a.len === null || bb.len === null || a.len === bb.len);
    }
    case 'struct':
      return a.id === (b as StructType).id;
    case 'func': {
      const bf = b as FuncType;
      if (!sameType(a.ret, bf.ret)) return false;
      if (a.noProto || bf.noProto) return true;
      if (a.variadic !== bf.variadic || a.params.length !== bf.params.length) return false;
      return a.params.every((p, i) => sameType(unqual(p.type), unqual(bf.params[i].type)));
    }
  }
}

/** Compatible ignoring top-level qualifiers and pointee qualifiers. */
export function compatible(a: CType, b: CType): boolean {
  if (a.kind === 'int' && b.kind === 'int') return a.name === b.name;
  if (a.kind === 'ptr' && b.kind === 'ptr') return compatible(unqual(a.to), unqual(b.to));
  return sameType(unqual(a), unqual(b));
}

// ------------------------------------------------------------------ printing

/** Render a type the way gcc does in diagnostics, e.g. `int *`, `char[6]`, `int (*)(int)`. */
export function typeToString(t: CType, inner = ''): string {
  const q = (ty: CType) => (ty.isConst ? 'const ' : '');
  if (t.alias && inner === '') return t.alias;
  switch (t.kind) {
    case 'void':
      return join(`${q(t)}void`, inner);
    case 'int':
      if (t.enumTag !== undefined) return join(`${q(t)}enum ${t.enumTag ?? '<anonymous>'}`, inner);
      return join(`${q(t)}${t.name === '_Bool' ? '_Bool' : t.name}`, inner);
    case 'float':
      return join(`${q(t)}${t.name}`, inner);
    case 'struct':
      return join(`${q(t)}${t.union ? 'union' : 'struct'} ${t.tag ?? '<anonymous>'}`, inner);
    case 'ptr': {
      const star = `*${t.isConst ? ' const' : ''}${inner ? (t.isConst ? ' ' : '') + inner : ''}`;
      const needParens = t.to.kind === 'array' || t.to.kind === 'func';
      return typeToString(t.to, needParens ? `(${star})` : star);
    }
    case 'array':
      return typeToString(t.of, `${inner}[${t.len ?? (t.vla ? '*' : '')}]`);
    case 'func': {
      const params = t.noProto
        ? ''
        : t.params.length === 0 && !t.variadic
        ? 'void'
        : [...t.params.map((p) => typeToString(p.type)), ...(t.variadic ? ['...'] : [])].join(', ');
      return typeToString(t.ret, `${inner}(${params})`);
    }
  }
}

function join(base: string, inner: string): string {
  if (!inner) return base;
  if (inner.startsWith('[') || (inner.startsWith('(') && !inner.startsWith('(*'))) return `${base}${inner}`;
  return `${base} ${inner}`;
}
