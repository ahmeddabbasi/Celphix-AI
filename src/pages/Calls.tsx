import { useEffect, useMemo, useRef, useState } from "react";
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
import { Card } from "@/components/ui/card";
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
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DashboardWindow } from "@/hooks/use-dashboard-queries";
import { getErrorMessage } from "@/lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallRow = {
  call_id: number;
  user_id: number | null;
  assistant_id: number | null;
  assistant_name: string | null;
  session_id: string | null;
  start_time: string | null;
  end_time: string | null;
  customer_number: string | number | null;
  recording_id?: number | null;
  recording_status?: string | null;
  recording_duration_seconds?: number | null;
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
  doc.setFontSize(9);
  doc.text(
    `Total duration: ${fmtDuration(total)}`,
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
      const pageCount = doc.getNumberOfPages();
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Calls() {
  const [timeWindow, setTimeWindow] = useState<DashboardWindow>("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [livePolling, setLivePolling] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const [playingCallId, setPlayingCallId] = useState<number | null>(null);
  const [playingUrl, setPlayingUrl] = useState<{ callId: number; url: string } | null>(null);

  const callsQ = useDashboardCalls(timeWindow, 500);
  const loadingInitial = callsQ.isPending;
  const isRefreshing = callsQ.isFetching && !callsQ.isPending;

  const [visibleRows, setVisibleRows] = useState<CallRow[]>([]);
  useEffect(() => {
    const rows = (callsQ.data?.calls ?? []) as CallRow[];
    if (rows.length > 0) setVisibleRows(rows);
  }, [callsQ.data]);

  const lastErrRef = useRef<unknown>(null);
  useEffect(() => {
    if (!callsQ.error || callsQ.error === lastErrRef.current) return;
    lastErrRef.current = callsQ.error;
    toast({
      variant: "destructive",
      title: "Call Logs",
      description: getErrorMessage(callsQ.error, "Failed to load calls"),
    });
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

  const totalTimeSeconds = useMemo(() => totalDuration(filteredCalls), [filteredCalls]);

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
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: getErrorMessage(err, "Unknown error"),
      });
    } finally {
      setExporting(false);
    }
  }

  async function handlePlay(callId: number) {
    setPlayingCallId(callId);
    try {
      const res = await api.dashboard.callRecordingUrl(callId);
      if (!res?.url) throw new Error("Recording URL unavailable");
      setPlayingUrl({ callId, url: res.url });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Recording",
        description: getErrorMessage(err, "Failed to open recording"),
      });
    } finally {
      setPlayingCallId(null);
    }
  }

  return (
    <div className="space-y-[clamp(28px,4vw,56px)]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-h1 text-foreground">Call Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground/80">
            {windowLabel} · {filteredCalls.length} record{filteredCalls.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Period filter */}
          <div className="glass inline-flex rounded-[16px] p-1.5 gap-1 shadow-elevated">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setTimeWindow(w.value)}
                className={cn(
                  "rounded-[12px] px-4 py-2 text-sm font-semibold transition-[transform,background-color,color,box-shadow] duration-300 ease-spring active:scale-[0.97]",
                  timeWindow === w.value
                    ? "bg-background/70 text-foreground shadow-ambient"
                    : "text-muted-foreground/80 hover:text-foreground",
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
              "inline-flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-semibold transition-[transform,background-color,color,box-shadow] duration-300 ease-spring active:scale-[0.97]",
              livePolling
                ? "border-primary/30 bg-primary/10 text-primary shadow-ambient"
                : "border-border/20 bg-muted/40 text-muted-foreground/80 hover:text-foreground shadow-ambient",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                livePolling ? "bg-primary animate-pulse" : "bg-muted-foreground",
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
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-[clamp(14px,2.4vw,22px)] sm:grid-cols-3">
        <StatCard label="Total Calls" value={filteredCalls.length} icon={PhoneCall} loading={loadingInitial} />
        <StatCard label="Total Time" value={fmtDuration(totalTimeSeconds)} icon={Clock} loading={loadingInitial} />
        <StatCard label="Period" value={windowLabel} icon={CalendarDays} loading={false} />
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ID, assistant, session, customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40 border-border/20"
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
        {isRefreshing && <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden hover:translate-y-0 hover:shadow-elevated">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/20 bg-muted/20">
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider w-20">Call ID</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Assistant</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Customer #</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Duration</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Start</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">End</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-muted-foreground/80 font-semibold text-xs uppercase tracking-wider">Recording</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingInitial ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-border/20">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCalls.length === 0 ? (
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableCell colSpan={8} className="py-16 text-center">
                  <PhoneCall className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery
                      ? "No calls match your search."
                      : `No calls recorded in the last ${windowLabel.toLowerCase()}.`}
                  </p>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="mt-2 text-xs text-primary hover:underline">
                      Clear search
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredCalls.map((call) => {
                const sec = durationSeconds(call);
                const hasEnded = !!call.end_time;
                const recStatus = (call.recording_status || "").toLowerCase();
                const canPlay = recStatus === "available";
                const isPlayingHere = playingUrl?.callId === call.call_id;
                return (
                  <TableRow key={call.call_id} className="border-border/20 hover:bg-muted/25 transition-colors group">
                    <TableCell>
                      <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        #{call.call_id}
                      </code>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium text-foreground text-sm">
                        {call.assistant_name ?? <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {call.customer_number != null ? String(call.customer_number) : "—"}
                    </TableCell>

                    <TableCell>
                      <span className={cn("font-mono text-sm tabular-nums", sec != null ? "text-foreground" : "text-muted-foreground")}>
                        {fmtDuration(sec)}
                      </span>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDateTime(call.start_time)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDateTime(call.end_time)}</TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 border",
                          hasEnded
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-accent/30 bg-accent/10 text-accent-foreground",
                        )}
                      >
                        {hasEnded ? "Completed" : "Active"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {isPlayingHere ? (
                        <audio className="h-8" controls autoPlay src={playingUrl?.url} />
                      ) : canPlay ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={playingCallId === call.call_id}
                          onClick={() => handlePlay(call.call_id)}
                          className="h-8 px-3"
                        >
                          {playingCallId === call.call_id ? "Opening…" : "Play"}
                        </Button>
                      ) : call.recording_status ? (
                        <span className="text-xs text-muted-foreground">
                          {recStatus === "failed" ? "Failed" : "Processing"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {!loadingInitial && filteredCalls.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-muted/15">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredCalls.length}</span> of{" "}
              <span className="font-medium text-foreground">{visibleRows.length}</span> call{visibleRows.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Total duration:{" "}
              <span className="font-mono font-medium text-foreground">{fmtDuration(totalDuration(filteredCalls))}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
