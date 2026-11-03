import { Link, useOutletContext } from "react-router";
import { CORE_CHART_OF_ACCOUNTS, FUEL_CHART_OF_ACCOUNTS, formatCentavos } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import type { LedgerAccount, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Books · Nines" }];
}

export default function BooksPage() {
  const me = useOutletContext<Me>();
  const fuel = me.station?.fuelModuleEnabled === true || me.station?.industry === "FUEL_STATION";
  const { data, error, loading } = useFetch<{ accounts: LedgerAccount[] }>("/api/books/accounts", {
    fallback: {
      accounts: [
        ...CORE_CHART_OF_ACCOUNTS,
        ...(fuel ? FUEL_CHART_OF_ACCOUNTS : []),
      ].map((account) => ({
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        classification: account.classification,
        balanceCentavos: "0",
      })),
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Chart of accounts"
        description="Your Philippine small-business ledger. Fuel accounts appear when the fuel module is on."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/books/journal">Journal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/books/trial-balance">Trial balance</Link>
            </Button>
            <Button asChild>
              <Link to="/books/statements">Statements</Link>
            </Button>
          </div>
        }
      />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" description="Accounts are created when you finish setup." />
      ) : null}
      {data && data.accounts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((account) => (
                <tr key={account.code} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{account.code}</td>
                  <td className="px-3 py-2.5">{account.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{account.type}</td>
                  <td className="px-3 py-2.5 text-right font-money">
                    {account.balanceCentavos != null ? formatCentavos(account.balanceCentavos) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
