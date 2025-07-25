'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Settings } from 'lucide-react';
import { AlgorithmStep, Algorithm } from '@/types';

interface VisualizationProps {
  algorithm: Algorithm;
  steps: AlgorithmStep[];
  onStepChange?: (step: number) => void;
  className?: string;
}

export default function Visualization({ 
  algorithm, 
  steps, 
  onStepChange,
  className = '' 
}: VisualizationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [showControls, setShowControls] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = steps[currentStep] || null;
  const currentArray = currentStepData?.array || algorithm.example;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, steps.length]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const getElementClass = (index: number): string => {
    if (!currentStepData) return 'array-element';
    
    const baseClass = 'array-element';
    
    if (currentStepData.indices.includes(index)) {
      switch (currentStepData.type) {
        case 'compare':
          return `${baseClass} comparing`;
        case 'swap':
          return `${baseClass} swapping`;
        case 'highlight':
          return `${baseClass} current`;
        case 'partition':
          return `${baseClass} pivot`;
        case 'merge':
          return `${baseClass} sorted`;
        default:
          return `${baseClass} current`;
      }
    }
    
    return baseClass;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-secondary-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-secondary-900">Visualization</h3>
          <span className="px-2 py-1 text-xs font-medium bg-accent-100 text-accent-800 rounded-full">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        
        <button
          onClick={() => setShowControls(!showControls)}
          className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
          title="Toggle controls"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
              
              <button
                onClick={handleStepBackward}
                disabled={currentStep === 0}
                className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous step"
              >
                <SkipBack size={18} />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              
              <button
                onClick={handleStepForward}
                disabled={currentStep >= steps.length - 1}
                className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next step"
              >
                <SkipForward size={18} />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-secondary-700">Speed:</label>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={2000}>Slow</option>
                <option value={1000}>Normal</option>
                <option value={500}>Fast</option>
                <option value={200}>Very Fast</option>
              </select>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <motion.div
                className="bg-primary-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Visualization Area */}
      <div className="p-6">
        {/* Step Description */}
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <h4 className="font-medium text-blue-900 mb-1">Current Step</h4>
            <p className="text-blue-800 text-sm">{currentStepData.description}</p>
          </motion.div>
        )}

        {/* Array Visualization */}
        <div className="mb-6">
          <h4 className="font-medium text-secondary-900 mb-3">Array Elements</h4>
          <div className="flex items-center justify-center space-x-3 flex-wrap">
            <AnimatePresence mode="wait">
              {currentArray.map((value, index) => (
                <motion.div
                  key={`${index}-${value}-${currentStep}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={getElementClass(index)}
                >
                  {value}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-secondary-50 p-4 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
              <span className="text-secondary-700">Comparing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
              <span className="text-secondary-700">Swapping</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
              <span className="text-secondary-700">Current</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
              <span className="text-secondary-700">Sorted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border-2 border-purple-400 rounded"></div>
              <span className="text-secondary-700">Pivot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 