"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Sparkles, X } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import {
  loadCategories,
  loadProducts,
  loadRecommendations,
  loadRecommendationScenarios,
  loadRiskPredictions,
  loadStores,
  loadSuppliers,
} from "@/lib/mock-loader";
import { formatAZN, formatPercent } from "@/lib/formatters";
import { MOCK_DATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";
import type {
  Category,
  Product,
  Recommendation,
  RecommendationScenario,
  RiskPrediction,
  Store,
  Supplier,
} from "@/types";

import { buildRows, type RiskyRow } from "@/components/products/types";
import { ApproveDialog } from "@/components/modals/approve-dialog";
import { RejectSheet } from "@/components/modals/reject-sheet";
import { BulkActionModal } from "@/components/modals/bulk-action-modal";
import { RecommendationsToolbar } from "@/components/recommendations/toolbar";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import {
  EMPTY_REC_FILTERS,
  TAB_LABELS,
  TAB_ORDER,
  applyRecFilters,
  effectiveStatus,
  matchesTab,
  sortRows,
  type RecommendationFilters,
  type RecommendationRow,
  type RecommendationSort,
  type RecommendationTab,
} from "@/components/recommendations/types";

interface RecData {
  predictions: RiskPrediction[];
  products: Product[];
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  recommendations: Recommendation[];
  scenarios: RecommendationScenario[];
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <RecommendationsView />
    </Suspense>
  );
}

function Fallback() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Recommendations"
        description="Triage inbox for managers — review, approve and reject AI suggestions."
      />
      <Skeleton className="h-[120px]" />
      <Skeleton className="h-[420px]" />
    </div>
  );
}

