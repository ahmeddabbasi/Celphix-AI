import { useState, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, PieChartIcon, Trophy, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { AnalyticsDashboardSkeleton } from "@/components/ui/skeletons";
import {
  useCallVolumeAnalytics,
  useSentimentDistribution,
  useLeaderboard,
  type DateRange,
} from "@/hooks/use-analytics-queries";
import { cn } from "@/lib/utils";

// ── Empty state illustrations ─────────────────────────────────────────────────

/** Ghost line-chart: faded axes + a flat dashed line + label */
function EmptyLineChart() {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center gap-3 select-none">
      <svg width="260" height="160" viewBox="0 0 260 160" className="opacity-25">
        {/* Y axis */}
        <line x1="30" y1="10" x2="30" y2="130" stroke="currentColor" strokeWidth="1.5" />
        {/* X axis */}
        <line x1="30" y1="130" x2="240" y2="130" stroke="currentColor" strokeWidth="1.5" />
        {/* Y ticks */}
        {[130, 97, 64, 30].map((y, i) => (
          <g key={i}>
            <line x1="24" y1={y} x2="30" y2={y} stroke="currentColor" strokeWidth="1" />
            <rect x="2" y={y - 5} width="18" height="8" rx="2" fill="currentColor" opacity="0.3" />
          </g>
        ))}
        {/* X ticks */}
        {[60, 100, 140, 180, 220].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="130" x2={x} y2="136" stroke="currentColor" strokeWidth="1" />
            <rect x={x - 12} y="139" width="24" height="7" rx="2" fill="currentColor" opacity="0.3" />
          </g>
        ))}
        {/* Ghost flat line */}
        <line
          x1="30" y1="80" x2="240" y2="80"
          stroke="currentColor" strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.35"
        />
        {/* Ghost second flat line offset */}
        <line
          x1="30" y1="100" x2="240" y2="100"
          stroke="currentColor" strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.2"
        />
      </svg>
      <p className="text-sm font-medium text-muted-foreground">No call data for this period</p>
      <p className="text-xs text-muted-foreground/60">Adjust the date range or wait for calls to come in</p>
    </div>
  );
}

/** Ghost donut: faded full ring + centre hole + label */
function EmptyPieChart() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-3 select-none">
      <div className="relative w-32 h-32 opacity-20">
        <div className="w-full h-full rounded-full border-[20px] border-dashed border-muted-foreground" />
        <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-card" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No interest data</p>
      <p className="text-xs text-muted-foreground/60">Interest values will appear here once calls are logged</p>
    </div>
  );
}

