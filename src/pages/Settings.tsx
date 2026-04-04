import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useQueryClient } from "@tanstack/react-query";
import { USER_PROFILE_KEY } from "@/hooks/use-user-profile";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Profile ────────────────────────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState("");
  const [username,       setUsername]       = useState("");
  const [authProvider,   setAuthProvider]   = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);

  // Seed display name + username from /api/auth/me on mount
  useEffect(() => {
    setProfileLoading(true);
    api.get<{ username: string; display_name: string | null; auth_provider: string | null }>("/api/auth/me")
      .then((data) => {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? data.username ?? "");
        setAuthProvider(data.auth_provider ?? null);
      })
      .catch(() => { /* silently ignore — fields stay empty */ })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.users.updateProfile({ display_name: trimmed });
      setDisplayName(res.display_name);
      await qc.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      toast({ title: "Profile updated", description: "Your display name has been saved." });
    } catch (err) {
      toast({
        title: "Failed to update profile",
        description: getErrorMessage(err, "Unable to update profile"),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [savingPassword,  setSavingPassword]  = useState(false);

  const showPasswordSection = (authProvider || "").toLowerCase() !== "google";

  // ── Ticket ───────────────────────────────────────────────────────────────
  const [ticketMessage, setTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const handleSubmitTicket = async () => {
    const trimmed = ticketMessage.trim();
    if (!trimmed) {
      toast({ title: "Message cannot be empty", variant: "destructive" });
      return;
    }
    setSubmittingTicket(true);
    try {
      await api.supportTickets.submit({ interface_type: "cc", message: trimmed });
      toast({ title: "Ticket submitted", description: "An admin has been notified." });
      setTicketMessage("");
    } catch (err) {
      toast({
        title: "Failed to submit ticket",
        description: getErrorMessage(err, "Unable to send your message"),
        variant: "destructive",
      });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "All password fields are required", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await api.users.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast({ title: "Password changed", description: "Your password has been updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({
        title: "Failed to change password",
        description: getErrorMessage(err, "Unable to change password"),
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-[clamp(28px,4vw,56px)]">
      {/* Page header */}
      <div data-reveal>
        <h1 className="font-display text-h1 text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground/80">Manage account and preferences.</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Profile</CardTitle>
              </div>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  {profileLoading ? (
                    <div className="space-y-1">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{displayName || username || "User"}</p>
                      <p className="text-xs text-muted-foreground">{username}</p>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  disabled={profileLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Username ({username || "…"}) cannot be changed.
                </p>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile || profileLoading}>
                  {savingProfile
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save profile
                </Button>
              </div>
            </CardContent>
      </Card>

      {/* ── Password ─────────────────────────────────────────────────────── */}
      {showPasswordSection && (
        <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Reset Password</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword
                      ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      : <Shield className="h-3.5 w-3.5 mr-1.5" />}
                    Update password
                  </Button>
                </div>
              </CardContent>
        </Card>
      )}

      {/* ── Ticket ───────────────────────────────────────────────────────── */}
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
            <Label htmlFor="cc-ticket">Message</Label>
            <Textarea
              id="cc-ticket"
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Describe the issue…"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmitTicket} disabled={submittingTicket}>
              {submittingTicket
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <MessageSquare className="h-3.5 w-3.5 mr-1.5" />}
              Send ticket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
