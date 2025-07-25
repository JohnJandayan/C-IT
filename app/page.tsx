'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AlgorithmSelector from '@/components/AlgorithmSelector';
import CodeEditor from '@/components/CodeEditor';
import Visualization from '@/components/Visualization';
import { Algorithm, AlgorithmStep } from '@/types';
import { algorithms } from '@/lib/algorithms';
import { createVisualizer } from '@/lib/visualizer';

export default function Home() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [visualizationSteps, setVisualizationSteps] = useState<AlgorithmStep[]>([]);
  const [isVisualizing, setIsVisualizing] = useState(false);

  // Set default algorithm on component mount
  useEffect(() => {
    if (!selectedAlgorithm && algorithms.length > 0) {
      setSelectedAlgorithm(algorithms[0]);
    }
  }, [selectedAlgorithm]);

  const handleAlgorithmSelect = (algorithm: Algorithm) => {
    setSelectedAlgorithm(algorithm);
    setVisualizationSteps([]);
    setIsVisualizing(false);
  };

  const handleRunAlgorithm = (code: string) => {
    if (!selectedAlgorithm) return;

    setIsVisualizing(true);
    
    // Create visualizer and generate steps
    const visualizer = createVisualizer(selectedAlgorithm, selectedAlgorithm.example);
    const steps = visualizer.generateSteps();
    
    setVisualizationSteps(steps);
  };

  const handleStepChange = (step: number) => {
    // Handle step change if needed
    console.log('Current step:', step);
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Welcome to <span className="text-primary-600">C-It</span>
          </h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Interactive visualization tool for C programming algorithms. 
            Learn sorting, searching, and data structure algorithms with step-by-step animations.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Algorithm Selector */}
          <div className="lg:col-span-1">
            <AlgorithmSelector
              selectedAlgorithm={selectedAlgorithm}
              onAlgorithmSelect={handleAlgorithmSelect}
            />
          </div>

          {/* Code Editor and Visualization */}
          <div className="lg:col-span-2 space-y-8">
            {selectedAlgorithm && (
              <>
                <CodeEditor
                  algorithm={selectedAlgorithm}
                  onRun={handleRunAlgorithm}
                />
                
                {visualizationSteps.length > 0 && (
                  <Visualization
                    algorithm={selectedAlgorithm}
                    steps={visualizationSteps}
                    onStepChange={handleStepChange}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Features Section */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-secondary-900 text-center mb-12">
            Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-primary-600 font-bold text-xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Algorithm Visualization
              </h3>
              <p className="text-secondary-600">
                Step-by-step visual representation of how algorithms work, making complex concepts easy to understand.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-accent-600 font-bold text-xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Interactive Controls
              </h3>
              <p className="text-secondary-600">
                Play, pause, step forward/backward, and control animation speed to learn at your own pace.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-green-600 font-bold text-xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Code Editor
              </h3>
              <p className="text-secondary-600">
                Syntax-highlighted C code editor with copy, download, and customization features.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-yellow-600 font-bold text-xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Multiple Algorithms
              </h3>
              <p className="text-secondary-600">
                Comprehensive collection of sorting, searching, and data structure algorithms.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-purple-600 font-bold text-xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Responsive Design
              </h3>
              <p className="text-secondary-600">
                Modern, responsive interface that works perfectly on desktop, tablet, and mobile devices.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-secondary-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-red-600 font-bold text-xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Educational Focus
              </h3>
              <p className="text-secondary-600">
                Designed for students, educators, and anyone learning computer science concepts.
              </p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="mt-16 bg-white rounded-lg shadow-lg border border-secondary-200 p-8">
          <h2 className="text-3xl font-bold text-secondary-900 text-center mb-8">
            About C-It
          </h2>
          
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-secondary-600 mb-6">
              C-It is an interactive algorithm visualization tool designed to make learning C programming 
              algorithms engaging and intuitive. Whether you're a student learning computer science concepts, 
              a teacher looking for visual aids, or a developer wanting to understand algorithm behavior, 
              C-It provides the perfect platform.
            </p>
            
            <p className="text-secondary-600 mb-8">
              Built with modern web technologies including Next.js, TypeScript, and Tailwind CSS, 
              C-It offers a smooth, responsive experience across all devices. The application features 
              step-by-step visualizations, interactive controls, and comprehensive algorithm coverage.
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://portfolio-john-jandayan.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary"
              >
                Meet the Developer
              </a>
              <a
                href="https://github.com/your-username/c-it"
                target="_blank"
                rel="noopener noreferrer"
                className="button-secondary"
              >
                View Source Code
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-secondary-600">
              © 2024 C-It Algorithm Visualizer. Built with ❤️ by{' '}
              <a
                href="https://portfolio-john-jandayan.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                John Jandayan
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 