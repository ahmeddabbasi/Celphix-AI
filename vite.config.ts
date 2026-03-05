import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy all /api, /login, /logout, /ws, /dashboard, /analytics, /crm,
      // /preferences, /health paths to the FastAPI backend during development.
      // This avoids CORS entirely in dev and eliminates hardcoded localhost:8000.
      "/api":         { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/login":       { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/logout":      { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/ws":          { target: "ws://localhost:8000",   ws: true, changeOrigin: true },
      "/dashboard":   { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/analytics":   { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/crm":         { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/preferences": { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/health":      { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/sessions":    { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/operator":    { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
      "/warmup-services": { target: "http://localhost:8000", changeOrigin: true, proxyTimeout: 10000, timeout: 10000 },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
