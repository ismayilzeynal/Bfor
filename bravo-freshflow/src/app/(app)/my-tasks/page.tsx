"use client";

import { useMemo, useState } from "react";
import { isSameDay, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";
import { useTasksData } from "@/components/tasks/use-tasks-data";
import { priorityWeight, scopeTasksByRole, type TaskRow } from "@/components/tasks/types";
import { EmployeeTaskCard } from "@/components/tasks/employee-task-card";
import { ProgressRing } from "@/components/tasks/progress-ring";
import { Confetti } from "@/components/tasks/confetti";

export default function MyTasksPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateTaskStatus = useActionsStore((s) => s.updateTaskStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { rows, loading, now } = useTasksData();

  const [todayOnly, setTodayOnly] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const mine = useMemo(() => {
    const employeeScoped = rows.filter((r) => r.task.assigned_to_user_id === currentUser.id);
    if (employeeScoped.length === 0) {
      return scopeTasksByRole(rows, currentUser);
    }
    return employeeScoped;
  }, [rows, currentUser]);

  const todayRows = useMemo(() => {
    return mine.filter((r) => {
      try {
        return isSameDay(parseISO(r.task.deadline), now);
      } catch {
        return false;
      }
    });
  }, [mine, now]);

  const activeSource = todayOnly ? todayRows : mine;

  const active = useMemo(() => {
    return activeSource
      .filter(
        (r) =>
          r.task.status === "pending" ||
          r.task.status === "assigned" ||
          r.task.status === "in_progress"
      )
      .sort((a, b) => {
        const pw = priorityWeight(b.task.priority) - priorityWeight(a.task.priority);
        if (pw !== 0) return pw;
        return a.task.deadline.localeCompare(b.task.deadline);
      });
  }, [activeSource]);

  const completedToday = useMemo(() => {
    const todayISO = now.toISOString().slice(0, 10);
    return mine
      .filter((r) => r.task.status === "completed" && r.task.completed_at?.slice(0, 10) === todayISO)
      .sort((a, b) => (b.task.completed_at ?? "").localeCompare(a.task.completed_at ?? ""));
  }, [mine, now]);

  const expired = useMemo(
    () => activeSource.filter((r) => r.task.status === "expired"),
    [activeSource]
  );

  const totalToday = todayRows.length;
  const completedTodayCount = todayRows.filter((r) => r.task.status === "completed").length;
  const allDone = active.length === 0 && expired.length === 0;

  function audit(taskId: string, action: string, oldVal: unknown, newVal: unknown) {
    appendAudit({
      id: `aud-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: currentUser.id,
      action,
      entity_type: "task",
      entity_id: taskId,
      old_value: oldVal,
      new_value: newVal,
      created_at: new Date().toISOString(),
      ip_address: "0.0.0.0",
    });
  }

  function handleComplete(row: TaskRow) {
    updateTaskStatus(row.task.id, "completed", { userId: currentUser.id });
    audit(row.task.id, "task_completed", { status: row.task.status }, { status: "completed" });
    toast.success("Tapşırıq tamamlandı 🎉", { description: row.task.title });
  }

  function handleSkip(row: TaskRow) {
    toast.message("Tapşırıq atlandı (demo) — supervisor məlumatlandırıldı");
    audit(row.task.id, "task_skipped", null, { skipped_by: currentUser.id });
  }

  function handleReport(row: TaskRow) {
    toast.message("Problem report qeydə alındı (demo)");
    audit(row.task.id, "task_reported", null, { reported_by: currentUser.id });
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 pb-10">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const firstName = currentUser.full_name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-16">
      <header className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={currentUser.avatar_url ?? undefined} alt="" />
            <AvatarFallback>
              {currentUser.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight">Salam, {firstName} 👋</h1>
            <p className="text-xs text-muted-foreground">
              Bu gün üçün {totalToday} tapşırığın var.
            </p>
          </div>
          <ProgressRing completed={completedTodayCount} total={Math.max(totalToday, 1)} size={64} stroke={6} />
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 font-medium">
            <Switch checked={todayOnly} onCheckedChange={setTodayOnly} />
            <span>Yalnız bu gün</span>
          </label>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {active.length} aktiv · {expired.length} keçmiş
          </span>
        </div>
      </header>

      {allDone ? (
        <div className="relative overflow-hidden rounded-2xl border bg-emerald-50/40 px-4 py-12 text-center">
          <Confetti count={32} />
          <PartyPopper className="mx-auto mb-3 size-10 text-emerald-600" />
          <h2 className="text-base font-semibold">Bu gün üçün tapşırıq qalmadı 🎉</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Əla iş! Növbəti tapşırığa qədər dincələ bilərsən.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <div className="space-y-3">
            {active.map((row) => (
              <motion.div
                key={row.task.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18 }}
              >
                <EmployeeTaskCard
                  row={row}
                  now={now}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  onReport={handleReport}
                />
              </motion.div>
            ))}
            {expired.map((row) => (
              <motion.div
                key={row.task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmployeeTaskCard
                  row={row}
                  now={now}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  onReport={handleReport}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {completedToday.length > 0 ? (
        <section className="rounded-2xl border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span>Bu gün tamamlananlar · {completedToday.length}</span>
            {showCompleted ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {showCompleted ? (
            <div className="space-y-2 border-t px-4 py-3 opacity-70">
              {completedToday.map((row) => (
                <div key={row.task.id} className="rounded-md border bg-muted/30 p-2">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="line-clamp-1 font-medium">{row.task.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      ✓ {row.task.completed_at?.slice(11, 16)}
                    </span>
                  </div>
                  {row.task.completion_note ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {row.task.completion_note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="text-center">
        <Button variant="ghost" size="sm" className="text-xs" asChild>
          <a href="/notifications">Bütün bildirişləri gör</a>
        </Button>
      </div>
    </div>
  );
}
