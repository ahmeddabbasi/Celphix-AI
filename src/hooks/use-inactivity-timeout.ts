import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { clearAuthToken } from "@/lib/auth";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityTimeout() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const logout = useCallback(() => {
    clearAuthToken();
    navigate("/login");
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [navigate, toast]);

  useEffect(() => {
    // In browser builds, `setTimeout` returns a number.
    let timeoutId: number | undefined;

    const resetTimeout = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    const resetTimeoutOnActivity = () => resetTimeout();

    // Set initial timeout
    resetTimeout();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimeoutOnActivity);
    });

    // Cleanup function
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimeoutOnActivity);
      });
    };
  }, [logout]);
}
