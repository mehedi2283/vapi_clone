import React, { useEffect, useState } from 'react';
import { Play, Download, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { fetchVapiCalls } from '../services/vapiService';
import { VAPI_PRIVATE_KEY } from '../constants';
import { CallLog } from '../types';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
        const data = await fetchVapiCalls(VAPI_PRIVATE_KEY);
        setLogs(data);
        setIsLoading(false);
    };
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Call Logs</h1>
        {isLoading && <Loader2 className="animate-spin text-zinc-500" size={20} />}
      </div>
      
      <div className="bg-vapi-card border border-vapi-border rounded-xl overflow-hidden min-h-[200px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Started At</th>
              <th className="px-6 py-4 font-medium">Assistant ID</th>
              <th className="px-6 py-4 font-medium">Duration</th>
              <th className="px-6 py-4 font-medium">Cost</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {!isLoading && logs.map(log => (
              <tr key={log.id} className="group hover:bg-zinc-900/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                   {log.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={12}/> Completed</span>}
                   {log.status === 'failed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><AlertCircle size={12}/> Failed</span>}
                   {log.status === 'active' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/> Active</span>}
                   {['completed', 'failed', 'active'].indexOf(log.status) === -1 && <span className="text-zinc-500 capitalize">{log.status}</span>}
                </td>
                <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{log.startedAt}</td>
                <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{log.assistantId.substring(0, 18)}...</td>
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
        {!isLoading && logs.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No calls found in this account.</div>
        )}
      </div>
    </div>
  );
};