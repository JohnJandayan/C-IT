import React from 'react';
import { ArrayInfo } from '@/types';

interface ArrayRendererProps {
  array: ArrayInfo;
}

const ArrayRenderer: React.FC<ArrayRendererProps> = ({ array }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="font-mono text-sm mb-3 text-green-300">
        {array.type} {array.name}[{array.size}]
      </div>
      <div className="flex gap-2 flex-wrap">
        {array.elements.map((element, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {/* Index */}
            <div className="text-xs text-gray-500 mb-1">[{element.index}]</div>
            {/* Value box */}
            <div className="w-16 h-16 bg-green-600 rounded flex items-center justify-center text-white font-bold shadow-lg node">
              {String(element.value)}
            </div>
            {/* Address */}
            {element.address && (
              <div className="text-xs text-gray-500 mt-1">{element.address}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArrayRenderer;
