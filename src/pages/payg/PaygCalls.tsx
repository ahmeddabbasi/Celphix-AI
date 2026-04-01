import { useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  PhoneCall,
  Clock,
  CalendarDays,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { paygApi as api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WindowKey = "day" | "week" | "90d";

const WINDOWS: { label: string; value: WindowKey }[] = [
  { label: "Today", value: "day" },
  { label: "7 Days", value: "week" },
  { label: "90 Days", value: "90d" },
];

type PaygCallRow = {
  id: number;
  customer: string;
  assistant: string;
  session: string;
  start: string;
  end: string;
  duration: string;
  status: "Completed" | "Missed" | "In progress";
};

async function exportToPdf(rows: PaygCallRow[], windowLabel: string): Promise<void> {
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
  doc.text("PAYG — Call Logs", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${windowLabel}   ·   Generated: ${generatedAt}   ·   ${rows.length} record(s)`,
    14,
    26,
  );

  autoTable(doc, {
    startY: 34,
    head: [["Call", "Customer", "Assistant", "Session", "Duration", "Start", "End", "Status"]],
    body: rows.map((r) => [
      `#${r.id}`,
      r.customer,
      r.assistant,
      r.session,
      r.duration,
      r.start,
      r.end,
      r.status,
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
      0: { cellWidth: 14 },
      1: { cellWidth: 26 },
      2: { cellWidth: 34 },
      3: { cellWidth: 44 },
      4: { cellWidth: 16 },
      5: { cellWidth: 48 },
      6: { cellWidth: 48 },
      7: { cellWidth: 20 },
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

  doc.save(`payg-call-logs-${windowLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtDurationSeconds(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function diffSeconds(startIso: string | null | undefined, endIso: string | null | undefined) {
  if (!startIso || !endIso) return null;
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const seconds = Math.max(0, Math.round((b - a) / 1000));
  return seconds;
}

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

export default function PaygCalls() {
  const [window, setWindow] = useState<WindowKey>("day");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const authed = isAuthenticated();

  const { data, isPending, isFetching, refetch, isError, error } = useQuery({
    queryKey: ["payg", "calls", window],
    queryFn: () => api.dashboard.calls(window, 200),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: authed ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const calls = data?.calls ?? [];
  const callRows: PaygCallRow[] = useMemo(() => {
    return calls.map((c) => {
      const start = c.start_time;
      const end = c.end_time;
      const durSeconds = diffSeconds(start, end);

      const status: PaygCallRow["status"] =
        start == null
          ? "Missed"
          : end == null
            ? "In progress"
            : "Completed";

      return {
        id: c.call_id,
        customer: c.customer_number != null ? String(c.customer_number) : "—",
        assistant: c.assistant_name ?? "—",
        session: c.session_id ?? "—",
        start: fmtDateTime(start),
        end: fmtDateTime(end),
        duration: fmtDurationSeconds(durSeconds),
        status,
      };
    });
  }, [calls]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return callRows;
    return callRows.filter((c) =>
      [
        String(c.id),
        c.customer,
        c.assistant,
        c.session,
        c.start,
        c.end,
        c.status,
      ].some((v) => v.toLowerCase().includes(q)),
    );
  }, [callRows, search]);

  const totalCalls = rows.length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const totalTime = useMemo(() => {
    const durations = rows
      .filter((r) => r.status === "Completed")
      .map((r) => {
        const parts = r.duration.split(":");
        if (parts.length !== 2) return null;
        const m = Number(parts[0]);
        const s = Number(parts[1]);
        if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
        return m * 60 + s;
      })
      .filter((v): v is number => v != null);
    if (durations.length === 0) return "—";
    const totalSeconds = durations.reduce((a, b) => a + b, 0);
    return fmtDurationSeconds(totalSeconds);
  }, [rows]);

  const windowLabel = WINDOWS.find((w) => w.value === window)?.label ?? "Today";

  async function handleExport() {
    if (rows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    setExporting(true);
    try {
      await exportToPdf(rows, windowLabel);
      toast.success(`Exported ${rows.length} record(s) as PDF.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-h1 text-foreground">Calls</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Call logs and outcomes.</p>
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
        <StatCard label="Total Calls" value={totalCalls} icon={PhoneCall} />
        <StatCard label="Completed" value={completed} icon={CalendarDays} />
        <StatCard label="Total Time" value={totalTime} icon={Clock} />
      </div>

      {isError && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load calls"}
          </div>
        </div>
      )}

      <div data-reveal>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Call Logs</CardTitle>
                <CardDescription>Search and review recent calls.</CardDescription>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search calls…"
                    className="pl-9 h-9"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => refetch()}
                  disabled={isPending || isFetching || exporting}
                >
                  <RefreshCw className={cn("h-4 w-4", isFetching && !isPending && "animate-spin")} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExport}
                  disabled={exporting || isPending}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Exporting…" : "Export PDF"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assistant</TableHead>
                  <TableHead className="hidden md:table-cell">Session</TableHead>
                  <TableHead className="hidden lg:table-cell">Start</TableHead>
                  <TableHead className="hidden lg:table-cell">End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No calls yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground">#{c.id}</TableCell>
                      <TableCell className="text-muted-foreground">{c.customer}</TableCell>
                      <TableCell className="text-muted-foreground">{c.assistant}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground font-mono">{c.session}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{c.start}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{c.end}</TableCell>
                      <TableCell className="text-muted-foreground">{c.duration}</TableCell>
                      <TableCell className="text-muted-foreground">{c.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
