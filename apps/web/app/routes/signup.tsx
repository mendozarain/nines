import { Form, Link, redirect, useNavigation } from "react-router";
import { Field } from "~/components/field";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/signup";

export const meta: Route.MetaFunction = () => [{ title: "Create account · Nines" }];

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData();
  const { error } = await authClient.signUp.email({
    name: String(form.get("name")),
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: error.message ?? "Could not create your account" };
  throw redirect("/setup");
}

export default function Signup({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Next, you'll add your gas station's details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="post" className="flex flex-col gap-4">
          {actionData?.error && <Alert>{actionData.error}</Alert>}
          <Field label="Your name" name="name" autoComplete="name" required />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters"
            required
          />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-[13px] text-subtle-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-link hover:underline">
              Sign in
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}
