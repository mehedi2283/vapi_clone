import { createClient } from '@supabase/supabase-js';
import { Organization } from '../types';

// Supabase Credentials
const SUPABASE_URL = 'https://tlglequivxzlekjrbjvq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7nq3imUdgiB8RmSvdI7ggA_mnVus3vv';

// Initialize client only if keys are present
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

export const supabaseService = {
  // Fetch all organizations
  async getOrganizations(): Promise<Organization[]> {
    if (!supabase) {
      console.warn("Supabase not configured. Falling back to local storage/mock data.");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Map snake_case DB columns to camelCase TS types
      return data.map((org: any) => ({
        id: org.id,
        name: org.name,
        email: org.email,
        password: org.password, // Retrieve the saved password
        plan: org.plan,
        credits: Number(org.credits),
        usageCost: Number(org.usage_cost || org.usageCost || 0),
        status: org.status,
        createdAt: org.created_at || org.createdAt
      }));
    } catch (error) {
      console.error("Error fetching organizations from Supabase:", error);
      return [];
    }
  },

  // Create a new organization
  async createOrganization(org: Organization): Promise<Organization | null> {
    if (!supabase) {
      console.warn("Supabase not configured. Performing local-only create.");
      return null;
    }

    try {
      // Map TS type to DB columns
      const dbPayload = {
        id: org.id,
        name: org.name,
        email: org.email,
        password: org.password, // Save the password
        plan: org.plan,
        credits: org.credits,
        usage_cost: org.usageCost,
        status: org.status,
        created_at: org.createdAt
      };

      const { data, error } = await supabase
        .from('organizations')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        plan: data.plan,
        credits: Number(data.credits),
        usageCost: Number(data.usage_cost),
        status: data.status,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error("Error creating organization in Supabase:", error);
      throw error;
    }
  },

  // Update organization stats (credits/usage)
  async updateOrganization(org: Organization): Promise<void> {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('organizations')
            .update({ 
                credits: org.credits,
                usage_cost: org.usageCost,
                status: org.status
            })
            .eq('id', org.id);
            
        if (error) throw error;
    } catch (error) {
        console.error("Error updating organization in Supabase:", error);
    }
  }
};