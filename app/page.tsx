'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import CodeEditor from '@/components/CodeEditor';
import Visualization from '@/components/Visualization';
import GraphicalVisualizer from '@/components/GraphicalVisualizer';
import { runCCode } from '@/lib/tccRunner';
import { cExamples, CExample } from '@/lib/examples';

export default function Home() {
  const [code, setCode] = useState(`#include <stdio.h>\nint main() {\n  int a, b;\n  scanf("%d %d", &a, &b);\n  printf("Sum: %d\\n", a + b);\n  return 0;\n}`);
  const [userInput, setUserInput] = useState('');
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedExample, setSelectedExample] = useState<CExample | null>(null);

  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [executionOutput]);

  // Handler for running/visualizing code
  const handleRunCode = async (userCode: string, input: string) => {
    setCode(userCode);
    setUserInput(input);
    setIsVisualizing(true);
    setExecutionOutput('');
    setExecutionSteps([]);
    setCurrentStep(0);

    // For MVP, extract variable names from code (simple regex for int/float/char)
    const variableRegex = /\b(?:int|float|double|char)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(userCode)) !== null) {
      variables.push(match[1]);
    }

    try {
      const result = await runCCode(userCode, input, variables);
      setExecutionOutput(result.output);
      setExecutionSteps(result.steps);
    } catch (err) {
      setExecutionOutput('Error running code: ' + (err as Error).message);
    }
  };

  const handleExampleSelect = (example: CExample) => {
    setSelectedExample(example);
    setCode(example.code);
    setUserInput(example.input || '');
    setExecutionOutput('');
    setExecutionSteps([]);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Welcome to <span className="text-primary-600">C-It</span>
          </h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Visualize and animate any C code. Enter your code and input, then watch it come to life step by step!
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            {/* Example selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Examples:</label>
              <select
                className="w-full p-2 border border-secondary-300 rounded-lg text-sm"
                value={selectedExample ? selectedExample.name : ''}
                onChange={e => {
                  const ex = cExamples.find(ex => ex.name === e.target.value);
                  if (ex) handleExampleSelect(ex);
                }}
              >
                <option value="">-- Select an example --</option>
                {cExamples.map(ex => (
                  <option key={ex.name} value={ex.name}>{ex.name} - {ex.description}</option>
                ))}
              </select>
            </div>
            <CodeEditor
              code={code}
              onRun={handleRunCode}
            />
          </div>
          <div>
            <div className="bg-white rounded-lg shadow-lg border border-secondary-200 p-6 min-h-[400px] flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Visualization / Output</h3>
              {/* Animated Console Output */}
              <div className="bg-black text-green-400 font-mono rounded-lg p-4 h-48 overflow-y-auto text-sm" ref={consoleRef}>
                {executionOutput.split('\n').map((line, idx) => (
                  <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>{line}</div>
                ))}
              </div>
              {/* Step-by-step variable visualization */}
              {executionSteps.length > 0 && (
                <>
                  <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mt-4 min-h-[80px] text-secondary-700 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="px-2 py-1 bg-secondary-200 rounded disabled:opacity-50">Prev</button>
                      <span>Step {currentStep + 1} / {executionSteps.length}</span>
                      <button onClick={() => setCurrentStep(s => Math.min(executionSteps.length - 1, s + 1))} disabled={currentStep === executionSteps.length - 1} className="px-2 py-1 bg-secondary-200 rounded disabled:opacity-50">Next</button>
                    </div>
                    <table className="w-full text-xs mb-4">
                      <thead>
                        <tr>
                          <th className="text-left">Line</th>
                          {Object.keys(executionSteps[currentStep]).filter(k => k !== 'line').map(v => (
                            <th key={v} className="text-left">{v}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{executionSteps[currentStep].line}</td>
                          {Object.keys(executionSteps[currentStep]).filter(k => k !== 'line').map(v => (
                            <td key={v}>{executionSteps[currentStep][v]}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                    {/* Graphical visualization for arrays/pointers */}
                    <GraphicalVisualizer step={executionSteps[currentStep]} />
                  </div>
                </>
              )}
              {/* Placeholder for memory/variable visualization */}
              {executionSteps.length === 0 && (
                <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mt-4 min-h-[80px] text-secondary-700 text-xs text-center">
                  <span>Memory/Variable visualization coming soon...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 