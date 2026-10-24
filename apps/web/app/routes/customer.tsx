import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { describeBalance, formatDate } from "@nines/shared";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { Field, FormError } from "~/components/field";
import { LoadingBlock, Money, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { CustomerDetail, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Customer · Nines" }];
}

export default function CustomerPage() {
  const { id } = useParams();
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<CustomerDetail>(id ? `/api/customers/${id}` : null);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deletePayment, setDeletePayment] = useState<string | null>(null);

  async function submit(path: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          amount: body.get("amount"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save that.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !data) return <p className="text-sm text-destructive">{error || "Customer not found."}</p>;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={data.name}
        description={[data.phone, data.notes].filter(Boolean).join(" · ") || "Credit customer"}
        action={
          <Button asChild variant="outline">
            <Link to="/receivables">All customers</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-3xl font-semibold">{describeBalance(data.balanceCentavos, "receivable")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Charged <Money value={data.chargesCentavos} /> · Paid <Money value={data.paymentsCentavos} />
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={(event) => submit(`/api/customers/${data.id}/payments`, event)}>
              <FormError message={formError} />
              <Field label="Date" htmlFor="pay-date">
                <Input id="pay-date" name="businessDate" type="date" defaultValue={me.today} required />
              </Field>
              <Field label="Amount received" htmlFor="pay-amount">
                <Input id="pay-amount" name="amount" inputMode="decimal" required placeholder="0.00" />
              </Field>
              <Field label="Note" htmlFor="pay-note">
                <Input id="pay-note" name="note" placeholder="Cash, check, transfer" />
              </Field>
              <Button type="submit" disabled={pending}>
                Save payment
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add a charge</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={(event) => submit(`/api/customers/${data.id}/charges`, event)}>
              <Field label="Date" htmlFor="charge-date">
                <Input id="charge-date" name="businessDate" type="date" defaultValue={me.today} required />
              </Field>
              <Field label="Amount" htmlFor="charge-amount" hint="Use this for a charge that did not come from a shift.">
                <Input id="charge-amount" name="amount" inputMode="decimal" required placeholder="0.00" />
              </Field>
              <Field label="Note" htmlFor="charge-note">
                <Input id="charge-note" name="note" />
              </Field>
              <Button type="submit" variant="outline" disabled={pending}>
                Add charge
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <section className="grid gap-2">
        <h2 className="font-medium">Charges</h2>
        {data.charges.length === 0 ? <p className="text-sm text-muted-foreground">No charges yet.</p> : null}
        {data.charges.map((charge) => (
          <div key={charge.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p>{formatDate(charge.businessDate)}</p>
              <Money value={charge.amountCentavos} className="font-semibold" />
            </div>
            <p className="text-sm text-muted-foreground">
              {charge.shiftId ? (
                <Link className="underline-offset-4 hover:underline" to={`/shifts/${charge.shiftId}`}>
                  From the {charge.shiftName} shift
                </Link>
              ) : (
                "Added by hand"
              )}
              {charge.note ? ` · ${charge.note}` : ""}
            </p>
          </div>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="font-medium">Payments</h2>
        {data.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : null}
        {data.payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p>{formatDate(payment.businessDate)}</p>
              <p className="text-sm text-muted-foreground">{payment.note || "Payment"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Money value={payment.amountCentavos} className="font-semibold" />
              <Button type="button" variant="ghost" onClick={() => setDeletePayment(payment.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
      <ConfirmDialog
        open={Boolean(deletePayment)}
        title="Delete this payment?"
        description="The customer’s balance will go back up."
        confirmLabel="Delete payment"
        onConfirm={async () => {
          if (!deletePayment) return;
          await api(`/api/customers/${data.id}/payments/${deletePayment}`, { method: "DELETE" });
          setDeletePayment(null);
          await reload();
        }}
        onOpenChange={(open) => {
          if (!open) setDeletePayment(null);
        }}
      />
    </div>
  );
}
