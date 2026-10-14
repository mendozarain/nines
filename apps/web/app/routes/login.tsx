import { Form, Link, redirect, useNavigation } from "react-router";
import { Field } from "~/components/field";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: "Sign in · Nines" }];

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData();
  const { error } = await authClient.signIn.email({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: error.message ?? "Wrong email or password" };
  throw redirect("/");
}

export default function Login({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Your station's books are waiting.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="post" className="flex flex-col gap-4">
          {actionData?.error && <Alert>{actionData.error}</Alert>}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-[13px] text-subtle-foreground">
            New to Nines?{" "}
            <Link to="/signup" className="text-link hover:underline">
              Create an account
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}
