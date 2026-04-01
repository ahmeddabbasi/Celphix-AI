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
  Hash,
  ChevronDown,
  LogOut,
  User,
  BarChart3,
  Mic2,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard",  url: "/payg",             icon: LayoutDashboard },
  { title: "Assistants", url: "/payg/assistants",  icon: Bot             },
  { title: "Voices",     url: "/payg/voices",      icon: Mic2            },
  { title: "Analytics",  url: "/payg/analytics",   icon: BarChart3       },
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
    <Sidebar collapsible="icon" className="border-r-0">
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
                      className={cn(
                        "flex items-center rounded-[12px] py-2 text-sm font-semibold text-sidebar-foreground/90 transition-[background-color,color,transform,opacity] duration-200 ease-out hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center px-0" : "gap-3 px-3",
                      )}
                      activeClassName="bg-sidebar-primary/40 text-sidebar-primary-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span
                        className={cn(
                          "transition-[opacity,transform,width] duration-200 ease-out",
                          collapsed
                            ? "opacity-0 -translate-x-1 pointer-events-none w-0 overflow-hidden"
                            : "opacity-100 translate-x-0",
                        )}
                      >
                        {item.title}
                      </span>
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
                  className={cn(
                    "flex items-center rounded-[12px] py-2 text-sm font-semibold text-sidebar-foreground/90 transition-[background-color,color,transform,opacity] duration-200 ease-out hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                  )}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      "transition-[opacity,transform,width] duration-200 ease-out",
                      collapsed
                        ? "opacity-0 -translate-x-1 pointer-events-none w-0 overflow-hidden"
                        : "opacity-100 translate-x-0 flex-1",
                    )}
                  >
                    Numbers
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={
                        "h-4 w-4 transition-transform " +
                        (numbersExpanded ? "rotate-180" : "")
                      }
                    />
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
                          className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-semibold text-sidebar-foreground/80 transition-[background-color,color] duration-200 ease-out hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-primary/40 text-sidebar-primary-foreground"
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

      <SidebarFooter className="border-t border-sidebar-border/40 p-4">
        <div className="space-y-3">
          <button
            onClick={() => navigate("/payg/settings")}
            title="Settings"
              className={
              "w-full flex items-center gap-3 rounded-[12px] px-2 py-1.5 transition-[background-color,color] duration-200 ease-out font-semibold text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground " +
              (location.pathname === "/payg/settings" ? "bg-sidebar-primary/40 text-sidebar-primary-foreground" : "")
            }
          >
            <div className="h-8 w-8 rounded-full bg-sidebar-accent/50 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-sidebar-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col flex-1 text-left">
                <span className="text-sm font-semibold capitalize">
                  {username || "User"}
                </span>
                <span className="text-xs text-sidebar-foreground/70">Settings</span>
              </div>
            )}
          </button>

          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className={cn(
              "w-full font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
              collapsed ? "justify-center" : "justify-start",
            )}
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
