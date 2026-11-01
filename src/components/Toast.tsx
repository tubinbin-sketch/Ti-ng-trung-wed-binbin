import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-5 right-4 lg:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-border shadow-lg text-ink animate-in slide-in-from-right-5 fade-in duration-300">
      <CheckCircle2 className="w-5 h-5 text-gold" />
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-black/10 p-0.5 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
