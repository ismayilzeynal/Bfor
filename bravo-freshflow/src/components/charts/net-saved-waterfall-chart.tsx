"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAZN } from "@/lib/formatters";
import type { Discount, KpiSnapshot, Transfer } from "@/types";

interface NetSavedWaterfallChartProps {
  snapshots: KpiSnapshot[];
  transfers: Transfer[];
  discounts: Discount[];
}

interface Stack {
  name: string;
  base: number;
  delta: number;
  total: number;
  tone: "positive" | "deduction" | "endpoint";
}

export function NetSavedWaterfallChart({
  snapshots,
  transfers,
  discounts,
}: NetSavedWaterfallChartProps) {
  const data = useMemo<Stack[]>(() => {
    const globalSnaps = snapshots.filter(
      (s) => s.store_id === null && s.category_id === null
    );
    const potential = globalSnaps.reduce((sum, s) => sum + s.potential_loss, 0);
    const netSaved = globalSnaps.reduce((sum, s) => sum + s.net_saved_value, 0);

    const discountCost = discounts.reduce((sum, d) => {
      const margin = d.current_margin_after_discount_pct;
      return sum + Math.max(0, (10 - margin) * 10);
    }, 0);
    const transferCost = transfers.reduce((sum, t) => sum + t.transfer_cost, 0);

    const totalDeductions = potential - netSaved;
    const operational = Math.max(0, totalDeductions - discountCost - transferCost);

    const stages: Stack[] = [];
    let running = potential;
    stages.push({ name: "Potential Loss", base: 0, delta: potential, total: potential, tone: "positive" });
    stages.push({
      name: "− Discount",
      base: running - discountCost,
      delta: discountCost,
      total: running - discountCost,
      tone: "deduction",
    });
    running -= discountCost;
    stages.push({
      name: "− Transfer",
      base: running - transferCost,
      delta: transferCost,
      total: running - transferCost,
      tone: "deduction",
    });
    running -= transferCost;
    stages.push({
      name: "− Operational",
      base: running - operational,
      delta: operational,
      total: running - operational,
      tone: "deduction",
    });
    running -= operational;
    stages.push({ name: "= Net Saved", base: 0, delta: netSaved, total: netSaved, tone: "endpoint" });
    return stages;
  }, [snapshots, transfers, discounts]);

  const tone = (t: Stack["tone"]) =>
    t === "positive"
      ? "hsl(215 16% 70%)"
      : t === "endpoint"
        ? "hsl(217 91% 60%)"
        : "hsl(var(--risk-critical))";

  const hasData = data.some((d) => d.total !== 0 || d.delta !== 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Net Saved Waterfall</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState />
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(_v, _n, ctx) => {
                    const item = ctx?.payload as Stack | undefined;
                    if (!item) return ["—", ""];
                    return [formatAZN(item.delta), item.name];
                  }}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="delta" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={tone(d.tone)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      Not enough data to build waterfall.
    </div>
  );
}
