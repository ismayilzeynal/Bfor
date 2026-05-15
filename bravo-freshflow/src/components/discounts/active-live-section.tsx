"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock4 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatAZN, formatPercent } from "@/lib/formatters";
import type { DiscountRow } from "./types";

interface Props {
  rows: DiscountRow[];
}

function seededUnits(id: string): number {
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) % 9973;
  return 10 + (seed % 40);
}

export function ActiveLiveSection({ rows }: Props) {
  const liveRows = useMemo(() => rows.filter((r) => r.isLiveNow), [rows]);
  const liveIdsKey = useMemo(
    () => liveRows.map((r) => r.discount.id).sort().join(","),
    [liveRows]
  );
  const [units, setUnits] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of liveRows) map[r.discount.id] = seededUnits(r.discount.id);
    return map;
  });

  useEffect(() => {
    setUnits((prev) => {
      let changed = false;
      const next: Record<string, number> = { ...prev };
      for (const r of liveRows) {
        if (next[r.discount.id] === undefined) {
          next[r.discount.id] = seededUnits(r.discount.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [liveIdsKey, liveRows]);

  useEffect(() => {
    if (liveRows.length === 0) return;
    const id = window.setInterval(() => {
      setUnits((prev) => {
        const next = { ...prev };
        for (const r of liveRows) {
          const inc = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 0;
          if (inc === 0) continue;
          next[r.discount.id] = (next[r.discount.id] ?? seededUnits(r.discount.id)) + inc;
        }
        return next;
      });
    }, 2400);
    return () => window.clearInterval(id);
  }, [liveIdsKey, liveRows]);

  if (liveRows.length === 0) return null;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Active Discounts — Live</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            LIVE
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Updates every 2.4s</span>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {liveRows.map((r) => {
          const sold = units[r.discount.id] ?? 0;
          const dailyTarget = Math.max(
            20,
            Math.round((r.recommendation?.expected_recovered_value ?? 60) / 2)
          );
          const pct = Math.min(100, (sold / dailyTarget) * 100);
          const dp = r.product ? r.product.sale_price * (1 - r.discount.discount_pct) : 0;
          const recovered = sold * dp;
          const remainingHours = Math.max(
            1,
            Math.round(((dailyTarget - sold) / Math.max(1, dailyTarget * 0.1)) * 1) / 1
          );
          return (
            <div
              key={r.discount.id}
              className="rounded-md border bg-background p-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 truncate text-xs font-semibold">
                  {r.product?.name ?? "—"}
                </div>
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                  −{formatPercent(r.discount.discount_pct, 0)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{r.store?.code ?? "—"}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock4 className="size-2.5" /> ETA ~ {remainingHours}h
                </span>
              </div>
              <Progress value={pct} className="mt-2 h-1.5" />
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="font-semibold tabular-nums">{sold} units</span>
                <span className="text-emerald-700 tabular-nums">
                  {formatAZN(recovered, { compact: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
