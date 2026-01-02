import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm rounded-xl p-4 shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-full fade-in duration-300
              ${toast.type === 'success' ? 'bg-zinc-900 border-emerald-500/20' : ''}
              ${toast.type === 'error' ? 'bg-zinc-900 border-red-500/20' : ''}
              ${toast.type === 'warning' ? 'bg-zinc-900 border-amber-500/20' : ''}
              ${toast.type === 'info' ? 'bg-zinc-900 border-blue-500/20' : ''}
              bg-opacity-95 backdrop-blur-md
            `}
          >
            <div className={`mt-0.5 p-1 rounded-full 
              ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-red-500/10 text-red-400' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/10 text-blue-400' : ''}
            `}>
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'warning' && <AlertTriangle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            
            <div className="flex-1 pt-0.5">
               <p className="text-sm font-medium text-white">{toast.message}</p>
            </div>

            <button 
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};