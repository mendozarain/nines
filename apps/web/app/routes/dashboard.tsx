import { Link, useOutletContext } from "react-router";
import { AlertTriangle, ArrowRight, Search, Wallet } from "lucide-react";
import { describeOverShort, formatCentavos, formatDate } from "@nines/shared";
import { EmptyState, LoadingBlock } from "~/components/page";
import { Button } from "~/components/ui/button";
import { useFetch } from "~/lib/use-fetch";
import type { Dashboard } from "~/lib/types";
import { cn } from "~/lib/utils";
import type { AppShellContext } from "~/routes/app-layout";

export function meta() {
  return [{ title: "Today · Nines" }];
}

function fuelEnabled(me: AppShellContext) {
  if (!me.station) return false;
  if (typeof me.station.fuelModuleEnabled === "boolean") return me.station.fuelModuleEnabled;
  return me.station.industry === "FUEL_STATION" || me.station.industry == null;
}

function greetingName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isPositiveCentavos(value: string) {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function isCashShort(value: string) {
  try {
    return BigInt(value) < 0n;
  } catch {
    return false;
  }
}

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warn";
};

export default function DashboardPage() {
  const me = useOutletContext<AppShellContext>();
  const fuel = fuelEnabled(me);
  const { data, error, loading } = useFetch<Dashboard>("/api/dashboard");
  const hello = `${timeGreeting()}, ${greetingName(me.user?.name ?? "")}`;

  const alerts: AlertItem[] = [];
  if (data) {
    if (isCashShort(data.todayOverShortCentavos)) {
      alerts.push({
        id: "cash-short",
        title: "Cash short today",
        detail: `${describeOverShort(data.todayOverShortCentavos).label} vs expected tender.`,
        href: "/cash",
        tone: "danger",
      });
    }
    if (isPositiveCentavos(data.receivablesCentavos)) {
      alerts.push({
        id: "receivables",
        title: "Customers still owe",
        detail: `${formatCentavos(data.receivablesCentavos)} in open charges.`,
        href: "/customers",
        tone: "warn",
      });
    }
    if (isPositiveCentavos(data.payablesCentavos)) {
      alerts.push({
        id: "payables",
        title: "Bills still to pay",
        detail: `${formatCentavos(data.payablesCentavos)} owed to suppliers.`,
        href: "/payables",
        tone: "warn",
      });
    }
  }

  const narrative = data
    ? `Today you’ve booked ${formatCentavos(data.todaySalesCentavos)} in sales and ${formatCentavos(data.todayExpensesCentavos)} in expenses. Cash is ${describeOverShort(data.todayOverShortCentavos).label.toLowerCase()}. Customers still owe ${formatCentavos(data.receivablesCentavos)}.`
    : null;

  return (
    <div className="grid gap-8">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center pt-2 text-center sm:pt-6">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">{hello}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Your books, summarized and ready to explore.</p>

        <button
          type="button"
          onClick={() => me.openPalette?.()}
          className="mt-6 flex h-12 w-full items-center gap-3 rounded-full border border-border bg-background px-4 text-left text-[14px] text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-surface-hover"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1 truncate">Search invoices, customers, pages…</span>
          <kbd className="hidden rounded-md border border-border bg-card px-1.5 text-[10px] sm:inline">⌘K</kbd>
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ChipLink to="/sales/new">Create invoice</ChipLink>
          <ChipLink to={fuel ? "/shifts/new" : "/cash"}>{fuel ? "Record a shift" : "Close the day"}</ChipLink>
          <ChipLink to="/customers">Customers owed</ChipLink>
        </div>
      </section>

      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

      {data ? (
        <>
          <section className="mx-auto w-full max-w-3xl text-center">
            <p className="text-[14px] leading-relaxed text-muted-foreground">{narrative}</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
              <Metric value={formatCentavos(data.todaySalesCentavos)} label="Today’s sales" href="/sales" testId="today-sales" />
              <Metric value={formatCentavos(data.todayExpensesCentavos)} label="Today’s expenses" href="/expenses" testId="today-expenses" />
              <Metric
                value={describeOverShort(data.todayOverShortCentavos).label}
                label="Cash"
                href="/cash"
                testId="today-over-short"
              />
              <Metric value={formatCentavos(data.receivablesCentavos)} label="Receivables" href="/customers" />
              <Metric value={formatCentavos(data.payablesCentavos)} label="Payables" href="/payables" className="col-span-2 sm:col-span-1" />
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground/80">
              Books summary · updated {formatDate(data.today)}
            </p>
          </section>

          {alerts.length > 0 ? (
            <section className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Critical alerts</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {alerts.length}
                </span>
              </div>
              <ul className="grid gap-2">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <Link
                      to={alert.href}
                      className="flex items-start gap-3 rounded-xl bg-card/80 px-3 py-3 transition-colors hover:bg-card"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          alert.tone === "danger" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
                        )}
                      >
                        {alert.tone === "danger" ? <Wallet className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-[13px] font-semibold text-foreground">{alert.title}</span>
                        <span className="block text-[12px] text-muted-foreground">{alert.detail}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Sales · last 14 days</h2>
                <p className="text-[12px] text-muted-foreground">Trend</p>
              </div>
              {data.series.every((point) => point.salesCentavos === "0") ? (
                <EmptyState
                  className="border-0 px-0 py-8"
                  title="No sales in the last two weeks"
                  description="Record a sale or a shift, and the days will show up here."
                  action={
                    <Button asChild>
                      <Link to="/sales/new">Create invoice</Link>
                    </Button>
                  }
                />
              ) : (
                <SalesChart series={data.series} />
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">This month</h2>
                <p className="text-[12px] text-muted-foreground">Sales vs expenses</p>
              </div>
              <MonthDonut salesCentavos={data.monthSalesCentavos} expensesCentavos={data.monthExpensesCentavos} />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ChipLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
    >
      {children}
    </Link>
  );
}

function Metric({
  value,
  label,
  href,
  testId,
  className,
}: {
  value: string;
  label: string;
  href: string;
  testId?: string;
  className?: string;
}) {
  return (
    <Link to={href} className={cn("grid gap-1 text-center transition-opacity hover:opacity-80", className)}>
      <p className="text-[22px] font-bold tracking-[-0.04em] tabular-nums text-foreground sm:text-[24px]" data-testid={testId}>
        {value}
      </p>
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </Link>
  );
}

function SalesChart({ series }: { series: Dashboard["series"] }) {
  const max = series.reduce((highest, point) => {
    const value = BigInt(point.salesCentavos);
    return value > highest ? value : highest;
  }, 1n);
  const points = series.map((point, index) => {
    const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * 100;
    const y = 100 - Number((BigInt(point.salesCentavos) * 1000n) / max) / 10;
    return `${x},${Math.min(98, Math.max(2, y))}`;
  });

  return (
    <div>
      <div className="relative h-44 w-full" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--chart)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline fill="url(#salesFill)" stroke="none" points={`0,100 ${points.join(" ")} 100,100`} />
          <polyline fill="none" stroke="var(--chart)" strokeWidth="2" vectorEffect="non-scaling-stroke" points={points.join(" ")} />
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[12px] text-muted-foreground">
        <span>{formatDate(series[0]?.date ?? "")}</span>
        <span>{formatDate(series[series.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}

function MonthDonut({ salesCentavos, expensesCentavos }: { salesCentavos: string; expensesCentavos: string }) {
  const sales = Number(BigInt(salesCentavos));
  const expenses = Number(BigInt(expensesCentavos));
  const total = Math.max(sales + expenses, 1);
  const salesPct = (sales / total) * 100;
  const expensePct = (expenses / total) * 100;
  const r = 36;
  const c = 2 * Math.PI * r;
  const salesLen = (salesPct / 100) * c;
  const expenseLen = (expensePct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--chart)"
            strokeWidth="12"
            strokeDasharray={`${salesLen} ${c - salesLen}`}
            strokeLinecap="butt"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            strokeDasharray={`${expenseLen} ${c - expenseLen}`}
            strokeDashoffset={-salesLen}
            strokeLinecap="butt"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] text-muted-foreground">Net</p>
          <p className="text-[13px] font-semibold tabular-nums tracking-tight">
            {formatCentavos(String(BigInt(salesCentavos) - BigInt(expensesCentavos)))}
          </p>
        </div>
      </div>
      <ul className="grid gap-2 text-left text-[13px]">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart" />
          <span className="text-muted-foreground">Sales</span>
          <span className="ml-auto font-semibold tabular-nums">{formatCentavos(salesCentavos)}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Expenses</span>
          <span className="ml-auto font-semibold tabular-nums">{formatCentavos(expensesCentavos)}</span>
        </li>
      </ul>
    </div>
  );
}
