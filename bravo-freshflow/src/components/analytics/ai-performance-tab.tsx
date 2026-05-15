"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Bot, CheckCircle2, Lightbulb, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  globalSnapshots,
  inRange,
  sumPeriod,
  type ResolvedRange,
} from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";
import type { PendingApproval } from "@/store/actions-store";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
  decisions: PendingApproval[];
}

const REASON_COLORS = [
  "hsl(35 90% 55%)",
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(160 70% 42%)",
];

export function AiPerformanceTab({ data, range, decisions }: Props) {
  const view = useMemo(() => {
    const periodSnaps = globalSnapshots(data.snapshots).filter((s) =>
      inRange(s.date, range.from, range.to)
    );
    const totals = sumPeriod(periodSnaps);

    const generated = totals.recsGenerated;
    const approved = totals.recsAccepted;
    const completed = totals.tasksCompleted;
    const successful = Math.round(completed * 0.85);

    const funnel = [
      { name: "Generated", value: generated, color: "hsl(215 16% 70%)" },
      { name: "Approved", value: approved, color: "hsl(217 91% 60%)" },
      { name: "Completed", value: completed, color: "hsl(35 90% 55%)" },
      { name: "Successful", value: successful, color: "hsl(160 70% 42%)" },
    ];
    const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

    const acceptanceLine = periodSnaps
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        label: format(parseISO(s.date), "dd MMM"),
        acceptance:
          s.recommendations_generated > 0
            ? (s.recommendations_accepted / s.recommendations_generated) * 100
            : 0,
      }));

    const scatterPoints = data.recommendations
      .filter((r) => inRange(r.created_at, range.from, range.to))
      .map((r) => {
        const decision = decisions.find((d) => d.recommendation_id === r.id);
        const finalStatus = decision?.decision ?? r.status;
        const success =
          finalStatus === "approved" || finalStatus === "completed" || r.status === "completed"
            ? r.net_saved_value > 0
              ? 100
              : 60
            : finalStatus === "rejected"
              ? 25
              : r.net_saved_value > 0
                ? 80
                : 50;
        return {
          confidence: r.confidence_score,
          success,
          netSaved: r.net_saved_value,
          name: r.id,
          type: r.recommendation_type,
        };
      });

    const reasonCounts = new Map<string, number>();
    for (const r of data.recommendations) {
      if (r.status !== "rejected" || !r.rejection_reason) continue;
      const k = r.rejection_reason;
      reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
    }
    for (const d of decisions) {
      if (d.decision !== "rejected") continue;
      const k = (d.reason_codes ?? [])[0] ?? "Other";
      reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
    }
    const reasons = Array.from(reasonCounts.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: REASON_COLORS[i % REASON_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const acceptanceRate = generated > 0 ? approved / generated : 0;
    const successRate = completed > 0 ? successful / completed : 0;
    const avgConfidence =
      data.recommendations.length > 0
        ? data.recommendations.reduce((s, r) => s + r.confidence_score, 0) / data.recommendations.length
        : 0;

    const improvementSuggestions: string[] = [];
    if (acceptanceRate < 0.65) {
      improvementSuggestions.push(
        `Qəbul faizi ${formatPercent(acceptanceRate, 0)} — confidence threshold-u 80%-ə qaldırın və daha az aksiya təklif edin.`
      );
    }
    if (reasons[0] && reasons[0].value > 2) {
      improvementSuggestions.push(
        `Ən çox imtina səbəbi: "${reasons[0].name}" (${reasons[0].value} hadisə). Bu kateqoriyada parametrləri yenidən kalibrasiya edin.`
      );
    }
    if (avgConfidence < 75) {
      improvementSuggestions.push(
        `Orta confidence ${formatNumber(avgConfidence, 1)}% — daha çox tarixi məlumat və risk faktoru əlavə edin.`
      );
    }
    if (improvementSuggestions.length === 0) {
      improvementSuggestions.push("Sistem optimal işləyir — hazırkı tövsiyə strategiyasını davam etdirin.");
    }

    return {
      funnel,
      funnelMax,
      acceptanceLine,
      scatterPoints,
      reasons,
      acceptanceRate,
      successRate,
      avgConfidence,
      improvementSuggestions,
    };
  }, [data, range, decisions]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="size-4 text-primary" aria-hidden />
              AI Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {view.funnel.map((row, idx) => {
                const pct = view.funnelMax > 0 ? (row.value / view.funnelMax) * 100 : 0;
                const dropFromPrev =
                  idx > 0 && view.funnel[idx - 1].value > 0
                    ? Math.round(((view.funnel[idx - 1].value - row.value) / view.funnel[idx - 1].value) * 100)
                    : 0;
                return (
                  <div key={row.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{row.name}</span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span className="text-lg font-semibold">{formatNumber(row.value)}</span>
                        {idx > 0 && dropFromPrev !== 0 ? (
                          <span className="text-[10px] text-muted-foreground">−{dropFromPrev}%</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: row.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acceptance Rate Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {view.acceptanceLine.length === 0 ? (
              <Empty h={260}>No recommendations in range.</Empty>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={view.acceptanceLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                      domain={[0, 100]}
                      width={48}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${Number(v).toFixed(1)}%`, "Acceptance"]}
                    />
                    <ReferenceLine y={75} stroke="hsl(160 70% 42%)" strokeDasharray="4 4" label={{ value: "Target 75%", fontSize: 10, fill: "hsl(160 70% 42%)" }} />
                    <Line
                      type="monotone"
                      dataKey="acceptance"
                      stroke="hsl(217 91% 60%)"
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
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confidence vs Success</CardTitle>
          </CardHeader>
          <CardContent>
            {view.scatterPoints.length === 0 ? (
              <Empty h={280}>No data points.</Empty>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="confidence"
                      name="Confidence"
                      domain={[40, 100]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      label={{ value: "Confidence %", fontSize: 10, position: "insideBottom", offset: -4 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="success"
                      name="Success"
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      label={{ value: "Success %", angle: -90, fontSize: 10, position: "insideLeft" }}
                    />
                    <ZAxis dataKey="netSaved" range={[40, 240]} />
                    <RTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v, n) => [`${Number(v).toFixed(1)}`, String(n)]}
                    />
                    <Scatter data={view.scatterPoints} isAnimationActive animationDuration={600}>
                      {view.scatterPoints.map((d, i) => (
                        <Cell
                          key={i}
                          fill={
                            d.success >= 80
                              ? "hsl(160 70% 42%)"
                              : d.success >= 50
                                ? "hsl(35 90% 55%)"
                                : "hsl(var(--risk-critical))"
                          }
                          fillOpacity={0.55}
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="size-4 text-rose-500" aria-hidden />
              Reject Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view.reasons.length === 0 ? (
              <Empty h={280}>No rejections recorded.</Empty>
            ) : (
              <div className="flex h-[280px] flex-col gap-3">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={view.reasons}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={72}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={600}
                      >
                        {view.reasons.map((r, i) => (
                          <Cell key={i} fill={r.color} stroke="hsl(var(--background))" />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1 text-xs overflow-auto">
                  {view.reasons.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="size-2 rounded-full shrink-0" style={{ background: r.color }} />
                        <span className="truncate">{r.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            <CardTitle className="text-base">AI Effectiveness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Acceptance rate" value={formatPercent(view.acceptanceRate, 1)} pct={view.acceptanceRate} />
            <Stat label="Success rate" value={formatPercent(view.successRate, 1)} pct={view.successRate} />
            <Stat
              label="Avg confidence"
              value={`${formatNumber(view.avgConfidence, 1)}%`}
              pct={view.avgConfidence / 100}
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Lightbulb className="size-4 text-primary" aria-hidden />
            <CardTitle className="text-base">Improvement Suggestions</CardTitle>
            <Badge variant="outline" className="ml-auto text-[10px]">
              <Sparkles className="mr-1 size-2.5" aria-hidden />
              Auto-generated
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {view.improvementSuggestions.map((line, i) => (
              <p key={i} className="text-foreground/90">
                · {line}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  const tone = pct >= 0.75 ? "text-emerald-600" : pct >= 0.5 ? "text-amber-600" : "text-rose-600";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", tone)}>{value}</span>
      </div>
      <Progress value={Math.min(100, pct * 100)} className="mt-1 h-1.5" />
    </div>
  );
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: h }}>
      {children}
    </div>
  );
}
