"use client";

import { useMemo } from "react";
import { AlertTriangle, AlertOctagon, CheckCircle2, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInHours, parseISO, subDays } from "date-fns";
import { MOCK_DATE } from "@/lib/constants";
import type { IssueRow } from "./types";

interface Props {
  rows: IssueRow[];
}

export function KpiStrip({ rows }: Props) {
  const stats = useMemo(() => {
    const today = parseISO(MOCK_DATE);
    const oneWeekAgo = subDays(today, 7);
    const activeStatuses = new Set(["open", "investigating"]);

    const active = rows.filter((r) => activeStatuses.has(r.effectiveStatus));
    const highSeverity = active.filter((r) => r.issue.severity === "high");
    const resolvedThisWeek = rows.filter((r) => {
      if (r.effectiveStatus !== "resolved") return false;
      if (!r.effectiveResolvedAt) return false;
      try {
        const d = parseISO(r.effectiveResolvedAt);
        return d >= oneWeekAgo && d <= today;
      } catch {
        return false;
      }
    });

    let avgHours = 0;
    let pairs = 0;
    for (const r of rows) {
      if (r.effectiveStatus !== "resolved" || !r.effectiveResolvedAt) continue;
      try {
        const created = parseISO(r.issue.created_at);
        const resolved = parseISO(r.effectiveResolvedAt);
        const h = Math.max(0, differenceInHours(resolved, created));
        avgHours += h;
        pairs += 1;
      } catch {
        /* ignore */
      }
    }
    const avgResolveHours = pairs ? Math.round(avgHours / pairs) : 0;

    return {
      activeCount: active.length,
      highCount: highSeverity.length,
      resolvedWeekCount: resolvedThisWeek.length,
      avgResolveHours,
    };
  }, [rows]);

  const cards = [
    {
      label: "Active issues",
      value: String(stats.activeCount),
      icon: <AlertTriangle className="size-5" aria-hidden />,
      tone: "text-amber-600 border-l-amber-500",
    },
    {
      label: "High severity",
      value: String(stats.highCount),
      icon: <AlertOctagon className="size-5" aria-hidden />,
      tone: "text-rose-600 border-l-rose-500",
    },
    {
      label: "Resolved this week",
      value: String(stats.resolvedWeekCount),
      icon: <CheckCircle2 className="size-5" aria-hidden />,
      tone: "text-emerald-600 border-l-emerald-500",
    },
    {
      label: "Avg time to resolve",
      value: stats.avgResolveHours ? `${stats.avgResolveHours}h` : "—",
      icon: <Timer className="size-5" aria-hidden />,
      tone: "text-sky-600 border-l-sky-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className={`border-l-4 ${c.tone}`}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{c.value}</p>
            </div>
            <div className={c.tone.split(" ")[0]}>{c.icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
