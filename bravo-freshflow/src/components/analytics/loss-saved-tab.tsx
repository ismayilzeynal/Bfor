"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Download, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard, type KpiChange } from "@/components/cards/kpi-card";
import { formatAZN, formatPercent } from "@/lib/formatters";
import {
  ACTION_LABELS,
  deltaPct,
  globalSnapshots,
  inRange,
  pctSignDirection,
  sumPeriod,
  downloadCsv,
  type ResolvedRange,
} from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";
import type { PendingApproval } from "@/store/actions-store";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
  compare: boolean;
  decisions: PendingApproval[];
}

export function LossSavedTab({ data, range, compare }: Props) {
  const view = useMemo(() => {
    const global = globalSnapshots(data.snapshots);
    const period = global.filter((s) => inRange(s.date, range.from, range.to));
    const prev = global.filter((s) => inRange(s.date, range.prevFrom, range.prevTo));
    const totals = sumPeriod(period);
    const prevTotals = sumPeriod(prev);

    const stackedDaily = period
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        label: format(parseISO(s.date), "dd MMM"),
        potential: s.potential_loss,
        actual: s.actual_loss,
        recovered: s.recovered_value,
      }));

    const prevByOffset = new Map(
      prev
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s, idx) => [idx, s])
    );
    const stackedDailyWithPrev = stackedDaily.map((row, idx) => {
      const p = prevByOffset.get(idx);
      return {
        ...row,
        prevRecovered: p?.recovered_value ?? null,
      };
    });

    const byActionType = new Map<string, { net: number; cost: number; recovered: number; count: number }>();
    for (const r of data.recommendations) {
      if (!inRange(r.created_at, range.from, range.to)) continue;
      const key = r.recommendation_type;
      const e = byActionType.get(key) ?? { net: 0, cost: 0, recovered: 0, count: 0 };
      e.net += r.net_saved_value;
      e.cost += r.expected_cost;
      e.recovered += r.expected_recovered_value;
      e.count += 1;
      byActionType.set(key, e);
    }
    const actionBreakdown = Array.from(byActionType.entries())
      .map(([k, v]) => ({ key: k, label: ACTION_LABELS[k] ?? k, ...v, avgNet: v.count ? v.net / v.count : 0 }))
      .sort((a, b) => b.net - a.net);

    const waterfallSteps = (() => {
      const potential = totals.potential;
      const items = actionBreakdown.filter((a) => Math.abs(a.net) > 0.5).slice(0, 5);
      const stages: Array<{ name: string; base: number; delta: number; total: number; tone: string }> = [];
      let running = potential;
      stages.push({ name: "Potential", base: 0, delta: potential, total: potential, tone: "base" });
      for (const it of items) {
        const next = running + it.net;
        if (it.net >= 0) {
          stages.push({ name: it.label, base: running, delta: it.net, total: next, tone: "gain" });
        } else {
          stages.push({ name: it.label, base: next, delta: Math.abs(it.net), total: next, tone: "loss" });
        }
        running = next;
      }
      stages.push({ name: "Net Saved", base: 0, delta: totals.netSaved, total: totals.netSaved, tone: "end" });
      return stages;
    })();

    const transferCost = data.transfers.reduce((sum, t) => {
      if (!inRange(t.created_at, range.from, range.to)) return sum;
      return sum + t.transfer_cost;
    }, 0);
    const discountCost = data.discounts.reduce((sum, d) => {
      if (!inRange(d.start_datetime, range.from, range.to)) return sum;
      const original = 10;
      return sum + Math.max(0, (original - d.current_margin_after_discount_pct) * 8);
    }, 0);
    const totalDeductions = Math.max(0, totals.potential - totals.netSaved);
    const operationalCost = Math.max(0, totalDeductions - transferCost - discountCost);

    const costBreakdown = [
      { name: "Discount", value: Math.round(discountCost), color: "hsl(35 90% 55%)" },
      { name: "Transfer", value: Math.round(transferCost), color: "hsl(217 91% 60%)" },
      { name: "Operational", value: Math.round(operationalCost), color: "hsl(280 65% 60%)" },
    ].filter((c) => c.value > 0);

    const savedToLoss = totals.potential > 0 ? totals.netSaved / totals.potential : 0;
    const prevSavedToLoss = prevTotals.potential > 0 ? prevTotals.netSaved / prevTotals.potential : 0;

    const change = (curr: number, prev: number, goodDir: "up" | "down"): KpiChange => {
      const d = deltaPct(curr, prev);
      const dir = pctSignDirection(d);
      return { value: d, direction: dir, isGood: dir === goodDir || dir === "flat" };
    };

    return {
      totals,
      prevTotals,
      savedToLoss,
      prevSavedToLoss,
      stackedDaily: stackedDailyWithPrev,
      actionBreakdown,
      waterfallSteps,
      costBreakdown,
      changes: {
        potential: change(totals.potential, prevTotals.potential, "down"),
        actual: change(totals.actual, prevTotals.actual, "down"),
        netSaved: change(totals.netSaved, prevTotals.netSaved, "up"),
        ratio: change(savedToLoss * 100, prevSavedToLoss * 100, "up"),
      },
    };
  }, [data, range]);

  const narrative = useMemo(() => buildNarrative(view), [view]);

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["date", "potential", "actual", "recovered"],
      ...view.stackedDaily.map((r) => [r.date, r.potential, r.actual, r.recovered]),
    ];
    downloadCsv(`loss-saved-${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}.csv`, rows);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Potential Loss"
          value={formatAZN(view.totals.potential, { compact: true })}
          change={view.changes.potential}
          tone="danger"
          tooltip="Predicted gross loss if no action is taken."
        />
        <KpiCard
          label="Total Actual Loss"
          value={formatAZN(view.totals.actual, { compact: true })}
          change={view.changes.actual}
          tone="danger"
          tooltip="Realized loss recorded in period."
        />
        <KpiCard
          label="Total Net Saved"
          value={formatAZN(view.totals.netSaved, { compact: true })}
          change={view.changes.netSaved}
          tone="success"
          tooltip="Net value preserved by AI-driven actions."
        />
        <KpiCard
          label="Saved-to-Loss Ratio"
          value={formatPercent(view.savedToLoss, 1)}
          change={view.changes.ratio}
          tone="primary"
          tooltip="Net saved divided by potential loss."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Loss & Recovery Over Time</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="mr-2 size-3.5" aria-hidden />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {view.stackedDaily.length === 0 ? (
              <Empty h={320}>No snapshots in range.</Empty>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={view.stackedDaily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="potG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(215 16% 70%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(215 16% 70%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--risk-critical))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--risk-critical))" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="recG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160 70% 42%)" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="hsl(160 70% 42%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
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
                      width={72}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [formatAZN(Number(value) || 0), String(name)]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="potential"
                      name="Potential"
                      fill="url(#potG)"
                      stroke="hsl(215 16% 70%)"
                      strokeWidth={1.5}
                      isAnimationActive
                      animationDuration={700}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      fill="url(#actG)"
                      stroke="hsl(var(--risk-critical))"
                      strokeWidth={1.5}
                      isAnimationActive
                      animationDuration={700}
                    />
                    <Area
                      type="monotone"
                      dataKey="recovered"
                      name="Recovered"
                      fill="url(#recG)"
                      stroke="hsl(160 70% 42%)"
                      strokeWidth={1.5}
                      isAnimationActive
                      animationDuration={700}
                    />
                    {compare && (
                      <Area
                        type="monotone"
                        dataKey="prevRecovered"
                        name="Recovered (prev)"
                        fill="transparent"
                        stroke="hsl(160 70% 42%)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {view.costBreakdown.length === 0 ? (
              <Empty h={240}>No costs recorded.</Empty>
            ) : (
              <div className="flex h-[240px] items-center gap-3">
                <div className="h-full w-[55%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={view.costBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={600}
                      >
                        {view.costBreakdown.map((c, i) => (
                          <Cell key={i} fill={c.color} stroke="hsl(var(--background))" />
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
                  {view.costBreakdown.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatAZN(c.value, { compact: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Net Saved by Action Type</CardTitle>
          </CardHeader>
          <CardContent>
            {view.waterfallSteps.length <= 2 ? (
              <Empty h={260}>Not enough actions to build waterfall.</Empty>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={view.waterfallSteps}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
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
                      formatter={(_v, _n, ctx) => {
                        const item = ctx?.payload as { delta?: number; name?: string } | undefined;
                        if (!item) return ["—", ""];
                        return [formatAZN(item.delta ?? 0), String(item.name ?? "")];
                      }}
                      labelFormatter={() => ""}
                    />
                    <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
                    <Bar
                      dataKey="delta"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive
                      animationDuration={600}
                    >
                      {view.waterfallSteps.map((s, i) => (
                        <Cell
                          key={i}
                          fill={
                            s.tone === "base"
                              ? "hsl(215 16% 70%)"
                              : s.tone === "end"
                                ? "hsl(217 91% 60%)"
                                : s.tone === "gain"
                                  ? "hsl(160 70% 42%)"
                                  : "hsl(var(--risk-critical))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ROI by Action Type</CardTitle>
          </CardHeader>
          <CardContent>
            {view.actionBreakdown.length === 0 ? (
              <Empty h={260}>No actions recorded.</Empty>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={view.actionBreakdown.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={108}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [formatAZN(Number(v) || 0), "Net saved"]}
                    />
                    <Bar dataKey="net" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                      {view.actionBreakdown.slice(0, 6).map((a, i) => (
                        <Cell
                          key={i}
                          fill={a.net >= 0 ? "hsl(160 70% 42%)" : "hsl(var(--risk-critical))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">AI Narrative Insights</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px]">
            Auto-generated
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          {narrative.map((line, i) => (
            <p key={i} className="text-foreground/90">
              {line}
            </p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

interface NarrativeView {
  totals: { netSaved: number; potential: number; actual: number };
  prevTotals: { netSaved: number };
  savedToLoss: number;
  actionBreakdown: Array<{ label: string; net: number; count: number }>;
}

function buildNarrative(v: NarrativeView): string[] {
  const out: string[] = [];
  const dir = v.totals.netSaved >= v.prevTotals.netSaved ? "yüksəldi" : "azaldı";
  out.push(
    `Bu dövrdə net saved ${formatAZN(v.totals.netSaved, { compact: true })} oldu — əvvəlki dövrlə müqayisədə ${dir}.`
  );
  if (v.actionBreakdown.length > 0) {
    const top = v.actionBreakdown[0];
    out.push(
      `Ən effektiv aksiya: ${top.label} (${top.count} hadisə, ${formatAZN(top.net, { compact: true })} net).`
    );
  }
  if (v.savedToLoss > 0) {
    out.push(
      `Saved-to-loss nisbəti ${formatPercent(v.savedToLoss, 1)} — risk dəyərinin əhəmiyyətli hissəsi xilas edildi.`
    );
  }
  if (v.totals.actual > v.totals.netSaved) {
    out.push(
      `Diqqət: faktiki itki (${formatAZN(v.totals.actual, { compact: true })}) net saved-dən yüksəkdir — daha aqressiv discount + transfer kombinasiyası tövsiyə olunur.`
    );
  } else {
    out.push("Faktiki itki net saved-dən aşağıdır — AI tövsiyələri yaxşı işləyir, hazırkı strategiyanı saxlayın.");
  }
  return out;
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: h }}>
      {children}
    </div>
  );
}