function RecommendationsView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const decisions = useActionsStore((s) => s.decisions);
  const approve = useActionsStore((s) => s.approve);
  const reject = useActionsStore((s) => s.reject);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const [data, setData] = useState<RecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RecommendationTab>("pending");
  const [filters, setFilters] = useState<RecommendationFilters>(EMPTY_REC_FILTERS);
  const [sort, setSort] = useState<RecommendationSort>("net_saved_desc");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const [approveTarget, setApproveTarget] = useState<RiskyRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RiskyRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<"approve" | "reject">("approve");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadRiskPredictions(),
      loadProducts(),
      loadStores(),
      loadCategories(),
      loadSuppliers(),
      loadRecommendations(),
      loadRecommendationScenarios(),
    ]).then(
      ([predictions, products, stores, categories, suppliers, recommendations, scenarios]) => {
        if (cancelled) return;
        setData({
          predictions,
          products,
          stores,
          categories,
          suppliers,
          recommendations,
          scenarios,
        });
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Build row records
  const allRows = useMemo<RecommendationRow[]>(() => {
    if (!data) return [];
    const baseRows = buildRows(
      data.predictions,
      data.products,
      data.stores,
      data.categories,
      data.suppliers,
      data.recommendations
    );
    const byProductStore = new Map<string, RiskyRow>();
    for (const r of baseRows) byProductStore.set(`${r.product.id}|${r.store.id}`, r);

    const scenariosByRec = new Map<string, RecommendationScenario[]>();
    for (const s of data.scenarios) {
      const arr = scenariosByRec.get(s.recommendation_id) ?? [];
      arr.push(s);
      scenariosByRec.set(s.recommendation_id, arr);
    }

    const decisionByRec = new Map(decisions.map((d) => [d.recommendation_id, d]));

    const out: RecommendationRow[] = [];
    for (const rec of data.recommendations) {
      const key = `${rec.product_id}|${rec.store_id}`;
      const baseRow = byProductStore.get(key);
      if (!baseRow) continue;
      const merged: RiskyRow = baseRow.recommendation?.id === rec.id
        ? baseRow
        : { ...baseRow, recommendation: rec };
      const decision = decisionByRec.get(rec.id);
      out.push({
        row: merged,
        recommendation: rec,
        effectiveStatus: effectiveStatus(rec, decision),
        decision,
        scenarios: scenariosByRec.get(rec.id) ?? [],
      });
    }

    // Scope for store-bound roles
    const storeBound =
      (currentUser.role === "store_manager" ||
        currentUser.role === "supervisor" ||
        currentUser.role === "employee") &&
      currentUser.store_id;
    if (storeBound) return out.filter((r) => r.row.store.id === currentUser.store_id);
    return out;
  }, [data, decisions, currentUser]);

  const filteredAll = useMemo(
    () => applyRecFilters(allRows, filters, currentUser.role),
    [allRows, filters, currentUser.role]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<RecommendationTab, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      expired: 0,
      all: 0,
    };
    for (const r of filteredAll) {
      counts.all += 1;
      if (matchesTab(r.effectiveStatus, "pending")) counts.pending += 1;
      if (matchesTab(r.effectiveStatus, "approved")) counts.approved += 1;
      if (matchesTab(r.effectiveStatus, "rejected")) counts.rejected += 1;
      if (matchesTab(r.effectiveStatus, "completed")) counts.completed += 1;
      if (matchesTab(r.effectiveStatus, "expired")) counts.expired += 1;
    }
    return counts;
  }, [filteredAll]);

  const visibleRows = useMemo(() => {
    const filtered = filteredAll.filter((r) => matchesTab(r.effectiveStatus, tab));
    return sortRows(filtered, sort);
  }, [filteredAll, tab, sort]);

  const acceptanceRate = useMemo(() => {
    const approved = allRows.filter((r) =>
      ["approved", "converted_to_task", "completed"].includes(r.effectiveStatus)
    ).length;
    const rejected = allRows.filter((r) => r.effectiveStatus === "rejected").length;
    const denom = approved + rejected;
    if (denom === 0) return null;
    return approved / denom;
  }, [allRows]);

  // Selection only on visible pending rows
  const selectableIds = useMemo(
    () =>
      new Set(
        visibleRows
          .filter((r) => r.effectiveStatus === "pending_approval" || r.effectiveStatus === "generated")
          .map((r) => r.recommendation.id)
      ),
    [visibleRows]
  );

  const handleSelect = useCallback((id: string, isSelected: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Drop selection IDs that aren't currently selectable (e.g. tab change)
  useEffect(() => {
    setSelection((prev) => {
      let mutated = false;
      const next = new Set<string>();
      Array.from(prev).forEach((id) => {
        if (selectableIds.has(id)) next.add(id);
        else mutated = true;
      });
      return mutated ? next : prev;
    });
  }, [selectableIds]);

  const selectedRows = useMemo(
    () => visibleRows.filter((r) => selection.has(r.recommendation.id)),
    [visibleRows, selection]
  );

  const handleApproveConfirm = useCallback(
    (row: RiskyRow, note: string | null) => {
      if (!row.recommendation) {
        setApproveTarget(null);
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
        description: `${row.product.name} — task created for ${row.store.code}.`,
        action: { label: "View tasks", onClick: () => router.push("/tasks") },
      });
      setApproveTarget(null);
    },
    [approve, appendAudit, currentUser.id, router]
  );

  const handleRejectConfirm = useCallback(
    (row: RiskyRow, reasonCodes: string[], note: string | null) => {
      if (!row.recommendation) {
        setRejectTarget(null);
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
      setRejectTarget(null);
    },
    [reject, appendAudit, currentUser.id]
  );

  const handleBulkConfirm = useCallback(
    (rows: RiskyRow[]) => {
      const valid = rows.filter((r) => r.recommendation);
      for (const r of valid) {
        if (bulkDecision === "approve") {
          approve({
            recommendation_id: r.recommendation!.id,
            user_id: currentUser.id,
            note: null,
          });
        } else {
          reject({
            recommendation_id: r.recommendation!.id,
            user_id: currentUser.id,
            note: null,
            reason_codes: ["bulk"],
          });
        }
      }
      appendAudit({
        id: `aud-${Date.now()}`,
        user_id: currentUser.id,
        action:
          bulkDecision === "approve"
            ? "bulk_approve_recommendations"
            : "bulk_reject_recommendations",
        entity_type: "recommendation",
        entity_id: `bulk-${valid.length}`,
        old_value: null,
        new_value: {
          count: valid.length,
          recommendation_ids: valid.map((r) => r.recommendation!.id),
        },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success(
        bulkDecision === "approve"
          ? `${valid.length} recommendations approved`
          : `${valid.length} recommendations rejected`,
        {
          description: `Action recorded across ${new Set(valid.map((r) => r.store.id)).size} store(s).`,
          action:
            bulkDecision === "approve"
              ? { label: "View tasks", onClick: () => router.push("/tasks") }
              : undefined,
        }
      );
      setBulkOpen(false);
      setSelection(new Set());
    },
    [bulkDecision, approve, reject, appendAudit, currentUser.id, router]
  );

  // CSV export of filtered (across all tabs, currently visible filter set on this tab)
  const handleExportCsv = useCallback(() => {
    if (visibleRows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const headers = [
      "recommendation_id",
      "product_id",
      "product_name",
      "sku",
      "store_code",
      "category",
      "action",
      "recommendation_text",
      "expected_recovered",
      "expected_cost",
      "net_saved",
      "confidence",
      "priority",
      "status",
      "approver_role",
      "created_at",
    ];
    const lines: string[] = [headers.join(",")];
    for (const r of visibleRows) {
      const rec = r.recommendation;
      lines.push(
        [
          rec.id,
          r.row.product.id,
          csvEscape(r.row.product.name),
          r.row.product.sku,
          r.row.store.code,
          csvEscape(r.row.category?.name ?? ""),
          rec.recommendation_type,
          csvEscape(rec.recommendation_text),
          String(rec.expected_recovered_value),
          String(rec.expected_cost),
          String(rec.net_saved_value),
          String(rec.confidence_score),
          rec.priority,
          r.effectiveStatus,
          rec.requires_approval_by_role ?? "",
          rec.created_at,
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recommendations-${tab}-${MOCK_DATE}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visibleRows.length} rows`);
  }, [visibleRows, tab]);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {acceptanceRate !== null ? (
        <span
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
            acceptanceRate >= 0.7
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : acceptanceRate >= 0.5
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
          )}
          title="Approved / (Approved + Rejected)"
        >
          Acceptance {formatPercent(acceptanceRate, 0)}
        </span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={handleExportCsv}
        disabled={!data}
      >
        <Download className="size-3.5" aria-hidden />
        Export CSV
      </Button>
      <Button
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => {
          setBulkDecision("approve");
          setBulkOpen(true);
        }}
        disabled={selectedRows.length === 0}
      >
        <Sparkles className="size-3.5" aria-hidden />
        Bulk approve {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => {
          setBulkDecision("reject");
          setBulkOpen(true);
        }}
        disabled={selectedRows.length === 0}
      >
        Bulk reject
      </Button>
    </div>
  );

  const canRequireApproval =
    currentUser.role === "store_manager" ||
    currentUser.role === "category_manager" ||
    currentUser.role === "logistics_manager" ||
    currentUser.role === "purchase_manager";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recommendations"
        description="Triage inbox for managers — review, approve and reject AI suggestions."
        actions={headerActions}
      />

      {loading || !data ? (
        <>
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[420px]" />
        </>
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as RecommendationTab)}>
            <TabsList className="flex h-auto flex-wrap items-center justify-start gap-1 bg-muted/40 p-1">
              {TAB_ORDER.map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {TAB_LABELS[t]}
                  <Badge
                    variant="outline"
                    className="h-5 rounded-full bg-background px-1.5 text-[10px] font-normal"
                  >
                    {tabCounts[t]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <RecommendationsToolbar
              filters={filters}
              onFilters={setFilters}
              sort={sort}
              onSort={setSort}
              stores={data.stores}
              categories={data.categories}
              totalRows={visibleRows.length}
              canRequireApproval={canRequireApproval}
            />

            {TAB_ORDER.map((t) => (
              <TabsContent key={t} value={t} className="mt-3">
                {t === tab ? (
                  <CardFeed
                    rows={visibleRows}
                    selection={selection}
                    onSelect={handleSelect}
                    onApprove={(r) => setApproveTarget(r.row)}
                    onReject={(r) => setRejectTarget(r.row)}
                    tab={t}
                  />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>

          {selectedRows.length > 0 ? (
            <SelectionBar
              count={selectedRows.length}
              totalNet={selectedRows.reduce(
                (sum, r) => sum + r.recommendation.net_saved_value,
                0
              )}
              onClear={() => setSelection(new Set())}
              onApprove={() => {
                setBulkDecision("approve");
                setBulkOpen(true);
              }}
              onReject={() => {
                setBulkDecision("reject");
                setBulkOpen(true);
              }}
            />
          ) : null}
        </>
      )}

      <ApproveDialog
        row={approveTarget}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApproveConfirm}
      />
      <RejectSheet
        row={rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />
      <BulkActionModal
        open={bulkOpen}
        rows={selectedRows.map((r) => r.row)}
        decision={bulkDecision}
        onCancel={() => setBulkOpen(false)}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}

function CardFeed({
  rows,
  selection,
  onSelect,
  onApprove,
  onReject,
  tab,
}: {
  rows: RecommendationRow[];
  selection: Set<string>;
  onSelect: (id: string, isSelected: boolean) => void;
  onApprove: (row: RecommendationRow) => void;
  onReject: (row: RecommendationRow) => void;
  tab: RecommendationTab;
}) {
  if (rows.length === 0) return <EmptyState tab={tab} />;
  return (
    <motion.div layout className="space-y-3">
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map((r) => (
          <RecommendationCard
            key={r.recommendation.id}
            row={r}
            selected={selection.has(r.recommendation.id)}
            onSelect={onSelect}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ tab }: { tab: RecommendationTab }) {
  const messages: Record<RecommendationTab, { title: string; sub: string }> = {
    pending: {
      title: "All caught up — no pending recommendations 🎉",
      sub: "When the AI surfaces new risks they will land here.",
    },
    approved: {
      title: "No approved recommendations yet",
      sub: "Approve items from the Pending tab to see them here.",
    },
    rejected: {
      title: "No rejected recommendations",
      sub: "Items you reject will land here with the reason codes.",
    },
    completed: {
      title: "Nothing completed for this view",
      sub: "Outcomes will appear here once tasks close.",
    },
    expired: {
      title: "No expired or failed items",
      sub: "Items that timed out or failed will appear here.",
    },
    all: {
      title: "No recommendations match the current filters",
      sub: "Adjust filters above to see more results.",
    },
  };
  const msg = messages[tab];
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 text-center">
      <p className="text-sm font-medium">{msg.title}</p>
      <p className="text-xs text-muted-foreground">{msg.sub}</p>
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
      <span className="text-xs text-muted-foreground">
        Net saved {formatAZN(totalNet, { compact: true, sign: true })}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={onApprove}>
          Approve all
        </Button>
        <Button size="sm" variant="outline" onClick={onReject}>
          Reject all
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function csvEscape(s: string): string {
  if (s == null) return "";
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
