import { create } from 'zustand';
import { engine } from '@/engine/client';
import type { Diagnostic } from '@/engine/diagnostics';
import { formatDiagnostic } from '@/engine/diagnostics';
import { DoneInfo, StepKind } from '@/engine/protocol';
import type { Granularity, RunStatus, VizTab } from '@/types';
import { isLineStep, Timeline } from '@/viewmodel/timeline';
import { buildView, ViewState } from '@/viewmodel/view';

/** The timeline is mutable and lives outside React state; the store holds a version counter. */
export const timeline = new Timeline();

export const DEFAULT_CODE = `#include <stdio.h>

int main(void) {
    int numbers[] = {5, 10, 15, 20, 25};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += numbers[i];
        printf("numbers[%d] = %d, sum = %d\\n", i, numbers[i], sum);
    }

    printf("Total: %d\\n", sum);
    return 0;
}
`;

export interface Selection {
  addr: number;
  size: number;
  label?: string;
}

interface Store {
  code: string;
  diagnostics: Diagnostic[];
  status: RunStatus;
  done: DoneInfo | null;
  /** Current step index into timeline.steps (-1 = nothing yet). */
  cursor: number;
  stepCount: number;
  view: ViewState | null;
  isPlaying: boolean;
  animationSpeed: number;
  granularity: Granularity;
  reduceMotion: boolean;
  breakpoints: number[];
  error: string | null;
  awaitingInput: boolean;
  /** Suggested input for the loaded example (shown as a placeholder). */
  inputHint: string | null;
  selection: Selection | null;
  vizTab: VizTab;
  /** Pending continue/run-to-line target while the trace is still streaming. */
  pendingTarget: { kind: 'breakpoint' } | { kind: 'line'; line: number } | null;

  setCode(code: string): void;
  setDiagnostics(d: Diagnostic[]): void;
  executeCode(): void;
  stopExecution(): void;
  submitInput(text: string | null): void;
  seek(index: number): void;
  nextStep(): void;
  previousStep(): void;
  /** Step to the adjacent trace step regardless of granularity (expression stepping). */
  stepAny(dir: 1 | -1): void;
  first(): void;
  last(): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  reset(): void;
  setAnimationSpeed(ms: number): void;
  setGranularity(g: Granularity): void;
  setReduceMotion(v: boolean): void;
  toggleBreakpoint(line: number): void;
  setBreakpoints(lines: number[]): void;
  continueToBreakpoint(): void;
  runToLine(line: number): void;
  setError(error: string | null): void;
  select(s: Selection | null): void;
  setVizTab(t: VizTab): void;
}

export function isVisible(k: number, g: Granularity): boolean {
  return g === 'expr' || isLineStep(k);
}

/** Visible step positions for the current granularity. */
export function visibleSteps(g: Granularity): number[] {
  if (g === 'line') return timeline.lineSteps;
  return Array.from({ length: timeline.steps.length }, (_, i) => i);
}

function findVisible(from: number, dir: 1 | -1, g: Granularity, pred?: (i: number) => boolean): number {
  const steps = timeline.steps;
  for (let i = from; i >= 0 && i < steps.length; i += dir) {
    if (isVisible(steps[i].k, g) && (!pred || pred(i))) return i;
  }
  return -1;
}

