"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ListTodo, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskStatusLanesProps {
  pending: Task[];
  inProgress: Task[];
  completedToday: Task[];
}

interface LaneMeta {
  label: string;
  icon: LucideIcon;
  accent: string;
  badge: string;
  href: string;
  empty: string;
}

const LANES: Array<{ key: keyof TaskStatusLanesProps; meta: LaneMeta }> = [
  {
    key: "pending",
    meta: {
      label: "Pending",
      icon: ListTodo,
      accent: "border-l-amber-500",
      badge: "bg-amber-50 text-amber-700",
      href: "/tasks?status=pending",
      empty: "No pending tasks.",
    },
  },
  {
    key: "inProgress",
    meta: {
      label: "In Progress",
      icon: Clock,
      accent: "border-l-indigo-500",
      badge: "bg-indigo-50 text-indigo-700",
      href: "/tasks?status=in_progress",
      empty: "Nothing in progress.",
    },
  },
  {
    key: "completedToday",
    meta: {
      label: "Completed Today",
      icon: CheckCircle2,
      accent: "border-l-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
      href: "/tasks?status=completed",
      empty: "No completions yet.",
    },
  },
];

export function TaskStatusLanes(props: TaskStatusLanesProps) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {LANES.map(({ key, meta }) => {
        const tasks = props[key];
        const Icon = meta.icon;
        return (
          <Card key={key} className={cn("border-l-4", meta.accent)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4" aria-hidden />
                {meta.label}
                <span
                  className={cn(
                    "ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    meta.badge
                  )}
                >
                  {tasks.length}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => router.push(meta.href)}
              >
                Open
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {tasks.length === 0 ? (
                <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
                  {meta.empty}
                </div>
              ) : (
                tasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 rounded-md border bg-background/60 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{t.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {t.description}
                      </div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
