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
import { fetchVapiAssistants } from './services/vapiService';

export default function App() {
  const [organizations, setOrganizations] = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  
  // Lifted state for assistants to share across views and persist updates
  const [assistants, setAssistants] = useState<Assistant[]>(MOCK_ASSISTANTS);

  // Check for Deep Link (orgId in URL) on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgIdFromUrl = params.get('orgId');

    if (orgIdFromUrl) {
      const targetOrg = organizations.find(o => o.id === orgIdFromUrl);
      if (targetOrg) {
        console.log(`Deep linking to organization: ${targetOrg.name}`);
        setSelectedOrg(targetOrg);
        // Optional: Clean URL without refreshing to prevent sticky state if user logs out
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [organizations]);

  // Fetch real Vapi assistants for Niya Org on mount
  useEffect(() => {
    const loadNiyaAssistants = async () => {
      // Use the global constant directly as requested
      const apiKey = VAPI_PRIVATE_KEY;
      
      if (!apiKey) {
        console.log("No Vapi Key found. Skipping fetch for Niya Org.");
        return;
      }

      console.log("Fetching Vapi assistants for Niya Org...");
      const vapiData = await fetchVapiAssistants(apiKey);
      
      if (vapiData.length > 0) {
        setAssistants(prev => {
          // Remove any existing assistants assigned to Niya Org to avoid duplicates
          const otherOrgAssistants = prev.filter(a => a.orgId !== NIYA_ORG_ID);
          
          // Map fetched assistants to Niya Org ID
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
    setCurrentView('overview'); // Reset to overview when entering an org
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
    <div className="flex min-h-screen bg-vapi-bg font-sans selection:bg-vapi-accent selection:text-black">
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
      
      {/* Mobile blocker (Vapi dashboard is complex, usually desktop first) */}
      <div className="md:hidden fixed inset-0 bg-black z-[100] flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Desktop Only</h2>
          <p className="text-zinc-400">Please view this dashboard on a larger screen for the best experience.</p>
        </div>
      </div>
    </div>
  );
}