// Main-thread client for the engine worker, with a watchdog that restarts the
// worker if it ever stops responding.

import type { Diagnostic } from './diagnostics';
import type { DoneInfo, FromWorker, ProgramInfo, RunLimits, StepRec, ToWorker, TypeDef } from './protocol';

export interface RunCallbacks {
  onDiagnostics(d: Diagnostic[]): void;
  onProgram(p: ProgramInfo): void;
  onTrace(steps: StepRec[], types: TypeDef[]): void;
  onNeedInput(): void;
  onDone(done: DoneInfo): void;
  onFatal(message: string): void;
}

const WATCHDOG_MS = 5000;

export class EngineClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private runId = 0;
  private run: RunCallbacks | null = null;
  private checks = new Map<number, (d: Diagnostic[]) => void>();
  private lastMessage = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private waitingForInput = false;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'c-it-engine' });
    w.onmessage = (e: MessageEvent<FromWorker>) => this.handle(e.data);
    w.onerror = (e) => {
      e.preventDefault();
      this.crash(`The C engine crashed: ${e.message || 'unknown error'}`);
    };
    this.worker = w;
    return w;
  }

  private send(msg: ToWorker): void {
    this.ensureWorker().postMessage(msg);
  }

  private handle(msg: FromWorker): void {
    this.lastMessage = Date.now();
    if (msg.type === 'diagnostics' && this.checks.has(msg.id)) {
      this.checks.get(msg.id)!(msg.diagnostics);
      this.checks.delete(msg.id);
      return;
    }
    if (msg.id !== this.runId || !this.run) return;
    const cb = this.run;
    switch (msg.type) {
      case 'diagnostics':
        cb.onDiagnostics(msg.diagnostics);
        break;
      case 'program':
        cb.onProgram(msg.program);
        break;
      case 'trace':
        cb.onTrace(msg.steps, msg.types);
        break;
      case 'needInput':
        this.waitingForInput = true;
        cb.onNeedInput();
        break;
      case 'done':
        this.stopWatchdog();
        this.run = null;
        cb.onDone(msg.done);
        break;
      case 'fatal':
        this.stopWatchdog();
        this.run = null;
        cb.onFatal(msg.message);
        break;
      case 'heartbeat':
        break;
    }
  }

  /** Compile only; resolves with diagnostics (older pending checks are dropped). */
  check(code: string): Promise<Diagnostic[]> {
    const id = this.nextId++;
    for (const [oldId, resolve] of this.checks) {
      resolve([]);
      this.checks.delete(oldId);
    }
    return new Promise((resolve) => {
      this.checks.set(id, resolve);
      this.send({ type: 'check', id, code });
    });
  }

  start(code: string, callbacks: RunCallbacks, limits?: Partial<RunLimits>): void {
    if (this.run) this.stop();
    const id = this.nextId++;
    this.runId = id;
    this.run = callbacks;
    this.waitingForInput = false;
    this.send({ type: 'run', id, code, limits });
    this.startWatchdog();
  }

  sendInput(text: string | null): void {
    if (!this.run) return;
    this.waitingForInput = false;
    this.lastMessage = Date.now();
    this.send({ type: 'input', id: this.runId, text });
  }

  stop(): void {
    if (!this.run) return;
    this.send({ type: 'stop', id: this.runId });
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.lastMessage = Date.now();
    this.watchdog = setInterval(() => {
      if (!this.run || this.waitingForInput) return;
      if (Date.now() - this.lastMessage > WATCHDOG_MS) {
        this.crash('The program stopped responding and was terminated.');
      }
    }, 1000);
  }

  private stopWatchdog(): void {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
  }

  private crash(message: string): void {
    this.stopWatchdog();
    this.worker?.terminate();
    this.worker = null;
    const cb = this.run;
    this.run = null;
    for (const resolve of this.checks.values()) resolve([]);
    this.checks.clear();
    cb?.onFatal(message);
  }

  dispose(): void {
    this.stopWatchdog();
    this.worker?.terminate();
    this.worker = null;
  }
}

let shared: EngineClient | null = null;
export function engine(): EngineClient {
  return (shared ??= new EngineClient());
}
