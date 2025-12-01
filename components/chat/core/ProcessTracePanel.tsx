'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Database, Brain, Search, CheckCircle2, XCircle, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessTrace, ProcessTraceStep } from '@/lib/chat/types';

interface ProcessTracePanelProps {
  trace: ProcessTrace;
  className?: string;
}

// Step status icons
function StepStatusIcon({ status }: { status: ProcessTraceStep['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'skipped':
      return <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-yellow-500 animate-spin" />;
  }
}

// Step icon based on name
function StepIcon({ name }: { name: string }) {
  if (name.includes('임베딩') || name.includes('Embedding')) {
    return <Brain className="h-3.5 w-3.5" />;
  }
  if (name.includes('검색') || name.includes('Search')) {
    return <Search className="h-3.5 w-3.5" />;
  }
  return <Database className="h-3.5 w-3.5" />;
}

// Progress bar component
function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={cn('h-1.5 bg-muted rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-primary/70 rounded-full transition-all"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// Individual step display
function StepItem({ step, maxDuration }: { step: ProcessTraceStep; maxDuration: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = step.details && Object.keys(step.details).length > 0;

  return (
    <div className="border-l-2 border-muted pl-3 py-1.5">
      <div
        className={cn(
          'flex items-center gap-2 text-xs',
          hasDetails && 'cursor-pointer hover:bg-muted/50 -ml-3 pl-3 rounded'
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <StepStatusIcon status={step.status} />
        <StepIcon name={step.name} />
        <span className="flex-1 font-medium">{step.name}</span>
        {step.duration !== undefined && (
          <span className="text-muted-foreground tabular-nums">
            {step.duration}ms
          </span>
        )}
        {hasDetails && (
          expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
        )}
      </div>

      {/* Duration progress bar */}
      {step.duration !== undefined && step.status === 'success' && (
        <ProgressBar value={step.duration} max={maxDuration} className="mt-1 ml-5" />
      )}

      {/* Error message */}
      {step.error && (
        <div className="mt-1 ml-5 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded px-2 py-1">
          {step.error}
        </div>
      )}

      {/* Expanded details */}
      {expanded && step.details && (
        <div className="mt-2 ml-5 text-xs bg-muted/50 rounded p-2 space-y-1">
          {Object.entries(step.details).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-mono">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Source type badge
function SourceBadge({ type, count }: { type: string; count: number }) {
  const labels: Record<string, { label: string; color: string }> = {
    lightrag: { label: '지식베이스', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    incident: { label: '인시던트', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
    mitre: { label: 'MITRE', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
    threat_intel: { label: 'TI', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  };

  const { label, color } = labels[type] || { label: type, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {label} {count}
    </span>
  );
}

export function ProcessTracePanel({ trace, className }: ProcessTracePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const maxDuration = Math.max(...trace.steps.map((s) => s.duration || 0));

  return (
    <div className={cn('mt-2 text-xs border rounded-lg overflow-hidden', className)}>
      {/* Header - always visible */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">프로세스 추적</span>
        <span className="text-muted-foreground">
          {trace.totalDuration}ms
        </span>
        <span className="flex-1" />
        <span className="text-muted-foreground">{trace.model}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 space-y-4 border-t">
          {/* Summary stats */}
          <div className="flex flex-wrap gap-2">
            {trace.sources.map((source) => (
              <SourceBadge key={source.type} type={source.type} count={source.count} />
            ))}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
              {trace.tokens.context} tokens
            </span>
          </div>

          {/* Steps */}
          <div className="space-y-1">
            <h4 className="font-medium text-muted-foreground mb-2">처리 단계</h4>
            {trace.steps.map((step, index) => (
              <StepItem key={index} step={step} maxDuration={maxDuration} />
            ))}
          </div>

          {/* Sources detail */}
          {trace.sources.length > 0 && (
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">참조 소스</h4>
              <div className="space-y-2">
                {trace.sources.map((source) => (
                  <div key={source.type} className="bg-muted/30 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <SourceBadge type={source.type} count={source.count} />
                    </div>
                    <div className="space-y-0.5 ml-2">
                      {source.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-muted-foreground">
                          <span className="truncate flex-1">{item.title}</span>
                          <span className="tabular-nums text-xs">
                            {(item.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                      {source.items.length > 3 && (
                        <div className="text-muted-foreground/60">
                          +{source.items.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
