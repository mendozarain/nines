import { Form, redirect, useNavigation } from "react-router";
import { Field } from "~/components/field";
import { Logo } from "~/components/logo";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/select";
import { ApiError, api } from "~/lib/api";
import { authClient } from "~/lib/auth-client";
import { type Company, setCompanyId } from "~/lib/company";
import type { Route } from "./+types/setup";

export const meta: Route.MetaFunction = () => [{ title: "Set up your station · Nines" }];

export async function clientLoader() {
  const { data } = await authClient.getSession();
  if (!data) throw redirect("/login");
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = Object.fromEntries(await request.formData());
  try {
    const company = await api<Company>("/companies", { method: "POST", json: form });
    setCompanyId(company.id);
  } catch (e) {
    if (e instanceof ApiError) return { message: e.message, fields: e.fieldErrors() };
    throw e;
  }
  throw redirect("/");
}

export default function Setup({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const err = actionData?.fields ?? {};
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <span className="label-mono text-link">Step 1 of 1</span>
          <CardTitle>Tell us about your gas station</CardTitle>
          <CardDescription>
            This goes on your BIR reports. You can change it later, and you can leave TIN and RDO blank for now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="flex flex-col gap-4">
            {actionData?.message && <Alert>{actionData.message}</Alert>}
            <Field label="Registered business name" name="name" placeholder="San Isidro Fuels Inc." error={err.name} required />
            <Field label="Station name (optional)" name="tradeName" placeholder="Petron Brgy. San Isidro" error={err.tradeName} />
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="TIN" name="tin" placeholder="000-000-000-00000" inputMode="numeric" error={err.tin} />
              <Field label="RDO code" name="rdoCode" placeholder="043" inputMode="numeric" error={err.rdoCode} />
            </div>
            <Field label="Business address" name="address" error={err.address} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-taxType">Tax type</Label>
              <NativeSelect id="f-taxType" name="taxType" defaultValue="VAT">
                <option value="VAT">VAT-registered (12% VAT)</option>
                <option value="NON_VAT">Non-VAT (percentage tax)</option>
              </NativeSelect>
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Setting up…" : "Set up my station"}
            </Button>
            <p className="text-xs text-muted-foreground">
              We'll load a starter chart of accounts made for gas stations: fuel sales, input and output VAT,
              withholding tax, GCash clearing and more.
            </p>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
