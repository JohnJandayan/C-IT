// Detects data structures (arrays, strings, matrices, linked lists, trees,
// array-based stacks and queues) from real types and memory contents.

import type { TypeDef } from '@/engine/protocol';
import { findNode, hex, ownerOf, typeSize, ValueNode, VarView, ViewState } from './view';

export interface Marker {
  name: string;
  index: number;
  kind: 'index' | 'pointer';
}

export interface ArrayShape {
  kind: 'array' | 'string' | 'matrix';
  key: string;
  name: string;
  node: ValueNode;
  markers: Marker[];
  where: 'stack' | 'global' | 'heap';
}

export interface LinkNode {
  addr: number;
  node: ValueNode | null;
  /** Data fields (everything but the link pointers). */
  data: { label: string; node: ValueNode }[];
  labels: string[];
  freed: boolean;
  changed: boolean;
}

export interface ListShape {
  kind: 'list';
  key: string;
  name: string;
  doubly: boolean;
  nodes: LinkNode[];
  /** Index the last node's next points back to (cycle), if any. */
  cycleTo: number | null;
  /** Last link points to freed/unknown memory. */
  dangling: string | null;
}

export interface TreeNodeShape extends LinkNode {
  left: TreeNodeShape | null;
  right: TreeNodeShape | null;
  leftDangling?: boolean;
  rightDangling?: boolean;
}

export interface TreeShape {
  kind: 'tree';
  key: string;
  name: string;
  root: TreeNodeShape;
  size: number;
}

export interface ContainerShape {
  kind: 'stack' | 'queue';
  key: string;
  name: string;
  cells: ValueNode[];
  /** Occupied index range (inclusive), or null when empty. */
  occupied: number[];
  top?: number;
  front?: number;
  rear?: number;
}

export type Shape = ArrayShape | ListShape | TreeShape | ContainerShape;

const INDEX_NAMES = new Set([
  'i', 'j', 'k', 'l', 'r', 'm', 'lo', 'hi', 'low', 'high', 'mid', 'left', 'right', 'start', 'end',
  'idx', 'index', 'pos', 'p', 'q', 'minidx', 'min_idx', 'minindex', 'maxidx', 'max_idx', 'jj', 'ii',
  'first', 'last', 'top', 'front', 'rear', 'head', 'tail', 'cur', 'curr', 'slow', 'fast', 'pivot_index', 'pi',
]);
const LINK_NAMES_TREE = ['left', 'right', 'lchild', 'rchild', 'l', 'r'];
const LINK_NAMES_PREV = ['prev', 'previous', 'back', 'pre'];
const MAX_LINK_NODES = 200;

type NodeFn = (addr: number, typeId: number) => ValueNode;

function selfLinks(types: TypeDef[], t: TypeDef): string[] {
  if (t.k !== 'struct' || !t.fields) return [];
  return t.fields
    .filter((f) => {
      const ft = types[f.type];
      return ft?.k === 'ptr' && types[ft.to]?.k === 'struct' && (types[ft.to] as { tag: string | null }).tag !== null &&
        (types[ft.to] as { tag: string | null }).tag === t.tag;
    })
    .map((f) => f.name);
}

function isScalarType(t: TypeDef | undefined): boolean {
  return !!t && (t.k === 'int' || t.k === 'float' || t.k === 'ptr');
}

function isCharArray(t: TypeDef | undefined, types: TypeDef[]): boolean {
  return !!t && t.k === 'array' && types[t.of]?.k === 'int' && !!(types[t.of] as { char?: boolean }).char;
}

