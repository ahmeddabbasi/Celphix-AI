import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type CrmLead = {
  id: number;
  user_id: number;
  customer_index: number;
  customername: string | null;
  customernumber: string | null;
  leadstatus: string | null;
  assistantcalling: number | null;
  calltime: string | null;
  callsummary: string | null;
  notes: string | null;
  call_transfer?: string | null;
  data?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CrmListLeadsResponse = {
  leads: CrmLead[];
  limit: number;
  offset: number;
};

// CRM lead lists are read-heavy; cache aggressively to avoid refetching on every navigation.
const DEFAULT_STALE_TIME_MS = 60_000;
const DEFAULT_GC_TIME_MS = 20 * 60_000;

export function useCrmLeads(params?: { limit?: number; offset?: number; q?: string | null }) {
  const limit = params?.limit ?? 200;
  const offset = params?.offset ?? 0;
  const q = params?.q ?? null;

  return useQuery({
    queryKey: ["crm", "leads", { limit, offset, q }],
    queryFn: () => api.crm.listLeads({ limit, offset, q }),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
    // Keep old rows on screen while new filter/page loads.
    placeholderData: (prev) => prev,
  });
}

export function useCreateCrmLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof api.crm.createLead>[0]) => api.crm.createLead(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}

export function usePatchCrmLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, patch }: { leadId: number; patch: Parameters<typeof api.crm.patchLead>[1] }) =>
      api.crm.patchLead(leadId, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}

export function useDeleteCrmLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) => api.crm.deleteLead(leadId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}

export function useBulkDeleteCrmLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: number[]) => api.crm.bulkDeleteLeads(leadIds),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}

// Calling CRM hooks (active workspace)
export function useCallingCrm(params?: { limit?: number; offset?: number; q?: string | null }) {
  const limit = params?.limit ?? 200;
  const offset = params?.offset ?? 0;
  const q = params?.q ?? null;

  return useQuery({
    queryKey: ["crm", "calling", { limit, offset, q }],
    queryFn: () => api.crm.listCalling({ limit, offset, q }),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useUpdateCallingCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callingId, payload }: { callingId: number; payload: Parameters<typeof api.crm.updateCalling>[1] }) =>
      api.crm.updateCalling(callingId, payload),
    
    // Optimistic update for instant UI feedback
    onMutate: async ({ callingId, payload }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: ["crm", "calling"] });

      // Snapshot the previous value for rollback
      const previousData = qc.getQueriesData({ queryKey: ["crm", "calling"] });

      // Optimistically update all relevant queries
      qc.setQueriesData({ queryKey: ["crm", "calling"] }, (old: any) => {
        if (!old?.calling) return old;
        
        return {
          ...old,
          calling: old.calling.map((item: any) =>
            item.id === callingId
              ? { ...item, ...payload }
              : item
          ),
        };
      });

      // Return context with snapshot for potential rollback
      return { previousData };
    },

    // On error, rollback to previous state
    onError: (err, variables, context) => {
      if (context?.previousData) {
        // Restore all previous query data
        context.previousData.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },

    // Always refetch after error or success to ensure sync with server
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "calling"] });
    },
  });
}

export function useImportCrmLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leads, onProgress }: { leads: Array<Parameters<typeof api.crm.createLead>[0]>; onProgress?: (p: { done: number; total: number }) => void }) => {
      let done = 0;
      const total = leads.length;
      for (const lead of leads) {
        await api.crm.createLead(lead);
        done += 1;
        onProgress?.({ done, total });
      }
      return { done, total };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}
