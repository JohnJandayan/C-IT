import React, { useEffect, useRef } from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';

const OutputConsole: React.FC = () => {
  const { trace, currentStep } = useVisualizationStore();
  const consoleRef = useRef<HTMLDivElement>(null);

  const currentOutput = trace?.steps[currentStep]?.output || [];

  useEffect(() => {
    // Auto-scroll to bottom when new output appears
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [currentOutput]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">Console Output</h3>
      </div>
      <div
        ref={consoleRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm text-gray-300"
      >
        {currentOutput.length === 0 ? (
          <div className="text-gray-500 italic">No output yet</div>
        ) : (
          currentOutput.map((line, idx) => (
            <div
              key={idx}
              className="py-1 hover:bg-gray-800 rounded px-2 slide-in"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OutputConsole;
