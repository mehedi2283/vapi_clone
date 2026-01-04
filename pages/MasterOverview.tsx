import React, { useState } from 'react';
import { Organization, Assistant } from '../types';
import { Building2, Plus, ArrowRight, DollarSign, Users, Activity, CreditCard, X, Link, Check, ClipboardCopy, Mail, Bot, Search, ArrowRightLeft, Shield, User, Lock, Edit, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Loader2, LogOut, Crown, CornerDownRight, ChevronDown } from 'lucide-react';
import { generateSecureToken, updateVapiAssistant, deleteVapiAssistant } from '../services/vapiService';
import { supabaseService } from '../services/supabaseClient';
import { useToast } from '../components/ToastProvider';
import { VAPI_PRIVATE_KEY } from '../constants';
import { CustomSelect } from '../components/CustomSelect';
import { AssistantEditor } from './Assistants';
import { Modal } from '../components/Modal';

interface MasterOverviewProps {
  organizations: Organization[];
  assistants: Assistant[];
  onSelectOrg: (org: Organization) => void;
  onUpdateOrg: (org: Organization) => void;
  onAddOrg: (org: Organization) => void;
  onDeleteOrg: (orgId: string) => void;
  onTransferAssistant: (assistant: Assistant, targetOrgId: string) => void;
  onUpdateAssistant: (assistant: Assistant) => void;
  onDeleteAssistant: (assistantId: string) => void;
}

