'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useAlerts, getSeverityColor, formatNumber } from '@/lib/dashboard';
import type { Severity } from '@/lib/dashboard/types';

interface SeverityBarChartProps {
  days?: number;
  className?: string;
  height?: number;
  horizontal?: boolean;
}

export function SeverityBarChart({
  days = 7,
  className,
  height = 200,
  horizontal = true,
}: SeverityBarChartProps) {
  const { data, isLoading, error, refetch } = useAlerts({ days });

  if (isLoading) {
    return <WidgetSkeleton variant="chart" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="심각도 분포"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

  const chartData = severities.map((sev) => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: data?.bySeverity?.[sev] || 0,
    severity: sev,
    color: getSeverityColor(sev),
  }));

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">📊 심각도별 분포</div>
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={height}>
        {horizontal ? (
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 158, 255, 0.1)" horizontal={false} />
            <XAxis
              type="number"
              stroke="#8892b0"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#8892b0"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 25, 47, 0.95)',
                border: '1px solid rgba(74, 158, 255, 0.3)',
                borderRadius: '8px',
                color: '#ccd6f6',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatNumber(value), '건수']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 158, 255, 0.1)" />
            <XAxis
              dataKey="name"
              stroke="#8892b0"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
            />
            <YAxis
              stroke="#8892b0"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 25, 47, 0.95)',
                border: '1px solid rgba(74, 158, 255, 0.3)',
                borderRadius: '8px',
                color: '#ccd6f6',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatNumber(value), '건수']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SeverityBarChart;
