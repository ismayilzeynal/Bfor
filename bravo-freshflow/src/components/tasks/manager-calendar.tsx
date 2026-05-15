"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { az } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_CLASSES } from "@/lib/constants";
import type { TaskRow } from "./types";

interface Props {
  rows: TaskRow[];
  now: Date;
  onRowClick: (row: TaskRow) => void;
}

export function ManagerCalendar({ rows, now, onRowClick }: Props) {
  const [month, setMonth] = useState<Date>(() => startOfMonth(now));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const r of rows) {
      let key: string;
      try {
        key = format(parseISO(r.task.deadline), "yyyy-MM-dd");
      } catch {
        continue;
      }
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">
          {format(month, "LLLL yyyy", { locale: az })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMonth(startOfMonth(now))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {["B.E.", "Ç.A.", "Ç", "C.A.", "C", "Ş", "B"].map((d) => (
          <div key={d} className="border-r px-2 py-1.5 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const list = byDay.get(key) ?? [];
          const otherMonth = !isSameMonth(day, month);
          const today = isSameDay(day, now);
          return (
            <div
              key={key}
              className={cn(
                "min-h-[120px] border-b border-r p-1.5 last-of-type:border-r-0",
                otherMonth && "bg-muted/20",
                today && "bg-primary/5"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    otherMonth ? "text-muted-foreground" : "text-foreground",
                    today && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </span>
                {list.length > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {list.length}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map((r) => (
                  <button
                    key={r.task.id}
                    type="button"
                    onClick={() => onRowClick(r)}
                    className={cn(
                      "block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium",
                      PRIORITY_CLASSES[r.task.priority],
                      "hover:opacity-80"
                    )}
                    title={r.task.title}
                  >
                    {r.task.title}
                  </button>
                ))}
                {list.length > 3 ? (
                  <div className="px-1 text-[9px] text-muted-foreground">+{list.length - 3} əlavə</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
