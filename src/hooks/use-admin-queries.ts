import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Admin Panel React Query Hooks with Optimized Caching
 * 
 * Performance Strategy:
 * - Stale-While-Revalidate (SWR): Show cached data instantly, refetch in background
 * - Aggressive caching: 30s stale time (admin data changes infrequently)
 * - Optimistic updates: UI responds immediately before server confirmation
 * - Prefetching: Load data before user navigates
 * 
 * Target: <200ms perceived latency
 */

// ============================================================================
// Cache Configuration
// ============================================================================

const ADMIN_CACHE_CONFIG = {
  // God View updates infrequently, cache for 30s
  godView: {
    staleTime: 30_000,  // 30s
    gcTime: 5 * 60_000, // 5min
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // Auto-refresh every 60s
  },
  
  // Activity stream needs fresher data
  activityStream: {
    staleTime: 10_000,  // 10s
    gcTime: 2 * 60_000, // 2min
    refetchOnWindowFocus: false,
    refetchInterval: 15_000, // Auto-refresh every 15s
  },
  
  // User quota is critical, minimal cache
  userQuota: {
    staleTime: 5_000,   // 5s
    gcTime: 1 * 60_000, // 1min
    refetchOnWindowFocus: true,
  },
};

// ============================================================================
// Types
// ============================================================================

interface UserWithStats {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_admin: boolean;
  max_assistants: number;
  max_concurrent_sessions: number;
  created_at: string;
  command_center_access: boolean;
  cc_request_status: "pending" | "approved" | "rejected" | "revoked" | null;
  assistant_count: number;
  assistant_limit: number;
  active_calls: number;
  total_call_duration: number;
  last_login: string | null;
}

interface ActivityEvent {
  id: number;
  timestamp: string;
  user_id: number;
  username: string;
  display_name: string;
  event_type: string;
  description: string;
  severity: "info" | "warning" | "error";
  metadata: any;
}

interface ActivityStreamResponse {
  events: ActivityEvent[];
  total: number;
  has_more: boolean;
  offset: number;
  limit: number;
}

interface CreateUserRequest {
  username: string;
  password: string;
  display_name: string;
  role?: string;
  is_admin?: boolean;
  max_assistants?: number;
  max_concurrent_sessions?: number;
}

interface UpdateQuotaRequest {
  max_assistants: number;
  max_concurrent_sessions?: number;
}

interface AddCredentialRequest {
  user_id: number;
  provider: "openai" | "deepgram";
  api_key: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all users with stats (God View)
 * Uses: SWR with 30s stale time, auto-refreshes every 60s
 * Performance: <50ms with covering indexes
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const data = await api.get<{ users: UserWithStats[] }>("/api/admin/users");
      return data.users;
    },
    ...ADMIN_CACHE_CONFIG.godView,
  });
}

/**
 * Fetch global activity stream with pagination
 * Uses: Infinite query for "Load More" pattern
 * Performance: <20ms with covering index
 */
export function useAdminActivityStream(params?: {
  limit?: number;
  severity?: "info" | "warning" | "error";
}) {
  const limit = params?.limit || 50;
  
  return useInfiniteQuery({
    queryKey: ["admin", "activity", params],
    queryFn: async ({ pageParam = 0 }) => {
      const queryString = new URLSearchParams({
        limit: limit.toString(),
        offset: pageParam.toString(),
        ...(params?.severity && { severity: params.severity }),
      }).toString();
      
      const data = await api.get<ActivityStreamResponse>(`/api/admin/activity?${queryString}`);
      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.offset + lastPage.limit : undefined;
    },
    initialPageParam: 0,
    ...ADMIN_CACHE_CONFIG.activityStream,
  });
}

/**
 * Fetch single activity stream page (non-infinite)
 * Use case: Dashboard widget showing recent 10 events
 */
