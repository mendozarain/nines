import { useState } from "react";
import { Link } from "react-router";
import { describeBalance } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { DataTable, EmptyState, LoadingBlock, PageHeader, Td, Th } from "~/components/page";
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
      {data && data.suppliers.length > 0 ? (
        <DataTable>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>TIN</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {data.suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-muted/30">
                <Td>
                  <Link to={`/payables/${supplier.id}`} className="font-medium hover:underline">
                    {supplier.name}
                  </Link>
                </Td>
                <Td className="text-muted-foreground">{supplier.tin || "—"}</Td>
                <Td align="right">{describeBalance(supplier.balanceCentavos, "payable")}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : null}
    </div>
  );
}
