import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useAuth } from "../features/auth/useAuth";
import { ApiError } from "../lib/api";
import { toast } from "../lib/toast";
import { validateEmail, validatePassword, validateUsername } from "../lib/validation";

type Field = "username" | "email" | "password";

export function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ username: "", email: "", password: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    username: false,
    email: false,
    password: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errors: Record<Field, string | null> = {
    username: validateUsername(values.username),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
  const invalid = Object.values(errors).some((message) => message !== null);

  const update = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const blur = (field: Field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ username: true, email: true, password: true });
    if (invalid) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await register(values.username, values.email, values.password);
      await login(values.username, values.password);
      toast.success("Account created. Welcome to Compiler Lab.");
      navigate("/workspace", { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? "That username or email is already taken."
          : "Could not create your account. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (field: Field) => (touched[field] ? (errors[field] ?? undefined) : undefined);

  return (
    <section data-testid="register-page" className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="font-display text-3xl text-brand-brown-900">Create your account</h1>
        <p className="mt-2 text-sm text-brand-brown-500">
          Save snippets, keep your history, and share runs.
        </p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
          data-testid="register-form"
        >
          <Input
            label="Username"
            name="username"
            autoFocus
            autoComplete="username"
            value={values.username}
            onChange={update("username")}
            onBlur={blur("username")}
            error={showError("username")}
            hint="3–32 characters; letters, numbers, and underscores only."
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={update("email")}
            onBlur={blur("email")}
            error={showError("email")}
          />
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={update("password")}
            onBlur={blur("password")}
            error={showError("password")}
            showStrength
          />

          {formError && (
            <p role="alert" data-testid="register-error" className="text-sm text-status-error-fg">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} disabled={invalid}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-sm text-brand-brown-500">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-gold-600 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  );
}
