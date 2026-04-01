import { Lock, Monitor, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function PaygSettings() {
  const { data: profile } = useUserProfile();
  const username = profile?.username ?? "";
  const displayName = profile?.display_name ?? "";

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

  return (
    <div className="max-w-3xl mx-auto space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
        {/* Header */}
        <div data-reveal>
          <h1 className="font-display text-h1 text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage account and preferences.</p>
        </div>

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
                disabled
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Request Command Center Access
              </Button>
              <p className="text-xs text-muted-foreground">Contact an admin to enable access.</p>
            </CardContent>
          </Card>
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
                  <Input id="payg-display" value={displayName || "—"} readOnly />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password */}
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
                  <Input id="payg-current" placeholder="••••••••" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payg-new">New password</Label>
                  <Input id="payg-new" placeholder="••••••••" disabled />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payg-confirm">Confirm password</Label>
                <Input id="payg-confirm" placeholder="••••••••" disabled />
              </div>

              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled>
                  Update password
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Password updates can be managed by an admin.</p>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
