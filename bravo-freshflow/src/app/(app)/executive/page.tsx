"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { differenceInCalendarDays, parseISO, startOfYear, subDays } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, type KpiChange } from "@/components/cards/kpi-card";
import { LatestRecommendationsCard } from "@/components/cards/latest-recommendations-card";
import { CriticalTasksCard } from "@/components/cards/critical-tasks-card";
import { NetworkHealthBanner } from "@/components/cards/network-health-banner";
import { LossRecoveryAreaChart } from "@/components/charts/loss-recovery-area-chart";
import {
  loadCategories,
  loadDataQualityIssues,
  loadDiscounts,
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
import { formatAZN, formatPercent } from "@/lib/formatters";
import { useFiltersStore, type DateRangeKey } from "@/store/filters-store";
import type {
  Category,
  DataQualityIssue,
  Discount,
  KpiSnapshot,
  Product,
  Recommendation,
  RiskPrediction,
  Store,
  Task,
  Transfer,
  User,
} from "@/types";

interface ExecData {
  snapshots: KpiSnapshot[];
  stores: Store[];
  categories: Category[];
  products: Product[];
  predictions: RiskPrediction[];
  recommendations: Recommendation[];
  tasks: Task[];
  users: User[];
  transfers: Transfer[];
  discounts: Discount[];
  issues: DataQualityIssue[];
}

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  ytd: "year to date",
  custom: "custom range",
};

function resolveRange(key: DateRangeKey, custom: { from: string | null; to: string | null }) {
  const today = parseISO(MOCK_DATE);
  if (key === "custom" && custom.from && custom.to) {
    return { from: parseISO(custom.from), to: parseISO(custom.to) };
  }
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: subDays(today, 6), to: today };
    case "30d":
      return { from: subDays(today, 29), to: today };
    case "90d":
      return { from: subDays(today, 89), to: today };
    case "ytd":
      return { from: startOfYear(today), to: today };
    default:
      return { from: subDays(today, 29), to: today };
  }
}

function inRange(date: string, from: Date, to: Date): boolean {
  try {
    const d = parseISO(date);
    return d >= from && d <= to;
  } catch {
    return false;
  }
}

interface KpiTotals {
  potential: number;
  actual: number;
  netSaved: number;
  recsGenerated: number;
  recsAccepted: number;
  tasksCreated: number;
  tasksCompleted: number;
  wasteKg: number;
}

function sumSnapshots(snapshots: KpiSnapshot[]): KpiTotals {
  return snapshots.reduce<KpiTotals>(
    (acc, s) => {
      acc.potential += s.potential_loss;
      acc.actual += s.actual_loss;
      acc.netSaved += s.net_saved_value;
      acc.recsGenerated += s.recommendations_generated;
      acc.recsAccepted += s.recommendations_accepted;
      acc.tasksCreated += s.tasks_created;
      acc.tasksCompleted += s.tasks_completed;
      acc.wasteKg += s.waste_kg;
      return acc;
    },
    {
      potential: 0,
      actual: 0,
      netSaved: 0,
      recsGenerated: 0,
      recsAccepted: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      wasteKg: 0,
    }
  );
}

