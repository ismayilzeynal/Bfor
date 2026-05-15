"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceArea,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Eye, Sparkles, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAZN, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { inRange, weekKey, type ResolvedRange } from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";
import type { Supplier } from "@/types";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
}

interface SupplierRow {
  supplier: Supplier;
  volumeAzn: number;
  expiryIssues: number;
  damageRate: number;
  onTime: number;
  expiryIssueRate: number;
  riskScore: number;
  productCount: number;
}

export function SupplierPerformanceTab({ data, range }: Props) {
  const view = useMemo(() => {
    const productSupplier = new Map(data.products.map((p) => [p.id, p.supplier_id]));
    const volumeBySupplier = new Map<string, number>();
    for (const w of data.waste) {
      if (!inRange(w.recorded_at, range.from, range.to)) continue;
      const sid = productSupplier.get(w.product_id);
      if (!sid) continue;
      volumeBySupplier.set(sid, (volumeBySupplier.get(sid) ?? 0) + w.value);
    }

    const productCountBySupplier = new Map<string, number>();
    for (const p of data.products) {
      productCountBySupplier.set(p.supplier_id, (productCountBySupplier.get(p.supplier_id) ?? 0) + 1);
    }

    const expiryIssuesBySupplier = new Map<string, number>();
    for (const w of data.waste) {
      if (!inRange(w.recorded_at, range.from, range.to)) continue;
      if (w.reason !== "expired") continue;
      const sid = productSupplier.get(w.product_id);
      if (!sid) continue;
      expiryIssuesBySupplier.set(sid, (expiryIssuesBySupplier.get(sid) ?? 0) + 1);
    }

    const rows: SupplierRow[] = data.suppliers
      .filter((s) => s.is_active)
      .map((supplier) => ({
        supplier,
        volumeAzn: volumeBySupplier.get(supplier.id) ?? 0,
        expiryIssues: expiryIssuesBySupplier.get(supplier.id) ?? 0,
        damageRate: supplier.damage_rate_pct,
        onTime: supplier.on_time_delivery_pct,
        expiryIssueRate: supplier.expiry_issue_rate_pct,
        riskScore: supplier.supplier_risk_score,
        productCount: productCountBySupplier.get(supplier.id) ?? 0,
      }))
      .sort((a, b) => b.riskScore - a.riskScore);

    const worstSupplier = rows.find((r) => r.riskScore >= 50) ?? rows[0];
    const insight = worstSupplier
      ? `${worstSupplier.supplier.name} ən yüksək risk balına malikdir (${worstSupplier.riskScore}/100). Damage rate ${formatPercent(worstSupplier.damageRate / 100, 1)}, on-time ${formatPercent(worstSupplier.onTime / 100, 1)}. Növbəti rüb üçün müqavilə şərtlərinin yenilənməsi tövsiyə olunur.`
      : "Bütün təchizatçılar normal performans göstərir.";

    return { rows, insight };
  }, [data, range]);

  const [activeSupplier, setActiveSupplier] = useState<string>(view.rows[0]?.supplier.id ?? "");

  const supplierTrend = useMemo(() => {
    if (!activeSupplier) return [];
    const productIds = new Set(data.products.filter((p) => p.supplier_id === activeSupplier).map((p) => p.id));
    const byWeek = new Map<string, { week: string; waste: number; loss: number }>();
    for (const w of data.waste) {
      if (!productIds.has(w.product_id)) continue;
      if (!inRange(w.recorded_at, range.from, range.to)) continue;
      const wk = weekKey(w.recorded_at.slice(0, 10));
      const e = byWeek.get(wk) ?? { week: wk, waste: 0, loss: 0 };
      e.waste += w.quantity;
      e.loss += w.value;
      byWeek.set(wk, e);
    }
    return Array.from(byWeek.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((row) => ({ ...row, label: format(parseISO(row.week), "dd MMM") }));
  }, [activeSupplier, data, range]);

  const scatterData = view.rows.map((r) => ({
    name: r.supplier.name,
    code: r.supplier.id,
    onTime: r.onTime,
    damage: r.damageRate,
    size: Math.max(60, Math.min(280, r.productCount * 20)),
    risk: r.riskScore,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="size-4 text-muted-foreground" aria-hidden />
              Supplier Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Volume (₼)</TableHead>
                    <TableHead className="text-right">Damage</TableHead>
                    <TableHead className="text-right">On-time</TableHead>
                    <TableHead className="text-right">Expiry issues</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No suppliers loaded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    view.rows.map((r) => (
                      <TableRow
                        key={r.supplier.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/40",
                          activeSupplier === r.supplier.id && "bg-muted/30"
                        )}
                        onClick={() => setActiveSupplier(r.supplier.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{r.supplier.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.productCount} SKU · {r.supplier.contact_person}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAZN(r.volumeAzn, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={r.damageRate > 5 ? "text-rose-600" : "text-muted-foreground"}>
                            {formatPercent(r.damageRate / 100, 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={
                              r.onTime >= 95 ? "text-emerald-600" : r.onTime >= 85 ? "text-amber-600" : "text-rose-600"
                            }
                          >
                            {formatPercent(r.onTime / 100, 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.expiryIssues}</TableCell>
                        <TableCell>
                          <RiskPill score={r.riskScore} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSupplier(r.supplier.id);
                            }}
                          >
                            <Eye className="size-3.5" aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quadrant: On-Time vs Damage</CardTitle>
          </CardHeader>
          <CardContent>
            {scatterData.length === 0 ? (
              <Empty h={300}>No suppliers.</Empty>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <ReferenceArea x1={90} x2={100} y1={0} y2={3} fill="hsl(160 70% 42% / 0.08)" />
                    <ReferenceArea x1={0} x2={90} y1={5} y2={20} fill="hsl(var(--risk-critical) / 0.08)" />
                    <XAxis
                      type="number"
                      dataKey="onTime"
                      name="On-time %"
                      domain={[60, 100]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      label={{ value: "On-time delivery %", fontSize: 10, position: "insideBottom", offset: -4 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="damage"
                      name="Damage %"
                      domain={[0, 20]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      label={{ value: "Damage %", angle: -90, fontSize: 10, position: "insideLeft" }}
                    />
                    <ZAxis dataKey="size" range={[50, 300]} />
                    <RTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => {
                        if (name === "On-time %") return [`${Number(value).toFixed(1)}%`, name];
                        if (name === "Damage %") return [`${Number(value).toFixed(1)}%`, name];
                        return [String(value), String(name)];
                      }}
                      labelFormatter={(_, ctx) => {
                        const item = ctx?.[0]?.payload as { name?: string } | undefined;
                        return item?.name ?? "";
                      }}
                    />
                    <Scatter data={scatterData} isAnimationActive animationDuration={600}>
                      {scatterData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={
                            d.risk >= 60
                              ? "hsl(var(--risk-critical))"
                              : d.risk >= 40
                                ? "hsl(35 90% 55%)"
                                : "hsl(160 70% 42%)"
                          }
                          fillOpacity={0.65}
                          stroke="hsl(var(--background))"
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Supplier Trend</CardTitle>
          <Select value={activeSupplier} onValueChange={setActiveSupplier}>
            <SelectTrigger className="h-8 w-[240px] text-xs">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {view.rows.map((r) => (
                <SelectItem key={r.supplier.id} value={r.supplier.id}>
                  {r.supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {supplierTrend.length === 0 ? (
            <Empty h={240}>No waste records for this supplier in range.</Empty>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={supplierTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
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
                      fontSize: 12,
                    }}
                    formatter={(v, n) => {
                      const label = n === "loss" ? "Loss" : "Waste qty";
                      return n === "loss" ? [formatAZN(Number(v) || 0), label] : [String(v), label];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    name="loss"
                    stroke="hsl(var(--risk-critical))"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    isAnimationActive
                    animationDuration={600}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Supplier Insight</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-foreground/90">{view.insight}</p>
        </CardContent>
      </Card>
    </>
  );
}

function RiskPill({ score }: { score: number }) {
  const tone =
    score >= 60
      ? "border-rose-500/40 bg-rose-50 text-rose-700"
      : score >= 40
        ? "border-amber-500/40 bg-amber-50 text-amber-700"
        : "border-emerald-500/40 bg-emerald-50 text-emerald-700";
  return (
    <Badge variant="outline" className={cn("tabular-nums", tone)}>
      {score}
    </Badge>
  );
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: h }}>
      {children}
    </div>
  );
}
