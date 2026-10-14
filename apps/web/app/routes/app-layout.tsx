import {
  BookOpen,
  ChartColumn,
  Fuel,
  HandCoins,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { NavLink, Outlet, redirect, useNavigate } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth-client";
import { type Company, getCompanyId, setCompanyId } from "~/lib/company";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/app-layout";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/sales", label: "Sales", icon: Fuel },
  { to: "/disbursements", label: "Disbursements", icon: Wallet },
  { to: "/receivables", label: "Receivables", icon: HandCoins },
  { to: "/payables", label: "Payables", icon: ReceiptText },
  { to: "/reports", label: "BIR reports", icon: ChartColumn },
  { to: "/accounts", label: "Chart of accounts", icon: BookOpen },
];

export async function clientLoader() {
  const { data: session } = await authClient.getSession();
  if (!session) throw redirect("/login");

  const companies = await api<Company[]>("/companies");
  if (companies.length === 0) throw redirect("/setup");

  const company = companies.find((c) => c.id === getCompanyId()) ?? companies[0];
  setCompanyId(company.id);
  return { user: session.user, company, companies };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, company } = loaderData;
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-sidebar-border bg-sidebar px-4 py-4 md:sticky md:top-0 md:h-svh md:w-60 md:border-r md:border-b-0 md:py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="md:hidden">
            <LogOut />
          </Button>
        </div>
        <div className="hidden flex-col gap-0.5 md:flex">
          <span className="label-mono">Station</span>
          <span className="truncate text-sm font-medium">{company.tradeName || company.name}</span>
          {company.tin && <span className="num text-xs text-muted-foreground">TIN {company.tin}</span>}
        </div>
        <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col md:overflow-visible">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex h-10 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:h-9",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden items-center justify-between gap-2 border-t border-sidebar-border pt-4 md:flex">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] text-foreground">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut />
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
