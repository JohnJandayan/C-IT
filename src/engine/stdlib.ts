// Native implementations of the C standard library. Every memory access goes
// through the VM's checked memory, so overflows inside strcpy etc. are caught.

import { MT } from './compiler';
import { ArgSource, formatPrintf } from './format';
import { CRuntimeError } from './memory';
import type { CType } from './types';
import type { StdinBuffer, VM } from './vm';

export const NEED_INPUT = Symbol('need-input');

export type NativeFn = (vm: VM, args: unknown[], types: CType[], ret: CType) => unknown;

const STDIN = 0x10;
const STDOUT = 0x20;
const STDERR = 0x30;

const num = (v: unknown): number => Number(v);

// ------------------------------------------------------------------ printf

function directArgs(args: unknown[], start: number): ArgSource {
  let i = start;
  const src: ArgSource = {
    missing: false,
    int(bits, signed) {
      if (i >= args.length) {
        src.missing = true;
        return 0n;
      }
      const v = args[i++];
      const b = typeof v === 'bigint' ? v : BigInt(Math.trunc(Number(v) || 0));
      return signed ? BigInt.asIntN(bits, b) : BigInt.asUintN(bits, b);
    },
    double() {
      if (i >= args.length) {
        src.missing = true;
        return 0;
      }
      return Number(args[i++]);
    },
    ptr() {
      if (i >= args.length) {
        src.missing = true;
        return 0;
      }
      return Number(args[i++]);
    },
    addr() {
      return src.ptr();
    },
  };
  return src;
}

function vaArgs(vm: VM, ap: number): ArgSource {
  let p = ap;
  const src: ArgSource = {
    missing: false,
    int(bits, signed) {
      const mt = bits === 64 ? (signed ? MT.I64 : MT.U64) : signed ? MT.I32 : MT.U32;
      const v = vm.load(p, mt);
      p += 8;
      const b = typeof v === 'bigint' ? v : BigInt(v);
      return signed ? BigInt.asIntN(bits, b) : BigInt.asUintN(bits, b);
    },
    double() {
      const v = vm.load(p, MT.F64) as number;
      p += 8;
      return v;
    },
    ptr() {
      const v = vm.load(p, MT.PTR) as number;
      p += 8;
      return v;
    },
    addr() {
      return src.ptr();
    },
  };
  return src;
}

function format(vm: VM, fmtAddr: unknown, src: ArgSource): string {
  if (num(fmtAddr) === 0) throw new CRuntimeError('null-deref', 'printf called with a NULL format string');
  const fmt = vm.readCString(num(fmtAddr));
  const s = formatPrintf(fmt, src, {
    cstring: (a, max) => vm.readCString(a, max),
    storeCount: (a, count, bits) => vm.store(a, bits === 64 ? MT.I64 : bits === 16 ? MT.I16 : bits === 8 ? MT.I8 : MT.I32, bits === 64 ? BigInt(count) : count),
  });
  if (src.missing) vm.warn('printf format expects more arguments than were passed (the extra values are garbage)', `fmtmissing:${fmt}`);
  return s;
}

function streamKind(stream: unknown, fn: string): 'out' | 'err' | 'in' {
  const s = num(stream);
  if (s === STDOUT) return 'out';
  if (s === STDERR) return 'err';
  if (s === STDIN) return 'in';
  if (s === 0) throw new CRuntimeError('null-deref', `${fn}() called with a NULL FILE* (did fopen fail?)`);
  throw new CRuntimeError('SEGV', `${fn}() called with an invalid FILE*`);
}

function writeStream(vm: VM, stream: unknown, text: string, fn: string): void {
  const k = streamKind(stream, fn);
  if (k === 'in') throw new CRuntimeError('SEGV', `${fn}() cannot write to stdin`);
  vm.output(k, text);
}

function putString(vm: VM, dest: unknown, s: string, limit?: number): void {
  let text = s;
  if (limit !== undefined) {
    if (limit <= 0) return;
    text = s.slice(0, limit - 1);
  }
  vm.writeBytes(num(dest), text + '\0');
}

// ------------------------------------------------------------------ input

interface Reader {
  /** Next byte, -1 at EOF, -2 when more interactive input is needed. */
  peek(): number;
  next(): void;
  consumed: number;
  commit(): void;
}

const NEED = -2;

function stdinReader(buf: StdinBuffer): Reader {
  let pos = buf.pos;
  const start = pos;
  return {
    peek() {
      if (pos < buf.buf.length) return buf.buf.charCodeAt(pos) & 0xff;
      return buf.eof ? -1 : NEED;
    },
    next() {
      pos++;
    },
    get consumed() {
      return pos - start;
    },
    commit() {
      buf.pos = pos;
    },
  };
}

function stringReader(s: string): Reader {
  let pos = 0;
  return {
    peek() {
      return pos < s.length ? s.charCodeAt(pos) & 0xff : -1;
    },
    next() {
      pos++;
    },
    get consumed() {
      return pos;
    },
    commit() {},
  };
}

const isSpace = (c: number) => c === 32 || (c >= 9 && c <= 13);

