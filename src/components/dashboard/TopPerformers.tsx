/**
 * TopPerformers — shows the best-performing assistant by calls and by
 * total duration for the selected dashboard window. Driven entirely by
 * real data from /dashboard/assistants?window=<w>.
 */

import { Trophy, PhoneCall, Clock, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssistantRow } from "@/pages/Dashboard";
import type { DashboardWindow } from "@/hooks/use-dashboard-queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function assistantName(a: AssistantRow): string {
  return a.display_name?.trim() || `Assistant #${a.assistant_id}`;
}

// ─── Single performer row ─────────────────────────────────────────────────────

function PerformerRow({
  rank,
  label,
  name,
  stat,
  icon: Icon,
}: {
  rank: 1 | 2;
  label: string;
  name: string;
  stat: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold tabular-nums text-foreground">{stat}</p>
        {rank === 1 && (
          <p className="text-[10px] text-muted-foreground">#1</p>
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopPerformersProps {
  assistants: AssistantRow[];
  loading: boolean;
  window: DashboardWindow;
}

const WINDOW_LABELS: Record<DashboardWindow, string> = {
  day:   "Today",
  week:  "Last 7 days",
  month: "Last 30 days",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TopPerformers({ assistants, loading, window }: TopPerformersProps) {
  // Best by calls
  const topByCalls = assistants.length
    ? assistants.reduce((a, b) => (b.calls > a.calls ? b : a))
    : null;

  // Best by total duration (avg × calls as proxy for total when total isn't returned)
  const topByDuration = assistants.length
    ? assistants.reduce((a, b) => {
        const durA = (a.avg_duration_seconds ?? 0) * a.calls;
        const durB = (b.avg_duration_seconds ?? 0) * b.calls;
        return durB > durA ? b : a;
      })
    : null;

  const isEmpty = !loading && assistants.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-4 w-4 text-primary" />
            Top Performers
          </CardTitle>
          <CardDescription className="text-xs">{WINDOW_LABELS[window]}</CardDescription>
        </div>
        <CardDescription>
          Best-performing assistants for the selected period.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Bot className="h-8 w-8 opacity-30" />
            <p className="text-sm">No call data for this period.</p>
            <p className="text-xs opacity-70">Start making calls to see top performers.</p>
          </div>
        ) : (
          <>
            {topByCalls && (
              <PerformerRow
                rank={1}
                label="Most Calls"
                name={assistantName(topByCalls)}
                stat={`${topByCalls.calls} calls`}
                icon={PhoneCall}
              />
            )}
            {topByDuration && (
              <PerformerRow
                rank={1}
                label="Highest Total Duration"
                name={assistantName(topByDuration)}
                stat={formatDuration(
                  (topByDuration.avg_duration_seconds ?? 0) * topByDuration.calls,
                )}
                icon={Clock}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
