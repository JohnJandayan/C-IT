// Engine worker: compiles and runs C in a sandbox (no DOM, no network), in
// small time slices so it stays responsive to input and stop requests.

import { compileSource, createVM } from './engine';
import type { FromWorker, ToWorker } from './protocol';
import type { VM } from './vm';

interface WorkerScope {
  postMessage(msg: unknown): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
}

const self = globalThis as unknown as WorkerScope;

const SLICE_INSTRUCTIONS = 150_000;
const FLUSH_MS = 16;
const HEARTBEAT_MS = 250;

let current: { id: number; vm: VM } | null = null;
let lastFlush = 0;
let lastBeat = 0;
const channel = new MessageChannel();
let scheduled = false;

function post(msg: FromWorker): void {
  self.postMessage(msg);
}

function flush(): void {
  if (!current) return;
  const { vm, id } = current;
  if (vm.steps.length === 0 && vm.newTypes.length === 0) return;
  const steps = vm.steps.splice(0, vm.steps.length);
  post({ type: 'trace', id, steps, types: vm.takeNewTypes() });
  lastFlush = performance.now();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  channel.port2.postMessage(0);
}

channel.port1.onmessage = () => {
  scheduled = false;
  slice();
};

function slice(): void {
  if (!current) return;
  const { vm, id } = current;
  const started = performance.now();
  let status = vm.status;
  try {
    // Run several instruction batches per task, up to ~12ms of work.
    do {
      status = vm.run(SLICE_INSTRUCTIONS);
    } while (status === 'running' && performance.now() - started < 12);
  } catch (e) {
    post({ type: 'fatal', id, message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    current = null;
    return;
  }
  const now = performance.now();
  if (status !== 'running' || now - lastFlush >= FLUSH_MS) flush();
  if (status === 'running') {
    if (now - lastBeat >= HEARTBEAT_MS) {
      lastBeat = now;
      post({ type: 'heartbeat', id });
    }
    schedule();
  } else if (status === 'input') {
    post({ type: 'needInput', id });
  } else if (status === 'done') {
    post({ type: 'done', id, done: vm.done! });
    current = null;
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'check': {
        const { diagnostics } = compileSource(msg.code);
        post({ type: 'diagnostics', id: msg.id, diagnostics });
        break;
      }
      case 'run': {
        current = null;
        const { diagnostics, prog } = compileSource(msg.code);
        post({ type: 'diagnostics', id: msg.id, diagnostics });
        if (!prog) {
          post({
            type: 'done',
            id: msg.id,
            done: { exitCode: null, reason: 'error', leaks: [], steps: 0, instructions: 0, truncated: false,
              error: { kind: 'compile', message: 'Compilation failed', line: diagnostics.find((d) => d.severity === 'error')?.line ?? 1, col: 1 } },
          });
          break;
        }
        const vm = createVM(prog, msg.limits);
        current = { id: msg.id, vm };
        post({ type: 'program', id: msg.id, program: vm.programInfo() });
        lastFlush = performance.now();
        schedule();
        break;
      }
      case 'input':
        if (current && current.id === msg.id && current.vm.status === 'input') {
          current.vm.provideInput(msg.text);
          schedule();
        }
        break;
      case 'stop':
        if (current && current.id === msg.id) {
          current.vm.stop();
          flush();
          post({ type: 'done', id: msg.id, done: current.vm.done! });
          current = null;
        }
        break;
    }
  } catch (e) {
    post({ type: 'fatal', id: msg.id, message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    current = null;
  }
};
