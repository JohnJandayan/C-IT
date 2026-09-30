import React from 'react';
import { StepKind } from '@/engine/protocol';
import { timeline, useVisualizationStore } from '@/store/visualizationStore';

const ErrorDisplay: React.FC = () => {
  const error = useVisualizationStore((s) => s.error);
  const setError = useVisualizationStore((s) => s.setError);
  const seek = useVisualizationStore((s) => s.seek);
  const done = useVisualizationStore((s) => s.done);

  if (!error) return null;

  const errorStep = done?.error && done.error.kind !== 'compile'
    ? timeline.steps.findIndex((s) => s.k === StepKind.Error)
    : -1;

  return (
    <div className="fixed bottom-24 right-4 max-w-md bg-red-900 border border-red-700 rounded-lg shadow-xl p-4 z-50 animate-slide-up" role="alert">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white mb-1">Execution Error</h3>
          <p className="text-sm text-red-200 whitespace-pre-wrap break-words font-mono max-h-48 overflow-auto">{error}</p>
          {errorStep >= 0 && (
            <button
              onClick={() => seek(errorStep)}
              className="mt-2 text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
            >
              Jump to the error
            </button>
          )}
        </div>
        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 transition-colors" aria-label="Dismiss">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