export function useAdminActivityStreamSimple(params?: {
  limit?: number;
  offset?: number;
  severity?: "info" | "warning" | "error";
}) {
  return useQuery({
    queryKey: ["admin", "activity-simple", params],
    queryFn: async () => {
      const queryString = new URLSearchParams({
        limit: (params?.limit || 50).toString(),
        offset: (params?.offset || 0).toString(),
        ...(params?.severity && { severity: params.severity }),
      }).toString();
      
      const data = await api.get<ActivityStreamResponse>(`/api/admin/activity?${queryString}`);
      return data;
    },
    ...ADMIN_CACHE_CONFIG.activityStream,
  });
}

/**
 * Check user quota status
 * Performance: <10ms (simple indexed query)
 */
export function useUserQuota(userId: number) {
  return useQuery({
    queryKey: ["admin", "quota", userId],
    queryFn: async () => {
      const data = await api.get<{
        user_id: number;
        username: string;
        current_count: number;
        max_assistants: number;
        at_limit: boolean;
      }>(`/api/users/${userId}/quota`);
      return data;
    },
    ...ADMIN_CACHE_CONFIG.userQuota,
    enabled: userId > 0,
  });
}

// ============================================================================
// Mutation Hooks (with Optimistic Updates)
// ============================================================================

/**
 * Create new user
 * Optimistic: Immediately add to UI, rollback on error
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateUserRequest) => {
      const data = await api.post<{ user_id: number; username: string }>("/api/admin/users", request);
      return data;
    },
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });
      
      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<UserWithStats[]>(["admin", "users"]);
      
      // Optimistically update UI
      queryClient.setQueryData<UserWithStats[]>(["admin", "users"], (old) => {
        if (!old) return old;
        
        const optimisticUser: UserWithStats = {
          id: Date.now(), // Temporary ID
          username: newUser.username,
          display_name: newUser.display_name,
          role: newUser.role || "agent",
          is_admin: newUser.is_admin || false,
          max_assistants: newUser.max_assistants || 10,
          max_concurrent_sessions: newUser.max_concurrent_sessions || 10,
          created_at: new Date().toISOString(),
          command_center_access: false,
          cc_request_status: null,
          assistant_count: 0,
          assistant_limit: newUser.max_assistants || 10,
          active_calls: 0,
          total_call_duration: 0,
          last_login: null,
        };
        
        return [optimisticUser, ...old];
      });
      
      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      // Rollback on error
      queryClient.setQueryData(["admin", "users"], context?.previousUsers);
    },
    onSettled: () => {
      // Refetch to get accurate data
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Update user quota
 * Optimistic: Immediately update UI
 */
export function useUpdateUserQuota() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, maxAssistants, maxConcurrentSessions }: { userId: number; maxAssistants: number; maxConcurrentSessions?: number }) => {
      const data = await api.put<{
        user_id: number;
        username: string;
        max_assistants: number;
        max_concurrent_sessions: number;
      }>(`/api/admin/users/${userId}/quota`, {
        max_assistants: maxAssistants,
        ...(maxConcurrentSessions !== undefined && { max_concurrent_sessions: maxConcurrentSessions }),
      });
      return data;
    },
    onMutate: async ({ userId, maxAssistants, maxConcurrentSessions }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });
      
      const previousUsers = queryClient.getQueryData<UserWithStats[]>(["admin", "users"]);
      
      // Optimistically update quota
      queryClient.setQueryData<UserWithStats[]>(["admin", "users"], (old) => {
        if (!old) return old;
        
        return old.map((user) =>
          user.id === userId
            ? {
                ...user,
                max_assistants: maxAssistants,
                assistant_limit: maxAssistants,
                ...(maxConcurrentSessions !== undefined && { max_concurrent_sessions: maxConcurrentSessions }),
              }
            : user
        );
      });
      
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["admin", "users"], context?.previousUsers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quota"] });
    },
  });
}

/**
 * Add managed credential
 * No optimistic update (sensitive operation)
 */
export function useAddCredential() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: AddCredentialRequest) => {
      const data = await api.post<{ credential_id: number }>("/api/admin/credentials", request);
      return data;
    },
    onSuccess: () => {
      // Invalidate activity stream to show new event
      queryClient.invalidateQueries({ queryKey: ["admin", "activity"] });
    },
  });
}

