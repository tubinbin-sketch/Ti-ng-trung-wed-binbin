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
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-white/60 shadow-lg text-[#1E3227] animate-in slide-in-from-right-5 fade-in duration-300">
      <CheckCircle2 className="w-5 h-5 text-[#9B8A3E]" />
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-black/10 p-0.5 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
