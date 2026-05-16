"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ActionBadge } from "@/components/badges/action-badge";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  computeScenarioImpact,
  type ScenarioBaseline,
  type ScenarioImpact,
} from "@/lib/scenario-calculator";
import type { ScenarioType } from "@/types";
import type { RiskyRow } from "@/components/products/types";

interface ApproveDialogProps {
  row: RiskyRow | null;
  onCancel: () => void;
  onConfirm: (row: RiskyRow, note: string | null) => void;
}

function impactFor(row: RiskyRow): ScenarioImpact | null {
  const rec = row.recommendation;
  const pred = row.prediction;
  if (!rec || !pred) return null;

  const baseline: ScenarioBaseline = {
    currentStock: pred.current_stock,
    avgDailySales: pred.avg_daily_sales_7d,
    daysToExpiry: pred.days_to_expiry,
    costPrice: row.product.cost_price,
    salePrice: row.product.sale_price,
    minimumMarginPct: row.product.minimum_margin_pct,
    dataConfidence: pred.data_confidence_score,
  };

  const allowedTypes = new Set<ScenarioType>(["discount", "transfer", "combined"]);
  const type: ScenarioType = allowedTypes.has(rec.recommendation_type as ScenarioType)
    ? (rec.recommendation_type as ScenarioType)
    : "combined";

  return computeScenarioImpact(baseline, type);
}

export function ApproveDialog({ row, onCancel, onConfirm }: ApproveDialogProps) {
  const [note, setNote] = useState("");
  const impact = useMemo(() => (row ? impactFor(row) : null), [row]);

  if (!row || !row.recommendation) {
    return (
      <AlertDialog open={row !== null} onOpenChange={(o) => !o && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No recommendation available</AlertDialogTitle>
            <AlertDialogDescription>
              This product does not have an AI recommendation to approve yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const rec = row.recommendation;

  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve AI recommendation?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create the related operational tasks and notify assignees.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{row.product.name}</div>
              <div className="text-xs text-muted-foreground">{row.store.name}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <ActionBadge type={rec.recommendation_type} />
              <ConfidenceBadge score={rec.confidence_score} />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {rec.recommendation_text}
          </p>
          {impact ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Metric
                label="Action olmazsa itki (K)"
                value={formatAZN(impact.K, { compact: true })}
                tone="text-rose-700"
              />
              <Metric
                label="Action sonrası ziyan (G)"
                value={formatAZN(impact.G, { compact: true })}
                tone="text-rose-700"
              />
              <Metric
                label="Net qazanc (K − G)"
                value={formatAZN(impact.actionNetGain, { compact: true })}
                tone="text-emerald-700"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Metric label="Recovered" value={formatAZN(rec.expected_recovered_value, { compact: true })} />
              <Metric label="Cost" value={formatAZN(rec.expected_cost, { compact: true })} />
              <Metric
                label="Net saved"
                value={formatAZN(rec.net_saved_value, { compact: true, sign: true })}
                tone={rec.net_saved_value >= 0 ? "text-emerald-700" : "text-rose-700"}
              />
            </div>
          )}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Tasks to create
            </p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2 rounded-sm border bg-background px-2 py-1">
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                <span className="truncate">{taskLabel(rec.recommendation_type)} — {row.store.code}</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium">Approval note (optional)</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context for the assignee…"
            rows={2}
            className="text-xs"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(row, note.trim() || null)}>
            Approve
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function taskLabel(type: string): string {
  switch (type) {
    case "discount":
      return "Apply discount";
    case "transfer":
      return "Prepare transfer";
    case "stock_check":
      return "Stock check";
    case "shelf_visibility":
      return "Shelf action";
    case "bundle":
      return "Create bundle";
    default:
      return "Operational task";
  }
}
