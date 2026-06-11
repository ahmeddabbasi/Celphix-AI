import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  Hash,
  ChevronDown,
  LogOut,
  User,
  BarChart3,
  Calendar as CalendarIcon,
  Mic2,
  Zap,
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
  { title: "Dashboard",  url: "/",          icon: LayoutDashboard },
  { title: "Assistants", url: "/assistants", icon: Bot             },
  { title: "Automation", url: "/automation", icon: Zap             },
  { title: "Voices",     url: "/voices",     icon: Mic2            },
  { title: "Dialing Data", url: "/dialing-data", icon: Users       },
  { title: "CRM",        url: "/crm",        icon: Users           },
  { title: "Analytics",  url: "/analytics",  icon: BarChart3       },
  { title: "Calendar",   url: "/calendar",   icon: CalendarIcon    },
  { title: "Calls",      url: "/calls",      icon: Phone           },
];

const numbersItems = [
  { title: "Twilio", url: "/numbers/twilio" },
  { title: "Vonage", url: "/numbers/vonage" },
  { title: "Telnyx", url: "/numbers/telnyx" },
  { title: "Vicidial", url: "/numbers/vicidial" },
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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="px-2.5 py-3.5">
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
                      className={cn(
                        "flex min-h-[36px] items-center rounded-[12px] py-1.5 text-sm font-semibold text-sidebar-foreground/90 transition-[background-color,color,transform,opacity] duration-300 ease-in-out hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center px-0" : "gap-2 px-3",
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

              {/* Numbers: expandable group */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onNumbersRoute}
                  tooltip="Numbers"
                  onClick={() => {
                    if (collapsed) {
                      navigate("/numbers/twilio");
                      return;
                    }
                    setNumbersExpanded(!numbersExpanded);
                  }}
                  className={cn(
                    "flex min-h-[36px] items-center rounded-[12px] py-1.5 text-sm font-semibold text-sidebar-foreground/90 transition-[background-color,color,transform,opacity] duration-300 ease-in-out hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    collapsed ? "justify-center px-0" : "gap-2 px-3",
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
                        "h-4 w-4 transition-transform " + (numbersExpanded ? "rotate-180" : "")
                      }
                    />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && numbersExpanded && (
                <div className="ml-6 mt-1.5 space-y-1">
                  {numbersItems.map((n) => (
                    <SidebarMenuItem key={n.url}>
                      <SidebarMenuButton asChild isActive={location.pathname === n.url} tooltip={n.title}>
                        <NavLink
                          to={n.url}
                          className="flex min-h-[36px] items-center gap-2 rounded-[12px] px-3 py-1.5 text-sm font-semibold text-sidebar-foreground/80 transition-[background-color,color] duration-300 ease-in-out hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-primary/40 text-sidebar-primary-foreground"
                        >
                          <span className="text-[0.625rem] w-4 text-center">•</span>
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

      <SidebarFooter className="border-t border-sidebar-border/40 p-3">
        <div className="space-y-2">
          {/* Profile — clicking opens /settings */}
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            className={cn(
              "w-full flex min-h-[36px] items-center gap-2 rounded-[12px] px-2.5 py-1.5 transition-[background-color,color] duration-300 ease-in-out font-semibold text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              location.pathname === "/settings" && "bg-sidebar-primary/40 text-sidebar-primary-foreground"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-sidebar-accent/50 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-sidebar-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col flex-1 text-left">
                <span className="text-sm font-semibold text-sidebar-foreground capitalize">
                  {username || "User"}
                </span>
                <span className="text-xs text-sidebar-foreground/60">Settings</span>
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
