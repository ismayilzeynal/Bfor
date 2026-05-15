"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
import type { RiskPrediction, Store } from "@/types";

interface TopRiskyStoresChartProps {
  predictions: RiskPrediction[];
  stores: Store[];
}

const BAR_COLORS = [
  "hsl(var(--risk-critical))",
  "hsl(var(--risk-high))",
  "hsl(var(--risk-medium))",
  "hsl(15 80% 60%)",
  "hsl(35 80% 55%)",
];

export function TopRiskyStoresChart({ predictions, stores }: TopRiskyStoresChartProps) {
  const router = useRouter();

  const data = useMemo(() => {
    const byStore = new Map<string, number>();
    for (const p of predictions) {
      byStore.set(p.store_id, (byStore.get(p.store_id) ?? 0) + p.predicted_loss_value);
    }
    return Array.from(byStore.entries())
      .map(([store_id, value]) => {
        const store = stores.find((s) => s.id === store_id);
        return {
          store_id,
          label: store?.code ?? store_id,
          name: store?.name ?? store_id,
          value: Math.round(value),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [predictions, stores]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Risky Stores</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatAZN(Number(value) || 0), "Predicted loss"]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as { name?: string } | undefined;
                    return item?.name ?? String(label ?? "");
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationDuration={600}
                  className="cursor-pointer"
                  onClick={(payload) => {
                    const item = payload as unknown as { store_id?: string };
                    if (item?.store_id) router.push(`/operations?store=${item.store_id}`);
                  }}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
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
      No risky stores in range.
    </div>
  );
}
