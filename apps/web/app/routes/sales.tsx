import { ComingSoon } from "~/components/coming-soon";
import { PageHeader } from "~/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Sales" description="Pump readings, shift closings and charge invoices." />
      <ComingSoon
        items={[
          "Close a shift: enter opening and closing meter readings per pump and Nines computes liters and pesos.",
          "Count the remittance: cash, GCash/Maya and card, with any short or over flagged.",
          "Issue charge invoices to fleet and suki customers on credit.",
          "12% VAT is split out automatically from VAT-inclusive pump prices.",
        ]}
      />
    </>
  );
}
