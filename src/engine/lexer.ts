// Tokenizer for C source text. Produces preprocessing tokens; keywords are
// recognised later by the parser so that macros can still shadow them.

import { DiagnosticBag } from './diagnostics';

export type TokKind = 'id' | 'num' | 'char' | 'str' | 'punct' | 'eof' | 'other';

export interface Token {
  k: TokKind;
  /** Exact spelling (literals keep their quotes / suffixes). */
  s: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  file?: string;
  /** First token on a physical line (needed to spot directives). */
  nl: boolean;
  /** Preceded by whitespace (needed to distinguish `#define F(x)` from `#define F (x)`). */
  sp: boolean;
  /** Macro names that must not be expanded again inside this token (hide set). */
  hide?: Set<string>;
  /** Set when a token came out of a macro expansion. */
  fromMacro?: boolean;
}

const PUNCTUATORS = [
  '...', '<<=', '>>=',
  '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
  '*=', '/=', '%=', '+=', '-=', '&=', '^=', '|=', '##',
  '[', ']', '(', ')', '{', '}', '.', '&', '*', '+', '-', '~', '!', '/', '%',
  '<', '>', '^', '|', '?', ':', ';', '=', ',', '#',
];

function isIdStart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$';
}

function isIdChar(c: string): boolean {
  return isIdStart(c) || (c >= '0' && c <= '9');
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

export function lex(src: string, diags: DiagnosticBag, file?: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let atLineStart = true;
  let sawSpace = false;
  const n = src.length;

  const advance = (count = 1) => {
    for (let k = 0; k < count; k++) {
      if (src[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const pos = () => ({ line, col, file });

  while (i < n) {
    const c = src[i];

    // Line splice: backslash-newline is invisible.
    if (c === '\\' && (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n'))) {
      advance(src[i + 1] === '\r' ? 3 : 2);
      sawSpace = true;
      continue;
    }
    if (c === '\n') {
      advance();
      atLineStart = true;
      sawSpace = false;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') {
      advance();
      sawSpace = true;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') {
        if (src[i] === '\\' && src[i + 1] === '\n') advance();
        advance();
      }
      sawSpace = true;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const start = pos();
      advance(2);
      let closed = false;
      while (i < n) {
        if (src[i] === '*' && src[i + 1] === '/') {
          advance(2);
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) diags.error('unterminated comment', start);
      sawSpace = true;
      continue;
    }

    const startLine = line;
    const startCol = col;
    const startIdx = i;
    let kind: TokKind;

    if (isIdStart(c)) {
      // String / char prefixes (L, u, U, u8).
      const m = /^(u8|u|U|L)(["'])/.exec(src.slice(i, i + 3));
      if (m) {
        advance(m[1].length);
        kind = lexQuoted(m[2]);
      } else {
        while (i < n && isIdChar(src[i])) advance();
        kind = 'id';
      }
    } else if (isDigit(c) || (c === '.' && isDigit(src[i + 1] ?? ''))) {
      // pp-number: digits, letters, dots, and exponent signs.
      advance();
      while (i < n) {
        const d = src[i];
        if ((d === '+' || d === '-') && /[eEpP]/.test(src[i - 1])) {
          advance();
        } else if (isIdChar(d) || d === '.') {
          advance();
        } else {
          break;
        }
      }
      kind = 'num';
    } else if (c === '"' || c === "'") {
      kind = lexQuoted(c);
    } else {
      const p = PUNCTUATORS.find((cand) => src.startsWith(cand, i));
      if (p) {
        advance(p.length);
        kind = 'punct';
      } else {
        advance();
        kind = 'other';
        diags.error(`stray '${c}' in program`, { line: startLine, col: startCol, file });
      }
    }

    tokens.push({
      k: kind,
      s: src.slice(startIdx, i),
      line: startLine,
      col: startCol,
      endLine: line,
      endCol: col,
      file,
      nl: atLineStart,
      sp: sawSpace,
    });
    atLineStart = false;
    sawSpace = false;
  }

  tokens.push({ k: 'eof', s: '', line, col, endLine: line, endCol: col, file, nl: true, sp: false });
  return tokens;

  function lexQuoted(quote: string): TokKind {
    const start = pos();
    advance();
    while (i < n && src[i] !== quote) {
      if (src[i] === '\n') break;
      if (src[i] === '\\') advance();
      advance();
    }
    if (src[i] !== quote) {
      diags.error(
        quote === '"' ? 'missing terminating " character' : "missing terminating ' character",
        start
      );
      return quote === '"' ? 'str' : 'char';
    }
    advance();
    return quote === '"' ? 'str' : 'char';
  }
}

/** Decode the body of a char/string literal into byte values (UTF-8 for non-ASCII). */
export function decodeEscapes(body: string, onError: (msg: string) => void): number[] {
  const out: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') {
      const code = c.charCodeAt(0);
      if (code < 0x80) out.push(code);
      else {
        // Encode full code point (handles surrogate pairs).
        const cp = body.codePointAt(i)!;
        const ch = String.fromCodePoint(cp);
        out.push(...encoder.encode(ch));
        if (cp > 0xffff) i++;
      }
      continue;
    }
    i++;
    const e = body[i];
    switch (e) {
      case 'n': out.push(10); break;
      case 't': out.push(9); break;
      case 'r': out.push(13); break;
      case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
        let v = 0;
        let len = 0;
        while (len < 3 && /[0-7]/.test(body[i] ?? '')) {
          v = v * 8 + Number(body[i]);
          i++;
          len++;
        }
        i--;
        out.push(v & 0xff);
        break;
      }
      case 'x': {
        let v = 0;
        let len = 0;
        i++;
        while (/[0-9a-fA-F]/.test(body[i] ?? '')) {
          v = (v * 16 + parseInt(body[i], 16)) & 0xffff;
          i++;
          len++;
        }
        i--;
        if (len === 0) onError('\\x used with no following hex digits');
        out.push(v & 0xff);
        break;
      }
      case 'a': out.push(7); break;
      case 'b': out.push(8); break;
      case 'f': out.push(12); break;
      case 'v': out.push(11); break;
      case 'e': out.push(27); break;
      case '\\': out.push(92); break;
      case "'": out.push(39); break;
      case '"': out.push(34); break;
      case '?': out.push(63); break;
      default:
        onError(`unknown escape sequence: '\\${e ?? ''}'`);
        out.push((e ?? '').charCodeAt(0) || 0);
    }
  }
  return out;
}
