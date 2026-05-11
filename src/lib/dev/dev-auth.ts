/**
 * Development-Only Authentication Bypass
 * 
 * This module provides a frontend-only authentication solution for development.
 * When enabled, it allows full dashboard access without a real backend.
 * 
 * ⚠️  SECURITY: This code only runs when VITE_DEV_MODE=true is explicitly set.
 *     It is completely removed from production builds via tree-shaking.
 * 
 * Features:
 * - Bypasses token validation
 * - Provides mock user profile data
 * - Simulates authentication state
 * - Maintains localStorage structure for compatibility
 * 
 * Usage:
 * ```
 * import { devAuth } from "@/lib/dev/dev-auth";
 * import { devConfig } from "@/lib/dev/dev-config";
 * 
 * if (devConfig.isDevMode()) {
 *   devAuth.initDevSession();
 * }
 * ```
 */

import { devConfig } from "./dev-config";

export interface DevUserProfile {
  user_id: number;
  username: string;
  email: string;
  is_admin: boolean;
  command_center_access: boolean;
  cc_request_status: "approved" | "pending" | "rejected" | null;
}

/**
 * Mock user profile for development
 * Full access to all features for easy testing
 */
const DEFAULT_DEV_PROFILE: DevUserProfile = {
  user_id: 1,
  username: "dev_user",
  email: "dev@celphix.local",
  is_admin: true, // Full access for testing
  command_center_access: true,
  cc_request_status: "approved",
};

/**
 * Development authentication module
 * Safe to call in production - all methods check devConfig first
 */
export const devAuth = {
  /**
   * Initialize a development session with mock authentication.
   * 
   * Stores mock tokens and user data in localStorage to simulate
   * a real authenticated session. This allows the app to function
   * exactly as if the user were logged in.
   * 
   * ⚠️  Only call this if devConfig.isDevMode() is true
   */
  initDevSession(profile: Partial<DevUserProfile> = {}): void {
    if (!devConfig.isDevMode()) {
      console.warn(
        "⚠️  devAuth.initDevSession() called but dev mode is disabled. " +
        "Set VITE_DEV_MODE=true to enable."
      );
      return;
    }

    const fullProfile = { ...DEFAULT_DEV_PROFILE, ...profile };

    // Create a fake JWT token (format: header.payload.signature)
    // The app doesn't validate this in dev mode, it's just for structure
    const mockJwt = this.generateMockJwt(fullProfile);

    // Store in localStorage exactly as production would
    localStorage.setItem("access_token", mockJwt);
    localStorage.setItem("session_id", `dev_session_${Date.now()}`);
    localStorage.setItem("username", fullProfile.username);

    console.log("%c✅ Dev Session Initialized", "color: #51CF66; font-weight: bold;");
    console.log("Profile:", fullProfile);
  },

  /**
   * Generate a mock JWT token for development
   * 
   * Format: header.payload.signature (but no signature validation occurs)
   * Payload includes user info for debugging
   */
  generateMockJwt(profile: DevUserProfile): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: profile.username,
        user_id: profile.user_id,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        iat: Math.floor(Date.now() / 1000),
        dev_mode: true,
      })
    );
    const signature = btoa("dev_signature_not_validated");

    return `${header}.${payload}.${signature}`;
  },

  /**
   * Get the current dev user profile
   * Returns the profile with Command Center access enabled
   */
  getDevProfile(): DevUserProfile {
    return { ...DEFAULT_DEV_PROFILE };
  },

  /**
   * Update the dev user profile (for testing different access levels)
   * 
   * Example: Test PAYG user
   * ```
   * devAuth.updateDevProfile({
   *   is_admin: false,
   *   command_center_access: false,
   * });
   * ```
   */
  updateDevProfile(updates: Partial<DevUserProfile>): void {
    if (!devConfig.isDevMode()) {
      console.warn("Dev mode is disabled. Cannot update profile.");
      return;
    }

    const newProfile = { ...DEFAULT_DEV_PROFILE, ...updates };
    this.initDevSession(newProfile);
    console.log("Dev profile updated:", newProfile);
  },

  /**
   * Check if a dev session is active
   * Returns true if dev mode and token exist
   */
  isDevSessionActive(): boolean {
    if (!devConfig.isDevMode()) return false;
    const token = localStorage.getItem("access_token");
    return !!token && token.includes("dev_signature");
  },

  /**
   * Clear dev session (logout)
   */
  clearDevSession(): void {
    if (!devConfig.isDevMode()) return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("session_id");
    localStorage.removeItem("username");
    console.log("Dev session cleared");
  },

  /**
   * Log current dev session info for debugging
   */
  logDevSession(): void {
    if (!devConfig.isDevMode()) {
      console.log("Dev mode is disabled");
      return;
    }

    const token = localStorage.getItem("access_token");
    const sessionId = localStorage.getItem("session_id");
    const username = localStorage.getItem("username");

    console.group("%c🔍 Dev Session Info", "color: #4C6EF5; font-weight: bold;");
    console.log("Active:", this.isDevSessionActive());
    console.log("Token:", token ? "✓ Present" : "✗ Missing");
    console.log("Session ID:", sessionId);
    console.log("Username:", username);
    console.log("Profile:", this.getDevProfile());
    console.groupEnd();
  },
};
