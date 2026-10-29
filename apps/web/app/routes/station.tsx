import { useState } from "react";
import { toInputAmount } from "@nines/shared";
import { Field, FormError } from "~/components/field";
import { LoadingBlock, PageHeader } from "~/components/page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ApiError, api } from "~/lib/api";
import type { Product, Pump, StationDetails } from "~/lib/types";
import { useFetch } from "~/lib/use-fetch";

export function meta() {
  return [{ title: "Station · Nines" }];
}

export default function StationPage() {
  const { data, error, loading, reload } = useFetch<StationDetails>("/api/station");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function save(path: string, method: string, body: unknown, success: string) {
    setFormError("");
    setMessage("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setMessage(success);
      await reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Could not save that.");
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !data) return <p className="text-sm text-destructive">{error || "Set up the station first."}</p>;

  return (
    <div className="grid gap-6">
      <PageHeader title="Business / station" description="Name, TIN, tax status, and (when fuel is on) prices and pumps." />
      <FormError message={formError} />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <DetailsForm station={data} onSave={save} />
      <Card>
        <CardHeader>
          <CardTitle>Fuels</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {data.products.map((product) => (
            <ProductRow key={`${product.id}-${product.pricePerLitreCentavos}-${product.active}`} product={product} onSave={save} />
          ))}
          <form
            className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const body = new FormData(form);
              void save("/api/station/products", "POST", { name: body.get("name"), price: body.get("price") }, "Fuel added.").then(() => form.reset());
            }}
          >
            <Field label="New fuel" htmlFor="new-fuel">
              <Input id="new-fuel" name="name" placeholder="Kerosene" />
            </Field>
            <Field label="Price per litre" htmlFor="new-price">
              <Input id="new-price" name="price" inputMode="decimal" placeholder="70.00" />
            </Field>
            <Button type="submit" className="self-end">
              Add fuel
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pumps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">Turned-off pumps stay out of new shifts. Old shifts keep their readings.</p>
          {data.pumps.map((pump) => (
            <PumpRow key={`${pump.id}-${pump.active}-${pump.productId}`} pump={pump} products={data.products} onSave={save} />
          ))}
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const body = new FormData(form);
              void save("/api/station/pumps", "POST", { name: body.get("name"), productId: body.get("productId") }, "Pump added.").then(() => form.reset());
            }}
          >
            <Field label="New pump" htmlFor="new-pump">
              <Input id="new-pump" name="name" placeholder="Pump 5" />
            </Field>
            <Field label="Fuel" htmlFor="new-pump-fuel">
              <NativeSelect id="new-pump-fuel" name="productId" defaultValue={data.products.find((product) => product.active)?.id}>
                {data.products
                  .filter((product) => product.active)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Button type="submit" className="self-end">
              Add pump
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailsForm({
  station,
  onSave,
}: {
  station: StationDetails;
  onSave: (path: string, method: string, body: unknown, success: string) => Promise<void>;
}) {
  const [vatRegistered, setVatRegistered] = useState(station.vatRegistered);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void onSave(
              "/api/station",
              "PATCH",
              {
                name: form.get("name"),
                tin: form.get("tin"),
                address: form.get("address"),
                vatRegistered,
              },
              "Station details saved.",
            );
          }}
        >
          <Field label="Station name" htmlFor="name">
            <Input id="name" name="name" defaultValue={station.name} />
          </Field>
          <Field label="TIN" htmlFor="tin">
            <Input id="tin" name="tin" defaultValue={station.tin} />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" defaultValue={station.address} />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span>
              <span className="font-medium">VAT-registered</span>
              <span className="block text-muted-foreground">Prices stay VAT-inclusive at 12%.</span>
            </span>
            <Switch checked={vatRegistered} onCheckedChange={setVatRegistered} aria-label="VAT-registered" />
          </div>
          <Button type="submit">Save details</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProductRow({
  product,
  onSave,
}: {
  product: Product;
  onSave: (path: string, method: string, body: unknown, success: string) => Promise<void>;
}) {
  const [active, setActive] = useState(product.active);
  return (
    <form
      className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onSave(
          `/api/station/products/${product.id}`,
          "PATCH",
          { name: form.get("name"), price: form.get("price"), active },
          `${product.name} updated.`,
        );
      }}
    >
      <Field label="Fuel" htmlFor={`fuel-${product.id}`}>
        <Input id={`fuel-${product.id}`} name="name" defaultValue={product.name} />
      </Field>
      <Field label="Price per litre" htmlFor={`price-${product.id}`}>
        <Input id={`price-${product.id}`} name="price" inputMode="decimal" defaultValue={toInputAmount(product.pricePerLitreCentavos)} />
      </Field>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={active} onCheckedChange={setActive} aria-label={`${product.name} on the board`} />
          On the board
        </label>
        <Button type="submit" variant="outline">
          Save
        </Button>
      </div>
    </form>
  );
}

function PumpRow({
  pump,
  products,
  onSave,
}: {
  pump: Pump;
  products: Product[];
  onSave: (path: string, method: string, body: unknown, success: string) => Promise<void>;
}) {
  const [active, setActive] = useState(pump.active);
  return (
    <form
      className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onSave(
          `/api/station/pumps/${pump.id}`,
          "PATCH",
          { name: form.get("name"), productId: form.get("productId"), active },
          `${pump.name} updated.`,
        );
      }}
    >
      <Field label="Pump" htmlFor={`pump-${pump.id}`}>
        <Input id={`pump-${pump.id}`} name="name" defaultValue={pump.name} />
      </Field>
      <Field label="Fuel" htmlFor={`pump-fuel-${pump.id}`}>
        <NativeSelect id={`pump-fuel-${pump.id}`} name="productId" defaultValue={pump.productId}>
          {products
            .filter((product) => product.active || product.id === pump.productId)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
        </NativeSelect>
      </Field>
      <div className="flex items-center gap-3">
        {!active ? <Badge variant="outline">Off</Badge> : null}
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={active} onCheckedChange={setActive} aria-label={`${pump.name} in use`} />
          In use
        </label>
        <Button type="submit" variant="outline">
          Save
        </Button>
      </div>
    </form>
  );
}
