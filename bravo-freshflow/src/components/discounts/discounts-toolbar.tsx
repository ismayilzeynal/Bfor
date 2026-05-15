"use client";

import { useMemo } from "react";
import { AlertTriangle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DISCOUNT_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { MultiSelectPopover } from "@/components/products/multi-select-popover";
import type { DiscountStatus, Priority, Store } from "@/types";
import {
  EMPTY_DISCOUNT_FILTERS,
  activeDiscountFilterCount,
  type DiscountFilters,
} from "./types";

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const STATUSES: DiscountStatus[] = [
  "suggested",
  "approved",
  "active",
  "completed",
  "rejected",
  "expired",
];

interface Props {
  filters: DiscountFilters;
  onFilters: (next: DiscountFilters) => void;
  stores: Store[];
  totalRows: number;
  visibleRows: number;
}

export function DiscountsToolbar({ filters, onFilters, stores, totalRows, visibleRows }: Props) {
  const activeCount = activeDiscountFilterCount(filters);

  const storeOpts = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name, hint: s.code })),
    [stores]
  );
  const priorityOpts = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    []
  );
  const statusOpts = useMemo(
    () => STATUSES.map((s) => ({ value: s, label: DISCOUNT_STATUS_LABELS[s] })),
    []
  );

  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-md border bg-background/80 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
            placeholder="Search product, store…"
            className="h-8 w-60 pl-7 text-xs"
          />
        </div>
        <MultiSelectPopover
          label="Store"
          options={storeOpts}
          values={filters.storeIds}
          onChange={(v) => onFilters({ ...filters, storeIds: v })}
        />
        <MultiSelectPopover
          label="Priority"
          options={priorityOpts}
          values={filters.priorities}
          onChange={(v) => onFilters({ ...filters, priorities: v as Priority[] })}
        />
        <MultiSelectPopover
          label="Status"
          options={statusOpts}
          values={filters.statuses}
          onChange={(v) => onFilters({ ...filters, statuses: v as DiscountStatus[] })}
        />
        <Button
          variant={filters.marginBreachedOnly ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onFilters({ ...filters, marginBreachedOnly: !filters.marginBreachedOnly })}
        >
          <AlertTriangle className="size-3.5" /> Margin breach only
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className={cn("font-semibold tabular-nums", visibleRows < totalRows && "text-foreground")}>
              {visibleRows}
            </span>{" "}
            / {totalRows}
          </span>
          {activeCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => onFilters(EMPTY_DISCOUNT_FILTERS)}
            >
              <X className="size-3" /> Clear all ({activeCount})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
