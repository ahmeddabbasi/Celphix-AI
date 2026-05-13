/**
 * API Request Proxy
 * 
 * Intercepts API requests and routes them to either:
 * 1. Mock API (returns fake data) - for pure frontend development
 * 2. Real API (makes actual HTTP requests) - for backend integration
 * 3. Hybrid mode (specific endpoints mocked, others use real API)
 * 
 * This enables seamless switching between development modes without
 * changing application code.
 * 
 * Design Pattern: Decorator/Proxy Pattern
 * - Wraps original authenticatedFetch
 * - Transparent to calling code
 * - All decisions based on environment variables
 * 
 * Usage:
 * ```
 * // In lib/api.ts, wrap the authenticatedFetch function
 * export async function authenticatedFetch(
 *   url: string,
 *   options: RequestInit
 * ): Promise<Response> {
 *   return apiProxy.interceptRequest(url, options, () =>
 *     originalAuthenticatedFetch(url, options)
 *   );
 * }
 * ```
 */

import { devConfig } from "./dev-config";
import { mockApiFactory } from "./dev-api-mocks";

// ══════════════════════════════════════════════════════════════════════════════
// MOCK RESPONSE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a mock Response object matching the Fetch API
 */
function createMockResponse<T extends Record<string, unknown>>(
  data: T,
  status = 200
): Response {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  
  return new Response(blob, {
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ENDPOINT MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Map API endpoints to mock data generators
 * Add new endpoints here to support them in mock mode
 */
const mockEndpoints: Record<string, (params?: Record<string, unknown>) => unknown> = {
  // Auth endpoints
  "/api/auth/me": () => mockApiFactory.createUserProfile(),

  // ─── Dashboard endpoints (Command Center) ─────────────────────────────────
  "/api/cc/dashboard/summary": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createDashboardSummary(window);
  },
  "/api/cc/dashboard/activity": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createDashboardActivity(window);
  },
  "/api/cc/dashboard/top-events": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    const limit = (params?.limit as number) || 8;
    return mockApiFactory.createTopEvents(window, limit);
  },
  "/api/cc/dashboard/assistants": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createAssistantsKpis(window);
  },
  "/api/cc/dashboard/assistants/list": () => mockApiFactory.createAssistantsList(),
  "/api/cc/dashboard/assistants/with-stats": () => mockApiFactory.createAssistantsWithStats(),
  "/api/cc/dashboard/calls": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    const limit = (params?.limit as number) || 200;
    const calls = mockApiFactory.createCalls(limit);
    return { ...calls, window };
  },
  "/api/cc/dashboard/recent-calls": (params) => {
    const limit = (params?.limit as number) || 50;
    return mockApiFactory.createRecentCalls(limit);
  },
  "/api/cc/dashboard/users": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createUsers(window);
  },
  "/api/cc/dashboard/activity-summary": (params) => {
    const window = (params?.window as "day" | "week" | "month") || "week";
    return mockApiFactory.createActivitySummary(window);
  },

  // ─── CRM endpoints ─────────────────────────────────────────────────────────
  "/api/cc/crm/leads": (params) => {
    const limit = (params?.limit as number) || 200;
    return mockApiFactory.createCrmLeads(limit);
  },

  // ─── Numbers endpoints ─────────────────────────────────────────────────────
  "/api/cc/twilio/numbers": () => mockApiFactory.createPhoneNumbers(5),
  "/api/cc/vonage/numbers": () => mockApiFactory.createPhoneNumbers(5),
  "/api/cc/telnyx/numbers": () => mockApiFactory.createPhoneNumbers(5),
  "/api/payg/twilio/numbers": () => mockApiFactory.createPhoneNumbers(5),
  "/api/payg/vonage/numbers": () => mockApiFactory.createPhoneNumbers(5),
  "/api/payg/telnyx/numbers": () => mockApiFactory.createPhoneNumbers(5),

  // ─── Voices endpoints ──────────────────────────────────────────────────────
  "/api/voices": () => mockApiFactory.createVoices(),
  "/api/admin/voices": () => mockApiFactory.createVoices(),
  "/api/cc/voices": () => mockApiFactory.createVoices(),
  "/api/payg/voices": () => mockApiFactory.createVoices(),

  // ─── Analytics endpoints ──────────────────────────────────────────────────
  "/analytics/call-volume": (params) => {
    const granularity = (params?.granularity as string) || "day";
    return mockApiFactory.createCallVolumeAnalytics(granularity);
  },
  "/analytics/sentiment": () => mockApiFactory.createSentimentDistribution(),
  "/analytics/leaderboard": () => mockApiFactory.createLeaderboard(),

  // ─── PAYG Dashboard endpoints ──────────────────────────────────────────────
  "/api/payg/dashboard/summary": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createDashboardSummary(window);
  },
  "/api/payg/dashboard/activity": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createDashboardActivity(window);
  },
  "/api/payg/dashboard/calls": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    const limit = (params?.limit as number) || 200;
    const calls = mockApiFactory.createCalls(limit);
    return { ...calls, window };
  },
  "/api/payg/dashboard/assistants/with-stats": () => mockApiFactory.createAssistantsWithStats(),

  // ─── Dialing Data endpoints ───────────────────────────────────────────────
  "/api/cc/dialing-data": (params) => {
    const limit = (params?.limit as number) || 50;
    return mockApiFactory.createCrmLeads(limit);
  },
  "/api/payg/dialing-data": (params) => {
    const limit = (params?.limit as number) || 50;
    return mockApiFactory.createCrmLeads(limit);
  },

  // ─── Assistant Config endpoints ──────────────────────────────────────────
  "/api/cc/dashboard/assistants/:id": (params) => {
    const assistantId = (params?.id as string | number) || 1;
    return { assistant: mockApiFactory.createAssistantDetail(assistantId) };
  },
  "/api/payg/dashboard/assistants/:id": (params) => {
    const assistantId = (params?.id as string | number) || 1;
    return { assistant: mockApiFactory.createAssistantDetail(assistantId) };
  },

  // ─── Dialing Data endpoints ──────────────────────────────────────────────
  "/api/cc/dialing-data/files": () => mockApiFactory.createDialingFiles(5),
  "/api/payg/dialing-data/files": () => mockApiFactory.createDialingFiles(5),

  // ─── Generic/fallback endpoints ──────────────────────────────────────────
  "/api/payg/dashboard/top-events": (params) => {
    const window = (params?.window as "day" | "week" | "month" | "90d") || "week";
    return mockApiFactory.createTopEvents(window);
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// API PROXY
// ══════════════════════════════════════════════════════════════════════════════

export const apiProxy = {
  /**
   * Extract query parameters from a URL
   */
  parseQueryParams(url: string): Record<string, unknown> {
    try {
      const urlObj = new URL(url, window.location.origin);
      const params: Record<string, unknown> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch {
      return {};
    }
  },

  /**
   * Extract the endpoint path from a full URL
   */
  getEndpointPath(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.pathname;
    } catch {
      // If URL parsing fails, assume it's already a path
      return url.split("?")[0];
    }
  },

  /**
   * Check if an endpoint should be mocked
   */
  shouldMockEndpoint(url: string): boolean {
    if (!devConfig.isDevMode() || !devConfig.useMockApi()) {
      return false;
    }

    const path = this.getEndpointPath(url);

    // Always mock the development auth, backend API, and analytics routes.
    return path.startsWith("/api/") || path.startsWith("/auth/") || path.startsWith("/analytics/");
  },

  /**
   * Extract ID from URL path
   */
  extractIdFromPath(path: string): string | null {
    const match = path.match(/\/(\d+)(?:$|\?)/);
    return match ? match[1] : null;
  },

  /**
   * Get mock data for an endpoint
   */
  getMockData(url: string, options: RequestInit = {}): unknown {
    const path = this.getEndpointPath(url);
    const params = this.parseQueryParams(url);

    // Try exact match first
    let handler = mockEndpoints[path];
    if (handler) {
      return handler(params);
    }

    // Try pattern matching for parameterized endpoints
    for (const key in mockEndpoints) {
      if (key.includes(":id")) {
        const pattern = key.replace(":id", "[^/]+");
        if (new RegExp(`^${pattern}$`).test(path)) {
          handler = mockEndpoints[key];
          if (handler) {
            // Extract ID from the path and pass it in params
            const id = this.extractIdFromPath(path);
            return handler({ ...params, id: id || "1" });
          }
        }
      }
    }

    return this.getFallbackMockData(url, options);
  },

  /**
   * Fallback mock response for unconfigured endpoints
   */
  getFallbackMockData(url: string, options: RequestInit = {}): unknown {
    const path = this.getEndpointPath(url);
    const method = (options.method || "GET").toUpperCase();
    const now = new Date().toISOString();

    if (path === "/api/auth/refresh") {
      return { access_token: "dev_access_token" };
    }

    if (path.startsWith("/api/auth")) {
      return mockApiFactory.createUserProfile();
    }

    if (path.startsWith("/api/notifications")) {
      const notifications = [
        {
          id: 1,
          type: "info",
          title: "Dev mode active",
          body: "Mock notifications are enabled for frontend-only development.",
          read: false,
          action_type: null,
          action_ref_id: null,
          action_taken: null,
          created_at: now,
        },
      ];
      if (method === "GET") return { notifications };
      return { ok: true, deleted: 0, request_id: 1, status: "approved", action: "approved" };
    }

    if (path.startsWith("/api/calendar/events")) {
      if (method === "GET") {
        return {
          events: [
            {
              id: 1,
              user_id: 1,
              event_date: new Date().toISOString().slice(0, 10),
              title: "Dev mode event",
              description: "This is a mock calendar event.",
              color: "blue",
              all_day: false,
              start_time: "09:00",
              end_time: "10:00",
              created_at: now,
              updated_at: now,
            },
          ],
          count: 1,
          etag: "dev-mock",
        };
      }
      if (method === "POST" || method === "PUT") {
        return {
          id: 1,
          user_id: 1,
          event_date: new Date().toISOString().slice(0, 10),
          title: "Dev mode event",
          description: "This is a mock calendar event.",
          color: "blue",
          all_day: false,
          start_time: "09:00",
          end_time: "10:00",
          created_at: now,
          updated_at: now,
        };
      }
      return { success: true, message: "Mock event deleted" };
    }

    if (path.startsWith("/api/cc/dashboard/active-assistants")) {
      return {
        active_count: 2,
        active_names: ["Sales Agent", "Support Agent"],
        latest_call_start: now,
        active_calls: [
          {
            call_id: 1,
            assistant_id: 1,
            assistant_name: "Sales Agent",
            session_id: "dev_session_1",
            call_started_at: now,
          },
          {
            call_id: 2,
            assistant_id: 2,
            assistant_name: "Support Agent",
            session_id: "dev_session_2",
            call_started_at: now,
          },
        ],
      };
    }

    if (path.startsWith("/api/cc/dashboard/session-info")) {
      return {
        last_login_at: now,
        current_session_duration_seconds: 420,
        current_session_duration_minutes: 7,
        total_sessions_today: 2,
      };
    }

    if (path.startsWith("/api/cc/milestones/recent")) {
      return {
        milestones: [
          {
            id: 1,
            timestamp: now,
            milestone_type: "call_volume",
            title: "First Dev Call",
            description: "Your first mock call completed successfully.",
            metric_name: "calls",
            metric_value: 1,
            previous_record: 0,
            assistant_id: 1,
            metadata: {},
            created_at: now,
          },
        ],
        count: 1,
      };
    }

    if (path.startsWith("/api/cc/activity/trends")) {
      return {
        trends: [
          { date: now.slice(0, 10), call_count: 32, unique_assistants: 3, total_duration: 2400, avg_duration: 75, max_duration: 120 },
          { date: now.slice(0, 10), call_count: 21, unique_assistants: 2, total_duration: 1800, avg_duration: 85, max_duration: 150 },
        ],
        period_days: Number(this.parseQueryParams(url).days || 30),
        total_calls: 53,
        avg_daily_calls: 2,
      };
    }

    if (path.startsWith("/api/admin/users")) {
      return { users: mockApiFactory.createUsers("week").users };
    }

    if (path.startsWith("/api/admin/activity")) {
      return { activity: [
        { id: 1, action: "login", user_id: 1, timestamp: now },
      ] };
    }

    if (path.startsWith("/api/admin/active-supervision-calls")) {
      return { calls: [] };
    }

    if (path.includes("/api/access-requests")) {
      return { request_id: 1, action: "approved", status: "approved" };
    }

    if (path.includes("/api/support-tickets")) {
      return { ok: true };
    }

    if (method === "POST" || method === "PATCH" || method === "DELETE") {
      return { ok: true };
    }

    return {};
  },

  /**
   * Simulate network delay (optional, for realistic loading states)
   * Disabled by default - enable by setting VITE_DEV_MOCK_DELAY=true
   */
  async simulateNetworkDelay(ms = 300): Promise<void> {
    const shouldDelay = (import.meta.env.VITE_DEV_MOCK_DELAY as string)?.toLowerCase() === "true";
    if (shouldDelay) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  },

  /**
   * Main interceptor function - wraps real API calls
   * 
   * Usage in authenticatedFetch:
   * ```
   * return apiProxy.interceptRequest(url, options, async () => {
   *   return originalAuthenticatedFetch(url, options);
   * });
   * ```
   */
  async interceptRequest(
    url: string,
    options: RequestInit,
    realApiCall: () => Promise<Response>
  ): Promise<Response> {
    // If dev mode is disabled, use real API
    if (!devConfig.isDevMode()) {
      return realApiCall();
    }

    // Check if this endpoint should be mocked
    if (this.shouldMockEndpoint(url)) {
      console.log(`%c🎭 Mock API: ${this.getEndpointPath(url)}`, "color: #9C27B0; font-style: italic;");

      // Simulate network delay (optional)
      await this.simulateNetworkDelay();

      // Return mock data
      const mockData = this.getMockData(url, options);
      return createMockResponse(mockData || {});
    }

    // Fall back to real API
    console.log(`%c🌐 Real API: ${this.getEndpointPath(url)}`, "color: #2196F3");
    return realApiCall();
  },

  /**
   * Log current mock configuration
   */
  logConfig(): void {
    if (!devConfig.isDevMode()) return;

    console.group("%c📡 API Proxy Configuration", "color: #FF9800; font-weight: bold");
    console.log("Dev Mode:", devConfig.isDevMode());
    console.log("Using Mock API:", devConfig.useMockApi());
    console.log("Available Mock Endpoints:", Object.keys(mockEndpoints).length);
    Object.keys(mockEndpoints).forEach((endpoint) => {
      console.log(`  ✓ ${endpoint}`);
    });
    console.groupEnd();
  },
};