/**
 * Delete a user and all associated data
 * Optimistic: Immediately remove from UI, rollback on error
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const data = await api.delete<{ deleted_user_id: number; username: string; display_name: string }>(
        `/api/admin/users/${userId}`
      );
      return data;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });

      const previousUsers = queryClient.getQueryData<UserWithStats[]>(["admin", "users"]);

      // Optimistically remove user from list
      queryClient.setQueryData<UserWithStats[]>(["admin", "users"], (old) => {
        if (!old) return old;
        return old.filter((user) => user.id !== userId);
      });

      return { previousUsers };
    },
    onError: (_err, _userId, context) => {
      // Rollback on error
      queryClient.setQueryData(["admin", "users"], context?.previousUsers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity"] });
    },
  });
}

/**
 * Revoke a user's Command Center access
 * Optimistic: Immediately reflect revoked state in UI, rollback on error
 */
export function useRevokeUserCCAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const data = await api.post<{ ok: boolean; user_id: number; username: string; status: string }>(
        `/api/admin/users/${userId}/revoke-cc-access`,
        {}
      );
      return data;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });

      const previousUsers = queryClient.getQueryData<UserWithStats[]>(["admin", "users"]);

      // Optimistically update the affected user
      queryClient.setQueryData<UserWithStats[]>(["admin", "users"], (old) => {
        if (!old) return old;
        return old.map((user) =>
          user.id === userId
            ? { ...user, command_center_access: false, cc_request_status: "revoked" as const }
            : user
        );
      });

      return { previousUsers };
    },
    onError: (_err, _userId, context) => {
      queryClient.setQueryData(["admin", "users"], context?.previousUsers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      // Invalidate user-profile cache so the revoked user is redirected
      // to Pay-As-You-Go on their next profile revalidation (60s stale window).
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

// ============================================================================
// Key Pool (Global Shared API Keys)
// ============================================================================

interface PoolKeyEntry {
  id: number;
  provider: string;
  name: string | null;
  created_at: string;
}

interface KeyPoolResponse {
  providers: {
    openai: PoolKeyEntry[];
    deepgram: PoolKeyEntry[];
  };
}

interface AddPoolKeyRequest {
  provider: "openai" | "deepgram";
  api_key: string;
  name?: string;
}

interface RemovePoolKeyRequest {
  provider: string;
  id: number;
}

/**
 * List all global key pool entries (both providers)
 */
export function useKeyPool() {
  return useQuery({
    queryKey: ["admin", "key-pool"],
    queryFn: async () => {
      const data = await api.get<KeyPoolResponse>("/admin/key-pool");
      return data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Add a key to the global pool (encrypts + reloads runtime pool)
 */
export function useAddPoolKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AddPoolKeyRequest) => {
      const data = await api.post<{ id: number; message: string }>("/admin/key-pool/add", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "key-pool"] });
    },
  });
}

/**
 * Remove (disable) a key from the global pool
 */
export function useRemovePoolKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RemovePoolKeyRequest) => {
      const data = await api.post<{ message: string }>("/admin/key-pool/remove", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "key-pool"] });
    },
  });
}

// ============================================================================
// Prefetch Utilities
// ============================================================================

/**
 * Prefetch admin data before user navigates to /admin
 * Call this from TopBar or on dashboard mount
 */
export function usePrefetchAdminData() {
  const queryClient = useQueryClient();
  
  return () => {
    // Prefetch users
    queryClient.prefetchQuery({
      queryKey: ["admin", "users"],
      queryFn: async () => {
        const data = await api.get<{ users: UserWithStats[] }>("/api/admin/users");
        return data.users;
      },
      staleTime: ADMIN_CACHE_CONFIG.godView.staleTime,
    });
    
    // Prefetch recent activity
    queryClient.prefetchQuery({
      queryKey: ["admin", "activity-simple", { limit: 50 }],
      queryFn: async () => {
        const data = await api.get<ActivityStreamResponse>("/api/admin/activity?limit=50&offset=0");
        return data;
      },
      staleTime: ADMIN_CACHE_CONFIG.activityStream.staleTime,
    });
  };
}
