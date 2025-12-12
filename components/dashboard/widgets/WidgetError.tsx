'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WidgetErrorProps {
  title?: string;
  error: Error | null;
  onRetry?: () => void;
  minHeight?: string;
  className?: string;
}

/**
 * Error state for dashboard widgets
 * Matches glassmorphism theme from dashboard.css
 */
export function WidgetError({
  title,
  error,
  onRetry,
  minHeight = '140px',
  className,
}: WidgetErrorProps) {
  return (
    <div
      className={cn('panel-card', className)}
      style={{ minHeight }}
    >
      {title && (
        <div className="panel-title">
          <div className="flex items-center gap-2">
            <span className="text-[#ff6b9d]">⚠️</span>
            <span>{title}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,107,157,0.1)]">
          <svg
            className="h-6 w-6 text-[#ff6b9d]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-[#8892b0]">데이터를 불러올 수 없습니다</p>
          {error?.message && (
            <p className="max-w-[200px] truncate text-xs text-[#8892b0]/60">
              {error.message}
            </p>
          )}
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-2 rounded-lg border border-[rgba(74,158,255,0.3)] bg-[rgba(74,158,255,0.1)] px-4 py-2 text-sm text-[#00d4ff] transition-all hover:bg-[rgba(74,158,255,0.2)]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state for widgets with no data
 */
export function WidgetEmpty({
  title,
  message = '표시할 데이터가 없습니다',
  minHeight = '140px',
  className,
}: {
  title?: string;
  message?: string;
  minHeight?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('panel-card', className)}
      style={{ minHeight }}
    >
      {title && (
        <div className="panel-title">
          <div className="flex items-center gap-2">
            <span className="text-[#8892b0]">📊</span>
            <span>{title}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(136,146,176,0.1)]">
          <svg
            className="h-6 w-6 text-[#8892b0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-sm text-[#8892b0]">{message}</p>
      </div>
    </div>
  );
}
