import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  SHIFT_NAMES,
  formatCentavos,
  formatLitres,
  litresSold,
  litresToAmountCentavos,
  overShort,
  parseCentavos,
  parseCentilitres,
  toInputAmount,
} from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { OverShort, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import type { CustomerSummary, Me, Shift, StationDetails } from "~/lib/types";
import { cn } from "~/lib/utils";

type ReadingLine = {
  pumpId: string;
  pumpName: string;
  productName: string;
  opening: string;
  closing: string;
  price: string;
};

type ChargeLine = {
  customerId: string;
  newName: string;
  amount: string;
  note: string;
};

const blankCharge = (): ChargeLine => ({ customerId: "", newName: "", amount: "", note: "" });

export function ShiftForm({ shiftId }: { shiftId?: string }) {
  const navigate = useNavigate();
  const me = useOutletContext<Me>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [businessDate, setBusinessDate] = useState(me.today);
  const [name, setName] = useState<(typeof SHIFT_NAMES)[number]>("Morning");
  const [notes, setNotes] = useState("");
  const [cash, setCash] = useState("0.00");
  const [card, setCard] = useState("0.00");
  const [credit, setCredit] = useState("0.00");
  const [readings, setReadings] = useState<ReadingLine[]>([]);
  const [charges, setCharges] = useState<ChargeLine[]>([blankCharge()]);
  const [split, setSplit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [station, customerList, existing] = await Promise.all([
          api<StationDetails>("/api/station"),
          api<{ customers: CustomerSummary[] }>("/api/customers"),
          shiftId ? api<Shift>(`/api/shifts/${shiftId}`) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCustomers(customerList.customers);
        const saved = new Map(existing?.readings.map((reading) => [reading.pumpId, reading]) ?? []);
        setReadings(
          station.pumps
            .filter((pump) => pump.active)
            .map((pump) => {
              const previous = saved.get(pump.id);
              const product = station.products.find((item) => item.id === pump.productId);
              return {
                pumpId: pump.id,
                pumpName: pump.name,
                productName: pump.productName,
                opening: previous
                  ? toInputAmount(previous.openingCentilitres)
                  : pump.lastClosingCentilitres
                    ? toInputAmount(pump.lastClosingCentilitres)
                    : "0.00",
                closing: previous ? toInputAmount(previous.closingCentilitres) : "",
                price: previous
                  ? toInputAmount(previous.pricePerLitreCentavos)
                  : product
                    ? toInputAmount(product.pricePerLitreCentavos)
                    : "",
              };
            }),
        );
        if (existing) {
          setBusinessDate(existing.businessDate);
          setName(existing.name as (typeof SHIFT_NAMES)[number]);
          setNotes(existing.notes);
          setCash(toInputAmount(existing.cashCentavos));
          setCard(toInputAmount(existing.cardCentavos));
          setCredit(toInputAmount(existing.creditCentavos));
          if (existing.charges.length > 1) {
            setSplit(true);
            setCharges(
              existing.charges.map((charge) => ({
                customerId: charge.customerId,
                newName: "",
                amount: toInputAmount(charge.amountCentavos),
                note: charge.note,
              })),
            );
          } else if (existing.charges[0]) {
            setCharges([
              {
                customerId: existing.charges[0].customerId,
                newName: "",
                amount: toInputAmount(existing.charges[0].amountCentavos),
                note: existing.charges[0].note,
              },
            ]);
          }
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : "Could not open the shift form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  const preview = useMemo(() => {
    let expected = 0n;
    let complete = true;
    const lines = readings.map((reading) => {
      if (!reading.closing.trim()) {
        complete = false;
        return { litres: null as bigint | null, amount: null as bigint | null };
      }
      try {
        const litres = litresSold(parseCentilitres(reading.opening), parseCentilitres(reading.closing));
        const amount = litresToAmountCentavos(litres, parseCentavos(reading.price));
        expected += amount;
        return { litres, amount };
      } catch {
        complete = false;
        return { litres: null, amount: null };
      }
    });
    let difference: bigint | null = null;
    try {
      difference = overShort(expected, parseCentavos(cash || "0"), parseCentavos(card || "0"), parseCentavos(credit || "0"));
    } catch {
      difference = null;
    }
    return { lines, expected, complete, difference };
  }, [readings, cash, card, credit]);

  function updateReading(index: number, patch: Partial<ReadingLine>) {
    setReadings((current) => current.map((reading, readingIndex) => (readingIndex === index ? { ...reading, ...patch } : reading)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!businessDate) nextErrors.date = "Choose the shift date.";
    readings.forEach((reading, index) => {
      if (!reading.closing.trim()) nextErrors[`closing-${index}`] = "Enter the closing reading.";
      try {
        litresSold(parseCentilitres(reading.opening || "0"), parseCentilitres(reading.closing || "0"));
      } catch (caught) {
        if (reading.closing.trim()) nextErrors[`closing-${index}`] = caught instanceof Error ? caught.message : "Check this reading.";
      }
    });
    let creditAmount = 0n;
    try {
      creditAmount = parseCentavos(credit || "0");
    } catch {
      nextErrors.credit = "Enter the credit amount like 1,500.00.";
    }
    if (creditAmount > 0n) {
      const activeCharges = split ? charges : [charges[0] ?? blankCharge()];
      activeCharges.forEach((charge, index) => {
        if (!charge.customerId && !charge.newName.trim()) {
          nextErrors[`customer-${index}`] = "Choose who this credit sale is for.";
        }
        if (split) {
          try {
            if (parseCentavos(charge.amount || "0") <= 0n) nextErrors[`charge-${index}`] = "Enter this customer’s amount.";
          } catch {
            nextErrors[`charge-${index}`] = "Enter an amount like 500.00.";
          }
        }
      });
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Check the readings and payments, then save again.");
      return;
    }
    setFieldErrors({});
    setError("");
    setSaving(true);
    const chargePayload =
      creditAmount === 0n
        ? []
        : (split ? charges : [charges[0] ?? blankCharge()]).map((charge) => ({
            customerId: charge.customerId || undefined,
            newCustomerName: charge.customerId ? undefined : charge.newName,
            amount: split ? charge.amount : credit,
            note: charge.note,
          }));
    try {
      const saved = await api<Shift>(shiftId ? `/api/shifts/${shiftId}` : "/api/shifts", {
        method: shiftId ? "PATCH" : "POST",
        body: JSON.stringify({
          businessDate,
          name,
          notes,
          cash,
          card,
          credit,
          readings: readings.map((reading) => ({
            pumpId: reading.pumpId,
            opening: reading.opening,
            closing: reading.closing,
            price: reading.price,
          })),
          charges: chargePayload,
        }),
      });
      navigate(`/shifts/${saved.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the shift.");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading pumps…</p>;

  return (
    <form className="grid gap-4 pb-28" onSubmit={onSubmit}>
      <PageHeader
        title={shiftId ? "Edit shift" : "Record a shift"}
        description="Type the closing meter on each pump. Litres and amount update as you go."
      />
      <FormError message={error} />
      {readings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Turn on at least one pump in Station before recording a shift.</p>
      ) : null}
      <Card>
        <CardContent className="grid gap-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="shift-date" error={fieldErrors.date}>
              <Input id="shift-date" type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} />
            </Field>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium">Shift</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Shift">
                {SHIFT_NAMES.map((shiftName) => (
                  <button
                    key={shiftName}
                    type="button"
                    role="radio"
                    aria-checked={name === shiftName}
                    className={cn(
                      "h-11 rounded-md border text-sm font-medium",
                      name === shiftName ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                    )}
                    onClick={() => setName(shiftName)}
                  >
                    {shiftName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {readings.map((reading, index) => {
        const line = preview.lines[index];
        return (
          <Card key={reading.pumpId}>
            <CardHeader>
              <CardTitle>
                {reading.pumpName} · {reading.productName}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Opening reading" htmlFor={`opening-${index}`} hint={index === 0 ? "Filled from the last closing. Change it only if the meter was reset." : undefined}>
                <Input id={`opening-${index}`} inputMode="decimal" className="tabular-nums" value={reading.opening} onChange={(event) => updateReading(index, { opening: event.target.value })} />
              </Field>
              <Field label="Closing reading" htmlFor={`closing-${index}`} error={fieldErrors[`closing-${index}`]}>
                <Input id={`closing-${index}`} inputMode="decimal" className="tabular-nums" value={reading.closing} onChange={(event) => updateReading(index, { closing: event.target.value })} placeholder="0.00" />
              </Field>
              <Field label="Price per litre" htmlFor={`price-${index}`}>
                <Input id={`price-${index}`} inputMode="decimal" className="tabular-nums" value={reading.price} onChange={(event) => updateReading(index, { price: event.target.value })} />
              </Field>
              <div className="grid content-end gap-1 rounded-lg bg-muted px-3 py-2">
                <p className="text-sm text-muted-foreground">Litres sold</p>
                <p className="text-lg font-semibold tabular-nums">{line?.litres == null ? "—" : `${formatLitres(line.litres)} L`}</p>
                <p className="text-sm tabular-nums">{line?.amount == null ? "" : formatCentavos(line.amount)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Card>
        <CardHeader>
          <CardTitle>How was it paid?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cash counted" htmlFor="cash">
              <Input id="cash" inputMode="decimal" className="tabular-nums" value={cash} onChange={(event) => setCash(event.target.value)} />
            </Field>
            <Field label="Card payments" htmlFor="card">
              <Input id="card" inputMode="decimal" className="tabular-nums" value={card} onChange={(event) => setCard(event.target.value)} />
            </Field>
            <Field label="Credit (on account)" htmlFor="credit" error={fieldErrors.credit} hint="Utang for a customer.">
              <Input id="credit" inputMode="decimal" className="tabular-nums" value={credit} onChange={(event) => setCredit(event.target.value)} />
            </Field>
          </div>
          {(() => {
            try {
              return parseCentavos(credit || "0") > 0n;
            } catch {
              return false;
            }
          })() ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Who is the credit for?</p>
                {!split ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSplit(true);
                      setCharges((current) => {
                        const first = current[0] ?? blankCharge();
                        return [{ ...first, amount: credit }, blankCharge()];
                      });
                    }}
                  >
                    Split between customers
                  </Button>
                ) : null}
              </div>
              {(split ? charges : charges.slice(0, 1)).map((charge, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-2">
                  <Field label="Customer" htmlFor={`customer-${index}`} error={fieldErrors[`customer-${index}`]}>
                    <NativeSelect
                      id={`customer-${index}`}
                      value={charge.customerId || (charge.newName ? "__new__" : "")}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCharges((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, customerId: value === "__new__" ? "" : value, newName: value === "__new__" ? item.newName : "" }
                              : item,
                          ),
                        );
                      }}
                    >
                      <option value="">Choose a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                      <option value="__new__">Add a new customer…</option>
                    </NativeSelect>
                  </Field>
                  {!charge.customerId ? (
                    <Field label="New customer name" htmlFor={`new-customer-${index}`}>
                      <Input
                        id={`new-customer-${index}`}
                        value={charge.newName}
                        onChange={(event) =>
                          setCharges((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, newName: event.target.value } : item)))
                        }
                      />
                    </Field>
                  ) : null}
                  {split ? (
                    <Field label="Amount" htmlFor={`charge-${index}`} error={fieldErrors[`charge-${index}`]}>
                      <Input
                        id={`charge-${index}`}
                        inputMode="decimal"
                        value={charge.amount}
                        onChange={(event) =>
                          setCharges((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, amount: event.target.value } : item)))
                        }
                      />
                    </Field>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <Field label="Note" htmlFor="notes" hint="Optional. Anything the next cashier should know.">
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            />
          </Field>
        </CardContent>
      </Card>
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Fuel sales</p>
            <p className="text-xl font-semibold tabular-nums" data-testid="shift-sales">
              {preview.complete ? formatCentavos(preview.expected) : "—"}
            </p>
            <p data-testid="shift-over-short">
              {preview.difference == null || !preview.complete ? <span className="text-sm text-muted-foreground">Enter every closing reading</span> : <OverShort value={preview.difference.toString()} />}
            </p>
          </div>
          <Button type="submit" size="lg" disabled={saving || readings.length === 0}>
            {saving ? "Saving…" : "Save shift"}
          </Button>
        </div>
      </div>
    </form>
  );
}
