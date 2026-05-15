"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseISO, isSameDay } from "date-fns";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreSelector } from "@/components/operations/store-selector";
import { PriorityTiles, type PriorityTile } from "@/components/operations/priority-tiles";
import { ValueAtRiskCard } from "@/components/operations/value-at-risk-card";
import { TopRiskyTodayTable } from "@/components/operations/top-risky-today-table";
import { TaskStatusLanes } from "@/components/operations/task-status-lanes";
import { OverdueBanner } from "@/components/operations/overdue-banner";
import { ActionableNowCard } from "@/components/operations/actionable-now-card";
import { CategoryHeatmap } from "@/components/operations/category-heatmap";
import {
  loadCategories,
  loadKpiSnapshots,
  loadProducts,
  loadRecommendations,
  loadRiskPredictions,
  loadStores,
  loadTasks,
  loadTransfers,
  loadUsers,
} from "@/lib/mock-loader";
import { MOCK_DATE } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import type {
  Category,
  KpiSnapshot,
  Product,
  Recommendation,
  RiskPrediction,
  Store,
  Task,
  Transfer,
  User,
} from "@/types";

interface OpsData {
  stores: Store[];
  categories: Category[];
  products: Product[];
  predictions: RiskPrediction[];
  recommendations: Recommendation[];
  tasks: Task[];
  users: User[];
  transfers: Transfer[];
  snapshots: KpiSnapshot[];
}

const STOCK_CHECK_TYPES = new Set(["stock_check"]);
const SHELF_ACTION_TYPES = new Set(["shelf_action"]);

export default function OperationsPage() {
  return (
    <Suspense fallback={<OperationsFallback />}>
      <OperationsView />
    </Suspense>
  );
}

function OperationsFallback() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Today-focused view for Store Manager and COO."
        actions={<Skeleton className="h-9 w-[220px]" />}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px]" />
        ))}
      </div>
      <Skeleton className="h-[160px]" />
      <Skeleton className="h-[480px]" />
    </div>
  );
}

