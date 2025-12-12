'use client';

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useIoc, formatNumber, formatPercent } from '@/lib/dashboard';

interface IocDonutChartProps {
  days?: number;
  className?: string;
  height?: number;
}

const IOC_COLORS: Record<string, string> = {
  ip: '#00d4ff',
  domain: '#00ff88',
  hash: '#ff6b9d',
  url: '#ffd93d',
};

export function IocDonutChart({
  days = 7,
  className,
  height = 200,
}: IocDonutChartProps) {
  const { data, isLoading, error, refetch } = useIoc({ days });

  if (isLoading) {
    return <WidgetSkeleton variant="chart" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="IOC 분포"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const chartData = Object.entries(data?.byType || {})
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type.toUpperCase(),
      value: count,
      color: IOC_COLORS[type] || '#8892b0',
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">🔐 IOC 유형 분포</div>
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={50}
              innerRadius={30}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={0}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 25, 47, 0.95)',
                border: '1px solid rgba(74, 158, 255, 0.3)',
                borderRadius: '4px',
                color: '#ccd6f6',
                fontSize: '10px',
              }}
              formatter={(value: number, name: string) => [
                `${formatNumber(value)} (${formatPercent(value / total)})`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="chart-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
        {chartData.map((item) => (
          <div key={item.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65em' }}>
            <span className="legend-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }}></span>
            <span style={{ color: '#8892b0' }}>{item.name}: {formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IocDonutChart;
