import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** Optional small label above the title. */
  badge?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  testId?: string;
  /** Extra content under the description (e.g. a list of shortcuts). */
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  badge,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  testId = 'empty-state-card',
  children,
}) => {
  return (
    <div
      data-testid={testId}
      className="w-full rounded-2xl bg-surface border border-dashed border-border-strong px-6 py-10 sm:py-12 text-center animate-rise-in"
    >
      {icon && (
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center [&_svg]:w-6 [&_svg]:h-6">
          {icon}
        </div>
      )}
      {badge && <div className="text-xs font-medium text-ink-subtle mb-1.5">{badge}</div>}
      <h2 className="text-base sm:text-lg font-semibold text-ink text-balance">{title}</h2>
      <p className="mt-1.5 text-sm text-ink-muted max-w-md mx-auto leading-relaxed text-pretty">
        {description}
      </p>
      {children}
      {((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction)) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-surface hover:bg-surface-2 text-ink border border-border text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
