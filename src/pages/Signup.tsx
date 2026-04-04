import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { googleSignIn } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

function apiUrl(path: string) {
  const base = getApiUrl();
  if (!base) return path;
  const a = base.replace(/\/+$/, "");
  const b = path.replace(/^\/+/, "");
  return `${a}/${b}`;
}

type FastApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
};

function extractErrorMessage(data: unknown, fallback: string) {
  const obj: Record<string, unknown> =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  // FastAPI/Starlette common shapes:
  // - { detail: "..." }
  // - { detail: [ { loc: [...], msg: "..." }, ... ] }  (Pydantic validation)
  const detail = obj.detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as FastApiValidationError;
    const loc = Array.isArray(first.loc) ? first.loc : [];
    const field = typeof loc[loc.length - 1] === "string" ? String(loc[loc.length - 1]) : "input";
    const msg = typeof first.msg === "string" ? first.msg : fallback;
    return `${field}: ${msg}`;
  }

  if (typeof obj.message === "string" && obj.message.trim()) return obj.message;

  const errors = obj.errors as unknown;
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0];
    const m =
      typeof first === "object" && first !== null
        ? (first as Record<string, unknown>).message
        : undefined;
    if (typeof m === "string" && m.trim()) return m;
  }

  return fallback;
}

function tryExtractUsernameFromJwt(token: string): string {
  try {
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64));
    return (payload.sub ?? "") as string;
  } catch {
    return "";
  }
}

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isBusy = isLoading || isGoogleLoading;

  const normalized = useMemo(() => {
    return {
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
    };
  }, [email, username, password]);

  const routeAfterLogin = async (token: string) => {
    let destination = "/payg";
    try {
      const meRes = await fetch(apiUrl("/api/auth/me"), {
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
      const response = await fetch(apiUrl("/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized.email,
          username: normalized.username,
          password: normalized.password,
        }),
      });

      const rawText = await response.text().catch(() => "");
      const data = rawText ? (JSON.parse(rawText) as unknown) : {};
      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Signup failed"));
      }

      // Manual signup does not auto-login; redirect to /login with banner.
      navigate("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
      const uname = tryExtractUsernameFromJwt(token);
      if (uname) localStorage.setItem("username", uname);
      await routeAfterLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="login-page">
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
            Create your account to start building intelligent voice agents.
          </p>
        </div>
      </section>

      <section className="login-panel--auth" aria-label="Sign up">
        <div className="login-panel__inner">
          <div className="mb-8">
            <h2 className="login-auth-title">Create account</h2>
            <p className="login-auth-subtitle">Sign up with email or continue with Google</p>
          </div>

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
              <span className="login-auth-divider__label">or sign up with email</span>
              <div className="login-auth-divider__line" />
            </div>
          </div>

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
              <label htmlFor="email" className="login-auth-label">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={isBusy}
                className="login-auth-input"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="login-auth-label">
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
                className="login-auth-input"
                autoComplete="username"
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
                  placeholder="Password (min 8 chars, 1 uppercase, 1 number)"
                  required
                  disabled={isBusy}
                  className="login-auth-input pr-11"
                  autoComplete="new-password"
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

            <button type="submit" disabled={isBusy} className="login-auth-submit">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="signup-prompt">
            Already have an account?{" "}
            <Link to="/login" className="signup-link">
              Sign in
            </Link>
          </p>

          <p className="login-auth-footer">© {new Date().getFullYear()} Celphix. All rights reserved.</p>
        </div>
      </section>
    </div>
  );
}
