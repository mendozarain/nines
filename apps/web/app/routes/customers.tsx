import { useState } from "react";
import { Link } from "react-router";
import {
  CUSTOMER_TYPES,
  TAX_TREATMENT_LABELS,
  TAX_TREATMENTS,
  describeBalance,
  type CustomerType,
  type TaxTreatment,
} from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { EmptyState, LoadingBlock, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ApiError, api } from "~/lib/api";
import type { CustomerSummary } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Customers · Nines" }];
}

export default function CustomersPage() {
  const { data, error, loading, reload } = useFetch<{ outstandingCentavos: string; customers: CustomerSummary[] }>("/api/customers");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [allowsCharge, setAllowsCharge] = useState(true);
  const [isSeniorOrPwd, setIsSeniorOrPwd] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setFormError("");
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          type: body.get("type"),
          name: body.get("name"),
          contactPerson: body.get("contactPerson"),
          tin: body.get("tin"),
          address: body.get("address"),
          phone: body.get("phone"),
          email: body.get("email"),
          notes: body.get("notes"),
          allowsCharge,
          creditLimit: body.get("creditLimit"),
          paymentTermsDays: Number(body.get("paymentTermsDays") || 0),
          taxTreatment: body.get("taxTreatment"),
          taxExemptReason: body.get("taxExemptReason"),
          taxExemptReference: body.get("taxExemptReference"),
          taxExemptExpiry: body.get("taxExemptExpiry") || null,
          isSeniorOrPwd,
          seniorPwdIdNumber: body.get("seniorPwdIdNumber"),
          withholdingRateBps: Number(body.get("withholdingRateBps") || 0),
        }),
      });
      form.reset();
      setAllowsCharge(true);
      setIsSeniorOrPwd(false);
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
        title="Customers"
        description="People and organizations you sell to — including credit terms, tax treatment, and SC/PWD."
        action={
          <Button asChild size="lg">
            <Link to="/sales/new">New sale</Link>
          </Button>
        }
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
            <Field label="Type" htmlFor="type">
              <NativeSelect id="type" name="type" defaultValue={"INDIVIDUAL" satisfies CustomerType}>
                {CUSTOMER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "INDIVIDUAL" ? "Individual" : "Organization"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Name" htmlFor="customer-name">
              <Input id="customer-name" name="name" required placeholder="Mang Juan Transport" />
            </Field>
            <Field label="Contact person" htmlFor="contact" hint="For organizations — who you call about the account.">
              <Input id="contact" name="contactPerson" placeholder="Optional" />
            </Field>
            <Field label="Phone" htmlFor="customer-phone">
              <Input id="customer-phone" name="phone" placeholder="09xx xxx xxxx" />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" />
            </Field>
            <Field label="TIN" htmlFor="tin" hint="Needed when the buyer asks for an official invoice.">
              <Input id="tin" name="tin" placeholder="123-456-789-000" />
            </Field>
            <Field label="Address" htmlFor="address">
              <Input id="address" name="address" />
            </Field>
            <Field
              label="Tax treatment"
              htmlFor="taxTreatment"
              hint="VATable is the default. VAT-exempt / zero-rated need a documented reason."
            >
              <NativeSelect id="taxTreatment" name="taxTreatment" defaultValue={"VATABLE" satisfies TaxTreatment}>
                {TAX_TREATMENTS.map((treatment) => (
                  <option key={treatment} value={treatment}>
                    {TAX_TREATMENT_LABELS[treatment]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Allow charge / credit sales</p>
                <p className="text-sm text-muted-foreground">Turn off for cash-only customers.</p>
              </div>
              <Switch checked={allowsCharge} onCheckedChange={setAllowsCharge} aria-label="Allow charge" />
            </div>
            {allowsCharge ? (
              <>
                <Field label="Credit limit (₱)" htmlFor="creditLimit" hint="0 means no soft limit warning.">
                  <Input id="creditLimit" name="creditLimit" inputMode="decimal" placeholder="0.00" />
                </Field>
                <Field label="Payment terms (days)" htmlFor="terms">
                  <Input id="terms" name="paymentTermsDays" inputMode="numeric" defaultValue={0} />
                </Field>
              </>
            ) : null}
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Senior / PWD</p>
                <p className="text-sm text-muted-foreground">Marks the customer for the 20% discount when applicable.</p>
              </div>
              <Switch checked={isSeniorOrPwd} onCheckedChange={setIsSeniorOrPwd} aria-label="Senior or PWD" />
            </div>
            {isSeniorOrPwd ? (
              <Field label="SC / PWD ID number" htmlFor="sc-id">
                <Input id="sc-id" name="seniorPwdIdNumber" />
              </Field>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((value) => !value)}>
                {showAdvanced ? "Hide" : "Show"} tax exemption & withholding fields
              </Button>
            </div>
            {showAdvanced ? (
              <>
                <Field label="Tax-exempt reason" htmlFor="exempt-reason">
                  <Input id="exempt-reason" name="taxExemptReason" />
                </Field>
                <Field label="Tax-exempt reference" htmlFor="exempt-ref" hint="Certificate or BIR ruling number, if any.">
                  <Input id="exempt-ref" name="taxExemptReference" />
                </Field>
                <Field label="Exemption expiry" htmlFor="exempt-expiry">
                  <Input id="exempt-expiry" name="taxExemptExpiry" type="date" />
                </Field>
                <Field
                  label="Withholding rate (bps)"
                  htmlFor="wh"
                  hint="100 = 1%, 200 = 2%. Used when the customer withholds on payment."
                >
                  <Input id="wh" name="withholdingRateBps" inputMode="numeric" defaultValue={0} />
                </Field>
              </>
            ) : null}
            <Field label="Note" htmlFor="customer-notes">
              <Input id="customer-notes" name="notes" placeholder="Pays every Friday" />
            </Field>
            <div className="self-end">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Saving…" : "Add customer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.customers.length === 0 ? (
        <EmptyState title="No customers yet" description="Add a customer when someone buys on account or needs a named invoice." />
      ) : null}
      <div className="grid gap-2">
        {data?.customers.map((customer) => (
          <Link
            key={customer.id}
            to={`/customers/${customer.id}`}
            className="flex flex-col gap-1 nines-row sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {customer.phone || "No phone"}
                {customer.allowsCharge === false ? " · Cash only" : ""}
                {customer.isSeniorOrPwd ? " · SC/PWD" : ""}
              </p>
            </div>
            <p className="font-medium">{describeBalance(customer.balanceCentavos, "receivable")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
