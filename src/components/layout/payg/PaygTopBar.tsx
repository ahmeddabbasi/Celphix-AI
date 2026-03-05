/**
 * PaygTopBar — top navigation bar for the Pay-As-You-Go interface.
 *
 * Amber/orange accent theme.
 * Shows a "Command Center" button when the user has CC access (approved or admin).
 * Delegates notification rendering to <NotificationPanel accent="amber">.
 */

import {
  ChevronDown, LogOut, Settings2, Monitor, Shield, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/use-user-profile";
import { NotificationPanel } from "@/components/NotificationPanel";

export function PaygTopBar() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const { data: profile } = useUserProfile();
  const isAdmin     = profile?.is_admin ?? false;
  const hasCCAccess = isAdmin || (profile?.command_center_access ?? false);

  const handleLogout = async () => {
    await logout(qc);
    navigate("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-amber-900/20 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">

      {/* Left — sidebar toggle + PAYG badge */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/15">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-sm font-semibold text-amber-600">Pay-As-You-Go</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Command Center switcher — visible only when user has CC access */}
        {hasCCAccess && (
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
            >
              <Monitor className="h-4 w-4" />
              <span className="font-medium">Command Center</span>
            </Button>
          </Link>
        )}

        {/* Admin Portal shortcut for admins */}
        {isAdmin && (
          <Link to="/admin">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 hover:text-amber-600"
            >
              <Shield className="h-4 w-4" />
              <span className="font-medium">Admin Portal</span>
            </Button>
          </Link>
        )}

        {/* Notifications — amber accent */}
        <NotificationPanel accent="amber" isAdmin={isAdmin} />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 text-sm font-normal">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-muted-foreground capitalize">
                {profile?.display_name || profile?.username || "Account"}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => navigate("/payg/settings")}>
              <Settings2 className="mr-2 h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                Admin Portal
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}

