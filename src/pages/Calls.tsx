import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  PhoneCall,
  Clock,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDashboardCalls } from "@/hooks/use-dashboard-queries";
import { cn } from "@/lib/utils";
import type { DashboardWindow } from "@/hooks/use-dashboard-queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallRow = {
  call_id: number;
  user_id: number | null;
  assistant_id: number | null;
  assistant_name: string | null;
  session_id: string | null;
  start_time: string | null;
  end_time: string | null;
  customer_number: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.replace("T", " ").slice(0, 19);
  }
}

function durationSeconds(call: CallRow): number | null {
  if (!call.start_time || !call.end_time) return null;
  const start = new Date(call.start_time).getTime();
  const end = new Date(call.end_time).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function totalDuration(rows: CallRow[]): number {
  return rows.reduce((acc, r) => acc + (durationSeconds(r) ?? 0), 0);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WINDOWS: { label: string; value: DashboardWindow }[] = [
  { label: "Today",   value: "day"   },
  { label: "7 Days",  value: "week"  },
  { label: "30 Days", value: "month" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0  },
};

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPdf(
  rows: CallRow[],
  windowLabel: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Celphix — Call Logs", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${windowLabel}   ·   Generated: ${generatedAt}   ·   ${rows.length} record(s)`,
    14,
    26,
  );

  const total = totalDuration(rows);
  const avgSec = rows.length ? Math.round(total / rows.length) : 0;
  doc.setFontSize(9);
  doc.text(
    `Total duration: ${fmtDuration(total)}   ·   Avg duration: ${fmtDuration(avgSec)}`,
    14,
    33,
  );

  autoTable(doc, {
    startY: 38,
    head: [["Call ID", "Customer #", "Assistant", "User ID", "Session ID", "Duration", "Start Time", "End Time"]],
    body: rows.map((c) => [
      `#${c.call_id}`,
      c.customer_number ?? "—",
      c.assistant_name ?? "—",
      c.user_id ?? "—",
      c.session_id ?? "—",
      fmtDuration(durationSeconds(c)),
      fmtDateTime(c.start_time),
      fmtDateTime(c.end_time),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 34 },
      3: { cellWidth: 18 },
      4: { cellWidth: 48 },
      5: { cellWidth: 20 },
      6: { cellWidth: 46 },
      7: { cellWidth: 46 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" },
      );
    },
  });

  doc.save(
    `celphix-call-logs-${windowLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

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
        <Icon className="h-5 w-5 text-primary" />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Calls() {
  const [timeWindow, setTimeWindow] = useState<DashboardWindow>("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [livePolling, setLivePolling] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const callsQ = useDashboardCalls(timeWindow, 500);
  const loadingInitial = callsQ.isPending;
  const isRefreshing = callsQ.isFetching && !callsQ.isPending;

  const rawRows = (callsQ.data?.calls ?? []) as CallRow[];

  const [visibleRows, setVisibleRows] = useState<CallRow[]>([]);
  useEffect(() => {
    if (rawRows.length > 0) setVisibleRows(rawRows);
  }, [rawRows]);

  const lastErrRef = useRef<unknown>(null);
  useEffect(() => {
    if (!callsQ.error || callsQ.error === lastErrRef.current) return;
    lastErrRef.current = callsQ.error;
    const e = callsQ.error as any;
    toast({ variant: "destructive", title: "Call Logs", description: e?.message ?? "Failed to load calls" });
  }, [callsQ.error, toast]);

  const [dayKey, setDayKey] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    if (!livePolling) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      const nowKey = new Date().toISOString().slice(0, 10);
      if (nowKey !== dayKey) { setDayKey(nowKey); setTimeWindow("day"); }
      try { await callsQ.refetch(); } catch { /* silent */ }
    }, 5_000);
    return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePolling, dayKey]);

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...visibleRows].sort((a, b) => {
      const at = a.start_time ? new Date(a.start_time).getTime() : NaN;
      const bt = b.start_time ? new Date(b.start_time).getTime() : NaN;
      if (isFinite(at) && isFinite(bt) && at !== bt) return bt - at;
      return b.call_id - a.call_id;
    });
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.call_id, c.assistant_name, c.user_id, c.session_id, c.customer_number]
        .join(" ").toLowerCase().includes(q),
    );
  }, [visibleRows, searchQuery]);

  const avgDuration = useMemo(() => {
    const completed = filteredCalls.filter((c) => durationSeconds(c) != null);
    if (!completed.length) return null;
    return Math.round(
      completed.reduce((a, c) => a + (durationSeconds(c) ?? 0), 0) / completed.length,
    );
  }, [filteredCalls]);

  const windowLabel =
    WINDOWS.find((w) => w.value === timeWindow)?.label ?? timeWindow;

  async function handleExport() {
    if (!filteredCalls.length) {
      toast({ title: "Nothing to export", description: "No calls in the current view." });
      return;
    }
    setExporting(true);
    try {
      await exportToPdf(filteredCalls, windowLabel);
      toast({ title: "Export complete", description: `${filteredCalls.length} record(s) saved as PDF.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export failed", description: err?.message ?? "Unknown error" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Call Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {windowLabel} · {filteredCalls.length} record{filteredCalls.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Period filter — identical to Dashboard */}
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setTimeWindow(w.value)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                  timeWindow === w.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          <button
            onClick={() => setLivePolling((v) => !v)}
            title={livePolling ? "Live polling ON — click to pause" : "Live polling OFF — click to enable"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              livePolling
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                livePolling ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground",
              )}
            />
            Live
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => callsQ.refetch()}
            disabled={loadingInitial || isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || loadingInitial}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Calls"
          value={filteredCalls.length}
          icon={PhoneCall}
          loading={loadingInitial}
        />
        <StatCard
          label="Avg Duration"
          value={fmtDuration(avgDuration)}
          icon={Clock}
          loading={loadingInitial}
        />
        <StatCard
          label="Period"
          value={windowLabel}
          icon={CalendarDays}
          loading={false}
        />
      </motion.div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ID, assistant, session, customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-border"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
        {isRefreshing && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
      </motion.div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/30">
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider w-20">
                Call ID
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Assistant
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Customer #
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Duration
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Start
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                End
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                Session
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingInitial ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-border">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCalls.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={8} className="py-16 text-center">
                  <PhoneCall className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery
                      ? "No calls match your search."
                      : `No calls recorded in the last ${windowLabel.toLowerCase()}.`}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredCalls.map((call) => {
                const sec = durationSeconds(call);
                const hasEnded = !!call.end_time;
                return (
                  <TableRow
                    key={call.call_id}
                    className="border-border hover:bg-muted/30 transition-colors group"
                  >
                    <TableCell>
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        #{call.call_id}
                      </code>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium text-foreground text-sm">
                        {call.assistant_name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {call.customer_number ?? "—"}
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "font-mono text-sm tabular-nums",
                          sec != null ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {fmtDuration(sec)}
                      </span>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(call.start_time)}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(call.end_time)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 border",
                          hasEnded
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {hasEnded ? "Completed" : "Active"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[160px] block group-hover:text-foreground transition-colors">
                        {call.session_id ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {!loadingInitial && filteredCalls.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{filteredCalls.length}</span> of{" "}
              <span className="font-medium text-foreground">{visibleRows.length}</span>{" "}
              call{visibleRows.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Total duration:{" "}
              <span className="font-mono font-medium text-foreground">
                {fmtDuration(totalDuration(filteredCalls))}
              </span>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
