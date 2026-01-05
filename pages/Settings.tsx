import React, { useState, useEffect } from 'react';
import { Organization, Assistant } from '../types';
import { supabaseService } from '../services/supabaseClient';
import { updateVapiAssistant } from '../services/vapiService';
import { VAPI_PRIVATE_KEY } from '../constants';
import { useToast } from '../components/ToastProvider';
import { Building2, Lock, Save, Loader2, Info, Users, Plus, Trash2, Mail, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/Modal';

interface SettingsProps {
  org: Organization;
  onUpdateOrg: (org: Organization) => void;
  assistants: Assistant[];
  setAssistants: React.Dispatch<React.SetStateAction<Assistant[]>>;
}

export const Settings: React.FC<SettingsProps> = ({ org, onUpdateOrg, assistants, setAssistants }) => {
  const { showToast } = useToast();
  
  const [orgName, setOrgName] = useState(org.name);
  const [password, setPassword] = useState(''); 
  const [isSaving, setIsSaving] = useState(false);
  const [isMemberLoading, setIsMemberLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Invite Members State
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<string[]>(org.members || []);

  // Delete Modal State
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
      // Check current user to determine if they are the owner
      supabaseService.getCurrentUser().then(u => {
          if (u) setCurrentUser(u.id);
      });
  }, []);

  // Sync state with prop changes
  useEffect(() => {
    setOrgName(org.name);
    setMembers(org.members || []);
    setInviteEmail('');
    setPassword('');
  }, [org]);

  // Check if current user is the owner
  const isOwner = currentUser === org.id;

  const handleInvite = async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      const emailToAdd = inviteEmail.trim().toLowerCase();
      
      if (!emailToAdd) return;
      
      if (!emailToAdd.includes('@')) {
          showToast('Please enter a valid email address.', 'warning');
          return;
      }

      if (members.map(m => m.toLowerCase()).includes(emailToAdd)) {
          showToast('User already invited.', 'warning');
          return;
      }

      setIsMemberLoading(true);

      try {
          // 1. Derive Name from Email (before @)
          const namePart = emailToAdd.split('@')[0];
          // Capitalize first letter for better UX
          const derivedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

          // 2. Create the user account using the default password '123456'
          // We pass 'password' in metadata so the DB Trigger can save it to public.organizations
          // This avoids RLS errors because we don't write to the table directly from the client.
          const defaultPassword = '123456';
          const { user, error: createError } = await supabaseService.createIsolatedUser(
              emailToAdd, 
              defaultPassword,
              { 
                  org_name: derivedName,
                  password: defaultPassword 
              } 
          );

          if (createError) {
              const msg = createError.message || '';
              if (!msg.toLowerCase().includes('already registered')) {
                  throw new Error(`Failed to create user: ${msg}`);
              }
          }

          // 3. Add to Members list of CURRENT organization
          // RLS allows updating your own organization's member list
          const newMembers = [...members, emailToAdd];
          const partialUpdate = { 
              id: org.id,
              members: newMembers 
          };
          await supabaseService.updateOrganization(partialUpdate);

          // Update parent state
          onUpdateOrg({ ...org, members: newMembers });
          setMembers(newMembers);
          setInviteEmail('');
          showToast(`${emailToAdd} invited. Password set to: ${defaultPassword}`, 'success');

      } catch (error: any) {
          console.error("Invite failed:", error);
          showToast(`Invite failed: ${error.message}`, 'error');
      } finally {
          setIsMemberLoading(false);
      }
  };

  const promptRemoveMember = (email: string) => {
      setMemberToDelete(email);
      setIsDeleteModalOpen(true);
  };

  const confirmRemoveMember = async () => {
      if (!memberToDelete) return;

      setIsMemberLoading(true);
      try {
          // Use the secure RPC function to delete from auth.users AND members list
          await supabaseService.deleteMember(memberToDelete, org.id);

          // Update local state
          const newMembers = members.filter(m => m.toLowerCase() !== memberToDelete.toLowerCase());
          
          // Force update local org object since RPC handled the DB
          onUpdateOrg({ ...org, members: newMembers });
          setMembers(newMembers);

          showToast('User account deleted and removed from organization.', 'success');
      } catch (error: any) {
          console.error("Remove failed:", error);
          showToast(`Failed to remove member: ${error.message}`, 'error');
      } finally {
          setIsMemberLoading(false);
          setIsDeleteModalOpen(false);
          setMemberToDelete(null);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
        const oldOrgName = org.name;
        const newOrgName = orgName.trim();
        
        // 1. Update Organization Name
        const partialUpdate = { 
            id: org.id,
            name: newOrgName,
        };

        await supabaseService.updateOrganization(partialUpdate);
        
        // Merge updates into the full object for local state
        const updatedFullOrg = { ...org, ...partialUpdate };
        onUpdateOrg(updatedFullOrg);

        // 2. Update Password if provided
        if (password) {
            await supabaseService.updateUserPassword(password);
            
            // Also update the stored reference password for future invites
            const passUpdate = { id: org.id, password: password };
            await supabaseService.updateOrganization(passUpdate);
        }

        // 3. Cascade Rename Assistants if Name Changed
        if (oldOrgName !== newOrgName) {
            const orgAssistants = assistants.filter(a => a.orgId === org.id);
            const oldSuffix = ` - ${oldOrgName}`;
            const newSuffix = ` - ${newOrgName}`;

            let updatedCount = 0;
            const updatedAssistantsList = [...assistants];

            for (const assistant of orgAssistants) {
                let baseName = assistant.name;
                if (assistant.name.endsWith(oldSuffix)) {
                    baseName = assistant.name.slice(0, -oldSuffix.length);
                }
                const maxBaseLength = Math.max(0, 40 - newSuffix.length);
                if (baseName.length > maxBaseLength) {
                    baseName = baseName.substring(0, maxBaseLength);
                }
                const newBotName = baseName + newSuffix;

                if (newBotName !== assistant.name) {
                    const updatedBot = await updateVapiAssistant(VAPI_PRIVATE_KEY, {
                        ...assistant,
                        name: newBotName
                    });
                    const index = updatedAssistantsList.findIndex(a => a.id === assistant.id);
                    if (index !== -1) {
                        updatedAssistantsList[index] = { ...updatedBot, orgId: org.id };
                    }
                    updatedCount++;
                }
            }
            setAssistants(updatedAssistantsList);
            showToast(`Saved. ${updatedCount} assistants renamed.`, 'success');
        } else {
             showToast('Settings saved successfully.', 'success');
        }
        
        if (password) setPassword(''); 

    } catch (error: any) {
        console.error("Settings Error:", error);
        showToast(`Failed to save: ${error.message}`, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl pb-10">
      <h1 className="text-2xl font-bold text-white">Organization Settings</h1>

      {/* General Info Form - Handles Name & Password */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
                        Renaming updates assistant suffixes automatically (e.g., "Bot - {orgName}").
                    </p>
                </div>
            </div>
        </div>

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
                    placeholder="Enter new password to update"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                    minLength={6}
                />
            </div>
        </div>

        <div className="flex justify-end pt-2">
            <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-vapi-accent hover:bg-orange-500 text-black px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
            </button>
        </div>
      </form>

      {/* Team Members Section - Independent Actions */}
      <div className="bg-vapi-card border border-vapi-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users size={20} className="text-vapi-accent"/>
                Team Members
            </h2>
            
            <p className="text-sm text-zinc-500">
                Auto-create accounts for team members with the default password <span className="text-white font-mono">123456</span>.
            </p>

            <div className="space-y-4">
                 {/* Invite Input - Only Visible to Owner */}
                 {isOwner && (
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input 
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Enter email address (e.g. colleague@company.com)"
                                className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-vapi-accent transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInvite(e);
                                    }
                                }}
                                disabled={isMemberLoading}
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleInvite}
                            disabled={!inviteEmail.trim() || isMemberLoading}
                            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isMemberLoading ? <Loader2 size={16} className="animate-spin" /> : 'Invite'}
                        </button>
                     </div>
                 )}

                 {/* Member List */}
                 {members.length > 0 ? (
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                        {members.map((member, index) => (
                            <div key={index} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-300">
                                        {member.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-zinc-300">{member}</span>
                                </div>
                                {isOwner && (
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            promptRemoveMember(member);
                                        }}
                                        disabled={isMemberLoading}
                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                                        title="Delete User & Remove Access"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                        <p className="text-sm text-zinc-500">No active invitations</p>
                     </div>
                 )}
            </div>
      </div>
      
      {/* Delete Member Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onClosed={() => setMemberToDelete(null)}
        className="max-w-sm"
      >
        <div className="bg-vapi-card border border-vapi-border rounded-xl shadow-2xl p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-4 text-white">
               <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <AlertTriangle size={24} />
               </div>
               <h3 className="text-lg font-bold">Delete Member?</h3>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6">
               This will <strong>permanently delete</strong> the user account for <span className="text-white font-medium">{memberToDelete}</span> and remove them from your organization.
            </p>

            <div className="flex justify-end gap-3">
               <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
               >
                  Cancel
               </button>
               <button 
                  onClick={confirmRemoveMember}
                  disabled={isMemberLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center gap-2"
               >
                  {isMemberLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirm Delete
               </button>
            </div>
        </div>
      </Modal>

    </div>
  );
};