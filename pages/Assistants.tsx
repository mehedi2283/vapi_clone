import React, { useState, useEffect, useRef } from 'react';
import { Assistant, ChatMessage, Organization } from '../types';
import { Plus, Search, MoreHorizontal, MessageSquare, Save, Play, Mic, Terminal, Sparkles, X, ChevronLeft, Volume2, Phone, Loader2, Key, Trash2, AlertTriangle, Edit, Trash, ArrowRightLeft, Building2 } from 'lucide-react';
import { generateSystemPrompt, chatWithAssistant, generateSpeech } from '../services/geminiService';
import { createVapiAssistant, updateVapiAssistant, deleteVapiAssistant } from '../services/vapiService';
import { VAPI_PRIVATE_KEY } from '../constants';

// Voices from the screenshot
const ELEVEN_LABS_VOICES = [
  'burt', 'marissa', 'andrea', 'sarah', 'phillip', 'steve', 
  'joseph', 'myra', 'paula', 'ryan', 'drew', 'paul', 'mrb', 'matilda', 'mark'
];

interface AssistantsProps {
  assistants: Assistant[];
  setAssistants: React.Dispatch<React.SetStateAction<Assistant[]>>;
  selectedOrgId: string;
  selectedOrgName: string;
  organizations: Organization[];
}

