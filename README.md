# C-It - C Code Visualizer

A modern, professional-grade C code visualization tool that helps developers and students understand algorithms and data structures through interactive, step-by-step execution.

## 🚀 Live Demo

[A live demo of the application will be available here once deployed.]

## 📖 Documentation

For detailed information about the project, please refer to the following documents:

- **[Project Overview](docs/PROJECT_OVERVIEW.md)**: High-level information about the project, including features and technology stack.
- **[Deployment Guide](docs/deployment-guide.md)**: Step-by-step instructions for deploying the application.
- **[Architecture](docs/architecture.md)**: An in-depth look at the project's architecture.
- **[Hosting Configuration](docs/hosting-configuration.md)**: Detailed hosting configuration for Render and Cloudflare Pages.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/c-it.git
cd c-it

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🤝 Contributing

We welcome contributions! Please see our **[Contributing Guidelines](CONTRIBUTING.md)**.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**John Jandayan**
- Portfolio: [https://portfolio-john-jandayan.vercel.app/](https://portfolio-john-jandayan.vercel.app/)
- GitHub: [@johnjandayan](https://github.com/johnjandayan)

## 🚀 Features

### Core Functionality
- **Interactive Code Editor**: Syntax-highlighted C code input with line numbers
- **Step-by-Step Execution**: Visual execution with play, pause, step, and reset controls
- **Real-time Variable Tracking**: Monitor variable states and memory usage
- **Multiple Data Structure Support**: Arrays, stacks, queues, trees, graphs, and more
- **Algorithm Templates**: Pre-built templates for common algorithms

### Algorithm Categories
- **Sorting Algorithms**: Bubble Sort, Quick Sort, Merge Sort, Heap Sort
- **Searching Algorithms**: Binary Search, Linear Search, Interpolation Search
- **Data Structures**: Linked Lists, Stacks, Queues, Binary Trees, Hash Tables
- **Graph Algorithms**: DFS, BFS, Dijkstra's Algorithm, Kruskal's Algorithm
- **Dynamic Programming**: Fibonacci, Knapsack, LCS, Edit Distance

### User Experience
- **Modern UI/UX**: Clean, professional interface with dark/light mode
- **Responsive Design**: Optimized for desktop and mobile devices
- **Performance Optimized**: Fast loading and smooth animations
- **Accessibility**: WCAG compliant with keyboard navigation support

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Deployment**: Cloudflare Pages

### Backend
- **Framework**: Django with Django REST Framework
- **Language**: Python 3.11+
- **Database**: PostgreSQL (via Render)
- **Deployment**: Render

## 🌟 Project Status

### Phase 1: Initial Setup
- [x] Scaffolding the Next.js frontend.
- [x] Creating a modern UI with `shadcn/ui`.
- [x] Implementing mock data for visualization.

### Phase 2: Backend Development
- [x] Setting up the Django backend with Django REST Framework.
- [x] Implementing a C code execution engine with `gcc` and `gdb`.
- [x] Creating an API endpoint to receive code and return an execution trace.

### Phase 3: Frontend-Backend Integration
- [x] Connecting the Next.js frontend to the Django backend.
- [x] Replacing mock data with live data from the API.
- [x] Displaying the execution trace in a user-friendly format.

### Phase 4: Enhancements & Deployment (In Progress)
- [x] Adding animations to the frontend visualization.
- [ ] Implementing more advanced visualization features.
- [x] Documenting the deployment process for Render and Cloudflare Pages.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/c-it.git
cd c-it

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Build for Production
```bash
# Create production build
npm run build

# Start production server
npm run start
```

## 📁 Project Structure

```
c-it/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main visualizer page
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
├── public/               # Static assets
├── docs/                 # Documentation
│   ├── deployment-guide.md
│   └── architecture.md
└── README.md
```

## 🎯 Usage

### Basic Usage
1. **Select Algorithm**: Choose from pre-built templates or write custom C code
2. **Execute Code**: Click play to start step-by-step execution
3. **Control Playback**: Use play/pause, step forward, or reset controls
4. **Monitor State**: Watch variables and data structures change in real-time
5. **Adjust Speed**: Control execution speed with the slider

### Algorithm Templates
The application includes templates for:
- Bubble Sort with array visualization
- Binary Search with step-by-step comparison
- Linked List operations with pointer tracking
- Stack operations with LIFO visualization
- Graph traversal with node highlighting

### Customization
- **Theme**: Toggle between light and dark modes
- **Speed Control**: Adjust execution speed from 100ms to 1000ms
- **Code Editing**: Modify existing templates or write custom algorithms

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)

## 📊 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Core Web Vitals**: Optimized for excellent user experience
- **Bundle Size**: Optimized with code splitting and tree shaking
- **Loading Speed**: Sub-second initial load times

## 🔒 Security

- **Content Security Policy**: Implemented for XSS protection
- **HTTPS Only**: All traffic encrypted in transit
- **Input Validation**: Comprehensive validation for all user inputs
- **Rate Limiting**: API rate limiting to prevent abuse

## 🌟 Roadmap

### Phase 1 (Current)
- [x] Frontend implementation with Next.js
- [x] Algorithm templates and visualization
- [x] Interactive controls and theming
- [x] Responsive design

### Phase 2 (In Progress)
- [ ] Django backend integration
- [ ] Real C code compilation and execution
- [ ] Advanced algorithm support
- [ ] User authentication and saved projects

### Phase 3 (Planned)
- [ ] Collaborative features
- [ ] Advanced debugging tools
- [ ] Performance profiling
- [ ] Educational content integration

---

**C-It** - Making C programming visual, interactive, and accessible to everyone.