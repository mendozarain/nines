import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { api } from "~/lib/api";
import type { Route } from "./+types/accounts";

type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
};

const TYPE_LABEL: Record<LedgerAccount["type"], string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
};

export const meta: Route.MetaFunction = () => [{ title: "Chart of accounts · Nines" }];

export async function clientLoader() {
  return { accounts: await api<LedgerAccount[]>("/accounts") };
}

export default function Accounts({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Chart of accounts"
        description="Every sale, payment and bill lands in one of these accounts. You don't need to pick them yourself; Nines does it for you."
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="w-32">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="num text-subtle-foreground">{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>
                  <Badge>{TYPE_LABEL[a.type]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
