/**
 * Vercel API handler for C-It application
 * This version loads external fixed JavaScript instead of embedding it
 */

module.exports = (req, res) => {
  // Get the request path
  const path = req.url || '/';
  
  // Handle static files (favicon, etc.)
  if (path.startsWith('/static/js/')) {
    // Redirect to GitHub CDN for JavaScript files
    const fileName = path.replace('/static/js/', '');
    res.setHeader('Location', `https://cdn.jsdelivr.net/gh/JohnJandayan/C-IT@main/static/js/${fileName}`);
    res.status(302).end();
    return;
  }
  
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
  } else if (path === '/api/compile') {
    return handleCompileRequest(req, res);
  } else if (path.startsWith('/visualize/parse_and_visualize')) {
    return handleParseRequest(req, res);
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
        .feature-card { transition: all 0.3s ease; cursor: pointer; }
        .feature-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); }
        .section-title { position: relative; display: inline-block; padding-bottom: 10px; }
        .section-title::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 2px; }
    </style>
</head>
<body class="bg-gray-50">
    <nav class="gradient-bg text-white shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-code text-2xl"></i>
                    <span class="text-2xl font-bold">C-It</span>
                </div>
                <div class="hidden md:flex items-center space-x-6">
                    <a href="/" class="hover:text-blue-200 transition-colors font-medium">Home</a>
                    <a href="/visualize" class="hover:text-blue-200 transition-colors font-medium">Visualizer</a>
                    <a href="/about" class="hover:text-blue-200 transition-colors font-medium">About</a>
                </div>
            </div>
        </div>
    </nav>

    <section class="gradient-bg text-white py-20">
        <div class="container mx-auto px-6 text-center">
            <div class="glass-effect rounded-2xl p-12 max-w-4xl mx-auto">
                <h1 class="text-5xl md:text-6xl font-bold mb-6">
                    Welcome to <span class="text-yellow-300">C-It</span>
                </h1>
                <p class="text-xl md:text-2xl mb-8 text-gray-100">
                    Transform your C code into beautiful, interactive visualizations
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a href="/visualize" class="btn-primary text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg">
                        <i class="fas fa-play mr-2"></i>Start Visualizing
                    </a>
                    <a href="/about" class="btn-secondary text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg">
                        <i class="fas fa-info-circle mr-2"></i>Learn More
                    </a>
                </div>
            </div>
        </div>
    </section>

    <section class="py-20 bg-white">
        <div class="container mx-auto px-6">
            <h2 class="section-title text-4xl font-bold text-center text-gray-800 mb-16">Key Features</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="feature-card bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-5xl text-blue-600 mb-4">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-3">Smart Analysis</h3>
                    <p class="text-gray-600 leading-relaxed">Automatically detect algorithms, data structures, and patterns in your C code with our intelligent parser.</p>
                </div>
                <div class="feature-card bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-5xl text-purple-600 mb-4">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-3">Interactive Visuals</h3>
                    <p class="text-gray-600 leading-relaxed">Watch your code come to life with dynamic, step-by-step visualizations of algorithm execution.</p>
                </div>
                <div class="feature-card bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-5xl text-green-600 mb-4">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-3">Learn & Teach</h3>
                    <p class="text-gray-600 leading-relaxed">Perfect for students and educators to understand complex algorithms through visual learning.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div class="container mx-auto px-6">
            <h2 class="section-title text-4xl font-bold text-center text-gray-800 mb-16">Supported Visualizations</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                    <div class="text-3xl text-blue-600 mb-3">
                        <i class="fas fa-sort"></i>
                    </div>
                    <h4 class="font-bold text-lg text-gray-800 mb-2">Sorting Algorithms</h4>
                    <p class="text-sm text-gray-600">Bubble, Insertion, Selection, Quick, Merge Sort</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                    <div class="text-3xl text-green-600 mb-3">
                        <i class="fas fa-search"></i>
                    </div>
                    <h4 class="font-bold text-lg text-gray-800 mb-2">Search Algorithms</h4>
                    <p class="text-sm text-gray-600">Linear, Binary, DFS, BFS</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                    <div class="text-3xl text-purple-600 mb-3">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <h4 class="font-bold text-lg text-gray-800 mb-2">Data Structures</h4>
                    <p class="text-sm text-gray-600">Arrays, Linked Lists, Stacks, Queues, Trees</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                    <div class="text-3xl text-red-600 mb-3">
                        <i class="fas fa-code-branch"></i>
                    </div>
                    <h4 class="font-bold text-lg text-gray-800 mb-2">Control Flow</h4>
                    <p class="text-sm text-gray-600">Loops, Conditionals, Recursion, Pattern Generation</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-20 gradient-bg text-white">
        <div class="container mx-auto px-6 text-center">
            <h2 class="text-4xl font-bold mb-6">Ready to Visualize Your Code?</h2>
            <p class="text-xl mb-8 text-gray-100">Start exploring algorithms like never before</p>
            <a href="/visualize" class="bg-white text-purple-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors inline-flex items-center shadow-2xl">
                <i class="fas fa-rocket mr-2"></i>Get Started Now
            </a>
        </div>
    </section>

    <footer class="bg-gray-800 text-white py-8">
        <div class="container mx-auto px-6 text-center">
            <p class="text-gray-400">&copy; 2024 C-It. Built with ❤️ for algorithm enthusiasts.</p>
            <div class="mt-4 flex justify-center space-x-6">
                <a href="https://github.com" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fab fa-github text-2xl"></i>
                </a>
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
        .btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); transition: all 0.3s ease; }
        .btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(75, 85, 99, 0.3); }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .example-card { transition: all 0.3s ease; cursor: pointer; border: 2px solid transparent; }
        .example-card:hover { border-color: #3b82f6; transform: translateY(-4px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2); }
    </style>
</head>
<body class="bg-gray-50">
    <nav class="gradient-bg text-white shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-code text-2xl"></i>
                    <span class="text-2xl font-bold">C-It</span>
                </div>
                <div class="hidden md:flex items-center space-x-6">
                    <a href="/" class="hover:text-blue-200 transition-colors font-medium">Home</a>
                    <a href="/visualize" class="hover:text-blue-200 transition-colors font-medium">Visualizer</a>
                    <a href="/about" class="hover:text-blue-200 transition-colors font-medium">About</a>
                </div>
            </div>
        </div>
    </nav>

    <main class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-terminal text-blue-600 mr-3"></i>
                Algorithm Visualizer
            </h1>

            <div class="mb-6">
                <label class="block text-sm font-semibold text-gray-700 mb-2">Enter Your C Code</label>
                <div class="code-editor p-4">
                    <textarea id="codeEditor" rows="12" class="w-full bg-transparent text-green-400 font-mono text-sm focus:outline-none resize-none" placeholder="// Enter your C code here...
#include <stdio.h>

int main() {
    // Your code
    return 0;
}"></textarea>
                </div>
            </div>

            <div class="flex flex-wrap gap-4 mb-6">
                <button id="visualizeBtn" class="btn-primary text-white px-6 py-3 rounded-lg font-semibold">
                    <i class="fas fa-play mr-2"></i>Analyze and Visualize
                </button>
                <button id="runCodeBtn" class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg">
                    <i class="fas fa-terminal mr-2"></i>Run Code
                </button>
                <button id="clearBtn" class="btn-secondary text-white px-6 py-3 rounded-lg font-semibold">
                    <i class="fas fa-eraser mr-2"></i>Reset
                </button>
            </div>

            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">Quick Start Examples</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="example-btn example-card bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg" data-type="pattern">
                        <div class="text-2xl text-blue-600 mb-2">
                            <i class="fas fa-asterisk"></i>
                        </div>
                        <h4 class="font-semibold text-gray-800">Pattern Generation</h4>
                        <p class="text-sm text-gray-600">Nested loops with patterns</p>
                    </div>
                    <div class="example-btn example-card bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg" data-type="bubble_sort">
                        <div class="text-2xl text-green-600 mb-2">
                            <i class="fas fa-sort"></i>
                        </div>
                        <h4 class="font-semibold text-gray-800">Bubble Sort</h4>
                        <p class="text-sm text-gray-600">Classic sorting algorithm</p>
                    </div>
                    <div class="example-btn example-card bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg" data-type="loops">
                        <div class="text-2xl text-purple-600 mb-2">
                            <i class="fas fa-sync"></i>
                        </div>
                        <h4 class="font-semibold text-gray-800">Nested Loops</h4>
                        <p class="text-sm text-gray-600">Loop iteration visualization</p>
                    </div>
                    <div class="example-btn example-card bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg" data-type="array_ops">
                        <div class="text-2xl text-orange-600 mb-2">
                            <i class="fas fa-list"></i>
                        </div>
                        <h4 class="font-semibold text-gray-800">Array Operations</h4>
                        <p class="text-sm text-gray-600">Array access, modification, and processing</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Execution Output Panel (hidden by default) -->
        <div id="executionOutput" class="hidden bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-gray-800 flex items-center">
                    <i class="fas fa-terminal text-green-600 mr-2"></i>
                    Execution Output
                </h2>
                <button id="closeOutputBtn" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div id="outputContent" class="font-mono text-sm"></div>
        </div>

        <div id="visualizationCanvas" class="visualization-canvas p-8 shadow-lg">
            <div class="text-center text-gray-400">
                <i class="fas fa-chart-bar text-6xl mb-4"></i>
                <p class="text-lg">Your visualization will appear here</p>
                <p class="text-sm mt-2">Enter C code above and click "Analyze and Visualize"</p>
            </div>
        </div>
    </main>

    <!-- Load external fixed visualizer JavaScript from GitHub CDN -->
    <script src="https://cdn.jsdelivr.net/gh/JohnJandayan/C-IT@main/static/js/visualizer.js" defer></script>
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
    <title>About - C-It Visualizer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    </style>
</head>
<body class="bg-gray-50">
    <nav class="gradient-bg text-white shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-code text-2xl"></i>
                    <span class="text-2xl font-bold">C-It</span>
                </div>
                <div class="hidden md:flex items-center space-x-6">
                    <a href="/" class="hover:text-blue-200 transition-colors font-medium">Home</a>
                    <a href="/visualize" class="hover:text-blue-200 transition-colors font-medium">Visualizer</a>
                    <a href="/about" class="hover:text-blue-200 transition-colors font-medium">About</a>
                </div>
            </div>
        </div>
    </nav>

    <main class="container mx-auto px-6 py-12">
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h1 class="text-4xl font-bold text-gray-800 mb-6">About C-It</h1>
                
                <div class="prose prose-lg max-w-none">
                    <p class="text-gray-700 leading-relaxed mb-4">
                        C-It is an advanced visualization tool designed to help students, educators, and developers understand C programming concepts through interactive visual representations.
                    </p>
                    
                    <h2 class="text-2xl font-bold text-gray-800 mt-8 mb-4">Our Mission</h2>
                    <p class="text-gray-700 leading-relaxed mb-4">
                        We believe that visual learning accelerates understanding of complex algorithmic concepts. C-It transforms abstract code into concrete, dynamic visualizations that make learning intuitive and engaging.
                    </p>
                    
                    <h2 class="text-2xl font-bold text-gray-800 mt-8 mb-4">Key Capabilities</h2>
                    <ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
                        <li>Automatic detection of algorithms and data structures</li>
                        <li>Step-by-step execution visualization</li>
                        <li>Support for sorting, searching, and pattern algorithms</li>
                        <li>Interactive controls for playback speed and navigation</li>
                        <li>Complexity analysis and code insights</li>
                        <li>Educational examples and templates</li>
                    </ul>
                    
                    <h2 class="text-2xl font-bold text-gray-800 mt-8 mb-4">Technology Stack</h2>
                    <p class="text-gray-700 leading-relaxed mb-4">
                        Built with modern web technologies including Python/Django backend, advanced JavaScript visualization engine, and responsive Tailwind CSS design.
                    </p>
                    
                    <h2 class="text-2xl font-bold text-gray-800 mt-8 mb-4">Get Started</h2>
                    <p class="text-gray-700 leading-relaxed mb-6">
                        Ready to visualize your code? Head over to the visualizer and start exploring!
                    </p>
                    
                    <div class="text-center">
                        <a href="/visualize" class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                            <i class="fas fa-play mr-2"></i>Try the Visualizer
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="bg-gray-800 text-white py-8 mt-12">
        <div class="container mx-auto px-6 text-center">
            <p class="text-gray-400">&copy; 2024 C-It. Built with ❤️ for algorithm enthusiasts.</p>
        </div>
    </footer>
</body>
</html>
  `);
}

/**
 * Handle code compilation requests via Piston API
 */
async function handleCompileRequest(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { code } = JSON.parse(body);
      
      if (!code || !code.trim()) {
        res.status(400).json({ error: 'No code provided' });
        return;
      }
      
      console.log('[Compile] Executing code via Piston API...');
      
      // Call Piston API
      const https = require('https');
      const pistonData = JSON.stringify({
        language: 'c',
        version: '10.2.0',
        files: [{
          name: 'main.c',
          content: code
        }]
      });
      
      const options = {
        hostname: 'emkc.org',
        port: 443,
        path: '/api/v2/piston/execute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(pistonData)
        }
      };
      
      const pistonReq = https.request(options, (pistonRes) => {
        let responseData = '';
        
        pistonRes.on('data', (chunk) => {
          responseData += chunk;
        });
        
        pistonRes.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            console.log('[Compile] Piston response:', result);
            
            // Format response
            const response = {
              success: !result.compile || result.compile.code === 0,
              stdout: result.run ? result.run.stdout : '',
              stderr: result.run ? result.run.stderr : '',
              compile_output: result.compile ? result.compile.output : '',
              exit_code: result.run ? result.run.code : null,
              language: result.language,
              version: result.version
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify(response));
          } catch (error) {
            console.error('[Compile] Error parsing Piston response:', error);
            res.status(500).json({ error: 'Failed to parse compiler response' });
          }
        });
      });
      
      pistonReq.on('error', (error) => {
        console.error('[Compile] Piston API error:', error);
        res.status(500).json({ error: 'Compiler API request failed' });
      });
      
      pistonReq.write(pistonData);
      pistonReq.end();
      
    } catch (error) {
      console.error('[Compile] Request error:', error);
      res.status(400).json({ error: 'Invalid request format' });
    }
  });
}

/**
 * Handle visualization parsing requests (client-side parsing fallback)
 */
function handleParseRequest(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRFToken');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const { code } = JSON.parse(body);
      
      if (!code || !code.trim()) {
        res.status(400).json({ 
          success: false,
          error: 'No code provided' 
        });
        return;
      }
      
      // Simple pattern detection
      const hasLoops = /for\s*\(|while\s*\(|do\s+{/.test(code);
      const hasArrays = /\[\s*\d+\s*\]|\[\s*\]/.test(code);
      const hasSort = /sort/i.test(code);
      const hasBubbleSort = /bubble.*sort|for.*for.*arr\[j\].*arr\[j\+1\]/is.test(code);
      const hasPatterns = /printf.*\*|printf.*pattern/i.test(code);
      
      // Determine visualization type
      let visualizationType = 'code-flow';
      let algorithms = [];
      let patterns = [];
      
      if (hasBubbleSort) {
        visualizationType = 'sorting';
        algorithms.push('Bubble Sort');
      } else if (hasSort) {
        visualizationType = 'sorting';
        algorithms.push('Sorting Algorithm');
      }
      
      if (hasPatterns) {
        visualizationType = 'pattern';
        patterns.push('Pattern Generation');
      }
      
      if (hasLoops) {
        patterns.push('Loops');
      }
      
      if (hasArrays) {
        patterns.push('Arrays');
      }
      
      // Create a simple visualization
      const visualization = {
        type: visualizationType,
        steps: [
          {
            step: 1,
            title: 'Code Analysis',
            description: 'Your code has been analyzed',
            state: {
              message: 'Visualization feature is in development. Use "Run Code" to execute your program.'
            }
          }
        ]
      };
      
      const parsed_data = {
        algorithms,
        patterns,
        complexity: 'O(n)',
        visualization_type: visualizationType
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify({
        success: true,
        visualization,
        parsed_data
      }));
      
    } catch (error) {
      console.error('[Parse] Request error:', error);
      res.status(400).json({ 
        success: false,
        error: 'Invalid request format' 
      });
    }
  });
}
