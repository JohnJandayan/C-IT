// TCC Runner Utility for Browser-based C Code Execution
// Loads tcc.js and tcc.wasm, compiles and runs C code, and captures stdout
import { instrumentCCode } from './instrumentCCode';

declare global {
  interface Window {
    TCC: any;
  }
}

export async function runCCode(code: string, input: string, variables: string[] = []): Promise<{ output: string, steps: any[] }> {
  // Instrument code for tracing
  const instrumentedCode = instrumentCCode(code, variables);

  // Dynamically import tcc.js (assumes tcc.js and tcc.wasm are in /public)
  // @ts-ignore
  const tccModule = await import('/tcc.js');

  if (!window.TCC) {
    // @ts-ignore
    window.TCC = await tccModule.default();
  }
  const tcc = window.TCC;

  let output = '';
  tcc.setStdout((text: string) => {
    output += text;
  });
  tcc.setStderr((text: string) => {
    output += text;
  });
  tcc.setStdin(input);

  // Compile and run the instrumented code
  try {
    tcc.compile(instrumentedCode);
    tcc.run();
  } catch (err) {
    output += '\nError: ' + (err as Error).message;
  }

  // Parse trace output into steps
  const steps: any[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.startsWith('TRACE:')) {
      // Example: TRACE:7:a=1,b=2
      const [, lineNum, ...rest] = line.split(':');
      const vars = rest.join(':').split(',').map(s => s.trim());
      const state: Record<string, any> = { line: Number(lineNum) };
      for (const v of vars) {
        const [k, val] = v.split('=');
        if (k && val !== undefined) state[k] = Number(val);
      }
      steps.push(state);
    }
  }

  return { output, steps };
} 