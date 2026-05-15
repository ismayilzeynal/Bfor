"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  PackageX,
  Search,
  Sparkles,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DATA_QUALITY_ISSUE_TYPE_LABELS,
  DATA_QUALITY_SEVERITY_LABELS,
  DATA_QUALITY_STATUS_LABELS,
} from "@/lib/constants";
import { formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DataQualityIssueType, DataQualitySeverity, DataQualityStatus } from "@/types";
import type { IssueRow } from "./types";

const ICONS: Record<DataQualityIssueType, React.ComponentType<{ className?: string }>> = {
  missing_expiry: CalendarX,
  stock_mismatch: PackageX,
  stale_inventory: Clock,
  no_sales_high_stock: TrendingDown,
  inconsistent_batch: AlertTriangle,
  low_confidence_recommendation: Sparkles,
};

const SEV_CLASSES: Record<DataQualitySeverity, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_CLASSES: Record<DataQualityStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  investigating: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
  ignored: "bg-zinc-200 text-zinc-600",
};

interface Props {
  rows: IssueRow[];
  selectedIds: Set<string>;
  onToggle: (id: string, value: boolean) => void;
  onToggleAll: (value: boolean) => void;
  onOpen: (row: IssueRow) => void;
  onQuickStatus: (row: IssueRow, status: DataQualityStatus) => void;
}

export function IssuesTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpen,
  onQuickStatus,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.issue.id));
  const someSelected = !allSelected && rows.some((r) => selectedIds.has(r.issue.id));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 py-12 text-sm text-muted-foreground">
        <Search className="size-6 opacity-50" aria-hidden />
        Heç bir issue tapılmadı.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-[36px]">
              <Checkbox
                aria-label="Select all"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(Boolean(v))}
              />
            </TableHead>
            <TableHead className="min-w-[180px]">Issue</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead className="min-w-[160px]">Product</TableHead>
            <TableHead>Store</TableHead>
            <TableHead className="min-w-[280px]">Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const Icon = ICONS[row.issue.issue_type];
            const isSelected = selectedIds.has(row.issue.id);
            return (
              <TableRow
                key={row.issue.id}
                onClick={() => onOpen(row)}
                className={cn("cursor-pointer", isSelected && "bg-muted/50")}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(v) => onToggle(row.issue.id, Boolean(v))}
                    aria-label={`Select ${row.issue.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="text-sm font-medium">
                      {DATA_QUALITY_ISSUE_TYPE_LABELS[row.issue.issue_type]}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("uppercase tracking-wide", SEV_CLASSES[row.issue.severity])}
                  >
                    {DATA_QUALITY_SEVERITY_LABELS[row.issue.severity]}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {row.product ? (
                    <Link
                      href={`/products/${row.product.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {row.product.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {row.store ? (
                    <Link
                      href={`/operations?store=${row.store.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {row.store.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[420px]">
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {row.issue.description}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(row.issue.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_CLASSES[row.effectiveStatus]} variant="secondary">
                    {DATA_QUALITY_STATUS_LABELS[row.effectiveStatus]}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpen(row)}>
                        <Search className="mr-2 size-4" aria-hidden />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onQuickStatus(row, "investigating")}
                        disabled={row.effectiveStatus === "investigating"}
                      >
                        <Activity className="mr-2 size-4 text-sky-600" aria-hidden />
                        Mark investigating
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onQuickStatus(row, "resolved")}
                        disabled={row.effectiveStatus === "resolved"}
                      >
                        <CheckCircle2 className="mr-2 size-4 text-emerald-600" aria-hidden />
                        Resolve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onQuickStatus(row, "ignored")}
                        disabled={row.effectiveStatus === "ignored"}
                      >
                        <XCircle className="mr-2 size-4 text-muted-foreground" aria-hidden />
                        Ignore
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
