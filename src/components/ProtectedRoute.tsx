import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { useUserProfile } from "@/hooks/use-user-profile";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/** Basic auth guard — redirects to /login when no token is present. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Command Center guard — extends ProtectedRoute with a CC access check.
 *
 * Flow:
 *  1. No token              → /login
 *  2. Profile loading       → render nothing (prevents flash of CC UI)
 *  3. Not admin AND no CC access (includes revoked users) → /payg (replace so Back works)
 *  4. Otherwise             → render children
 *
 * This is a *frontend* guard; the backend already enforces access on
 * every API call, so this is purely a UX convenience redirect.
 * Revoked users have command_center_access=false, so they are caught by
 * condition 3 and redirected to Pay-As-You-Go automatically.
 */
export function CCProtectedRoute({ children }: ProtectedRouteProps) {
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
