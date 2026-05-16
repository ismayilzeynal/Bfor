"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Combine,
  Percent,
  ShieldOff,
  Truck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiskBadge } from "@/components/badges/risk-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  computeScenarioImpact,
  type ScenarioBaseline,
  type ScenarioImpact,
} from "@/lib/scenario-calculator";
import type { ScenarioType } from "@/types";
import type { RiskyRow } from "./types";

interface RowPreviewSheetProps {
  row: RiskyRow | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (row: RiskyRow) => void;
  onReject: (row: RiskyRow) => void;
}

type PickableScenario = "discount" | "transfer" | "combined";

export function RowPreviewSheet({
  row,
  onOpenChange,
  onApprove,
  onReject,
}: RowPreviewSheetProps) {
  const router = useRouter();

  const scenarios = useMemo(() => {
    if (!row?.prediction) return null;
    const baseline: ScenarioBaseline = {
      currentStock: row.prediction.current_stock,
      avgDailySales: row.prediction.avg_daily_sales_7d,
      daysToExpiry: row.prediction.days_to_expiry,
      costPrice: row.product.cost_price,
      salePrice: row.product.sale_price,
      minimumMarginPct: row.product.minimum_margin_pct,
      dataConfidence: row.prediction.data_confidence_score,
    };
    return {
      discount: computeScenarioImpact(baseline, "discount"),
      transfer: computeScenarioImpact(baseline, "transfer"),
      combined: computeScenarioImpact(baseline, "combined"),
    };
  }, [row]);

  const transferDisabled = row ? row.prediction.days_to_expiry <= 1 : false;

  const recommended: PickableScenario = useMemo(() => {
    if (!scenarios) return "combined";
    const entries: Array<[PickableScenario, ScenarioImpact]> = [
      ["discount", scenarios.discount],
      ...(transferDisabled
        ? []
        : ([
            ["transfer", scenarios.transfer],
            ["combined", scenarios.combined],
          ] as Array<[PickableScenario, ScenarioImpact]>)),
    ];
    let best: PickableScenario = "discount";
    let bestVal = -Infinity;
    for (const [type, i] of entries) {
      if (i.lossReduction > bestVal) {
        bestVal = i.lossReduction;
        best = type;
      }
    }
    return best;
  }, [scenarios, transferDisabled]);

  const [selected, setSelected] = useState<PickableScenario>(recommended);

  useEffect(() => {
    setSelected(recommended);
  }, [recommended, row?.id]);

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        {row ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-2 pr-6">
                <div className="min-w-0">
                  <SheetTitle className="truncate">{row.product.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    <span className="font-mono">{row.product.sku}</span>
                    <span className="mx-1.5">·</span>
                    <span>{row.store.name}</span>
                  </SheetDescription>
                </div>
                <RiskBadge level={row.prediction.risk_level} />
              </div>
            </SheetHeader>

            <Separator />

            <section className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Risk score" value={String(row.prediction.risk_score)} />
                <Stat label="Days to expiry" value={formatDaysToExpiry(row.prediction.days_to_expiry)} />
                <Stat label="Stock" value={String(row.prediction.current_stock)} />
                <Stat
                  label="Avg 7d sales"
                  value={row.prediction.avg_daily_sales_7d.toFixed(1)}
                />
                <Stat
                  label="Predicted loss"
                  value={formatAZN(row.prediction.predicted_loss_value, { compact: true })}
                  tone="text-rose-700"
                />
                <Stat
                  label="Data confidence"
                  value={`${Math.round(row.prediction.data_confidence_score)}%`}
                />
              </div>

            </section>

            <Separator />

            {scenarios ? (
              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Choose a scenario
                </p>
                <div className="space-y-1.5">
                  <ScenarioRow
                    type="discount"
                    label="Discount"
                    icon={Percent}
                    impact={scenarios.discount}
                    selected={selected === "discount"}
                    recommended={recommended === "discount"}
                    onSelect={() => setSelected("discount")}
                  />
                  <ScenarioRow
                    type="transfer"
                    label="Transfer"
                    icon={Truck}
                    impact={scenarios.transfer}
                    selected={selected === "transfer"}
                    recommended={recommended === "transfer"}
                    onSelect={() => setSelected("transfer")}
                    notViableReason={transferDisabled ? "Expiry too close" : undefined}
                  />
                  <ScenarioRow
                    type="combined"
                    label="Discount + Transfer"
                    icon={Combine}
                    impact={scenarios.combined}
                    selected={selected === "combined"}
                    recommended={recommended === "combined"}
                    onSelect={() => setSelected("combined")}
                    notViableReason={transferDisabled ? "Expiry too close" : undefined}
                  />
                </div>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">No prediction data to score scenarios.</p>
            )}

            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => router.push(`/products/${row.product.id}`)}>
                Open product details
                <ArrowUpRight className="ml-1 size-3.5" aria-hidden />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={() => onApprove(row)}
                  disabled={!row.recommendation}
                >
                  <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
                  Approve
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => onReject(row)}
                  disabled={!row.recommendation}
                >
                  <ShieldOff className="mr-1 size-3.5" aria-hidden />
                  Reject
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ScenarioRow({
  type: _type,
  label,
  icon: Icon,
  impact,
  selected,
  recommended,
  onSelect,
  notViableReason,
}: {
  type: ScenarioType;
  label: string;
  icon: typeof Truck;
  impact: ScenarioImpact;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
  notViableReason?: string;
}) {
  const positive = impact.lossReduction >= 0;
  const disabled = !!notViableReason;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
        selected && !disabled && "border-primary bg-primary/10",
        !selected && !disabled && "border-border bg-background hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}
        aria-hidden
      >
        {selected ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
      </span>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{label}</span>
          {recommended && !disabled ? (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Recommended
            </span>
          ) : null}
          {disabled ? (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {notViableReason}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Ziyan azaltması</div>
        <div
          className={cn(
            "text-sm font-semibold tabular-nums",
            positive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
          )}
        >
          {formatAZN(impact.lossReduction, { compact: true })}
        </div>
      </div>
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
