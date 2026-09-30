import { describe, expect, it } from 'vitest';
import { codeExamples } from '@/data/examples';
import { compileSource, createVM, runProgram } from '@/engine/engine';
import { Timeline } from '@/viewmodel/timeline';
import { buildView } from '@/viewmodel/view';

describe('performance', () => {
  it('compiles and reaches the first step quickly for every example', () => {
    // Warm up the library prototype cache (done once per worker in the app).
    compileSource(codeExamples[0].code);
    let worst = 0;
    for (const ex of codeExamples) {
      const t0 = performance.now();
      const { prog } = compileSource(ex.code);
      const vm = createVM(prog!);
      while (vm.steps.length === 0 && vm.status === 'running') vm.run(1000);
      worst = Math.max(worst, performance.now() - t0);
    }
    console.info(`worst run-to-first-step: ${worst.toFixed(1)} ms`);
    expect(worst).toBeLessThan(50);
  });

  it('runs a hot loop at millions of instructions per second', () => {
    const code = 'int main(void) { long s = 0; for (int i = 0; i < 300000; i++) s += i % 7; return s > 0; }';
    const t0 = performance.now();
    const r = runProgram(code, [], { maxSteps: 1000 });
    const ms = performance.now() - t0;
    const mips = r.done!.instructions / ms / 1000;
    console.info(`${r.done!.instructions} instructions in ${ms.toFixed(0)} ms (${mips.toFixed(1)} M/s)`);
    expect(r.done?.reason).toBe('exit');
    expect(mips).toBeGreaterThan(2);
  });

  it('builds a view for a step in well under a frame', () => {
    const ex = codeExamples.find((e) => e.id === 'bst')!;
    const r = runProgram(ex.code);
    const tl = new Timeline();
    tl.setProgram({ ...r.vm!.programInfo(), types: r.vm!.typeDefs });
    tl.addSteps(r.steps);
    let worst = 0;
    for (let i = 0; i < tl.steps.length; i += 3) {
      const t0 = performance.now();
      tl.seek(i);
      buildView(tl, true);
      worst = Math.max(worst, performance.now() - t0);
    }
    console.info(`worst seek+view: ${worst.toFixed(2)} ms`);
    expect(worst).toBeLessThan(16);
  });
});
