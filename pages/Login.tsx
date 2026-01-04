import React, { useState, useEffect, useRef } from 'react';
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

  // Refs for Animation
  const borderRef = useRef<HTMLDivElement>(null);
  const borderBlurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rotation = 0;
    let speed = 2.0; // Initial speed
    let targetSpeed = 2.0;
    let animationFrameId: number;
    let speedTimeoutId: NodeJS.Timeout;

    const changeSpeed = () => {
        // Vary speed between 1.5 and 4.0 degrees per frame for noticeable acceleration/deceleration
        targetSpeed = Math.random() * 2.5 + 1.5;
        
        // Change speed target every 1.5-3.5 seconds
        speedTimeoutId = setTimeout(changeSpeed, Math.random() * 2000 + 1500);
    };

    // Start speed variation
    changeSpeed();

    const animate = () => {
        // Smoothly interpolate current speed towards target speed
        speed += (targetSpeed - speed) * 0.05;
        
        rotation = (rotation + speed) % 360;
        
        // Apply transform
        const transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        
        if (borderRef.current) {
            borderRef.current.style.transform = transform;
        }
        if (borderBlurRef.current) {
            borderBlurRef.current.style.transform = transform;
        }

        animationFrameId = requestAnimationFrame(animate);
    };

    // Start loop
    animationFrameId = requestAnimationFrame(animate);

    return () => {
        cancelAnimationFrame(animationFrameId);
        clearTimeout(speedTimeoutId);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        if (isLogin) {
            // LOGIN
            await supabaseService.signIn(email, password);
        } else {
            // SIGN UP
            // orgName is now optional. If empty, trigger uses defaults or user joins invited orgs only.
            
            // Pass org_name in metadata if provided
            const meta = orgName.trim() ? { org_name: orgName } : {};
            
            const { user } = await supabaseService.signUp(email, password, meta);
            
            if (user) {
                // If orgName provided, ensure it was created or updated
                if (orgName.trim()) {
                    const existingOrg = await supabaseService.getOrganizationById(user.id);
                    if (!existingOrg) {
                        // Trigger fallback
                        const newOrg: Organization = {
                            id: user.id, 
                            name: orgName,
                            email: email,
                            role: 'user', 
                            plan: 'trial',
                            credits: 5.00,
                            usage_cost: 0.00,
                            status: 'active',
                            created_at: new Date().toISOString()
                        };
                        await supabaseService.createOrganization(newOrg, password);
                    } else {
                        const updatedOrg = { ...existingOrg, password: password };
                        await supabaseService.updateOrganization(updatedOrg);
                    }
                }
            } else {
                 throw new Error("Sign up failed (no user returned). Please try again.");
            }
        }
    } catch (err: any) {
        console.error("Auth Error:", err.message || err);
        let msg = err.message || "Authentication failed.";
        
        if (msg.includes('Invalid login credentials')) {
            msg = "Invalid email or password.";
        } 
        
        if (msg.includes('Supabase not configured')) {
            msg = "System error: Database not configured.";
        }

        setError(msg);
        setIsLoading(false);
    }
  };

  // Improved double-beam gradient
  const gradientStyle = 'conic-gradient(from 0deg, transparent 0deg, transparent 40deg, #fb923c 100deg, transparent 160deg, transparent 220deg, #fb923c 280deg, transparent 340deg)';

  return (
    <div className="min-h-screen bg-vapi-bg flex items-center justify-center p-4 font-sans selection:bg-vapi-accent selection:text-black">
      <div className="w-full max-w-md">
        
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-in">
           <div className="w-16 h-16 bg-vapi-accent rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(251,146,60,0.2)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
           </div>
           <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
           <p className="text-zinc-500 text-sm">Sign in to manage your voice assistants</p>
        </div>

        {/* Card Container */}
        <div className="relative w-full max-w-md animate-scale-up">
           
           {/* Moving Glowing Border (Blur Layer) */}
           <div className="absolute -inset-[3px] rounded-2xl overflow-hidden blur-xl opacity-80 pointer-events-none">
                <div 
                    ref={borderBlurRef}
                    className="absolute top-1/2 left-1/2 w-[300%] h-[300%]"
                    style={{ 
                        background: gradientStyle,
                        transform: 'translate(-50%, -50%)' 
                    }}
                ></div>
           </div>

           {/* Moving Glowing Border (Sharp Layer) */}
           <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
                <div 
                    ref={borderRef}
                    className="absolute top-1/2 left-1/2 w-[300%] h-[300%]"
                    style={{ 
                        background: gradientStyle,
                        transform: 'translate(-50%, -50%)' 
                    }}
                ></div>
           </div>

           {/* Inner Card */}
           <div className="relative bg-vapi-card rounded-2xl p-8 shadow-2xl border border-white/5">
                <form onSubmit={handleAuth} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-sm text-red-400 break-words">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                            <label className="text-xs font-medium text-zinc-400 ml-1">
                                Organization Name <span className="text-zinc-600 font-normal">(Optional if invited)</span>
                            </label>
                            <div className="relative group/field">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/field:text-vapi-accent transition-colors" size={18} />
                                <input 
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-vapi-accent focus:bg-zinc-950 transition-all"
                                    placeholder="Acme Corp"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
                        <div className="relative group/field">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/field:text-vapi-accent transition-colors" size={18} />
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
                        <div className="relative group/field">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/field:text-vapi-accent transition-colors" size={18} />
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
                        className="w-full bg-vapi-accent hover:bg-orange-500 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
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
                    
                    {!isLogin && (
                        <p className="text-[10px] text-zinc-500 text-center mt-2">
                           If you were invited to an existing team, just sign up with your email.
                        </p>
                    )}
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
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
            &copy; {new Date().getFullYear()} Vapi. All rights reserved.
        </p>
      </div>
    </div>
  );
};