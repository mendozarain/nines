import { useState } from "react";
import { useOutletContext } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { Me, PayrollEntry } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Payroll · Nines" }];
}

export default function BooksPayrollPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<{ entries: PayrollEntry[] }>("/api/payroll", { fallback: { entries: [] } });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/payroll", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          employeeName: body.get("employeeName"),
          gross: body.get("gross"),
          sss: body.get("sss"),
          philhealth: body.get("philhealth"),
          pagibig: body.get("pagibig"),
          withholding: body.get("withholding"),
          note: body.get("note"),
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save payroll.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payroll"
        description="Simple pay records with SSS, PhilHealth, Pag-IBIG, and withholding. Confirm current contribution tables with your accountant."
      />
      <Card>
        <CardHeader>
          <CardTitle>Record pay</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <div className="sm:col-span-2 lg:col-span-3">
              <FormError message={formError} />
            </div>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="businessDate" type="date" defaultValue={me.today} required />
            </Field>
            <Field label="Employee" htmlFor="employee">
              <Input id="employee" name="employeeName" required />
            </Field>
            <Field label="Gross pay" htmlFor="gross">
              <Input id="gross" name="gross" inputMode="decimal" required />
            </Field>
            <Field label="SSS" htmlFor="sss">
              <Input id="sss" name="sss" inputMode="decimal" defaultValue="0.00" />
            </Field>
            <Field label="PhilHealth" htmlFor="ph">
              <Input id="ph" name="philhealth" inputMode="decimal" defaultValue="0.00" />
            </Field>
            <Field label="Pag-IBIG" htmlFor="hdmf">
              <Input id="hdmf" name="pagibig" inputMode="decimal" defaultValue="0.00" />
            </Field>
            <Field label="Withholding tax" htmlFor="wh">
              <Input id="wh" name="withholding" inputMode="decimal" defaultValue="0.00" />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" name="note" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save pay"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.entries.length === 0 ? <EmptyState title="No payroll entries yet" description="Record pay when you run payroll for the period." /> : null}
      <div className="grid gap-2">
        {data?.entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border bg-card/80 p-4 sm:flex sm:justify-between">
            <div>
              <p className="font-medium">
                {entry.employeeName} · {formatDate(entry.businessDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                Gross {formatCentavos(entry.grossCentavos)} · Net {formatCentavos(entry.netCentavos)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
