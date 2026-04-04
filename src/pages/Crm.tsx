import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { CrmLead, useCrmLeads, useUpdateCrmLeadNotes } from "@/hooks/use-crm-queries";
import { getErrorMessage } from "@/lib/errors";

function statusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  const s = (status ?? "").toLowerCase();
  if (!s) return "outline";
  if (s.includes("fail") || s.includes("error") || s.includes("no answer")) return "destructive";
  if (s.includes("completed") || s.includes("success")) return "default";
  if (s.includes("calling") || s.includes("in progress")) return "secondary";
  return "outline";
}

function LeadNotesCell({ lead }: { lead: CrmLead }) {
  const [value, setValue] = useState(lead.notes ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const mut = useUpdateCrmLeadNotes();

  useEffect(() => {
    if (!isFocused) setValue(lead.notes ?? "");
  }, [lead.notes, isFocused]);

  const dirty = (value ?? "") !== (lead.notes ?? "");

  async function save() {
    if (!dirty) return;
    await mut.mutateAsync({ leadId: lead.id, notes: value });
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={async () => {
          setIsFocused(false);
          await save();
        }}
        onKeyDown={async (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            await save();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        placeholder="Add notes…"
        rows={1}
        className="min-h-8 h-8 resize-none text-xs"
        disabled={mut.isPending}
      />
      <div className="h-4 text-[11px] text-muted-foreground">
        {mut.isPending ? "Saving…" : dirty ? "Unsaved" : ""}
      </div>
    </div>
  );
}

export default function Crm() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = qInput.trim();
      setQ(next ? next : null);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const leadsQ = useCrmLeads({ limit: 200, offset: 0, q });
  const leads = leadsQ.data?.leads ?? [];

  const assistantsQ = useQuery({
    queryKey: ["dashboard", "assistants"],
    queryFn: () => api.dashboard.assistants(),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const assistantNameById = useMemo(() => {
    const map = new Map<number, string>();
    const list = assistantsQ.data?.assistants ?? [];
    for (const a of list) {
      map.set(a.assistant_id, a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`);
    }
    return map;
  }, [assistantsQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">View your leads. Use Dialing Data to upload dialing CSVs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/dialing-data">Dialing Data</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => leadsQ.refetch()}
            disabled={leadsQ.isFetching}
            className="gap-2"
          >
            <RefreshCw className={"h-4 w-4 " + (leadsQ.isFetching ? "animate-spin" : "")} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Search by name/number/status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search…"
            className="max-w-md"
          />

          {leadsQ.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : leadsQ.isError ? (
            <div className="text-sm text-destructive">{getErrorMessage(leadsQ.error, "Failed to load leads")}</div>
          ) : leads.length === 0 ? (
            <div className="text-sm text-muted-foreground">No leads found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Customer Phone</TableHead>
                  <TableHead className="w-[160px]">Call Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="w-[180px]">Assistant</TableHead>
                  <TableHead className="w-[160px]">Outcome</TableHead>
                  <TableHead className="min-w-[320px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-mono text-sm">{l.customernumber || "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.customername || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(l.leadstatus)}>
                        {l.leadstatus || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="max-w-[520px] truncate">{l.callsummary || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.assistantcalling ? (assistantNameById.get(l.assistantcalling) ?? `#${l.assistantcalling}`) : "—"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const data = (l.data ?? {}) as Record<string, unknown>;
                        const outcome =
                          typeof data.outcome === "string"
                            ? data.outcome
                            : (typeof data.interest === "string" ? data.interest : null);
                        return outcome ? <Badge variant="outline">{outcome}</Badge> : "—";
                      })()}
                    </TableCell>
                    <TableCell>
                      <LeadNotesCell lead={l} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
