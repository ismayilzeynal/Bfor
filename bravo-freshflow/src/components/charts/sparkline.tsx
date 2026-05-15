"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { KpiTone } from "@/components/cards/kpi-card";

const TONE_STROKE: Record<KpiTone, string> = {
  default: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--risk-low))",
  warning: "hsl(var(--risk-medium))",
  danger: "hsl(var(--risk-critical))",
};

interface SparklineProps {
  data: number[];
  tone?: KpiTone;
}

export function Sparkline({ data, tone = "default" }: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={TONE_STROKE[tone]}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
