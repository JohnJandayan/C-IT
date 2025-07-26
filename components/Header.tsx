'use client';

import React from 'react';
import { Settings, Github, ExternalLink } from 'lucide-react';

export default function Header() {
  const handleSettingsClick = () => {
    window.open('https://portfolio-john-jandayan.vercel.app/', '_blank');
  };

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-secondary-900">C-It</h1>
              <p className="text-xs text-secondary-500">Algorithm Visualizer</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#algorithms" className="text-secondary-600 hover:text-secondary-900 transition-colors">
              Algorithms
            </a>
            <a href="#visualization" className="text-secondary-600 hover:text-secondary-900 transition-colors">
              Visualization
            </a>
            <a href="#about" className="text-secondary-600 hover:text-secondary-900 transition-colors">
              About
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/JohnJandayan/C-IT"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
              title="View on GitHub"
            >
              <Github size={18} />
            </a>
            
            <button
              onClick={handleSettingsClick}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg transition-colors"
              title="About the Developer"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">About Developer</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 