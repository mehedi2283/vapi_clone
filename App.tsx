import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Assistants } from './pages/Assistants';
import { Logs } from './pages/Logs';
import { PhoneNumbers } from './pages/PhoneNumbers';
import { Files } from './pages/Files';
import { Tools } from './pages/Tools';
import { MasterOverview } from './pages/MasterOverview';
import { Login } from './pages/Login';
import { ViewState, Organization, Assistant } from './types';
import { MOCK_ASSISTANTS, VAPI_PRIVATE_KEY, NIYA_ORG_ID, MOCK_ORGS } from './constants';
import { fetchVapiAssistants } from './services/vapiService';
import { supabaseService, supabase, authStateChanged } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'admin@vapi.clone'; // Hardcoded admin email for clone behavior fallback

export default function App() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // App State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [assistants, setAssistants] = useState<Assistant[]>(MOCK_ASSISTANTS);

  // 1. Check Auth Session on Mount & Listen for changes
  useEffect(() => {
    const checkSession = async () => {
        // A. Check Local Fallback (Demo Mode)
        const demoSession = localStorage.getItem('vapi_demo_session');
        if (demoSession) {
            setSession(JSON.parse(demoSession));
            setIsAuthLoading(false);
            return;
        }

        // B. Check Supabase
        if (supabase) {
            try {
                const { data: { session: sbSession } } = await supabase.auth.getSession();
                setSession(sbSession);
            } catch (e) {
                console.warn("Supabase auth check failed (using offline mode?)");
            }
        }
        setIsAuthLoading(false);
    };

    checkSession();

    // Listener 1: Real Supabase Events
    let sbListener: any = null;
    if (supabase) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        sbListener = data.subscription;
    }

    // Listener 2: Custom Fallback Events (e.g. from SignIn failure fallback)
    const handleCustomAuth = () => {
        const demoSession = localStorage.getItem('vapi_demo_session');
        setSession(demoSession ? JSON.parse(demoSession) : null);
    };
    
    authStateChanged.addEventListener('signedIn', handleCustomAuth);
    authStateChanged.addEventListener('signedOut', handleCustomAuth);

    return () => {
        sbListener?.unsubscribe();
        authStateChanged.removeEventListener('signedIn', handleCustomAuth);
        authStateChanged.removeEventListener('signedOut', handleCustomAuth);
    };
  }, []);

  // 2. Load Data when Session Exists
  useEffect(() => {
    if (!session) return;

    const initData = async () => {
        setIsLoadingOrgs(true);
        try {
            const userEmail = session.user.email;
            
            // First, fetch the user's specific organization to check their Role
            // The table is indexed by ID, which matches Auth ID
            const myOrgs = await supabaseService.getOrganizations(session.user.id);
            const myProfile = myOrgs[0];

            // Determine if Admin:
            // 1. Explicit 'admin' role in DB
            // 2. OR hardcoded fallback email (for bootstrapping)
            const isMasterAdmin = (myProfile?.role === 'admin') || (userEmail === ADMIN_EMAIL);
            setIsAdmin(isMasterAdmin);
            
            if (isMasterAdmin) {
                 // If Admin, fetch ALL organizations for the Master View
                 const allOrgs = await supabaseService.getOrganizations(); // No ID param = All
                 setOrganizations(allOrgs.length > 0 ? allOrgs : MOCK_ORGS); // Fallback to mocks if empty
                 setSelectedOrg(null); // Default to Master Overview
            } else {
                 // If Regular User, just use their profile
                 if (myOrgs.length > 0) {
                     setOrganizations(myOrgs);
                     setSelectedOrg(myProfile);
                 } else {
                     // Fallback for Demo/Mock User without DB entry
                     console.log("User has no organization (or offline). Using default Mock Org.");
                     const defaultOrg: Organization = MOCK_ORGS[0]; // Use Acme Corp as default for demo
                     setOrganizations([defaultOrg]);
                     setSelectedOrg(defaultOrg);
                 }
            }

        } catch (error) {
            console.error("Failed to init data", error);
            // Safety fallback
            setOrganizations(MOCK_ORGS);
            setSelectedOrg(MOCK_ORGS[0]);
        } finally {
            setIsLoadingOrgs(false);
        }
    };

    initData();
  }, [session]);

  // 3. Load Assistants (Same as before, merged with mappings)
  useEffect(() => {
    if (!session) return;

    const loadAssistantsData = async () => {
      const apiKey = VAPI_PRIVATE_KEY;
      // Note: We attempt fetch even if no key to trigger mock fallback in service
      
      try {
          const vapiData = await fetchVapiAssistants(apiKey);
          const mappings = await supabaseService.getAssistantMappings();
          const mappingMap = new Map(mappings.map(m => [m.assistant_id, m.org_id]));

          const mergedAssistants = vapiData.map(a => {
              if (mappingMap.has(a.id)) {
                  return { ...a, orgId: mappingMap.get(a.id)! };
              }
              return { ...a, orgId: a.orgId || NIYA_ORG_ID };
          });

          setAssistants(mergedAssistants);
      } catch (error) {
          console.error("Error loading assistants data:", error);
          setAssistants(MOCK_ASSISTANTS);
      }
    };
    
    // Defer assistant loading until we know who is logged in (roughly)
    if (!isAuthLoading) {
        loadAssistantsData();
    }
  }, [isAuthLoading, session]);


  // Handlers
  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setCurrentView('overview');
  };

  const handleUpdateOrg = (updatedOrg: Organization) => {
    setOrganizations(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));
    if (selectedOrg?.id === updatedOrg.id) {
        setSelectedOrg(updatedOrg);
    }
  };

  const handleAddOrg = (newOrg: Organization) => {
    setOrganizations(prev => [newOrg, ...prev]);
  };

  const handleDeleteOrg = async (orgId: string) => {
    // 1. Call Service
    await supabaseService.deleteOrganization(orgId);
    // 2. Update Local State
    setOrganizations(prev => prev.filter(o => o.id !== orgId));
  };

  const handleTransferAssistant = async (assistant: Assistant, targetOrgId: string) => {
    setAssistants(prev => prev.map(a => 
        a.id === assistant.id 
        ? { ...a, orgId: targetOrgId } 
        : a
    ));
    await supabaseService.saveAssistantMapping(assistant.id, targetOrgId);
  };

  const handleBackToMaster = () => {
    // If admin (check list or session), go back to master list
    // Re-verify logic: If selectedOrg is set, we are in Dashboard view.
    // If we clear it, we go to Master view (if allowed).
    setSelectedOrg(null);
  };

  // --- RENDER ---

  // 1. Loading Screen
  if (isAuthLoading || (session && isLoadingOrgs)) {
      return (
          <div className="min-h-screen bg-vapi-bg flex items-center justify-center font-sans">
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                 <div className="relative">
                     <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center animate-pulse"></div>
                     <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={24} />
                 </div>
                 <div className="text-center">
                    <h2 className="text-white font-semibold text-lg">Vapi Dashboard</h2>
                    <p className="text-zinc-500 text-sm mt-1">
                        {isAuthLoading ? 'Authenticating...' : 'Loading your organization...'}
                    </p>
                 </div>
              </div>
          </div>
      );
  }

  // 2. Login Screen (No Session)
  if (!session) {
      return <Login />;
  }

  // 3. Master Admin View (No Org Selected)
  // Logic: User must be admin (implied by the fact that they are logged in AND selectedOrg is null)
  // Note: Standard users always have selectedOrg set in useEffect.
  if (!selectedOrg) {
    return (
      <MasterOverview 
        organizations={organizations}
        assistants={assistants}
        onSelectOrg={handleSelectOrg}
        onUpdateOrg={handleUpdateOrg}
        onAddOrg={handleAddOrg}
        onDeleteOrg={handleDeleteOrg}
        onTransferAssistant={handleTransferAssistant}
      />
    );
  }

  // 4. Org Dashboard View
  if (selectedOrg) {
      return (
        <div className="flex min-h-screen bg-vapi-bg font-sans selection:bg-vapi-accent selection:text-black animate-fade-in">
          <Sidebar 
            currentView={currentView} 
            onChangeView={setCurrentView} 
            selectedOrg={selectedOrg}
            onBackToMaster={handleBackToMaster}
            isAdmin={isAdmin}
          />
          <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
            <div className="max-w-7xl mx-auto">
              {(() => {
                switch (currentView) {
                  case 'overview': return <Overview />;
                  case 'assistants': 
                    return (
                      <Assistants 
                        assistants={assistants}
                        setAssistants={setAssistants}
                        selectedOrgId={selectedOrg.id}
                        selectedOrgName={selectedOrg.name}
                      />
                    );
                  case 'logs': return <Logs />;
                  case 'phone-numbers': return <PhoneNumbers />;
                  case 'files': return <Files orgId={selectedOrg.id} />;
                  case 'tools': return <Tools orgId={selectedOrg.id} />;
                  default: return <Overview />;
                }
              })()}
            </div>
          </main>
          
          <div className="md:hidden fixed inset-0 bg-black z-[100] flex items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Desktop Only</h2>
              <p className="text-zinc-400">Please view this dashboard on a larger screen.</p>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-vapi-bg flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Account Error</h2>
        <p className="text-zinc-400 max-w-md mb-6">
            Unable to determine account status.
        </p>
        <button 
            onClick={() => supabaseService.signOut()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
        >
            Sign Out
        </button>
    </div>
  );
}