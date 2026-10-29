/**
 * Design borrowings: Linear (dense calm sidebar, Cmd-K), Stripe Dashboard (KPI clarity),
 * Xero/QB (guided start), Mercury (banking calm), Vercel (type/spacing), shadcn blocks.
 * Full notes: apps/web/DESIGN.md
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

  const settings: SidebarLink[] = [{ to: "/station", label: "Business / station", icon: Settings }];

  return (
    <nav className="grid gap-3" aria-label="Main" data-sidebar>
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
            isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )
        }
      >
        <LayoutDashboard className="h-4 w-4 opacity-70" />
        Dashboard
      </NavLink>
      <SidebarGroup label="Sales" icon={ShoppingCart} links={sales} onNavigate={onNavigate} />
      <SidebarGroup label="Customers" icon={Users} links={customers} onNavigate={onNavigate} />
      <SidebarGroup label={fuel ? "Inventory / Fuel" : "Inventory"} icon={Package} links={inventory} onNavigate={onNavigate} />
      <SidebarGroup label="Cash" icon={Wallet} links={cash} onNavigate={onNavigate} />
      <SidebarGroup label="Expenses & suppliers" icon={CircleDollarSign} links={expenses} onNavigate={onNavigate} />
      <SidebarGroup label="Books" icon={BookOpen} links={books} onNavigate={onNavigate} />
      <SidebarGroup label="Reports" icon={Receipt} links={reports} onNavigate={onNavigate} />
      <SidebarGroup label="Settings" icon={Settings} links={settings} onNavigate={onNavigate} />
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
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className={cn("app-chrome sticky top-0 z-30 border-b bg-background/90 backdrop-blur print-hide", isDesktop && "nines-drag-region")}>
        <div className="flex h-14 items-center gap-3 px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("md:hidden", isDesktop && "nines-no-drag")}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <span className="font-display text-lg font-semibold tracking-tight">Nines</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{loaderData.station.name}</span>
          <div className={cn("ml-auto flex items-center gap-1 sm:gap-2", isDesktop && "nines-no-drag")}>
            <Button type="button" variant="outline" size="sm" className="hidden gap-2 sm:inline-flex" onClick={openPalette}>
              <Search className="h-3.5 w-3.5" />
              Search
              <kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="sm:hidden" aria-label="Open command palette" onClick={openPalette}>
              <Search />
            </Button>
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground lg:inline">{loaderData.user.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={signOut}>
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 print-hide md:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 overflow-y-auto bg-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold">{loaderData.station.name}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <X />
              </Button>
            </div>
            <Nav me={loaderData} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="print-hide hidden min-h-[calc(100vh-3.5rem)] border-r bg-sidebar/80 p-3 md:block" data-sidebar>
          <Nav me={loaderData} />
        </aside>
        <main id="main" className="px-4 py-6 md:px-6">
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
      <h1 className="text-xl font-semibold">This page didn’t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh and try again. If it keeps happening, check that the API is running.</p>
    </main>
  );
}
