/**
 * Authentication utilities for handling JWT tokens and session management
 */

import { getApiUrl } from "@/lib/api";

export interface AuthData {
  access_token: string;
  session_id: string;
  username: string;
}

/**
 * Get stored authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("access_token");
}

/**
 * Clear stored authentication token and session data
 */
export function clearAuthToken(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("session_id");
  localStorage.removeItem("username");
}

/**
 * Get stored session ID
 */
export function getSessionId(): string | null {
  return localStorage.getItem("session_id");
}

/**
 * Get stored username
 */
export function getUsername(): string | null {
  return localStorage.getItem("username");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return !!token;
}

/**
 * Clear authentication data
 */
export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("session_id");
  localStorage.removeItem("username");
}

/**
 * Attempt a silent token refresh using the HttpOnly refresh-token cookie.
 * Returns true if a new access token was obtained and stored, false otherwise.
 */
let _refreshPromise: Promise<boolean> | null = null;

async function trySilentRefresh(): Promise<boolean> {
  // De-duplicate concurrent 401s — only one refresh flight at a time.
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include", // send the HttpOnly refresh_token cookie
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return false;
      const data = await res.json() as { access_token?: string };
      if (!data.access_token) return false;
      localStorage.setItem("access_token", data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Logout user and clear session.
 *
 * Accepts an optional queryClient so the caller can wipe the entire
 * TanStack Query cache. This is mandatory to prevent the next user that
 * logs in from seeing cached data that belongs to the previous user.
 */
export async function logout(queryClient?: { clear(): void }): Promise<void> {
  const token = getAuthToken();
  const sessionId = getSessionId();

  if (token && sessionId) {
    try {
      await fetch(`${getApiUrl()}/logout`, {
        method: "POST",
        credentials: "include", // clear refresh token cookie server-side
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Wipe ALL cached query data so the next user never sees stale data.
  queryClient?.clear();

  clearAuth();
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : {
        "Content-Type": "application/json",
      };
}

/**
 * Create authenticated fetch wrapper.
 * On 401: attempts one silent refresh via HttpOnly cookie before redirecting.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit & { _isRetry?: boolean } = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const { _isRetry, ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    // Attempt one silent refresh (prevent infinite loop with _isRetry guard).
    if (!_isRetry) {
      const refreshed = await trySilentRefresh();
      if (refreshed) {
        // Retry the original request with the new access token.
        return authenticatedFetch(url, { ...options, _isRetry: true });
      }
    }
    clearAuth();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return response;
}

/**
 * Exchange a Google credential (ID token from @react-oauth/google) for a
 * platform JWT. On success, stores the token + username in localStorage.
 *
 * Returns the username string, or throws on failure.
 */
export async function googleSignIn(credential: string): Promise<string> {
  const response = await fetch(`${getApiUrl()}/auth/google`, {
    method: "POST",
    credentials: "include", // receive refresh_token cookie
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { detail?: string }).detail || "Google sign-in failed");
  }

  const data = await response.json() as { access_token: string; token_type: string };
  localStorage.setItem("access_token", data.access_token);

  // Decode the JWT payload to extract the username stored in the "sub" claim.
  // No signature verification needed here — we just decoded a token we just received.
  try {
    const payloadB64 = data.access_token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64));
    const username: string = payload.sub ?? "";
    if (username) localStorage.setItem("username", username);
    return username;
  } catch {
    return "";
  }
}

