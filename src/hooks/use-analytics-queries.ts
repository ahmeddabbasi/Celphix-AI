import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Date range ────────────────────────────────────────────────────────────────
export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

// ── Call-volume types ─────────────────────────────────────────────────────────
export interface AssistantSeries {
  assistant_id: number;
  assistant_name: string;
  /** keys = ISO date strings, values = call count */
  data: Record<string, number>;
}

export interface CallVolumeResponse {
  dates: string[];       // sorted ISO date bucket strings
  series: AssistantSeries[];
  total_calls: number;
  date_range: { start: string; end: string };
  granularity: string;
}

// ── Sentiment/interest types ──────────────────────────────────────────────────
export interface InterestDataPoint {
  label: string;         // raw interest value from DB
  count: number;
  percentage: number;
}

export interface SentimentResponse {
  data: InterestDataPoint[];
  total: number;
  date_range: { start: string; end: string };
}

// ── Leaderboard types ─────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  assistant_id: number;
  assistant_name: string;
  total_calls: number;
  interested_count: number;
  conversion_rate: number;
  score: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total_assistants: number;
  top_performer: LeaderboardEntry | null;
  date_range: { start: string; end: string };
}

// ── Query keys ────────────────────────────────────────────────────────────────
export const analyticsKeys = {
  all: ["analytics"] as const,
  callVolume: (dr: DateRange, g: string) =>
    ["analytics", "call-volume", dr, g] as const,
  sentiment: (dr: DateRange) =>
    ["analytics", "sentiment", dr] as const,
  leaderboard: (dr: DateRange) =>
    ["analytics", "leaderboard", dr] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useCallVolumeAnalytics(
  dateRange: DateRange,
  granularity: "hour" | "day" | "week" | "month" = "day"
) {
  return useQuery({
    queryKey: analyticsKeys.callVolume(dateRange, granularity),
    queryFn: async (): Promise<CallVolumeResponse> => {
      const p = new URLSearchParams({ granularity });
      if (dateRange.startDate) p.append("start_date", dateRange.startDate);
      if (dateRange.endDate) p.append("end_date", dateRange.endDate);
      return api.get<CallVolumeResponse>(`/analytics/call-volume?${p}`);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSentimentDistribution(dateRange: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.sentiment(dateRange),
    queryFn: async (): Promise<SentimentResponse> => {
      const p = new URLSearchParams();
      if (dateRange.startDate) p.append("start_date", dateRange.startDate);
      if (dateRange.endDate) p.append("end_date", dateRange.endDate);
      return api.get<SentimentResponse>(`/analytics/sentiment?${p}`);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLeaderboard(dateRange: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.leaderboard(dateRange),
    queryFn: async (): Promise<LeaderboardResponse> => {
      const p = new URLSearchParams();
      if (dateRange.startDate) p.append("start_date", dateRange.startDate);
      if (dateRange.endDate) p.append("end_date", dateRange.endDate);
      return api.get<LeaderboardResponse>(`/analytics/leaderboard?${p}`);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