export function detectShapes(view: ViewState, makeNode: NodeFn): Shape[] {
  const types = view.types;
  const shapes: Shape[] = [];
  const current = view.frames[view.frames.length - 1];
  const scopes: { vars: VarView[]; where: 'stack' | 'global' }[] = [];
  if (current) scopes.push({ vars: current.vars, where: 'stack' });
  scopes.push({ vars: view.globals, where: 'global' });
  const allVars: VarView[] = [...view.frames.flatMap((f) => f.vars), ...view.globals];
  const indexVars = (current?.vars ?? []).concat(view.globals).filter(
    (v) => v.node.kind === 'scalar' && v.node.type.k === 'int' && !v.node.uninit && !(v.node.type as { char?: boolean }).char && INDEX_NAMES.has(v.name.toLowerCase())
  );
  const pointerVars = allVars.filter((v) => v.node.kind === 'pointer' && v.node.target);
  const usedArrays = new Set<number>();

  // ---------------------------------------------------------------- stacks & queues
  const containerFrom = (name: string, key: string, arr: ValueNode, fields: Map<string, ValueNode>): ContainerShape | null => {
    const num = (n: string) => {
      const f = fields.get(n);
      return f && f.kind === 'scalar' && !f.uninit ? Number(f.text) : undefined;
    };
    const cells = (arr.children ?? []).map((c) => c.node);
    const cap = cells.length;
    const top = num('top') ?? num('tos') ?? num('sp');
    const count = num('count') ?? num('size') ?? num('len') ?? num('length') ?? num('n');
    const front = num('front') ?? num('head') ?? num('first');
    const rear = num('rear') ?? num('tail') ?? num('back') ?? num('last');
    if (front !== undefined && rear !== undefined) {
      const occ: number[] = [];
      if (count !== undefined) {
        for (let k = 0; k < Math.min(count, cap); k++) occ.push((((front + k) % cap) + cap) % cap);
      } else if (front >= 0 && rear >= front) {
        for (let k = front; k <= Math.min(rear, cap - 1); k++) occ.push(k);
      } else if (front >= 0 && rear >= 0 && rear < front) {
        for (let k = front; k < cap; k++) occ.push(k);
        for (let k = 0; k <= rear; k++) occ.push(k);
      }
      return { kind: 'queue', key, name, cells, occupied: occ, front, rear };
    }
    if (top !== undefined || count !== undefined) {
      const last = top !== undefined ? top : (count ?? 0) - 1;
      const occ: number[] = [];
      for (let k = 0; k <= Math.min(last, cap - 1); k++) occ.push(k);
      return { kind: 'stack', key, name, cells, occupied: occ, top: last };
    }
    return null;
  };

  for (const v of allVars) {
    const n = v.node;
    if (n.kind !== 'struct' || !n.children) continue;
    const arrField = n.children.find((c) => c.node.kind === 'array' && isScalarType(types[(c.node.type as { of: number }).of]));
    if (!arrField) continue;
    const fields = new Map(n.children.map((c) => [c.label.toLowerCase(), c.node]));
    const c = containerFrom(v.name, `c-${n.addr}`, arrField.node, fields);
    if (c) {
      shapes.push(c);
      usedArrays.add(arrField.node.addr);
    }
  }
  // Pointer-to-struct containers (e.g. `Stack *s = malloc(...)`).
  for (const p of pointerVars) {
    const owner = ownerOf(view, p.node.target!);
    const n = owner?.node;
    if (!n || n.kind !== 'struct' || !n.children || n.addr !== p.node.target) continue;
    const arrField = n.children.find((c) => c.node.kind === 'array');
    if (!arrField || usedArrays.has(arrField.node.addr)) continue;
    const fields = new Map(n.children.map((c) => [c.label.toLowerCase(), c.node]));
    const c = containerFrom(`*${p.name}`, `c-${n.addr}`, arrField.node, fields);
    if (c) {
      shapes.push(c);
      usedArrays.add(arrField.node.addr);
    }
  }
  // Global/local arrays named like stacks/queues with companion variables.
  for (const scope of scopes) {
    const byName = new Map(scope.vars.map((v) => [v.name.toLowerCase(), v.node]));
    for (const v of scope.vars) {
      if (v.node.kind !== 'array' || usedArrays.has(v.node.addr)) continue;
      const nm = v.name.toLowerCase();
      if (!/stack|stk|queue|que|^q$|^s$/.test(nm)) continue;
      const fields = new Map<string, ValueNode>();
      for (const k of ['top', 'front', 'rear', 'head', 'tail', 'count', 'size', 'sp']) {
        const f = byName.get(k) ?? byName.get(`${k}_${nm}`) ?? byName.get(`${nm}_${k}`);
        if (f) fields.set(k, f);
      }
      const c = containerFrom(v.name, `c-${v.node.addr}`, v.node, fields);
      if (c && (c.kind === 'queue' ? /queue|que|^q$/.test(nm) : /stack|stk|^s$/.test(nm))) {
        shapes.push(c);
        usedArrays.add(v.node.addr);
      }
    }
  }

  // ---------------------------------------------------------------- arrays, strings, matrices
  const markersFor = (arr: ValueNode): Marker[] => {
    const len = arr.children?.length ?? 0;
    const out: Marker[] = [];
    for (const iv of indexVars) {
      const val = Number(iv.node.text);
      if (Number.isInteger(val) && val >= 0 && val <= len && len > 1) out.push({ name: iv.name, index: val, kind: 'index' });
    }
    const esz = len ? arr.children![0].node.size || 1 : 1;
    for (const p of pointerVars) {
      const t = p.node.target!;
      if (t >= arr.addr && t <= arr.addr + arr.size && (t - arr.addr) % esz === 0) {
        out.push({ name: p.name, index: (t - arr.addr) / esz, kind: 'pointer' });
      }
    }
    return out;
  };
  const addArray = (name: string, node: ValueNode, where: ArrayShape['where']) => {
    if (usedArrays.has(node.addr) || !node.children || node.children.length === 0) return;
    const et = types[(node.type as { of: number }).of];
    usedArrays.add(node.addr);
    if (isCharArray(node.type, types)) {
      shapes.push({ kind: 'string', key: `s-${node.addr}`, name, node, markers: markersFor(node), where });
    } else if (et?.k === 'array' && isScalarType(types[(et as { of: number }).of])) {
      shapes.push({ kind: 'matrix', key: `m-${node.addr}`, name, node, markers: [], where });
    } else if (isScalarType(et) || et?.k === 'struct') {
      shapes.push({ kind: 'array', key: `a-${node.addr}`, name, node, markers: markersFor(node), where });
    }
  };
  for (const scope of scopes) for (const v of scope.vars) if (v.node.kind === 'array') addArray(v.name, v.node, scope.where);
  // Heap arrays reached through pointers.
  for (const p of pointerVars) {
    const h = view.heap.find((b) => b.addr === p.node.target && !b.freed);
    if (h?.node && h.node.kind === 'array' && h.count > 1) addArray(`${p.name} → heap#${h.id}`, h.node, 'heap');
    else if (h?.node && h.node.kind === 'array' && h.typeLabel === 'bytes') continue;
  }

  // ---------------------------------------------------------------- linked structures
  const structAt = (addr: number, typeId: number): { node: ValueNode | null; freed: boolean; ok: boolean } => {
    const heap = view.heap.find((b) => addr >= b.addr && addr < b.addr + Math.max(b.size, 1));
    if (heap?.freed) return { node: null, freed: true, ok: false };
    const owner = ownerOf(view, addr);
    if (!owner) return { node: null, freed: false, ok: false };
    if (owner.node && owner.node.addr === addr && owner.node.type.id === typeId) return { node: owner.node, freed: false, ok: true };
    // Untyped heap block or a different view of the bytes: build it directly.
    return { node: makeNode(addr, typeId), freed: false, ok: true };
  };

  const linkRoots = new Map<number, { typeId: number; names: string[] }>();
  const noteRoot = (target: number, typeId: number, name: string) => {
    const r = linkRoots.get(target) ?? { typeId, names: [] };
    if (!r.names.includes(name)) r.names.push(name);
    linkRoots.set(target, r);
  };
  for (const v of allVars) {
    const n = v.node;
    if (n.kind === 'pointer' && n.target) {
      const to = types[(n.type as { to: number }).to];
      if (to?.k === 'struct' && selfLinks(types, to).length) noteRoot(n.target, to.id, v.name);
    }
    // Wrapper structs like `struct List { Node *head; }`.
    if (n.kind === 'struct' && n.children) {
      for (const c of n.children) {
        if (c.node.kind !== 'pointer' || !c.node.target) continue;
        const to = types[(c.node.type as { to: number }).to];
        if (to?.k === 'struct' && selfLinks(types, to).length && !selfLinks(types, n.type).includes(c.label)) {
          noteRoot(c.node.target, to.id, `${v.name}.${c.label}`);
        }
      }
    }
  }

  const seenNodes = new Set<number>();
  const byType = new Map<number, number[]>();
  for (const [addr, r] of linkRoots) byType.set(r.typeId, [...(byType.get(r.typeId) ?? []), addr]);

  for (const [typeId, roots] of byType) {
    const st = types[typeId];
    const links = selfLinks(types, st);
    const lower = links.map((l) => l.toLowerCase());
    const isTree = links.length >= 2 && (lower.some((l) => LINK_NAMES_TREE.includes(l)) || !lower.some((l) => LINK_NAMES_PREV.includes(l)));
    const nextName = links.find((l) => !LINK_NAMES_PREV.includes(l.toLowerCase())) ?? links[0];
    const labelsAt = (addr: number) => linkRoots.get(addr)?.names ?? [];
    const dataOf = (node: ValueNode | null) => (node?.children ?? []).filter((c) => !links.includes(c.label));
    const linkTarget = (node: ValueNode | null, field: string): number | undefined => {
      const c = node?.children?.find((x) => x.label === field);
      return c && c.node.kind === 'pointer' && !c.node.uninit ? c.node.target : undefined;
    };

    if (!isTree) {
      // Find chain heads: nodes reachable from roots that no other node points to via `next`.
      const reach = new Map<number, ValueNode | null>();
      const incoming = new Set<number>();
      const stack = [...roots];
      while (stack.length && reach.size < MAX_LINK_NODES) {
        const a = stack.pop()!;
        if (reach.has(a)) continue;
        const s = structAt(a, typeId);
        reach.set(a, s.node);
        if (!s.ok) continue;
        const nx = linkTarget(s.node, nextName);
        if (nx) {
          incoming.add(nx);
          stack.push(nx);
        }
      }
      const heads = [...reach.keys()].filter((a) => !incoming.has(a) && reach.get(a));
      if (heads.length === 0 && roots.length) heads.push(roots[0]);
      for (const head of heads) {
        if (seenNodes.has(head)) continue;
        const nodes: LinkNode[] = [];
        const index = new Map<number, number>();
        let cur: number | undefined = head;
        let cycleTo: number | null = null;
        let dangling: string | null = null;
        while (cur && nodes.length < MAX_LINK_NODES) {
          if (index.has(cur)) {
            cycleTo = index.get(cur)!;
            break;
          }
          const s = structAt(cur, typeId);
          if (!s.ok) {
            dangling = s.freed ? `freed memory (${hex(cur)})` : `invalid address ${hex(cur)}`;
            break;
          }
          index.set(cur, nodes.length);
          seenNodes.add(cur);
          nodes.push({ addr: cur, node: s.node, data: dataOf(s.node), labels: labelsAt(cur), freed: false, changed: !!s.node?.changed });
          cur = linkTarget(s.node, nextName);
        }
        if (nodes.length === 0) continue;
        const name = nodes[0].labels[0] ?? `list @${hex(head)}`;
        shapes.push({ kind: 'list', key: `l-${head}`, name, doubly: links.length >= 2, nodes, cycleTo, dangling });
      }
    } else {
      const [leftName, rightName] = [
        links.find((l) => ['left', 'lchild', 'l'].includes(l.toLowerCase())) ?? links[0],
        links.find((l) => ['right', 'rchild', 'r'].includes(l.toLowerCase())) ?? links[1],
      ];
      const childOf = new Set<number>();
      const visited = new Set<number>();
      const build = (addr: number, depth: number): TreeNodeShape | null => {
        if (visited.has(addr) || visited.size >= MAX_LINK_NODES || depth > 30) return null;
        const s = structAt(addr, typeId);
        if (!s.ok) return null;
        visited.add(addr);
        seenNodes.add(addr);
        const l = linkTarget(s.node, leftName);
        const r = linkTarget(s.node, rightName);
        if (l) childOf.add(l);
        if (r) childOf.add(r);
        const left = l ? build(l, depth + 1) : null;
        const right = r ? build(r, depth + 1) : null;
        return {
          addr, node: s.node, data: dataOf(s.node), labels: labelsAt(addr), freed: false, changed: !!s.node?.changed,
          left, right, leftDangling: !!l && !left, rightDangling: !!r && !right,
        };
      };
      const trees: TreeNodeShape[] = [];
      for (const rt of roots) {
        if (visited.has(rt)) continue;
        const t = build(rt, 0);
        if (t) trees.push(t);
      }
      for (const t of trees) {
        if (childOf.has(t.addr) && trees.length > 1) continue;
        const count = (n: TreeNodeShape | null): number => (n ? 1 + count(n.left) + count(n.right) : 0);
        shapes.push({ kind: 'tree', key: `t-${t.addr}`, name: t.labels[0] ?? 'tree', root: t, size: count(t) });
      }
    }
  }

  // Order: containers, arrays, lists, trees (stable by kind).
  const order: Record<Shape['kind'], number> = { array: 0, string: 1, matrix: 2, stack: 3, queue: 4, list: 5, tree: 6 };
  return shapes.sort((a, b) => order[a.kind] - order[b.kind]);
}

export function nodeValueText(n: ValueNode): string {
  if (n.kind === 'struct') return (n.children ?? []).map((c) => nodeValueText(c.node)).join(', ');
  return n.text;
}

export { findNode, typeSize };
