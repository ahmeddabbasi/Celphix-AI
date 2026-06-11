import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Link2, Phone, Plus, Trash2, Unlink } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

type VicidialNumber = {
  id: number;
  user_id: number;
  phone_number: string;
  label: string | null;
  campaign_id: string;
  list_id: string;
  assistant_id: number | null;
  assistant_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  status?: "connected" | "disconnected";
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
  onAdded: (num: VicidialNumber) => void;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationStep, setValidationStep] = useState<'idle' | 'api' | 'sip' | 'done'>('idle');
  const [form, setForm] = useState({
    server_ip: "",
    sip_extension: "",
    sip_password: "",
    api_user: "",
    api_password: "",
    campaign_id: "",
    list_id: "",
    phone_number: "",
    label: "",
    assistant_id: "" as string,
  });

  function reset() {
    setForm({
      server_ip: "",
      sip_extension: "",
      sip_password: "",
      api_user: "",
      api_password: "",
      campaign_id: "",
      list_id: "",
      phone_number: "",
      label: "",
      assistant_id: "",
    });
    setValidationStep('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assistant_id || form.assistant_id === "__none__") {
      toast.error("Please select an assistant to link to this configuration.");
      return;
    }

    setSaving(true);
    setValidationStep('api');

    const timer = setTimeout(() => {
      setValidationStep('sip');
    }, 1500);

    try {
      const res = await api.vicidial.addNumber({
        server_ip: form.server_ip.trim(),
        sip_extension: form.sip_extension.trim(),
        sip_password: form.sip_password,
        api_user: form.api_user.trim(),
        api_password: form.api_password,
        campaign_id: form.campaign_id.trim(),
        list_id: form.list_id.trim(),
        phone_number: form.phone_number.trim(),
        label: form.label.trim() || null,
        assistant_id: Number(form.assistant_id),
      });

      clearTimeout(timer);
      setValidationStep('done');

      await new Promise((resolve) => setTimeout(resolve, 800));

      const number = res.number as VicidialNumber;
      onAdded(number);
      toast.success("ViciDial Connected Successfully!");
      setOpen(false);
      reset();
      navigate("/calls");
    } catch (err) {
      clearTimeout(timer);
      setValidationStep('idle');
      const msg = getErrorMessage(err, "");
      if (msg.includes("Could not reach ViciDial API") || msg.includes("Server IP and API credentials")) {
        toast.error("Connection Failed: Could not reach ViciDial API. Please verify your Server IP and API credentials.");
      } else if (msg.includes("SIP Connection Failed")) {
        toast.error("API Verified, but SIP Connection Failed: Please check your SIP Extension/Password or ensure Port 5060 UDP is open.");
      } else {
        toast.error(msg || "Failed to add configuration.");
      }
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
          Connect Vicidial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="relative">
          {saving && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm font-semibold">Verifying connection...</p>
              </div>
              <div className="space-y-3 w-2/3 max-w-xs mt-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${validationStep === 'api' ? 'bg-yellow-500 animate-pulse' : (validationStep === 'sip' || validationStep === 'done') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted'}`} />
                  <span className={validationStep === 'api' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    Verifying API Access...
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${validationStep === 'sip' ? 'bg-yellow-500 animate-pulse' : validationStep === 'done' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted'}`} />
                  <span className={validationStep === 'sip' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    Verifying SIP Audio Port...
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogHeader>
            <DialogTitle>Connect Vicidial</DialogTitle>
            <DialogDescription>
              Provide your Vicidial SIP and API credentials. Credentials are encrypted at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Group 1: SIP Credentials */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. SIP Audio Connection (The Voice)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor="cc_vicidial_server_ip">Vicidial Server IP / Hostname</Label>
                  <Input
                    id="cc_vicidial_server_ip"
                    placeholder="e.g. 192.168.100.5 or dialer.theircompany.com"
                    value={form.server_ip}
                    onChange={(e) => setForm((f) => ({ ...f, server_ip: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_sip_ext">SIP Extension</Label>
                  <Input
                    id="cc_vicidial_sip_ext"
                    placeholder="e.g. 1001"
                    value={form.sip_extension}
                    onChange={(e) => setForm((f) => ({ ...f, sip_extension: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_sip_pass">SIP Password</Label>
                  <Input
                    id="cc_vicidial_sip_pass"
                    type="password"
                    placeholder="SIP Password"
                    value={form.sip_password}
                    onChange={(e) => setForm((f) => ({ ...f, sip_password: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Group 2: API Credentials */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. API Credentials (The Brains / Dispositions)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_api_user">API User</Label>
                  <Input
                    id="cc_vicidial_api_user"
                    placeholder="e.g. 6666"
                    value={form.api_user}
                    onChange={(e) => setForm((f) => ({ ...f, api_user: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_api_pass">API Password</Label>
                  <Input
                    id="cc_vicidial_api_pass"
                    type="password"
                    placeholder="API Password"
                    value={form.api_password}
                    onChange={(e) => setForm((f) => ({ ...f, api_password: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_campaign">Campaign ID</Label>
                  <Input
                    id="cc_vicidial_campaign"
                    placeholder="e.g. TESTCAMP"
                    value={form.campaign_id}
                    onChange={(e) => setForm((f) => ({ ...f, campaign_id: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc_vicidial_list">List ID</Label>
                  <Input
                    id="cc_vicidial_list"
                    placeholder="e.g. 999"
                    value={form.list_id}
                    onChange={(e) => setForm((f) => ({ ...f, list_id: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Details */}
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cc_vicidial_phone">Phone Number / ID</Label>
                <Input
                  id="cc_vicidial_phone"
                  placeholder="e.g. +15551234567 or 1001"
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cc_vicidial_label">Label</Label>
                <Input
                  id="cc_vicidial_label"
                  placeholder="e.g. Support Line, Sales Line..."
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cc_vicidial_assistant">Linked Assistant</Label>
                <Select
                  value={form.assistant_id || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, assistant_id: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="cc_vicidial_assistant">
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
                          <span
                            className={
                              alreadyLinked
                                ? "flex items-center gap-1.5 opacity-50"
                                : "flex items-center gap-1.5"
                            }
                          >
                            {alreadyLinked ? (
                              <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                            ) : (
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                            )}
                            {a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`}
                            {alreadyLinked && (
                              <span className="text-xs text-muted-foreground ml-1">(in use)</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function NumbersVicidial() {
  const [numbers, setNumbers] = useState<VicidialNumber[]>([]);
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
      const [viciRes, asstRes, twilioRes, vonageRes, telnyxRes] = await Promise.all([
        api.vicidial.listNumbers().catch(() => ({ numbers: [] })),
        api.dashboard.assistants(),
        api.twilio.listNumbers().catch(() => ({ numbers: [] })),
        api.vonage.listNumbers().catch(() => ({ numbers: [] })),
        api.telnyx.listNumbers().catch(() => ({ numbers: [] })),
      ]);

      const viciNumbers = (viciRes.numbers ?? []) as VicidialNumber[];
      setNumbers(viciNumbers);
      setAssistants((asstRes.assistants ?? []) as Assistant[]);

      const ids = new Set<number>();
      for (const n of (twilioRes.numbers ?? []) as Array<{ assistant_id: number | null }>) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      for (const n of (vonageRes.numbers ?? []) as Array<{ assistant_id: number | null }>) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      for (const n of (telnyxRes.numbers ?? []) as Array<{ assistant_id: number | null }>) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      for (const n of viciNumbers) {
        if (n.assistant_id != null) ids.add(n.assistant_id);
      }
      setLinkedAssistantIds(ids);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load Vicidial configurations."));
    } finally {
      setLoading(false);
    }
  }

  function handleAdded(num: VicidialNumber) {
    setNumbers((prev) => [num, ...prev]);
    if (num.assistant_id != null) {
      setLinkedAssistantIds((prev) => new Set(prev).add(num.assistant_id as number));
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await api.vicidial.deleteNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
      if (res?.unlinked_assistant?.name) {
        toast.success(`Vicidial unlinked. Assistant "${res.unlinked_assistant.name}" has been unlinked.`);
      } else {
        toast.success("Vicidial configuration removed.");
      }
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete configuration."));
    }
  }

  async function handleLinkAssistant(numberId: number, assistantId: number | null) {
    setSavingLinkId(numberId);
    try {
      const res = await api.vicidial.linkAssistant(numberId, assistantId);
      const updated = res.number as VicidialNumber;
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
          <h1 className="font-display text-h1 text-foreground">Numbers · Vicidial</h1>
        </div>
        <AddNumberDialog
          assistants={assistants}
          linkedAssistantIds={linkedAssistantIds}
          onAdded={handleAdded}
          disabled={loading}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Your Vicidial Configurations
          </CardTitle>
          <CardDescription>Each assistant can only be linked to one number at a time.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : numbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Phone className="h-8 w-8 opacity-30" />
              <span>
                No Vicidial configurations yet. Click <strong>Connect Vicidial</strong> to get started.
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone / Extension</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>List ID</TableHead>
                  <TableHead>Linked Assistant</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((num) => {
                  return (
                    <TableRow key={num.id}>
                      <TableCell className="font-mono text-sm">{num.phone_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {num.label ?? <span className="italic opacity-50">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{num.campaign_id}</TableCell>
                      <TableCell className="text-sm font-mono">{num.list_id}</TableCell>
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
                                const inUse =
                                  linkedAssistantIds.has(a.assistant_id) &&
                                  a.assistant_id !== num.assistant_id;
                                return (
                                  <SelectItem
                                    key={a.assistant_id}
                                    value={String(a.assistant_id)}
                                    disabled={inUse}
                                  >
                                    <span
                                      className={
                                        inUse
                                          ? "flex items-center gap-1.5 opacity-50"
                                          : "flex items-center gap-1.5"
                                      }
                                    >
                                      {inUse ? (
                                        <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                                      ) : (
                                        <Link2 className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      {a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`}
                                      {inUse && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          (in use)
                                        </span>
                                      )}
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
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(num.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              num.status === "connected"
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"
                                : "bg-rose-500"
                            }`}
                          />
                          <span className="text-xs font-medium capitalize">
                            {num.status === "connected" ? "Connected" : "Disconnected"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove configuration?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the configuration for{" "}
                                  <span className="font-mono font-semibold">
                                    {num.phone_number}
                                  </span>{" "}
                                  and its credentials from the platform.
                                  {num.assistant_name && (
                                    <>
                                      {" "}
                                      The assistant{" "}
                                      <span className="font-semibold">
                                        &quot;{num.assistant_name}&quot;
                                      </span>{" "}
                                      will be unlinked.
                                    </>
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
