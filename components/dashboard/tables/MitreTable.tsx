'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WidgetSkeleton, WidgetError } from '../widgets';
import { useMitre, formatNumber } from '@/lib/dashboard';

interface MitreTableProps {
  days?: number;
  limit?: number;
  className?: string;
  showTactics?: boolean;
}

export function MitreTable({
  days = 30,
  limit = 10,
  className,
  showTactics = true,
}: MitreTableProps) {
  const { data, isLoading, error, refetch } = useMitre({ days, limit });

  if (isLoading) {
    return <WidgetSkeleton variant="table" className={className} />;
  }

  if (error) {
    return (
      <WidgetError
        title="MITRE ATT&CK"
        error={error as Error}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const techniques = data?.techniques || [];
  const tactics = data?.tactics || [];
  const totalTechniques = data?.totalTechniques || 0;
  const maxCount = Math.max(...techniques.map((t) => t.count), 1);

  return (
    <div className={cn('panel-card', className)}>
      <div className="panel-title">MITRE ATT&CK 기법</div>

      {/* 상위 기법 테이블 */}
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>기법명</th>
            <th>탐지</th>
          </tr>
        </thead>
        <tbody>
          {techniques.slice(0, limit).map((tech, idx) => (
            <tr key={tech.name}>
              <td style={{ color: '#00d4ff' }}>{idx + 1}</td>
              <td title={tech.name} style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tech.name}
              </td>
              <td style={{ color: '#00d4ff' }}>{formatNumber(tech.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 전술 태그 */}
      {showTactics && tactics.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tactics.slice(0, 4).map((tactic) => (
            <span
              key={tactic.name}
              style={{
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.65em',
                background: 'rgba(255,107,157,0.15)',
                color: '#ff6b9d'
              }}
            >
              {tactic.name} ({tactic.count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default MitreTable;
