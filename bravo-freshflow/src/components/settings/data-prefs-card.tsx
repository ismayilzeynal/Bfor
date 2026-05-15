"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUiStore } from "@/store/ui-store";
import type { DateRangeKey } from "@/store/filters-store";

const DATE_RANGES: { value: DateRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

export function DataPrefsCard() {
  const defaultDateRange = useUiStore((s) => s.defaultDateRange);
  const setDefaultDateRange = useUiStore((s) => s.setDefaultDateRange);
  const autoApproveThreshold = useUiStore((s) => s.autoApproveThreshold);
  const setAutoApproveThreshold = useUiStore((s) => s.setAutoApproveThreshold);

  const thresholdPct = Math.round(autoApproveThreshold * 100);

  return (
    <Card id="data-preferences">
      <CardHeader>
        <CardTitle>Data Preferences</CardTitle>
        <CardDescription>Defaults used when opening dashboards and approving low-stakes actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Default date range</Label>
          <Select value={defaultDateRange} onValueChange={(v) => setDefaultDateRange(v as DateRangeKey)}>
            <SelectTrigger className="md:w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Applied to executive and operations dashboards on first load.</p>
        </div>
        <div className="space-y-2 rounded-md border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Auto-approve threshold</Label>
              <p className="text-[10px] text-muted-foreground">
                Recommendations with confidence ≥ {thresholdPct}% and net saved ≤ ₼ 200 are auto-approved without manual review.
              </p>
            </div>
            <span className="font-mono text-sm font-semibold">{thresholdPct}%</span>
          </div>
          <Slider
            min={60}
            max={100}
            step={1}
            value={[thresholdPct]}
            onValueChange={(v) => setAutoApproveThreshold((v[0] ?? thresholdPct) / 100)}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>60% (aggressive)</span>
            <span>100% (manual)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
