import { describe, expect, it } from 'vitest';
import { DiagnosticBag, formatDiagnostic } from '@/engine/diagnostics';
import { frontend } from '@/engine/frontend';
import { lex } from '@/engine/lexer';
import { Preprocessor } from '@/engine/preprocessor';
import { codeExamples } from '@/data/examples';
import { typeToString } from '@/engine/types';

function pp(src: string): string {
  const bag = new DiagnosticBag();
  const toks = new Preprocessor(bag).run(lex(src, bag, 'main.c'));
  return toks.filter((t) => t.k !== 'eof').map((t) => t.s).join(' ');
}

function diagsOf(src: string): string[] {
  return frontend(src).diags.sorted().map(formatDiagnostic);
}

describe('lexer', () => {
  it('tokenizes literals and punctuators with positions', () => {
    const bag = new DiagnosticBag();
    const toks = lex('int x = 0x1F; // hi\nchar *s = "a\\"b";', bag, 'main.c');
    expect(toks.map((t) => t.s)).toEqual(['int', 'x', '=', '0x1F', ';', 'char', '*', 's', '=', '"a\\"b"', ';', '']);
    expect(toks[5].line).toBe(2);
    expect(toks[5].nl).toBe(true);
    expect(bag.items).toHaveLength(0);
  });

  it('reports unterminated strings', () => {
    expect(diagsOf('int main(){ char *s = "abc;\n return 0; }').join('\n')).toMatch(/1:23: error: missing terminating " character/);
  });
});

describe('preprocessor', () => {
  it('expands object and function-like macros', () => {
    expect(pp('#define N 10\n#define SQ(x) ((x)*(x))\nint a = SQ(N+1);')).toBe('int a = ( ( 10 + 1 ) * ( 10 + 1 ) ) ;');
  });

  it('handles stringize and paste', () => {
    expect(pp('#define S(x) #x\n#define CAT(a,b) a##b\nS(hello world) CAT(foo, 42)')).toBe('"hello world" foo42');
  });

  it('handles variadic macros', () => {
    expect(pp('#define P(fmt, ...) printf(fmt, __VA_ARGS__)\nP("%d %d", 1, 2)')).toBe('printf ( "%d %d" , 1 , 2 )');
    expect(pp('#define P(fmt, ...) printf(fmt, ##__VA_ARGS__)\nP("x")')).toBe('printf ( "x" )');
  });

  it('does not expand recursively', () => {
    expect(pp('#define foo foo + 1\nfoo')).toBe('foo + 1');
  });

  it('evaluates conditionals', () => {
    expect(pp('#define A 2\n#if A > 1 && defined(A)\nyes\n#elif 1\nno\n#else\nno2\n#endif')).toBe('yes');
    expect(pp('#ifndef B\nb\n#endif\n#ifdef B\nx\n#endif')).toBe('b');
  });

  it('reports missing headers', () => {
    expect(diagsOf('#include <foo.h>\nint main(){return 0;}')[0]).toBe('main.c:1:10: error: foo.h: No such file or directory');
    expect(diagsOf('#include <conio.h>\nint main(){return 0;}')[0]).toMatch(/conio.h: not supported/);
  });
});

describe('parser', () => {
  it('parses every built-in example without errors', () => {
    for (const ex of codeExamples) {
      const r = frontend(ex.code);
      const errors = r.diags.items.filter((d) => d.severity === 'error').map(formatDiagnostic);
      expect({ id: ex.id, errors }).toEqual({ id: ex.id, errors: [] });
    }
  });

  it('parses tricky declarators', () => {
    const r = frontend(`
      int (*fp)(int);
      int *a[3];
      int (*p)[3];
      char *(*table[2])(const char *);
      struct Node { int v; struct Node *next; };
      typedef struct Node Node;
      int main(void) { Node n = {1, 0}; return n.v; }
    `);
    expect(r.diags.hasErrors()).toBe(false);
    const g = Object.fromEntries(r.unit!.globals.map((v) => [v.name, typeToString(v.ty)]));
    expect(g.fp).toBe('int (*)(int)');
    expect(g.a).toBe('int *[3]');
    expect(g.p).toBe('int (*)[3]');
    expect(g.table).toBe('char *(*[2])(const char *)');
  });

  it('computes struct layout', () => {
    const r = frontend('struct S { char c; int i; double d; short s; }; struct S g; int main(){return sizeof(struct S);}');
    const s = r.unit!.globals.find((v) => v.name === 'g')!.ty;
    expect(s.kind === 'struct' && s.size).toBe(24);
    expect(s.kind === 'struct' && s.fields!.map((f) => f.offset)).toEqual([0, 4, 8, 16]);
  });

  it('reports gcc-style errors', () => {
    expect(diagsOf('int main() { int x = 5\n return x; }')).toContain("main.c:1:23: error: expected ';' before 'return'");
    expect(diagsOf('int main() { y = 1; return 0; }')[0]).toBe("main.c:1:14: error: 'y' undeclared (first use in this function)");
    expect(diagsOf('int main() { int x; x.y = 1; return 0; }')[0]).toMatch(/request for member 'y' in something not a structure or union/);
    expect(diagsOf('int main() { int a[3]; a = 0; return 0; }')[0]).toMatch(/assignment to expression with array type/);
    expect(diagsOf('int main() { const int c = 1; c = 2; return 0; }')[0]).toMatch(/assignment of read-only variable 'c'/);
    expect(diagsOf('int main() { break; }')[0]).toMatch(/break statement not within loop or switch/);
    expect(diagsOf('int f(int a, int b); int main() { return f(1); }')[0]).toMatch(/too few arguments to function 'f'/);
  });

  it('reports useful warnings', () => {
    const d = diagsOf('#include <stdio.h>\nint main() { int x; double d = 1.5; printf("%d\\n", d); scanf("%d", x); if (x = 3) {} return 0; }');
    expect(d.join('\n')).toMatch(/format '%d' expects argument of type 'int', but argument 2 has type 'double'/);
    expect(d.join('\n')).toMatch(/format '%d' expects argument of type 'int \*', but argument 2 has type 'int'/);
    expect(d.join('\n')).toMatch(/suggest parentheses around assignment used as truth value/);
    expect(diagsOf('int main() { printf("hi"); return 0; }').join('\n')).toMatch(/implicit declaration of function 'printf'/);
    expect(diagsOf('int f(int x) { if (x) return 1; }\nint main(){return f(1);}').join('\n')).toMatch(/control reaches end of non-void function/);
  });

  it('suggests headers for undeclared macros', () => {
    const d = diagsOf('int main() { int *p = NULL; return 0; }');
    expect(d.join('\n')).toMatch(/did you forget to '#include <stddef.h>'/);
  });

  it('supports VLAs, designated initializers and compound literals', () => {
    const r = frontend(`
      #include <stdio.h>
      struct P { int x, y; };
      int main(void) {
        int n = 3;
        int a[n];
        int m[n][n];
        int b[5] = { [2] = 7, [4] = 9 };
        struct P p = { .y = 2, .x = 1 };
        struct P *q = &(struct P){ 3, 4 };
        int grid[2][3] = { 1, 2, 3, 4, 5, 6 };
        a[0] = b[2] + p.x + q->y + grid[1][2] + m[0][0];
        printf("%d\\n", a[0]);
        return 0;
      }
    `);
    expect(r.diags.items.filter((d) => d.severity === 'error').map(formatDiagnostic)).toEqual([]);
  });
});
