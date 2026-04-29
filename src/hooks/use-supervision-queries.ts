import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ActiveSupervisionCall {
  call_id: string;
  audio_listeners: number;
  owner_username?: string | null;
  assistant_id?: number | null;
  call_in_progress?: boolean;
  call_started_at?: string | null;
}

export interface ActiveSupervisionCallsResponse {
  calls: ActiveSupervisionCall[];
}

export const ACTIVE_SUPERVISION_CALLS_KEY = ["admin", "active-supervision-calls"] as const;

export function useActiveSupervisionCalls(enabled: boolean) {
  return useQuery<ActiveSupervisionCallsResponse>({
    queryKey: ACTIVE_SUPERVISION_CALLS_KEY,
    queryFn: () => api.get<ActiveSupervisionCallsResponse>("/api/admin/active-supervision-calls"),
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? 2000 : false,
    refetchOnWindowFocus: false,
  });
}
