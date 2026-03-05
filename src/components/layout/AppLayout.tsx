import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarInset } from "@/components/ui/sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </SidebarInset>
    </div>
  );
}
