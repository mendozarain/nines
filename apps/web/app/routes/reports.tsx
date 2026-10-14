import { ComingSoon } from "~/components/coming-soon";
import { PageHeader } from "~/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="BIR reports" title="BIR reports" description="Generated from your sales and disbursements." />
      <ComingSoon
        items={[
          "Sales and purchase journals.",
          "Summary and detailed lists of sales and purchases (SLS / SLP).",
          "Quarterly VAT return worksheet (2550Q), or 2551Q for non-VAT stations.",
          "Withholding: 0619-E, 1601-EQ, 2307 certificates, SAWT, QAP and the 1604-E alphalist.",
        ]}
      />
    </>
  );
}
