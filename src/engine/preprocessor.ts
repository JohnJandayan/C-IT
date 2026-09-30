// C preprocessor: #include of built-in headers, object/function-like macros
// (with # and ## and __VA_ARGS__), conditional compilation and #error/#warning.

import { DiagnosticBag, SrcPos } from './diagnostics';
import { BUILTIN_HEADERS, UNSUPPORTED_HEADERS } from './headers';
import { Token, lex } from './lexer';

interface Macro {
  name: string;
  fn: boolean;
  params: string[];
  variadic: boolean;
  body: Token[];
  builtin?: 'LINE' | 'FILE' | 'COUNTER';
  pos?: SrcPos;
}

interface CondFrame {
  /** This group's tokens are being emitted. */
  active: boolean;
  /** Some branch of this #if chain was already taken. */
  taken: boolean;
  seenElse: boolean;
  /** The enclosing group is active. */
  parentActive: boolean;
  pos: SrcPos;
}

const MAX_EXPANSION_TOKENS = 2_000_000;
const MAX_INCLUDE_DEPTH = 16;

export class Preprocessor {
  private macros = new Map<string, Macro>();
  private included = new Set<string>();
  private counter = 0;
  private expandedCount = 0;
  private depth = 0;
  /** Names of headers the program included (used for implicit-declaration hints). */
  readonly headers = new Set<string>();

  constructor(private diags: DiagnosticBag) {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = `"${months[now.getMonth()]} ${String(now.getDate()).padStart(2, ' ')} ${now.getFullYear()}"`;
    const time = `"${now.toTimeString().slice(0, 8)}"`;
    this.defineText('__STDC__', '1');
    this.defineText('__STDC_VERSION__', '201112L');
    this.defineText('__STDC_HOSTED__', '1');
    this.defineText('__x86_64__', '1');
    this.defineText('__LP64__', '1');
    this.defineText('__CIT__', '1');
    this.defineText('__DATE__', date);
    this.defineText('__TIME__', time);
    this.defineText('__SIZEOF_INT__', '4');
    this.defineText('__SIZEOF_LONG__', '8');
    this.defineText('__SIZEOF_POINTER__', '8');
    this.macros.set('__LINE__', { name: '__LINE__', fn: false, params: [], variadic: false, body: [], builtin: 'LINE' });
    this.macros.set('__FILE__', { name: '__FILE__', fn: false, params: [], variadic: false, body: [], builtin: 'FILE' });
    this.macros.set('__COUNTER__', { name: '__COUNTER__', fn: false, params: [], variadic: false, body: [], builtin: 'COUNTER' });
  }

  private defineText(name: string, text: string): void {
    const toks = lex(text, new DiagnosticBag(), '<built-in>').filter((t) => t.k !== 'eof');
    this.macros.set(name, { name, fn: false, params: [], variadic: false, body: toks });
  }

  /** Preprocess a whole translation unit. Returns tokens ending with EOF. */
  run(tokens: Token[]): Token[] {
    const out: Token[] = [];
    this.processFile(tokens, out);
    const last = tokens[tokens.length - 1];
    out.push({ ...last, k: 'eof', s: '' });
    return out;
  }

  private processFile(tokens: Token[], out: Token[]): void {
    const conds: CondFrame[] = [];
    let pending: Token[] = [];
    const flush = () => {
      if (pending.length) {
        for (const t of this.expand(pending)) out.push(t);
        pending = [];
      }
    };
    const active = () => conds.length === 0 || conds[conds.length - 1].active;

    let i = 0;
    while (i < tokens.length && tokens[i].k !== 'eof') {
      const tok = tokens[i];
      if (tok.nl && tok.k === 'punct' && tok.s === '#') {
        // Collect the directive line.
        let j = i + 1;
        while (j < tokens.length && !tokens[j].nl && tokens[j].k !== 'eof') j++;
        const line = tokens.slice(i + 1, j);
        i = j;
        flush();
        this.directive(tok, line, conds, active(), out);
        continue;
      }
      if (active()) pending.push(tok);
      i++;
    }
    flush();
    for (const c of conds) this.diags.error('unterminated #if', c.pos);
  }

