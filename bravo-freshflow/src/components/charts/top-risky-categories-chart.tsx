"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAZN } from "@/lib/formatters";
import type { Category, Product, RiskPrediction } from "@/types";

interface TopRiskyCategoriesChartProps {
  predictions: RiskPrediction[];
  products: Product[];
  categories: Category[];
}

const SLICE_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(173 58% 39%)",
  "hsl(35 90% 55%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
];

export function TopRiskyCategoriesChart({
  predictions,
  products,
  categories,
}: TopRiskyCategoriesChartProps) {
  const router = useRouter();

  const data = useMemo(() => {
    const productCat = new Map(products.map((p) => [p.id, p.category_id]));
    const byCat = new Map<string, number>();
    for (const p of predictions) {
      const cat = productCat.get(p.product_id);
      if (!cat) continue;
      byCat.set(cat, (byCat.get(cat) ?? 0) + p.predicted_loss_value);
    }
    return Array.from(byCat.entries())
      .map(([category_id, value]) => {
        const cat = categories.find((c) => c.id === category_id);
        return {
          category_id,
          name: cat?.name ?? category_id,
          value: Math.round(value),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [predictions, products, categories]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Risky Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex h-[240px] items-center gap-3">
            <div className="h-full w-[55%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={600}
                    onClick={(_, idx) => {
                      const item = data[idx];
                      if (item) router.push(`/products?category=${item.category_id}`);
                    }}
                    className="cursor-pointer"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="hsl(var(--background))" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [formatAZN(Number(value) || 0), String(name ?? "")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {data.map((d, i) => (
                <li
                  key={d.category_id}
                  className="flex items-center justify-between gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-muted"
                  onClick={() => router.push(`/products?category=${d.category_id}`)}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {total ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      No risky categories in range.
    </div>
  );
}
