import { Link } from "react-router";
import { formatDate } from "@nines/shared";
import { EmptyState, LoadingBlock, Money, OverShort, PageHeader } from "~/components/page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useFetch } from "~/lib/use-fetch";
import type { Shift } from "~/lib/types";

export function meta() {
  return [{ title: "Shifts · Nines" }];
}

export default function ShiftsPage() {
  const { data, error, loading } = useFetch<Shift[]>("/api/shifts");
  const groups = new Map<string, Shift[]>();
  for (const shift of data ?? []) {
    const list = groups.get(shift.businessDate) ?? [];
    list.push(shift);
    groups.set(shift.businessDate, list);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Shifts"
        description="Enter opening and closing meter readings when a cashier closes. Nines works out the litres, the amount, and whether the cash is over or short."
        action={
          <Button asChild>
            <Link to="/shifts/new">Record a shift</Link>
          </Button>
        }
      />
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No shifts yet"
          description="When a cashier closes a shift, record the pump meters here."
          action={
            <Button asChild>
              <Link to="/shifts/new">Record a shift</Link>
            </Button>
          }
        />
      ) : null}
      {[...groups.entries()].map(([date, shifts]) => (
        <section key={date} className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{formatDate(date)}</h2>
          <div className="grid gap-2">
            {shifts.map((shift) => (
              <Link key={shift.id} to={`/shifts/${shift.id}`} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{shift.name}</Badge>
                  <span className="text-sm text-muted-foreground">{shift.readings.length} pumps</span>
                </div>
                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <Money value={shift.expectedCentavos} className="text-lg font-semibold" />
                  <OverShort value={shift.overShortCentavos} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
