"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Info, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApproveDialog } from "@/components/modals/approve-dialog";
import { RejectSheet } from "@/components/modals/reject-sheet";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import type { RiskyRow } from "@/components/products/types";

import {
  loadProductDetailsBundle,
  type ProductDetailsBundle,
} from "@/components/products/details/details-data";
import { StickyHeader } from "@/components/products/details/sticky-header";
import { ColumnOne } from "@/components/products/details/column-one";
import { RiskBreakdownCard } from "@/components/products/details/risk-breakdown-card";
import { ExpiryTimelineCard } from "@/components/products/details/expiry-timeline-card";
import { DataConfidenceCard } from "@/components/products/details/data-confidence-card";
import { AiRecommendationPanel } from "@/components/products/details/ai-recommendation-panel";
import { WhatIfSimulator } from "@/components/whatif/whatif-simulator";
import { AuditLogDrawer } from "@/components/products/details/audit-log-drawer";
import { RescueModeModal } from "@/components/modals/rescue-mode-modal";
import { ActionImpactAnimation } from "@/components/modals/action-impact-animation";
import { computeScenarioImpact } from "@/lib/scenario-calculator";

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const approve = useActionsStore((s) => s.approve);
  const reject = useActionsStore((s) => s.reject);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const [bundle, setBundle] = useState<ProductDetailsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProductDetailsBundle(params.id).then((b) => {
      if (cancelled) return;
      if (!b) {
        setNotFound(true);
      } else {
        setBundle(b);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const asRow = useCallback((): RiskyRow | null => {
    if (!bundle || !bundle.prediction) return null;
    return {
      id: bundle.prediction.id,
      prediction: bundle.prediction,
      product: bundle.product,
      store: bundle.store,
      category: bundle.category,
      supplier: bundle.supplier,
      recommendation: bundle.recommendation,
    };
  }, [bundle]);

  const handleApprove = useCallback(
    (row: RiskyRow, note: string | null) => {
      if (!row.recommendation) {
        setApproveOpen(false);
        return;
      }
      approve({ recommendation_id: row.recommendation.id, user_id: currentUser.id, note });
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "approve_recommendation",
        entity_type: "recommendation",
        entity_id: row.recommendation.id,
        old_value: { status: row.recommendation.status },
        new_value: { status: "approved", note },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Recommendation approved", {
        description: `${row.product.name} — tasks created for ${row.store.code}.`,
        action: { label: "View tasks", onClick: () => router.push("/tasks") },
      });
      setApproveOpen(false);
      setImpactOpen(true);
    },
    [approve, appendAudit, currentUser.id, router]
  );

  const handleReject = useCallback(
    (row: RiskyRow, reasonCodes: string[], note: string | null) => {
      if (!row.recommendation) {
        setRejectOpen(false);
        return;
      }
      reject({
        recommendation_id: row.recommendation.id,
        user_id: currentUser.id,
        note,
        reason_codes: reasonCodes,
      });
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "reject_recommendation",
        entity_type: "recommendation",
        entity_id: row.recommendation.id,
        old_value: { status: row.recommendation.status },
        new_value: { status: "rejected", reasons: reasonCodes, note },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Recommendation rejected", { description: row.product.name });
      setRejectOpen(false);
    },
    [reject, appendAudit, currentUser.id]
  );

  function scrollToWhatif() {
    const el = document.getElementById("whatif");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return <LoadingState />;
  }

  if (notFound || !bundle) {
    return <NotFoundState />;
  }

  const row = asRow();

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <StickyHeader
        product={bundle.product}
        prediction={bundle.prediction}
        onOpenAuditLog={() => setAuditOpen(true)}
        onStartRescue={bundle.prediction ? () => setRescueOpen(true) : undefined}
      />

      {bundle.prediction ? (
        <WhatIfSimulator
          product={bundle.product}
          store={bundle.store}
          baseline={{
            currentStock: bundle.prediction.current_stock,
            avgDailySales7d: bundle.prediction.avg_daily_sales_7d,
            daysToExpiry: bundle.prediction.days_to_expiry,
            costPrice: bundle.product.cost_price,
            salePrice: bundle.product.sale_price,
            minimumMarginPct: bundle.product.minimum_margin_pct,
            dataConfidence: bundle.prediction.data_confidence_score,
          }}
          candidateTargetStores={bundle.candidateTargetStores}
          candidateCompanions={bundle.candidateCompanions}
          onApply={(_scenario, _result) => {
            if (bundle.recommendation) setApproveOpen(true);
          }}
          approveDisabled={!bundle.recommendation}
          approveDisabledReason={
            bundle.recommendation ? undefined : "No active recommendation to approve."
          }
          variant="embedded"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ColumnOne
            product={bundle.product}
            store={bundle.store}
            category={bundle.category}
            supplier={bundle.supplier}
            prediction={bundle.prediction}
            snapshots={bundle.snapshots}
            batches={bundle.activeBatches}
          />
        </div>

        <div className="space-y-4 lg:col-span-5">
          {bundle.prediction ? (
            <RiskBreakdownCard prediction={bundle.prediction} />
          ) : (
            <Card>
              <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Info className="size-4" aria-hidden />
                No active risk prediction.
              </CardContent>
            </Card>
          )}
          {bundle.prediction ? (
            <ExpiryTimelineCard prediction={bundle.prediction} />
          ) : null}
          {bundle.prediction ? (
            <DataConfidenceCard
              prediction={bundle.prediction}
              snapshots={bundle.snapshots}
              batches={bundle.activeBatches}
              sales={bundle.sales}
            />
          ) : null}
        </div>

        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-32">
            <AiRecommendationPanel
              recommendation={bundle.recommendation}
              onApproveClick={() => setApproveOpen(true)}
              onRejectClick={() => setRejectOpen(true)}
              onIgnoreClick={() => {
                if (!bundle.recommendation) return;
                reject({
                  recommendation_id: bundle.recommendation.id,
                  user_id: currentUser.id,
                  note: "ignored",
                  reason_codes: ["ignored"],
                });
                toast("Recommendation ignored", {
                  description: bundle.product.name,
                });
              }}
              onCompareClick={scrollToWhatif}
            />
          </div>
        </div>
      </div>

      <ApproveDialog
        row={approveOpen ? row : null}
        onCancel={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />
      <RejectSheet
        row={rejectOpen ? row : null}
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <AuditLogDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        baseAudit={bundle.audit}
        users={bundle.users}
        recommendation={bundle.recommendation}
      />

      <RescueModeModal
        open={rescueOpen}
        onClose={() => setRescueOpen(false)}
        product={bundle.product}
        store={bundle.store}
        prediction={bundle.prediction ?? null}
        recommendation={bundle.recommendation ?? null}
      />

      {bundle.prediction ? (
        (() => {
          const baseline = {
            currentStock: bundle.prediction.current_stock,
            avgDailySales: bundle.prediction.avg_daily_sales_7d,
            daysToExpiry: bundle.prediction.days_to_expiry,
            costPrice: bundle.product.cost_price,
            salePrice: bundle.product.sale_price,
            minimumMarginPct: bundle.product.minimum_margin_pct,
            dataConfidence: bundle.prediction.data_confidence_score,
          };
          const impact = computeScenarioImpact(baseline, "combined");
          return (
            <ActionImpactAnimation
              open={impactOpen}
              onClose={() => setImpactOpen(false)}
              productName={bundle.product.name}
              potentialLossBefore={impact.K}
              recoveredValueAfter={impact.actionNetGain}
              riskBefore={impact.riskBeforePct}
              riskAfter={impact.riskAfterPct}
            />
          );
        })()
      ) : null}

      {bundle.recommendation ? (
        <MobileActionBar
          onApprove={() => setApproveOpen(true)}
          onReject={() => setRejectOpen(true)}
          onDetails={() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          }
        />
      ) : null}
    </div>
  );
}

function MobileActionBar({
  onApprove,
  onReject,
  onDetails,
}: {
  onApprove: () => void;
  onReject: () => void;
  onDetails: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-background/95 p-2.5 shadow-lg backdrop-blur md:hidden">
      <Button onClick={onApprove} className="flex-1 gap-1.5">
        <CheckCircle2 className="size-4" aria-hidden />
        Approve
      </Button>
      <Button variant="outline" onClick={onReject} className="flex-1 gap-1.5">
        <ShieldOff className="size-4" aria-hidden />
        Reject
      </Button>
      <Button variant="ghost" onClick={onDetails} aria-label="Top">
        Details
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[180px]" />
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[260px]" />
          <Skeleton className="h-[240px]" />
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border bg-muted/50 p-3">
        <Info className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Product not found</h2>
        <p className="text-sm text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/products">
          <ArrowLeft className="mr-1.5 size-3.5" aria-hidden />
          Back to products
        </Link>
      </Button>
    </div>
  );
}
