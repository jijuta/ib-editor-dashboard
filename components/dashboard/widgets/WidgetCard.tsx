'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WidgetSkeleton } from './WidgetSkeleton';
import { WidgetError } from './WidgetError';

export interface WidgetCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

/**
 * Base widget card component with glassmorphism styling
 * Applies .panel-card CSS class from dashboard.css
 */
export function WidgetCard({
  title,
  icon,
  children,
  className,
  minHeight,
  isLoading = false,
  error = null,
  onRefresh,
  actions,
}: WidgetCardProps) {
  if (isLoading) {
    return <WidgetSkeleton title={title} minHeight={minHeight} />;
  }

  if (error) {
    return (
      <WidgetError
        title={title}
        error={error}
        onRetry={onRefresh}
        minHeight={minHeight}
      />
    );
  }

  return (
    <div
      className={cn('panel-card', className)}
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="panel-title flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="widget-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        {actions && <div className="widget-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/**
 * Chart container within WidgetCard
 */
export function ChartContainer({
  children,
  height = 80,
  className,
}: {
  children: React.ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('chart-container', className)}
      style={{ height: `${height}px`, margin: '10px 0' }}
    >
      {children}
    </div>
  );
}

/**
 * Chart legend component
 */
export interface LegendItem {
  color: string;
  label: string;
}

export function ChartLegend({
  items,
  className,
}: {
  items: LegendItem[];
  className?: string;
}) {
  return (
    <div className={cn('chart-legend', className)}>
      {items.map((item, index) => (
        <div key={index} className="legend-item">
          <div
            className="legend-dot"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