/** Ghost table: faded header + placeholder rows */
function EmptyLeaderboard() {
  const cols = ["w-8", "w-28", "w-12", "w-14", "w-12", "w-10"];
  return (
    <div className="select-none">
      <table className="w-full text-sm opacity-30 pointer-events-none">
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
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-b last:border-0">
              {cols.map((w, j) => (
                <td key={j} className="px-4 py-3">
                  <div className={cn("h-4 rounded bg-muted", w)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col items-center gap-1 py-6">
        <p className="text-sm font-medium text-muted-foreground">No assistants ranked yet</p>
        <p className="text-xs text-muted-foreground/60">Rankings appear once calls are recorded</p>
      </div>
    </div>
  );
}

// ── Color palettes ────────────────────────────────────────────────────────────
const LINE_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

// ── Date-range picker ─────────────────────────────────────────────────────────
interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePreset = (days: number | null) => {
    if (days === null) {
      onChange({ startDate: null, endDate: null });
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      onChange({
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      });
    }
    setIsOpen(false);
  };

  const label =
    dateRange.startDate && dateRange.endDate
      ? `${format(new Date(dateRange.startDate), "MMM d, yyyy")} – ${format(new Date(dateRange.endDate), "MMM d, yyyy")}`
      : "All time";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">
        <p className="font-semibold mb-2 text-sm">Quick presets</p>
        <div className="flex flex-col gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant="ghost" size="sm" onClick={() => handlePreset(d)}>
              Last {d} days
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => handlePreset(null)}>
            All time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const base = "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold";
  if (rank === 1) return <div className={cn(base, "bg-yellow-400 text-yellow-900")}>1</div>;
  if (rank === 2) return <div className={cn(base, "bg-slate-300 text-slate-700")}>2</div>;
  if (rank === 3) return <div className={cn(base, "bg-orange-400 text-orange-900")}>3</div>;
  return <div className={cn(base, "bg-muted text-muted-foreground")}>{rank}</div>;
}

// ── Custom pie label ──────────────────────────────────────────────────────────
const renderPieLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, label, percentage,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5 + 16;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percentage < 4) return null; // skip tiny slices
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  const { data: cvData, isLoading: cvLoading, error: cvError } = useCallVolumeAnalytics(dateRange, "day");
  const { data: sentData, isLoading: sentLoading, error: sentError } = useSentimentDistribution(dateRange);
  const { data: lbData, isLoading: lbLoading, error: lbError } = useLeaderboard(dateRange);

  // Build Recharts-friendly array: [{date, AssistantA: n, AssistantB: m, ...}]
  const lineChartData = useMemo(() => {
    if (!cvData?.dates?.length) return [];
    return cvData.dates.map((date) => {
      const row: Record<string, string | number> = { date };
      cvData.series.forEach((s) => {
        row[s.assistant_name] = s.data[date] ?? 0;
      });
      return row;
    });
  }, [cvData]);

  const isLoading = cvLoading || sentLoading || lbLoading;
  if (isLoading) return <AnalyticsDashboardSkeleton />;

  const anyError = cvError || sentError || lbError;
  if (anyError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error loading analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(cvError as Error)?.message ?? (sentError as Error)?.message ?? (lbError as Error)?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCalls = cvData?.total_calls ?? 0;
  const totalLeads = sentData?.total ?? 0;
  const topPerformer = lbData?.top_performer ?? null;
  const leaderboard = lbData?.leaderboard ?? [];
  const sentimentRows = sentData?.data ?? [];
  const assistantSeries = cvData?.series ?? [];

  const formatDate = (d: string) => {
    try { return format(new Date(d), "MMM d"); } catch { return d; }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Performance insights across all assistants</p>
        </div>
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange.startDate
                ? `${format(new Date(dateRange.startDate), "MMM d")} – ${format(new Date(dateRange.endDate!), "MMM d")}`
                : "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads Contacted</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {topPerformer ? topPerformer.assistant_name : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPerformer
                ? `${topPerformer.total_calls} calls · ${topPerformer.conversion_rate.toFixed(1)}% conv.`
                : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call volume — multi-line chart */}
      <Card>
        <CardHeader>
          <CardTitle>Call Volume</CardTitle>
          <CardDescription>Daily calls per assistant</CardDescription>
        </CardHeader>
        <CardContent>
          {lineChartData.length === 0 ? (
            <EmptyLineChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  minTickGap={30}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {assistantSeries.map((s, i) => (
                  <Line
                    key={s.assistant_id}
                    type="monotone"
                    dataKey={s.assistant_name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: Sentiment + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sentiment / Interest Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Interest Distribution</CardTitle>
            <CardDescription>Raw lead interest values</CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentRows.length === 0 ? (
              <EmptyPieChart />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={sentimentRows}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={44}
                      dataKey="count"
                      nameKey="label"
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {sentimentRows.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} leads`, name]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="mt-2 flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                  {sentimentRows.map((row, i) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate max-w-[120px]">{row.label}</span>
                      </div>
                      <span className="text-muted-foreground ml-2">
                        {row.count} ({row.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Assistants Leaderboard</CardTitle>
            <CardDescription>Ranked by calls + conversion rate</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <EmptyLeaderboard />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Rank</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Assistant</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Calls</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Interested</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Conv%</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr key={row.assistant_id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2">
                          <RankBadge rank={row.rank} />
                        </td>
                        <td className="px-4 py-2 font-medium truncate max-w-[140px]">
                          {row.assistant_name}
                        </td>
                        <td className="px-4 py-2 text-right">{row.total_calls.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{row.interested_count.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center gap-0.5">
                            {row.conversion_rate >= 50 ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            ) : row.conversion_rate < 25 ? (
                              <ArrowDownRight className="h-3 w-3 text-red-500" />
                            ) : null}
                            {row.conversion_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">
                          {row.score.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
