/**
 * PaygLayout — outer shell for the Pay-As-You-Go interface.
 * Uses a sidebar + main content layout, mirroring AppLayout
 * but wired to PAYG-specific components.
 */

import { Outlet } from "react-router-dom";
import { PaygSidebar } from "./PaygSidebar";
import { PaygTopBar } from "./PaygTopBar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function PaygLayout() {
  return (
    <SidebarProvider>
      <div className="payg-shell min-h-screen w-full bg-background">
        <PaygTopBar />
        <div className="layout-body">
          <PaygSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <main className="payg-content flex-1 overflow-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)] scrollbar-thin">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
