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
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            N
          </div>
          <p className="text-[28px] font-bold tracking-[-0.04em]">Nines</p>
          <p className="mt-1 text-[14px] text-muted-foreground">Books for Philippine small businesses</p>
        </div>
        <div className="nines-frame rounded-[24px] px-6 py-7">
          <h1 className="text-[22px] font-bold tracking-[-0.03em]">{title}</h1>
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
