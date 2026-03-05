/**
 * PAYG Settings page.
 *
 * Mirrors the CC Settings page (profile + password) and adds:
 *   - "Request Command Center Access" card (hidden for approved/admin users)
 *   - Real-time status of any pending request
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useUserProfile, USER_PROFILE_KEY } from "@/hooks/use-user-profile";
import { useQueryClient } from "@tanstack/react-query";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function PaygSettings() {
  const { toast }   = useToast();
  const qc          = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useUserProfile();

  // ── Profile ────────────────────────────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState("");
  const [username,      setUsername]      = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setDisplayName(profile.display_name ?? profile.username ?? "");
    }
  }, [profile]);

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
      qc.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      toast({ title: "Profile updated", description: "Your display name has been saved." });
    } catch (err) {
      toast({ title: "Failed to update profile", description: (err as Error).message, variant: "destructive" });
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
      await api.users.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast({ title: "Password changed", description: "Your password has been updated." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast({ title: "Failed to change password", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  // ── CC Access Request ──────────────────────────────────────────────────────
  const [requestMessage,  setRequestMessage]  = useState("");
  const [submittingReq,   setSubmittingReq]   = useState(false);

  const ccStatus    = profile?.cc_request_status;
  const ccAccess    = profile?.command_center_access;
  const isAdmin     = profile?.is_admin;

  // Show request card only when NOT admin and NOT already approved
  const showRequestCard = !isAdmin && !ccAccess;

  const handleSubmitRequest = async () => {
    setSubmittingReq(true);
    try {
      await api.accessRequests.submit(requestMessage.trim());
      qc.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      setRequestMessage("");
      toast({
        title: "Request submitted",
        description: "Your Command Center access request has been sent to the admin.",
      });
    } catch (err) {
      toast({
        title: "Failed to submit request",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
            </div>
          </div>
        </motion.div>

        {/* ── Command Center Access ─────────────────────────────────────────── */}
        {showRequestCard && (
          <motion.div variants={item}>
            <Card className="border-amber-500/30 bg-amber-500/[0.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">Command Center Access</CardTitle>
                  {ccStatus === "pending" && (
                    <Badge variant="outline" className="border-amber-400/40 text-amber-600 bg-amber-500/10 ml-auto">
                      <Clock className="h-3 w-3 mr-1" /> Pending Review
                    </Badge>
                  )}
                  {ccStatus === "rejected" && (
                    <Badge variant="outline" className="border-red-400/40 text-red-600 bg-red-500/10 ml-auto">
                      <XCircle className="h-3 w-3 mr-1" /> Not Approved
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {ccStatus === "pending"
                    ? "Your request is awaiting admin review. You will be notified once a decision is made."
                    : ccStatus === "rejected"
                    ? "Your previous request was not approved. You may submit a new request."
                    : "Request access to the full-featured Command Center interface."}
                </CardDescription>
              </CardHeader>

              {ccStatus !== "pending" && (
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="requestMessage">Message to admin (optional)</Label>
                    <Textarea
                      id="requestMessage"
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Briefly explain why you need Command Center access…"
                      rows={3}
                      className="resize-none border-amber-500/20 focus-visible:ring-amber-500/40"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSubmitRequest}
                      disabled={submittingReq || profileLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {submittingReq
                        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Request Command Center Access
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}

        {/* CC access already granted banner */}
        {(ccAccess || isAdmin) && (
          <motion.div variants={item}>
            <Card className="border-green-500/20 bg-green-500/[0.02]">
              <CardContent className="flex items-center gap-3 pt-4">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Command Center access is active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the "Command Center" button in the top bar to switch interfaces.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Profile</CardTitle>
              </div>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <User className="h-7 w-7 text-amber-500" />
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
                  className="border-amber-500/20 focus-visible:ring-amber-500/40"
                />
                <p className="text-xs text-muted-foreground">
                  Shown across the platform. Username ({username || "…"}) cannot be changed.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile || profileLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {savingProfile
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Password ─────────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Password</CardTitle>
              </div>
              <CardDescription>Change your account password.</CardDescription>
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
                    className="pr-10 border-amber-500/20 focus-visible:ring-amber-500/40"
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
                      className="pr-10 border-amber-500/20 focus-visible:ring-amber-500/40"
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
                    className="border-amber-500/20 focus-visible:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {savingPassword
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Shield className="h-3.5 w-3.5 mr-1.5" />}
                  Update password
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
