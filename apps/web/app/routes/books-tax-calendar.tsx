import { TAX_CALENDAR_ITEMS } from "@nines/shared";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import type { Me, TaxCalendarItem } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";
import { useOutletContext } from "react-router";

export function meta() {
  return [{ title: "Tax calendar · Nines" }];
}

export default function BooksTaxCalendarPage() {
  const me = useOutletContext<Me>();
  const fuel = me.station?.fuelModuleEnabled === true || me.station?.industry === "FUEL_STATION";
  const { data, error, loading } = useFetch<{ items: TaxCalendarItem[] }>("/api/books/tax-calendar", {
    fallback: {
      items: TAX_CALENDAR_ITEMS.filter((item) => fuel || item.area !== "Fuel-specific records").map((item) => ({ ...item })),
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tax & compliance calendar"
        description="A plain-language checklist — not legal advice. Confirm current BIR schedules with your accountant."
      />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.items.length === 0 ? <EmptyState title="No calendar items" description="Tax calendar items will appear here." /> : null}
      <div className="grid gap-2">
        {data?.items.map((item) => (
          <div key={item.area} className="nines-row">
            <p className="font-medium">{item.area}</p>
            <p className="mt-1 text-sm">{item.record}</p>
            <p className="mt-1 text-sm text-muted-foreground">When: {item.frequency}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.caution}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
