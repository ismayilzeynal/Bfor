"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAZN, formatPercent } from "@/lib/formatters";
import {
  loadKpiSnapshots,
  loadRecommendations,
  loadStores,
} from "@/lib/mock-loader";
import type { KpiSnapshot, Recommendation, Store } from "@/types";

interface Bundle {
  snapshots: KpiSnapshot[];
  stores: Store[];
  recommendations: Recommendation[];
}

export default function AnalyticsPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadKpiSnapshots(), loadStores(), loadRecommendations()]).then(
      ([snapshots, stores, recommendations]) => {
        if (cancelled) return;
        setBundle({ snapshots, stores, recommendations });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!bundle) return null;

    const storeSnaps = bundle.snapshots.filter((s) => s.store_id !== null);
    const byStore = new Map<string, { potential: number; recovered: number }>();
    for (const s of storeSnaps) {
      if (!s.store_id) continue;
      const e = byStore.get(s.store_id) ?? { potential: 0, recovered: 0 };
      e.potential += s.potential_loss;
      e.recovered += s.recovered_value;
      byStore.set(s.store_id, e);
    }

    const lossPerStore = bundle.stores
      .map((store) => {
        const t = byStore.get(store.id) ?? { potential: 0, recovered: 0 };
        return {
          id: store.id,
          code: store.code,
          name: store.name,
          potential: Math.round(t.potential),
          recovered: Math.round(t.recovered),
        };
      })
      .sort((a, b) => b.potential - a.potential);

    const topRecovered = lossPerStore
      .slice()
      .sort((a, b) => b.recovered - a.recovered);

    const recsByStore = new Map<string, { generated: number; accepted: number }>();
    for (const r of bundle.recommendations) {
      if (!r.store_id) continue;
      const e = recsByStore.get(r.store_id) ?? { generated: 0, accepted: 0 };
      e.generated += 1;
      if (
        r.status === "approved" ||
        r.status === "converted_to_task" ||
        r.status === "completed"
      ) {
        e.accepted += 1;
      }
      recsByStore.set(r.store_id, e);
    }
    const acceptanceByStore = bundle.stores
      .map((store) => {
        const e = recsByStore.get(store.id) ?? { generated: 0, accepted: 0 };
        const rate = e.generated > 0 ? e.accepted / e.generated : 0;
        return {
          code: store.code,
          name: store.name,
          generated: e.generated,
          accepted: e.accepted,
          rate,
        };
      })
      .filter((s) => s.generated > 0)
      .sort((a, b) => b.rate - a.rate);

    const totalGenerated = acceptanceByStore.reduce((s, r) => s + r.generated, 0);
    const totalAccepted = acceptanceByStore.reduce((s, r) => s + r.accepted, 0);
    const overallAcceptance = totalGenerated > 0 ? totalAccepted / totalGenerated : 0;

    const totalRecovered = lossPerStore.reduce((s, r) => s + r.recovered, 0);

    return {
      lossPerStore,
      topRecovered,
      acceptanceByStore,
      overallAcceptance,
      totalRecovered,
      totalGenerated,
      totalAccepted,
    };
  }, [bundle]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Filial üzrə itki, xilas edilən dəyər və AI tövsiyələrinin qəbul faizi."
      />

      {!view ? (
        <>
          <Skeleton className="h-[120px]" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-[360px]" />
            <Skeleton className="h-[360px]" />
          </div>
          <Skeleton className="h-[360px]" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              icon={<TrendingUp className="size-5 text-emerald-600" aria-hidden />}
              label="Total Recovered Value"
              value={formatAZN(view.totalRecovered, { compact: true })}
              hint="Cəmi xilas edilmiş dəyər (bütün filiallar üzrə)"
            />
            <KpiCard
              icon={<Sparkles className="size-5 text-amber-600" aria-hidden />}
              label="AI Recommendations Accepted"
              value={`${view.totalAccepted} / ${view.totalGenerated}`}
              hint="Approve + completed olan tövsiyələrin sayı"
            />
            <KpiCard
              icon={<ShieldCheck className="size-5 text-sky-600" aria-hidden />}
              label="Overall Acceptance Rate"
              value={formatPercent(view.overallAcceptance, 1)}
              hint="Bütün filiallar üzrə orta qəbul faizi"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Filial üzrə Potensial İtki</CardTitle>
              </CardHeader>
              <CardContent>
                {view.lossPerStore.length === 0 ? (
                  <Empty h={320}>Snapshot tapılmadı.</Empty>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={view.lossPerStore}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="code"
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                          width={64}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(v) => [formatAZN(Number(v) || 0), "Potensial itki"]}
                        />
                        <Bar dataKey="potential" radius={[4, 4, 0, 0]} fill="hsl(0 75% 55%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ən çox xilas edilən dəyər (filial üzrə)</CardTitle>
              </CardHeader>
              <CardContent>
                {view.topRecovered.length === 0 ? (
                  <Empty h={320}>Snapshot tapılmadı.</Empty>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={view.topRecovered}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="code"
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => formatAZN(v, { compact: true })}
                          width={64}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(v) => [formatAZN(Number(v) || 0), "Xilas edilən"]}
                        />
                        <Bar dataKey="recovered" radius={[4, 4, 0, 0]} fill="hsl(160 70% 42%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI tövsiyələrinin qəbul faizi (filial üzrə)</CardTitle>
            </CardHeader>
            <CardContent>
              {view.acceptanceByStore.length === 0 ? (
                <Empty h={320}>Hələ tövsiyə tarixçəsi yoxdur.</Empty>
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={view.acceptanceByStore}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                        tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="code"
                        tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(v, _n, ctx) => {
                          const item = ctx?.payload as
                            | { generated?: number; accepted?: number }
                            | undefined;
                          const pct = `${(Number(v) * 100).toFixed(1)}%`;
                          return [
                            `${pct}  (${item?.accepted ?? 0} / ${item?.generated ?? 0})`,
                            "Qəbul faizi",
                          ];
                        }}
                      />
                      <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                        {view.acceptanceByStore.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.rate >= 0.7
                                ? "hsl(160 70% 42%)"
                                : entry.rate >= 0.4
                                  ? "hsl(35 90% 55%)"
                                  : "hsl(0 75% 55%)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[hsl(160_70%_42%)]" /> ≥ 70%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[hsl(35_90%_55%)]" /> 40 – 70%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[hsl(0_75%_55%)]" /> &lt; 40%
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <div className="text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height: h }}
    >
      {children}
    </div>
  );
}
