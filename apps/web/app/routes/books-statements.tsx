import { formatCentavos } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { BalanceSheet, IncomeStatement } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Statements · Nines" }];
}

export default function BooksStatementsPage() {
  const income = useFetch<IncomeStatement>("/api/books/income-statement", { gracefulEmpty: true });
  const balance = useFetch<BalanceSheet>("/api/books/balance-sheet", { gracefulEmpty: true });

  return (
    <div className="grid gap-6">
      <PageHeader title="Financial statements" description="Income statement and balance sheet from the ledger. Figures stay empty until books are posted." />
      {(income.loading || balance.loading) && <LoadingBlock />}
      {income.error ? <p className="text-sm text-destructive">{income.error}</p> : null}
      {balance.error ? <p className="text-sm text-destructive">{balance.error}</p> : null}
      {!income.data && !balance.data && !income.loading && !balance.loading ? (
        <EmptyState title="Statements not ready" description="The books API will fill these once journal activity exists." />
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income statement {income.data?.period ? `· ${income.data.period}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {income.data ? (
              <>
                <Section title={income.data.revenue.label} rows={income.data.revenue.rows} total={income.data.revenue.totalCentavos} />
                <Section title={income.data.expenses.label} rows={income.data.expenses.rows} total={income.data.expenses.totalCentavos} />
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Net income</span>
                  <span className="tabular-nums">{formatCentavos(income.data.netIncomeCentavos)}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No income statement data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance sheet {balance.data?.asOf ? `· ${balance.data.asOf}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {balance.data ? (
              <>
                <Section title={balance.data.assets.label} rows={balance.data.assets.rows} total={balance.data.assets.totalCentavos} />
                <Section title={balance.data.liabilities.label} rows={balance.data.liabilities.rows} total={balance.data.liabilities.totalCentavos} />
                <Section title={balance.data.equity.label} rows={balance.data.equity.rows} total={balance.data.equity.totalCentavos} />
              </>
            ) : (
              <p className="text-muted-foreground">No balance sheet data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { code?: string; name: string; amountCentavos: string }[];
  total: string;
}) {
  return (
    <div className="grid gap-1">
      <p className="font-medium">{title}</p>
      {rows.map((row, index) => (
        <div key={index} className="flex justify-between gap-3 text-muted-foreground">
          <span>
            {row.code ? `${row.code} ` : ""}
            {row.name}
          </span>
          <span className="tabular-nums text-foreground">{formatCentavos(row.amountCentavos)}</span>
        </div>
      ))}
      <div className="flex justify-between font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatCentavos(total)}</span>
      </div>
    </div>
  );
}
