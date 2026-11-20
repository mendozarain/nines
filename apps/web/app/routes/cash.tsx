import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { describeOverShort, formatCentavos, formatDate } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { DataTable, EmptyState, LoadingBlock, PageHeader, Td, Th } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { CashReconciliation, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Cash · Nines" }];
}

export default function CashPage() {
  const me = useOutletContext<Me>();
  const fuel = me.station?.fuelModuleEnabled !== false && (me.station?.fuelModuleEnabled === true || me.station?.industry === "FUEL_STATION" || me.station?.industry == null);
  const { data, error, loading, reload } = useFetch<{ reconciliations: CashReconciliation[] }>("/api/cash", {
    fallback: { reconciliations: [] },
  });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/cash", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          shiftName: body.get("shiftName"),
          cashier: body.get("cashier"),
          openingFloat: body.get("openingFloat"),
          cashSales: body.get("cashSales"),
          countedCash: body.get("countedCash"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the reconciliation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Cash reconciliation"
        description="Count the drawer at the end of the day (or shift). Over/short should match what you expect from cash sales."
        action={
          fuel ? (
            <Button asChild variant="outline">
              <Link to="/shifts/new">Record a shift</Link>
            </Button>
          ) : null
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Close the drawer</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <div className="sm:col-span-2 lg:col-span-3">
              <FormError message={formError} />
            </div>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="businessDate" type="date" defaultValue={me.today} required />
            </Field>
            <Field label="Shift / period name" htmlFor="shiftName">
              <Input id="shiftName" name="shiftName" placeholder="Day / Morning" />
            </Field>
            <Field label="Cashier" htmlFor="cashier">
              <Input id="cashier" name="cashier" />
            </Field>
            <Field label="Opening float" htmlFor="float">
              <Input id="float" name="openingFloat" inputMode="decimal" defaultValue="0.00" />
            </Field>
            <Field label="Cash sales (expected)" htmlFor="sales">
              <Input id="sales" name="cashSales" inputMode="decimal" required />
            </Field>
            <Field label="Counted cash" htmlFor="counted">
              <Input id="counted" name="countedCash" inputMode="decimal" required />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" name="note" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save reconciliation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.reconciliations.length === 0 ? (
        <EmptyState title="No reconciliations yet" description="When you close the day, count the cash and save it here." />
      ) : null}
      {data && data.reconciliations.length > 0 ? (
        <DataTable>
          <thead>
            <tr>
              <Th>Date / period</Th>
              <Th>Cashier</Th>
              <Th align="right">Cash sales</Th>
              <Th align="right">Over / short</Th>
            </tr>
          </thead>
          <tbody>
            {data.reconciliations.map((row) => (
              <tr key={row.id}>
                <Td>
                  <span className="font-medium">
                    {formatDate(row.businessDate)} · {row.shiftName || "Day"}
                  </span>
                </Td>
                <Td className="text-muted-foreground">{row.cashier || "Cashier"}</Td>
                <Td align="right">{formatCentavos(row.cashSalesCentavos)}</Td>
                <Td align="right">
                  {row.overShortCentavos != null ? describeOverShort(row.overShortCentavos).label : "Saved"}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : null}
    </div>
  );
}
