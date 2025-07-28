'use client';

import React, { useState } from 'react';
import { Settings, Play, Copy, Download } from 'lucide-react';

interface CodeEditorProps {
  code?: string;
  onRun: (code: string, input: string) => void;
  className?: string;
}

export default function CodeEditor({ code: initialCode = '', onRun, className = '' }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [userInput, setUserInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
  };

  const handleRun = () => {
    onRun(code, userInput);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'c-it-code.c';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCode(initialCode);
    setUserInput('');
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-secondary-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-secondary-900">C Code Editor</h3>
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
            title="Visualize code"
          >
            <Play size={16} />
            <span>Visualize</span>
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
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Code Editor */}
      <div className="relative">
        <textarea
          value={code}
          onChange={handleCodeChange}
          className="w-full h-96 p-4 font-mono text-sm leading-relaxed bg-white border-0 resize-none focus:outline-none focus:ring-0"
          style={{ 
            fontSize: `${fontSize}px`,
            color: theme === 'dark' ? '#e5e5e5' : '#1f2937',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff'
          }}
          spellCheck={false}
          placeholder="Enter your C code here..."
        />
      </div>

      {/* User Input Panel */}
      <div className="bg-secondary-50 px-4 py-3 border-t border-secondary-200">
        <label className="block text-sm font-medium text-secondary-700 mb-1">User Input (for scanf):</label>
        <textarea
          value={userInput}
          onChange={handleInputChange}
          className="w-full p-2 border border-secondary-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          placeholder="Enter input values separated by spaces or newlines"
        />
      </div>
    </div>
  );
} 