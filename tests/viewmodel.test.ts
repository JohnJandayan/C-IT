import { describe, expect, it } from 'vitest';
import { runProgram } from '@/engine/engine';
import { Timeline } from '@/viewmodel/timeline';
import { buildView } from '@/viewmodel/view';
import type { Shape } from '@/viewmodel/shapes';
import { decodeShare, encodeShare } from '@/lib/share';
import { isTypingTarget } from '@/hooks/useKeyboardShortcuts';

function timelineFor(code: string, inputs: string[] = []): Timeline {
  const r = runProgram(code, inputs);
  if (!r.vm) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
  const tl = new Timeline();
  const info = r.vm.programInfo();
  tl.setProgram({ ...info, types: r.vm.typeDefs });
  tl.addSteps(r.steps);
  return tl;
}

function snapshot(tl: Timeline, lineMode = true) {
  const v = buildView(tl, lineMode);
  return JSON.stringify({
    frames: v.frames.map((f) => ({ fn: f.fn, vars: f.vars.map((x) => [x.name, x.node.text, x.node.children?.map((c) => c.node.text)]) })),
    heap: v.heap.map((h) => [h.addr, h.freed, h.node?.children?.map((c) => c.node.text) ?? h.node?.text]),
    out: v.output.map((o) => o.s).join(''),
  });
}

const LIST = `#include <stdio.h>
#include <stdlib.h>
typedef struct Node { int data; struct Node *next; } Node;
int main(void) {
  Node *head = NULL;
  for (int i = 1; i <= 3; i++) { Node *n = malloc(sizeof *n); n->data = i; n->next = head; head = n; }
  Node *tmp = head->next;
  free(head);
  head = tmp;
  printf("%d\\n", head->data);
  return 0;
}`;

describe('timeline', () => {
  it('reaches identical states stepping forward, backward and seeking', () => {
    const tl = timelineFor(LIST);
    const n = tl.steps.length;
    const forward: string[] = [];
    for (let i = 0; i < n; i++) {
      tl.seek(i);
      forward.push(snapshot(tl));
    }
    for (let i = n - 1; i >= 0; i--) {
      tl.seek(i);
      expect(snapshot(tl)).toBe(forward[i]);
    }
    tl.seek(n - 1);
    tl.seek(3);
    expect(snapshot(tl)).toBe(forward[3]);
  });

  it('shows initialized arrays after their declaration', () => {
    const tl = timelineFor('int main(void) {\n  int a[3] = {7, 8, 9};\n  int x = 1;\n  return a[0] + x;\n}');
    tl.seek(tl.lineSteps[2]);
    const v = buildView(tl, true);
    const a = v.frames[0].vars.find((x) => x.name === 'a')!;
    expect(a.node.children!.map((c) => c.node.text)).toEqual(['7', '8', '9']);
  });
});

describe('shape detection', () => {
  const shapesAtEnd = (code: string): Shape[] => {
    const tl = timelineFor(code);
    tl.seek(tl.steps.length - 1);
    return buildView(tl, true).shapes;
  };

  it('detects a singly linked list and freed nodes are excluded', () => {
    const shapes = shapesAtEnd(LIST);
    const list = shapes.find((s) => s.kind === 'list');
    expect(list && list.kind === 'list' && list.nodes.map((nd) => nd.data[0].node.text)).toEqual(['2', '1']);
  });

  it('detects binary trees', () => {
    const shapes = shapesAtEnd(`#include <stdlib.h>
struct T { int k; struct T *left, *right; };
struct T *ins(struct T *r, int k) { if (!r) { r = calloc(1, sizeof *r); r->k = k; return r; } if (k < r->k) r->left = ins(r->left, k); else r->right = ins(r->right, k); return r; }
int main(void) { struct T *root = 0; int ks[] = {5, 3, 8, 1}; for (int i = 0; i < 4; i++) root = ins(root, ks[i]); return 0; }`);
    const tree = shapes.find((s) => s.kind === 'tree');
    expect(tree && tree.kind === 'tree' && tree.size).toBe(4);
    expect(tree && tree.kind === 'tree' && tree.root.data[0].node.text).toBe('5');
  });

  it('detects array stacks, queues, matrices and strings', () => {
    const shapes = shapesAtEnd(`#include <string.h>
typedef struct { int items[4]; int top; } Stack;
int queue[5]; int front = 0, rear = -1;
int main(void) {
  Stack s = { .top = -1 }; s.items[++s.top] = 1; s.items[++s.top] = 2;
  queue[++rear] = 9; queue[++rear] = 8;
  int m[2][2] = {{1, 2}, {3, 4}};
  char name[8]; strcpy(name, "hi");
  return m[0][0] + name[0];
}`);
    const kinds = shapes.map((s) => s.kind).sort();
    expect(kinds).toEqual(['matrix', 'queue', 'stack', 'string']);
    const st = shapes.find((s) => s.kind === 'stack');
    expect(st && st.kind === 'stack' && st.occupied).toEqual([0, 1]);
    const q = shapes.find((s) => s.kind === 'queue');
    expect(q && q.kind === 'queue' && q.occupied).toEqual([0, 1]);
  });

  it('adds index markers from loop variables', () => {
    const tl = timelineFor('int main(void) {\n  int a[4] = {1, 2, 3, 4};\n  int s = 0;\n  for (int i = 0; i < 4; i++)\n    s += a[i];\n  return s;\n}');
    // Stop inside the loop body on the third iteration.
    const idx = tl.lineSteps.filter((i) => tl.steps[i].l === 5)[2];
    tl.seek(idx);
    const arr = buildView(tl, true).shapes.find((s) => s.kind === 'array');
    expect(arr && arr.kind === 'array' && arr.markers).toContainEqual({ name: 'i', index: 2, kind: 'index' });
  });
});

describe('share links', () => {
  it('round-trips code through the URL fragment', async () => {
    const code = '#include <stdio.h>\nint main(void) { printf("héllo ✓\\n"); return 0; }\n';
    const frag = await encodeShare(code);
    expect(frag.startsWith('code=')).toBe(true);
    expect(await decodeShare('#' + frag)).toBe(code);
  });

  it('rejects corrupt links', async () => {
    await expect(decodeShare('#code=***')).rejects.toThrow();
    await expect(decodeShare('#code=AAAA')).rejects.toThrow();
    expect(await decodeShare('#other')).toBeNull();
  });
});

describe('keyboard shortcuts', () => {
  it('ignores keys typed into fields and the editor', () => {
    const input = document.createElement('input');
    const range = document.createElement('input');
    range.type = 'range';
    const ed = document.createElement('div');
    ed.className = 'monaco-editor';
    const inner = document.createElement('span');
    ed.appendChild(inner);
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(range)).toBe(false);
    expect(isTypingTarget(inner)).toBe(true);
    expect(isTypingTarget(document.body)).toBe(false);
  });
});
