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
      <div className="nines-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data?.accounts.map((account) => (
              <tr key={account.code} className="border-b border-border/50">
                <td className="px-4 py-2 tabular-nums text-muted-foreground">{account.code}</td>
                <td className="px-4 py-2">{account.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{account.type}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {account.balanceCentavos != null ? formatCentavos(account.balanceCentavos) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
