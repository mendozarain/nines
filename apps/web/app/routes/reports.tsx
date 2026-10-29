import { useState, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router";
import { formatDate, formatLitres, formatMonth } from "@nines/shared";
import { EmptyState, LoadingBlock, Money, OverShort, PageHeader } from "~/components/page";
import { Field } from "~/components/field";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { DailyReport, Me, MonthlyReport, VatReport } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Reports · Nines" }];
}

export default function ReportsPage() {
  const me = useOutletContext<Me>();
  const [date, setDate] = useState(me.today);
  const [month, setMonth] = useState(me.month);
  const daily = useFetch<DailyReport>(`/api/reports/daily?date=${date}`);
  const monthly = useFetch<MonthlyReport>(`/api/reports/monthly?month=${month}`);
  const vat = useFetch<VatReport>(`/api/reports/vat?month=${month}`);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Reports"
        description="Daily sales, monthly sales by fuel, and a simple 12% VAT summary. Prices are VAT-inclusive."
      />
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily sales</TabsTrigger>
          <TabsTrigger value="monthly">Monthly by fuel</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="grid gap-4">
          <Field label="Date" htmlFor="report-date">
            <Input id="report-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="max-w-xs" />
          </Field>
          {daily.loading ? <LoadingBlock /> : null}
          {daily.error ? <p className="text-sm text-destructive">{daily.error}</p> : null}
          {daily.data && daily.data.shiftCount === 0 && daily.data.expenses.length === 0 ? (
            <EmptyState title="Nothing recorded for this day" description="Choose another date, or record a shift." />
          ) : null}
          {daily.data && (daily.data.shiftCount > 0 || daily.data.expenses.length > 0) ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary label="Fuel sales" value={<Money value={daily.data.salesCentavos} />} />
                <Summary label="Expenses" value={<Money value={daily.data.expensesCentavos} />} />
                <Summary label="Cash check" value={<OverShort value={daily.data.overShortCentavos} />} />
              </div>
              <ProductTable products={daily.data.products} />
              <Card>
                <CardHeader>
                  <CardTitle>{formatDate(daily.data.date)}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <p>Cash <Money value={daily.data.cashCentavos} /></p>
                  <p>Card <Money value={daily.data.cardCentavos} /></p>
                  <p>Credit <Money value={daily.data.creditCentavos} /></p>
                  {daily.data.shifts.map((shift) => (
                    <Link key={shift.id} to={`/shifts/${shift.id}`} className="underline-offset-4 hover:underline">
                      {shift.name} · <Money value={shift.salesCentavos} />
                    </Link>
                  ))}
                  {daily.data.expenses.map((expense) => (
                    <p key={expense.id}>
                      {expense.category}
                      {expense.payee ? ` · ${expense.payee}` : ""} · <Money value={expense.amountCentavos} />
                    </p>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="monthly" className="grid gap-4">
          <Field label="Month" htmlFor="report-month">
            <Input id="report-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="max-w-xs" />
          </Field>
          {monthly.loading ? <LoadingBlock /> : null}
          {monthly.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary label={`${formatMonth(monthly.data.month)} sales`} value={<Money value={monthly.data.salesCentavos} />} />
                <Summary label="Expenses" value={<Money value={monthly.data.expensesCentavos} />} />
                <Summary label="Shifts" value={<span>{monthly.data.shiftCount}</span>} />
              </div>
              {monthly.data.products.length === 0 ? (
                <EmptyState title="No fuel sales this month" description="Shifts you record will be grouped by Diesel, Unleaded, Premium, and any other fuel." />
              ) : (
                <ProductTable products={monthly.data.products} />
              )}
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="vat" className="grid gap-4">
          <Field label="Month" htmlFor="vat-month">
            <Input id="vat-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="max-w-xs" />
          </Field>
          {vat.loading ? <LoadingBlock /> : null}
          {vat.data ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {formatMonth(vat.data.month)} · {vat.data.rateLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-muted-foreground">{vat.data.note}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Summary label="Gross sales" value={<Money value={vat.data.grossSalesCentavos} />} />
                  <Summary label="Net of VAT" value={<Money value={vat.data.netSalesCentavos} />} />
                  <Summary label="Output VAT" value={<span data-testid="output-vat"><Money value={vat.data.outputVatCentavos} /></span>} />
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>BIR sales books</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sales listing (SLS) and sales ledger (SLP) export is not in this version. The daily and monthly summaries above are the numbers those books will use.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="nines-row">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ProductTable({ products }: { products: { name: string; litresCentilitres: string; amountCentavos: string }[] }) {
  if (products.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuel</TableHead>
              <TableHead>Litres</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.name}>
                <TableCell>{product.name}</TableCell>
                <TableCell className="tabular-nums">{formatLitres(product.litresCentilitres)}</TableCell>
                <TableCell>
                  <Money value={product.amountCentavos} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
