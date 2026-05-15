import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  return (
    <>
      <PageHeader
        title="Product Details"
        description={`Product ${params.id} — demo centerpiece, full AI recommendation panel.`}
      />
      <PhasePlaceholder phase="PHASE_6" description="Demo centerpiece; built in PHASE_6." />
    </>
  );
}
