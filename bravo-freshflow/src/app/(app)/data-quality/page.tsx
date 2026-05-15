import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function DataQualityPage() {
  return (
    <>
      <PageHeader title="Data Quality" description="Integrity issues and integration health for CIO / Admin." />
      <PhasePlaceholder phase="PHASE_12" />
    </>
  );
}
