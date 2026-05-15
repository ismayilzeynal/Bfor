"use client";

import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DATE } from "@/lib/constants";
import type { KpiSnapshot, Store } from "@/types";
import type { IssueRow } from "./types";

interface Props {
  kpiSnapshots: KpiSnapshot[];
  rows: IssueRow[];
  stores: Store[];
}

export function TrendsCharts({ kpiSnapshots, rows, stores }: Props) {
  const today = useMemo(() => parseISO(MOCK_DATE), []);

  const confidenceSeries = useMemo(() => {
    const from = subDays(today, 29);
    const byDate = new Map<string, { sum: number; n: number }>();
    for (const s of kpiSnapshots) {
      if (s.store_id !== null || s.category_id !== null) continue;
      try {
        const d = parseISO(s.date);
        if (d < from || d > today) continue;
        const key = s.date;
        const e = byDate.get(key) ?? { sum: 0, n: 0 };
        e.sum += s.avg_data_confidence;
        e.n += 1;
        byDate.set(key, e);
      } catch {
        /* ignore */
      }
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        label: format(parseISO(date), "dd MMM"),
        confidence: Math.round(((v.n ? v.sum / v.n : 0) * 100) * 10) / 10,
      }));
  }, [kpiSnapshots, today]);

  const createdVsResolved = useMemo(() => {
    const from = subDays(today, 13);
    const created = new Map<string, number>();
    const resolved = new Map<string, number>();
    for (let i = 0; i < 14; i += 1) {
      const k = format(subDays(today, 13 - i), "yyyy-MM-dd");
      created.set(k, 0);
      resolved.set(k, 0);
    }
    for (const r of rows) {
      try {
        const c = parseISO(r.issue.created_at);
        if (c >= from && c <= today) {
          const k = format(c, "yyyy-MM-dd");
          if (created.has(k)) created.set(k, (created.get(k) ?? 0) + 1);
        }
      } catch {
        /* ignore */
      }
      if (r.effectiveResolvedAt) {
        try {
          const rd = parseISO(r.effectiveResolvedAt);
          if (rd >= from && rd <= today) {
            const k = format(rd, "yyyy-MM-dd");
            if (resolved.has(k)) resolved.set(k, (resolved.get(k) ?? 0) + 1);
          }
        } catch {
          /* ignore */
        }
      }
    }
    return Array.from(created.entries()).map(([date, c]) => ({
      date,
      label: format(parseISO(date), "dd MMM"),
      created: c,
      resolved: resolved.get(date) ?? 0,
    }));
  }, [rows, today]);

  const topStores = useMemo(() => {
    const byStore = new Map<string, number>();
    for (const r of rows) {
      if (!r.issue.store_id) continue;
      byStore.set(r.issue.store_id, (byStore.get(r.issue.store_id) ?? 0) + 1);
    }
    const storeById = new Map(stores.map((s) => [s.id, s]));
    return Array.from(byStore.entries())
      .map(([id, count]) => ({
        id,
        name: storeById.get(id)?.name ?? id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rows, stores]);

  const maxStoreCount = Math.max(1, ...topStores.map((s) => s.count));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Data confidence — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={confidenceSeries} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <RTooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => [`${v}%`, "Confidence"]}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Created vs Resolved — last 14 days</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={createdVsResolved}
              margin={{ top: 8, right: 12, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <RTooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="created" name="Created" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 5 stores by issue count</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topStores.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No store-linked issues
            </p>
          ) : (
            topStores.map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-rose-500/80"
                    style={{ width: `${(s.count / maxStoreCount) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
