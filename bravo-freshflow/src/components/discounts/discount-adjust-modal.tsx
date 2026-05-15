"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatAZN, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { marginAfter, type DiscountRow } from "./types";

interface Props {
  row: DiscountRow | null;
  onCancel: () => void;
  onConfirm: (input: {
    discountPct: number;
    startDatetime: string;
    endDatetime: string;
    marginPct: number;
    overrideBreach: boolean;
  }) => void;
}

function toLocalInput(iso: string): string {
  try {
    return iso.slice(0, 16);
  } catch {
    return "";
  }
}

export function DiscountAdjustModal({ row, onCancel, onConfirm }: Props) {
  const [pct, setPct] = useState(0.2);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [effectiveNow, setEffectiveNow] = useState(false);
  const [overrideBreach, setOverrideBreach] = useState(false);

  useEffect(() => {
    if (!row) return;
    setPct(row.discount.discount_pct);
    setStart(toLocalInput(row.discount.start_datetime));
    setEnd(toLocalInput(row.discount.end_datetime));
    setEffectiveNow(false);
    setOverrideBreach(false);
  }, [row]);

  if (!row || !row.product) return null;
  const product = row.product;
  const margin = marginAfter(product, pct);
  const breached = margin < product.minimum_margin_pct;
  const dp = product.sale_price * (1 - pct);

  function handleSave() {
    if (!row) return;
    const finalStart = effectiveNow ? new Date().toISOString() : new Date(start || row.discount.start_datetime).toISOString();
    const finalEnd = new Date(end || row.discount.end_datetime).toISOString();
    onConfirm({
      discountPct: pct,
      startDatetime: finalStart,
      endDatetime: finalEnd,
      marginPct: margin,
      overrideBreach,
    });
  }

  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust discount</DialogTitle>
          <DialogDescription>
            {product.name} · {row.store?.code ?? "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <Label className="text-xs">Discount</Label>
              <span className="text-2xl font-bold tabular-nums">{Math.round(pct * 100)}%</span>
            </div>
            <Slider
              value={[Math.round(pct * 100)]}
              min={5}
              max={50}
              step={5}
              onValueChange={(v) => setPct(v[0] / 100)}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Final price</span>
              <span className="text-base font-bold tabular-nums">{formatAZN(dp)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Margin after</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  breached ? "text-rose-700" : "text-emerald-700"
                )}
              >
                {formatPercent(margin, 1)} / min {formatPercent(product.minimum_margin_pct, 0)}
              </span>
            </div>
            {breached ? (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">
                <AlertTriangle className="mt-0.5 size-3.5" />
                <div>
                  <div className="text-[11px] font-semibold">Margin breach</div>
                  <div className="text-[10px]">
                    This discount falls below the minimum margin. You can override with explicit
                    approval below.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Start</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={effectiveNow}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px]">End</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-2">
            <Label className="text-xs">Effective immediately</Label>
            <Switch checked={effectiveNow} onCheckedChange={setEffectiveNow} />
          </div>

          {breached ? (
            <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50/40 p-2">
              <Label className="text-xs text-rose-700">Override margin breach</Label>
              <Switch checked={overrideBreach} onCheckedChange={setOverrideBreach} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={breached && !overrideBreach}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
