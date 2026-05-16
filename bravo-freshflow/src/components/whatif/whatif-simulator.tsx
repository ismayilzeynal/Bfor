"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Info,
  Layers,
  Lock,
  Percent,
  RotateCcw,
  Save,
  Sparkles,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { SCENARIO_TYPE_LABELS } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  calcBundle,
  calcCombined,
  calcDiscount,
  calcNoAction,
  calcTransfer,
  type ScenarioBaseline,
  type ScenarioResult,
} from "@/lib/scenario-calculator";
import { useWhatIfStore } from "@/store/whatif-store";
import type { Product, ScenarioType, Store } from "@/types";

export interface CandidateTargetStore {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  avg_daily_sales: number;
}

export interface WhatIfBaselineInput {
  currentStock: number;
  avgDailySales7d: number;
  daysToExpiry: number;
  costPrice: number;
  salePrice: number;
  minimumMarginPct: number;
  dataConfidence: number;
}

interface WhatIfSimulatorProps {
  product: Product;
  store: Store;
  baseline: WhatIfBaselineInput;
  candidateTargetStores: CandidateTargetStore[];
  candidateCompanions?: { id: string; name: string }[];
  defaultDiscountPct?: number;
  defaultTransferPct?: number;
  defaultBundlePct?: number;
  onApply: (scenario: ScenarioType, result: ScenarioResult, params: SimParams) => void;
  approveDisabled?: boolean;
  approveDisabledReason?: string;
  variant?: "embedded" | "standalone";
}

export interface SimParams {
  discountPct: number;
  transferQty: number;
  transferTargetStoreId: string | null;
  bundleDiscountPct: number;
  bundleCompanionId: string | null;
}

const DISCOUNT_STEPS = [5, 10, 15, 20, 25, 30, 40, 50];
const BUNDLE_STEPS = [5, 10, 15, 20, 25];

const SCENARIO_ICON: Record<ScenarioType, typeof Activity> = {
  no_action: Activity,
  discount: Percent,
  transfer: Truck,
  bundle: Layers,
  shelf_visibility: Activity,
  combined: Sparkles,
};

const SCENARIO_DESC: Record<ScenarioType, string> = {
  no_action: "Heç bir aksiya — bazar dövriyyəsi ilə hərəkət.",
  discount: "Endirim tətbiq et və satış sürətini artır.",
  transfer: "Stoku daha tələbatlı filiala transfer et.",
  bundle: "Tamamlayıcı məhsulla paket aksiyası yarat.",
  shelf_visibility: "",
  combined: "Endirim + transferi birləşdir, maksimum xilas.",
};

const TOOLTIP_FORMULA: Record<ScenarioType, string> = {
  no_action:
    "expected_sold = avg_daily_sales × days_to_expiry. Hər şey baselinin altında qalır.",
  discount:
    "uplift = endirim faizinə görə artırma (10% → 1.3x … 50% → 3.2x). net_saved = (yeni gəlir − endirim xərci − əməliyyat) − baseline.",
  transfer:
    "expected_sold = min(qty, hədəf filialın sürəti × günlər). transfer_cost = 8 + 0.05 × qty.",
  bundle:
    "uplift = 1.4x, endirim yalnız paketlənmiş hissəyə (50%) tətbiq olunur.",
  shelf_visibility: "",
  combined:
    "qty hissəsi hədəfə transfer, qalan endirimlə yerli satılır. Hər iki effekt cəmlənir.",
};

