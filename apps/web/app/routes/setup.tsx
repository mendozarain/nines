import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { SUGGESTED_PRODUCTS } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ApiError, api } from "~/lib/api";
import type { Me } from "~/lib/types";

type ProductDraft = { name: string; price: string };
type PumpDraft = { name: string; productName: string };

const defaultProducts: ProductDraft[] = SUGGESTED_PRODUCTS.map((product) => ({
  name: product.name,
  price: product.price,
}));

const defaultPumps: PumpDraft[] = [
  { name: "Pump 1", productName: "Diesel" },
  { name: "Pump 2", productName: "Unleaded" },
  { name: "Pump 3", productName: "Premium" },
];

export function meta() {
  return [{ title: "Set up station · Nines" }];
}

export default function Setup() {
  const navigate = useNavigate();
  const me = useOutletContext<Me>();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [tin, setTin] = useState("");
  const [address, setAddress] = useState("");
  const [vatRegistered, setVatRegistered] = useState(true);
  const [products, setProducts] = useState<ProductDraft[]>(defaultProducts);
  const [pumps, setPumps] = useState<PumpDraft[]>(defaultPumps);

  function nextFromStation() {
    if (name.trim().length < 2) return setError("Enter the station name.");
    if (!/^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/.test(tin.trim())) {
      return setError("Use the TIN format 123-456-789-000.");
    }
    if (address.trim().length < 8) return setError("Enter the full station address.");
    setError("");
    setStep(2);
  }

  function nextFromProducts() {
    if (products.length === 0) return setError("Add at least one fuel.");
    if (products.some((product) => product.name.trim().length < 2 || !product.price.trim())) {
      return setError("Each fuel needs a name and today’s price per litre.");
    }
    setError("");
    setStep(3);
  }

  async function finish() {
    if (pumps.length === 0) return setError("Add at least one pump.");
    if (pumps.some((pump) => pump.name.trim().length < 2 || !pump.productName)) {
      return setError("Each pump needs a name and a fuel.");
    }
    setPending(true);
    setError("");
    try {
      await api("/api/station", {
        method: "POST",
        body: JSON.stringify({
          name,
          tin,
          address,
          vatRegistered,
          products,
          pumps,
        }),
      });
      navigate("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the station.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-muted/40 p-4">
      <p className="mb-2 text-sm text-muted-foreground">Welcome{me.user ? `, ${me.user.name}` : ""}</p>
      <Card>
        <CardHeader>
          <CardDescription>Step {step} of 3</CardDescription>
          <CardTitle>
            {step === 1 ? "Station details" : step === 2 ? "Fuels and prices" : "Pumps"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormError message={error} />
          {step === 1 ? (
            <>
              <Field label="Station name" htmlFor="station-name">
                <Input id="station-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bautista Fuel Point" />
              </Field>
              <Field label="TIN" htmlFor="tin" hint="Example: 123-456-789-000">
                <Input id="tin" value={tin} onChange={(event) => setTin(event.target.value)} placeholder="123-456-789-000" />
              </Field>
              <Field label="Address" htmlFor="address">
                <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, barangay, city" />
              </Field>
              <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">VAT-registered</p>
                  <p className="text-sm text-muted-foreground">Turn this on if the station is VAT-registered. Prices are treated as VAT-inclusive at 12%.</p>
                </div>
                <Switch checked={vatRegistered} onCheckedChange={setVatRegistered} aria-label="VAT-registered" />
              </div>
              <Button type="button" size="lg" onClick={nextFromStation}>
                Continue
              </Button>
            </>
          ) : null}
          {step === 2 ? (
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
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={nextFromProducts}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}
          {step === 3 ? (
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
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={finish} disabled={pending}>
                  {pending ? "Saving…" : "Open my station"}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
