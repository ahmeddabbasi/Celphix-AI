/**
 * Activity Trends Chart — professional line graph of daily call volume.
 * Supports 7 / 30 / 90 day views. Fully data-driven from /api/activity/trends.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, BarChart2 } from "lucide-react";
import { useActivityTrends } from "@/hooks/use-milestone-queries";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Period options ───────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

type TooltipPayloadLike = { payload: Record<string, unknown> };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadLike[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { call_count?: number; avg_duration?: number };
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1 text-foreground">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">Calls</span>
        <span className="font-bold text-foreground">{d.call_count ?? 0}</span>
      </div>
      {(d.avg_duration ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Avg duration</span>
          <span className="font-bold text-foreground">{Math.round(d.avg_duration ?? 0)}s</span>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityTrendsChart() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useActivityTrends(days);

  const chartData = useMemo(() => {
    if (!data?.trends) return [];
    return [...data.trends].reverse();
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Activity Trends
            </CardTitle>
            <CardDescription className="mt-0.5">
              {isLoading
                ? "Loading…"
                : data
                ? `${data.total_calls} calls · ${data.avg_daily_calls.toFixed(1)} avg/day`
                : "Call volume over time"}
            </CardDescription>
          </div>

          {/* Period pills */}
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1 shrink-0">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  days === p.days
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <BarChart2 className="h-8 w-8 text-muted-foreground animate-pulse" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 className="h-8 w-8 opacity-30" />
            <p className="text-sm">No call data for this period.</p>
          </div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => format(parseISO(v), days <= 7 ? "EEE" : "MMM d")}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="call_count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

