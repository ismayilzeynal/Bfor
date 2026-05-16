"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ScrollText,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActionBadge } from "@/components/badges/action-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RiskyRow } from "@/components/products/types";

interface RiskyProductsTableProps {
  rows: RiskyRow[];
  selection: RowSelectionState;
  onSelectionChange: (sel: RowSelectionState) => void;
  onPreview: (row: RiskyRow) => void;
  onApprove: (row: RiskyRow) => void;
  onReject: (row: RiskyRow) => void;
}

const PAGE_SIZES = [25, 50, 100, 200];

function daysToTone(days: number): string {
  if (days <= 1) return "bg-rose-100 text-rose-700";
  if (days <= 3) return "bg-orange-100 text-orange-700";
  if (days <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

export function RiskyProductsTable({
  rows,
  selection,
  onSelectionChange,
  onPreview,
  onApprove,
  onReject,
}: RiskyProductsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: "risk", desc: true }]);
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo<ColumnDef<RiskyRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: "product",
        header: "Product",
        accessorFn: (r) => r.product.name,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-medium text-slate-600">
                {r.product.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{r.product.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.product.sku}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "store",
        header: "Store",
        accessorFn: (r) => r.store.name,
        cell: ({ row }) => {
          const s = row.original.store;
          return (
            <div className="flex flex-col text-xs">
              <span className="font-mono text-[10px] text-muted-foreground">{s.code}</span>
              <span className="truncate">{s.name}</span>
            </div>
          );
        },
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "stock",
        header: () => <div className="text-right">Stock</div>,
        accessorFn: (r) => r.prediction.current_stock,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-xs">
            {row.original.prediction.current_stock}
          </div>
        ),
        meta: { className: "w-[60px]" },
      },
      {
        id: "days",
        header: "Days left",
        accessorFn: (r) => r.prediction.days_to_expiry,
        cell: ({ row }) => {
          const d = row.original.prediction.days_to_expiry;
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                daysToTone(d)
              )}
            >
              {formatDaysToExpiry(d)}
            </span>
          );
        },
        meta: { className: "w-[80px]" },
      },
      {
        id: "sales",
        header: () => <div className="text-right">Velocity</div>,
        accessorFn: (r) => r.prediction.avg_daily_sales_7d,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-xs">
            {row.original.prediction.avg_daily_sales_7d.toFixed(1)}
          </div>
        ),
        meta: { className: "hidden xl:table-cell w-[80px]" },
      },
      {
        id: "risk",
        header: () => <div className="text-right">Risk</div>,
        accessorFn: (r) => r.prediction.risk_score,
        cell: ({ row }) => {
          const s = row.original.prediction.risk_score;
          return (
            <div className="flex items-center justify-end gap-2">
              <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted lg:block">
                <div
                  className={cn(
                    "h-full rounded-full",
                    s >= 80
                      ? "bg-red-500"
                      : s >= 60
                        ? "bg-orange-500"
                        : s >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, s))}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-medium tabular-nums px-1.5 py-0.5 rounded lg:bg-transparent lg:px-0",
                s >= 80
                  ? "bg-red-100 text-red-700 lg:text-foreground"
                  : s >= 60
                    ? "bg-orange-100 text-orange-700 lg:text-foreground"
                    : s >= 40
                      ? "bg-amber-100 text-amber-700 lg:text-foreground"
                      : "bg-emerald-100 text-emerald-700 lg:text-foreground"
              )}>{s}</span>
            </div>
          );
        },
        meta: { className: "w-[110px]" },
      },
      {
        id: "potential",
        header: () => <div className="text-right">Potential Loss</div>,
        accessorFn: (r) => r.prediction.predicted_loss_value,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-xs font-medium text-rose-700">
            −{formatAZN(row.original.prediction.predicted_loss_value, { compact: true })}
          </div>
        ),
        meta: { className: "w-[110px]" },
      },
      {
        id: "action",
        header: "AI Suggestion",
        accessorFn: (r) => r.recommendation?.recommendation_type ?? "",
        cell: ({ row }) =>
          row.original.recommendation ? (
            <ActionBadge type={row.original.recommendation.recommendation_type} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.recommendation?.status ?? "",
        cell: ({ row }) =>
          row.original.recommendation ? (
            <StatusBadge
              kind="recommendation"
              status={row.original.recommendation.status}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { className: "w-[44px]" },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Row actions">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => router.push(`/products/${r.product.id}`)}>
                  <ScrollText className="size-3.5" aria-hidden />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onApprove(r)}
                  disabled={!r.recommendation}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onReject(r)}
                  disabled={!r.recommendation}
                >
                  <ShieldOff className="size-3.5" aria-hidden />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/tasks?product=${r.product.id}`)}>
                  <Sparkles className="size-3.5" aria-hidden />
                  Create task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/audit-log?entity=${r.product.id}`)}>
                  <ScrollText className="size-3.5" aria-hidden />
                  Audit log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onApprove, onReject, router]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, rowSelection: selection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(selection) : updater;
      onSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    enableRowSelection: true,
    getRowId: (r) => r.id,
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [table, pageSize]);

  const rowModel = table.getRowModel();
  const totalRows = rows.length;
  const startIdx = totalRows === 0 ? 0 : table.getState().pagination.pageIndex * pageSize + 1;
  const endIdx = Math.min(totalRows, startIdx + rowModel.rows.length - 1);

  if (rows.length === 0) {
    return (
      <EmptyState />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-md border max-h-[640px]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)]">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="text-[11px] uppercase tracking-wide">
                {group.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  const metaClass = (h.column.columnDef.meta as { className?: string } | undefined)
                    ?.className;
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(
                        "h-9 whitespace-nowrap px-2",
                        h.column.id === "select" && "w-9 pl-3",
                        canSort && "cursor-pointer select-none",
                        metaClass
                      )}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort ? (
                          <ChevronDown
                            className={cn(
                              "size-3 opacity-40 transition-transform",
                              sorted === "asc" && "rotate-180 opacity-100",
                              sorted === "desc" && "opacity-100"
                            )}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rowModel.rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                onClick={() => onPreview(row.original)}
                className="cursor-pointer text-sm"
              >
                {row.getVisibleCells().map((cell) => {
                  const metaClass = (cell.column.columnDef.meta as { className?: string } | undefined)
                    ?.className;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "py-2 px-2",
                        cell.column.id === "select" && "w-9 pl-3",
                        metaClass
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          {totalRows === 0 ? (
            <span>No rows</span>
          ) : (
            <span>
              Showing <span className="font-medium text-foreground">{startIdx}</span>–
              <span className="font-medium text-foreground">{endIdx}</span> of{" "}
              <span className="font-medium text-foreground">{totalRows}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <span className="px-1 tabular-nums">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          {value} / page
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-32 p-1">
        {PAGE_SIZES.map((n) => (
          <button
            key={n}
            type="button"
            className={cn(
              "block w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent",
              n === value && "bg-accent/60 font-medium"
            )}
            onClick={() => {
              onChange(n);
              setOpen(false);
            }}
          >
            {n}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-medium">No risky products match your filters</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try removing filters or clearing the search to see more results.
        </p>
      </div>
    </div>
  );
}
