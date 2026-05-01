import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0f1014] text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="font-bold text-lg">TaskFlow</div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Ship work together, <span className="text-primary">without the chaos.</span>
          </h1>
          <p className="text-white/60 max-w-md">
            Create projects, assign tasks, track progress. Built for small teams that want clarity over complexity.
          </p>
        </div>
        <div className="text-xs text-white/40">&copy; {new Date().getFullYear()} TaskFlow</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="font-bold text-lg">TaskFlow</div>
          </div>

          <h2 className="text-3xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Sign in to continue to your workspace.
          </p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive" data-testid="login-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              data-testid="login-submit-btn"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline" data-testid="go-register-link">
              Create one
            </Link>
          </div>

          <div className="mt-8 p-4 rounded-md bg-secondary/60 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-1">Demo admin</div>
            admin@taskflow.com / Admin@123
          </div>
        </div>
      </div>
    </div>
  );
}
