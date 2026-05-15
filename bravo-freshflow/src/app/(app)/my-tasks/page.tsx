import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function MyTasksPage() {
  return (
    <>
      <PageHeader title="My Tasks" description="Mobile-first employee task view." />
      <PhasePlaceholder phase="PHASE_9" />
    </>
  );
}
