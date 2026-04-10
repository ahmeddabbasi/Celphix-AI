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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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
      const data = (await res.json()) as unknown;
      const detail = isRecord(data) ? data.detail : undefined;
      const msg = isRecord(data) ? data.message : undefined;

      // FastAPI validation errors commonly return:
      // { detail: [{ loc: [...], msg: "...", type: "..." }, ...] }
      if (Array.isArray(detail)) {
        const parts = detail
          .map((entry) => {
            if (!isRecord(entry)) return null;
            const loc = entry.loc;
            const locText = Array.isArray(loc) ? loc.map(String).join(".") : "";
            const m = typeof entry.msg === "string" ? entry.msg : "Invalid request";
            return locText ? `${locText}: ${m}` : m;
          })
          .filter((p): p is string => typeof p === "string" && p.length > 0);
        message = parts.length ? parts.join(" | ") : message;
      } else if (typeof detail === "string") {
        message = detail;
      } else if (typeof msg === "string") {
        message = msg;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : ({} as T)) as T;
}

async function requestForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const url = joinUrl(getApiUrl(), path);

  const res = await authenticatedFetch(url, {
    method,
    // IMPORTANT: do not set Content-Type; the browser must set the boundary.
    body: form,
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

const CC_PREFIX = "/api/cc";
const PAYG_PREFIX = "/api/payg";

type DashboardWindow = "day" | "week" | "month" | "90d";

function scopedPath(prefix: string, path: string) {
  return joinUrl(prefix, path);
}

function makeDashboardApi(prefix: string) {
  return {
    summary: (window: DashboardWindow) =>
      request<{
        window: DashboardWindow;
        calls: number;
        unique_users: number;
        unique_assistants: number;
        avg_duration_seconds: number | null;
        total_time_seconds?: number | null;
        events: number;
        active_users: number;
      }>("GET", scopedPath(prefix, `/dashboard/summary?window=${window}`)),

    activity: (window: DashboardWindow) =>
      request<{ window: DashboardWindow; series: Array<{ ts: string | null; calls: number; events: number }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/activity?window=${window}`),
      ),

    topEvents: (window: DashboardWindow, limit = 8) =>
      request<{ window: DashboardWindow; events: Array<{ event_type: string; count: number }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/top-events?window=${window}&limit=${limit}`),
      ),

    assistantsKpis: (window: DashboardWindow = "week") =>
      request<{ assistants: Array<{ assistant_id: number; display_name: string | null; agent_key: string | null; calls: number; avg_duration_seconds: number | null; last_call_at: string | null }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/assistants?window=${window}`),
      ),

    assistants: () =>
      request<{ assistants: Array<{ assistant_id: number; assistant_name: string | null; agent_key: string | null; user_id: number | null; is_active: boolean; created_at: string | null }> }>(
        "GET",
        scopedPath(prefix, "/dashboard/assistants/list"),
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
          linked_dialing_file_id?: number | null;
          linked_sheet_name?: string | null;
          linked_number: string | null;
          linked_number_label: string | null;
          total_calls: number;
          session_calls: number;
          leads_booked: number;
          is_in_call: boolean;
        }>;
      }>("GET", scopedPath(prefix, "/dashboard/assistants/with-stats")),

    createAssistant: (payload: { agent_key: string; script_text: string; display_name?: string; is_active?: boolean }) =>
      request<{ assistant: { assistant_id: number; assistant_name: string | null; agent_key: string | null; user_id: number | null; is_active: boolean; created_at: string | null } }>(
        "POST",
        scopedPath(prefix, "/dashboard/assistants"),
        { payload },
      ),

    getAssistant: (assistantId: string | number) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; intro_message: string | null; is_active: boolean; created_at: string | null; linked_dialing_file_id?: number | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null } }>(
        "GET",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}`),
      ),

    updateAssistant: (
      assistantId: string | number,
      payload: { script_text?: string; display_name?: string; is_active?: boolean; speaker_id?: string | null; intro_message?: string | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null },
    ) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; intro_message: string | null; is_active: boolean; created_at: string | null; linked_dialing_file_id?: number | null; bg_noise_enabled?: boolean; bg_noise_volume?: number; bg_noise_url?: string | null } }>(
        "PUT",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}`),
        payload,
      ),

    deleteAssistant: (assistantId: string | number) =>
      request<{ ok: boolean; deleted: { assistant_id: number; interface_type: string; calls_deleted: number; events_deleted: number; leads_unlocked: number } }>(
        "DELETE",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}`),
      ),

    updateAssistantVoice: (assistantId: string | number, speakerId: string | null) =>
      request<{ assistant: { assistant_id: number; display_name: string | null; agent_key: string; owner_user_id: number; script_text: string | null; speaker_id: string | null; is_active: boolean; created_at: string | null } }>(
        "PATCH",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}/voice`),
        { speaker_id: speakerId },
      ),

    renameAssistant: (assistantId: string | number, displayName: string) =>
      request<{ assistant_id: number; display_name: string }>(
        "PATCH",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}/rename`),
        { display_name: displayName },
      ),

    updateAssistantIntro: (assistantId: string | number, introMessage: string) =>
      request<{ assistant_id: number; intro_message: string }>(
        "PATCH",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}/intro`),
        { intro_message: introMessage },
      ),

    warmupAssistantVoice: (assistantId: string | number, speakerId: string, introMessage?: string) =>
      request<{ cached: number; speaker_id?: string; detail?: string }>(
        "POST",
        scopedPath(prefix, `/dashboard/assistants/${assistantId}/warmup-voice`),
        { speaker_id: speakerId, ...(introMessage ? { intro_message: introMessage } : {}) },
      ),

    users: (window: DashboardWindow) =>
      request<{ window: DashboardWindow; users: Array<{ user_id: number; username: string; display_name: string; is_admin: boolean; total_assistants: number; logins: number; calls: number }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/users?window=${window}`),
      ),

    calls: (window: DashboardWindow, limit = 200) =>
      request<{ window: DashboardWindow; calls: Array<{ call_id: number; user_id: number | null; assistant_id: number | null; assistant_name: string | null; session_id: string | null; start_time: string | null; end_time: string | null; customer_number: string | number | null; recording_id?: number | null; recording_status?: string | null; recording_duration_seconds?: number | null }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/calls?window=${window}&limit=${limit}`),
      ),

    callRecordingUrl: (callId: number) =>
      request<{ url: string; recording_id?: number | null; expires_s: number; bytes?: number | null; duration_seconds?: number | null }>(
        "GET",
        scopedPath(prefix, `/dashboard/calls/${callId}/recording-url`),
      ),

    recentCalls: (limit = 50) =>
      request<{ calls: Array<{ call_id: number; user_id: number | null; assistant_id: number | null; assistant_name: string | null; session_id: string | null; start_time: string | null; end_time: string | null; customer_number: string | number | null }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/recent-calls?limit=${limit}`),
      ),

    heavyCharts: (window: DashboardWindow, topEventsLimit = 8) =>
      request<{
        activity: { window: DashboardWindow; series: Array<{ ts: string | null; calls: number; events: number }> };
        top_events: { window: DashboardWindow; events: Array<{ event_type: string; count: number }> };
      }>(
        "GET",
        scopedPath(prefix, `/dashboard/heavy-charts?window=${window}&top_events_limit=${topEventsLimit}`),
      ),

    activitySummary: (window: "day" | "week" | "month") =>
      request<{ window: "day" | "week" | "month"; rows: Array<{ user_id: number | null; assistant_id: number | null; assistant_name: string | null; logins: number; calls: number }> }>(
        "GET",
        scopedPath(prefix, `/dashboard/activity-summary?window=${window}`),
      ),
  };
}

