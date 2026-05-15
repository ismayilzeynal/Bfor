"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Scale,
  ShieldOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionBadge } from "@/components/badges/action-badge";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { ROLE_LABELS } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import { useActionsStore } from "@/store/actions-store";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/types";

interface Props {
  recommendation: Recommendation | undefined;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onCompareClick: () => void;
}

export function AiRecommendationPanel({
  recommendation,
  onApproveClick,
  onRejectClick,
  onCompareClick,
}: Props) {
  const decision = useActionsStore((s) =>
    recommendation ? s.decisionFor(recommendation.id) : undefined
  );

  if (!recommendation) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4 text-center text-xs text-muted-foreground">
          <Sparkles className="mx-auto size-6 text-muted-foreground/60" aria-hidden />
          <p>No AI recommendation generated yet for this product.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        className={cn(
          "relative overflow-hidden border-primary/40 bg-gradient-to-b from-primary/5 to-transparent shadow-md ring-1 ring-primary/10",
          decision?.decision === "approved" && "border-emerald-500/40 ring-emerald-500/20",
          decision?.decision === "rejected" && "border-rose-500/40 ring-rose-500/20"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden />
              AI Recommendation
            </div>
            <PriorityBadge priority={recommendation.priority} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ActionBadge type={recommendation.recommendation_type} />
            <ConfidenceBadge score={recommendation.confidence_score} />
            <StatusBadge kind="recommendation" status={recommendation.status} />
          </div>

          <p className="text-sm font-semibold leading-snug">
            {recommendation.recommendation_text}
          </p>
          <p className="text-xs italic leading-relaxed text-muted-foreground">
            {recommendation.reason_text}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium tabular-nums">
                {Math.round(recommendation.confidence_score)}%
              </span>
            </div>
            <Progress value={recommendation.confidence_score} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Recovered"
              value={formatAZN(recommendation.expected_recovered_value, { compact: true })}
              tone="text-emerald-700 dark:text-emerald-300"
            />
            <Metric
              label="Cost"
              value={formatAZN(recommendation.expected_cost, { compact: true })}
              tone="text-rose-700 dark:text-rose-300"
            />
            <Metric
              label="Net saved"
              value={formatAZN(recommendation.net_saved_value, { compact: true, sign: true })}
              tone={
                recommendation.net_saved_value >= 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
              }
              big
            />
          </div>

          {recommendation.requires_approval_by_role ? (
            <div className="rounded-md border border-dashed bg-muted/30 px-2 py-1.5 text-[11px]">
              Approval required by{" "}
              <span className="font-medium">
                {ROLE_LABELS[recommendation.requires_approval_by_role]}
              </span>
            </div>
          ) : null}

          {decision?.decision === "approved" ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50/70 px-3 py-2 text-xs dark:bg-emerald-950/30">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Approved
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  Tasks created — track them in Tasks.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                <a href="/tasks">View tasks</a>
              </Button>
            </div>
          ) : decision?.decision === "rejected" ? (
            <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-50/70 px-3 py-2 text-xs dark:bg-rose-950/30">
              <XCircle className="size-4 text-rose-600 dark:text-rose-400" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-rose-800 dark:text-rose-200">Rejected</p>
                {decision.reason_codes?.length ? (
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                    {decision.reason_codes.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={onApproveClick} className="w-full gap-1.5">
                <CheckCircle2 className="size-4" aria-hidden />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={onRejectClick}
                className="w-full gap-1.5"
              >
                <ShieldOff className="size-4" aria-hidden />
                Reject
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onCompareClick}
            className="w-full gap-1.5 text-xs"
          >
            <Scale className="size-3.5" aria-hidden />
            Compare alternatives
          </Button>
        </CardContent>
      </Card>

      <ManualActionCard />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-semibold tabular-nums",
          big ? "text-lg" : "text-sm",
          tone
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ManualActionCard() {
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("discount");
  const [discountPct, setDiscountPct] = useState<string>("20");

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <PlusCircle className="size-3.5 text-muted-foreground" aria-hidden />
          Manual Action
        </span>
        {open ? (
          <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        )}
      </button>
      {open ? (
        <CardContent className="space-y-2.5 px-4 pb-3 pt-0 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Action type</label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Apply discount</SelectItem>
                <SelectItem value="transfer">Prepare transfer</SelectItem>
                <SelectItem value="stock_check">Stock check</SelectItem>
                <SelectItem value="bundle">Create bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {actionType === "discount" ? (
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Discount %</label>
              <Select value={discountPct} onValueChange={setDiscountPct}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 25, 30, 40, 50].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {p}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() =>
              toast.success("Manual task created", {
                description: `${actionType}${actionType === "discount" ? ` @ ${discountPct}%` : ""} — added to queue.`,
              })
            }
          >
            Create task
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
