// TCC Runner Utility for Browser-based C Code Execution
// Loads tcc.js and tcc.wasm, compiles and runs C code, and captures stdout
import { instrumentCCode } from './instrumentCCode';

declare global {
  interface Window {
    TCC: any;
  }
}

function loadTCCScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('TCC.js can only run in the browser'));
    if (window.TCC) return resolve();
    // Check if script is already loading
    if (document.getElementById('tcc-js-script')) {
      (document.getElementById('tcc-js-script') as HTMLScriptElement).onload = () => resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'tcc-js-script';
    script.src = '/tcc.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function runCCode(code: string, input: string, variables: string[] = []): Promise<{ output: string, steps: any[] }> {
  if (typeof window === 'undefined') {
    throw new Error('TCC.js can only run in the browser');
  }
  await loadTCCScript();
  const instrumentedCode = instrumentCCode(code, variables);

  const tcc = window.TCC;

  let output = '';
  tcc.setStdout((text: string) => {
    output += text;
  });
  tcc.setStderr((text: string) => {
    output += text;
  });
  tcc.setStdin(input);

  try {
    tcc.compile(instrumentedCode);
    tcc.run();
  } catch (err) {
    output += '\nError: ' + (err as Error).message;
  }

  const steps: any[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.startsWith('TRACE:')) {
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