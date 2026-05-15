import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Risky Products"
        description="Power-user dashboard with table / grid / heatmap views."
      />
      <PhasePlaceholder phase="PHASE_5" />
    </>
  );
}
