"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, ShieldOff } from "lucide-react";
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
import { ActionBadge } from "@/components/badges/action-badge";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RiskyRow } from "./types";

interface RowPreviewSheetProps {
  row: RiskyRow | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (row: RiskyRow) => void;
  onReject: (row: RiskyRow) => void;
}

export function RowPreviewSheet({
  row,
  onOpenChange,
  onApprove,
  onReject,
}: RowPreviewSheetProps) {
  const router = useRouter();

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

              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {row.prediction.main_reason}
              </div>
            </section>

            <Separator />

            {row.recommendation ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    AI Recommendation
                  </p>
                  <div className="flex items-center gap-1.5">
                    <ActionBadge type={row.recommendation.recommendation_type} />
                    <ConfidenceBadge score={row.recommendation.confidence_score} />
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{row.recommendation.recommendation_text}</p>
                <div className="grid grid-cols-3 gap-2">
                  <Stat
                    label="Recovered"
                    value={formatAZN(row.recommendation.expected_recovered_value, { compact: true })}
                  />
                  <Stat
                    label="Cost"
                    value={formatAZN(row.recommendation.expected_cost, { compact: true })}
                  />
                  <Stat
                    label="Net saved"
                    value={formatAZN(row.recommendation.net_saved_value, {
                      compact: true,
                      sign: true,
                    })}
                    tone={row.recommendation.net_saved_value >= 0 ? "text-emerald-700" : "text-rose-700"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge kind="recommendation" status={row.recommendation.status} />
                </div>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">No AI recommendation generated yet.</p>
            )}

            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => router.push(`/products/${row.product.id}`)}>
                Open product details
                <ArrowUpRight className="ml-1 size-3.5" aria-hidden />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
