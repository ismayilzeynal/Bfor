"use client";

import Link from "next/link";
import { useMemo } from "react";
import { intervalToDuration, parseISO } from "date-fns";
import {
  ChevronRight,
  Clock3,
  MoreVertical,
  Package,
  Percent,
  Truck,
  PackageSearch,
  Layers,
  Boxes,
  Trash2,
  Phone,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import {
  deriveLocation,
  priorityStripColor,
  urgencyTone,
  type TaskRow,
} from "./types";
import type { TaskType } from "@/types";

const ICONS: Record<TaskType, typeof Percent> = {
  apply_discount: Percent,
  prepare_transfer: Truck,
  stock_check: PackageSearch,
  shelf_action: Layers,
  create_bundle: Boxes,
  record_waste: Trash2,
  supplier_followup: Phone,
};

interface Props {
  row: TaskRow;
  now: Date;
  onComplete: (row: TaskRow) => void;
  onSkip: (row: TaskRow) => void;
  onReport: (row: TaskRow) => void;
}

export function EmployeeTaskCard({ row, now, onComplete, onSkip, onReport }: Props) {
  const { task, product, store } = row;
  const TypeIcon = ICONS[task.task_type] ?? PackageSearch;

  const deadline = useMemo(() => {
    try {
      return parseISO(task.deadline);
    } catch {
      return null;
    }
  }, [task.deadline]);

  const hoursRemaining = deadline ? (deadline.getTime() - now.getTime()) / 3_600_000 : Infinity;
  const tone = urgencyTone(hoursRemaining, task.status);
  const isDone = task.status === "completed";
  const location = product ? deriveLocation(product.id, task.store_id) : null;

  const deadlineLabel = useMemo(() => {
    if (!deadline) return "—";
    const overdue = hoursRemaining < 0;
    const dur = intervalToDuration(
      overdue ? { start: deadline, end: now } : { start: now, end: deadline }
    );
    const parts: string[] = [];
    if (dur.days) parts.push(`${dur.days}g`);
    if (dur.hours) parts.push(`${dur.hours}s`);
    if (!dur.days && dur.minutes !== undefined) parts.push(`${dur.minutes}d`);
    const text = parts.slice(0, 2).join(" ") || "0d";
    return overdue ? `${text} keçib` : `${text} qaldı`;
  }, [deadline, hoursRemaining, now]);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm transition",
        isDone && "opacity-70"
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", priorityStripColor(task.priority))} />
      <div className="space-y-3 pl-4 pr-3 py-3">
        <div className="flex items-start gap-3">
          {product ? (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600">
              <Package className="size-7" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight">{task.title}</h3>
            {product ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {product.name}
              </p>
            ) : null}
            {location ? (
              <p className="mt-1 inline-flex max-w-full items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {location}
              </p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8 shrink-0">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onSkip(row)}>Skip task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReport(row)}>Report problem</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground">
            <TypeIcon className="size-3" /> {TASK_TYPE_LABELS[task.task_type]}
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium tabular-nums", tone)}>
            <Clock3 className="size-3" /> {deadlineLabel}
          </span>
        </div>

        {!isDone ? (
          <div className="flex gap-2">
            <Button
              size="lg"
              className="h-11 flex-1 gap-1.5 text-sm font-semibold"
              onClick={() => onComplete(row)}
            >
              <Check className="size-4" /> Tamamla
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 gap-1">
              <Link href={`/my-tasks/${task.id}`}>
                Detallar
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href={`/my-tasks/${task.id}`}>Detallar</Link>
          </Button>
        )}
        {store ? (
          <div className="text-[10px] font-mono uppercase text-muted-foreground">{store.code}</div>
        ) : null}
      </div>
    </article>
  );
}
