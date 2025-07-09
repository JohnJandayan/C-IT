"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, User, Moon, Sun, Code, Database, Search, BarChart3, GitBranch, Hash, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useCodeExecution, { BackendStep, Variable } from '../hooks/useCodeExecution';

// --- Algorithm Templates ---
const algorithmTemplates = {
  'bubble-sort': {
    name: 'Bubble Sort',
    category: 'Sorting',
    code: `#include <stdio.h>

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = 7;
    int i, j, temp;
    
    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    
    printf("Sorted array:\\n");
    for (i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    
    return 0;
}`
  },
  'stack': {
    name: 'Stack',
    category: 'Data Structures',
    code: `#include <stdio.h>
#include <stdlib.h>

#define MAX 10

struct Stack {
    int items[MAX];
    int top;
};

void init(struct Stack *s) {
    s->top = -1;
}

void push(struct Stack *s, int value) {
    if (s->top == MAX - 1) {
        printf("Stack overflow\\n");
        return;
    }
    s->top++;
    s->items[s->top] = value;
}

int pop(struct Stack *s) {
    if (s->top == -1) {
        printf("Stack underflow\\n");
        return -1;
    }
    int item = s->items[s->top];
    s->top--;
    return item;
}

int main() {
    struct Stack myStack;
    init(&myStack);

    push(&myStack, 10);
    push(&myStack, 20);
    push(&myStack, 30);

    pop(&myStack);
    
    return 0;
}`
  }
};

// --- Interfaces ---
interface ExecutionState {
  line: number;
  variables: { name: string; value: string }[];
  arrayState: number[];
  stackState?: { items: number[], top: number };
  description: string;
  highlightedElements: number[];
  changedElements: number[];
}

const algorithmCategories = [
  { name: 'Sorting', icon: <BarChart3 className="h-4 w-4" />, algorithms: ['bubble-sort'] },
  { name: 'Data Structures', icon: <Database className="h-4 w-4"/>, algorithms: ['stack']}
];

// --- Helper Functions ---
const parseArrayFromString = (str: string): number[] => {
    const match = str.match(/{([0-9, ]+)}/);
    return match?.[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) ?? [];
};

const processBackendSteps = (backendSteps?: BackendStep[]): ExecutionState[] => {
    if (!backendSteps || backendSteps.length === 0) return [];

    let lastArray: number[] = [];

    return backendSteps.map(step => {
        const arrVar = step.variables.arr;
        const currentArray = arrVar ? parseArrayFromString(arrVar) : lastArray;
        
        // Attempt to parse stack data from dereferenced structs
        let stackState;
        if (step.dereferenced?.structures) {
            for (const s of step.dereferenced.structures) {
                const itemsMatch = s.match(/items\s*=\s*\{([0-9, ]+)\}/);
                const topMatch = s.match(/top\s*=\s*(-?\d+)/);
                if (itemsMatch && topMatch) {
                    stackState = {
                        items: itemsMatch[1].split(',').map((n: string) => parseInt(n.trim())),
                        top: parseInt(topMatch[1])
                    };
                    break; 
                }
            }
        }

        const changedIndices: number[] = [];
        if (lastArray.length === currentArray.length) {
            for(let i=0; i<currentArray.length; i++) {
                if(currentArray[i] !== lastArray[i]) {
                    changedIndices.push(i);
                }
            }
        }

        let description = `Executing line ${step.line}.`;
        if(step.changed_vars.length > 0) {
            description += ` Changed: ${step.changed_vars.map(v => `${v.name}`).join(', ')}.`;
        }
        if (changedIndices.length > 0) {
            description += ` Array elements at indices [${changedIndices.join(', ')}] were modified.`
        }

        const executionState: ExecutionState = {
            line: step.line,
            variables: Object.entries(step.variables).map(([name, value]) => ({ name, value })),
            arrayState: currentArray,
            stackState: stackState,
            description,
            highlightedElements: [], // Future enhancement
            changedElements: changedIndices,
        };
        
        lastArray = currentArray;
        return executionState;
    });
};

const defaultCode = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;

