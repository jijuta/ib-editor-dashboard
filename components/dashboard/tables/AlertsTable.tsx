'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WidgetCard, WidgetSkeleton, WidgetError } from '../widgets';
import { useAlerts, getSeverityColor, getStatusColor, formatNumber } from '@/lib/dashboard';
import type { AlertRow, Severity } from '@/lib/dashboard/types';

interface AlertsTableProps {
  days?: number;
  limit?: number;
  className?: string;
}

export function AlertsTable({
  days = 7,
  limit = 10,
  className,
}: AlertsTableProps) {
  const { data, isLoading, error, refetch } = useAlerts({ days, limit: 100 });

  if (isLoading) {
    return <WidgetSkeleton variant="table" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="알럿 현황"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const alerts = data?.items || [];

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">알럿 현황</div>
      <table className="data-table">
        <thead>
          <tr>
            <th>카테고리</th>
            <th>심각도</th>
            <th>건수</th>
            <th>상태</th>
            <th>조치</th>
          </tr>
        </thead>
        <tbody>
          {alerts.slice(0, limit).map((alert) => (
            <tr key={alert.id}>
              <td>{alert.type}</td>
              <td style={{ color: getSeverityColor(alert.severity) }}>{alert.severity.toUpperCase()}</td>
              <td style={{ color: '#00d4ff' }}>{formatNumber(alert.count)}</td>
              <td>
                <StatusIndicator status={alert.status} />
              </td>
              <td>{alert.action || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const color = getSeverityColor(severity);
  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}

export default AlertsTable;
