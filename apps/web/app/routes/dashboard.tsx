import { Fuel, HandCoins, ReceiptText, Wallet } from "lucide-react";
import { Link, useRouteLoaderData } from "react-router";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatPeso } from "~/lib/format";
import type { clientLoader as appLoader } from "./app-layout";

const TILES = [
  { label: "Sales today", value: 0, hint: "Close a shift to see today's sales", icon: Fuel },
  { label: "Cash on hand", value: 0, hint: "From shift remittances", icon: Wallet },
  { label: "Customers owe you", value: 0, hint: "Unpaid charge invoices", icon: HandCoins },
  { label: "You owe suppliers", value: 0, hint: "Unpaid bills due", icon: ReceiptText },
];

export default function Dashboard() {
  const data = useRouteLoaderData<typeof appLoader>("routes/app-layout");
  const firstName = data?.user.name.split(" ")[0];
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Magandang araw, ${firstName}`}
        description="Here's where your station stands today."
      >
        <Button asChild size="lg">
          <Link to="/sales">
            <Fuel /> Close a shift
          </Link>
        </Button>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="gap-3 px-5">
            <div className="flex items-center justify-between">
              <span className="label-mono">{label}</span>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="num text-[28px] leading-8 font-medium">{formatPeso(value)}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </Card>
        ))}
      </div>
    </>
  );
}
