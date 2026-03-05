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
 * Create authenticated fetch wrapper
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return response;
}
