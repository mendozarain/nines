import { useState } from "react";
import { formatDate, formatLitres } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { FuelDelivery, Me, Tank } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";
import { useOutletContext } from "react-router";

export function meta() {
  return [{ title: "Fuel deliveries · Nines" }];
}

export default function FuelDeliveriesPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<{ deliveries: FuelDelivery[] }>("/api/fuel/deliveries", {
    fallback: { deliveries: [] },
  });
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
      await api("/api/fuel/deliveries", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          tankId: body.get("tankId"),
          invoiceReference: body.get("invoiceReference"),
          drLitres: body.get("drLitres"),
          measuredLitres: body.get("measuredLitres"),
          unitCostPerLitre: body.get("unitCostPerLitre"),
          freight: body.get("freight"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the delivery.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Fuel deliveries" description="Record supplier drops against a tank. Keep the DR and measured litres for variance checks." />
      <Card>
        <CardHeader>
          <CardTitle>Record a delivery</CardTitle>
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
            <Field label="Invoice / DR ref" htmlFor="ref">
              <Input id="ref" name="invoiceReference" />
            </Field>
            <Field label="DR litres" htmlFor="dr">
              <Input id="dr" name="drLitres" inputMode="decimal" required />
            </Field>
            <Field label="Measured litres" htmlFor="measured">
              <Input id="measured" name="measuredLitres" inputMode="decimal" required />
            </Field>
            <Field label="Unit cost / litre" htmlFor="cost">
              <Input id="cost" name="unitCostPerLitre" inputMode="decimal" required />
            </Field>
            <Field label="Freight (₱)" htmlFor="freight">
              <Input id="freight" name="freight" inputMode="decimal" placeholder="0.00" />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" name="note" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save delivery"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.deliveries.length === 0 ? (
        <EmptyState title="No deliveries yet" description="Log the next fuel drop when the truck arrives." />
      ) : null}
      <div className="grid gap-2">
        {data?.deliveries.map((delivery) => (
          <div key={delivery.id} className="rounded-xl border bg-card/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {formatDate(delivery.businessDate)} · {delivery.tankName || delivery.tankId}
              </p>
              <p className="text-sm tabular-nums">{formatLitres(delivery.measuredLitresCentilitres)} L measured</p>
            </div>
            <p className="text-sm text-muted-foreground">
              DR {formatLitres(delivery.drLitresCentilitres)} L
              {delivery.invoiceReference ? ` · ${delivery.invoiceReference}` : ""}
              {delivery.note ? ` · ${delivery.note}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
