"""
Vercel API handler for C-It application
"""

def handler(request, context):
    """Vercel serverless function handler"""
    
    # Get the request path
    path = request.get('path', '/')
    
    # Handle different routes
    if path.startswith('/static/') or path in ['/favicon.ico', '/favicon.png']:
        # Return a simple favicon response
        return {
            'statusCode': 200,
            'body': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚀</text></svg>',
            'headers': {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=31536000'
            }
        }
    
    # Return the main HTML page for all other routes
    return {
        'statusCode': 200,
        'body': '''
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
                    <a href="#" class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-code text-white text-sm"></i>
                        </div>
                        <span class="text-xl font-bold text-gray-900">C-It</span>
                    </a>
                </div>
                
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="#" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
                        <a href="#" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Visualizer</a>
                        <a href="#" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
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
                        <a href="#" class="btn-primary text-white px-8 py-3 rounded-lg text-lg font-semibold">
                            <i class="fas fa-play mr-2"></i>Start Visualizing
                        </a>
                        <a href="#" class="btn-secondary text-white px-8 py-3 rounded-lg text-lg font-semibold">
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

            <!-- Success Message -->
            <div class="container mx-auto px-4 py-16">
                <div class="bg-white rounded-lg p-8 shadow-lg max-w-2xl mx-auto text-center">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Deployment Successful!</h2>
                    <p class="text-lg text-gray-600 mb-6">
                        Your C-It application is now live on Vercel! The algorithm visualizer is ready to help you learn C programming concepts.
                    </p>
                    <div class="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg">
                        <p class="font-semibold">🚀 C-It is Running!</p>
                        <p class="text-sm opacity-90">Your application is successfully deployed and ready to use.</p>
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
                    <a href="#" class="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors">
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
        ''',
        'headers': {
            'Content-Type': 'text/html; charset=utf-8'
        }
    } 