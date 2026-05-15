"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAZN, formatPercent } from "@/lib/formatters";
import type { CompletedOutcome } from "./types";

interface OutcomeBlockProps {
  outcome: CompletedOutcome;
  className?: string;
}

const TIER_CONFIG: Record<
  CompletedOutcome["tier"],
  { label: string; tone: string; ringTone: string; icon: typeof CheckCircle2 }
> = {
  success: {
    label: "✅ Successful",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ringTone: "ring-emerald-300/50",
    icon: CheckCircle2,
  },
  partial: {
    label: "⚠️ Partial",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    ringTone: "ring-amber-300/50",
    icon: AlertTriangle,
  },
  failed: {
    label: "❌ Failed",
    tone: "bg-rose-50 text-rose-700 border-rose-200",
    ringTone: "ring-rose-300/50",
    icon: XCircle,
  },
};

export function OutcomeBlock({ outcome, className }: OutcomeBlockProps) {
  const cfg = TIER_CONFIG[outcome.tier];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border bg-background p-2.5 text-xs ring-1",
        cfg.tone,
        cfg.ringTone,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <Icon className="size-3.5" aria-hidden />
          {cfg.label}
        </div>
        <div className="text-[10px] uppercase tracking-wide opacity-80">Outcome</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold tabular-nums">
          {formatAZN(outcome.realRecovered)}
        </span>
        <span className="text-[11px] opacity-80">
          vs {formatAZN(outcome.expectedRecovered)} expected
        </span>
        <span
          className={cn(
            "ml-auto text-[11px] font-medium tabular-nums",
            outcome.deltaPct >= 0 ? "text-emerald-700" : "text-rose-700"
          )}
        >
          {outcome.deltaPct >= 0 ? "+" : ""}
          {formatPercent(outcome.deltaPct, 0)}
        </span>
      </div>
      <p className="text-[11px] leading-snug opacity-90">{outcome.narrative}</p>
      <p className="text-[10px] italic opacity-70">Improves future AI confidence.</p>
    </div>
  );
}
