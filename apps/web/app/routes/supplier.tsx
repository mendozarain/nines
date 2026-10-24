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
import type { Me, SupplierDetail } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Supplier · Nines" }];
}

export default function SupplierPage() {
  const { id } = useParams();
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<SupplierDetail>(id ? `/api/suppliers/${id}` : null);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState<{ kind: "bill" | "payment"; id: string } | null>(null);

  async function addBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api(`/api/suppliers/${data.id}/bills`, {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          dueDate: body.get("dueDate"),
          amount: body.get("amount"),
          reference: body.get("reference"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the bill.");
    } finally {
      setPending(false);
    }
  }

  async function addPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api(`/api/suppliers/${data.id}/payments`, {
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
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the payment.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !data) return <p className="text-sm text-destructive">{error || "Supplier not found."}</p>;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={data.name}
        description={[data.tin, data.notes].filter(Boolean).join(" · ") || "Supplier"}
        action={
          <Button asChild variant="outline">
            <Link to="/payables">All suppliers</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-3xl font-semibold">{describeBalance(data.balanceCentavos, "payable")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Billed <Money value={data.billsCentavos} /> · Paid <Money value={data.paymentsCentavos} />
          </p>
        </CardContent>
      </Card>
      <FormError message={formError} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add a bill</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={addBill}>
              <Field label="Bill date" htmlFor="bill-date">
                <Input id="bill-date" name="businessDate" type="date" defaultValue={me.today} required />
              </Field>
              <Field label="Due date" htmlFor="bill-due" hint="Optional.">
                <Input id="bill-due" name="dueDate" type="date" />
              </Field>
              <Field label="Amount" htmlFor="bill-amount">
                <Input id="bill-amount" name="amount" inputMode="decimal" required placeholder="0.00" />
              </Field>
              <Field label="Reference" htmlFor="bill-ref" hint="Delivery receipt or invoice number.">
                <Input id="bill-ref" name="reference" placeholder="DR-10442" />
              </Field>
              <Field label="Note" htmlFor="bill-note">
                <Input id="bill-note" name="note" />
              </Field>
              <Button type="submit" disabled={pending}>
                Save bill
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Record a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={addPayment}>
              <Field label="Date" htmlFor="supplier-pay-date">
                <Input id="supplier-pay-date" name="businessDate" type="date" defaultValue={me.today} required />
              </Field>
              <Field label="Amount paid" htmlFor="supplier-pay-amount">
                <Input id="supplier-pay-amount" name="amount" inputMode="decimal" required placeholder="0.00" />
              </Field>
              <Field label="Note" htmlFor="supplier-pay-note">
                <Input id="supplier-pay-note" name="note" placeholder="BPI transfer" />
              </Field>
              <Button type="submit" variant="outline" disabled={pending}>
                Save payment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <section className="grid gap-2">
        <h2 className="font-medium">Bills</h2>
        {data.bills.length === 0 ? <p className="text-sm text-muted-foreground">No bills yet.</p> : null}
        {data.bills.map((bill) => (
          <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="font-medium">{bill.reference || "Bill"}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(bill.businessDate)}
                {bill.dueDate ? ` · due ${formatDate(bill.dueDate)}` : ""}
                {bill.note ? ` · ${bill.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Money value={bill.amountCentavos} className="font-semibold" />
              <Button type="button" variant="ghost" onClick={() => setTarget({ kind: "bill", id: bill.id })}>
                Delete
              </Button>
            </div>
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
              <Button type="button" variant="ghost" onClick={() => setTarget({ kind: "payment", id: payment.id })}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
      <ConfirmDialog
        open={Boolean(target)}
        title={target?.kind === "bill" ? "Delete this bill?" : "Delete this payment?"}
        description={
          target?.kind === "bill"
            ? "The bill is removed from what you owe. Payments you already recorded stay on the supplier."
            : "The supplier’s balance will go back up."
        }
        confirmLabel={target?.kind === "bill" ? "Delete bill" : "Delete payment"}
        onConfirm={async () => {
          if (!target) return;
          const path = target.kind === "bill" ? `/api/suppliers/${data.id}/bills/${target.id}` : `/api/suppliers/${data.id}/payments/${target.id}`;
          await api(path, { method: "DELETE" });
          setTarget(null);
          await reload();
        }}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      />
    </div>
  );
}
