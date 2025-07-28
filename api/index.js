/**
 * Vercel API handler for C-It application
 */

module.exports = (req, res) => {
  // Get the request path
  const path = req.url || '/';
  
  // Handle different routes
  if (path.startsWith('/static/') || path === '/favicon.ico' || path === '/favicon.png') {
    // Return a simple favicon response
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.status(200).send('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚀</text></svg>');
    return;
  }
  
  // Route handling
  if (path === '/visualize' || path === '/visualizer') {
    return serveVisualizerPage(res);
  } else if (path === '/about') {
    return serveAboutPage(res);
  } else if (path === '/') {
    return serveHomePage(res);
  }
  
  // Default to home page
  return serveHomePage(res);
};

function serveHomePage(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>C-It - C Algorithm Visualizer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass-effect { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3); }
        .btn-secondary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); transition: all 0.3s ease; }
        .btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <a href="/" class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-code text-white text-sm"></i>
                        </div>
                        <span class="text-xl font-bold text-gray-900">C-It</span>
                    </a>
                </div>
                
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="/" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
                        <a href="/visualize" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Visualizer</a>
                        <a href="/about" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
                        <a href="https://portfolio-john-jandayan.vercel.app/" target="_blank" class="btn-primary text-white px-4 py-2 rounded-md text-sm font-medium">
                            <i class="fas fa-user mr-2"></i>Portfolio
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="min-h-screen">
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <!-- Hero Section -->
            <div class="container mx-auto px-4 py-16">
                <div class="text-center">
                    <h1 class="text-5xl font-bold text-gray-900 mb-6">
                        Welcome to <span class="text-blue-600">C-It</span>
                    </h1>
                    <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Interactive C algorithm visualizer for learning and understanding algorithms, 
                        data structures, and programming concepts with beautiful animations.
                    </p>
                    <div class="flex justify-center space-x-4">
                        <a href="/visualize" class="btn-primary text-white px-8 py-3 rounded-lg text-lg font-semibold">
                            <i class="fas fa-play mr-2"></i>Start Visualizing
                        </a>
                        <a href="/about" class="btn-secondary text-white px-8 py-3 rounded-lg text-lg font-semibold">
                            <i class="fas fa-info-circle mr-2"></i>Learn More
                        </a>
                    </div>
                </div>
            </div>

            <!-- Features Section -->
            <div class="container mx-auto px-4 py-16">
                <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">Features</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="bg-white rounded-lg p-6 shadow-lg card-hover">
                        <div class="text-4xl text-blue-600 mb-4">
                            <i class="fas fa-sort"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">Sorting Algorithms</h3>
                        <p class="text-gray-600">
                            Visualize bubble sort, quick sort, merge sort, insertion sort, and more with step-by-step animations.
                        </p>
                    </div>
                    <div class="bg-white rounded-lg p-6 shadow-lg card-hover">
                        <div class="text-4xl text-green-600 mb-4">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">Searching Algorithms</h3>
                        <p class="text-gray-600">
                            Explore linear search, binary search, and other searching techniques with interactive visualizations.
                        </p>
                    </div>
                    <div class="bg-white rounded-lg p-6 shadow-lg card-hover">
                        <div class="text-4xl text-purple-600 mb-4">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">Data Structures</h3>
                        <p class="text-gray-600">
                            Learn about linked lists, stacks, queues, trees, and hash maps with animated demonstrations.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div class="container mx-auto px-4 py-16">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
                    <h2 class="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
                    <p class="text-xl mb-6 opacity-90">
                        Join thousands of students and developers learning algorithms through interactive visualizations.
                    </p>
                    <a href="/visualize" class="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors">
                        <i class="fas fa-rocket mr-2"></i>Get Started Now
                    </a>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white">
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h3 class="text-lg font-semibold mb-4">C-It</h3>
                    <p class="text-gray-400">
                        Interactive C algorithm visualizer for learning and understanding algorithms, data structures, and programming concepts.
                    </p>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-4">Features</h3>
                    <ul class="text-gray-400 space-y-2">
                        <li><i class="fas fa-sort mr-2"></i>Sorting Algorithms</li>
                        <li><i class="fas fa-search mr-2"></i>Searching Algorithms</li>
                        <li><i class="fas fa-project-diagram mr-2"></i>Data Structures</li>
                        <li><i class="fas fa-chart-line mr-2"></i>Complexity Analysis</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-4">Connect</h3>
                    <div class="flex space-x-4">
                        <a href="https://portfolio-john-jandayan.vercel.app/" target="_blank" class="text-gray-400 hover:text-white transition-colors">
                            <i class="fas fa-globe text-xl"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 C-It. Built with ❤️ by John Jandayan</p>
            </div>
        </div>
    </footer>
