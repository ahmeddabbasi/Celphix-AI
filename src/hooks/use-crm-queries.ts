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

export function useUpdateCrmLeadNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, notes }: { leadId: number; notes: string }) => api.crm.updateNotes(leadId, notes),
    onSuccess: async (_res, vars) => {
      qc.setQueriesData({ queryKey: ["crm", "leads"] }, (old: any) => {
        if (!old?.leads || !Array.isArray(old.leads)) return old;
        return {
          ...old,
          leads: old.leads.map((l: any) => (l?.id === vars.leadId ? { ...l, notes: vars.notes } : l)),
        };
      });
      await qc.invalidateQueries({ queryKey: ["crm", "leads"] });
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