interface Pending {
  addr: number;
  mt?: number;
  v?: unknown;
  bytes?: string;
}

function intMt(len: string, unsigned: boolean): number {
  if (len === 'hh') return unsigned ? MT.U8 : MT.I8;
  if (len === 'h') return unsigned ? MT.U16 : MT.I16;
  if (len === '') return unsigned ? MT.U32 : MT.I32;
  return unsigned ? MT.U64 : MT.I64;
}

/** Shared scanf engine. Returns the number of assignments, -1 for EOF, or NEED_INPUT. */
function scanCore(vm: VM, fmt: string, rd: Reader, ptrs: unknown[]): number | typeof NEED_INPUT {
  let count = 0;
  let ai = 0;
  let converted = false;
  const pending: Pending[] = [];
  let i = 0;
  const nextPtr = (): number => {
    if (ai >= ptrs.length) throw new CRuntimeError('SEGV', 'scanf format has more conversions than pointer arguments');
    const p = num(ptrs[ai++]);
    if (p < 0x1000) {
      throw new CRuntimeError(
        'null-deref',
        p === 0
          ? 'scanf was given a NULL pointer'
          : `scanf was given the value ${p} instead of an address (did you forget '&'?)`
      );
    }
    return p;
  };
  const finish = (): number => {
    for (const p of pending) {
      if (p.bytes !== undefined) vm.writeBytes(p.addr, p.bytes);
      else vm.store(p.addr, p.mt!, p.v);
    }
    rd.commit();
    return count;
  };
  const skipWs = (): number => {
    for (;;) {
      const c = rd.peek();
      if (c < 0 || !isSpace(c)) return c;
      rd.next();
    }
  };

  while (i < fmt.length) {
    const f = fmt.charCodeAt(i);
    if (isSpace(f)) {
      if (skipWs() === NEED) return NEED_INPUT;
      while (i < fmt.length && isSpace(fmt.charCodeAt(i))) i++;
      continue;
    }
    if (fmt[i] !== '%' || fmt[i + 1] === '%') {
      if (fmt[i] === '%') {
        i++;
        if (skipWs() === NEED) return NEED_INPUT;
      }
      const c = rd.peek();
      if (c === NEED) return NEED_INPUT;
      if (c === -1) return converted ? finish() : (rd.commit(), -1);
      if (c !== fmt.charCodeAt(i)) return finish();
      rd.next();
      i++;
      continue;
    }
    i++;
    let suppress = false;
    if (fmt[i] === '*') {
      suppress = true;
      i++;
    }
    let width = 0;
    while (fmt[i] >= '0' && fmt[i] <= '9') width = width * 10 + Number(fmt[i++]);
    let len = '';
    const lm = /^(hh|h|ll|l|L|z|j|t|q)/.exec(fmt.slice(i, i + 2));
    if (lm) {
      len = lm[1];
      i += len.length;
    }
    const conv = fmt[i++];
    if (conv === undefined) break;
    if (conv === 'n') {
      if (!suppress) pending.push({ addr: nextPtr(), mt: intMt(len, false), v: rd.consumed });
      continue;
    }
    if (conv !== 'c' && conv !== '[') {
      const c = skipWs();
      if (c === NEED) return NEED_INPUT;
      if (c === -1) return converted || count ? finish() : (rd.commit(), -1);
    } else {
      const c = rd.peek();
      if (c === NEED) return NEED_INPUT;
      if (c === -1) return converted || count ? finish() : (rd.commit(), -1);
    }
    const maxw = width || Infinity;
    let taken = 0;
    const take = (): number => {
      const c = rd.peek();
      if (taken >= maxw) return -1;
      return c;
    };
    const accept = () => {
      rd.next();
      taken++;
    };
    converted = true;
    switch (conv) {
      case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
        let s = '';
        let c = take();
        if (c === NEED) return NEED_INPUT;
        if (c === 43 || c === 45) {
          s += String.fromCharCode(c);
          accept();
          c = take();
          if (c === NEED) return NEED_INPUT;
        }
        let base = conv === 'o' ? 8 : conv === 'x' || conv === 'X' || conv === 'p' ? 16 : conv === 'i' ? 0 : 10;
        if ((base === 0 || base === 16) && c === 48) {
          s += '0';
          accept();
          c = take();
          if (c === NEED) return NEED_INPUT;
          if (c === 120 || c === 88) {
            accept();
            c = take();
            if (c === NEED) return NEED_INPUT;
            base = 16;
          } else if (base === 0) base = 8;
        }
        if (base === 0) base = 10;
        let digits = s.endsWith('0') ? '0' : '';
        if (digits) s = s.slice(0, -1);
        for (;;) {
          if (c < 0) {
            if (c === NEED && taken < maxw) return NEED_INPUT;
            break;
          }
          const d = digitValue(c);
          if (d < 0 || d >= base) break;
          digits += String.fromCharCode(c);
          accept();
          c = take();
        }
        if (!digits) return finish();
        let v = BigInt(base === 10 ? digits : (base === 16 ? '0x' : base === 8 ? '0o' : '') + digits);
        if (s === '-') v = -v;
        if (!suppress) {
          const addr = nextPtr();
          if (conv === 'p') pending.push({ addr, mt: MT.PTR, v: Number(BigInt.asUintN(64, v)) });
          else {
            const mt = intMt(len, 'uoxX'.includes(conv));
            const bits = mt === MT.I8 || mt === MT.U8 ? 8 : mt === MT.I16 || mt === MT.U16 ? 16 : mt === MT.I32 || mt === MT.U32 ? 32 : 64;
            const w = BigInt.asIntN(bits, v);
            pending.push({ addr, mt, v: bits === 64 ? w : Number(w) });
          }
          count++;
        }
        break;
      }
      case 'f': case 'e': case 'g': case 'E': case 'G': case 'a': case 'F': {
        let s = '';
        const readWhile = (pred: (c: number) => boolean): boolean | 'need' => {
          let any = false;
          for (;;) {
            const c = take();
            if (c === NEED) return 'need';
            if (c < 0 || !pred(c)) return any;
            s += String.fromCharCode(c);
            accept();
            any = true;
          }
        };
        let c = take();
        if (c === NEED) return NEED_INPUT;
        if (c === 43 || c === 45) {
          s += String.fromCharCode(c);
          accept();
          c = take();
        }
        if (c === 105 || c === 73 || c === 110 || c === 78) {
          if (readWhile((x) => /[a-zA-Z]/.test(String.fromCharCode(x))) === 'need') return NEED_INPUT;
        } else {
          const isDigit = (x: number) => x >= 48 && x <= 57;
          const r1 = readWhile(isDigit);
          if (r1 === 'need') return NEED_INPUT;
          let hadDigits = r1 === true;
          if (take() === 46) {
            s += '.';
            accept();
            const r2 = readWhile(isDigit);
            if (r2 === 'need') return NEED_INPUT;
            hadDigits = hadDigits || r2 === true;
          }
          if (!hadDigits) return finish();
          const e = take();
          if (e === 101 || e === 69) {
            s += 'e';
            accept();
            const sg = take();
            if (sg === 43 || sg === 45) {
              s += String.fromCharCode(sg);
              accept();
            }
            if (readWhile(isDigit) === 'need') return NEED_INPUT;
          }
        }
        const lower = s.toLowerCase();
        let v = lower.includes('inf') ? (s.startsWith('-') ? -Infinity : Infinity) : lower.includes('nan') ? NaN : parseFloat(s);
        if (Number.isNaN(v) && !lower.includes('nan')) return finish();
        if (!suppress) {
          const mt = len === 'l' || len === 'L' ? MT.F64 : MT.F32;
          if (mt === MT.F32) v = Math.fround(v);
          pending.push({ addr: nextPtr(), mt, v });
          count++;
        }
        break;
      }
      case 's': {
        let s = '';
        for (;;) {
          const c = take();
          if (c === NEED) {
            if (s.length === 0) return NEED_INPUT;
            return NEED_INPUT;
          }
          if (c < 0 || isSpace(c)) break;
          s += String.fromCharCode(c);
          accept();
        }
        if (!s) return finish();
        if (!suppress) {
          pending.push({ addr: nextPtr(), bytes: s + '\0' });
          count++;
        }
        break;
      }
      case 'c': {
        const n = width || 1;
        let s = '';
        while (s.length < n) {
          const c = rd.peek();
          if (c === NEED) return NEED_INPUT;
          if (c < 0) break;
          s += String.fromCharCode(c);
          rd.next();
        }
        if (s.length < n) return count ? finish() : (rd.commit(), -1);
        if (!suppress) {
          pending.push({ addr: nextPtr(), bytes: s });
          count++;
        }
        break;
      }
      case '[': {
        let negate = false;
        if (fmt[i] === '^') {
          negate = true;
          i++;
        }
        let set = '';
        if (fmt[i] === ']') {
          set += ']';
          i++;
        }
        while (i < fmt.length && fmt[i] !== ']') {
          if (fmt[i + 1] === '-' && fmt[i + 2] && fmt[i + 2] !== ']') {
            for (let x = fmt.charCodeAt(i); x <= fmt.charCodeAt(i + 2); x++) set += String.fromCharCode(x);
            i += 3;
          } else set += fmt[i++];
        }
        i++;
        let s = '';
        for (;;) {
          const c = take();
          if (c === NEED) return NEED_INPUT;
          if (c < 0) break;
          const inSet = set.includes(String.fromCharCode(c));
          if (inSet === negate) break;
          s += String.fromCharCode(c);
          accept();
        }
        if (!s) return finish();
        if (!suppress) {
          pending.push({ addr: nextPtr(), bytes: s + '\0' });
          count++;
        }
        break;
      }
      default:
        return finish();
    }
  }
  return finish();
}

