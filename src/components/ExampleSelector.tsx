import React, { useState } from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';
import { codeExamples, getExamplesByCategory } from '@/data/examples';

const ExampleSelector: React.FC = () => {
  const { setCode } = useVisualizationStore();
  const [isOpen, setIsOpen] = useState(false);
  const categories = getExamplesByCategory();

  const handleExampleSelect = (code: string) => {
    setCode(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
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
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        Load Example
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Dropdown Menu */}
          <div className="absolute top-full mt-2 right-0 w-80 bg-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto border border-gray-700">
            {Object.entries(categories).map(([category, examples]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {category}
                </div>
                {examples.map((example) => (
                  <button
                    key={example.id}
                    onClick={() => handleExampleSelect(example.code)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors group"
                  >
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      {example.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {example.description}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExampleSelector;
