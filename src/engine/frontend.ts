// Front end driver: lex → preprocess → parse/type-check.

import type { FuncSym, TranslationUnit } from './ast';
import { DiagnosticBag, FatalError, MAIN_FILE } from './diagnostics';
import { BUILTIN_HEADERS, PRELUDE } from './headers';
import { lex } from './lexer';
import { Parser } from './parser';
import { Preprocessor } from './preprocessor';

export const MAX_SOURCE_BYTES = 64 * 1024;

let libraryCache: Map<string, FuncSym> | null = null;

/** Prototypes of every library function, used when a program forgets an #include. */
function library(): Map<string, FuncSym> {
  if (libraryCache) return libraryCache;
  const lib = new Map<string, FuncSym>();
  for (const name of Object.keys(BUILTIN_HEADERS)) {
    const bag = new DiagnosticBag();
    try {
      const pp = new Preprocessor(bag);
      const toks = pp.run(lex(`#include <${name}>\n`, bag, '<lib>'));
      const p = new Parser(toks, bag, { internal: true });
      p.parseTranslationUnit();
      for (const f of p.result().funcs) {
        if (!lib.has(f.name)) lib.set(f.name, { ...f, header: f.header ?? name });
      }
    } catch {
      // Library parsing problems must never break user compiles.
    }
  }
  libraryCache = lib;
  return lib;
}

export interface FrontendResult {
  unit: TranslationUnit | null;
  diags: DiagnosticBag;
}

export function frontend(code: string): FrontendResult {
  const diags = new DiagnosticBag();
  if (code.length > MAX_SOURCE_BYTES) {
    diags.error(`source file is too large (${code.length} bytes; the limit is ${MAX_SOURCE_BYTES})`, { line: 1, col: 1 });
    return { unit: null, diags };
  }
  try {
    const toks = lex(code, diags, MAIN_FILE);
    const pp = new Preprocessor(diags);
    const ptoks = pp.run(toks);
    const parser = new Parser(ptoks, diags, { library: library(), headers: pp.headers });
    parser.parseTranslationUnit();
    let unit = parser.result();

    // Library functions implemented in C (they call back into user code).
    const needsPrelude = unit.funcs.some((f) => (f.name === 'qsort' || f.name === 'bsearch') && !f.def);
    if (needsPrelude) {
      const bag = new DiagnosticBag();
      const ptoks2 = new Preprocessor(bag).run(lex(PRELUDE, bag, '<prelude>'));
      parser.continueWith(ptoks2, true);
      parser.parseTranslationUnit();
      unit = parser.result();
    }

    const main = unit.funcs.find((f) => f.name === 'main');
    if (!main || !main.def) {
      if (!diags.hasErrors()) diags.error("undefined reference to `main'", { line: 1, col: 1 });
    } else {
      const ty = main.ty;
      if (ty.ret.kind !== 'int' && ty.ret.kind !== 'void') {
        diags.warning("return type of 'main' is not 'int'", main.loc);
      } else if (ty.ret.kind === 'void') {
        diags.warning("return type of 'main' is not 'int'", main.loc);
      }
    }
    return { unit, diags };
  } catch (e) {
    if (e instanceof FatalError) {
      diags.items.push({
        severity: 'note', message: 'compilation terminated.', line: 1, col: 1, endLine: 1, endCol: 2, file: MAIN_FILE,
      });
      return { unit: null, diags };
    }
    throw e;
  }
}
