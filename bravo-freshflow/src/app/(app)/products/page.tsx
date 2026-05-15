"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, LayoutGrid, Sparkles, Table2, ThermometerSun, X } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  loadCategories,
  loadProducts,
  loadRecommendations,
  loadRiskPredictions,
  loadStores,
  loadSuppliers,
} from "@/lib/mock-loader";
import { formatAZN } from "@/lib/formatters";
import { MOCK_DATE } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";
import type {
  Category,
  Product,
  Recommendation,
  RiskPrediction,
  Store,
  Supplier,
} from "@/types";

import {
  FiltersToolbar,
  type SavedViewItem,
} from "@/components/products/filters-toolbar";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildRows,
  type RiskyFilters,
  type RiskyRow,
  type ViewMode,
} from "@/components/products/types";
import { useUrlFilters } from "@/components/products/use-url-filters";
import { RiskyProductsTable } from "@/components/tables/risky-products-table";
import { ProductsGrid } from "@/components/products/products-grid";
import { ProductsHeatmap } from "@/components/products/products-heatmap";
import { RowPreviewSheet } from "@/components/products/row-preview-sheet";
import { ApproveDialog } from "@/components/modals/approve-dialog";
import { RejectSheet } from "@/components/modals/reject-sheet";
import { BulkActionModal } from "@/components/modals/bulk-action-modal";

interface ProductsData {
  predictions: RiskPrediction[];
  products: Product[];
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  recommendations: Recommendation[];
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsView />
    </Suspense>
  );
}

function ProductsFallback() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Risky Products"
        description="Power-user dashboard with table, grid and heatmap views."
        actions={<Skeleton className="h-9 w-[160px]" />}
      />
      <Skeleton className="h-[120px]" />
      <Skeleton className="h-[480px]" />
    </div>
  );
}

