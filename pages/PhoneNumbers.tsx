import React from 'react';
import { Plus, Search } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export const PhoneNumbers: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Phone Numbers</h1>
        <button 
          onClick={() => showToast("Number purchasing is temporarily unavailable.", "info")}
          className="flex items-center gap-2 bg-vapi-accent hover:bg-orange-500 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          <span>Buy Number</span>
        </button>
      </div>

      <div className="flex items-center gap-4 bg-vapi-card p-2 rounded-lg border border-vapi-border">
        <Search className="text-zinc-500 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search numbers..." 
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-zinc-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-vapi-card border border-vapi-border rounded-xl p-6 flex flex-col items-center justify-center h-48 border-dashed border-zinc-800 text-zinc-500 gap-2 hover:border-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
           <Plus size={24} />
           <span className="font-medium">Import or Buy Number</span>
        </div>
        <div className="bg-vapi-card border border-vapi-border rounded-xl p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
           </div>
           <h3 className="text-xl font-mono font-medium text-white mb-2">+1 (555) 123-4567</h3>
           <p className="text-zinc-500 text-sm mb-4">San Francisco, CA</p>
           <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">Attached to: Customer Support Agent</span>
           </div>
        </div>
      </div>
    </div>
  );
};