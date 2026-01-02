import React from 'react';
import { MOCK_LOGS } from '../constants';
import { Play, Download, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Logs: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">Call Logs</h1>
      
      <div className="bg-vapi-card border border-vapi-border rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Started At</th>
              <th className="px-6 py-4 font-medium">Assistant</th>
              <th className="px-6 py-4 font-medium">Duration</th>
              <th className="px-6 py-4 font-medium">Cost</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {MOCK_LOGS.map(log => (
              <tr key={log.id} className="group hover:bg-zinc-900/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                   {log.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={12}/> Completed</span>}
                   {log.status === 'failed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><AlertCircle size={12}/> Failed</span>}
                   {log.status === 'active' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/> Active</span>}
                </td>
                <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{log.startedAt}</td>
                <td className="px-6 py-4 text-zinc-300">{log.assistantId}</td>
                <td className="px-6 py-4 text-zinc-300">{log.duration}</td>
                <td className="px-6 py-4 text-zinc-300">${log.cost.toFixed(4)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Play Recording"><Play size={14} /></button>
                    <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Download"><Download size={14} /></button>
                    <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Details"><ExternalLink size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {MOCK_LOGS.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No calls found.</div>
        )}
      </div>
    </div>
  );
};