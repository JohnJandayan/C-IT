'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Settings, Play, Copy, Download } from 'lucide-react';
import { Algorithm } from '@/types';

interface CodeEditorProps {
  algorithm: Algorithm;
  onRun: (code: string) => void;
  className?: string;
}

export default function CodeEditor({ algorithm, onRun, className = '' }: CodeEditorProps) {
  const [code, setCode] = useState(algorithm.code);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleRun = () => {
    onRun(code);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${algorithm.name.toLowerCase().replace(/\s+/g, '-')}.c`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCode(algorithm.code);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-secondary-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-secondary-900">{algorithm.name}</h3>
          <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full capitalize">
            {algorithm.category}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          
          <button
            onClick={handleCopy}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
            title="Copy code"
          >
            <Copy size={18} />
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
            title="Download code"
          >
            <Download size={18} />
          </button>
          
          <button
            onClick={handleRun}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            title="Run algorithm"
          >
            <Play size={16} />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-secondary-700">Font Size:</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-secondary-700">Theme:</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                className="px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            <button
              onClick={handleReset}
              className="text-sm text-secondary-600 hover:text-secondary-900 underline"
            >
              Reset to original
            </button>
          </div>
        </div>
      )}

      {/* Code Editor */}
      <div className="relative">
        <textarea
          value={code}
          onChange={handleCodeChange}
          className="w-full h-96 p-4 font-mono text-sm leading-relaxed bg-transparent text-transparent caret-black resize-none focus:outline-none"
          style={{ fontSize: `${fontSize}px` }}
          spellCheck={false}
        />
        
        <div className="absolute inset-0 pointer-events-none">
          <SyntaxHighlighter
            language="c"
            style={theme === 'dark' ? tomorrow : undefined}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: `${fontSize}px`,
              background: theme === 'light' ? '#ffffff' : undefined,
              height: '100%',
            }}
            showLineNumbers={true}
            wrapLines={true}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Algorithm Info */}
      <div className="bg-secondary-50 px-4 py-3 border-t border-secondary-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-secondary-900 mb-1">Time Complexity</h4>
            <div className="space-y-1 text-secondary-600">
              <div>Best: {algorithm.timeComplexity.best}</div>
              <div>Average: {algorithm.timeComplexity.average}</div>
              <div>Worst: {algorithm.timeComplexity.worst}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-secondary-900 mb-1">Space Complexity</h4>
            <div className="text-secondary-600">{algorithm.spaceComplexity}</div>
          </div>
          
          <div>
            <h4 className="font-medium text-secondary-900 mb-1">Description</h4>
            <p className="text-secondary-600 text-xs leading-relaxed">{algorithm.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 