function OperationsView() {
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(
    searchParams.get("store")
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadStores(),
      loadCategories(),
      loadProducts(),
      loadRiskPredictions(),
      loadRecommendations(),
      loadTasks(),
      loadUsers(),
      loadTransfers(),
      loadKpiSnapshots(),
    ]).then(
      ([
        stores,
        categories,
        products,
        predictions,
        recommendations,
        tasks,
        users,
        transfers,
        snapshots,
      ]) => {
        if (cancelled) return;
        setData({
          stores,
          categories,
          products,
          predictions,
          recommendations,
          tasks,
          users,
          transfers,
          snapshots,
        });
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const storeLocked =
    currentUser.role === "store_manager" ||
    currentUser.role === "supervisor" ||
    currentUser.role === "employee";
  const effectiveStoreId = storeLocked ? currentUser.store_id : selectedStore;

  const scope = useMemo(() => {
    if (!data) return null;
    const today = parseISO(MOCK_DATE);

    const inStore = <T extends { store_id?: string | null }>(items: T[]) =>
      effectiveStoreId ? items.filter((i) => i.store_id === effectiveStoreId) : items;

    const predictions = inStore(data.predictions);
    const recommendations = inStore(data.recommendations);
    const tasks = inStore(data.tasks);
    const transfers = effectiveStoreId
      ? data.transfers.filter(
          (t) => t.from_store_id === effectiveStoreId || t.to_store_id === effectiveStoreId
        )
      : data.transfers;

    const activeRecs = recommendations.filter(
      (r) => r.status === "pending_approval" || r.status === "generated"
    );

    const urgentDiscounts = activeRecs.filter(
      (r) =>
        r.recommendation_type === "discount" &&
        (r.priority === "high" || r.priority === "critical")
    );
    const pendingTransfers = transfers.filter(
      (t) => t.status === "suggested" || t.status === "approved" || t.status === "preparing"
    );
    const stockCheckTasks = tasks.filter(
      (t) =>
        STOCK_CHECK_TYPES.has(t.task_type) &&
        (t.status === "pending" || t.status === "assigned" || t.status === "in_progress")
    );
    const shelfActionTasks = tasks.filter(
      (t) =>
        SHELF_ACTION_TYPES.has(t.task_type) &&
        (t.status === "pending" || t.status === "assigned" || t.status === "in_progress")
    );

    // Tick adds ±1 jitter so counts feel live without breaking deep links.
    const jitter = (base: number) => Math.max(0, base + ((tick * 7) % 3) - 1);

    const tiles: PriorityTile[] = [
      {
        id: "discounts",
        count: jitter(urgentDiscounts.length),
        total: activeRecs.filter((r) => r.recommendation_type === "discount").length || urgentDiscounts.length,
        href: "/discounts",
        helper: "High & critical only",
      },
      {
        id: "transfers",
        count: jitter(pendingTransfers.length),
        total: transfers.length || pendingTransfers.length,
        href: "/transfers",
        helper: "Suggested → preparing",
      },
      {
        id: "stock-checks",
        count: jitter(stockCheckTasks.length),
        total:
          tasks.filter((t) => STOCK_CHECK_TYPES.has(t.task_type)).length ||
          stockCheckTasks.length,
        href: "/tasks?type=stock_check",
        helper: "Open shelf audits",
      },
      {
        id: "shelf-actions",
        count: jitter(shelfActionTasks.length),
        total:
          tasks.filter((t) => SHELF_ACTION_TYPES.has(t.task_type)).length ||
          shelfActionTasks.length,
        href: "/tasks?type=shelf_action",
        helper: "Front-of-store moves",
      },
    ];

    const atRisk = predictions.reduce((sum, p) => sum + p.predicted_loss_value, 0);
    const savedToday = data.snapshots
      .filter((s) => {
        if (!isSameDay(parseISO(s.date), today)) return false;
        if (effectiveStoreId) return s.store_id === effectiveStoreId;
        return s.store_id === null && s.category_id === null;
      })
      .reduce((sum, s) => sum + s.net_saved_value, 0);

    const criticalCount = predictions.filter((p) => p.risk_level === "critical").length;
    const highCount = predictions.filter((p) => p.risk_level === "high").length;

    const pendingLane = tasks.filter(
      (t) => t.status === "pending" || t.status === "assigned"
    );
    const inProgressLane = tasks.filter((t) => t.status === "in_progress");
    const completedTodayLane = tasks.filter((t) => {
      if (t.status !== "completed" || !t.completed_at) return false;
      try {
        return isSameDay(parseISO(t.completed_at), today);
      } catch {
        return false;
      }
    });

    const overdueTasks = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled" || t.status === "expired") return false;
      try {
        return parseISO(t.deadline) < today;
      } catch {
        return false;
      }
    });

    const storeLabel = effectiveStoreId
      ? data.stores.find((s) => s.id === effectiveStoreId)?.name ?? "Selected store"
      : "All stores";

    return {
      tiles,
      atRisk,
      savedToday,
      criticalCount,
      highCount,
      predictions,
      recommendations,
      tasks,
      pendingLane,
      inProgressLane,
      completedTodayLane,
      overdueTasks,
      storeLabel,
    };
  }, [data, effectiveStoreId, tick]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Today-focused view for Store Manager and COO."
        actions={
          data ? (
            <StoreSelector
              stores={data.stores}
              currentUser={currentUser}
              value={selectedStore}
              onChange={setSelectedStore}
            />
          ) : (
            <Skeleton className="h-9 w-[220px]" />
          )
        }
      />

      {/* Section 2 — Priority Tiles */}
      {loading || !scope ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
        </div>
      ) : (
        <PriorityTiles tiles={scope.tiles} />
      )}

      {/* Section 6 — Overdue banner (conditional) */}
      {!loading && scope && data ? (
        <OverdueBanner tasks={scope.overdueTasks} users={data.users} />
      ) : null}

      {/* Section 3 — Value at risk today */}
      {loading || !scope ? (
        <Skeleton className="h-[160px]" />
      ) : (
        <ValueAtRiskCard
          atRisk={scope.atRisk}
          savedToday={scope.savedToday}
          criticalCount={scope.criticalCount}
          highCount={scope.highCount}
          productsCount={scope.predictions.length}
          storeLabel={scope.storeLabel}
        />
      )}

      {/* Section 4 + 7 — Top risky + Actionable Now */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        {loading || !data || !scope ? (
          <>
            <Skeleton className="h-[480px]" />
            <Skeleton className="h-[480px]" />
          </>
        ) : (
          <>
            <TopRiskyTodayTable
              predictions={scope.predictions}
              products={data.products}
              stores={data.stores}
              recommendations={data.recommendations}
              showStoreColumn={!effectiveStoreId}
            />
            <ActionableNowCard
              recommendations={scope.recommendations}
              products={data.products}
              stores={data.stores}
              currentUser={currentUser}
            />
          </>
        )}
      </div>

      {/* Section 5 — Task status lanes */}
      {loading || !scope ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[180px]" />
        </div>
      ) : (
        <TaskStatusLanes
          pending={scope.pendingLane}
          inProgress={scope.inProgressLane}
          completedToday={scope.completedTodayLane}
        />
      )}

      {/* Section 8 — Heatmap */}
      {loading || !data || !scope ? (
        <Skeleton className="h-[280px]" />
      ) : (
        <CategoryHeatmap
          predictions={scope.predictions}
          products={data.products}
          categories={data.categories}
          stores={
            effectiveStoreId
              ? data.stores.filter((s) => s.id === effectiveStoreId)
              : data.stores
          }
        />
      )}
    </div>
  );
}
