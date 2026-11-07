import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Toast } from '../../types/tactical';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useElectoralStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-5 z-[3000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast: Toast) => {
        const icons: Record<Toast['type'], React.ReactNode> = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
          error: <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
        };

        const borders: Record<Toast['type'], string> = {
          success: 'border-emerald-500/40 bg-slate-900/95 shadow-emerald-950/40',
          warning: 'border-amber-500/40 bg-slate-900/95 shadow-amber-950/40',
          error: 'border-rose-500/40 bg-slate-900/95 shadow-rose-950/40',
          info: 'border-blue-500/40 bg-slate-900/95 shadow-blue-950/40',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-top-2 duration-300 ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs tracking-wide">{toast.title}</h4>
                <span className="text-[10px] text-slate-500 font-mono">{toast.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
