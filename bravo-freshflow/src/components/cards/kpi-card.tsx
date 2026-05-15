"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";

export type KpiTone = "default" | "primary" | "success" | "warning" | "danger";

export interface KpiChange {
  value: number;
  direction: "up" | "down" | "flat";
  isGood: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  change?: KpiChange;
  trend?: number[];
  icon?: ReactNode;
  tooltip?: string;
  onClick?: () => void;
  loading?: boolean;
  tone?: KpiTone;
  className?: string;
}

const TONE_BORDER: Record<KpiTone, string> = {
  default: "border-border",
  primary: "border-l-4 border-l-primary",
  success: "border-l-4 border-l-emerald-500",
  warning: "border-l-4 border-l-amber-500",
  danger: "border-l-4 border-l-rose-500",
};

const TONE_ICON: Record<KpiTone, string> = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

export function KpiCard({
  label,
  value,
  unit,
  change,
  trend,
  icon,
  tooltip,
  onClick,
  loading,
  tone = "default",
  className,
}: KpiCardProps) {
  const interactive = Boolean(onClick);
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all",
        TONE_BORDER[tone],
        interactive && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3 min-h-[136px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>{label}</span>
            {tooltip ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 cursor-help" aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          {icon ? <div className={cn("shrink-0", TONE_ICON[tone])}>{icon}</div> : null}
        </div>

        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
            {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-auto">
          {change ? <ChangeBadge change={change} loading={loading} /> : <span />}
          {trend && trend.length > 1 ? (
            <div className="h-8 w-20">
              <Sparkline data={trend} tone={tone} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ChangeBadge({ change, loading }: { change: KpiChange; loading?: boolean }) {
  if (loading) return <Skeleton className="h-5 w-16" />;
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  const tone = change.isGood ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";
  const sign = change.value > 0 ? "+" : "";
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums", tone)}>
      <Icon className="size-3" aria-hidden />
      {sign}
      {change.value.toFixed(1)}%
    </span>
  );
}
