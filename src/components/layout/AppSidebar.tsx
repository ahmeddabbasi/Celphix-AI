import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  Hash,
  ChevronDown,
  Activity,
  LogOut,
  User,
  BarChart3,
  Calendar as CalendarIcon,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard",  url: "/",          icon: LayoutDashboard },
  { title: "Assistants", url: "/assistants", icon: Bot             },
  { title: "Voices",     url: "/voices",     icon: Mic2            },
  { title: "CRM",        url: "/crm",        icon: Users           },
  { title: "Analytics",  url: "/analytics",  icon: BarChart3       },
  { title: "Calendar",   url: "/calendar",   icon: CalendarIcon    },
  { title: "Calls",      url: "/calls",      icon: Phone           },
];

const numbersItems = [
  { title: "Custom SIP", url: "/numbers/custom-sip" },
  { title: "Telnyx", url: "/numbers/telnyx" },
  { title: "Twilio", url: "/numbers/twilio" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const username = getUsername();
  const qc = useQueryClient();

  const onNumbersRoute = location.pathname === "/numbers" || location.pathname.startsWith("/numbers/");

  const [numbersExpanded, setNumbersExpanded] = useState<boolean>(() => (!collapsed && onNumbersRoute ? true : false));

  useEffect(() => {
    // Auto-open Numbers when navigating to any /numbers route.
    if (!collapsed && onNumbersRoute) setNumbersExpanded(true);
  }, [collapsed, onNumbersRoute]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout(qc);
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground">Celphix</span>
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
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-primary"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Numbers: expandable group */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onNumbersRoute}
                  tooltip="Numbers"
                  onClick={() => {
                    if (collapsed) {
                      navigate("/numbers/custom-sip");
                      return;
                    }
                    setNumbersExpanded(!numbersExpanded);
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">Numbers</span>
                      <ChevronDown
                        className={
                          "h-4 w-4 transition-transform " + (numbersExpanded ? "rotate-180" : "")
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
                      <SidebarMenuButton asChild isActive={location.pathname === n.url} tooltip={n.title}>
                        <NavLink
                          to={n.url}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent text-primary"
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-3">
          {/* Profile — clicking opens /settings */}
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            className={
              "w-full flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors " +
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground " +
              (location.pathname === "/settings" ? "bg-sidebar-accent text-primary" : "")
            }
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
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
