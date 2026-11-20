import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { describeBalance, formatDate } from "@nines/shared";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { Field, FormError } from "~/components/field";
import { DataTable, LoadingBlock, Money, PageHeader, Td, Th } from "~/components/page";
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
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Balance</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight font-money">
            {describeBalance(data.balanceCentavos, "payable")}
          </p>
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
        <h2 className="text-sm font-semibold tracking-tight">Bills</h2>
        {data.bills.length === 0 ? <p className="text-sm text-muted-foreground">No bills yet.</p> : null}
        {data.bills.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
                <Th align="right">{""}</Th>
              </tr>
            </thead>
            <tbody>
              {data.bills.map((bill) => (
                <tr key={bill.id}>
                  <Td>
                    <span className="font-medium">{bill.reference || "Bill"}</span>
                    {bill.note ? <p className="text-xs text-muted-foreground">{bill.note}</p> : null}
                  </Td>
                  <Td className="text-muted-foreground">
                    {formatDate(bill.businessDate)}
                    {bill.dueDate ? ` · due ${formatDate(bill.dueDate)}` : ""}
                  </Td>
                  <Td align="right">
                    <Money value={bill.amountCentavos} />
                  </Td>
                  <Td align="right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTarget({ kind: "bill", id: bill.id })}>
                      Delete
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Payments</h2>
        {data.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : null}
        {data.payments.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Note</Th>
                <Th align="right">Amount</Th>
                <Th align="right">{""}</Th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <Td className="text-muted-foreground">{formatDate(payment.businessDate)}</Td>
                  <Td className="text-muted-foreground">{payment.note || "Payment"}</Td>
                  <Td align="right">
                    <Money value={payment.amountCentavos} />
                  </Td>
                  <Td align="right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTarget({ kind: "payment", id: payment.id })}>
                      Delete
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
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
