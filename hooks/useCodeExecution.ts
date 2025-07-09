import { useState, useCallback } from 'react';

export interface Variable {
  name: string;
  value: string;
  previous: string;
}

export interface BackendStep {
  line: number;
  variables: Record<string, string>;
  dereferenced?: {
    structures?: string[];
  };
  changed_vars: Variable[];
}

export interface ExecutionResult {
  steps: BackendStep[];
  error?: string;
  details?: string;
}

const useCodeExecution = () => {
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    setExecutionResult(null);

    try {
      const executeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!executeResponse.ok) {
        const err = await executeResponse.json();
        throw new Error(err.error || 'Failed to start execution');
      }

      const { task_id } = await executeResponse.json();

      // Poll for result
      const poll = async (): Promise<ExecutionResult> => {
        const resultResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/result/${task_id}`);
        if (!resultResponse.ok) {
          throw new Error('Failed to fetch execution result');
        }
        
        const data = await resultResponse.json();

        if (data.status === 'PENDING' || data.status === 'STARTED') {
          await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
          return poll();
        } else if (data.status === 'SUCCESS') {
          return data.result;
        } else {
          throw new Error(data.error || 'Execution failed');
        }
      };
      
      const result = await poll();
      setExecutionResult(result);

    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { executeCode, executionResult, error, isLoading };
};

export default useCodeExecution; 