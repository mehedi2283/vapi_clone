import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Organization, FileItem, ToolItem } from '../types';

// Storage keys for runtime configuration
const STORE_URL = 'vapi_sb_url';
const STORE_KEY = 'vapi_sb_key';

class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private sbUrl: string = '';
  private sbKey: string = '';

  constructor() {
    this.initClient();
  }

  private initClient() {
    // 1. Try Vite/Modern Bundler Environment Variables
    // @ts-ignore
    const viteUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
    // @ts-ignore
    const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

    // 2. Try Standard Process Env (Webpack/Node) or Polyfill from index.html
    const procUrl = typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : undefined;
    const procKey = typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : undefined;
    
    // 3. Try Window Object (Legacy/Direct Injection)
    const winUrl = (window as any).process?.env?.SUPABASE_URL;
    const winKey = (window as any).process?.env?.SUPABASE_ANON_KEY;

    // 4. Try Local Storage (Runtime Configuration)
    const localUrl = localStorage.getItem(STORE_URL);
    const localKey = localStorage.getItem(STORE_KEY);

    // Prioritize: Env Vars > Window Injection > Local Storage
    const url = (viteUrl || procUrl || winUrl || localUrl || '').trim();
    const key = (viteKey || procKey || winKey || localKey || '').trim();

    // Debugging logs for production issues
    if (!url || !key) {
        console.groupCollapsed("[SupabaseService] Connection Config Missing");
        console.log("Checking VITE_SUPABASE_URL:", viteUrl ? "Found" : "Missing");
        console.log("Checking process.env.SUPABASE_URL:", procUrl ? "Found" : "Missing");
        console.log("Checking LocalStorage:", localUrl ? "Found" : "Missing");
        console.warn("If deploying to Vercel, ensure variables start with 'VITE_' (e.g. VITE_SUPABASE_URL)");
        console.groupEnd();
    } else {
        // console.log("[SupabaseService] Configured with:", url);
    }

    if (url && key) {
        // Basic validation to prevent crash
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            console.warn("Skipping Supabase init: URL must start with http:// or https://");
            return;
        }

        try {
            this.sbUrl = url;
            this.sbKey = key;
            this.supabase = createClient(url, key);
        } catch (e) {
            console.error("Failed to initialize Supabase client", e);
            this.supabase = null;
        }
    }
  }

  public isConfigured(): boolean {
      return !!this.supabase;
  }

  public setConfig(url: string, key: string) {
      if (!url || !key) return;
      localStorage.setItem(STORE_URL, url.trim());
      localStorage.setItem(STORE_KEY, key.trim());
      // Re-initialize
      this.initClient();
  }

  public clearConfig() {
      localStorage.removeItem(STORE_URL);
      localStorage.removeItem(STORE_KEY);
      this.supabase = null;
      this.sbUrl = '';
      this.sbKey = '';
  }

  private checkClient() {
      if (!this.supabase) throw new Error("Supabase not configured. Click the gear icon to set up your connection.");
  }

  // --- Auth Methods ---

  async getCurrentUser() {
    if (!this.supabase) return null;
    try {
        const { data: { session } } = await this.supabase.auth.getSession();
        return session?.user ? { id: session.user.id, email: session.user.email! } : null;
    } catch (e) {
        // If session check fails (e.g. invalid key), treat as logged out
        console.warn("Session check failed", e);
        return null;
    }
  }

  onAuthStateChange(callback: (event: string, session: { user: any } | null) => void) {
      if (!this.supabase) {
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
      const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
          const mappedSession = session?.user ? { user: { id: session.user.id, email: session.user.email! } } : null;
          callback(event, mappedSession);
      });
      return { data };
  }

  async signIn(email: string, password: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!.auth.signOut();
    if (error) throw error;
  }

  async signUp(email: string, password: string, metaData?: any): Promise<{ user: { id: string } | null }> {
    this.checkClient();
    const { data, error } = await this.supabase!.auth.signUp({ 
        email, 
        password,
        options: {
            data: metaData
        }
    });
    if (error) throw error;
    return { user: data.user ? { id: data.user.id } : null };
  }

  // Create a user without logging the current user out (Isolated Client)
  async createIsolatedUser(email: string, password: string, metaData?: any): Promise<{ user: { id: string } | null, error: any }> {
      // Use stored credentials instead of inspecting the instance
      if (!this.sbUrl || !this.sbKey) {
          return { user: null, error: new Error("Supabase credentials missing") };
      }

      try {
          const tempClient = createClient(this.sbUrl, this.sbKey, {
              auth: {
                  persistSession: false, 
                  autoRefreshToken: false,
                  detectSessionInUrl: false
              }
          });

          const { data, error } = await tempClient.auth.signUp({
              email,
              password,
              options: {
                  data: metaData
              }
          });
          
          return { user: data.user ? { id: data.user.id } : null, error };
      } catch (e) {
          return { user: null, error: e };
      }
  }

  async updateUserPassword(password: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!.auth.updateUser({ password });
    if (error) throw error;
  }

  // --- Data Methods (Real DB) ---

  async getOrganizationByEmail(email: string): Promise<Organization | null> {
    if (!this.supabase) return null;
    
    const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('email', email)
        .single();
    
    if (error) {
        if (error.code !== 'PGRST116') console.error("Error fetching org:", error.message);
        return null;
    }
    return data as Organization;
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!this.supabase) return null;
    
    const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        // console.error("Error fetching org by ID:", error);
        return null;
    }
    return data as Organization;
  }

  // Fetch all organizations accessible to the current user (Own + Shared)
  async getUserOrganizations(): Promise<Organization[]> {
      if (!this.supabase) return [];
      
      // Rely on RLS: SELECT * FROM organizations will return 
      // 1. Orgs owned by user (id = auth.uid())
      // 2. Orgs where user is in 'members' array (via policy)
      const { data, error } = await this.supabase
          .from('organizations')
          .select('*')
          .order('name');
          
      if (error) {
          console.error("Error fetching user orgs:", error.message);
          return [];
      }
      return data as Organization[];
  }

  async getAllOrganizations(): Promise<Organization[]> {
    if (!this.supabase) return [];
    
    const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error("Error fetching all orgs:", error.message);
        return [];
    }
    return data as Organization[];
  }

  async createOrganization(org: Organization, password?: string): Promise<Organization> {
    this.checkClient();
    
    // Merge password into the payload if provided
    const payload: any = { ...org };
    if (password) {
        payload.password = password;
    }

    const { data, error } = await this.supabase!
        .from('organizations')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data as Organization;
  }

  async updateOrganization(org: Partial<Organization> & { id: string }): Promise<void> {
    this.checkClient();
    
    // Destructure ID to ensure we don't try to update the Primary Key
    // This allows passing the full object safely.
    const { id, ...updates } = org;
    
    const { error } = await this.supabase!
        .from('organizations')
        .update(updates)
        .eq('id', id);
    
    if (error) throw error;
  }

  async deleteMember(emailToDelete: string, orgId: string): Promise<void> {
      this.checkClient();
      // Call the Postgres RPC function
      const { error } = await this.supabase!.rpc('delete_team_member', {
          target_email: emailToDelete,
          org_id: orgId
      });

      if (error) throw error;
  }

  async deleteOrganization(id: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('organizations')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
  }

  async saveAssistantMapping(assistantId: string, orgId: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('assistants')
        .upsert({ id: assistantId, org_id: orgId }, { onConflict: 'id' });
        
    if (error) console.error("Failed to map assistant to org in Supabase:", error.message);
  }

  async getAllAssistantMappings(): Promise<{ id: string, org_id: string }[]> {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
        .from('assistants')
        .select('id, org_id');
    
    if (error) {
        // Prevent [object Object] by logging message
        console.error("Error fetching assistant mappings:", error.message || error);
        return [];
    }
    return data || [];
  }

  async getFiles(orgId: string): Promise<FileItem[]> {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
        .from('files')
        .select('*')
        .eq('org_id', orgId)
        .order('uploaded_at', { ascending: false });
        
    if (error) {
        console.error("Error fetching files:", error.message);
        return [];
    }
    // Map DB columns to FileItem
    return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: f.uploaded_at || f.created_at
    }));
  }

  async createFile(file: FileItem, orgId: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('files')
        .insert([{
            id: file.id,
            org_id: orgId,
            name: file.name,
            size: file.size,
            type: file.type,
            uploaded_at: file.uploadedAt
        }]);
    if (error) throw error;
  }

  async deleteFile(id: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('files')
        .delete()
        .eq('id', id);
    if (error) throw error;
  }

  async getTools(orgId: string): Promise<ToolItem[]> {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .eq('org_id', orgId);
        
    if (error) {
        console.error("Error fetching tools:", error.message);
        return [];
    }
    return data || [];
  }

  async createTool(tool: ToolItem, orgId: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('tools')
        .insert([{ ...tool, org_id: orgId }]);
    if (error) throw error;
  }

  async deleteTool(id: string): Promise<void> {
    this.checkClient();
    const { error } = await this.supabase!
        .from('tools')
        .delete()
        .eq('id', id);
    if (error) throw error;
  }
}

export const supabaseService = new SupabaseService();