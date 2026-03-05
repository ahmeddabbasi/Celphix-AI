/**
 * Hook: useNotifications
 *
 * Polls /api/notifications every 30 seconds and exposes helpers for:
 *  - marking notifications read (individually or all-at-once)
 *  - reviewing CC access requests (admin only)
 *  - dismissing a single notification
 *  - clearing all read notifications
 *
 * Optimistic updates are applied for mark-read and dismiss so the UI
 * responds instantly without waiting for the server round-trip.
 *
 * Used by both Command Center (TopBar) and Pay-As-You-Go (PaygTopBar).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/notifications";

export const NOTIFICATIONS_KEY = ["notifications"] as const;

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<AppNotification[]> {
  const data = await api.get<{ notifications: AppNotification[] }>("/api/notifications?limit=50");
  return data.notifications;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  // ── Mark single read (optimistic) ────────────────────────────────────────
  const markRead = useMutation({
    mutationFn: (notifId: number) =>
      api.patch<{ ok: boolean }>(`/api/notifications/${notifId}/read`),
    onMutate: async (notifId) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<AppNotification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => (n.id === notifId ? { ...n, read: true } : n)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/api/notifications/mark-all-read"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<AppNotification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => ({ ...n, read: true })) ?? [],
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  // ── Delete (dismiss) single notification (optimistic) ────────────────────
  const deleteNotification = useMutation({
    mutationFn: (notifId: number) =>
      api.delete<{ ok: boolean }>(`/api/notifications/${notifId}`),
    onMutate: async (notifId) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<AppNotification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.filter((n) => n.id !== notifId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  // ── Clear all read notifications ──────────────────────────────────────────
  const clearReadNotifications = useMutation({
    mutationFn: () =>
      api.delete<{ ok: boolean; deleted: number }>("/api/notifications?read_only=true"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<AppNotification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.filter((n) => !n.read) ?? [],
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  // ── Admin: review CC access request ──────────────────────────────────────
  const reviewAccessRequest = useMutation({
    mutationFn: ({ reqId, action }: { reqId: number; action: "approve" | "reject" }) =>
      api.patch<{ request_id: number; action: string; status: string }>(
        `/api/access-requests/${reqId}/review`,
        { action },
      ),
    onMutate: async ({ reqId, action }) => {
      // Optimistically mark the notification as handled so buttons hide immediately
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<AppNotification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) =>
          n.action_ref_id === reqId && n.action_type === "access_request_review"
            ? { ...n, action_taken: action, read: true }
            : n,
        ) ?? [],
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const notifications = query.data ?? [];
  const unreadCount   = notifications.filter((n) => !n.read).length;
  const readCount     = notifications.filter((n) => n.read).length;

  return {
    notifications,
    unreadCount,
    readCount,
    isLoading:              query.isLoading,
    markRead:               (id: number) => markRead.mutate(id),
    markAllRead:            () => markAllRead.mutate(),
    deleteNotification:     (id: number) => deleteNotification.mutate(id),
    clearReadNotifications: () => clearReadNotifications.mutate(),
    reviewAccessRequest:    (reqId: number, action: "approve" | "reject") =>
      reviewAccessRequest.mutateAsync({ reqId, action }),
    isReviewing: reviewAccessRequest.isPending,
  };
}
