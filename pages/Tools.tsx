import React, { useState } from 'react';
import { Plus, Search, Wrench, Code2, Trash2, MoreHorizontal } from 'lucide-react';
import { ToolItem } from '../types';

const MOCK_TOOLS: ToolItem[] = [
  { 
    id: 'tool_1', 
    name: 'checkInventory', 
    description: 'Checks stock levels for a specific product ID.', 
    type: 'function' 
  },
  { 
    id: 'tool_2', 
    name: 'bookAppointment', 
    description: 'Schedules a meeting in the calendar.', 
    type: 'function' 
  },
  { 
    id: 'tool_3', 
    name: 'transferToSupport', 
    description: 'Transfers call to human agent.', 
    type: 'transfer_call' 
  },
];

export const Tools: React.FC = () => {
  const [tools, setTools] = useState<ToolItem[]>(MOCK_TOOLS);

  const handleCreate = () => {
    const newTool: ToolItem = {
      id: `tool_${Date.now()}`,
      name: 'newFunction',
      description: 'Description of what this function does...',
      type: 'function'
    };
    setTools([newTool, ...tools]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tools</h1>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-vapi-accent hover:bg-teal-300 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          <span>Create Tool</span>
        </button>
      </div>

      <div className="flex items-center gap-4 bg-vapi-card p-2 rounded-lg border border-vapi-border">
        <Search className="text-zinc-500 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search tools..." 
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-zinc-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <div 
            key={tool.id} 
            className="group bg-vapi-card border border-vapi-border hover:border-zinc-600 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-300">
                  {tool.type === 'function' ? <Code2 size={20} /> : <Phone size={20} />}
                </div>
                <div>
                   <h3 className="text-base font-semibold text-white">{tool.name}</h3>
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{tool.type.replace('_', ' ')}</span>
                </div>
              </div>
              <button className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800">
                <MoreHorizontal size={20} />
              </button>
            </div>
            
            <p className="text-sm text-zinc-400 mb-6 flex-1">{tool.description}</p>
            
            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 font-mono text-[10px] text-zinc-500 overflow-hidden">
              {`{ "type": "${tool.type}", "name": "${tool.name}" }`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Phone icon placeholder since we used it in the conditional render
const Phone = ({size}:{size:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);