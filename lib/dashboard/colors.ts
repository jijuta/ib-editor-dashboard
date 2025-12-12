// Dashboard Color Scheme - matches dashboard.css glassmorphism theme
import type { Severity, Status, TrendDirection } from './types';

// === Primary Colors ===
export const COLORS = {
  // Primary accent colors
  cyan: '#00d4ff',
  blue: '#4a9eff',
  yellow: '#feca57',
  pink: '#ff6b9d',
  green: '#00ff88',

  // Backgrounds
  darkBase: 'rgba(20, 25, 45, 0.6)',
  gridHeader: 'rgba(21, 27, 61, 0.8)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#8892b0',
  textMuted: '#8892b0',

  // Borders
  borderPrimary: 'rgba(74, 158, 255, 0.3)',
  borderSecondary: 'rgba(74, 158, 255, 0.2)',
} as const;

// === Severity Colors ===
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff6b9d',
  high: '#ff6b9d',
  medium: '#feca57',
  low: '#00d4ff',
  info: '#4a9eff',
};

export const SEVERITY_BG_COLORS: Record<Severity, string> = {
  critical: 'rgba(255, 107, 157, 0.2)',
  high: 'rgba(255, 107, 157, 0.2)',
  medium: 'rgba(254, 202, 87, 0.2)',
  low: 'rgba(0, 212, 255, 0.2)',
  info: 'rgba(74, 158, 255, 0.2)',
};

// === Status Colors ===
export const STATUS_COLORS: Record<Status, string> = {
  active: '#ff6b9d',
  processing: '#ff6b9d',
  pending: '#feca57',
  monitoring: '#feca57',
  resolved: '#00ff88',
  closed: '#00ff88',
  normal: '#00ff88',
};

export const STATUS_EMOJI: Record<string, string> = {
  active: '🔴',
  processing: '🔴',
  pending: '🟡',
  monitoring: '🟡',
  resolved: '🟢',
  closed: '🟢',
  normal: '🟢',
};

// === Trend Colors ===
export const TREND_COLORS: Record<TrendDirection, string> = {
  up: '#00ff88',
  down: '#ff6b9d',
  neutral: '#8892b0',
};

// === Chart Color Palette ===
export const CHART_COLORS = [
  '#00d4ff', // cyan
  '#ff6b9d', // pink
  '#feca57', // yellow
  '#00ff88', // green
  '#4a9eff', // blue
  '#a855f7', // purple
  '#f97316', // orange
  '#14b8a6', // teal
];

// === Utility Functions ===
export function getSeverityColor(severity: string): string {
  const key = severity.toLowerCase() as Severity;
  return SEVERITY_COLORS[key] || COLORS.textSecondary;
}

export function getStatusColor(status: string): string {
  const key = status.toLowerCase() as Status;
  return STATUS_COLORS[key] || COLORS.textSecondary;
}

export function getStatusEmoji(status: string): string {
  const key = status.toLowerCase();
  return STATUS_EMOJI[key] || '⚪';
}

export function getTrendColor(direction: TrendDirection): string {
  return TREND_COLORS[direction];
}

export function getTrendIcon(direction: TrendDirection): string {
  switch (direction) {
    case 'up':
      return 'fas fa-arrow-up';
    case 'down':
      return 'fas fa-arrow-down';
    default:
      return 'fas fa-minus';
  }
}

// === Recharts Chart Config Helper ===
export function createChartConfig(keys: string[]): Record<string, { label: string; color: string }> {
  const config: Record<string, { label: string; color: string }> = {};

  keys.forEach((key, index) => {
    config[key] = {
      label: key,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return config;
}

// === Korean Label Mappings ===
export const SEVERITY_LABELS_KO: Record<Severity, string> = {
  critical: '심각',
  high: '높음',
  medium: '보통',
  low: '낮음',
  info: '정보',
};

export const STATUS_LABELS_KO: Record<string, string> = {
  active: '활성',
  processing: '처리중',
  pending: '대기중',
  monitoring: '모니터링',
  resolved: '완료',
  closed: '종료',
  normal: '정상',
};

export function getSeverityLabel(severity: string, korean = true): string {
  const key = severity.toLowerCase() as Severity;
  if (korean && SEVERITY_LABELS_KO[key]) {
    return SEVERITY_LABELS_KO[key];
  }
  return severity;
}

export function getStatusLabel(status: string, korean = true): string {
  const key = status.toLowerCase();
  if (korean && STATUS_LABELS_KO[key]) {
    return STATUS_LABELS_KO[key];
  }
  return status;
}
