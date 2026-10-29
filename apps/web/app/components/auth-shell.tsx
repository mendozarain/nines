import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <p className="font-display text-3xl font-semibold tracking-tight">Nines</p>
          <p className="mt-1 text-sm text-muted-foreground">Small-business books for the Philippines</p>
        </div>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}

export function friendlyAuthError(message?: string | null) {
  if (!message) return "Something went wrong. Please try again.";
  if (/already exists/i.test(message)) return "An account with this email already exists. Sign in instead.";
  if (/invalid email or password/i.test(message)) return "Email or password is incorrect.";
  if (/password/i.test(message)) return "Use at least 8 characters for the password.";
  return message;
}
