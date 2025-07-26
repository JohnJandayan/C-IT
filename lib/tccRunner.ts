// TCC Runner Utility for Browser-based C Code Execution
// Uses lupyuen/tcc-riscv32-wasm which compiles C to ELF binary
// https://github.com/lupyuen/tcc-riscv32-wasm

declare global {
  interface Window {
    TCC: any;
    wasm: any;
    term: any;
    bootstrap?: () => Promise<void>;
    main?: () => void;
  }
}

interface TCCResult {
  output: string;
  steps: any[];
  compiled: boolean;
  elfData?: string;
}

// Terminal output capture
let capturedOutput = '';
let capturedSteps: any[] = [];

function resetCapture() {
  capturedOutput = '';
  capturedSteps = [];
}

function captureOutput(text: string) {
  capturedOutput += text;
  console.log('TCC Output:', text);
}

function captureStep(line: number, variables: Record<string, any>) {
  capturedSteps.push({ line, ...variables });
}

function loadTCCScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('TCC.js can only run in the browser'));
    }
    
    // Check if already loaded
    if (window.wasm && window.wasm.instance) {
      return resolve();
    }
    
    // Check if script is already loading
    if (document.getElementById('tcc-js-script')) {
      (document.getElementById('tcc-js-script') as HTMLScriptElement).onload = () => resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'tcc-js-script';
    script.src = '/tcc.js';
    script.onload = () => {
      // Wait for WASM to be ready
      const checkWasm = () => {
        if (window.wasm && window.wasm.instance) {
          resolve();
        } else {
          setTimeout(checkWasm, 100);
        }
      };
      checkWasm();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Terminal for capturing output
function setupTerminal() {
  if (!window.term) {
    window.term = {
      write: (text: string) => {
        captureOutput(text);
      },
      onData: (callback: (data: string) => void) => {
        // Store callback for input
        window.term.inputCallback = callback;
      }
    };
  }
}

// Inject printf statements for step-by-step visualization
function instrumentCCode(code: string, variables: string[] = []): string {
  const lines = code.split('\n');
  const instrumented: string[] = [];
  let insideMain = false;
  let indent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('int main')) {
      insideMain = true;
    }
    if (insideMain && trimmed === '}') {
      insideMain = false;
    }
    
    instrumented.push(line);
    
    // Add tracing after variable assignments and function calls
    if (insideMain && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('return')) {
      indent = line.match(/^\s*/)?.[0] || '';
      
      if (variables.length > 0) {
        const trace = `${indent}printf("TRACE:%d:${variables.map(v => v + '=%d').join(',')}\\n", __LINE__, ${variables.join(',')});`;
        instrumented.push(trace);
      }
    }
  }
  
  return instrumented.join('\n');
}

// Extract variables from C code for instrumentation
function extractVariables(code: string): string[] {
  const variables: string[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match variable declarations
    const varMatch = trimmed.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=;]/);
    if (varMatch) {
      variables.push(varMatch[1]);
    }
    
    // Match array declarations
    const arrayMatch = trimmed.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[/);
    if (arrayMatch) {
      variables.push(arrayMatch[1]);
    }
  }
  
  return variables;
}

export async function runCCode(code: string, input: string = ''): Promise<TCCResult> {
  if (typeof window === 'undefined') {
    throw new Error('TCC.js can only run in the browser');
  }
  
  try {
    await loadTCCScript();
    setupTerminal();
    resetCapture();
    
    // Extract variables for instrumentation
    const variables = extractVariables(code);
    const instrumentedCode = instrumentCCode(code, variables);
    
    console.log('Compiling C code with TCC...');
    console.log('Instrumented code:', instrumentedCode);
    
    // Set up the code input for TCC
    const codeElement = document.createElement('textarea');
    codeElement.id = 'code';
    codeElement.value = instrumentedCode;
    codeElement.style.display = 'none';
    document.body.appendChild(codeElement);
    
    // Call TCC's bootstrap function
    if (typeof window.bootstrap === 'function') {
      await window.bootstrap();
    } else {
      // Fallback: try to call the main function directly
      if (typeof window.main === 'function') {
        window.main();
      } else {
        throw new Error('TCC bootstrap function not found');
      }
    }
    
    // Wait a bit for compilation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Parse output for steps
    const steps: any[] = [];
    const lines = capturedOutput.split('\n');
    
    for (const line of lines) {
      if (line.includes('TRACE:')) {
        const traceMatch = line.match(/TRACE:(\d+):(.+)/);
        if (traceMatch) {
          const lineNum = parseInt(traceMatch[1]);
          const varsStr = traceMatch[2];
          const state: Record<string, any> = { line: lineNum };
          
          // Parse variable assignments
          const varPairs = varsStr.split(',');
          for (const pair of varPairs) {
            const [name, value] = pair.split('=');
            if (name && value !== undefined) {
              state[name.trim()] = parseInt(value.trim()) || 0;
            }
          }
          
          steps.push(state);
        }
      }
    }
    
    // Get ELF data from localStorage if available
    const elfData = localStorage.getItem('elf_data') || undefined;
    
    // Clean up
    document.body.removeChild(codeElement);
    
    return {
      output: capturedOutput,
      steps,
      compiled: true,
      elfData
    };
    
  } catch (error) {
    console.error('Error running C code:', error);
    return {
      output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      steps: [],
      compiled: false
    };
  }
}

 