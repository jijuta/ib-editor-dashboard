'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useAlerts, formatNumber, formatPercent } from '@/lib/dashboard';
import { CHART_COLORS } from '@/lib/dashboard/colors';

interface ThreatPieChartProps {
  days?: number;
  className?: string;
  height?: number;
  showLegend?: boolean;
}

export function ThreatPieChart({
  days = 7,
  className,
  height = 250,
  showLegend = true,
}: ThreatPieChartProps) {
  const { data, isLoading, error, refetch } = useAlerts({ days, limit: 100 });

  if (isLoading) {
    return <WidgetSkeleton variant="chart" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="위협 유형"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  // Use alert categories as threat types
  const chartData = (data?.items || [])
    .slice(0, 6)
    .map((item, idx) => ({
      name: item.type,
      value: item.count,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">🎯 위협 유형 분포</div>
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={55}
              innerRadius={30}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={0}
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
      {showLegend && (
        <div className="chart-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
          {chartData.slice(0, 4).map((item) => (
            <div key={item.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65em' }}>
              <span className="legend-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }}></span>
              <span style={{ color: '#8892b0' }}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThreatPieChart;
