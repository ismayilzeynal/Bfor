"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format, parseISO, subDays } from "date-fns";
import { az } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import { MOCK_DATE } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SalesAggregate } from "@/types";

type Mode = "quantity" | "revenue";

interface Props {
  sales: SalesAggregate[];
}

interface Point {
  date: string;
  label: string;
  quantity: number;
  revenue: number;
  rolling: number;
}

export function SalesTrendCard({ sales }: Props) {
  const [mode, setMode] = useState<Mode>("quantity");

  const points = useMemo<Point[]>(() => {
    const today = parseISO(`${MOCK_DATE}T00:00:00.000Z`);
    const start = subDays(today, 29);
    const byDate = new Map(sales.map((s) => [s.date, s]));
    const out: Point[] = [];
    for (let i = 0; i < 30; i += 1) {
      const d = addDays(start, i);
      const iso = format(d, "yyyy-MM-dd");
      const s = byDate.get(iso);
      out.push({
        date: iso,
        label: format(d, "dd MMM", { locale: az }),
        quantity: s?.quantity_sold ?? 0,
        revenue: s?.total_amount ?? 0,
        rolling: 0,
      });
    }
    for (let i = 0; i < out.length; i += 1) {
      const window = out.slice(Math.max(0, i - 6), i + 1);
      const avg =
        window.reduce(
          (sum, p) => sum + (mode === "quantity" ? p.quantity : p.revenue),
          0
        ) / window.length;
      out[i].rolling = Number(avg.toFixed(2));
    }
    return out;
  }, [sales, mode]);

  const stats = useMemo(() => {
    const last7 = points.slice(-7);
    const all30 = points;
    const sum = (arr: Point[]) =>
      arr.reduce((s, p) => s + (mode === "quantity" ? p.quantity : p.revenue), 0);
    const avg7 = sum(last7) / Math.max(last7.length, 1);
    const avg30 = sum(all30) / Math.max(all30.length, 1);
    const trendPct = avg30 === 0 ? 0 : ((avg7 - avg30) / avg30) * 100;
    return { avg7, avg30, trendPct };
  }, [points, mode]);

  const formatY = (v: number) =>
    mode === "quantity"
      ? v.toFixed(0)
      : formatAZN(v, { compact: true });

  const today = MOCK_DATE;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
          Sales Trend
          <span className="text-xs font-normal text-muted-foreground">(last 30 days)</span>
        </CardTitle>
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
        >
          <ToggleGroupItem value="quantity" className="h-7 px-3 text-xs">
            Qty
          </ToggleGroupItem>
          <ToggleGroupItem value="revenue" className="h-7 px-3 text-xs">
            Revenue
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MiniStat
            label="7-day avg"
            value={
              mode === "quantity"
                ? stats.avg7.toFixed(1)
                : formatAZN(stats.avg7, { compact: true })
            }
          />
          <MiniStat
            label="30-day avg"
            value={
              mode === "quantity"
                ? stats.avg30.toFixed(1)
                : formatAZN(stats.avg30, { compact: true })
            }
          />
          <MiniStat
            label="Trend"
            value={`${stats.trendPct >= 0 ? "+" : ""}${stats.trendPct.toFixed(0)}%`}
            icon={
              stats.trendPct > 2 ? (
                <ArrowUp className="size-3 text-emerald-600" aria-hidden />
              ) : stats.trendPct < -2 ? (
                <ArrowDown className="size-3 text-rose-600" aria-hidden />
              ) : (
                <Minus className="size-3 text-muted-foreground" aria-hidden />
              )
            }
            tone={
              stats.trendPct > 2
                ? "text-emerald-700"
                : stats.trendPct < -2
                  ? "text-rose-700"
                  : undefined
            }
          />
        </div>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sales-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatY}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const v = Number(value) || 0;
                  if (name === "rolling")
                    return [
                      mode === "quantity" ? v.toFixed(1) : formatAZN(v, { compact: true }),
                      "7d avg",
                    ];
                  return [
                    mode === "quantity" ? v.toFixed(0) : formatAZN(v),
                    mode === "quantity" ? "Qty" : "Revenue",
                  ];
                }}
                labelFormatter={(l) => String(l)}
              />
              <Area
                type="monotone"
                dataKey={mode}
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                fill="url(#sales-trend-fill)"
                isAnimationActive
                animationDuration={600}
              />
              <Line
                type="monotone"
                dataKey="rolling"
                stroke="hsl(160 70% 42%)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <ReferenceLine
                x={points.find((p) => p.date === today)?.label}
                stroke="hsl(var(--foreground))"
                strokeDasharray="2 2"
                label={{
                  value: "today",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
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
  value: string;
  icon?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums", tone)}>
        {icon}
        {value}
      </div>
    </div>
  );
}
