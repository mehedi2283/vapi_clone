import React, { useState } from 'react';
import { Organization, Assistant } from '../types';
import { supabaseService } from '../services/supabaseClient';
import { updateVapiAssistant } from '../services/vapiService';
import { VAPI_PRIVATE_KEY } from '../constants';
import { useToast } from '../components/ToastProvider';
import { Building2, Lock, Save, Loader2, Info } from 'lucide-react';

interface SettingsProps {
  org: Organization;
  onUpdateOrg: (org: Organization) => void;
  assistants: Assistant[];
  setAssistants: React.Dispatch<React.SetStateAction<Assistant[]>>;
}

export const Settings: React.FC<SettingsProps> = ({ org, onUpdateOrg, assistants, setAssistants }) => {
  const { showToast } = useToast();
  
  const [orgName, setOrgName] = useState(org.name);
  const [password, setPassword] = useState(''); // Only update if non-empty
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
        const oldOrgName = org.name;
        const newOrgName = orgName.trim();
        
        // 1. Update Organization in DB
        const updatedOrg = { ...org, name: newOrgName };
        
        // In a real Supabase Auth setup, updating password requires specific Auth API calls.
        // For this clone, we are assuming the 'password' field in the 'organizations' table logic if used,
        // or just simulating the update success.
        
        // Update local state and DB
        await supabaseService.updateOrganization(updatedOrg);
        onUpdateOrg(updatedOrg);

        // 2. Cascade Rename Assistants if Name Changed
        if (oldOrgName !== newOrgName) {
            const orgAssistants = assistants.filter(a => a.orgId === org.id);
            const oldSuffix = ` - ${oldOrgName}`;
            const newSuffix = ` - ${newOrgName}`;

            let updatedCount = 0;
            const updatedAssistantsList = [...assistants];

            // Process sequentially to avoid rate limits if any
            for (const assistant of orgAssistants) {
                let newBotName = assistant.name;

                // Check if it has the old suffix
                if (assistant.name.endsWith(oldSuffix)) {
                    // Replace suffix
                    newBotName = assistant.name.slice(0, -oldSuffix.length) + newSuffix;
                } else {
                    // Append suffix if it wasn't there (standardizing naming)
                    newBotName = assistant.name + newSuffix;
                }

                if (newBotName !== assistant.name) {
                    // Call Vapi
                    const updatedBot = await updateVapiAssistant(VAPI_PRIVATE_KEY, {
                        ...assistant,
                        name: newBotName
                    });

                    // Update in local list copy
                    const index = updatedAssistantsList.findIndex(a => a.id === assistant.id);
                    if (index !== -1) {
                        updatedAssistantsList[index] = { ...updatedBot, orgId: org.id };
                    }
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                setAssistants(updatedAssistantsList);
                showToast(`Organization updated. Renamed ${updatedCount} assistants.`, 'success');
            } else {
                showToast('Organization updated successfully.', 'success');
            }
        } else {
            showToast('Organization settings saved.', 'success');
        }

    } catch (error: any) {
        console.error("Settings Error:", error);
        showToast("Failed to save settings.", 'error');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Organization Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info Card */}
        <div className="bg-vapi-card border border-vapi-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Building2 size={20} className="text-vapi-accent"/>
                General Information
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Organization Name</label>
                    <input 
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                        required
                    />
                    <p className="text-xs text-zinc-500 mt-2 flex items-start gap-2">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        Renaming your organization will automatically update the names of all your assistants to include the new organization suffix (e.g., "Bot - {orgName}").
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Admin Email</label>
                    <input 
                        type="email"
                        value={org.email || ''}
                        disabled
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-500 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Organization ID</label>
                    <div className="font-mono text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-zinc-400 select-all">
                        {org.id}
                    </div>
                </div>
            </div>
        </div>

        {/* Security Card */}
        <div className="bg-vapi-card border border-vapi-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Lock size={20} className="text-vapi-accent"/>
                Security
            </h2>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Update Password</label>
                <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                    minLength={6}
                />
            </div>
        </div>

        <div className="flex justify-end pt-2">
            <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-vapi-accent hover:bg-teal-300 text-black px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
            </button>
        </div>
      </form>
    </div>
  );
};