import { ComingSoon } from "~/components/coming-soon";
import { PageHeader } from "~/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Receivables" title="Accounts receivable" description="Who owes the station, and since when." />
      <ComingSoon
        items={[
          "See each credit customer's balance and how overdue it is (current, 30, 60, 90+ days).",
          "Record collections and partial payments against charge invoices.",
          "Send statements of account.",
          "Track 2307s received from customers for your SAWT.",
        ]}
      />
    </>
  );
}
