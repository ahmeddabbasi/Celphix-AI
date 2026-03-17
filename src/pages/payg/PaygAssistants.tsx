import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  PhoneCall,
  TrendingUp,
  RefreshCw,
  Search,
  Mic,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

type PaygAssistant = {
  id: number;
  name: string;
  agentKey: string;
  voice: string;
  number: string | null;
  status: "Active" | "Paused";
  inCall: boolean;
  totalCalls: number;
  sessionCalls: number;
  leadsBooked: number;
};

const ASSISTANTS: PaygAssistant[] = [
  {
    id: 1,
    name: "Inbound Sales",
    agentKey: "sales_inbound",
    voice: "Ava (American)",
    number: "+1 (555) 013-2041",
    status: "Active",
    inCall: true,
    totalCalls: 128,
    sessionCalls: 6,
    leadsBooked: 14,
  },
  {
    id: 2,
    name: "Follow‑ups",
    agentKey: "followups",
    voice: "Noah (British)",
    number: "+1 (555) 010-9902",
    status: "Active",
    inCall: false,
    totalCalls: 76,
    sessionCalls: 2,
    leadsBooked: 8,
  },
  {
    id: 3,
    name: "Scheduling",
    agentKey: "scheduling",
    voice: "Mia (Australian)",
    number: null,
    status: "Paused",
    inCall: false,
    totalCalls: 22,
    sessionCalls: 0,
    leadsBooked: 3,
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

function ActiveNowCard({ a }: { a: PaygAssistant }) {
  return (
    <motion.div
      layout
      variants={item}
      className={cn(
        "relative flex-shrink-0 w-44 h-44 rounded-2xl border",
        "bg-gradient-to-br from-primary/10 to-card",
        "border-primary/40 shadow-lg shadow-primary/10",
        "flex flex-col justify-between p-4 overflow-hidden",
      )}
    >
      {a.inCall && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      )}

      <div>
        <PhoneCall className="h-5 w-5 text-primary mb-2" />
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{a.name}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-primary/80">
          <TrendingUp className="h-3 w-3" />
          <span>{a.totalCalls} total</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-primary/80">
          <Phone className="h-3 w-3" />
          <span>{a.sessionCalls} this session</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PaygAssistants() {
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ASSISTANTS;
    return ASSISTANTS.filter((a) =>
      [a.name, a.agentKey, a.voice, a.number ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [search]);

  const total = ASSISTANTS.length;
  const active = ASSISTANTS.filter((a) => a.status === "Active").length;
  const inCall = ASSISTANTS.filter((a) => a.inCall).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your assistants and routing.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" className="gap-2" disabled>
            <Bot className="h-4 w-4" />
            Add Assistant
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Assistants" value={total} icon={Bot} />
        <StatCard label="Active" value={active} icon={TrendingUp} />
        <StatCard label="In Call" value={inCall} icon={PhoneCall} />
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Now</CardTitle>
            <CardDescription>Assistants currently online.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {ASSISTANTS.filter((a) => a.status === "Active").slice(0, 6).map((a) => (
                <ActiveNowCard key={a.id} a={a} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">All Assistants</CardTitle>
                <CardDescription>Overview of configuration and status.</CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assistants…"
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assistant</TableHead>
                  <TableHead className="hidden sm:table-cell">Voice</TableHead>
                  <TableHead className="hidden md:table-cell">Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            a.inCall ? "bg-primary animate-pulse" : a.status === "Active" ? "bg-muted-foreground/40" : "bg-destructive/50",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{a.agentKey}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground truncate">{a.voice}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {a.number ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground truncate">{a.number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "Active" ? "default" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-foreground">{a.totalCalls}</span>
                      <span className="text-xs text-muted-foreground"> / {a.leadsBooked} leads</span>
                    </TableCell>
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
