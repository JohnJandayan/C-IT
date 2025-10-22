import React from 'react';

interface StackRendererProps {
  name: string;
  items: any[];
}

const StackRenderer: React.FC<StackRendererProps> = ({ name, items }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="font-mono text-sm mb-3 text-red-300">{name}</div>
      
      {items.length === 0 ? (
        <div className="text-gray-500 italic">Empty stack</div>
      ) : (
        <div className="flex flex-col-reverse gap-2 max-w-xs">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`w-full h-12 bg-red-600 rounded flex items-center justify-center text-white font-bold shadow-lg node ${
                idx === items.length - 1 ? 'ring-2 ring-red-400' : ''
              }`}
            >
              {String(item)}
            </div>
          ))}
          <div className="w-full h-1 bg-gray-600 rounded"></div>
          <div className="text-xs text-gray-500 text-center">Bottom</div>
        </div>
      )}
    </div>
  );
};

export default StackRenderer;
