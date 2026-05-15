"use client";

import Link from "next/link";
import { intervalToDuration, parseISO } from "date-fns";
import { MoreHorizontal, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionBadge } from "@/components/badges/action-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters";
import type { TaskRow } from "./types";

interface Props {
  rows: TaskRow[];
  selected: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (row: TaskRow) => void;
  onUpdateStatus: (row: TaskRow, status: "in_progress" | "completed" | "cancelled") => void;
  onReassign: (row: TaskRow) => void;
  onExtend: (row: TaskRow) => void;
  now: Date;
}

export function ManagerTable({
  rows,
  selected,
  onSelect,
  onSelectAll,
  onRowClick,
  onUpdateStatus,
  onReassign,
  onExtend,
  now,
}: Props) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.task.id));
  const someChecked = rows.some((r) => selected.has(r.task.id));

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[640px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <TableRow>
              <TableHead className="w-[36px]">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={(v) => onSelectAll(!!v)}
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[44px] text-right">·</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-14 text-center text-xs text-muted-foreground">
                  Bu tabda heç bir tapşırıq yoxdur.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const checked = selected.has(r.task.id);
                return (
                  <TableRow
                    key={r.task.id}
                    data-state={checked ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, input, [role='checkbox'], [role='menu']")) return;
                      onRowClick(r);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => onSelect(r.task.id, !!v)}
                        aria-label={`Select ${r.task.id}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="line-clamp-1 text-xs font-medium">{r.task.title}</div>
                      <div className="line-clamp-1 text-[11px] text-muted-foreground">
                        {r.task.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.product ? (
                        <Link
                          href={`/products/${r.product.id}`}
                          className="flex items-center gap-2 text-xs hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600">
                            <Package className="size-3.5" />
                          </div>
                          <span className="line-clamp-1 max-w-[160px]">{r.product.name}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-mono">{r.store?.code ?? "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.assignee ? (
                          <>
                            <Avatar className="size-6">
                              <AvatarImage src={r.assignee.avatar_url ?? undefined} alt="" />
                              <AvatarFallback className="text-[9px]">
                                {r.assignee.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="line-clamp-1 max-w-[120px] text-xs">
                              {r.assignee.full_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{TASK_TYPE_LABELS[r.task.task_type]}</span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={r.task.priority} />
                    </TableCell>
                    <TableCell>
                      <DeadlineCell deadline={r.task.deadline} now={now} status={r.task.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="task" status={r.task.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onRowClick(r)}>View details</DropdownMenuItem>
                          {r.task.status !== "in_progress" && r.task.status !== "completed" ? (
                            <DropdownMenuItem onClick={() => onUpdateStatus(r, "in_progress")}>
                              Mark in progress
                            </DropdownMenuItem>
                          ) : null}
                          {r.task.status !== "completed" ? (
                            <DropdownMenuItem onClick={() => onUpdateStatus(r, "completed")}>
                              Mark completed
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => onReassign(r)}>Reassign…</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onExtend(r)}>Extend deadline…</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700"
                            onClick={() => onUpdateStatus(r, "cancelled")}
                          >
                            Cancel task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DeadlineCell({ deadline, now, status }: { deadline: string; now: Date; status: string }) {
  if (status === "completed" || status === "cancelled") {
    return <span className="text-xs text-muted-foreground">{formatDateTime(deadline)}</span>;
  }
  try {
    const due = parseISO(deadline);
    const diffMs = due.getTime() - now.getTime();
    if (diffMs <= 0) {
      const dur = intervalToDuration({ start: due, end: now });
      const parts = compactDuration(dur);
      return <span className="text-xs font-medium text-rose-700">{parts} overdue</span>;
    }
    const dur = intervalToDuration({ start: now, end: due });
    const parts = compactDuration(dur);
    const tone = diffMs < 60 * 60 * 1000 ? "text-rose-700 font-medium" : diffMs < 4 * 60 * 60 * 1000 ? "text-amber-700 font-medium" : "text-muted-foreground";
    return <span className={cn("text-xs", tone)}>{parts}</span>;
  } catch {
    return <span className="text-xs text-muted-foreground">{deadline}</span>;
  }
}

function compactDuration(d: ReturnType<typeof intervalToDuration>): string {
  const parts: string[] = [];
  if (d.days) parts.push(`${d.days}g`);
  if (d.hours) parts.push(`${d.hours}s`);
  if (!d.days && d.minutes !== undefined) parts.push(`${d.minutes}d`);
  return parts.slice(0, 2).join(" ") || "0d";
}
