import { Link, useOutletContext } from "react-router";
import { describeOverShort, formatCentavos, formatDate, formatMonth } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader, Panel, StatCard } from "~/components/page";
import { Button } from "~/components/ui/button";
import { useFetch } from "~/lib/use-fetch";
import type { Dashboard, Me } from "~/lib/types";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Dashboard · Nines" }];
}

function fuelEnabled(me: Me) {
  if (!me.station) return false;
  if (typeof me.station.fuelModuleEnabled === "boolean") return me.station.fuelModuleEnabled;
  return me.station.industry === "FUEL_STATION" || me.station.industry == null;
}

function greetingFor(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const me = useOutletContext<Me>();
  const fuel = fuelEnabled(me);
  const { data, error, loading } = useFetch<Dashboard>("/api/dashboard");

  const firstName = me.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={data ? formatDate(data.today) : undefined}
        title={`${greetingFor()}, ${firstName}`}
        description={
          me.station
            ? `${me.station.name} · ${data ? formatMonth(data.month) : "This month"} overview`
            : undefined
        }
        action={
          <>
            <Button asChild>
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
          </>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="This month’s sales"
              value={formatCentavos(data.monthSalesCentavos)}
              hint={`Today ${formatCentavos(data.todaySalesCentavos)}`}
              href="/sales"
              testId="today-sales"
            />
            <StatCard
              label="This month’s expenses"
              value={formatCentavos(data.monthExpensesCentavos)}
              hint={`Today ${formatCentavos(data.todayExpensesCentavos)}`}
              href="/expenses"
              testId="today-expenses"
            />
            <StatCard
              label="Receivables"
              value={formatCentavos(data.receivablesCentavos)}
              hint="Customers still owe"
              href="/customers"
            />
            <StatCard
              label="Payables"
              value={formatCentavos(data.payablesCentavos)}
              hint="Bills still to pay"
              href="/payables"
            />
            <StatCard
              label={data.vatRegistered ? "Output VAT" : "Tax status"}
              value={data.vatRegistered ? formatCentavos(data.monthOutputVatCentavos) : "Percentage tax"}
              hint={formatMonth(data.month)}
              href="/reports"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel
              title="Sales vs expenses"
              description="Last 14 days · Manila time"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/reports">Reports</Link>
                </Button>
              }
            >
              {data.series.every((point) => point.salesCentavos === "0" && (point.expensesCentavos ?? "0") === "0") ? (
                <EmptyState
                  title="No movement yet"
                  description="Record a sale, shift, or expense and the chart will fill in."
                  action={
                    <Button asChild size="sm">
                      <Link to="/sales/new">New sale</Link>
                    </Button>
                  }
                />
              ) : (
                <TrendChart series={data.series} />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-chart" /> Sales
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-chart-secondary" /> Expenses
                </span>
                <span className="ml-auto font-money">
                  Cash today: {describeOverShort(data.todayOverShortCentavos).label}
                </span>
              </div>
            </Panel>

            <Panel
              title="Needs attention"
              description="Things that may need a follow-up"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/books/tax-calendar">Tax calendar</Link>
                </Button>
              }
            >
              {(data.attention ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing urgent right now.</p>
              ) : (
                <ul className="grid gap-2">
                  {(data.attention ?? []).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        {item.amountCentavos ? (
                          <span
                            className={cn(
                              "shrink-0 font-money text-sm",
                              item.kind === "overdue" || item.kind === "credit_limit"
                                ? "text-destructive"
                                : "text-foreground",
                            )}
                          >
                            {formatCentavos(item.amountCentavos)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          <Panel title="Recent activity" description="Latest sales and expenses">
            {(data.activity ?? []).length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Sales invoices and expenses will show up here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.activity ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-border/70 last:border-0">
                        <td className="py-2.5 text-muted-foreground">{formatDate(row.date)}</td>
                        <td className="py-2.5">
                          <Link to={row.href} className="font-medium hover:underline">
                            {row.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{row.detail}</p>
                        </td>
                        <td className="py-2.5 capitalize text-muted-foreground">{row.kind}</td>
                        <td className="py-2.5 text-right font-money">{formatCentavos(row.amountCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function TrendChart({ series }: { series: Dashboard["series"] }) {
  const max = series.reduce((highest, point) => {
    const sales = BigInt(point.salesCentavos);
    const expenses = BigInt(point.expensesCentavos ?? "0");
    const local = sales > expenses ? sales : expenses;
    return local > highest ? local : highest;
  }, 1n);

  function toPoints(key: "salesCentavos" | "expensesCentavos") {
    return series
      .map((point, index) => {
        const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * 100;
        const raw = BigInt(point[key] ?? "0");
        const y = 100 - Number((raw * 1000n) / max) / 10;
        return `${x},${Math.min(98, Math.max(2, y))}`;
      })
      .join(" ");
  }

  return (
    <div>
      <div className="relative h-52 w-full" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.4" />
          ))}
          <polyline fill="none" stroke="var(--chart)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" points={toPoints("salesCentavos")} />
          <polyline
            fill="none"
            stroke="var(--chart-secondary)"
            strokeWidth="1.6"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
            points={toPoints("expensesCentavos")}
          />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(series[0]?.date ?? "")}</span>
        <span>{formatDate(series[series.length - 1]?.date ?? "")}</span>
      </div>
      <table className="sr-only">
        <caption>Daily sales and expenses</caption>
        <tbody>
          {series.map((point) => (
            <tr key={point.date}>
              <th>{formatDate(point.date)}</th>
              <td>{formatCentavos(point.salesCentavos)}</td>
              <td>{formatCentavos(point.expensesCentavos ?? "0")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
