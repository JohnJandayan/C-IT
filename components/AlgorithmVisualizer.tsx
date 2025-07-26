import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlgorithmVisualizerProps {
  step: Record<string, any>;
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
}

interface ArrayElement {
  value: number;
  index: number;
  isActive: boolean;
  isSwapping: boolean;
  isComparing: boolean;
  isSorted: boolean;
}

export default function AlgorithmVisualizer({ 
  step, 
  currentStep, 
  totalSteps, 
  onStepChange 
}: AlgorithmVisualizerProps) {
  const [arrayElements, setArrayElements] = useState<ArrayElement[]>([]);
  const [animationState, setAnimationState] = useState<string>('idle');

  // Extract arrays from step data
  useEffect(() => {
    const arrays: Record<string, number[]> = {};
    
    Object.keys(step).forEach((key) => {
      const match = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
      if (match) {
        const arrName = match[1];
        const idx = parseInt(match[2], 10);
        if (!arrays[arrName]) arrays[arrName] = [];
        arrays[arrName][idx] = step[key];
      }
    });

    // Convert to animated elements
    const elements: ArrayElement[] = [];
    Object.keys(arrays).forEach((arrName) => {
      const arr = arrays[arrName];
      arr.forEach((value, index) => {
        elements.push({
          value,
          index,
          isActive: false,
          isSwapping: false,
          isComparing: false,
          isSorted: false
        });
      });
    });

    setArrayElements(elements);
  }, [step]);

  // Detect algorithm type and apply animations
  useEffect(() => {
    if (arrayElements.length === 0) return;

    // Detect sorting algorithms
    const isSorting = detectSortingAlgorithm(step, arrayElements);
    if (isSorting) {
      animateSorting(step, arrayElements);
    }

    // Detect searching algorithms
    const isSearching = detectSearchingAlgorithm(step, arrayElements);
    if (isSearching) {
      animateSearching(step, arrayElements);
    }

    // Detect data structure operations
    const isDataStructure = detectDataStructureOperation(step, arrayElements);
    if (isDataStructure) {
      animateDataStructure(step, arrayElements);
    }
  }, [step, arrayElements]);

  const detectSortingAlgorithm = (step: Record<string, any>, elements: ArrayElement[]): boolean => {
    // Check for bubble sort patterns
    const hasSwapping = Object.keys(step).some(key => 
      key.includes('temp') || key.includes('swap') || 
      (step[key] && typeof step[key] === 'number' && step[key] !== elements[step[key]]?.value)
    );
    
    return hasSwapping;
  };

  const detectSearchingAlgorithm = (step: Record<string, any>, elements: ArrayElement[]): boolean => {
    // Check for search patterns
    const hasSearching = Object.keys(step).some(key => 
      key.includes('found') || key.includes('search') || key.includes('target')
    );
    
    return hasSearching;
  };

  const detectDataStructureOperation = (step: Record<string, any>, elements: ArrayElement[]): boolean => {
    // Check for data structure operations
    const hasDataStructure = Object.keys(step).some(key => 
      key.includes('node') || key.includes('next') || key.includes('prev') ||
      key.includes('left') || key.includes('right') || key.includes('parent')
    );
    
    return hasDataStructure;
  };

  const animateSorting = (step: Record<string, any>, elements: ArrayElement[]) => {
    setAnimationState('sorting');
    
    // Simulate sorting animation
    const newElements = [...elements];
    
    // Highlight elements being compared
    newElements.forEach((el, index) => {
      el.isComparing = step[`arr[${index}]`] !== undefined;
      el.isActive = el.isComparing;
    });

    // Highlight elements being swapped
    Object.keys(step).forEach((key) => {
      const match = key.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[2], 10);
        const element = newElements.find(el => el.index === idx);
        if (element) {
          element.isSwapping = true;
          element.value = step[key];
        }
      }
    });

    setArrayElements(newElements);
  };

  const animateSearching = (step: Record<string, any>, elements: ArrayElement[]) => {
    setAnimationState('searching');
    
    const newElements = [...elements];
    
    // Highlight current search position
    newElements.forEach((el, index) => {
      el.isActive = step[`i`] === index || step[`j`] === index;
      el.isComparing = el.isActive;
    });

    setArrayElements(newElements);
  };

  const animateDataStructure = (step: Record<string, any>, elements: ArrayElement[]) => {
    setAnimationState('data-structure');
    
    const newElements = [...elements];
    
    // Highlight data structure nodes
    newElements.forEach((el) => {
      el.isActive = Object.keys(step).some(key => 
        key.includes(el.value.toString()) || key.includes(`node${el.index}`)
      );
    });

    setArrayElements(newElements);
  };

  return (
    <div className="w-full">
      {/* Animation Controls */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50 hover:bg-primary-600 transition-colors"
          >
            ⏮️ Previous
          </button>
          
          <span className="text-lg font-semibold">
            Step {currentStep + 1} of {totalSteps}
          </span>
          
          <button
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep === totalSteps - 1}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50 hover:bg-primary-600 transition-colors"
          >
            ⏭️ Next
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {animationState === 'sorting' && '🔄 Sorting Algorithm'}
          {animationState === 'searching' && '🔍 Searching Algorithm'}
          {animationState === 'data-structure' && '🏗️ Data Structure Operation'}
          {animationState === 'idle' && '⏸️ Ready'}
        </div>
      </div>

      {/* Animated Array Visualization */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-center">Array Visualization</h3>
        
        <div className="flex justify-center items-center gap-3 mb-6">
          <AnimatePresence>
            {arrayElements.map((element, index) => (
              <motion.div
                key={`${element.value}-${index}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: element.isSwapping ? -20 : 0,
                  rotate: element.isSwapping ? 180 : 0,
                  backgroundColor: element.isActive ? '#3b82f6' : 
                                  element.isComparing ? '#f59e0b' : 
                                  element.isSorted ? '#10b981' : '#f3f4f6',
                  color: element.isActive || element.isComparing ? 'white' : 'black'
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200
                }}
                className={`
                  w-16 h-16 flex items-center justify-center rounded-lg font-bold text-lg
                  border-2 shadow-lg cursor-pointer
                  ${element.isActive ? 'border-blue-500' : 
                    element.isComparing ? 'border-orange-500' : 
                    element.isSorted ? 'border-green-500' : 'border-gray-300'}
                `}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {element.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Comparing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Sorted</span>
          </div>
        </div>
      </div>

      {/* Variable State Display */}
      <div className="bg-white rounded-lg p-6 shadow-lg mt-6">
        <h3 className="text-lg font-semibold mb-4">Variable State</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(step).map(([key, value]) => {
            if (key === 'line') return null;
            if (key.includes('[')) return null; // Skip array elements (shown above)
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 p-3 rounded-lg border"
              >
                <div className="text-sm text-gray-600 font-medium">{key}</div>
                <div className="text-lg font-bold text-gray-900">{String(value)}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Algorithm Progress Bar */}
      <div className="bg-white rounded-lg p-6 shadow-lg mt-6">
        <h3 className="text-lg font-semibold mb-4">Execution Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="text-center mt-2 text-sm text-gray-600">
          {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
        </div>
      </div>
    </div>
  );
} 