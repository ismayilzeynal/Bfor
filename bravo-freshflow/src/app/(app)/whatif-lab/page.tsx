"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronsUpDown,
  FlaskConical,
  Info,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import {
  WhatIfSimulator,
  type CandidateTargetStore,
  type WhatIfBaselineInput,
} from "@/components/whatif/whatif-simulator";
import {
  loadInventorySnapshots,
  loadProducts,
  loadRiskPredictions,
  loadSales,
  loadStores,
} from "@/lib/mock-loader";
import { useWhatIfStore } from "@/store/whatif-store";
import { SCENARIO_TYPE_LABELS } from "@/lib/constants";
import { formatAZN, formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  InventorySnapshot,
  Product,
  RiskPrediction,
  SalesAggregate,
  Store,
} from "@/types";

interface LabBundle {
  products: Product[];
  stores: Store[];
  predictions: RiskPrediction[];
  snapshots: InventorySnapshot[];
  sales: SalesAggregate[];
}

export default function WhatIfLabPage() {
  const [bundle, setBundle] = useState<LabBundle | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [overrideBaseline, setOverrideBaseline] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const [manual, setManual] = useState({
    currentStock: 0,
    avgDailySales7d: 0,
    daysToExpiry: 0,
    costPrice: 0,
    salePrice: 0,
    minimumMarginPct: 0.2,
    dataConfidence: 70,
  });

  const snapshots = useWhatIfStore((s) => s.snapshots);
  const removeSnapshot = useWhatIfStore((s) => s.removeSnapshot);
  const clearSnapshots = useWhatIfStore((s) => s.clearSnapshots);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadProducts(),
      loadStores(),
      loadRiskPredictions(),
      loadInventorySnapshots(),
      loadSales(),
    ]).then(([products, stores, predictions, snaps, sales]) => {
      if (cancelled) return;
      setBundle({ products, stores, predictions, snapshots: snaps, sales });
      const firstPred = predictions.find((p) => p.risk_score >= 70) ?? predictions[0];
      if (firstPred) {
        setSelectedProductId(firstPred.product_id);
        setSelectedStoreId(firstPred.store_id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const product = useMemo(() => {
    if (!bundle || !selectedProductId) return null;
    return bundle.products.find((p) => p.id === selectedProductId) ?? null;
  }, [bundle, selectedProductId]);

  const store = useMemo(() => {
    if (!bundle || !selectedStoreId) return null;
    return bundle.stores.find((s) => s.id === selectedStoreId) ?? null;
  }, [bundle, selectedStoreId]);

  const derivedBaseline = useMemo<WhatIfBaselineInput | null>(() => {
    if (!bundle || !product || !store) return null;
    const productPreds = bundle.predictions.filter(
      (p) => p.product_id === product.id && p.store_id === store.id,
    );
    const latestPred = productPreds.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const latestSnap = bundle.snapshots
      .filter((s) => s.product_id === product.id && s.store_id === store.id)
      .sort((a, b) => b.snapshot_datetime.localeCompare(a.snapshot_datetime))[0];

    const last7Sales = bundle.sales
      .filter((s) => s.product_id === product.id && s.store_id === store.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    const avgDaily =
      last7Sales.length > 0
        ? last7Sales.reduce((acc, s) => acc + s.quantity_sold, 0) / 7
        : 0;

    return {
      currentStock: latestPred?.current_stock ?? latestSnap?.current_stock ?? 0,
      avgDailySales7d: latestPred?.avg_daily_sales_7d ?? avgDaily,
      daysToExpiry: latestPred?.days_to_expiry ?? 3,
      costPrice: product.cost_price,
      salePrice: product.sale_price,
      minimumMarginPct: product.minimum_margin_pct,
      dataConfidence: latestPred?.data_confidence_score ?? latestSnap?.confidence_score ?? 70,
    };
  }, [bundle, product, store]);

  useEffect(() => {
    if (derivedBaseline && !overrideBaseline) {
      setManual(derivedBaseline);
    }
  }, [derivedBaseline, overrideBaseline]);

  const candidateTargetStores = useMemo<CandidateTargetStore[]>(() => {
    if (!bundle || !product || !store) return [];
    const list: CandidateTargetStore[] = [];
    const sevenDaysAgoIso = sevenDaysAgo();
    for (const s of bundle.stores) {
      if (s.id === store.id || !s.is_active) continue;
      const sales = bundle.sales.filter((x) => x.product_id === product.id && x.store_id === s.id);
      const recent = sales.filter((x) => x.date >= sevenDaysAgoIso);
      const total = recent.reduce((acc, r) => acc + r.quantity_sold, 0);
      const avg = recent.length > 0 ? total / 7 : 0;
      const snap = bundle.snapshots
        .filter((sn) => sn.product_id === product.id && sn.store_id === s.id)
        .sort((a, b) => b.snapshot_datetime.localeCompare(a.snapshot_datetime))[0];
      list.push({
        id: s.id,
        code: s.code,
        name: s.name,
        current_stock: snap?.current_stock ?? 0,
        avg_daily_sales: round1(avg || 1.0),
      });
    }
    list.sort((a, b) => b.avg_daily_sales - a.avg_daily_sales);
    return list.slice(0, 6);
  }, [bundle, product, store]);

  const candidateCompanions = useMemo(() => {
    if (!bundle || !product) return [];
    return bundle.products
      .filter((p) => p.id !== product.id && p.category_id === product.category_id && p.is_active)
      .slice(0, 8)
      .map((p) => ({ id: p.id, name: p.name }));
  }, [bundle, product]);

  function pickProduct(productId: string) {
    if (!bundle) return;
    const pred = bundle.predictions.find((p) => p.product_id === productId);
    setSelectedProductId(productId);
    setSelectedStoreId(pred?.store_id ?? bundle.stores[0]?.id ?? null);
    setOverrideBaseline(false);
    setProductSearchOpen(false);
  }

  function pickStore(storeId: string) {
    setSelectedStoreId(storeId);
    setOverrideBaseline(false);
  }

  const baselineToUse: WhatIfBaselineInput | null = overrideBaseline
    ? manual
    : derivedBaseline;

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="What-If Lab"
        description="Stand-alone sandbox for scenario simulation. Hydrate from a real product or override the baseline manually."
      />

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Product</Label>
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full justify-between gap-2 text-xs font-medium"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <PackageSearch className="size-3.5 text-muted-foreground" aria-hidden />
                          {product ? (
                            <>
                              <span className="truncate">{product.name}</span>
                              <span className="hidden text-muted-foreground sm:inline">
                                ({product.sku})
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Search product…</span>
                          )}
                        </span>
                        <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[420px] p-0">
                      <Command>
                        <CommandInput placeholder="Search by name, SKU, barcode…" className="h-9" />
                        <CommandList>
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup heading="Products">
                            {(bundle?.products ?? []).slice(0, 200).map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.name} ${p.sku} ${p.barcode}`}
                                onSelect={() => pickProduct(p.id)}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="truncate font-medium">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {p.sku}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Store</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full justify-between gap-2 text-xs"
                      >
                        <span className="truncate">
                          {store ? `${store.code} — ${store.name}` : "Pick store"}
                        </span>
                        <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-0">
                      <Command>
                        <CommandInput placeholder="Search stores…" className="h-9" />
                        <CommandList>
                          <CommandEmpty>No stores.</CommandEmpty>
                          <CommandGroup>
                            {(bundle?.stores.filter((s) => s.is_active) ?? []).map((s) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.code} ${s.name}`}
                                onSelect={() => pickStore(s.id)}
                              >
                                <span className="font-medium">{s.code}</span>
                                <span className="ml-2 truncate text-muted-foreground">
                                  {s.name}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-2 text-xs">
                <Switch
                  checked={overrideBaseline}
                  onCheckedChange={(v) => {
                    setOverrideBaseline(v);
                    if (v && derivedBaseline) setManual(derivedBaseline);
                  }}
                  id="override"
                />
                <Label htmlFor="override" className="text-xs">
                  Override baseline
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {overrideBaseline
                    ? "Editing baseline manually — disconnected from live data."
                    : "Hydrated from latest snapshot, prediction, and 7-day sales."}
                </span>
                {overrideBaseline && derivedBaseline ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 gap-1.5 text-[11px]"
                    onClick={() => setManual(derivedBaseline)}
                  >
                    <RefreshCw className="size-3" aria-hidden />
                    Reset to live
                  </Button>
                ) : null}
              </div>

              {overrideBaseline ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <ManualField
                    label="Current stock"
                    value={manual.currentStock}
                    onChange={(v) => setManual((m) => ({ ...m, currentStock: v }))}
                    min={0}
                    step={1}
                  />
                  <ManualField
                    label="Avg daily sales (7d)"
                    value={manual.avgDailySales7d}
                    onChange={(v) => setManual((m) => ({ ...m, avgDailySales7d: v }))}
                    min={0}
                    step={0.5}
                  />
                  <ManualField
                    label="Days to expiry"
                    value={manual.daysToExpiry}
                    onChange={(v) => setManual((m) => ({ ...m, daysToExpiry: v }))}
                    min={0}
                    step={1}
                  />
                  <ManualField
                    label="Confidence %"
                    value={manual.dataConfidence}
                    onChange={(v) => setManual((m) => ({ ...m, dataConfidence: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <ManualField
                    label="Cost price ₼"
                    value={manual.costPrice}
                    onChange={(v) => setManual((m) => ({ ...m, costPrice: v }))}
                    min={0}
                    step={0.1}
                  />
                  <ManualField
                    label="Sale price ₼"
                    value={manual.salePrice}
                    onChange={(v) => setManual((m) => ({ ...m, salePrice: v }))}
                    min={0}
                    step={0.1}
                  />
                  <ManualField
                    label="Min margin %"
                    value={Math.round(manual.minimumMarginPct * 100)}
                    onChange={(v) => setManual((m) => ({ ...m, minimumMarginPct: v / 100 }))}
                    min={0}
                    max={90}
                    step={1}
                  />
                </div>
              ) : null}

              {baselineToUse && product && store ? (
                <BaselineSummary baseline={baselineToUse} />
              ) : null}
            </CardContent>
          </Card>

          {!bundle ? (
            <Skeleton className="h-[420px] w-full" />
          ) : product && store && baselineToUse ? (
            <WhatIfSimulator
              product={product}
              store={store}
              baseline={baselineToUse}
              candidateTargetStores={candidateTargetStores}
              candidateCompanions={candidateCompanions}
              onApply={(scenario) =>
                toast.success("Scenario applied (sandbox)", {
                  description: `${SCENARIO_TYPE_LABELS[scenario]} on ${product.name} — nothing was sent to operations.`,
                })
              }
              approveDisabled={false}
              variant="standalone"
            />
          ) : (
            <Card>
              <CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground">
                <Wand2 className="mx-auto size-6 text-muted-foreground/60" aria-hidden />
                Pick a product to start simulating.
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}

function ManualField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="h-8 text-xs"
      />
    </div>
  );
}

function BaselineSummary({ baseline }: { baseline: WhatIfBaselineInput }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border bg-background p-2 text-[11px] md:grid-cols-4">
      <Stat label="Stock" value={baseline.currentStock.toFixed(0)} />
      <Stat label="Avg daily" value={`${baseline.avgDailySales7d.toFixed(1)}/d`} />
      <Stat label="Days to expiry" value={baseline.daysToExpiry.toFixed(0)} />
      <Stat label="Cost / Sale" value={`${formatAZN(baseline.costPrice, { compact: true })} / ${formatAZN(baseline.salePrice, { compact: true })}`} />
      <div className="col-span-2 md:col-span-4">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Data confidence</span>
          <ConfidenceBadge score={baseline.dataConfidence} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
