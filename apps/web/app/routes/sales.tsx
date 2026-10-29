import { Link } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { EmptyState, EntityCell, LoadingBlock, PageHeader } from "~/components/page";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { SalesInvoice } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Invoices · Nines" }];
}

function paymentStatus(method: string): { label: string; variant: "success" | "warning" | "neutral" } {
  const value = method.toUpperCase();
  if (value === "CASH" || value === "CARD") return { label: "Paid", variant: "success" };
  if (value === "CHARGE" || value === "CREDIT") return { label: "Not paid", variant: "warning" };
  return { label: method, variant: "neutral" };
}

export default function SalesPage() {
  const { data, error, loading } = useFetch<{ invoices: SalesInvoice[] }>("/api/sales", {
    fallback: { invoices: [] },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Invoices"
        description="Sales invoices and walk-in tickets."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/reports">Export</Link>
            </Button>
            <Button asChild>
              <Link to="/sales/new">Create invoice</Link>
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-5 border-b border-border">
        <span className="relative -mb-px pb-3 text-[14px] font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary">
          Invoices
        </span>
        <Link to="/sales/new" className="pb-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
          New sale
        </Link>
        <Link to="/customers" className="pb-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
          Customers
        </Link>
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice when you sell goods or services."
          action={
            <Button asChild>
              <Link to="/sales/new">Create invoice</Link>
            </Button>
          }
        />
      ) : null}

      {data && data.invoices.length > 0 ? (
        <div className="nines-panel overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="nines-table-head w-10" />
                <th className="nines-table-head">Invoice</th>
                <th className="nines-table-head">Customer</th>
                <th className="nines-table-head">Status</th>
                <th className="nines-table-head text-right">Amount</th>
                <th className="nines-table-head">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((invoice) => {
                const customer = invoice.buyerName || invoice.customerName || "Walk-in";
                const status = paymentStatus(String(invoice.paymentMethod));
                return (
                  <tr key={invoice.id} className="nines-row border-b border-border last:border-0">
                    <td className="nines-table-cell">
                      <span className="inline-block h-4 w-4 rounded border border-border" aria-hidden />
                    </td>
                    <td className="nines-table-cell">
                      <Link to={`/sales/${invoice.id}`} className="font-semibold text-foreground hover:text-primary">
                        {invoice.number}
                      </Link>
                    </td>
                    <td className="nines-table-cell">
                      <Link to={`/sales/${invoice.id}`} className="flex items-center gap-3">
                        <Avatar name={customer} size="sm" />
                        <EntityCell
                          name={customer}
                          subtitle={invoice.isSeniorOrPwd ? "SC/PWD" : String(invoice.paymentMethod)}
                        />
                      </Link>
                    </td>
                    <td className="nines-table-cell">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className={cn("nines-table-cell text-right font-semibold tabular-nums")}>
                      {formatCentavos(invoice.totalCentavos)}
                    </td>
                    <td className="nines-table-cell text-muted-foreground">{formatDate(invoice.businessDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
