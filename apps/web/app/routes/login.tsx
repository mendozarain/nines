import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthShell, friendlyAuthError } from "~/components/auth-shell";
import { Field, FormError } from "~/components/field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

export function meta() {
  return [{ title: "Sign in · Nines" }];
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const result = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (result.error) {
      setError(friendlyAuthError(result.error.message));
      return;
    }
    navigate("/");
  }

  return (
    <AuthShell title="Sign in" subtitle="Open the station books for today’s shift.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        New station?{" "}
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/signup">
          Create an account
        </Link>
      </p>
      <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sample station</p>
        <p>demo@nines.local</p>
        <p>station123</p>
      </div>
    </AuthShell>
  );
}
