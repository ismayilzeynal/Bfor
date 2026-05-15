"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";

import {
  EMPTY_TRANSFER_FILTERS,
  TRANSFER_TAB_LABELS,
  TRANSFER_TAB_ORDER,
  applyTransferFilters,
  matchesTransferTab,
  scopeTransfersByRole,
  type TransferFilters,
  type TransferRow,
  type TransferTab,
} from "@/components/transfers/types";
import { useTransfersData } from "@/components/transfers/use-transfers-data";
import { NetworkMap } from "@/components/transfers/network-map";
import { TransfersToolbar } from "@/components/transfers/transfers-toolbar";
import { TransferCard } from "@/components/transfers/transfer-card";
import { TransferDetailDrawer } from "@/components/transfers/transfer-detail-drawer";

export default function TransfersPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setTransferStatus = useActionsStore((s) => s.setTransferStatus);
  const approveTransferStep = useActionsStore((s) => s.approveTransferStep);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { loading, rows, stores } = useTransfersData();

  const [tab, setTab] = useState<TransferTab>("suggested");
  const [filters, setFilters] = useState<TransferFilters>(EMPTY_TRANSFER_FILTERS);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<TransferRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canBulkApprove =
    currentUser.role === "logistics_manager" ||
    currentUser.role === "coo" ||
    currentUser.role === "ceo";

  const scopedRows = useMemo(() => scopeTransfersByRole(rows, currentUser), [rows, currentUser]);

  const tabRows = useMemo(
    () => scopedRows.filter((r) => matchesTransferTab(r.transfer, tab)),
    [scopedRows, tab]
  );

  const filteredRows = useMemo(() => {
    const base = applyTransferFilters(tabRows, filters);
    if (selectedStoreId) {
      return base.filter(
        (r) => r.transfer.from_store_id === selectedStoreId || r.transfer.to_store_id === selectedStoreId
      );
    }
    return base;
  }, [tabRows, filters, selectedStoreId]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<TransferTab, number>;
    for (const t of TRANSFER_TAB_ORDER) {
      counts[t] = scopedRows.filter((r) => matchesTransferTab(r.transfer, t)).length;
    }
    return counts;
  }, [scopedRows]);

  const handleApprove = useCallback(
    (row: TransferRow) => {
      const t = row.transfer;
      approveTransferStep(t.id, "source_manager", currentUser.id);
      approveTransferStep(t.id, "target_manager", currentUser.id);
      approveTransferStep(t.id, "logistics", currentUser.id);
      setTransferStatus(t.id, "approved");
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "approve_transfer",
        entity_type: "transfer",
        entity_id: t.id,
        old_value: { status: t.status },
        new_value: { status: "approved" },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Transfer approved", {
        description: `${row.product?.name ?? "Transfer"} — ${row.fromStore?.code} → ${row.toStore?.code}`,
      });
    },
    [approveTransferStep, setTransferStatus, appendAudit, currentUser.id]
  );

  const handleReject = useCallback(
    (row: TransferRow) => {
      const t = row.transfer;
      setTransferStatus(t.id, "cancelled", { rejectionReason: "manual" });
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action: "reject_transfer",
        entity_type: "transfer",
        entity_id: t.id,
        old_value: { status: t.status },
        new_value: { status: "cancelled" },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success("Transfer cancelled", { description: row.product?.name ?? "" });
    },
    [setTransferStatus, appendAudit, currentUser.id]
  );

  const selectableRows = useMemo(
    () => filteredRows.filter((r) => r.transfer.status === "suggested"),
    [filteredRows]
  );

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function bulkApprove() {
    const targets = selectableRows.filter((r) => selectedIds.has(r.transfer.id));
    for (const r of targets) handleApprove(r);
    toast.success(`${targets.length} transfers approved`);
    clearSelection();
  }

  function bulkReject() {
    const targets = selectableRows.filter((r) => selectedIds.has(r.transfer.id));
    for (const r of targets) handleReject(r);
    toast.success(`${targets.length} transfers cancelled`);
    clearSelection();
  }

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.transfer.id) && r.transfer.status === "suggested"),
    [filteredRows, selectedIds]
  );
  const selectedNetSaved = selectedRows.reduce((sum, r) => sum + r.transfer.net_saved_value, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transfers"
        description="Inter-store transfer approval queue with live network map."
      />

      {loading ? (
        <>
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[120px]" />
        </>
      ) : (
        <>
          <NetworkMap
            rows={scopedRows}
            stores={stores}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
          />

          <Tabs value={tab} onValueChange={(v) => setTab(v as TransferTab)}>
            <TabsList>
              {TRANSFER_TAB_ORDER.map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {TRANSFER_TAB_LABELS[t]}
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {tabCounts[t]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <TransfersToolbar
            filters={filters}
            onFilters={setFilters}
            stores={stores}
            totalRows={tabRows.length}
            visibleRows={filteredRows.length}
          />

          {filteredRows.length === 0 ? (
            <EmptyState tab={tab} hasFilters={JSON.stringify(filters) !== JSON.stringify(EMPTY_TRANSFER_FILTERS)} />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row) => (
                  <motion.div
                    key={row.transfer.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    <TransferCard
                      row={row}
                      selected={selectedIds.has(row.transfer.id)}
                      onSelect={(v) => toggleSelect(row.transfer.id, v)}
                      onApprove={() => handleApprove(row)}
                      onReject={() => handleReject(row)}
                      onView={() => setDetailRow(row)}
                      canBulkSelect={canBulkApprove}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {selectedRows.length > 0 ? (
            <SelectionBar
              count={selectedRows.length}
              totalNet={selectedNetSaved}
              onClear={clearSelection}
              onApprove={bulkApprove}
              onReject={bulkReject}
            />
          ) : null}
        </>
      )}

      <TransferDetailDrawer row={detailRow} onOpenChange={(o) => !o && setDetailRow(null)} />
    </div>
  );
}

function EmptyState({ tab, hasFilters }: { tab: TransferTab; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-12 text-center">
      <div className="text-sm font-semibold">No transfers in this view</div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? "Try clearing filters or switching tabs."
          : `Nothing matched the "${TRANSFER_TAB_LABELS[tab]}" tab.`}
      </p>
    </div>
  );
}

function SelectionBar({
  count,
  totalNet,
  onClear,
  onApprove,
  onReject,
}: {
  count: number;
  totalNet: number;
  onClear: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
      <span className="font-medium">{count} selected</span>
      <span className={cn("text-xs", totalNet >= 0 ? "text-emerald-700" : "text-rose-700")}>
        Net saved {formatAZN(totalNet, { compact: true, sign: true })}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={onApprove}>
          <Sparkles className="mr-1 size-3.5" /> Approve all
        </Button>
        <Button size="sm" variant="outline" onClick={onReject}>
          Cancel all
        </Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={onClear} aria-label="Clear">
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
