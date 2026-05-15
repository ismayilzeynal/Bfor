"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Flame } from "lucide-react";
import { isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { formatRelative } from "@/lib/formatters";
import { MOCK_DATE } from "@/lib/constants";
import type { Task, User } from "@/types";

interface CriticalTasksCardProps {
  tasks: Task[];
  users: User[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function CriticalTasksCard({ tasks, users }: CriticalTasksCardProps) {
  const router = useRouter();
  const today = parseISO(MOCK_DATE);
  const items = tasks
    .filter(
      (t) =>
        (t.priority === "critical" || t.priority === "high") &&
        (t.status === "pending" || t.status === "assigned" || t.status === "in_progress")
    )
    .filter((t) => {
      try {
        return isSameDay(parseISO(t.deadline), today);
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="size-4 text-rose-500" aria-hidden />
          Critical Tasks Today
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")}>
          View all
          <ChevronRight className="ml-1 size-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((t) => {
            const user = users.find((u) => u.id === t.assigned_to_user_id);
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-md border bg-background/50 p-2 hover:bg-muted/40 transition-colors"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {user ? initials(user.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.full_name ?? "Unassigned"} · {formatRelative(t.deadline)}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
      No critical tasks due today.
    </div>
  );
}
