import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Terminal } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entry animation frame
    const timer = requestAnimationFrame(() => {
        setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false); // Trigger exit visual
    setIsRemoving(true); // Trigger layout collapse
    
    // Wait for animation to finish before unmounting
    setTimeout(() => {
      onRemove(toast.id);
    }, 600); // Slightly longer than CSS duration to ensure completion
  }, [toast.id, onRemove]);

  useEffect(() => {
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);
    return () => clearTimeout(autoDismissTimer);
  }, [handleDismiss]);

  // Determine styles based on type
  const typeStyles = {
    success: { border: 'from-emerald-500/0 via-emerald-500 to-emerald-500/0', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]', icon: 'text-emerald-400 bg-emerald-500/10', bar: 'bg-emerald-500' },
    error: { border: 'from-red-500/0 via-red-500 to-red-500/0', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]', icon: 'text-red-400 bg-red-500/10', bar: 'bg-red-500' },
    warning: { border: 'from-amber-500/0 via-amber-500 to-amber-500/0', shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]', icon: 'text-amber-400 bg-amber-500/10', bar: 'bg-amber-500' },
    info: { border: 'from-blue-500/0 via-blue-500 to-blue-500/0', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]', icon: 'text-blue-400 bg-blue-500/10', bar: 'bg-blue-500' }
  }[toast.type];

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto relative w-[340px] rounded-xl overflow-hidden
        bg-zinc-950/90 backdrop-blur-xl border border-white/10 shadow-2xl
        transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1)
        ${isVisible 
            ? 'opacity-100 translate-x-0 scale-100 max-h-40 mb-3 py-0' 
            : 'opacity-0 translate-x-24 scale-95 max-h-0 mb-0 py-0'
        }
      `}
    >
        {/* Visual Content Wrapper to prevent text jumping during height collapse */}
        <div className={`relative w-full h-full transition-all duration-500 ${isRemoving ? 'opacity-0' : 'opacity-100'}`}>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/5">
                <div 
                    className={`h-full origin-left animate-[progress_5s_linear_forwards] ${typeStyles.bar}`}
                    style={{ animationPlayState: isRemoving ? 'paused' : 'running' }}
                />
            </div>

            {/* Glowing Laser Beam */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b opacity-80 ${typeStyles.border} ${typeStyles.shadow}`} />

            {/* Content */}
            <div className="flex items-start gap-4 p-4 pl-5">
                <div className={`mt-0.5 p-1.5 rounded-full shrink-0 shadow-[0_0_15px_-3px_currentColor] transition-colors ${typeStyles.icon}`}>
                    {toast.type === 'success' && <CheckCircle2 size={16} strokeWidth={2.5} />}
                    {toast.type === 'error' && <AlertCircle size={16} strokeWidth={2.5} />}
                    {toast.type === 'warning' && <AlertTriangle size={16} strokeWidth={2.5} />}
                    {toast.type === 'info' && <Terminal size={16} strokeWidth={2.5} />}
                </div>

                <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium text-zinc-100 leading-snug">{toast.message}</p>
                </div>

                <button 
                    onClick={handleDismiss}
                    className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1 hover:bg-white/10 rounded-md -mr-1 -mt-1"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end pointer-events-none perspective-[1000px]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
        <style>{`
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `}</style>
      </div>
    </ToastContext.Provider>
  );
};