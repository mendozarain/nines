import { useState } from "react";
import { useOutletContext } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { FixedAsset, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Fixed assets · Nines" }];
}

export default function BooksAssetsPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<{ assets: FixedAsset[] }>("/api/assets", { fallback: { assets: [] } });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/assets", {
        method: "POST",
        body: JSON.stringify({
          name: body.get("name"),
          acquiredDate: body.get("acquiredDate"),
          cost: body.get("cost"),
          usefulLifeMonths: Number(body.get("usefulLifeMonths") || 0),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the asset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Fixed assets" description="Equipment and property. Depreciation postings can be added once the books API is live." />
      <Card>
        <CardHeader>
          <CardTitle>Add an asset</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <FormError message={formError} />
            </div>
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" required placeholder="Compressor / computer" />
            </Field>
            <Field label="Acquired" htmlFor="acquired">
              <Input id="acquired" name="acquiredDate" type="date" defaultValue={me.today} required />
            </Field>
            <Field label="Cost" htmlFor="cost">
              <Input id="cost" name="cost" inputMode="decimal" required />
            </Field>
            <Field label="Useful life (months)" htmlFor="life">
              <Input id="life" name="usefulLifeMonths" inputMode="numeric" defaultValue={60} />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" name="note" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add asset"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.assets.length === 0 ? <EmptyState title="No fixed assets yet" description="Add equipment when you capitalize a purchase." /> : null}
      <div className="grid gap-2">
        {data?.assets.map((asset) => (
          <div key={asset.id} className="rounded-xl border bg-card/80 p-4 sm:flex sm:justify-between">
            <div>
              <p className="font-medium">{asset.name}</p>
              <p className="text-sm text-muted-foreground">
                Acquired {formatDate(asset.acquiredDate)} · {asset.usefulLifeMonths} months
              </p>
            </div>
            <p className="font-semibold tabular-nums">{formatCentavos(asset.costCentavos)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
