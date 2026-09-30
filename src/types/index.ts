export interface CodeExample {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
  /** Lines of input to suggest when the example reads from stdin. */
  input?: string[];
}

export type Granularity = 'line' | 'expr';
export type RunStatus = 'idle' | 'compiling' | 'running' | 'input' | 'done' | 'error';
export type VizTab = 'structures' | 'memory';
