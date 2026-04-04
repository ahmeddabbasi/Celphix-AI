import { Eye, EyeOff, Loader2, Lock, Monitor, Save, User, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { USER_PROFILE_KEY } from "@/hooks/use-user-profile";
import { NOTIFICATIONS_KEY } from "@/hooks/use-notifications";
import { useEffect, useState } from "react";

export default function PaygSettings() {
  const { data: profile } = useUserProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const username = profile?.username ?? "";
  const initialDisplayName = profile?.display_name ?? "";
  const [displayName, setDisplayName] = useState<string>(initialDisplayName);

  // Keep input in sync when profile loads/changes
  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  const isAdmin = profile?.is_admin ?? false;
  const hasCCAccess = isAdmin || (profile?.command_center_access ?? false);

  const ccStatus = profile?.cc_request_status;
  const ccStatusLabel = ccStatus === "pending"
    ? "Pending"
    : ccStatus === "approved"
      ? "Approved"
      : ccStatus === "rejected"
        ? "Rejected"
        : ccStatus === "revoked"
          ? "Revoked"
          : "Not requested";

  const submitAccessRequest = useMutation({
    mutationFn: async () => api.accessRequests.submit(""),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: USER_PROFILE_KEY }),
        qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
      ]);
      toast({
        title: "Request submitted",
        description: "An admin has been notified. You’ll see an in-app notification when it’s reviewed.",
        duration: 4000,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: getErrorMessage(err, "Unable to submit access request"),
        duration: 5000,
      });
    },
  });

  const canRequest = !hasCCAccess && ccStatus !== "pending";
  const requestButtonLabel = hasCCAccess
    ? "Access enabled"
    : ccStatus === "pending"
      ? "Request submitted"
      : "Request Command Center Access";

  const updateProfile = useMutation({
    mutationFn: async () => {
      const trimmed = displayName.trim();
      if (!trimmed) throw new Error("Display name cannot be empty");
      return api.users.updateProfile({ display_name: trimmed });
    },
    onSuccess: async (res) => {
      setDisplayName(res.display_name);
      await qc.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      toast({ title: "Profile updated", description: "Your display name has been saved.", duration: 3000 });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: getErrorMessage(err, "Unable to update display name"),
        duration: 5000,
      });
    },
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const showPasswordSection = (profile?.auth_provider ?? "").toLowerCase() !== "google";

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("All password fields are required");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      return api.users.changePassword({ current_password: currentPassword, new_password: newPassword });
    },
    onSuccess: () => {
      toast({ title: "Password changed", description: "Your password has been updated.", duration: 3000 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to change password",
        description: getErrorMessage(err, "Unable to change password"),
        duration: 5000,
      });
    },
  });

  // ── Ticket ───────────────────────────────────────────────────────────────
  const [ticketMessage, setTicketMessage] = useState("");
  const submitTicket = useMutation({
    mutationFn: async () => {
      const trimmed = ticketMessage.trim();
      if (!trimmed) throw new Error("Message cannot be empty");
      return api.supportTickets.submit({ interface_type: "payg", message: trimmed });
    },
    onSuccess: async () => {
      setTicketMessage("");
      await qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast({ title: "Ticket submitted", description: "An admin has been notified.", duration: 3500 });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to submit ticket",
        description: getErrorMessage(err, "Unable to send your message"),
        duration: 5000,
      });
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
        {/* Header */}
        <div data-reveal>
          <h1 className="font-display text-h1 text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage account and preferences.</p>
        </div>

        {/* Profile */}
        <div data-reveal>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Profile</CardTitle>
              </div>
              <CardDescription>Basic account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{displayName || username || "Account"}</p>
                  <p className="text-xs text-muted-foreground">{username || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="payg-username">Username</Label>
                  <Input id="payg-username" value={username || "—"} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payg-display">Display name</Label>
                  <Input
                    id="payg-display"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={username || "Your name"}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password */}
        {showPasswordSection && (
          <div data-reveal>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Reset Password</CardTitle>
                </div>
                <CardDescription>Change your password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="payg-current">Current password</Label>
                    <div className="relative">
                      <Input
                        id="payg-current"
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showCurrent ? "Hide password" : "Show password"}
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payg-new">New password</Label>
                    <div className="relative">
                      <Input
                        id="payg-new"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showNew ? "Hide password" : "Show password"}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payg-confirm">Confirm password</Label>
                  <Input
                    id="payg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changePassword.mutate()}
                    disabled={changePassword.isPending}
                  >
                    {changePassword.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Update password
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Command Center Access */}
        <div data-reveal>
          <Card className="border-accent/30 bg-accent/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-accent-foreground" />
                <CardTitle className="text-base">Command Center Access</CardTitle>
              </div>
              <CardDescription>
                Request access to the full-featured Command Center interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-semibold text-foreground">{ccStatusLabel}</p>
              </div>
              <Button
                size="sm"
                disabled={!canRequest || submitAccessRequest.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => submitAccessRequest.mutate()}
              >
                {submitAccessRequest.isPending ? "Submitting…" : requestButtonLabel}
              </Button>
              <p className="text-xs text-muted-foreground">
                {hasCCAccess
                  ? "You can switch to Command Center from the top bar."
                  : ccStatus === "pending"
                    ? "Your request is pending review by an admin."
                    : "Submit a request and an admin can approve or deny it."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ticket */}
        <div data-reveal>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Ticket</CardTitle>
              </div>
              <CardDescription>Send a complaint or question to an admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="payg-ticket">Message</Label>
                <Textarea
                  id="payg-ticket"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe the issue…"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitTicket.mutate()}
                  disabled={submitTicket.isPending}
                >
                  {submitTicket.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Send ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
