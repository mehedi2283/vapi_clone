import React, { useState } from 'react';
import { Organization } from '../types';
import { Building2, Plus, ArrowRight, DollarSign, Users, Activity, CreditCard, X, Link, Check } from 'lucide-react';

interface MasterOverviewProps {
  organizations: Organization[];
  onSelectOrg: (org: Organization) => void;
  onUpdateOrg: (org: Organization) => void;
  onAddOrg: (org: Organization) => void;
}

export const MasterOverview: React.FC<MasterOverviewProps> = ({ organizations, onSelectOrg, onUpdateOrg, onAddOrg }) => {
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState<Organization | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  
  // Add Org Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'trial' | 'pro' | 'enterprise'>('trial');
  
  // Copy Link State
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);

  const totalUsage = organizations.reduce((acc, org) => acc + org.usageCost, 0);
  const totalCredits = organizations.reduce((acc, org) => acc + org.credits, 0);

  const handleAddCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForCredit || !creditAmount) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updatedOrg = {
      ...selectedOrgForCredit,
      credits: selectedOrgForCredit.credits + amount
    };

    onUpdateOrg(updatedOrg);
    setSelectedOrgForCredit(null);
    setCreditAmount('');
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name: newOrgName,
      plan: newOrgPlan,
      credits: 10.00,
      usageCost: 0.00,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddOrg(newOrg);
    setShowAddModal(false);
    setNewOrgName('');
    setNewOrgPlan('trial');
  };

  const copyOrgLink = (orgId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?orgId=${orgId}`;
    navigator.clipboard.writeText(url);
    setCopiedOrgId(orgId);
    setTimeout(() => setCopiedOrgId(null), 2000);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <span className="text-zinc-500 text-xs font-mono">{org.id}</span>
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
                          onClick={() => copyOrgLink(org.id)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                            copiedOrgId === org.id 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700 group-hover:border-zinc-600'
                          }`}
                          title="Copy Direct Login Link"
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
                  disabled={!newOrgName.trim()}
                  className="flex-1 px-4 py-2.5 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-vapi-card border border-vapi-border rounded-xl p-6 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-zinc-400 text-sm font-medium">{title}</span>
      <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">{icon}</div>
    </div>
    <span className="text-3xl font-bold text-white">{value}</span>
  </div>
);