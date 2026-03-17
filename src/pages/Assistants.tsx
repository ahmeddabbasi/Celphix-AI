import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  ArrowRight,
  RefreshCw,
  Users,
  TrendingUp,
  Bookmark,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { voices } from "@/data/voices";

// ─── Types ──────────────────────────────────────────────────────────────────

type AssistantStat = {
  assistant_id: number;
  display_name: string;
  agent_key: string | null;
  speaker_id: string | null;
  is_active: boolean;
  linked_number: string | null;
  linked_number_label: string | null;
  total_calls: number;
  session_calls: number;
  leads_booked: number;
  is_in_call: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function speakerName(speaker_id: string | null): string {
  if (!speaker_id) return "No voice";
  const v = voices.find((v) => v.speakerId === speaker_id);
  return v ? `${v.displayName} (${v.accent})` : speaker_id;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ─── Active Call Card ─────────────────────────────────────────────────────────

function ActiveCallCard({ a }: { a: AssistantStat }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      variants={fadeUp}
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/assistants/${a.assistant_id}`)}
      className={cn(
        "active-assistant-glow relative flex-shrink-0 w-44 h-44 rounded-2xl border cursor-pointer",
        "bg-gradient-to-br from-primary/10 to-card",
        "border-accent-yellow/25 shadow-lg shadow-primary/10",
        "flex flex-col justify-between p-4 overflow-hidden",
      )}
    >
      {/* Pulsing live indicator */}
      <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
      </span>

      <div>
        <PhoneCall className="h-5 w-5 text-primary mb-2" />
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
          {a.display_name}
        </p>
      </div>

      <div className="space-y-1">
        <StatPill icon={<TrendingUp className="h-3 w-3" />} label={`${a.total_calls} total`} />
        <StatPill icon={<Phone className="h-3 w-3" />} label={`${a.session_calls} this session`} />
        <StatPill icon={<Bookmark className="h-3 w-3" />} label={`${a.leads_booked} leads`} />
      </div>
    </motion.div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-primary/80">
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ─── Assistant Row ────────────────────────────────────────────────────────────

function AssistantRow({ a, index }: { a: AssistantStat; index: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(a.display_name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraftName(a.display_name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancelEdit(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation();
    setEditing(false);
    setDraftName(a.display_name);
  }

  async function commitEdit(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation();
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === a.display_name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.dashboard.renameAssistant(a.assistant_id, trimmed);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["assistants", "with-stats"] });
    } catch {
      // leave editing open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={cn(
        "group flex items-center gap-4 px-5 py-4",
        "border-b border-border last:border-b-0",
        "hover:bg-muted/40 transition-colors duration-150",
        !editing && "cursor-pointer",
      )}
      onClick={() => !editing && navigate(`/assistants/${a.assistant_id}`)}
    >
      {/* Status dot */}
      <span
        className={cn(
          "mt-0.5 flex-shrink-0 h-2 w-2 rounded-full",
          a.is_in_call ? "bg-primary animate-pulse" : a.is_active ? "bg-muted-foreground/40" : "bg-destructive/50",
        )}
      />

      {/* Name + agent key — with inline edit */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(e);
                if (e.key === "Escape") cancelEdit(e);
              }}
              onBlur={() => commitEdit()}
              className="h-7 py-0 px-2 text-sm font-medium bg-muted/60 border-primary/40 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={saving}
              autoFocus
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); commitEdit(e); }}
              className="p-1 rounded text-primary hover:bg-primary/10 transition-colors shrink-0"
              disabled={saving}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelEdit(e); }}
              className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex items-center gap-2 group/name">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.display_name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{a.agent_key ?? "—"}</p>
            </div>
            <button
              onClick={startEdit}
              className="opacity-0 group-hover/name:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Speaker */}
      <div className="hidden sm:flex items-center gap-1.5 w-44 shrink-0">
        <Mic className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{speakerName(a.speaker_id)}</span>
      </div>

      {/* Linked number */}
      <div className="hidden md:flex items-center gap-1.5 w-44 shrink-0">
        {a.linked_number ? (
          <>
            <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {a.linked_number_label ? `${a.linked_number_label} · ` : ""}
              {a.linked_number}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">No number linked</span>
        )}
      </div>

      {/* Call badge */}
      <div className="shrink-0 w-20 text-right">
        {a.is_in_call ? (
          <Badge className="bg-primary/15 text-primary border-primary/40 text-[11px] py-0.5">
            Live
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{a.total_calls} calls</span>
        )}
      </div>

      {!editing && (
        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Assistants() {
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    staleTime: 15_000,
    refetchInterval: 20_000,   // auto-refresh every 20 s to keep "live" status fresh
    refetchOnWindowFocus: true,
  });

  const assistants: AssistantStat[] = data?.assistants ?? [];
  const quota = data?.quota ?? 0;
  const activeNow = assistants.filter((a) => a.is_in_call);
  const isRefreshing = isFetching && !isPending;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quota > 0
              ? `${assistants.length} of ${quota} assistant${quota !== 1 ? "s" : ""} provisioned`
              : "No quota assigned — contact your admin"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isPending || isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </motion.div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {isError && (
        <motion.div variants={fadeUp}>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load assistants"}
          </div>
        </motion.div>
      )}

      {/* ── Upper half — Active Now ──────────────────────────────────────── */}
      <AnimatePresence>
        {(isPending || activeNow.length > 0) && (
          <motion.section
            key="active-section"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Active Now</h2>
              {!isPending && (
                <Badge className="bg-primary/15 text-primary border-primary/40 text-[11px] py-0 px-2">
                  {activeNow.length} live
                </Badge>
              )}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted/50">
              {isPending
                ? Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="flex-shrink-0 w-44 h-44 rounded-2xl" />
                  ))
                : activeNow.length === 0
                ? (
                    <p className="text-xs text-muted-foreground italic py-1">No assistants currently on a call</p>
                  )
                : activeNow.map((a) => <ActiveCallCard key={a.assistant_id} a={a} />)}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Lower half — All Assistants ──────────────────────────────────── */}
      <motion.section variants={fadeUp} className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Your Assistants</h2>
          {!isPending && (
            <span className="text-xs text-muted-foreground">{assistants.length} total</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2.5 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
            <span className="w-2 shrink-0" />
            <span className="flex-1">Name</span>
            <span className="hidden sm:block w-44 shrink-0">Voice</span>
            <span className="hidden md:block w-44 shrink-0">Linked Number</span>
            <span className="w-20 shrink-0 text-right">Calls</span>
            <span className="w-4 shrink-0" />
          </div>

          {isPending ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="hidden sm:block h-3 w-28" />
                  <Skeleton className="hidden md:block h-3 w-32" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                  <Skeleton className="h-4 w-4 shrink-0" />
                </div>
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              {quota === 0 ? (
                <>
                  <PhoneOff className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No assistants available</p>
                  <p className="text-xs text-muted-foreground/60">No Quota assigned by the admin</p>
                </>
              ) : (
                <>
                  <RefreshCw className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Provisioning assistants</p>
                </>
              )}
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show">
              {assistants.map((a, idx) => (
                <AssistantRow key={a.assistant_id} a={a} index={idx} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
