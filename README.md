# C-It: C Algorithm Visualizer

An interactive visualization tool for C programming algorithms, built with Next.js and CloudFlare Workers. Learn sorting, searching, and data structure algorithms with step-by-step animations.

![C-It Logo](https://img.shields.io/badge/C--It-Algorithm%20Visualizer-blue?style=for-the-badge&logo=typescript)

## 🚀 Features

- **Interactive Algorithm Visualization**: Step-by-step visual representation of how algorithms work
- **Multiple Algorithm Support**: Sorting, searching, and data structure algorithms
- **Modern UI/UX**: Clean, responsive design that works on all devices
- **Code Editor**: Syntax-highlighted C code editor with copy/download features
- **Animation Controls**: Play, pause, step forward/backward, and speed control
- **Educational Focus**: Designed for students, educators, and developers
- **CloudFlare Integration**: Fast, global deployment with serverless backend

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **React Syntax Highlighter** - Code highlighting

### Backend
- **CloudFlare Workers** - Serverless edge computing
- **CloudFlare KV** - Key-value storage
- **CloudFlare R2** - Object storage
- **TypeScript** - Type-safe backend development

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- CloudFlare account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/c-it.git
cd c-it
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd workers
npm install
cd ..
```

### 3. Environment Setup

Create environment files for both frontend and backend:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://your-workers-domain.workers.dev
NEXT_PUBLIC_ENVIRONMENT=development

# Backend (workers/.env)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### 4. Development

```bash
# Start frontend development server
npm run dev

# Start backend development server (in workers directory)
cd workers
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
c-it/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── AlgorithmSelector.tsx
│   ├── CodeEditor.tsx
│   ├── Header.tsx
│   └── Visualization.tsx
├── lib/                   # Utility libraries
│   ├── algorithms.ts      # Algorithm definitions
│   └── visualizer.ts      # Visualization engine
├── types/                 # TypeScript type definitions
│   └── index.ts
├── workers/               # CloudFlare Workers backend
│   ├── src/
│   │   └── index.ts       # Main worker file
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🚀 Deployment

### Frontend Deployment (CloudFlare Pages)

1. **Build the Application**

```bash
npm run build
```

2. **Deploy to CloudFlare Pages**

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to CloudFlare
wrangler login

# Deploy to Pages
wrangler pages deploy out --project-name c-it
```

### Backend Deployment (CloudFlare Workers)

1. **Configure CloudFlare Resources**

```bash
# Create KV namespace
wrangler kv:namespace create "C_IT_KV"

# Create R2 bucket
wrangler r2 bucket create c-it-assets
```

2. **Update Configuration**

Update `workers/wrangler.toml` with your resource IDs:

```toml
[[kv_namespaces]]
binding = "C_IT_KV"
id = "your-kv-namespace-id"

[[r2_buckets]]
binding = "C_IT_BUCKET"
bucket_name = "c-it-assets"
```

3. **Deploy Workers**

```bash
cd workers
wrangler deploy
```

### Environment Variables

Set up the following environment variables in CloudFlare:

- `ENVIRONMENT`: production/staging
- `CLOUDFLARE_ACCOUNT_ID`: Your CloudFlare account ID
- `CLOUDFLARE_API_TOKEN`: Your CloudFlare API token

## 📚 Supported Algorithms

### Sorting Algorithms
- **Bubble Sort** - O(n²) time complexity
- **Quick Sort** - O(n log n) average time complexity
- **Merge Sort** - O(n log n) time complexity
- **Insertion Sort** - O(n²) time complexity
- **Selection Sort** - O(n²) time complexity

### Searching Algorithms
- **Linear Search** - O(n) time complexity
- **Binary Search** - O(log n) time complexity

### Data Structures
- **Linked Lists** - Linear data structure
- **Stacks** - LIFO data structure
- **Queues** - FIFO data structure
- **Binary Trees** - Hierarchical data structure

## 🎨 Customization

### Adding New Algorithms

1. **Define the Algorithm**

Add to `lib/algorithms.ts`:

```typescript
{
  id: 'your-algorithm',
  name: 'Your Algorithm',
  category: 'sorting',
  description: 'Algorithm description',
  timeComplexity: {
    best: 'O(n)',
    average: 'O(n log n)',
    worst: 'O(n²)'
  },
  spaceComplexity: 'O(1)',
  code: `// Your C code here`,
  example: [1, 2, 3, 4, 5]
}
```

2. **Implement Visualization**

Add to `lib/visualizer.ts`:

```typescript
case 'your-algorithm':
  return this.generateYourAlgorithmSteps();
```

### Styling

The application uses Tailwind CSS. Customize colors and styles in:

- `tailwind.config.js` - Theme configuration
- `app/globals.css` - Custom CSS classes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**John Jandayan**
- Portfolio: [https://portfolio-john-jandayan.vercel.app/](https://portfolio-john-jandayan.vercel.app/)
- GitHub: [JohnJandayan](https://github.com/JohnJandayan)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [CloudFlare](https://cloudflare.com/) for serverless infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

## 📞 Support

If you have any questions or need help, please:

1. Check the [Issues](https://github.com/JohnJandayan/C-IT/issues) page
2. Create a new issue if your problem isn't already listed
3. Contact the developer through the portfolio website

---

Made with ❤️ by [John Jandayan](https://portfolio-john-jandayan.vercel.app/) 