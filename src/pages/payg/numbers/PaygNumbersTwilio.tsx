import { useMemo, useState } from "react";
import { Link2, Phone, PhoneCall, Plus, Trash2, Unlink, AlertCircle } from "lucide-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { paygApi as api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

type TwilioNumber = {
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
};

type TwilioNumbersQueryData = {
  numbers: TwilioNumber[];
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
  onAdded: (num: TwilioNumber) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    account_sid: "",
    auth_token: "",
    phone_number: "",
    label: "",
    assistant_id: "" as string,
  });

  function reset() {
    setForm({ account_sid: "", auth_token: "", phone_number: "", label: "", assistant_id: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assistant_id || form.assistant_id === "__none__") {
      toast.error("Please select an assistant to link to this number.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.twilio.addNumber({
        account_sid: form.account_sid.trim(),
        auth_token: form.auth_token.trim(),
        phone_number: form.phone_number.trim(),
        label: form.label.trim() || null,
        assistant_id: Number(form.assistant_id),
      });
      onAdded(res.number as TwilioNumber);
      toast.success(`Number ${res.number.phone_number} added.`);
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
            <DialogTitle>Add Twilio Number</DialogTitle>
            <DialogDescription>All fields are required. Credentials are encrypted at rest.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="payg_add_account_sid">Account SID</Label>
              <Input
                id="payg_add_account_sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={form.account_sid}
                onChange={(e) => setForm((f) => ({ ...f, account_sid: e.target.value }))}
                required
                autoComplete="off"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_add_auth_token">Auth Token</Label>
              <Input
                id="payg_add_auth_token"
                type="password"
                placeholder="Your Twilio Auth Token"
                value={form.auth_token}
                onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_add_phone_number">Phone Number (E.164)</Label>
              <Input
                id="payg_add_phone_number"
                placeholder="+15550001234"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_add_label">Label</Label>
              <Input
                id="payg_add_label"
                placeholder="e.g. Sales line, Support…"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="payg_add_assistant">Linked Assistant</Label>
              <Select
                value={form.assistant_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, assistant_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger id="payg_add_assistant">
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

function LinkAssistantDialog({
  number,
  assistants,
  linkedAssistantIds,
  disabled,
  onSaved,
}: {
  number: TwilioNumber;
  assistants: Assistant[];
  linkedAssistantIds: Set<number>;
  disabled?: boolean;
  onSaved: (updated: TwilioNumber) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assistantValue, setAssistantValue] = useState(
    number.assistant_id != null ? String(number.assistant_id) : "__none__",
  );

  async function handleSave() {
    const assistantId = assistantValue === "__none__" ? null : Number(assistantValue);
    setSaving(true);
    try {
      const res = await api.twilio.linkAssistant(number.id, assistantId);
      onSaved(res.number as TwilioNumber);
      toast.success("Saved.");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  }

  const currentId = number.assistant_id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          {number.assistant_id == null ? "Link" : "Change"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Link Assistant</DialogTitle>
          <DialogDescription>
            Link <span className="font-mono font-semibold">{number.phone_number}</span> to an assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor={`payg_link_asst_${number.id}`}>Assistant</Label>
          <Select value={assistantValue} onValueChange={setAssistantValue}>
            <SelectTrigger id={`payg_link_asst_${number.id}`}>
              <SelectValue placeholder="Select an assistant…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="flex items-center gap-1.5">
                  <Unlink className="h-3 w-3 flex-shrink-0" />
                  Unlink
                </span>
              </SelectItem>
              {assistants.map((a) => {
                const alreadyLinked = linkedAssistantIds.has(a.assistant_id) && a.assistant_id !== currentId;
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartCallDialog({ number, disabled }: { number: TwilioNumber; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [toNumber, setToNumber] = useState("");
  const [calling, setCalling] = useState(false);

  async function handleCall(e: React.FormEvent) {
    e.preventDefault();
    if (!toNumber.trim()) return;
    setCalling(true);
    try {
      const res = await api.twilio.startCall(number.id, toNumber.trim());
      toast.success(`Call initiated to ${res.to}. SID: ${res.call_sid}`);
      setOpen(false);
      setToNumber("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to start call."));
    } finally {
      setCalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled} title={disabled ? "Link an assistant first" : "Start an outbound call"}>
          <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
          Start Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleCall}>
          <DialogHeader>
            <DialogTitle>Start Outbound Call</DialogTitle>
            <DialogDescription>
              Calling from <span className="font-mono">{number.phone_number}</span> using{" "}
              <span className="font-medium">{number.assistant_name ?? "linked assistant"}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`payg_to_${number.id}`}>Destination Number (E.164)</Label>
              <Input
                id={`payg_to_${number.id}`}
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

export default function PaygNumbersTwilio() {
  const authed = isAuthenticated();
  const queryClient = useQueryClient();

  const assistantsQ = useQuery({
    queryKey: ["payg", "assistants", "list"],
    queryFn: () => api.dashboard.assistants(),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: authed ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["payg", "twilio", "numbers"],
    queryFn: () => api.twilio.listNumbers(),
    enabled: authed,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchInterval: authed ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  const rows: TwilioNumber[] = useMemo(
    () => (data?.numbers ?? []) as TwilioNumber[],
    [data?.numbers],
  );
  const assistants: Assistant[] = useMemo(
    () => (assistantsQ.data?.assistants ?? []) as Assistant[],
    [assistantsQ.data?.assistants],
  );
  const linkedAssistantIds = useMemo(
    () => new Set(rows.filter((n) => n.assistant_id != null).map((n) => n.assistant_id as number)),
    [rows],
  );

  function handleAdded(num: TwilioNumber) {
    // Fast local update + eventual refetch.
    queryClient.setQueryData<TwilioNumbersQueryData>(["payg", "twilio", "numbers"], (prev) => {
      const prevNumbers = prev?.numbers ?? [];
      return { ...(prev ?? { numbers: [] }), numbers: [num, ...prevNumbers] };
    });
  }

  function handleUpdated(updated: TwilioNumber) {
    queryClient.setQueryData<TwilioNumbersQueryData>(["payg", "twilio", "numbers"], (prev) => {
      const prevNumbers = prev?.numbers ?? [];
      return {
        ...(prev ?? { numbers: [] }),
        numbers: prevNumbers.map((n) => (n.id === updated.id ? updated : n)),
      };
    });
  }

  async function handleDelete(id: number) {
    try {
      const res = await api.twilio.deleteNumber(id);
      queryClient.setQueryData<TwilioNumbersQueryData>(["payg", "twilio", "numbers"], (prev) => {
        const prevNumbers = prev?.numbers ?? [];
        return { ...(prev ?? { numbers: [] }), numbers: prevNumbers.filter((n) => n.id !== id) };
      });
      if (res?.unlinked_assistant?.name) {
        toast.success(`Number removed. Assistant "${res.unlinked_assistant.name}" has been unlinked.`);
      } else {
        toast.success("Number removed.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete number."));
    }
  }

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">Numbers · Twilio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and link phone numbers.</p>
        </div>
        <AddNumberDialog
          assistants={assistants}
          linkedAssistantIds={linkedAssistantIds}
          onAdded={handleAdded}
          disabled={!authed || assistantsQ.isPending}
        />
      </div>

      <div data-reveal>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Your Twilio Numbers
            </CardTitle>
            <CardDescription>Each assistant can be linked to one number at a time.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isError && (
              <div className="px-5 pt-5">
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {(error as Error)?.message ?? "Failed to load numbers"}
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Linked Assistant</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No numbers connected yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.phone_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.label ? r.label : <span className="italic opacity-50">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.assistant_id == null ? (
                          <span className="text-muted-foreground">Unlinked</span>
                        ) : (
                          <span className="font-medium text-foreground">{r.assistant_name ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="default">Connected</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <LinkAssistantDialog
                            number={r}
                            assistants={assistants}
                            linkedAssistantIds={linkedAssistantIds}
                            disabled={!authed || assistantsQ.isPending}
                            onSaved={handleUpdated}
                          />
                          <StartCallDialog number={r} disabled={!r.assistant_id} />

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove number?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove{" "}
                                  <span className="font-mono font-semibold">{r.phone_number}</span> and its encrypted
                                  credentials from the platform.
                                  {r.assistant_name && (
                                    <>
                                      {" "}
                                      The assistant <span className="font-semibold">"{r.assistant_name}"</span> will be
                                      unlinked.
                                    </>
                                  )}{" "}
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(r.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
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