function dailyTrend(snapshots: KpiSnapshot[], key: keyof KpiSnapshot): number[] {
  const map = new Map<string, number>();
  for (const s of snapshots) {
    const v = Number(s[key] ?? 0);
    map.set(s.date, (map.get(s.date) ?? 0) + v);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

const CHANGE_CAP = 60;

function pctChange(curr: number, prev: number, minPrev = 0): KpiChange {
  if (prev === 0 && curr === 0) return { value: 0, direction: "flat", isGood: true };
  if (Math.abs(prev) < minPrev) {
    return { value: 0, direction: "flat", isGood: true };
  }
  if (prev === 0) {
    return { value: CHANGE_CAP, direction: "up", isGood: true };
  }
  let delta = ((curr - prev) / Math.abs(prev)) * 100;
  if (delta > CHANGE_CAP) delta = CHANGE_CAP;
  if (delta < -CHANGE_CAP) delta = -CHANGE_CAP;
  return {
    value: Math.abs(delta) < 0.1 ? 0 : delta,
    direction: delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat",
    isGood: false,
  };
}

export default function ExecutivePage() {
  const [data, setData] = useState<ExecData | null>(null);
  const [loading, setLoading] = useState(true);
  const dateRangeKey = useFiltersStore((s) => s.dateRangeKey);
  const customRange = useFiltersStore((s) => s.customRange);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadKpiSnapshots(),
      loadStores(),
      loadCategories(),
      loadProducts(),
      loadRiskPredictions(),
      loadRecommendations(),
      loadTasks(),
      loadUsers(),
      loadTransfers(),
      loadDiscounts(),
      loadDataQualityIssues(),
    ]).then(
      ([
        snapshots,
        stores,
        categories,
        products,
        predictions,
        recommendations,
        tasks,
        users,
        transfers,
        discounts,
        issues,
      ]) => {
        if (cancelled) return;
        setData({
          snapshots,
          stores,
          categories,
          products,
          predictions,
          recommendations,
          tasks,
          users,
          transfers,
          discounts,
          issues,
        });
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const { from, to } = resolveRange(dateRangeKey, customRange);
    const days = Math.max(1, differenceInCalendarDays(to, from) + 1);
    const prevTo = subDays(from, 1);
    const prevFrom = subDays(prevTo, days - 1);

    const globalSnaps = data.snapshots.filter(
      (s) => s.store_id === null && s.category_id === null
    );
    const periodSnaps = globalSnaps.filter((s) => inRange(s.date, from, to));
    const prevSnaps = globalSnaps.filter((s) => inRange(s.date, prevFrom, prevTo));

    const totals = sumSnapshots(periodSnaps);
    const prev = sumSnapshots(prevSnaps);

    const aiAcc = totals.recsGenerated > 0 ? totals.recsAccepted / totals.recsGenerated : 0;
    const aiAccPrev = prev.recsGenerated > 0 ? prev.recsAccepted / prev.recsGenerated : 0;
    const taskComp = totals.tasksCreated > 0 ? totals.tasksCompleted / totals.tasksCreated : 0;
    const taskCompPrev = prev.tasksCreated > 0 ? prev.tasksCompleted / prev.tasksCreated : 0;

    const potentialChange = pctChange(totals.potential, prev.potential, 1000);
    potentialChange.isGood = potentialChange.direction === "down";
    const actualChange = pctChange(totals.actual, prev.actual, 500);
    actualChange.isGood = actualChange.direction === "down";
    const netSavedChange = pctChange(totals.netSaved, prev.netSaved, 500);
    netSavedChange.isGood = netSavedChange.direction === "up";
    const aiAccChange = pctChange(aiAcc * 100, aiAccPrev * 100, 1);
    aiAccChange.isGood = aiAccChange.direction === "up";
    const taskCompChange = pctChange(taskComp * 100, taskCompPrev * 100, 1);
    taskCompChange.isGood = taskCompChange.direction === "up";
    const wasteChange = pctChange(totals.wasteKg, prev.wasteKg, 50);
    wasteChange.isGood = wasteChange.direction === "down";

    return {
      from,
      to,
      periodSnaps,
      totals,
      aiAcc,
      taskComp,
      potentialChange,
      actualChange,
      netSavedChange,
      aiAccChange,
      taskCompChange,
      wasteChange,
      potentialTrend: dailyTrend(periodSnaps, "potential_loss"),
      actualTrend: dailyTrend(periodSnaps, "actual_loss"),
      netSavedTrend: dailyTrend(periodSnaps, "net_saved_value"),
      acceptTrend: dailyTrend(periodSnaps, "recommendations_accepted"),
      taskTrend: dailyTrend(periodSnaps, "tasks_completed"),
      wasteTrend: dailyTrend(periodSnaps, "waste_kg"),
    };
  }, [data, dateRangeKey, customRange]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description={`KPIs, trends, AI feed and sustainability — ${DATE_RANGE_LABEL[dateRangeKey]}.`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("PDF hazırlanır…", { description: "Mock export" })}
          >
            <Download className="mr-2 size-4" aria-hidden />
            Export PDF
          </Button>
        }
      />

      {/* Section 2 — KPI grid */}
      <div data-onboard="kpi-grid" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {loading || !view ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[136px]" />)
        ) : (
          <>
            <KpiCard
              label="Potential Loss"
              value={formatAZN(view.totals.potential, { compact: true })}
              tone="danger"
              tooltip="Predicted gross loss if no action is taken."
            />
            <KpiCard
              label="Actual Loss"
              value={formatAZN(view.totals.actual, { compact: true })}
              tone="danger"
              tooltip="Realized loss recorded in period."
            />
            <KpiCard
              label="Net Saved Value"
              value={formatAZN(view.totals.netSaved, { compact: true })}
              tone="success"
              tooltip="Value preserved by AI-driven actions, net of costs."
            />
            <KpiCard
              label="AI Acceptance"
              value={formatPercent(view.aiAcc, 1)}
              tone="primary"
              tooltip="Share of AI recommendations approved by operators."
            />
            <KpiCard
              label="Task Completion"
              value={formatPercent(view.taskComp, 1)}
              tone="primary"
              tooltip="Share of created tasks completed on time."
            />
            <KpiCard
              label="Waste Reduction"
              value={`${view.totals.wasteKg.toFixed(1)} kg`}
              tone="warning"
              tooltip="Total perishable waste recorded; lower is better."
            />
          </>
        )}
      </div>

      {/* Section 3 — Loss & Recovery area chart */}
      <div>
        {loading || !view ? (
          <Skeleton className="h-[400px]" />
        ) : (
          <LossRecoveryAreaChart snapshots={view.periodSnaps} />
        )}
      </div>

      {/* Section 5 — Feeds */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading || !data ? (
          <>
            <Skeleton className="h-[280px]" />
            <Skeleton className="h-[280px]" />
          </>
        ) : (
          <>
            <LatestRecommendationsCard
              recommendations={data.recommendations}
              products={data.products}
              stores={data.stores}
            />
            <CriticalTasksCard tasks={data.tasks} users={data.users} />
          </>
        )}
      </div>

      {/* Section 6 — Network Health */}
      {loading || !data || !view ? (
        <Skeleton className="h-[64px]" />
      ) : (
        <NetworkHealthBanner
          snapshots={view.periodSnaps}
          issues={data.issues}
          stores={data.stores}
        />
      )}
    </div>
  );
}
