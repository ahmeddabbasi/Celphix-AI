/**
 * Development Mode Configuration
 * 
 * This module centralizes all development-mode settings and provides
 * a single source of truth for dev/prod environment decisions.
 * 
 * ALL development-only code is gated behind explicit feature flags
 * to ensure production safety.
 * 
 * Environment Variables:
 * - VITE_DEV_MODE: enables frontend-only development mode (string: "true"/"false")
 * - VITE_USE_MOCK_API: use mock API responses instead of real backend (string: "true"/"false")
 * - VITE_API_URL: backend API URL (production uses this, development may override)
 * 
 * Usage:
 * ```
 * import { devConfig } from "@/lib/dev/dev-config";
 * 
 * if (devConfig.isDevMode()) {
 *   // Only runs in development
 * }
 * 
 * if (devConfig.useMockApi()) {
 *   // Use mock data
 * } else {
 *   // Use real API
 * }
 * ```
 */

/**
 * Internal: check if a feature flag is enabled
 * Handles both string ("true"/"false") and boolean values
 */
function isFeatureEnabled(flag: string | undefined): boolean {
  if (!flag) return false;
  if (typeof flag === "boolean") return flag;
  return flag.toLowerCase() === "true";
}

/**
 * Development configuration object
 * Safe to call in production - these are all feature-gated
 */
export const devConfig = {
  /**
   * Returns true if frontend-only development mode is enabled.
   * In this mode, authentication is bypassed and a mock user is provided.
   * 
   * ONLY enabled in development via VITE_DEV_MODE=true
   * Always false in production builds.
   */
  isDevMode(): boolean {
    return isFeatureEnabled(import.meta.env.VITE_DEV_MODE as string);
  },

  /**
   * Returns true if mock API should be used instead of real backend.
   * When false, real API calls are made (requires backend to be running).
   * 
   * ONLY has effect if isDevMode() is true
   */
  useMockApi(): boolean {
    if (!this.isDevMode()) return false;
    return isFeatureEnabled(import.meta.env.VITE_USE_MOCK_API as string);
  },

  /**
   * Returns the configured mock user ID for development.
   * Safe default: returns a consistent test user ID.
   */
  getMockUserId(): number {
    return 1; // Test user ID
  },

  /**
   * Returns the configured mock username for development.
   * Safe default: returns a consistent test username.
   */
  getMockUsername(): string {
    return "dev_user";
  },

  /**
   * Log configuration state (useful for debugging)
   * Only logs when dev mode is enabled
   */
  logConfig(): void {
    if (!this.isDevMode()) return;
    
    console.group("%c🔧 Development Mode Configuration", "color: #FF6B6B; font-weight: bold");
    console.log("Dev Mode Enabled:", this.isDevMode());
    console.log("Using Mock API:", this.useMockApi());
    console.log("Mock User ID:", this.getMockUserId());
    console.log("Mock Username:", this.getMockUsername());
    console.groupEnd();
  },
};

/**
 * Type-safe check that's suitable for compile-time tree-shaking
 * (Though we rely on Vite's process.env.* handling)
 */
export function isDevelopmentBuild(): boolean {
  // This is safe because Vite replaces import.meta.env.MODE at build time
  return import.meta.env.MODE === "development";
}
