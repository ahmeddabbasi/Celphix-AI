import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Mic2, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { googleSignIn } from "@/lib/auth";

const API_URL = (import.meta.env.VITE_API_URL as string) || "";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const routeAfterLogin = async (token: string) => {
    let destination = "/payg";
    try {
      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.is_admin) destination = "/";
      }
    } catch {
      // fall back to PAYG
    }
    navigate(destination);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include", // receive HttpOnly refresh_token cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", normalizedUsername);
      await routeAfterLogin(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in did not return a credential. Please try again.");
      return;
    }
    setError("");
    setIsGoogleLoading(true);
    try {
      await googleSignIn(credentialResponse.credential);
      const token = localStorage.getItem("access_token") ?? "";
      await routeAfterLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isGoogleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isBusy = isLoading || isGoogleLoading;

  return (
    <div className="min-h-screen w-screen bg-background flex overflow-hidden">

      {/* ── Left panel — branding ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden">
        {/* layered glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
          <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-accent/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {/* subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center max-w-sm"
        >
          {/* logo mark */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
            <Mic2 className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
            Celphix<span className="text-primary"></span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Intelligent voice agents that engage, qualify, and convert around the clock.
          </p>

          {/* feature pills */}
          <div className="mt-10 flex flex-col gap-3 w-full">
            {[
              { label: "Real-time voice conversations" },
              { label: "AI-powered lead qualification" },
              { label: "Seamless CRM integration" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {f.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* bottom rule */}
        <div className="absolute bottom-8 text-xs text-muted-foreground/40 tracking-widest uppercase">
          Marked and Managed
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block w-px bg-border self-stretch" />

      {/* ── Right panel — form ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16 relative overflow-hidden">
        {/* mobile-only background orbs */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-accent-blue/8 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* mobile logo */}
          <div className="mb-8 flex lg:hidden items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Mic2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-semibold text-foreground">Celphix</span>
          </div>

          {/* heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Google button — sits above the form for visual prominence */}
          {isGoogleEnabled && (
            <div className="mb-6">
              <div className="flex justify-center">
                {isGoogleLoading ? (
                  <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in with Google…
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    text="continue_with"
                    width="360"
                  />
                )}
              </div>

              {/* divider */}
              <div className="relative mt-6 flex items-center">
                <div className="flex-grow border-t border-border" />
                <span className="mx-4 text-xs font-medium text-muted-foreground select-none bg-background px-1">
                  or sign in with username
                </span>
                <div className="flex-grow border-t border-border" />
              </div>
            </div>
          )}

          {/* error */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-1">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                required
                disabled={isBusy}
                className="h-11 bg-card/60 border-border placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isBusy}
                  className="h-11 pr-11 bg-card/60 border-border placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBusy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="mt-2 w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Celphix. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