  private directive(hash: Token, line: Token[], conds: CondFrame[], isActive: boolean, out: Token[]): void {
    if (line.length === 0) return; // null directive
    const name = line[0];
    const rest = line.slice(1);
    const d = name.s;

    // Conditional directives are processed even in skipped groups.
    switch (d) {
      case 'if':
      case 'ifdef':
      case 'ifndef': {
        let value = false;
        if (isActive) {
          if (d === 'if') value = this.evalCondition(rest, name);
          else {
            if (rest.length === 0 || rest[0].k !== 'id') {
              this.diags.error(`no macro name given in #${d} directive`, name);
            } else {
              const defined = this.macros.has(rest[0].s);
              value = d === 'ifdef' ? defined : !defined;
            }
          }
        }
        conds.push({ active: isActive && value, taken: value, seenElse: false, parentActive: isActive, pos: hash });
        return;
      }
      case 'elif': {
        const top = conds[conds.length - 1];
        if (!top) {
          this.diags.error('#elif without #if', hash);
          return;
        }
        if (top.seenElse) this.diags.error('#elif after #else', hash);
        if (top.parentActive && !top.taken) {
          const value = this.evalCondition(rest, name);
          top.active = value;
          top.taken = value;
        } else {
          top.active = false;
        }
        return;
      }
      case 'else': {
        const top = conds[conds.length - 1];
        if (!top) {
          this.diags.error('#else without #if', hash);
          return;
        }
        if (top.seenElse) this.diags.error('#else after #else', hash);
        top.seenElse = true;
        top.active = top.parentActive && !top.taken;
        top.taken = true;
        return;
      }
      case 'endif':
        if (!conds.pop()) this.diags.error('#endif without #if', hash);
        return;
    }

    if (!isActive) return;

    switch (d) {
      case 'define':
        this.define(rest, name);
        return;
      case 'undef':
        if (rest[0]?.k === 'id') this.macros.delete(rest[0].s);
        else this.diags.error('no macro name given in #undef directive', name);
        return;
      case 'include':
        this.include(rest, name, out);
        return;
      case 'error':
        this.diags.error(`#error ${rest.map((t) => t.s).join(' ')}`, hash);
        return;
      case 'warning':
        this.diags.warning(`#warning ${rest.map((t) => t.s).join(' ')}`, hash);
        return;
      case 'pragma':
      case 'line':
      case 'ident':
        return;
      default:
        if (name.k === 'num') return; // GNU line marker `# 12 "file"`
        this.diags.error(`invalid preprocessing directive #${d}`, name);
    }
  }

  private include(rest: Token[], at: Token, out: Token[]): void {
    let header: string | null = null;
    let system = true;
    if (rest[0]?.k === 'str') {
      header = rest[0].s.slice(1, -1);
      system = false;
    } else if (rest[0]?.s === '<') {
      const close = rest.findIndex((t) => t.s === '>');
      if (close > 0) {
        // Rebuild the spelling, including characters like '/' and '.'.
        header = rest.slice(1, close).map((t) => t.s).join('');
      }
    }
    if (!header) {
      this.diags.error('#include expects "FILENAME" or <FILENAME>', at);
      return;
    }
    const src = BUILTIN_HEADERS[header];
    if (src === undefined) {
      const hint = UNSUPPORTED_HEADERS[header];
      const msg = hint
        ? `${header}: not supported (${hint})`
        : system
        ? `${header}: No such file or directory`
        : `${header}: No such file or directory (C-It compiles a single file; paste the header's contents into main.c)`;
      this.diags.error(msg, rest[0], rest[rest.length - 1] ? { line: rest[rest.length - 1].endLine, col: rest[rest.length - 1].endCol } : undefined);
      return;
    }
    this.headers.add(header);
    if (this.included.has(header)) return;
    this.included.add(header);
    if (this.depth >= MAX_INCLUDE_DEPTH) {
      this.diags.error('#include nested too deeply', at);
      return;
    }
    this.depth++;
    const toks = lex(src, this.diags, `<${header}>`);
    this.processFile(toks, out);
    this.depth--;
  }

