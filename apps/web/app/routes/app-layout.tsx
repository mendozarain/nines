import { useState } from "react";
import { Fuel, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet, redirect, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth-client";
import type { Me } from "~/lib/types";
import { cn } from "~/lib/utils";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/shifts", label: "Shifts" },
  { to: "/expenses", label: "Expenses" },
  { to: "/receivables", label: "Receivables" },
  { to: "/payables", label: "Payables" },
  { to: "/reports", label: "Reports" },
  { to: "/station", label: "Station" },
];

export async function clientLoader({ request }: { request: Request }) {
  let me: Me;
  try {
    me = await api<Me>("/api/me");
  } catch {
    me = { user: null, station: null, today: "", month: "" };
  }
  const path = new URL(request.url).pathname;
  if (!me.user) return redirect("/login");
  if (!me.station && path !== "/setup") return redirect("/setup");
  if (me.station && path === "/setup") return redirect("/");
  return me;
}

export function shouldRevalidate() {
  return true;
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1" aria-label="Main">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-2 text-sm font-medium",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout({ loaderData }: { loaderData: Me }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loaderData.user) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  async function signOut() {
    await authClient.signOut();
    navigate("/login");
  }

  if (!loaderData.station) {
    return <Outlet context={loaderData} />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <Fuel className="hidden h-5 w-5 md:block" />
          <span className="font-semibold">Nines</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{loaderData.station.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{loaderData.user.name}</span>
            <Button type="button" variant="ghost" onClick={signOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 bg-background p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{loaderData.station.name}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <X />
              </Button>
            </div>
            <Nav onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-6xl md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-3.5rem)] border-r bg-background p-3 md:block">
          <Nav />
        </aside>
        <main id="main" className="px-4 py-6 md:px-6">
          <Outlet context={loaderData} />
        </main>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">This page didn’t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh and try again. If it keeps happening, check that the API is running.</p>
    </main>
  );
}