function digitValue(c: number): number {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 122) return c - 87;
  if (c >= 65 && c <= 90) return c - 55;
  return -1;
}

function requireStdin(stream: unknown, fn: string): void {
  const s = num(stream);
  if (s === STDIN) return;
  if (s === 0) throw new CRuntimeError('null-deref', `${fn}() called with a NULL FILE*`);
  throw new CRuntimeError('SEGV', `${fn}() can only read from stdin in C-It`);
}

function getc(vm: VM): unknown {
  const rd = stdinReader(vm.stdin);
  const c = rd.peek();
  if (c === NEED) return NEED_INPUT;
  if (c === -1) return -1;
  rd.next();
  rd.commit();
  return c;
}

function fgetsImpl(vm: VM, dest: number, n: number, keepNewline: boolean): unknown {
  const b = vm.stdin;
  const avail = b.buf.slice(b.pos);
  const limit = keepNewline ? n - 1 : Infinity;
  if (keepNewline && n <= 0) return 0;
  const nl = avail.indexOf('\n');
  let take: number;
  if (nl >= 0 && nl < limit) take = nl + 1;
  else if (avail.length >= limit) take = limit;
  else if (b.eof) take = avail.length;
  else return NEED_INPUT;
  if (take === 0) return 0;
  let s = avail.slice(0, take);
  b.pos += take;
  if (!keepNewline && s.endsWith('\n')) s = s.slice(0, -1);
  vm.writeBytes(dest, s + '\0');
  return dest;
}

