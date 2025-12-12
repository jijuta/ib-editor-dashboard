// Dashboard Data Formatters

/**
 * Format number with locale-aware separators (Korean)
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format change percentage with sign
 */
export function formatChange(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

/**
 * Format date to Korean locale
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'long':
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    case 'time':
      return new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    case 'short':
    default:
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
      }).format(d);
  }
}

/**
 * Format timestamp for chart axis
 */
export function formatChartTime(timestamp: string, interval: 'hour' | 'day' | 'week' = 'day'): string {
  const d = new Date(timestamp);

  switch (interval) {
    case 'hour':
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    case 'week':
      return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    case 'day':
    default:
      return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  }
}

/**
 * Format month name in Korean
 */
export function formatMonth(monthNum: number): string {
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  return months[monthNum - 1] || `${monthNum}월`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}초`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}분`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

/**
 * Format file hash (truncate for display)
 */
export function formatHash(hash: string, length = 16): string {
  if (hash.length <= length) return hash;
  const half = Math.floor(length / 2) - 1;
  return `${hash.slice(0, half)}...${hash.slice(-half)}`;
}

/**
 * Format confidence score with color indicator
 */
export function formatConfidence(score: number): { text: string; color: string } {
  const text = `${score.toFixed(1)}%`;
  if (score >= 90) {
    return { text, color: '#00ff88' }; // green
  }
  if (score >= 70) {
    return { text, color: '#00d4ff' }; // cyan
  }
  if (score >= 50) {
    return { text, color: '#feca57' }; // yellow
  }
  return { text, color: '#ff6b9d' }; // pink
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
