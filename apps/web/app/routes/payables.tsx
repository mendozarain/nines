import { ComingSoon } from "~/components/coming-soon";
import { PageHeader } from "~/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Payables" title="Accounts payable" description="Bills from suppliers and when they're due." />
      <ComingSoon
        items={[
          "Enter supplier bills for fuel deliveries, lubricants and services.",
          "See what's due this week and pay it through a disbursement.",
          "Aging by supplier.",
        ]}
      />
    </>
  );
}
