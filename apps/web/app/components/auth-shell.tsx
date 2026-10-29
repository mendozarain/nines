import type { ReactNode } from "react";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-12 text-center">
          <p className="text-[28px] font-semibold tracking-[-0.04em]">Nines</p>
          <p className="mt-2 text-[15px] text-muted-foreground">Books for Philippine small businesses</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
          <h1 className="text-[21px] font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>
          <div className="mt-6 grid gap-4">{children}</div>
        </div>
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
