"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";

import {
  DISCOUNT_TAB_LABELS,
  DISCOUNT_TAB_ORDER,
  EMPTY_DISCOUNT_FILTERS,
  applyDiscountFilters,
  matchesDiscountTab,
  scopeDiscountsByRole,
  type DiscountFilters,
  type DiscountRow,
  type DiscountTab,
} from "@/components/discounts/types";
import { useDiscountsData } from "@/components/discounts/use-discounts-data";
import { StatsStrip } from "@/components/discounts/stats-strip";
import { DiscountsToolbar } from "@/components/discounts/discounts-toolbar";
import { DiscountCard } from "@/components/discounts/discount-card";
import { DiscountAdjustModal } from "@/components/discounts/discount-adjust-modal";
import { ActiveLiveSection } from "@/components/discounts/active-live-section";
import { MarginAlarm } from "@/components/discounts/margin-alarm";
import { DiscountDetailDrawer } from "@/components/discounts/discount-detail-drawer";

export default function DiscountsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setDiscountStatus = useActionsStore((s) => s.setDiscountStatus);
  const setDiscountOverride = useActionsStore((s) => s.setDiscountOverride);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { loading, rows, stores } = useDiscountsData();

  const [tab, setTab] = useState<DiscountTab>("suggested");
  const [filters, setFilters] = useState<DiscountFilters>(EMPTY_DISCOUNT_FILTERS);
  const [adjustRow, setAdjustRow] = useState<DiscountRow | null>(null);
  const [detailRow, setDetailRow] = useState<DiscountRow | null>(null);

  const scopedRows = useMemo(() => scopeDiscountsByRole(rows, currentUser), [rows, currentUser]);

  const tabRows = useMemo(
    () => scopedRows.filter((r) => matchesDiscountTab(r.discount, tab)),
    [scopedRows, tab]
  );

  const filteredRows = useMemo(
    () => applyDiscountFilters(tabRows, filters),
    [tabRows, filters]
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<DiscountTab, number>;
    for (const t of DISCOUNT_TAB_ORDER) {
      counts[t] = scopedRows.filter((r) => matchesDiscountTab(r.discount, t)).length;
    }
    return counts;
  }, [scopedRows]);

  const handleApprove = useCallback(
    (row: DiscountRow) => {
      const d = row.discount;
      setDiscountStatus(d.id, "active");
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "approve_discount",
        entity_type: "discount",
        entity_id: d.id,
        old_value: { status: d.status },
        new_value: { status: "active" },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Discount activated", {
        description: `${row.product?.name ?? "Discount"} — ${Math.round(d.discount_pct * 100)}%`,
      });
    },
    [setDiscountStatus, appendAudit, currentUser.id]
  );

  const handleReject = useCallback(
    (row: DiscountRow) => {
      const d = row.discount;
      setDiscountStatus(d.id, "rejected", { rejectionReason: "manual" });
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "reject_discount",
        entity_type: "discount",
        entity_id: d.id,
        old_value: { status: d.status },
        new_value: { status: "rejected" },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Discount rejected", { description: row.product?.name ?? "" });
    },
    [setDiscountStatus, appendAudit, currentUser.id]
  );

  const handleAdjustSave = useCallback(
    (input: {
      discountPct: number;
      startDatetime: string;
      endDatetime: string;
      marginPct: number;
      overrideBreach: boolean;
    }) => {
      if (!adjustRow) return;
      const d = adjustRow.discount;
      setDiscountOverride(d.id, {
        discount_pct: input.discountPct,
        start_datetime: input.startDatetime,
        end_datetime: input.endDatetime,
        current_margin_after_discount_pct: input.marginPct,
        minimum_margin_checked: !input.overrideBreach,
        override_below_margin: input.overrideBreach,
      });
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "adjust_discount",
        entity_type: "discount",
        entity_id: d.id,
        old_value: {
          discount_pct: d.discount_pct,
          start_datetime: d.start_datetime,
          end_datetime: d.end_datetime,
        },
        new_value: input,
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Discount adjusted", {
        description: `${adjustRow.product?.name ?? ""} → ${Math.round(input.discountPct * 100)}%`,
      });
      setAdjustRow(null);
    },
    [adjustRow, setDiscountOverride, appendAudit, currentUser.id]
  );

  function reviewBreaches() {
    setTab("active");
    setFilters({ ...filters, marginBreachedOnly: true });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Discounts"
        description="Approvals, active campaigns, margin guard."
      />

      {loading ? (
        <>
          <Skeleton className="h-[80px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[400px]" />
        </>
      ) : (
        <>
          <StatsStrip rows={scopedRows} />

          <ActiveLiveSection rows={scopedRows} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as DiscountTab)}>
            <TabsList>
              {DISCOUNT_TAB_ORDER.map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {DISCOUNT_TAB_LABELS[t]}
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {tabCounts[t]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <DiscountsToolbar
            filters={filters}
            onFilters={setFilters}
            stores={stores}
            totalRows={tabRows.length}
            visibleRows={filteredRows.length}
          />

          {filteredRows.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row) => (
                  <motion.div
                    key={row.discount.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DiscountCard
                      row={row}
                      onApprove={() => handleApprove(row)}
                      onReject={() => handleReject(row)}
                      onAdjust={() => setAdjustRow(row)}
                      onView={() => setDetailRow(row)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <MarginAlarm rows={scopedRows} onReview={reviewBreaches} />

      <DiscountAdjustModal
        row={adjustRow}
        onCancel={() => setAdjustRow(null)}
        onConfirm={handleAdjustSave}
      />

      <DiscountDetailDrawer row={detailRow} onOpenChange={(o) => !o && setDetailRow(null)} />
    </div>
  );
}

function EmptyState({ tab }: { tab: DiscountTab }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-12 text-center">
      <div className="text-sm font-semibold">No discounts in this view</div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Nothing matched the &quot;{DISCOUNT_TAB_LABELS[tab]}&quot; tab.
      </p>
    </div>
  );
}
