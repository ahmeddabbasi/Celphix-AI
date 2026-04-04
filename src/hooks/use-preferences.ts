import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const PREFS_KEY = ["user", "preferences"];
const FALLBACK_STORAGE_KEY = "crm_user_preferences";

export function useUserPreferences() {
  const qc = useQueryClient();

  // Try to get from server first, fallback to localStorage
  const query = useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () => {
      try {
        const result = await api.preferences.get();
        return result.preferences;
      } catch (error) {
        // Fallback to localStorage if server unavailable
        const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const mutation = useMutation({
    mutationFn: async (preferences: Record<string, unknown>) => {
      // Save to localStorage immediately for instant feedback
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(preferences));
      
      // Then persist to server
      try {
        const result = await api.preferences.update(preferences);
        return result.preferences;
      } catch (error) {
        // If server fails, localStorage still has it
        console.warn("Failed to sync preferences to server:", error);
        return preferences;
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(PREFS_KEY, data);
    },
  });

  return {
    preferences: query.data || {},
    isLoading: query.isLoading,
    updatePreferences: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

// Helper hooks for specific preference types
export function useColumnOrder(tableId: string) {
  const { preferences, updatePreferences } = useUserPreferences();
  
  const columnOrder = preferences?.[`columnOrder_${tableId}`] as string[] | undefined;
  
  const setColumnOrder = async (order: string[]) => {
    await updatePreferences({
      ...preferences,
      [`columnOrder_${tableId}`]: order,
    });
  };
  
  return [columnOrder, setColumnOrder] as const;
}
