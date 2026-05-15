"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, addDays } from "date-fns";
import { ArrowUpDown, Building2, Download, Medal, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
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
import { formatAZN, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  downloadCsv,
  inRange,
  storeSnapshots,
  sumPeriod,
  type ResolvedRange,
} from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";
import type { Store } from "@/types";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
}

interface StoreRow {
  store: Store;
  netSaved: number;
  potential: number;
  actual: number;
  recsGenerated: number;
  recsAccepted: number;
  acceptance: number;
  riskCount: number;
  wasteKg: number;
}

type SortKey = "netSaved" | "potential" | "actual" | "acceptance" | "riskCount";

export function StorePerformanceTab({ data, range }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("netSaved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const view = useMemo(() => {
    const rows: StoreRow[] = data.stores.map((store) => {
      const snaps = storeSnapshots(data.snapshots, store.id).filter((s) =>
        inRange(s.date, range.from, range.to)
      );
      const t = sumPeriod(snaps);
      const acceptance = t.recsGenerated > 0 ? t.recsAccepted / t.recsGenerated : 0;
      const riskCount = data.predictions.filter(
        (p) => p.store_id === store.id && p.risk_level !== "low"
      ).length;
      return {
        store,
        netSaved: t.netSaved,
        potential: t.potential,
        actual: t.actual,
        recsGenerated: t.recsGenerated,
        recsAccepted: t.recsAccepted,
        acceptance,
        riskCount,
        wasteKg: t.wasteKg,
      };
    });

    const sortedDesc = rows
      .slice()
      .sort((a, b) => b.netSaved - a.netSaved);
    const top3 = sortedDesc.slice(0, 3);
    const bottom3 = sortedDesc.slice(-3).reverse();

    const dates: string[] = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      dates.push(format(d, "yyyy-MM-dd"));
    }
    const dayKeys = dates.length <= 14 ? dates : pickEven(dates, 14);

    const heatmap = data.stores.map((store) => {
      const snaps = storeSnapshots(data.snapshots, store.id);
      const cells = dayKeys.map((day) => {
        const s = snaps.find((x) => x.date === day);
        return { date: day, value: s?.net_saved_value ?? 0 };
      });
      return { store, cells };
    });
    const maxAbs = Math.max(
      1,
      ...heatmap.flatMap((row) => row.cells.map((c) => Math.abs(c.value)))
    );

    const narrative: string[] = [];
    if (top3[0]) {
      narrative.push(
        `Ən yüksək performans göstərən filial: ${top3[0].store.name} — ${formatAZN(top3[0].netSaved, { compact: true })} net saved.`
      );
    }
    if (bottom3[0] && bottom3[0].netSaved < (top3[0]?.netSaved ?? 0)) {
      narrative.push(
        `Ən aşağı performans: ${bottom3[0].store.name} — ${formatAZN(bottom3[0].netSaved, { compact: true })}. Bu filial üçün AI tövsiyələrinin qəbul faizini artırmaq lazımdır.`
      );
    }
    const avgAcc = rows.length > 0 ? rows.reduce((s, r) => s + r.acceptance, 0) / rows.length : 0;
    narrative.push(
      `Şəbəkə üzrə orta qəbul faizi ${formatPercent(avgAcc, 1)}. Hədəf 75%-dən yüksək olmalıdır.`
    );

    return { rows, sortedDesc, top3, bottom3, dayKeys, heatmap, maxAbs, narrative };
  }, [data, range]);

  const sortedRows = useMemo(() => {
    const arr = view.rows.slice();
    arr.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [view.rows, sortKey, sortDir]);

  const flipSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["store", "code", "net_saved", "potential", "actual", "acceptance_pct", "risk_count", "waste_kg"],
      ...view.rows.map((r) => [
        r.store.name,
        r.store.code,
        r.netSaved.toFixed(2),
        r.potential.toFixed(2),
        r.actual.toFixed(2),
        (r.acceptance * 100).toFixed(1),
        r.riskCount,
        r.wasteKg.toFixed(2),
      ]),
    ];
    downloadCsv(`store-performance-${format(range.from, "yyyyMMdd")}.csv`, rows);
  };

  const comparison = [
    ...view.top3.map((r) => ({ name: r.store.code, netSaved: Math.round(r.netSaved), tone: "top" as const })),
    ...view.bottom3.map((r) => ({ name: r.store.code, netSaved: Math.round(r.netSaved), tone: "bottom" as const })),
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
            Store × Day Net Saved Heatmap
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {view.dayKeys.length} buckets, intensity normalized to range
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background pr-2 text-left font-medium text-muted-foreground">
                    Store
                  </th>
                  {view.dayKeys.map((d) => (
                    <th
                      key={d}
                      className="px-1 py-1 text-center font-medium text-muted-foreground"
                    >
                      {format(parseISO(d), "dd/MM")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.heatmap.map((row) => (
                  <tr key={row.store.id}>
                    <td className="sticky left-0 z-10 bg-background py-1 pr-2">
                      <span className="font-medium">{row.store.code}</span>
                      <span className="ml-1 text-muted-foreground truncate inline-block max-w-[140px] align-middle">
                        {row.store.name.replace(/^Bravo /, "")}
                      </span>
                    </td>
                    {row.cells.map((c) => (
                      <td key={c.date} className="px-0.5 py-1 text-center">
                        <div
                          className={cn(
                            "mx-auto h-7 w-9 rounded-sm flex items-center justify-center text-[10px] font-medium tabular-nums",
                            heatColor(c.value, view.maxAbs)
                          )}
                          title={`${row.store.name} · ${format(parseISO(c.date), "dd MMM")} · ${formatAZN(c.value, { compact: true })}`}
                        >
                          {c.value === 0 ? "·" : c.value > 0 ? "+" : "−"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>−high</span>
            <span className="h-3 w-4 rounded-sm bg-rose-500/70" />
            <span className="h-3 w-4 rounded-sm bg-rose-400/40" />
            <span className="h-3 w-4 rounded-sm bg-muted" />
            <span className="h-3 w-4 rounded-sm bg-emerald-400/40" />
            <span className="h-3 w-4 rounded-sm bg-emerald-500/70" />
            <span>+high</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Store Ranking</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="mr-2 size-3.5" aria-hidden />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">#</TableHead>
                    <TableHead>Store</TableHead>
                    <SortableHead
                      label="Net Saved"
                      active={sortKey === "netSaved"}
                      dir={sortDir}
                      onClick={() => flipSort("netSaved")}
                    />
                    <SortableHead
                      label="Potential"
                      active={sortKey === "potential"}
                      dir={sortDir}
                      onClick={() => flipSort("potential")}
                    />
                    <SortableHead
                      label="Actual"
                      active={sortKey === "actual"}
                      dir={sortDir}
                      onClick={() => flipSort("actual")}
                    />
                    <SortableHead
                      label="Acceptance"
                      active={sortKey === "acceptance"}
                      dir={sortDir}
                      onClick={() => flipSort("acceptance")}
                    />
                    <SortableHead
                      label="Risky"
                      active={sortKey === "riskCount"}
                      dir={sortDir}
                      onClick={() => flipSort("riskCount")}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row, idx) => (
                    <TableRow key={row.store.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {idx === 0 ? (
                          <Medal className="size-4 text-amber-500" aria-hidden />
                        ) : (
                          idx + 1
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/operations?store=${row.store.id}`}
                          className="hover:underline"
                        >
                          <div className="font-medium">{row.store.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.store.code} · {row.store.region}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span
                          className={cn(
                            "font-medium",
                            row.netSaved >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {formatAZN(row.netSaved, { compact: true })}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatAZN(row.potential, { compact: true })}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatAZN(row.actual, { compact: true })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "tabular-nums",
                            row.acceptance >= 0.75
                              ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
                              : row.acceptance >= 0.5
                                ? "border-amber-500/40 bg-amber-50 text-amber-700"
                                : "border-rose-500/40 bg-rose-50 text-rose-700"
                          )}
                        >
                          {formatPercent(row.acceptance, 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{row.riskCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
              Top 3 vs Bottom 3
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.length === 0 ? (
              <Empty h={280}>No stores in range.</Empty>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparison}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
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
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
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
                    <Bar dataKey="netSaved" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                      {comparison.map((c, i) => (
                        <Cell
                          key={i}
                          fill={c.tone === "top" ? "hsl(160 70% 42%)" : "hsl(var(--risk-critical))"}
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
          <CardTitle className="text-base">Store Narrative</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {view.narrative.map((line, i) => (
            <p key={i} className="text-foreground/90">
              {line}
            </p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        <ArrowUpDown className={cn("size-3", active ? "opacity-100" : "opacity-30")} aria-hidden />
        {active ? <span className="text-[10px] text-muted-foreground">{dir === "desc" ? "↓" : "↑"}</span> : null}
      </button>
    </TableHead>
  );
}

function heatColor(value: number, maxAbs: number): string {
  if (value === 0) return "bg-muted text-muted-foreground";
  const ratio = Math.min(1, Math.abs(value) / maxAbs);
  if (value > 0) {
    if (ratio > 0.66) return "bg-emerald-500/70 text-white";
    if (ratio > 0.33) return "bg-emerald-400/50 text-emerald-900";
    return "bg-emerald-300/30 text-emerald-900";
  }
  if (ratio > 0.66) return "bg-rose-500/70 text-white";
  if (ratio > 0.33) return "bg-rose-400/50 text-rose-900";
  return "bg-rose-300/30 text-rose-900";
}

function pickEven<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.round(i * step)]);
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

