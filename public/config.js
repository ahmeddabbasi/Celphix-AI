/**
 * Runtime configuration for the Celphix AI frontend.
 *
 * Production backend: https://voiceagent.rebortai.com  (Cloudflare → port 8000)
 * Local dev:          http://localhost:8000             (via Vite proxy — no CORS)
 *
 * No ngrok / serveo / tunnel URLs exist here.
 */
(function () {
  "use strict";

  const PROD_API = "https://voiceagent.rebortai.com";
  const PROD_WS  = "wss://voiceagent.rebortai.com";

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // In local dev the Vite dev-server proxy handles routing to localhost:8000,
  // so we use the page's own origin (relative requests) to avoid CORS.
  window.appConfig = {
    apiUrl: isLocal ? window.location.origin : PROD_API,
    wsUrl:  isLocal
      ? window.location.origin.replace(/^https/, "wss").replace(/^http/, "ws")
      : PROD_WS,
    isProd: !isLocal,
  };

  // Alias for legacy code that uses window.config
  window.config = window.appConfig;

  // Purge any stale tunnel/ngrok/serveo URLs from localStorage
  const STALE_KEYS = ["backend_url", "api_url", "websocket_url", "config_cache"];
  const STALE_PATTERNS = ["ngrok", "serveo", "tunnel", "localtunnel", "trycloudflare"];
  STALE_KEYS.forEach(function (key) {
    var v = localStorage.getItem(key);
    if (v && STALE_PATTERNS.some(function (p) { return v.includes(p); })) {
      localStorage.removeItem(key);
    }
  });
  // Clear all cached URL keys unconditionally on load
  STALE_KEYS.forEach(function (key) { localStorage.removeItem(key); });
})();
