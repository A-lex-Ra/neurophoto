import React from 'react';
import { Tool } from '../services/api';

interface ToolSelectorProps {
  tools: Tool[];
  selectedTool: string | null;
  onSelect: (toolName: string | null) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  tools,
  selectedTool,
  onSelect
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onSelect(tool.name === selectedTool ? null : tool.name)}
          className={`
            px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors hover:cursor-pointer
            ${selectedTool === tool.name
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }
          `}
        >
          {tool.display_name}
        </button>
      ))}
    </div>
  );
};