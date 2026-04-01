import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { googleSignIn } from "@/lib/auth";

const API_URL = (import.meta.env.VITE_API_URL as string) || "";

export default function Login() {
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        setNotice("Account created! Please log in.");
      }
    } catch {
      // ignore
    }
  }, []);

  const normalized = useMemo(() => {
    const value = emailOrUsername.trim().toLowerCase();
    return {
      value,
      password: password.trim(),
      isEmail: value.includes("@"),
    };
  }, [emailOrUsername, password]);

  const tryExtractUsernameFromJwt = (token: string): string => {
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64));
      return (payload.sub ?? "") as string;
    } catch {
      return "";
    }
  };

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
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include", // receive HttpOnly refresh_token cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          normalized.isEmail
            ? { email: normalized.value, password: normalized.password }
            : { username: normalized.value, password: normalized.password }
        ),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      const uname = tryExtractUsernameFromJwt(data.access_token);
      if (uname) localStorage.setItem("username", uname);
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

  const isGoogleEnabled = true;
  const isBusy = isLoading || isGoogleLoading;

  return (
    <div className="login-page">
      {/* Left panel — brand/intro (white) */}
      <section className="login-panel--brand" aria-label="Celphix introduction">
        <div className="login-panel__inner">
          <img
            src="/salesagent/LOGO.png"
            alt="Celphix"
            className="login-logo"
            loading="eager"
            decoding="async"
          />
          <p className="login-intro">
            Intelligent voice agents that engage, qualify, and convert around the clock.
          </p>
        </div>
      </section>

      {/* Right panel — auth/form (brand dark) */}
      <section className="login-panel--auth" aria-label="Sign in">
        <div className="login-panel__inner">
          <div className="mb-8">
            <h2 className="login-auth-title">Welcome back</h2>
            <p className="login-auth-subtitle">Sign in via Google</p>
          </div>

          {isGoogleEnabled && (
            <div className="mb-6">
              <div className="flex justify-center">
                {isGoogleLoading ? (
                  <div className="login-auth-loading">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in with Google
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

              <div className="login-auth-divider" aria-hidden="true">
                <div className="login-auth-divider__line" />
                  <span className="login-auth-divider__label">or sign in with email</span>
                <div className="login-auth-divider__line" />
              </div>
            </div>
          )}

          {notice && (
            <div className="mb-5">
              <Alert className="py-3">
                <AlertDescription className="ml-1">{notice}</AlertDescription>
              </Alert>
            </div>
          )}

          {error && (
            <div className="mb-5">
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-1">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="login-auth-label">Email</label>
              <Input
                id="email"
                type="email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={isBusy}
                className="login-auth-input"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="login-auth-label">
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
                  className="login-auth-input pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBusy}
                  className="login-auth-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="login-auth-submit"
              data-loading={isLoading ? "true" : "false"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="signup-prompt">
            Want CELPHIXING?{" "}
            <a href="/signup" className="signup-link">Sign up</a>
          </p>

          <p className="login-auth-footer">
            © {new Date().getFullYear()} Celphix. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
