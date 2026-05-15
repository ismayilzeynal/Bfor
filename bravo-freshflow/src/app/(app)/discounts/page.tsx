import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function DiscountsPage() {
  return (
    <>
      <PageHeader title="Discounts" description="Discount approvals, active campaigns, margin guard." />
      <PhasePlaceholder phase="PHASE_10" />
    </>
  );
}
