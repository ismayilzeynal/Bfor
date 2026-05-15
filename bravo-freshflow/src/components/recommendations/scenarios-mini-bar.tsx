"use client";

import { useMemo } from "react";
import type { RecommendationScenario } from "@/types";
import { SCENARIO_TYPE_LABELS } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ScenariosMiniBarProps {
  scenarios: RecommendationScenario[];
  className?: string;
}

export function ScenariosMiniBar({ scenarios, className }: ScenariosMiniBarProps) {
  const items = useMemo(() => {
    if (scenarios.length === 0) return [];
    const sorted = scenarios.slice().sort((a, b) => b.net_saved_value - a.net_saved_value);
    return sorted.slice(0, 4);
  }, [scenarios]);

  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        No alternative scenarios available for this recommendation.
      </div>
    );
  }

  const maxAbs = Math.max(...items.map((s) => Math.abs(s.net_saved_value)), 1);

  return (
    <div className={cn("space-y-1.5 rounded-md border bg-muted/20 p-2.5", className)}>
      {items.map((s) => {
        const pct = (Math.abs(s.net_saved_value) / maxAbs) * 100;
        const positive = s.net_saved_value >= 0;
        return (
          <div key={s.id} className="grid grid-cols-[120px_1fr_80px] items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {s.is_recommended ? (
                <span
                  className="inline-block size-1.5 rounded-full bg-emerald-500"
                  aria-label="Recommended"
                />
              ) : (
                <span className="inline-block size-1.5 rounded-full bg-slate-300" aria-hidden />
              )}
              <span className={cn("truncate", s.is_recommended && "font-medium")}>
                {SCENARIO_TYPE_LABELS[s.scenario_type]}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-sm bg-background">
              <div
                className={cn(
                  "absolute inset-y-0 left-0",
                  positive
                    ? s.is_recommended
                      ? "bg-emerald-500/80"
                      : "bg-emerald-400/60"
                    : "bg-rose-400/60"
                )}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <div
              className={cn(
                "text-right font-mono tabular-nums",
                positive ? "text-emerald-700" : "text-rose-700"
              )}
            >
              {formatAZN(s.net_saved_value, { compact: true, sign: true })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
