import React from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';
import { Variable, StackFrame } from '@/types';

const StateDisplay: React.FC = () => {
  const { trace, currentStep } = useVisualizationStore();

  if (!trace || trace.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>No execution trace available</p>
      </div>
    );
  }

  const step = trace.steps[currentStep];

  return (
    <div className="h-full overflow-auto p-4 bg-gray-900 text-white">
      <h3 className="text-lg font-bold mb-4 text-blue-400">Program State</h3>

      {/* Step Info */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg">
        <div className="text-sm">
          <span className="text-gray-400">Step:</span>{' '}
          <span className="font-mono text-blue-300">
            {step.stepNumber + 1} / {trace.steps.length}
          </span>
        </div>
        <div className="text-sm mt-1">
          <span className="text-gray-400">Line:</span>{' '}
          <span className="font-mono text-blue-300">{step.lineNumber}</span>
        </div>
      </div>

      {/* Variables */}
      {step.variables.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-green-400">Variables</h4>
          <div className="space-y-2">
            {step.variables.map((variable: Variable, idx: number) => (
              <div
                key={idx}
                className="p-2 bg-gray-800 rounded border-l-4 border-green-500 slide-in"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">
                    <span className="text-gray-400">{variable.type}</span>{' '}
                    <span className="text-white font-semibold">{variable.name}</span>
                  </span>
                  <span className="font-mono text-sm text-yellow-300">
                    = {String(variable.value)}
                  </span>
                </div>
                {variable.address && (
                  <div className="text-xs text-gray-500 mt-1">
                    @ {variable.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pointers */}
      {step.pointers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-purple-400">Pointers</h4>
          <div className="space-y-2">
            {step.pointers.map((pointer, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-800 rounded border-l-4 border-purple-500"
              >
                <div className="font-mono text-sm">
                  <span className="text-white font-semibold">{pointer.name}</span>
                  <span className="text-gray-400"> → </span>
                  <span className="text-purple-300">{pointer.pointsTo}</span>
                </div>
                {pointer.value !== undefined && (
                  <div className="text-xs text-gray-400 mt-1">
                    Value: {String(pointer.value)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Stack */}
      {step.callStack.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-orange-400">Call Stack</h4>
          <div className="space-y-2">
            {step.callStack.map((frame: StackFrame, idx: number) => (
              <div
                key={idx}
                className="p-2 bg-gray-800 rounded border-l-4 border-orange-500"
              >
                <div className="font-mono text-sm font-semibold text-white">
                  {frame.functionName}()
                </div>
                <div className="text-xs text-gray-400">Line {frame.lineNumber}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Allocations */}
      {step.memoryAllocations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2 text-red-400">Memory</h4>
          <div className="space-y-2">
            {step.memoryAllocations.map((mem, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-800 rounded border-l-4 border-red-500 text-sm font-mono"
              >
                <div>
                  <span className="text-gray-400">{mem.type}</span> @{' '}
                  <span className="text-red-300">{mem.address}</span>
                </div>
                <div className="text-xs text-gray-500">{mem.size} bytes</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {step.explanation && (
        <div className="mt-6 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500">
          <h4 className="text-sm font-semibold mb-1 text-blue-300">Explanation</h4>
          <p className="text-sm text-gray-300">{step.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default StateDisplay;
