import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Silence Browserslist "caniuse-lite is outdated" warning during dev/build.
// Prefer running `npx update-browserslist-db@latest` periodically, but we
// suppress the warning here to keep Vite output readable.
process.env.BROWSERSLIST_IGNORE_OLD_DATA = process.env.BROWSERSLIST_IGNORE_OLD_DATA || "true";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Allow overriding proxy target for Docker/devcontainer/remote setups.
  // Defaults keep existing behavior.
  const backendHttp = env.VITE_DEV_BACKEND_HTTP || env.VITE_API_URL || "http://localhost:8000";
  const backendWs = (() => {
    if (env.VITE_DEV_BACKEND_WS) return env.VITE_DEV_BACKEND_WS;
    try {
      const u = new URL(backendHttp);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}`;
    } catch {
      return "ws://localhost:8000";
    }
  })();

  if (mode === "development") {
    // Helps debug proxy issues (e.g. ECONNREFUSED) by making the resolved target explicit.
    // Safe: prints once at startup.
    console.info(`[vite] dev proxy target: ${backendHttp} (ws: ${backendWs})`);
  }

  const withHttpProxyHandlers = (base: any) => ({
    ...base,
    configure: (proxy: any) => {
      proxy.on("error", (err: any, _req: any, res: any) => {
        // Avoid noisy stack traces on every poll when backend is down.
        if (!res || res.headersSent) return;
        const code = (err && (err.code || err.errno)) || "PROXY_ERROR";
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            detail: `Backend unavailable (proxy ${code}). Is FastAPI running at ${backendHttp}?`,
          }),
        );
      });
    },
  });

  return ({
  server: {
    host: "::",
    port: 8080,
    // Google Identity popups rely on window.postMessage; strict COOP can block it.
    // This header keeps the console clean in dev and avoids popup messaging issues.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    proxy: {
      // Important: many backend endpoints intentionally share the same paths as
      // the SPA routes (e.g. /login, /analytics, /crm). During development we
      // want XHR/fetch/WebSocket calls to hit FastAPI, but we must NOT proxy
      // browser navigations (Accept: text/html) or page refreshes will return
      // FastAPI 405/404 instead of the SPA index.html.
      //
      // This bypass keeps deep-links like http://localhost:8080/login working
      // while still proxying API requests.
      ...(() => {
        const spaBypass = (req: { method?: string; headers: Record<string, string | string[] | undefined> }) => {
          const method = (req.method || "GET").toUpperCase();
          const acceptRaw = req.headers?.accept;
          const accept = Array.isArray(acceptRaw) ? acceptRaw.join(",") : acceptRaw || "";
          if ((method === "GET" || method === "HEAD") && accept.includes("text/html")) {
            return "/index.html";
          }
          return undefined;
        };

        const httpProxy = withHttpProxyHandlers({
          target: backendHttp,
          changeOrigin: true,
          // CSV import can take longer than 10s on large files.
          // If this is too low, the proxy can drop the connection (ERR_EMPTY_RESPONSE)
          // while the backend continues and commits, making the UI think it failed.
          proxyTimeout: 120000,
          timeout: 120000,
          bypass: spaBypass,
        });

        return {
          // Proxy all /api, /login, /logout, /ws, /dashboard, /analytics, /crm,
          // /preferences, /health paths to the FastAPI backend during development.
          // This avoids CORS entirely in dev and eliminates hardcoded localhost:8000.
          "/api": httpProxy,
          "/signup": httpProxy,
          "/login": httpProxy,
          "/logout": httpProxy,
          "/auth": httpProxy,
          "/dashboard": httpProxy,
          "/analytics": httpProxy,
          "/crm": httpProxy,
          "/dialing-data": httpProxy,
          "/preferences": httpProxy,
          "/health": httpProxy,
          "/sessions": httpProxy,
          "/operator": httpProxy,
          "/warmup-services": httpProxy,
          "/ws": { target: backendWs, ws: true, changeOrigin: true },
        } as const;
      })(),
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  });
});
