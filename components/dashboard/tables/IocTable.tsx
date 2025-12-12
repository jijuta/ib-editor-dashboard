'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useIoc, getStatusColor, formatNumber } from '@/lib/dashboard';
import type { IocRow } from '@/lib/dashboard/types';

interface IocTableProps {
  days?: number;
  limit?: number;
  className?: string;
}

const IOC_TYPE_ICONS: Record<string, string> = {
  ip: '🌐',
  domain: '🔗',
  url: '📎',
  hash: '🔒',
};

const IOC_TYPE_COLORS: Record<string, string> = {
  ip: '#00d4ff',
  domain: '#00ff88',
  url: '#ffd93d',
  hash: '#ff6b9d',
};

export function IocTable({
  days = 7,
  limit = 10,
  className,
}: IocTableProps) {
  const { data, isLoading, error, refetch } = useIoc({ days, limit });

  if (isLoading) {
    return <WidgetSkeleton variant="table" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="IOC 지표"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const items = data?.items || [];

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">🔍 IOC 지표</div>
      <table className="data-table">
        <thead>
          <tr>
            <th>유형</th>
            <th>값</th>
            <th>탐지</th>
            <th>신뢰도</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, limit).map((item, idx) => (
            <tr key={`${item.type}-${idx}`}>
              <td>
                <span style={{ color: IOC_TYPE_COLORS[item.type] || '#8892b0' }}>
                  {IOC_TYPE_ICONS[item.type] || '📋'} {item.type.toUpperCase()}
                </span>
              </td>
              <td title={item.value} style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.7em' }}>
                {item.value || '-'}
              </td>
              <td style={{ color: '#00d4ff' }}>{formatNumber(item.count)}</td>
              <td>
                <span style={{ color: item.confidence >= 70 ? '#00ff88' : item.confidence >= 40 ? '#ffd93d' : '#ff6b9d' }}>
                  {item.confidence}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IocTypeBadge({ type }: { type: string }) {
  const color = IOC_TYPE_COLORS[type] || '#8892b0';
  const icon = IOC_TYPE_ICONS[type] || '📋';

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icon} {type.toUpperCase()}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 80) return '#00ff88';
    if (confidence >= 60) return '#ffd93d';
    if (confidence >= 40) return '#ffb86b';
    return '#ff6b9d';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[rgba(74,158,255,0.1)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${confidence}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
      <span className="text-xs" style={{ color: getColor() }}>
        {confidence}%
      </span>
    </div>
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
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}

export default IocTable;
