import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const CHUNK_RELOAD_KEY = 'hanu_chunk_reload_at';

/**
 * After a new deploy, a tab opened earlier still asks for the old JS chunks,
 * which no longer exist. React.lazy caches that failed import, so "retry"
 * can't fix it; only a full reload picks up the new build.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|ChunkLoadError|Cannot read properties of null \(reading 'use|Invalid hook call/i.test(
    message
  );
}

/** Reload the page once (per 30 s) to recover from a stale-deploy chunk error. */
export function reloadOnceForChunkError(): boolean {
  // Offline: a reload would only show the browser's offline page.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: still try one reload
  }
  window.location.reload();
  return true;
}

interface LazyErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
  compact?: boolean;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
}

export class LazyErrorBoundary extends Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  state: LazyErrorBoundaryState = {
    hasError: false,
    retryKey: 0,
  };

  static getDerivedStateFromError(): Partial<LazyErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnceForChunkError()) return;
    console.error('[LazyErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <button
            type="button"
            onClick={this.handleRetry}
            data-testid="lazy-error-retry-btn"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-surface hover:bg-surface-2 text-ink border border-border text-xs font-medium cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-ink-muted" />
            <span>Thử tải lại</span>
          </button>
        );
      }

      return (
        <div
          data-testid="lazy-error-boundary-fallback"
          role="alert"
          className="my-4 p-6 rounded-2xl bg-surface border border-border text-center space-y-3"
        >
          <p className="text-sm text-ink">
            {this.props.fallbackLabel || 'Không tải được phần này. Có thể do mạng chập chờn.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              data-testid="lazy-error-retry-btn"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử tải lại</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center h-9 px-4 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium cursor-pointer transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

/**
 * Last line of defence around the whole app: an unexpected render error shows
 * a readable page with a way out instead of a blank white screen.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnceForChunkError()) return;
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        data-testid="app-error-boundary-fallback"
        className="min-h-dvh grid place-items-center p-6 bg-canvas text-ink"
      >
        <div className="max-w-md text-center space-y-4">
          <span className="app-seal !w-12 !h-12 !text-xl" aria-hidden="true">
            汉
          </span>
          <h1 className="text-xl font-semibold">Trang gặp lỗi và đã dừng lại</h1>
          <p className="text-sm text-ink-muted">
            Dữ liệu học tập của bạn vẫn được lưu. Hãy tải lại trang; nếu lỗi lặp lại, quay về trang
            tổng quan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại trang
            </button>
            <a
              href="/"
              className="inline-flex items-center h-10 px-4 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium"
            >
              Về trang tổng quan
            </a>
          </div>
        </div>
      </div>
    );
  }
}
