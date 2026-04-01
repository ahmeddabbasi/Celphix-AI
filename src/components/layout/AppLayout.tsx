import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarInset } from "@/components/ui/sidebar";

export function AppLayout() {
  return (
    <div className="cc-shell min-h-screen w-full bg-background">
      <TopBar />
      <div className="layout-body">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <main className="cc-content flex-1 overflow-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)] scrollbar-thin">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}