export function WhatIfSimulator({
  product,
  store,
  baseline,
  candidateTargetStores,
  candidateCompanions = [],
  defaultDiscountPct = 20,
  defaultTransferPct = 50,
  defaultBundlePct = 10,
  onApply,
  approveDisabled,
  approveDisabledReason,
  variant = "embedded",
}: WhatIfSimulatorProps) {
  const initialTarget = candidateTargetStores[0]?.id ?? null;
  const initialCompanion = candidateCompanions[0]?.id ?? null;

  const [discountPct, setDiscountPct] = useState(defaultDiscountPct);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(initialTarget);
  const [bundleDiscountPct, setBundleDiscountPct] = useState(defaultBundlePct);
  const [bundleCompanionId, setBundleCompanionId] = useState<string | null>(initialCompanion);
  const [selected, setSelected] = useState<ScenarioType>("combined");
  const [debouncedTick, setDebouncedTick] = useState(0);

  const target = useMemo(
    () => candidateTargetStores.find((c) => c.id === transferTargetId) ?? candidateTargetStores[0],
    [candidateTargetStores, transferTargetId],
  );

  // Optimal transfer qty = target_velocity × days_to_expiry (capped to currentStock).
  // At this point, additional qty no longer increases revenue (target saturates)
  // but still adds 0.05 cost per unit → net gain decreases beyond this.
  const optimalTransferQty = useMemo(() => {
    if (!target) return 1;
    const targetMax = Math.round(target.avg_daily_sales * baseline.daysToExpiry);
    return Math.max(1, Math.min(baseline.currentStock, targetMax));
  }, [target, baseline.currentStock, baseline.daysToExpiry]);

  const [transferQty, setTransferQty] = useState(optimalTransferQty);
  const [userTouchedQty, setUserTouchedQty] = useState(false);

  // Reset transferQty to optimal when target/baseline changes — unless user manually edited.
  useEffect(() => {
    if (!userTouchedQty) {
      setTransferQty(optimalTransferQty);
    }
  }, [optimalTransferQty, userTouchedQty]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTick((n) => n + 1), 100);
    return () => clearTimeout(t);
  }, [discountPct, transferQty, transferTargetId, bundleDiscountPct]);

  const calcBaseline: ScenarioBaseline = useMemo(
    () => ({
      currentStock: baseline.currentStock,
      avgDailySales: baseline.avgDailySales7d,
      daysToExpiry: baseline.daysToExpiry,
      costPrice: baseline.costPrice,
      salePrice: baseline.salePrice,
      minimumMarginPct: baseline.minimumMarginPct,
      dataConfidence: baseline.dataConfidence,
    }),
    [baseline],
  );

  const results = useMemo(() => {
    void debouncedTick;
    const noAction = calcNoAction(calcBaseline);
    const discount = calcDiscount(calcBaseline, { discountPct: discountPct / 100 });
    const transfer = target
      ? calcTransfer(calcBaseline, {
          transferQty,
          targetStoreAvgDailySales: target.avg_daily_sales,
        })
      : { ...calcNoAction(calcBaseline), scenarioType: "transfer" as ScenarioType, notViable: true, notViableReason: "No target store" };
    const combined = target
      ? calcCombined(calcBaseline, {
          discountPct: discountPct / 100,
          transferQty,
          targetStoreAvgDailySales: target.avg_daily_sales,
        })
      : { ...discount, scenarioType: "combined" as ScenarioType };
    const stub = (type: ScenarioType): ScenarioResult => ({
      ...noAction,
      scenarioType: type,
      notViable: true,
      notViableReason: "disabled",
    });
    return {
      no_action: noAction,
      discount,
      transfer,
      bundle: stub("bundle" as ScenarioType),
      shelf_visibility: stub("shelf_visibility" as ScenarioType),
      combined,
    } as Record<ScenarioType, ScenarioResult>;
  }, [calcBaseline, discountPct, transferQty, target]);

  const recommendedType = useMemo<ScenarioType>(() => {
    let best: ScenarioType = "no_action";
    let bestVal = -Infinity;
    for (const [type, r] of Object.entries(results) as [ScenarioType, ScenarioResult][]) {
      if (r.notViable) continue;
      if (type === "shelf_visibility" || type === "bundle") continue;
      if (r.netSaved > bestVal) {
        bestVal = r.netSaved;
        best = type;
      }
    }
    return best;
  }, [results]);

  const selectedResult = results[selected];

  function resetDefaults() {
    setDiscountPct(defaultDiscountPct);
    setUserTouchedQty(false);
    setTransferQty(optimalTransferQty);
    setTransferTargetId(initialTarget);
    setBundleDiscountPct(defaultBundlePct);
    setBundleCompanionId(initialCompanion);
    setSelected("combined");
    toast.info("Reset to default scenario parameters");
  }

  const saveSnapshot = useWhatIfStore((s) => s.saveSnapshot);

  function handleSaveSnapshot() {
    saveSnapshot({
      label: `${product.name} — ${SCENARIO_TYPE_LABELS[selected]}`,
      product_id: product.id,
      product_name: product.name,
      store_id: store.id,
      store_code: store.code,
      baseline: {
        currentStock: baseline.currentStock,
        avgDailySales: baseline.avgDailySales7d,
        daysToExpiry: baseline.daysToExpiry,
        costPrice: baseline.costPrice,
        salePrice: baseline.salePrice,
        minimumMarginPct: baseline.minimumMarginPct,
        dataConfidence: baseline.dataConfidence,
      },
      params: {
        discountPct,
        transferQty,
        transferTargetStoreId: transferTargetId,
        bundleDiscountPct,
      },
      selected,
    });
    toast.success("Snapshot saved", {
      description: "Open it later from the What-If Lab.",
    });
  }

  function handleApply() {
    if (approveDisabled) return;
    onApply(selected, selectedResult, {
      discountPct,
      transferQty,
      transferTargetStoreId: transferTargetId,
      bundleDiscountPct,
      bundleCompanionId,
    });
  }

  const chartData = (Object.entries(results) as [ScenarioType, ScenarioResult][])
    .filter(([type]) => type !== "shelf_visibility" && type !== "bundle")
    .map(([type, r]) => ({
      type,
      label: SCENARIO_TYPE_LABELS[type],
      netSaved: r.netSaved,
      isBest: type === recommendedType,
      notViable: r.notViable ?? false,
    }));

  const confidenceLow = baseline.dataConfidence < 50;

  return (
    <section id="whatif" className="space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <FlaskConical className="size-4 text-muted-foreground" aria-hidden />
            What-If Simulator
          </h2>
          <p className="text-xs text-muted-foreground">
            Adjust parameters to compare scenario outcomes in real time. The "Recommended"
            badge follows the highest net saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={resetDefaults}>
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSaveSnapshot}>
            <Save className="size-3.5" aria-hidden />
            Save snapshot
          </Button>
        </div>
      </div>

      {confidenceLow ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/70 px-3 py-2 text-xs dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="text-amber-800 dark:text-amber-200">
            Data confidence is below 50%. Run a stock check before committing to a scenario.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Discount */}
        <div className="space-y-2">
          <ScenarioCard
            type="discount"
            result={results.discount}
            isRecommended={recommendedType === "discount"}
            isSelected={selected === "discount"}
            onSelect={() => setSelected("discount")}
          >
            <SliderRow
              label="Discount %"
              value={discountPct}
              onChange={setDiscountPct}
              min={5}
              max={50}
              step={5}
              unit="%"
              ticks={DISCOUNT_STEPS}
            />
            {results.discount.marginBreached ? (
              <Banner tone="rose" icon={AlertTriangle}>
                Margin breached vs minimum {(baseline.minimumMarginPct * 100).toFixed(0)}%
              </Banner>
            ) : null}
          </ScenarioCard>
          <DetailPanel scenario="discount" result={results.discount} baseline={calcBaseline} />
        </div>

        {/* Transfer */}
        <div className="space-y-2">
          <ScenarioCard
            type="transfer"
            result={results.transfer}
            isRecommended={recommendedType === "transfer"}
            isSelected={selected === "transfer"}
            onSelect={() => !results.transfer.notViable && setSelected("transfer")}
            notViableReason={
              baseline.daysToExpiry <= 1
                ? "Expiry too close for transfer"
                : results.transfer.notViable
                  ? results.transfer.notViableReason
                  : undefined
            }
          >
            {candidateTargetStores.length > 0 ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Target store
                  </label>
                  <Select
                    value={transferTargetId ?? undefined}
                    onValueChange={(v) => setTransferTargetId(v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {candidateTargetStores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-medium">{s.code}</span>
                          <span className="ml-1.5 text-muted-foreground">
                            stock {s.current_stock} • velocity {s.avg_daily_sales.toFixed(1)}/d
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SliderRow
                  label="Transfer qty"
                  value={transferQty}
                  onChange={(v) => {
                    setUserTouchedQty(true);
                    setTransferQty(v);
                  }}
                  min={1}
                  max={Math.max(1, baseline.currentStock)}
                  step={1}
                  unit=""
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Cost ≈ {formatAZN(8 + 0.05 * transferQty, { compact: true })}</span>
                  {transferQty !== optimalTransferQty ? (
                    <button
                      type="button"
                      className="rounded border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      onClick={() => {
                        setUserTouchedQty(false);
                        setTransferQty(optimalTransferQty);
                      }}
                    >
                      Optimal: {optimalTransferQty}
                    </button>
                  ) : (
                    <span className="rounded border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ✓ Optimal
                    </span>
                  )}
                </div>
              </>
            ) : (
              <Banner tone="muted" icon={Info}>
                No alternative target stores available.
              </Banner>
            )}
          </ScenarioCard>
          <DetailPanel scenario="transfer" result={results.transfer} baseline={calcBaseline} />
        </div>

        {/* Combined */}
        <div className="space-y-2">
          <ScenarioCard
            type="combined"
            result={results.combined}
            isRecommended={recommendedType === "combined"}
            isSelected={selected === "combined"}
            onSelect={() => !results.combined.notViable && setSelected("combined")}
            notViableReason={
              baseline.daysToExpiry <= 1
                ? "Expiry too close for transfer"
                : results.combined.notViable
                  ? results.combined.notViableReason
                  : undefined
            }
          />
          <DetailPanel scenario="combined" result={results.combined} baseline={calcBaseline} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-md backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
          <FlaskConical className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Selected:</span>
          <span className="font-medium">{SCENARIO_TYPE_LABELS[selected]}</span>
          <span className="text-muted-foreground">•</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              selectedResult.netSaved >= 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300",
            )}
          >
            {formatAZN(selectedResult.netSaved, { compact: true, sign: true })}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={resetDefaults}>
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </Button>
        {approveDisabled ? (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button size="sm" disabled className="h-8 gap-1.5 text-xs">
                <Lock className="size-3.5" aria-hidden />
                Approve scenario
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-64 text-xs">
              {approveDisabledReason ?? "Approval is not available in this view."}
            </HoverCardContent>
          </HoverCard>
        ) : (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleApply}>
            <CheckCircle2 className="size-3.5" aria-hidden />
            {variant === "embedded" ? "Approve this scenario" : "Apply scenario"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </section>
  );
}

