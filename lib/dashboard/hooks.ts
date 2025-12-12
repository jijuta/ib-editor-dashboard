'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type {
  DashboardStatsResponse,
  IncidentsResponse,
  AlertsResponse,
  TimeSeriesResponse,
  MitreResponse,
  IocResponse,
} from './types';

// === Query Keys ===
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  incidents: (params?: { days?: number; limit?: number }) =>
    [...dashboardKeys.all, 'incidents', params] as const,
  alerts: (params?: { days?: number; limit?: number }) =>
    [...dashboardKeys.all, 'alerts', params] as const,
  timeseries: (params?: { days?: number; interval?: string; type?: string }) =>
    [...dashboardKeys.all, 'timeseries', params] as const,
  mitre: (params?: { days?: number; limit?: number }) =>
    [...dashboardKeys.all, 'mitre', params] as const,
  ioc: (params?: { days?: number; limit?: number }) =>
    [...dashboardKeys.all, 'ioc', params] as const,
};

// === Fetch Functions ===
async function fetchWithError<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// === Dashboard Stats Hook ===
export function useDashboardStats(
  options?: Omit<UseQueryOptions<DashboardStatsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => fetchWithError<DashboardStatsResponse>('/api/dashboard/stats'),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...options,
  });
}

// === Incidents Hook ===
interface UseIncidentsParams {
  days?: number;
  limit?: number;
}

export function useIncidents(
  params?: UseIncidentsParams,
  options?: Omit<UseQueryOptions<IncidentsResponse>, 'queryKey' | 'queryFn'>
) {
  const { days = 7, limit = 50 } = params || {};

  return useQuery({
    queryKey: dashboardKeys.incidents(params),
    queryFn: () =>
      fetchWithError<IncidentsResponse>(`/api/dashboard/incidents?days=${days}&limit=${limit}`),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

// === Alerts Hook ===
interface UseAlertsParams {
  days?: number;
  limit?: number;
}

export function useAlerts(
  params?: UseAlertsParams,
  options?: Omit<UseQueryOptions<AlertsResponse>, 'queryKey' | 'queryFn'>
) {
  const { days = 7, limit = 100 } = params || {};

  return useQuery({
    queryKey: dashboardKeys.alerts(params),
    queryFn: () =>
      fetchWithError<AlertsResponse>(`/api/dashboard/alerts?days=${days}&limit=${limit}`),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

// === Time Series Hook ===
interface UseTimeSeriesParams {
  days?: number;
  interval?: string;
  type?: 'incidents' | 'alerts' | 'threats';
}

export function useTimeSeries(
  params?: UseTimeSeriesParams,
  options?: Omit<UseQueryOptions<TimeSeriesResponse>, 'queryKey' | 'queryFn'>
) {
  const { days = 7, interval = '1d', type = 'incidents' } = params || {};

  return useQuery({
    queryKey: dashboardKeys.timeseries(params),
    queryFn: () =>
      fetchWithError<TimeSeriesResponse>(
        `/api/dashboard/timeseries?days=${days}&interval=${interval}&type=${type}`
      ),
    staleTime: 60 * 1000, // 1 minute (less frequent for charts)
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// === MITRE Hook ===
interface UseMitreParams {
  days?: number;
  limit?: number;
}

export function useMitre(
  params?: UseMitreParams,
  options?: Omit<UseQueryOptions<MitreResponse>, 'queryKey' | 'queryFn'>
) {
  const { days = 30, limit = 15 } = params || {};

  return useQuery({
    queryKey: dashboardKeys.mitre(params),
    queryFn: () =>
      fetchWithError<MitreResponse>(`/api/dashboard/mitre?days=${days}&limit=${limit}`),
    staleTime: 5 * 60 * 1000, // 5 minutes (MITRE data changes less frequently)
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// === IOC Hook ===
interface UseIocParams {
  days?: number;
  limit?: number;
}

export function useIoc(
  params?: UseIocParams,
  options?: Omit<UseQueryOptions<IocResponse>, 'queryKey' | 'queryFn'>
) {
  const { days = 7, limit = 20 } = params || {};

  return useQuery({
    queryKey: dashboardKeys.ioc(params),
    queryFn: () =>
      fetchWithError<IocResponse>(`/api/dashboard/ioc?days=${days}&limit=${limit}`),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

// === Combined Dashboard Data Hook ===
export function useDashboardData(days: number = 7) {
  const stats = useDashboardStats();
  const incidents = useIncidents({ days, limit: 50 });
  const alerts = useAlerts({ days, limit: 100 });
  const timeseries = useTimeSeries({ days, interval: '1d', type: 'incidents' });
  const mitre = useMitre({ days: 30, limit: 15 });
  const ioc = useIoc({ days, limit: 20 });

  const isLoading =
    stats.isLoading ||
    incidents.isLoading ||
    alerts.isLoading ||
    timeseries.isLoading ||
    mitre.isLoading ||
    ioc.isLoading;

  const isError =
    stats.isError ||
    incidents.isError ||
    alerts.isError ||
    timeseries.isError ||
    mitre.isError ||
    ioc.isError;

  const refetchAll = () => {
    stats.refetch();
    incidents.refetch();
    alerts.refetch();
    timeseries.refetch();
    mitre.refetch();
    ioc.refetch();
  };

  return {
    stats,
    incidents,
    alerts,
    timeseries,
    mitre,
    ioc,
    isLoading,
    isError,
    refetchAll,
  };
}
