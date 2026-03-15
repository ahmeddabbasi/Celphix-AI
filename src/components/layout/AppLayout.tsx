import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarInset } from "@/components/ui/sidebar";

export function AppLayout() {
  return (
    <div className="cc-shell flex min-h-screen w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1">
        <TopBar />
        <main className="cc-content flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </SidebarInset>
    </div>
  );
}
