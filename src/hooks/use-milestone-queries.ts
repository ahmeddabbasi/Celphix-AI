/**
 * React Query hooks for milestone events and optimized dashboard metrics
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";

// =====================================================
// TYPES
// =====================================================

export interface MilestoneEvent {
  id: number;
  timestamp: string;
  milestone_type: string;
  title: string;
  description: string;
  metric_name?: string;
  metric_value?: number;
  previous_record?: number;
  assistant_id?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface MilestonesResponse {
  milestones: MilestoneEvent[];
  count: number;
}

export interface ActivityTrend {
  date: string;
  call_count: number;
  unique_assistants: number;
  total_duration: number;
  avg_duration: number;
  max_duration: number;
}

export interface ActivityTrendsResponse {
  trends: ActivityTrend[];
  period_days: number;
  total_calls: number;
  avg_daily_calls: number;
}

export interface ActiveAssistantsResponse {
  active_count: number;
  active_names: string[];
  latest_call_start: string | null;
}

export interface SessionInfoResponse {
  last_login_at: string | null;
  current_session_duration_seconds: number;
  current_session_duration_minutes: number;
  total_sessions_today: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const milestoneKeys = {
  all: ["milestones"] as const,
  recent: (limit?: number, days?: number) =>
    [...milestoneKeys.all, "recent", { limit, days }] as const,
};

export const activityKeys = {
  all: ["activity"] as const,
  trends: (days?: number) => [...activityKeys.all, "trends", { days }] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  activeAssistants: () => [...dashboardKeys.all, "active-assistants"] as const,
  sessionInfo: () => [...dashboardKeys.all, "session-info"] as const,
};

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch recent milestone events (achievements/notifications)
 */
export function useMilestones(
  limit: number = 10,
  days: number = 30
): UseQueryResult<MilestonesResponse> {
  return useQuery({
    queryKey: milestoneKeys.recent(limit, days),
    queryFn: async () => {
      return await api.get<MilestonesResponse>(
        `/api/cc/milestones/recent?limit=${limit}&days=${days}`
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true, // Refetch when user comes back
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Fetch activity trends for line graph visualization
 */
export function useActivityTrends(
  days: number = 30
): UseQueryResult<ActivityTrendsResponse> {
  return useQuery({
    queryKey: activityKeys.trends(days),
    queryFn: async () => {
      return await api.get<ActivityTrendsResponse>(
        `/api/cc/activity/trends?days=${days}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes (trends don't change frequently)
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 10, // Auto-refetch every 10 minutes
  });
}

/**
 * Fetch real-time count of active assistants on calls
 */
export function useActiveAssistants(): UseQueryResult<ActiveAssistantsResponse> {
  return useQuery({
    queryKey: dashboardKeys.activeAssistants(),
    queryFn: async () => {
      return await api.get<ActiveAssistantsResponse>(
        "/api/cc/dashboard/active-assistants"
      );
    },
    staleTime: 1000 * 30, // 30 seconds (real-time data)
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60, // Auto-refetch every minute for real-time feel
  });
}

/**
 * Fetch current user's session information.
 * Refetch only on window focus — the SessionInfo component ticks client-side,
 * so frequent server refetches are unnecessary and would reset the counter.
 */
export function useSessionInfo(): UseQueryResult<SessionInfoResponse> {
  return useQuery({
    queryKey: dashboardKeys.sessionInfo(),
    queryFn: async () => {
      return await api.get<SessionInfoResponse>(
        "/api/cc/dashboard/session-info"
      );
    },
    staleTime: 5 * 60 * 1000,   // treat as fresh for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,  // resync when user tabs back in
    refetchInterval: false,      // no polling — client ticker is the clock
  });
}
