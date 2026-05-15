"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  loadCategories,
  loadDiscounts,
  loadKpiSnapshots,
  loadProducts,
  loadRecommendations,
  loadRiskPredictions,
  loadSales,
  loadStores,
  loadSuppliers,
  loadTasks,
  loadTransfers,
  loadWasteRecords,
} from "@/lib/mock-loader";
import { resolveRange, DATE_RANGE_LABEL } from "@/lib/analytics-utils";
import { useFiltersStore } from "@/store/filters-store";
import { useActionsStore } from "@/store/actions-store";
import type {
  Category,
  Discount,
  KpiSnapshot,
  Product,
  Recommendation,
  RiskPrediction,
  SalesAggregate,
  Store,
  Supplier,
  Task,
  Transfer,
  WasteRecord,
} from "@/types";
import { LossSavedTab } from "./loss-saved-tab";
import { StorePerformanceTab } from "./store-performance-tab";
import { CategoryInsightsTab } from "./category-insights-tab";
import { SupplierPerformanceTab } from "./supplier-performance-tab";
import { AiPerformanceTab } from "./ai-performance-tab";
import { SustainabilityTab } from "./sustainability-tab";

export interface AnalyticsData {
  snapshots: KpiSnapshot[];
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  predictions: RiskPrediction[];
  recommendations: Recommendation[];
  transfers: Transfer[];
  discounts: Discount[];
  tasks: Task[];
  sales: SalesAggregate[];
  waste: WasteRecord[];
}

const TABS = [
  { value: "loss", label: "Loss & Saved" },
  { value: "stores", label: "Store Performance" },
  { value: "categories", label: "Category Insights" },
  { value: "suppliers", label: "Supplier Performance" },
  { value: "ai", label: "AI Performance" },
  { value: "sustainability", label: "Sustainability" },
];

export function AnalyticsShell() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState(false);
  const [tab, setTab] = useState<string>("loss");
  const dateRangeKey = useFiltersStore((s) => s.dateRangeKey);
  const customRange = useFiltersStore((s) => s.customRange);
  const decisions = useActionsStore((s) => s.decisions);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadKpiSnapshots(),
      loadStores(),
      loadCategories(),
      loadSuppliers(),
      loadProducts(),
      loadRiskPredictions(),
      loadRecommendations(),
      loadTransfers(),
      loadDiscounts(),
      loadTasks(),
      loadSales(),
      loadWasteRecords(),
    ]).then(
      ([
        snapshots,
        stores,
        categories,
        suppliers,
        products,
        predictions,
        recommendations,
        transfers,
        discounts,
        tasks,
        sales,
        waste,
      ]) => {
        if (cancelled) return;
        setData({
          snapshots,
          stores,
          categories,
          suppliers,
          products,
          predictions,
          recommendations,
          transfers,
          discounts,
          tasks,
          sales,
          waste,
        });
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(
    () => resolveRange(dateRangeKey, customRange),
    [dateRangeKey, customRange]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description={`Six-tab deep dive — ${DATE_RANGE_LABEL[dateRangeKey]}.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border px-3 h-9">
              <GitCompareArrows className="size-4 text-muted-foreground" aria-hidden />
              <Label htmlFor="compare" className="text-xs cursor-pointer">
                Compare to previous
              </Label>
              <Switch id="compare" checked={compare} onCheckedChange={setCompare} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("PDF hazırlanır…", { description: "Mock export" })
              }
            >
              <Download className="mr-2 size-4" aria-hidden />
              Export PDF
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {loading || !data ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[160px]" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="loss" className="mt-0 space-y-4">
              <LossSavedTab data={data} range={range} compare={compare} decisions={decisions} />
            </TabsContent>
            <TabsContent value="stores" className="mt-0 space-y-4">
              <StorePerformanceTab data={data} range={range} />
            </TabsContent>
            <TabsContent value="categories" className="mt-0 space-y-4">
              <CategoryInsightsTab data={data} range={range} />
            </TabsContent>
            <TabsContent value="suppliers" className="mt-0 space-y-4">
              <SupplierPerformanceTab data={data} range={range} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0 space-y-4">
              <AiPerformanceTab data={data} range={range} decisions={decisions} />
            </TabsContent>
            <TabsContent value="sustainability" className="mt-0 space-y-4">
              <SustainabilityTab data={data} range={range} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
