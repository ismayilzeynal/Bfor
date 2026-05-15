"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, TRANSFER_STATUS_LABELS } from "@/lib/constants";
import { MultiSelectPopover } from "@/components/products/multi-select-popover";
import type { Priority, Store, TransferStatus } from "@/types";
import {
  EMPTY_TRANSFER_FILTERS,
  activeTransferFilterCount,
  type TransferFilters,
} from "./types";

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const STATUSES: TransferStatus[] = [
  "suggested",
  "approved",
  "preparing",
  "in_transit",
  "received",
  "completed",
  "cancelled",
  "failed",
];

interface Props {
  filters: TransferFilters;
  onFilters: (next: TransferFilters) => void;
  stores: Store[];
  totalRows: number;
  visibleRows: number;
}

export function TransfersToolbar({ filters, onFilters, stores, totalRows, visibleRows }: Props) {
  const activeCount = activeTransferFilterCount(filters);

  const storeOpts = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name, hint: s.code })),
    [stores]
  );
  const priorityOpts = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    []
  );
  const statusOpts = useMemo(
    () => STATUSES.map((s) => ({ value: s, label: TRANSFER_STATUS_LABELS[s] })),
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
          label="From"
          options={storeOpts}
          values={filters.fromStoreIds}
          onChange={(v) => onFilters({ ...filters, fromStoreIds: v })}
        />
        <MultiSelectPopover
          label="To"
          options={storeOpts}
          values={filters.toStoreIds}
          onChange={(v) => onFilters({ ...filters, toStoreIds: v })}
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
          onChange={(v) => onFilters({ ...filters, statuses: v as TransferStatus[] })}
        />
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onFilters({ ...filters, dateFrom: e.target.value || null })}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onFilters({ ...filters, dateTo: e.target.value || null })}
            className="h-8 w-[140px] text-xs"
          />
        </div>
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
              onClick={() => onFilters(EMPTY_TRANSFER_FILTERS)}
            >
              <X className="size-3" /> Clear all ({activeCount})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