export const useVisualizationStore = create<Store>((set, get) => {
  const refresh = (cursor: number) => {
    timeline.seek(cursor);
    set({ cursor: timeline.cursor, view: buildView(timeline, get().granularity === 'line') });
  };

  const hitTarget = (from: number): number => {
    const { pendingTarget, breakpoints, granularity } = get();
    if (!pendingTarget) return -1;
    return findVisible(from, 1, granularity, (i) => {
      const s = timeline.steps[i];
      if (s.k === StepKind.Error || s.k === StepKind.Input) return true;
      if (pendingTarget.kind === 'line') return s.l === pendingTarget.line && s.k !== StepKind.Ret;
      return breakpoints.includes(s.l) && s.k !== StepKind.Ret;
    });
  };

  return {
    code: DEFAULT_CODE,
    diagnostics: [],
    status: 'idle',
    done: null,
    cursor: -1,
    stepCount: 0,
    view: null,
    isPlaying: false,
    animationSpeed: 800,
    granularity: 'line',
    reduceMotion: typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    breakpoints: [],
    error: null,
    awaitingInput: false,
    inputHint: null,
    selection: null,
    vizTab: 'structures',
    pendingTarget: null,

    setCode: (code) => {
      if (code === get().code) return;
      const { status } = get();
      if (status === 'running' || status === 'input') engine().stop();
      timeline.reset();
      set({
        code, cursor: -1, stepCount: 0, view: null, status: 'idle', done: null, isPlaying: false,
        awaitingInput: false, error: null, selection: null, pendingTarget: null, inputHint: null,
      });
    },

    setDiagnostics: (diagnostics) => set({ diagnostics }),

    executeCode: () => {
      const { code } = get();
      timeline.reset();
      set({
        status: 'compiling', cursor: -1, stepCount: 0, view: null, done: null, error: null,
        awaitingInput: false, isPlaying: false, selection: null, pendingTarget: null,
      });
      engine().start(code, {
        onDiagnostics: (diagnostics) => {
          set({ diagnostics });
          const errors = diagnostics.filter((d) => d.severity === 'error');
          if (errors.length) {
            set({
              status: 'error',
              error: `Compilation failed:\n${errors.slice(0, 6).map(formatDiagnostic).join('\n')}${errors.length > 6 ? `\n… and ${errors.length - 6} more` : ''}`,
            });
          }
        },
        onProgram: (p) => {
          timeline.setProgram(p);
          set({ status: 'running' });
        },
        onTrace: (steps, types) => {
          timeline.addTypes(types);
          const before = timeline.steps.length;
          timeline.addSteps(steps);
          const first = get().cursor < 0;
          set({ stepCount: timeline.steps.length });
          if (first) {
            const start = findVisible(0, 1, get().granularity);
            if (start >= 0) refresh(start);
          }
          const target = hitTarget(Math.max(before, get().cursor + 1));
          if (target >= 0) {
            set({ pendingTarget: null, isPlaying: false });
            refresh(target);
          }
        },
        onNeedInput: () => {
          set({ status: 'input', awaitingInput: true, isPlaying: false, pendingTarget: null });
          refresh(timeline.steps.length - 1);
        },
        onDone: (done) => {
          const err = done.error && done.reason !== 'stopped'
            ? done.error.kind === 'compile'
              ? get().error
              : `${done.reason === 'limit' ? 'Stopped' : 'Runtime error'} at line ${done.error.line}:\n${done.error.message}`
            : null;
          set({ status: done.error?.kind === 'compile' ? 'error' : 'done', done, awaitingInput: false, stepCount: timeline.steps.length, error: err });
          if (get().pendingTarget) {
            set({ pendingTarget: null, isPlaying: false });
            refresh(timeline.steps.length - 1);
          } else if (get().cursor < 0 && timeline.steps.length) {
            refresh(0);
          } else if (get().view) {
            // Rebuild so the final step's derived data is current.
            set({ view: buildView(timeline, get().granularity === 'line') });
          }
        },
        onFatal: (message) => {
          set({ status: 'error', error: message, awaitingInput: false, isPlaying: false });
        },
      });
    },

    stopExecution: () => {
      engine().stop();
      set({ isPlaying: false, pendingTarget: null });
    },

    submitInput: (text) => {
      if (!get().awaitingInput) return;
      set({ awaitingInput: false, status: 'running' });
      engine().sendInput(text);
    },

    seek: (index) => {
      if (timeline.steps.length === 0) return;
      const i = Math.max(0, Math.min(index, timeline.steps.length - 1));
      const g = get().granularity;
      let target = findVisible(i, -1, g);
      if (target < 0) target = findVisible(i, 1, g);
      if (target >= 0) refresh(target);
    },

    nextStep: () => {
      const { cursor, granularity, status } = get();
      const next = findVisible(cursor + 1, 1, granularity);
      if (next >= 0) refresh(next);
      else if (status === 'done' || status === 'error' || status === 'input') set({ isPlaying: false });
    },

    previousStep: () => {
      const prev = findVisible(get().cursor - 1, -1, get().granularity);
      if (prev >= 0) refresh(prev);
    },

    stepAny: (dir) => {
      const t = get().cursor + dir;
      if (t >= 0 && t < timeline.steps.length) refresh(t);
    },

    first: () => {
      const f = findVisible(0, 1, get().granularity);
      if (f >= 0) refresh(f);
    },

    last: () => {
      const l = findVisible(timeline.steps.length - 1, -1, get().granularity);
      if (l >= 0) refresh(l);
    },

    play: () => {
      if (timeline.steps.length === 0) return;
      const { cursor, granularity } = get();
      if (findVisible(cursor + 1, 1, granularity) < 0 && get().status === 'done') {
        // Restart from the beginning when already at the end.
        const f = findVisible(0, 1, granularity);
        if (f >= 0) refresh(f);
      }
      set({ isPlaying: true });
    },

    pause: () => set({ isPlaying: false }),

    togglePlay: () => (get().isPlaying ? get().pause() : get().play()),

    reset: () => {
      set({ isPlaying: false });
      get().first();
    },

    setAnimationSpeed: (ms) => set({ animationSpeed: ms }),

    setGranularity: (g) => {
      set({ granularity: g });
      if (timeline.steps.length) {
        let t = findVisible(get().cursor, -1, g);
        if (t < 0) t = findVisible(get().cursor, 1, g);
        if (t >= 0) refresh(t);
      }
    },

    setReduceMotion: (v) => set({ reduceMotion: v }),

    toggleBreakpoint: (line) => {
      const bps = get().breakpoints;
      set({ breakpoints: bps.includes(line) ? bps.filter((l) => l !== line) : [...bps, line].sort((a, b) => a - b) });
    },

    setBreakpoints: (lines) => set({ breakpoints: lines }),

    continueToBreakpoint: () => {
      set({ pendingTarget: { kind: 'breakpoint' }, isPlaying: false });
      const t = hitTarget(get().cursor + 1);
      if (t >= 0) {
        set({ pendingTarget: null });
        refresh(t);
      } else if (get().status === 'done' || get().status === 'error') {
        set({ pendingTarget: null });
        get().last();
      }
    },

    runToLine: (line) => {
      set({ pendingTarget: { kind: 'line', line }, isPlaying: false });
      const t = hitTarget(get().cursor + 1);
      if (t >= 0) {
        set({ pendingTarget: null });
        refresh(t);
      } else if (get().status === 'done' || get().status === 'error') {
        set({ pendingTarget: null });
        get().last();
      }
    },

    setError: (error) => set({ error }),
    select: (selection) => set({ selection }),
    setVizTab: (vizTab) => set({ vizTab }),
  };
});
