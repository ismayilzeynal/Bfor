import { PageHeader } from "@/components/common/page-header";
import { PhasePlaceholder } from "@/components/common/phase-placeholder";

export default function WhatIfLabPage() {
  return (
    <>
      <PageHeader title="What-If Lab" description="Stand-alone sandbox for scenario simulation." />
      <PhasePlaceholder phase="PHASE_7" />
    </>
  );
}
