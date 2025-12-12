'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { KpiCard } from './KpiCard';
import { KpiRing } from './KpiRing';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useDashboardStats, formatNumber } from '@/lib/dashboard';
import type { KpiData } from '@/lib/dashboard/types';

interface HeaderStatsProps {
  className?: string;
  layout?: 'grid' | 'row';
}

export function HeaderStats({ className, layout = 'grid' }: HeaderStatsProps) {
  const { data, isLoading, error, refetch } = useDashboardStats();

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-4 gap-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <WidgetSkeleton key={i} variant="kpi" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <WidgetError
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const kpis = data?.kpis || [];

  // Split into two rows
  const topKpis = kpis.slice(0, 4);
  const bottomKpis = kpis.slice(4, 8);

  if (layout === 'row') {
    return (
      <div className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} data={kpi} className="min-w-[180px] flex-shrink-0" size="sm" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topKpis.map((kpi) => (
          <KpiCard key={kpi.id} data={kpi} />
        ))}
      </div>

      {/* Bottom row */}
      {bottomKpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bottomKpis.map((kpi) => (
            <KpiCard key={kpi.id} data={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}

// Compact stats bar for header
export function StatsBar({ className }: { className?: string }) {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className={cn('flex gap-6', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-16 bg-[rgba(74,158,255,0.1)] rounded mb-1" />
            <div className="h-6 w-12 bg-[rgba(74,158,255,0.1)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    { label: '위협', value: data?.threats || 0, color: '#ff6b9d' },
    { label: '인시던트', value: data?.incidents || 0, color: '#ffb86b' },
    { label: '알럿', value: data?.alerts || 0, color: '#ffd93d' },
    { label: '엔드포인트', value: data?.endpoints || 0, color: '#00ff88' },
  ];

  return (
    <div className={cn('flex gap-6', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="text-xs text-[#8892b0]">{stat.label}</div>
          <div className="text-lg font-bold font-mono" style={{ color: stat.color }}>
            {formatNumber(stat.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Ring indicators for percentages
export function PercentageRings({ className }: { className?: string }) {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className={cn('flex gap-6 justify-center', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="w-20 h-20 rounded-full bg-[rgba(74,158,255,0.1)]" />
          </div>
        ))}
      </div>
    );
  }

  // Find percentage-based KPIs
  const percentKpis = (data?.kpis || []).filter(
    (kpi) => kpi.formattedValue.includes('%')
  );

  if (percentKpis.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex gap-6 justify-center', className)}>
      {percentKpis.slice(0, 3).map((kpi) => (
        <KpiRing
          key={kpi.id}
          value={kpi.value}
          max={100}
          label={kpi.title}
          color={
            kpi.status === 'critical'
              ? '#ff6b9d'
              : kpi.status === 'warning'
                ? '#ffd93d'
                : '#00ff88'
          }
        />
      ))}
    </div>
  );
}

export default HeaderStats;
