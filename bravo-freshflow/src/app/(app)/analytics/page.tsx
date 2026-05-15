import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Six-tab deep dive into loss, stores, categories, suppliers, AI, ESG." />
      <PhasePlaceholder phase="PHASE_11" />
    </>
  );
}
