import { useState } from "react";
import { Link } from "react-router";
import { describeBalance } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { CustomerSummary } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Receivables · Nines" }];
}

export default function ReceivablesPage() {
  const { data, error, loading, reload } = useFetch<{ outstandingCentavos: string; customers: CustomerSummary[] }>("/api/customers");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: body.get("name"), phone: body.get("phone"), notes: body.get("notes") }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not add the customer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Receivables"
        description="Customers who take fuel on account. Credit from a shift shows up here, and you record payments when they pay."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add a customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <FormError message={formError} />
            </div>
            <Field label="Name" htmlFor="customer-name">
              <Input id="customer-name" name="name" required placeholder="Mang Juan Transport" />
            </Field>
            <Field label="Phone" htmlFor="customer-phone">
              <Input id="customer-phone" name="phone" placeholder="09xx xxx xxxx" />
            </Field>
            <Field label="Note" htmlFor="customer-notes">
              <Input id="customer-notes" name="notes" placeholder="Pays every Friday" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add customer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.customers.length === 0 ? (
        <EmptyState title="No credit customers yet" description="Add a customer when someone takes fuel on account." />
      ) : null}
      <div className="grid gap-2">
        {data?.customers.map((customer) => (
          <Link key={customer.id} to={`/receivables/${customer.id}`} className="flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{customer.phone || "No phone"}</p>
            </div>
            <p className="font-medium">{describeBalance(customer.balanceCentavos, "receivable")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