// --- Main Component ---
export default function CItVisualizer() {
    const [code, setCode] = useState(defaultCode);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('bubble-sort');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [speed, setSpeed] = useState([500]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const { executeCode, executionResult, error, isLoading } = useCodeExecution();
    const [executionStates, setExecutionStates] = useState<ExecutionState[]>([]);
    const [currentStep, setCurrentStep] = useState(0);

    const executionSteps = useMemo(() => processBackendSteps(executionResult?.steps), [executionResult]);
    const currentExecution = executionSteps[currentStepIndex] || null;

    // --- Handlers ---
    const handleExecute = () => {
        setIsPlaying(false);
        setCurrentStepIndex(0);
        executeCode(code);
    };

    const togglePlayPause = useCallback(() => setIsPlaying(p => !p), []);
    
    const stepForward = useCallback(() => {
        if (currentStepIndex < executionSteps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    }, [currentStepIndex, executionSteps.length]);

    const reset = useCallback(() => {
        setIsPlaying(false);
        setCurrentStepIndex(0);
    }, []);

    const toggleTheme = useCallback(() => setIsDarkMode(p => !p), []);
    
    const handleAlgorithmChange = useCallback((algKey: string) => {
        const template = algorithmTemplates[algKey as keyof typeof algorithmTemplates];
        if (template) {
            setSelectedAlgorithm(algKey);
            setCode(template.code);
            reset();
        }
    }, [reset]);

    const openPortfolio = useCallback(() => {
        window.open('https://portfolio-john-jandayan.vercel.app/', '_blank', 'noopener,noreferrer');
    }, []);

    const handleRunCode = () => {
        executeCode(code);
    };

    // --- Effects ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && currentStepIndex < executionSteps.length - 1) {
            interval = setInterval(stepForward, speed[0]);
        }
        return () => clearInterval(interval);
    }, [isPlaying, stepForward, speed, executionSteps.length]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        if (executionResult && executionResult.steps) {
            const newStates = processBackendSteps(executionResult.steps);
            setExecutionStates(newStates);
            setCurrentStep(0);
            setIsPlaying(false);
        }
    }, [executionResult]);

    // --- UI Rendering ---
    const renderArray = () => {
        if (!currentExecution || !currentExecution.arrayState || currentExecution.arrayState.length === 0) {
          return <div className="text-center text-gray-500 p-4">Run code to see visualization.</div>;
        }
        
        return (
            <div className="flex justify-center items-end space-x-2 flex-wrap p-4 min-h-[100px]">
                {currentExecution.arrayState.map((val, index) => {
                    const isChanged = currentExecution.changedElements.includes(index);
                    const classes = `w-14 h-14 flex items-center justify-center border-2 rounded-lg font-mono font-semibold shadow-sm transition-all duration-300 transform ${
                        isChanged ? 'border-red-500 bg-red-100 dark:bg-red-900 animate-pulse' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`;
                    return (
                        <div key={index} className="flex flex-col items-center">
                            <div className={classes}>{val}</div>
                            <div className="text-xs mt-1 text-gray-500">[{index}]</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStack = () => {
        if (!currentExecution || !currentExecution.stackState) {
            return <div className="text-center text-gray-500 p-4">No stack data for this step.</div>;
        }

        const { items, top } = currentExecution.stackState;

        return (
            <div className="flex justify-center p-4">
                <div className="border-2 border-gray-400 dark:border-gray-600 w-32 flex flex-col-reverse items-center p-2 min-h-[200px]">
                    {items.slice(0, top + 1).map((item, index) => (
                        <div key={index} className="w-full text-center bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 m-1 p-2 rounded">
                            {item}
                        </div>
                    )).reverse()}
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
            <header className="border-b bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">C-It</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
                                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="About the developer" onClick={openPortfolio}>
                                <User className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Code Editor</CardTitle>
                             <Select value={selectedAlgorithm} onValueChange={handleAlgorithmChange}>
                                <SelectTrigger><SelectValue placeholder="Select Algorithm" /></SelectTrigger>
                                <SelectContent>
                                    {algorithmCategories.map(cat => (
                                        <React.Fragment key={cat.name}>
                                            <div className="flex items-center space-x-2 px-2 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                              {cat.icon}<span>{cat.name}</span>
                                            </div>
                                            {cat.algorithms.map(alg => {
                                                const template = algorithmTemplates[alg as keyof typeof algorithmTemplates];
                                                return <SelectItem key={alg} value={alg} className="pl-6">{template.name}</SelectItem>
                                            })}
                                        </React.Fragment>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative font-mono text-sm">
                            <div className="absolute top-0 left-0 pt-4 pl-4 text-right select-none text-gray-500 leading-6">
                                {code.split('\n').map((_, i) => (
                                  <div key={i} className={`transition-colors duration-200 ${currentExecution?.line === i + 1 ? 'text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/50 rounded-l-md px-2 -ml-2' : ''}`}>
                                    {i + 1}
                                  </div>
                                ))}
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full h-full p-4 pl-12 bg-transparent resize-none focus:outline-none leading-6"
                                spellCheck={false}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Execution Controls</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <Button onClick={handleRunCode} disabled={isLoading} className="flex items-center space-x-2">
                                            {isLoading ? (
                                                <Loader className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Play className="h-5 w-5" />
                                            )}
                                            <span>{isLoading ? 'Running...' : 'Run Code'}</span>
                                        </Button>
                                        <Button onClick={togglePlayPause} variant="outline" disabled={!executionSteps.length}>{isPlaying ? <Pause/> : <Play />}</Button>
                                        <Button onClick={stepForward} variant="outline" disabled={!executionSteps.length}><SkipForward /></Button>
                                        <Button onClick={reset} variant="outline" disabled={!executionSteps.length}><RotateCcw /></Button>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm">Speed</span>
                                        <Slider defaultValue={[500]} value={speed} onValueChange={setSpeed} max={1000} min={100} step={100} className="w-24"/>
                                    </div>
                                </div>
                                <Separator />
                                <div className="mt-4 text-sm space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Step:</span>
                                      <span>{currentStepIndex + 1} / {executionSteps.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Current Line:</span>
                                      <span className="font-semibold">{currentExecution?.line || '-'}</span>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-gray-600 dark:text-gray-400">Description:</span>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-800 rounded mt-1 text-gray-800 dark:text-gray-200 min-h-[40px]">{currentExecution?.description || 'Awaiting execution...'}</p>
                                    </div>
                                </div>
                                {error && <div className="text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-900/50 rounded">Error: {error}</div>}
                            </CardContent>
                        </Card>
                        <Tabs defaultValue="array" className="flex-1">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="array">Array Visualization</TabsTrigger>
                                <TabsTrigger value="stack">Stack Visualization</TabsTrigger>
                                <TabsTrigger value="vars">Variables</TabsTrigger>
                            </TabsList>
                            <TabsContent value="array" className="mt-4">
                                {renderArray()}
                            </TabsContent>
                            <TabsContent value="stack" className="mt-4">
                                {renderStack()}
                            </TabsContent>
                            <TabsContent value="vars" className="mt-4 p-4 space-y-2">
                                {currentExecution?.variables.map((v, i) => (
                                    <div key={i} className="flex justify-between font-mono text-sm p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <span>{v.name}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{v.value}</span>
                                    </div>
                                ))}
                                {!currentExecution && <div className="text-center text-gray-500">No variable data.</div>}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
}