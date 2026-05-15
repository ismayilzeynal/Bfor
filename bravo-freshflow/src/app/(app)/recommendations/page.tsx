import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function RecommendationsPage() {
  return (
    <>
      <PageHeader title="Recommendations" description="Triage inbox for managers; card-based feed." />
      <PhasePlaceholder phase="PHASE_8" />
    </>
  );
}
