"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatAZN } from "@/lib/formatters";
import type { KpiSnapshot } from "@/types";

interface LossTrendChartProps {
  snapshots: KpiSnapshot[];
}

type Granularity = "daily" | "weekly";

interface Point {
  key: string;
  label: string;
  potential: number;
  actual: number;
  netSaved: number;
}

function bucket(snapshots: KpiSnapshot[], granularity: Granularity): Point[] {
  const acc = new Map<string, Point>();
  for (const s of snapshots) {
    if (s.store_id !== null || s.category_id !== null) continue;
    let key = s.date;
    let label = format(parseISO(s.date), "dd MMM");
    if (granularity === "weekly") {
      const wk = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
      key = format(wk, "yyyy-MM-dd");
      label = format(wk, "dd MMM");
    }
    const existing = acc.get(key) ?? { key, label, potential: 0, actual: 0, netSaved: 0 };
    existing.potential += s.potential_loss;
    existing.actual += s.actual_loss;
    existing.netSaved += s.net_saved_value;
    acc.set(key, existing);
  }
  return Array.from(acc.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function LossTrendChart({ snapshots }: LossTrendChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const data = useMemo(() => bucket(snapshots, granularity), [snapshots, granularity]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Loss Trend</CardTitle>
        <ToggleGroup
          type="single"
          size="sm"
          value={granularity}
          onValueChange={(v) => v && setGranularity(v as Granularity)}
        >
          <ToggleGroupItem value="daily" className="h-7 px-3 text-xs">
            Daily
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="h-7 px-3 text-xs">
            Weekly
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [formatAZN(Number(value) || 0), String(name)]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="potential" name="Potential" fill="hsl(215 16% 70%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="hsl(var(--risk-critical))" radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="netSaved"
                  name="Net Saved"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={700}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
      No data for the selected range.
    </div>
  );
}
