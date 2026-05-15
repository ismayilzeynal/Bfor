"use client";

import { useMemo } from "react";
import { ArrowUpDown, ChevronDown, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, RECOMMENDATION_TYPE_LABELS } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import type { Category, Priority, RecommendationType, Store } from "@/types";
import { MultiSelectPopover } from "@/components/products/multi-select-popover";
import {
  EMPTY_REC_FILTERS,
  NET_RANGE_CEILING,
  NET_RANGE_FLOOR,
  REC_SORT_LABELS,
  type RecommendationFilters,
  type RecommendationSort,
  activeFilterCount,
} from "./types";

const ACTION_TYPES: RecommendationType[] = [
  "discount",
  "transfer",
  "bundle",
  "stock_check",
  "shelf_visibility",
  "reorder_reduce",
  "reorder_increase",
  "supplier_review",
  "return_to_supplier",
  "campaign_add",
  "monitor",
  "no_action",
];

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

interface ToolbarProps {
  filters: RecommendationFilters;
  onFilters: (next: RecommendationFilters) => void;
  sort: RecommendationSort;
  onSort: (next: RecommendationSort) => void;
  stores: Store[];
  categories: Category[];
  totalRows: number;
  canRequireApproval: boolean;
}

export function RecommendationsToolbar({
  filters,
  onFilters,
  sort,
  onSort,
  stores,
  categories,
  totalRows,
  canRequireApproval,
}: ToolbarProps) {
  const activeCount = activeFilterCount(filters);

  const storeOpts = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name, hint: s.code })),
    [stores]
  );
  const categoryOpts = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const actionOpts = useMemo(
    () => ACTION_TYPES.map((t) => ({ value: t, label: RECOMMENDATION_TYPE_LABELS[t] })),
    []
  );
  const priorityOpts = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    []
  );

  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-md border bg-background/80 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelectPopover
          label="Store"
          options={storeOpts}
          values={filters.storeIds}
          onChange={(v) => onFilters({ ...filters, storeIds: v })}
        />
        <MultiSelectPopover
          label="Category"
          options={categoryOpts}
          values={filters.categoryIds}
          onChange={(v) => onFilters({ ...filters, categoryIds: v })}
        />
        <MultiSelectPopover
          label="Action"
          options={actionOpts}
          values={filters.actionTypes}
          onChange={(v) => onFilters({ ...filters, actionTypes: v as RecommendationType[] })}
        />
        <MultiSelectPopover
          label="Priority"
          options={priorityOpts}
          values={filters.priorities}
          onChange={(v) => onFilters({ ...filters, priorities: v as Priority[] })}
        />

        <DateRangePopover
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => onFilters({ ...filters, dateFrom: from, dateTo: to })}
        />

        <RangeSliderPopover
          label="Confidence"
          min={filters.confMin}
          max={filters.confMax}
          suffix="%"
          floor={0}
          ceiling={100}
          step={1}
          onChange={(min, max) => onFilters({ ...filters, confMin: min, confMax: max })}
        />

        <RangeSliderPopover
          label="Net Saved"
          min={filters.netMin}
          max={filters.netMax}
          floor={NET_RANGE_FLOOR}
          ceiling={NET_RANGE_CEILING}
          step={50}
          formatValue={(v) => formatAZN(v, { compact: true, sign: true })}
          onChange={(min, max) => onFilters({ ...filters, netMin: min, netMax: max })}
        />

        {canRequireApproval ? (
          <button
            type="button"
            onClick={() =>
              onFilters({ ...filters, requiresMyApproval: !filters.requiresMyApproval })
            }
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition",
              filters.requiresMyApproval
                ? "border-primary/40 bg-primary/10 text-primary"
                : "hover:bg-muted/40"
            )}
            aria-pressed={filters.requiresMyApproval}
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            Requires my approval
            <Switch
              checked={filters.requiresMyApproval}
              onCheckedChange={(v) => onFilters({ ...filters, requiresMyApproval: v })}
              className="pointer-events-none ml-1 scale-75"
            />
          </button>
        ) : null}

        <SortPopover sort={sort} onSort={onSort} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            {activeCount === 0
              ? "No filters applied"
              : `${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <Badge variant="outline" className="rounded-full text-[10px] font-normal">
            {totalRows} rec{totalRows === 1 ? "" : "s"}
          </Badge>
        </div>
        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onFilters(EMPTY_REC_FILTERS)}
          >
            <X className="mr-1 size-3" aria-hidden />
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SortPopover({
  sort,
  onSort,
}: {
  sort: RecommendationSort;
  onSort: (s: RecommendationSort) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ArrowUpDown className="size-3" aria-hidden />
          Sort: {REC_SORT_LABELS[sort]}
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1">
        {(Object.keys(REC_SORT_LABELS) as RecommendationSort[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSort(k)}
            className={cn(
              "block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent",
              k === sort && "bg-accent/60 font-medium"
            )}
          >
            {REC_SORT_LABELS[k]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function DateRangePopover({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  const summary = !from && !to ? "Any" : `${from ?? "…"} → ${to ?? "…"}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
          <span className="text-muted-foreground">Date:</span>
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-2 text-xs">
          <div>
            <p className="mb-1 font-medium text-muted-foreground">From</p>
            <Input
              type="date"
              value={from ?? ""}
              onChange={(e) => onChange(e.target.value || null, to)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">To</p>
            <Input
              type="date"
              value={to ?? ""}
              onChange={(e) => onChange(from, e.target.value || null)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange(null, null)}
              disabled={!from && !to}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RangeSliderPopover({
  label,
  min,
  max,
  suffix,
  floor,
  ceiling,
  step,
  formatValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  suffix?: string;
  floor: number;
  ceiling: number;
  step: number;
  formatValue?: (v: number) => string;
  onChange: (min: number, max: number) => void;
}) {
  const fmt = (v: number) => (formatValue ? formatValue(v) : `${v}${suffix ?? ""}`);
  const isDefault = min === floor && max === ceiling;
  const summary = isDefault ? "Any" : `${fmt(min)} – ${fmt(max)}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span>{fmt(min)}</span>
            <span>{fmt(max)}</span>
          </div>
          <Slider
            min={floor}
            max={ceiling}
            step={step}
            value={[min, max]}
            onValueChange={(v) => onChange(v[0] ?? floor, v[1] ?? ceiling)}
          />
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange(floor, ceiling)}
              disabled={isDefault}
            >
              Reset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
