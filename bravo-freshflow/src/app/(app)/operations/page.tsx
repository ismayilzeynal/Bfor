import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function OperationsPage() {
  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Today-focused view for Store Manager and COO."
      />
      <PhasePlaceholder phase="PHASE_4" />
    </>
  );
}
