import { useState } from "react";
import type { ElementType, ReactNode } from "react";
import { Bot, Clock, PhoneCall, TrendingUp } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paygApi as api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { PaygDialing } from "@/components/dashboard/PaygDialing";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type WindowKey = "day" | "week" | "90d";

const WINDOWS: { label: string; value: WindowKey }[] = [
  { label: "Today", value: "day" },
  { label: "7 Days", value: "week" },
  { label: "90 Days", value: "90d" },
];

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon: ElementType;
}) {
  return (
    <Card className="p-5 flex items-center gap-4 hover:translate-y-0 hover:shadow-elevated">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
    </Card>
  );
}

export default function PaygDashboard() {
  const [window, setWindow] = useState<WindowKey>("week");

  const windowLabel = WINDOWS.find((w) => w.value === window)?.label ?? "7 Days";

  const authed = isAuthenticated();

  const summaryQ = useQuery({
    queryKey: ["payg", "dashboard", "summary", window],
    queryFn: () => api.dashboard.summary(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: authed ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const activityQ = useQuery({
    queryKey: ["payg", "dashboard", "activity", window],
    queryFn: () => api.dashboard.activity(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  const assistantsQ = useQuery({
    queryKey: ["payg", "dashboard", "assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: authed ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const performersQ = useQuery({
    queryKey: ["payg", "dashboard", "assistants-kpis", window],
    queryFn: () => api.dashboard.assistantsKpis(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  function fmtDuration(seconds: number | null | undefined) {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  const summary = summaryQ.data
    ? {
        calls: summaryQ.data.calls,
        avg: fmtDuration(summaryQ.data.avg_duration_seconds),
        assistants: (assistantsQ.data?.assistants ?? []).filter((a) => a.is_active).length,
      }
    : { calls: "—", avg: "—", assistants: "—" };

  const activeAssistants: Array<{ name: string; status: "In call" | "Online" | "Paused" }> =
    (assistantsQ.data?.assistants ?? [])
      .slice()
      .sort((a, b) => Number(b.is_in_call) - Number(a.is_in_call))
      .slice(0, 6)
      .map((a) => ({
        name: a.display_name,
        status: a.is_in_call ? "In call" : a.is_active ? "Online" : "Paused",
      }));

  const topPerformers: Array<{ name: string; calls: number; avg: string }> =
    (performersQ.data?.assistants ?? [])
      .slice()
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 6)
      .map((a) => ({
        name: a.display_name ?? "—",
        calls: a.calls,
        avg: fmtDuration(a.avg_duration_seconds),
      }));

  const trend: Array<{ date: string; calls: number }> = (activityQ.data?.series ?? [])
    .filter((p) => p.ts)
    .map((p) => {
      const d = new Date(p.ts as string);
      const label = Number.isNaN(d.getTime()) ? String(p.ts) : d.toLocaleDateString();
      return { date: label, calls: p.calls };
    });

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-h1 text-foreground">Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{windowLabel} overview</p>
        </div>

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
      </div>

      <div data-reveal className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Calls" value={summary.calls} icon={PhoneCall} />
        <StatCard label="Avg Duration" value={summary.avg} icon={Clock} />
        <StatCard label="Active Assistants" value={summary.assistants} icon={Bot} />
      </div>

      {(summaryQ.isError || activityQ.isError || assistantsQ.isError || performersQ.isError) && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(summaryQ.error as Error)?.message ||
              (activityQ.error as Error)?.message ||
              (assistantsQ.error as Error)?.message ||
              (performersQ.error as Error)?.message ||
              "Failed to load dashboard"}
          </div>
        </div>
      )}

      <div data-reveal className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Assistants</CardTitle>
            <CardDescription>Current status overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assistantsQ.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : activeAssistants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assistants yet.</p>
            ) : (
              activeAssistants.map((a) => (
                <div key={a.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">Routing enabled</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <PaygDialing />
      </div>

      <div data-reveal className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top Performers</CardTitle>
            </div>
            <CardDescription>Assistants with the most calls this period.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {performersQ.isPending ? (
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : topPerformers.length === 0 ? (
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground">No performance data yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topPerformers.map((r) => (
                  <div key={r.name} className="flex items-center justify-between px-5 py-4 hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">Avg duration {r.avg}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{r.calls}</p>
                      <p className="text-xs text-muted-foreground">calls</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Trends</CardTitle>
            <CardDescription>Call volume over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityQ.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data yet.</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="calls"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
