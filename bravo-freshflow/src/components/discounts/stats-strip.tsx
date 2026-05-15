"use client";

import { TrendingUp, BadgePercent, Activity, Clock4 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatAZN, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DiscountRow } from "./types";

interface Props {
  rows: DiscountRow[];
}

export function StatsStrip({ rows }: Props) {
  const activeToday = rows.filter((r) => r.isLiveNow);
  const activeCount = activeToday.length;
  const totalRevenueAtDiscount = activeToday.reduce((sum, r) => {
    if (!r.product) return sum;
    const uplift = 1 + (r.recommendation?.expected_recovered_value ?? 0) / 1000;
    const dailyRevenue = r.product.sale_price * (1 - r.discount.discount_pct) * 25 * uplift;
    return sum + dailyRevenue;
  }, 0);
  const avgDiscount =
    activeCount > 0
      ? activeToday.reduce((sum, r) => sum + r.discount.discount_pct, 0) / activeCount
      : 0;
  const breachedCount = activeToday.filter((r) => r.marginBreached).length;
  const effectiveness =
    activeCount > 0 ? Math.round(((activeCount - breachedCount) / activeCount) * 100) : 100;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        label="Active today"
        value={String(activeCount)}
        icon={<Activity className="size-4" />}
        tone="text-indigo-600"
      />
      <StatCard
        label="Revenue at discount"
        value={formatAZN(totalRevenueAtDiscount, { compact: true })}
        icon={<TrendingUp className="size-4" />}
        tone="text-emerald-600"
      />
      <StatCard
        label="Avg discount"
        value={formatPercent(avgDiscount, 0)}
        icon={<BadgePercent className="size-4" />}
        tone="text-amber-600"
      />
      <StatCard
        label="Effectiveness"
        value={`${effectiveness}%`}
        icon={<Clock4 className="size-4" />}
        tone={effectiveness >= 80 ? "text-emerald-600" : "text-rose-600"}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="flex items-start gap-3 p-3">
      <div className={cn("rounded-md bg-muted/40 p-2", tone)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </Card>
  );
}
