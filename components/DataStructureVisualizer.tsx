import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataStructureVisualizerProps {
  step: Record<string, any>;
  currentStep: number;
  totalSteps: number;
  executionSteps: Record<string, any>[];
  onStepChange: (step: number) => void;
  onSpeedChange: (speed: string) => void;
  onPlayPause: () => void;
  isPlaying: boolean;
  speed: string;
}

interface DataElement {
  value: number;
  index: number;
  state: 'normal' | 'comparing' | 'swapping' | 'current' | 'sorted' | 'pivot' | 'active';
  dataStructure: 'array' | 'linked-list' | 'queue' | 'stack' | 'tree' | 'heap';
  connections?: { type: 'next' | 'prev' | 'left' | 'right'; targetIndex: number }[];
}

export default function DataStructureVisualizer({
  step,
  currentStep,
  totalSteps,
  executionSteps,
  onStepChange,
  onSpeedChange,
  onPlayPause,
  isPlaying,
  speed
}: DataStructureVisualizerProps) {
  const [elements, setElements] = useState<DataElement[]>([]);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [dataStructureType, setDataStructureType] = useState<string>('array');

  // Parse step data and extract data structure elements
  useEffect(() => {
    const newElements: DataElement[] = [];
    const arrays: Record<string, number[]> = {};
    const linkedListNodes: Record<string, { value: number; next?: string }> = {};
    const treeNodes: Record<string, { value: number; left?: string; right?: string }> = {};

    // Extract arrays
    Object.keys(step).forEach((key) => {
      const arrayMatch = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
      if (arrayMatch) {
        const arrName = arrayMatch[1];
        const idx = parseInt(arrayMatch[2], 10);
        if (!arrays[arrName]) arrays[arrName] = [];
        arrays[arrName][idx] = step[key];
      }
    });

    // If no arrays found in current step, try to find them in previous steps
    if (Object.keys(arrays).length === 0 && executionSteps.length > 0) {
      for (let i = executionSteps.length - 1; i >= 0; i--) {
        const prevStep = executionSteps[i];
        Object.keys(prevStep).forEach((key) => {
          const arrayMatch = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
          if (arrayMatch) {
            const arrName = arrayMatch[1];
            const idx = parseInt(arrayMatch[2], 10);
            if (!arrays[arrName]) arrays[arrName] = [];
            arrays[arrName][idx] = prevStep[key];
          }
        });
        if (Object.keys(arrays).length > 0) break;
      }
    }

    // Extract linked list nodes
    Object.keys(step).forEach((key) => {
      const nodeMatch = key.match(/(node\d+)_data/);
      if (nodeMatch) {
        const nodeName = nodeMatch[1];
        const value = step[key];
        const nextKey = `${nodeName}_next`;
        const next = step[nextKey];
        linkedListNodes[nodeName] = { value, next };
      }
    });

    // Extract tree nodes
    Object.keys(step).forEach((key) => {
      const treeMatch = key.match(/(tree\d+)_data/);
      if (treeMatch) {
        const nodeName = treeMatch[1];
        const value = step[key];
        const leftKey = `${nodeName}_left`;
        const rightKey = `${nodeName}_right`;
        const left = step[leftKey];
        const right = step[rightKey];
        treeNodes[nodeName] = { value, left, right };
      }
    });

    // Convert to visual elements
    if (Object.keys(arrays).length > 0) {
      setDataStructureType('array');
      Object.keys(arrays).forEach((arrName) => {
        const arr = arrays[arrName];
        arr.forEach((value, index) => {
          newElements.push({
            value,
            index,
            state: 'normal',
            dataStructure: 'array'
          });
        });
      });
    } else if (Object.keys(linkedListNodes).length > 0) {
      setDataStructureType('linked-list');
      Object.entries(linkedListNodes).forEach(([nodeName, node], index) => {
        newElements.push({
          value: node.value,
          index,
          state: 'normal',
          dataStructure: 'linked-list',
          connections: node.next ? [{ type: 'next', targetIndex: parseInt(node.next.replace('node', '')) }] : []
        });
      });
    } else if (Object.keys(treeNodes).length > 0) {
      setDataStructureType('tree');
      Object.entries(treeNodes).forEach(([nodeName, node], index) => {
        const connections: { type: 'next' | 'prev' | 'left' | 'right'; targetIndex: number }[] = [];
        if (node.left) connections.push({ type: 'left' as const, targetIndex: parseInt(node.left.replace('tree', '')) });
        if (node.right) connections.push({ type: 'right' as const, targetIndex: parseInt(node.right.replace('tree', '')) });
        
        newElements.push({
          value: node.value,
          index,
          state: 'normal',
          dataStructure: 'tree',
          connections
        });
      });
    }

    setElements(newElements);
  }, [step]);

  // Analyze current step and determine element states
  useEffect(() => {
    if (elements.length === 0) return;

    const newElements = [...elements];
    let action = '';

    // Detect sorting operations
    if (dataStructureType === 'array') {
      // Look for swapping operations by detecting changes in array values
      const swappingIndices: number[] = [];
      const previousStep = currentStep > 0 ? executionSteps[currentStep - 1] : null;
      
      if (previousStep) {
        Object.keys(step).forEach((key) => {
          const arrayMatch = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
          if (arrayMatch) {
            const idx = parseInt(arrayMatch[2], 10);
            const currentValue = step[key];
            const previousValue = previousStep[key];
            
            if (currentValue !== previousValue) {
              swappingIndices.push(idx);
            }
          }
        });
      }

      // Look for comparison operations
      const comparingIndices: number[] = [];
      if (step.i !== undefined) comparingIndices.push(step.i);
      if (step.j !== undefined) comparingIndices.push(step.j);

      // Set states based on operations
      newElements.forEach((element) => {
        if (swappingIndices.includes(element.index)) {
          element.state = 'swapping';
          action = `Swapping elements at positions ${swappingIndices.join(' and ')}`;
        } else if (comparingIndices.includes(element.index)) {
          element.state = 'comparing';
          if (!action) action = `Comparing elements at positions ${comparingIndices.join(' and ')}`;
        } else if (step.current !== undefined && element.index === step.current) {
          element.state = 'current';
          if (!action) action = `Current position: ${element.index}`;
        } else if (step.sorted !== undefined && element.index <= step.sorted) {
          element.state = 'sorted';
        } else {
          element.state = 'normal';
        }
      });

      // Update element values from current step
      Object.keys(step).forEach((key) => {
        const arrayMatch = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
        if (arrayMatch) {
          const idx = parseInt(arrayMatch[2], 10);
          const element = newElements.find(el => el.index === idx);
          if (element) {
            element.value = step[key];
          }
        }
      });

      // Set default action if none detected
      if (!action) {
        if (step.line) {
          action = `Executing line ${step.line}`;
        } else {
          action = `Step ${currentStep + 1} of ${totalSteps}`;
        }
      }
    }

    // Detect searching operations
    if (step.found !== undefined || step.target !== undefined) {
      newElements.forEach((element) => {
        if (step.current !== undefined && element.index === step.current) {
          element.state = 'current';
          action = `Searching for ${step.target || 'target'} at position ${element.index}`;
        } else if (step.found && element.value === step.target) {
          element.state = 'active';
          action = `Found ${step.target} at position ${element.index}`;
        } else {
          element.state = 'normal';
        }
      });
    }

    // Detect data structure operations
    if (dataStructureType === 'linked-list') {
      if (step.current !== undefined) {
        newElements.forEach((element) => {
          if (element.index === step.current) {
            element.state = 'current';
            action = `Traversing to node ${element.index}`;
          } else {
            element.state = 'normal';
          }
        });
      }
    }

    if (dataStructureType === 'tree') {
      if (step.current !== undefined) {
        newElements.forEach((element) => {
          if (element.index === step.current) {
            element.state = 'current';
            action = `Visiting tree node ${element.index}`;
          } else {
            element.state = 'normal';
          }
        });
      }
    }

    setElements(newElements);
    setCurrentAction(action);
  }, [step, elements, dataStructureType]);

  const getElementColor = (state: string) => {
    switch (state) {
      case 'comparing': return '#fbbf24'; // Yellow
      case 'swapping': return '#ef4444'; // Red
      case 'current': return '#3b82f6'; // Blue
      case 'sorted': return '#10b981'; // Green
      case 'pivot': return '#8b5cf6'; // Purple
      case 'active': return '#f59e0b'; // Orange
      default: return '#ffffff'; // White
    }
  };

  const getElementBorderColor = (state: string) => {
    switch (state) {
      case 'comparing': return '#f59e0b';
      case 'swapping': return '#dc2626';
      case 'current': return '#2563eb';
      case 'sorted': return '#059669';
      case 'pivot': return '#7c3aed';
      case 'active': return '#d97706';
      default: return '#d1d5db';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Visualization</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {currentStep + 1}/{totalSteps}
          </span>
          <button className="text-gray-600 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0010 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>
          
          <button
            onClick={onPlayPause}
            className={`p-3 rounded-full ${isPlaying ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-600`}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep === totalSteps - 1}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.934 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0014 8v8a1 1 0 001.6.8l5.334-4z" />
            </svg>
          </button>
        </div>
        
        <select
          value={speed}
          onChange={(e) => onSpeedChange(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Current Step Description */}
      {currentAction && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 font-medium">{currentAction}</p>
        </div>
      )}

      {/* Data Structure Visualization */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-center capitalize">
          {dataStructureType.replace('-', ' ')} Elements
        </h3>
        
        <div className="flex justify-center items-center gap-3 flex-wrap">
          <AnimatePresence>
            {elements.map((element, index) => (
              <motion.div
                key={`${element.value}-${index}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: element.state === 'swapping' ? -10 : 0,
                  rotate: 0
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 0.3,
                  type: "spring",
                  stiffness: 200
                }}
                className={`
                  w-16 h-16 flex items-center justify-center rounded-lg font-bold text-lg
                  border-2 shadow-lg cursor-pointer relative
                `}
                style={{
                  backgroundColor: getElementColor(element.state),
                  borderColor: getElementBorderColor(element.state),
                  color: element.state === 'normal' ? '#374151' : '#ffffff'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {element.value}
                
                {/* Show connections for linked lists and trees */}
                {element.connections && element.connections.length > 0 && (
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gray-600 rounded-full text-white text-xs flex items-center justify-center">
                    {element.connections.length}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded border border-yellow-500"></div>
            <span>Comparing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded border border-red-600"></div>
            <span>Swapping</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded border border-blue-600"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded border border-green-600"></div>
            <span>Sorted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded border border-purple-600"></div>
            <span>Pivot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded border border-orange-600"></div>
            <span>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
} 