function ProductsView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const decisions = useActionsStore((s) => s.decisions);
  const approve = useActionsStore((s) => s.approve);
  const reject = useActionsStore((s) => s.reject);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { filters, setFilters, view, setView, reset } = useUrlFilters();

  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [previewRow, setPreviewRow] = useState<RiskyRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<RiskyRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RiskyRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<"approve" | "reject">("approve");
  const [userSavedViews, setUserSavedViews] = useState<SavedViewItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadRiskPredictions(),
      loadProducts(),
      loadStores(),
      loadCategories(),
      loadSuppliers(),
      loadRecommendations(),
    ]).then(([predictions, products, stores, categories, suppliers, recommendations]) => {
      if (cancelled) return;
      setData({ predictions, products, stores, categories, suppliers, recommendations });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Scope rows for store-bound roles
  const scopedRows = useMemo<RiskyRow[]>(() => {
    if (!data) return [];
    const rows = buildRows(
      data.predictions,
      data.products,
      data.stores,
      data.categories,
      data.suppliers,
      data.recommendations
    );
    const storeBound =
      (currentUser.role === "store_manager" ||
        currentUser.role === "supervisor" ||
        currentUser.role === "employee") &&
      currentUser.store_id;
    if (storeBound) return rows.filter((r) => r.store.id === currentUser.store_id);
    return rows;
  }, [data, currentUser]);

  const filteredRows = useMemo(() => applyFilters(scopedRows, filters), [scopedRows, filters]);

  const builtInViews = useMemo<SavedViewItem[]>(() => {
    const today = MOCK_DATE;
    const dairy = data?.categories.find((c) => /süd/i.test(c.name))?.id;
    const myStore = currentUser.store_id;

    const views: SavedViewItem[] = [
      {
        id: "built-all-critical",
        name: "All Critical",
        builtIn: true,
        filters: { ...EMPTY_FILTERS, riskLevels: ["critical"] },
      },
      {
        id: "built-expiring-today",
        name: "Expiring Today",
        builtIn: true,
        filters: { ...EMPTY_FILTERS, expiryFrom: today, expiryTo: today },
      },
    ];
    if (dairy) {
      views.push({
        id: "built-dairy",
        name: "Dairy",
        builtIn: true,
        filters: { ...EMPTY_FILTERS, categoryIds: [dairy] },
      });
    }
    if (myStore) {
      views.push({
        id: "built-my-store",
        name: "My Store",
        builtIn: true,
        filters: { ...EMPTY_FILTERS, storeIds: [myStore] },
      });
    }
    return views;
  }, [data, currentUser]);

  const allViews = useMemo(() => [...builtInViews, ...userSavedViews], [builtInViews, userSavedViews]);

  const handleApplyView = useCallback(
    (id: string) => {
      const v = allViews.find((x) => x.id === id);
      if (!v) return;
      setFilters(v.filters);
      toast.success(`Applied view: ${v.name}`);
    },
    [allViews, setFilters]
  );

  const handleSaveCurrent = useCallback(
    (name: string) => {
      const id = `sv-${Date.now()}`;
      setUserSavedViews((prev) => [...prev, { id, name, filters }]);
      toast.success(`Saved view "${name}"`);
    },
    [filters]
  );

  const handleRemoveView = useCallback((id: string) => {
    setUserSavedViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selection[r.id]),
    [filteredRows, selection]
  );

  // Approve / Reject helpers
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
        description: `${row.product.name} — tasks created for ${row.store.code}.`,
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
      toast.success("Recommendation rejected", {
        description: row.product.name,
      });
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
          bulkDecision === "approve" ? "bulk_approve_recommendations" : "bulk_reject_recommendations",
        entity_type: "recommendation",
        entity_id: `bulk-${valid.length}`,
        old_value: null,
        new_value: { count: valid.length, recommendation_ids: valid.map((r) => r.recommendation!.id) },
        created_at: new Date().toISOString(),
        ip_address: "mock",
      });
      toast.success(
        bulkDecision === "approve"
          ? `${valid.length} recommendations approved`
          : `${valid.length} recommendations rejected`,
        {
          description: `Action recorded across ${new Set(valid.map((r) => r.store.id)).size} store(s).`,
        }
      );
      setBulkOpen(false);
      setSelection({});
    },
    [bulkDecision, approve, reject, appendAudit, currentUser.id]
  );

  // CSV export
  const handleExportCsv = useCallback(() => {
    if (filteredRows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const headers = [
      "product_id",
      "product_name",
      "sku",
      "store_code",
      "store_name",
      "category",
      "supplier",
      "stock",
      "days_to_expiry",
      "risk_score",
      "risk_level",
      "predicted_loss",
      "action",
      "net_saved",
      "confidence",
      "status",
    ];
    const lines: string[] = [headers.join(",")];
    for (const r of filteredRows) {
      const cells = [
        r.product.id,
        csvEscape(r.product.name),
        r.product.sku,
        r.store.code,
        csvEscape(r.store.name),
        csvEscape(r.category?.name ?? ""),
        csvEscape(r.supplier?.name ?? ""),
        String(r.prediction.current_stock),
        String(r.prediction.days_to_expiry),
        String(r.prediction.risk_score),
        r.prediction.risk_level,
        String(r.prediction.predicted_loss_value),
        r.recommendation?.recommendation_type ?? "",
        String(r.recommendation?.net_saved_value ?? ""),
        String(
          r.recommendation?.confidence_score ?? r.prediction.data_confidence_score
        ),
        r.recommendation?.status ?? "",
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risky-products-${MOCK_DATE}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRows.length} rows`);
  }, [filteredRows]);

  const headerActions = data ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={handleExportCsv}
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
      <ViewToggle value={view} onChange={setView} />
    </div>
  ) : (
    <Skeleton className="h-9 w-[280px]" />
  );

  // Hide already-decided recommendations from view? No — show them with status. But for bulk approve we exclude decided.
  const decidedSet = useMemo(
    () => new Set(decisions.map((d) => d.recommendation_id)),
    [decisions]
  );
  const bulkSelected = useMemo(
    () =>
      selectedRows.filter(
        (r) => r.recommendation && !decidedSet.has(r.recommendation.id)
      ),
    [selectedRows, decidedSet]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Risky Products"
        description="Power-user dashboard with table, grid and heatmap views."
        actions={headerActions}
      />

      {loading || !data ? (
        <>
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[480px]" />
        </>
      ) : (
        <>
          <FiltersToolbar
            filters={filters}
            onFilters={setFilters}
            onReset={reset}
            stores={data.stores}
            categories={data.categories}
            suppliers={data.suppliers}
            savedViews={allViews}
            onApplyView={handleApplyView}
            onSaveCurrent={handleSaveCurrent}
            onRemoveView={handleRemoveView}
            totalRows={filteredRows.length}
          />

          {view === "table" ? (
            <RiskyProductsTable
              rows={filteredRows}
              selection={selection}
              onSelectionChange={setSelection}
              onPreview={(r) => setPreviewRow(r)}
              onApprove={(r) => setApproveTarget(r)}
              onReject={(r) => setRejectTarget(r)}
            />
          ) : view === "grid" ? (
            <ProductsGrid
              rows={filteredRows}
              onApprove={(r) => setApproveTarget(r)}
              onReject={(r) => setRejectTarget(r)}
            />
          ) : (
            <ProductsHeatmap
              rows={filteredRows}
              onCellClick={(storeId, categoryId) => {
                setFilters({
                  ...filters,
                  storeIds: [storeId],
                  categoryIds: [categoryId],
                });
                setView("table");
              }}
            />
          )}

          {selectedRows.length > 0 ? (
            <SelectionBar
              count={selectedRows.length}
              totalNet={selectedRows.reduce(
                (sum, r) => sum + (r.recommendation?.net_saved_value ?? 0),
                0
              )}
              onClear={() => setSelection({})}
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

      <RowPreviewSheet
        row={previewRow}
        onOpenChange={(o) => !o && setPreviewRow(null)}
        onApprove={(r) => {
          setPreviewRow(null);
          setApproveTarget(r);
        }}
        onReject={(r) => {
          setPreviewRow(null);
          setRejectTarget(r);
        }}
      />

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
        rows={bulkSelected}
        decision={bulkDecision}
        onCancel={() => setBulkOpen(false)}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as ViewMode);
      }}
      className="h-9 rounded-md border bg-background p-0.5"
    >
      <ToggleGroupItem value="table" aria-label="Table view" className="h-8 px-2">
        <Table2 className="size-4" aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 px-2">
        <LayoutGrid className="size-4" aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="heatmap" aria-label="Heatmap view" className="h-8 px-2">
        <ThermometerSun className="size-4" aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
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
