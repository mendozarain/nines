import { Link, useOutletContext } from "react-router";
import { describeOverShort, formatCentavos, formatDate, formatMonth } from "@nines/shared";
import { EmptyState, LoadingBlock, StatCard } from "~/components/page";
import { Button } from "~/components/ui/button";
import { useFetch } from "~/lib/use-fetch";
import type { Dashboard, Me } from "~/lib/types";

export function meta() {
  return [{ title: "Dashboard · Nines" }];
}

function fuelEnabled(me: Me) {
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

export default function DashboardPage() {
  const me = useOutletContext<Me>();
  const fuel = fuelEnabled(me);
  const { data, error, loading } = useFetch<Dashboard>("/api/dashboard");
  const hello = `${timeGreeting()}, ${greetingName(me.user?.name ?? "")}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.04em] text-foreground">{hello}</h1>
          <p className="text-[14px] text-muted-foreground">
            {me.station ? `${me.station.name}${data ? ` · ${formatDate(data.today)}` : ""}` : "Your books for today"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            {fuel ? <Link to="/shifts/new">Record a shift</Link> : <Link to="/cash">Close the day</Link>}
          </Button>
          <Button asChild>
            <Link to="/sales/new">Create invoice</Link>
          </Button>
        </div>
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today’s sales" value={formatCentavos(data.todaySalesCentavos)} href="/sales" testId="today-sales" />
            <StatCard label="Today’s expenses" value={formatCentavos(data.todayExpensesCentavos)} href="/expenses" testId="today-expenses" />
            <StatCard
              label="Today’s cash"
              value={describeOverShort(data.todayOverShortCentavos).label}
              hint={fuel ? "Compared with pump sales" : "From cash reconciliation"}
              testId="today-over-short"
            />
            <StatCard
              label={data.vatRegistered ? "Output VAT this month" : "Tax this month"}
              value={data.vatRegistered ? formatCentavos(data.monthOutputVatCentavos) : "Percentage tax"}
              hint={formatMonth(data.month)}
              href="/reports"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-5 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Last 14 days</h2>
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Sales</p>
              </div>
              {data.series.every((point) => point.salesCentavos === "0") ? (
                <EmptyState
                  className="border-0 px-0 py-10"
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
            <div className="grid gap-3">
              <StatCard label={`${formatMonth(data.month)} sales`} value={formatCentavos(data.monthSalesCentavos)} href="/reports" />
              <StatCard label={`${formatMonth(data.month)} expenses`} value={formatCentavos(data.monthExpensesCentavos)} href="/expenses" />
              <StatCard
                label="Customers still owe"
                value={formatCentavos(data.receivablesCentavos)}
                href="/customers"
                hint="Charges minus collections"
              />
              <StatCard label="Bills still to pay" value={formatCentavos(data.payablesCentavos)} href="/payables" hint="Supplier bills minus payments" />
            </div>
          </section>
        </>
      ) : null}
    </div>
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
      <table className="sr-only">
        <caption>Daily sales</caption>
        <tbody>
          {series.map((point) => (
            <tr key={point.date}>
              <th>{formatDate(point.date)}</th>
              <td>{formatCentavos(point.salesCentavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
