'use client';

import React, { useState } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { Algorithm } from '@/types';
import { algorithms, getAlgorithmsByCategory } from '@/lib/algorithms';

interface AlgorithmSelectorProps {
  selectedAlgorithm: Algorithm | null;
  onAlgorithmSelect: (algorithm: Algorithm) => void;
  className?: string;
}

export default function AlgorithmSelector({ 
  selectedAlgorithm, 
  onAlgorithmSelect,
  className = '' 
}: AlgorithmSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { id: 'all', name: 'All Algorithms' },
    { id: 'sorting', name: 'Sorting Algorithms' },
    { id: 'searching', name: 'Searching Algorithms' },
    { id: 'data-structures', name: 'Data Structures' },
    { id: 'basic', name: 'Basic Algorithms' },
    { id: 'advanced', name: 'Advanced Algorithms' }
  ];

  const filteredAlgorithms = algorithms.filter(algorithm => {
    const matchesSearch = algorithm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         algorithm.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || algorithm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAlgorithmClick = (algorithm: Algorithm) => {
    onAlgorithmSelect(algorithm);
    setIsOpen(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-secondary-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-900">Select Algorithm</h3>
      </div>

      {/* Search and Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
          <input
            type="text"
            placeholder="Search algorithms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="text-secondary-400" size={18} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Algorithm List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAlgorithms.length === 0 ? (
          <div className="p-4 text-center text-secondary-500">
            No algorithms found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {filteredAlgorithms.map((algorithm) => (
              <div
                key={algorithm.id}
                onClick={() => handleAlgorithmClick(algorithm)}
                className={`p-4 cursor-pointer transition-colors hover:bg-secondary-50 ${
                  selectedAlgorithm?.id === algorithm.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary-900 mb-1">{algorithm.name}</h4>
                    <p className="text-sm text-secondary-600 mb-2 line-clamp-2">{algorithm.description}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full capitalize">
                        {algorithm.category}
                      </span>
                      <span className="text-secondary-500">
                        Time: {algorithm.timeComplexity.average}
                      </span>
                      <span className="text-secondary-500">
                        Space: {algorithm.spaceComplexity}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="text-secondary-400" size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Algorithm Info */}
      {selectedAlgorithm && (
        <div className="p-4 bg-primary-50 border-t border-primary-200">
          <h4 className="font-medium text-primary-900 mb-2">Selected Algorithm</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-primary-700">Name:</span>
              <span className="text-primary-900 font-medium">{selectedAlgorithm.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Category:</span>
              <span className="text-primary-900 capitalize">{selectedAlgorithm.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Time Complexity:</span>
              <span className="text-primary-900">{selectedAlgorithm.timeComplexity.average}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Space Complexity:</span>
              <span className="text-primary-900">{selectedAlgorithm.spaceComplexity}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 