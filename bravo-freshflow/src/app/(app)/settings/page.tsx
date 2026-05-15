import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Profile, preferences, demo controls." />
      <PhasePlaceholder phase="PHASE_13" />
    </>
  );
}
