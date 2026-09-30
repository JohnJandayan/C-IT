// Compile-time checking of printf/scanf format strings against argument types
// (mirrors gcc's -Wformat, which is on by default).

import type { Expr, Range } from './ast';
import type { DiagnosticBag } from './diagnostics';
import { CType, isFloat, isInteger, isPtr, typeToString, unqual, isVoid, isCharType } from './types';

const PRINTF_FMT_INDEX: Record<string, number> = {
  printf: 0, fprintf: 1, sprintf: 1, snprintf: 2, dprintf: 1,
};
const SCANF_FMT_INDEX: Record<string, number> = { scanf: 0, fscanf: 1, sscanf: 1 };

type Expect =
  | { kind: 'int'; size: number; name: string }
  | { kind: 'double'; name: string }
  | { kind: 'string'; name: string }
  | { kind: 'ptr'; name: string }
  | { kind: 'ptrTo'; to: 'int' | 'float' | 'char' | 'ptr'; size: number; name: string };

function formatString(e: Expr | undefined): string | null {
  let cur = e;
  while (cur && (cur.k === 'cast' || cur.k === 'decay')) cur = cur.e;
  if (cur && cur.k === 'str') {
    return String.fromCharCode(...cur.bytes.slice(0, -1));
  }
  return null;
}

const INT_NAMES: Record<string, [number, string, string]> = {
  // length: [size, signed name, unsigned name]
  '': [4, 'int', 'unsigned int'],
  hh: [4, 'int', 'unsigned int'],
  h: [4, 'int', 'unsigned int'],
  l: [8, 'long int', 'long unsigned int'],
  ll: [8, 'long long int', 'long long unsigned int'],
  z: [8, 'long int', 'long unsigned int'],
  j: [8, 'long int', 'long unsigned int'],
  t: [8, 'long int', 'long unsigned int'],
};

const SCAN_INT: Record<string, [number, string, string]> = {
  '': [4, 'int *', 'unsigned int *'],
  hh: [1, 'signed char *', 'unsigned char *'],
  h: [2, 'short int *', 'short unsigned int *'],
  l: [8, 'long int *', 'long unsigned int *'],
  ll: [8, 'long long int *', 'long long unsigned int *'],
  z: [8, 'long int *', 'long unsigned int *'],
  j: [8, 'long int *', 'long unsigned int *'],
  t: [8, 'long int *', 'long unsigned int *'],
};

function gccTypeName(t: CType): string {
  // gcc spells `long` as `long int` in -Wformat messages.
  const s = typeToString(unqual(t));
  return s
    .replace(/\bunsigned long long\b/g, 'long long unsigned int')
    .replace(/\bunsigned long\b/g, 'long unsigned int')
    .replace(/\blong long(?! int)\b/g, 'long long int')
    .replace(/\bunsigned short\b/g, 'short unsigned int')
    .replace(/(?<!long )\blong(?! (int|long|unsigned|double))\b/g, 'long int')
    .replace(/\bshort(?! (int|unsigned))\b/g, 'short int');
}

function matches(exp: Expect, ty: CType): boolean {
  const t = unqual(ty);
  switch (exp.kind) {
    case 'int':
      return isInteger(t) && Math.max(t.size, 4) === exp.size;
    case 'double':
      return isFloat(t);
    case 'string':
      return isPtr(t) && (isCharType(t.to) || isVoid(t.to));
    case 'ptr':
      return isPtr(t);
    case 'ptrTo': {
      if (!isPtr(t)) return false;
      const to = unqual(t.to);
      if (isVoid(to)) return true;
      if (exp.to === 'int') return isInteger(to) && to.size === exp.size;
      if (exp.to === 'float') return isFloat(to) && Math.min(to.size, 8) === exp.size;
      if (exp.to === 'char') return isCharType(to);
      return isPtr(to);
    }
  }
}

interface Conv {
  spec: string;
  expect: Expect | null;
  /** Number of `*` width/precision arguments consumed before this conversion. */
  stars: number;
}

