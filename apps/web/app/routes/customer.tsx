import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { describeBalance, formatCentavos, formatDate } from "@nines/shared";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { Field, FormError } from "~/components/field";
import { DataTable, LoadingBlock, Money, PageHeader, Td, Th } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { CustomerDetail, CustomerStatement, Me } from "~/lib/types";
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
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [statementError, setStatementError] = useState("");

  async function submit(path: string, event: React.FormEvent<HTMLFormElement>, extra: Record<string, unknown> = {}) {
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
          ...extra,
          ...(body.get("withholding") ? { withholding: body.get("withholding") } : {}),
          ...(body.get("bir2307Reference") ? { bir2307Reference: body.get("bir2307Reference") } : {}),
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

  async function loadStatement(printAfter = false) {
    if (!id) return;
    setStatementError("");
    try {
      const result = await api<CustomerStatement>(`/api/customers/${id}/statement`);
      setStatement(result);
      if (printAfter) {
        requestAnimationFrame(() => window.print());
      }
    } catch (caught) {
      setStatementError(caught instanceof ApiError ? caught.message : "Could not load the statement.");
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !data) return <p className="text-sm text-destructive">{error || "Customer not found."}</p>;

  const aging = data.aging;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={data.name}
        description={[data.phone, data.tin, data.notes].filter(Boolean).join(" · ") || "Customer"}
        action={
          <div className="flex flex-wrap gap-2 print-hide">
            <Button type="button" variant="outline" onClick={() => void loadStatement(false)}>
              View statement
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadStatement(true)}>
              Print statement
            </Button>
            <Button asChild variant="outline">
              <Link to="/customers">All customers</Link>
            </Button>
          </div>
        }
      />
      {statementError ? <p className="text-sm text-destructive print-hide">{statementError}</p> : null}
      <Card>
        <CardContent className="pt-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Balance</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight font-money">
            {describeBalance(data.balanceCentavos, "receivable")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Charged <Money value={data.chargesCentavos} /> · Paid <Money value={data.paymentsCentavos} />
            {data.creditLimitCentavos && data.creditLimitCentavos !== "0"
              ? ` · Limit ${formatCentavos(data.creditLimitCentavos)}`
              : ""}
          </p>
          {data.taxTreatment ? <p className="mt-1 text-sm text-muted-foreground">Tax: {data.taxTreatment}</p> : null}
        </CardContent>
      </Card>
      {aging ? (
        <section className="grid gap-2 sm:grid-cols-5 print-hide">
          {(
            [
              ["Current", aging.current ?? aging.currentCentavos ?? "0"],
              ["1–30", aging["1-30"] ?? aging.days1to30Centavos ?? "0"],
              ["31–60", aging["31-60"] ?? aging.days31to60Centavos ?? "0"],
              ["61–90", aging["61-90"] ?? aging.days61to90Centavos ?? "0"],
              ["90+", aging["90+"] ?? aging.over90Centavos ?? "0"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 font-semibold tracking-tight font-money">{formatCentavos(value || "0")}</p>
            </div>
          ))}
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2 print-hide">
        <Card>
          <CardHeader>
            <CardTitle>Record a collection</CardTitle>
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
              <Field
                label="Withholding (₱)"
                htmlFor="pay-wh"
                hint="If the customer withheld tax, enter the amount here and keep the BIR 2307 reference."
              >
                <Input id="pay-wh" name="withholding" inputMode="decimal" placeholder="0.00" />
              </Field>
              <Field label="BIR 2307 reference" htmlFor="bir2307">
                <Input id="bir2307" name="bir2307Reference" />
              </Field>
              <Field label="Note" htmlFor="pay-note">
                <Input id="pay-note" name="note" placeholder="Cash, check, transfer" />
              </Field>
              <Button type="submit" disabled={pending}>
                Save collection
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
              <Field label="Amount" htmlFor="charge-amount" hint="Use this for a charge that did not come from a sale or shift.">
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
      <section className="grid gap-2 print-hide">
        <h2 className="text-sm font-semibold tracking-tight">Charges</h2>
        {data.charges.length === 0 ? <p className="text-sm text-muted-foreground">No charges yet.</p> : null}
        {data.charges.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Source</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {data.charges.map((charge) => (
                <tr key={charge.id}>
                  <Td className="text-muted-foreground">{formatDate(charge.businessDate)}</Td>
                  <Td>
                    {charge.shiftId ? (
                      <Link className="hover:underline" to={`/shifts/${charge.shiftId}`}>
                        From the {charge.shiftName} shift
                      </Link>
                    ) : charge.invoiceId ? (
                      <Link className="hover:underline" to={`/sales/${charge.invoiceId}`}>
                        From invoice
                      </Link>
                    ) : (
                      "Added by hand"
                    )}
                    {charge.note ? <p className="text-xs text-muted-foreground">{charge.note}</p> : null}
                  </Td>
                  <Td align="right">
                    <Money value={charge.amountCentavos} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
      </section>
      <section className="grid gap-2 print-hide">
        <h2 className="text-sm font-semibold tracking-tight">Collections</h2>
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
                  <Td>
                    {payment.note || "Payment"}
                    {payment.withholdingCentavos && payment.withholdingCentavos !== "0"
                      ? ` · WH ${formatCentavos(payment.withholdingCentavos)}`
                      : ""}
                    {payment.bir2307Reference ? ` · 2307 ${payment.bir2307Reference}` : ""}
                  </Td>
                  <Td align="right">
                    <Money value={payment.amountCentavos} />
                  </Td>
                  <Td align="right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeletePayment(payment.id)}>
                      Delete
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
      </section>
      {statement ? (
        <section className="rounded-lg border border-border bg-card p-4 print:border-0">
          <h2 className="text-xl font-semibold tracking-tight">Statement of account</h2>
          <p className="text-sm text-muted-foreground">
            {statement.customer.name} · as of {formatDate(statement.asOf)}
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(statement.lines ?? []).map((line, index) => (
                  <tr key={index} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(line.date)}</td>
                    <td className="px-3 py-2.5">{line.description}</td>
                    <td className="px-3 py-2.5 text-right font-money">
                      {line.debitCentavos === "0" ? "" : formatCentavos(line.debitCentavos)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-money">
                      {line.creditCentavos === "0" ? "" : formatCentavos(line.creditCentavos)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-money">{formatCentavos(line.balanceCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
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
