import { authenticatedFetch } from "@/lib/auth";

/**
 * Small API wrapper used by the frontend.
 * - Injects auth via authenticatedFetch()
 * - Normalizes URL joins
 * - Throws on non-2xx (and authenticatedFetch handles 401 redirect)
 *
 * In development the Vite dev-server proxy forwards all backend paths to
 * localhost:8000, so VITE_API_URL is left empty and relative URLs are used.
 * In production VITE_API_URL=https://voiceagent.rebortai.com is baked in
 * at build time (set in sound-weave-nexus/.env).
 */

const DEFAULT_API_URL = "";
const DEFAULT_WS_URL = "";

function joinUrl(base: string, path: string) {
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const a = base.replace(/\/+$/, "");
  const b = path.replace(/^\/+/, "");
  return `${a}/${b}`;
}

export function getApiUrl(): string {
  return (import.meta.env.VITE_API_URL as string) || DEFAULT_API_URL;
}

export function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string;

  // If an API base URL is configured (e.g. frontend on Vercel, backend elsewhere),
  // default the WS origin to the same host to avoid accidentally connecting back
  // to the frontend host.
  const apiUrl = (import.meta.env.VITE_API_URL as string) || "";
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      const proto = u.protocol === "https:" ? "wss:" : u.protocol === "http:" ? "ws:" : null;
      if (proto) return `${proto}//${u.host}`;
    } catch {
      // ignore invalid URL
    }
  }

  // In dev the Vite proxy handles /ws → ws://localhost:8000/ws.
  // Derive WS URL from the current page's origin (works for both dev and prod).
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }
  return DEFAULT_WS_URL;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = joinUrl(getApiUrl(), path);

  const res = await authenticatedFetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.detail || data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : ({} as T)) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),

  // Dashboard helper (used by src/pages/Dashboard.tsx)
  getMetrics: () => request<any>("GET", "/metrics"),

  // ---- DB-backed dashboard endpoints ----
  dashboard: {
    summary: (window: "day" | "week" | "month") =>
      request<{
        window: "day" | "week" | "month";
        calls: number;
        unique_users: number;
        unique_assistants: number;
        avg_duration_seconds: number | null;
        events: number;
        active_users: number;
      }>("GET", `/dashboard/summary?window=${window}`),

    activity: (window: "day" | "week" | "month") =>
      request<{ window: "day" | "week" | "month"; series: Array<{ ts: string | null; calls: number; events: number }> }>(
        "GET",
        `/dashboard/activity?window=${window}`,
      ),

    topEvents: (window: "day" | "week" | "month", limit = 8) =>
      request<{ window: "day" | "week" | "month"; events: Array<{ event_type: string; count: number }> }>(
        "GET",
        `/dashboard/top-events?window=${window}&limit=${limit}`,
      ),

    assistantsKpis: (window: "day" | "week" | "month" = "week") =>
      request<{ assistants: Array<{ assistant_id: number; display_name: string | null; agent_key: string | null; calls: number; avg_duration_seconds: number | null; last_call_at: string | null }> }>(
        "GET",
        `/dashboard/assistants?window=${window}`,
      ),

    assistants: () =>
      request<{ assistants: Array<{ assistant_id: number; assistant_name: string | null; agent_key: string | null; user_id: number | null; is_active: boolean; created_at: string | null }> }>(
        "GET",
        "/dashboard/assistants/list",
      ),

    assistantsWithStats: () =>
      request<{
        quota: number;
        assistants: Array<{
          assistant_id: number;
          display_name: string;
          agent_key: string | null;
          speaker_id: string | null;
          is_active: boolean;
          linked_number: string | null;
          linked_number_label: string | null;
          total_calls: number;
          session_calls: number;
          leads_booked: number;
          is_in_call: boolean;
        }>;
      }>("GET", "/dashboard/assistants/with-stats"),

    createAssistant: (payload: { agent_key: string; script_text: string; display_name?: string; is_active?: boolean }) =>
      request<{ assistant: { assistant_id: number; assistant_name: string | null; agent_key: string | null; user_id: number | null; is_active: boolean; created_at: string | null } }>(
        "POST",
        "/dashboard/assistants",
        payload,
      ),

    getAssistant: (assistantId: string | number) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; intro_message: string | null; is_active: boolean; created_at: string | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null } }>(
        "GET",
        `/dashboard/assistants/${assistantId}`,
      ),

    updateAssistant: (
      assistantId: string | number,
      payload: { script_text?: string; display_name?: string; is_active?: boolean; speaker_id?: string | null; intro_message?: string | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null },
    ) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; intro_message: string | null; is_active: boolean; created_at: string | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null } }>(
        "PUT",
        `/dashboard/assistants/${assistantId}`,
        payload,
      ),

    updateAssistantVoice: (assistantId: string | number, speakerId: string | null) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; is_active: boolean; created_at: string | null } }>(
        "PATCH",
        `/dashboard/assistants/${assistantId}/voice`,
        { speaker_id: speakerId },
      ),

    renameAssistant: (assistantId: string | number, displayName: string) =>
      request<{ assistant_id: number; display_name: string }>(
        "PATCH",
        `/dashboard/assistants/${assistantId}/rename`,
        { display_name: displayName },
      ),

    updateAssistantIntro: (assistantId: string | number, introMessage: string) =>
      request<{ assistant_id: number; intro_message: string }>(
        "PATCH",
        `/dashboard/assistants/${assistantId}/intro`,
        { intro_message: introMessage },
      ),

    warmupAssistantVoice: (assistantId: string | number, speakerId: string, introMessage?: string) =>
      request<{ cached: number; speaker_id?: string; detail?: string }>(
        "POST",
        `/dashboard/assistants/${assistantId}/warmup-voice`,
        { speaker_id: speakerId, ...(introMessage ? { intro_message: introMessage } : {}) },
      ),

    users: (window: "day" | "week" | "month") =>
      request<{ window: "day" | "week" | "month"; users: Array<{ user_id: number; username: string; display_name: string; is_admin: boolean; total_assistants: number; logins: number; calls: number }> }>(
        "GET",
        `/dashboard/users?window=${window}`,
      ),

    calls: (window: "day" | "week" | "month", limit = 200) =>
      request<{ window: "day" | "week" | "month"; calls: Array<{ call_id: number; user_id: number | null; assistant_id: number | null; assistant_name: string | null; session_id: string | null; start_time: string | null; end_time: string | null; customer_number: number | null }> }>(
        "GET",
        `/dashboard/calls?window=${window}&limit=${limit}`,
      ),

    recentCalls: (limit = 50) =>
      request<{ calls: Array<{ call_id: number; user_id: number | null; assistant_id: number | null; assistant_name: string | null; session_id: string | null; start_time: string | null; end_time: string | null; customer_number: number | null }> }>(
        "GET",
        `/dashboard/recent-calls?limit=${limit}`,
      ),

    heavyCharts: (window: "day" | "week" | "month", topEventsLimit = 8) =>
      request<{
        activity: { window: "day" | "week" | "month"; series: Array<{ ts: string | null; calls: number; events: number }> };
        top_events: { window: "day" | "week" | "month"; events: Array<{ event_type: string; count: number }> };
      }>(
        "GET",
        `/dashboard/heavy-charts?window=${window}&top_events_limit=${topEventsLimit}`,
      ),

    activitySummary: (window: "day" | "week" | "month") =>
      request<{ window: "day" | "week" | "month"; rows: Array<{ user_id: number | null; assistant_id: number | null; assistant_name: string | null; logins: number; calls: number }> }>(
        "GET",
        `/dashboard/activity-summary?window=${window}`,
      ),
  },

  // ---- CRM endpoints ----
  crm: {
    listLeads: (params?: { limit?: number; offset?: number; q?: string | null }) => {
      const limit = params?.limit ?? 200;
      const offset = params?.offset ?? 0;
      const q = params?.q ?? null;
      const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
      return request<{
        leads: Array<{
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
        }>;
        limit: number;
        offset: number;
      }>("GET", `/crm/leads?limit=${limit}&offset=${offset}${qParam}`);
    },

    // Calling CRM endpoints (active workspace with Dashboard data mirrored)
    listCalling: ({ limit = 200, offset = 0, q = null }: { limit?: number; offset?: number; q?: string | null }) => {
      const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
      return request<{
        calling: Array<{
          id: number;
          lead_id: number;
          leadstatus: string;
          assistantcalling: number | null;
          calltime: string | null;
          notes: string | null;
          callsummary: string | null;
          interest: string | null;
          customer_index: number;
          customername: string | null;
          customernumber: string | null;
        }>;
        limit: number;
        offset: number;
      }>("GET", `/crm/calling?limit=${limit}&offset=${offset}${qParam}`);
    },

    updateCalling: (callingId: number, payload: {
      leadstatus?: string;
      notes?: string;
      assistantcalling?: number | null;
      calltime?: string | null;
      callsummary?: string;
      interest?: string;
    }) =>
      request<{ success: boolean; id: number }>("PATCH", `/crm/calling/${callingId}`, payload),

    createLead: (payload: {
      customer_index?: number;
      customername?: string;
      customernumber?: string;
      leadstatus?: string;
      assistantcalling?: number | null;
      calltime?: string | null;
      callsummary?: string | null;
      notes?: string | null;
    }) =>
      request<{ lead: any }>("POST", "/crm/leads", payload),

    patchLead: (
      leadId: number,
      patch: {
        customer_index?: number;
        customername?: string | null;
        customernumber?: string | null;
        leadstatus?: string | null;
        assistantcalling?: number | null;
        calltime?: string | null;
        callsummary?: string | null;
        notes?: string | null;
      },
    ) => request<{ lead: any }>("PATCH", `/crm/leads/${leadId}`, patch),

    deleteLead: (leadId: number) => request<{ ok: boolean }>("DELETE", `/crm/leads/${leadId}`),

    bulkDeleteLeads: (leadIds: number[]) =>
      request<{ deleted_count: number }>("POST", "/crm/leads/bulk-delete", { lead_ids: leadIds }),

    importPreview: (payload: { source: string; headers: string[] }) =>
      request<{ headers: string[]; suggestions: Array<{ source_field: string; target_field: string | null }> }>(
        "POST",
        "/crm/import/preview",
        payload,
      ),

    importFinalize: (payload: {
      source: string;
      rows: Array<Record<string, any>>;
      mappings: Array<{ source_field: string; target_field: string; is_required?: boolean }>;
    }) => request<{ created: number; skipped: number }>("POST", "/crm/import/finalize", payload),

    listMappings: () =>
      request<{ mappings: Array<{ id: number; source: string; source_field: string; target_field: string | null; is_required: boolean }> }>(
        "GET",
        "/crm/mappings",
      ),

    upsertMappings: (payload: {
      source: string;
      mappings: Array<{ source_field: string; target_field: string | null; is_required?: boolean }>;
    }) => request<{ mappings: any[] }>("POST", "/crm/mappings", payload),

    // Calling CRM endpoints
    claimNextLead: (assistantId: number) =>
      request<{
        lead: {
          id: number;
          customer_index: number;
          customername: string | null;
          customernumber: string | null;
          leadstatus: string;
          assistantcalling: number | null;
          locked_at: string | null;
          callsummary: string | null;
          notes: string | null;
        };
      }>("POST", "/crm/claim-next", { assistant_id: assistantId }),

    completeCall: (leadId: number, status: "completed" | "failed", callsummary?: string) =>
      request<{ success: boolean }>("POST", "/crm/complete-call", {
        lead_id: leadId,
        status,
        callsummary,
      }),

    unlockLead: (leadId: number) =>
      request<{ success: boolean }>("POST", "/crm/unlock-lead", { lead_id: leadId }),

    updateNotes: (leadId: number, notes: string) =>
      request<{ success: boolean }>("PATCH", `/crm/leads/${leadId}/notes`, { notes }),
  },

  preferences: {
    get: () => request<{ preferences: Record<string, any> }>("GET", "/preferences"),
    
    update: (preferences: Record<string, any>) =>
      request<{ preferences: Record<string, any> }>("POST", "/preferences", preferences),
  },

  users: {
    updateProfile: (body: { display_name: string }) =>
      request<{ user_id: number; username: string; display_name: string }>(
        "PATCH",
        "/api/users/me/profile",
        body,
      ),

    changePassword: (body: { current_password: string; new_password: string }) =>
      request<{ success: boolean }>("POST", "/api/users/me/password", body),
  },

  accessRequests: {
    /** Submit a Command Center access request (regular users only). */
    submit: (message: string) =>
      request<{ request_id: number; status: string }>("POST", "/api/access-requests", { message }),

    /** Admin: approve or reject a pending request. */
    review: (reqId: number, action: "approve" | "reject") =>
      request<{ request_id: number; action: string; status: string }>(
        "PATCH",
        `/api/access-requests/${reqId}/review`,
        { action },
      ),
  },

  notifications: {
    list: (limit = 50) =>
      request<{ notifications: import("@/lib/notifications").AppNotification[] }>(
        "GET",
        `/api/notifications?limit=${limit}`,
      ),

    markRead: (notifId: number) =>
      request<{ ok: boolean }>("PATCH", `/api/notifications/${notifId}/read`),

    markAllRead: () =>
      request<{ ok: boolean }>("POST", "/api/notifications/mark-all-read"),
  },

  twilio: {
    listNumbers: () =>
      request<{
        numbers: Array<{
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
      }>("GET", "/api/twilio/numbers"),

    addNumber: (body: {
      account_sid: string;
      auth_token: string;
      phone_number: string;
      label?: string | null;
      assistant_id?: number | null;
    }) =>
      request<{
        number: {
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      }>("POST", "/api/twilio/numbers", body),

    deleteNumber: (numberId: number) =>
      request<{
        ok: boolean;
        unlinked_assistant: { id: number; name: string | null } | null;
      }>("DELETE", `/api/twilio/numbers/${numberId}`),

    linkAssistant: (numberId: number, assistantId: number | null) =>
      request<{
        number: {
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      }>("PATCH", `/api/twilio/numbers/${numberId}/assistant`, { assistant_id: assistantId }),

    startCall: (numberId: number, toNumber: string) =>
      request<{
        ok: boolean;
        call_sid: string;
        session_id: string;
        to: string;
        from: string;
      }>("POST", `/api/twilio/numbers/${numberId}/call`, { to_number: toNumber }),
  },
};
