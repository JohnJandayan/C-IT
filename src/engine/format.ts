// printf-family formatting with glibc-compatible output.

export interface ArgSource {
  /** Next integer argument, as a bigint (signed or unsigned per request). */
  int(bits: number, signed: boolean): bigint;
  double(): number;
  ptr(): number;
  /** Address argument for %s / %n. */
  addr(): number;
  /** Arguments were exhausted (undefined behaviour in C). */
  missing: boolean;
}

export interface FormatHooks {
  /** Read a NUL-terminated string (as latin1 bytes); `max` limits bytes read. */
  cstring(addr: number, max: number): string;
  /** Store the number of characters written so far (%n). */
  storeCount(addr: number, count: number, bits: number): void;
}

function pad(s: string, width: number, left: boolean, zero: boolean, signLen = 0): string {
  if (s.length >= width) return s;
  if (left) return s + ' '.repeat(width - s.length);
  if (zero) return s.slice(0, signLen) + '0'.repeat(width - s.length) + s.slice(signLen);
  return ' '.repeat(width - s.length) + s;
}

function roundHalfEvenFixed(v: number, prec: number): string {
  let s = Math.abs(v).toFixed(prec);
  // JS rounds exact ties away from zero; C rounds them to even.
  const scaled = Math.abs(v) * Math.pow(10, prec);
  if (Number.isFinite(scaled) && scaled < 2 ** 52 && scaled - Math.floor(scaled) === 0.5) {
    const down = Math.floor(scaled);
    const n = down % 2 === 0 ? down : down + 1;
    const digits = String(n).padStart(prec + 1, '0');
    s = prec > 0 ? `${digits.slice(0, digits.length - prec)}.${digits.slice(digits.length - prec)}` : digits;
  }
  return s;
}

export function fixed(v: number, prec: number): string {
  const a = Math.abs(v);
  if (a >= 1e21) {
    const intPart = BigInt(a).toString();
    return prec > 0 ? `${intPart}.${'0'.repeat(prec)}` : intPart;
  }
  if (prec > 100) prec = 100;
  return roundHalfEvenFixed(v, prec);
}

export function expo(v: number, prec: number, upper: boolean): string {
  let s = Math.abs(v).toExponential(Math.min(prec, 100));
  s = s.replace(/e([+-])(\d)$/, 'e$10$2');
  return upper ? s.toUpperCase() : s;
}

function general(v: number, prec: number, alt: boolean, upper: boolean): string {
  const P = prec === 0 ? 1 : prec;
  const a = Math.abs(v);
  if (a === 0) {
    let s = alt ? fixed(0, P - 1) : '0';
    if (alt && !s.includes('.')) s += '.';
    return s;
  }
  const e = Number(Math.abs(v).toExponential(P - 1).split('e')[1]);
  let s: string;
  if (P > e && e >= -4) s = fixed(a, P - 1 - e);
  else s = expo(a, P - 1, upper);
  if (!alt) {
    if (s.includes('e') || s.includes('E')) {
      s = s.replace(/\.?0+([eE])/, '$1');
    } else if (s.includes('.')) {
      s = s.replace(/\.?0+$/, '');
    }
  }
  return s;
}

function hexFloat(v: number, prec: number | null, upper: boolean): string {
  const a = Math.abs(v);
  if (a === 0) return upper ? '0X0P+0' : '0x0p+0';
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, a);
  const bits = dv.getBigUint64(0);
  let exp = Number((bits >> 52n) & 0x7ffn);
  const mant = bits & 0xfffffffffffffn;
  let lead = 1;
  if (exp === 0) {
    lead = 0;
    exp = -1022;
  } else exp -= 1023;
  let m = mant.toString(16).padStart(13, '0');
  if (prec === null) m = m.replace(/0+$/, '');
  else m = m.slice(0, prec).padEnd(prec, '0');
  const s = `0x${lead}${m ? '.' + m : ''}p${exp >= 0 ? '+' : ''}${exp}`;
  return upper ? s.toUpperCase() : s;
}

/**
 * Format like printf. `fmt` and the result are latin1 strings where each
 * character is one byte (so UTF-8 passes through unchanged).
 */
