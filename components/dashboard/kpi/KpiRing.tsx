'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface KpiRingProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showValue?: boolean;
}

export function KpiRing({
  value,
  max = 100,
  label,
  sublabel,
  color = '#00d4ff',
  size = 'md',
  className,
  showValue = true,
}: KpiRingProps) {
  const percent = Math.min((value / max) * 100, 100);

  const sizeConfig = {
    sm: { outer: 60, stroke: 4, fontSize: 'text-sm', sublabelSize: 'text-[10px]' },
    md: { outer: 80, stroke: 6, fontSize: 'text-lg', sublabelSize: 'text-xs' },
    lg: { outer: 100, stroke: 8, fontSize: 'text-xl', sublabelSize: 'text-sm' },
  };

  const config = sizeConfig[size];
  const inner = config.outer - config.stroke * 2;
  const circumference = inner * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        <svg
          width={config.outer}
          height={config.outer}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={inner / 2}
            fill="transparent"
            stroke="rgba(74, 158, 255, 0.1)"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={inner / 2}
            fill="transparent"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>

        {/* Center value */}
        {showValue && (
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <span
              className={cn('font-bold font-mono', config.fontSize)}
              style={{ color }}
            >
              {typeof value === 'number' && value % 1 !== 0
                ? value.toFixed(1)
                : value}
              {max === 100 && '%'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 text-center">
        <div className="text-xs text-[#ccd6f6]">{label}</div>
        {sublabel && (
          <div className={cn('text-[#8892b0]', config.sublabelSize)}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}

export default KpiRing;
