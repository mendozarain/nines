import { useState } from "react";
import { useOutletContext } from "react-router";
import { formatCentavos, formatDate } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ApiError, api } from "~/lib/api";
import type { JournalEntry, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Journal · Nines" }];
}

export default function BooksJournalPage() {
  const me = useOutletContext<Me>();
  const { data, error, loading, reload } = useFetch<{ entries: JournalEntry[] }>("/api/books/journal", {
    fallback: { entries: [] },
  });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/books/journal", {
        method: "POST",
        body: JSON.stringify({
          businessDate: body.get("businessDate"),
          reference: body.get("reference"),
          memo: body.get("memo"),
          lines: [
            {
              accountCode: body.get("debitAccount"),
              debit: body.get("amount"),
              credit: "0",
            },
            {
              accountCode: body.get("creditAccount"),
              debit: "0",
              credit: body.get("amount"),
            },
          ],
        }),
      });
      form.reset();
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not post the entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Journal" description="Manual double-entry postings. Day-to-day sales and expenses post automatically when the books API is wired." />
      <Card>
        <CardHeader>
          <CardTitle>Simple two-line entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <FormError message={formError} />
            </div>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="businessDate" type="date" defaultValue={me.today} required />
            </Field>
            <Field label="Reference" htmlFor="ref">
              <Input id="ref" name="reference" placeholder="JV-001" />
            </Field>
            <Field label="Debit account code" htmlFor="debit">
              <Input id="debit" name="debitAccount" required placeholder="6000" />
            </Field>
            <Field label="Credit account code" htmlFor="credit">
              <Input id="credit" name="creditAccount" required placeholder="1020" />
            </Field>
            <Field label="Amount" htmlFor="amount">
              <Input id="amount" name="amount" inputMode="decimal" required />
            </Field>
            <Field label="Memo" htmlFor="memo">
              <Input id="memo" name="memo" />
            </Field>
            <div className="self-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Posting…" : "Post entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.entries.length === 0 ? <EmptyState title="No journal entries yet" description="Post a simple debit/credit when you need a manual adjustment." /> : null}
      <div className="grid gap-3">
        {data?.entries.map((entry) => (
          <div key={entry.id} className="nines-row">
            <p className="font-medium">
              {formatDate(entry.businessDate)} · {entry.reference || "Journal"}
            </p>
            <p className="text-sm text-muted-foreground">{entry.memo || "No memo"}</p>
            <ul className="mt-2 grid gap-1 text-sm">
              {entry.lines.map((line, index) => (
                <li key={index} className="flex justify-between gap-3">
                  <span>
                    {line.accountCode} {line.accountName || ""}
                  </span>
                  <span className="tabular-nums">
                    {line.debitCentavos !== "0" ? `Dr ${formatCentavos(line.debitCentavos)}` : `Cr ${formatCentavos(line.creditCentavos)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
