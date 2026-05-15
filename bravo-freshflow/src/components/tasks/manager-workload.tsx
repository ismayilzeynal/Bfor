"use client";

import { useMemo } from "react";
import { addDays, isSameDay, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import type { TaskRow } from "./types";

interface WorkloadAssignee {
  user: User;
  today: { pending: number; in_progress: number; completed: number };
  thisWeekPending: number;
  highPriPending: number;
  rows: TaskRow[];
}

interface Props {
  rows: TaskRow[];
  users: User[];
  now: Date;
  onRowClick: (row: TaskRow) => void;
}

export function ManagerWorkload({ rows, users, now, onRowClick }: Props) {
  const weekEnd = addDays(now, 7);

  const data = useMemo<WorkloadAssignee[]>(() => {
    const map = new Map<string, WorkloadAssignee>();
    for (const r of rows) {
      const user = users.find((u) => u.id === r.task.assigned_to_user_id);
      if (!user) continue;
      const entry = map.get(user.id) ?? {
        user,
        today: { pending: 0, in_progress: 0, completed: 0 },
        thisWeekPending: 0,
        highPriPending: 0,
        rows: [],
      };
      entry.rows.push(r);

      try {
        const deadline = parseISO(r.task.deadline);
        if (isSameDay(deadline, now)) {
          if (r.task.status === "in_progress") entry.today.in_progress += 1;
          else if (r.task.status === "completed") entry.today.completed += 1;
          else if (r.task.status === "pending" || r.task.status === "assigned") entry.today.pending += 1;
        }
        if (deadline >= now && deadline <= weekEnd) {
          if (r.task.status === "pending" || r.task.status === "assigned" || r.task.status === "in_progress") {
            entry.thisWeekPending += 1;
            if (r.task.priority === "high" || r.task.priority === "critical") {
              entry.highPriPending += 1;
            }
          }
        }
      } catch {
        // ignore parse errors
      }

      map.set(user.id, entry);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.today.pending + b.today.in_progress - (a.today.pending + a.today.in_progress)
    );
  }, [rows, users, now, weekEnd]);

  if (data.length === 0) {
    return (
      <div className="rounded-md border bg-background p-10 text-center text-xs text-muted-foreground">
        İcraçılar üçün hələ ki, məlumat yoxdur.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-background">
      {data.map((entry) => {
        const todayTotal = entry.today.pending + entry.today.in_progress + entry.today.completed;
        const bottleneck = entry.highPriPending > 5;
        return (
          <div key={entry.user.id} className="border-b p-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={entry.user.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {entry.user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{entry.user.full_name}</span>
                  {bottleneck ? (
                    <Badge variant="outline" className="gap-1 border-rose-300 text-rose-700">
                      <AlertTriangle className="size-3" /> Bottleneck
                    </Badge>
                  ) : null}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {entry.user.department} · Bu həftə üçün açıq: {entry.thisWeekPending}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold tabular-nums">{todayTotal}</div>
                <div className="text-[10px] uppercase text-muted-foreground">Bu gün</div>
              </div>
            </div>
            {todayTotal > 0 ? (
              <div className="mt-2">
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <Segment value={entry.today.pending} total={todayTotal} tone="bg-slate-400" />
                  <Segment value={entry.today.in_progress} total={todayTotal} tone="bg-indigo-500" />
                  <Segment value={entry.today.completed} total={todayTotal} tone="bg-emerald-500" />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <Legend tone="bg-slate-400" label={`Pending ${entry.today.pending}`} />
                  <Legend tone="bg-indigo-500" label={`In Progress ${entry.today.in_progress}`} />
                  <Legend tone="bg-emerald-500" label={`Completed ${entry.today.completed}`} />
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-dashed bg-muted/20 py-2 text-center text-[11px] text-muted-foreground">
                Bu gün üçün tapşırıq yoxdur.
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.rows.slice(0, 3).map((r) => (
                <button
                  key={r.task.id}
                  type="button"
                  onClick={() => onRowClick(r)}
                  className="truncate rounded-md border bg-background px-2 py-1 text-[10px] hover:bg-accent"
                  title={r.task.title}
                >
                  {r.task.title.slice(0, 32)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Segment({ value, total, tone }: { value: number; total: number; tone: string }) {
  if (value <= 0) return null;
  return <div className={cn(tone)} style={{ width: `${(value / total) * 100}%` }} />;
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2 rounded-full", tone)} aria-hidden />
      {label}
    </span>
  );
}
