import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Notification center with tabs, filters, grouping." />
      <PhasePlaceholder phase="PHASE_13" />
    </>
  );
}