function makeDialingDataApi(prefix: string) {
  return {
    listFiles: () =>
      request<{
        files: Array<{
          id: number;
          user_id: number;
          original_filename: string;
          headers: string[];
          row_count: number;
          created_at: string | null;
          linked_assistant: { assistant_id: number; display_name: string | null } | null;
        }>;
      }>("GET", scopedPath(prefix, "/dialing-data/files")),

    importFile: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return requestForm<{
        file: { id: number; original_filename: string; headers: string[]; row_count: number; created_at: string | null };
      }>("POST", scopedPath(prefix, "/dialing-data/files/import"), form);
    },

    deleteFile: (fileId: number) =>
      request<{ ok: boolean }>("DELETE", scopedPath(prefix, `/dialing-data/files/${fileId}`)),

    linkAssistantFile: (assistantId: string | number, fileId: number | null) =>
      request<{ assistant: { assistant_id: number; linked_dialing_file_id: number | null } }>(
        "PUT",
        scopedPath(prefix, `/dialing-data/assistants/${assistantId}/linked-file`),
        { file_id: fileId },
      ),
  };
}

function makeTwilioApi(prefix: string) {
  return {
    listNumbers: () =>
      request<{
        numbers: Array<{
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          linked_dialing_file_id?: number | null;
          linked_dialing_file_at?: string | null;
          linked_file?: {
            file_id: number;
            original_filename: string;
            row_count: number;
            headers: string[];
          } | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
      }>("GET", scopedPath(prefix, "/twilio/numbers")),

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
      }>("POST", scopedPath(prefix, "/twilio/numbers"), body),

    deleteNumber: (numberId: number) =>
      request<{
        ok: boolean;
        unlinked_assistant: { id: number; name: string | null } | null;
      }>("DELETE", scopedPath(prefix, `/twilio/numbers/${numberId}`)),

    linkAssistant: (numberId: number, assistantId: number | null) =>
      request<{
        number: {
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          linked_dialing_file_id?: number | null;
          linked_dialing_file_at?: string | null;
          linked_file?: {
            file_id: number;
            original_filename: string;
            row_count: number;
            headers: string[];
          } | null;
          created_at: string | null;
          updated_at: string | null;
        };
      }>("PATCH", scopedPath(prefix, `/twilio/numbers/${numberId}/assistant`), { assistant_id: assistantId }),

    linkDialingFile: (numberId: number, fileId: number | null) =>
      request<{
        number: {
          id: number;
          user_id: number;
          phone_number: string;
          label: string | null;
          assistant_id: number | null;
          assistant_name: string | null;
          linked_dialing_file_id?: number | null;
          linked_dialing_file_at?: string | null;
          linked_file?: {
            file_id: number;
            original_filename: string;
            row_count: number;
            headers: string[];
          } | null;
          created_at: string | null;
          updated_at: string | null;
        };
      }>("PATCH", scopedPath(prefix, `/twilio/numbers/${numberId}/linked-file`), { file_id: fileId }),

    startCall: (numberId: number, toNumber: string) =>
      request<{
        ok: boolean;
        call_sid: string;
        session_id: string;
        to: string;
        from: string;
      }>("POST", scopedPath(prefix, `/twilio/numbers/${numberId}/call`), { to_number: toNumber }),
  };
}

