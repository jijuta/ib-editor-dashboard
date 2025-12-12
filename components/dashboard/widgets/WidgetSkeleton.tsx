'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WidgetSkeletonProps {
  title?: string;
  minHeight?: string;
  variant?: 'chart' | 'table' | 'kpi';
  className?: string;
}

/**
 * Loading skeleton for dashboard widgets
 * Matches glassmorphism theme from dashboard.css
 */
export function WidgetSkeleton({
  title,
  minHeight = '140px',
  variant = 'chart',
  className,
}: WidgetSkeletonProps) {
  return (
    <div
      className={cn('panel-card animate-pulse', className)}
      style={{ minHeight }}
    >
      {/* Title skeleton */}
      <div className="panel-title">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-[#4a9eff]/20" />
          {title ? (
            <span className="opacity-50">{title}</span>
          ) : (
            <div className="h-4 w-32 rounded bg-[#4a9eff]/20" />
          )}
        </div>
      </div>

      {/* Content skeleton based on variant */}
      {variant === 'chart' && <ChartSkeleton />}
      {variant === 'table' && <TableSkeleton />}
      {variant === 'kpi' && <KpiSkeleton />}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <>
      {/* Chart area */}
      <div className="chart-container" style={{ height: '80px', margin: '10px 0' }}>
        <div className="flex h-full items-end justify-around gap-1 px-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-t bg-[#4a9eff]/10"
              style={{
                height: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-dot bg-[#4a9eff]/20" />
          <div className="h-3 w-16 rounded bg-[#4a9eff]/20" />
        </div>
        <div className="legend-item">
          <div className="legend-dot bg-[#4a9eff]/20" />
          <div className="h-3 w-12 rounded bg-[#4a9eff]/20" />
        </div>
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-2 space-y-2">
      {/* Header row */}
      <div className="flex gap-4 border-b border-[rgba(74,158,255,0.2)] pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 rounded bg-[#4a9eff]/20"
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: 4 }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 py-1"
        >
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-3 flex-1 rounded bg-[#4a9eff]/10"
              style={{ animationDelay: `${(rowIdx * 4 + colIdx) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        {/* Icon skeleton */}
        <div className="h-10 w-10 rounded-full bg-[#4a9eff]/20" />

        {/* Value and title */}
        <div className="space-y-2">
          <div className="h-6 w-20 rounded bg-[#4a9eff]/20" />
          <div className="h-3 w-16 rounded bg-[#4a9eff]/10" />
        </div>
      </div>

      {/* Change indicator */}
      <div className="space-y-2 text-right">
        <div className="h-4 w-12 rounded bg-[#4a9eff]/20" />
        <div className="h-3 w-16 rounded bg-[#4a9eff]/10" />
      </div>
    </div>
  );
}

/**
 * Simple inline skeleton line
 */
export function SkeletonLine({
  width = '100%',
  height = '1rem',
  className,
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn('animate-pulse rounded bg-[#4a9eff]/20', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}
