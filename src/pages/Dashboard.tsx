import { motion } from "framer-motion";
import { useMemo } from "react";
import { PhoneCall, Clock, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  useDashboardSummary,
  useDashboardAssistantsKpis,
  type DashboardWindow,
} from "@/hooks/use-dashboard-queries";
import { ActivityTrendsChart } from "@/components/dashboard/ActivityTrendsChart";
import { SessionInfo } from "@/components/dashboard/SessionInfo";
import { ActiveAssistants } from "@/components/dashboard/ActiveAssistants";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardSummaryResponse {
  window: DashboardWindow;
  calls: number;
  unique_assistants: number;
  avg_duration_seconds: number | null;
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

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

// ─── Window filter pills ──────────────────────────────────────────────────────

const WINDOWS: { label: string; value: DashboardWindow }[] = [
  { label: "Today",   value: "day"   },
  { label: "7 Days",  value: "week"  },
  { label: "30 Days", value: "month" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0  },
};

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
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-6 w-20" />
        ) : (
          <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
        )}
      </div>
    </div>
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {WINDOWS.find((w) => w.value === window)?.label} overview
          </p>
        </div>

        {/* Period filter */}
        <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                window === w.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Summary metrics ────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Calls"
          value={summary?.calls ?? "—"}
          icon={PhoneCall}
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(summary?.avg_duration_seconds ?? null)}
          icon={Clock}
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Active Assistants"
          value={summary?.unique_assistants ?? "—"}
          icon={Bot}
          loading={summaryQ.isLoading}
        />
      </motion.div>

      {/* ── Active assistants + Session info ───────────────────────────── */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <ActiveAssistants />
        <SessionInfo />
      </motion.div>

      {/* ── Top performers + Activity trends ───────────────────────────── */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <TopPerformers assistants={assistants} loading={assistantsQ.isLoading} window={window} />
        <ActivityTrendsChart />
      </motion.div>

    </motion.div>
  );
}

