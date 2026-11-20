import { Link } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { DataTable, EmptyState, LoadingBlock, PageHeader, Td, Th } from "~/components/page";
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
          <Button asChild>
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
      {data && data.invoices.length > 0 ? (
        <DataTable>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Date</Th>
              <Th>Payment</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-muted/30">
                <Td>
                  <Link to={`/sales/${invoice.id}`} className="font-medium hover:underline">
                    {invoice.number} · {invoice.buyerName || invoice.customerName || "Walk-in"}
                  </Link>
                  {invoice.isSeniorOrPwd ? <p className="text-xs text-muted-foreground">SC/PWD</p> : null}
                </Td>
                <Td className="text-muted-foreground">{formatDate(invoice.businessDate)}</Td>
                <Td className="text-muted-foreground">{invoice.paymentMethod}</Td>
                <Td align="right">{formatCentavos(invoice.totalCentavos)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : null}
    </div>
  );
}
