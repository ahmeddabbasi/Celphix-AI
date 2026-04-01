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
    <header className="topbar payg-topbar" role="banner">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 -ml-2">
        <Link to="/" className="topbar__logo" aria-label="Celphix Home">
          <img
            src="/salesagent/LOGO.png"
            alt="Celphix"
            className="topbar__logo-img"
            loading="eager"
            decoding="async"
          />
        </Link>

        <SidebarTrigger className="ml-6 text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors" />
      </div>

      <div className="topbar__actions">

        {/* Command Center switcher */}
        {hasCCAccess && (
          <Link to="/">
            <Button
              size="sm"
              className="gap-2 font-semibold bg-accent text-accent-foreground shadow-ambient hover:shadow-elevated hover:bg-accent/90"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Command Center</span>
            </Button>
          </Link>
        )}

        {/* Admin Portal shortcut for admins */}
        {isAdmin && (
            <Link to="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Button>
          </Link>
        )}

        {/* Notifications */}
        <NotificationPanel
          accent="amber"
          isAdmin={isAdmin}
          triggerClassName="bg-accent text-accent-foreground hover:bg-accent/90 shadow-ambient"
          triggerIconClassName="text-accent-foreground"
        />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 text-sm font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent/50">
                <Zap className="h-3.5 w-3.5 text-sidebar-foreground" />
              </div>
              <span className="capitalize hidden sm:inline">
                {profile?.display_name || profile?.username || "Account"}
              </span>
              <ChevronDown className="h-3 w-3" />
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