interface ScenarioCardProps {
  type: ScenarioType;
  result: ScenarioResult;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
  notViableReason?: string;
  children?: React.ReactNode;
  big?: boolean;
}

function ScenarioCard({
  type,
  result,
  isRecommended,
  isSelected,
  onSelect,
  notViableReason,
  children,
  big,
}: ScenarioCardProps) {
  const Icon = SCENARIO_ICON[type];
  const netSaved = result.netSaved;
  const positive = netSaved >= 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow",
        big && "border-primary/30",
        isSelected && "ring-2 ring-primary/50",
        isRecommended && !isSelected && "border-emerald-500/40 ring-1 ring-emerald-500/20",
        notViableReason && "opacity-90",
      )}
    >
      {notViableReason ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-3 text-center text-[11px] font-medium text-white">
          <span className="rounded-md bg-slate-800/80 px-2 py-1">
            {notViableReason}
          </span>
        </div>
      ) : null}
      {isRecommended ? (
        <div className="absolute right-2 top-2 z-[1] inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
          <Sparkles className="size-3" aria-hidden />
          Recommended
        </div>
      ) : null}
      <CardContent className={cn("space-y-3 p-3", big && "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted p-1.5">
              <Icon className="size-3.5 text-foreground" aria-hidden />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{SCENARIO_TYPE_LABELS[type]}</div>
              <div className="text-[10px] text-muted-foreground">{SCENARIO_DESC[type]}</div>
            </div>
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label="Formula"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Info className="size-3" aria-hidden />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 text-[11px]">
              <p className="font-medium">{SCENARIO_TYPE_LABELS[type]}</p>
              <p className="mt-1 text-muted-foreground">{TOOLTIP_FORMULA[type]}</p>
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <Mini label="Sold" value={result.expectedSold.toFixed(0)} />
          <Mini
            label="Recovered"
            value={formatAZN(result.recoveredValue, { compact: true })}
            tone="text-emerald-700 dark:text-emerald-300"
          />
          <Mini
            label="Discount cost"
            value={formatAZN(result.discountCost, { compact: true })}
            tone="text-amber-700 dark:text-amber-400"
          />
          <Mini
            label="Transfer cost"
            value={formatAZN(result.transferCost, { compact: true })}
            tone="text-sky-700 dark:text-sky-300"
          />
        </div>

        <div
          className={cn(
            "rounded-md border px-2 py-2 text-center transition-colors",
            positive
              ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30"
              : "border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/30",
          )}
        >
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Net Saved
          </div>
          <div
            className={cn(
              "text-2xl font-bold tabular-nums",
              positive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
            )}
          >
            {formatAZN(netSaved, { compact: true, sign: true })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium tabular-nums">{result.confidenceScore}%</span>
            </div>
            <Progress value={result.confidenceScore} className="mt-1 h-1.5" />
          </div>
          <ConfidenceBadge score={result.confidenceScore} className="hidden md:inline-flex" />
        </div>

        {children ? <div className="space-y-2 border-t pt-2">{children}</div> : null}

        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="h-8 w-full text-xs"
          onClick={onSelect}
          disabled={!!notViableReason}
        >
          {isSelected ? "Selected" : "Select this scenario"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CostHover({ result }: { result: ScenarioResult }) {
  const total = result.discountCost + result.transferCost + result.operationalCost;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-start rounded border bg-background p-1.5 text-left hover:bg-muted/30"
        >
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Cost</span>
          <span className="text-xs font-semibold tabular-nums">
            {formatAZN(total, { compact: true })}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-52 space-y-1 text-[11px]">
        <p className="font-medium">Cost breakdown</p>
        <KV
          label="Discount"
          value={formatAZN(result.discountCost, { compact: true })}
          valueClassName="text-amber-700 dark:text-amber-400"
        />
        <KV label="Transfer" value={formatAZN(result.transferCost, { compact: true })} />
        <KV label="Operational" value={formatAZN(result.operationalCost, { compact: true })} />
      </HoverCardContent>
    </HoverCard>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border bg-background p-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xs font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function KV({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  ticks?: number[];
}

function SliderRow({ label, value, onChange, min, max, step, unit, ticks }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="py-1"
      />
      {ticks ? (
        <div className="flex justify-between px-0.5 text-[9px] text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className={cn(t === value && "font-semibold text-foreground")}>
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Banner({
  tone,
  icon: Icon,
  children,
}: {
  tone: "rose" | "amber" | "muted";
  icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-500/40 bg-rose-50/70 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-50/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-dashed bg-muted/40 text-muted-foreground";
  return (
    <div className={cn("flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px]", toneClass)}>
      <Icon className="mt-0.5 size-3" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

function DetailPanel({
  scenario,
  result,
  baseline,
}: {
  scenario: ScenarioType;
  result: ScenarioResult;
  baseline: ScenarioBaseline;
}) {
  const fmt = (n: number) => formatAZN(n, { compact: false });
  const stock = baseline.currentStock;
  const totalCostBasis = stock * baseline.costPrice;
  const totalSalePotential = stock * baseline.salePrice;

  // No-action baseline
  const baselineSold = Math.min(stock, baseline.avgDailySales * baseline.daysToExpiry);
  const baselineUnsold = Math.max(0, stock - baselineSold);
  const noActionLoss = baselineUnsold * baseline.costPrice;

  // Action numbers
  const sold = result.expectedSold;
  const unsoldAfterAction = Math.max(0, stock - sold);
  const residualLoss = unsoldAfterAction * baseline.costPrice;
  const actionCost = result.transferCost; // only transfer counts as real cost per spec
  const actionRevenue = result.recoveredValue;

  // G = ziyan (loss) after action: action_cost + residual_loss − action_revenue
  //     - positive = still net loss; negative = action turned a profit
  const G = actionCost + residualLoss - actionRevenue;
  // K = ziyan if no action: no-action loss − baseline revenue
  const baselineRevenue = baselineSold * baseline.salePrice;
  const K = noActionLoss - baselineRevenue;
  // Action net qazancı = ABS(G − K) — magnitude of improvement
  const actionNetGain = Math.abs(G - K);

  const actionCostFormula =
    actionCost > 0
      ? `Transfer: 8 + 0.05 × ${sold.toFixed(0)}`
      : scenario === "discount"
        ? "Yoxdur (endirim gəlirə təsir edir)"
        : scenario === "no_action"
          ? "Yoxdur"
          : "Yoxdur";

  const rows: Array<{
    label: string;
    formula: string;
    value: string;
    tone: BreakdownTone;
    big?: boolean;
  }> = [
    {
      label: "Stokun cost dəyəri",
      formula: `${stock} × ${formatAZN(baseline.costPrice)}`,
      value: fmt(totalCostBasis),
      tone: "muted",
    },
    {
      label: "Stokun satış dəyəri",
      formula: `${stock} × ${formatAZN(baseline.salePrice)}`,
      value: fmt(totalSalePotential),
      tone: "muted",
    },
    {
      label: "Action olmazsa itki (K)",
      formula: `${baselineUnsold.toFixed(0)} satılmaz × ${formatAZN(baseline.costPrice)}`,
      value: fmt(noActionLoss),
      tone: "loss",
    },
    {
      label: "Action xərci",
      formula: actionCostFormula,
      value: fmt(actionCost),
      tone: actionCost > 0 ? "cost" : "muted",
    },
    {
      label: "Action satış məbləği",
      formula: `${sold.toFixed(0)} satılır${scenario === "discount" || scenario === "combined" ? " (endirimli)" : ""}`,
      value: fmt(actionRevenue),
      tone: "revenue",
    },
    {
      label: "Action sonrası ziyan",
      formula: `${unsoldAfterAction.toFixed(0)} × ${formatAZN(baseline.costPrice)}`,
      value: fmt(residualLoss),
      tone: "loss",
    },
    {
      label: "Action net qazancı",
      formula: `|G − K|  =  |${fmt(G)} − ${fmt(K)}|`,
      value: fmt(actionNetGain),
      tone: "profit",
      big: true,
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            Detail · {SCENARIO_TYPE_LABELS[scenario]}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Net qazanc:{" "}
            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatAZN(actionNetGain, { compact: true })}
            </span>
          </span>
        </div>

        <div className="space-y-1.5">
          {rows.slice(0, 6).map((r) => (
            <BreakdownRow key={r.label} {...r} />
          ))}
          <BreakdownRow {...rows[6]} />
        </div>
      </CardContent>
    </Card>
  );
}

type BreakdownTone = "muted" | "loss" | "cost" | "revenue" | "profit";

function BreakdownRow({
  label,
  formula,
  value,
  tone,
  big,
}: {
  label: string;
  formula: string;
  value: string;
  tone: BreakdownTone;
  big?: boolean;
}) {
  const valueTone =
    tone === "loss"
      ? "text-rose-700 dark:text-rose-300"
      : tone === "cost"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "revenue"
          ? "text-sky-700 dark:text-sky-300"
          : tone === "profit"
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-foreground";
  const borderTone =
    tone === "profit"
      ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30"
      : tone === "loss"
        ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
        : tone === "cost"
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
          : tone === "revenue"
            ? "border-sky-200 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20"
            : "border-border bg-background";
  return (
    <div className={cn("flex items-center gap-2 rounded border px-2 py-1.5", borderTone, big && "px-2.5 py-2")}>
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium leading-tight", big ? "text-xs" : "text-[11px]")}>{label}</div>
        <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{formula}</div>
      </div>
      <div
        className={cn(
          "shrink-0 text-right font-semibold tabular-nums",
          big ? "text-base" : "text-xs",
          valueTone,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function marginAt(
  scenario: ScenarioType,
  _result: ScenarioResult,
  baseline: ScenarioBaseline,
): number | null {
  if (scenario === "discount" || scenario === "combined") {
    return null;
  }
  if (scenario === "bundle") {
    return null;
  }
  return null;
}

function buildNarrative(
  scenario: ScenarioType,
  result: ScenarioResult,
  baseline: ScenarioBaseline,
): string {
  const baseRev = baseline.avgDailySales * baseline.daysToExpiry * baseline.salePrice;
  const finalRev = result.recoveredValue - (result.discountCost + result.transferCost + result.operationalCost);
  const delta = finalRev - baseRev;
  const deltaTxt = formatAZN(delta, { compact: true, sign: true });

  switch (scenario) {
    case "no_action":
      return `Without intervention the product is expected to sell ${result.expectedSold.toFixed(
        0,
      )} units, recovering ${formatAZN(result.recoveredValue, {
        compact: true,
      })}. Anything above this baseline is the value other scenarios unlock.`;
    case "discount":
      return `A discount lifts effective velocity and rescues ${result.expectedSold.toFixed(
        0,
      )} units. Net of the markdown and ${formatAZN(result.operationalCost, {
        compact: true,
      })} operational cost, this nets ${deltaTxt} versus the baseline.`;
    case "transfer":
      return `Transferring stock to a higher-velocity store should sell ${result.expectedSold.toFixed(
        0,
      )} units at full price. Net of ${formatAZN(result.transferCost, {
        compact: true,
      })} transport, this nets ${deltaTxt} vs leaving it on the source shelf.`;
    case "bundle":
      return `Bundling with a partner product uses a 1.4× uplift and a smaller margin hit. Expect ${result.expectedSold.toFixed(
        0,
      )} units moved with a net of ${deltaTxt}.`;
    case "shelf_visibility":
      return `Re-merchandising boosts sell-through by ~1.2× with only ${formatAZN(result.operationalCost, {
        compact: true,
      })} of labor. Cheap, but capped — net of ${deltaTxt}.`;
    case "combined":
      return `Splitting stock between a transfer and a local discount captures both demand pools. Together they move ${result.expectedSold.toFixed(
        0,
      )} units and net ${deltaTxt} vs the do-nothing baseline.`;
    default:
      return "";
  }
}
