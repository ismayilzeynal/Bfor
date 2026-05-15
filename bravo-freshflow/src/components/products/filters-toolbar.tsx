"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RECOMMENDATION_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/constants";
import type {
  Category,
  RecommendationStatus,
  RecommendationType,
  RiskLevel,
  Store,
  Supplier,
} from "@/types";
import { MultiSelectPopover } from "./multi-select-popover";
import { type RiskyFilters, isFilterActive } from "./types";

const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_CHIP_CLS: Record<RiskLevel, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const ACTION_TYPES: RecommendationType[] = [
  "discount",
  "transfer",
  "bundle",
  "stock_check",
  "shelf_visibility",
  "reorder_reduce",
  "supplier_review",
  "return_to_supplier",
  "campaign_add",
  "monitor",
];

const STATUSES: RecommendationStatus[] = [
  "generated",
  "pending_approval",
  "approved",
  "rejected",
  "converted_to_task",
  "completed",
  "expired",
];

export interface SavedViewItem {
  id: string;
  name: string;
  filters: RiskyFilters;
  builtIn?: boolean;
}

interface FiltersToolbarProps {
  filters: RiskyFilters;
  onFilters: (next: RiskyFilters) => void;
  onReset: () => void;
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  savedViews: SavedViewItem[];
  onApplyView: (id: string) => void;
  onSaveCurrent: (name: string) => void;
  onRemoveView: (id: string) => void;
  totalRows: number;
}

export function FiltersToolbar({
  filters,
  onFilters,
  onReset,
  stores,
  categories,
  suppliers,
  savedViews,
  onApplyView,
  onSaveCurrent,
  onRemoveView,
  totalRows,
}: FiltersToolbarProps) {
  const activeCount = isFilterActive(filters);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  function toggleRisk(level: RiskLevel) {
    const has = filters.riskLevels.includes(level);
    onFilters({
      ...filters,
      riskLevels: has
        ? filters.riskLevels.filter((l) => l !== level)
        : [...filters.riskLevels, level],
    });
  }

  const storeOpts = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name, hint: s.code })),
    [stores]
  );
  const categoryOpts = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const supplierOpts = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );
  const actionOpts = useMemo(
    () => ACTION_TYPES.map((t) => ({ value: t, label: RECOMMENDATION_TYPE_LABELS[t] })),
    []
  );
  const statusOpts = useMemo(
    () => STATUSES.map((s) => ({ value: s, label: RECOMMENDATION_STATUS_LABELS[s] })),
    []
  );

  function handleSave() {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    onSaveCurrent(trimmed);
    setSaveName("");
    setSaveOpen(false);
  }

  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-md border bg-background/80 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* Row 1 — search + view-level chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-8 flex-1 min-w-[220px] items-center gap-2 rounded-md border bg-background px-2">
          <Search className="size-3.5 text-muted-foreground" aria-hidden />
          <Input
            value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
            placeholder="Search products, SKU, store…"
            className="h-7 border-0 px-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {filters.search ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => onFilters({ ...filters, search: "" })}
            >
              <X className="size-3" aria-hidden />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {RISK_LEVELS.map((level) => {
            const active = filters.riskLevels.includes(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleRisk(level)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
                  active
                    ? RISK_CHIP_CLS[level]
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {RISK_LEVEL_LABELS[level]}
              </button>
            );
          })}
        </div>

        <SavedViewsMenu
          views={savedViews}
          onApply={onApplyView}
          onRemove={onRemoveView}
        />

        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={activeCount === 0}
            >
              <BookmarkPlus className="size-3.5" aria-hidden />
              Save view
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="mb-2 text-xs font-medium">Save current filters</p>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="View name…"
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!saveName.trim()}>
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2 — multi-selects */}
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
          label="Supplier"
          options={supplierOpts}
          values={filters.supplierIds}
          onChange={(v) => onFilters({ ...filters, supplierIds: v })}
        />
        <MultiSelectPopover
          label="Action"
          options={actionOpts}
          values={filters.actionTypes}
          onChange={(v) => onFilters({ ...filters, actionTypes: v as RecommendationType[] })}
        />
        <MultiSelectPopover
          label="Status"
          options={statusOpts}
          values={filters.statuses}
          onChange={(v) => onFilters({ ...filters, statuses: v as RecommendationStatus[] })}
        />

        <ExpiryRangePopover
          from={filters.expiryFrom}
          to={filters.expiryTo}
          onChange={(from, to) => onFilters({ ...filters, expiryFrom: from, expiryTo: to })}
        />

        <RangeSliderPopover
          label="Risk score"
          min={filters.riskMin}
          max={filters.riskMax}
          onChange={(min, max) => onFilters({ ...filters, riskMin: min, riskMax: max })}
        />
        <RangeSliderPopover
          label="Confidence"
          min={filters.confMin}
          max={filters.confMax}
          suffix="%"
          onChange={(min, max) => onFilters({ ...filters, confMin: min, confMax: max })}
        />
      </div>

      {/* Row 3 — footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            {activeCount === 0
              ? "No filters applied"
              : `${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <Badge variant="outline" className="rounded-full text-[10px] font-normal">
            {totalRows} rows
          </Badge>
        </div>
        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onReset}
          >
            <X className="mr-1 size-3" aria-hidden />
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SavedViewsMenu({
  views,
  onApply,
  onRemove,
}: {
  views: SavedViewItem[];
  onApply: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          Saved views
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {views.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No saved views yet.
            </div>
          ) : (
            views.map((v) => (
              <div
                key={v.id}
                className="group flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
              >
                <button
                  type="button"
                  onClick={() => {
                    onApply(v.id);
                    setOpen(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="font-medium">{v.name}</span>
                  {v.builtIn ? (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">built-in</span>
                  ) : null}
                </button>
                {!v.builtIn ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onRemove(v.id)}
                  >
                    <X className="size-3" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExpiryRangePopover({
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
          <span className="text-muted-foreground">Expiry:</span>
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
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  suffix?: string;
  onChange: (min: number, max: number) => void;
}) {
  const summary = min === 0 && max === 100 ? "Any" : `${min}${suffix ?? ""} – ${max}${suffix ?? ""}`;
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
            <span>{min}{suffix ?? ""}</span>
            <span>{max}{suffix ?? ""}</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[min, max]}
            onValueChange={(v) => onChange(v[0] ?? 0, v[1] ?? 100)}
          />
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange(0, 100)}
              disabled={min === 0 && max === 100}
            >
              Reset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
