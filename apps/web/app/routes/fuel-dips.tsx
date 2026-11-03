import { useState } from "react";
import { useOutletContext } from "react-router";
import { formatDate, formatLitres } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { DataTable, EmptyState, LoadingBlock, PageHeader, Td, Th } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { Me, Tank, TankDip } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Tank dips · Nines" }];
}

export default function FuelDipsPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<{ dips: TankDip[] }>("/api/fuel/dips", { fallback: { dips: [] } });
  const tanks = useFetch<{ tanks: Tank[] }>("/api/fuel/tanks", { fallback: { tanks: [] } });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/fuel/dips", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          tankId: body.get("tankId"),
          openingLitres: body.get("openingLitres"),
          deliveriesLitres: body.get("deliveriesLitres"),
          salesLitres: body.get("salesLitres"),
          physicalLitres: body.get("physicalLitres"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the dip.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Tank dips" description="Physical stick readings versus book litres. Investigate shortages before they become a pattern." />
      <Card>
        <CardHeader>
          <CardTitle>Record a dip</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <div className="sm:col-span-2 lg:col-span-3">
              <FormError message={formError} />
            </div>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="businessDate" type="date" defaultValue={me.today} required />
            </Field>
            <Field label="Tank" htmlFor="tankId">
              <NativeSelect id="tankId" name="tankId" required defaultValue="">
                <option value="" disabled>
                  Choose tank
                </option>
                {tanks.data?.tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Opening litres" htmlFor="opening">
              <Input id="opening" name="openingLitres" inputMode="decimal" required />
            </Field>
            <Field label="Deliveries litres" htmlFor="deliveries">
              <Input id="deliveries" name="deliveriesLitres" inputMode="decimal" defaultValue="0" />
            </Field>
            <Field label="Sales litres" htmlFor="sales">
              <Input id="sales" name="salesLitres" inputMode="decimal" defaultValue="0" />
            </Field>
            <Field label="Physical litres" htmlFor="physical">
              <Input id="physical" name="physicalLitres" inputMode="decimal" required />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" name="note" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save dip"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.dips.length === 0 ? <EmptyState title="No dips yet" description="Record a stick reading after the shift or delivery." /> : null}
      {data && data.dips.length > 0 ? (
        <DataTable>
          <thead>
            <tr>
              <Th>Date / tank</Th>
              <Th align="right">Book</Th>
              <Th align="right">Physical</Th>
              <Th align="right">Variance</Th>
            </tr>
          </thead>
          <tbody>
            {data.dips.map((dip) => {
              const variance = BigInt(dip.physicalCentilitres) - BigInt(dip.bookClosingCentilitres);
              return (
                <tr key={dip.id}>
                  <Td>
                    <span className="font-medium">
                      {formatDate(dip.businessDate)} · {dip.tankName || dip.tankId}
                    </span>
                    {dip.note ? <p className="text-xs text-muted-foreground">{dip.note}</p> : null}
                  </Td>
                  <Td className="text-right tabular-nums">{formatLitres(dip.bookClosingCentilitres)} L</Td>
                  <Td className="text-right tabular-nums">{formatLitres(dip.physicalCentilitres)} L</Td>
                  <Td className={variance < 0n ? "text-right tabular-nums text-destructive" : "text-right tabular-nums"}>
                    {formatLitres(variance.toString())} L
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : null}
    </div>
  );
}
