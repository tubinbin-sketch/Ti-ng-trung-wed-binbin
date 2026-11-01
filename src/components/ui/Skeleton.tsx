import React from 'react';

export interface SkeletonProps {
  className?: string;
  lines?: number;
  label?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-6 w-full',
  lines = 1,
  label = 'Đang tải dữ liệu...',
}) => {
  if (lines <= 1) {
    return (
      <div
        role="status"
        aria-label={label}
        data-testid="loading-skeleton"
        className={`animate-pulse rounded-xl bg-primary/10 border border-border/50 ${className}`}
      />
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      data-testid="loading-skeleton-group"
      className="space-y-2.5 w-full"
    >
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse rounded-xl bg-primary/10 border border-border/40 ${
            idx === lines - 1 ? 'w-3/4' : 'w-full'
          } ${className}`}
        />
      ))}
    </div>
  );
};
