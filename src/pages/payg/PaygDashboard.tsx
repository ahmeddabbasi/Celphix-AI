import { useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { motion } from "framer-motion";
import { Bot, Clock, PhoneCall, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type WindowKey = "day" | "week" | "month";

const WINDOWS: { label: string; value: WindowKey }[] = [
  { label: "Today", value: "day" },
  { label: "7 Days", value: "week" },
  { label: "30 Days", value: "month" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

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
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

const TREND = [
  { date: "Mar 11", calls: 9 },
  { date: "Mar 12", calls: 14 },
  { date: "Mar 13", calls: 11 },
  { date: "Mar 14", calls: 16 },
  { date: "Mar 15", calls: 12 },
  { date: "Mar 16", calls: 10 },
  { date: "Mar 17", calls: 8 },
];

const ACTIVE = [
  { name: "Inbound Sales", status: "In call" as const },
  { name: "Follow‑ups", status: "Online" as const },
  { name: "Scheduling", status: "Paused" as const },
];

const TOP = [
  { name: "Inbound Sales", calls: 128, avg: "5m 12s" },
  { name: "Follow‑ups", calls: 76, avg: "4m 08s" },
  { name: "Scheduling", calls: 22, avg: "3m 31s" },
];

export default function PaygDashboard() {
  const [window, setWindow] = useState<WindowKey>("week");

  const windowLabel = WINDOWS.find((w) => w.value === window)?.label ?? "7 Days";
  const summary = useMemo(() => {
    if (window === "day") return { calls: 6, avg: "4m 55s", assistants: 2 };
    if (window === "month") return { calls: 214, avg: "5m 02s", assistants: 4 };
    return { calls: 84, avg: "5m 12s", assistants: 3 };
  }, [window]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <div className="rounded-md bg-accent-yellow px-2 py-1 text-xs font-bold text-black">$0 credits</div>
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
      </motion.div>

      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Calls" value={summary.calls} icon={PhoneCall} />
        <StatCard label="Avg Duration" value={summary.avg} icon={Clock} />
        <StatCard label="Active Assistants" value={summary.assistants} icon={Bot} />
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Assistants</CardTitle>
            <CardDescription>Current status overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ACTIVE.map((a) => (
              <div key={a.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">Routing enabled</p>
                </div>
                <Badge
                  variant={a.status === "Paused" ? "secondary" : "default"}
                  className={a.status === "In call" ? "bg-primary text-primary-foreground" : undefined}
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dialing</CardTitle>
            <CardDescription>Start an outbound sequence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" disabled>
              Start Dialing for All
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" disabled>
                Select Assistant
              </Button>
              <Button variant="outline" disabled>
                Start Dialing
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Outbound calling is available once a number is connected.</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top Performers</CardTitle>
            </div>
            <CardDescription>Assistants with the most calls this period.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {TOP.map((r) => (
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Trends</CardTitle>
            <CardDescription>Call volume over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TREND} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
