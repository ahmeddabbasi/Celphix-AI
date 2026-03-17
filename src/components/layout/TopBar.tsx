/**
 * TopBar — Command Center top navigation bar.
 *
 * - Uses useUserProfile for profile/admin status
 * - Delegates all notification rendering to <NotificationPanel accent="primary">
 * - Shows "Pay-As-You-Go" switcher button for approved/admin users
 */

import { ChevronDown, Shield, User, LogOut, Settings2, Zap } from "lucide-react";
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
    <header className="cc-topbar flex h-14 items-center justify-between border-b px-6">

      {/* Left — sidebar toggle */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 text-white hover:text-[#ffea00] transition-colors" />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Pay-As-You-Go switcher — visible for approved users + admins */}
        {showPaygSwitcher && (
          <Link to="/payg">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[#ffea00] bg-[#ffea00] text-[#0a2a0a] font-bold hover:bg-[#ffea00]/85 hover:border-[#ffea00]/85"
            >
              <Zap className="h-4 w-4" />
              <span className="font-bold">Pay-As-You-Go</span>
            </Button>
          </Link>
        )}

        {/* Admin Portal — only for admins */}
        {isAdmin && (
          <Link to="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 font-bold text-white hover:text-[#ffea00] hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              <span className="font-bold">Admin Portal</span>
            </Button>
          </Link>
        )}

        {/* Notifications */}
        <NotificationPanel accent="primary" isAdmin={isAdmin} />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 text-sm font-bold text-white hover:text-[#ffea00] hover:bg-white/10">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="capitalize">
                {profile?.display_name || profile?.username || "Account"}
              </span>
              <ChevronDown className="h-3 w-3 text-white/70" />
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
