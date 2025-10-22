// Core types for the C code visualizer

export interface Variable {
  name: string;
  value: string | number;
  type: string;
  address?: string;
  scope: 'global' | 'local';
}

export interface PointerInfo {
  name: string;
  address: string;
  pointsTo: string;
  value?: string | number;
}

export interface ArrayInfo {
  name: string;
  elements: Array<{
    index: number;
    value: string | number;
    address?: string;
  }>;
  type: string;
  size: number;
}

export interface LinkedListNode {
  id: string;
  value: string | number;
  next: string | null;
  address: string;
}

export interface TreeNode {
  id: string;
  value: string | number;
  left: string | null;
  right: string | null;
  address: string;
  x?: number;
  y?: number;
}

export interface StackFrame {
  functionName: string;
  lineNumber: number;
  variables: Variable[];
}

export interface ExecutionStep {
  stepNumber: number;
  lineNumber: number;
  code: string;
  variables: Variable[];
  pointers: PointerInfo[];
  arrays: ArrayInfo[];
  linkedLists: Record<string, LinkedListNode[]>;
  trees: Record<string, TreeNode[]>;
  stacks: Record<string, any[]>;
  queues: Record<string, any[]>;
  hashmaps: Record<string, any>;
  callStack: StackFrame[];
  output: string[];
  memoryAllocations: Array<{
    address: string;
    size: number;
    type: string;
  }>;
  explanation?: string;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  error?: string;
  compilationError?: string;
}

export interface CodeExample {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
}

export interface VisualizationState {
  currentStep: number;
  isPlaying: boolean;
  animationSpeed: number; // milliseconds per step
  code: string;
  trace: ExecutionTrace | null;
  isLoading: boolean;
  error: string | null;
}

export type DataStructureType = 
  | 'variable'
  | 'pointer'
  | 'array'
  | 'linkedList'
  | 'tree'
  | 'stack'
  | 'queue'
  | 'hashmap';
