import { useState } from "react";
import { TAX_TREATMENT_LABELS, TAX_TREATMENTS, formatCentavos } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { CatalogItem } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Items · Nines" }];
}

export default function ItemsPage() {
  const { data, error, loading, reload } = useFetch<{ items: CatalogItem[] }>("/api/items", { fallback: { items: [] } });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/items", {
        method: "POST",
        body: JSON.stringify({
          name: body.get("name"),
          unit: body.get("unit"),
          price: body.get("price"),
          taxType: body.get("taxType"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not add the item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Items" description="Products and services you sell on invoices." />
      <Card>
        <CardHeader>
          <CardTitle>Add an item</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={onSubmit}>
            <div className="sm:col-span-2 lg:col-span-5">
              <FormError message={formError} />
            </div>
            <Field label="Name" htmlFor="item-name">
              <Input id="item-name" name="name" required placeholder="Labor / SKU name" />
            </Field>
            <Field label="Unit" htmlFor="unit">
              <Input id="unit" name="unit" defaultValue="pc" />
            </Field>
            <Field label="Price" htmlFor="price">
              <Input id="price" name="price" inputMode="decimal" required placeholder="0.00" />
            </Field>
            <Field label="Tax type" htmlFor="taxType">
              <NativeSelect id="taxType" name="taxType" defaultValue="VATABLE">
                {TAX_TREATMENTS.map((treatment) => (
                  <option key={treatment} value={treatment}>
                    {TAX_TREATMENT_LABELS[treatment]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.items.length === 0 ? (
        <EmptyState title="No items yet" description="Add products or services so cashiers can pick them on a sale." />
      ) : null}
      <div className="grid gap-2">
        {data?.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 nines-row sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.unit} · {TAX_TREATMENT_LABELS[item.taxType as keyof typeof TAX_TREATMENT_LABELS] ?? item.taxType}
                {item.active === false ? " · Inactive" : ""}
              </p>
            </div>
            <p className="font-semibold tabular-nums">{formatCentavos(item.priceCentavos)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
