import React from 'react';
import { LinkedListNode } from '@/types';

interface LinkedListRendererProps {
  name: string;
  nodes: LinkedListNode[];
}

const LinkedListRenderer: React.FC<LinkedListRendererProps> = ({ name, nodes }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-purple-300">{name}</div>
      
      {nodes.length === 0 ? (
        <div className="text-gray-500 italic">Empty list</div>
      ) : (
        <div className="flex items-center gap-4">
          {nodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              {/* Node */}
              <div className="flex flex-col items-center">
                <div className="bg-purple-600 rounded-lg p-4 min-w-[80px] shadow-lg node">
                  <div className="text-white font-bold text-center text-lg">
                    {String(node.value)}
                  </div>
                  <div className="text-xs text-purple-200 text-center mt-1">
                    {node.address}
                  </div>
                </div>
              </div>
              
              {/* Arrow to next node */}
              {node.next && idx < nodes.length - 1 && (
                <div className="flex items-center">
                  <svg width="40" height="20" className="text-purple-400">
                    <defs>
                      <marker
                        id="arrowhead-list"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3, 0 6"
                          fill="currentColor"
                        />
                      </marker>
                    </defs>
                    <line
                      x1="0"
                      y1="10"
                      x2="35"
                      y2="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead-list)"
                    />
                  </svg>
                </div>
              )}
              
              {/* Null pointer */}
              {!node.next && (
                <div className="flex items-center">
                  <svg width="40" height="20" className="text-gray-600">
                    <line
                      x1="0"
                      y1="10"
                      x2="35"
                      y2="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  </svg>
                  <div className="text-gray-500 text-sm">NULL</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedListRenderer;
