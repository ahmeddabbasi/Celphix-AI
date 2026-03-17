import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Clock,
  CalendarDays,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type WindowKey = "day" | "week" | "month";

const WINDOWS: { label: string; value: WindowKey }[] = [
  { label: "Today", value: "day" },
  { label: "7 Days", value: "week" },
  { label: "30 Days", value: "month" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

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

const CALLS: PaygCallRow[] = [
  {
    id: 1042,
    customer: "+1 (555) 010-2001",
    assistant: "Inbound Sales",
    session: "S-7H2K9",
    start: "Mar 17, 2026 10:14",
    end: "Mar 17, 2026 10:22",
    duration: "8:12",
    status: "Completed",
  },
  {
    id: 1041,
    customer: "+1 (555) 010-2044",
    assistant: "Follow‑ups",
    session: "S-7H2K1",
    start: "Mar 17, 2026 09:40",
    end: "Mar 17, 2026 09:46",
    duration: "6:03",
    status: "Completed",
  },
  {
    id: 1040,
    customer: "+1 (555) 010-1188",
    assistant: "Scheduling",
    session: "S-7H1ZZ",
    start: "Mar 16, 2026 16:05",
    end: "—",
    duration: "—",
    status: "Missed",
  },
  {
    id: 1039,
    customer: "+1 (555) 010-3030",
    assistant: "Inbound Sales",
    session: "S-7H1XY",
    start: "Mar 16, 2026 15:18",
    end: "Mar 16, 2026 15:21",
    duration: "2:41",
    status: "Completed",
  },
];

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
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

export default function PaygCalls() {
  const [window, setWindow] = useState<WindowKey>("day");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CALLS;
    return CALLS.filter((c) =>
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
  }, [search]);

  const totalCalls = rows.length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const avg = completed ? "5:18" : "—";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calls</h1>
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
      </motion.div>

      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Calls" value={totalCalls} icon={PhoneCall} />
        <StatCard label="Completed" value={completed} icon={CalendarDays} />
        <StatCard label="Avg Duration" value={avg} icon={Clock} />
      </motion.div>

      <motion.div variants={item}>
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

                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Download className="h-4 w-4" />
                  Export
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
                {rows.map((c) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
