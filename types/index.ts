export interface AlgorithmStep {
  id: string;
  type: 'compare' | 'swap' | 'move' | 'highlight' | 'partition' | 'merge' | 'insert' | 'delete' | 'traverse';
  indices: number[];
  values?: number[];
  description: string;
  array?: number[];
  dataStructure?: any;
}



export interface VisualizationState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  array: number[];
  steps: AlgorithmStep[];
}

export interface DataStructureNode {
  id: string;
  value: number;
  next?: string;
  prev?: string;
  left?: string;
  right?: string;
  parent?: string;
  color?: 'red' | 'black';
  visited?: boolean;
  active?: boolean;
}

export interface DataStructure {
  type: 'linked-list' | 'stack' | 'queue' | 'tree' | 'heap' | 'hashmap';
  nodes: DataStructureNode[];
  edges: Array<{ from: string; to: string; weight?: number }>;
}

export interface CodeEditorState {
  code: string;
  language: 'c';
  theme: 'light' | 'dark';
  fontSize: number;
}

export interface Settings {
  animationSpeed: number;
  theme: 'light' | 'dark';
  fontSize: number;
  showLineNumbers: boolean;
  autoPlay: boolean;
} 