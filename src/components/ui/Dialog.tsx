import React, { useEffect, useId, useRef } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  labelledBy?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  testId?: string;
  closeOnOverlayClick?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  ariaLabel,
  labelledBy,
  maxWidthClass = 'max-w-2xl',
  children,
  testId,
  closeOnOverlayClick = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fallbackTitleId = useId();
  const effectiveLabelledBy = labelledBy || (title ? fallbackTitleId : undefined);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const autoFocusEl = container.querySelector<HTMLElement>('[autofocus], [data-autofocus="true"]');
      if (autoFocusEl) {
        autoFocusEl.focus();
        return;
      }
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    }, 15);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusable.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !container.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try {
          previousFocusRef.current.focus();
        } catch {
          // ignore if element was unmounted
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto animate-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (!effectiveLabelledBy ? 'Hộp thoại' : undefined)}
      aria-labelledby={effectiveLabelledBy}
      data-testid={testId}
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} my-auto animate-sheet-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      >
        {title && !labelledBy && (
          <h2 id={fallbackTitleId} className="sr-only">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
