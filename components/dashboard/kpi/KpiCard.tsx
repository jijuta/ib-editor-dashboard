'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { KpiData, TrendIndicator } from '@/lib/dashboard/types';

interface KpiCardProps {
  data: KpiData;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function KpiCard({ data, className, size = 'md' }: KpiCardProps) {
  const { title, formattedValue, icon, trend, status, alert } = data;

  const statusColors = {
    normal: { bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)', text: '#00ff88' },
    warning: { bg: 'rgba(255, 217, 61, 0.1)', border: 'rgba(255, 217, 61, 0.3)', text: '#ffd93d' },
    critical: { bg: 'rgba(255, 107, 157, 0.1)', border: 'rgba(255, 107, 157, 0.3)', text: '#ff6b9d' },
  };

  const colors = statusColors[status] || statusColors.normal;

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={cn(
        'kpi-card rounded-xl border transition-all hover:scale-[1.02]',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-lg" style={{ color: colors.text }}>
              <i className={icon}></i>
            </span>
          )}
          <span className="text-xs text-[#8892b0] uppercase tracking-wider">{title}</span>
        </div>
        <TrendBadge trend={trend} />
      </div>

      <div className="flex items-end justify-between">
        <span
          className={cn(
            'font-bold font-mono',
            size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
          )}
          style={{ color: colors.text }}
        >
          {formattedValue}
        </span>

        {alert && (
          <span className="text-xs text-[#8892b0] opacity-70">{alert}</span>
        )}
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: TrendIndicator }) {
  const { direction, value } = trend;

  const colors = {
    up: direction === 'up' && value > 0 ? '#00ff88' : '#ff6b9d',
    down: direction === 'down' && value > 0 ? '#00ff88' : '#ff6b9d',
    neutral: '#8892b0',
  };

  // For security metrics: down is usually good (less threats)
  // The color logic depends on context, keeping it simple here
  const color = colors[direction];
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  return (
    <span
      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `${color}15`,
      }}
    >
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default KpiCard;