  private define(rest: Token[], at: Token): void {
    const nameTok = rest[0];
    if (!nameTok || nameTok.k !== 'id') {
      this.diags.error('macro names must be identifiers', nameTok ?? at);
      return;
    }
    if (nameTok.s === 'defined') {
      this.diags.error('"defined" cannot be used as a macro name', nameTok);
      return;
    }
    const macro: Macro = { name: nameTok.s, fn: false, params: [], variadic: false, body: [], pos: nameTok };
    let i = 1;
    if (rest[1] && rest[1].s === '(' && !rest[1].sp) {
      macro.fn = true;
      i = 2;
      let expectParam = true;
      for (;;) {
        const t = rest[i];
        if (!t) {
          this.diags.error('missing \')\' in macro parameter list', nameTok);
          return;
        }
        if (t.s === ')' && (!expectParam || macro.params.length === 0)) {
          i++;
          break;
        }
        if (expectParam && t.s === '...') {
          macro.variadic = true;
          i++;
          if (rest[i]?.s !== ')') {
            this.diags.error('missing \')\' after "..."', t);
            return;
          }
          i++;
          break;
        }
        if (expectParam && t.k === 'id') {
          if (rest[i + 1]?.s === '...') {
            // GNU named variadic parameter: args...
            macro.params.push(t.s);
            macro.variadic = true;
            i += 2;
            if (rest[i]?.s !== ')') {
              this.diags.error('missing \')\' in macro parameter list', t);
              return;
            }
            i++;
            break;
          }
          macro.params.push(t.s);
          expectParam = false;
          i++;
          continue;
        }
        if (!expectParam && t.s === ',') {
          expectParam = true;
          i++;
          continue;
        }
        this.diags.error(`expected parameter name, found "${t.s}"`, t);
        return;
      }
    }
    macro.body = rest.slice(i);
    if (macro.body[0]?.s === '##' || (macro.body.length && macro.body[macro.body.length - 1].s === '##')) {
      this.diags.error("'##' cannot appear at either end of a macro expansion", macro.body[0]);
      return;
    }
    const prev = this.macros.get(macro.name);
    if (prev && !prev.builtin && !sameMacro(prev, macro) && prev.pos?.file === nameTok.file) {
      this.diags.warning(`"${macro.name}" redefined`, nameTok);
    }
    this.macros.set(macro.name, macro);
  }

  // ---------------------------------------------------------------- expansion

  expand(input: Token[]): Token[] {
    const stack = input.slice().reverse();
    const out: Token[] = [];
    while (stack.length) {
      const t = stack.pop()!;
      if (t.k !== 'id') {
        out.push(t);
        continue;
      }
      const m = this.macros.get(t.s);
      if (!m || t.hide?.has(t.s)) {
        out.push(t);
        continue;
      }
      if (m.builtin) {
        out.push(this.builtinToken(m, t));
        continue;
      }
      if ((this.expandedCount += m.body.length + 1) > MAX_EXPANSION_TOKENS) {
        this.diags.error('macro expansion too large', t);
        return out;
      }
      const hide = new Set(t.hide ?? []);
      hide.add(m.name);
      if (!m.fn) {
        const body = this.substitute(m, [], t, hide);
        for (let k = body.length - 1; k >= 0; k--) stack.push(body[k]);
        continue;
      }
      const next = stack[stack.length - 1];
      if (!next || next.s !== '(' || next.k !== 'punct') {
        out.push(t);
        continue;
      }
      stack.pop();
      const args = this.collectArgs(stack, m, t);
      if (!args) continue;
      const body = this.substitute(m, args, t, hide);
      for (let k = body.length - 1; k >= 0; k--) stack.push(body[k]);
    }
    return out;
  }

