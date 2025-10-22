import { create } from 'zustand';
import { VisualizationState, ExecutionTrace } from '@/types';

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
    int x = 10;
    int y = 20;
    int sum = x + y;
    printf("Sum: %d\\n", sum);
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
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute code');
      }

      const trace: ExecutionTrace = await response.json();

      if (trace.error || trace.compilationError) {
        setError(trace.compilationError || trace.error || 'Execution failed');
        setTrace(null);
      } else {
        setTrace(trace);
        setError(null);
      }
    } catch (error) {
      console.error('Execution error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setTrace(null);
    } finally {
      setLoading(false);
    }
  },
}));
