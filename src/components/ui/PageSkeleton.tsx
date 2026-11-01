import React from 'react';

/**
 * Placeholder shown while a page's code is loading. It mirrors the usual page
 * shape (toolbar, tabs, content cards) so the layout doesn't jump when the
 * real content arrives.
 */
export function PageSkeleton({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4 animate-fade-in">
      <span className="sr-only">{label}</span>
      <div className="skeleton h-14" />
      <div className="flex gap-2">
        <div className="skeleton h-9 w-32" />
        <div className="skeleton h-9 w-28" />
        <div className="skeleton h-9 w-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
      </div>
      <div className="skeleton h-32" />
    </div>
  );
}
