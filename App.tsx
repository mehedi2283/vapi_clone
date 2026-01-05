import React, { useState, useEffect } from 'react';
import { ViewState, Organization, Assistant } from './types';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Assistants } from './pages/Assistants';
import { PhoneNumbers } from './pages/PhoneNumbers';
import { Logs } from './pages/Logs';
import { Files } from './pages/Files';
import { Tools } from './pages/Tools';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { MasterOverview } from './pages/MasterOverview';
import { supabaseService } from './services/supabaseClient';
import { fetchVapiAssistants, parseSecureToken } from './services/vapiService';
import { MOCK_ORGS, NIYA_ORG_ID, VAPI_PRIVATE_KEY } from './constants';
import { Loader2, Bell, Search, AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<{user: any} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMagicLoggingIn, setIsMagicLoggingIn] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]); // Orgs accessible to the user
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]); // All orgs (Admin only)
  
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Master Account State
  const [isMasterView, setIsMasterView] = useState(false);

  // Magic Link Handler
  useEffect(() => {
    const checkMagicLink = async () => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        // Only process if we have a token and are NOT already logged in
        if (token && !session?.user) {
            setIsMagicLoggingIn(true);
            const data = parseSecureToken(token);
            
            if (data && data.em && data.pw) {
                try {
                    console.log("Attempting Magic Login for:", data.em);
                    await supabaseService.signIn(data.em, data.pw);
                    // Clear the token from URL to be clean
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err) {
                    console.error("Magic login failed", err);
                    // Just let standard auth flow take over if this fails
                } finally {
                    setIsMagicLoggingIn(false);
                }
            } else {
                 console.warn("Invalid Magic Link Token");
                 setIsMagicLoggingIn(false);
            }
        }
    };
    checkMagicLink();
  }, [session?.user]); // Re-check if session changes (though primarily runs on mount)

  useEffect(() => {
    // Initial Check
    supabaseService.getCurrentUser().then(user => {
        if (user) {
            setSession({ user });
        } else {
            setSession(null);
            setIsLoading(false);
        }
    });

    // Listen for Auth Changes (Login/Logout)
    const { data: authListener } = supabaseService.onAuthStateChange((event, newSession) => {
        // Only update session if the user ID actually changes or session status changes significantly
        // This prevents infinite re-render loops on 'TOKEN_REFRESHED' events
        setSession(prev => {
            if (prev?.user?.id === newSession?.user?.id) return prev; 
            return newSession;
        });

        if (newSession?.user) {
            // Reset view on login only if not already logged in
            if (!session?.user) setCurrentView('overview');
        } else {
            // Reset state on logout
            setIsAdmin(false);
            setUserOrgs([]);
            setAllOrgs([]);
            setSelectedOrg(null);
            setIsMasterView(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []); // Run once on mount

  // Fetch Data on Session Change
  // CRITICAL: Depend only on user.id to avoid re-fetching on token refreshes
  useEffect(() => {
    if (session?.user?.id) {
        setIsLoading(true);
        const initData = async () => {
            try {
                // 1. Fetch User's Accessible Orgs (Own + Shared via RLS)
                const accessibleOrgs = await supabaseService.getUserOrganizations();
                
                // 2. Fetch Vapi Data & Mappings in parallel
                const [vapiData, mappings] = await Promise.all([
                    fetchVapiAssistants(VAPI_PRIVATE_KEY),
                    supabaseService.getAllAssistantMappings()
                ]);
                
                if (accessibleOrgs.length > 0) {
                    // Set User Orgs
                    setUserOrgs(accessibleOrgs);
                    
                    const ownOrg = accessibleOrgs.find(o => o.id === session.user.id);
                    const invitedOrgs = accessibleOrgs.filter(o => o.id !== session.user.id);

                    // Logic: If user is invited to other orgs, prioritize showing the first invited org
                    // This handles the case where a new user is invited to a "Mother" org and should see that first.
                    let defaultOrg = ownOrg;
                    if (invitedOrgs.length > 0) {
                        defaultOrg = invitedOrgs[0];
                    } else if (!defaultOrg) {
                        defaultOrg = accessibleOrgs[0];
                    }

                    setSelectedOrg(defaultOrg);
                    
                    // 3. Check Admin Role (Admin is tied to the user's specific org role)
                    const userRoleOrg = ownOrg || accessibleOrgs.find(o => o.role === 'admin');
                    
                    if (userRoleOrg?.role === 'admin') {
                        setIsAdmin(true);
                        // Fetch ALL orgs for Master View
                        const everything = await supabaseService.getAllOrganizations();
                        setAllOrgs(everything);
                        // FORCE MASTER VIEW FOR ADMIN LOGIN
                        setIsMasterView(true);
                    } else {
                        setIsAdmin(false);
                        setAllOrgs(accessibleOrgs); // For non-admin, "all" is just what they can see
                        setIsMasterView(false);
                    }
                } else {
                    // Critical: User is authenticated but has no org access
                    console.warn("User logged in but no organization record found.");
                    setSelectedOrg(null); 
                }

                // 4. Merge Vapi Assistants with Supabase Mappings
                // This ensures bots stay in the organization they were created/transferred to
                const mergedAssistants = vapiData.map(asst => {
                    const mapping = mappings.find(m => m.id === asst.id);
                    if (mapping) {
                        return { ...asst, orgId: mapping.org_id };
                    }
                    return asst;
                });

                setAssistants(mergedAssistants);

            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        initData();
    }
  }, [session?.user?.id]); // Only re-run if the User ID changes

  const handleOrgUpdate = (updatedOrg: Organization) => {
     // Update in all lists
     setUserOrgs(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));
     setAllOrgs(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));
     
     if (selectedOrg?.id === updatedOrg.id) {
         setSelectedOrg(updatedOrg);
     }
  };

  if (isLoading || isMagicLoggingIn) {
    return (
        <div className="min-h-screen bg-vapi-bg flex items-center justify-center flex-col gap-4">
            <Loader2 className="animate-spin text-vapi-accent" size={32} />
            {isMagicLoggingIn && <p className="text-zinc-500 text-sm animate-pulse">Authenticating securely...</p>}
        </div>
    );
  }

  if (!session?.user) {
    return <Login />;
  }

  // Handle Missing Org Case (e.g., signup failed halfway or no invites)
  if (!selectedOrg) {
     return (
        <div className="min-h-screen bg-vapi-bg flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Setup Incomplete</h1>
            <p className="text-zinc-500 max-w-md mb-6">
                Your account was created, but no organization profile was found or invited.
            </p>
            <button 
                onClick={() => supabaseService.signOut()}
                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
                Sign Out & Try Again
            </button>
        </div>
     );
  }

  // Render Master Overview only if Admin AND (MasterView toggled OR forced context)
  if (isAdmin && isMasterView) {
      return (
          <MasterOverview 
             organizations={allOrgs}
             assistants={assistants}
             onSelectOrg={(org) => {
                 setSelectedOrg(org);
                 setIsMasterView(false);
                 setCurrentView('overview');
             }}
             onUpdateOrg={handleOrgUpdate}
             onAddOrg={(org) => setAllOrgs(prev => [org, ...prev])}
             onDeleteOrg={(id) => setAllOrgs(prev => prev.filter(o => o.id !== id))}
             onTransferAssistant={(asst, targetOrgId) => {
                 const updated = { ...asst, orgId: targetOrgId };
                 setAssistants(prev => prev.map(a => a.id === asst.id ? updated : a));
             }}
             onUpdateAssistant={(asst) => setAssistants(prev => prev.map(a => a.id === asst.id ? asst : a))}
             onDeleteAssistant={(id) => setAssistants(prev => prev.filter(a => a.id !== id))}
          />
      );
  }

  return (
    <div className="flex min-h-screen bg-vapi-bg text-vapi-text font-sans selection:bg-vapi-accent selection:text-black">
      <Sidebar 
        currentView={currentView}
        onChangeView={setCurrentView}
        selectedOrg={selectedOrg}
        organizations={userOrgs} // Pass accessible orgs to sidebar
        onSelectOrg={setSelectedOrg} // Handle switching
        onBackToMaster={() => setIsMasterView(true)}
        isAdmin={isAdmin}
      />

      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
         {/* Top Header */}
         <header className="flex justify-between items-center mb-8">
           <div className="relative w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
             <input 
               type="text" 
               placeholder="Search anything..." 
               className="w-full bg-vapi-card border border-vapi-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-vapi-border focus:bg-zinc-900 transition-colors"
             />
           </div>
           <div className="flex items-center gap-4">
             <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
               <Bell size={20} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
             </button>
           </div>
        </header>

        {currentView === 'overview' && <Overview />}
        
        {currentView === 'assistants' && (
            <Assistants 
                assistants={assistants} 
                setAssistants={setAssistants}
                selectedOrgId={selectedOrg.id}
                selectedOrgName={selectedOrg.name}
            />
        )}
        
        {currentView === 'phone-numbers' && <PhoneNumbers />}
        
        {currentView === 'logs' && <Logs />}
        
        {currentView === 'files' && <Files orgId={selectedOrg.id} />}
        
        {currentView === 'tools' && <Tools orgId={selectedOrg.id} />}
        
        {currentView === 'settings' && (
            <Settings 
                key={selectedOrg.id}
                org={selectedOrg} 
                onUpdateOrg={handleOrgUpdate}
                assistants={assistants}
                setAssistants={setAssistants}
            />
        )}
      </main>
    </div>
  );
}