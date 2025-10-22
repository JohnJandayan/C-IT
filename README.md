# C-It: An Animated C Code Visualizer

![C-It Logo](https://img.shields.io/badge/C--It-Visualizer-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)

**C-It** is a production-grade, animated C code visualizer built with React, TypeScript, and deployed on Vercel. It allows users to write, edit, and visualize the step-by-step execution of C code in an intuitive, animated fashion — perfect for learning algorithms, debugging, and understanding data structures.

## 🚀 Features

### Core Functionality
- **Professional Code Editor**: Monaco Editor with C syntax highlighting, line numbers, and automatic indentation
- **Step-by-Step Visualization**: Animated execution trace with play/pause controls
- **Data Structure Rendering**: Visual representations of:
  - Arrays with indices and values
  - Linked Lists with pointer arrows
  - Binary Trees with node relationships
  - Stacks and Queues
  - Hash Maps
- **Real-Time State Display**: Track variables, pointers, call stack, and memory allocations
- **Console Output**: View `printf` output in real-time
- **Example Library**: Pre-loaded examples including sorting algorithms, searching, data structures, and more

### User Experience
- **Resizable Panels**: Customize your workspace with draggable panel dividers
- **Playback Controls**: Play, pause, step forward/backward, reset, and adjustable animation speed
- **Error Handling**: Graceful display of compilation and runtime errors
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Theme**: Modern, eye-friendly interface

### Technical Highlights
- **Pure React**: Built without Next.js for maximum flexibility
- **Type-Safe**: 100% TypeScript for robust, maintainable code
- **State Management**: Zustand for efficient, scalable state
- **Remote Execution**: Piston API for secure C code compilation and execution
- **Serverless Architecture**: Vercel Functions for code instrumentation
- **Production Ready**: Error boundaries, loading states, and comprehensive error handling

## 📋 Table of Contents

- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Development Setup](#-local-development-setup)
- [Building for Production](#-building-for-production)
- [Vercel Deployment Guide](#-vercel-deployment-guide)
- [Environment Variables](#-environment-variables)
- [Architecture Overview](#-architecture-overview)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠 Technology Stack

- **Frontend Framework**: React 18.2
- **Language**: TypeScript 5.3
- **Build Tool**: Vite 5.0
- **UI Framework**: Tailwind CSS 3.4
- **Code Editor**: Monaco Editor (VS Code's editor)
- **State Management**: Zustand 4.4
- **Panel Management**: react-resizable-panels
- **HTTP Client**: Axios
- **Code Execution**: Piston API
- **Hosting**: Vercel (Serverless Functions)

## 📁 Project Structure

```
C-IT/
├── api/
│   └── execute.ts              # Vercel Serverless Function for C code execution
├── src/
│   ├── components/
│   │   ├── visualizers/
│   │   │   ├── ArrayRenderer.tsx
│   │   │   ├── LinkedListRenderer.tsx
│   │   │   ├── TreeRenderer.tsx
│   │   │   └── StackRenderer.tsx
│   │   ├── CodeEditor.tsx      # Monaco Editor integration
│   │   ├── VisualizationCanvas.tsx
│   │   ├── StateDisplay.tsx
│   │   ├── OutputConsole.tsx
│   │   ├── Controls.tsx        # Playback controls
│   │   ├── ExampleSelector.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ErrorDisplay.tsx
│   ├── data/
│   │   └── examples.ts         # Pre-loaded code examples
│   ├── store/
│   │   └── visualizationStore.ts  # Zustand state management
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                 # Vercel deployment configuration
└── README.md
```

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher ([Download](https://nodejs.org/))
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control ([Download](https://git-scm.com/))
- **Vercel CLI** (optional, for local serverless testing): `npm install -g vercel`

## 🔧 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/C-IT.git
cd C-IT
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including React, TypeScript, Vite, Tailwind CSS, Monaco Editor, Zustand, and Axios.

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add the Piston API URL:

```env
PISTON_API_URL=https://emkc.org/api/v2/piston
```

> **Note**: The public Piston API is free but rate-limited. For production, consider hosting your own Piston instance or using a paid service.

### 4. Start the Development Server

```bash
npm run dev
```

This will start the Vite development server. Open your browser to:

```
http://localhost:3000
```

### 5. Test the Serverless Function Locally (Optional)

To test the Vercel serverless function locally, you'll need the Vercel CLI:

```bash
vercel dev
```

This starts a local Vercel environment that mimics production.

## 🏗 Building for Production

### Build the Application

```bash
npm run build
```

This command:
1. Compiles TypeScript files
2. Bundles the application with Vite
3. Optimizes assets (minification, tree-shaking)
4. Outputs production files to the `dist/` directory

### Preview the Production Build

```bash
npm run preview
```

This serves the production build locally for testing before deployment.

## 🚀 Vercel Deployment Guide

### Method 1: Deploy via Vercel Dashboard (Recommended for First-Time Setup)

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up using GitHub, GitLab, or Bitbucket

2. **Import Your Repository**
   - Click "Add New..." → "Project"
   - Select your Git repository
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Configure Environment Variables**
   - In the import screen, expand "Environment Variables"
   - Add the following variable:
     ```
     PISTON_API_URL = https://emkc.org/api/v2/piston
     ```
   - Apply to: **Production**, **Preview**, and **Development**

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll receive a production URL (e.g., `your-app.vercel.app`)

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add PISTON_API_URL production
   ```
   When prompted, enter: `https://emkc.org/api/v2/piston`

### Method 3: Deploy via GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

Add these secrets to your GitHub repository:
- `VERCEL_TOKEN`: From Vercel Account Settings → Tokens
- `ORG_ID`: From `.vercel/project.json` after first deployment
- `PROJECT_ID`: From `.vercel/project.json` after first deployment

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example Value | Where to Set |
|----------|-------------|---------------|--------------|
| `PISTON_API_URL` | URL of the Piston API for C code execution | `https://emkc.org/api/v2/piston` | Vercel Dashboard → Settings → Environment Variables |

### Setting Environment Variables in Vercel

1. Go to your project in the Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the variable:
   - **Name**: `PISTON_API_URL`
   - **Value**: `https://emkc.org/api/v2/piston`
   - **Environments**: Select all (Production, Preview, Development)
4. Click "Save"
5. Redeploy your application for changes to take effect

### Using a Private Piston Instance

If you're hosting your own Piston instance:

```env
PISTON_API_URL=https://your-piston-instance.com/api/v2/piston
```

## 🏛 Architecture Overview

### Frontend Architecture

```
User Interface (React + TypeScript)
    ↓
State Management (Zustand)
    ↓
Component Layer
    ├── CodeEditor (Monaco)
    ├── VisualizationCanvas
    ├── StateDisplay
    ├── OutputConsole
    └── Controls
    ↓
API Layer (Axios)
    ↓
Vercel Serverless Function (/api/execute)
    ↓
Piston API (C Code Execution)
```

### Code Execution Flow

1. **User writes C code** in Monaco Editor
2. **User clicks "Execute"**
3. Frontend sends code to `/api/execute` endpoint
4. **Vercel Serverless Function**:
   - Receives the C code
   - Instruments the code (injects trace statements)
   - Sends instrumented code to Piston API
   - Piston compiles and executes the code
   - Parses execution output into structured JSON
   - Returns execution trace to frontend
5. **Frontend receives trace** and stores in Zustand
6. **User interacts** with playback controls
7. **Visualization renders** current step's data structures

### Instrumentation Process

The serverless function injects `printf` statements into the C code to capture:
- Variable declarations and assignments
- Loop iterations
- Function calls
- Array operations
- Pointer operations

This creates a "trace" of the program's execution that can be played back step-by-step.

## 📡 API Reference

### POST /api/execute

Executes C code and returns an execution trace.

**Request Body:**
```json
{
  "code": "string // C source code"
}
```

**Response (Success):**
```json
{
  "steps": [
    {
      "stepNumber": 0,
      "lineNumber": 4,
      "code": "int x = 10;",
      "variables": [
        {
          "name": "x",
          "value": 10,
          "type": "int",
          "scope": "local"
        }
      ],
      "pointers": [],
      "arrays": [],
      "linkedLists": {},
      "trees": {},
      "stacks": {},
      "queues": {},
      "hashmaps": {},
      "callStack": [
        {
          "functionName": "main",
          "lineNumber": 4,
          "variables": []
        }
      ],
      "output": ["Hello, World!"],
      "memoryAllocations": []
    }
  ]
}
```

**Response (Compilation Error):**
```json
{
  "steps": [],
  "compilationError": "main.c:4:5: error: expected ';' before '}' token"
}
```

**Response (Runtime Error):**
```json
{
  "steps": [...],
  "error": "Segmentation fault"
}
```

## 🐛 Troubleshooting

### Issue: Monaco Editor not loading

**Solution**: Clear your browser cache and ensure the `@monaco-editor/react` package is installed:
```bash
npm install @monaco-editor/react
```

### Issue: "Cannot find module 'zustand'" error

**Solution**: Install missing dependencies:
```bash
npm install zustand
```

### Issue: Execution timeout

**Cause**: Code takes too long to execute (>10 seconds)

**Solutions**:
- Simplify your C code
- Remove infinite loops
- Reduce computation intensity
- Increase timeout in `api/execute.ts` (line 189)

### Issue: Compilation errors not displaying

**Solution**: Check that the Piston API is accessible:
```bash
curl https://emkc.org/api/v2/piston/runtimes
```

### Issue: Vercel deployment fails

**Common causes**:
1. Missing environment variables
2. Build errors (check Vercel logs)
3. Incorrect `vercel.json` configuration

**Solution**: Check the Vercel deployment logs and ensure all environment variables are set.

### Issue: Serverless function errors in production

**Solution**: Check Vercel Function Logs:
1. Go to your Vercel project
2. Navigate to "Deployments"
3. Click on the latest deployment
4. Select "Functions" tab
5. View logs for `/api/execute`

## 🎨 Customization

### Adding New Examples

Edit `src/data/examples.ts`:

```typescript
{
  id: 'your-example',
  title: 'Your Example Title',
  category: 'Category',
  description: 'Description',
  code: `#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`,
}
```

### Changing Animation Speed Range

Edit `src/components/Controls.tsx`:

```typescript
<input
  type="range"
  min="50"      // Faster
  max="5000"    // Slower
  step="50"
  value={animationSpeed}
  onChange={handleSpeedChange}
/>
```

### Customizing Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      },
    },
  },
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor**: Microsoft's VS Code editor
- **Piston API**: Engineer Man's code execution engine
- **Tailwind CSS**: Utility-first CSS framework
- **Vercel**: Deployment and serverless hosting

## 📞 Contact

**Developer**: John Jandayan  
**Portfolio**: [https://portfolio-john-jandayan.vercel.app/](https://portfolio-john-jandayan.vercel.app/)

## 🎯 Roadmap

- [ ] Enhanced instrumentation for complex data structures
- [ ] Support for more data structures (graphs, heaps)
- [ ] Export execution trace as video
- [ ] Collaborative code editing
- [ ] User accounts and saved projects
- [ ] Mobile app version

---

**Built with ❤️ by John Jandayan**
