"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/formatters";
import type { DiscountRow } from "./types";

interface Props {
  rows: DiscountRow[];
  onReview: () => void;
}

export function MarginAlarm({ rows, onReview }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const breached = rows.filter((r) => r.isLiveNow && r.marginBreached);
  if (dismissed || breached.length === 0) return null;
  const total = breached.length;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[320px] rounded-lg border border-rose-300 bg-rose-50 p-3 shadow-lg">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 text-rose-600" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-rose-900">
            {total} active discount{total === 1 ? "" : "s"} below minimum margin
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-rose-700">
            {breached.slice(0, 3).map((r) => (
              <li key={r.discount.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{r.product?.name ?? "—"}</span>
                <span className="font-semibold tabular-nums">
                  {formatPercent(r.discount.current_margin_after_discount_pct, 1)}
                </span>
              </li>
            ))}
            {breached.length > 3 ? (
              <li className="text-[10px] text-rose-700/80">+ {breached.length - 3} more</li>
            ) : null}
          </ul>
          <div className="mt-2 flex items-center gap-1.5">
            <Button size="sm" className="h-7 bg-rose-600 text-xs hover:bg-rose-700" onClick={onReview}>
              Review
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-rose-700 hover:bg-rose-100"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-rose-500 hover:bg-rose-100"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
