import React, { useEffect, useState } from 'react';
import { TreeNode } from '@/types';

interface TreeRendererProps {
  name: string;
  nodes: TreeNode[];
}

interface PositionedNode extends TreeNode {
  x: number;
  y: number;
  level: number;
}

const TreeRenderer: React.FC<TreeRendererProps> = ({ name, nodes }) => {
  const [positionedNodes, setPositionedNodes] = useState<PositionedNode[]>([]);

  useEffect(() => {
    if (nodes.length === 0) return;

    // Calculate positions for tree nodes
    const positioned = calculateTreeLayout(nodes);
    setPositionedNodes(positioned);
  }, [nodes]);

  const calculateTreeLayout = (nodes: TreeNode[]): PositionedNode[] => {
    if (nodes.length === 0) return [];

    const nodeMap = new Map<string, TreeNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const root = nodes[0];
    const positioned: PositionedNode[] = [];
    const levelWidth = new Map<number, number>();

    const traverse = (
      nodeId: string,
      level: number,
      position: number
    ): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return position;

      const currentPos = position;
      let leftWidth = 0;
      let rightWidth = 0;

      if (node.left) {
        leftWidth = traverse(node.left, level + 1, currentPos);
      }

      const myPosition = currentPos + leftWidth;
      positioned.push({
        ...node,
        x: myPosition * 100 + 50,
        y: level * 100 + 50,
        level,
      });

      if (node.right) {
        rightWidth = traverse(node.right, level + 1, myPosition + 1);
      }

      return leftWidth + 1 + rightWidth;
    };

    traverse(root.id, 0, 0);
    return positioned;
  };

  const renderEdges = () => {
    const edges: JSX.Element[] = [];
    const nodeMap = new Map<string, PositionedNode>();
    positionedNodes.forEach((node) => nodeMap.set(node.id, node));

    positionedNodes.forEach((node) => {
      if (node.left) {
        const leftNode = nodeMap.get(node.left);
        if (leftNode) {
          edges.push(
            <line
              key={`${node.id}-left`}
              x1={node.x}
              y1={node.y}
              x2={leftNode.x}
              y2={leftNode.y}
              stroke="#fbbf24"
              strokeWidth="2"
              className="node"
            />
          );
        }
      }
      if (node.right) {
        const rightNode = nodeMap.get(node.right);
        if (rightNode) {
          edges.push(
            <line
              key={`${node.id}-right`}
              x1={node.x}
              y1={node.y}
              x2={rightNode.x}
              y2={rightNode.y}
              stroke="#fbbf24"
              strokeWidth="2"
              className="node"
            />
          );
        }
      }
    });

    return edges;
  };

  if (nodes.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="font-mono text-sm mb-2 text-yellow-300">{name}</div>
        <div className="text-gray-500 italic">Empty tree</div>
      </div>
    );
  }

  const maxX = Math.max(...positionedNodes.map((n) => n.x)) + 100;
  const maxY = Math.max(...positionedNodes.map((n) => n.y)) + 100;

  return (
    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <div className="font-mono text-sm mb-3 text-yellow-300">{name}</div>
      
      <svg width={maxX} height={maxY} className="mx-auto">
        {renderEdges()}
        
        {positionedNodes.map((node) => (
          <g key={node.id} className="node">
            <circle
              cx={node.x}
              cy={node.y}
              r="25"
              fill="#eab308"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              {String(node.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default TreeRenderer;
