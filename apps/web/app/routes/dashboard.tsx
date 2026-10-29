import { Link, useOutletContext } from "react-router";
import { describeOverShort, formatCentavos, formatDate, formatMonth } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader, StatCard } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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

export default function DashboardPage() {
  const me = useOutletContext<Me>();
  const fuel = fuelEnabled(me);
  const { data, error, loading } = useFetch<Dashboard>("/api/dashboard");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description={me.station ? `${me.station.name}${data ? ` · ${formatDate(data.today)}` : ""}` : ""}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/sales/new">New sale</Link>
            </Button>
            {fuel ? (
              <Button asChild variant="outline">
                <Link to="/shifts/new">Record a shift</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/cash">Close the day</Link>
              </Button>
            )}
          </div>
        }
      />
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
          <section className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium">Last 14 days of sales</CardTitle>
              </CardHeader>
              <CardContent>
                {data.series.every((point) => point.salesCentavos === "0") ? (
                  <EmptyState
                    title="No sales in the last two weeks"
                    description="Record a sale or a shift, and the days will show up here."
                    action={
                      <Button asChild>
                        <Link to="/sales/new">New sale</Link>
                      </Button>
                    }
                  />
                ) : (
                  <SalesChart series={data.series} />
                )}
              </CardContent>
            </Card>
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
      <div className="relative h-48 w-full" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline fill="url(#salesFill)" stroke="none" points={`0,100 ${points.join(" ")} 100,100`} />
          <polyline fill="none" stroke="var(--chart)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={points.join(" ")} />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-end gap-1 px-0.5">
          {series.map((point) => {
            const height = Number((BigInt(point.salesCentavos) * 1000n) / max) / 10;
            return (
              <div
                key={point.date}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${formatDate(point.date)} ${formatCentavos(point.salesCentavos)}`}
              >
                <div
                  className="rounded-sm bg-chart/25"
                  style={{ height: `${point.salesCentavos === "0" ? 0 : Math.max(height, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
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