  private builtinToken(m: Macro, at: Token): Token {
    switch (m.builtin) {
      case 'LINE':
        return { ...at, k: 'num', s: String(at.line), fromMacro: true };
      case 'FILE':
        return { ...at, k: 'str', s: '"main.c"', fromMacro: true };
      default:
        return { ...at, k: 'num', s: String(this.counter++), fromMacro: true };
    }
  }

  private collectArgs(stack: Token[], m: Macro, at: Token): Token[][] | null {
    const args: Token[][] = [[]];
    let depth = 0;
    for (;;) {
      const t = stack.pop();
      if (!t || t.k === 'eof') {
        this.diags.error(`unterminated argument list invoking macro "${m.name}"`, at);
        if (t) stack.push(t);
        return null;
      }
      if (t.s === '(' && t.k === 'punct') depth++;
      else if (t.s === ')' && t.k === 'punct') {
        if (depth === 0) break;
        depth--;
      } else if (t.s === ',' && t.k === 'punct' && depth === 0) {
        if (!(m.variadic && args.length > this.fixedCount(m))) {
          args.push([]);
          continue;
        }
      }
      args[args.length - 1].push(t);
    }
    const namedCount = m.params.length;
    if (namedCount === 0 && !m.variadic && args.length === 1 && args[0].length === 0) return [];
    if (m.variadic) {
      // Named params plus one collected variadic argument (possibly missing).
      const fixed = this.fixedCount(m);
      if (fixed === 0 && args.length === 1 && args[0].length === 0) return [[]];
      if (args.length < fixed) {
        this.diags.error(`macro "${m.name}" requires ${fixed} arguments, but only ${args.length} given`, at);
        return null;
      }
      while (args.length < fixed + 1) args.push([]);
      return args;
    }
    if (args.length !== namedCount) {
      const given = args.length;
      this.diags.error(
        given > namedCount
          ? `macro "${m.name}" passed ${given} arguments, but takes just ${namedCount}`
          : `macro "${m.name}" requires ${namedCount} arguments, but only ${given} given`,
        at
      );
      return null;
    }
    return args;
  }

  /** Number of named, non-variadic parameters. */
  private fixedCount(m: Macro): number {
    return this.isGnuVariadic(m) ? m.params.length - 1 : m.params.length;
  }

  private isGnuVariadic(m: Macro): boolean {
    // In `#define F(args...)` the last named parameter is the variadic one.
    return m.variadic && !m.body.some((t) => t.s === '__VA_ARGS__') && m.params.length > 0;
  }