function parsePrintf(fmt: string): Conv[] | string {
  const out: Conv[] = [];
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] !== '%') continue;
    const start = i;
    i++;
    if (fmt[i] === '%') continue;
    let stars = 0;
    while ('-+ #0\''.includes(fmt[i] ?? 'x')) i++;
    if (fmt[i] === '*') {
      stars++;
      i++;
    } else while (/[0-9]/.test(fmt[i] ?? '')) i++;
    if (fmt[i] === '.') {
      i++;
      if (fmt[i] === '*') {
        stars++;
        i++;
      } else while (/[0-9]/.test(fmt[i] ?? '')) i++;
    }
    let len = '';
    const lm = /^(hh|h|ll|l|L|z|j|t)/.exec(fmt.slice(i));
    if (lm) {
      len = lm[1];
      i += len.length;
    }
    const c = fmt[i];
    if (c === undefined) return 'spurious trailing \'%\' in format';
    const spec = fmt.slice(start, i + 1);
    let expect: Expect | null = null;
    if ('di'.includes(c)) {
      const [size, name] = INT_NAMES[len === 'L' ? 'll' : len] ?? INT_NAMES[''];
      expect = { kind: 'int', size, name };
    } else if ('uoxX'.includes(c)) {
      const [size, , name] = INT_NAMES[len === 'L' ? 'll' : len] ?? INT_NAMES[''];
      expect = { kind: 'int', size, name };
    } else if (c === 'c') {
      expect = { kind: 'int', size: 4, name: 'int' };
    } else if (c === 's') {
      expect = { kind: 'string', name: 'char *' };
    } else if ('fFeEgGaA'.includes(c)) {
      expect = { kind: 'double', name: len === 'L' ? 'long double' : 'double' };
    } else if (c === 'p') {
      expect = { kind: 'ptr', name: 'void *' };
    } else if (c === 'n') {
      expect = { kind: 'ptrTo', to: 'int', size: 4, name: 'int *' };
    } else {
      return `unknown conversion type character '${c}' in format`;
    }
    out.push({ spec, expect, stars });
  }
  return out;
}

function parseScanf(fmt: string): Conv[] | string {
  const out: Conv[] = [];
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] !== '%') continue;
    const start = i;
    i++;
    if (fmt[i] === '%') continue;
    let suppress = false;
    if (fmt[i] === '*') {
      suppress = true;
      i++;
    }
    while (/[0-9]/.test(fmt[i] ?? '')) i++;
    let len = '';
    const lm = /^(hh|h|ll|l|L|z|j|t)/.exec(fmt.slice(i));
    if (lm) {
      len = lm[1];
      i += len.length;
    }
    const c = fmt[i];
    if (c === undefined) return 'spurious trailing \'%\' in format';
    if (c === '[') {
      i++;
      if (fmt[i] === '^') i++;
      if (fmt[i] === ']') i++;
      while (i < fmt.length && fmt[i] !== ']') i++;
    }
    const spec = fmt.slice(start, i + 1);
    let expect: Expect | null = null;
    if ('diuoxX'.includes(c)) {
      const [size, sname, uname] = SCAN_INT[len] ?? SCAN_INT[''];
      expect = { kind: 'ptrTo', to: 'int', size, name: 'diu'.includes(c) && c !== 'u' ? sname : uname };
    } else if ('fFeEgGaA'.includes(c)) {
      const size = len === 'l' ? 8 : len === 'L' ? 8 : 4;
      expect = { kind: 'ptrTo', to: 'float', size, name: len === 'l' ? 'double *' : len === 'L' ? 'long double *' : 'float *' };
    } else if ('cs['.includes(c)) {
      expect = { kind: 'ptrTo', to: 'char', size: 1, name: 'char *' };
    } else if (c === 'p') {
      expect = { kind: 'ptrTo', to: 'ptr', size: 8, name: 'void **' };
    } else if (c === 'n') {
      expect = { kind: 'ptrTo', to: 'int', size: 4, name: 'int *' };
    } else {
      return `unknown conversion type character '${c}' in format`;
    }
    out.push({ spec, expect: suppress ? null : expect, stars: 0 });
  }
  return out;
}

export function checkFormatCall(name: string, args: Expr[], diags: DiagnosticBag, loc: Range): void {
  const isPrintf = name in PRINTF_FMT_INDEX;
  const isScanf = name in SCANF_FMT_INDEX;
  if (!isPrintf && !isScanf) return;
  const fmtIndex = isPrintf ? PRINTF_FMT_INDEX[name] : SCANF_FMT_INDEX[name];
  const fmtArg = args[fmtIndex];
  if (!fmtArg) return;
  const fmt = formatString(fmtArg);
  if (fmt === null) {
    if (args.length === fmtIndex + 1 && isPrintf) {
      diags.warning('format not a string literal and no format arguments', fmtArg.loc);
    }
    return;
  }
  const convs = isPrintf ? parsePrintf(fmt) : parseScanf(fmt);
  if (typeof convs === 'string') {
    diags.warning(convs, fmtArg.loc);
    return;
  }
  let ai = fmtIndex + 1;
  for (const c of convs) {
    for (let s = 0; s < c.stars; s++) {
      const a = args[ai++];
      if (!a) {
        diags.warning(`field width specifier '*' expects a matching 'int' argument`, loc);
        return;
      }
    }
    if (!c.expect) continue;
    const a = args[ai++];
    if (!a) {
      diags.warning(`format '${c.spec}' expects a matching '${c.expect.name}' argument`, fmtArg.loc);
      return;
    }
    if (!matches(c.expect, a.ty)) {
      diags.warning(
        `format '${c.spec}' expects argument of type '${c.expect.name}', but argument ${ai} has type '${gccTypeName(a.ty)}'`,
        a.loc
      );
    }
  }
  if (ai < args.length) diags.warning('too many arguments for format', args[ai].loc);
}
