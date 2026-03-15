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
  { title: "Twilio", url: "/payg/numbers/twilio" },
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
    <Sidebar collapsible="icon" className="border-r-0" style={{ backgroundColor: '#008613' }}>
      {/* Brand header */}
  <SidebarHeader className="border-b border-white/20 px-4 py-4" style={{ backgroundColor: '#008613' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white">Celphix</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Pay-As-You-Go
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

  <SidebarContent className="px-2 py-4" style={{ backgroundColor: '#008613' }}>
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
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:text-[#FFEA00]"
                      activeClassName="bg-white/20 text-[#FFEA00]"
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
                      navigate("/payg/numbers/twilio");
                      return;
                    }
                    setNumbersExpanded(!numbersExpanded);
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:text-[#FFEA00]"
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
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-white/90 transition-colors hover:bg-white/10 hover:text-[#FFEA00]"
                          activeClassName="bg-white/20 text-[#FFEA00]"
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

  <SidebarFooter className="border-t border-white/20 p-4" style={{ backgroundColor: '#008613' }}>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/payg/settings")}
            title="Settings"
              className={
              "w-full flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors font-bold text-white hover:bg-white/10 hover:text-[#FFEA00] " +
              (location.pathname === "/payg/settings" ? "bg-white/20 text-[#FFEA00]" : "")
            }
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col flex-1 text-left">
                <span className="text-sm font-bold capitalize">
                  {username || "User"}
                </span>
                <span className="text-xs text-white/70">Settings</span>
              </div>
            )}
          </button>

          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className="w-full justify-start font-bold text-white hover:text-[#FFEA00] hover:bg-white/10"
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
