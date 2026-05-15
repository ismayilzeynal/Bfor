import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function AuditLogPage() {
  return (
    <>
      <PageHeader title="Audit Log" description="Full audit trail with diff viewer." />
      <PhasePlaceholder phase="PHASE_13" />
    </>
  );
}
