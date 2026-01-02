import React, { useState, useEffect, useRef } from 'react';
import { Assistant, ChatMessage } from '../types';
import { Plus, Search, MoreHorizontal, MessageSquare, Save, Play, Terminal, Sparkles, X, ChevronLeft, Volume2, Loader2, Key, Trash2, AlertTriangle, Edit, Trash, Cpu, Mic, Radio } from 'lucide-react';
import { generateSystemPrompt, chatWithAssistant, generateSpeech } from '../services/geminiService';
import { createVapiAssistant, updateVapiAssistant, deleteVapiAssistant } from '../services/vapiService';
import { supabaseService } from '../services/supabaseClient';
import { VAPI_PRIVATE_KEY } from '../constants';
import { useToast } from '../components/ToastProvider';

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
}

export const Assistants: React.FC<AssistantsProps> = ({ assistants, setAssistants, selectedOrgId, selectedOrgName }) => {
  const { showToast } = useToast();
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
      orgId: selectedOrgId, // Assign to current organization context immediately
      name: 'New Assistant',
      model: {
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: '',
        temperature: 0.7
      },
      voice: { provider: '11labs', voiceId: 'sarah' }, 
      transcriber: { provider: 'deepgram', language: 'en' },
      createdAt: new Date().toISOString()
    };
    
    // Select immediately for editing
    setSelectedAssistant(newAsst);
    setEditedAssistant(newAsst);
    setHasUnsavedChanges(true); // Enable Publish button for new drafts
  };

  const handleBack = () => {
    setSelectedAssistant(null);
    setEditedAssistant(null);
  };

  const getEffectiveApiKey = () => {
    if (userApiKey) return userApiKey;
    return VAPI_PRIVATE_KEY;
  };

  const executeSave = async (apiKeyToUse: string) => {
    if (!editedAssistant) return;
    setIsSaving(true);

    try {
      if (editedAssistant.id.startsWith('asst_draft_')) {
        let assistantToSave = { ...editedAssistant };
        const suffix = ` - ${selectedOrgName}`;
        if (!assistantToSave.name.endsWith(suffix)) {
             assistantToSave.name = `${assistantToSave.name}${suffix}`;
        }

        const createdAssistant = await createVapiAssistant(apiKeyToUse, assistantToSave);
        
        if (createdAssistant) {
          await supabaseService.saveAssistantMapping(createdAssistant.id, selectedOrgId);
          const assistanWithContext = { ...createdAssistant, orgId: selectedOrgId };
          setAssistants(prev => [assistanWithContext, ...prev]);
          setSelectedAssistant(assistanWithContext);
          setEditedAssistant(assistanWithContext);
          showToast(`Assistant "${createdAssistant.name}" created successfully!`, 'success');
        }
      } else {
        const updatedAssistant = await updateVapiAssistant(apiKeyToUse, editedAssistant);
        await supabaseService.saveAssistantMapping(updatedAssistant.id, selectedOrgId);
        const assistanWithContext = { ...updatedAssistant, orgId: selectedOrgId };
        setAssistants(prev => prev.map(a => a.id === editedAssistant.id ? assistanWithContext : a));
        setSelectedAssistant(assistanWithContext);
        setEditedAssistant(assistanWithContext);
        showToast(`Assistant "${updatedAssistant.name}" updated successfully!`, 'success');
      }
      setHasUnsavedChanges(false);
      setShowApiKeyModal(false);
    } catch (error: any) {
      console.error("Failed to save assistant", error);
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        setShowApiKeyModal(true);
        showToast("Authentication failed. Please verify API key.", "error");
      } else {
        showToast(`Failed to save to Vapi: ${error.message}`, "error");
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
        }
        
        setAssistants(prev => prev.filter(a => a.id !== target.id));
        if (selectedAssistant?.id === target.id) {
            handleBack();
        }

        setAssistantToDelete(null);
        showToast('Assistant deleted successfully.', 'success');
        setShowApiKeyModal(false);
    } catch (error: any) {
        if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
            setShowApiKeyModal(true);
            setUserApiKey(''); 
            showToast("Authentication failed. Please verify API key.", "error");
            return;
        }
        setAssistants(prev => prev.filter(a => a.id !== target.id));
        if (selectedAssistant?.id === target.id) {
            handleBack();
        }
        setAssistantToDelete(null);
        showToast('Assistant removed locally.', 'warning');
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
          hasChanges={hasUnsavedChanges}
          isSaving={isSaving}
          orgName={selectedOrgName}
        />
        {/* Modals are rendered here to reuse logic easily */}
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
      
        {/* API Key Modal */}
        {showApiKeyModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-vapi-card border border-vapi-border rounded-xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-white">
                <Key className="text-vapi-accent" size={20} />
                <h3 className="text-lg font-bold">Enter Vapi Private Key</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                To {pendingAction === 'delete' ? 'delete' : 'save'} this assistant, please verify your Private API Key.
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
                  Confirm
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
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Assistants</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage and configure your voice AI agents.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-white/10"
        >
          <Plus size={18} />
          <span>Create New</span>
        </button>
      </div>

      <div className="flex items-center gap-4 bg-zinc-900/30 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
        <Search className="text-zinc-500 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search assistants by name or ID..." 
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-zinc-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {filteredAssistants.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <BotIcon />
            <p className="mt-4 text-sm font-medium">No assistants found for this organization.</p>
            <button onClick={handleCreate} className="mt-2 text-vapi-accent hover:underline text-sm">Create your first one</button>
          </div>
        ) : (
          filteredAssistants.map(asst => (
            <div 
              key={asst.id} 
              className="group relative bg-zinc-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 backdrop-blur-md flex flex-col h-[260px]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                 <div className="flex flex-col gap-1 w-full pr-8">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                        <h3 className="text-lg font-bold text-white truncate" title={asst.name}>{asst.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 truncate">{asst.id}</span>
                 </div>
                 
                 <div className="absolute right-4 top-4">
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === asst.id ? null : asst.id);
                          }}
                          className={`p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all ${activeDropdown === asst.id ? 'bg-white/10 text-white' : ''}`}
                      >
                          <MoreHorizontal size={20} />
                      </button>
                      
                      {activeDropdown === asst.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-zinc-800 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelect(asst);
                                      setActiveDropdown(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-left"
                              >
                                  <Edit size={14} />
                                  Edit Configuration
                              </button>
                              <div className="h-px bg-zinc-900 my-0"></div>
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdown(null);
                                      handleDeleteClick(asst);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                              >
                                  <Trash size={14} />
                                  Delete Assistant
                              </button>
                          </div>
                      )}
                 </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                 {/* Voice Spec */}
                 <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Radio size={10} /> Voice
                    </span>
                    <span className="text-sm text-zinc-200 font-medium truncate">{asst.voice.provider}</span>
                 </div>
                 {/* Model Spec */}
                 <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Cpu size={10} /> Model
                    </span>
                    <span className="text-sm text-zinc-200 font-medium truncate">{asst.model.model}</span>
                 </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 mt-auto">
                 <button 
                    onClick={() => handleSelect(asst)}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 h-9 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-white/5"
                 >
                    Edit
                 </button>
                 <button 
                    onClick={() => handleSelect(asst)} // In real app, maybe open a modal directly
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                    title="Quick Test"
                 >
                    <Terminal size={16} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Delete Confirmation Modal (List View Context) */}
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
      
      {/* API Key Modal (List View Context) */}
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
  hasChanges: boolean;
  isSaving: boolean;
  orgName: string;
}> = ({ assistant, onChange, onBack, onSave, onDelete, hasChanges, isSaving, orgName }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'model' | 'voice' | 'transcriber'>('model');
  const [promptGoal, setPromptGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(true);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [previewText, setPreviewText] = useState("Hello! I am your AI assistant. How can I help you today?");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const isDraft = assistant.id.startsWith('asst_draft_');
  const suffix = ` - ${orgName}`;
  const hasSuffix = assistant.name.endsWith(suffix);
  const displayName = (hasSuffix) ? assistant.name.slice(0, -suffix.length) : assistant.name;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newBaseName = e.target.value;
      if (isDraft) {
          onChange({ ...assistant, name: newBaseName });
      } else {
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
      showToast("Failed to generate speech preview.", "error");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
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
               {(isDraft || hasSuffix) && (
                 <span className="text-xl font-bold text-zinc-500 select-none pb-0.5 whitespace-nowrap">
                   {suffix}
                 </span>
               )}
             </div>
             <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
               <span className="font-mono">{assistant.id}</span>
               <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
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

          <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
          <button 
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"
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

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className={`flex-1 overflow-y-auto pr-2 ${isTestOpen ? 'max-w-[60%]' : 'max-w-full'}`}>
          <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg mb-6 w-fit border border-white/10">
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
              <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Model Configuration</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                    <select 
                      value={assistant.model.provider}
                      onChange={(e) => onChange({...assistant, model: {...assistant.model, provider: e.target.value}})}
                      className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
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
                      className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
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
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-vapi-accent outline-none font-mono min-h-[300px] resize-y"
                    placeholder="You are a helpful assistant..."
                  />
                  <div className="mt-4 p-4 bg-black/40 rounded-lg border border-zinc-800">
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
               <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 backdrop-blur-sm">
                 <h3 className="text-sm font-medium text-zinc-300 mb-4">Voice Configuration</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                     <select 
                       value={assistant.voice.provider}
                       onChange={(e) => onChange({...assistant, voice: {...assistant.voice, provider: e.target.value}})}
                       className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
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
                        className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none font-mono"
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
                 <div className="mt-6 p-4 bg-black/40 rounded-lg border border-zinc-800">
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
              <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Transcriber Settings</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                     <select 
                       value={assistant.transcriber.provider}
                       onChange={(e) => onChange({...assistant, transcriber: {...assistant.transcriber, provider: e.target.value}})}
                       className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
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
                        className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-vapi-accent outline-none"
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

        {isTestOpen && (
          <div className="w-[400px] border-l border-white/5 bg-black/40 backdrop-blur-md flex flex-col">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
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
    <div className="flex flex-col h-full bg-zinc-900/30">
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
      <div className="p-4 border-t border-white/5 bg-zinc-900/50">
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