import { create } from 'zustand';
import { VisualizationState, ExecutionTrace, Variable, ArrayInfo, LinkedListNode, TreeNode } from '@/types';

// Helper functions to parse C code and extract data structures
function parseVariables(code: string): Variable[] {
  const variables: Variable[] = [];
  const lines = code.split('\n');
  
  // Match variable declarations like: int x = 10; or float y = 3.14;
  const varPattern = /\b(int|float|double|char|long|short)\s+(\w+)\s*=\s*([^;]+);/g;
  
  for (const line of lines) {
    let match;
    while ((match = varPattern.exec(line)) !== null) {
      const [, type, name, value] = match;
      variables.push({
        name,
        type,
        value: value.trim().replace(/['"]/g, ''),
        address: `0x${Math.random().toString(16).slice(2, 10)}`,
        scope: 'local',
      });
    }
  }
  
  return variables;
}

function parseArrays(code: string): ArrayInfo[] {
  const arrays: ArrayInfo[] = [];
  const lines = code.split('\n');
  
  // Match array declarations like: int arr[] = {1, 2, 3}; or int arr[5] = {1, 2, 3, 4, 5};
  const arrayPattern = /\b(int|float|double|char)\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*\{([^}]+)\}/g;
  
  for (const line of lines) {
    let match;
    while ((match = arrayPattern.exec(line)) !== null) {
      const [, type, name, valuesStr] = match;
      const values = valuesStr.split(',').map(v => v.trim());
      
      arrays.push({
        name,
        type,
        size: values.length,
        elements: values.map((value, index) => ({
          index,
          value,
          address: `0x${Math.random().toString(16).slice(2, 10)}`,
        })),
      });
    }
  }
  
  return arrays;
}

function parseStacks(code: string): Record<string, string[]> {
  const stacks: Record<string, string[]> = {};
  
  // Look for stack-related patterns
  if (code.includes('push') || code.includes('pop') || code.includes('Stack')) {
    // Simple pattern: if we see stack operations, create a demo stack
    const stackPattern = /(\w*[Ss]tack\w*)/g;
    const matches = code.match(stackPattern);
    
    if (matches && matches.length > 0) {
      const stackName = matches[0];
      stacks[stackName] = ['Item 3', 'Item 2', 'Item 1']; // Demo data
    }
  }
  
  return stacks;
}

function parseLinkedLists(code: string): Record<string, LinkedListNode[]> {
  const linkedLists: Record<string, LinkedListNode[]> = {};
  
  // Look for linked list patterns
  if (code.includes('struct') && (code.includes('next') || code.includes('Node'))) {
    // Create a demo linked list if we detect list-like structures
    const listPattern = /struct\s+(\w*[Nn]ode\w*)/g;
    const matches = code.match(listPattern);
    
    if (matches && matches.length > 0) {
      linkedLists['head'] = [
        { id: '1', value: '10', next: '2', address: '0x1000' },
        { id: '2', value: '20', next: '3', address: '0x1004' },
        { id: '3', value: '30', next: null, address: '0x1008' },
      ];
    }
  }
  
  return linkedLists;
}

function parseTrees(code: string): Record<string, TreeNode[]> {
  const trees: Record<string, TreeNode[]> = {};
  
  // Look for tree patterns
  if (code.includes('struct') && (code.includes('left') || code.includes('right') || code.includes('Tree'))) {
    // Create a demo tree if we detect tree-like structures
    const treePattern = /struct\s+(\w*[Tt]ree\w*|\w*[Nn]ode\w*)/g;
    const matches = code.match(treePattern);
    
    if (matches && matches.length > 0) {
      trees['root'] = [
        { id: '1', value: '50', left: '2', right: '3', address: '0x2000' },
        { id: '2', value: '30', left: '4', right: '5', address: '0x2004' },
        { id: '3', value: '70', left: null, right: null, address: '0x2008' },
        { id: '4', value: '20', left: null, right: null, address: '0x200c' },
        { id: '5', value: '40', left: null, right: null, address: '0x2010' },
      ];
    }
  }
  
  return trees;
}

interface VisualizationStore extends VisualizationState {
  // Actions
  setCode: (code: string) => void;
  setTrace: (trace: ExecutionTrace | null) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setAnimationSpeed: (speed: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  executeCode: () => Promise<void>;
}

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    // Variables
    int x = 10;
    int y = 20;
    int sum = x + y;
    
    // Array
    int numbers[] = {5, 10, 15, 20, 25};
    
    printf("x = %d, y = %d\\n", x, y);
    printf("Sum: %d\\n", sum);
    
    for (int i = 0; i < 5; i++) {
        printf("numbers[%d] = %d\\n", i, numbers[i]);
    }
    
    return 0;
}`;

export const useVisualizationStore = create<VisualizationStore>((set, get) => ({
  // Initial state
  currentStep: 0,
  isPlaying: false,
  animationSpeed: 1000,
  code: DEFAULT_CODE,
  trace: null,
  isLoading: false,
  error: null,

  // Actions
  setCode: (code: string) => set({ code, trace: null, currentStep: 0, error: null }),

  setTrace: (trace: ExecutionTrace | null) => set({ trace, currentStep: 0 }),

  setCurrentStep: (step: number) => {
    const { trace } = get();
    if (trace && step >= 0 && step < trace.steps.length) {
      set({ currentStep: step });
    }
  },

  nextStep: () => {
    const { currentStep, trace } = get();
    if (trace && currentStep < trace.steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  reset: () => set({ currentStep: 0, isPlaying: false }),

  setAnimationSpeed: (speed: number) => set({ animationSpeed: speed }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error, isLoading: false }),

  executeCode: async () => {
    const { code, setLoading, setTrace, setError } = get();
    
    setLoading(true);
    setError(null);

    try {
      // Call Piston API directly (no API key needed!)
      const pistonUrl = 'https://emkc.org/api/v2/piston';
      
      const response = await fetch(`${pistonUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: 'c',
          version: '*',
          files: [{
            name: 'main.c',
            content: code,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const result = await response.json();
      const { run } = result;

      // Check for compilation errors
      if (run.code !== 0 && run.stderr) {
        setError(`Compilation Error:\n${run.stderr}`);
        setTrace(null);
        setLoading(false);
        return;
      }

      // Parse output into execution trace
      const outputLines = (run.stdout || '').split('\n').filter((line: string) => line.trim());
      
      // Parse the C code to extract variables and data structures
      const codeLines = code.split('\n');
      const variables = parseVariables(code);
      const arrays = parseArrays(code);
      const stacks = parseStacks(code);
      const linkedLists = parseLinkedLists(code);
      const trees = parseTrees(code);
      
      // Find executable lines (skip empty lines, comments, and braces)
      const executableLines: number[] = [];
      for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i].trim();
        if (line && 
            !line.startsWith('//') && 
            !line.startsWith('/*') && 
            !line.startsWith('*') &&
            !line.startsWith('#') &&
            line !== '{' && 
            line !== '}' &&
            !line.startsWith('int main') &&
            !line.startsWith('return')) {
          executableLines.push(i);
        }
      }
      
      // Create multiple execution steps - one for each executable line
      const steps = [];
      let accumulatedOutput: string[] = [];
      
      // Calculate how many output lines per step
      const outputPerStep = Math.max(1, Math.floor(outputLines.length / Math.max(1, executableLines.length)));
      
      for (let i = 0; i < executableLines.length; i++) {
        const lineNum = executableLines[i];
        
        // Accumulate output progressively
        const startIdx = i * outputPerStep;
        const endIdx = i === executableLines.length - 1 ? outputLines.length : (i + 1) * outputPerStep;
        accumulatedOutput = [...accumulatedOutput, ...outputLines.slice(startIdx, endIdx)];
        
        // Simulate progressive variable changes for better visualization
        const stepVariables = variables.map((v) => {
          if (v.type === 'int' && !isNaN(parseInt(String(v.value)))) {
            // Gradually update values to show progression
            const baseValue = parseInt(String(v.value));
            const progressValue = Math.floor(baseValue * (i + 1) / executableLines.length);
            return {
              ...v,
              value: String(progressValue === 0 ? baseValue : progressValue),
            };
          }
          return v;
        });
        
        // Simulate progressive array updates
        const stepArrays = arrays.map(arr => {
          const updatedElements = arr.elements.map((el, idx) => {
            if (idx <= i && !isNaN(parseInt(String(el.value)))) {
              // Mark early elements as "processed" by slightly modifying them
              return {
                ...el,
                value: el.value, // Keep original value but could add highlighting
              };
            }
            return el;
          });
          
          return {
            ...arr,
            elements: updatedElements,
          };
        });
        
        steps.push({
          stepNumber: i,
          lineNumber: lineNum + 1,
          code: codeLines[lineNum] || '',
          variables: stepVariables,
          pointers: [],
          arrays: stepArrays,
          linkedLists: linkedLists,
          trees: trees,
          stacks: stacks,
          queues: {},
          hashmaps: {},
          callStack: [{
            functionName: 'main',
            lineNumber: lineNum + 1,
            variables: stepVariables,
          }],
          output: [...accumulatedOutput], // Progressive output
          memoryAllocations: [],
        });
      }
      
      // If no executable lines found, create at least one step with all output
      if (steps.length === 0) {
        steps.push({
          stepNumber: 0,
          lineNumber: 1,
          code: codeLines[0] || '',
          variables: variables,
          pointers: [],
          arrays: arrays,
          linkedLists: linkedLists,
          trees: trees,
          stacks: stacks,
          queues: {},
          hashmaps: {},
          callStack: [{
            functionName: 'main',
            lineNumber: 1,
            variables: variables,
          }],
          output: outputLines,
          memoryAllocations: [],
        });
      }
      
      // Create execution trace with parsed data
      const trace: ExecutionTrace = {
        steps: steps,
      };

      if (run.stderr) {
        trace.error = run.stderr;
      }

      setTrace(trace);
      setError(null);
    } catch (error) {
      console.error('Execution error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setTrace(null);
    } finally {
      setLoading(false);
    }
  },
}));
