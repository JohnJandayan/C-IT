# C-It: Interactive C Algorithm Visualizer

A modern, elegant web application for visualizing C programming algorithms and data structures with beautiful animations and step-by-step explanations.

![Python](https://img.shields.io/badge/-Python-blue?style=for-the-badge&logo=python)
![HTML](https://img.shields.io/badge/-HTML-red?style=for-the-badge&logo=html5)
![JavaScript](https://img.shields.io/badge/-JavaScript-yellow?style=for-the-badge&logo=javascript)

## 🌟 Features

### 🎯 Core Functionality
- **Interactive Algorithm Visualization**: Watch algorithms execute step-by-step with beautiful animations
- **Comprehensive Algorithm Library**: Support for sorting, searching, and data structure algorithms
- **Real-time Code Analysis**: Parse and analyze C code to generate visualizations
- **Complexity Analysis**: Detailed time and space complexity information
- **Step-by-step Execution**: Control animation speed and step through algorithms manually

### 📊 Supported Algorithms

#### Sorting Algorithms
- **Bubble Sort**: Simple comparison-based sorting
- **Quick Sort**: Efficient divide-and-conquer sorting
- **Merge Sort**: Stable sorting with O(n log n) complexity
- **Insertion Sort**: Simple adaptive sorting
- **Selection Sort**: Simple in-place sorting

#### Searching Algorithms
- **Binary Search**: Fast search in sorted arrays
- **Linear Search**: Simple sequential search

#### Data Structures
- **Linked Lists**: Dynamic data structure with nodes
- **Stacks**: LIFO (Last In, First Out) data structure
- **Queues**: FIFO (First In, First Out) data structure
- **Binary Trees**: Hierarchical data structure
- **Hash Maps**: Key-value pair data structure

### 🎨 User Experience
- **Modern, Responsive Design**: Works perfectly on all devices
- **Interactive Code Editor**: Syntax-highlighted C code editor
- **Beautiful Animations**: Smooth, engaging visualizations
- **User-friendly Interface**: Intuitive design for all skill levels
- **Mobile Optimized**: Full functionality on mobile devices

## 🛠️ Technology Stack

### Backend
- **Python 3.9**: Core programming language
- **Django 4.2.7**: Web framework
- **Django CORS Headers**: Cross-origin resource sharing
- **WhiteNoise**: Static file serving
- **Gunicorn**: WSGI HTTP Server

### Frontend
- **HTML5 & CSS3**: Modern web standards
- **JavaScript (ES6+)**: Interactive functionality
- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icon library
- **Chart.js**: Data visualization

### Deployment
- **Vercel**: Cloud platform for deployment
- **Python 3.9**: Runtime environment
- **Static File Optimization**: Compressed and optimized assets

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip (Python package installer)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/c-it.git
   cd c-it
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Collect static files**
   ```bash
   python manage.py collectstatic --noinput
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

8. **Open your browser**
   Navigate to `http://localhost:8000`

### Production Deployment

#### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

#### Environment Variables for Production

Set these environment variables in your Vercel dashboard:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
DJANGO_SETTINGS_MODULE=c_it_project.settings
```

## 📁 Project Structure

```
c-it/
├── c_it_project/          # Django project settings
│   ├── __init__.py
│   ├── settings.py        # Django settings
│   ├── urls.py           # Main URL configuration
│   ├── wsgi.py           # WSGI application
│   └── asgi.py           # ASGI application
├── visualizer/            # Main Django app
│   ├── __init__.py
│   ├── apps.py           # App configuration
│   ├── views.py          # View functions
│   ├── urls.py           # App URL patterns
│   ├── algorithm_parser.py    # C code parser
│   └── visualization_engine.py # Animation generator
├── templates/             # HTML templates
│   ├── base.html         # Base template
│   └── visualizer/       # App templates
│       ├── home.html     # Home page
│       ├── visualize.html # Main visualizer
│       └── about.html    # About page
├── static/               # Static files (CSS, JS, images)
├── requirements.txt      # Python dependencies
├── vercel.json          # Vercel configuration
├── runtime.txt          # Python runtime specification
├── build_files.sh       # Build script
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## 🎯 Usage

### Basic Usage

1. **Navigate to the Visualizer**
   - Go to the main visualizer page
   - You'll see a code editor and visualization canvas

2. **Input Your C Code**
   - Write or paste your C algorithm in the code editor
   - Supported algorithms include sorting, searching, and data structures

3. **Generate Visualization**
   - Click "Visualize Algorithm" button
   - The system will parse your code and generate animations

4. **Control Animation**
   - Use play/pause controls
   - Step through animation manually
   - Adjust animation speed
   - View step-by-step descriptions

### Example Algorithms

#### Bubble Sort
```c
#include <stdio.h>

void bubbleSort(int arr[], int n) {
    int i, j, temp;
    for (i = 0; i < n-1; i++) {
        for (j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr)/sizeof(arr[0]);
    bubbleSort(arr, n);
    return 0;
}
```

#### Binary Search
```c
#include <stdio.h>

int binarySearch(int arr[], int l, int r, int x) {
    while (l <= r) {
        int m = l + (r - l) / 2;
        
        if (arr[m] == x)
            return m;
        
        if (arr[m] < x)
            l = m + 1;
        else
            r = m - 1;
    }
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    int n = sizeof(arr) / sizeof(arr[0]);
    int x = 10;
    int result = binarySearch(arr, 0, n-1, x);
    return 0;
}
```

## 🔧 Configuration

### Development Settings

Create a `.env` file in the root directory:

```env
DEBUG=True
SECRET_KEY=your-development-secret-key
DJANGO_SETTINGS_MODULE=c_it_project.settings
```

### Production Settings

For production deployment, ensure these settings:

```env
DEBUG=False
SECRET_KEY=your-production-secret-key
DJANGO_SETTINGS_MODULE=c_it_project.settings
```

## 🧪 Testing

Run tests to ensure everything works correctly:

```bash
python manage.py test
```

## 📈 Performance

### Optimization Features
- **Static File Compression**: CSS and JS files are minified
- **Image Optimization**: Optimized image delivery
- **Caching**: Efficient caching strategies
- **CDN Ready**: Configured for CDN deployment

### Monitoring
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Built-in performance monitoring
- **User Analytics**: Track user interactions

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow PEP 8 Python style guide
- Write comprehensive tests
- Update documentation
- Ensure mobile responsiveness
- Test across different browsers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Django Community**: For the excellent web framework
- **Tailwind CSS**: For the beautiful styling system
- **Font Awesome**: For the comprehensive icon library
- **Vercel**: For the seamless deployment platform

## 📞 Support

- **Website**: [C-It Live Demo](https://c-it.vercel.app)
- **Portfolio**: [John Jandayan Portfolio](https://portfolio-john-jandayan.vercel.app)
- **Email**: Contact through portfolio
- **Issues**: [GitHub Issues](https://github.com/yourusername/c-it/issues)

## 🚀 Roadmap

### Upcoming Features
- [ ] More algorithm types (graph algorithms, dynamic programming)
- [ ] Code execution simulation
- [ ] Performance comparison tools
- [ ] User accounts and saved algorithms
- [ ] Collaborative features
- [ ] Mobile app version

### Version History
- **v1.0.0**: Initial release with core visualization features
- **v1.1.0**: Added more algorithms and improved UI
- **v1.2.0**: Enhanced performance and mobile optimization

---

**Built with ❤️ by John Jandayan**

*C-It: Making algorithm learning beautiful and interactive* 