"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Target,
  CheckCircle2,
  Truck,
  Percent,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useActionsStore } from "@/store/actions-store";
import type { Recommendation, RiskPrediction, Task } from "@/types";

interface MissionBoardProps {
  predictions: RiskPrediction[];
  recommendations: Recommendation[];
  tasks: Task[];
}

export function MissionBoard({ predictions, recommendations, tasks }: MissionBoardProps) {
  const router = useRouter();
  const decisions = useActionsStore((s) => s.decisions);

  const stats = useMemo(() => {
    const visibleRecs = recommendations.filter(
      (r) => r.recommendation_type !== "shelf_visibility" && r.recommendation_type !== "bundle"
    );

    // Target: total potential loss we want to save today
    const lossTarget = predictions.reduce((sum, p) => sum + p.predicted_loss_value, 0);

    // Recovered so far: sum of net_saved for approved/completed recs (live decisions)
    const approvedIds = new Set(
      decisions.filter((d) => d.decision === "approved").map((d) => d.recommendation_id)
    );
    const approvedRecs = visibleRecs.filter((r) => approvedIds.has(r.id));
    const recoveredValue = approvedRecs.reduce(
      (sum, r) => sum + Math.max(0, r.net_saved_value + r.expected_cost),
      0
    );

    // Action items
    const totalActions = visibleRecs.length;
    const completedActions = approvedRecs.length;

    // Transfer actions
    const transferRecs = visibleRecs.filter(
      (r) => r.recommendation_type === "transfer" || r.recommendation_type === "combined"
    );
    const transfersDone = transferRecs.filter((r) => approvedIds.has(r.id)).length;

    // Discount actions
    const discountRecs = visibleRecs.filter(
      (r) => r.recommendation_type === "discount" || r.recommendation_type === "combined"
    );
    const discountsDone = discountRecs.filter((r) => approvedIds.has(r.id)).length;

    // Risk reduction approximation
    const totalRisk = predictions.reduce((sum, p) => sum + p.risk_score, 0);
    const handledRisk = approvedRecs.reduce((sum, r) => {
      const pred = predictions.find((p) => p.product_id === r.product_id);
      return sum + (pred?.risk_score ?? 0);
    }, 0);
    const riskReductionPct = totalRisk > 0 ? (handledRisk / totalRisk) * 100 : 0;

    // Tasks completed today
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const totalTasks = tasks.length;

    const overallProgress =
      totalActions === 0 ? 0 : Math.round((completedActions / totalActions) * 100);

    return {
      lossTarget,
      recoveredValue,
      totalActions,
      completedActions,
      transfersDone,
      transfersTotal: transferRecs.length,
      discountsDone,
      discountsTotal: discountRecs.length,
      riskReductionPct,
      completedTasks,
      totalTasks,
      overallProgress,
    };
  }, [predictions, recommendations, tasks, decisions]);

  const status =
    stats.overallProgress >= 60
      ? { label: "On track", tone: "text-emerald-700 bg-emerald-100 border-emerald-200" }
      : stats.overallProgress >= 25
        ? { label: "Needs attention", tone: "text-amber-700 bg-amber-100 border-amber-200" }
        : { label: "Critical actions pending", tone: "text-rose-700 bg-rose-100 border-rose-200" };

  const missions = [
    {
      icon: TrendingUp,
      label: "Save potential loss",
      target: formatAZN(stats.lossTarget, { compact: true }),
      progress: stats.lossTarget > 0 ? (stats.recoveredValue / stats.lossTarget) * 100 : 0,
      current: formatAZN(stats.recoveredValue, { compact: true }),
      tone: "text-emerald-600",
      onClick: () => router.push("/products"),
    },
    {
      icon: CheckCircle2,
      label: "Complete recovery actions",
      target: `${stats.totalActions}`,
      progress: stats.totalActions > 0 ? (stats.completedActions / stats.totalActions) * 100 : 0,
      current: `${stats.completedActions}`,
      tone: "text-sky-600",
      onClick: () => router.push("/tasks"),
    },
    {
      icon: Truck,
      label: "Approve transfer actions",
      target: `${stats.transfersTotal}`,
      progress:
        stats.transfersTotal > 0 ? (stats.transfersDone / stats.transfersTotal) * 100 : 0,
      current: `${stats.transfersDone}`,
      tone: "text-indigo-600",
      onClick: () => router.push("/products?action=transfer"),
    },
    {
      icon: Percent,
      label: "Apply discounts",
      target: `${stats.discountsTotal}`,
      progress:
        stats.discountsTotal > 0 ? (stats.discountsDone / stats.discountsTotal) * 100 : 0,
      current: `${stats.discountsDone}`,
      tone: "text-amber-600",
      onClick: () => router.push("/products?action=discount"),
    },
    {
      icon: ShieldAlert,
      label: "Reduce waste risk",
      target: "100%",
      progress: stats.riskReductionPct,
      current: `${stats.riskReductionPct.toFixed(0)}%`,
      tone: "text-rose-600",
      onClick: () => router.push("/products?risk=critical,high"),
    },
  ];

  return (
    <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-background to-sky-50/60 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-sky-950/30">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
              <Target className="size-4" aria-hidden />
            </span>
            <CardTitle className="text-base">Today's Recovery Mission</CardTitle>
            <Badge
              variant="outline"
              className="rounded-full bg-background text-[10px] font-medium uppercase tracking-wide"
            >
              Today
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Mission-style objectives — each one shrinks tomorrow's waste line.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mission progress
          </div>
          <div className="mt-0.5 flex items-baseline justify-end gap-1">
            <span className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {stats.overallProgress}
            </span>
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Badge variant="outline" className={cn("mt-1 text-[10px]", status.tone)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {missions.map((m, i) => {
            const Icon = m.icon;
            const pct = Math.min(100, Math.max(0, m.progress));
            return (
              <motion.button
                key={m.label}
                type="button"
                onClick={m.onClick}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ y: -2 }}
                className="group flex flex-col gap-1.5 rounded-md border bg-background/80 p-2.5 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4 shrink-0", m.tone)} aria-hidden />
                  <span className="line-clamp-1 text-xs font-medium leading-tight">{m.label}</span>
                  <ArrowRight className="ml-auto size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <div className="flex items-baseline justify-between gap-1 text-[11px] tabular-nums">
                  <span className="font-semibold text-foreground">{m.current}</span>
                  <span className="text-muted-foreground">/ {m.target}</span>
                </div>
                <Progress
                  value={pct}
                  className={cn(
                    "h-1.5",
                    pct >= 75
                      ? "[&>div]:bg-emerald-500"
                      : pct >= 35
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-rose-500"
                  )}
                />
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
