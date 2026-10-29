import { Link } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import type { SalesInvoice } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Sales · Nines" }];
}

export default function SalesPage() {
  const { data, error, loading } = useFetch<{ invoices: SalesInvoice[] }>("/api/sales", {
    fallback: { invoices: [] },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Sales"
        description="Invoices and walk-in sales. Charge to account when the customer is allowed to run a tab."
        action={
          <Button asChild size="lg">
            <Link to="/sales/new">New sale</Link>
          </Button>
        }
      />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.invoices.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="Create your first invoice when you sell goods or services."
          action={
            <Button asChild>
              <Link to="/sales/new">New sale</Link>
            </Button>
          }
        />
      ) : null}
      <div className="grid gap-2">
        {data?.invoices.map((invoice) => (
          <Link
            key={invoice.id}
            to={`/sales/${invoice.id}`}
            className="flex flex-col gap-1 rounded-xl border bg-card/80 p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {invoice.number} · {invoice.buyerName || invoice.customerName || "Walk-in"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(invoice.businessDate)} · {invoice.paymentMethod}
                {invoice.isSeniorOrPwd ? " · SC/PWD" : ""}
              </p>
            </div>
            <p className="font-semibold tabular-nums">{formatCentavos(invoice.totalCentavos)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
