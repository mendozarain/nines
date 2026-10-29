import { useState } from "react";
import { formatLitres } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { Product, Tank } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Tanks · Nines" }];
}

export default function FuelTanksPage() {
  const { data, error, loading, reload } = useFetch<{ tanks: Tank[]; products?: Product[] }>("/api/fuel/tanks", {
    fallback: { tanks: [], products: [] },
  });
  const station = useFetch<{ products: Product[] }>("/api/station", { gracefulEmpty: true });
  const products = data?.products ?? station.data?.products ?? [];
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/fuel/tanks", {
        method: "POST",
        body: JSON.stringify({
          name: body.get("name"),
          productId: body.get("productId"),
          capacityLitres: body.get("capacityLitres"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not add the tank.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Tanks" description="Underground or above-ground fuel storage. Book litres update from deliveries, sales, and dips." />
      <Card>
        <CardHeader>
          <CardTitle>Add a tank</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={onSubmit}>
            <div className="sm:col-span-4">
              <FormError message={formError} />
            </div>
            <Field label="Name" htmlFor="tank-name">
              <Input id="tank-name" name="name" required placeholder="Tank 1 Diesel" />
            </Field>
            <Field label="Fuel" htmlFor="productId">
              <NativeSelect id="productId" name="productId" required defaultValue="">
                <option value="" disabled>
                  Choose fuel
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Capacity (litres)" htmlFor="capacity">
              <Input id="capacity" name="capacityLitres" inputMode="decimal" placeholder="20000" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add tank"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.tanks.length === 0 ? <EmptyState title="No tanks yet" description="Add a tank for each fuel storage vessel on site." /> : null}
      <div className="grid gap-2">
        {data?.tanks.map((tank) => (
          <div key={tank.id} className="rounded-xl border bg-card/80 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{tank.name}</p>
              <p className="text-sm text-muted-foreground">{tank.productName || tank.productId}</p>
            </div>
            <p className="text-sm tabular-nums">
              Book {formatLitres(tank.bookCentilitres)} L
              {tank.capacityCentilitres !== "0" ? ` / ${formatLitres(tank.capacityCentilitres)} L` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
