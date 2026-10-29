import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { INDUSTRIES, INDUSTRY_LABELS, PH_TIN_REGEX, SUGGESTED_PRODUCTS, type Industry } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ApiError, api } from "~/lib/api";
import type { Me, TaxRegime } from "~/lib/types";

type ProductDraft = { name: string; price: string };
type PumpDraft = { name: string; productName: string };
type ItemDraft = { name: string; price: string; unit: string };

const defaultProducts: ProductDraft[] = SUGGESTED_PRODUCTS.map((product) => ({
  name: product.name,
  price: product.price,
}));

const defaultPumps: PumpDraft[] = [
  { name: "Pump 1", productName: "Diesel" },
  { name: "Pump 2", productName: "Unleaded" },
  { name: "Pump 3", productName: "Premium" },
];

const starterItems: ItemDraft[] = [
  { name: "Service fee", price: "500.00", unit: "pc" },
  { name: "Retail item", price: "100.00", unit: "pc" },
];

export function meta() {
  return [{ title: "Set up · Nines" }];
}

export default function Setup() {
  const navigate = useNavigate();
  const me = useOutletContext<Me>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [industry, setIndustry] = useState<Industry>("GENERAL");
  const [name, setName] = useState("");
  const [tin, setTin] = useState("");
  const [address, setAddress] = useState("");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>("VAT");
  const [percentageTaxRateBps, setPercentageTaxRateBps] = useState(300);
  const [products, setProducts] = useState<ProductDraft[]>(defaultProducts);
  const [pumps, setPumps] = useState<PumpDraft[]>(defaultPumps);
  const [items, setItems] = useState<ItemDraft[]>(starterItems);
  const [skipOpeningBalances, setSkipOpeningBalances] = useState(true);

  const fuel = industry === "FUEL_STATION";

  const steps = useMemo(() => {
    const base = ["Industry", "Business", "Tax"];
    if (fuel) return [...base, "Fuels", "Pumps", "Opening"];
    return [...base, "Items", "Opening"];
  }, [fuel]);

  function goNext() {
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      if (name.trim().length < 2) return setError("Enter the business name.");
      if (!PH_TIN_REGEX.test(tin.trim())) return setError("Use the TIN format 123-456-789-000.");
      if (address.trim().length < 8) return setError("Enter the full address.");
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (fuel) {
      if (step === 3) {
        if (products.length === 0) return setError("Add at least one fuel.");
        if (products.some((product) => product.name.trim().length < 2 || !product.price.trim())) {
          return setError("Each fuel needs a name and today’s price per litre.");
        }
        setStep(4);
        return;
      }
      if (step === 4) {
        if (pumps.length === 0) return setError("Add at least one pump.");
        if (pumps.some((pump) => pump.name.trim().length < 2 || !pump.productName)) {
          return setError("Each pump needs a name and a fuel.");
        }
        setStep(5);
        return;
      }
      void finish();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    void finish();
  }

  async function finish() {
    setPending(true);
    setError("");
    const vatRegistered = taxRegime === "VAT";
    const fuelModuleEnabled = fuel;
    try {
      const payload: Record<string, unknown> = {
        name,
        tin,
        address,
        vatRegistered,
        industry,
        fuelModuleEnabled,
        taxRegime,
        percentageTaxRateBps: vatRegistered ? 0 : percentageTaxRateBps,
        openingBalances: skipOpeningBalances ? [] : [],
        products: fuel ? products : [],
        pumps: fuel ? pumps : [],
      };
      await api("/api/station", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!fuel) {
        for (const item of items.filter((row) => row.name.trim() && row.price.trim())) {
          try {
            await api("/api/items", {
              method: "POST",
              body: JSON.stringify({ name: item.name, unit: item.unit, price: item.price, taxType: "VATABLE" }),
            });
          } catch {
            // Items API may still be landing; station setup already succeeded.
          }
        }
      }
      navigate("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the business.");
      setPending(false);
    }
  }

  const title = steps[step] ?? "Setup";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-4">
      <p className="mb-1 font-display text-2xl font-semibold tracking-tight">Nines</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Welcome{me.user ? `, ${me.user.name}` : ""}. A short setup — you can change everything later.
      </p>
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader>
          <CardDescription>
            Step {step + 1} of {steps.length}
          </CardDescription>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormError message={error} />

          {step === 0 ? (
            <>
              <p className="text-sm text-muted-foreground">What kind of business are you running? This only turns on the extras you need.</p>
              <div className="grid gap-2">
                {INDUSTRIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndustry(value)}
                    className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                      industry === value ? "border-primary bg-accent/50" : "hover:bg-muted/60"
                    }`}
                  >
                    <p className="font-medium">{INDUSTRY_LABELS[value]}</p>
                    <p className="text-sm text-muted-foreground">
                      {value === "FUEL_STATION"
                        ? "Pumps, tanks, dips, and fuel deliveries."
                        : value === "RETAIL"
                          ? "Goods, stock, and day-to-day sales."
                          : value === "SERVICES"
                            ? "Service invoices and receivables."
                            : "General books for a Philippine small business."}
                    </p>
                  </button>
                ))}
              </div>
              <Button type="button" size="lg" onClick={goNext}>
                Continue
              </Button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Business name" htmlFor="business-name">
                <Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bautista Trading" />
              </Field>
              <Field label="TIN" htmlFor="tin" hint="Example: 123-456-789-000">
                <Input id="tin" value={tin} onChange={(event) => setTin(event.target.value)} placeholder="123-456-789-000" />
              </Field>
              <Field label="Address" htmlFor="address">
                <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, barangay, city" />
              </Field>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Are you VAT-registered, or do you file percentage tax instead? Ask your accountant if you are unsure — you can switch later.
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  className={`rounded-lg border px-4 py-3 text-left ${taxRegime === "VAT" ? "border-primary bg-accent/50" : "hover:bg-muted/60"}`}
                  onClick={() => setTaxRegime("VAT")}
                >
                  <p className="font-medium">VAT-registered</p>
                  <p className="text-sm text-muted-foreground">Prices are treated as VAT-inclusive at 12%.</p>
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-4 py-3 text-left ${taxRegime === "PERCENTAGE_TAX" ? "border-primary bg-accent/50" : "hover:bg-muted/60"}`}
                  onClick={() => setTaxRegime("PERCENTAGE_TAX")}
                >
                  <p className="font-medium">Percentage tax (non-VAT)</p>
                  <p className="text-sm text-muted-foreground">Common for smaller businesses that are not VAT-registered.</p>
                </button>
              </div>
              {taxRegime === "PERCENTAGE_TAX" ? (
                <Field label="Percentage tax rate" htmlFor="pct-rate" hint="Stored in basis points (300 = 3%). Confirm the current BIR rate with your accountant.">
                  <NativeSelect
                    id="pct-rate"
                    value={String(percentageTaxRateBps)}
                    onChange={(event) => setPercentageTaxRateBps(Number(event.target.value))}
                  >
                    <option value="300">3%</option>
                    <option value="100">1%</option>
                    <option value="200">2%</option>
                  </NativeSelect>
                </Field>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {fuel && step === 3 ? (
            <>
              <p className="text-sm text-muted-foreground">These are sample pump prices. Change them to the price on the board today.</p>
              {products.map((product, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto]">
                  <Field label="Fuel" htmlFor={`fuel-${index}`}>
                    <Input
                      id={`fuel-${index}`}
                      value={product.name}
                      onChange={(event) =>
                        setProducts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                      }
                    />
                  </Field>
                  <Field label="Price per litre" htmlFor={`price-${index}`}>
                    <Input
                      id={`price-${index}`}
                      inputMode="decimal"
                      value={product.price}
                      onChange={(event) =>
                        setProducts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, price: event.target.value } : item)))
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end"
                    disabled={products.length === 1}
                    onClick={() => setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setProducts((current) => [...current, { name: "", price: "" }])}>
                Add a fuel
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {fuel && step === 4 ? (
            <>
              <p className="text-sm text-muted-foreground">Name the pumps the way the cashiers know them.</p>
              {pumps.map((pump, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label="Pump" htmlFor={`pump-${index}`}>
                    <Input
                      id={`pump-${index}`}
                      value={pump.name}
                      onChange={(event) =>
                        setPumps((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                      }
                    />
                  </Field>
                  <Field label="Fuel" htmlFor={`pump-fuel-${index}`}>
                    <NativeSelect
                      id={`pump-fuel-${index}`}
                      value={pump.productName}
                      onChange={(event) =>
                        setPumps((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, productName: event.target.value } : item)))
                      }
                    >
                      {products.map((product) => (
                        <option key={product.name} value={product.name}>
                          {product.name || "Unnamed fuel"}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end"
                    disabled={pumps.length === 1}
                    onClick={() => setPumps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setPumps((current) => [...current, { name: `Pump ${current.length + 1}`, productName: products[0]?.name ?? "" }])}
              >
                Add a pump
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {!fuel && step === 3 ? (
            <>
              <p className="text-sm text-muted-foreground">Optional starter products or services. Skip if you prefer a blank catalog.</p>
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_100px_auto]">
                  <Field label="Item" htmlFor={`item-${index}`}>
                    <Input
                      id={`item-${index}`}
                      value={item.name}
                      onChange={(event) =>
                        setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)))
                      }
                    />
                  </Field>
                  <Field label="Unit" htmlFor={`unit-${index}`}>
                    <Input
                      id={`unit-${index}`}
                      value={item.unit}
                      onChange={(event) =>
                        setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, unit: event.target.value } : row)))
                      }
                    />
                  </Field>
                  <Field label="Price" htmlFor={`item-price-${index}`}>
                    <Input
                      id={`item-price-${index}`}
                      inputMode="decimal"
                      value={item.price}
                      onChange={(event) =>
                        setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, price: event.target.value } : row)))
                      }
                    />
                  </Field>
                  <Button type="button" variant="ghost" className="self-end" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { name: "", price: "", unit: "pc" }])}>
                Add an item
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setItems([]); setStep(4); }}>
                  Skip for now
                </Button>
                <Button type="button" size="lg" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {((fuel && step === 5) || (!fuel && step === 4)) ? (
            <>
              <p className="text-sm text-muted-foreground">
                Opening balances (cash, receivables, inventory) can wait. Most owners skip this and start with today’s transactions.
              </p>
              <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Skip opening balances</p>
                  <p className="text-sm text-muted-foreground">You can enter them later from Books when your accountant is ready.</p>
                </div>
                <Switch checked={skipOpeningBalances} onCheckedChange={setSkipOpeningBalances} aria-label="Skip opening balances" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(fuel ? 4 : 3)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={goNext} disabled={pending}>
                  {pending ? "Saving…" : "Open my books"}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
