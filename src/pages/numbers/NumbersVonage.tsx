import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Link2, Phone, PhoneCall, Plus, Trash2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type VonageNumber = {
  id: number;
  user_id: number;
  phone_number: string;
  label: string | null;
  assistant_id: number | null;
  assistant_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Assistant = {
  assistant_id: number;
  assistant_name: string | null;
  agent_key: string | null;
  user_id: number | null;
  is_active: boolean;
  created_at: string | null;
  linked_dialing_file_id?: number | null;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function AddNumberDialog({
  assistants,
  linkedAssistantIds,
  onAdded,
  disabled,
}: {
  assistants: Assistant[];
  linkedAssistantIds: Set<number>;
  onAdded: (num: VonageNumber) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    application_id: "",
    private_key: "",
    phone_number: "",
    label: "",
    assistant_id: "" as string,
  });

  function reset() {
    setForm({ application_id: "", private_key: "", phone_number: "", label: "", assistant_id: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assistant_id || form.assistant_id === "__none__") {
      toast.error("Please select an assistant to link to this number.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.vonage.addNumber({
        application_id: form.application_id.trim(),
        private_key: form.private_key.trim(),
        phone_number: form.phone_number.trim(),
        label: form.label.trim() || null,
        assistant_id: Number(form.assistant_id),
      });
      const number = res.number as VonageNumber;
      onAdded(number);
      toast.success(`Number ${number.phone_number} added.`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to add number."));
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
        <Button disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Add Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Vonage Number</DialogTitle>
            <DialogDescription>Credentials are encrypted at rest.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cc_vonage_app_id">Application ID</Label>
              <Input
                id="cc_vonage_app_id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={form.application_id}
                onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
                required
                autoComplete="off"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cc_vonage_private_key">Private Key</Label>
              <Input
                id="cc_vonage_private_key"
                type="password"
                placeholder="-----BEGIN PRIVATE KEY-----"
                value={form.private_key}
                onChange={(e) => setForm((f) => ({ ...f, private_key: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cc_vonage_phone">Phone Number (E.164)</Label>
              <Input
                id="cc_vonage_phone"
                placeholder="+15550001234"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cc_vonage_label">Label</Label>
              <Input
                id="cc_vonage_label"
                placeholder="e.g. Sales line, Support…"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cc_vonage_assistant">Linked Assistant</Label>
              <Select
                value={form.assistant_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, assistant_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger id="cc_vonage_assistant">
                  <SelectValue placeholder="Select an assistant…" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      No assistants yet — create one first
                    </SelectItem>
                  )}
                  {assistants.map((a) => {
                    const alreadyLinked = linkedAssistantIds.has(a.assistant_id);
                    return (
                      <SelectItem
                        key={a.assistant_id}
                        value={String(a.assistant_id)}
                        disabled={alreadyLinked}
                      >
                        <span className={alreadyLinked ? "flex items-center gap-1.5 opacity-50" : "flex items-center gap-1.5"}>
                          {alreadyLinked ? (
                            <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                          ) : (
                            <Link2 className="h-3 w-3 flex-shrink-0" />
                          )}
                          {a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`}
                          {alreadyLinked && <span className="text-xs text-muted-foreground ml-1">(in use)</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add Number"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StartCallDialog({
  number,
  disabled,
}: {
  number: VonageNumber;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [toNumber, setToNumber] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCalling(true);
    try {
      await api.vonage.startCall(number.id, toNumber.trim());
      toast.success("Call started.");
      setOpen(false);
      setToNumber("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to start call."));
    } finally {
      setCalling(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setToNumber("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} title={disabled ? "Link an assistant first" : "Start a call"}>
          <PhoneCall className="h-3.5 w-3.5 mr-2" />
          Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start Call</DialogTitle>
            <DialogDescription>
              Calling from <span className="font-mono">{number.phone_number}</span> using{" "}
              <span className="font-medium">{number.assistant_name ?? "linked assistant"}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`cc_vonage_to_${number.id}`}>Destination Number (E.164)</Label>
              <Input
                id={`cc_vonage_to_${number.id}`}
                placeholder="+15559876543"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={calling}>
              {calling ? "Dialing…" : "Start Call"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialerToggleButton({
  assistantId,
  hasSheet,
  disabled,
}: {
  assistantId: number | null;
  hasSheet: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const effectiveDisabled = disabled || !assistantId || !hasSheet;

  async function refreshStatus() {
    if (!assistantId) return;
    try {
      const res = await api.dialer.status(assistantId);
      setRunning(Boolean(res.running));
      setStopRequested(Boolean(res.stop_requested));
    } catch {
      // ignore polling failures
    }
  }

  useEffect(() => {
    if (!assistantId) return;
    void refreshStatus();
    intervalRef.current = window.setInterval(() => {
      void refreshStatus();
    }, 4000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  async function handleToggle() {
    if (!assistantId) return;

    setBusy(true);
    try {
      if (running && !stopRequested) {
        const res = await api.dialer.stop(assistantId);
        setRunning(Boolean(res.running));
        setStopRequested(Boolean(res.stop_requested));
        toast.success(res.stop_requested ? "Ending dialing after the current call." : "Dialer stopped.");
      } else if (!running) {
        const res = await api.dialer.start(assistantId);
        setRunning(Boolean(res.running));
        setStopRequested(Boolean(res.stop_requested));
        toast.success("Dialer started.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Dialer action failed."));
    } finally {
      setBusy(false);
    }
  }

  const title = effectiveDisabled
    ? !assistantId
      ? "Link an assistant first"
      : !hasSheet
        ? "Link a dialing sheet to this assistant first"
        : "Not available"
    : running
      ? stopRequested
        ? "Ending…"
        : "End dialing after the current call"
      : "Start dialing";

  return (
    <Button
      size="sm"
      variant={running ? "destructive" : "default"}
      disabled={effectiveDisabled || busy}
      title={title}
      onClick={handleToggle}
      className="gap-1.5"
    >
      <Phone className="h-3.5 w-3.5" />
      {busy ? "Working…" : running ? (stopRequested ? "Ending…" : "End Dialing") : "Start Dialing"}
    </Button>
  );
}

export default function NumbersVonage() {
  const [numbers, setNumbers] = useState<VonageNumber[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [linkedAssistantIds, setLinkedAssistantIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingLinkId, setSavingLinkId] = useState<number | null>(null);

  const assistantById = useMemo(() => {
    const map = new Map<number, Assistant>();
    for (const a of assistants) map.set(a.assistant_id, a);
    return map;
  }, [assistants]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [vonageRes, asstRes, twilioRes, telnyxRes] = await Promise.all([
        api.vonage.listNumbers(),
        api.dashboard.assistants(),
        api.twilio.listNumbers().catch(() => ({ numbers: [] })),
        api.telnyx.listNumbers().catch(() => ({ numbers: [] })),
      ]);

      const vonageNumbers = (vonageRes.numbers ?? []) as VonageNumber[];
      setNumbers(vonageNumbers);
      setAssistants((asstRes.assistants ?? []) as Assistant[]);

      const ids = new Set<number>();
      for (const n of (twilioRes.numbers ?? []) as Array<{ assistant_id: number | null }>) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      for (const n of (telnyxRes.numbers ?? []) as Array<{ assistant_id: number | null }>) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      for (const n of vonageNumbers) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      setLinkedAssistantIds(ids);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load Vonage numbers."));
    } finally {
      setLoading(false);
    }
  }

  function handleAdded(num: VonageNumber) {
    setNumbers((prev) => [num, ...prev]);
    if (num.assistant_id != null) {
      setLinkedAssistantIds((prev) => new Set(prev).add(num.assistant_id as number));
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await api.vonage.deleteNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
      if (res?.unlinked_assistant?.name) {
        toast.success(`Number removed. Assistant "${res.unlinked_assistant.name}" has been unlinked.`);
      } else {
        toast.success("Number removed.");
      }
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete number."));
    }
  }

  async function handleLinkAssistant(numberId: number, assistantId: number | null) {
    setSavingLinkId(numberId);
    try {
      const res = await api.vonage.linkAssistant(numberId, assistantId);
      const updated = res.number as VonageNumber;
      setNumbers((prev) => prev.map((n) => (n.id === numberId ? updated : n)));
      toast.success("Saved.");
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update assistant link."));
    } finally {
      setSavingLinkId(null);
    }
  }

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">Numbers · Vonage</h1>
        </div>
        <AddNumberDialog assistants={assistants} linkedAssistantIds={linkedAssistantIds} onAdded={handleAdded} disabled={loading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Your Vonage Numbers
          </CardTitle>
          <CardDescription>Each assistant can only be linked to one number at a time.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : numbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Phone className="h-8 w-8 opacity-30" />
              <span>
                No Vonage numbers yet. Click <strong>Add Number</strong> to get started.
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Linked Assistant</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((num) => {
                  const assistant = num.assistant_id ? assistantById.get(num.assistant_id) ?? null : null;
                  const hasSheet = Boolean(assistant?.linked_dialing_file_id);

                  return (
                    <TableRow key={num.id}>
                      <TableCell className="font-mono text-sm">{num.phone_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {num.label ?? <span className="italic opacity-50">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={num.assistant_id != null ? String(num.assistant_id) : "__none__"}
                            onValueChange={(v) => {
                              const newId = v === "__none__" ? null : Number(v);
                              void handleLinkAssistant(num.id, newId);
                            }}
                            disabled={savingLinkId === num.id}
                          >
                            <SelectTrigger className="w-[240px]">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="flex items-center gap-1.5">
                                  <Unlink className="h-3 w-3" />
                                  Unlinked
                                </span>
                              </SelectItem>
                              {assistants.map((a) => {
                                const inUse = linkedAssistantIds.has(a.assistant_id) && a.assistant_id !== num.assistant_id;
                                return (
                                  <SelectItem key={a.assistant_id} value={String(a.assistant_id)} disabled={inUse}>
                                    <span className={inUse ? "flex items-center gap-1.5 opacity-50" : "flex items-center gap-1.5"}>
                                      {inUse ? (
                                        <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                                      ) : (
                                        <Link2 className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      {a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`}
                                      {inUse && <span className="text-xs text-muted-foreground ml-1">(in use)</span>}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {savingLinkId === num.id && (
                            <span className="text-xs text-muted-foreground">Saving…</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(num.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DialerToggleButton assistantId={num.assistant_id} hasSheet={hasSheet} disabled={!num.assistant_id} />
                          <StartCallDialog number={num} disabled={!num.assistant_id} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove number?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove{" "}
                                  <span className="font-mono font-semibold">{num.phone_number}</span> and its encrypted credentials from the platform.
                                  {num.assistant_name && (
                                    <> The assistant <span className="font-semibold">&quot;{num.assistant_name}&quot;</span> will be unlinked from this number.</>
                                  )}{" "}
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(num.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
