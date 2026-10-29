/**
 * Shell: Apple-calm sidebar + content. Notes: apps/web/DESIGN.md
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
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
import { NavLink, Outlet, redirect, useNavigate } from "react-router";
import { CommandPalette, type CommandItem } from "~/components/command-palette";
import { SidebarGroup, type SidebarLink } from "~/components/sidebar-group";
import { ThemeToggle } from "~/components/theme-toggle";
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

  const sales: SidebarLink[] = [
    { to: "/sales", label: "Invoices", icon: Receipt },
    { to: "/sales/new", label: "New sale", icon: ShoppingCart },
  ];

  const customers: SidebarLink[] = [{ to: "/customers", label: "Customers", icon: Users }];

  const inventory: SidebarLink[] = [
    { to: "/items", label: "Items", icon: Package },
    ...(fuel
      ? [
          { to: "/fuel/tanks", label: "Tanks", icon: Fuel },
          { to: "/fuel/deliveries", label: "Deliveries" },
          { to: "/fuel/dips", label: "Dips" },
          { to: "/station", label: "Pumps" },
          { to: "/shifts", label: "Shifts" },
        ]
      : []),
  ];

  const cash: SidebarLink[] = [
    { to: "/cash", label: "Reconciliation", icon: Wallet },
    ...(fuel ? [{ to: "/shifts", label: "Shifts" }] : []),
  ];

  const expenses: SidebarLink[] = [
    { to: "/expenses", label: "Expenses", icon: CircleDollarSign },
    { to: "/payables", label: "Suppliers" },
  ];

  const books: SidebarLink[] = [
    { to: "/books", label: "Chart of accounts", icon: BookOpen },
    { to: "/books/journal", label: "Journal" },
    { to: "/books/trial-balance", label: "Trial balance" },
    { to: "/books/statements", label: "Statements" },
    { to: "/books/assets", label: "Fixed assets" },
    { to: "/books/payroll", label: "Payroll" },
  ];

  const reports: SidebarLink[] = [
    { to: "/reports", label: "Daily / monthly / VAT" },
    { to: "/books/tax-calendar", label: "Tax calendar" },
  ];

  const settings: SidebarLink[] = [{ to: "/station", label: "Business", icon: Settings }];

  return (
    <nav className="grid gap-0.5" aria-label="Main" data-sidebar>
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
            isActive ? "bg-accent font-medium text-foreground" : "text-sidebar-foreground hover:bg-surface-hover hover:text-foreground",
          )
        }
      >
        <LayoutDashboard className="h-4 w-4 opacity-55" />
        Dashboard
      </NavLink>
      <SidebarGroup label="Sales" links={sales} onNavigate={onNavigate} />
      <SidebarGroup label="Customers" links={customers} onNavigate={onNavigate} />
      <SidebarGroup label="Inventory" links={inventory} onNavigate={onNavigate} />
      <SidebarGroup label="Cash" links={cash} onNavigate={onNavigate} />
      <SidebarGroup label="Expenses" links={expenses} onNavigate={onNavigate} />
      <SidebarGroup label="Books" links={books} onNavigate={onNavigate} />
      <SidebarGroup label="Reports" links={reports} onNavigate={onNavigate} />
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

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "print-hide hidden min-h-screen flex-col bg-sidebar md:flex",
          isDesktop && "nines-drag-region",
        )}
        data-sidebar
      >
        <div className={cn("px-5 pb-2 pt-6", isDesktop && "nines-no-drag")}>
          <p className="text-[17px] font-semibold tracking-[-0.03em]">Nines</p>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">{loaderData.station.name}</p>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-3", isDesktop && "nines-no-drag")}>
          <Nav me={loaderData} />
        </div>
        <div className={cn("mt-auto px-3 pb-4 pt-2", isDesktop && "nines-no-drag")}>
          <div className="rounded-xl bg-background/80 px-3 py-3">
            <p className="truncate text-[12px] text-muted-foreground">{loaderData.user.name}</p>
            <div className="mt-2 flex items-center gap-1">
              <ThemeToggle />
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[12px]" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className={cn("app-chrome sticky top-0 z-30 bg-background/80 backdrop-blur-xl print-hide md:hidden", isDesktop && "nines-drag-region")}>
          <div className="flex h-12 items-center gap-2 px-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", isDesktop && "nines-no-drag")}
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </Button>
            <span className="truncate text-[14px] font-medium tracking-[-0.02em]">{loaderData.station.name}</span>
            <div className={cn("ml-auto flex items-center gap-1", isDesktop && "nines-no-drag")}>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Open command palette" onClick={openPalette}>
                <Search />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="print-hide hidden items-center justify-end gap-2 px-8 pt-5 md:flex">
          <Button type="button" variant="secondary" size="sm" className="h-8 gap-2 px-3 text-[12px]" onClick={openPalette}>
            <Search className="h-3.5 w-3.5" />
            Search
            <kbd className="text-[10px] text-muted-foreground">⌘K</kbd>
          </Button>
        </div>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 print-hide md:hidden">
            <button className="absolute inset-0 bg-black/20" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col overflow-y-auto bg-sidebar p-3 shadow-2xl shadow-black/10">
              <div className="mb-3 flex items-center justify-between px-2 pt-2">
                <span className="text-[16px] font-semibold tracking-[-0.03em]">Nines</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                  <X />
                </Button>
              </div>
              <p className="mb-3 truncate px-2.5 text-[12px] text-muted-foreground">{loaderData.station.name}</p>
              <Nav me={loaderData} onNavigate={() => setMenuOpen(false)} />
              <div className="mt-auto pt-3">
                <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:pb-12 md:pt-4">
          <Outlet context={loaderData} />
        </main>
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
