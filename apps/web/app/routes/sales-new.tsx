import { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import {
  PAYMENT_METHODS,
  TAX_TREATMENT_LABELS,
  TAX_TREATMENTS,
  formatCentavos,
  type PaymentMethod,
  type TaxTreatment,
} from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ApiError, api } from "~/lib/api";
import type { CatalogItem, CustomerSummary, Me } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

type LineDraft = {
  itemId: string;
  description: string;
  unit: string;
  qty: string;
  unitPrice: string;
};

export function meta() {
  return [{ title: "New sale · Nines" }];
}

export default function SalesNewPage() {
  const me = useOutletContext<Me>();
  const navigate = useNavigate();
  const { data: customersData } = useFetch<{ customers: CustomerSummary[] }>("/api/customers", {
    fallback: { customers: [] },
  });
  const { data: itemsData } = useFetch<{ items: CatalogItem[] }>("/api/items", {
    fallback: { items: [] },
  });

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>("VATABLE");
  const [isSeniorOrPwd, setIsSeniorOrPwd] = useState(false);
  const [seniorPwdIdNumber, setSeniorPwdIdNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerTin, setBuyerTin] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", description: "", unit: "pc", qty: "1", unitPrice: "" }]);
  const [overLimitAck, setOverLimitAck] = useState(false);

  const selectedCustomer = customersData?.customers.find((customer) => customer.id === customerId);

  const estimatedTotal = useMemo(() => {
    let total = 0;
    for (const line of lines) {
      const qty = Number(line.qty) || 0;
      const price = Number(line.unitPrice) || 0;
      total += qty * price;
    }
    if (isSeniorOrPwd) total *= 0.8;
    return total;
  }, [lines, isSeniorOrPwd]);

  const creditLimit = Number(selectedCustomer?.creditLimitCentavos ?? "0") / 100;
  const balance = Number(selectedCustomer?.balanceCentavos ?? "0") / 100;
  const overLimit = paymentMethod === "CHARGE" && creditLimit > 0 && balance + estimatedTotal > creditLimit;

  function applyItem(index: number, itemId: string) {
    const item = itemsData?.items.find((row) => row.id === itemId);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              itemId,
              description: item?.name ?? line.description,
              unit: item?.unit ?? line.unit,
              unitPrice: item ? (Number(item.priceCentavos) / 100).toFixed(2) : line.unitPrice,
            }
          : line,
      ),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (overLimit && !overLimitAck) {
      setError("This charge would go over the customer’s credit limit. Confirm below to continue, or pick another payment method.");
      return;
    }
    if (lines.every((line) => !line.description.trim() || !line.unitPrice.trim())) {
      setError("Add at least one line with a description and price.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await api<{ id: string }>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          businessDate: me.today,
          customerId: customerId || null,
          paymentMethod,
          taxTreatment,
          isSeniorOrPwd,
          seniorPwdIdNumber,
          buyerName: buyerName || selectedCustomer?.name || "",
          buyerTin,
          buyerAddress,
          note,
          overLimitAcknowledged: overLimitAck,
          lines: lines
            .filter((line) => line.description.trim() && line.unitPrice.trim())
            .map((line) => ({
              itemId: line.itemId || null,
              description: line.description,
              unit: line.unit,
              qty: line.qty,
              unitPrice: line.unitPrice,
            })),
        }),
      });
      navigate(`/sales/${result.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the sale.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="New sale"
        description="Build an invoice, explain tax treatment to the cashier, and charge only when the customer is allowed."
        action={
          <Button asChild variant="outline">
            <Link to="/sales">All sales</Link>
          </Button>
        }
      />
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Card>
          <CardHeader>
            <CardTitle>Customer & tax</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer" htmlFor="customer" hint="Leave blank for a walk-in cash sale.">
              <NativeSelect
                id="customer"
                value={customerId}
                onChange={(event) => {
                  const next = event.target.value;
                  setCustomerId(next);
                  const customer = customersData?.customers.find((row) => row.id === next);
                  if (customer) {
                    setBuyerName(customer.name);
                    setTaxTreatment((customer.taxTreatment as TaxTreatment) || "VATABLE");
                    setIsSeniorOrPwd(Boolean(customer.isSeniorOrPwd));
                    if (!customer.allowsCharge && paymentMethod === "CHARGE") setPaymentMethod("CASH");
                  }
                }}
              >
                <option value="">Walk-in / cash customer</option>
                {customersData?.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Payment method" htmlFor="payment">
              <NativeSelect
                id="payment"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method} disabled={method === "CHARGE" && selectedCustomer && selectedCustomer.allowsCharge === false}>
                    {method === "CHARGE" ? "Charge to account" : method.charAt(0) + method.slice(1).toLowerCase()}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Tax treatment"
              htmlFor="tax"
              hint="VATable prices include 12% VAT. VAT-exempt and zero-rated sales need a valid reason on the customer record."
            >
              <NativeSelect id="tax" value={taxTreatment} onChange={(event) => setTaxTreatment(event.target.value as TaxTreatment)}>
                {TAX_TREATMENTS.map((treatment) => (
                  <option key={treatment} value={treatment}>
                    {TAX_TREATMENT_LABELS[treatment]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Senior / PWD discount (20%)</p>
                <p className="text-sm text-muted-foreground">Applies the statutory discount when the ID is presented.</p>
              </div>
              <Switch checked={isSeniorOrPwd} onCheckedChange={setIsSeniorOrPwd} aria-label="Senior or PWD" />
            </div>
            {isSeniorOrPwd ? (
              <Field label="SC / PWD ID number" htmlFor="sc-id">
                <Input id="sc-id" value={seniorPwdIdNumber} onChange={(event) => setSeniorPwdIdNumber(event.target.value)} />
              </Field>
            ) : null}
            <Field label="Buyer name on invoice" htmlFor="buyer-name">
              <Input id="buyer-name" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />
            </Field>
            <Field label="Buyer TIN" htmlFor="buyer-tin">
              <Input id="buyer-tin" value={buyerTin} onChange={(event) => setBuyerTin(event.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Buyer address" htmlFor="buyer-address" hint="Needed on official invoices for organizations.">
              <Input id="buyer-address" value={buyerAddress} onChange={(event) => setBuyerAddress(event.target.value)} />
            </Field>
            <Field label="Note" htmlFor="note">
              <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_1fr_80px_100px_100px_auto]">
                <Field label="Catalog item" htmlFor={`item-${index}`}>
                  <NativeSelect id={`item-${index}`} value={line.itemId} onChange={(event) => applyItem(index, event.target.value)}>
                    <option value="">Custom line</option>
                    {itemsData?.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Description" htmlFor={`desc-${index}`}>
                  <Input
                    id={`desc-${index}`}
                    value={line.description}
                    onChange={(event) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))
                    }
                    required
                  />
                </Field>
                <Field label="Unit" htmlFor={`unit-${index}`}>
                  <Input
                    id={`unit-${index}`}
                    value={line.unit}
                    onChange={(event) => setLines((current) => current.map((row, i) => (i === index ? { ...row, unit: event.target.value } : row)))}
                  />
                </Field>
                <Field label="Qty" htmlFor={`qty-${index}`}>
                  <Input
                    id={`qty-${index}`}
                    inputMode="decimal"
                    value={line.qty}
                    onChange={(event) => setLines((current) => current.map((row, i) => (i === index ? { ...row, qty: event.target.value } : row)))}
                    required
                  />
                </Field>
                <Field label="Unit price" htmlFor={`price-${index}`}>
                  <Input
                    id={`price-${index}`}
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(event) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, unitPrice: event.target.value } : row)))
                    }
                    required
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="self-end"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setLines((current) => [...current, { itemId: "", description: "", unit: "pc", qty: "1", unitPrice: "" }])}
            >
              Add line
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated total{isSeniorOrPwd ? " after SC/PWD" : ""}</p>
              <p className="text-2xl font-semibold tabular-nums">{formatCentavos(Math.round(estimatedTotal * 100))}</p>
              {overLimit ? (
                <label className="mt-2 flex items-start gap-2 text-sm text-destructive">
                  <input type="checkbox" checked={overLimitAck} onChange={(event) => setOverLimitAck(event.target.checked)} className="mt-1" />
                  <span>
                    Charge would exceed the credit limit ({formatCentavos(selectedCustomer?.creditLimitCentavos ?? "0")}). Continue anyway.
                  </span>
                </label>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Saving…" : "Save sale"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
