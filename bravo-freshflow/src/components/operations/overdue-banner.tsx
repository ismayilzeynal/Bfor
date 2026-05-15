"use client";

import { useRouter } from "next/navigation";
import { AlertOctagon, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/formatters";
import type { Task, User } from "@/types";

interface OverdueBannerProps {
  tasks: Task[];
  users: User[];
}

export function OverdueBanner({ tasks, users }: OverdueBannerProps) {
  const router = useRouter();
  if (tasks.length === 0) return null;

  const top = [...tasks]
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);

  return (
    <Card className="border-rose-200 bg-rose-50/60">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <AlertOctagon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-rose-800">
              {tasks.length} overdue {tasks.length === 1 ? "task" : "tasks"}
            </div>
            <div className="mt-1 space-y-1 text-xs text-rose-700">
              {top.map((t) => {
                const user = users.find((u) => u.id === t.assigned_to_user_id);
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-rose-500" aria-hidden />
                    <span className="truncate font-medium">{t.title}</span>
                    <span className="opacity-70">
                      · {user?.full_name ?? "Unassigned"} · {formatRelative(t.deadline)}
                    </span>
                  </div>
                );
              })}
              {tasks.length > top.length ? (
                <div className="pl-3 text-[11px] opacity-70">
                  +{tasks.length - top.length} more…
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => router.push("/tasks?status=overdue")}
          className="shrink-0"
        >
          Handle now
          <ArrowRight className="ml-1 size-3.5" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}