</body>
</html>
  `);
}

function serveVisualizerPage(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>C-It - Algorithm Visualizer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .code-editor { background: #1e293b; border-radius: 8px; font-family: 'Fira Code', 'Monaco', 'Consolas', monospace; }
        .visualization-canvas { background: #f8fafc; border-radius: 8px; min-height: 400px; }
        .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3); }
        .btn-secondary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); transition: all 0.3s ease; }
        .btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); }
        .animation-step { transition: all 0.5s ease; }
        .highlight { background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%); padding: 2px 4px; border-radius: 4px; }
        .array-element { 
            transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); 
            transform-origin: center;
            animation: float 2s ease-in-out infinite;
        }
        .array-element:hover { 
            transform: scale(1.1) translateY(-5px); 
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        .array-element.comparing { 
            animation: pulse 0.8s ease-in-out infinite;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
            transform: scale(1.15);
        }
        .array-element.swapping { 
            animation: bounce 0.6s ease-in-out;
            background: linear-gradient(135deg, #10b981, #059669) !important;
        }
        .array-element.sorted { 
            background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
            animation: glow 1s ease-in-out infinite alternate;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        @keyframes glow {
            from { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
            to { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
        }
        .step-indicator {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 4px;
            transition: width 0.3s ease;
            animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <a href="/" class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-code text-white text-sm"></i>
                        </div>
                        <span class="text-xl font-bold text-gray-900">C-It</span>
                    </a>
                </div>
                
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="/" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
                        <a href="/visualize" class="text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Visualizer</a>
                        <a href="/about" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
                        <a href="https://portfolio-john-jandayan.vercel.app/" target="_blank" class="btn-primary text-white px-4 py-2 rounded-md text-sm font-medium">
                            <i class="fas fa-user mr-2"></i>Portfolio
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="min-h-screen py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">Algorithm Visualizer</h1>
                <p class="text-lg text-gray-600">Write your C code and watch it come to life with interactive visualizations</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Code Input Section -->
                <div class="space-y-4">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h2 class="text-xl font-semibold mb-4 text-gray-900">
                            <i class="fas fa-code mr-2 text-blue-600"></i>Code Input
                        </h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Algorithm Type</label>
                                <select id="algorithmType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="bubble-sort">Bubble Sort</option>
                                    <option value="quick-sort">Quick Sort</option>
                                    <option value="merge-sort">Merge Sort</option>
                                    <option value="insertion-sort">Insertion Sort</option>
                                    <option value="selection-sort">Selection Sort</option>
                                    <option value="binary-search">Binary Search</option>
                                    <option value="linear-search">Linear Search</option>
                                    <option value="linked-list">Linked List</option>
                                    <option value="stack">Stack</option>
                                    <option value="queue">Queue</option>
                                    <option value="binary-tree">Binary Tree</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Input Data</label>
                                <input type="text" id="inputData" placeholder="Enter numbers separated by commas (e.g., 64,34,25,12,22,11,90)" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">C Code</label>
                                <textarea id="codeInput" rows="15" 
                                          class="code-editor w-full p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="// Your C code will appear here based on the algorithm type">#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;

void bubbleSort(int arr[], int n) {
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
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr)/sizeof(arr[0]);
    
    printf("Original array: ");
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    
    bubbleSort(arr, n);
    
    printf("\\nSorted array: ");
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    
    return 0;
}</textarea>
                            </div>
                            <div class="flex space-x-4">
                                <button onclick="visualizeAlgorithm()" class="btn-primary text-white px-6 py-3 rounded-lg font-semibold flex-1">
                                    <i class="fas fa-play mr-2"></i>Visualize
                                </button>
                                <button onclick="resetVisualization()" class="btn-secondary text-white px-6 py-3 rounded-lg font-semibold">
                                    <i class="fas fa-redo mr-2"></i>Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Visualization Section -->
                <div class="space-y-4">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h2 class="text-xl font-semibold mb-4 text-gray-900">
                            <i class="fas fa-chart-line mr-2 text-green-600"></i>Visualization
                        </h2>
                        <div class="visualization-canvas p-6" id="visualizationCanvas">
                            <div class="text-center text-gray-500">
                                <i class="fas fa-play-circle text-4xl mb-4"></i>
                                <p>Click "Visualize" to see the algorithm in action</p>
                            </div>
                        </div>
                        <div class="mt-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm font-medium text-gray-700">Animation Speed</span>
                                <span id="speedValue" class="text-sm text-gray-500">Normal</span>
                            </div>
                            <input type="range" id="speedSlider" min="1" max="5" value="3" 
                                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Algorithm Information -->
            <div class="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold mb-4 text-gray-900">
                    <i class="fas fa-info-circle mr-2 text-purple-600"></i>Algorithm Information
                </h2>
                <div id="algorithmInfo" class="text-gray-600">
                    <p>Select an algorithm type to see detailed information about its complexity and implementation.</p>
                </div>
            </div>
        </div>
    </main>

    <script>
        // Algorithm information
        const algorithmInfo = {
            'bubble-sort': {
                name: 'Bubble Sort',
                timeComplexity: 'O(n²)',
                spaceComplexity: 'O(1)',
                description: 'A simple sorting algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.'
            },
            'quick-sort': {
                name: 'Quick Sort',
                timeComplexity: 'O(n log n)',
                spaceComplexity: 'O(log n)',
                description: 'A highly efficient, comparison-based sorting algorithm that uses a divide-and-conquer strategy.'
            },
            'merge-sort': {
                name: 'Merge Sort',
                timeComplexity: 'O(n log n)',
                spaceComplexity: 'O(n)',
                description: 'A stable, divide-and-conquer sorting algorithm that produces a sorted array by merging sorted subarrays.'
            },
            'insertion-sort': {
                name: 'Insertion Sort',
                timeComplexity: 'O(n²)',
                spaceComplexity: 'O(1)',
                description: 'A simple sorting algorithm that builds the final sorted array one item at a time.'
            },
            'selection-sort': {
                name: 'Selection Sort',
                timeComplexity: 'O(n²)',
                spaceComplexity: 'O(1)',
                description: 'A simple sorting algorithm that divides the input into a sorted and unsorted region.'
            },
            'binary-search': {
                name: 'Binary Search',
                timeComplexity: 'O(log n)',
                spaceComplexity: 'O(1)',
                description: 'An efficient search algorithm that finds the position of a target value within a sorted array.'
            },
            'linear-search': {
                name: 'Linear Search',
                timeComplexity: 'O(n)',
                spaceComplexity: 'O(1)',
                description: 'A simple search algorithm that checks each element in the list until the target is found.'
            }
        };

        // Update algorithm info when type changes
        document.getElementById('algorithmType').addEventListener('change', function() {
            updateAlgorithmInfo();
        });

        function updateAlgorithmInfo() {
            const type = document.getElementById('algorithmType').value;
            const info = algorithmInfo[type] || {};
            
            document.getElementById('algorithmInfo').innerHTML = \`
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h3 class="font-semibold text-gray-900">\${info.name || 'Algorithm'}</h3>
                        <p class="text-sm">\${info.description || 'Select an algorithm to see details.'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Time Complexity</h4>
                        <p class="text-sm text-blue-600">\${info.timeComplexity || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Space Complexity</h4>
                        <p class="text-sm text-green-600">\${info.spaceComplexity || 'N/A'}</p>
                    </div>
                </div>
            \`;
        }

        function visualizeAlgorithm() {
            const canvas = document.getElementById('visualizationCanvas');
            const type = document.getElementById('algorithmType').value;
            const input = document.getElementById('inputData').value;
            
            if (!input.trim()) {
                alert('Please enter input data');
                return;
            }

            // Parse input data
            const data = input.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
            
            if (data.length === 0) {
                alert('Please enter valid numbers');
                return;
            }

            // Show loading with animation
            canvas.innerHTML = \`
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-lg font-semibold text-gray-700 mb-2">Preparing Visualization</p>
                    <p class="text-sm text-gray-500">Setting up \${type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} algorithm...</p>
                    <div class="mt-4 flex justify-center space-x-1">
                        <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                        <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                        <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                    </div>
                </div>
            \`;

            // Simulate visualization
            setTimeout(() => {
                showVisualization(data, type);
            }, 1500);
        }

        function showVisualization(data, type) {
            const canvas = document.getElementById('visualizationCanvas');
            
            if (type.includes('sort')) {
                showSortingVisualization(data, type);
            } else if (type.includes('search')) {
                showSearchVisualization(data, type);
            } else {
                showDataStructureVisualization(data, type);
            }
        }

        function showSortingVisualization(data, type) {
            const canvas = document.getElementById('visualizationCanvas');
            const steps = generateSortingSteps(data, type);
            
            let currentStep = 0;
            const totalSteps = steps.length;
            
            function animateStep() {
                if (currentStep >= steps.length) {
                    // Show completion message
                    canvas.innerHTML = \`
                        <div class="text-center">
                            <div class="step-indicator mb-4">🎉 Algorithm Complete!</div>
                            <p class="text-sm text-gray-600 mb-4">All elements have been sorted successfully</p>
                            <div class="flex justify-center space-x-2">
                                \${steps[steps.length - 1].array.map((val, idx) => \`
                                    <div class="array-element sorted w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold">
                                        \${val}
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`;
                    return;
                }
                
                const step = steps[currentStep];
                const progress = ((currentStep + 1) / totalSteps) * 100;
                
                canvas.innerHTML = \`
                    <div class="text-center mb-4">
                        <div class="step-indicator mb-2">Step \${currentStep + 1} of \${totalSteps}</div>
                        <p class="text-sm text-gray-600 mb-3">\${step.description}</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: \${progress}%"></div>
                        </div>
                    </div>
                    <div class="flex justify-center space-x-3 mb-4">
                        \${step.array.map((val, idx) => {
                            let elementClass = 'array-element w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold';
                            
                            if (step.highlighted.includes(idx)) {
                                if (step.description.includes('Swapped')) {
                                    elementClass += ' swapping';
                                } else {
                                    elementClass += ' comparing';
                                }
                            } else if (step.sorted && step.sorted.includes(idx)) {
                                elementClass += ' sorted';
                            } else {
                                elementClass += ' bg-gray-500';
                            }
                            
                            return \`<div class="\${elementClass}">\${val}</div>\`;
                        }).join('')}
                    </div>
                    <div class="text-center text-xs text-gray-500">
                        Progress: \${Math.round(progress)}%
                    </div>
                \`;
                
                currentStep++;
                setTimeout(animateStep, 1200);
            }
            
            animateStep();
        }

        function generateSortingSteps(data, type) {
            const steps = [];
            const array = [...data];
            
            if (type === 'bubble-sort') {
                for (let i = 0; i < array.length - 1; i++) {
                    for (let j = 0; j < array.length - i - 1; j++) {
                        steps.push({
                            array: [...array],
                            description: \`Comparing \${array[j]} and \${array[j+1]}\`,
                            highlighted: [j, j+1],
                            sorted: Array.from({length: i}, (_, k) => array.length - 1 - k)
                        });
                        
                        if (array[j] > array[j+1]) {
                            [array[j], array[j+1]] = [array[j+1], array[j]];
                            steps.push({
                                array: [...array],
                                description: \`Swapped \${array[j]} and \${array[j+1]}\`,
                                highlighted: [j, j+1],
                                sorted: Array.from({length: i}, (_, k) => array.length - 1 - k)
                            });
                        }
                    }
                }
            }
            
            return steps;
        }

        function resetVisualization() {
            document.getElementById('visualizationCanvas').innerHTML = \`
                <div class="text-center text-gray-500">
                    <i class="fas fa-play-circle text-4xl mb-4"></i>
                    <p>Click "Visualize" to see the algorithm in action</p>
                </div>
            \`;
        }

        // Initialize
        updateAlgorithmInfo();
    </script>
</body>
</html>
  `);
}

