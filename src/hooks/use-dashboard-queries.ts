import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DashboardWindow = "day" | "week" | "month";

/**
 * Stale-while-revalidate (SWR-like) caching via TanStack Query.
 * 
 * Defaults chosen to reduce DB/API load when navigating between pages:
 * - staleTime: data is considered fresh for 15s (no refetch on remount)
 * - gcTime: keep cached data for 5 minutes after last observer
 * - refetchOnWindowFocus: disabled (avoid surprise spikes)
 */
const DEFAULT_STALE_TIME_MS = 15_000;
const DEFAULT_GC_TIME_MS = 5 * 60_000;

export function useDashboardSummary(window: DashboardWindow) {
  return useQuery({
    queryKey: ["dashboard", "summary", window],
    queryFn: () => api.dashboard.summary(window),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardActivity(window: DashboardWindow) {
  return useQuery({
    queryKey: ["dashboard", "activity", window],
    queryFn: () => api.dashboard.activity(window),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardTopEvents(window: DashboardWindow, limit = 8) {
  return useQuery({
    queryKey: ["dashboard", "top-events", window, limit],
    queryFn: () => api.dashboard.topEvents(window, limit),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardAssistantsKpis(window: DashboardWindow = "week") {
  return useQuery({
    queryKey: ["dashboard", "assistants-kpis", window],
    queryFn: () => api.dashboard.assistantsKpis(window),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardCalls(window: DashboardWindow, limit = 200) {
  return useQuery({
    queryKey: ["dashboard", "calls", window, limit],
    queryFn: () => api.dashboard.calls(window, limit),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardRecentCalls(limit = 50) {
  return useQuery({
    queryKey: ["dashboard", "recent-calls", limit],
    queryFn: () => api.dashboard.recentCalls(limit),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardHeavyCharts(window: DashboardWindow, topEventsLimit = 8) {
  return useQuery({
    queryKey: ["dashboard", "heavy-charts", window, topEventsLimit],
    queryFn: () => api.dashboard.heavyCharts(window, topEventsLimit),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
