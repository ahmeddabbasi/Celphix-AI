import { useMemo, useState } from "react";
import {
  Bot,
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  RefreshCw,
  TrendingUp,
  Bookmark,
  Trash2,
} from "lucide-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { paygApi as api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { voices } from "@/data/voices";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PaygAssistant = {
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

function speakerName(speaker_id: string | null): string {
  if (!speaker_id) return "No voice";
  const v = voices.find((vv) => vv.speakerId === speaker_id);
  return v ? `${v.displayName} (${v.accent})` : speaker_id;
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-primary/80">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function AssistantCard({ a }: { a: PaygAssistant }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const voice = speakerName(a.speaker_id);

  async function onDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;

    const ok = window.confirm(
      `Delete "${a.display_name}"? This will delete its calls/activity data for PAYG.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await api.dashboard.deleteAssistant(a.assistant_id);
      const d = res?.deleted;
      toast.success(
        d
          ? `Deleted. Calls: ${d.calls_deleted}, events: ${d.events_deleted}`
          : "Assistant deleted."
      );
      queryClient.invalidateQueries({ queryKey: ["payg", "assistants", "with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payg", "assistants"] });
      queryClient.invalidateQueries({ queryKey: ["payg", "dashboard", "assistants", "with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payg", "dashboard", "assistants-kpis"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete assistant.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden aspect-square",
        "bg-gradient-to-br from-primary/10 to-card",
        "border border-border/20 shadow-elevated",
        "flex flex-col justify-between p-4",
        "cursor-pointer",
        "transition-[transform,box-shadow] duration-300 ease-spring",
      )}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/payg/assistants/${a.assistant_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/payg/assistants/${a.assistant_id}`);
        }
      }}
    >
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-3 left-3 h-9 w-9"
        onClick={onDeleteClick}
        disabled={deleting}
        aria-label={`Delete ${a.display_name}`}
        title="Delete assistant"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {a.is_in_call ? (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
      ) : (
        <span
          className={cn(
            "absolute top-3 right-3 inline-flex rounded-full h-2.5 w-2.5",
            a.is_active ? "bg-muted-foreground/30" : "bg-destructive/50",
          )}
        />
      )}

      <div>
        {a.is_in_call ? (
          <PhoneCall className="h-5 w-5 text-primary mb-2" />
        ) : a.is_active ? (
          <Phone className="h-5 w-5 text-primary/80 mb-2" />
        ) : (
          <PhoneOff className="h-5 w-5 text-muted-foreground mb-2" />
        )}
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
          {a.display_name}
        </p>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
          {a.agent_key ?? "—"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mic className="h-3 w-3" />
            <span className="truncate">{voice}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3" />
            {a.linked_number ? (
              <span className="truncate">
                {a.linked_number_label ? `${a.linked_number_label} · ` : ""}
                {a.linked_number}
              </span>
            ) : (
              <span className="italic text-muted-foreground/70">No number</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <StatPill icon={<TrendingUp className="h-3 w-3" />} label={`${a.total_calls} total`} />
          <StatPill icon={<Phone className="h-3 w-3" />} label={`${a.session_calls} this session`} />
          <StatPill icon={<Bookmark className="h-3 w-3" />} label={`${a.leads_booked} leads`} />
        </div>
      </div>
    </Card>
  );
}

function AddAssistantDialog({ disabled }: { disabled?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    agent_key: "",
    script_text: "",
    is_active: true,
  });

  function reset() {
    setForm({ display_name: "", agent_key: "", script_text: "", is_active: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const agentKey = form.agent_key.trim();
    const scriptText = form.script_text.trim();
    const displayName = form.display_name.trim();

    if (!agentKey) {
      toast.error("Agent key is required.");
      return;
    }
    if (!scriptText) {
      toast.error("Script text is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.dashboard.createAssistant({
        agent_key: agentKey,
        script_text: scriptText,
        ...(displayName ? { display_name: displayName } : {}),
        is_active: form.is_active,
      });

      toast.success(
        `Assistant created${res?.assistant?.assistant_name ? `: ${res.assistant.assistant_name}` : "."}`,
      );
      setOpen(false);
      reset();

      queryClient.invalidateQueries({ queryKey: ["payg", "assistants"] });
      queryClient.invalidateQueries({ queryKey: ["payg", "dashboard", "assistants", "with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payg", "dashboard", "assistants-kpis"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create assistant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2" disabled={disabled}>
          <Bot className="h-4 w-4" />
          Add Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Assistant</DialogTitle>
            <DialogDescription>Create a new assistant for your PAYG workspace.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="payg_asst_display">Display name (optional)</Label>
              <Input
                id="payg_asst_display"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Sales Assistant"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_asst_key">Agent key</Label>
              <Input
                id="payg_asst_key"
                value={form.agent_key}
                onChange={(e) => setForm((f) => ({ ...f, agent_key: e.target.value }))}
                placeholder="e.g. sales_agent_v1"
                required
                autoComplete="off"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_asst_script">Script</Label>
              <Textarea
                id="payg_asst_script"
                value={form.script_text}
                onChange={(e) => setForm((f) => ({ ...f, script_text: e.target.value }))}
                placeholder="Paste your assistant script here…"
                required
                className="min-h-36"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Enable routing immediately.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Assistant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PaygAssistants() {
  const authed = isAuthenticated();

  const { data, isPending, isFetching, refetch, isError, error } = useQuery({
    queryKey: ["payg", "assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: authed ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const assistants: PaygAssistant[] = (data?.assistants ?? []) as PaygAssistant[];
  const isRefreshing = isFetching && !isPending;

  const sorted = useMemo(() => {
    return assistants
      .slice()
      .sort((a, b) => {
        if (a.is_in_call !== b.is_in_call) return a.is_in_call ? -1 : 1;
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.display_name.localeCompare(b.display_name);
      });
  }, [assistants]);

  return (
    <div className="space-y-[clamp(28px,4vw,56px)]">
      <div data-reveal className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {assistants.length} assistant{assistants.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <AddAssistantDialog disabled={!authed || isPending || isFetching} />
        </div>
      </div>

      {isError && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load assistants"}
          </div>
        </div>
      )}

      <section data-reveal className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Your Assistants</h2>
            {!isPending && <span className="text-xs text-muted-foreground">{assistants.length} total</span>}
          </div>

          {!isPending && assistants.some((a) => a.is_in_call) ? (
            <Badge className="bg-primary/15 text-primary border-primary/40 text-[11px] py-0 px-2">
              {assistants.filter((a) => a.is_in_call).length} live
            </Badge>
          ) : null}
        </div>

        {isPending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="rounded-2xl aspect-square" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 gap-2">
            <PhoneOff className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No assistants yet</p>
            <p className="text-xs text-muted-foreground/60">Create your first assistant to get started.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {sorted.map((a) => (
              <AssistantCard key={a.assistant_id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
