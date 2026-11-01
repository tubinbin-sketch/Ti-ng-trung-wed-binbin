import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  testId?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  badge = 'CHƯA CÓ DỮ LIỆU',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  testId = 'empty-state-card',
}) => {
  return (
    <div
      data-testid={testId}
      className="w-full rounded-3xl bg-surface border-2 border-dashed border-border p-6 sm:p-8 text-center space-y-3 shadow-xs my-3"
    >
      {icon && (
        <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="text-xs font-semibold text-gold">
        {badge}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted max-w-lg mx-auto leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary text-sm font-bold shadow-xs transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span>{actionLabel}</span>
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-border text-sm font-bold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
