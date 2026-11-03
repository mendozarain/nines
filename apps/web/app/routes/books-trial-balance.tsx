import { formatCentavos } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import type { TrialBalanceRow } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Trial balance · Nines" }];
}

export default function BooksTrialBalancePage() {
  const { data, error, loading } = useFetch<{ rows: TrialBalanceRow[]; asOf?: string }>("/api/books/trial-balance", {
    fallback: { rows: [] },
  });

  const debitTotal =
    data?.rows.reduce((sum, row) => sum + BigInt(row.debitCentavos || "0"), 0n) ?? 0n;
  const creditTotal =
    data?.rows.reduce((sum, row) => sum + BigInt(row.creditCentavos || "0"), 0n) ?? 0n;

  return (
    <div className="grid gap-6">
      <PageHeader title="Trial balance" description="Debits and credits by account. Totals should match when the books are in balance." />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.rows.length === 0 ? (
        <EmptyState title="Nothing to show yet" description="Once journal activity exists, balances appear here." />
      ) : null}
      {data && data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 text-right font-medium">Debit</th>
                <th className="px-3 py-2 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.code} className="border-b border-border/70">
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{row.code}</td>
                  <td className="px-3 py-2.5">{row.name}</td>
                  <td className="px-3 py-2.5 text-right font-money">
                    {row.debitCentavos === "0" ? "" : formatCentavos(row.debitCentavos)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-money">
                    {row.creditCentavos === "0" ? "" : formatCentavos(row.creditCentavos)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2.5" colSpan={2}>
                  Totals
                </td>
                <td className="px-3 py-2.5 text-right font-money">{formatCentavos(debitTotal.toString())}</td>
                <td className="px-3 py-2.5 text-right font-money">{formatCentavos(creditTotal.toString())}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
