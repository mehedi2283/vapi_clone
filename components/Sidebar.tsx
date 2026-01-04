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
  ChevronLeft,
  Settings as SettingsIcon,
  Command,
  ChevronDown,
  Check,
  Building2
} from 'lucide-react';
import { supabaseService } from '../services/supabaseClient';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  selectedOrg: Organization;
  organizations?: Organization[];
  onSelectOrg?: (org: Organization) => void;
  onBackToMaster: () => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    currentView, 
    onChangeView, 
    selectedOrg, 
    organizations = [], 
    onSelectOrg, 
    onBackToMaster, 
    isAdmin 
}) => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  
  useEffect(() => {
    supabaseService.getCurrentUser().then(user => {
        if (user?.email) setUserEmail(user.email);
    });
  }, []);

  // Toggle dropdown
  const toggleOrgMenu = () => setIsOrgMenuOpen(!isOrgMenuOpen);

  // Handle switching
  const handleSwitchOrg = (org: Organization) => {
      if (onSelectOrg) onSelectOrg(org);
      setIsOrgMenuOpen(false);
  };

  const navItemClass = (view: ViewState) => `
    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group outline-none focus:outline-none focus:ring-0 select-none
    ${currentView === view 
      ? 'bg-white/10 text-white shadow-sm' 
      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'}
  `;

  const hasMultipleOrgs = organizations.length > 1;

  return (
    <div className="w-64 h-screen border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-50 shadow-2xl shadow-black select-none">
      {/* Org Header */}
      <div className="p-4 pt-6 relative outline-none focus:outline-none">
        {isAdmin && (
            <button 
            onClick={onBackToMaster}
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-vapi-accent mb-4 transition-colors group w-full px-1 outline-none focus:outline-none focus:ring-0"
            >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Master
            </button>
        )}
        
        {/* Switcher Trigger */}
        <div 
            onClick={hasMultipleOrgs ? toggleOrgMenu : undefined}
            className={`flex items-center gap-3 px-2 mb-6 rounded-lg transition-colors outline-none focus:outline-none focus:ring-0 select-none ${hasMultipleOrgs ? 'cursor-pointer hover:bg-white/5 p-2 -ml-2 -mr-2' : ''}`}
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-vapi-accent to-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(251,146,60,0.3)] shrink-0">
             <Command className="text-black" size={16} />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white truncate leading-tight">{selectedOrg.name}</h2>
                {hasMultipleOrgs && <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOrgMenuOpen ? 'rotate-180' : ''}`} />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-vapi-accent shadow-[0_0_5px_rgba(251,146,60,0.5)]"></span>
              <p className="text-[10px] text-zinc-500 font-mono truncate">Org Active</p>
            </div>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOrgMenuOpen && hasMultipleOrgs && (
            <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOrgMenuOpen(false)}></div>
                <div className="absolute top-[80px] left-3 right-3 z-20 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Switch Organization</div>
                    {organizations.map(org => (
                        <button
                            key={org.id}
                            onClick={() => handleSwitchOrg(org)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors outline-none focus:outline-none focus:ring-0
                                ${selectedOrg.id === org.id ? 'text-white' : 'text-zinc-400'}
                            `}
                        >
                            <span className="truncate pr-2">{org.name}</span>
                            {selectedOrg.id === org.id && <Check size={14} className="text-vapi-accent" />}
                        </button>
                    ))}
                </div>
            </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 outline-none focus:outline-none">
        <div onClick={() => onChangeView('overview')} className={navItemClass('overview')}>
          <LayoutDashboard size={18} className={currentView === 'overview' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Overview</span>
        </div>
        <div onClick={() => onChangeView('assistants')} className={navItemClass('assistants')}>
          <Bot size={18} className={currentView === 'assistants' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Assistants</span>
        </div>
        <div onClick={() => onChangeView('phone-numbers')} className={navItemClass('phone-numbers')}>
          <Phone size={18} className={currentView === 'phone-numbers' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Phone Numbers</span>
        </div>
        
        <div className="pt-6 pb-2 px-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">Developers</span>
        </div>

        <div onClick={() => onChangeView('logs')} className={navItemClass('logs')}>
          <ScrollText size={18} className={currentView === 'logs' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Logs</span>
        </div>
        <div onClick={() => onChangeView('files')} className={navItemClass('files')}>
          <FileAudio size={18} className={currentView === 'files' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Files</span>
        </div>
        <div onClick={() => onChangeView('tools')} className={navItemClass('tools')}>
          <Wrench size={18} className={currentView === 'tools' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
          <span>Tools</span>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/5 bg-black/20 outline-none focus:outline-none">
        <div onClick={() => onChangeView('settings')} className={`${navItemClass('settings')} mb-2`}>
             <SettingsIcon size={18} className={currentView === 'settings' ? 'text-vapi-accent' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
             <span>Settings</span>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/5 select-none">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium text-zinc-400">Credits Usage</span>
                <span className="text-[10px] font-mono text-white">${selectedOrg.credits.toFixed(2)}</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-vapi-accent w-[35%] rounded-full shadow-[0_0_10px_rgba(251,146,60,0.3)]"></div>
            </div>
            
            <div 
                onClick={() => supabaseService.signOut()}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors pt-2 border-t border-white/5 outline-none focus:outline-none focus:ring-0"
            >
                <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                    {(userEmail || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate flex-1">{userEmail}</span>
                <LogOut size={12} />
            </div>
        </div>
      </div>
    </div>
  );
};