function makeDialerApi(prefix: string) {
  return {
    start: (assistantId: number) =>
      request<{
        ok: boolean;
        running: boolean;
        stop_requested: boolean;
        assistant_id: number;
        active_session_id?: string | null;
        active_lead_id?: number | null;
        active_to_number?: string | null;
        started_at?: string | null;
        last_error?: string | null;
      }>("POST", scopedPath(prefix, "/dialer/start"), { assistant_id: assistantId }),

    stop: (assistantId: number) =>
      request<{
        ok: boolean;
        running: boolean;
        stop_requested: boolean;
        assistant_id: number;
        active_session_id?: string | null;
        active_lead_id?: number | null;
        active_to_number?: string | null;
        started_at?: string | null;
        last_error?: string | null;
      }>("POST", scopedPath(prefix, "/dialer/stop"), { assistant_id: assistantId }),

    status: (assistantId: number) =>
      request<{
        ok: boolean;
        running: boolean;
        stop_requested: boolean;
        assistant_id: number;
        active_session_id?: string | null;
        active_lead_id?: number | null;
        active_to_number?: string | null;
        started_at?: string | null;
        last_error?: string | null;
      }>("GET", scopedPath(prefix, `/dialer/status?assistant_id=${assistantId}`)),
  };
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),

  // Dashboard helper (used by src/pages/Dashboard.tsx)
  getMetrics: () => request<unknown>("GET", "/metrics"),

  // ---- DB-backed dashboard endpoints ----
  dashboard: makeDashboardApi(CC_PREFIX),

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
          data?: Record<string, unknown> | null;
          created_at?: string | null;
          updated_at?: string | null;
        }>;
        limit: number;
        offset: number;
      }>("GET", `/api/cc/crm/leads?limit=${limit}&offset=${offset}${qParam}`);
    },

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
      request<{ lead: unknown }>("POST", "/api/cc/crm/leads", payload),

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
    ) => request<{ lead: unknown }>("PATCH", `/api/cc/crm/leads/${leadId}`, patch),

    deleteLead: (leadId: number) => request<{ ok: boolean }>("DELETE", `/api/cc/crm/leads/${leadId}`),

    bulkDeleteLeads: (leadIds: number[]) =>
      request<{ deleted_count: number }>("POST", "/api/cc/crm/leads/bulk-delete", { lead_ids: leadIds }),

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
      }>("POST", "/api/cc/crm/claim-next", { assistant_id: assistantId }),

    completeCall: (leadId: number, status: "completed" | "failed", callsummary?: string) =>
      request<{ success: boolean }>("POST", "/api/cc/crm/complete-call", {
        lead_id: leadId,
        status,
        callsummary,
      }),

    unlockLead: (leadId: number) =>
      request<{ success: boolean }>("POST", "/api/cc/crm/unlock-lead", { lead_id: leadId }),

    updateNotes: (leadId: number, notes: string) =>
      request<{ success: boolean }>("PATCH", `/api/cc/crm/leads/${leadId}/notes`, { notes }),
  },

  dialingData: makeDialingDataApi(CC_PREFIX),

  preferences: {
    get: () => request<{ preferences: Record<string, unknown> }>("GET", "/preferences"),
    
    update: (preferences: Record<string, unknown>) =>
      request<{ preferences: Record<string, unknown> }>("POST", "/preferences", preferences),
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

  supportTickets: {
    /** Submit a support ticket / complaint to admins. */
    submit: (body: { interface_type: "cc" | "payg"; message: string }) =>
      request<{ ok: boolean }>("POST", "/api/support-tickets", body),
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

  twilio: makeTwilioApi(CC_PREFIX),

  dialer: makeDialerApi(CC_PREFIX),
};

export const paygApi = {
  // IMPORTANT: Do NOT spread `api` here.
  // `api` contains Command Center-only modules that call `/api/cc/*`.
  // PAYG must be strictly isolated to `/api/payg/*` (Voices is shared via `/api/voices`
  // and is accessed via separate hooks/components).
  dashboard: makeDashboardApi(PAYG_PREFIX),
  twilio: makeTwilioApi(PAYG_PREFIX),
  dialer: makeDialerApi(PAYG_PREFIX),
  dialingData: makeDialingDataApi(PAYG_PREFIX),
};
