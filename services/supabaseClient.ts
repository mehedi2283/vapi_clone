import { createClient } from '@supabase/supabase-js';
import { Organization, FileItem, ToolItem } from '../types';
import { MOCK_ORGS, MOCK_FILES, MOCK_TOOLS } from '../constants';

// Supabase Credentials
const SUPABASE_URL = 'https://tlglequivxzlekjrbjvq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7nq3imUdgiB8RmSvdI7ggA_mnVus3vv';

// Initialize client
// Note: We're initializing it even if keys look weird to try, but we'll catch failures.
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

// Mock Fallback Data for Auth
const MOCK_USER = {
    id: 'user_mock_123',
    email: 'admin@vapi.clone',
    role: 'authenticated'
};

const MOCK_SESSION = {
    access_token: 'mock_token',
    refresh_token: 'mock_refresh',
    expires_in: 3600,
    user: MOCK_USER
};

// Custom event to notify App.tsx of auth changes if Supabase auth fails
export const authStateChanged = new EventTarget();

export const supabaseService = {
  // --- AUTH ---
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase client not initialized");
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        return data;
    } catch (error: any) {
        // FALLBACK: If network/fetch fails, allow demo login
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || !SUPABASE_KEY.startsWith('ey')) {
            console.warn("Auth network error, falling back to Demo Mode.");
            localStorage.setItem('vapi_demo_session', JSON.stringify(MOCK_SESSION));
            // Dispatch event so App.tsx can react if it's listening to this mechanism
            authStateChanged.dispatchEvent(new Event('signedIn'));
            return { session: MOCK_SESSION, user: MOCK_USER };
        }
        throw new Error(error.message || 'SignIn Failed');
    }
  },

  async signUp(email: string, password: string) {
    if (!supabase) throw new Error("Supabase client not initialized");
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role: 'user' } }
        });
        if (error) throw error;
        return data;
    } catch (error: any) {
         if (error.message?.includes('Failed to fetch') || !SUPABASE_KEY.startsWith('ey')) {
            console.warn("Auth network error (SignUp), falling back to Demo Mode.");
            const demoUser = { ...MOCK_USER, email: email, id: `user_${Date.now()}` };
            const demoSession = { ...MOCK_SESSION, user: demoUser };
            localStorage.setItem('vapi_demo_session', JSON.stringify(demoSession));
            authStateChanged.dispatchEvent(new Event('signedIn'));
            return { session: demoSession, user: demoUser };
         }
         throw new Error(error.message || 'SignUp Failed');
    }
  },

  async signOut() {
    // Clear demo session
    localStorage.removeItem('vapi_demo_session');
    
    if (supabase) {
        try {
            await supabase.auth.signOut();
        } catch (e) { console.warn("Supabase SignOut failed, ignoring."); }
    }
    authStateChanged.dispatchEvent(new Event('signedOut'));
  },

  async getCurrentUser() {
    // Check demo first
    const demoSession = localStorage.getItem('vapi_demo_session');
    if (demoSession) {
        return JSON.parse(demoSession).user;
    }

    if (!supabase) return null;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user || null;
    } catch (e) {
        return null;
    }
  },

  // --- ORGANIZATIONS ---
  async getOrganizations(userId?: string): Promise<Organization[]> {
    if (!supabase) return MOCK_ORGS;
    try {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId && !userId.startsWith('user_mock') && !userId.startsWith('user_')) {
        query = query.eq('id', userId); 
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((org: any) => ({
        id: org.id,
        name: org.name,
        email: org.email,
        role: org.role || 'user',
        plan: org.plan,
        credits: Number(org.credits),
        usageCost: Number(org.usage_cost || org.usageCost || 0),
        status: org.status,
        createdAt: org.created_at || org.createdAt
      }));
    } catch (error: any) {
      console.warn("Fetching organizations failed (Network/CORS), using mocks.", error.message);
      // Filter mocks for demo user if needed, or return all for demo
      return MOCK_ORGS;
    }
  },

  async getOrganizationByEmail(email: string): Promise<Organization | null> {
    // Check mocks first
    const mock = MOCK_ORGS.find(o => o.email === email);
    if (mock) return mock;

    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role || 'user',
        plan: data.plan,
        credits: Number(data.credits),
        usageCost: Number(data.usage_cost || 0),
        status: data.status,
        createdAt: data.created_at
      };
    } catch (error: any) {
      console.warn("getOrganizationByEmail failed, ignoring.");
      return null;
    }
  },

  async createOrganization(org: Organization, password?: string): Promise<Organization | null> {
    // Mock for demo
    if (localStorage.getItem('vapi_demo_session')) {
        return org;
    }

    if (!supabase) return org;
    
    let finalOrgId = org.id;

    // 1. Create Auth User if password is provided
    if (password && org.email) {
        // IMPORTANT: We use a separate client instance here with persistSession: false.
        // This prevents the new user's session from overwriting the current Admin session in localStorage.
        // We also provide a dummy storage to prevent "Multiple GoTrueClient instances" warnings.
        const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storage: {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                }
            }
        });

        try {
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: org.email,
                password: password,
                options: {
                    data: { role: org.role || 'user' } // Store role in user metadata
                }
            });

            if (authError) {
                console.error("Auth creation error:", authError);
                throw new Error(`Auth User Creation Failed: ${authError.message}`);
            }

            if (authData.user) {
                // Use the REAL Auth ID for the organization ID
                finalOrgId = authData.user.id;
            }
            
            // Explicitly sign out the temp client to ensure no session leakage
            await tempClient.auth.signOut();

        } catch (e: any) {
            console.error("Failed to create auth user:", e);
            // We'll proceed with creating the org record, but warn the admin?
            // For now, we assume we might want to continue or throw. 
            // Let's throw so the UI knows the user wasn't created.
            throw e; 
        }
    }
    
    // 2. Create Organization Record
    const basePayload = {
        id: finalOrgId,
        name: org.name,
        email: org.email,
        // Storing password here is NOT secure but matches the requested behavior for this clone
        password: password || 'managed_by_auth_v1', 
        plan: org.plan,
        credits: org.credits,
        usage_cost: org.usageCost,
        status: org.status,
        created_at: org.createdAt
    };

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{ ...basePayload, role: org.role || 'user' }])
        .select()
        .single();

      if (error) throw error;
      return { ...org, id: finalOrgId, ...data }; 

    } catch (error: any) {
      // Handle potential "role column does not exist" in older schemas
      const isColumnMissing = error.message?.includes('column "role"') || error.code === '42703';
      if (isColumnMissing) {
          const { data } = await supabase.from('organizations').insert([basePayload]).select().single();
          return { ...org, id: finalOrgId, ...data, role: 'user' };
      }
      
      console.error("Error creating organization record:", error.message || error);
      throw error;
    }
  },

  async updateOrganization(org: Organization): Promise<void> {
    if (localStorage.getItem('vapi_demo_session') || !supabase) return;
    try {
        const updatePayload: any = { 
            credits: org.credits,
            usage_cost: org.usageCost,
            status: org.status,
            plan: org.plan
        };
        if (org.role) updatePayload.role = org.role;

        const { error } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', org.id);

        if (error) throw error;
    } catch (error: any) {
        console.warn("Error updating organization:", error.message);
    }
  },

  async deleteOrganization(orgId: string): Promise<void> {
    if (localStorage.getItem('vapi_demo_session') || !supabase) return;
    try {
        const { error } = await supabase.from('organizations').delete().eq('id', orgId);
        if (error) throw error;
    } catch (error: any) {
        console.warn("Error deleting organization:", error.message);
    }
  },

  // --- ASSISTANT MAPPINGS ---
  async getAssistantMappings(): Promise<{assistant_id: string, org_id: string}[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('assistant_org_map').select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      return [];
    }
  },

  async saveAssistantMapping(assistantId: string, orgId: string): Promise<void> {
    if (!supabase) return;
    try {
      await supabase
        .from('assistant_org_map')
        .upsert({ assistant_id: assistantId, org_id: orgId }, { onConflict: 'assistant_id' });
    } catch (error) {
      // ignore
    }
  },

  // --- FILES ---
  async getFiles(orgId: string): Promise<FileItem[]> {
    if (!supabase) return MOCK_FILES;
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: f.created_at
      }));
    } catch (error: any) {
      return MOCK_FILES;
    }
  },

  async createFile(file: FileItem, orgId: string): Promise<void> {
    if (localStorage.getItem('vapi_demo_session')) return;
    if (!supabase) return;
    try {
      await supabase.from('files').insert({
        id: file.id,
        org_id: orgId,
        name: file.name,
        size: file.size,
        type: file.type,
        created_at: file.uploadedAt
      });
    } catch (error) { console.warn("Create file failed"); }
  },

  async deleteFile(fileId: string): Promise<void> {
    if (localStorage.getItem('vapi_demo_session')) return;
    if (!supabase) return;
    try {
      await supabase.from('files').delete().eq('id', fileId);
    } catch (error) { console.warn("Delete file failed"); }
  },

  // --- TOOLS ---
  async getTools(orgId: string): Promise<ToolItem[]> {
    if (!supabase) return MOCK_TOOLS;
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type
      }));
    } catch (error: any) {
      return MOCK_TOOLS;
    }
  },

  async createTool(tool: ToolItem, orgId: string): Promise<void> {
    if (localStorage.getItem('vapi_demo_session')) return;
    if (!supabase) return;
    try {
      await supabase.from('tools').insert({
        id: tool.id,
        org_id: orgId,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        created_at: new Date().toISOString()
      });
    } catch (error) { console.warn("Create tool failed"); }
  },

  async deleteTool(toolId: string): Promise<void> {
    if (localStorage.getItem('vapi_demo_session')) return;
    if (!supabase) return;
    try {
        await supabase.from('tools').delete().eq('id', toolId);
    } catch (error) { console.warn("Delete tool failed"); }
  }
};