// ------------------------------------------------------------------ strings

function strtolImpl(vm: VM, sAddr: number, endAddr: number, base: number, unsigned: boolean): bigint {
  const s = vm.readCString(sAddr);
  let i = 0;
  while (i < s.length && isSpace(s.charCodeAt(i))) i++;
  let neg = false;
  if (s[i] === '+' || s[i] === '-') {
    neg = s[i] === '-';
    i++;
  }
  if ((base === 0 || base === 16) && s[i] === '0' && (s[i + 1] === 'x' || s[i + 1] === 'X') && digitValue(s.charCodeAt(i + 2)) >= 0 && digitValue(s.charCodeAt(i + 2)) < 16) {
    i += 2;
    base = 16;
  } else if (base === 0) base = s[i] === '0' ? 8 : 10;
  let v = 0n;
  const start = i;
  while (i < s.length) {
    const d = digitValue(s.charCodeAt(i));
    if (d < 0 || d >= base) break;
    v = v * BigInt(base) + BigInt(d);
    i++;
  }
  const end = i === start ? 0 : i;
  if (endAddr) vm.store(endAddr, MT.PTR, sAddr + end);
  if (neg) v = -v;
  if (!unsigned) {
    if (v > 9223372036854775807n) v = 9223372036854775807n;
    if (v < -9223372036854775808n) v = -9223372036854775808n;
    return v;
  }
  return BigInt.asUintN(64, v);
}

