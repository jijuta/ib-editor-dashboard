'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DashboardQueryProvider } from './QueryProvider';

// KPI Components
import { HeaderStats, StatsBar, PercentageRings } from './kpi';

// Table Components
import { IncidentsTable, AlertsTable, IocTable, MitreTable } from './tables';

// Chart Components
import { TrendLineChart, SeverityBarChart, ThreatPieChart, AlertAreaChart, IocDonutChart } from './charts';

// Import dashboard styles
import './dashboard.css';

interface SecurityDashboardProps {
  className?: string;
  days?: number;
}

function DashboardContent({ className, days = 7 }: SecurityDashboardProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn('security-dashboard-v2 min-h-screen bg-[#0a0e27] p-6', className)}>
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#00d4ff]">DeFender X</h1>
          <span className="text-xs text-[#8892b0] px-2 py-1 rounded bg-[rgba(74,158,255,0.1)]">
            Security Dashboard v2
          </span>
        </div>
        <div className="flex items-center gap-4">
          <StatsBar />
          <div className="text-right">
            <div className="text-xs text-[#8892b0]">실시간 모니터링</div>
            <div className="text-sm font-mono text-[#00d4ff]">
              {currentTime.toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </div>
      </header>

      {/* KPI Header Section */}
      <section className="mb-6">
        <HeaderStats />
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Trend Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrendLineChart days={days} type="incidents" height={220} />
            <AlertAreaChart days={days} height={220} />
          </div>

          {/* Incidents Table - Main */}
          <IncidentsTable days={days} limit={8} showMitre={true} />

          {/* Alerts and MITRE Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AlertsTable days={days} limit={6} />
            <MitreTable days={30} limit={8} />
          </div>
        </div>

        {/* Right Column - 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Percentage Rings */}
          <div className="panel-card p-4">
            <h3 className="text-sm text-[#8892b0] mb-4 uppercase tracking-wider">주요 지표</h3>
            <PercentageRings />
          </div>

          {/* Severity Distribution */}
          <SeverityBarChart days={days} height={180} horizontal={true} />

          {/* Threat Type Pie */}
          <ThreatPieChart days={days} height={220} showLegend={false} />

          {/* IOC Distribution */}
          <IocDonutChart days={days} height={180} />

          {/* IOC Table */}
          <IocTable days={days} limit={6} />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 panel-card p-4 flex items-center justify-between">
        <div className="text-xs text-[#8892b0]">
          마지막 업데이트: {currentTime.toLocaleString('ko-KR')}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            OpenSearch 연결됨
          </span>
          <span className="text-[#8892b0]">자동 갱신: 60초</span>
        </div>
      </footer>
    </div>
  );
}

// Main export with QueryProvider wrapper
export function SecurityDashboardV2(props: SecurityDashboardProps) {
  return (
    <DashboardQueryProvider>
      <DashboardContent {...props} />
    </DashboardQueryProvider>
  );
}

// Compact dashboard for smaller views
export function CompactDashboard({ className, days = 7 }: SecurityDashboardProps) {
  return (
    <DashboardQueryProvider>
      <div className={cn('compact-dashboard space-y-4 p-4 bg-[#0a0e27]', className)}>
        <StatsBar className="justify-center" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendLineChart days={days} type="incidents" height={180} showLegend={false} />
          <SeverityBarChart days={days} height={180} />
        </div>

        <IncidentsTable days={days} limit={5} showMitre={false} />
      </div>
    </DashboardQueryProvider>
  );
}

export default SecurityDashboardV2;
