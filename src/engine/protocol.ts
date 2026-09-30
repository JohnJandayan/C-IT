// Messages and trace records exchanged between the engine worker and the UI.

import type { Diagnostic } from './diagnostics';

// ------------------------------------------------------------------ types

export type TypeDef =
  | { id: number; k: 'void'; str: string }
  | { id: number; k: 'int'; str: string; size: number; signed: boolean; bool?: boolean; char?: boolean }
  | { id: number; k: 'float'; str: string; size: number }
  | { id: number; k: 'ptr'; str: string; to: number }
  | { id: number; k: 'array'; str: string; of: number; len: number }
  | { id: number; k: 'struct'; str: string; tag: string | null; union: boolean; size: number; fields: { name: string; type: number; off: number }[] | null }
  | { id: number; k: 'func'; str: string };

export interface VarInfo {
  name: string;
  type: number;
  addr: number;
  size: number;
  /** Function name for static locals shown alongside globals. */
  staticIn?: string;
  isParam?: boolean;
}

export interface FuncInfo {
  name: string;
  addr: number;
  line: number;
  internal: boolean;
}

export interface ProgramInfo {
  types: TypeDef[];
  globals: VarInfo[];
  funcs: FuncInfo[];
  regions: {
    text: { base: number; size: number };
    rodata: { base: number; size: number };
    data: { base: number; size: number };
    stackTop: number;
    stackBase: number;
    heapBase: number;
  };
  /** Initial contents of rodata and data (both fully initialized at load). */
  image: { addr: number; bytes: Uint8Array }[];
}

// ------------------------------------------------------------------ trace

export const StepKind = {
  /** About to execute a statement (visible in line mode). */
  Stmt: 0,
  /** Sub-statement position such as a for-loop increment (expression mode only). */
  Sub: 1,
  /** A sub-expression was just evaluated (expression mode only). */
  Expr: 2,
  /** Entered a function. */
  Call: 3,
  /** About to return from a function. */
  Ret: 4,
  /** Program finished. */
  Exit: 5,
  /** Runtime error: execution stopped here. */
  Error: 6,
  /** Waiting for input at this position. */
  Input: 7,
} as const;
export type StepKind = (typeof StepKind)[keyof typeof StepKind];

export interface WriteRec {
  a: number;
  /** New bytes. */
  n: Uint8Array;
  /** Old bytes. */
  o: Uint8Array;
  /** Old init flags (null when every byte was already initialized). */
  oi: Uint8Array | null;
  /** When set, this record marks `u` bytes as uninitialized instead of writing (n/o are empty). */
  u?: number;
}

export type TraceEvent =
  | { t: 'push'; id: number; fn: string; fp: number; callLine: number; internal: boolean }
  | { t: 'pop'; id: number }
  | { t: 'decl'; vars: VarInfo[] }
  | { t: 'trim'; n: number }
  | { t: 'alloc'; id: number; a: number; size: number; line: number; fn: string }
  | { t: 'free'; a: number; line: number }
  | { t: 'htype'; a: number; type: number };

export type OutKind = 'out' | 'err' | 'in' | 'sys';

export interface OutSeg {
  k: OutKind;
  s: string;
}

export interface StepRec {
  k: StepKind;
  l: number;
  c: number;
  el: number;
  ec: number;
  /** Call depth (visible frames). */
  d: number;
  w?: WriteRec[];
  ev?: TraceEvent[];
  /** Reads since the previous step, flattened [addr, size, addr, size, ...]. */
  r?: number[];
  out?: OutSeg[];
  /** Expression value / return value / message text. */
  v?: string;
  warn?: string[];
}

export interface RuntimeErrorInfo {
  kind: string;
  message: string;
  line: number;
  col: number;
  addr?: number;
}

export interface LeakInfo {
  addr: number;
  size: number;
  line: number;
}

export interface DoneInfo {
  exitCode: number | null;
  reason: 'exit' | 'error' | 'limit' | 'stopped';
  error?: RuntimeErrorInfo;
  leaks: LeakInfo[];
  steps: number;
  instructions: number;
  truncated: boolean;
}

export interface RunLimits {
  maxSteps: number;
  maxInstructions: number;
  maxOutput: number;
}

export const DEFAULT_LIMITS: RunLimits = {
  maxSteps: 200_000,
  maxInstructions: 30_000_000,
  maxOutput: 64 * 1024,
};

// ------------------------------------------------------------------ messages

export type ToWorker =
  | { type: 'check'; id: number; code: string }
  | { type: 'run'; id: number; code: string; limits?: Partial<RunLimits> }
  | { type: 'input'; id: number; text: string | null }
  | { type: 'stop'; id: number };

export type FromWorker =
  | { type: 'diagnostics'; id: number; diagnostics: Diagnostic[] }
  | { type: 'program'; id: number; program: ProgramInfo }
  | { type: 'trace'; id: number; steps: StepRec[]; types: TypeDef[] }
  | { type: 'needInput'; id: number }
  | { type: 'done'; id: number; done: DoneInfo }
  | { type: 'heartbeat'; id: number }
  | { type: 'fatal'; id: number; message: string };
