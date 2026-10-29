/**
 * Ofacc+-inspired shell. Tokens + rules: apps/web/DESIGN.md
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Outlet, redirect, useNavigate } from "react-router";
import { CommandPalette, type CommandItem } from "~/components/command-palette";
import { SidebarGroup, type SidebarLink } from "~/components/sidebar-group";
import { ThemeToggle } from "~/components/theme-toggle";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth-client";
import { toggleTheme } from "~/lib/theme";
import type { Me } from "~/lib/types";
import { cn } from "~/lib/utils";

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

function fuelEnabled(me: Me) {
  if (!me.station) return false;
  if (typeof me.station.fuelModuleEnabled === "boolean") return me.station.fuelModuleEnabled;
  return me.station.industry === "FUEL_STATION" || me.station.industry == null;
}

function Nav({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const fuel = fuelEnabled(me);

  const primary: SidebarLink[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/sales", label: "Invoices", icon: Receipt },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/items", label: "Items", icon: Package },
  ];

  const operations: SidebarLink[] = [
    { to: "/cash", label: "Cash", icon: Wallet },
    { to: "/expenses", label: "Expenses", icon: CircleDollarSign },
    { to: "/payables", label: "Suppliers", icon: ShoppingCart },
    ...(fuel
      ? [
          { to: "/fuel/tanks", label: "Tanks", icon: Fuel },
          { to: "/shifts", label: "Shifts" },
        ]
      : []),
  ];

  const books: SidebarLink[] = [
    { to: "/books", label: "Chart of accounts", icon: BookOpen },
    { to: "/books/journal", label: "Journal" },
    { to: "/books/trial-balance", label: "Trial balance" },
    { to: "/reports", label: "Reports" },
  ];

  const settings: SidebarLink[] = [{ to: "/station", label: "Business", icon: Settings }];

  return (
    <nav className="grid gap-1" aria-label="Main" data-sidebar>
      <SidebarGroup links={primary} onNavigate={onNavigate} />
      <SidebarGroup label="Operations" links={operations} onNavigate={onNavigate} />
      <SidebarGroup label="Books" links={books} onNavigate={onNavigate} />
      <SidebarGroup label="Settings" links={settings} onNavigate={onNavigate} />
    </nav>
  );
}

export default function AppLayout({ loaderData }: { loaderData: Me }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(Boolean(window.ninesDesktop));
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    navigate("/login");
  }, [navigate]);

  const commands: CommandItem[] = useMemo(
    () => [
      { id: "sale", label: "New sale", hint: "Sales", keywords: "invoice", run: () => navigate("/sales/new") },
      { id: "expense", label: "New expense", hint: "Expenses", run: () => navigate("/expenses") },
      { id: "collection", label: "Record collection", hint: "Customers", run: () => navigate("/customers") },
      { id: "close-day", label: "Close the day", hint: "Cash", run: () => navigate("/cash") },
      { id: "customers", label: "Go to customers", run: () => navigate("/customers") },
      { id: "books", label: "Go to books", run: () => navigate("/books") },
      { id: "theme", label: "Toggle theme", keywords: "dark light", run: () => toggleTheme() },
      { id: "signout", label: "Sign out", run: () => void signOut() },
    ],
    [navigate, signOut],
  );

  if (!loaderData.user) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!loaderData.station) {
    return <Outlet context={loaderData} />;
  }

  const userName = loaderData.user.name;

  return (
    <div className={cn("min-h-screen p-0 md:p-4 lg:p-5", isDesktop && "nines-drag-region")}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <div
        className={cn(
          "nines-frame mx-auto flex min-h-screen max-w-[1400px] flex-col md:min-h-[calc(100vh-2.5rem)] md:flex-row md:overflow-hidden md:rounded-[24px]",
          isDesktop && "nines-no-drag",
        )}
      >
        <aside className="print-hide hidden w-[232px] shrink-0 flex-col border-r border-border bg-sidebar md:flex" data-sidebar>
          <div className="px-4 pb-2 pt-5">
            <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-surface-hover">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">N</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">Nines</span>
                <span className="block truncate text-[11px] text-muted-foreground">{loaderData.station.name}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-1">
            <Nav me={loaderData} />
          </div>
          <div className="border-t border-border px-4 py-4">
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-card">
          <header className="app-chrome sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur print-hide md:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </Button>
            <button
              type="button"
              onClick={openPalette}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-left text-[13px] text-muted-foreground transition-colors hover:bg-surface-hover md:max-w-md"
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Search invoices, customers, pages…</span>
              <kbd className="ml-auto hidden rounded-md border border-border bg-card px-1.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar name={userName} size="sm" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[12px] font-semibold">{userName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{loaderData.user.email}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {menuOpen ? (
            <div className="fixed inset-0 z-40 print-hide md:hidden">
              <button className="absolute inset-0 bg-black/20" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col overflow-y-auto bg-card p-3 shadow-2xl">
                <div className="mb-3 flex items-center justify-between px-2 pt-2">
                  <span className="text-[15px] font-semibold tracking-[-0.02em]">Nines</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                    <X />
                  </Button>
                </div>
                <Nav me={loaderData} onNavigate={() => setMenuOpen(false)} />
                <div className="mt-auto space-y-3 border-t border-border pt-3">
                  <ThemeToggle />
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet context={loaderData} />
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold tracking-[-0.03em]">This page didn’t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh and try again. If it keeps happening, check that the API is running.</p>
    </main>
  );
}
