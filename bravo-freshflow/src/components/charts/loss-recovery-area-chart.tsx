"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAZN } from "@/lib/formatters";
import type { KpiSnapshot } from "@/types";

interface Props {
  snapshots: KpiSnapshot[];
}

export function LossRecoveryAreaChart({ snapshots }: Props) {
  const data = useMemo(() => {
    return snapshots
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        label: format(parseISO(s.date), "dd MMM"),
        potential: s.potential_loss,
        actual: s.actual_loss,
        recovered: s.recovered_value,
      }));
  }, [snapshots]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loss & Recovery Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            No snapshots in range.
          </div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="execPotG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(215 16% 70%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(215 16% 70%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="execActG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--risk-critical))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--risk-critical))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="execRecG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 70% 42%)" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="hsl(160 70% 42%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                  width={72}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value, name) => [formatAZN(Number(value) || 0), String(name)]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="potential"
                  name="Potential"
                  fill="url(#execPotG)"
                  stroke="hsl(215 16% 70%)"
                  strokeWidth={1.5}
                  isAnimationActive
                  animationDuration={700}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  fill="url(#execActG)"
                  stroke="hsl(var(--risk-critical))"
                  strokeWidth={1.5}
                  isAnimationActive
                  animationDuration={700}
                />
                <Area
                  type="monotone"
                  dataKey="recovered"
                  name="Recovered"
                  fill="url(#execRecG)"
                  stroke="hsl(160 70% 42%)"
                  strokeWidth={1.5}
                  isAnimationActive
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
