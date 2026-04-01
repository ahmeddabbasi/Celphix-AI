import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DialingFileRow = {
  id: number;
  user_id: number;
  original_filename: string;
  headers: string[];
  row_count: number;
  created_at: string | null;
  linked_assistant: { assistant_id: number; display_name: string | null } | null;
};

const DEFAULT_STALE_TIME_MS = 15_000;
const DEFAULT_GC_TIME_MS = 5 * 60_000;

export function useDialingFiles() {
  return useQuery({
    queryKey: ["dialing-data", "files"],
    queryFn: () => api.dialingData.listFiles(),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useImportDialingFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.dialingData.importFile(file),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["dialing-data", "files"] });
    },
  });
}

export function useDeleteDialingFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: number) => api.dialingData.deleteFile(fileId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["dialing-data", "files"] });
    },
  });
}

export function useSetDialingFileLinkedAssistant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fileId: number;
      nextAssistantId: number | null;
      currentAssistantId: number | null;
    }) => {
      const { fileId, nextAssistantId, currentAssistantId } = payload;

      if ((nextAssistantId ?? null) === (currentAssistantId ?? null)) {
        return { ok: true };
      }

      // Our API links assistant -> file, but the UI edits file -> assistant.
      // To keep 1:1 constraints safe, unlink the current assistant first (if needed).
      if (currentAssistantId != null) {
        await api.dialingData.linkAssistantFile(currentAssistantId, null);
      }

      if (nextAssistantId != null) {
        await api.dialingData.linkAssistantFile(nextAssistantId, fileId);
      }

      return { ok: true };
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dialing-data", "files"] }),
        qc.invalidateQueries({ queryKey: ["assistants", "with-stats"] }),
      ]);
    },
  });
}
