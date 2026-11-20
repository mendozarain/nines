/**
 * Shell redesign: Xero-style top nav (no dense left sidebar).
 * Full notes: apps/web/DESIGN.md
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CircleDollarSign,
  Fuel,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Link, Outlet, redirect, useNavigate } from "react-router";
import { CommandPalette, type CommandItem } from "~/components/command-palette";
import { MobileNavList, TopNav, type TopNavItem } from "~/components/top-nav";
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

function buildNavItems(fuel: boolean): TopNavItem[] {
  const inventoryChildren = [
    { to: "/items", label: "Items", description: "Products and prices" },
    ...(fuel
      ? [
          { to: "/fuel/tanks", label: "Tanks", description: "Fuel inventory" },
          { to: "/fuel/deliveries", label: "Deliveries", description: "Incoming fuel" },
          { to: "/fuel/dips", label: "Dips", description: "Stick readings" },
          { to: "/station", label: "Pumps", description: "Pump setup" },
          { to: "/shifts", label: "Shifts", description: "Open and close" },
        ]
      : []),
  ];

  return [
    {
      id: "home",
      label: "Home",
      icon: Home,
      to: "/",
      end: true,
    },
    {
      id: "sales",
      label: "Sales",
      icon: ShoppingCart,
      match: (path) => path.startsWith("/sales"),
      children: [
        { to: "/sales", label: "Invoices", description: "All sales" },
        { to: "/sales/new", label: "New sale", description: "Record a sale" },
      ],
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      to: "/customers",
    },
    {
      id: "inventory",
      label: fuel ? "Fuel" : "Inventory",
      icon: fuel ? Fuel : Package,
      match: (path) =>
        path.startsWith("/items") ||
        path.startsWith("/fuel") ||
        (fuel && (path.startsWith("/shifts") || path === "/station")),
      children: inventoryChildren,
    },
    {
      id: "cash",
      label: "Cash",
      icon: Wallet,
      match: (path) => path.startsWith("/cash") || (!fuel && path.startsWith("/shifts")),
      children: [
        { to: "/cash", label: "Reconciliation", description: "Count and close" },
        { to: "/shifts", label: "Shifts", description: "Shift history" },
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: CircleDollarSign,
      match: (path) => path.startsWith("/expenses") || path.startsWith("/payables") || path.startsWith("/supplier"),
      children: [
        { to: "/expenses", label: "Expenses", description: "What you spend" },
        { to: "/payables", label: "Suppliers", description: "Who you pay" },
      ],
    },
    {
      id: "books",
      label: "Books",
      icon: BookOpen,
      match: (path) => path.startsWith("/books"),
      children: [
        { to: "/books", label: "Chart of accounts" },
        { to: "/books/journal", label: "Journal" },
        { to: "/books/trial-balance", label: "Trial balance" },
        { to: "/books/statements", label: "Statements" },
        { to: "/books/assets", label: "Fixed assets" },
        { to: "/books/payroll", label: "Payroll" },
      ],
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
      match: (path) => path.startsWith("/reports") || path.startsWith("/books/tax"),
      children: [
        { to: "/reports", label: "Reports", description: "Daily, monthly, VAT" },
        { to: "/books/tax-calendar", label: "Tax calendar" },
        { to: "/station", label: "Business settings", description: "Station and modules" },
      ],
    },
  ];
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

  const fuel = fuelEnabled(loaderData);
  const navItems = useMemo(() => buildNavItems(fuel), [fuel]);

  const commands: CommandItem[] = useMemo(
    () => [
      { id: "home", label: "Go to home", hint: "Dashboard", run: () => navigate("/") },
      { id: "sale", label: "New sale", hint: "Sales", keywords: "invoice", run: () => navigate("/sales/new") },
      { id: "invoices", label: "Invoices", hint: "Sales", run: () => navigate("/sales") },
      { id: "customers", label: "Customers", run: () => navigate("/customers") },
      { id: "items", label: "Items", hint: "Inventory", run: () => navigate("/items") },
      ...(fuel
        ? [
            { id: "tanks", label: "Tanks", hint: "Fuel", run: () => navigate("/fuel/tanks") },
            { id: "deliveries", label: "Deliveries", hint: "Fuel", run: () => navigate("/fuel/deliveries") },
            { id: "dips", label: "Dip readings", hint: "Fuel", run: () => navigate("/fuel/dips") },
            { id: "pumps", label: "Pumps", hint: "Fuel", run: () => navigate("/station") },
          ]
        : []),
      { id: "cash", label: "Cash reconciliation", hint: "Cash", run: () => navigate("/cash") },
      { id: "shifts", label: "Shifts", hint: "Cash", run: () => navigate("/shifts") },
      { id: "expense", label: "Expenses", hint: "Spend", run: () => navigate("/expenses") },
      { id: "suppliers", label: "Suppliers", hint: "Payables", run: () => navigate("/payables") },
      { id: "books", label: "Chart of accounts", hint: "Books", run: () => navigate("/books") },
      { id: "journal", label: "Journal", hint: "Books", run: () => navigate("/books/journal") },
      { id: "tb", label: "Trial balance", hint: "Books", run: () => navigate("/books/trial-balance") },
      { id: "statements", label: "Statements", hint: "Books", run: () => navigate("/books/statements") },
      { id: "assets", label: "Fixed assets", hint: "Books", run: () => navigate("/books/assets") },
      { id: "payroll", label: "Payroll", hint: "Books", run: () => navigate("/books/payroll") },
      { id: "reports", label: "Reports", run: () => navigate("/reports") },
      { id: "tax", label: "Tax calendar", run: () => navigate("/books/tax-calendar") },
      { id: "settings", label: "Business settings", run: () => navigate("/station") },
      { id: "theme", label: "Toggle theme", keywords: "dark light", run: () => toggleTheme() },
      { id: "signout", label: "Sign out", run: () => void signOut() },
    ],
    [fuel, navigate, signOut],
  );

  if (!loaderData.user) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!loaderData.station) {
    return <Outlet context={loaderData} />;
  }

  return (
    <div className="app-shell min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "app-chrome sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md print-hide",
          isDesktop && "nines-drag-region",
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("xl:hidden", isDesktop && "nines-no-drag")}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Link to="/" className={cn("flex min-w-0 shrink-0 items-center gap-2", isDesktop && "nines-no-drag")}>
            <span className="text-sm font-semibold tracking-tight">Nines</span>
            <span className="hidden text-border 2xl:inline">|</span>
            <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground 2xl:inline">
              {loaderData.station.name}
            </span>
          </Link>

          <div className={cn("hidden min-w-0 flex-1 xl:flex", isDesktop && "nines-no-drag")}>
            <TopNav items={navItems} />
          </div>

          <div className={cn("ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1", isDesktop && "nines-no-drag")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 text-muted-foreground 2xl:inline-flex"
              onClick={openPalette}
            >
              <Search className="h-3.5 w-3.5" />
              Search
              <kbd className="rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">⌘K</kbd>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="2xl:hidden"
              aria-label="Open command palette"
              onClick={openPalette}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" asChild aria-label="Settings">
              <Link to="/station">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground 2xl:inline">{loaderData.user.name}</span>
            <Button type="button" variant="ghost" size="icon" className="sm:hidden" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="hidden h-8 sm:inline-flex" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden 2xl:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 print-hide xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="app-sidebar absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col border-r border-border bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Nines</p>
                <p className="truncate text-xs text-muted-foreground">{loaderData.station.name}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MobileNavList items={navItems} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="border-t border-border p-4">
              <p className="truncate text-sm font-medium">{loaderData.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{loaderData.user.email}</p>
            </div>
          </div>
        </div>
      ) : null}

      <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        <Outlet context={loaderData} />
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">This page didn’t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Refresh and try again. If it keeps happening, check that the API is running.
      </p>
    </main>
  );
}
