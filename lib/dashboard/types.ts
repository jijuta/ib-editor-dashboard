// Dashboard Widget Type Definitions

// === Base Types ===
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Status = 'active' | 'pending' | 'resolved' | 'closed' | 'processing' | 'monitoring' | 'normal';
export type TrendDirection = 'up' | 'down' | 'neutral';

// === Trend & Change Indicators ===
export interface TrendIndicator {
  direction: TrendDirection;
  value: number;
  label?: string;
}

// === KPI / Statistics ===
export interface KpiData {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  icon: string; // FontAwesome class
  trend: TrendIndicator;
  status: 'normal' | 'warning' | 'critical';
  alert?: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  className?: string;
}

// === Chart Data Types ===
export interface TimeSeriesPoint {
  timestamp: string;
  date?: Date;
  value: number;
  category?: string;
}

export interface TimeSeriesDataset {
  label: string;
  data: TimeSeriesPoint[];
  color: string;
  strokeDasharray?: string;
}

export interface BarChartDataPoint {
  category: string;
  value: number;
  color?: string;
  fill?: string;
}

export interface GaugeDataPoint {
  label: string;
  value: number;
  max: number;
  color: string;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  color: string;
}

// === Table Data Types ===
export interface IncidentRow {
  id: string;
  severity: Severity;
  status: Status;
  title: string;
  assignee?: string;
  team?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// Extended incident row with full details (per info.js structure)
export interface IncidentDetailRow extends IncidentRow {
  alertCount: number;
  hostCount: number;
  userCount: number;
  mitreTechniques: { id: string; name: string }[];
  hosts: { hostname: string; endpointId: string }[];
  users: string[];
  alertSeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  resolveComment?: string;
  xdrUrl?: string;
  incidentSources: string[];
  alertCategories: string[];
}

export interface AlertRow {
  id: string;
  type: string;
  count: number;
  status: Status;
  action?: string;
  severity: Severity;
}

export interface RiskAnalysisRow {
  severity: Severity;
  category: string;
  count: number;
  status: Status;
}

export interface IocRow {
  type: 'ip' | 'domain' | 'url' | 'hash';
  value?: string;
  count: number;
  confidence: number;
  status: Status;
}

export interface HashRow {
  type: 'sha256' | 'md5' | 'sha1';
  value: string;
  severity: Severity;
}

export interface MonthlySecurityRow {
  month: string;
  threatDetection: number;
  blockSuccess: number;
  incidents: number;
  changeRate: number;
}

export interface QualityMetricRow {
  metric: string;
  current: number | string;
  target: number | string;
  variance: number | string;
  varianceType: 'positive' | 'negative' | 'neutral';
}

// === Widget Props Base ===
export interface BaseWidgetProps {
  title?: string;
  description?: string;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

export interface WidgetProps<T> extends BaseWidgetProps {
  data?: T;
}

// === API Response Types ===
export interface DashboardStatsResponse {
  threats: number;
  incidents: number;
  alerts: number;
  artifacts: number;
  mitreTechniques: number;
  endpoints: number;
  criticalCves: number;
  kpis: KpiData[];
}

export interface IncidentsResponse {
  items: IncidentRow[] | IncidentDetailRow[];
  total: number;
  active: number;
  pending: number;
  resolved: number;
  severityCounts?: Record<Severity, number>;
}

export interface AlertsResponse {
  items: AlertRow[];
  total: number;
  bySeverity: Record<Severity, number>;
}

export interface TimeSeriesResponse {
  datasets: TimeSeriesDataset[];
  labels: string[];
}

export interface MitreResponse {
  techniques: { name: string; count: number }[];
  tactics: { name: string; count: number }[];
  totalTechniques: number;
  mappedCves: number;
  activeCampaigns: number;
}

export interface IocResponse {
  items: IocRow[];
  total: number;
  byType: Record<string, number>;
}
