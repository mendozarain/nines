import { useState } from "react";
import { useOutletContext } from "react-router";
import { EXPENSE_CATEGORIES, formatDate, formatMonth } from "@nines/shared";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, Money, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { Expense, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Expenses · Nines" }];
}

export default function ExpensesPage() {
  const me = useOutletContext<Me>();
  const [month, setMonth] = useState(me.month);
  const { data, error, loading, reload } = useFetch<{ month: string; totalCentavos: string; expenses: Expense[] }>(
    `/api/expenses?month=${month}`,
  );
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          category: body.get("category"),
          amount: body.get("amount"),
          payee: body.get("payee"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save the expense.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!deleteId) return;
    await api(`/api/expenses/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await reload();
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Expenses" description="Money paid out of the station: wages, utilities, repairs, and the rest." />
      <Card>
        <CardHeader>
          <CardTitle>Add an expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <FormError message={formError} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date" htmlFor="expense-date">
                <Input id="expense-date" name="businessDate" type="date" defaultValue={me.today} required />
              </Field>
              <Field label="Category" htmlFor="expense-category">
                <NativeSelect id="expense-category" name="category" defaultValue="Supplies">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Amount" htmlFor="expense-amount">
                <Input id="expense-amount" name="amount" inputMode="decimal" placeholder="0.00" required />
              </Field>
              <Field label="Paid to" htmlFor="expense-payee" hint="Optional.">
                <Input id="expense-payee" name="payee" placeholder="Meralco, crew, supplier…" />
              </Field>
            </div>
            <Field label="Note" htmlFor="expense-note">
              <Input id="expense-note" name="note" placeholder="What was this for?" />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add expense"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Field label="Month" htmlFor="expense-month">
          <Input id="expense-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </Field>
        {data ? (
          <p className="text-sm text-muted-foreground">
            {formatMonth(data.month)} total <Money value={data.totalCentavos} className="font-semibold text-foreground" />
          </p>
        ) : null}
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.expenses.length === 0 ? (
        <EmptyState title="No expenses this month" description="Add wages, bills, and other money that left the station." />
      ) : null}
      <div className="grid gap-2">
        {data?.expenses.map((expense) => (
          <div key={expense.id} className="flex flex-col gap-2 nines-row sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{expense.category}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(expense.businessDate)}
                {expense.payee ? ` · ${expense.payee}` : ""}
                {expense.note ? ` · ${expense.note}` : ""}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Money value={expense.amountCentavos} className="text-lg font-semibold" />
              <Button type="button" variant="ghost" onClick={() => setDeleteId(expense.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete this expense?"
        description="It will disappear from this month’s total. This cannot be undone."
        confirmLabel="Delete expense"
        onConfirm={remove}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      />
    </div>
  );
}
