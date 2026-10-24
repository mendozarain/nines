import { useState } from "react";
import { Link } from "react-router";
import { describeBalance } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { SupplierSummary } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Payables · Nines" }];
}

export default function PayablesPage() {
  const { data, error, loading, reload } = useFetch<{ outstandingCentavos: string; suppliers: SupplierSummary[] }>("/api/suppliers");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/suppliers", {
        method: "POST",
        body: JSON.stringify({ name: body.get("name"), tin: body.get("tin"), notes: body.get("notes") }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not add the supplier.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Payables" description="Fuel suppliers and other bills. Record the bill when it arrives, then the payment when you pay it." />
      <Card>
        <CardHeader>
          <CardTitle>Add a supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <FormError message={formError} />
            </div>
            <Field label="Name" htmlFor="supplier-name">
              <Input id="supplier-name" name="name" required placeholder="Pacific Fuel Supply" />
            </Field>
            <Field label="TIN" htmlFor="supplier-tin" hint="Optional.">
              <Input id="supplier-tin" name="tin" placeholder="123-456-789-000" />
            </Field>
            <Field label="Note" htmlFor="supplier-notes">
              <Input id="supplier-notes" name="notes" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add supplier"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.suppliers.length === 0 ? (
        <EmptyState title="No suppliers yet" description="Add your fuel supplier to track deliveries and what you still owe." />
      ) : null}
      <div className="grid gap-2">
        {data?.suppliers.map((supplier) => (
          <Link key={supplier.id} to={`/payables/${supplier.id}`} className="flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{supplier.name}</p>
              <p className="text-sm text-muted-foreground">{supplier.tin || "No TIN"}</p>
            </div>
            <p className="font-medium">{describeBalance(supplier.balanceCentavos, "payable")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
