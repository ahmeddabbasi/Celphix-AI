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
import { motion } from "framer-motion";
import { BarChart3, CalendarIcon, PieChartIcon, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type RangeKey = "7d" | "30d" | "90d";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const LINE_COLORS = [
  "#008613",
  "#FFEA00",
  "#008613",
  "#FFEA00",
];

const PIE_COLORS = [
  "#008613",
  "#FFEA00",
  "#0a2a0a",
  "#94a3b8",
];

const SERIES = [
  { key: "Inbound Sales", color: LINE_COLORS[0] },
  { key: "Follow‑ups", color: LINE_COLORS[1] },
];

const BASE_LINE = [
  { date: "Mar 11", "Inbound Sales": 8, "Follow‑ups": 3 },
  { date: "Mar 12", "Inbound Sales": 11, "Follow‑ups": 5 },
  { date: "Mar 13", "Inbound Sales": 9, "Follow‑ups": 7 },
  { date: "Mar 14", "Inbound Sales": 13, "Follow‑ups": 6 },
  { date: "Mar 15", "Inbound Sales": 10, "Follow‑ups": 8 },
  { date: "Mar 16", "Inbound Sales": 12, "Follow‑ups": 4 },
  { date: "Mar 17", "Inbound Sales": 7, "Follow‑ups": 2 },
];

const PIE = [
  { name: "Interested", value: 42 },
  { name: "Not interested", value: 28 },
  { name: "No answer", value: 18 },
  { name: "Voicemail", value: 12 },
];

const LEADERBOARD = [
  { rank: 1, name: "Inbound Sales", calls: 128, interested: 54, conv: "42%", score: 92 },
  { rank: 2, name: "Follow‑ups", calls: 76, interested: 29, conv: "38%", score: 81 },
  { rank: 3, name: "Scheduling", calls: 22, interested: 7, conv: "32%", score: 64 },
];

function RankBadge({ rank }: { rank: number }) {
  const base = "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold";
  if (rank === 1) return <div className={cn(base, "bg-accent text-accent-foreground")}>1</div>;
  if (rank === 2) return <div className={cn(base, "bg-primary/30 text-primary-foreground")}>2</div>;
  if (rank === 3) return <div className={cn(base, "bg-primary/15 text-primary")}>3</div>;
  return <div className={cn(base, "bg-muted text-muted-foreground")}>{rank}</div>;
}

export default function PaygAnalytics() {
  const [range, setRange] = useState<RangeKey>("7d");

  const lineChartData = useMemo(() => {
    if (range === "7d") return BASE_LINE;
    if (range === "30d") {
      return BASE_LINE.map((r, i) => ({
        ...r,
        "Inbound Sales": r["Inbound Sales"] + (i % 2 === 0 ? 2 : 0),
        "Follow‑ups": r["Follow‑ups"] + (i % 3 === 0 ? 1 : 0),
      }));
    }
    return BASE_LINE.map((r, i) => ({
      ...r,
      "Inbound Sales": r["Inbound Sales"] + (i % 2 === 0 ? 4 : 1),
      "Follow‑ups": r["Follow‑ups"] + (i % 3 === 0 ? 2 : 0),
    }));
  }, [range]);

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trends and performance.</p>
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
              <Button variant={range === "7d" ? "secondary" : "ghost"} size="sm" className="w-full justify-start" onClick={() => setRange("7d")}>
                Last 7 days
              </Button>
              <Button variant={range === "30d" ? "secondary" : "ghost"} size="sm" className="w-full justify-start" onClick={() => setRange("30d")}>
                Last 30 days
              </Button>
              <Button variant={range === "90d" ? "secondary" : "ghost"} size="sm" className="w-full justify-start" onClick={() => setRange("90d")}>
                Last 90 days
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Call Volume</CardTitle>
            </div>
            <CardDescription>Daily calls by assistant.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  {SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Outcomes</CardTitle>
            </div>
            <CardDescription>Distribution by result.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2}>
                    {PIE.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Leaderboard</CardTitle>
            </div>
            <CardDescription>Top assistants by performance.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Rank", "Assistant", "Calls", "Interested", "Conv%", "Score"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((r) => (
                  <tr key={r.rank} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.calls}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.interested}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.conv}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
