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
        .tree-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .tree-level {
            display: flex;
            gap: 40px;
        }
        .tree-node {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            animation: float 2s ease-in-out infinite;
        }
        .tree-node.root {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            transform: scale(1.2);
        }
        .list-node {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            animation: pulse 2s ease-in-out infinite;
        }
        .arrow {
            font-size: 24px;
            color: #6b7280;
            animation: slideRight 1s ease-in-out infinite;
        }
        @keyframes slideRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(5px); }
        }
        .stack-container, .queue-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: center;
        }
        .stack-item, .queue-item {
            width: 80px;
            height: 40px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            animation: slideIn 0.5s ease-out;
        }
        .stack-item {
            animation: stackSlide 0.5s ease-out;
        }
        .queue-item {
            animation: queueSlide 0.5s ease-out;
        }
        @keyframes stackSlide {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
         @keyframes queueSlide {
             from { transform: translateX(-20px); opacity: 0; }
             to { transform: translateX(0); opacity: 1; }
         }
         .pattern-display {
             font-family: 'Courier New', monospace;
             font-size: 18px;
             line-height: 1.2;
             background: #f8fafc;
             padding: 20px;
             border-radius: 8px;
             border: 2px solid #e2e8f0;
             text-align: left;
             color: #4a5568;
         }
         .loop-visualization {
             display: flex;
             flex-direction: column;
             align-items: center;
         }
         .loop-state {
             display: flex;
             flex-direction: column;
             gap: 10px;
             margin-bottom: 20px;
         }
         .outer-loop, .inner-loop {
             padding: 12px 20px;
             border-radius: 8px;
             font-weight: bold;
             text-align: center;
             transition: all 0.3s ease;
         }
         .outer-loop {
             background: #ddd6fe;
             color: #7c3aed;
             border: 2px solid #a78bfa;
         }
         .inner-loop {
             background: #bfdbfe;
             color: #2563eb;
             border: 2px solid #60a5fa;
         }
         .outer-loop.active, .inner-loop.active {
             animation: pulse 1s ease-in-out infinite;
         }
         .output-display {
             text-align: center;
         }
         .output-item {
             display: inline-block;
             padding: 6px 12px;
             margin: 2px;
             background: #f0f9ff;
             border: 1px solid #0ea5e9;
             border-radius: 6px;
             color: #0369a1;
             font-weight: bold;
         }
         .output-item.highlight {
             background: #fef3c7;
             border-color: #f59e0b;
             color: #92400e;
             animation: highlight 0.5s ease-in-out;
         }
         @keyframes highlight {
             0%, 100% { transform: scale(1); }
             50% { transform: scale(1.1); }
         }
         .variable-display {
             max-width: 400px;
             margin: 0 auto;
         }
         .current-operation {
             text-align: center;
         }
         .variable-table {
             display: flex;
             flex-direction: column;
             gap: 8px;
         }
         .variable-row {
             display: flex;
             align-items: center;
             justify-content: space-between;
             padding: 8px 16px;
             background: #f8fafc;
             border-radius: 6px;
             border: 1px solid #e2e8f0;
         }
         .variable-name {
             font-weight: bold;
             color: #4c51bf;
         }
         .variable-equals {
             color: #6b7280;
         }
         .variable-value {
             font-weight: bold;
             color: #059669;
         }
         .variable-item {
             padding: 8px 16px;
             margin: 4px;
             background: #ecfdf5;
             border: 1px solid #10b981;
             border-radius: 6px;
             color: #047857;
             font-weight: bold;
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
                            <i class="fas fa-code mr-2 text-blue-600"></i>C Code Input
                        </h2>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div class="flex items-center">
                                <i class="fas fa-magic text-blue-600 mr-2"></i>
                                <div>
                                    <h3 class="font-semibold text-blue-900">Smart Auto-Detection</h3>
                                    <p class="text-sm text-blue-700">Just paste your C code below - we'll automatically detect algorithms, data structures, patterns, and more!</p>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">C Code</label>
                                <textarea id="codeInput" rows="15" 
                                          class="code-editor w-full p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="// Paste your C code here - any algorithm, pattern, or general code&#10;// Examples you can try:&#10;// - Sorting algorithms (bubble sort, quick sort, etc.)&#10;// - Pattern printing (pyramids, stars, numbers)&#10;// - Array operations (sum, search, etc.)&#10;// - Loop structures (nested loops, etc.)&#10;// - Variable operations and arithmetic&#10;// - Data structures (linked lists, stacks, etc.)&#10;&#10;#include &lt;stdio.h&gt;&#10;&#10;int main() {&#10;    // Example: Pattern printing&#10;    for(int i = 1; i &lt;= 5; i++) {&#10;        for(int j = 1; j &lt;= i; j++) {&#10;            printf(&quot;* &quot;);&#10;        }&#10;        printf(&quot;\\n&quot;);&#10;    }&#10;    return 0;&#10;}">#include <stdio.h>

int main() {
    // Example: Pattern printing
    for(int i = 1; i <= 5; i++) {
        for(int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\n");
    }
    return 0;
}</textarea>
                            </div>
                            <div class="flex space-x-4">
                                <button onclick="analyzeAndVisualize()" class="btn-primary text-white px-6 py-3 rounded-lg font-semibold flex-1">
                                    <i class="fas fa-play mr-2"></i>Analyze & Visualize
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
                                <p>Click "Analyze & Visualize" to see your code in action</p>
                                <p class="text-sm mt-2">Try the example patterns or paste your own C code!</p>
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

            <!-- Code Analysis Results -->
            <div class="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold mb-4 text-gray-900">
                    <i class="fas fa-info-circle mr-2 text-purple-600"></i>Quick Examples
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="example-card p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onclick="loadExample('pattern')">
                        <h3 class="font-semibold text-gray-900 mb-2">🌟 Pattern Printing</h3>
                        <p class="text-sm text-gray-600">Star pyramids, triangles, and character patterns</p>
                    </div>
                    <div class="example-card p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onclick="loadExample('bubble-sort')">
                        <h3 class="font-semibold text-gray-900 mb-2">🔄 Bubble Sort</h3>
                        <p class="text-sm text-gray-600">Classic sorting algorithm visualization</p>
                    </div>
                    <div class="example-card p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onclick="loadExample('loops')">
                        <h3 class="font-semibold text-gray-900 mb-2">🔁 Nested Loops</h3>
                        <p class="text-sm text-gray-600">Loop execution and variable tracking</p>
                    </div>
                    <div class="example-card p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onclick="loadExample('array-ops')">
                        <h3 class="font-semibold text-gray-900 mb-2">📊 Array Operations</h3>
                        <p class="text-sm text-gray-600">Array access, modification, and processing</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        // Example code templates
        const codeExamples = {
            'pattern': '#include <stdio.h>\nint main() {\n    for(int i = 1; i <= 5; i++) {\n        for(int j = 1; j <= i; j++) {\n            printf("* ");\n        }\n        printf("\\n");\n    }\n    return 0;\n}',
            'bubble-sort': '#include <stdio.h>\nvoid bubbleSort(int arr[], int n) {\n    for (int i = 0; i < n-1; i++) {\n        for (int j = 0; j < n-i-1; j++) {\n            if (arr[j] > arr[j+1]) {\n                int temp = arr[j];\n                arr[j] = arr[j+1];\n                arr[j+1] = temp;\n            }\n        }\n    }\n}\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = sizeof(arr)/sizeof(arr[0]);\n    bubbleSort(arr, n);\n    return 0;\n}',
            'loops': '#include <stdio.h>\nint main() {\n    for(int i = 0; i < 3; i++) {\n        for(int j = 0; j < 4; j++) {\n            printf("(%d,%d) ", i, j);\n        }\n        printf("\\n");\n    }\n    return 0;\n}',
            'array-ops': '#include <stdio.h>\nint main() {\n    int arr[] = {5, 2, 8, 1, 9, 3};\n    int n = 6;\n    int sum = 0;\n    for(int i = 0; i < n; i++) {\n        sum += arr[i];\n    }\n    printf("Sum: %d\\n", sum);\n    return 0;\n}'
        };

        function loadExample(type) {
            const codeInput = document.getElementById('codeInput');
            if (codeExamples[type]) {
                codeInput.value = codeExamples[type];
                // Auto-analyze the loaded example
                setTimeout(() => {
                    analyzeAndVisualize();
                }, 500);
            }
        }

        function analyzeAndVisualize() {
            const canvas = document.getElementById('visualizationCanvas');
            const codeInput = document.getElementById('codeInput').value;
            
            if (!codeInput.trim()) {
                alert('Please enter C code to analyze');
                return;
            }
            
            // Show loading with animation
            canvas.innerHTML = 
                '<div class="text-center">' +
                    '<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>' +
                    '<p class="text-lg font-semibold text-gray-700 mb-2">Analyzing Code</p>' +
                    '<p class="text-sm text-gray-500">Detecting algorithms, data structures, patterns, and operations...</p>' +
                    '<div class="mt-4 flex justify-center space-x-1">' +
                        '<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>' +
                        '<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>' +
                        '<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>' +
                    '</div>' +
                '</div>';

            // Analyze the code
            setTimeout(() => {
                const analysis = analyzeCCode(codeInput);
                const sampleData = generateSampleData(analysis);
                
                // Store analysis for visualization
                window.customAnalysis = analysis;
                window.sampleData = sampleData;
                
                // Show analysis results first
                showCodeAnalysis(analysis, sampleData);
            }, 1500);
        }
        
        function showCodeAnalysis(analysis, sampleData) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Create algorithm tags
            let algorithmTags = '';
            if (analysis.algorithms.length > 0) {
                algorithmTags = analysis.algorithms.map(algo => 
                    '<span class="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">' + algo + '</span>'
                ).join('');
            }
            
            // Create pattern tags
            let patternTags = '';
            if (analysis.patterns.length > 0) {
                patternTags = analysis.patterns.map(pattern => 
                    '<span class="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm">' + pattern + '</span>'
                ).join('');
            }
            
            // Create operation tags
            let operationTags = '';
            if (analysis.operations.length > 0) {
                operationTags = analysis.operations.map(op => 
                    '<span class="bg-indigo-200 text-indigo-800 px-2 py-1 rounded text-sm">' + op + '</span>'
                ).join('');
            }
            
            // Format visualization type and code type
            const visualizationType = analysis.visualizationType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const codeType = analysis.codeType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            canvas.innerHTML = 
                '<div class="analysis-results">' +
                    '<div class="text-center mb-6">' +
                        '<div class="step-indicator mb-2">✅ Code Analysis Complete!</div>' +
                        '<p class="text-sm text-gray-600">Detected: ' + visualizationType + ' Visualization</p>' +
                    '</div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">' +
                        '<div class="bg-blue-50 p-4 rounded-lg">' +
                            '<h4 class="font-semibold text-blue-900 mb-2">Code Type:</h4>' +
                            '<span class="bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-medium">' + codeType + '</span>' +
                        '</div>' +
                        '<div class="bg-purple-50 p-4 rounded-lg">' +
                            '<h4 class="font-semibold text-purple-900 mb-2">Complexity:</h4>' +
                            '<span class="text-purple-700 text-sm font-medium">' + analysis.complexity + '</span>' +
                        '</div>' +
                    '</div>' +
                    (analysis.algorithms.length > 0 ? 
                        '<div class="bg-green-50 p-4 rounded-lg mb-4">' +
                            '<h4 class="font-semibold text-green-900 mb-2">Detected Algorithms:</h4>' +
                            '<div class="flex flex-wrap gap-2">' + algorithmTags + '</div>' +
                        '</div>' : '') +
                    (analysis.patterns.length > 0 ? 
                        '<div class="bg-yellow-50 p-4 rounded-lg mb-4">' +
                            '<h4 class="font-semibold text-yellow-900 mb-2">Detected Patterns:</h4>' +
                            '<div class="flex flex-wrap gap-2">' + patternTags + '</div>' +
                        '</div>' : '') +
                    (analysis.operations.length > 0 ? 
                        '<div class="bg-indigo-50 p-4 rounded-lg mb-4">' +
                            '<h4 class="font-semibold text-indigo-900 mb-2">Detected Operations:</h4>' +
                            '<div class="flex flex-wrap gap-2">' + operationTags + '</div>' +
                        '</div>' : '') +
                    '<div class="text-center">' +
                        '<button onclick="startAutoVisualization()" class="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">' +
                            '<i class="fas fa-play mr-2"></i>Start Visualization' +
                        '</button>' +
                    '</div>' +
                '</div>';
        }
        
        function startAutoVisualization() {
            const analysis = window.customAnalysis;
            const sampleData = window.sampleData;
            
            if (!analysis) {
                alert('Please analyze code first');
                return;
            }
            
            // Get the primary algorithm if any are detected
            let primaryAlgorithm = 'Custom Code';
            if (analysis.algorithms.length > 0) {
                primaryAlgorithm = analysis.algorithms[0];
            }
            
            // Show adaptive visualization using the enhanced routing system
            showAdaptiveVisualization(sampleData, primaryAlgorithm, analysis.visualizationType, analysis);
        }

        // Legacy function - no longer used in auto-detection system

        function showCustomVisualization() {
            const canvas = document.getElementById('visualizationCanvas');
            const codeInput = document.getElementById('codeInput').value;
            
            // Analyze the C code
            const analysis = analyzeCCode(codeInput);
            
            // Generate sample data for visualization
            const sampleData = generateSampleData(analysis);
            
            // Simple display without complex template literals
            canvas.innerHTML = '<div class="text-center"><h3>Code Analysis Complete</h3><p>Your code has been analyzed successfully!</p><button onclick="startCustomVisualization()" class="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">Start Visualization</button></div>';
            
            // Store analysis for visualization
            window.customAnalysis = analysis;
            window.sampleData = sampleData;
        }

        function startCustomVisualization() {
            const canvas = document.getElementById('visualizationCanvas');
            const analysis = window.customAnalysis;
            const sampleData = window.sampleData;
            
            if (!analysis) {
                canvas.innerHTML = 
                    '<div class="text-center text-gray-500">' +
                        '<i class="fas fa-exclamation-circle text-4xl mb-4"></i>' +
                        '<p>Please analyze code first by entering code in the input area.</p>' +
                    '</div>';
                return;
            }
            
            // Use the enhanced analysis system
            let primaryAlgorithm = 'Custom Code';
            
            // Get the primary algorithm if any are detected
            if (analysis.algorithms.length > 0) {
                primaryAlgorithm = analysis.algorithms[0];
            }
            
            // Show adaptive visualization using the enhanced routing system
            showAdaptiveVisualization(sampleData, primaryAlgorithm, analysis.visualizationType, analysis);
        }

        function showAdaptiveVisualization(data, algorithm, type, analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Route to appropriate visualization based on analysis
            switch (analysis.visualizationType) {
                case 'sort':
                    showSortingVisualization(data, algorithm.replace(' ', '-'));
                    break;
                case 'search':
                    showSearchVisualization(data, algorithm.replace(' ', '-'));
                    break;
                case 'pattern':
                    showPatternVisualization(analysis);
                    break;
                case 'loop-flow':
                    showLoopFlowVisualization(analysis);
                    break;
                case 'array-operations':
                    showArrayOperationsVisualization(analysis);
                    break;
                case 'variable-flow':
                    showVariableFlowVisualization(analysis);
                    break;
                case 'tree':
                    showTreeVisualization(data, analysis);
                    break;
                case 'list':
                    showLinkedListVisualization(data, analysis);
                    break;
                case 'stack-queue':
                    showStackQueueVisualization(data, analysis);
                    break;
                default:
                    // Generic visualization for any algorithm
                    showGenericVisualization(data, algorithm, analysis);
            }
        }

        function showGenericVisualization(data, algorithm, analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            const steps = generateGenericSteps(data, algorithm, analysis);
            
            let currentStep = 0;
            const totalSteps = steps.length;
            
            function animateStep() {
                if (currentStep >= steps.length) {
                    const finalElements = steps[steps.length - 1].elements.map((val, idx) => 
                        '<div class="array-element sorted w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold">' + val + '</div>'
                    ).join('');
                    
                    canvas.innerHTML = 
                        '<div class="text-center">' +
                            '<div class="step-indicator mb-4">🎉 Algorithm Complete!</div>' +
                            '<p class="text-sm text-gray-600 mb-4">' + algorithm + ' visualization finished</p>' +
                            '<div class="flex justify-center space-x-2">' + finalElements + '</div>' +
                        '</div>';
                    return;
                }
                
                const step = steps[currentStep];
                const progress = ((currentStep + 1) / totalSteps) * 100;
                
                const stepElements = step.elements.map((val, idx) => {
                    let elementClass = 'array-element w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold';
                    
                    if (step.highlighted.includes(idx)) {
                        elementClass += ' comparing';
                    } else if (step.processed && step.processed.includes(idx)) {
                        elementClass += ' sorted';
                    } else {
                        elementClass += ' bg-gray-500';
                    }
                    
                    return '<div class="' + elementClass + '">' + val + '</div>';
                }).join('');
                
                canvas.innerHTML = 
                    '<div class="text-center mb-4">' +
                        '<div class="step-indicator mb-2">Step ' + (currentStep + 1) + ' of ' + totalSteps + '</div>' +
                        '<p class="text-sm text-gray-600 mb-3">' + step.description + '</p>' +
                        '<div class="progress-bar">' +
                            '<div class="progress-fill" style="width: ' + progress + '%"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex justify-center space-x-3 mb-4">' + stepElements + '</div>' +
                    '<div class="text-center text-xs text-gray-500">Progress: ' + Math.round(progress) + '%</div>';
                
                currentStep++;
                setTimeout(animateStep, 1200);
            }
            
            animateStep();
        }

        function generateGenericSteps(data, algorithm, analysis) {
            const steps = [];
            const elements = [...data];
            
            // Generate steps based on algorithm type
            if (algorithm.includes('sort')) {
                // Generic sorting visualization
                for (let i = 0; i < elements.length - 1; i++) {
                    for (let j = 0; j < elements.length - i - 1; j++) {
                        steps.push({
                            elements: [...elements],
                            description: 'Comparing elements',
                            highlighted: [j, j+1],
                            processed: []
                        });
                        
                        if (elements[j] > elements[j+1]) {
                            [elements[j], elements[j+1]] = [elements[j+1], elements[j]];
                            steps.push({
                                elements: [...elements],
                                description: 'Swapping elements',
                                highlighted: [j, j+1],
                                processed: []
                            });
                        }
                    }
                }
            } else if (algorithm.includes('search')) {
                // Generic search visualization
                const target = Math.floor(Math.random() * Math.max(...elements)) + 1;
                for (let i = 0; i < elements.length; i++) {
                    steps.push({
                        elements: [...elements],
                        description: 'Searching for ' + target,
                        highlighted: [i],
                        processed: elements.slice(0, i)
                    });
                    
                    if (elements[i] === target) {
                        steps.push({
                            elements: [...elements],
                            description: 'Target found!',
                            highlighted: [i],
                            processed: elements.slice(0, i+1)
                        });
                        break;
                    }
                }
            }
            
            return steps;
        }

        function generateSampleData(analysis) {
            // Generate appropriate sample data based on detected algorithms and data structures
            switch (analysis.visualizationType) {
                case 'sort':
                case 'search':
                    return [64, 34, 25, 12, 22, 11, 90];
                case 'pattern':
                    return null; // No data needed for pattern visualization
                case 'loop-flow':
                    return null; // No data needed for loop flow visualization
                case 'array-operations':
                    return [5, 2, 8, 1, 9, 3];
                case 'variable-flow':
                    return null; // Uses variables from analysis
                case 'tree':
                    return [10, 5, 15, 3, 7, 12, 18];
                case 'list':
                    return [1, 2, 3, 4, 5, 6, 7, 8];
                case 'stack-queue':
                    return [8, 7, 6, 5, 4, 3, 2, 1];
                default:
                    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            }
        }

        function analyzeCCode(code) {
            const analysis = {
                algorithms: [],
                dataStructures: [],
                complexity: 'Unable to determine complexity',
                structure: [],
                codeType: 'general', // New field to identify code type
                patterns: [], // New field for detected patterns
                operations: [], // New field for detected operations
                visualizationType: 'flow', // Default visualization type
                loops: [], // Track loop information
                variables: [], // Track variables
                outputs: [] // Track print statements
            };
            
            const codeLower = code.toLowerCase();
            const lines = code.split('\n').filter(line => line.trim() !== '');
            
            // Detect algorithms
            if (codeLower.includes('bubble') || (codeLower.includes('for') && codeLower.includes('swap'))) {
                analysis.algorithms.push('Bubble Sort');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'sort';
            }
            if (codeLower.includes('quick') || codeLower.includes('pivot')) {
                analysis.algorithms.push('Quick Sort');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'sort';
            }
            if (codeLower.includes('merge') || codeLower.includes('divide')) {
                analysis.algorithms.push('Merge Sort');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'sort';
            }
            if (codeLower.includes('insert') || codeLower.includes('shift')) {
                analysis.algorithms.push('Insertion Sort');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'sort';
            }
            if (codeLower.includes('select') || codeLower.includes('minimum')) {
                analysis.algorithms.push('Selection Sort');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'sort';
            }
            if (codeLower.includes('binary') && codeLower.includes('search')) {
                analysis.algorithms.push('Binary Search');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'search';
            }
            if (codeLower.includes('linear') || codeLower.includes('sequential')) {
                analysis.algorithms.push('Linear Search');
                analysis.codeType = 'algorithm';
                analysis.visualizationType = 'search';
            }
            
            // Detect data structures
            if (codeLower.includes('struct') && codeLower.includes('next')) {
                analysis.dataStructures.push('Linked List');
            }
            if (codeLower.includes('stack') || codeLower.includes('push') || codeLower.includes('pop')) {
                analysis.dataStructures.push('Stack');
            }
            if (codeLower.includes('queue') || codeLower.includes('enqueue') || codeLower.includes('dequeue')) {
                analysis.dataStructures.push('Queue');
            }
            if (codeLower.includes('tree') || (codeLower.includes('node') && codeLower.includes('left') && codeLower.includes('right'))) {
                analysis.dataStructures.push('Binary Tree');
            }
            if (codeLower.includes('hash') || codeLower.includes('map')) {
                analysis.dataStructures.push('Hash Map');
            }
            if (codeLower.includes('array') || (codeLower.includes('[') && codeLower.includes(']'))) {
                analysis.dataStructures.push('Array');
            }
            
            // Detect patterns and visual structures
            const starPattern = /printf.*\*|cout.*\*/g;
            const hashPattern = /printf.*#|cout.*#/g;
            const spacePattern = /printf.*%d|cout.*<<.*<<|printf.*" "/g;
            
            if (starPattern.test(code) || hashPattern.test(code)) {
                analysis.patterns.push('Character Pattern');
                analysis.codeType = 'pattern';
                analysis.visualizationType = 'pattern';
            }
            
            if (codeLower.includes('pyramid') || codeLower.includes('triangle')) {
                analysis.patterns.push('Pyramid/Triangle');
                analysis.codeType = 'pattern';
                analysis.visualizationType = 'pattern';
            }
            
            if (codeLower.includes('diamond')) {
                analysis.patterns.push('Diamond');
                analysis.codeType = 'pattern';
                analysis.visualizationType = 'pattern';
            }
            
            // Detect nested loops for pattern generation
            const forLoops = (code.match(/for\s*\(/g) || []).length;
            const whileLoops = (code.match(/while\s*\(/g) || []).length;
            
            if (forLoops >= 2) {
                analysis.patterns.push('Nested Loop Pattern');
                if (analysis.codeType === 'general') {
                    analysis.codeType = 'nested-loop';
                    analysis.visualizationType = 'loop-flow';
                }
            }
            
            // Detect operations
            if (codeLower.includes('printf') || codeLower.includes('cout')) {
                analysis.operations.push('Output');
                const printMatches = code.match(/printf\s*\([^)]*\)|cout\s*<<[^;]*/g) || [];
                analysis.outputs = printMatches.slice(0, 10); // Limit to first 10
            }
            if (codeLower.includes('scanf') || codeLower.includes('cin')) {
                analysis.operations.push('Input');
            }
            if (codeLower.includes('=') && !codeLower.includes('==')) {
                analysis.operations.push('Assignment');
                // Extract variable assignments
                const assignments = code.match(/\w+\s*=\s*[^;]+/g) || [];
                analysis.variables = assignments.slice(0, 5).map(assign => assign.trim());
            }
            if (codeLower.includes('++') || codeLower.includes('--')) {
                analysis.operations.push('Increment/Decrement');
            }
            if (codeLower.includes('+') || codeLower.includes('-') || codeLower.includes('*') || codeLower.includes('/')) {
                analysis.operations.push('Arithmetic');
            }
            
            // Analyze structure
            analysis.structure.push(lines.length} lines of code');
            
            if (codeLower.includes('main')) {
                analysis.structure.push('Contains main function');
            }
            if (forLoops > 0) {
                analysis.structure.push(forLoops + ' for loop(s)');
                analysis.loops.push('for loops: ' + forLoops);
            }
            if (whileLoops > 0) {
                analysis.structure.push(whileLoops + ' while loop(s)');
                analysis.loops.push('while loops: ' + whileLoops);
            }
            if (codeLower.includes('if') || codeLower.includes('else')) {
                const ifCount = (code.match(/if\s*\(/g) || []).length;
                analysis.structure.push(ifCount + ' conditional statement(s)');
            }
            if (analysis.operations.includes('Output')) {
                const printCount = (code.match(/printf|cout/g) || []).length;
                analysis.structure.push(printCount + ' output statement(s)');
            }
            if (codeLower.includes('malloc') || codeLower.includes('free')) {
                analysis.structure.push('Dynamic memory allocation');
            }
            
            // Determine visualization type if not already set
            if (analysis.visualizationType === 'flow') {
                if (analysis.patterns.length > 0) {
                    analysis.visualizationType = 'pattern';
                } else if (forLoops >= 2 || (forLoops > 0 && analysis.operations.includes('Output'))) {
                    analysis.visualizationType = 'loop-flow';
                } else if (analysis.dataStructures.includes('Array')) {
                    analysis.visualizationType = 'array-operations';
                } else if (analysis.operations.length > 0) {
                    analysis.visualizationType = 'variable-flow';
                }
            }
            
            // Estimate complexity
            if (forLoops >= 3) {
                analysis.complexity = 'O(n³) - Cubic time';
            } else if (forLoops >= 2) {
                analysis.complexity = 'O(n²) - Quadratic time';
            } else if (forLoops === 1 || whileLoops > 0) {
                analysis.complexity = 'O(n) - Linear time';
            } else if (analysis.algorithms.some(algo => algo.includes('Binary Search'))) {
                analysis.complexity = 'O(log n) - Logarithmic time';
            } else {
                analysis.complexity = 'O(1) - Constant time';
            }
            
            return analysis;
        }

        function showSortingVisualization(data, type) {
            const canvas = document.getElementById('visualizationCanvas');
            const steps = generateSortingSteps(data, type);
            
            let currentStep = 0;
            const totalSteps = steps.length;
            
            function animateStep() {
                if (currentStep >= steps.length) {
                    // Show completion message
                    const finalElements = steps[steps.length - 1].array.map((val, idx) => 
                        '<div class="array-element sorted w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold">' + val + '</div>'
                    ).join('');
                    
                    canvas.innerHTML = 
                        '<div class="text-center">' +
                            '<div class="step-indicator mb-4">🎉 Algorithm Complete!</div>' +
                            '<p class="text-sm text-gray-600 mb-4">All elements have been sorted successfully</p>' +
                            '<div class="flex justify-center space-x-2">' + finalElements + '</div>' +
                        '</div>';
                    return;
                }
                
                const step = steps[currentStep];
                const progress = ((currentStep + 1) / totalSteps) * 100;
                
                const stepElements = step.array.map((val, idx) => {
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
                    
                    return '<div class="' + elementClass + '">' + val + '</div>';
                }).join('');
                
                canvas.innerHTML = 
                    '<div class="text-center mb-4">' +
                        '<div class="step-indicator mb-2">Step ' + (currentStep + 1) + ' of ' + totalSteps + '</div>' +
                        '<p class="text-sm text-gray-600 mb-3">' + step.description + '</p>' +
                        '<div class="progress-bar">' +
                            '<div class="progress-fill" style="width: ' + progress + '%"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex justify-center space-x-3 mb-4">' + stepElements + '</div>' +
                    '<!-- Color Legend -->' +
                    '<div class="mt-4 p-3 bg-gray-50 rounded-lg">' +
                        '<h4 class="text-sm font-semibold text-gray-700 mb-2">Legend:</h4>' +
                        '<div class="flex flex-wrap gap-3 text-xs">' +
                            '<div class="flex items-center space-x-2">' +
                                '<div class="w-4 h-4 bg-gray-500 rounded"></div>' +
                                '<span>Normal</span>' +
                            '</div>' +
                            '<div class="flex items-center space-x-2">' +
                                '<div class="w-4 h-4 bg-blue-600 rounded"></div>' +
                                '<span>Comparing</span>' +
                            '</div>' +
                            '<div class="flex items-center space-x-2">' +
                                '<div class="w-4 h-4 bg-green-600 rounded"></div>' +
                                '<span>Swapping</span>' +
                            '</div>' +
                            '<div class="flex items-center space-x-2">' +
                                '<div class="w-4 h-4 bg-purple-600 rounded"></div>' +
                                '<span>Sorted</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="text-center text-xs text-gray-500">Progress: ' + Math.round(progress) + '%</div>';
                
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
                            description: 'Comparing ' + array[j] + ' and ' + array[j+1],
                            highlighted: [j, j+1],
                            sorted: Array.from({length: i + ', (_, k) => array.length - 1 - k)
                        });
                        
                        if (array[j] > array[j+1]) {
                            [array[j], array[j+1]] = [array[j+1], array[j]];
                            steps.push({
                                array: [...array],
                                description: 'Swapped ' + array[j] + ' and ' + array[j+1],
                                highlighted: [j, j+1],
                                sorted: Array.from({length: i + ', (_, k) => array.length - 1 - k)
                            });
                        }
                    }
                }
            } else if (type === 'insertion-sort') {
                for (let i = 1; i < array.length; i++) {
                    const key = array[i];
                    let j = i - 1;
                    
                    steps.push({
                        array: [...array],
                        description: 'Selecting ' + key + ' for insertion',
                        highlighted: [i],
                        sorted: Array.from({length: i + ', (_, k) => k)
                    });
                    
                    while (j >= 0 && array[j] > key) {
                        steps.push({
                            array: [...array],
                            description: 'Comparing ' + array[j] + ' with ' + key,
                            highlighted: [j, j+1],
                            sorted: Array.from({length: i + ', (_, k) => k)
                        });
                        
                        array[j + 1] = array[j];
                        j--;
                        
                        steps.push({
                            array: [...array],
                            description: 'Shifting ' + array[j+1] + ' to the right',
                            highlighted: [j+1],
                            sorted: Array.from({length: i + ', (_, k) => k)
                        });
                    }
                    
                    array[j + 1] = key;
                    steps.push({
                        array: [...array],
                        description: 'Inserted ' + key + ' at position ' + (j+1),
                        highlighted: [j+1],
                        sorted: Array.from({length: i+1}, (_, k) => k)
                    });
                }
            } else if (type === 'selection-sort') {
                for (let i = 0; i < array.length - 1; i++) {
                    let minIdx = i;
                    
                    steps.push({
                        array: [...array],
                        description: 'Finding minimum in unsorted portion',
                        highlighted: [i],
                        sorted: Array.from({length: i + ', (_, k) => k)
                    });
                    
                    for (let j = i + 1; j < array.length; j++) {
                        steps.push({
                            array: [...array],
                            description: 'Comparing ' + array[j] + ' with current minimum ' + array[minIdx],
                            highlighted: [j, minIdx],
                            sorted: Array.from({length: i + ', (_, k) => k)
                        });
                        
                        if (array[j] < array[minIdx]) {
                            minIdx = j;
                            steps.push({
                                array: [...array],
                                description: 'New minimum found: ' + array[minIdx],
                                highlighted: [minIdx],
                                sorted: Array.from({length: i + ', (_, k) => k)
                            });
                        }
                    }
                    
                    if (minIdx !== i) {
                        [array[i], array[minIdx]] = [array[minIdx], array[i]];
                        steps.push({
                            array: [...array],
                            description: 'Swapped ' + array[i] + ' with ' + array[minIdx],
                            highlighted: [i, minIdx],
                            sorted: Array.from({length: i+1}, (_, k) => k)
                        });
                    }
                }
            }
            
            return steps;
        }

        function showSearchVisualization(data, type) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Simple linear search visualization
            const target = Math.floor(Math.random() * Math.max(...data)) + 1;
            let foundIndex = -1;
            
            const searchElements = data.map((val, idx) => 
                '<div class="array-element w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold ' + (idx === foundIndex ? 'comparing' : '')}">' + val + '</div>'
            ).join('');
            
            canvas.innerHTML = 
                '<div class="text-center mb-4">' +
                    '<div class="step-indicator mb-2">Linear Search</div>' +
                    '<p class="text-sm text-gray-600 mb-3">Searching for ' + target + '</p>' +
                '</div>' +
                '<div class="flex justify-center space-x-3">' + searchElements + '</div>' +
                '<div class="mt-4 text-center text-sm text-gray-600">' +
                    '<p>Searching through: ' + data.join(', ') + '</p>' +
                '</div>';
        }

        function showTreeVisualization(data, analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Create a simple binary tree visualization
            const treeData = [10, 5, 15, 3, 7, 12, 18];
            
            canvas.innerHTML = 
                '<div class="text-center mb-4">' +
                    '<div class="step-indicator mb-2">Binary Tree Visualization</div>' +
                    '<p class="text-sm text-gray-600 mb-3">Tree traversal and operations</p>' +
                '</div>' +
                '<div class="flex justify-center">' +
                    '<div class="tree-container">' +
                        '<div class="tree-node root">10</div>' +
                        '<div class="tree-level">' +
                            '<div class="tree-node left">5</div>' +
                            '<div class="tree-node right">15</div>' +
                        '</div>' +
                        '<div class="tree-level">' +
                            '<div class="tree-node left">3</div>' +
                            '<div class="tree-node right">7</div>' +
                            '<div class="tree-node left">12</div>' +
                            '<div class="tree-node right">18</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="mt-4 text-center text-sm text-gray-600">' +
                    '<p>Inorder: 3, 5, 7, 10, 12, 15, 18</p>' +
                    '<p>Preorder: 10, 5, 3, 7, 15, 12, 18</p>' +
                    '<p>Postorder: 3, 7, 5, 12, 18, 15, 10</p>' +
                '</div>';
        }

        function showLinkedListVisualization(data, analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            const listData = [1, 2, 3, 4, 5, 6, 7, 8];
            
            const listElements = listData.map((val, idx) => 
                '<div class="flex items-center">' +
                    '<div class="list-node">' + val + '</div>' +
                    (idx < listData.length - 1 ? '<div class="arrow">→</div>' : '') +
                '</div>'
            ).join('');
            
            canvas.innerHTML = 
                '<div class="text-center mb-4">' +
                    '<div class="step-indicator mb-2">Linked List Visualization</div>' +
                    '<p class="text-sm text-gray-600 mb-3">Node traversal and operations</p>' +
                '</div>' +
                '<div class="flex justify-center items-center space-x-2">' + listElements + '</div>' +
                '<div class="mt-4 text-center text-sm text-gray-600">' +
                    '<p>Head → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → NULL</p>' +
                '</div>';
        }

        function showStackQueueVisualization(data, analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            const stackData = [8, 7, 6, 5, 4, 3, 2, 1];
            
            canvas.innerHTML = '<div class="text-center"><h3>Stack/Queue Visualization</h3><p>Stack and Queue operations visualization</p></div>';
        }

        function showPatternVisualization(analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Create pyramid/triangle pattern visualization
            let patternSteps = [];
            let currentPattern = '';
            
            // Simulate nested loop execution for pattern generation
            for (let i = 1; i <= 5; i++) {
                let line = '';
                // Add spaces
                for (let j = 1; j <= 5 - i; j++) {
                    line += '&nbsp;';
                }
                // Add stars
                for (let k = 1; k <= i; k++) {
                    line += '* ';
                }
                currentPattern += line}<br>';
                patternSteps.push({
                    row: i,
                    pattern: currentPattern,
                    description: 'Row ' + i + ': Adding ' + i + ' star(s)'
                });
            }
            
            let currentStep = 0;
            
            function animatePattern() {
                if (currentStep >= patternSteps.length) {
                    canvas.innerHTML = '<div class="text-center"><h3>🎉 Pattern Complete!</h3><div class="pattern-display">Pattern visualization complete</div></div>';
                    return;
                }
                
                const step = patternSteps[currentStep];
                const progress = ((currentStep + 1) / patternSteps.length) * 100;
                
                canvas.innerHTML = '<div class="text-center"><h3>Pattern Generation</h3><p>' + step.description + '</p><div>Progress: ' + Math.round(progress) + '%</div></div>';
                
                currentStep++;
                setTimeout(animatePattern, 1000);
            }
            
            animatePattern();
        }

        function showLoopFlowVisualization(analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Simulate nested loop execution
            const iterations = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 3; j++) {
                    iterations.push({
                        outerLoop: i + 1,
                        innerLoop: j + 1,
                        description: 'Outer: i=' + (i+1) + ', Inner: j=' + (j+1),
                        output: '(' + (i+1) + ',' + (j+1) + ')'
                    });
                }
            }
            
            let currentIteration = 0;
            let outputHistory = [];
            
            function animateLoop() {
                if (currentIteration >= iterations.length) {
                    canvas.innerHTML = '<div class="text-center"><h3>🎉 Loop Execution Complete!</h3><p>All loop iterations finished</p></div>';
                    return;
                }
                
                const iteration = iterations[currentIteration];
                outputHistory.push(iteration.output);
                const progress = ((currentIteration + 1) / iterations.length) * 100;
                
                canvas.innerHTML = '
                    <div class="text-center mb-4">
                        <div class="step-indicator mb-2">Loop Execution - ' + iteration.description + '</div>
                        <div class="progress-bar mb-4">
                            <div class="progress-fill" style="width: ' + progress + '%"></div>
                        </div>
                    </div>
                    <div class="loop-visualization">
                        <div class="loop-state">
                            <div class="outer-loop ' + iteration.innerLoop === 1 ? 'active' : ''}">
                                Outer Loop (i = ' + iteration.outerLoop + ')
                            </div>
                            <div class="inner-loop active">
                                Inner Loop (j = ' + iteration.innerLoop + ')
                            </div>
                        </div>
                        <div class="output-display mt-4">
                            <h4 class="font-semibold mb-2">Current Output: ' + iteration.output + '</h4>
                            <div class="output-history">
                                ' + outputHistory.map((output, idx) => 
                                    '<span class="output-item ' + (idx === outputHistory.length - 1 ? 'highlight' : '') + '">' + output + '</span>'
                                ).join(' ') +
                            </div>
                        </div>
                    </div>
                ';
                
                currentIteration++;
                setTimeout(animateLoop, 800);
            }
            
            animateLoop();
        }

        function showArrayOperationsVisualization(analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            const arrayData = [5, 2, 8, 1, 9, 3];
            const operations = [
                { type: 'access', index: 0, value: 5, description: 'Accessing array[0]' },
                { type: 'modify', index: 1, oldValue: 2, newValue: 7, description: 'Modifying array[1] = 7' },
                { type: 'access', index: 2, value: 8, description: 'Accessing array[2]' },
                { type: 'sum', description: 'Calculating sum of all elements' }
            ];
            
            let currentOp = 0;
            let currentArray = [...arrayData];
            
            function animateArrayOps() {
                if (currentOp >= operations.length) {
                    const sum = currentArray.reduce((a, b) => a + b, 0);
                    canvas.innerHTML = '
                        <div class="text-center">
                            <div class="step-indicator mb-4">🎉 Array Operations Complete!</div>
                            <div class="flex justify-center space-x-2 mb-4">
                                ' + currentArray.map((val, idx) => 
                                    '<div class="array-element sorted w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold">' + 
                                        val + 
                                    '</div>'
                                ).join('') +
                            </div>
                            <p class="text-sm text-gray-600">Final array sum: ' + sum + '</p>
                        </div>
                    ';
                    return;
                }
                
                const operation = operations[currentOp];
                const progress = ((currentOp + 1) / operations.length) * 100;
                
                if (operation.type === 'modify') {
                    currentArray[operation.index] = operation.newValue;
                }
                
                canvas.innerHTML = '
                    <div class="text-center mb-4">
                        <div class="step-indicator mb-2">' + operation.description + '</div>
                        <div class="progress-bar mb-4">
                            <div class="progress-fill" style="width: ' + progress + '%"></div>
                        </div>
                    </div>
                    <div class="flex justify-center space-x-2 mb-4">
                        ' + currentArray.map((val, idx) => {
                            let elementClass = 'array-element w-12 h-12 text-white rounded-lg flex items-center justify-center font-semibold';
                            
                            if (operation.index === idx && operation.type !== 'sum') {
                                elementClass += ' comparing';
                            } else if (operation.type === 'sum') {
                                elementClass += ' swapping';
                            } else {
                                elementClass += ' bg-gray-500';
                            }
                            
                            return '<div class="' + elementClass + '">' + val + '</div>';
                        }).join('') +
                    </div>
                    <div class="text-center text-sm text-gray-600">
                        Operation ' + currentOp + 1 + ' of ' + operations.length + '
                    </div>
                ';
                
                currentOp++;
                setTimeout(animateArrayOps, 1200);
            }
            
            animateArrayOps();
        }

        function showVariableFlowVisualization(analysis) {
            const canvas = document.getElementById('visualizationCanvas');
            
            // Simulate variable operations
            const variables = analysis.variables.length > 0 ? analysis.variables : ['a = 5', 'b = 10', 'c = a + b'];
            const variableSteps = [];
            let currentVariables = {};
            
            variables.forEach((varAssign, idx) => {
                const parts = varAssign.split('=');
                if (parts.length === 2) {
                    const varName = parts[0].trim();
                    const varValue = parts[1].trim();
                    
                    // Simple evaluation for demonstration
                    if (!isNaN(varValue)) {
                        currentVariables[varName] + ' = parseInt(varValue);
                    } else if (varValue.includes('+')) {
                        const operands = varValue.split('+').map(op => op.trim());
                        if (currentVariables[operands[0]] !== undefined && currentVariables[operands[1]] !== undefined) {
                            currentVariables[varName] + ' = currentVariables[operands[0]] + currentVariables[operands[1]];
                        } else {
                            currentVariables[varName] + ' = varValue;
                        }
                    } else {
                        currentVariables[varName] + ' = varValue;
                    }
                    
                    variableSteps.push({
                        operation: varAssign,
                        variables: { ...currentVariables },
                        description: 'Assigning ' + varName + ' = ' + currentVariables[varName] + '
                    });
                }
            });
            
            let currentStep = 0;
            
            function animateVariables() {
                if (currentStep >= variableSteps.length) {
                    canvas.innerHTML = '
                        <div class="text-center">
                            <div class="step-indicator mb-4">🎉 Variable Operations Complete!</div>
                            <div class="variable-display">
                                <h4 class="font-semibold mb-2">Final Variable Values:</h4>
                                ' + Object.entries(currentVariables).map(([name, value]) => 
                                    '<div class="variable-item">' + name + ' = ' + value + '</div>'
                                ).join('') +
                            </div>
                        </div>
                    ';
                    return;
                }
                
                const step = variableSteps[currentStep];
                const progress = ((currentStep + 1) / variableSteps.length) * 100;
                
                canvas.innerHTML = '
                    <div class="text-center mb-4">
                        <div class="step-indicator mb-2">' + step.description + '</div>
                        <div class="progress-bar mb-4">
                            <div class="progress-fill" style="width: ' + progress + '%"></div>
                        </div>
                    </div>
                    <div class="variable-display">
                        <div class="current-operation mb-4">
                            <code class="bg-gray-100 px-3 py-2 rounded">' + step.operation + '</code>
                        </div>
                        <div class="variable-table">
                            ' + Object.entries(step.variables).map(([name, value]) => 
                                '<div class="variable-row">' +
                                    '<span class="variable-name">' + name + '</span>' +
                                    '<span class="variable-equals">=</span>' +
                                    '<span class="variable-value">' + value + '</span>' +
                                '</div>'
                            ).join('') +
                        </div>
                    </div>
                ';
                
                currentStep++;
                setTimeout(animateVariables, 1500);
            }
            
            animateVariables();
        }

        function resetVisualization() {
            document.getElementById('visualizationCanvas').innerHTML = 
                '<div class="text-center text-gray-500">' +
                    '<i class="fas fa-play-circle text-4xl mb-4"></i>' +
                    '<p>Click "Analyze & Visualize" to see your code in action</p>' +
                    '<p class="text-sm mt-2">Try the example patterns or paste your own C code!</p>' +
                '</div>';
            
            // Clear stored analysis
            window.customAnalysis = null;
            window.sampleData = null;
        }
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