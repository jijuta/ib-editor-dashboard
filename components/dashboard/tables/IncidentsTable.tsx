'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WidgetCard, WidgetSkeleton, WidgetError } from '../widgets';
import { useIncidents, getSeverityColor, getStatusColor, getStatusEmoji, formatDate } from '@/lib/dashboard';
import type { IncidentDetailRow, Severity } from '@/lib/dashboard/types';

interface IncidentsTableProps {
  days?: number;
  limit?: number;
  className?: string;
  showMitre?: boolean;
}

export function IncidentsTable({
  days = 7,
  limit = 10,
  className,
  showMitre = true,
}: IncidentsTableProps) {
  const { data, isLoading, error, refetch } = useIncidents({ days, limit });

  if (isLoading) {
    return <WidgetSkeleton variant="table" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="최근 인시던트"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const incidents = (data?.items || []) as IncidentDetailRow[];

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">🚨 인시던트 처리 현황</div>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>심각도</th>
            <th>상태</th>
            <th>담당자</th>
          </tr>
        </thead>
        <tbody>
          {incidents.slice(0, limit).map((incident) => (
            <tr key={incident.id}>
              <td>{incident.id}</td>
              <td style={{ color: getSeverityColor(incident.severity) }}>{incident.severity}</td>
              <td>{getStatusEmoji(incident.status)} {incident.status}</td>
              <td>{incident.team || incident.assignee || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sub-components
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

function StatusBadge({ status }: { status: string }) {
  const emoji = getStatusEmoji(status);
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {emoji} {status}
    </span>
  );
}

function AlertCountBadge({
  alertSeverity,
  total,
}: {
  alertSeverity?: { critical: number; high: number; medium: number; low: number };
  total: number;
}) {
  if (!alertSeverity) {
    return <span className="text-[#8892b0]">{total}</span>;
  }

  return (
    <div className="flex gap-1 items-center">
      {alertSeverity.critical > 0 && (
        <span className="px-1 py-0.5 rounded text-[10px] bg-[rgba(255,107,157,0.2)] text-[#ff6b9d]">
          C:{alertSeverity.critical}
        </span>
      )}
      {alertSeverity.high > 0 && (
        <span className="px-1 py-0.5 rounded text-[10px] bg-[rgba(255,184,107,0.2)] text-[#ffb86b]">
          H:{alertSeverity.high}
        </span>
      )}
      {alertSeverity.medium > 0 && (
        <span className="px-1 py-0.5 rounded text-[10px] bg-[rgba(255,217,61,0.2)] text-[#ffd93d]">
          M:{alertSeverity.medium}
        </span>
      )}
      <span className="text-[#8892b0] text-xs ml-1">({total})</span>
    </div>
  );
}

function MitreBadges({ techniques }: { techniques?: { id: string; name: string }[] }) {
  if (!techniques || techniques.length === 0) {
    return <span className="text-[#8892b0]">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 max-w-[150px]">
      {techniques.slice(0, 2).map((tech) => (
        <span
          key={tech.id}
          className="px-1.5 py-0.5 rounded text-[10px] bg-[rgba(0,212,255,0.15)] text-[#00d4ff] font-mono"
          title={tech.name}
        >
          {tech.id}
        </span>
      ))}
      {techniques.length > 2 && (
        <span className="text-[10px] text-[#8892b0]">+{techniques.length - 2}</span>
      )}
    </div>
  );
}

export default IncidentsTable;
