"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format, parseISO, subDays } from "date-fns";
import { az } from "date-fns/locale";
import { Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DATE } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import type { InventoryBatch, InventorySnapshot, SalesAggregate } from "@/types";

interface Props {
  snapshots: InventorySnapshot[];
  sales: SalesAggregate[];
  batches: InventoryBatch[];
}

interface Point {
  date: string;
  label: string;
  stock: number | null;
  replenishment: number | null;
}

export function InventoryTrendCard({ snapshots, sales, batches }: Props) {
  const points = useMemo<Point[]>(() => {
    const today = parseISO(`${MOCK_DATE}T00:00:00.000Z`);
    const start = subDays(today, 29);
    const latest =
      snapshots.length > 0 ? snapshots[snapshots.length - 1].current_stock : 0;

    const salesByDate = new Map(sales.map((s) => [s.date, s.quantity_sold]));
    const recvByDate = new Map<string, number>();
    for (const b of batches) {
      const prev = recvByDate.get(b.received_date) ?? 0;
      recvByDate.set(b.received_date, prev + b.received_quantity);
    }

    const days: Point[] = [];
    for (let i = 0; i < 30; i += 1) {
      const d = addDays(start, i);
      const iso = format(d, "yyyy-MM-dd");
      days.push({
        date: iso,
        label: format(d, "dd MMM", { locale: az }),
        stock: null,
        replenishment: recvByDate.get(iso) ?? null,
      });
    }

    let running = latest;
    for (let i = days.length - 1; i >= 0; i -= 1) {
      days[i].stock = Math.max(0, Math.round(running));
      const sold = salesByDate.get(days[i].date) ?? 0;
      const received = recvByDate.get(days[i].date) ?? 0;
      running = running + sold - received;
    }
    return days;
  }, [snapshots, sales, batches]);

  const today = MOCK_DATE;
  const earliestExpiry = batches.length
    ? [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0].expiry_date
    : null;
  const expiryPoint = earliestExpiry ? points.find((p) => p.date === earliestExpiry) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Boxes className="size-4 text-muted-foreground" aria-hidden />
          Inventory Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  if (name === "replenishment" && value)
                    return [`+${value}`, "Received"];
                  return [String(value ?? "—"), name === "stock" ? "Stock" : String(name)];
                }}
              />
              <Line
                type="monotone"
                dataKey="stock"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={500}
              />
              {points
                .filter((p) => p.replenishment !== null)
                .map((p) => (
                  <ReferenceDot
                    key={p.date}
                    x={p.label}
                    y={p.stock ?? 0}
                    r={4}
                    fill="hsl(160 70% 42%)"
                    stroke="white"
                    strokeWidth={1.5}
                    ifOverflow="extendDomain"
                  />
                ))}
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
              {expiryPoint ? (
                <ReferenceLine
                  x={expiryPoint.label}
                  stroke="hsl(0 75% 55%)"
                  strokeDasharray="4 4"
                  label={{
                    value: `expiry ${formatDate(expiryPoint.date, "dd MMM")}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "hsl(0 75% 55%)",
                  }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            Replenishment
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-px w-3 border-t border-dashed border-rose-500" />
            Expiry
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
