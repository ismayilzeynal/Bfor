"use client";

import { ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LivePulse } from "@/components/operations/live-pulse";
import { formatAZN, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ValueAtRiskCardProps {
  atRisk: number;
  savedToday: number;
  criticalCount: number;
  highCount: number;
  productsCount: number;
  storeLabel: string;
}

export function ValueAtRiskCard({
  atRisk,
  savedToday,
  criticalCount,
  highCount,
  productsCount,
  storeLabel,
}: ValueAtRiskCardProps) {
  const total = atRisk + savedToday;
  const savedPct = total > 0 ? (savedToday / total) * 100 : 0;
  const tone =
    atRisk > savedToday * 2
      ? "text-rose-700"
      : atRisk > savedToday
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.1fr_1.6fr_1fr] lg:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Value at Risk Today
            </span>
            <LivePulse />
          </div>
          <div className={cn("text-4xl font-semibold tabular-nums tracking-tight", tone)}>
            {formatAZN(atRisk, { compact: true })}
          </div>
          <div className="text-xs text-muted-foreground">
            Across {formatNumber(productsCount)} risky products · {storeLabel}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="size-3.5" aria-hidden />
              Saved {formatAZN(savedToday, { compact: true })}
            </span>
            <span className="text-rose-700 tabular-nums">
              At-risk {formatAZN(atRisk, { compact: true })}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${savedPct}%` }}
              aria-label="Saved versus at-risk progress"
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            {savedPct.toFixed(1)}% of today&apos;s exposure already preserved by AI actions.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            label="Critical"
            value={criticalCount}
            icon={<TrendingUp className="size-4 text-rose-500" aria-hidden />}
            tone="text-rose-700"
          />
          <MiniStat
            label="High"
            value={highCount}
            icon={<TrendingDown className="size-4 text-amber-500" aria-hidden />}
            tone="text-amber-700"
          />
          <div className="col-span-2">
            <Progress
              value={total > 0 ? Math.min(100, ((criticalCount + highCount) / Math.max(productsCount, 1)) * 100) : 0}
              className="h-1.5 [&_>div]:bg-rose-400"
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              Critical + high share of risky products
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
