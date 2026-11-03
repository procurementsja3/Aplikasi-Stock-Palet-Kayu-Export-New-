import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { ToastInfo } from '../types/pallet';

interface ToastProps {
  toasts: ToastInfo[];
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-[150] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${
              isSuccess
                ? 'bg-emerald-600 border-emerald-700 text-white'
                : isError
                ? 'bg-rose-600 border-rose-700 text-white'
                : 'bg-slate-800 border-slate-900 text-white'
            }`}
          >
            <div className="shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-100" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-100" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-200" />}
            </div>
            <p className="text-xs sm:text-sm font-medium leading-snug">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
};
