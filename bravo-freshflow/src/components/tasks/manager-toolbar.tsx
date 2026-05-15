"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_TYPE_LABELS } from "@/lib/constants";
import { MultiSelectPopover } from "@/components/products/multi-select-popover";
import type { Priority, Store, TaskStatus, TaskType, User } from "@/types";
import {
  EMPTY_MANAGER_FILTERS,
  activeManagerFilterCount,
  type ManagerFilters,
} from "./types";

const TASK_TYPES: TaskType[] = [
  "apply_discount",
  "prepare_transfer",
  "stock_check",
  "shelf_action",
  "create_bundle",
  "record_waste",
  "supplier_followup",
];

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

const STATUSES: TaskStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "rejected",
  "expired",
  "cancelled",
];

interface Props {
  filters: ManagerFilters;
  onFilters: (next: ManagerFilters) => void;
  stores: Store[];
  users: User[];
  totalRows: number;
  visibleRows: number;
}

export function ManagerToolbar({ filters, onFilters, stores, users, totalRows, visibleRows }: Props) {
  const activeCount = activeManagerFilterCount(filters);

  const storeOpts = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name, hint: s.code })),
    [stores]
  );
  const assigneeOpts = useMemo(
    () =>
      users
        .filter((u) => u.is_active)
        .map((u) => ({ value: u.id, label: u.full_name, hint: u.department })),
    [users]
  );
  const priorityOpts = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    []
  );
  const typeOpts = useMemo(
    () => TASK_TYPES.map((t) => ({ value: t, label: TASK_TYPE_LABELS[t] })),
    []
  );
  const statusOpts = useMemo(
    () => STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] })),
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
            placeholder="Search title, product, assignee…"
            className="h-8 w-64 pl-7 text-xs"
          />
        </div>
        <MultiSelectPopover
          label="Store"
          options={storeOpts}
          values={filters.storeIds}
          onChange={(v) => onFilters({ ...filters, storeIds: v })}
        />
        <MultiSelectPopover
          label="Assignee"
          options={assigneeOpts}
          values={filters.assigneeIds}
          onChange={(v) => onFilters({ ...filters, assigneeIds: v })}
        />
        <MultiSelectPopover
          label="Priority"
          options={priorityOpts}
          values={filters.priorities}
          onChange={(v) => onFilters({ ...filters, priorities: v as Priority[] })}
        />
        <MultiSelectPopover
          label="Type"
          options={typeOpts}
          values={filters.taskTypes}
          onChange={(v) => onFilters({ ...filters, taskTypes: v as TaskType[] })}
        />
        <MultiSelectPopover
          label="Status"
          options={statusOpts}
          values={filters.statuses}
          onChange={(v) => onFilters({ ...filters, statuses: v as TaskStatus[] })}
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
              onClick={() => onFilters(EMPTY_MANAGER_FILTERS)}
            >
              <X className="size-3" /> Clear all ({activeCount})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
