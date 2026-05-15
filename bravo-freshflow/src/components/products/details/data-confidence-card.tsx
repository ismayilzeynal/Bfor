"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPlus, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { InventoryBatch, InventorySnapshot, RiskPrediction, SalesAggregate } from "@/types";

interface Props {
  prediction: RiskPrediction;
  snapshots: InventorySnapshot[];
  batches: InventoryBatch[];
  sales: SalesAggregate[];
}

export function DataConfidenceCard({ prediction, snapshots, batches, sales }: Props) {
  const checks = useMemo(() => {
    const latestSnap = snapshots[snapshots.length - 1];
    const expiryPresent = batches.every((b) => Boolean(b.expiry_date));
    const batchConsistent =
      batches.length === 0
        ? true
        : batches.every((b) => b.remaining_quantity <= b.received_quantity);
    const stockSyncOk = latestSnap
      ? Date.now() - new Date(latestSnap.snapshot_datetime).getTime() < 7 * 86400000
      : false;
    const lastSale = sales[sales.length - 1];
    const salesFresh = lastSale
      ? Date.now() - new Date(`${lastSale.date}T00:00:00Z`).getTime() < 7 * 86400000
      : false;
    const physicalCheckOk = (latestSnap?.confidence_score ?? 0) >= 85;
    return [
      { label: "Expiry data present on all batches", ok: expiryPresent },
      { label: "Batch quantities consistent", ok: batchConsistent },
      {
        label: latestSnap
          ? `Last stock sync — ${formatDate(latestSnap.snapshot_datetime, "dd MMM, HH:mm")}`
          : "Stock sync available",
        ok: stockSyncOk,
      },
      {
        label: lastSale ? `Sales fresh (last: ${formatDate(lastSale.date)})` : "Sales fresh",
        ok: salesFresh,
      },
      { label: "Recent physical check confirmed", ok: physicalCheckOk },
    ];
  }, [snapshots, batches, sales]);

  const score = Math.round(prediction.data_confidence_score);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-muted-foreground" aria-hidden />
          Data Confidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span
            className={cn(
              "text-4xl font-semibold tabular-nums",
              score >= 85
                ? "text-emerald-700 dark:text-emerald-300"
                : score >= 70
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-rose-700 dark:text-rose-300"
            )}
          >
            {score}%
          </span>
          <span className="pb-1 text-xs text-muted-foreground">overall confidence</span>
        </div>

        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex items-start gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
              )}
              <span className={cn(c.ok ? "" : "text-amber-800 dark:text-amber-300")}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() =>
            toast.success("Stock check task created", {
              description: "Assigned to store team — deadline within 24h.",
            })
          }
        >
          <ClipboardPlus className="size-3.5" aria-hidden />
          Create stock check task
        </Button>
      </CardContent>
    </Card>
  );
}
