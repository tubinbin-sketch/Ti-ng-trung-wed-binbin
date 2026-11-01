import React, { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#0F382E] border border-[#9B8A3E]/50 text-xs font-bold cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#9B8A3E]" />
            <span>Thử tải lại</span>
          </button>
        );
      }

      return (
        <div
          data-testid="lazy-error-boundary-fallback"
          className="my-4 p-4 rounded-2xl bg-[#FAF7F0] border border-[#9B8A3E]/45 text-center space-y-2.5 shadow-2xs"
        >
          <p className="text-xs sm:text-sm font-semibold text-[#0F382E]">
            {this.props.fallbackLabel || 'Không thể tải phân hệ do kết nối mạng tạm gián đoạn.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            data-testid="lazy-error-retry-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F5243] hover:bg-[#166E5B] text-[#FAF7F0] text-xs sm:text-sm font-bold cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C5B358]" />
            <span>Thử tải lại</span>
          </button>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
