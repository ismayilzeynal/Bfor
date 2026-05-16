"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  Boxes,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Sparkles,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ActionImpactAnimation } from "./action-impact-animation";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import {
  computeScenarioImpact,
  type ScenarioBaseline,
} from "@/lib/scenario-calculator";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { Product, Recommendation, RiskPrediction, Store } from "@/types";

interface RescueModeModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  store: Store | null;
  prediction: RiskPrediction | null;
  recommendation: Recommendation | null;
}

type Phase = "situation" | "calculating" | "plan" | "approved";

export function RescueModeModal({
  open,
  onClose,
  product,
  store,
  prediction,
  recommendation,
}: RescueModeModalProps) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const approve = useActionsStore((s) => s.approve);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const [phase, setPhase] = useState<Phase>("situation");
  const [impactOpen, setImpactOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("situation");
      setImpactOpen(false);
    }
  }, [open]);

  if (!product || !store || !prediction) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No rescue data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            We don't have a fresh risk reading for this product yet.
          </p>
          <Button size="sm" onClick={onClose} className="self-end">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const recoveryScore = recommendation
    ? Math.min(100, Math.round(recommendation.confidence_score))
    : 0;
  const recoveredEstimate = recommendation?.expected_recovered_value ?? 0;
  const netSaved = recommendation?.net_saved_value ?? 0;
  const deadline = "Bu gün, 18:00";

  function startCalculation() {
    setPhase("calculating");
    window.setTimeout(() => setPhase("plan"), 1400);
  }

  function approvePlan() {
    if (!recommendation) {
      toast.error("Rescue plan not available — no AI recommendation.");
      return;
    }
    approve({
      recommendation_id: recommendation.id,
      user_id: currentUser.id,
      note: "Rescue mode approval",
    });
    appendAudit({
      id: `aud-rescue-${Date.now()}`,
      user_id: currentUser.id,
      action: "approve_recommendation",
      entity_type: "recommendation",
      entity_id: recommendation.id,
      old_value: { status: recommendation.status },
      new_value: { status: "approved", note: "Rescue mode" },
      created_at: new Date().toISOString(),
      ip_address: "mock",
    });
    setPhase("approved");
    setImpactOpen(true);
  }

  const planLines = buildPlanLines(recommendation, prediction);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <div className="relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted/60"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>

            {/* Hero */}
            <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 p-5 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-emerald-950/30">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-rose-600" />
                </span>
                Rescue case
              </div>
              <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight">
                Rescue Case: {product.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {store.name} · This product can still be recovered before it becomes waste.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className="bg-rose-600 text-[10px] uppercase tracking-wide text-white hover:bg-rose-600">
                  {prediction.risk_level === "critical" ? "Critical" : prediction.risk_level.toUpperCase()}
                </Badge>
                {recoveryScore >= 60 ? (
                  <Badge className="bg-emerald-600 text-[10px] uppercase tracking-wide text-white hover:bg-emerald-600">
                    High recovery chance
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-[10px]">
                  <AlarmClock className="mr-1 size-3" aria-hidden />
                  Action needed today
                </Badge>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Situation cards */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <SituationCard
                  label="Stock"
                  value={String(prediction.current_stock)}
                  tone="default"
                />
                <SituationCard
                  label="Expiry"
                  value={formatDaysToExpiry(prediction.days_to_expiry)}
                  tone={prediction.days_to_expiry <= 1 ? "danger" : prediction.days_to_expiry <= 3 ? "warning" : "default"}
                />
                <SituationCard
                  label="Daily sales"
                  value={`${prediction.avg_daily_sales_7d.toFixed(1)}/day`}
                  tone="default"
                />
                <SituationCard
                  label="Potential loss"
                  value={formatAZN(prediction.predicted_loss_value, { compact: true })}
                  tone="danger"
                />
                <SituationCard
                  label="Risk score"
                  value={`${Math.round(prediction.risk_score)}%`}
                  tone={
                    prediction.risk_score >= 80
                      ? "danger"
                      : prediction.risk_score >= 60
                        ? "warning"
                        : "default"
                  }
                />
              </div>

              <AnimatePresence mode="wait">
                {phase === "situation" ? (
                  <motion.div
                    key="situation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-end gap-2 pt-1"
                  >
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      Close
                    </Button>
                    <Button size="sm" onClick={startCalculation} className="gap-1.5">
                      <Sparkles className="size-3.5" aria-hidden />
                      Calculate rescue plan
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Button>
                  </motion.div>
                ) : null}

                {phase === "calculating" ? (
                  <motion.div
                    key="calc"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-muted/30 py-6"
                  >
                    <Loader2 className="size-6 animate-spin text-emerald-600" aria-hidden />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Bfor is calculating the best rescue plan…
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Evaluating discount, transfer and combined strategies.
                      </p>
                    </div>
                  </motion.div>
                ) : null}

                {phase === "plan" || phase === "approved" ? (
                  <motion.div
                    key="plan"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-2 rounded-md border border-emerald-500/40 bg-emerald-50/60 p-3 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-emerald-600" aria-hidden />
                        <h3 className="text-sm font-semibold">Recommended rescue plan</h3>
                        <Badge className="ml-auto bg-emerald-600 text-[10px] uppercase tracking-wide text-white hover:bg-emerald-600">
                          Recommended
                        </Badge>
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {planLines.map((line, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-sm border bg-background px-2 py-1.5"
                          >
                            <line.icon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <span className="leading-snug">{line.text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <PlanMetric
                          label="Expected net saved"
                          value={formatAZN(netSaved, { compact: true })}
                          tone="emerald"
                        />
                        <PlanMetric
                          label="Action deadline"
                          value={deadline}
                          tone="amber"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Recovery confidence</span>
                          <span className="font-semibold tabular-nums">{recoveryScore}%</span>
                        </div>
                        <Progress
                          value={recoveryScore}
                          className={cn(
                            "h-1.5",
                            recoveryScore >= 75
                              ? "[&>div]:bg-emerald-500"
                              : recoveryScore >= 40
                                ? "[&>div]:bg-amber-500"
                                : "[&>div]:bg-rose-500"
                          )}
                        />
                      </div>
                    </div>

                    {phase === "plan" ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            onClose();
                            router.push(`/products/${product.id}#whatif`);
                          }}
                        >
                          <FlaskConical className="size-3.5" aria-hidden />
                          View What-If
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={approvePlan}>
                          <CheckCircle2 className="size-3.5" aria-hidden />
                          Approve rescue plan
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            onClose();
                            router.push("/tasks");
                          }}
                        >
                          View created task
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {(() => {
        const baseline: ScenarioBaseline = {
          currentStock: prediction.current_stock,
          avgDailySales: prediction.avg_daily_sales_7d,
          daysToExpiry: prediction.days_to_expiry,
          costPrice: product.cost_price,
          salePrice: product.sale_price,
          minimumMarginPct: product.minimum_margin_pct,
          dataConfidence: prediction.data_confidence_score,
        };
        const impact = computeScenarioImpact(baseline, "combined");
        return (
          <ActionImpactAnimation
            open={impactOpen}
            onClose={() => {
              setImpactOpen(false);
              onClose();
            }}
            productName={product.name}
            potentialLossBefore={impact.K}
            recoveredValueAfter={impact.lossReduction}
            riskBefore={impact.riskBeforePct}
            riskAfter={impact.riskAfterPct}
          />
        );
      })()}
    </>
  );
}

function SituationCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/60 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-300"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/60 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300"
        : "border-border bg-background";
  return (
    <div className={cn("rounded-md border p-2", toneClass)}>
      <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlanMetric({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300 bg-background text-emerald-800 dark:text-emerald-200"
      : "border-amber-300 bg-background text-amber-800 dark:text-amber-200";
  return (
    <div className={cn("rounded-md border p-2", toneClass)}>
      <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function buildPlanLines(
  recommendation: Recommendation | null,
  prediction: RiskPrediction
): Array<{ icon: typeof Truck; text: string }> {
  if (!recommendation) {
    return [
      {
        icon: Boxes,
        text: "Monitor — no high-confidence rescue strategy generated. Keep an eye on velocity.",
      },
    ];
  }

  const lines: Array<{ icon: typeof Truck; text: string }> = [];
  const type = recommendation.recommendation_type;

  if (type === "transfer" || type === "combined") {
    const qty = Math.min(
      prediction.current_stock,
      Math.round(prediction.avg_daily_sales_7d * 1.5 * prediction.days_to_expiry)
    );
    lines.push({
      icon: Truck,
      text: `Transfer ${qty} units to a faster-selling branch (Gənclik or Nərimanov).`,
    });
  }
  if (type === "discount" || type === "combined") {
    const remaining = Math.max(0, prediction.current_stock - (type === "combined" ? 80 : 0));
    lines.push({
      icon: TrendingUp,
      text: `Apply ${type === "combined" ? "20" : "25"}% discount on the remaining ${remaining > 0 ? remaining : prediction.current_stock} units.`,
    });
  }
  if (type === "monitor" || type === "no_action") {
    lines.push({
      icon: Boxes,
      text: recommendation.recommendation_text || "Hold and monitor velocity.",
    });
  }
  if (type === "stock_check") {
    lines.push({
      icon: Boxes,
      text: "Run a stock check — current data confidence is low.",
    });
  }
  if (lines.length === 0) {
    lines.push({ icon: Boxes, text: recommendation.recommendation_text });
  }
  return lines;
}
