import { describe, expect, it } from 'vitest';
import { runProgram } from '@/engine/engine';
import { formatDiagnostic } from '@/engine/diagnostics';
import { codeExamples } from '@/data/examples';
import { StepKind } from '@/engine/protocol';

function run(code: string, inputs: (string | null)[] = []) {
  const r = runProgram(code, inputs);
  const errors = r.diagnostics.filter((d) => d.severity === 'error').map(formatDiagnostic);
  if (errors.length) throw new Error('compile errors:\n' + errors.join('\n'));
  return r;
}

const out = (code: string, inputs: (string | null)[] = []) => run(code, inputs).stdout;

describe('execution', () => {
  it('runs hello world', () => {
    expect(out('#include <stdio.h>\nint main(void){ printf("Hello, %s! %d\\n", "C", 42); return 0; }')).toBe('Hello, C! 42\n');
  });

  it('runs every example with the expected output', () => {
    const expected: Record<string, string> = {
      'array-demo': 'numbers[0] = 10\nnumbers[1] = 20\nnumbers[2] = 30\nnumbers[3] = 40\nnumbers[4] = 50\nSum: 150\n',
      variables: 'x = 10, y = 20\nSum: 30\nProduct: 200\nAverage: 15.0\n',
      'hello-world': 'Hello, World!\n',
      'bubble-sort': 'Original array:\n64 34 25 12 22 \nSorted array:\n12 22 25 34 64 \n',
      'binary-search': 'Checking position 3 (value: 12)\nChecking position 5 (value: 23)\nFound 23 at index 5\n',
      factorial: 'Factorial of 5 is 120\n',
      'string-reverse': 'Original: Hello\nReversed: olleH\n',
      fibonacci: 'Fibonacci sequence:\n0 1 1 2 3 5 8 13 \n',
    };
    Object.assign(expected, {
      'switch-grades': '95 -> A\n82 -> B\n71 -> C\n64 -> D\n40 -> F\n',
      'matrix-multiply': '58 64\n139 154\n',
      palindrome: 'racecar: palindrome\n',
      'swap-pointers': 'before: x = 3, y = 7\nafter:  x = 7, y = 3\n',
      'pointer-arithmetic': 'total = 14, elements visited = 5\n',
      'fib-recursive': 'fib(5) = 5\n',
      'function-pointers': 'add(6, 3) = 9\nsub(6, 3) = 3\nmul(6, 3) = 18\n',
      structs: 'Top student: Grace (96)\n',
      'selection-sort': '5 10 13 14 29 37 \n',
      'insertion-sort': '5 6 7 11 12 13 \n',
      'merge-sort': '1 3 9 10 27 38 43 82 \n',
      'quick-sort': '10 30 40 50 70 80 90 \n',
      'linked-list': '10 30 40 \n',
      'doubly-linked-list': '3 2 1 \n',
      bst: '20 30 40 50 60 70 80 \n',
      'stack-array': 'popped 44\npopped 33\ntop is now 99\n',
      'circular-queue': '1 2 3 4 5 6 \n',
      'dynamic-array': '1 4 9 16 25 (capacity 8)\n',
      'scanf-calculator': 'Enter an expression like 12 * 3: 36\n',
      'scanf-average': 'How many numbers? Number 1: Number 2: Number 3: Number 4: Average: 26.25\n',
      'bug-leak': 'second\n',
    });
    const errors: Record<string, string> = {
      'bug-off-by-one': 'heap-buffer-overflow',
      'bug-use-after-free': 'heap-use-after-free',
      'bug-stack-overflow': 'stack-overflow',
    };
    for (const ex of codeExamples) {
      const r = run(ex.code, ex.input ?? []);
      if (errors[ex.id]) {
        expect(r.done?.error?.kind, ex.id).toBe(errors[ex.id]);
        continue;
      }
      expect(r.done?.reason, ex.id).toBe('exit');
      if (expected[ex.id]) expect(r.stdout, ex.id).toBe(expected[ex.id]);
      // Every non-bug example should be free of leaks and runtime warnings.
      if (!ex.id.startsWith('bug-')) {
        expect(r.done?.leaks, ex.id).toEqual([]);
        expect(r.steps.flatMap((s) => s.warn ?? []), ex.id).toEqual([]);
      }
    }
    const leak = run(codeExamples.find((e) => e.id === 'bug-leak')!.code);
    expect(leak.done?.leaks).toHaveLength(1);
    const uninit = run(codeExamples.find((e) => e.id === 'bug-uninitialized')!.code);
    expect(uninit.console).toMatch(/uninitialized value of 'sum'/);
  });

  it('compiles every example without warnings', () => {
    for (const ex of codeExamples) {
      const r = runProgram(ex.code, ex.input ?? []);
      const warnings = r.diagnostics.map(formatDiagnostic);
      expect({ id: ex.id, warnings }).toEqual({ id: ex.id, warnings: [] });
    }
  });

  it('handles integer semantics', () => {
    const code = `#include <stdio.h>
#include <limits.h>
int main(void) {
  int a = INT_MAX; unsigned u = 0; char c = 200; long long big = 1LL << 40;
  printf("%d %u %d %lld\\n", a + 1, u - 1, c, big * 3);
  printf("%d %d %d %d\\n", 7 / 2, -7 / 2, -7 % 3, 7 >> 1);
  printf("%lu %zu\\n", sizeof(long), sizeof(int[10]));
  unsigned char uc = 255; uc++;
  printf("%d %x %o %X\\n", uc, 255, 8, 0xabc);
  return 0;
}`;
    expect(out(code)).toBe('-2147483648 4294967295 -56 3298534883328\n3 -3 -1 3\n8 40\n0 ff 10 ABC\n');
  });

  it('formats floats like glibc', () => {
    const code = `#include <stdio.h>
int main(void) {
  double d = 3.14159; float f = 0.1f;
  printf("%f %.2f %e %g %g %g\\n", d, d, d, d, 100000.0, 1e-5);
  printf("%.0f %.0f %8.3f|%-8.2f|%+d\\n", 0.5, 2.5, d, d, 5);
  printf("%f %.10f\\n", f, f);
  return 0;
}`;
    expect(out(code)).toBe(
      '3.141590 3.14 3.141590e+00 3.14159 100000 1e-05\n0 2    3.142|3.14    |+5\n0.100000 0.1000000015\n'
    );
  });

  it('supports recursion, pointers, structs and arrays', () => {
    const code = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
struct Point { int x, y; };
typedef struct Node { int v; struct Node *next; } Node;
int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
struct Point make(int x, int y) { struct Point p = { x, y }; return p; }
int main(void) {
  int a = 1, b = 2; swap(&a, &b);
  struct Point p = make(3, 4);
  int m[2][3] = { {1, 2, 3}, {4, 5, 6} };
  Node *head = NULL;
  for (int i = 0; i < 3; i++) { Node *n = malloc(sizeof *n); n->v = i; n->next = head; head = n; }
  int sum = 0;
  for (Node *c = head; c; c = c->next) sum += c->v;
  while (head) { Node *n = head->next; free(head); head = n; }
  char buf[32]; strcpy(buf, "abc"); strcat(buf, "def");
  printf("%d %d %d %d %d %d %d %s %zu\\n", fib(10), a, b, p.x, p.y, m[1][2], sum, buf, strlen(buf));
  return 0;
}`;
    expect(out(code)).toBe('55 2 1 3 4 6 3 abcdef 6\n');
  });

  it('supports switch, goto, do-while and function pointers', () => {
    const code = `#include <stdio.h>
int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int main(void) {
  int (*ops[2])(int, int) = { add, mul };
  int total = 0, i = 0;
  do { total += ops[i % 2](i, 3); i++; } while (i < 4);
  switch (total) { case 1: printf("one"); break; case 20: printf("t"); default: printf("d"); }
  int k = 0;
again:
  if (++k < 3) goto again;
  printf(" %d %d\\n", total, k);
  return 0;
}`;
    expect(out(code)).toBe('td 20 3\n');
  });

  it('supports qsort with callbacks and variadic functions', () => {
    const code = `#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
int cmp(const void *a, const void *b) { return *(const int *)a - *(const int *)b; }
int sum(int n, ...) { va_list ap; va_start(ap, n); int s = 0; for (int i = 0; i < n; i++) s += va_arg(ap, int); va_end(ap); return s; }
int main(void) {
  int a[] = { 5, 3, 9, 1 };
  qsort(a, 4, sizeof a[0], cmp);
  printf("%d %d %d %d %d\\n", a[0], a[1], a[2], a[3], sum(3, 10, 20, 30));
  return 0;
}`;
    expect(out(code)).toBe('1 3 5 9 60\n');
  });

  it('supports VLAs', () => {
    const code = `#include <stdio.h>
void fill(int r, int c, int m[r][c]) { for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) m[i][j] = i * c + j; }
int main(void) {
  int n = 3;
  int m[n][n + 1];
  fill(n, n + 1, m);
  printf("%d %d %zu\\n", m[2][3], m[1][0], sizeof m);
  return 0;
}`;
    expect(out(code)).toBe('11 4 48\n');
  });

  it('reads interactive input', () => {
    const code = `#include <stdio.h>
int main(void) {
  int n; char name[20];
  printf("n? ");
  scanf("%d", &n);
  printf("name? ");
  scanf("%19s", name);
  int c = getchar();
  printf("%d %s %d\\n", n * 2, name, c);
  return 0;
}`;
    const r = run(code, ['21', 'Ada']);
    expect(r.stdout).toBe('n? name? 42 Ada 10\n');
    expect(r.steps.some((s) => s.k === StepKind.Input)).toBe(true);
    expect(r.console).toContain('21\n');
  });

  it('returns EOF from scanf at end of input', () => {
    const code = `#include <stdio.h>
int main(void) { int x, s = 0; while (scanf("%d", &x) == 1) s += x; printf("%d\\n", s); return 0; }`;
    expect(out(code, ['1 2', '3', null])).toBe('6\n');
  });

  it('matches glibc rand()', () => {
    expect(out('#include <stdio.h>\n#include <stdlib.h>\nint main(void){ printf("%d %d\\n", rand(), rand()); srand(1); printf("%d\\n", rand()); return 0; }')).toBe('1804289383 846930886\n1804289383\n');
  });
});

describe('memory errors', () => {
  const err = (code: string) => {
    const r = run(code);
    expect(r.done?.reason).toBe('error');
    return r.done!.error!;
  };

  it('detects heap buffer overflow', () => {
    const e = err('#include <stdlib.h>\nint main(void){ int *a = malloc(10 * sizeof(int));\n a[10] = 1; free(a); return 0; }');
    expect(e.kind).toBe('heap-buffer-overflow');
    expect(e.line).toBe(3);
    expect(e.message).toMatch(/0 bytes past the end of a 40-byte block allocated at line 2/);
  });

  it('detects stack buffer overflow', () => {
    const e = err('int main(void){ int a[5]; for (int i = 0; i <= 5; i++) a[i] = i; return 0; }');
    expect(e.kind).toBe('stack-buffer-overflow');
    expect(e.message).toMatch(/'a'/);
  });

  it('detects use after free and double free', () => {
    expect(err('#include <stdlib.h>\nint main(void){ int *p = malloc(4); free(p); return *p; }').kind).toBe('heap-use-after-free');
    expect(err('#include <stdlib.h>\nint main(void){ int *p = malloc(4); free(p); free(p); return 0; }').kind).toBe('double-free');
  });

  it('detects NULL dereference and division by zero', () => {
    expect(err('#include <stddef.h>\nint main(void){ int *p = NULL; return *p; }').kind).toBe('null-deref');
    expect(err('int main(void){ int z = 0; return 5 / z; }').kind).toBe('div-zero');
  });

  it('detects stack overflow from infinite recursion', () => {
    expect(err('int f(int n){ return f(n + 1) + 1; }\nint main(void){ return f(0); }').kind).toBe('stack-overflow');
  });

  it('detects writes to string literals', () => {
    expect(err('int main(void){ char *s = "hi"; s[0] = \'H\'; return 0; }').kind).toBe('write-to-readonly');
  });

  it('stops infinite loops', () => {
    const r = runProgram('int main(void){ while (1) {} }', [], { maxInstructions: 200000 });
    expect(r.done?.reason).toBe('limit');
  });

  it('warns about uninitialized reads and leaks', () => {
    const r = run('#include <stdio.h>\n#include <stdlib.h>\nint main(void){ int x; int *p = malloc(8); printf("%d\\n", x + 1); p = 0; return 0; }');
    expect(r.console).toMatch(/uninitialized value of 'x'/);
    expect(r.console).toMatch(/LeakSanitizer: 8 bytes leaked in 1 allocation/);
    expect(r.done?.leaks).toHaveLength(1);
  });
});

describe('trace', () => {
  it('records steps with line numbers, frames and writes', () => {
    const r = run('int sq(int x) {\n  return x * x;\n}\nint main(void) {\n  int a = 3;\n  int b = sq(a);\n  return b;\n}');
    const lines = r.steps.filter((s) => s.k === StepKind.Stmt).map((s) => s.l);
    expect(lines).toEqual([5, 6, 2, 7]);
    const pushes = r.steps.flatMap((s) => s.ev ?? []).filter((e) => e.t === 'push').map((e) => (e as { fn: string }).fn);
    expect(pushes).toEqual(['main', 'sq']);
    expect(r.steps.some((s) => s.k === StepKind.Ret && s.v === 'sq returns 9')).toBe(true);
    expect(r.done?.exitCode).toBe(9);
  });

  it('records expression values', () => {
    const r = run('int main(void) {\n  int a[3] = {5, 3, 1};\n  if (a[0] > a[1]) a[2] = 7;\n  return 0;\n}');
    const exprs = r.steps.filter((s) => s.k === StepKind.Expr).map((s) => s.v);
    expect(exprs).toEqual(['5', '3', '1']);
  });
});
