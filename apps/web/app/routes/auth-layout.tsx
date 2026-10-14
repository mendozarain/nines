import { Outlet, redirect } from "react-router";
import { Logo } from "~/components/logo";
import { authClient } from "~/lib/auth-client";

export async function clientLoader() {
  const { data } = await authClient.getSession();
  if (data) throw redirect("/");
  return null;
}

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo />
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
      <p className="label-mono">Accounting for Philippine gas stations</p>
    </div>
  );
}
