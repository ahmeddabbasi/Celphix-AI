import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PhoneOff, RefreshCw } from "lucide-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { voices } from "@/data/voices";
import { useUserProfile } from "@/hooks/use-user-profile";

// ─── Types ──────────────────────────────────────────────────────────────────

type AssistantStat = {
  assistant_id: number;
  display_name: string;
  agent_key: string | null;
  speaker_id: string | null;
  is_active: boolean;
  linked_sheet_name?: string | null;
  linked_number: string | null;
  linked_number_label: string | null;
  total_calls: number;
  session_calls: number;
  leads_booked: number;
  is_in_call: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function speakerName(speaker_id: string | null): string {
  if (!speaker_id) return "—";
  const v = voices.find((v) => v.speakerId === speaker_id);
  return v ? `${v.displayName} (${v.accent})` : speaker_id;
}

// ─── Assistant Card ─────────────────────────────────────────────────────────

function AssistantCard({ a }: { a: AssistantStat }) {
  const navigate = useNavigate();
  const voice = speakerName(a.speaker_id);
  const sheetName = a.linked_sheet_name ?? "—";
  const linkedNumber = a.linked_number ?? "—";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/assistants/${a.assistant_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/assistants/${a.assistant_id}`);
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl",
        "bg-card shadow-sm",
        "h-40 sm:h-44",
        "p-4 sm:p-5",
        "transition-all duration-300 ease-spring",
        a.is_active
          ? "border-2 border-[#214226]/20 bg-gradient-to-b from-[#214226]/5 to-transparent hover:border-[#214226] hover:shadow-lg hover:shadow-[#214226]/10"
          : "border-2 border-[#ffea00]/30 bg-gradient-to-b from-[#ffea00]/10 to-transparent hover:border-[#ffea00] hover:shadow-lg hover:shadow-[#ffea00]/20",
        "hover:-translate-y-1",
        "active:translate-y-0 active:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 transition-colors",
          a.is_active ? "bg-[#214226]" : "bg-[#ffea00]",
        )}
      />

      <div className="flex h-full flex-col gap-2.5">
        <div className="min-h-[2.5rem]">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em] line-clamp-2">
          {a.display_name}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <div className="rounded-md border border-[#214226]/10 bg-[#214226]/5 px-2.5 py-1">
            <p className="text-[0.6875rem] font-semibold text-[#214226] truncate">
              {voice}
            </p>
          </div>
          <div className="rounded-md border border-[#214226]/10 bg-[#214226]/5 px-2.5 py-1">
            <p className="text-[0.6875rem] font-semibold text-[#214226] truncate">
              {linkedNumber}
            </p>
          </div>
          <div className="rounded-md border border-[#214226]/10 bg-[#214226]/5 px-2.5 py-1">
            <p className="text-[0.6875rem] font-semibold text-[#214226] truncate">
              {sheetName}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Assistants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();

  const [addOpen, setAddOpen] = useState(false);
  const [assistantCount, setAssistantCount] = useState<number>(1);
  const [requestComment, setRequestComment] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    agent_key: "",
    script_text: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 20_000,   // auto-refresh every 20 s to keep "live" status fresh
    refetchOnWindowFocus: true,
  });

  const assistants: AssistantStat[] = data?.assistants ?? [];
  const quota = data?.quota ?? 0;

  const isAdmin = profile?.is_admin === true;
  const hasRemainingQuota = quota > assistants.length;
  const canCreateDirectly = isAdmin || hasRemainingQuota;

  function resetForm() {
    setForm({ display_name: "", agent_key: "", script_text: "", is_active: true });
  }

  async function handleCreateAssistant(e: React.FormEvent) {
    e.preventDefault();
    const agentKey = form.agent_key.trim();
    const scriptText = form.script_text.trim();
    const displayName = form.display_name.trim();

    if (!agentKey) {
      toast({ title: "Error", description: "Agent key is required.", variant: "destructive" });
      return;
    }
    if (!scriptText) {
      toast({ title: "Error", description: "Script text is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await api.dashboard.createAssistant({
        agent_key: agentKey,
        script_text: scriptText,
        ...(displayName ? { display_name: displayName } : {}),
        is_active: form.is_active,
      });

      toast({ title: "Success", description: "Assistant created successfully." });
      setAddOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["assistants", "with-stats"] });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create assistant.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div data-reveal className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quota > 0
              ? `${assistants.length} of ${quota} assistant${quota !== 1 ? "s" : ""} provisioned`
              : "No quota assigned — contact your admin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="lg"
            onClick={() => setAddOpen(true)}
            className="gap-2 px-5 py-2 text-base font-bold text-white shadow-md"
          >
            Add Assistant
          </Button>

          <Dialog
            open={addOpen}
            onOpenChange={(v) => {
              setAddOpen(v);
              if (!v) resetForm();
            }}
          >
            {canCreateDirectly ? (
              <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleCreateAssistant}>
                  <DialogHeader>
                    <DialogTitle>Add Assistant</DialogTitle>
                    <DialogDescription>Create a new assistant for your Command Center.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="cc_asst_display">Display name (optional)</Label>
                      <Input
                        id="cc_asst_display"
                        value={form.display_name}
                        onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                        placeholder="e.g. Sales Assistant"
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="cc_asst_key">Agent key</Label>
                      <Input
                        id="cc_asst_key"
                        value={form.agent_key}
                        onChange={(e) => setForm((f) => ({ ...f, agent_key: e.target.value }))}
                        placeholder="Unique agent identifier (e.g. my-sales-bot)"
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="cc_asst_script">Script / Instructions</Label>
                      <Textarea
                        id="cc_asst_script"
                        value={form.script_text}
                        onChange={(e) => setForm((f) => ({ ...f, script_text: e.target.value }))}
                        placeholder="Provide the agent with context, role description, and conversational rules..."
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 shadow-ambient-subtle">
                      <div className="space-y-0.5">
                        <Label htmlFor="cc_asst_active" className="text-sm font-semibold">Active</Label>
                        <p className="text-xs text-muted-foreground">Toggle to enable or disable assistant calling capability</p>
                      </div>
                      <Switch
                        id="cc_asst_active"
                        checked={form.is_active}
                        onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Creating…" : "Create Assistant"}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </DialogContent>
            ) : (
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Additional Assistants</DialogTitle>
                  <DialogDescription>
                    Submit a request to your admin to provision more assistants.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsSubmittingRequest(true);
                    setTimeout(() => {
                      setIsSubmittingRequest(false);
                      setAddOpen(false);
                      setAssistantCount(1);
                      setRequestComment("");
                      toast({ title: "Request submitted", description: "Request submitted, will be reviewed by admin" });
                    }, 400);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label>Number of assistants</Label>
                    <Input
                      type="number"
                      min={1}
                      value={assistantCount}
                      onChange={(ev) => setAssistantCount(Math.max(1, Number(ev.target.value || 1)))}
                    />
                  </div>

                  <div>
                    <Label>Comment / Clause</Label>
                    <Textarea
                      value={requestComment}
                      onChange={(ev) => setRequestComment(ev.target.value)}
                      placeholder="Optional note to admin"
                      className="min-h-[100px]"
                    />
                  </div>

                  <DialogFooter>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmittingRequest}>
                        {isSubmittingRequest ? "Submitting…" : "Submit Request"}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </DialogContent>
            )}
          </Dialog>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {isError && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load assistants"}
          </div>
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <section data-reveal className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Your Assistants</h2>
            {!isPending && (
              <span className="text-xs text-muted-foreground">{assistants.length} total</span>
            )}
          </div>

          {!isPending && assistants.some((a) => a.is_in_call) ? (
            <Badge className="bg-primary/15 text-primary border-primary/40 text-[0.6875rem] py-0 px-2">
              {assistants.filter((a) => a.is_in_call).length} live
            </Badge>
          ) : null}
        </div>

        {isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="rounded-2xl aspect-square" />
            ))}
          </div>
        ) : assistants.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 gap-2">
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
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {assistants
              .slice()
              .sort((a, b) => {
                if (a.is_in_call !== b.is_in_call) return a.is_in_call ? -1 : 1;
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                return a.display_name.localeCompare(b.display_name);
              })
              .map((a) => (
                <AssistantCard key={a.assistant_id} a={a} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
