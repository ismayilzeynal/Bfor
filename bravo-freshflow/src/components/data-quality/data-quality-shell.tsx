"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataQualityData } from "./use-data-quality-data";
import { HealthScore } from "./health-score";
import { KpiStrip } from "./kpi-strip";
import { IssueTypesDonut } from "./issue-types-donut";
import { IssuesToolbar } from "./issues-toolbar";
import { IssuesTable } from "./issues-table";
import { IssueDetailDrawer } from "./issue-detail-drawer";
import { IntegrationStatusPanel } from "./integration-status-panel";
import { TrendsCharts } from "./trends-charts";
import { BulkActionsBar } from "./bulk-actions-bar";
import { NetworkStockCheckDialog } from "./network-stock-check-dialog";
import { downloadCsv } from "@/lib/analytics-utils";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import { DATA_QUALITY_ISSUE_TYPE_LABELS } from "@/lib/constants";
import type {
  DataQualityIssueType,
  DataQualitySeverity,
  DataQualityStatus,
} from "@/types";
import type { IssueRow } from "./types";

export function DataQualityShell() {
  const { loading, rows, snapshots, stores, kpiSnapshots } = useDataQualityData();
  const setIssueStatus = useActionsStore((s) => s.setIssueStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [search, setSearch] = useState("");
  const [issueType, setIssueType] = useState<DataQualityIssueType | null>(null);
  const [severity, setSeverity] = useState<DataQualitySeverity | "all">("all");
  const [status, setStatus] = useState<DataQualityStatus | "all">("all");
  const [drawerRow, setDrawerRow] = useState<IssueRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo<IssueRow[]>(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (issueType && r.issue.issue_type !== issueType) return false;
        if (severity !== "all" && r.issue.severity !== severity) return false;
        if (status !== "all" && r.effectiveStatus !== status) return false;
        if (term) {
          const haystack = `${r.issue.id} ${r.issue.description} ${
            r.product?.name ?? ""
          } ${r.product?.sku ?? ""} ${r.store?.name ?? ""}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        const sev = { high: 3, medium: 2, low: 1 } as const;
        const sevDelta = sev[b.issue.severity] - sev[a.issue.severity];
        if (sevDelta !== 0) return sevDelta;
        return b.issue.created_at.localeCompare(a.issue.created_at);
      });
  }, [rows, search, issueType, severity, status]);

  const selectedRows = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.issue.id)),
    [filtered, selectedIds]
  );
  const selectedHighCount = selectedRows.filter(
    (r) => r.issue.severity === "high"
  ).length;

  const handleToggle = (id: string, value: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleAll = (value: boolean) => {
    if (!value) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filtered.map((r) => r.issue.id)));
  };

  const audit = (action: string, entityId: string, payload: unknown) => {
    appendAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: currentUser?.id ?? "system",
      action,
      entity_type: "data_issue",
      entity_id: entityId,
      old_value: null,
      new_value: payload,
      created_at: new Date().toISOString(),
      ip_address: "10.0.0.1",
    });
  };

  const handleQuickStatus = (row: IssueRow, newStatus: DataQualityStatus) => {
    if (newStatus === "resolved") {
      setDrawerRow(row);
      return;
    }
    setIssueStatus(row.issue.id, newStatus, { userId: currentUser?.id });
    audit(`${newStatus}_data_issue`, row.issue.id, { status: newStatus });
    toast.success(`Marked as ${newStatus}`);
  };

  const handleBulkResolve = () => {
    selectedRows.forEach((r) => {
      setIssueStatus(r.issue.id, "resolved", {
        note: "Bulk resolve",
        userId: currentUser?.id,
      });
      audit("resolve_data_issue", r.issue.id, { status: "resolved", bulk: true });
    });
    toast.success(`${selectedRows.length} issue resolved`);
    setSelectedIds(new Set());
  };

  const handleBulkIgnore = () => {
    selectedRows.forEach((r) => {
      setIssueStatus(r.issue.id, "ignored", { userId: currentUser?.id });
      audit("ignore_data_issue", r.issue.id, { status: "ignored", bulk: true });
    });
    toast.success(`${selectedRows.length} issue ignored`);
    setSelectedIds(new Set());
  };

  const handleBulkStockChecks = () => {
    const linked = selectedRows.filter((r) => r.product && r.store);
    linked.forEach((r) => {
      audit("create_stock_check_task", r.issue.id, {
        product_id: r.issue.product_id,
        store_id: r.issue.store_id,
      });
    });
    toast.success(`${linked.length} stock-check task yaradıldı`);
  };

  const handleExport = () => {
    const rowsCsv: (string | number)[][] = [
      ["id", "type", "severity", "product", "store", "description", "status", "created_at"],
      ...filtered.map((r) => [
        r.issue.id,
        DATA_QUALITY_ISSUE_TYPE_LABELS[r.issue.issue_type],
        r.issue.severity,
        r.product?.name ?? "",
        r.store?.name ?? "",
        r.issue.description,
        r.effectiveStatus,
        r.issue.created_at,
      ]),
    ];
    downloadCsv(`data-quality-issues-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
    toast.success("CSV ixrac edildi");
  };

  const handleClear = () => {
    setSearch("");
    setIssueType(null);
    setSeverity("all");
    setStatus("all");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Quality"
        description="Integrity issues və integration health — CIO / Admin görünüşü."
        actions={
          <div className="flex items-center gap-2">
            <NetworkStockCheckDialog storesCount={stores.filter((s) => s.is_active).length} />
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 size-4" aria-hidden />
              Export CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[176px] w-full" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))}
          </div>
          <Skeleton className="h-[260px]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <HealthScore snapshots={snapshots} />
              <KpiStrip rows={rows} />
            </div>
            <IssueTypesDonut
              rows={rows}
              selectedType={issueType}
              onSelect={setIssueType}
            />
          </div>

          <IntegrationStatusPanel />

          <TrendsCharts kpiSnapshots={kpiSnapshots} rows={rows} stores={stores} />

          <div className="space-y-3">
            <IssuesToolbar
              search={search}
              onSearch={setSearch}
              issueType={issueType}
              onIssueType={setIssueType}
              severity={severity}
              onSeverity={setSeverity}
              status={status}
              onStatus={setStatus}
              visible={filtered.length}
              total={rows.length}
              onClear={handleClear}
            />
            <IssuesTable
              rows={filtered}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              onOpen={(row) => setDrawerRow(row)}
              onQuickStatus={handleQuickStatus}
            />
          </div>
        </>
      )}

      <BulkActionsBar
        count={selectedRows.length}
        highCount={selectedHighCount}
        onResolve={handleBulkResolve}
        onIgnore={handleBulkIgnore}
        onCreateStockChecks={handleBulkStockChecks}
        onClear={() => setSelectedIds(new Set())}
      />

      <IssueDetailDrawer
        row={drawerRow}
        onOpenChange={(open) => {
          if (!open) setDrawerRow(null);
        }}
      />
    </div>
  );
}
