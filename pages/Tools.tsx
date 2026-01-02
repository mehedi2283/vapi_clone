import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Code2, Trash2, MoreHorizontal, Phone, Loader2 } from 'lucide-react';
import { ToolItem } from '../types';
import { supabaseService } from '../services/supabaseClient';

interface ToolsProps {
    orgId?: string;
}

export const Tools: React.FC<ToolsProps> = ({ orgId }) => {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (orgId) {
        loadTools();
    }
  }, [orgId]);

  const loadTools = async () => {
    if (!orgId) return;
    setIsLoading(true);
    const dbTools = await supabaseService.getTools(orgId);
    setTools(dbTools);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!orgId) return;
    setIsCreating(true);
    const newTool: ToolItem = {
      id: `tool_${Date.now()}`,
      name: 'newFunction',
      description: 'Description of what this function does...',
      type: 'function'
    };
    try {
        await supabaseService.createTool(newTool, orgId);
        setTools(prev => [newTool, ...prev]);
    } catch (err) {
        alert("Failed to create tool");
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this tool?")) return;
    
    try {
        await supabaseService.deleteTool(id);
        setTools(prev => prev.filter(t => t.id !== id));
    } catch (err) {
        alert("Failed to delete tool");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tools</h1>
        <button 
          onClick={handleCreate}
          disabled={isCreating}
          className="flex items-center gap-2 bg-vapi-accent hover:bg-teal-300 text-black px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18} />}
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

      {isLoading ? (
         <div className="flex justify-center py-10">
            <Loader2 className="text-vapi-accent animate-spin" size={32} />
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map(tool => (
            <div 
                key={tool.id} 
                className="group bg-vapi-card border border-vapi-border hover:border-zinc-600 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 flex flex-col h-full relative"
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
                <div className="flex gap-1">
                    <button 
                        onClick={(e) => handleDelete(tool.id, e)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-zinc-800 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                </div>
                
                <p className="text-sm text-zinc-400 mb-6 flex-1">{tool.description}</p>
                
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 font-mono text-[10px] text-zinc-500 overflow-hidden">
                {`{ "type": "${tool.type}", "name": "${tool.name}" }`}
                </div>
            </div>
            ))}
            {tools.length === 0 && (
                <div className="col-span-full text-center text-zinc-500 py-10">
                    No tools found for this organization.
                </div>
            )}
        </div>
      )}
    </div>
  );
};