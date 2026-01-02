import React, { useState } from 'react';
import { Organization, Assistant } from '../types';
import { Building2, Plus, ArrowRight, DollarSign, Users, Activity, CreditCard, X, Link, Check, ClipboardCopy, Lock, Mail, Bot, Search, ArrowRightLeft } from 'lucide-react';
import { generateSecureToken } from '../services/vapiService';
import { supabaseService } from '../services/supabaseClient';

interface MasterOverviewProps {
  organizations: Organization[];
  assistants: Assistant[];
  onSelectOrg: (org: Organization) => void;
  onUpdateOrg: (org: Organization) => void;
  onAddOrg: (org: Organization) => void;
  onTransferAssistant: (assistant: Assistant, targetOrgId: string) => void;
}

export const MasterOverview: React.FC<MasterOverviewProps> = ({ 
    organizations, 
    assistants, 
    onSelectOrg, 
    onUpdateOrg, 
    onAddOrg, 
    onTransferAssistant 
}) => {
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState<Organization | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  
  // Add Org Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'trial' | 'pro' | 'enterprise'>('trial');
  const [isCreating, setIsCreating] = useState(false);
  
  // Bots Modal State
  const [showBotsModal, setShowBotsModal] = useState(false);
  const [botSearch, setBotSearch] = useState('');
  const [botToTransfer, setBotToTransfer] = useState<Assistant | null>(null);
  const [targetOrgId, setTargetOrgId] = useState('');

  // Copy Link State
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const [lastCopiedUrl, setLastCopiedUrl] = useState<string | null>(null);

  const totalUsage = organizations.reduce((acc, org) => acc + org.usageCost, 0);
  const totalCredits = organizations.reduce((acc, org) => acc + org.credits, 0);

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForCredit || !creditAmount) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updatedOrg = {
      ...selectedOrgForCredit,
      credits: selectedOrgForCredit.credits + amount
    };

    // Update locally
    onUpdateOrg(updatedOrg);
    // Sync to Supabase
    await supabaseService.updateOrganization(updatedOrg);

    setSelectedOrgForCredit(null);
    setCreditAmount('');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgPassword.trim() || !newOrgEmail.trim()) return;

    setIsCreating(true);
    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name: newOrgName,
      email: newOrgEmail,
      password: newOrgPassword, // Saving the login pass
      plan: newOrgPlan,
      credits: 10.00,
      usageCost: 0.00,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
        // Attempt to save to Supabase
        const savedOrg = await supabaseService.createOrganization(newOrg);
        
        // If Supabase worked, use returned data, otherwise use optimistic local data
        onAddOrg(savedOrg || newOrg);
        
        setShowAddModal(false);
        setNewOrgName('');
        setNewOrgEmail('');
        setNewOrgPassword('');
        setNewOrgPlan('trial');
    } catch (err) {
        alert("Failed to save organization to database. Using local storage fallback.");
        onAddOrg(newOrg);
        setShowAddModal(false);
    } finally {
        setIsCreating(false);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botToTransfer && targetOrgId) {
        onTransferAssistant(botToTransfer, targetOrgId);
        
        // Show success logic (e.g. alert) if desired, or just close
        const targetName = organizations.find(o => o.id === targetOrgId)?.name || 'target org';
        // We do NOT alert here to keep flow smooth or alert if you prefer:
        // alert(`Transferred ${botToTransfer.name} to ${targetName}`);

        setBotToTransfer(null);
        setTargetOrgId('');
    }
  };

  const copyOrgLink = (org: Organization) => {
    // Use the specific hosted URL for link generation
    const baseUrl = 'https://vapi-clone-ten.vercel.app';
    
    // Generate token with both ID and Name
    const token = generateSecureToken({ id: org.id, name: org.name });
    
    // Generate URL with encrypted token instead of raw ID
    const url = `${baseUrl}/?token=${token}`;
    
    navigator.clipboard.writeText(url);
    setCopiedOrgId(org.id);
    setLastCopiedUrl(url);
    setTimeout(() => {
        setCopiedOrgId(null);
        setLastCopiedUrl(null);
    }, 3000);
  };

  const getOrgName = (id: string) => organizations.find(o => o.id === id)?.name || 'Unknown Org';

  const filteredBots = assistants.filter(a => 
    a.name.toLowerCase().includes(botSearch.toLowerCase()) || 
    a.id.toLowerCase().includes(botSearch.toLowerCase()) ||
    getOrgName(a.orgId).toLowerCase().includes(botSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-vapi-bg p-8 font-sans animate-fade-in relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Master Account</h1>
              <p className="text-zinc-400 text-sm">Manage organizations and billing</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            <span>Add Organization</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Revenue (Usage)" 
            value={`$${totalUsage.toFixed(2)}`} 
            icon={<DollarSign size={20} className="text-emerald-400"/>} 
          />
          <StatCard 
            title="Total Outstanding Credits" 
            value={`$${totalCredits.toFixed(2)}`} 
            icon={<Activity size={20} className="text-blue-400"/>} 
          />
          <StatCard 
            title="Active Organizations" 
            value={organizations.filter(o => o.status === 'active').length.toString()} 
            icon={<Users size={20} className="text-purple-400"/>} 
          />
          {/* Total Bots Card - Clickable */}
          <div onClick={() => setShowBotsModal(true)} className="cursor-pointer group">
            <StatCard 
                title="Total Active Bots" 
                value={assistants.length.toString()} 
                icon={<Bot size={20} className="text-pink-400 group-hover:scale-110 transition-transform"/>} 
            />
          </div>
        </div>

        {/* Organizations List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Sub Accounts</h2>
          <div className="bg-vapi-card border border-vapi-border rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Organization</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Credits</th>
                  <th className="px-6 py-4 font-medium">Usage Cost</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {organizations.map(org => (
                  <tr key={org.id} className="group hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{org.name}</span>
                        {org.email && <span className="text-zinc-500 text-xs">{org.email}</span>}
                        <span className="text-zinc-600 text-[10px] font-mono">{org.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border
                        ${org.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          org.plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {org.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-mono">${org.credits.toFixed(2)}</td>
                    <td className="px-6 py-4 text-zinc-300 font-mono">${org.usageCost.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
                         ${org.status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                         {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button 
                          onClick={() => copyOrgLink(org)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                            copiedOrgId === org.id 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700 group-hover:border-zinc-600'
                          }`}
                          title="Copy Encrypted Login Link"
                        >
                          {copiedOrgId === org.id ? <Check size={14} /> : <Link size={14} />}
                        </button>
                        <button 
                          onClick={() => setSelectedOrgForCredit(org)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-colors border border-zinc-700 group-hover:border-zinc-600"
                          title="Add Credits"
                        >
                          <CreditCard size={14} />
                          Add Credit
                        </button>
                        <button 
                          onClick={() => onSelectOrg(org)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-vapi-accent text-black hover:bg-teal-300 text-xs font-medium rounded-lg transition-colors"
                        >
                          Manage <ArrowRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {lastCopiedUrl && (
          <div className="fixed bottom-6 right-6 bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 max-w-sm">
              <div className="bg-emerald-500/10 p-2 rounded-full">
                  <ClipboardCopy className="text-emerald-400" size={20} />
              </div>
              <div className="overflow-hidden">
                  <p className="text-white font-medium text-sm">Secure Login Link Copied!</p>
                  <p className="text-zinc-400 text-xs mt-1 truncate font-mono">{lastCopiedUrl}</p>
              </div>
              <button onClick={() => setLastCopiedUrl(null)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
              </button>
          </div>
      )}

      {/* Add Credit Modal */}
      {selectedOrgForCredit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-vapi-border bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">Add Credits</h3>
              <button 
                onClick={() => setSelectedOrgForCredit(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCredit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Organization</label>
                <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-medium">
                  {selectedOrgForCredit.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-4 py-3 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                    placeholder="Enter amount (e.g. 50.00)"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedOrgForCredit(null)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!creditAmount}
                  className="flex-1 px-4 py-2.5 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Org Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-vapi-border bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">New Organization</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrg} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Organization Name</label>
                <input 
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                    placeholder="e.g. My Startup"
                    autoFocus
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="email"
                        value={newOrgEmail}
                        onChange={(e) => setNewOrgEmail(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-4 py-3 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                        placeholder="admin@company.com"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Login Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="password"
                        value={newOrgPassword}
                        onChange={(e) => setNewOrgPassword(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-4 py-3 text-white focus:outline-none focus:border-vapi-accent transition-colors font-mono tracking-widest"
                        placeholder="Set organization password"
                    />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">Required for login if secure link is lost.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Plan</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['trial', 'pro', 'enterprise'] as const).map(plan => (
                        <button
                            key={plan}
                            type="button"
                            onClick={() => setNewOrgPlan(plan)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-all
                                ${newOrgPlan === plan 
                                    ? 'bg-vapi-accent text-black border-vapi-accent' 
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                        >
                            {plan}
                        </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newOrgName.trim() || !newOrgPassword.trim() || !newOrgEmail.trim() || isCreating}
                  className="flex-1 px-4 py-2.5 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bots List Modal */}
      {showBotsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-vapi-border bg-zinc-900/50">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">All Assistants</h3>
                    <p className="text-xs text-zinc-400">Total: {assistants.length}</p>
                  </div>
              </div>
              <button 
                onClick={() => setShowBotsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-vapi-border bg-zinc-900/20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={botSearch}
                        onChange={(e) => setBotSearch(e.target.value)}
                        placeholder="Search by name, ID, or organization..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-vapi-accent"
                    />
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
               <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                        <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                            <th className="px-6 py-3 font-medium">Assistant Name</th>
                            <th className="px-6 py-3 font-medium">Organization</th>
                            <th className="px-6 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-sm">
                        {filteredBots.map(bot => (
                            <tr key={bot.id} className="group hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="font-medium text-white">{bot.name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">{bot.id}</div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                                        <Building2 size={10} className="mr-1.5 opacity-60"/>
                                        {getOrgName(bot.orgId)}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button 
                                        onClick={() => setBotToTransfer(bot)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-400 text-xs font-medium rounded-lg transition-colors border border-zinc-700 hover:border-indigo-500/30"
                                    >
                                        <ArrowRightLeft size={12} />
                                        Transfer
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredBots.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                                    No assistants found.
                                </td>
                            </tr>
                        )}
                    </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Bot Modal */}
      {botToTransfer && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-sm shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4 text-white">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                   <ArrowRightLeft size={24} />
                </div>
                <h3 className="text-lg font-bold">Transfer Assistant</h3>
              </div>
              
              <div className="mb-6">
                  <p className="text-zinc-400 text-sm mb-4">
                    Move <span className="text-white font-medium">{botToTransfer.name}</span> from <span className="text-zinc-300">{getOrgName(botToTransfer.orgId)}</span>?
                  </p>
                  
                  <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Destination Organization</label>
                  <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                      <select
                          value={targetOrgId}
                          onChange={(e) => setTargetOrgId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-vapi-accent appearance-none cursor-pointer"
                      >
                          <option value="">Select an organization...</option>
                          {organizations
                              .filter(org => org.id !== botToTransfer.orgId) // Exclude current org
                              .map(org => (
                                  <option key={org.id} value={org.id}>{org.name}</option>
                              ))
                          }
                      </select>
                  </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setBotToTransfer(null); setTargetOrgId(''); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTransferSubmit}
                  disabled={!targetOrgId}
                  className="px-4 py-2 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Transfer
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => {
  return (
    <div className="bg-vapi-card border border-vapi-border rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
          <h2 className="text-3xl font-bold text-white">{value}</h2>
        </div>
        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
          {icon}
        </div>
      </div>
    </div>
  );
};