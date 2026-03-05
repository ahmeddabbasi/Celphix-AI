import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "../lib/api";

type AgentListItem = {
  assistant_id: number;
  assistant_name: string | null;
  agent_key: string | null;
  user_id: number | null;
  is_active: boolean;
  created_at: string | null;
};

type Row = {
  id: string;
  name: string;
  userId?: number | null;
  isActive: boolean;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function Assistants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newAgentKey, setNewAgentKey] = useState("");
  const [newScriptText, setNewScriptText] = useState("");
  const { toast } = useToast();

  const agentsQ = useQuery({
    queryKey: ["assistants", "list"],
    queryFn: () => api.dashboard.assistants(),
    // Assistants list changes infrequently; keep it fresh enough but avoid refetch-on-every-nav.
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  const agents = agentsQ.data?.assistants ?? [];
  const error = (agentsQ.error as any)?.message ?? null;
  const loading = agentsQ.isPending;
  const isRefreshing = agentsQ.isFetching && !agentsQ.isPending;

  async function reloadAgents() {
    try {
      await agentsQ.refetch();
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load agents";
      toast({ variant: "destructive", title: "Agents", description: msg });
    }
  }

  async function createAssistant() {
    const agent_key = newAgentKey.trim();
    const script_text = newScriptText.trim();

    if (!agent_key || !script_text) {
      toast({
        variant: "destructive",
        title: "New Assistant",
        description: "Agent key and script text are required",
      });
      return;
    }

    setCreating(true);
    try {
      const created = await api.dashboard.createAssistant({ agent_key, script_text });
      toast({ title: "New Assistant", description: "Assistant created" });
      setNewAgentKey("");
      setNewScriptText("");

      // Refresh the list quickly; keep UI responsive by updating cache and then invalidating.
      queryClient.invalidateQueries({ queryKey: ["assistants", "list"] });

      const newId = String(created?.assistant?.assistant_id ?? "");
      if (newId) navigate(`/assistants/${newId}`);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to create assistant";
      toast({ variant: "destructive", title: "New Assistant", description: msg });
    } finally {
      setCreating(false);
    }
  }

  const rows = useMemo<Row[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return (agents ?? [])
      .map((a) => ({
        id: String(a.assistant_id),
        name: a.assistant_name ?? a.agent_key ?? `Assistant #${a.assistant_id}`,
        userId: a.user_id,
        isActive: Boolean(a.is_active),
      }))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) : true));
  }, [agents, searchQuery]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground">Agents loaded from the backend</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reloadAgents} disabled={loading || isRefreshing}>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button onClick={createAssistant} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            New Assistant
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Agent key (assistant name)</p>
          <Input
            placeholder="e.g. ahmed-sales"
            value={newAgentKey}
            onChange={(e) => setNewAgentKey(e.target.value)}
            className="bg-muted/50 border-0"
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Script text</p>
          <textarea
            value={newScriptText}
            onChange={(e) => setNewScriptText(e.target.value)}
            placeholder="Paste the sales script here..."
            className="min-h-[120px] w-full rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground outline-none"
          />
          <p className="text-xs text-muted-foreground">
            Backend will auto-fill defaults and enforce: agent key must be unique per user.
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50 border-0"
        />
      </motion.div>

      <motion.div variants={item} className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">{error}</p>
                </TableCell>
              </TableRow>
            ) : loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={`sk-${idx}`} className="border-border">
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No agents found.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-border">
                  <TableCell>
                    <Link
                      to={`/assistants/${r.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{r.id}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">{r.userId ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </motion.div>
  );
}
