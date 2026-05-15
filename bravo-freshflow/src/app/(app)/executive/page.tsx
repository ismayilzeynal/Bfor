import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function ExecutivePage() {
  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="KPIs, trends, AI feed and sustainability for CEO / COO / CFO."
      />
      <PhasePlaceholder phase="PHASE_3" />
    </>
  );
}
