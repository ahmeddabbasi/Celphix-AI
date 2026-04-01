/**
 * Hook: useUserProfile
 *
 * Fetches and caches the current authenticated user's profile (including
 * command_center_access and cc_request_status). Used across both interfaces
 * to conditionally show/hide the interface-switching button.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/notifications";

export const USER_PROFILE_KEY = ["user-profile"] as const;

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: USER_PROFILE_KEY,
    queryFn: () => api.get<UserProfile>("/api/auth/me"),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
