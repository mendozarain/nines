import { Link, useParams } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { SalesInvoice } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Invoice · Nines" }];
}

export default function SalesDetailPage() {
  const { id } = useParams();
  const { data, error, loading } = useFetch<SalesInvoice>(id ? `/api/sales/${id}` : null);

  if (loading) return <LoadingBlock />;
  if (error || !data) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-destructive">{error || "Invoice not found."}</p>
        <Button asChild variant="outline">
          <Link to="/sales">Back to sales</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Invoice ${data.number}`}
        description={`${formatDate(data.businessDate)} · ${data.paymentMethod}`}
        action={
          <div className="flex gap-2 print-hide">
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Print
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales">All sales</Link>
            </Button>
          </div>
        }
      />
      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle className="font-display">{data.buyerName || data.customerName || "Walk-in customer"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {[data.buyerTin, data.buyerAddress].filter(Boolean).join(" · ") || "No buyer TIN / address on file"}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Unit</th>
                  <th className="py-2 pr-3 font-medium text-right">Price</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line, index) => (
                  <tr key={line.id ?? index} className="border-b border-border/60">
                    <td className="py-2 pr-3">{line.description}</td>
                    <td className="py-2 pr-3 tabular-nums">{(Number(line.qtyScaled) / 100).toFixed(2)}</td>
                    <td className="py-2 pr-3">{line.unit}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCentavos(line.unitPriceCentavos)}</td>
                    <td className="py-2 text-right tabular-nums">{formatCentavos(line.amountCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto grid w-full max-w-xs gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross</span>
              <span className="tabular-nums">{formatCentavos(data.grossCentavos)}</span>
            </div>
            {data.scPwdDiscountCentavos !== "0" ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SC/PWD discount</span>
                <span className="tabular-nums">-{formatCentavos(data.scPwdDiscountCentavos)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <span className="tabular-nums">{formatCentavos(data.vatCentavos)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCentavos(data.totalCentavos)}</span>
            </div>
          </div>
          {data.note ? <p className="text-sm text-muted-foreground">Note: {data.note}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
