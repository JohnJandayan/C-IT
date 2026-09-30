// High-level entry points shared by the worker and the tests.

import { compileProgram, CompiledProgram } from './compiler';
import type { Diagnostic } from './diagnostics';
import { frontend } from './frontend';
import { DEFAULT_LIMITS, DoneInfo, RunLimits, StepRec } from './protocol';
import { VM } from './vm';

export interface CompileResult {
  diagnostics: Diagnostic[];
  prog: CompiledProgram | null;
}

export function compileSource(code: string): CompileResult {
  const { unit, diags } = frontend(code);
  let prog: CompiledProgram | null = null;
  if (unit && !diags.hasErrors()) {
    prog = compileProgram(unit, diags);
  }
  return { diagnostics: diags.sorted(), prog };
}

export function createVM(prog: CompiledProgram, limits?: Partial<RunLimits>): VM {
  const vm = new VM(prog, { ...DEFAULT_LIMITS, ...limits });
  vm.start();
  return vm;
}

export interface RunResult {
  diagnostics: Diagnostic[];
  stdout: string;
  stderr: string;
  /** Everything shown in the console, including sanitizer/system messages. */
  console: string;
  steps: StepRec[];
  done: DoneInfo | null;
  vm: VM | null;
}

/** Run a program to completion synchronously (tests / tooling). */
export function runProgram(code: string, inputs: (string | null)[] = [], limits?: Partial<RunLimits>): RunResult {
  const { diagnostics, prog } = compileSource(code);
  const result: RunResult = { diagnostics, stdout: '', stderr: '', console: '', steps: [], done: null, vm: null };
  if (!prog) return result;
  const vm = createVM(prog, limits);
  result.vm = vm;
  const queue = [...inputs];
  for (let guard = 0; guard < 100000; guard++) {
    const status = vm.run(1_000_000);
    if (status === 'done') break;
    if (status === 'input') vm.provideInput(queue.length ? queue.shift()! : null);
  }
  result.steps = vm.steps;
  result.done = vm.done;
  for (const s of vm.steps) {
    for (const seg of s.out ?? []) {
      if (seg.k === 'out') result.stdout += seg.s;
      if (seg.k === 'err') result.stderr += seg.s;
      result.console += seg.s;
    }
  }
  return result;
}
