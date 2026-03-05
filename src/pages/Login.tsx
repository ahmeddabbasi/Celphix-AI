import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from "lucide-react";

// Empty string = relative URLs → Vite proxy handles routing in dev,
// nginx/reverse-proxy handles it in production. Set VITE_API_URL only
// when the frontend is served from a *different* origin than the backend.
const API_URL = (import.meta.env.VITE_API_URL as string) || "";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();
      
      // Store authentication data
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", normalizedUsername);

      // Route admin users to Command Center, regular users to Pay-As-You-Go.
      // We fetch /api/auth/me to check is_admin right after login.
      let destination = "/payg";
      try {
        const meRes = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.is_admin) {
            destination = "/";
          }
        }
      } catch {
        // If the check fails, fall back to PAYG (safe default)
      }

      navigate(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-background relative overflow-hidden">
      {/* Subtle background (dashboard palette) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface-1" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent-blue/10 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="bg-card text-card-foreground border border-border shadow-xl">
            <div className="p-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-border">
                  <Activity className="h-7 w-7 text-primary" />
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  LOG-IN
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    login to your account to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm text-foreground">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={isLoading}
                    className="h-11 bg-background/40 border-border focus-visible:ring-ring"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={isLoading}
                      className="h-11 pr-12 bg-background/40 border-border focus-visible:ring-ring"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>

                <div className="pt-4 text-center text-xs text-muted-foreground">
                  Authorized users only
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
