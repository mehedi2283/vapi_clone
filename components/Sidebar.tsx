import React, { useState, useEffect } from 'react';
import { ViewState, Organization } from '../types';
import { 
  LayoutDashboard, 
  Bot, 
  Phone, 
  FileAudio, 
  ScrollText, 
  CreditCard,
  LogOut,
  Wrench,
  ChevronLeft
} from 'lucide-react';
import { supabaseService } from '../services/supabaseClient';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  selectedOrg: Organization;
  onBackToMaster: () => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, selectedOrg, onBackToMaster, isAdmin }) => {
  const [userEmail, setUserEmail] = useState<string>('');
  
  useEffect(() => {
    supabaseService.getCurrentUser().then(user => {
        if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const navItemClass = (view: ViewState) => `
    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
    ${currentView === view 
      ? 'bg-vapi-card text-vapi-accent border border-vapi-border' 
      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}
  `;

  return (
    <div className="w-64 h-screen border-r border-vapi-border bg-vapi-bg flex flex-col fixed left-0 top-0 z-50">
      {/* Org Header */}
      <div className="p-4 border-b border-vapi-border bg-zinc-900/30">
        {isAdmin && (
            <button 
            onClick={onBackToMaster}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-vapi-accent mb-4 transition-colors group w-full p-2 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
            >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Master
            </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg flex items-center justify-center border border-zinc-700 shadow-inner">
             <span className="text-white font-bold text-xs">{selectedOrg.name.substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate">{selectedOrg.name}</h2>
            <p className="text-[10px] text-zinc-500 font-mono truncate">ID: {selectedOrg.id.substring(0,8)}...</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-6">
        <div onClick={() => onChangeView('overview')} className={navItemClass('overview')}>
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </div>
        <div onClick={() => onChangeView('assistants')} className={navItemClass('assistants')}>
          <Bot size={18} />
          <span>Assistants</span>
        </div>
        <div onClick={() => onChangeView('phone-numbers')} className={navItemClass('phone-numbers')}>
          <Phone size={18} />
          <span>Phone Numbers</span>
        </div>
        <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-6 mb-2 px-3">
          Developer
        </div>
        <div onClick={() => onChangeView('logs')} className={navItemClass('logs')}>
          <ScrollText size={18} />
          <span>Logs</span>
        </div>
        <div onClick={() => onChangeView('files')} className={navItemClass('files')}>
          <FileAudio size={18} />
          <span>Files</span>
        </div>
        <div onClick={() => onChangeView('tools')} className={navItemClass('tools')}>
          <Wrench size={18} />
          <span>Tools</span>
        </div>
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-vapi-border">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <CreditCard size={16} />
            <span className="text-xs font-medium">Credits</span>
          </div>
          <span className="text-xs text-vapi-accent font-mono">${selectedOrg.credits.toFixed(2)}</span>
        </div>
        
        {/* Logout Button */}
        <div 
            onClick={() => {
                supabaseService.signOut();
            }}
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 cursor-pointer group transition-colors"
            title="Log Out"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-indigo-500">
            {(userEmail || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate group-hover:text-zinc-200">
                {isAdmin ? 'Master Admin' : 'User'}
            </p>
            <p className="text-xs text-zinc-500 truncate">{userEmail || 'loading...'}</p>
          </div>
          <LogOut size={16} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};