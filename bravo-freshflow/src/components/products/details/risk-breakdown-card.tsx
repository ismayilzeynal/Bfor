"use client";

import { useMemo } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_WEIGHTS } from "@/lib/constants";
import { RiskBadge } from "@/components/badges/risk-badge";
import type { RiskLevel, RiskPrediction } from "@/types";

interface Props {
  prediction: RiskPrediction;
}

const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "hsl(160 70% 42%)",
  medium: "hsl(43 95% 55%)",
  high: "hsl(25 95% 55%)",
  critical: "hsl(0 75% 55%)",
};

const FACTOR_META: { key: keyof RiskPrediction["reason_factors"]; label: string; weightKey: keyof typeof RISK_WEIGHTS }[] = [
  { key: "expiry_score", label: "Expiry pressure", weightKey: "expiry" },
  { key: "stock_pressure_score", label: "Stock pressure", weightKey: "stock_pressure" },
  { key: "sales_velocity_score", label: "Sales velocity", weightKey: "sales_velocity" },
  { key: "waste_history_score", label: "Waste history", weightKey: "waste_history" },
  { key: "supplier_risk_score", label: "Supplier risk", weightKey: "supplier_risk" },
];

export function RiskBreakdownCard({ prediction }: Props) {
  const color = LEVEL_COLOR[prediction.risk_level];
  const radialData = useMemo(
    () => [{ name: "score", value: prediction.risk_score, fill: color }],
    [prediction.risk_score, color]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="size-4 text-muted-foreground" aria-hidden />
          Risk Score Breakdown
        </CardTitle>
        <RiskBadge level={prediction.risk_level} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="relative flex items-center justify-center md:col-span-2">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  data={radialData}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background={{ fill: "hsl(var(--muted))" }}
                    dataKey="value"
                    cornerRadius={12}
                    isAnimationActive
                    animationDuration={800}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-semibold tabular-nums" style={{ color }}>
                {prediction.risk_score}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {prediction.risk_level} risk
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-3">
            {FACTOR_META.map((f) => {
              const value = prediction.reason_factors[f.key];
              const weight = RISK_WEIGHTS[f.weightKey];
              return (
                <FactorBar
                  key={f.key}
                  label={f.label}
                  value={value}
                  weight={weight}
                  color={color}
                />
              );
            })}
          </div>
        </div>

        <p className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          {prediction.main_reason}
        </p>
      </CardContent>
    </Card>
  );
}

function FactorBar({
  label,
  value,
  weight,
  color,
}: {
  label: string;
  value: number;
  weight: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          <span className="tabular-nums">{Math.round(value)}</span>
          <span className="mx-1">·</span>
          <span>weight {(weight * 100).toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all")}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
