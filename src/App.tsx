import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import CodeEditor from './components/CodeEditor';
import VisualizationCanvas from './components/VisualizationCanvas';
import StateDisplay from './components/StateDisplay';
import OutputConsole from './components/OutputConsole';
import Controls from './components/Controls';
import ExampleSelector from './components/ExampleSelector';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';

function App() {
  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-blue-500">&lt;</span>
              C-It
              <span className="text-blue-500">/&gt;</span>
            </h1>
            <span className="text-sm text-gray-400">
              Animated C Code Visualizer
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ExampleSelector />
            <a
              href="https://portfolio-john-jandayan.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              About the Programmer
            </a>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Left Panel: Code Editor */}
            <Panel defaultSize={50} minSize={30}>
              <CodeEditor />
            </Panel>

            <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

            {/* Right Panel: Visualization */}
            <Panel defaultSize={50} minSize={30}>
              <PanelGroup direction="vertical">
                {/* Top: Visualization Canvas */}
                <Panel defaultSize={50} minSize={20}>
                  <VisualizationCanvas />
                </Panel>

                <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500 transition-colors cursor-row-resize" />

                {/* Bottom: State and Output */}
                <Panel defaultSize={50} minSize={20}>
                  <PanelGroup direction="horizontal">
                    <Panel defaultSize={50} minSize={20}>
                      <StateDisplay />
                    </Panel>

                    <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                    <Panel defaultSize={50} minSize={20}>
                      <OutputConsole />
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>

        {/* Controls */}
        <Controls />

        {/* Error Display */}
        <ErrorDisplay />
      </div>
    </ErrorBoundary>
  );
}

export default App;
