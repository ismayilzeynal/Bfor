"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Lightbulb, ListTree, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAZN, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { inRange, weekKey, type ResolvedRange } from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
}

const CAT_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(173 58% 39%)",
  "hsl(35 90% 55%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(160 70% 42%)",
  "hsl(45 95% 50%)",
  "hsl(200 80% 50%)",
  "hsl(15 85% 55%)",
  "hsl(140 60% 45%)",
];

export function CategoryInsightsTab({ data, range }: Props) {
  const view = useMemo(() => {
    const productCat = new Map(data.products.map((p) => [p.id, p.category_id]));

    const lossByCat = new Map<string, number>();
    for (const p of data.predictions) {
      const cat = productCat.get(p.product_id);
      if (!cat) continue;
      lossByCat.set(cat, (lossByCat.get(cat) ?? 0) + p.predicted_loss_value);
    }
    const donut = Array.from(lossByCat.entries())
      .map(([category_id, value]) => {
        const cat = data.categories.find((c) => c.id === category_id);
        return {
          category_id,
          name: cat?.name ?? category_id,
          value: Math.round(value),
        };
      })
      .sort((a, b) => b.value - a.value);

    const weeks: string[] = [];
    const seenWeeks = new Set<string>();
    for (const s of data.snapshots) {
      if (!inRange(s.date, range.from, range.to)) continue;
      const w = weekKey(s.date);
      if (!seenWeeks.has(w)) {
        seenWeeks.add(w);
        weeks.push(w);
      }
    }
    weeks.sort();

    const heatmap = donut.slice(0, 8).map((row) => {
      const catId = row.category_id;
      const catSnaps = data.snapshots.filter((s) => s.category_id === catId);
      const cells = weeks.map((w) => {
        const inWeek = catSnaps.filter((s) => weekKey(s.date) === w);
        const total = inWeek.reduce((sum, s) => sum + s.potential_loss, 0);
        return { week: w, value: total };
      });
      return { ...row, cells };
    });
    const maxAbs = Math.max(1, ...heatmap.flatMap((r) => r.cells.map((c) => c.value)));

    const productLoss = new Map<string, number>();
    for (const p of data.predictions) {
      productLoss.set(p.product_id, (productLoss.get(p.product_id) ?? 0) + p.predicted_loss_value);
    }
    const topSkus = Array.from(productLoss.entries())
      .map(([pid, loss]) => {
        const product = data.products.find((p) => p.id === pid);
        const cat = product ? data.categories.find((c) => c.id === product.category_id) : null;
        return { product, cat, loss: Math.round(loss) };
      })
      .filter((r) => r.product)
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 10);

    const topCats = donut.slice(0, 4);
    const seasonalityKeys = weeks;
    const seasonality = seasonalityKeys.map((w) => {
      const row: Record<string, string | number> = { week: format(parseISO(w), "dd MMM") };
      for (const c of topCats) {
        const catSnaps = data.snapshots.filter((s) => s.category_id === c.category_id);
        const inWeek = catSnaps.filter((s) => weekKey(s.date) === w);
        row[c.category_id] = inWeek.reduce((sum, s) => sum + s.recovered_value, 0);
      }
      return row;
    });

    const insight = donut[0]
      ? `${donut[0].name} kateqoriyası ən yüksək itki riski daşıyır (${formatAZN(donut[0].value, { compact: true })}). Bu kateqoriyada AI tövsiyələrinin sayını artırmaq və transfer prioritetini yüksəltmək tövsiyə olunur.`
      : "Kateqoriya səviyyəsində risk məlumatı tapılmadı.";

    return { donut, heatmap, weeks, topSkus, topCats, seasonality, maxAbs, insight };
  }, [data, range]);

  const [activeCat, setActiveCat] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTree className="size-4 text-muted-foreground" aria-hidden />
              Loss Share by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view.donut.length === 0 ? (
              <Empty h={280}>No category data.</Empty>
            ) : (
              <div className="flex h-[280px] items-center gap-3">
                <div className="h-full w-[55%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={view.donut.slice(0, 8)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={92}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={600}
                        onClick={(_, idx) => {
                          const item = view.donut.slice(0, 8)[idx];
                          if (item) setActiveCat(item.category_id);
                        }}
                        className="cursor-pointer"
                      >
                        {view.donut.slice(0, 8).map((_, i) => (
                          <Cell
                            key={i}
                            fill={CAT_COLORS[i % CAT_COLORS.length]}
                            stroke="hsl(var(--background))"
                          />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v, n) => [formatAZN(Number(v) || 0), String(n ?? "")]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {view.donut.slice(0, 8).map((d, i) => (
                    <li
                      key={d.category_id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded px-1 py-0.5 cursor-pointer hover:bg-muted",
                        activeCat === d.category_id && "bg-muted"
                      )}
                      onClick={() => setActiveCat((c) => (c === d.category_id ? null : d.category_id))}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatAZN(d.value, { compact: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category × Week Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {view.heatmap.length === 0 || view.weeks.length === 0 ? (
              <Empty h={280}>No weekly category data in range.</Empty>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-background pr-2 text-left font-medium text-muted-foreground">
                        Category
                      </th>
                      {view.weeks.map((w) => (
                        <th key={w} className="px-1 py-1 text-center font-medium text-muted-foreground">
                          {format(parseISO(w), "dd MMM")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {view.heatmap.map((row) => (
                      <tr key={row.category_id}>
                        <td className="sticky left-0 z-10 bg-background py-1 pr-2 font-medium truncate max-w-[140px]">
                          {row.name}
                        </td>
                        {row.cells.map((c) => (
                          <td key={c.week} className="px-0.5 py-1 text-center">
                            <div
                              className={cn(
                                "mx-auto h-7 w-12 rounded-sm flex items-center justify-center text-[10px] font-medium tabular-nums",
                                catHeatColor(c.value, view.maxAbs)
                              )}
                              title={`${row.name} · ${format(parseISO(c.week), "dd MMM")} · ${formatAZN(c.value, { compact: true })}`}
                            >
                              {c.value === 0 ? "·" : formatAZN(c.value, { compact: true })}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 SKUs by Predicted Loss</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Predicted Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.topSkus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No predictions in range.
                    </TableCell>
                  </TableRow>
                ) : (
                  view.topSkus.map((r, idx) => (
                    <TableRow key={r.product!.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/products/${r.product!.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.product!.name}
                        </Link>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {r.product!.sku}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.cat?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-rose-600">
                        {formatAZN(r.loss, { compact: true })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seasonality — Top 4 Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {view.seasonality.length === 0 || view.topCats.length === 0 ? (
              <Empty h={260}>No seasonality data.</Empty>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={view.seasonality} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                      width={64}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v) => [formatAZN(Number(v) || 0), ""]}
                      labelFormatter={(l) => `Week of ${l}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                    {view.topCats.map((c, i) => (
                      <Line
                        key={c.category_id}
                        type="monotone"
                        dataKey={c.category_id}
                        name={c.name}
                        stroke={CAT_COLORS[i % CAT_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        isAnimationActive
                        animationDuration={600}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Recommendation</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px]">
            <Sparkles className="mr-1 size-2.5" aria-hidden />
            Auto-generated
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-foreground/90">{view.insight}</p>
          {view.donut[0] ? (
            <Link
              href={`/products?category=${view.donut[0].category_id}`}
              className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
            >
              {view.donut[0].name} kateqoriyasında {formatNumber(view.topSkus.filter((r) => r.cat?.id === view.donut[0].category_id).length)} riskli SKU →
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

function catHeatColor(value: number, maxAbs: number): string {
  if (value === 0) return "bg-muted text-muted-foreground";
  const ratio = Math.min(1, Math.abs(value) / maxAbs);
  if (ratio > 0.66) return "bg-rose-500/70 text-white";
  if (ratio > 0.33) return "bg-amber-400/60 text-amber-900";
  return "bg-emerald-300/30 text-emerald-900";
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: h }}>
      {children}
    </div>
  );
}