export function formatPrintf(fmt: string, args: ArgSource, hooks: FormatHooks): string {
  let out = '';
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i];
    if (ch !== '%') {
      out += ch;
      continue;
    }
    const start = i;
    i++;
    if (fmt[i] === '%') {
      out += '%';
      continue;
    }
    let left = false, plus = false, space = false, alt = false, zero = false;
    for (;;) {
      const f = fmt[i];
      if (f === '-') left = true;
      else if (f === '+') plus = true;
      else if (f === ' ') space = true;
      else if (f === '#') alt = true;
      else if (f === '0') zero = true;
      else if (f === "'") { /* grouping: ignored */ }
      else break;
      i++;
    }
    let width = 0;
    if (fmt[i] === '*') {
      width = Number(args.int(32, true));
      if (width < 0) {
        left = true;
        width = -width;
      }
      i++;
    } else {
      while (fmt[i] >= '0' && fmt[i] <= '9') width = width * 10 + Number(fmt[i++]);
    }
    let prec: number | null = null;
    if (fmt[i] === '.') {
      i++;
      if (fmt[i] === '*') {
        const p = Number(args.int(32, true));
        prec = p < 0 ? null : p;
        i++;
      } else {
        prec = 0;
        while (fmt[i] >= '0' && fmt[i] <= '9') prec = prec * 10 + Number(fmt[i++]);
      }
    }
    let len = '';
    const lm = /^(hh|h|ll|l|L|z|j|t|q)/.exec(fmt.slice(i, i + 2));
    if (lm) {
      len = lm[1];
      i += len.length;
    }
    const conv = fmt[i];
    if (conv === undefined) {
      out += fmt.slice(start);
      break;
    }
    const intBits = len === 'hh' ? 8 : len === 'h' ? 16 : len === '' ? 32 : 64;
    let body: string;
    let signLen = 0;
    switch (conv) {
      case 'd':
      case 'i': {
        const v = args.int(intBits, true);
        let digits = (v < 0n ? -v : v).toString();
        if (prec !== null) digits = prec === 0 && v === 0n ? '' : digits.padStart(prec, '0');
        const sign = v < 0n ? '-' : plus ? '+' : space ? ' ' : '';
        body = sign + digits;
        signLen = sign.length;
        out += pad(body, width, left, zero && prec === null, signLen);
        continue;
      }
      case 'u':
      case 'o':
      case 'x':
      case 'X': {
        const v = args.int(intBits, false);
        const base = conv === 'u' ? 10 : conv === 'o' ? 8 : 16;
        let digits = v.toString(base);
        if (conv === 'X') digits = digits.toUpperCase();
        if (prec !== null) digits = prec === 0 && v === 0n ? '' : digits.padStart(prec, '0');
        let prefix = '';
        if (alt && conv === 'o' && !digits.startsWith('0')) digits = '0' + digits;
        if (alt && (conv === 'x' || conv === 'X') && v !== 0n) prefix = conv === 'x' ? '0x' : '0X';
        body = prefix + digits;
        out += pad(body, width, left, zero && prec === null, prefix.length);
        continue;
      }
      case 'c': {
        const v = Number(args.int(32, true)) & 0xff;
        out += pad(String.fromCharCode(v), width, left, false);
        continue;
      }
      case 's': {
        const a = args.addr();
        const s = a === 0 ? (prec === null || prec >= 6 ? '(null)' : '') : hooks.cstring(a, prec ?? Infinity);
        out += pad(s, width, left, false);
        continue;
      }
      case 'p': {
        const p = args.ptr();
        body = p === 0 ? '(nil)' : '0x' + p.toString(16);
        out += pad(body, width, left, false);
        continue;
      }
      case 'n': {
        const a = args.addr();
        hooks.storeCount(a, out.length, intBits);
        continue;
      }
      case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': case 'a': case 'A': {
        const v = args.double();
        const upper = conv === 'F' || conv === 'E' || conv === 'G' || conv === 'A';
        const neg = v < 0 || (v === 0 && 1 / v < 0);
        const sign = neg ? '-' : plus ? '+' : space ? ' ' : '';
        let digits: string;
        if (Number.isNaN(v)) {
          digits = upper ? 'NAN' : 'nan';
          out += pad((plus ? '+' : space ? ' ' : '') + digits, width, left, false);
          continue;
        }
        if (!Number.isFinite(v)) {
          digits = upper ? 'INF' : 'inf';
          out += pad(sign + digits, width, left, false);
          continue;
        }
        const p = prec ?? 6;
        if (conv === 'f' || conv === 'F') {
          digits = fixed(v, p);
          if (alt && p === 0) digits += '.';
        } else if (conv === 'e' || conv === 'E') {
          digits = expo(v, p, upper);
          if (alt && p === 0) digits = digits.replace(/([eE])/, '.$1');
        } else if (conv === 'g' || conv === 'G') {
          digits = general(v, p, alt, upper);
        } else {
          digits = hexFloat(v, prec, upper).replace(/^-/, '');
        }
        out += pad(sign + digits, width, left, zero, sign.length + (conv === 'a' || conv === 'A' ? 2 : 0));
        continue;
      }
      default:
        out += fmt.slice(start, i + 1);
    }
  }
  return out;
}

/** Short value rendering for the visualizer (expression results, return values). */
export function shortNumber(v: number, isFloat32: boolean): string {
  if (Number.isNaN(v)) return 'nan';
  if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf';
  if (Number.isInteger(v) && Math.abs(v) < 1e16) return v.toFixed(1).replace(/\.0$/, '.0');
  const s = isFloat32 ? String(Number(v.toPrecision(7))) : String(Number(v.toPrecision(15)));
  return s;
}
