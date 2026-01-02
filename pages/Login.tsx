import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseClient';
import { Loader2, ArrowRight, Lock, Mail, Building2, AlertCircle } from 'lucide-react';
import { Organization } from '../types';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        if (isLogin) {
            // LOGIN
            await supabaseService.signIn(email, password);
            // App.tsx auth listener will handle redirect
        } else {
            // SIGN UP
            if (!orgName.trim()) {
                throw new Error("Organization name is required.");
            }

            // 1. Create Auth User
            // We pass metadata { role: 'user' } for redundancy
            const { user } = await supabaseService.signUp(email, password);
            
            if (user) {
                // 2. Check if an Org already exists for this email (Pre-created by Admin)
                const existingOrg = await supabaseService.getOrganizationByEmail(email);

                if (existingOrg) {
                    // CLAIM LOGIC:
                    // Admin pre-created an account with a random ID. We need to associate it with the new Auth User ID.
                    
                    const claimedOrg: Organization = {
                        ...existingOrg,
                        id: user.id, // Set correct Auth ID
                        name: orgName || existingOrg.name,
                        role: existingOrg.role || 'user' // Preserve role if set by admin
                    };

                    // Delete the placeholder
                    await supabaseService.deleteOrganization(existingOrg.id);
                    // Create the real one
                    await supabaseService.createOrganization(claimedOrg);

                } else {
                    // NORMAL SIGN UP:
                    // Create new organization with default 'user' role
                    const newOrg: Organization = {
                        id: user.id, // Link Auth ID to Org ID
                        name: orgName,
                        email: email,
                        role: 'user', // Enforce User Role
                        plan: 'trial',
                        credits: 5.00,
                        usageCost: 0.00,
                        status: 'active',
                        createdAt: new Date().toISOString()
                    };
                    
                    await supabaseService.createOrganization(newOrg);
                }
            } else {
                 throw new Error("Sign up failed (no user returned). Please try again.");
            }
        }
    } catch (err: any) {
        // Fix for [object Object] logging
        console.error("Auth Error:", err.message || err);
        
        // Robust error message extraction
        let msg = "Authentication failed.";
        if (typeof err === 'string') {
            msg = err;
        } else if (err instanceof Error) {
            msg = err.message;
        } else if (typeof err === 'object' && err !== null) {
            msg = err.message || err.error_description || err.error || JSON.stringify(err);
        }
        
        // Friendly mapping for common Supabase errors
        if (msg.includes('Invalid login credentials')) {
            msg = "Invalid email or password.";
        } else if (msg.includes('User already registered')) {
            msg = "This email is already registered. Please log in.";
        }

        setError(msg);
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vapi-bg flex items-center justify-center p-4 font-sans selection:bg-vapi-accent selection:text-black">
      <div className="w-full max-w-md">
        
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-in">
           <div className="w-16 h-16 bg-vapi-accent rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
           </div>
           <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
           <p className="text-zinc-500 text-sm">Sign in to manage your voice assistants</p>
        </div>

        {/* Card */}
        <div className="bg-vapi-card border border-vapi-border rounded-2xl p-8 shadow-2xl animate-scale-up relative overflow-hidden">
           {/* Glow Effect */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-vapi-accent to-transparent opacity-50"></div>

           <form onSubmit={handleAuth} className="space-y-4">
              
              {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-sm text-red-400 break-words">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                  </div>
              )}

              {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-medium text-zinc-400 ml-1">Organization Name</label>
                    <div className="relative group">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-vapi-accent transition-colors" size={18} />
                        <input 
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-vapi-accent focus:bg-zinc-950 transition-all"
                            placeholder="Acme Corp"
                            required={!isLogin}
                        />
                    </div>
                </div>
              )}

              <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
                  <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-vapi-accent transition-colors" size={18} />
                      <input 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-vapi-accent focus:bg-zinc-950 transition-all"
                          placeholder="name@company.com"
                          required
                      />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                  <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-vapi-accent transition-colors" size={18} />
                      <input 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-vapi-accent focus:bg-zinc-950 transition-all"
                          placeholder="••••••••"
                          required
                          minLength={6}
                      />
                  </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-vapi-accent hover:bg-teal-300 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                  {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                  ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={18} />
                      </>
                  )}
              </button>
           </form>

           <div className="mt-6 text-center">
               <p className="text-zinc-500 text-sm">
                   {isLogin ? "Don't have an account? " : "Already have an account? "}
                   <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-white font-medium hover:text-vapi-accent transition-colors underline decoration-zinc-700 hover:decoration-vapi-accent underline-offset-4"
                   >
                       {isLogin ? 'Sign up' : 'Log in'}
                   </button>
               </p>
           </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
            &copy; {new Date().getFullYear()} Vapi Clone. All rights reserved.
        </p>
      </div>
    </div>
  );
};