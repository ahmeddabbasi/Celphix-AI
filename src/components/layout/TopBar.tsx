/**
 * TopBar — Command Center top navigation bar.
 *
 * - Uses useUserProfile for profile/admin status
 * - Delegates all notification rendering to <NotificationPanel accent="primary">
 * - Shows "Pay-As-You-Go" switcher button for approved/admin users
 */

import { Search, ChevronDown, Shield, User, LogOut, Settings2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function TopBar() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const { data: profile } = useUserProfile();
  const isAdmin           = profile?.is_admin ?? false;
  const showPaygSwitcher  = isAdmin || (profile?.command_center_access ?? false);

  const handleLogout = async () => {
    await logout(qc);
    navigate("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">

      {/* Left — sidebar toggle + search */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 bg-muted/50 border-0 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Pay-As-You-Go switcher — visible for approved users + admins */}
        {showPaygSwitcher && (
          <Link to="/payg">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-accent bg-accent text-accent-foreground hover:bg-accent/85 hover:border-accent/85"
            >
              <Zap className="h-4 w-4" />
              <span className="font-medium">Pay-As-You-Go</span>
            </Button>
          </Link>
        )}

        {/* Admin Portal — only for admins */}
        {isAdmin && (
          <Link to="/admin">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
            >
              <Shield className="h-4 w-4" />
              <span className="font-medium">Admin Portal</span>
            </Button>
          </Link>
        )}

        {/* Notifications — delegates to shared NotificationPanel */}
        <NotificationPanel accent="primary" isAdmin={isAdmin} />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 text-sm font-normal">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground capitalize">
                {profile?.display_name || profile?.username || "Account"}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings2 className="mr-2 h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                Admin Portal
              </DropdownMenuItem>
            )}
            {showPaygSwitcher && (
              <DropdownMenuItem onClick={() => navigate("/payg")}>
                <Zap className="mr-2 h-3.5 w-3.5" />
                Pay-As-You-Go
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
