import { ComingSoon } from "~/components/coming-soon";
import { PageHeader } from "~/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Disbursements" title="Disbursements" description="Every peso that leaves the station." />
      <ComingSoon
        items={[
          "Write check or cash vouchers for fuel deliveries, payroll, utilities and petty cash.",
          "Record the supplier's TIN, input VAT and expanded withholding tax on each payment.",
          "Print BIR Form 2307 for suppliers you withheld from.",
        ]}
      />
    </>
  );
}
