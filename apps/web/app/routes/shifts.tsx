import { Link } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { DataTable, EmptyState, LoadingBlock, OverShort, PageHeader, Td, Th } from "~/components/page";
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
          <DataTable>
            <thead>
              <tr>
                <Th>Shift</Th>
                <Th>Pumps</Th>
                <Th align="right">Expected</Th>
                <Th align="right">Over / short</Th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-muted/30">
                  <Td>
                    <Link to={`/shifts/${shift.id}`} className="inline-flex items-center gap-2 hover:underline">
                      <Badge>{shift.name}</Badge>
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{shift.readings.length}</Td>
                  <Td align="right">{formatCentavos(shift.expectedCentavos)}</Td>
                  <Td align="right">
                    <OverShort value={shift.overShortCentavos} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </section>
      ))}
    </div>
  );
}
