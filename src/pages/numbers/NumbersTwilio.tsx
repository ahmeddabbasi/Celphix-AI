import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Phone, PhoneCall, Link2, Unlink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Animation ─────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// ─── Add Number Dialog ─────────────────────────────────────────────────────────

function AddNumberDialog({
  assistants,
  linkedAssistantIds,
  onAdded,
}: {
  assistants: Assistant[];
  linkedAssistantIds: Set<number>;
  onAdded: (num: TwilioNumber) => void;
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
        assistant_id: form.assistant_id && form.assistant_id !== "__none__" ? Number(form.assistant_id) : null,
      });
      onAdded(res.number);
      toast.success(`Number ${res.number.phone_number} added.`);
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add number.");
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
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Twilio Number</DialogTitle>
            <DialogDescription>
              All fields are required. Credentials are encrypted at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            {/* Account SID */}
            <div className="grid gap-1.5">
              <Label htmlFor="add_account_sid">Account SID</Label>
              <Input
                id="add_account_sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={form.account_sid}
                onChange={(e) => setForm((f) => ({ ...f, account_sid: e.target.value }))}
                required
                autoComplete="off"
              />
            </div>

            {/* Auth Token */}
            <div className="grid gap-1.5">
              <Label htmlFor="add_auth_token">Auth Token</Label>
              <Input
                id="add_auth_token"
                type="password"
                placeholder="Your Twilio Auth Token"
                value={form.auth_token}
                onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Phone Number */}
            <div className="grid gap-1.5">
              <Label htmlFor="add_phone_number">Phone Number (E.164)</Label>
              <Input
                id="add_phone_number"
                placeholder="+15550001234"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                required
              />
            </div>

            {/* Label */}
            <div className="grid gap-1.5">
              <Label htmlFor="add_label">Label</Label>
              <Input
                id="add_label"
                placeholder="e.g. Sales line, Support…"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
              />
            </div>

            {/* Linked Assistant */}
            <div className="grid gap-1.5">
              <Label htmlFor="add_assistant">Linked Assistant</Label>
              <Select
                value={form.assistant_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, assistant_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger id="add_assistant">
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
                          {alreadyLinked
                            ? <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                            : <Link2 className="h-3 w-3 flex-shrink-0" />}
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

// ─── Start Call Dialog ─────────────────────────────────────────────────────────

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
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start call.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled} title={disabled ? "Link an assistant first" : "Start outbound call"}>
          <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
          Call
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
              <Label htmlFor="to_number">Destination Number (E.164)</Label>
              <Input
                id="to_number"
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NumbersTwilio() {
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingSaving, setLinkingSaving] = useState<number | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [numRes, asstRes] = await Promise.all([
        api.twilio.listNumbers(),
        api.dashboard.assistants(),
      ]);
      setNumbers(numRes.numbers);
      setAssistants(asstRes.assistants);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load Twilio numbers.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdded(num: TwilioNumber) {
    setNumbers((prev) => [num, ...prev]);
  }

  async function handleDelete(id: number) {
    try {
      const res = await api.twilio.deleteNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
      if (res?.unlinked_assistant?.name) {
        toast.success(`Number removed. Assistant "${res.unlinked_assistant.name}" has been unlinked.`);
      } else {
        toast.success("Number removed.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete number.");
    }
  }

  async function handleLinkAssistant(numberId: number, assistantId: number | null) {
    setLinkingSaving(numberId);
    try {
      const res = await api.twilio.linkAssistant(numberId, assistantId);
      setNumbers((prev) => prev.map((n) => (n.id === numberId ? res.number : n)));
      toast.success(assistantId ? "Assistant linked." : "Assistant unlinked.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update assistant link.");
    } finally {
      setLinkingSaving(null);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Numbers · Twilio</h1>
        </div>
        <AddNumberDialog
          assistants={assistants}
          linkedAssistantIds={new Set(numbers.filter((n) => n.assistant_id !== null).map((n) => n.assistant_id as number))}
          onAdded={handleAdded}
        />
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Your Twilio Numbers
            </CardTitle>
            <CardDescription>
              Each assistant can only be linked to one number at a time.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : numbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                <Phone className="h-8 w-8 opacity-30" />
                <span>No Twilio numbers yet. Click <strong>Add Number</strong> to get started.</span>
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
                  {numbers.map((num) => (
                    <TableRow key={num.id}>
                      <TableCell className="font-mono text-sm">{num.phone_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {num.label ?? <span className="italic opacity-50">—</span>}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Assistants already linked to OTHER numbers
                          const takenByOther = new Set(
                            numbers
                              .filter((n) => n.id !== num.id && n.assistant_id !== null)
                              .map((n) => n.assistant_id as number)
                          );
                          return (
                            <Select
                              value={num.assistant_id ? String(num.assistant_id) : "__none__"}
                              onValueChange={(v) =>
                                handleLinkAssistant(num.id, v === "__none__" ? null : Number(v))
                              }
                              disabled={linkingSaving === num.id}
                            >
                              <SelectTrigger className="h-8 w-48 text-xs">
                                <SelectValue placeholder="Select assistant…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Unlink className="h-3 w-3" />
                                    Unlinked
                                  </span>
                                </SelectItem>
                                {assistants.map((a) => {
                                  const taken = takenByOther.has(a.assistant_id);
                                  const takenByNum = numbers.find(
                                    (n) => n.id !== num.id && n.assistant_id === a.assistant_id
                                  );
                                  return (
                                    <SelectItem
                                      key={a.assistant_id}
                                      value={String(a.assistant_id)}
                                      disabled={taken}
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={taken ? "flex items-center gap-1.5 opacity-50" : "flex items-center gap-1.5"}>
                                            {taken
                                              ? <AlertCircle className="h-3 w-3 text-accent-foreground flex-shrink-0" />
                                              : <Link2 className="h-3 w-3 flex-shrink-0" />}
                                            {a.assistant_name ?? a.agent_key ?? `#${a.assistant_id}`}
                                            {taken && <span className="text-xs text-muted-foreground">(in use)</span>}
                                          </span>
                                        </TooltipTrigger>
                                        {taken && (
                                          <TooltipContent side="right">
                                            Already linked to {takenByNum?.phone_number ?? "another number"}
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {num.created_at
                          ? new Date(num.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <StartCallDialog
                            number={num}
                            disabled={!num.assistant_id}
                          />
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
                                <AlertDialogTitle>Remove number?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove{" "}
                                  <span className="font-mono font-semibold">{num.phone_number}</span>{" "}
                                  and its encrypted credentials from the platform.
                                  {num.assistant_name && (
                                    <> The assistant <span className="font-semibold">"{num.assistant_name}"</span> will be unlinked from this number.</>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
