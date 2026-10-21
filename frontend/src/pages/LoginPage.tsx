import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useAuth } from "../features/auth/useAuth";
import { ApiError } from "../lib/api";
import { toast } from "../lib/toast";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ username: boolean; password: boolean }>({
    username: false,
    password: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameError = touched.username && !username ? "Username is required." : null;
  const passwordError = touched.password && !password ? "Password is required." : null;
  const invalid = !username || !password;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ username: true, password: true });
    if (invalid) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(username, password);
      toast.success("Welcome back.");
      const target = (location.state as LocationState | null)?.from ?? "/workspace";
      navigate(target, { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 401
          ? "Invalid username or password."
          : "Could not sign in. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-testid="login-page" className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="font-display text-3xl text-brand-brown-900">Sign in</h1>
        <p className="mt-2 text-sm text-brand-brown-500">
          Welcome back. Compile where you left off.
        </p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
          data-testid="login-form"
        >
          <Input
            label="Username"
            name="username"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
            error={usernameError ?? undefined}
          />
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            error={passwordError ?? undefined}
          />

          {formError && (
            <p role="alert" data-testid="login-error" className="text-sm text-status-error-fg">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} disabled={invalid}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-sm text-brand-brown-500">
          New here?{" "}
          <Link to="/register" className="text-brand-gold-600 underline-offset-2 hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </section>
  );
}
