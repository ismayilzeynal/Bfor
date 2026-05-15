"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATA_QUALITY_ISSUE_TYPE_LABELS,
  DATA_QUALITY_SEVERITY_LABELS,
  DATA_QUALITY_STATUS_LABELS,
} from "@/lib/constants";
import type {
  DataQualityIssueType,
  DataQualitySeverity,
  DataQualityStatus,
} from "@/types";

const ISSUE_TYPES: DataQualityIssueType[] = [
  "missing_expiry",
  "stock_mismatch",
  "stale_inventory",
  "no_sales_high_stock",
  "inconsistent_batch",
  "low_confidence_recommendation",
];

const SEVERITIES: DataQualitySeverity[] = ["low", "medium", "high"];
const STATUSES: DataQualityStatus[] = ["open", "investigating", "resolved", "ignored"];

interface Props {
  search: string;
  onSearch: (v: string) => void;
  issueType: DataQualityIssueType | null;
  onIssueType: (v: DataQualityIssueType | null) => void;
  severity: DataQualitySeverity | "all";
  onSeverity: (v: DataQualitySeverity | "all") => void;
  status: DataQualityStatus | "all";
  onStatus: (v: DataQualityStatus | "all") => void;
  visible: number;
  total: number;
  onClear: () => void;
}

export function IssuesToolbar({
  search,
  onSearch,
  issueType,
  onIssueType,
  severity,
  onSeverity,
  status,
  onStatus,
  visible,
  total,
  onClear,
}: Props) {
  const hasFilters =
    search.length > 0 || issueType !== null || severity !== "all" || status !== "all";
  return (
    <div className="sticky top-[--header-h,0] z-20 flex flex-wrap items-center gap-2 rounded-md border bg-card/90 p-2 backdrop-blur">
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search description, id, product…"
          className="h-9 pl-8"
        />
      </div>

      <Select
        value={issueType ?? "all"}
        onValueChange={(v) => onIssueType(v === "all" ? null : (v as DataQualityIssueType))}
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ISSUE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {DATA_QUALITY_ISSUE_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={severity}
        onValueChange={(v) => onSeverity(v as DataQualitySeverity | "all")}
      >
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITIES.map((s) => (
            <SelectItem key={s} value={s}>
              {DATA_QUALITY_SEVERITY_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => onStatus(v as DataQualityStatus | "all")}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {DATA_QUALITY_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          <X className="mr-1 size-3" aria-hidden />
          Clear
        </Button>
      ) : null}

      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
        {visible} / {total}
      </span>
    </div>
  );
}
