'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useTimeSeries, formatNumber, formatChartTime } from '@/lib/dashboard';
import { CHART_COLORS } from '@/lib/dashboard/colors';

interface TrendLineChartProps {
  days?: number;
  interval?: string;
  type?: 'incidents' | 'alerts' | 'threats';
  className?: string;
  height?: number;
  showLegend?: boolean;
}

export function TrendLineChart({
  days = 7,
  interval = '1d',
  type = 'incidents',
  className,
  height = 250,
  showLegend = true,
}: TrendLineChartProps) {
  const { data, isLoading, error, refetch } = useTimeSeries({ days, interval, type });

  if (isLoading) {
    return <WidgetSkeleton variant="chart" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="추세 차트"
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

  const typeLabel = type === 'incidents' ? '인시던트' : type === 'alerts' ? '알럿' : '위협';

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">📈 {typeLabel} 추세 ({days}일)</div>
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 158, 255, 0.1)" />
            <XAxis
              dataKey="name"
              stroke="#8892b0"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
            />
            <YAxis
              stroke="#8892b0"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(74, 158, 255, 0.2)' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 25, 47, 0.95)',
                border: '1px solid rgba(74, 158, 255, 0.3)',
                borderRadius: '4px',
                color: '#ccd6f6',
                fontSize: '10px',
              }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            {data?.datasets.map((dataset, idx) => (
              <Line
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color || CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: dataset.color || CHART_COLORS[idx % CHART_COLORS.length] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendLineChart;
