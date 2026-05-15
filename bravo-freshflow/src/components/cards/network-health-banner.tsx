"use client";

import { Activity, AlertTriangle, Gauge, Store as StoreIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative } from "@/lib/formatters";
import { MOCK_DATE } from "@/lib/constants";
import type { DataQualityIssue, KpiSnapshot, Store } from "@/types";

interface NetworkHealthBannerProps {
  snapshots: KpiSnapshot[];
  issues: DataQualityIssue[];
  stores: Store[];
}

export function NetworkHealthBanner({ snapshots, issues, stores }: NetworkHealthBannerProps) {
  const globalSnaps = snapshots.filter(
    (s) => s.store_id === null && s.category_id === null
  );
  const avgConfidence = globalSnaps.length
    ? globalSnaps.reduce((sum, s) => sum + s.avg_data_confidence, 0) / globalSnaps.length
    : 0;
  const openIssues = issues.filter((i) => i.status === "open" || i.status === "investigating").length;
  const activeStores = stores.filter((s) => s.is_active).length;
  const totalStores = stores.length;

  const confidenceTone =
    avgConfidence >= 85
      ? "text-emerald-700 bg-emerald-50"
      : avgConfidence >= 70
        ? "text-amber-700 bg-amber-50"
        : "text-rose-700 bg-rose-50";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-3">
        <Stat
          icon={<Gauge className="size-4" aria-hidden />}
          label="Avg Data Confidence"
          value={
            <span className={`tabular-nums rounded-full px-2 py-0.5 text-xs ${confidenceTone}`}>
              {avgConfidence.toFixed(1)}%
            </span>
          }
        />
        <Stat
          icon={<AlertTriangle className="size-4 text-amber-500" aria-hidden />}
          label="Open Data Issues"
          value={<span className="tabular-nums text-sm font-semibold">{openIssues}</span>}
        />
        <Stat
          icon={<StoreIcon className="size-4 text-emerald-600" aria-hidden />}
          label="Active Stores"
          value={
            <span className="tabular-nums text-sm font-semibold">
              {activeStores}/{totalStores}
            </span>
          }
        />
        <Stat
          icon={<Activity className="size-4 text-primary" aria-hidden />}
          label="Last Sync"
          value={<span className="text-sm">{formatRelative(`${MOCK_DATE}T08:30:00`)}</span>}
        />
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        {value}
      </div>
    </div>
  );
}