  private substitute(m: Macro, args: Token[][], at: Token, hide: Set<string>): Token[] {
    const paramIndex = (t: Token): number => {
      if (t.k !== 'id') return -1;
      if (m.variadic && t.s === '__VA_ARGS__') return this.isGnuVariadic(m) ? -1 : m.params.length;
      return m.params.indexOf(t.s);
    };
    const expandedCache = new Map<number, Token[]>();
    const expandedArg = (idx: number) => {
      let e = expandedCache.get(idx);
      if (!e) {
        e = this.expand(args[idx] ?? []);
        expandedCache.set(idx, e);
      }
      return e;
    };
    const place = (t: Token): Token => ({
      ...t,
      line: at.line,
      col: at.col,
      endLine: at.endLine,
      endCol: at.endCol,
      file: at.file,
      nl: false,
      fromMacro: true,
    });

    const result: Token[] = [];
    const body = m.body;
    for (let i = 0; i < body.length; i++) {
      const t = body[i];
      // Stringize.
      if (m.fn && t.s === '#' && t.k === 'punct') {
        const p = body[i + 1] ? paramIndex(body[i + 1]) : -1;
        if (p >= 0) {
          result.push(place({ ...t, k: 'str', s: stringize(args[p] ?? []) }));
          i++;
          continue;
        }
        this.diags.error("'#' is not followed by a macro parameter", at);
        continue;
      }
      // Paste.
      if (t.s === '##' && t.k === 'punct') {
        const rightTok = body[i + 1];
        i++;
        if (!rightTok) break;
        const rp = paramIndex(rightTok);
        let rightToks = rp >= 0 ? (args[rp] ?? []).map(place) : [place(rightTok)];
        // GNU comma swallowing: `, ## __VA_ARGS__` with empty variadic args.
        if (m.variadic && rp === this.fixedCount(m) && rightToks.length === 0 && result.length && result[result.length - 1].s === ',') {
          result.pop();
          continue;
        }
        const left = result.pop();
        if (!left) {
          result.push(...rightToks);
          continue;
        }
        if (rightToks.length === 0) {
          result.push(left);
          continue;
        }
        const pasted = this.paste(left, rightToks[0], at);
        result.push(pasted, ...rightToks.slice(1));
        continue;
      }
      const p = paramIndex(t);
      if (p >= 0) {
        const nextIsPaste = body[i + 1]?.s === '##';
        const toks = nextIsPaste ? args[p] ?? [] : expandedArg(p);
        // Argument tokens keep their own source positions so expression ranges stay precise.
        for (const a of toks) result.push({ ...a, nl: false });
        continue;
      }
      result.push(place(t));
    }
    for (let k = 0; k < result.length; k++) {
      const r = result[k];
      const h = new Set(r.hide ?? []);
      hide.forEach((n) => h.add(n));
      result[k] = { ...r, hide: h };
    }
    return result;
  }

  private paste(left: Token, right: Token, at: Token): Token {
    const text = left.s + right.s;
    const bag = new DiagnosticBag();
    const toks = lex(text, bag).filter((t) => t.k !== 'eof');
    if (toks.length !== 1 || bag.hasErrors()) {
      this.diags.error(`pasting "${left.s}" and "${right.s}" does not give a valid preprocessing token`, at);
      return left;
    }
    return { ...left, k: toks[0].k, s: text };
  }

  // ------------------------------------------------------------ #if evaluation

  private evalCondition(tokens: Token[], at: Token): boolean {
    // Replace `defined X` / `defined(X)` before macro expansion.
    const pre: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.k === 'id' && t.s === 'defined') {
        let nameTok: Token | undefined;
        if (tokens[i + 1]?.s === '(') {
          nameTok = tokens[i + 2];
          if (tokens[i + 3]?.s !== ')') this.diags.error("missing ')' after \"defined\"", t);
          i += 3;
        } else {
          nameTok = tokens[i + 1];
          i += 1;
        }
        if (!nameTok || nameTok.k !== 'id') {
          this.diags.error('operator "defined" requires an identifier', t);
          return false;
        }
        pre.push({ ...t, k: 'num', s: this.macros.has(nameTok.s) ? '1' : '0' });
        continue;
      }
      pre.push(t);
    }
    const expanded = this.expand(pre).map((t) => (t.k === 'id' ? { ...t, k: 'num' as const, s: t.s === 'true' ? '1' : '0' } : t));
    if (expanded.length === 0) {
      this.diags.error('#if with no expression', at);
      return false;
    }
    try {
      const ev = new CondEvaluator(expanded);
      const v = ev.parseTernary();
      if (!ev.atEnd()) throw new Error(`missing binary operator before token "${ev.peek()?.s}"`);
      return v !== 0n;
    } catch (e) {
      this.diags.error(e instanceof Error ? e.message : 'invalid #if expression', at);
      return false;
    }
  }
}

function sameMacro(a: Macro, b: Macro): boolean {
  return (
    a.fn === b.fn &&
    a.params.join(',') === b.params.join(',') &&
    a.body.map((t) => t.s).join(' ') === b.body.map((t) => t.s).join(' ')
  );
}

