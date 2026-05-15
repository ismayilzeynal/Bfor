import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function TransfersPage() {
  return (
    <>
      <PageHeader title="Transfers" description="Inter-store transfer approval queue with map." />
      <PhasePlaceholder phase="PHASE_10" />
    </>
  );
}
