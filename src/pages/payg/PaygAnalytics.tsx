import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CalendarIcon, TrendingUp, PieChartIcon, Trophy } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { paygApi as api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

type RangeKey = "7d" | "30d" | "90d";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--border))",
];

export default function PaygAnalytics() {
  const [range, setRange] = useState<RangeKey>("7d");
  const authed = isAuthenticated();

  const window: "day" | "week" | "month" = range === "7d" ? "day" : range === "30d" ? "week" : "month";
  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days";

  const summaryQ = useQuery({
    queryKey: ["payg", "analytics", "summary", window],
    queryFn: () => api.dashboard.summary(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: authed ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const activityQ = useQuery({
    queryKey: ["payg", "analytics", "activity", window],
    queryFn: () => api.dashboard.activity(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  const topEventsQ = useQuery({
    queryKey: ["payg", "analytics", "top-events", window],
    queryFn: () => api.dashboard.topEvents(window, 8),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  const assistantsKpisQ = useQuery({
    queryKey: ["payg", "analytics", "assistants-kpis", window],
    queryFn: () => api.dashboard.assistantsKpis(window),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  function fmtDuration(seconds: number | null | undefined) {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  const lineChartData = useMemo(() => {
    const series = activityQ.data?.series ?? [];
    return series
      .filter((p) => p.ts)
      .map((p) => {
        const d = new Date(p.ts as string);
        const label = Number.isNaN(d.getTime())
          ? String(p.ts)
          : window === "day"
            ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString();
        return { date: label, calls: p.calls, events: p.events };
      });
  }, [activityQ.data, window]);

  const eventDistribution = useMemo(() => {
    return (topEventsQ.data?.events ?? []).map((e) => ({ name: e.event_type, value: e.count }));
  }, [topEventsQ.data]);

  const leaderboardRows = useMemo(() => {
    return (assistantsKpisQ.data?.assistants ?? [])
      .slice()
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10)
      .map((a, idx) => ({
        rank: idx + 1,
        name: a.display_name ?? "—",
        calls: a.calls,
        avg: fmtDuration(a.avg_duration_seconds),
        last: a.last_call_at ? new Date(a.last_call_at).toLocaleString() : "—",
      }));
  }, [assistantsKpisQ.data]);

  const totalCalls = summaryQ.data?.calls ?? 0;
  const totalEvents = summaryQ.data?.events ?? 0;
  const topPerformer = leaderboardRows[0] ?? null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-h1 text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance insights across your assistants</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <div className="space-y-1">
              <Button
                variant={range === "7d" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setRange("7d")}
              >
                Last 7 days
              </Button>
              <Button
                variant={range === "30d" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setRange("30d")}
              >
                Last 30 days
              </Button>
              <Button
                variant={range === "90d" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setRange("90d")}
              >
                Last 90 days
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div data-reveal className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Captured system events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{topPerformer ? topPerformer.name : "—"}</div>
            <p className="text-xs text-muted-foreground">
              {topPerformer ? `${topPerformer.calls} calls · avg ${topPerformer.avg}` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {(summaryQ.isError || activityQ.isError || topEventsQ.isError || assistantsKpisQ.isError) && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(summaryQ.error as Error)?.message ||
              (activityQ.error as Error)?.message ||
              (topEventsQ.error as Error)?.message ||
              (assistantsKpisQ.error as Error)?.message ||
              "Failed to load analytics"}
          </div>
        </div>
      )}

      <div data-reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Call Volume</CardTitle>
            <CardDescription>Calls and events over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityQ.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : lineChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analytics data yet.</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="events" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Types</CardTitle>
            <CardDescription>Top event distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            {topEventsQ.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : eventDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {eventDistribution.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div data-reveal>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Leaderboard</CardTitle>
            </div>
            <CardDescription>Top assistants by call volume.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {[
                    "Rank",
                    "Assistant",
                    "Calls",
                    "Avg",
                    "Last Call",
                  ].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2 text-left font-medium text-muted-foreground",
                        h === "Last Call" && "hidden lg:table-cell",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assistantsKpisQ.isPending ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : leaderboardRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No leaderboard data yet.
                    </td>
                  </tr>
                ) : (
                  leaderboardRows.map((r) => (
                    <tr key={r.rank} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.calls}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.avg}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{r.last}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
