import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { devConfig } from "@/lib/dev/dev-config";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Basic auth guard — redirects to /login when no token is present.
 * 
 * In development mode (VITE_DEV_MODE=true):
 * - Bypasses authentication checks
 * - Automatically provides access
 * 
 * In production: Standard authentication check
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Dev mode bypass: skip authentication check
  if (devConfig.isDevMode()) {
    return <>{children}</>;
  }

  // Production: standard auth check
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Command Center guard — extends ProtectedRoute with a CC access check.
 *
 * Flow (Production):
 *  1. No token              → /login
 *  2. Profile loading       → render nothing (prevents flash of CC UI)
 *  3. Not admin AND no CC access (includes revoked users) → /payg (replace so Back works)
 *  4. Otherwise             → render children
 *
 * Flow (Development - VITE_DEV_MODE=true):
 *  1. Bypass all checks
 *  2. Render children immediately
 *
 * This is a *frontend* guard; the backend already enforces access on
 * every API call, so this is purely a UX convenience redirect.
 * Revoked users have command_center_access=false, so they are caught by
 * condition 3 and redirected to Pay-As-You-Go automatically.
 */
export function CCProtectedRoute({ children }: ProtectedRouteProps) {
  // Dev mode bypass: skip all access checks
  if (devConfig.isDevMode()) {
    return <>{children}</>;
  }

  // Production: standard authentication check
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: profile, isLoading } = useUserProfile();

  // While the profile is being fetched, render nothing (brief blank).
  // This avoids a flash of the Command Center before the redirect fires.
  if (isLoading) return null;

  // Profile loaded — check access.
  // Covers: never-requested, rejected, and revoked users (all have command_center_access=false).
  if (profile && !profile.is_admin && !profile.command_center_access) {
    return <Navigate to="/payg" replace />;
  }

  return <>{children}</>;
}
