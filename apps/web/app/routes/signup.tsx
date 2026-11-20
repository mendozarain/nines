import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthShell, friendlyAuthError } from "~/components/auth-shell";
import { Field, FormError } from "~/components/field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

export function meta() {
  return [{ title: "Create account · Nines" }];
}

export default function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    const result = await authClient.signUp.email({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password,
    });
    setPending(false);
    if (result.error) {
      setError(friendlyAuthError(result.error.message));
      return;
    }
    navigate("/setup");
  }

  return (
    <AuthShell title="Create your account" subtitle="Then a short setup for your business and books.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
