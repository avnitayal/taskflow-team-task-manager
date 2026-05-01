import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background app-grid-bg">
      <div className="w-full max-w-md card-soft p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="font-bold text-lg">TaskFlow</div>
        </div>

        <h2 className="text-2xl font-bold mb-1">Create your account</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Start organizing your team in under a minute.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="register-name-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="register-email-input"
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
              data-testid="register-password-input"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive" data-testid="register-error">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting} data-testid="register-submit-btn">
            {submitting ? "Creating..." : "Create account"}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="go-login-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