function serveAboutPage(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>C-It - About</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass-effect { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <a href="/" class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-code text-white text-sm"></i>
                        </div>
                        <span class="text-xl font-bold text-gray-900">C-It</span>
                    </a>
                </div>
                
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="/" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
                        <a href="/visualize" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Visualizer</a>
                        <a href="/about" class="text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
                        <a href="https://portfolio-john-jandayan.vercel.app/" target="_blank" class="btn-primary text-white px-4 py-2 rounded-md text-sm font-medium">
                            <i class="fas fa-user mr-2"></i>Portfolio
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="min-h-screen py-8">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">About C-It</h1>
                <p class="text-xl text-gray-600">Interactive C Algorithm Visualizer</p>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">What is C-It?</h2>
                <p class="text-gray-600 mb-4">
                    C-It is an interactive algorithm visualizer designed to help students and developers understand 
                    C programming concepts through beautiful animations and step-by-step visualizations.
                </p>
                <p class="text-gray-600 mb-4">
                    Whether you're learning algorithms for the first time or brushing up on your skills, 
                    C-It provides an intuitive way to see how algorithms work in real-time.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">
                        <i class="fas fa-graduation-cap text-blue-600 mr-2"></i>Educational
                    </h3>
                    <p class="text-gray-600">
                        Perfect for students learning computer science, algorithms, and data structures. 
                        Visual learning makes complex concepts easier to understand.
                    </p>
                </div>
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">
                        <i class="fas fa-code text-green-600 mr-2"></i>Interactive
                    </h3>
                    <p class="text-gray-600">
                        Write your own C code or use our pre-built examples. Watch algorithms execute 
                        step-by-step with detailed explanations.
                    </p>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">About the Developer</h2>
                <div class="flex items-center space-x-4 mb-6">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-white text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-semibold text-gray-900">John Jandayan</h3>
                        <p class="text-gray-600">Computer Science Student & Developer</p>
                    </div>
                </div>
                <p class="text-gray-600 mb-4">
                    I'm a passionate developer with expertise in React and Django for web development. I also specialize in Python, C, and SQL. 
                    With a keen eye for design and a commitment to writing clean, efficient code, I desire to create and amplify memorable user experiences.
                </p>
                <p class="text-gray-600 mb-4">
                    Currently serving as the Caraga State University - Computer Science Society President for Academic Year 2025-2026, 
                    I'm focused on building accessible and helpful projects that make learning programming accessible to everyone.
                </p>
                <div class="flex space-x-4">
                    <a href="https://portfolio-john-jandayan.vercel.app/" target="_blank" 
                       class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        <i class="fas fa-globe mr-2"></i>View Portfolio
                    </a>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Technology Stack</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center">
                        <i class="fas fa-code text-4xl text-blue-600 mb-2"></i>
                        <h3 class="font-semibold text-gray-900">C Programming</h3>
                        <p class="text-sm text-gray-600">Core algorithm implementation</p>
                    </div>
                    <div class="text-center">
                        <i class="fab fa-js text-4xl text-yellow-600 mb-2"></i>
                        <h3 class="font-semibold text-gray-900">JavaScript</h3>
                        <p class="text-sm text-gray-600">Interactive visualizations</p>
                    </div>
                    <div class="text-center">
                        <i class="fab fa-css3 text-4xl text-blue-500 mb-2"></i>
                        <h3 class="font-semibold text-gray-900">Tailwind CSS</h3>
                        <p class="text-sm text-gray-600">Modern UI design</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white mt-16">
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <p>&copy; 2024 C-It. Built with ❤️ by John Jandayan</p>
            </div>
        </div>
    </footer>
</body>
</html>
  `);
} 