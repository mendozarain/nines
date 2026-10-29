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
    <AuthShell title="Sign in" subtitle="Open your books for the day.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-[13px] text-muted-foreground">
        New station?{" "}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/signup">
          Create an account
        </Link>
      </p>
      <p className="text-center text-[11px] text-muted-foreground/80">
        Demo · demo@nines.local · station123
      </p>
    </AuthShell>
  );
}
