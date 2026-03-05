/**
 * PaygSidebar — sidebar navigation for the Pay-As-You-Go interface.
 *
 * Visual theme: amber / warm-orange accent (distinct from Command Center's blue-primary).
 * Route prefix: /payg/*
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  Hash,
  ChevronDown,
  Zap,
  LogOut,
  User,
  BarChart3,
  Calendar as CalendarIcon,
  Mic2,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { logout, getUsername } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard",  url: "/payg",             icon: LayoutDashboard },
  { title: "Assistants", url: "/payg/assistants",  icon: Bot             },
  { title: "Voices",     url: "/payg/voices",      icon: Mic2            },
  { title: "CRM",        url: "/payg/crm",         icon: Users           },
  { title: "Analytics",  url: "/payg/analytics",   icon: BarChart3       },
  { title: "Calendar",   url: "/payg/calendar",    icon: CalendarIcon    },
  { title: "Calls",      url: "/payg/calls",       icon: Phone           },
];

const numbersItems = [
  { title: "Custom SIP", url: "/payg/numbers/custom-sip" },
  { title: "Telnyx",     url: "/payg/numbers/telnyx"     },
  { title: "Twilio",     url: "/payg/numbers/twilio"     },
];

export function PaygSidebar() {
  const { state } = useSidebar();
  const collapsed  = state === "collapsed";
  const location   = useLocation();
  const navigate   = useNavigate();
  const username   = getUsername();
  const qc         = useQueryClient();

  const onNumbersRoute =
    location.pathname === "/payg/numbers" ||
    location.pathname.startsWith("/payg/numbers/");

  const [numbersExpanded, setNumbersExpanded] = useState(() =>
    !collapsed && onNumbersRoute,
  );

  useEffect(() => {
    if (!collapsed && onNumbersRoute) setNumbersExpanded(true);
  }, [collapsed, onNumbersRoute]);

  const isActive = (path: string) => {
    if (path === "/payg") return location.pathname === "/payg";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout(qc);
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-amber-900/20 bg-amber-950/5">
      {/* Brand header */}
      <SidebarHeader className="border-b border-amber-900/20 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground">Celphix</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-amber-500/80">
                Pay-As-You-Go
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/payg"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                      activeClassName="bg-amber-500/15 text-amber-600"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Numbers expandable group */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onNumbersRoute}
                  tooltip="Numbers"
                  onClick={() => {
                    if (collapsed) {
                      navigate("/payg/numbers/custom-sip");
                      return;
                    }
                    setNumbersExpanded(!numbersExpanded);
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">Numbers</span>
                      <ChevronDown
                        className={
                          "h-4 w-4 transition-transform " +
                          (numbersExpanded ? "rotate-180" : "")
                        }
                      />
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && numbersExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {numbersItems.map((n) => (
                    <SidebarMenuItem key={n.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === n.url}
                        tooltip={n.title}
                      >
                        <NavLink
                          to={n.url}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                          activeClassName="bg-amber-500/15 text-amber-600"
                        >
                          <span className="text-[10px] w-4 text-center">•</span>
                          <span>{n.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-amber-900/20 p-4">
        <div className="space-y-3">
          <button
            onClick={() => navigate("/payg/settings")}
            title="Settings"
            className={
              "w-full flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors " +
              "hover:bg-amber-500/10 hover:text-amber-600 " +
              (location.pathname === "/payg/settings"
                ? "bg-amber-500/15 text-amber-600"
                : "")
            }
          >
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-amber-500" />
            </div>
            {!collapsed && (
              <div className="flex flex-col flex-1 text-left">
                <span className="text-sm font-medium text-foreground capitalize">
                  {username || "User"}
                </span>
                <span className="text-xs text-muted-foreground">Settings</span>
              </div>
            )}
          </button>

          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
