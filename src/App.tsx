import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { PaygLayout } from "@/components/layout/payg/PaygLayout";
import { ProtectedRoute, CCProtectedRoute } from "@/components/ProtectedRoute";
import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { clearAuthToken } from "@/lib/auth";

// ── Command Center pages ───────────────────────────────────────────────────────
import Dashboard from "./pages/Dashboard";
import Assistants from "./pages/Assistants";
import AssistantConfig from "./pages/AssistantConfig";
import Calls from "./pages/Calls";
import Crm from "./pages/Crm";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import NumbersCustomSip from "./pages/numbers/NumbersCustomSip";
import NumbersTelnyx from "./pages/numbers/NumbersTelnyx";
import NumbersTwilio from "./pages/numbers/NumbersTwilio";
import SuperAdminPortal from "./pages/SuperAdminPortalOptimized";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Voices from "./pages/Voices";
import Settings from "./pages/Settings";

// ── Pay-As-You-Go pages ────────────────────────────────────────────────────────
import PaygDashboard from "./pages/payg/PaygDashboard";
import PaygAssistants from "./pages/payg/PaygAssistants";
import PaygCalls from "./pages/payg/PaygCalls";
import PaygCrm from "./pages/payg/PaygCrm";
import PaygAnalytics from "./pages/payg/PaygAnalytics";
import PaygCalendar from "./pages/payg/PaygCalendar";
import PaygVoices from "./pages/payg/PaygVoices";
import PaygNumbersCustomSip from "./pages/payg/numbers/PaygNumbersCustomSip";
import PaygNumbersTelnyx from "./pages/payg/numbers/PaygNumbersTelnyx";
import PaygNumbersTwilio from "./pages/payg/numbers/PaygNumbersTwilio";
import PaygSettings from "./pages/payg/PaygSettings";

import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // SWR-like behavior: keep data around and avoid hard refetches on every navigation.
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  useInactivityTimeout();

  useEffect(() => {
    // Per user request: force logout on page reload (not on in-app navigation).
    // This effect runs once on initial mount.
    // We guard behind the Navigation Timing API so forward/back cache restores won't log out.
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
      const type = nav?.type;
      if (type === "reload") {
        clearAuthToken();
      }
    } catch {
      // Fallback: if we can't detect, keep previous behavior.
      clearAuthToken();
    }
  }, []); // Empty dependency array ensures this runs only once on initial mount.

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Command Center (full-feature interface) ──────────────────────── */}
      <Route
        element={
          <CCProtectedRoute>
            <SidebarProvider>
              <AppLayout />
            </SidebarProvider>
          </CCProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistants" element={<Assistants />} />
        <Route path="/assistants/:id" element={<AssistantConfig />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/crm" element={<Crm />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/admin" element={<SuperAdminPortal />} />
        <Route path="/numbers" element={<Navigate to="/numbers/custom-sip" replace />} />
        <Route path="/numbers/custom-sip" element={<NumbersCustomSip />} />
        <Route path="/numbers/telnyx" element={<NumbersTelnyx />} />
        <Route path="/numbers/twilio" element={<NumbersTwilio />} />
        <Route path="/voices" element={<Voices />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* ── Pay-As-You-Go interface ──────────────────────────────────────── */}
      <Route
        path="/payg"
        element={
          <ProtectedRoute>
            <PaygLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PaygDashboard />} />
        <Route path="assistants" element={<PaygAssistants />} />
        <Route path="calls" element={<PaygCalls />} />
        <Route path="crm" element={<PaygCrm />} />
        <Route path="analytics" element={<PaygAnalytics />} />
        <Route path="calendar" element={<PaygCalendar />} />
        <Route path="voices" element={<PaygVoices />} />
        <Route path="numbers" element={<Navigate to="/payg/numbers/custom-sip" replace />} />
        <Route path="numbers/custom-sip" element={<PaygNumbersCustomSip />} />
        <Route path="numbers/telnyx" element={<PaygNumbersTelnyx />} />
        <Route path="numbers/twilio" element={<PaygNumbersTwilio />} />
        <Route path="settings" element={<PaygSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
