/**
 * Mock API Responses Generator
 * 
 * Provides realistic mock data factory functions for all API endpoints.
 * Data is generated to be structurally identical to production APIs
 * but with sensible defaults for development testing.
 * 
 * Usage:
 * ```
 * import { mockApiFactory } from "@/lib/dev/dev-api-mocks";
 * 
 * const userProfile = mockApiFactory.createUserProfile();
 * const dashboardData = mockApiFactory.createDashboardSummary();
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  is_admin: boolean;
  command_center_access: boolean;
  cc_request_status: "approved" | "pending" | "rejected" | null;
}

export interface DashboardSummary {
  window: "day" | "week" | "month" | "90d";
  calls: number;
  unique_users: number;
  unique_assistants: number;
  avg_duration_seconds: number | null;
  total_time_seconds?: number | null;
  events: number;
  active_users: number;
}

export interface ActivityDataPoint {
  ts: string | null;
  calls: number;
  events: number;
}

export interface DashboardActivity {
  window: "day" | "week" | "month" | "90d";
  series: ActivityDataPoint[];
}

export interface EventData {
  event_type: string;
  count: number;
}

export interface TopEvents {
  window: "day" | "week" | "month" | "90d";
  events: EventData[];
}

export interface AssistantKpi {
  assistant_id: number;
  display_name: string | null;
  agent_key: string | null;
  calls: number;
  avg_duration_seconds: number | null;
  last_call_at: string | null;
}

export interface AssistantsKpis {
  assistants: AssistantKpi[];
}

export interface Assistant {
  assistant_id: number;
  assistant_name: string | null;
  agent_key: string | null;
  user_id: number | null;
  is_active: boolean;
  created_at: string | null;
}

export interface AssistantsList {
  assistants: Assistant[];
}

export interface AssistantWithStats {
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
}

export interface AssistantsWithStats {
  quota: number;
  assistants: AssistantWithStats[];
}

export interface Call {
  call_id: number;
  user_id: number | null;
  assistant_id: number | null;
  assistant_name: string | null;
  session_id: string | null;
  start_time: string | null;
  end_time: string | null;
  customer_number: string | number | null;
  recording_id?: number | null;
  recording_status?: string | null;
  recording_duration_seconds?: number | null;
}

export interface CallsList {
  window: "day" | "week" | "month" | "90d";
  calls: Call[];
}

export interface CrmLead {
  id: number;
  user_id: number;
  customer_index: number;
  customername: string | null;
  customernumber: string | null;
  leadstatus: string;
  assistantcalling: number | null;
  calltime: string | null;
  callsummary: string | null;
  notes: string | null;
}

export interface CrmLeadsList {
  leads: CrmLead[];
}

export interface PhoneNumber {
  id: number;
  user_id: number;
  phone_number: string;
  label: string | null;
  assistant_id: number | null;
  assistant_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PhoneNumbersList {
  numbers: PhoneNumber[];
}

export interface Voice {
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

export interface VoicesList {
  voices: Voice[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA FACTORY
// ══════════════════════════════════════════════════════════════════════════════

class MockApiFactory {
  /**
   * Create a mock user profile
   */
  createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      user_id: 1,
      username: "dev_user",
      email: "dev@celphix.local",
      is_admin: true,
      command_center_access: true,
      cc_request_status: "approved",
      ...overrides,
    };
  }

  /**
   * Create dashboard summary data for a given window
   */
  createDashboardSummary(
    window: "day" | "week" | "month" | "90d" = "week",
    overrides: Partial<DashboardSummary> = {}
  ): DashboardSummary {
    const baseData: DashboardSummary = {
      window,
      calls: Math.floor(Math.random() * 500) + 50,
      unique_users: Math.floor(Math.random() * 30) + 5,
      unique_assistants: Math.floor(Math.random() * 15) + 2,
      avg_duration_seconds: Math.floor(Math.random() * 300) + 30,
      total_time_seconds: Math.floor(Math.random() * 10000) + 1000,
      events: Math.floor(Math.random() * 200) + 50,
      active_users: Math.floor(Math.random() * 20) + 3,
    };

    return { ...baseData, ...overrides };
  }

  /**
   * Create dashboard activity data
   */
  createDashboardActivity(
    window: "day" | "week" | "month" | "90d" = "week"
  ): DashboardActivity {
    const days = window === "day" ? 24 : window === "week" ? 7 : window === "month" ? 30 : 90;
    const series: ActivityDataPoint[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      series.push({
        ts: date.toISOString().split("T")[0],
        calls: Math.floor(Math.random() * 100) + 10,
        events: Math.floor(Math.random() * 50) + 5,
      });
    }

    return { window, series };
  }

  /**
   * Create top events data
   */
  createTopEvents(
    window: "day" | "week" | "month" | "90d" = "week",
    limit = 8
  ): TopEvents {
    const eventTypes = [
      "call_started",
      "call_ended",
      "transfer_initiated",
      "recording_started",
      "sentiment_detected",
      "lead_qualified",
      "follow_up_scheduled",
      "support_escalated",
    ];

    const events = eventTypes.slice(0, Math.min(limit, eventTypes.length)).map((type) => ({
      event_type: type,
      count: Math.floor(Math.random() * 500) + 20,
    }));

    return {
      window,
      events: events.sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Create assistant KPIs
   */
  createAssistantsKpis(window: "day" | "week" | "month" | "90d" = "week"): AssistantsKpis {
    const assistants: AssistantKpi[] = [
      {
        assistant_id: 1,
        display_name: "Sales Agent",
        agent_key: "sales_agent_v1",
        calls: Math.floor(Math.random() * 200) + 50,
        avg_duration_seconds: Math.floor(Math.random() * 300) + 60,
        last_call_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      },
      {
        assistant_id: 2,
        display_name: "Support Agent",
        agent_key: "support_agent_v1",
        calls: Math.floor(Math.random() * 300) + 100,
        avg_duration_seconds: Math.floor(Math.random() * 400) + 120,
        last_call_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      },
      {
        assistant_id: 3,
        display_name: "Follow-up Agent",
        agent_key: "followup_agent_v1",
        calls: Math.floor(Math.random() * 150) + 30,
        avg_duration_seconds: Math.floor(Math.random() * 200) + 30,
        last_call_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      },
    ];

    return { assistants };
  }

  /**
   * Create assistant list
   */
  createAssistantsList(): AssistantsList {
    const assistants: Assistant[] = [
      {
        assistant_id: 1,
        assistant_name: "Sales Agent",
        agent_key: "sales_agent_v1",
        user_id: 1,
        is_active: true,
        created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      },
      {
        assistant_id: 2,
        assistant_name: "Support Agent",
        agent_key: "support_agent_v1",
        user_id: 1,
        is_active: true,
        created_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
      },
      {
        assistant_id: 3,
        assistant_name: "Follow-up Agent",
        agent_key: "followup_agent_v1",
        user_id: 1,
        is_active: false,
        created_at: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
      },
    ];

    return { assistants };
  }

  /**
   * Create assistants with stats
   */
  createAssistantsWithStats(): AssistantsWithStats {
    const assistants: AssistantWithStats[] = [
      {
        assistant_id: 1,
        display_name: "Sales Agent",
        agent_key: "sales_agent_v1",
        speaker_id: "voice_001",
        is_active: true,
        linked_dialing_file_id: 1,
        linked_sheet_name: "Q4 Leads",
        linked_number: "+1234567890",
        linked_number_label: "Main Line",
        total_calls: 450,
        session_calls: 45,
        leads_booked: 12,
        is_in_call: false,
      },
      {
        assistant_id: 2,
        display_name: "Support Agent",
        agent_key: "support_agent_v1",
        speaker_id: "voice_002",
        is_active: true,
        linked_dialing_file_id: null,
        linked_sheet_name: null,
        linked_number: "+1234567891",
        linked_number_label: "Support Line",
        total_calls: 850,
        session_calls: 120,
        leads_booked: 0,
        is_in_call: true,
      },
      {
        assistant_id: 3,
        display_name: "Follow-up Agent",
        agent_key: "followup_agent_v1",
        speaker_id: "voice_003",
        is_active: true,
        linked_dialing_file_id: 2,
        linked_sheet_name: "Previous Leads",
        linked_number: "+1234567892",
        linked_number_label: "Follow-up Line",
        total_calls: 320,
        session_calls: 64,
        leads_booked: 8,
        is_in_call: false,
      },
    ];

    return {
      quota: 10,
      assistants,
    };
  }

  /**
   * Create calls list
   */
  createCalls(limit = 50): CallsList {
    const calls: Call[] = [];
    for (let i = 0; i < limit; i++) {
      const startTime = new Date(Date.now() - Math.random() * 86400000);
      const endTime = new Date(startTime.getTime() + Math.random() * 1800000);
      calls.push({
        call_id: i + 1,
        user_id: 1,
        assistant_id: (i % 3) + 1,
        assistant_name: ["Sales Agent", "Support Agent", "Follow-up Agent"][i % 3],
        session_id: `session_${i}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        customer_number: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        recording_id: i,
        recording_status: "completed",
        recording_duration_seconds: Math.floor((endTime.getTime() - startTime.getTime()) / 1000),
      });
    }
    return { window: "week", calls };
  }

  /**
   * Create CRM leads
   */
  createCrmLeads(limit = 50): CrmLeadsList {
    const statuses = ["new", "contacted", "qualified", "converted", "lost"];
    const leads: CrmLead[] = [];

    for (let i = 0; i < limit; i++) {
      leads.push({
        id: i + 1,
        user_id: 1,
        customer_index: i + 1,
        customername: `Customer ${i + 1}`,
        customernumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        leadstatus: statuses[Math.floor(Math.random() * statuses.length)],
        assistantcalling: Math.random() > 0.7 ? (Math.floor(Math.random() * 3) + 1) : null,
        calltime: new Date(Date.now() - Math.random() * 604800000).toISOString(),
        callsummary: "Interested in product demo",
        notes: `Follow up after ${Math.floor(Math.random() * 7)} days`,
      });
    }

    return { leads };
  }

  /**
   * Create phone numbers
   */
  createPhoneNumbers(limit = 10): PhoneNumbersList {
    const numbers: PhoneNumber[] = [];

    for (let i = 0; i < limit; i++) {
      numbers.push({
        id: i + 1,
        user_id: 1,
        phone_number: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        label: `Line ${i + 1}`,
        assistant_id: Math.random() > 0.3 ? (Math.floor(Math.random() * 3) + 1) : null,
        assistant_name: Math.random() > 0.3 ? ["Sales Agent", "Support Agent", "Follow-up Agent"][Math.floor(Math.random() * 3)] : null,
        created_at: new Date(Date.now() - Math.random() * 2592000000).toISOString(),
        updated_at: new Date(Date.now() - Math.random() * 604800000).toISOString(),
      });
    }

    return { numbers };
  }

  /**
   * Create voices
   */
  createVoices(): VoicesList {
    const voices: Voice[] = [
      { id: 1, speaker_id: "p225", display_name: "Ethan", gender: "Male", accent: "British", visible: true, sample_url: "/voice-samples/p225.wav" },
      { id: 2, speaker_id: "p226", display_name: "Claire", gender: "Female", accent: "British", visible: true, sample_url: "/voice-samples/p226.wav" },
      { id: 3, speaker_id: "p227", display_name: "Marcus", gender: "Male", accent: "British", visible: true, sample_url: "/voice-samples/p227.wav" },
      { id: 4, speaker_id: "p228", display_name: "Lucy", gender: "Female", accent: "British", visible: true, sample_url: "/voice-samples/p228.wav" },
      { id: 5, speaker_id: "p229", display_name: "James", gender: "Male", accent: "American", visible: true, sample_url: "/voice-samples/p229.wav" },
      { id: 6, speaker_id: "p230", display_name: "Sarah", gender: "Female", accent: "American", visible: true, sample_url: "/voice-samples/p230.wav" },
      { id: 7, speaker_id: "p231", display_name: "Michael", gender: "Male", accent: "American", visible: true, sample_url: "/voice-samples/p231.wav" },
      { id: 8, speaker_id: "p232", display_name: "Emma", gender: "Female", accent: "American", visible: true, sample_url: "/voice-samples/p232.wav" },
      { id: 9, speaker_id: "v001", display_name: "Oliver", gender: "Male", accent: "Australian", visible: true, sample_url: "/voice-samples/v001.wav" },
      { id: 10, speaker_id: "v002", display_name: "Sophia", gender: "Female", accent: "Australian", visible: true, sample_url: "/voice-samples/v002.wav" },
      { id: 11, speaker_id: "v003", display_name: "Liam", gender: "Male", accent: "Canadian", visible: true, sample_url: "/voice-samples/v003.wav" },
      { id: 12, speaker_id: "v004", display_name: "Isabella", gender: "Female", accent: "Canadian", visible: true, sample_url: "/voice-samples/v004.wav" },
      { id: 13, speaker_id: "v005", display_name: "Noah", gender: "Male", accent: "Indian", visible: true, sample_url: "/voice-samples/v005.wav" },
      { id: 14, speaker_id: "v006", display_name: "Aria", gender: "Female", accent: "Indian", visible: true, sample_url: "/voice-samples/v006.wav" },
      { id: 15, speaker_id: "v007", display_name: "Lucas", gender: "Male", accent: "Spanish", visible: true, sample_url: "/voice-samples/v007.wav" },
      { id: 16, speaker_id: "v008", display_name: "Mia", gender: "Female", accent: "Spanish", visible: true, sample_url: "/voice-samples/v008.wav" },
      { id: 17, speaker_id: "v009", display_name: "Alexander", gender: "Male", accent: "British", visible: true, sample_url: "/voice-samples/v009.wav" },
      { id: 18, speaker_id: "v010", display_name: "Charlotte", gender: "Female", accent: "British", visible: true, sample_url: "/voice-samples/v010.wav" },
    ];

    return { voices };
  }

  /**
   * Create recent calls
   */
  createRecentCalls(limit = 10): CallsList {
    return this.createCalls(limit);
  }

  /**
   * Create users list
   */
  createUsers(window: "day" | "week" | "month" | "90d" = "week") {
    const users = [
      {
        user_id: 1,
        username: "dev_user",
        display_name: "Dev User",
        is_admin: true,
        total_assistants: 3,
        logins: Math.floor(Math.random() * 50) + 10,
        calls: Math.floor(Math.random() * 500) + 100,
      },
      {
        user_id: 2,
        username: "user_2",
        display_name: "Agent Smith",
        is_admin: false,
        total_assistants: 2,
        logins: Math.floor(Math.random() * 30) + 5,
        calls: Math.floor(Math.random() * 300) + 50,
      },
      {
        user_id: 3,
        username: "user_3",
        display_name: "Agent Johnson",
        is_admin: false,
        total_assistants: 1,
        logins: Math.floor(Math.random() * 20) + 3,
        calls: Math.floor(Math.random() * 200) + 30,
      },
    ];

    return { window, users };
  }

  /**
   * Create activity summary
   */
  createActivitySummary(window: "day" | "week" | "month" = "week") {
    const rows = [
      {
        user_id: 1,
        assistant_id: 1,
        assistant_name: "Sales Agent",
        logins: Math.floor(Math.random() * 50) + 10,
        calls: Math.floor(Math.random() * 200) + 50,
      },
      {
        user_id: 1,
        assistant_id: 2,
        assistant_name: "Support Agent",
        logins: Math.floor(Math.random() * 30) + 5,
        calls: Math.floor(Math.random() * 300) + 100,
      },
    ];

    return { window, rows };
  }

  /**
   * Create call volume analytics
   */
  createCallVolumeAnalytics(granularity = "day") {
    const dates = [];
    const days = granularity === "hour" ? 24 : granularity === "day" ? 30 : 12;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      if (granularity === "day") date.setDate(date.getDate() - (days - i));
      else if (granularity === "week") date.setDate(date.getDate() - (7 * (days - i)));
      else if (granularity === "month") date.setMonth(date.getMonth() - (days - i));
      dates.push(date.toISOString().split("T")[0]);
    }

    return {
      dates,
      series: [
        {
          assistant_name: "Sales Agent",
          data: dates.reduce((acc, date) => {
            acc[date] = Math.floor(Math.random() * 100) + 10;
            return acc;
          }, {} as Record<string, number>),
        },
        {
          assistant_name: "Support Agent",
          data: dates.reduce((acc, date) => {
            acc[date] = Math.floor(Math.random() * 150) + 20;
            return acc;
          }, {} as Record<string, number>),
        },
      ],
    };
  }

  /**
   * Create sentiment distribution
   */
  createSentimentDistribution() {
    return {
      sentiments: [
        { sentiment: "positive", count: Math.floor(Math.random() * 300) + 100 },
        { sentiment: "neutral", count: Math.floor(Math.random() * 200) + 50 },
        { sentiment: "negative", count: Math.floor(Math.random() * 100) + 10 },
      ],
    };
  }

  /**
   * Create leaderboard
   */
  createLeaderboard() {
    return {
      entries: [
        {
          assistant_id: 1,
          assistant_name: "Sales Agent",
          calls: Math.floor(Math.random() * 500) + 100,
          avg_duration: Math.floor(Math.random() * 600) + 120,
          leads_booked: Math.floor(Math.random() * 50) + 10,
        },
        {
          assistant_id: 2,
          assistant_name: "Support Agent",
          calls: Math.floor(Math.random() * 400) + 80,
          avg_duration: Math.floor(Math.random() * 400) + 100,
          leads_booked: Math.floor(Math.random() * 30) + 5,
        },
        {
          assistant_id: 3,
          assistant_name: "Follow-up Agent",
          calls: Math.floor(Math.random() * 300) + 50,
          avg_duration: Math.floor(Math.random() * 300) + 80,
          leads_booked: Math.floor(Math.random() * 20) + 3,
        },
      ],
    };
  }

  /**
   * Create a single assistant for detail views
   */
  createAssistant(id = 1): AssistantWithStats {
    const allAssistants = this.createAssistantsWithStats().assistants;
    return allAssistants[id - 1] || allAssistants[0];
  }

  /**
   * Create assistant detail for config page
   */
  createAssistantDetail(assistantId: number | string = 1) {
    const id = Number(assistantId);
    const assistants = this.createAssistantsWithStats().assistants;
    const assistant = assistants[(id - 1) % assistants.length] || assistants[0];

    return {
      assistant_id: id,
      display_name: assistant.display_name,
      agent_key: assistant.agent_key,
      owner_user_id: 1,
      script_text: `Hello, this is ${assistant.display_name}. How can I help you today?

I'm here to assist you with your needs. Please let me know what you're looking for.

I have the ability to understand your needs and provide helpful solutions.`,
      speaker_id: assistant.speaker_id,
      intro_message: `Hi there! I'm ${assistant.display_name}. Thanks for calling!`,
      is_active: assistant.is_active,
      created_at: new Date(Date.now() - Math.random() * 2592000000).toISOString(),
      linked_dialing_file_id: id === 1 ? 1 : null,
      bg_noise_enabled: Math.random() > 0.5,
      bg_noise_volume: Math.floor(Math.random() * 50) + 20,
      bg_noise_url: null,
    };
  }

  /**
   * Create dialing data files list
   */
  createDialingFiles(limit = 5) {
    const files = [];
    for (let i = 0; i < limit; i++) {
      files.push({
        id: i + 1,
        user_id: 1,
        original_filename: `leads_${i + 1}_${new Date(Date.now() - Math.random() * 2592000000).toLocaleDateString()}.csv`,
        headers: ["name", "phone", "email", "company"],
        row_count: Math.floor(Math.random() * 500) + 50,
        created_at: new Date(Date.now() - Math.random() * 2592000000).toISOString(),
        linked_assistant:
          i === 0
            ? {
                assistant_id: 1,
                display_name: "Sales Agent",
              }
            : null,
      });
    }
    return { files };
  }

  /**
   * Create placeholder data for a loading state
   * Useful for skeleton screens
   */
  createLoadingPlaceholder<T extends { [key: string]: unknown }>(
    shape: T
  ): T {
    const placeholder = {} as T;
    for (const key in shape) {
      const value = shape[key];
      if (typeof value === "number") {
        placeholder[key] = 0 as any;
      } else if (typeof value === "string") {
        placeholder[key] = "..." as any;
      } else if (Array.isArray(value)) {
        placeholder[key] = [] as any;
      } else if (typeof value === "object") {
        placeholder[key] = {} as any;
      }
    }
    return placeholder;
  }
}

// Export singleton instance
export const mockApiFactory = new MockApiFactory();
