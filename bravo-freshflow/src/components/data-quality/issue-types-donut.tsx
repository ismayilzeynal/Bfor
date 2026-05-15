"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DATA_QUALITY_ISSUE_TYPE_LABELS } from "@/lib/constants";
import type { DataQualityIssueType } from "@/types";
import type { IssueRow } from "./types";

const COLORS: Record<DataQualityIssueType, string> = {
  missing_expiry: "#f43f5e",
  stock_mismatch: "#f59e0b",
  stale_inventory: "#0ea5e9",
  no_sales_high_stock: "#6366f1",
  inconsistent_batch: "#ea580c",
  low_confidence_recommendation: "#8b5cf6",
};

interface Props {
  rows: IssueRow[];
  selectedType: DataQualityIssueType | null;
  onSelect: (type: DataQualityIssueType | null) => void;
}

export function IssueTypesDonut({ rows, selectedType, onSelect }: Props) {
  const data = useMemo(() => {
    const map = new Map<DataQualityIssueType, number>();
    const activeStatuses = new Set(["open", "investigating"]);
    for (const r of rows) {
      if (!activeStatuses.has(r.effectiveStatus)) continue;
      map.set(r.issue.issue_type, (map.get(r.issue.issue_type) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, label: DATA_QUALITY_ISSUE_TYPE_LABELS[k], value: v }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Active issue types</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <div className="relative h-[180px] w-full sm:w-[180px]">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No active issues
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={2}
                    isAnimationActive
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.key}
                        fill={COLORS[d.key]}
                        opacity={selectedType && selectedType !== d.key ? 0.25 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{total}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  active
                </span>
              </div>
            </>
          )}
        </div>
        <ul className="flex-1 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs transition-colors ${
                selectedType === null ? "bg-muted font-medium" : "hover:bg-muted/50"
              }`}
            >
              <span>All types</span>
              <Badge variant="secondary" className="tabular-nums">
                {total}
              </Badge>
            </button>
          </li>
          {data.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => onSelect(selectedType === d.key ? null : d.key)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs transition-colors ${
                  selectedType === d.key ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ background: COLORS[d.key] }}
                    aria-hidden
                  />
                  {d.label}
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {d.value}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
