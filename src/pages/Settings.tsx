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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Settings() {
  const { toast } = useToast();

  // ── Profile ────────────────────────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState("");
  const [username,       setUsername]       = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);

  // Seed display name + username from /api/auth/me on mount
  useEffect(() => {
    setProfileLoading(true);
    api.get<{ username: string; display_name: string | null }>("/api/auth/me")
      .then((data) => {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? data.username ?? "");
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
      toast({ title: "Profile updated", description: "Your display name has been saved." });
    } catch (err) {
      toast({
        title: "Failed to update profile",
        description: (err as Error).message,
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
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Page header */}
        <motion.div variants={item}>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage account and preferences.
          </p>
        </motion.div>

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <motion.div variants={item}>
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
        </motion.div>

        {/* ── Password ─────────────────────────────────────────────────────── */}
        <motion.div variants={item}>
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
        </motion.div>

      </motion.div>
    </div>
  );
}