function stringize(tokens: Token[]): string {
  let s = '';
  tokens.forEach((t, i) => {
    if (i > 0 && t.sp) s += ' ';
    s += t.k === 'str' || t.k === 'char' ? t.s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : t.s;
  });
  return `"${s}"`;
}

/** Integer constant expression evaluator for #if, using 64-bit semantics. */
class CondEvaluator {
  private i = 0;
  constructor(private toks: Token[]) {}

  atEnd(): boolean {
    return this.i >= this.toks.length;
  }

  peek(): Token | undefined {
    return this.toks[this.i];
  }

  private eat(s: string): boolean {
    if (this.toks[this.i]?.s === s && this.toks[this.i].k === 'punct') {
      this.i++;
      return true;
    }
    return false;
  }

  parseTernary(): bigint {
    const c = this.parseBinary(0);
    if (this.eat('?')) {
      const a = this.parseTernary();
      if (!this.eat(':')) throw new Error("expected ':' in #if expression");
      const b = this.parseTernary();
      return c !== 0n ? a : b;
    }
    return c;
  }

  private static PREC: Record<string, number> = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6,
    '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
  };

  private parseBinary(minPrec: number): bigint {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      const prec = t && t.k === 'punct' ? CondEvaluator.PREC[t.s] : undefined;
      if (prec === undefined || prec <= minPrec) return left;
      this.i++;
      const right = this.parseBinary(prec);
      left = this.apply(t!.s, left, right);
    }
  }

  private apply(op: string, a: bigint, b: bigint): bigint {
    const b2 = (x: boolean) => (x ? 1n : 0n);
    switch (op) {
      case '||': return b2(a !== 0n || b !== 0n);
      case '&&': return b2(a !== 0n && b !== 0n);
      case '|': return a | b;
      case '^': return a ^ b;
      case '&': return a & b;
      case '==': return b2(a === b);
      case '!=': return b2(a !== b);
      case '<': return b2(a < b);
      case '>': return b2(a > b);
      case '<=': return b2(a <= b);
      case '>=': return b2(a >= b);
      case '<<': return BigInt.asIntN(64, a << b);
      case '>>': return a >> b;
      case '+': return BigInt.asIntN(64, a + b);
      case '-': return BigInt.asIntN(64, a - b);
      case '*': return BigInt.asIntN(64, a * b);
      case '/':
        if (b === 0n) throw new Error('division by zero in #if');
        return a / b;
      case '%':
        if (b === 0n) throw new Error('division by zero in #if');
        return a % b;
    }
    throw new Error(`token "${op}" is not valid in preprocessor expressions`);
  }

  private parseUnary(): bigint {
    if (this.eat('!')) return this.parseUnary() === 0n ? 1n : 0n;
    if (this.eat('-')) return -this.parseUnary();
    if (this.eat('+')) return this.parseUnary();
    if (this.eat('~')) return ~this.parseUnary();
    if (this.eat('(')) {
      const v = this.parseTernary();
      if (!this.eat(')')) throw new Error("missing ')' in expression");
      return v;
    }
    const t = this.toks[this.i++];
    if (!t) throw new Error('#if with no expression');
    if (t.k === 'num') {
      const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]*|[1-9][0-9]*)[uUlL]*$/.exec(t.s);
      if (!m) throw new Error(`invalid integer constant "${t.s}" in #if`);
      const body = m[1];
      if (/^0[bB]/.test(body)) return BigInt(body);
      if (/^0[0-7]+$/.test(body)) return BigInt('0o' + body.slice(1));
      return BigInt(body);
    }
    if (t.k === 'char') {
      const inner = t.s.slice(1, -1);
      return BigInt(inner.startsWith('\\') ? charEscapeValue(inner) : inner.charCodeAt(0));
    }
    throw new Error(`token "${t.s}" is not valid in preprocessor expressions`);
  }
}

function charEscapeValue(s: string): number {
  const map: Record<string, number> = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 };
  return map[s[1]] ?? s.charCodeAt(1);
}
