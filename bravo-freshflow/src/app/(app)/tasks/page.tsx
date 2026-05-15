import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Manager view: table, calendar, workload." />
      <PhasePlaceholder phase="PHASE_9" />
    </>
  );
}
