import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Voice Management React Query Hooks
 *
 * - useAdminVoices:          Admin — all voices (including hidden)
 * - useUpdateVoice:          Admin — edit name/accent/gender (unique-name enforced)
 * - useToggleVoiceVisibility: Admin — toggle show/hide for all users
 * - usePublicVoices:         User  — only visible voices
 */

// ============================================================================
// Types
// ============================================================================

export interface VoiceEntry {
  id: number;
  speaker_id: string;
  display_name: string;
  gender: string;
  accent: string;
  visible: boolean;
  sample_url: string;
  created_at?: string;
  updated_at?: string;
}

interface UpdateVoiceRequest {
  display_name?: string;
  gender?: string;
  accent?: string;
}

// ============================================================================
// Admin Hooks
// ============================================================================

/** Fetch ALL voices (admin view, includes hidden) */
export function useAdminVoices() {
  return useQuery({
    queryKey: ["admin", "voices"],
    queryFn: async () => {
      const data = await api.get<{ voices: VoiceEntry[] }>("/api/admin/voices");
      return data.voices;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Update voice metadata (name, accent, gender). Server enforces unique name. */
export function useUpdateVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voiceId,
      ...body
    }: UpdateVoiceRequest & { voiceId: number }) => {
      return api.put<VoiceEntry>(`/api/admin/voices/${voiceId}`, body);
    },
    onMutate: async ({ voiceId, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "voices"] });
      const prev = queryClient.getQueryData<VoiceEntry[]>(["admin", "voices"]);

      queryClient.setQueryData<VoiceEntry[]>(["admin", "voices"], (old) =>
        old?.map((v) => (v.id === voiceId ? { ...v, ...changes } : v))
      );

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["admin", "voices"], ctx?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "voices"] });
      queryClient.invalidateQueries({ queryKey: ["voices"] });
    },
  });
}

/** Toggle voice visibility (show/hide for all users). */
export function useToggleVoiceVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voiceId: number) => {
      return api.patch<VoiceEntry>(
        `/api/admin/voices/${voiceId}/visibility`
      );
    },
    onMutate: async (voiceId) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "voices"] });
      const prev = queryClient.getQueryData<VoiceEntry[]>(["admin", "voices"]);

      queryClient.setQueryData<VoiceEntry[]>(["admin", "voices"], (old) =>
        old?.map((v) =>
          v.id === voiceId ? { ...v, visible: !v.visible } : v
        )
      );

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["admin", "voices"], ctx?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "voices"] });
      queryClient.invalidateQueries({ queryKey: ["voices"] });
    },
  });
}

// ============================================================================
// Public (user-facing) Hook
// ============================================================================

/** Fetch only visible voices — used by the Audio Library / Voices page. */
export function usePublicVoices() {
  return useQuery({
    queryKey: ["voices"],
    queryFn: async () => {
      const data = await api.get<{ voices: VoiceEntry[] }>("/api/voices");
      return data.voices;
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
