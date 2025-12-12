'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useTimeSeries, formatNumber, formatChartTime } from '@/lib/dashboard';

interface AlertAreaChartProps {
  days?: number;
  interval?: string;
  className?: string;
  height?: number;
  stacked?: boolean;
}

export function AlertAreaChart({
  days = 7,
  interval = '1d',
  className,
  height = 250,
  stacked = true,
}: AlertAreaChartProps) {
  const { data, isLoading, error, refetch } = useTimeSeries({ days, interval, type: 'alerts' });

  if (isLoading) {
    return <WidgetSkeleton variant="chart" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="알럿 추세"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  // Transform data for Recharts
  const chartData = data?.labels.map((label, idx) => {
    const point: Record<string, any> = { name: formatChartTime(label) };
    data.datasets.forEach((dataset) => {
      point[dataset.label] = dataset.data[idx]?.value || 0;
    });
    return point;
  }) || [];

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">📊 알럿 추세 ({days}일)</div>
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {data?.datasets.map((dataset, idx) => (
              <linearGradient key={dataset.label} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={dataset.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={dataset.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
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
            formatter={(value: number, name: string) => [formatNumber(value), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#8892b0' }}
            iconType="rect"
          />
          {data?.datasets.map((dataset, idx) => (
            <Area
              key={dataset.label}
              type="monotone"
              dataKey={dataset.label}
              stackId={stacked ? '1' : undefined}
              stroke={dataset.color}
              fill={`url(#color${idx})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AlertAreaChart;
