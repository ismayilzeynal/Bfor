"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatAZN } from "@/lib/formatters";
import { SCENARIO_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScenarioType } from "@/types";
import type { ScenarioResult, ScenarioBaseline } from "@/lib/scenario-calculator";

interface Props {
  scenario: ScenarioType;
  result: ScenarioResult;
  baseline: ScenarioBaseline;
  recommendedType: ScenarioType;
}

export function BeforeAfterSimulation({ scenario, result, baseline, recommendedType }: Props) {
  const view = useMemo(() => {
    const stock = baseline.currentStock;
    const baselineSold = Math.min(stock, baseline.avgDailySales * baseline.daysToExpiry);
    const baselineUnsold = Math.max(0, stock - baselineSold);
    const noActionLoss = baselineUnsold * baseline.costPrice;
    const noActionRiskPct = stock > 0 ? (baselineUnsold / stock) * 100 : 0;

    const sold = result.expectedSold;
    const unsoldAfter = Math.max(0, stock - sold);
    const productsSaved = Math.max(0, sold - baselineSold);
    const remainingRiskPct = stock > 0 ? (unsoldAfter / stock) * 100 : 0;
    const recoveredValue = result.recoveredValue;

    const lossAvoided = Math.max(0, noActionLoss - unsoldAfter * baseline.costPrice);
    const netSavedAbs = Math.max(
      0,
      Math.abs(result.recoveredValue - result.transferCost - unsoldAfter * baseline.costPrice -
        (baselineSold * baseline.salePrice - noActionLoss))
    );
    const riskReduction = Math.max(0, noActionRiskPct - remainingRiskPct);

    return {
      noActionLoss,
      baselineUnsold,
      noActionRiskPct,
      recoveredValue,
      productsSaved,
      remainingRiskPct,
      lossAvoided,
      netSavedAbs,
      riskReduction,
    };
  }, [baseline, result]);

  const isRecommended = scenario === recommendedType;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-rose-50/40 via-background to-emerald-50/40 dark:border-emerald-900/40 dark:from-rose-950/20 dark:to-emerald-950/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <CardTitle className="text-base">Before / After Simulation</CardTitle>
            <Badge
              variant="outline"
              className="rounded-full text-[10px] uppercase tracking-wide"
            >
              {SCENARIO_TYPE_LABELS[scenario]}
            </Badge>
            {isRecommended ? (
              <Badge className="bg-emerald-600 text-[10px] uppercase tracking-wide text-white hover:bg-emerald-600">
                Recommended
              </Badge>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Bfor's intervention vs leaving the product alone.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          {/* Without Bfor */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/30"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600" aria-hidden />
              <h4 className="text-sm font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                Without Bfor
              </h4>
            </div>
            <BAStat
              icon={TrendingDown}
              label="Potential loss"
              value={formatAZN(view.noActionLoss, { compact: false })}
              tone="rose"
              big
            />
            <BAStat
              icon={PackageCheck}
              label="Unsold quantity"
              value={`${view.baselineUnsold.toFixed(0)} units`}
              tone="rose"
            />
            <BAStat
              icon={ShieldAlert}
              label="Waste risk"
              value={`${view.noActionRiskPct.toFixed(0)}%`}
              tone="rose"
              progress={view.noActionRiskPct}
              progressTone="rose"
            />
          </motion.div>

          {/* Arrow */}
          <div className="flex items-center justify-center text-muted-foreground">
            <ArrowRight className="hidden size-6 text-emerald-600 md:block" aria-hidden />
            <div className="block text-center md:hidden">
              <ArrowRight className="mx-auto size-5 rotate-90 text-emerald-600" aria-hidden />
            </div>
          </div>

          {/* With Bfor */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 rounded-lg border-2 border-emerald-500 bg-emerald-50/70 p-4 shadow-md dark:border-emerald-600 dark:bg-emerald-950/40"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600" aria-hidden />
              <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                With Bfor
              </h4>
            </div>
            <BAStat
              icon={TrendingUp}
              label="Expected recovery"
              value={formatAZN(view.recoveredValue, { compact: false })}
              tone="emerald"
              big
            />
            <BAStat
              icon={PackageCheck}
              label="Products recovered"
              value={`${view.productsSaved.toFixed(0)} units`}
              tone="emerald"
            />
            <BAStat
              icon={ShieldAlert}
              label="Remaining risk"
              value={`${view.remainingRiskPct.toFixed(0)}%`}
              tone="emerald"
              progress={view.remainingRiskPct}
              progressTone="emerald"
            />
          </motion.div>
        </div>

        {/* Summary strip */}
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border bg-background/80 p-3 sm:grid-cols-3">
          <Summary
            label="Loss avoided"
            value={formatAZN(view.lossAvoided, { compact: true })}
            tone="emerald"
          />
          <Summary
            label="Risk reduced"
            value={`−${view.riskReduction.toFixed(0)}%`}
            tone="emerald"
          />
          <Summary
            label="Net saved value"
            value={formatAZN(view.netSavedAbs, { compact: true })}
            tone="emerald"
            highlight
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BAStat({
  icon: Icon,
  label,
  value,
  tone,
  big,
  progress,
  progressTone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: "rose" | "emerald";
  big?: boolean;
  progress?: number;
  progressTone?: "rose" | "emerald";
}) {
  const valueTone =
    tone === "rose"
      ? "text-rose-700 dark:text-rose-300"
      : "text-emerald-700 dark:text-emerald-300";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      <div className={cn("font-bold tabular-nums", big ? "text-2xl" : "text-base", valueTone)}>
        {value}
      </div>
      {progress !== undefined ? (
        <Progress
          value={Math.min(100, Math.max(0, progress))}
          className={cn(
            "h-1.5",
            progressTone === "rose" ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500"
          )}
        />
      ) : null}
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone: "emerald";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        highlight
          ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-border bg-background"
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-semibold tabular-nums",
          highlight ? "text-lg text-emerald-700 dark:text-emerald-300" : "text-sm text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}
