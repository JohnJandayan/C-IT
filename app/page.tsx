'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, User, Moon, Sun, Code, Database, Search, BarChart3, GitBranch, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Algorithm templates for different categories
const algorithmTemplates = {
  'bubble-sort': {
    name: 'Bubble Sort',
    category: 'Sorting',
    code: `#include <stdio.h>

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = 7;
    
    // Bubble Sort Algorithm
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                // Swap elements
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
    
    printf("Sorted array: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    
    return 0;
}`
  },
  'binary-search': {
    name: 'Binary Search',
    category: 'Searching',
    code: `#include <stdio.h>

int binarySearch(int arr[], int l, int r, int x) {
    if (r >= l) {
        int mid = l + (r - l) / 2;
        
        if (arr[mid] == x)
            return mid;
            
        if (arr[mid] > x)
            return binarySearch(arr, l, mid - 1, x);
            
        return binarySearch(arr, mid + 1, r, x);
    }
    
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    int n = 5;
    int x = 10;
    
    int result = binarySearch(arr, 0, n - 1, x);
    
    if (result == -1)
        printf("Element not found");
    else
        printf("Element found at index %d", result);
        
    return 0;
}`
  },
  'linked-list': {
    name: 'Linked List Operations',
    category: 'Data Structures',
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

void printList(struct Node* n) {
    while (n != NULL) {
        printf("%d ", n->data);
        n = n->next;
    }
    printf("\\n");
}

int main() {
    struct Node* head = NULL;
    struct Node* second = NULL;
    struct Node* third = NULL;
    
    // Allocate memory for nodes
    head = (struct Node*)malloc(sizeof(struct Node));
    second = (struct Node*)malloc(sizeof(struct Node));
    third = (struct Node*)malloc(sizeof(struct Node));
    
    head->data = 1;
    head->next = second;
    
    second->data = 2;
    second->next = third;
    
    third->data = 3;
    third->next = NULL;
    
    printList(head);
    
    return 0;
}`
  },
  'stack': {
    name: 'Stack Implementation',
    category: 'Data Structures',
    code: `#include <stdio.h>
#include <stdlib.h>
#define MAX 1000

struct Stack {
    int top;
    unsigned capacity;
    int* array;
};

struct Stack* createStack(unsigned capacity) {
    struct Stack* stack = (struct Stack*)malloc(sizeof(struct Stack));
    stack->capacity = capacity;
    stack->top = -1;
    stack->array = (int*)malloc(stack->capacity * sizeof(int));
    return stack;
}

int isFull(struct Stack* stack) {
    return stack->top == stack->capacity - 1;
}

int isEmpty(struct Stack* stack) {
    return stack->top == -1;
}

void push(struct Stack* stack, int item) {
    if (isFull(stack))
        return;
    stack->array[++stack->top] = item;
    printf("%d pushed to stack\\n", item);
}

int pop(struct Stack* stack) {
    if (isEmpty(stack))
        return -1;
    return stack->array[stack->top--];
}

int main() {
    struct Stack* stack = createStack(100);
    
    push(stack, 10);
    push(stack, 20);
    push(stack, 30);
    
    printf("%d popped from stack\\n", pop(stack));
    
    return 0;
}`
  },
  'dfs': {
    name: 'Depth-First Search',
    category: 'Graph Algorithms',
    code: `#include <stdio.h>
#include <stdlib.h>

#define V 4

void DFSUtil(int graph[V][V], int v, int visited[]) {
    visited[v] = 1;
    printf("%d ", v);
    
    for (int i = 0; i < V; i++) {
        if (graph[v][i] == 1 && !visited[i]) {
            DFSUtil(graph, i, visited);
        }
    }
}

void DFS(int graph[V][V], int start) {
    int visited[V] = {0};
    printf("DFS traversal starting from vertex %d: ", start);
    DFSUtil(graph, start, visited);
    printf("\\n");
}

int main() {
    int graph[V][V] = {
        {0, 1, 1, 0},
        {1, 0, 1, 1},
        {1, 1, 0, 1},
        {0, 1, 1, 0}
    };
    
    DFS(graph, 2);
    
    return 0;
}`
  }
};

interface Variable {
  name: string;
  value: string | number;
  type: string;
  scope?: string;
  isHighlighted?: boolean;
}

interface ExecutionState {
  currentLine: number;
  variables: Variable[];
  arrayState?: number[];
  stackState?: number[];
  queueState?: number[];
  treeState?: any;
  graphState?: any;
  step: number;
  description: string;
  memoryUsage: number;
  executionTime: number;
  highlightedElements?: number[];
  comparisonElements?: number[];
  swappingElements?: number[];
}

interface AlgorithmCategory {
  name: string;
  icon: React.ReactNode;
  algorithms: string[];
}

const algorithmCategories: AlgorithmCategory[] = [
  {
    name: 'Sorting',
    icon: <BarChart3 className="h-4 w-4" />,
    algorithms: ['bubble-sort', 'quick-sort', 'merge-sort', 'heap-sort', 'insertion-sort']
  },
  {
    name: 'Searching',
    icon: <Search className="h-4 w-4" />,
    algorithms: ['binary-search', 'linear-search', 'interpolation-search']
  },
  {
    name: 'Data Structures',
    icon: <Database className="h-4 w-4" />,
    algorithms: ['linked-list', 'stack', 'queue', 'binary-tree', 'hash-table']
  },
  {
    name: 'Graph Algorithms',
    icon: <GitBranch className="h-4 w-4" />,
    algorithms: ['dfs', 'bfs', 'dijkstra', 'kruskal', 'prim']
  },
  {
    name: 'Dynamic Programming',
    icon: <Hash className="h-4 w-4" />,
    algorithms: ['fibonacci', 'knapsack', 'lcs', 'edit-distance']
  }
];

// C Code Parser and Analyzer
class CCodeAnalyzer {
  static parseCode(code: string): ExecutionState[] {
    const lines = code.split('\n').filter(line => line.trim());
    const steps: ExecutionState[] = [];
    
    // Extract array initialization
    const arrayMatch = code.match(/int\s+(\w+)\[\]\s*=\s*\{([^}]+)\}/);
    let initialArray: number[] = [];
    let arrayName = 'arr';
    
    if (arrayMatch) {
      arrayName = arrayMatch[1];
      initialArray = arrayMatch[2].split(',').map(s => parseInt(s.trim()));
    }
    
    // Detect algorithm type
    const algorithmType = this.detectAlgorithmType(code);
    
    switch (algorithmType) {
      case 'bubble-sort':
        return this.generateBubbleSortSteps(initialArray, lines);
      case 'binary-search':
        return this.generateBinarySearchSteps(initialArray, lines);
      case 'stack':
        return this.generateStackSteps(lines);
      case 'linked-list':
        return this.generateLinkedListSteps(lines);
      default:
        return this.generateGenericSteps(initialArray, lines);
    }
  }
  
  static detectAlgorithmType(code: string): string {
    if (code.includes('bubble') || (code.includes('for') && code.includes('swap'))) {
      return 'bubble-sort';
    }
    if (code.includes('binarySearch') || code.includes('mid')) {
      return 'binary-search';
    }
    if (code.includes('Stack') || code.includes('push') || code.includes('pop')) {
      return 'stack';
    }
    if (code.includes('Node') || code.includes('next')) {
      return 'linked-list';
    }
    return 'generic';
  }
  
  static generateBubbleSortSteps(array: number[], lines: string[]): ExecutionState[] {
    const steps: ExecutionState[] = [];
    const arr = [...array];
    const n = arr.length;
    let stepCount = 0;
    
    // Initial state
    steps.push({
      currentLine: 1,
      variables: [
        { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
        { name: 'n', value: n, type: 'int' }
      ],
      arrayState: [...arr],
      step: stepCount++,
      description: 'Initializing array and variables for bubble sort',
      memoryUsage: 128 + (arr.length * 4),
      executionTime: 0,
      highlightedElements: []
    });
    
    // Bubble sort simulation
    for (let i = 0; i < n - 1; i++) {
      steps.push({
        currentLine: 5,
        variables: [
          { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
          { name: 'n', value: n, type: 'int' },
          { name: 'i', value: i, type: 'int', isHighlighted: true }
        ],
        arrayState: [...arr],
        step: stepCount++,
        description: `Starting outer loop iteration: i = ${i}`,
        memoryUsage: 132 + (arr.length * 4),
        executionTime: stepCount * 10,
        highlightedElements: []
      });
      
      for (let j = 0; j < n - i - 1; j++) {
        // Comparison step
        steps.push({
          currentLine: 6,
          variables: [
            { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
            { name: 'n', value: n, type: 'int' },
            { name: 'i', value: i, type: 'int' },
            { name: 'j', value: j, type: 'int', isHighlighted: true }
          ],
          arrayState: [...arr],
          step: stepCount++,
          description: `Comparing arr[${j}] (${arr[j]}) with arr[${j + 1}] (${arr[j + 1]})`,
          memoryUsage: 136 + (arr.length * 4),
          executionTime: stepCount * 10,
          highlightedElements: [j, j + 1],
          comparisonElements: [j, j + 1]
        });
        
        if (arr[j] > arr[j + 1]) {
          // Swap step
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          
          steps.push({
            currentLine: 8,
            variables: [
              { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
              { name: 'n', value: n, type: 'int' },
              { name: 'i', value: i, type: 'int' },
              { name: 'j', value: j, type: 'int' },
              { name: 'temp', value: temp, type: 'int', isHighlighted: true }
            ],
            arrayState: [...arr],
            step: stepCount++,
            description: `Swapping: ${temp} and ${arr[j + 1]} → Elements swapped!`,
            memoryUsage: 140 + (arr.length * 4),
            executionTime: stepCount * 10,
            highlightedElements: [j, j + 1],
            swappingElements: [j, j + 1]
          });
        }
      }
    }
    
    // Final sorted state
    steps.push({
      currentLine: lines.length,
      variables: [
        { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
        { name: 'n', value: n, type: 'int' }
      ],
      arrayState: [...arr],
      step: stepCount++,
      description: 'Array is now completely sorted!',
      memoryUsage: 128 + (arr.length * 4),
      executionTime: stepCount * 10,
      highlightedElements: Array.from({ length: arr.length }, (_, i) => i)
    });
    
    return steps;
  }
  
  static generateBinarySearchSteps(array: number[], lines: string[]): ExecutionState[] {
    const steps: ExecutionState[] = [];
    const arr = [...array].sort((a, b) => a - b); // Ensure sorted for binary search
    const target = arr[Math.floor(arr.length / 2)]; // Pick middle element as target
    let stepCount = 0;
    let left = 0;
    let right = arr.length - 1;
    
    steps.push({
      currentLine: 1,
      variables: [
        { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
        { name: 'target', value: target, type: 'int' },
        { name: 'left', value: left, type: 'int' },
        { name: 'right', value: right, type: 'int' }
      ],
      arrayState: [...arr],
      step: stepCount++,
      description: `Binary search for target: ${target}`,
      memoryUsage: 128 + (arr.length * 4),
      executionTime: 0,
      highlightedElements: [left, right]
    });
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      steps.push({
        currentLine: 4,
        variables: [
          { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
          { name: 'target', value: target, type: 'int' },
          { name: 'left', value: left, type: 'int' },
          { name: 'right', value: right, type: 'int' },
          { name: 'mid', value: mid, type: 'int', isHighlighted: true }
        ],
        arrayState: [...arr],
        step: stepCount++,
        description: `Checking middle element: arr[${mid}] = ${arr[mid]}`,
        memoryUsage: 132 + (arr.length * 4),
        executionTime: stepCount * 15,
        highlightedElements: [mid],
        comparisonElements: [mid]
      });
      
      if (arr[mid] === target) {
        steps.push({
          currentLine: 6,
          variables: [
            { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
            { name: 'target', value: target, type: 'int' },
            { name: 'result', value: mid, type: 'int', isHighlighted: true }
          ],
          arrayState: [...arr],
          step: stepCount++,
          description: `Found target ${target} at index ${mid}!`,
          memoryUsage: 136 + (arr.length * 4),
          executionTime: stepCount * 15,
          highlightedElements: [mid]
        });
        break;
      } else if (arr[mid] < target) {
        left = mid + 1;
        steps.push({
          currentLine: 10,
          variables: [
            { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
            { name: 'target', value: target, type: 'int' },
            { name: 'left', value: left, type: 'int', isHighlighted: true },
            { name: 'right', value: right, type: 'int' },
            { name: 'mid', value: mid, type: 'int' }
          ],
          arrayState: [...arr],
          step: stepCount++,
          description: `${arr[mid]} < ${target}, searching right half`,
          memoryUsage: 132 + (arr.length * 4),
          executionTime: stepCount * 15,
          highlightedElements: Array.from({ length: right - left + 1 }, (_, i) => left + i)
        });
      } else {
        right = mid - 1;
        steps.push({
          currentLine: 8,
          variables: [
            { name: 'arr', value: `[${arr.join(', ')}]`, type: 'int[]' },
            { name: 'target', value: target, type: 'int' },
            { name: 'left', value: left, type: 'int' },
            { name: 'right', value: right, type: 'int', isHighlighted: true },
            { name: 'mid', value: mid, type: 'int' }
          ],
          arrayState: [...arr],
          step: stepCount++,
          description: `${arr[mid]} > ${target}, searching left half`,
          memoryUsage: 132 + (arr.length * 4),
          executionTime: stepCount * 15,
          highlightedElements: Array.from({ length: right - left + 1 }, (_, i) => left + i)
        });
      }
    }
    
    return steps;
  }
  
  static generateStackSteps(lines: string[]): ExecutionState[] {
    const steps: ExecutionState[] = [];
    let stack: number[] = [];
    let stepCount = 0;
    
    const operations = [
      { op: 'push', value: 10 },
      { op: 'push', value: 20 },
      { op: 'push', value: 30 },
      { op: 'pop', value: null }
    ];
    
    steps.push({
      currentLine: 1,
      variables: [
        { name: 'stack', value: '[]', type: 'Stack' },
        { name: 'top', value: -1, type: 'int' }
      ],
      stackState: [...stack],
      step: stepCount++,
      description: 'Stack initialized (empty)',
      memoryUsage: 64,
      executionTime: 0
    });
    
    operations.forEach((operation, index) => {
      if (operation.op === 'push') {
        stack.push(operation.value!);
        steps.push({
          currentLine: 25 + index,
          variables: [
            { name: 'stack', value: `[${stack.join(', ')}]`, type: 'Stack' },
            { name: 'top', value: stack.length - 1, type: 'int' },
            { name: 'item', value: operation.value!, type: 'int', isHighlighted: true }
          ],
          stackState: [...stack],
          step: stepCount++,
          description: `Pushed ${operation.value} onto stack`,
          memoryUsage: 64 + (stack.length * 4),
          executionTime: stepCount * 12
        });
      } else if (operation.op === 'pop') {
        const poppedValue = stack.pop();
        steps.push({
          currentLine: 30 + index,
          variables: [
            { name: 'stack', value: `[${stack.join(', ')}]`, type: 'Stack' },
            { name: 'top', value: stack.length - 1, type: 'int' },
            { name: 'popped', value: poppedValue!, type: 'int', isHighlighted: true }
          ],
          stackState: [...stack],
          step: stepCount++,
          description: `Popped ${poppedValue} from stack`,
          memoryUsage: 64 + (stack.length * 4),
          executionTime: stepCount * 12
        });
      }
    });
    
    return steps;
  }
  
  static generateLinkedListSteps(lines: string[]): ExecutionState[] {
    const steps: ExecutionState[] = [];
    let stepCount = 0;
    
    const nodes = [
      { data: 1, next: 'second' },
      { data: 2, next: 'third' },
      { data: 3, next: 'NULL' }
    ];
    
    steps.push({
      currentLine: 1,
      variables: [
        { name: 'head', value: 'NULL', type: 'Node*' },
        { name: 'second', value: 'NULL', type: 'Node*' },
        { name: 'third', value: 'NULL', type: 'Node*' }
      ],
      step: stepCount++,
      description: 'Declaring node pointers',
      memoryUsage: 24,
      executionTime: 0
    });
    
    nodes.forEach((node, index) => {
      const nodeName = index === 0 ? 'head' : index === 1 ? 'second' : 'third';
      steps.push({
        currentLine: 15 + index * 3,
        variables: [
          { name: 'head', value: index >= 0 ? 'allocated' : 'NULL', type: 'Node*' },
          { name: 'second', value: index >= 1 ? 'allocated' : 'NULL', type: 'Node*' },
          { name: 'third', value: index >= 2 ? 'allocated' : 'NULL', type: 'Node*' },
          { name: `${nodeName}->data`, value: node.data, type: 'int', isHighlighted: true }
        ],
        step: stepCount++,
        description: `Allocated memory for ${nodeName} and set data = ${node.data}`,
        memoryUsage: 24 + ((index + 1) * 16),
        executionTime: stepCount * 8
      });
    });
    
    return steps;
  }
  
  static generateGenericSteps(array: number[], lines: string[]): ExecutionState[] {
    const steps: ExecutionState[] = [];
    let stepCount = 0;
    
    steps.push({
      currentLine: 1,
      variables: [
        { name: 'arr', value: `[${array.join(', ')}]`, type: 'int[]' },
        { name: 'n', value: array.length, type: 'int' }
      ],
      arrayState: [...array],
      step: stepCount++,
      description: 'Code execution started',
      memoryUsage: 128 + (array.length * 4),
      executionTime: 0
    });
    
    return steps;
  }
}

export default function CItVisualizer() {
  const [code, setCode] = useState(algorithmTemplates['bubble-sort'].code);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('bubble-sort');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [speed, setSpeed] = useState([500]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Generate execution steps dynamically from code
  const executionSteps = useMemo(() => {
    return CCodeAnalyzer.parseCode(code);
  }, [code]);

  const currentExecution = executionSteps[currentStepIndex] || executionSteps[0];

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

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

  const toggleTheme = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  const handleAlgorithmChange = useCallback((algorithmKey: string) => {
    if (algorithmTemplates[algorithmKey as keyof typeof algorithmTemplates]) {
      setSelectedAlgorithm(algorithmKey);
      setCode(algorithmTemplates[algorithmKey as keyof typeof algorithmTemplates].code);
      reset();
    }
  }, [reset]);

  const openPortfolio = useCallback(() => {
    window.open('https://portfolio-john-jandayan.vercel.app/', '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentStepIndex < executionSteps.length - 1) {
      interval = setInterval(() => {
        stepForward();
      }, speed[0]);
    } else if (currentStepIndex >= executionSteps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, stepForward, speed, currentStepIndex, executionSteps.length]);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Re-analyze code when it changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [code]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  C-It
                </h1>
              </div>
              <Badge variant="secondary" className="text-xs">
                C Code Visualizer
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={openPortfolio}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label="About the developer"
              >
                <User className="h-5 w-5" />
                <span className="ml-2 hidden sm:inline">Developer</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Code Editor Panel */}
          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>Code Editor</span>
                  <Badge className="text-xs">C</Badge>
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Lines: {code.split('\n').length}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Algorithm: {algorithmTemplates[selectedAlgorithm as keyof typeof algorithmTemplates]?.name}</span>
                </div>
              </div>
              
              {/* Algorithm Selection */}
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Template:</span>
                <Select value={selectedAlgorithm} onValueChange={handleAlgorithmChange}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select an algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithmCategories.map((category) => (
                      <div key={category.name}>
                        <div className="flex items-center space-x-2 px-2 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {category.icon}
                          <span>{category.name}</span>
                        </div>
                        {category.algorithms.map((alg) => {
                          const template = algorithmTemplates[alg as keyof typeof algorithmTemplates];
                          if (template) {
                            return (
                              <SelectItem key={alg} value={alg} className="pl-6">
                                {template.name}
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="h-full flex">
                {/* Line Numbers */}
                <div className="bg-gray-50 dark:bg-gray-800 px-3 py-4 text-sm text-gray-500 font-mono select-none border-r min-w-[3rem]">
                  {code.split('\n').map((_, index) => (
                    <div
                      key={index}
                      className={`leading-6 text-right transition-all duration-300 ${
                        index + 1 === currentExecution?.currentLine
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold px-2 -mx-2 rounded shadow-sm'
                          : ''
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                
                {/* Code Content */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 p-4 font-mono text-sm resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none leading-6 code-editor transition-colors duration-300"
                  spellCheck={false}
                  placeholder="Enter your C code here..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Visualization Panel */}
          <div className="flex flex-col space-y-4">
            
            {/* Control Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Execution Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={togglePlayPause}
                      variant={isPlaying ? "destructive" : "default"}
                      size="sm"
                      className="min-w-[80px] transition-all duration-200 hover:scale-105"
                    >
                      {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button onClick={stepForward} variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
                      <SkipForward className="h-4 w-4 mr-1" />
                      Step
                    </Button>
                    <Button onClick={reset} variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
                    <div className="w-24">
                      <Slider
                        value={speed}
                        onValueChange={setSpeed}
                        max={1000}
                        min={100}
                        step={100}
                        className="w-full"
                      />
                    </div>
                    <span className="text-xs text-gray-500 min-w-[40px]">{speed[0]}ms</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Step:</span>
                      <span className="font-semibold">{currentStepIndex + 1} / {executionSteps.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Line:</span>
                      <span className="font-semibold">{currentExecution?.currentLine || 1}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                      <span className="font-semibold">{currentExecution?.memoryUsage || 0} bytes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Time:</span>
                      <span className="font-semibold">{currentExecution?.executionTime || 0}ms</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Description:</span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-300">
                    {currentExecution?.description || 'Ready to execute...'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Visualization Tabs */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-lg">Data Structure Visualization</CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <Tabs defaultValue="array" className="h-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="array">Array</TabsTrigger>
                    <TabsTrigger value="stack">Stack</TabsTrigger>
                    <TabsTrigger value="tree">Tree</TabsTrigger>
                    <TabsTrigger value="graph">Graph</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="array" className="space-y-6 mt-4">
                    {/* Array Elements */}
                    <div className="flex justify-center">
                      <div className="flex space-x-2 flex-wrap justify-center">
                        {currentExecution?.arrayState?.map((value, index) => (
                          <div
                            key={index}
                            className={`w-14 h-14 flex items-center justify-center border-2 rounded-lg font-mono font-semibold shadow-sm array-element transition-all duration-500 transform ${
                              currentExecution.highlightedElements?.includes(index)
                                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 scale-110 shadow-lg'
                                : currentExecution.comparisonElements?.includes(index)
                                ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 scale-105 shadow-md animate-pulse'
                                : currentExecution.swappingElements?.includes(index)
                                ? 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 scale-105 shadow-md animate-bounce'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:scale-105'
                            }`}
                            style={{
                              animationDelay: `${index * 50}ms`
                            }}
                          >
                            {value}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Array Indices */}
                    <div className="flex justify-center">
                      <div className="flex space-x-2 flex-wrap justify-center">
                        {currentExecution?.arrayState?.map((_, index) => (
                          <div
                            key={index}
                            className={`w-14 h-6 flex items-center justify-center text-xs font-mono transition-all duration-300 ${
                              currentExecution.highlightedElements?.includes(index)
                                ? 'text-blue-600 dark:text-blue-400 font-bold'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            [{index}]
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="stack" className="space-y-4 mt-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Stack (LIFO)</div>
                      <div className="flex flex-col-reverse space-y-reverse space-y-2">
                        {currentExecution?.stackState?.map((value, index) => (
                          <div
                            key={index}
                            className="w-20 h-12 flex items-center justify-center border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900 rounded font-mono font-semibold text-blue-900 dark:text-blue-100 transition-all duration-500 transform hover:scale-105 shadow-sm"
                            style={{
                              animationDelay: `${index * 100}ms`,
                              animation: 'slideInUp 0.5s ease-out'
                            }}
                          >
                            {value}
                          </div>
                        ))}
                      </div>
                      <div className="w-24 h-2 bg-gray-400 dark:bg-gray-600 rounded-full mt-2"></div>
                      <div className="text-xs text-gray-500">Bottom</div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tree" className="mt-4">
                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Binary Tree Visualization</div>
                        <div className="space-y-6">
                          {/* Root */}
                          <div className="flex justify-center">
                            <div className="w-12 h-12 flex items-center justify-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900 rounded-full font-mono font-semibold text-green-900 dark:text-green-100 transition-all duration-500 hover:scale-110 shadow-lg animate-pulse">
                              1
                            </div>
                          </div>
                          {/* Connecting Lines */}
                          <div className="flex justify-center">
                            <div className="relative w-32 h-8">
                              <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-400 dark:bg-gray-600 transform -translate-x-1/2"></div>
                              <div className="absolute top-4 left-0 right-0 h-px bg-gray-400 dark:bg-gray-600"></div>
                              <div className="absolute top-4 left-0 w-px h-4 bg-gray-400 dark:bg-gray-600"></div>
                              <div className="absolute top-4 right-0 w-px h-4 bg-gray-400 dark:bg-gray-600"></div>
                            </div>
                          </div>
                          {/* Level 1 */}
                          <div className="flex justify-center space-x-16">
                            <div className="w-12 h-12 flex items-center justify-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900 rounded-full font-mono font-semibold text-green-900 dark:text-green-100 transition-all duration-500 hover:scale-110 shadow-lg">
                              2
                            </div>
                            <div className="w-12 h-12 flex items-center justify-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900 rounded-full font-mono font-semibold text-green-900 dark:text-green-100 transition-all duration-500 hover:scale-110 shadow-lg">
                              3
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="graph" className="mt-4">
                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Graph Visualization</div>
                        <div className="relative w-64 h-48">
                          {/* Edges */}
                          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                            <line x1="64" y1="32" x2="192" y2="32" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                            <line x1="64" y1="32" x2="64" y2="160" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                            <line x1="192" y1="32" x2="192" y2="160" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                            <line x1="64" y1="160" x2="192" y2="160" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                            <line x1="64" y1="32" x2="192" y2="160" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                            <line x1="192" y1="32" x2="64" y2="160" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                          </svg>
                          {/* Nodes */}
                          <div className="absolute top-4 left-12 w-10 h-10 flex items-center justify-center border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900 rounded-full font-mono font-semibold text-purple-900 dark:text-purple-100 transition-all duration-500 hover:scale-110 shadow-lg" style={{ zIndex: 2 }}>
                            A
                          </div>
                          <div className="absolute top-4 right-12 w-10 h-10 flex items-center justify-center border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900 rounded-full font-mono font-semibold text-purple-900 dark:text-purple-100 transition-all duration-500 hover:scale-110 shadow-lg" style={{ zIndex: 2 }}>
                            B
                          </div>
                          <div className="absolute bottom-4 left-12 w-10 h-10 flex items-center justify-center border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900 rounded-full font-mono font-semibold text-purple-900 dark:text-purple-100 transition-all duration-500 hover:scale-110 shadow-lg" style={{ zIndex: 2 }}>
                            C
                          </div>
                          <div className="absolute bottom-4 right-12 w-10 h-10 flex items-center justify-center border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900 rounded-full font-mono font-semibold text-purple-900 dark:text-purple-100 transition-all duration-500 hover:scale-110 shadow-lg" style={{ zIndex: 2 }}>
                            D
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Variables Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Variables & Memory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {currentExecution?.variables?.map((variable, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                        variable.isHighlighted
                          ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 shadow-md scale-105'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono text-sm font-semibold transition-colors duration-300 ${
                          variable.isHighlighted
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {variable.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {variable.type}
                        </Badge>
                        {variable.scope && (
                          <Badge variant="secondary" className="text-xs">
                            {variable.scope}
                          </Badge>
                        )}
                      </div>
                      <span className={`font-mono text-sm max-w-32 truncate transition-colors duration-300 ${
                        variable.isHighlighted
                          ? 'text-blue-900 dark:text-blue-100 font-bold'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {variable.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}