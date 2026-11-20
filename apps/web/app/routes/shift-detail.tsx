import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { formatDate, formatLitres } from "@nines/shared";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { LoadingBlock, Money, OverShort, PageHeader } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ApiError, api } from "~/lib/api";
import { useFetch } from "~/lib/use-fetch";
import type { Shift } from "~/lib/types";

export function meta() {
  return [{ title: "Shift · Nines" }];
}

export default function ShiftDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useFetch<Shift>(id ? `/api/shifts/${id}` : null);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function remove() {
    if (!id) return;
    setPending(true);
    try {
      await api(`/api/shifts/${id}`, { method: "DELETE" });
      navigate("/shifts");
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : "Could not delete the shift.");
      setPending(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading shift…" />;
  if (error || !data) return <p className="text-sm text-destructive">{error || "That shift was not found."}</p>;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`${data.name} shift`}
        description={formatDate(data.businessDate)}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/shifts/${data.id}/edit`}>Edit</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirm(true)}>
              Delete
            </Button>
          </div>
        }
      />
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Fuel sales</p>
            <p className="text-2xl font-semibold">
              <Money value={data.expectedCentavos} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Counted</p>
            <p className="text-2xl font-semibold">
              <Money value={data.tenderedCentavos} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Cash check</p>
            <p className="text-2xl">
              <OverShort value={data.overShortCentavos} />
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pump</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Closing</TableHead>
                <TableHead>Litres</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.readings.map((reading) => (
                <TableRow key={reading.pumpId}>
                  <TableCell>
                    {reading.pumpName}
                    <span className="block text-xs text-muted-foreground">{reading.productName}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatLitres(reading.openingCentilitres)}</TableCell>
                  <TableCell className="tabular-nums">{formatLitres(reading.closingCentilitres)}</TableCell>
                  <TableCell className="tabular-nums">{formatLitres(reading.litresCentilitres)}</TableCell>
                  <TableCell>
                    <Money value={reading.pricePerLitreCentavos} />
                  </TableCell>
                  <TableCell>
                    <Money value={reading.amountCentavos} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-2 pt-5 text-sm">
          <p>
            Cash <Money value={data.cashCentavos} />
          </p>
          <p>
            Card <Money value={data.cardCentavos} />
          </p>
          <p>
            Credit <Money value={data.creditCentavos} />
          </p>
          {data.charges.map((charge) => (
            <p key={charge.id}>
              <Link className="underline-offset-4 hover:underline" to={`/receivables/${charge.customerId}`}>
                {charge.customerName}
              </Link>{" "}
              <Money value={charge.amountCentavos} />
              {charge.note ? ` · ${charge.note}` : ""}
            </p>
          ))}
          {data.notes ? <p className="text-muted-foreground">{data.notes}</p> : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Delete this shift?"
        description="The meter readings and any credit from this shift will be removed. This cannot be undone."
        confirmLabel="Delete shift"
        pending={pending}
        onConfirm={remove}
        onOpenChange={setConfirm}
      />
    </div>
  );
}
