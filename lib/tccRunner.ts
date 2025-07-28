// C Code Runner Utility for Browser-based Execution
// Uses a custom C interpreter for visualization purposes
import { CInterpreter, runCCodeInterpreter } from './cInterpreter';

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

// Alternative approach: Algorithm-specific execution
export function runCCodeAlgorithmSpecific(code: string): { output: string; steps: any[] } {
  console.log('DEBUG: Using algorithm-specific execution');
  
  // Detect algorithm type
  if (code.includes('bubble') || code.includes('arr[j] > arr[j + 1]')) {
    return runBubbleSort(code);
  } else if (code.includes('insertion') || code.includes('key = arr[i]')) {
    return runInsertionSort(code);
  } else {
    // Fall back to general interpreter
    return runCCodeInterpreter(code);
  }
}

function runBubbleSort(code: string): { output: string; steps: any[] } {
  console.log('DEBUG: Running bubble sort algorithm');
  
  // Extract array from code
  const arrayMatch = code.match(/int arr\[\] = \{([^}]+)\}/);
  if (!arrayMatch) {
    return { output: 'Error: Could not find array declaration', steps: [] };
  }
  
  const arr = arrayMatch[1].split(',').map(x => parseInt(x.trim()));
  const n = arr.length;
  const steps: any[] = [];
  let output = '';
  
  // Add initial state
  steps.push({
    line: 1,
    action: 'Initial array',
    variables: { n },
    arrays: { arr: [...arr] }
  });
  
  output += 'Original array: ' + arr.join(' ') + '\n';
  
  // Bubble sort implementation
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Add step showing current comparison
      steps.push({
        line: 10,
        action: `Comparing arr[${j}] (${arr[j]}) with arr[${j + 1}] (${arr[j + 1]})`,
        variables: { i, j, n },
        arrays: { arr: [...arr] }
      });
      
      if (arr[j] > arr[j + 1]) {
        // Swap
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        
        steps.push({
          line: 12,
          action: `Swapped ${temp} and ${arr[j]}`,
          variables: { i, j, n },
          arrays: { arr: [...arr] }
        });
      }
    }
    
    // Add step showing completion of outer loop iteration
    steps.push({
      line: 15,
      action: `Completed iteration ${i + 1}, largest element ${arr[n - 1 - i]} in position`,
      variables: { i, j: n - 1 - i, n },
      arrays: { arr: [...arr] }
    });
  }
  
  // Add final step showing sorted array
  steps.push({
    line: 20,
    action: 'Sorting completed',
    variables: { i: n - 1, j: n - 1, n },
    arrays: { arr: [...arr] }
  });
  
  output += 'Sorted array: ' + arr.join(' ') + '\n';
  
  return { output, steps };
}

function runInsertionSort(code: string): { output: string; steps: any[] } {
  console.log('DEBUG: Running insertion sort algorithm');
  
  // Extract array from code
  const arrayMatch = code.match(/int arr\[\] = \{([^}]+)\}/);
  if (!arrayMatch) {
    return { output: 'Error: Could not find array declaration', steps: [] };
  }
  
  const arr = arrayMatch[1].split(',').map(x => parseInt(x.trim()));
  const n = arr.length;
  const steps: any[] = [];
  let output = '';
  
  // Add initial state
  steps.push({
    line: 1,
    action: 'Initial array',
    variables: { n },
    arrays: { arr: [...arr] }
  });
  
  output += 'Original array: ' + arr.join(' ') + '\n';
  
  // Insertion sort implementation
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    
    // Add step showing current key selection
    steps.push({
      line: 12,
      action: `Selecting key = arr[${i}] = ${key}`,
      variables: { i, j, key, n },
      arrays: { arr: [...arr] }
    });
    
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j = j - 1;
      
      steps.push({
        line: 15,
        action: `Shifted ${arr[j + 1]} to position ${j + 2}`,
        variables: { i, j, key, n },
        arrays: { arr: [...arr] }
      });
    }
    
    arr[j + 1] = key;
    
    steps.push({
      line: 18,
      action: `Inserted ${key} at position ${j + 2}`,
      variables: { i, j, key, n },
      arrays: { arr: [...arr] }
    });
  }
  
  // Add final step showing sorted array
  steps.push({
    line: 20,
    action: 'Sorting completed',
    variables: { i: n - 1, j: n - 1, n },
    arrays: { arr: [...arr] }
  });
  
  output += 'Sorted array: ' + arr.join(' ') + '\n';
  
  return { output, steps };
}

export function runCCode(code: string): { output: string; steps: any[] } {
  // Try algorithm-specific approach first
  try {
    return runCCodeAlgorithmSpecific(code);
  } catch (error) {
    console.error('Algorithm-specific execution failed, falling back to interpreter:', error);
    return runCCodeInterpreter(code);
  }
}

 