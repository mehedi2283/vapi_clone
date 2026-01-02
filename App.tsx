import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Assistants } from './pages/Assistants';
import { Logs } from './pages/Logs';
import { PhoneNumbers } from './pages/PhoneNumbers';
import { Files } from './pages/Files';
import { Tools } from './pages/Tools';
import { MasterOverview } from './pages/MasterOverview';
import { ViewState, Organization, Assistant } from './types';
import { MOCK_ORGS, MOCK_ASSISTANTS, VAPI_PRIVATE_KEY, NIYA_ORG_ID } from './constants';
import { fetchVapiAssistants, parseSecureToken } from './services/vapiService';
import { supabaseService, supabase } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Organizations state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [isResolvingLink, setIsResolvingLink] = useState(true);
  
  // Lifted state for assistants to share across views and persist updates
  const [assistants, setAssistants] = useState<Assistant[]>(MOCK_ASSISTANTS);

  // Initialize Data from Supabase (or Fallback)
  useEffect(() => {
    const initData = async () => {
        setIsLoadingOrgs(true);
        try {
            // Attempt to fetch from Supabase
            const dbOrgs = await supabaseService.getOrganizations();
            
            if (dbOrgs.length > 0) {
                setOrganizations(dbOrgs);
            } else {
                // If DB empty or connection failed (returns empty), fall back to LocalStorage or Mocks
                // This ensures the app works even if the user hasn't set up Supabase keys yet.
                console.log("Using LocalStorage/Mock fallback for organizations.");
                try {
                    const saved = localStorage.getItem('vapi_cloned_orgs');
                    if (saved) {
                        setOrganizations(JSON.parse(saved));
                    } else {
                        setOrganizations(MOCK_ORGS);
                    }
                } catch {
                    setOrganizations(MOCK_ORGS);
                }
            }
        } catch (error) {
            console.error("Failed to init data", error);
            setOrganizations(MOCK_ORGS);
        } finally {
            setIsLoadingOrgs(false);
        }
    };
    initData();
  }, []);

  // Persistence Effect: Sync to LocalStorage as a backup whenever they change (for MasterOverview updates)
  useEffect(() => {
    if (organizations.length > 0) {
        localStorage.setItem('vapi_cloned_orgs', JSON.stringify(organizations));
    }
  }, [organizations]);

  // Check for Deep Link (encrypted token in URL)
  // This effect runs whenever 'organizations' or 'isLoadingOrgs' changes
  // to ensure we match against loaded data.
  useEffect(() => {
    if (isLoadingOrgs) return; // Wait for DB fetch

    const handleDeepLink = async () => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const legacyOrgId = params.get('orgId');

        // If no token, stop loading immediately
        if (!token && !legacyOrgId) {
            setIsResolvingLink(false);
            return;
        }

        let targetOrgId = legacyOrgId;
        let tokenData = null;
        
        if (token) {
            tokenData = parseSecureToken(token);
            if (tokenData && tokenData.id) {
                targetOrgId = tokenData.id;
            }
        }

        if (targetOrgId) {
            // Try to find in loaded orgs
            let targetOrg = organizations.find(o => o.id === targetOrgId);
            
            // If not found locally, but we have name data in the token, 
            // recreate/import the org (Client-side simulation if DB fetch missed it or for sharing without DB)
            if (!targetOrg && tokenData?.nm) {
                console.log(`Importing organization from token: ${tokenData.nm}`);
                const importedOrg: Organization = {
                    id: targetOrgId,
                    name: tokenData.nm,
                    plan: 'pro',
                    credits: 50.00, 
                    usageCost: 0.00,
                    status: 'active',
                    createdAt: new Date().toISOString()
                };
                
                // We add it to state. Note: We do NOT save imported magic-links to Supabase automatically 
                // to prevent clutter, unless we want to. Let's keep it local session for now.
                setOrganizations(prev => [...prev, importedOrg]);
                targetOrg = importedOrg;
            }

            if (targetOrg) {
                console.log(`Deep linking to organization: ${targetOrg.name}`);
                setSelectedOrg(targetOrg);
                window.history.replaceState({}, '', window.location.pathname);
            } else {
                console.warn(`Organization ID ${targetOrgId} not found.`);
            }
        }
        setIsResolvingLink(false);
    };

    handleDeepLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingOrgs]); // Run once loaded

  // Fetch real Vapi assistants for Niya Org on mount
  useEffect(() => {
    const loadNiyaAssistants = async () => {
      const apiKey = VAPI_PRIVATE_KEY;
      
      if (!apiKey) {
        return;
      }

      const vapiData = await fetchVapiAssistants(apiKey);
      
      if (vapiData.length > 0) {
        setAssistants(prev => {
          const otherOrgAssistants = prev.filter(a => a.orgId !== NIYA_ORG_ID);
          const niyaAssistants = vapiData.map(a => ({
            ...a,
            orgId: NIYA_ORG_ID
          }));
          return [...otherOrgAssistants, ...niyaAssistants];
        });
      }
    };

    loadNiyaAssistants();
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setCurrentView('overview');
  };

  const handleUpdateOrg = (updatedOrg: Organization) => {
    setOrganizations(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));
  };

  const handleAddOrg = (newOrg: Organization) => {
    setOrganizations(prev => [newOrg, ...prev]);
  };

  const handleBackToMaster = () => {
    setSelectedOrg(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview': return <Overview />;
      case 'assistants': 
        return (
          <Assistants 
            assistants={assistants}
            setAssistants={setAssistants}
            selectedOrgId={selectedOrg?.id || ''}
            selectedOrgName={selectedOrg?.name || ''}
          />
        );
      case 'logs': return <Logs />;
      case 'phone-numbers': return <PhoneNumbers />;
      case 'files': return <Files />;
      case 'tools': return <Tools />;
      default: return <Overview />;
    }
  };

  // Loading Screen for Deep Links
  if (isResolvingLink || isLoadingOrgs) {
      return (
          <div className="min-h-screen bg-vapi-bg flex items-center justify-center font-sans">
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                 <div className="relative">
                     <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center animate-pulse"></div>
                     <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={24} />
                 </div>
                 <div className="text-center">
                    <h2 className="text-white font-semibold text-lg">Vapi Dashboard</h2>
                    <p className="text-zinc-500 text-sm mt-1">{isLoadingOrgs ? 'Loading organizations...' : 'Verifying secure token...'}</p>
                 </div>
              </div>
          </div>
      );
  }

  // If no org is selected, show Master View
  if (!selectedOrg) {
    return (
      <MasterOverview 
        organizations={organizations}
        onSelectOrg={handleSelectOrg}
        onUpdateOrg={handleUpdateOrg}
        onAddOrg={handleAddOrg}
      />
    );
  }

  // If org is selected, show Dashboard View
  return (
    <div className="flex min-h-screen bg-vapi-bg font-sans selection:bg-vapi-accent selection:text-black animate-fade-in">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        selectedOrg={selectedOrg}
        onBackToMaster={handleBackToMaster}
      />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      <div className="md:hidden fixed inset-0 bg-black z-[100] flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Desktop Only</h2>
          <p className="text-zinc-400">Please view this dashboard on a larger screen for the best experience.</p>
        </div>
      </div>
    </div>
  );
}