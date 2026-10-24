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

export default function DashboardPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading } = useFetch<Dashboard>("/api/dashboard");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description={me.station ? `${me.station.name} · ${data ? formatDate(data.today) : ""}` : ""}
        action={
          <Button asChild>
            <Link to="/shifts/new">Record a shift</Link>
          </Button>
        }
      />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today’s sales" value={formatCentavos(data.todaySalesCentavos)} href="/shifts" testId="today-sales" />
            <StatCard label="Today’s expenses" value={formatCentavos(data.todayExpensesCentavos)} href="/expenses" testId="today-expenses" />
            <StatCard label="Today’s cash" value={describeOverShort(data.todayOverShortCentavos).label} hint="Compared with pump sales" testId="today-over-short" />
            <StatCard
              label="Output VAT this month"
              value={data.vatRegistered ? formatCentavos(data.monthOutputVatCentavos) : "Not registered"}
              hint={formatMonth(data.month)}
              href="/reports"
            />
          </section>
          <section className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Last 14 days of fuel sales</CardTitle>
              </CardHeader>
              <CardContent>
                {data.series.every((point) => point.salesCentavos === "0") ? (
                  <EmptyState title="No sales in the last two weeks" description="Record a shift after the cashier closes, and the days will show up here." />
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
                href="/receivables"
                hint="Credit sales minus payments"
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
  return (
    <div>
      <div className="flex h-48 items-end gap-1" aria-hidden="true">
        {series.map((point) => {
          const height = Number((BigInt(point.salesCentavos) * 1000n) / max) / 10;
          return (
            <div key={point.date} className="flex h-full flex-1 flex-col justify-end" title={`${formatDate(point.date)} ${formatCentavos(point.salesCentavos)}`}>
              <div className="rounded-sm bg-primary/80" style={{ height: `${point.salesCentavos === "0" ? 0 : Math.max(height, 2)}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(series[0]?.date ?? "")}</span>
        <span>{formatDate(series[series.length - 1]?.date ?? "")}</span>
      </div>
      <table className="sr-only">
        <caption>Daily fuel sales</caption>
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
