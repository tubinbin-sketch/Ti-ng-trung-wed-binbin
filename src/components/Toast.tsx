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
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-5 right-4 lg:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-border shadow-lg text-ink animate-toast-in" role="status" aria-live="polite">
      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      <span className="text-sm font-semibold">{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="ml-2 hover:bg-surface-2 p-1 rounded-full text-ink-muted hover:text-ink cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
