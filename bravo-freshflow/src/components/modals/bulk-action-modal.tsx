"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ActionBadge } from "@/components/badges/action-badge";
import { RiskBadge } from "@/components/badges/risk-badge";
import { formatAZN } from "@/lib/formatters";
import type { RiskyRow } from "@/components/products/types";

interface BulkActionModalProps {
  open: boolean;
  rows: RiskyRow[];
  decision: "approve" | "reject";
  onCancel: () => void;
  onConfirm: (rows: RiskyRow[]) => void;
}

export function BulkActionModal({
  open,
  rows,
  decision,
  onCancel,
  onConfirm,
}: BulkActionModalProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setProgress(0);
    }
  }, [open]);

  const totalRecovered = rows.reduce(
    (sum, r) => sum + (r.recommendation?.expected_recovered_value ?? 0),
    0
  );
  const totalCost = rows.reduce(
    (sum, r) => sum + (r.recommendation?.expected_cost ?? 0),
    0
  );
  const totalNet = rows.reduce(
    (sum, r) => sum + (r.recommendation?.net_saved_value ?? 0),
    0
  );

  function handleConfirm() {
    if (running) return;
    setRunning(true);
    setProgress(0);
    const step = 100 / Math.max(1, Math.ceil(800 / 80));
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + step);
        if (next >= 100) {
          window.clearInterval(id);
          window.setTimeout(() => onConfirm(rows), 80);
        }
        return next;
      });
    }, 80);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {decision === "approve" ? (
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
            ) : (
              <ShieldOff className="size-4 text-rose-600" aria-hidden />
            )}
            {decision === "approve" ? "Approve all selected" : "Reject all selected"}
          </DialogTitle>
          <DialogDescription>
            {rows.length} recommendation{rows.length === 1 ? "" : "s"} will be{" "}
            {decision === "approve" ? "approved and converted into tasks" : "marked as rejected"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Recovered" value={formatAZN(totalRecovered, { compact: true })} />
          <Metric label="Cost" value={formatAZN(totalCost, { compact: true })} />
          <Metric
            label="Net saved"
            value={formatAZN(totalNet, { compact: true, sign: true })}
            tone={totalNet >= 0 ? "text-emerald-700" : "text-rose-700"}
          />
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-2">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No rows selected.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-sm bg-background px-2 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.product.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {r.store.code} · {r.category?.name ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <RiskBadge level={r.prediction.risk_level} showDot={false} />
                  {r.recommendation ? <ActionBadge type={r.recommendation.recommendation_type} /> : null}
                </div>
              </div>
            ))
          )}
        </div>

        {running ? (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Applying {Math.round(progress)}%…
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={running} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={running || rows.length === 0}
            variant={decision === "reject" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {decision === "approve" ? "Approve all" : "Reject all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
