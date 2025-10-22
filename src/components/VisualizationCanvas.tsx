import React from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';
import ArrayRenderer from './visualizers/ArrayRenderer';
import LinkedListRenderer from './visualizers/LinkedListRenderer';
import TreeRenderer from './visualizers/TreeRenderer';
import StackRenderer from './visualizers/StackRenderer';

const VisualizationCanvas: React.FC = () => {
  const { trace, currentStep } = useVisualizationStore();

  if (!trace || trace.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <svg
            className="w-24 h-24 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          <p className="text-lg">Click "Execute" to visualize your code</p>
        </div>
      </div>
    );
  }

  const step = trace.steps[currentStep];

  return (
    <div className="h-full overflow-auto p-6 bg-gray-900">
      <h3 className="text-lg font-bold mb-6 text-blue-400">Data Visualization</h3>

      <div className="space-y-8">
        {/* Arrays */}
        {step.arrays.length > 0 && (
          <div className="fade-in">
            <h4 className="text-md font-semibold mb-3 text-green-400">Arrays</h4>
            <div className="space-y-4">
              {step.arrays.map((array, idx) => (
                <ArrayRenderer key={idx} array={array} />
              ))}
            </div>
          </div>
        )}

        {/* Linked Lists */}
        {Object.keys(step.linkedLists).length > 0 && (
          <div className="fade-in">
            <h4 className="text-md font-semibold mb-3 text-purple-400">
              Linked Lists
            </h4>
            <div className="space-y-4">
              {Object.entries(step.linkedLists).map(([name, nodes]) => (
                <LinkedListRenderer key={name} name={name} nodes={nodes} />
              ))}
            </div>
          </div>
        )}

        {/* Trees */}
        {Object.keys(step.trees).length > 0 && (
          <div className="fade-in">
            <h4 className="text-md font-semibold mb-3 text-yellow-400">Trees</h4>
            <div className="space-y-4">
              {Object.entries(step.trees).map(([name, nodes]) => (
                <TreeRenderer key={name} name={name} nodes={nodes} />
              ))}
            </div>
          </div>
        )}

        {/* Stacks */}
        {Object.keys(step.stacks).length > 0 && (
          <div className="fade-in">
            <h4 className="text-md font-semibold mb-3 text-red-400">Stacks</h4>
            <div className="space-y-4">
              {Object.entries(step.stacks).map(([name, items]) => (
                <StackRenderer key={name} name={name} items={items} />
              ))}
            </div>
          </div>
        )}

        {/* Queues */}
        {Object.keys(step.queues).length > 0 && (
          <div className="fade-in">
            <h4 className="text-md font-semibold mb-3 text-cyan-400">Queues</h4>
            <div className="space-y-4">
              {Object.entries(step.queues).map(([name, items]) => (
                <div key={name} className="bg-gray-800 p-4 rounded-lg">
                  <div className="font-mono text-sm mb-2 text-cyan-300">{name}</div>
                  <div className="flex gap-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="w-16 h-16 bg-cyan-600 rounded flex items-center justify-center text-white font-bold"
                      >
                        {String(item)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {step.arrays.length === 0 &&
        Object.keys(step.linkedLists).length === 0 &&
        Object.keys(step.trees).length === 0 &&
        Object.keys(step.stacks).length === 0 &&
        Object.keys(step.queues).length === 0 && (
          <div className="text-gray-500 italic text-center mt-12">
            No data structures to visualize at this step
          </div>
        )}
    </div>
  );
};

export default VisualizationCanvas;