export const MasterOverview: React.FC<MasterOverviewProps> = ({ 
    organizations, 
    assistants, 
    onSelectOrg, 
    onUpdateOrg, 
    onAddOrg, 
    onDeleteOrg,
    onTransferAssistant,
    onUpdateAssistant,
    onDeleteAssistant
}) => {
  const { showToast } = useToast();
  
  // State for Add Credit Modal
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState<Organization | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  
  // State for Edit Org Modal
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);

  // State for Delete Org Modal
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for Status Menu
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add Org Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'trial' | 'pro' | 'enterprise'>('trial');
  const [isCreating, setIsCreating] = useState(false);
  
  // Bots List Modal State
  const [showBotsModal, setShowBotsModal] = useState(false);
  const [botSearch, setBotSearch] = useState('');
  
  // Transfer Bot Modal State
  const [botToTransfer, setBotToTransfer] = useState<Assistant | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Assistant Edit State
  const [workingAssistant, setWorkingAssistant] = useState<Assistant | null>(null);
  const [isAssistantEditorOpen, setIsAssistantEditorOpen] = useState(false);
  const [assistantToEdit, setAssistantToEdit] = useState<Assistant | null>(null); // To track original
  const [isSavingAssistant, setIsSavingAssistant] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Copy Link State
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);

  const totalUsage = organizations.reduce((acc, org) => acc + org.usage_cost, 0);
  const totalCredits = organizations.reduce((acc, org) => acc + org.credits, 0);

  // --- Helper Functions to Open/Close Modals ---
  
  const openCreditModal = (org: Organization) => {
    setSelectedOrgForCredit(org);
    setIsCreditModalOpen(true);
  };
  const closeCreditModal = () => setIsCreditModalOpen(false);

  const openEditOrgModal = (org: Organization) => {
    setEditingOrg(org);
    setIsEditOrgModalOpen(true);
  };
  const closeEditOrgModal = () => setIsEditOrgModalOpen(false);

  const openDeleteOrgModal = (org: Organization) => {
    setOrgToDelete(org);
    setDeleteConfirmation('');
    setIsDeleteOrgModalOpen(true);
  };
  const closeDeleteOrgModal = () => setIsDeleteOrgModalOpen(false);

  const openTransferModal = (bot: Assistant) => {
      setBotToTransfer(bot);
      setIsTransferModalOpen(true);
  };
  const closeTransferModal = () => setIsTransferModalOpen(false);

  const openAssistantEditor = (bot: Assistant) => {
      setAssistantToEdit(bot);
      setWorkingAssistant(JSON.parse(JSON.stringify(bot)));
      setHasUnsavedChanges(false);
      setIsAssistantEditorOpen(true);
  };
  const closeAssistantEditor = () => setIsAssistantEditorOpen(false);

  // Helper to find parent organization (if this org was invited by someone)
  const getParentInfo = (email?: string) => {
    if (!email) return null;
    return organizations.find(o => o.members && o.members.some(m => m.toLowerCase() === email.toLowerCase()));
  };

  // --- Sorting & Pagination Logic ---
  const sortedOrgs = [...organizations].sort((a, b) => {
    const targetEmail = 'babu.octopidigital@gmail.com';
    // Move specific org to the TOP
    if (a.email === targetEmail) return -1;
    if (b.email === targetEmail) return 1;
    return 0; // Maintain original order (created_at desc)
  });

  const totalPages = Math.ceil(sortedOrgs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrgs = sortedOrgs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

    showToast(`Added $${amount} credits to ${selectedOrgForCredit.name}`, 'success');
    closeCreditModal();
    setCreditAmount('');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgEmail.trim()) return;

    setIsCreating(true);

    try {
        // Use isolated client to create user without disrupting current admin session
        const { user, error } = await supabaseService.createIsolatedUser(newOrgEmail, newOrgPassword, { org_name: newOrgName });
        
        if (error) throw error;
        if (!user) throw new Error("Failed to create user account");

        // Check if the trigger already created the org
        const existingOrg = await supabaseService.getOrganizationById(user.id);
        
        let savedOrg: Organization;

        if (existingOrg) {
             // Org created by trigger. Update details.
             savedOrg = { 
                 ...existingOrg, 
                 plan: newOrgPlan,
                 password: newOrgPassword 
             };
             await supabaseService.updateOrganization(savedOrg);
        } else {
             // Fallback: Manually create org if trigger didn't fire
             const newOrg: Organization = {
                id: user.id, 
                name: newOrgName,
                email: newOrgEmail,
                role: 'user',
                plan: newOrgPlan,
                credits: 10.00,
                usage_cost: 0.00,
                status: 'active',
                created_at: new Date().toISOString()
            };
            savedOrg = await supabaseService.createOrganization(newOrg, newOrgPassword);
        }

        onAddOrg(savedOrg);
        
        setShowAddModal(false);
        setNewOrgName('');
        setNewOrgEmail('');
        setNewOrgPassword('');
        setNewOrgPlan('trial');
        showToast('Organization created successfully!', 'success');
    } catch (err: any) {
        console.error("Create Org Error:", err);
        
        let msg = "Unknown error";
        
        if (typeof err === 'string') {
            msg = err;
        } else if (err instanceof Error) {
            msg = err.message;
        } else if (err && typeof err === 'object') {
            if (err.message) msg = err.message;
            else if (err.error_description) msg = err.error_description;
            else if (err.msg) msg = err.msg;
            else if (typeof err.error === 'string') msg = err.error;
            else {
                try {
                    const json = JSON.stringify(err);
                    if (json === '{}' || json === '[]') {
                        // Sometimes Error objects stringify to {}
                        msg = err.toString ? err.toString() : "An unexpected error occurred";
                        if (msg === '[object Object]') msg = "An error occurred during creation";
                    } else {
                        msg = json;
                    }
                } catch {
                    msg = "An error occurred during creation";
                }
            }
        }
        
        if (msg === '[object Object]') msg = "An unexpected system error occurred.";

        // Friendly User Messages
        if (msg.toLowerCase().includes('already registered')) {
            msg = "User already registered. Cannot create duplicate account.";
        }
        
        showToast(`Failed to create organization: ${msg}`, 'error');
    } finally {
        setIsCreating(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
        await supabaseService.updateOrganization(editingOrg);
        onUpdateOrg(editingOrg);
        closeEditOrgModal();
        showToast('Organization updated successfully', 'success');
    } catch (err: any) {
        console.error("Failed to update org:", err);
        showToast("Failed to update organization.", 'error');
    }
  };

  const confirmDeleteOrg = async () => {
    if (!orgToDelete) return;
    if (deleteConfirmation !== orgToDelete.name) return;

    setIsDeleting(true);
    try {
      await onDeleteOrg(orgToDelete.id);
      closeDeleteOrgModal();
      showToast('Organization deleted successfully', 'success');
    } catch (error) {
      showToast("Failed to delete organization", 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleStatusUpdate = async (org: Organization, newStatus: 'active' | 'suspended') => {
    if (org.status === newStatus) {
        setOpenStatusMenuId(null);
        return;
    }
    
    // Optimistic update
    const updatedOrg = { ...org, status: newStatus };
    onUpdateOrg(updatedOrg);
    setOpenStatusMenuId(null);
    
    try {
        await supabaseService.updateOrganization({ id: org.id, status: newStatus });
        showToast(`Organization ${newStatus === 'active' ? 'activated' : 'suspended'}`, 'success');
    } catch (e) {
        // Revert on failure
        onUpdateOrg(org);
        showToast("Failed to update status", "error");
    }
  };

  const getOrgName = (id: string) => organizations.find(o => o.id === id)?.name || 'Unknown Org';

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToTransfer || !targetOrgId) return;

    setIsTransferring(true);
    try {
        const currentOrgName = getOrgName(botToTransfer.orgId);
        const targetOrgName = getOrgName(targetOrgId);
        
        const oldSuffix = ` - ${currentOrgName}`;
        const newSuffix = ` - ${targetOrgName}`;
        
        let baseName = botToTransfer.name;
        
        // Strip old suffix if present
        if (baseName.endsWith(oldSuffix)) {
            baseName = baseName.slice(0, -oldSuffix.length);
        }

        // Vapi Limit is 40 chars. Ensure new name fits.
        const maxBaseLength = Math.max(0, 40 - newSuffix.length);
        if (baseName.length > maxBaseLength) {
            baseName = baseName.substring(0, maxBaseLength);
        }

        const newBotName = baseName + newSuffix;

        // 1. Update Name in Vapi
        const updatedBot = await updateVapiAssistant(VAPI_PRIVATE_KEY, {
            ...botToTransfer,
            name: newBotName
        });
        
        // 2. Persist Mapping in Supabase (CRITICAL for "stickiness")
        await supabaseService.saveAssistantMapping(updatedBot.id, targetOrgId);

        // 3. Update Local State
        onTransferAssistant(updatedBot, targetOrgId);

        showToast(`Transferred and renamed to "${updatedBot.name}" successfully`, 'success');
        closeTransferModal();
        setTargetOrgId('');
    } catch (error: any) {
        console.error("Transfer failed", error);
        // Display the actual error message from the Vapi service
        showToast(`Failed to transfer: ${error.message}`, 'error');
    } finally {
        setIsTransferring(false);
    }
  };

  const copyOrgLink = (org: Organization) => {
    const baseUrl = window.location.origin;
    const token = generateSecureToken({ id: org.id, name: org.name });
    const url = `${baseUrl}/?token=${token}`;
    
    navigator.clipboard.writeText(url);
    setCopiedOrgId(org.id);
    showToast('Secure Magic Link copied to clipboard!', 'info');
    setTimeout(() => {
        setCopiedOrgId(null);
    }, 3000);
  };

  // --- Assistant Edit Logic ---
  
  const handleAssistantChange = (updated: Assistant) => {
    setWorkingAssistant(updated);
    setHasUnsavedChanges(true);
  };
  
  const saveAssistantChanges = async () => {
    if (!workingAssistant) return;
    setIsSavingAssistant(true);
    
    try {
        const updated = await updateVapiAssistant(VAPI_PRIVATE_KEY, workingAssistant);
        onUpdateAssistant(updated);
        closeAssistantEditor();
        showToast(`Assistant "${updated.name}" updated successfully`, 'success');
    } catch (e: any) {
        showToast(`Failed to update assistant: ${e.message}`, 'error');
    } finally {
        setIsSavingAssistant(false);
    }
  };
  
  const deleteAssistant = async () => {
    if (!workingAssistant) return;
    if (!window.confirm(`Are you sure you want to delete ${workingAssistant.name}?`)) return;
    
    setIsSavingAssistant(true);
    try {
        await deleteVapiAssistant(VAPI_PRIVATE_KEY, workingAssistant.id);
        onDeleteAssistant(workingAssistant.id);
        closeAssistantEditor();
        showToast('Assistant deleted successfully', 'success');
    } catch (e: any) {
        showToast(`Failed to delete: ${e.message}`, 'error');
    } finally {
        setIsSavingAssistant(false);
    }
  };


  const filteredBots = assistants.filter(a => 
    a.name.toLowerCase().includes(botSearch.toLowerCase()) || 
    a.id.toLowerCase().includes(botSearch.toLowerCase()) ||
    getOrgName(a.orgId).toLowerCase().includes(botSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-vapi-bg p-8 font-sans animate-fade-in relative pb-20">
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
          <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAddModal(true)}
                className="group/add flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} className="group-hover/add:rotate-90 transition-transform duration-300" />
                <span>Add Organization</span>
              </button>
              
              <div className="h-6 w-px bg-zinc-800 mx-1"></div>
              
              <button 
                onClick={() => supabaseService.signOut()}
                className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
                title="Log Out"
              >
                 <LogOut size={18} />
                 <span className="text-sm font-medium">Log Out</span>
              </button>
          </div>
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
          <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="pl-6 pr-4 py-4 font-medium w-[32%]">Organization</th>
                    <th className="px-6 py-4 font-medium w-[10%]">Role</th>
                    <th className="px-6 py-4 font-medium w-[15%]">Plan</th>
                    <th className="px-6 py-4 font-medium w-[10%]">Credits</th>
                    <th className="px-6 py-4 font-medium w-[10%]">Status</th>
                    <th className="pl-6 pr-12 py-4 font-medium text-right w-[23%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-sm">
                  {currentOrgs.map(org => {
                    // Check if this org was invited by another org
                    const parent = getParentInfo(org.email);
                    
                    return (
                    <tr key={org.id} className="group hover:bg-zinc-900/40 transition-colors">
                      <td className="pl-6 pr-4 py-6 align-middle">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                             <span className="text-white font-bold text-base truncate max-w-[220px]" title={org.name}>{org.name}</span>
                             
                             {/* Enhanced Crown Icon for Parent Orgs */}
                             {org.members && org.members.length > 0 && (
                                <div className="relative group/crown ml-2">
                                    {/* Trigger */}
                                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-help hover:bg-amber-500/20 transition-colors">
                                        <Crown size={12} className="fill-amber-500/20" />
                                    </div>

                                    {/* Tooltip Container */}
                                    <div className="absolute left-0 top-full mt-2 w-72 bg-[#09090b] border border-zinc-800 rounded-xl shadow-[0_0_30px_-10px_rgba(0,0,0,0.8)] z-[100] opacity-0 invisible group-hover/crown:opacity-100 group-hover/crown:visible transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] translate-y-2 group-hover/crown:translate-y-0 pointer-events-none">
                                        
                                        {/* Header */}
                                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 rounded-t-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Crown size={14} className="text-amber-500 fill-amber-500/20" />
                                                <span className="text-xs font-bold text-zinc-100">Parent Organization</span>
                                            </div>
                                            <div className="bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-500">
                                                OWNER
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Invited Organizations</span>
                                                <span className="text-xs font-mono text-zinc-300">Invited {org.members.length} Orgs</span>
                                            </div>

                                            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                                                {org.members.map((email, idx) => (
                                                    <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                                                            {email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs text-zinc-300 truncate font-medium">{email}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             )}
                          </div>
                          <div className="flex items-center gap-1.5">
                             {org.email ? (
                                 <span className="text-zinc-500 text-xs font-medium truncate max-w-[220px]">{org.email}</span>
                             ) : (
                                 <span className="text-zinc-500 text-xs italic">No email</span>
                             )}
                          </div>
                          
                          <span className="text-zinc-700 text-[10px] font-mono tracking-wide">{org.id.substring(0, 18)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-middle">
                        {org.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Shield size={12} className="fill-amber-500/20" />
                                Admin
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                <User size={12} />
                                User
                            </span>
                        )}
                      </td>
                      <td className="px-6 py-6 align-middle">
                        <button 
                          onClick={() => openEditOrgModal(org)} 
                          className="group/plan flex items-center gap-2 hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Edit Plan"
                        >
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border
                              ${org.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                org.plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                              {org.plan.toUpperCase()}
                            </span>
                            <Edit size={12} className="text-zinc-400 hover:text-white transition-colors" />
                        </button>
                      </td>
                      {/* Removed Members Column */}
                      <td className="px-6 py-6 align-middle text-zinc-300 font-mono font-medium">${org.credits.toFixed(2)}</td>
                      <td className="px-6 py-6 align-middle relative">
                        <div className="relative">
                            <button 
                                onClick={() => setOpenStatusMenuId(openStatusMenuId === org.id ? null : org.id)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all hover:brightness-110 active:scale-95
                                   ${org.status === 'active' ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-red-400 bg-red-400/10 hover:bg-red-400/20'}`}
                            >
                               <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                               {org.status}
                               <ChevronDown size={10} className="ml-1 opacity-50" />
                            </button>

                            {/* Dropdown */}
                            {openStatusMenuId === org.id && (
                                <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenStatusMenuId(null)}></div>
                                <div className="absolute top-full left-0 mt-2 w-32 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => handleStatusUpdate(org, 'active')}
                                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                        Active
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(org, 'suspended')}
                                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                        Suspended
                                    </button>
                                </div>
                                </>
                            )}
                        </div>
                      </td>
                      <td className="pl-6 pr-12 py-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                           {/* COPY LINK BUTTON */}
                           <button 
                            onClick={() => copyOrgLink(org)}
                            className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors border ${
                              copiedOrgId === org.id 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700'
                            }`}
                            title="Copy Magic Login Link"
                          >
                            {copiedOrgId === org.id ? <Check size={16} /> : <Link size={16} className="group-hover/link:rotate-12 transition-transform" />}
                          </button>

                          {/* ADD CREDIT BUTTON */}
                          <button 
                            onClick={() => openCreditModal(org)}
                            className="h-9 group/credit flex items-center gap-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-colors border border-zinc-700 whitespace-nowrap"
                            title="Add Credits"
                          >
                            <CreditCard size={14} className="group-hover/credit:scale-110 transition-transform" />
                            Add Credit
                          </button>

                          {/* MANAGE BUTTON (ORANGE) */}
                          <button 
                            onClick={() => onSelectOrg(org)}
                            className="h-9 group/manage flex items-center gap-2 px-4 bg-vapi-accent hover:bg-orange-500 text-black text-xs font-bold rounded-lg transition-colors shadow-lg shadow-orange-500/10 whitespace-nowrap"
                          >
                            Manage <ArrowRight size={14} className="group-hover/manage:translate-x-1 transition-transform" />
                          </button>
                          
                          {/* DELETE BUTTON */}
                          <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                          <button
                            onClick={() => openDeleteOrgModal(org)}
                            className="h-9 w-9 flex items-center justify-center group/delete text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete Organization"
                          >
                            <Trash2 size={16} className="group-hover/delete:rotate-12 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
                 <p className="text-xs text-zinc-500">
                    Showing <span className="font-medium text-white">{startIndex + 1}</span> to <span className="font-medium text-white">{Math.min(startIndex + ITEMS_PER_PAGE, sortedOrgs.length)}</span> of <span className="font-medium text-white">{sortedOrgs.length}</span> results
                 </p>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                       <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                       <button
                         key={i}
                         onClick={() => goToPage(i + 1)}
                         className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors border ${
                            currentPage === i + 1 
                            ? 'bg-vapi-accent text-black border-vapi-accent' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                         }`}
                       >
                          {i + 1}
                       </button>
                    ))}
                    <button 
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                       <ChevronRight size={16} />
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Organization Modal */}
      <Modal 
        isOpen={isDeleteOrgModalOpen} 
        onClose={closeDeleteOrgModal} 
        onClosed={() => setOrgToDelete(null)}
        className="max-w-sm"
      >
        <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-4 text-white">
               <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <AlertTriangle size={24} />
               </div>
               <h3 className="text-lg font-bold">Delete Organization</h3>
            </div>
            
            <p className="text-zinc-400 text-sm mb-4">
               This action is permanent. All assistants, logs, and data for this organization will be lost.
            </p>
            
            {orgToDelete && (
                <div className="mb-6 space-y-2">
                <label className="text-xs text-zinc-500 font-medium">
                    Type <span className="text-white font-mono select-all bg-zinc-900 px-1 py-0.5 rounded">{orgToDelete.name}</span> to confirm:
                </label>
                <input 
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={orgToDelete.name}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    autoFocus
                />
                </div>
            )}

            <div className="flex justify-end gap-3">
               <button 
                  onClick={closeDeleteOrgModal}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
               >
                  Cancel
               </button>
               <button 
                  onClick={confirmDeleteOrg}
                  disabled={!orgToDelete || deleteConfirmation !== orgToDelete.name || isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isDeleting ? 'Deleting...' : 'Delete'}
               </button>
            </div>
        </div>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal 
        isOpen={isEditOrgModalOpen} 
        onClose={closeEditOrgModal} 
        onClosed={() => setEditingOrg(null)}
        className="max-w-sm overflow-visible"
      >
           <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-vapi-border bg-zinc-900/50">
                  <h3 className="text-lg font-bold text-white">Edit Organization</h3>
                  <button onClick={closeEditOrgModal} className="text-zinc-500 hover:text-white">
                      <X size={20} />
                  </button>
              </div>
              {editingOrg && (
                <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Organization</label>
                        <input type="text" value={editingOrg.name} disabled className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-500 cursor-not-allowed"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Plan</label>
                        <CustomSelect
                            value={editingOrg.plan}
                            onChange={(val) => setEditingOrg({...editingOrg, plan: val as any})}
                            options={[
                                { value: 'trial', label: 'Trial' },
                                { value: 'pro', label: 'Pro' },
                                { value: 'enterprise', label: 'Enterprise' }
                            ]}
                        />
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="w-full bg-vapi-accent hover:bg-orange-500 text-black font-bold py-2 rounded-lg transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
              )}
           </div>
      </Modal>

      {/* Add Credit Modal */}
      <Modal 
        isOpen={isCreditModalOpen} 
        onClose={closeCreditModal} 
        onClosed={() => setSelectedOrgForCredit(null)}
        className="max-w-md"
      >
          <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-vapi-border bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">Add Credits</h3>
              <button 
                onClick={closeCreditModal}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {selectedOrgForCredit && (
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
                    onClick={closeCreditModal}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                    >
                    Cancel
                    </button>
                    <button 
                    type="submit"
                    disabled={!creditAmount}
                    className="flex-1 px-4 py-2.5 bg-vapi-accent hover:bg-orange-500 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    Add Credits
                    </button>
                </div>
                </form>
            )}
          </div>
      </Modal>

      {/* Add Org Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        className="max-w-md overflow-visible"
      >
          <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl">
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
                <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={newOrgPassword}
                        onChange={(e) => setNewOrgPassword(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-4 py-3 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                        placeholder="Create user password..."
                    />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Plan</label>
                    <CustomSelect 
                        value={newOrgPlan}
                        onChange={(val) => setNewOrgPlan(val as any)}
                        options={[
                            { value: 'trial', label: 'Trial' },
                            { value: 'pro', label: 'Pro' },
                            { value: 'enterprise', label: 'Enterprise' }
                        ]}
                    />
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
                  disabled={!newOrgName.trim() || !newOrgEmail.trim() || !newOrgPassword.trim() || isCreating}
                  className="flex-1 px-4 py-2.5 bg-vapi-accent hover:bg-orange-500 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
      </Modal>

      {/* Bots List Modal */}
      <Modal
        isOpen={showBotsModal}
        onClose={() => setShowBotsModal(false)}
        className="max-w-4xl"
      >
          <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
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
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openAssistantEditor(bot)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium rounded-lg transition-colors border border-zinc-700 hover:border-white/20"
                                        >
                                            <Edit size={12} />
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => openTransferModal(bot)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-400 text-xs font-medium rounded-lg transition-colors border border-zinc-700 hover:border-indigo-500/30"
                                        >
                                            <ArrowRightLeft size={12} />
                                            Transfer
                                        </button>
                                    </div>
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
      </Modal>

      {/* Assistant Editor Overlay */}
      <Modal 
        isOpen={isAssistantEditorOpen} 
        onClose={closeAssistantEditor}
        onClosed={() => {
            setWorkingAssistant(null);
            setAssistantToEdit(null);
        }}
        fullScreen={true}
      >
        {workingAssistant && (
            <AssistantEditor 
                assistant={workingAssistant}
                onChange={handleAssistantChange}
                onBack={closeAssistantEditor}
                onSave={saveAssistantChanges}
                onDelete={deleteAssistant}
                hasChanges={hasUnsavedChanges}
                isSaving={isSavingAssistant}
                orgName={getOrgName(workingAssistant.orgId)}
            />
        )}
      </Modal>

      {/* Transfer Bot Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={closeTransferModal}
        onClosed={() => {
            setBotToTransfer(null);
            setTargetOrgId('');
        }}
        className="max-w-sm overflow-visible"
      >
           <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4 text-white">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                   <ArrowRightLeft size={24} />
                </div>
                <h3 className="text-lg font-bold">Transfer Assistant</h3>
              </div>
              
              {botToTransfer && (
                <div className="mb-6">
                  <p className="text-zinc-400 text-sm mb-4">
                    Move <span className="text-white font-medium">{botToTransfer.name}</span> from <span className="text-zinc-300">{getOrgName(botToTransfer.orgId)}</span>?
                  </p>
                  
                  <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Destination Organization</label>
                  <CustomSelect
                      value={targetOrgId}
                      onChange={setTargetOrgId}
                      options={organizations
                          .filter(org => org.id !== botToTransfer.orgId)
                          .map(org => ({ value: org.id, label: org.name }))
                      }
                      placeholder="Select an organization..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button 
                  onClick={closeTransferModal}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTransferSubmit}
                  disabled={!targetOrgId || isTransferring}
                  className="px-4 py-2 bg-vapi-accent hover:bg-orange-500 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTransferring ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirm Transfer
                </button>
              </div>
           </div>
      </Modal>

    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 backdrop-blur-sm group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
};