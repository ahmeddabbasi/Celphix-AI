import { useMemo, useState } from "react";
import { PhoneCall, Clock, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  useDashboardSummary,
  useDashboardAssistantsKpis,
  type DashboardWindow,
} from "@/hooks/use-dashboard-queries";
import { ActivityTrendsChart } from "@/components/dashboard/ActivityTrendsChart";
import { ActiveAssistants } from "@/components/dashboard/ActiveAssistants";
import { Dialing } from "@/components/dashboard/Dialing";
import { TopPerformers } from "@/components/dashboard/TopPerformers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardSummaryResponse {
  window: DashboardWindow;
  calls: number;
  unique_assistants: number;
  avg_duration_seconds: number | null;
  total_time_seconds?: number | null;
}

export interface AssistantRow {
  assistant_id: number;
  display_name: string | null;
  agent_key: string | null;
  calls: number;
  avg_duration_seconds: number | null;
  last_call_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

// ─── Window filter pills ──────────────────────────────────────────────────────

const WINDOWS: { label: string; value: DashboardWindow }[] = [
  { label: "Today",   value: "day"   },
  { label: "7 Days",  value: "week"  },
  { label: "30 Days", value: "month" },
  { label: "90 Days", value: "90d" },
];

// ─── Metric card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card className="group p-[clamp(18px,2.8vw,28px)]">
      <div className="flex items-center gap-[clamp(12px,2vw,18px)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/10">
          <Icon className="h-5 w-5 text-primary transition-transform duration-300 ease-spring group-hover:rotate-[8deg] group-hover:scale-[1.1]" />
        </div>
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground/70">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1 font-display text-h3 font-semibold text-foreground">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [window, setWindow] = useState<DashboardWindow>("week");

  const summaryQ    = useDashboardSummary(window);
  const assistantsQ = useDashboardAssistantsKpis(window);

  const summary    = (summaryQ.data ?? null) as DashboardSummaryResponse | null;
  const assistants = useMemo(
    () => (assistantsQ.data?.assistants ?? []) as AssistantRow[],
    [assistantsQ.data],
  );

  return (
    <div className="space-y-[clamp(28px,4vw,56px)]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-h1 text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground/80">
            {WINDOWS.find((w) => w.value === window)?.label} overview
          </p>
        </div>

        {/* Period filter */}
        <div className="glass inline-flex rounded-[16px] p-1.5 gap-1 shadow-elevated">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={cn(
                "rounded-[12px] px-4 py-2 text-sm font-semibold transition-[transform,background-color,color,box-shadow] duration-300 ease-spring active:scale-[0.97]",
                window === w.value
                  ? "bg-background/70 text-foreground shadow-ambient"
                  : "text-muted-foreground/80 hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary metrics ────────────────────────────────────────────── */}
      <div className="grid gap-[clamp(14px,2.4vw,22px)] sm:grid-cols-3">
        <StatCard
          label="Total Calls"
          value={summary?.calls ?? "—"}
          icon={PhoneCall}
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Total Time"
          value={formatTime(summary?.total_time_seconds ?? null)}
          icon={Clock}
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Active Assistants"
          value={summary?.unique_assistants ?? "—"}
          icon={Bot}
          loading={summaryQ.isLoading}
        />
      </div>

      {/* ── Active assistants + Session info ───────────────────────────── */}
      <div className="grid grid-cols-12 gap-[clamp(14px,2.4vw,22px)]">
        <div className="col-span-12 lg:col-span-7">
          <ActiveAssistants />
        </div>
        <div className="hidden lg:block lg:col-span-1" aria-hidden="true" />
        <div className="col-span-12 lg:col-span-4">
          <Dialing />
        </div>
      </div>

      {/* ── Top performers + Activity trends ───────────────────────────── */}
      <div className="grid grid-cols-12 gap-[clamp(14px,2.4vw,22px)]">
        <div className="col-span-12 lg:col-span-7">
          <TopPerformers assistants={assistants} loading={assistantsQ.isLoading} window={window} />
        </div>
        <div className="hidden lg:block lg:col-span-1" aria-hidden="true" />
        <div className="col-span-12 lg:col-span-4">
          <ActivityTrendsChart />
        </div>
      </div>
    </div>
  );
}