export const Assistants: React.FC<AssistantsProps> = ({ assistants, setAssistants, selectedOrgId, selectedOrgName, organizations }) => {
  // Filter assistants for the current organization
  const filteredAssistants = assistants.filter(a => a.orgId === selectedOrgId);
  
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  
  // Editor State
  const [editedAssistant, setEditedAssistant] = useState<Assistant | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null);

  // Deletion State
  const [assistantToDelete, setAssistantToDelete] = useState<Assistant | null>(null);
  
  // Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [assistantToTransfer, setAssistantToTransfer] = useState<Assistant | null>(null);
  const [targetOrgId, setTargetOrgId] = useState('');

  // UI State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modals
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
        window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  const handleSelect = (asst: Assistant) => {
    setSelectedAssistant(asst);
    setEditedAssistant(JSON.parse(JSON.stringify(asst))); // Deep copy
    setHasUnsavedChanges(false);
  };

  const handleCreate = () => {
    const newAsst: Assistant = {
      id: `asst_draft_${Date.now()}`,
      orgId: selectedOrgId, // Assign to current organization
      name: 'New Assistant',
      model: {
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: '',
        temperature: 0.7
      },
      // Default to 'sarah' as requested
      voice: { provider: '11labs', voiceId: 'sarah' }, 
      transcriber: { provider: 'deepgram', language: 'en' },
      createdAt: new Date().toISOString()
    };
    
    // Add to global list
    setAssistants(prev => [newAsst, ...prev]);
    // Select immediately
    handleSelect(newAsst);
  };

  const handleBack = () => {
    setSelectedAssistant(null);
    setEditedAssistant(null);
  };

  const getEffectiveApiKey = () => {
    // If the user has manually entered a key via the modal (e.g. after a 401), use it.
    if (userApiKey) return userApiKey;
    // Otherwise use the global constant.
    return VAPI_PRIVATE_KEY;
  };

  const executeSave = async (apiKeyToUse: string) => {
    if (!editedAssistant) return;
    setIsSaving(true);

    try {
      // Check if it's a new draft
      if (editedAssistant.id.startsWith('asst_draft_')) {
        // Enforce Org Name Suffix for new assistants
        // Note: The editor now manages the name visually, but we ensure it's correct here too
        let assistantToSave = { ...editedAssistant };
        const suffix = ` - ${selectedOrgName}`;
        if (!assistantToSave.name.endsWith(suffix)) {
             assistantToSave.name = `${assistantToSave.name}${suffix}`;
        }

        // Create new assistant via API
        const createdAssistant = await createVapiAssistant(apiKeyToUse, assistantToSave);
        
        if (createdAssistant) {
          // IMPORTANT: Override the returned orgId to match the current view's context
          const assistanWithContext = {
            ...createdAssistant,
            orgId: selectedOrgId 
          };

          setAssistants(prev => prev.map(a => a.id === editedAssistant.id ? assistanWithContext : a));
          setSelectedAssistant(assistanWithContext);
          setEditedAssistant(assistanWithContext);
          alert(`Assistant "${createdAssistant.name}" created successfully in Vapi!`);
        }
      } else {
        // Update existing assistant
        const updatedAssistant = await updateVapiAssistant(apiKeyToUse, editedAssistant);
        
        const assistanWithContext = {
            ...updatedAssistant,
            orgId: selectedOrgId 
        };

        setAssistants(prev => prev.map(a => a.id === editedAssistant.id ? assistanWithContext : a));
        setSelectedAssistant(assistanWithContext);
        setEditedAssistant(assistanWithContext);
        alert(`Assistant "${updatedAssistant.name}" updated successfully!`);
      }
      
      setHasUnsavedChanges(false);
      setShowApiKeyModal(false);
    } catch (error: any) {
      console.error("Failed to save assistant", error);
      alert(`Failed to save to Vapi: ${error.message}`);
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        setShowApiKeyModal(true);
      }
    } finally {
      setIsSaving(false);
      setPendingAction(null);
    }
  };

  const executeDelete = async (apiKeyToUse: string) => {
    const target = assistantToDelete;
    if (!target) return;
    
    setIsSaving(true);

    try {
        const isMock = target.id.startsWith('asst_') && !target.id.includes('-');
        const isDraft = target.id.startsWith('asst_draft_');

        if (!isDraft && !isMock) {
             console.log("Deleting assistant from Vapi:", target.id);
             await deleteVapiAssistant(apiKeyToUse, target.id);
        } else {
             console.log("Skipping server delete for mock/draft assistant:", target.id);
        }
        
        // Remove from local state
        setAssistants(prev => prev.filter(a => a.id !== target.id));
        
        // If we deleted the currently selected assistant, go back
        if (selectedAssistant?.id === target.id) {
            handleBack();
        }

        setAssistantToDelete(null);
        
        // Use a small timeout to let the UI update before alerting
        setTimeout(() => alert('Assistant deleted successfully.'), 100);
        
        setShowApiKeyModal(false);
    } catch (error: any) {
        // Auth errors: Stop and ask for key
        if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
            console.error("Auth error during delete:", error);
            setShowApiKeyModal(true);
            setUserApiKey(''); 
            return;
        }

        // For other errors (404, 500, etc.), force local delete so user isn't stuck
        console.warn("Server delete failed or not found, forcing local delete:", error.message);
        
        setAssistants(prev => prev.filter(a => a.id !== target.id));
        if (selectedAssistant?.id === target.id) {
            handleBack();
        }
        setAssistantToDelete(null);
        
        const msg = error.message.includes('404') 
            ? 'Assistant was deleted (it may have already been removed from the server).'
            : `Note: Assistant removed locally, but server reported an error: ${error.message}`;
        
        setTimeout(() => alert(msg), 100);
        
        setShowApiKeyModal(false);
    } finally {
        setIsSaving(false);
        setPendingAction(null);
    }
  };

  const handleSaveClick = async () => {
    setPendingAction('save');
    const key = getEffectiveApiKey();
    if (key) {
      await executeSave(key);
    } else {
      setShowApiKeyModal(true);
    }
  };

  const handleDeleteClick = (assistant: Assistant, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setAssistantToDelete(assistant);
    setShowDeleteConfirm(true);
  };
  
  const handleTransferClick = (assistant: Assistant, e?: React.MouseEvent) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    setAssistantToTransfer(assistant);
    setTargetOrgId(''); // Reset selection
    setShowTransferModal(true);
  };

  const confirmTransfer = () => {
    if (!assistantToTransfer || !targetOrgId) return;

    // In a real scenario, this might call an API endpoint to move the assistant
    // Here we update the local state to "move" it to another Org ID
    setAssistants(prev => prev.map(a => 
        a.id === assistantToTransfer.id 
        ? { ...a, orgId: targetOrgId } 
        : a
    ));

    const targetOrgName = organizations.find(o => o.id === targetOrgId)?.name || 'target organization';
    alert(`Assistant "${assistantToTransfer.name}" transferred to ${targetOrgName}.`);
    
    setShowTransferModal(false);
    setAssistantToTransfer(null);
    setTargetOrgId('');
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setPendingAction('delete');
    
    const key = getEffectiveApiKey();
    if (key) {
        await executeDelete(key);
    } else {
        setShowApiKeyModal(true);
    }
  };

  const handleModalConfirm = async () => {
    if (pendingAction === 'save') {
        await executeSave(userApiKey);
    } else if (pendingAction === 'delete') {
        await executeDelete(userApiKey);
    }
  };

  if (selectedAssistant && editedAssistant) {
    return (
      <>
        <AssistantEditor 
          assistant={editedAssistant} 
          onChange={(updated) => {
            setEditedAssistant(updated);
            setHasUnsavedChanges(true);
          }}
          onBack={handleBack}
          onSave={handleSaveClick}
          onDelete={(e) => handleDeleteClick(editedAssistant, e)}
          onTransfer={() => handleTransferClick(editedAssistant)}
          hasChanges={hasUnsavedChanges}
          isSaving={isSaving}
          orgName={selectedOrgName}
        />
        
        {/* Delete Confirmation Modal (Reusable for Editor) */}
        {showDeleteConfirm && assistantToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-sm shadow-2xl p-6 border-red-500/20">
                <div className="flex items-center gap-3 mb-4 text-white">
                  <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Delete Assistant?</h3>
                </div>
                <p className="text-zinc-400 text-sm mb-6">
                  Are you sure you want to delete <span className="text-white font-medium">{assistantToDelete.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => { setShowDeleteConfirm(false); setAssistantToDelete(null); }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20"
                  >
                    Yes, Delete
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Transfer Assistant Modal (For Editor Context) */}
        {showTransferModal && assistantToTransfer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-sm shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4 text-white">
                    <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                    <ArrowRightLeft size={24} />
                    </div>
                    <h3 className="text-lg font-bold">Transfer Assistant</h3>
                </div>
                
                <div className="mb-6">
                    <p className="text-zinc-400 text-sm mb-4">
                        Move <span className="text-white font-medium">{assistantToTransfer.name}</span> to another organization?
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
                                .filter(org => org.id !== selectedOrgId) // Exclude current org
                                .map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                    onClick={() => { setShowTransferModal(false); setAssistantToTransfer(null); setTargetOrgId(''); }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                    >
                    Cancel
                    </button>
                    <button 
                    onClick={confirmTransfer}
                    disabled={!targetOrgId}
                    className="px-4 py-2 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    Confirm Transfer
                    </button>
                </div>
            </div>
            </div>
        )}

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center gap-2 mb-4 text-white">
                  <Key className="text-vapi-accent" size={20} />
                  <h3 className="text-lg font-bold">Enter Vapi Private Key</h3>
                </div>
                <p className="text-zinc-400 text-sm mb-4">
                  {pendingAction === 'delete' 
                    ? 'To delete this assistant from your Vapi account, please verify your Private API Key.'
                    : 'To publish this assistant to your real Vapi account, please provide your Private API Key.'}
                </p>
                <input 
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="vapi_private_..."
                  className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vapi-accent mb-6 font-mono text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => {
                        setShowApiKeyModal(false);
                        setPendingAction(null);
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleModalConfirm}
                    disabled={!userApiKey}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 ${pendingAction === 'delete' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-vapi-accent hover:bg-teal-300 text-black'}`}
                  >
                    {pendingAction === 'delete' ? 'Confirm Delete' : 'Save & Publish'}
                  </button>
                </div>
             </div>
          </div>
        )}
      </>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Assistants</h1>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-vapi-accent hover:bg-teal-300 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          <span>Create Assistant</span>
        </button>
      </div>

      <div className="flex items-center gap-4 bg-vapi-card p-2 rounded-lg border border-vapi-border">
        <Search className="text-zinc-500 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search assistants..." 
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-zinc-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filteredAssistants.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500">
            <BotIcon />
            <p className="mt-4 text-sm">No assistants found for this organization.</p>
            <button onClick={handleCreate} className="mt-2 text-vapi-accent hover:underline text-sm">Create your first one</button>
          </div>
        ) : (
          filteredAssistants.map(asst => (
            <div 
              key={asst.id} 
              // Removed onClick here to prevent navigation when clicking the card body
              className="group relative bg-vapi-card border border-vapi-border hover:border-zinc-700 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 overflow-visible cursor-default"
            >
              {/* Static Accent Bar - Always visible as per screenshot */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-vapi-accent rounded-l-xl"></div>
              
              <div className="flex justify-between items-start mb-2 pl-3 relative">
                <h3 className="text-base font-semibold text-white pr-8 truncate">{asst.name}</h3>
                
                {/* Actions: Transfer & Menu */}
                <div className="absolute right-0 top-0 z-20 flex items-center">
                    {/* Direct Transfer Button (Visible on Hover) */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTransferClick(asst);
                        }}
                        className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors mr-1 opacity-0 group-hover:opacity-100"
                        title="Transfer Assistant"
                    >
                        <ArrowRightLeft size={18} />
                    </button>

                    {/* Menu Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === asst.id ? null : asst.id);
                        }}
                        className={`text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer ${activeDropdown === asst.id ? 'bg-zinc-800 text-white' : ''}`}
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeDropdown === asst.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(asst);
                                    setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left cursor-pointer"
                            >
                                <Edit size={14} />
                                Edit Bot
                            </button>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    handleTransferClick(asst);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left cursor-pointer border-t border-zinc-800"
                            >
                                <ArrowRightLeft size={14} />
                                Transfer to Org
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    handleDeleteClick(asst);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left border-t border-zinc-800 cursor-pointer"
                            >
                                <Trash size={14} />
                                Delete Bot
                            </button>
                        </div>
                    )}
                </div>
              </div>
              
              <div className="pl-3 mb-4">
                 <p className="text-xs text-zinc-500 font-medium">
                   {asst.transcriber.provider} · {asst.model.provider} · {asst.voice.provider}
                 </p>
              </div>

              <div className="pl-3 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-xs text-zinc-400">Ready</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transfer Assistant Modal (For List View Context) */}
      {showTransferModal && assistantToTransfer && !editedAssistant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-sm shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4 text-white">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                   <ArrowRightLeft size={24} />
                </div>
                <h3 className="text-lg font-bold">Transfer Assistant</h3>
              </div>
              
              <div className="mb-6">
                  <p className="text-zinc-400 text-sm mb-4">
                    Move <span className="text-white font-medium">{assistantToTransfer.name}</span> to another organization?
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
                              .filter(org => org.id !== selectedOrgId) // Exclude current org
                              .map(org => (
                                  <option key={org.id} value={org.id}>{org.name}</option>
                              ))
                          }
                      </select>
                  </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setShowTransferModal(false); setAssistantToTransfer(null); setTargetOrgId(''); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmTransfer}
                  disabled={!targetOrgId}
                  className="px-4 py-2 bg-vapi-accent hover:bg-teal-300 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Transfer
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Re-render Delete Modal for List View context */}
      {showDeleteConfirm && assistantToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-sm shadow-2xl p-6 border-red-500/20">
                <div className="flex items-center gap-3 mb-4 text-white">
                  <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Delete Assistant?</h3>
                </div>
                <p className="text-zinc-400 text-sm mb-6">
                  Are you sure you want to delete <span className="text-white font-medium">{assistantToDelete.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => { setShowDeleteConfirm(false); setAssistantToDelete(null); }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20"
                  >
                    Yes, Delete
                  </button>
                </div>
             </div>
          </div>
        )}
      
      {/* API Key Modal for List View Delete Context */}
      {showApiKeyModal && !editedAssistant && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-white">
                <Key className="text-vapi-accent" size={20} />
                <h3 className="text-lg font-bold">Enter Vapi Private Key</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                To delete this assistant from your Vapi account, please verify your Private API Key.
              </p>
              <input 
                type="password"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="vapi_private_..."
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vapi-accent mb-6 font-mono text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                      setShowApiKeyModal(false);
                      setPendingAction(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleModalConfirm}
                  disabled={!userApiKey}
                  className="px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 bg-red-500 hover:bg-red-400 text-white"
                >
                  Confirm Delete
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

// --- Assistant Editor Component ---

const AssistantEditor: React.FC<{ 
  assistant: Assistant; 
  onChange: (a: Assistant) => void; 
  onBack: () => void;
  onSave: () => void;
  onDelete: (e?: React.MouseEvent) => void;
  onTransfer: () => void;
  hasChanges: boolean;
  isSaving: boolean;
  orgName: string;
}> = ({ assistant, onChange, onBack, onSave, onDelete, onTransfer, hasChanges, isSaving, orgName }) => {
  const [activeTab, setActiveTab] = useState<'model' | 'voice' | 'transcriber'>('model');
  const [promptGoal, setPromptGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(true);
  const [voiceSearch, setVoiceSearch] = useState('');

  // Voice Preview State
  const [previewText, setPreviewText] = useState("Hello! I am your AI assistant. How can I help you today?");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Check if it's a draft (new assistant)
  const isDraft = assistant.id.startsWith('asst_draft_');

  // Name Parsing Logic: Enforce Suffix
  const suffix = ` - ${orgName}`;
  const hasSuffix = assistant.name.endsWith(suffix);
  // If it's a draft, we assume it DOES NOT have the suffix in `name` yet (it is added on save).
  // If it's existing (hasSuffix), we strip it for display.
  // If it's existing (noSuffix), we treat full name as editable, OR we force append it. 
  // Requirement: "org name should always stay in bot name". 
  
  const displayName = (hasSuffix) ? assistant.name.slice(0, -suffix.length) : assistant.name;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newBaseName = e.target.value;
      if (isDraft) {
          // For drafts, we just update the name. Visual suffix is added via the span. 
          // `executeSave` will append the suffix.
          onChange({ ...assistant, name: newBaseName });
      } else {
          // For existing, if we have suffix, we preserve it. 
          // If we don't have suffix, we treat it as just updating the name (legacy support), 
          // unless we want to FORCE add it now. Let's force add it if user edits.
          const newFullName = newBaseName + suffix;
          onChange({ ...assistant, name: newFullName });
      }
  };

  const handleGeneratePrompt = async () => {
    if (!promptGoal) return;
    setIsGenerating(true);
    const generated = await generateSystemPrompt(assistant.name, promptGoal);
    onChange({
      ...assistant,
      model: {
        ...assistant.model,
        systemPrompt: generated
      }
    });
    setIsGenerating(false);
  };

  const handleVoicePreview = async () => {
    if (!previewText) return;
    setIsPreviewLoading(true);
    const voiceMap: Record<string, string> = {
      'rachel': 'Kore',
      'larry': 'Fenrir',
      'default': 'Puck'
    };
    const geminiVoice = voiceMap[assistant.voice.voiceId] || 'Puck';
    
    try {
      await generateSpeech(previewText, geminiVoice);
    } catch (e) {
      console.error(e);
      alert("Failed to generate speech preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in">
      {/* Editor Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-vapi-border">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div>
             <div className="flex items-center gap-1">
               <input 
                value={displayName}
                onChange={handleNameChange}
                className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b focus:border-vapi-accent pb-0.5 min-w-[200px]"
                placeholder="Assistant Name"
               />
               {/* Show suffix for Drafts OR if the assistant already has the suffix */}
               {(isDraft || hasSuffix) && (
                 <span className="text-xl font-bold text-zinc-500 select-none pb-0.5 whitespace-nowrap">
                   {suffix}
                 </span>
               )}
             </div>
             <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
               <span className="font-mono">{assistant.id}</span>
               <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
               <span>{assistant.id.startsWith('asst_draft') ? 'Draft' : 'Active'}</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="p-2.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Assistant"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
          
           {/* Header Transfer Button */}
           <button 
            type="button"
            onClick={onTransfer}
            className="p-2.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            title="Transfer Assistant"
          >
            <ArrowRightLeft size={18} />
          </button>

          <div className="h-8 w-[1px] bg-zinc-800 mx-1"></div>
          <button 
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            onClick={() => setIsTestOpen(!isTestOpen)}
          >
            {isTestOpen ? <X size={16}/> : <Terminal size={16} />}
            {isTestOpen ? 'Close Test' : 'Test Assistant'}
          </button>
          <button 
            type="button"
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasChanges ? 'bg-vapi-accent hover:bg-teal-300 text-black' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Saving...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Column: Configuration */}
        <div className={`flex-1 overflow-y-auto pr-2 ${isTestOpen ? 'max-w-[60%]' : 'max-w-full'}`}>
          <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg mb-6 w-fit border border-zinc-800">
            {['model', 'voice', 'transcriber'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'model' && (
            <div className="space-y-6">
              <div className="bg-vapi-card border border-vapi-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Model Configuration</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                    <select 
                      value={assistant.model.provider}
                      onChange={(e) => onChange({...assistant, model: {...assistant.model, provider: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google Gemini</option>
                      <option value="groq">Groq</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Model</label>
                    <select 
                      value={assistant.model.model}
                      onChange={(e) => onChange({...assistant, model: {...assistant.model, model: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs text-zinc-500">System Prompt</label>
                    <span className="text-xs text-zinc-600">{assistant.model.systemPrompt.length} chars</span>
                  </div>
                  <textarea 
                    value={assistant.model.systemPrompt}
                    onChange={(e) => onChange({...assistant, model: {...assistant.model, systemPrompt: e.target.value}})}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-vapi-accent outline-none font-mono min-h-[300px] resize-y"
                    placeholder="You are a helpful assistant..."
                  />
                  
                  {/* AI Generator for Prompt */}
                  <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2 text-vapi-accent text-sm font-medium">
                      <Sparkles size={16} />
                      <span>Generate with Gemini</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={promptGoal}
                        onChange={(e) => setPromptGoal(e.target.value)}
                        placeholder="e.g. A dentist receptionist who books appointments..."
                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                      />
                      <button 
                        onClick={handleGeneratePrompt}
                        disabled={isGenerating || !promptGoal}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? '...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
             <div className="space-y-6">
               <div className="bg-vapi-card border border-vapi-border rounded-xl p-5">
                 <h3 className="text-sm font-medium text-zinc-300 mb-4">Voice Configuration</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                     <select 
                       value={assistant.voice.provider}
                       onChange={(e) => onChange({...assistant, voice: {...assistant.voice, provider: e.target.value}})}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                     >
                       <option value="11labs">11Labs</option>
                       <option value="playht">PlayHT</option>
                       <option value="deepgram">Deepgram</option>
                       <option value="openai">OpenAI</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">
                       voiceId <span className="text-zinc-600 font-normal">enum or string</span>
                     </label>
                      <input 
                        value={assistant.voice.voiceId}
                        onChange={(e) => onChange({...assistant, voice: {...assistant.voice, voiceId: e.target.value}})}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none font-mono"
                        placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                        This is the provider-specific ID that will be used. Ensure the Voice is present in your 11Labs Voice Library.
                      </p>

                      {assistant.voice.provider === '11labs' && (
                        <div className="mt-5 pt-4 border-t border-zinc-800">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-zinc-300">Preset Voice Options <span className="text-zinc-600 font-normal ml-1">enum</span></span>
                           </div>
                           <div className="bg-black/20 border border-zinc-800 rounded-lg p-3">
                              <div className="relative mb-3">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                <input 
                                    type="text"
                                    value={voiceSearch}
                                    onChange={(e) => setVoiceSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-white focus:border-vapi-accent outline-none placeholder-zinc-600"
                                />
                                {voiceSearch && (
                                  <button onClick={() => setVoiceSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto pr-1">
                                  {ELEVEN_LABS_VOICES.filter(v => v.toLowerCase().includes(voiceSearch.toLowerCase())).map(voice => (
                                      <button
                                          key={voice}
                                          onClick={() => onChange({...assistant, voice: { ...assistant.voice, voiceId: voice }})}
                                          className={`px-2 py-1.5 rounded text-xs font-medium border transition-all truncate
                                              ${assistant.voice.voiceId === voice 
                                                  ? 'bg-zinc-100 text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                                              }`}
                                      >
                                          {voice}
                                      </button>
                                  ))}
                              </div>
                              {ELEVEN_LABS_VOICES.filter(v => v.toLowerCase().includes(voiceSearch.toLowerCase())).length === 0 && (
                                <p className="text-center text-[10px] text-zinc-600 py-4">No voices found</p>
                              )}
                           </div>
                        </div>
                      )}
                   </div>
                 </div>
                 
                 {/* Voice Preview Section */}
                 <div className="mt-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-2">
                       <Volume2 size={14} /> Voice Preview
                    </h4>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                      />
                      <button 
                        onClick={handleVoicePreview}
                        disabled={isPreviewLoading || !previewText}
                        className="bg-vapi-accent hover:bg-teal-300 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {isPreviewLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                         Play
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">
                      * Uses Gemini TTS for preview in this clone.
                    </p>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'transcriber' && (
            <div className="space-y-6">
              <div className="bg-vapi-card border border-vapi-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Transcriber Settings</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                     <select 
                       value={assistant.transcriber.provider}
                       onChange={(e) => onChange({...assistant, transcriber: {...assistant.transcriber, provider: e.target.value}})}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                     >
                       <option value="deepgram">Deepgram</option>
                       <option value="talkscriber">Talkscriber</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">Language</label>
                      <select 
                        value={assistant.transcriber.language}
                        onChange={(e) => onChange({...assistant, transcriber: {...assistant.transcriber, language: e.target.value}})}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Playground */}
        {isTestOpen && (
          <div className="w-[400px] border-l border-vapi-border bg-black/40 flex flex-col">
            <div className="p-4 border-b border-vapi-border flex justify-between items-center bg-vapi-card">
              <span className="text-sm font-medium text-white">Test Simulator</span>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-zinc-400">Ready</span>
              </div>
            </div>
            <Playground systemPrompt={assistant.model.systemPrompt} />
          </div>
        )}
      </div>
    </div>
  );
};

const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const Playground: React.FC<{ systemPrompt: string }> = ({ systemPrompt }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAssistant(systemPrompt, messages, input);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Error communicating with assistant." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <MessageSquare size={24} className="opacity-50" />
            <p className="text-sm">Start a conversation to test your assistant.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[85%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-vapi-accent text-black rounded-tr-none' : 'bg-zinc-800 text-zinc-300 rounded-tl-none'}`}>
               {m.content}
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-zinc-800 p-3 rounded-lg rounded-tl-none text-sm text-zinc-500 animate-pulse flex items-center gap-2">
               <Loader2 size={14} className="animate-spin" /> Thinking...
             </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-vapi-border bg-vapi-card">
        <div className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-vapi-accent hover:bg-teal-300 text-black px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};