function strtodImpl(vm: VM, sAddr: number, endAddr: number): number {
  const s = vm.readCString(sAddr);
  const m = /^\s*([+-]?(?:inf(?:inity)?|nan|0[xX][0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?(?:[pP][+-]?\d+)?|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))/i.exec(s);
  let v = 0;
  let used = 0;
  if (m) {
    used = m[0].length;
    const t = m[1].toLowerCase();
    if (t.includes('inf')) v = t.startsWith('-') ? -Infinity : Infinity;
    else if (t.includes('nan')) v = NaN;
    else if (t.includes('0x')) v = (t.startsWith('-') ? -1 : 1) * parseInt(t.replace(/^[+-]?0x/, ''), 16);
    else v = parseFloat(t);
  }
  if (endAddr) vm.store(endAddr, MT.PTR, sAddr + used);
  return v;
}

function internalString(vm: VM, key: string, text: string): number {
  const cache = (vm.nativeState.strings ??= new Map<string, number>()) as Map<string, number>;
  let a = cache.get(key);
  if (a === undefined) {
    a = vm.malloc(text.length + 1, 'internal');
    vm.writeBytes(a, text + '\0');
    cache.set(key, a);
  }
  return a;
}

// ------------------------------------------------------------------ rand (glibc TYPE_3)

function randState(vm: VM, seed?: number): { r: number[]; i: number } {
  let st = vm.nativeState.rand as { r: number[]; i: number } | undefined;
  if (!st || seed !== undefined) {
    const s = seed === undefined ? 1 : seed >>> 0 || 1;
    const r = new Array<number>(34);
    r[0] = s | 0;
    for (let i = 1; i < 31; i++) {
      const hi = Math.trunc(r[i - 1] / 127773);
      const lo = r[i - 1] % 127773;
      let word = 16807 * lo - 2836 * hi;
      if (word < 0) word += 2147483647;
      r[i] = word;
    }
    for (let i = 31; i < 34; i++) r[i] = r[i - 31];
    st = { r, i: 34 };
    for (let k = 0; k < 310; k++) nextRand(st);
    vm.nativeState.rand = st;
  }
  return st;
}

function nextRand(st: { r: number[]; i: number }): number {
  const r = st.r;
  const v = (r[st.i - 31] + r[st.i - 3]) | 0;
  r.push(v);
  st.i++;
  if (r.length > 1000) {
    st.r = r.slice(-40);
    st.i = st.r.length;
  }
  return (v >>> 1) & 0x7fffffff;
}

// ------------------------------------------------------------------ ctype (glibc bitmask values)

const CT = {
  upper: 256, lower: 512, alpha: 1024, digit: 2048, xdigit: 4096, space: 8192, print: 16384,
  graph: 32768, blank: 1, cntrl: 2, punct: 4, alnum: 8,
};

function ctype(c: number): number {
  if (c < 0 || c > 127) return 0;
  const ch = String.fromCharCode(c);
  let m = 0;
  if (/[A-Z]/.test(ch)) m |= CT.upper | CT.alpha | CT.alnum;
  if (/[a-z]/.test(ch)) m |= CT.lower | CT.alpha | CT.alnum;
  if (/[0-9]/.test(ch)) m |= CT.digit | CT.alnum | CT.xdigit;
  if (/[a-fA-F]/.test(ch)) m |= CT.xdigit;
  if (c === 32 || (c >= 9 && c <= 13)) m |= CT.space;
  if (c === 32 || c === 9) m |= CT.blank;
  if (c >= 32 && c < 127) m |= CT.print;
  if (c > 32 && c < 127) m |= CT.graph;
  if (c < 32 || c === 127) m |= CT.cntrl;
  if (c > 32 && c < 127 && !/[A-Za-z0-9]/.test(ch)) m |= CT.punct;
  return m;
}

// ------------------------------------------------------------------ math

function roundHalfAway(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

const MATH1: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, fabs: Math.abs, floor: Math.floor, ceil: Math.ceil,
  round: roundHalfAway, trunc: Math.trunc, rint: roundHalfEven, nearbyint: roundHalfEven,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  exp: Math.exp, exp2: (x) => Math.pow(2, x), expm1: Math.expm1, log: Math.log, log10: Math.log10,
  log2: Math.log2, log1p: Math.log1p,
};

const MATH2: Record<string, (x: number, y: number) => number> = {
  pow: Math.pow, fmod: (x, y) => x % y, atan2: Math.atan2, hypot: Math.hypot, fmin: Math.min, fmax: Math.max,
  fdim: (x, y) => (x > y ? x - y : 0), copysign: (x, y) => (Math.sign(y) < 0 || Object.is(y, -0) ? -Math.abs(x) : Math.abs(x)),
  remainder: (x, y) => x - roundHalfEven(x / y) * y,
};

// ------------------------------------------------------------------ table

export const NATIVES: Record<string, NativeFn> = {
  // stdio: output
  printf: (vm, a) => {
    const s = format(vm, a[0], directArgs(a, 1));
    vm.output('out', s);
    return s.length;
  },
  fprintf: (vm, a) => {
    const s = format(vm, a[1], directArgs(a, 2));
    writeStream(vm, a[0], s, 'fprintf');
    return s.length;
  },
  sprintf: (vm, a) => {
    const s = format(vm, a[1], directArgs(a, 2));
    putString(vm, a[0], s);
    return s.length;
  },
  snprintf: (vm, a) => {
    const s = format(vm, a[2], directArgs(a, 3));
    putString(vm, a[0], s, num(a[1]));
    return s.length;
  },
  vprintf: (vm, a) => {
    const s = format(vm, a[0], vaArgs(vm, num(a[1])));
    vm.output('out', s);
    return s.length;
  },
  vfprintf: (vm, a) => {
    const s = format(vm, a[1], vaArgs(vm, num(a[2])));
    writeStream(vm, a[0], s, 'vfprintf');
    return s.length;
  },
  vsprintf: (vm, a) => {
    const s = format(vm, a[1], vaArgs(vm, num(a[2])));
    putString(vm, a[0], s);
    return s.length;
  },
  vsnprintf: (vm, a) => {
    const s = format(vm, a[2], vaArgs(vm, num(a[3])));
    putString(vm, a[0], s, num(a[1]));
    return s.length;
  },
  puts: (vm, a) => {
    vm.output('out', vm.readCString(num(a[0])) + '\n');
    return 1;
  },
  fputs: (vm, a) => {
    writeStream(vm, a[1], vm.readCString(num(a[0])), 'fputs');
    return 1;
  },
  putchar: (vm, a) => {
    const c = num(a[0]) & 0xff;
    vm.output('out', String.fromCharCode(c));
    return c;
  },
  fputc: (vm, a) => {
    const c = num(a[0]) & 0xff;
    writeStream(vm, a[1], String.fromCharCode(c), 'fputc');
    return c;
  },
  putc: (vm, a) => NATIVES.fputc(vm, a, [], undefined as never),
  fflush: () => 0,
  setbuf: () => 0,
  setvbuf: () => 0,
  perror: (vm, a) => {
    const s = num(a[0]) ? vm.readCString(num(a[0])) : '';
    const msg = vm.nativeState.lastError === 'ENOENT' ? 'No such file or directory' : 'Success';
    vm.output('err', `${s ? s + ': ' : ''}${msg}\n`);
    return 0;
  },
  fopen: (vm, a) => {
    const path = vm.readCString(num(a[0]));
    vm.nativeState.lastError = 'ENOENT';
    vm.warn(`fopen("${path}") returned NULL: files are not available in C-It (only stdin/stdout/stderr)`, `fopen:${path}`);
    return 0;
  },
  fclose: (_vm, a) => (num(a[0]) ? 0 : -1),
  feof: (vm, a) => {
    requireStdin(a[0], 'feof');
    return vm.stdin.eof && vm.stdin.pos >= vm.stdin.buf.length ? 1 : 0;
  },
  ferror: () => 0,

  // stdio: input
  scanf: (vm, a) => scanCore(vm, vm.readCString(num(a[0])), stdinReader(vm.stdin), a.slice(1)),
  fscanf: (vm, a) => {
    requireStdin(a[0], 'fscanf');
    return scanCore(vm, vm.readCString(num(a[1])), stdinReader(vm.stdin), a.slice(2));
  },
  sscanf: (vm, a) => {
    const r = scanCore(vm, vm.readCString(num(a[1])), stringReader(vm.readCString(num(a[0]))), a.slice(2));
    return r === NEED_INPUT ? -1 : r;
  },
  getchar: (vm) => getc(vm),
  fgetc: (vm, a) => {
    requireStdin(a[0], 'fgetc');
    return getc(vm);
  },
  getc: (vm, a) => {
    requireStdin(a[0], 'getc');
    return getc(vm);
  },
  ungetc: (vm, a) => {
    const c = num(a[0]);
    if (c === -1) return -1;
    const b = vm.stdin;
    b.buf = b.buf.slice(0, b.pos) + String.fromCharCode(c & 0xff) + b.buf.slice(b.pos);
    return c & 0xff;
  },
  fgets: (vm, a) => {
    requireStdin(a[2], 'fgets');
    return fgetsImpl(vm, num(a[0]), num(a[1]), true);
  },
  gets: (vm, a) => {
    vm.warn("the 'gets' function is dangerous and should not be used (use fgets instead)", 'gets');
    return fgetsImpl(vm, num(a[0]), Infinity, false);
  },

  // stdlib: memory
  malloc: (vm, a) => vm.malloc(num(a[0]), 'malloc'),
  calloc: (vm, a) => {
    const total = num(a[0]) * num(a[1]);
    const p = vm.malloc(total, 'calloc');
    if (p && total > 0) vm.writeBytes(p, new Uint8Array(total));
    return p;
  },
  realloc: (vm, a) => {
    const p = num(a[0]);
    const n = num(a[1]);
    if (p === 0) return vm.malloc(n, 'realloc');
    const old = vm.mem.heapBlockStartingAt(p);
    if (!old || old.freed) {
      vm.free(p, 'realloc');
      return 0;
    }
    if (n === 0) {
      vm.free(p, 'realloc');
      return 0;
    }
    const q = vm.malloc(n, 'realloc');
    if (!q) return 0;
    const copyLen = Math.min(n, old.size);
    if (copyLen > 0) vm.mem.copy(q, p, copyLen);
    const ty = vm.blockTypes.get(p);
    vm.free(p, 'realloc');
    if (ty !== undefined) {
      vm.blockTypes.set(q, ty);
    }
    return q;
  },
  free: (vm, a) => {
    vm.free(num(a[0]));
    return 0;
  },
  exit: (vm, a) => {
    vm.requestExit(num(a[0]) | 0);
    return 0;
  },
  abort: () => {
    throw new CRuntimeError('abort', 'abort() was called');
  },
  atexit: () => 0,
  __assert_fail: (vm, a) => {
    const expr = vm.readCString(num(a[0]));
    const func = vm.readCString(num(a[3]));
    vm.output('err', `main: main.c:${num(a[2])}: ${func}: Assertion \`${expr}' failed.\n`);
    throw new CRuntimeError('assert', `assertion failed: ${expr}`);
  },
  getenv: () => 0,
  system: (vm) => {
    vm.warn('system() is not available in the browser', 'system');
    return -1;
  },

  // stdlib: conversions
  atoi: (vm, a) => Number(BigInt.asIntN(32, strtolImpl(vm, num(a[0]), 0, 10, false))),
  atol: (vm, a) => strtolImpl(vm, num(a[0]), 0, 10, false),
  atoll: (vm, a) => strtolImpl(vm, num(a[0]), 0, 10, false),
  atof: (vm, a) => strtodImpl(vm, num(a[0]), 0),
  strtol: (vm, a) => strtolImpl(vm, num(a[0]), num(a[1]), num(a[2]), false),
  strtoll: (vm, a) => strtolImpl(vm, num(a[0]), num(a[1]), num(a[2]), false),
  strtoul: (vm, a) => strtolImpl(vm, num(a[0]), num(a[1]), num(a[2]), true),
  strtoull: (vm, a) => strtolImpl(vm, num(a[0]), num(a[1]), num(a[2]), true),
  strtod: (vm, a) => strtodImpl(vm, num(a[0]), num(a[1])),
  strtof: (vm, a) => Math.fround(strtodImpl(vm, num(a[0]), num(a[1]))),
  abs: (_vm, a) => {
    const x = num(a[0]);
    return x === -2147483648 ? x : Math.abs(x);
  },
  labs: (_vm, a) => {
    const x = BigInt(a[0] as bigint);
    return BigInt.asIntN(64, x < 0n ? -x : x);
  },
  llabs: (_vm, a) => {
    const x = BigInt(a[0] as bigint);
    return BigInt.asIntN(64, x < 0n ? -x : x);
  },
  div: (vm, a) => {
    const dest = num(a[0]);
    const x = num(a[1]);
    const y = num(a[2]);
    if (y === 0) throw new CRuntimeError('div-zero', 'integer division by zero in div()');
    vm.store(dest, MT.I32, Math.trunc(x / y));
    vm.store(dest + 4, MT.I32, x % y);
    return dest;
  },
  rand: (vm) => nextRand(randState(vm)),
  srand: (vm, a) => {
    randState(vm, num(a[0]));
    return 0;
  },

  // string.h
  strlen: (vm, a) => BigInt(vm.readCString(num(a[0])).length),
  strnlen: (vm, a) => BigInt(vm.readCString(num(a[0]), num(a[1])).length),
  strcpy: (vm, a) => {
    vm.writeBytes(num(a[0]), vm.readCString(num(a[1])) + '\0');
    return a[0];
  },
  strncpy: (vm, a) => {
    const n = num(a[2]);
    let s = vm.readCString(num(a[1]), n);
    if (s.length < n) s += '\0'.repeat(n - s.length);
    vm.writeBytes(num(a[0]), s);
    return a[0];
  },
  strcat: (vm, a) => {
    const d = num(a[0]);
    const len = vm.readCString(d).length;
    vm.writeBytes(d + len, vm.readCString(num(a[1])) + '\0');
    return a[0];
  },
  strncat: (vm, a) => {
    const d = num(a[0]);
    const len = vm.readCString(d).length;
    vm.writeBytes(d + len, vm.readCString(num(a[1]), num(a[2])) + '\0');
    return a[0];
  },
  strcmp: (vm, a) => compareStrings(vm, num(a[0]), num(a[1]), Infinity, false),
  strncmp: (vm, a) => compareStrings(vm, num(a[0]), num(a[1]), num(a[2]), false),
  strcasecmp: (vm, a) => compareStrings(vm, num(a[0]), num(a[1]), Infinity, true),
  strncasecmp: (vm, a) => compareStrings(vm, num(a[0]), num(a[1]), num(a[2]), true),
  strchr: (vm, a) => {
    const p = num(a[0]);
    const s = vm.readCString(p);
    const c = num(a[1]) & 0xff;
    if (c === 0) return p + s.length;
    const i = s.indexOf(String.fromCharCode(c));
    return i < 0 ? 0 : p + i;
  },
  strrchr: (vm, a) => {
    const p = num(a[0]);
    const s = vm.readCString(p);
    const c = num(a[1]) & 0xff;
    if (c === 0) return p + s.length;
    const i = s.lastIndexOf(String.fromCharCode(c));
    return i < 0 ? 0 : p + i;
  },
  strstr: (vm, a) => {
    const p = num(a[0]);
    const i = vm.readCString(p).indexOf(vm.readCString(num(a[1])));
    return i < 0 ? 0 : p + i;
  },
  strpbrk: (vm, a) => {
    const p = num(a[0]);
    const s = vm.readCString(p);
    const acc = vm.readCString(num(a[1]));
    for (let i = 0; i < s.length; i++) if (acc.includes(s[i])) return p + i;
    return 0;
  },
  strspn: (vm, a) => {
    const s = vm.readCString(num(a[0]));
    const acc = vm.readCString(num(a[1]));
    let i = 0;
    while (i < s.length && acc.includes(s[i])) i++;
    return BigInt(i);
  },
  strcspn: (vm, a) => {
    const s = vm.readCString(num(a[0]));
    const rej = vm.readCString(num(a[1]));
    let i = 0;
    while (i < s.length && !rej.includes(s[i])) i++;
    return BigInt(i);
  },
  strtok: (vm, a) => {
    let p = num(a[0]) || (vm.nativeState.strtok as number) || 0;
    if (!p) return 0;
    const delim = vm.readCString(num(a[1]));
    const s = vm.readCString(p);
    let i = 0;
    while (i < s.length && delim.includes(s[i])) i++;
    if (i >= s.length) {
      vm.nativeState.strtok = 0;
      return 0;
    }
    const start = p + i;
    let j = i;
    while (j < s.length && !delim.includes(s[j])) j++;
    if (j < s.length) {
      vm.writeBytes(p + j, '\0');
      vm.nativeState.strtok = p + j + 1;
    } else {
      vm.nativeState.strtok = 0;
    }
    p = start;
    return p;
  },
  strdup: (vm, a) => {
    const s = vm.readCString(num(a[0]));
    const p = vm.malloc(s.length + 1, 'strdup');
    if (p) vm.writeBytes(p, s + '\0');
    return p;
  },
  strndup: (vm, a) => {
    const s = vm.readCString(num(a[0]), num(a[1]));
    const p = vm.malloc(s.length + 1, 'strndup');
    if (p) vm.writeBytes(p, s + '\0');
    return p;
  },
  strerror: (vm, a) => {
    const n = num(a[0]);
    const msgs: Record<number, string> = { 0: 'Success', 2: 'No such file or directory', 12: 'Cannot allocate memory', 22: 'Invalid argument', 33: 'Numerical argument out of domain', 34: 'Numerical result out of range' };
    return internalString(vm, `strerror${n}`, msgs[n] ?? `Unknown error ${n}`);
  },
  strrev: (vm, a) => {
    const p = num(a[0]);
    const s = vm.readCString(p);
    vm.writeBytes(p, s.split('').reverse().join(''));
    return p;
  },
  memcpy: (vm, a) => {
    const d = num(a[0]);
    const s = num(a[1]);
    const n = num(a[2]);
    if (n > 0 && d < s + n && s < d + n && d !== s) {
      vm.warn('memcpy with overlapping source and destination is undefined; use memmove', `memcpy:${d}`);
    }
    vm.mem.copy(d, s, n);
    return d;
  },
  memmove: (vm, a) => {
    vm.mem.copy(num(a[0]), num(a[1]), num(a[2]));
    return a[0];
  },
  memset: (vm, a) => {
    const n = num(a[2]);
    if (n > 0) vm.writeBytes(num(a[0]), new Uint8Array(n).fill(num(a[1]) & 0xff));
    return a[0];
  },
  memcmp: (vm, a) => {
    const n = num(a[2]);
    for (let i = 0; i < n; i++) {
      const x = vm.load(num(a[0]) + i, MT.U8) as number;
      const y = vm.load(num(a[1]) + i, MT.U8) as number;
      if (x !== y) return x - y;
    }
    return 0;
  },
  memchr: (vm, a) => {
    const p = num(a[0]);
    const c = num(a[1]) & 0xff;
    const n = num(a[2]);
    for (let i = 0; i < n; i++) if (vm.load(p + i, MT.U8) === c) return p + i;
    return 0;
  },

  // time.h
  time: (vm, a) => {
    const t = BigInt(Math.floor(Date.now() / 1000));
    if (num(a[0])) vm.store(num(a[0]), MT.I64, t);
    return t;
  },
  clock: (vm) => BigInt(Math.floor(vm.instructions / 20)),
  difftime: (_vm, a) => Number(a[0]) - Number(a[1]),

  // math.h extras
  ldexp: (_vm, a) => num(a[0]) * Math.pow(2, num(a[1])),
  frexp: (vm, a) => {
    const x = num(a[0]);
    if (x === 0 || !Number.isFinite(x)) {
      vm.store(num(a[1]), MT.I32, 0);
      return x;
    }
    let e = Math.max(-1073, Math.floor(Math.log2(Math.abs(x))) + 1);
    let m = x * Math.pow(2, -e);
    while (Math.abs(m) >= 1) { m /= 2; e++; }
    while (Math.abs(m) < 0.5) { m *= 2; e--; }
    vm.store(num(a[1]), MT.I32, e);
    return m;
  },
  modf: (vm, a) => {
    const x = num(a[0]);
    const ip = Math.trunc(x);
    vm.store(num(a[1]), MT.F64, ip);
    return x - ip;
  },
  lround: (_vm, a) => BigInt(roundHalfAway(num(a[0]))),
  lrint: (_vm, a) => BigInt(roundHalfEven(num(a[0]))),
};

function compareStrings(vm: VM, pa: number, pb: number, n: number, fold: boolean): number {
  for (let i = 0; i < n; i++) {
    let x = vm.load(pa + i, MT.U8) as number;
    let y = vm.load(pb + i, MT.U8) as number;
    if (fold) {
      if (x >= 65 && x <= 90) x += 32;
      if (y >= 65 && y <= 90) y += 32;
    }
    if (x !== y) return x - y;
    if (x === 0) return 0;
  }
  return 0;
}

for (const [name, f] of Object.entries(MATH1)) {
  NATIVES[name] = (_vm, a) => f(num(a[0]));
  NATIVES[name + 'f'] = (_vm, a) => Math.fround(f(num(a[0])));
}
for (const [name, f] of Object.entries(MATH2)) {
  NATIVES[name] = (_vm, a) => f(num(a[0]), num(a[1]));
  NATIVES[name + 'f'] = (_vm, a) => Math.fround(f(num(a[0]), num(a[1])));
}
for (const name of ['isalpha', 'isdigit', 'isalnum', 'isspace', 'isupper', 'islower', 'ispunct', 'isxdigit', 'isprint', 'iscntrl', 'isgraph', 'isblank']) {
  const bit = CT[name.slice(2) as keyof typeof CT];
  NATIVES[name] = (_vm, a) => ctype(num(a[0])) & bit;
}
NATIVES.toupper = (_vm, a) => {
  const c = num(a[0]);
  return c >= 97 && c <= 122 ? c - 32 : c;
};
NATIVES.tolower = (_vm, a) => {
  const c = num(a[0]);
  return c >= 65 && c <= 90 ? c + 32 : c;
};
