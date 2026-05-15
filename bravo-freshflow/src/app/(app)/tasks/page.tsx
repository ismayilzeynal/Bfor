"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, LayoutGrid, ListChecks, Users, X } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";
import {
  EMPTY_MANAGER_FILTERS,
  MANAGER_TAB_LABELS,
  MANAGER_TAB_ORDER,
  applyManagerFilters,
  matchesManagerTab,
  scopeTasksByRole,
  type ManagerFilters,
  type ManagerTab,
  type ManagerView,
  type TaskRow,
} from "@/components/tasks/types";
import { useTasksData } from "@/components/tasks/use-tasks-data";
import { ManagerToolbar } from "@/components/tasks/manager-toolbar";
import { ManagerTable } from "@/components/tasks/manager-table";
import { ManagerCalendar } from "@/components/tasks/manager-calendar";
import { ManagerWorkload } from "@/components/tasks/manager-workload";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import type { Priority, TaskStatus, User } from "@/types";
import { PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <TasksManagerView />
    </Suspense>
  );
}

function Fallback() {
  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" description="Manager view — Table, Calendar, Workload." />
      <Skeleton className="h-12" />
      <Skeleton className="h-[420px]" />
    </div>
  );
}

function TasksManagerView() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateTaskStatus = useActionsStore((s) => s.updateTaskStatus);
  const setTaskOverride = useActionsStore((s) => s.setTaskOverride);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { rows, loading, now, raw } = useTasksData();

  const [tab, setTab] = useState<ManagerTab>("pending");
  const [view, setView] = useState<ManagerView>("table");
  const [filters, setFilters] = useState<ManagerFilters>(EMPTY_MANAGER_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerRow, setDrawerRow] = useState<TaskRow | null>(null);

  const [reassignFor, setReassignFor] = useState<TaskRow | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>("");

  const [extendFor, setExtendFor] = useState<TaskRow | null>(null);
  const [extendValue, setExtendValue] = useState<string>("");

  const [bulkPriority, setBulkPriority] = useState<Priority | "">("");
  const [bulkAssignee, setBulkAssignee] = useState<string>("");

  const scopedRows = useMemo(() => scopeTasksByRole(rows, currentUser), [rows, currentUser]);
  const filteredRows = useMemo(() => applyManagerFilters(scopedRows, filters), [scopedRows, filters]);

  const tabCounts = useMemo(() => {
    const counts: Record<ManagerTab, number> = {
      pending: 0,
      in_progress: 0,
      completed_today: 0,
      expired: 0,
      all: filteredRows.length,
    };
    for (const r of filteredRows) {
      if (matchesManagerTab(r.task, "pending", now)) counts.pending += 1;
      if (matchesManagerTab(r.task, "in_progress", now)) counts.in_progress += 1;
      if (matchesManagerTab(r.task, "completed_today", now)) counts.completed_today += 1;
      if (matchesManagerTab(r.task, "expired", now)) counts.expired += 1;
    }
    return counts;
  }, [filteredRows, now]);

  const tabRows = useMemo(
    () => filteredRows.filter((r) => matchesManagerTab(r.task, tab, now)),
    [filteredRows, tab, now]
  );

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const r of tabRows) {
        if (prev.has(r.task.id)) next.add(r.task.id);
      }
      return next;
    });
  }, [tabRows]);

  const users = raw?.users ?? [];
  const stores = raw?.stores ?? [];

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

  function handleUpdateStatus(row: TaskRow, status: "in_progress" | "completed" | "cancelled") {
    updateTaskStatus(row.task.id, status, { userId: currentUser.id });
    audit(row.task.id, `task_${status}`, { status: row.task.status }, { status });
    toast.success(
      status === "in_progress"
        ? "Tapşırıq icraya götürüldü"
        : status === "completed"
          ? "Tapşırıq tamamlandı"
          : "Tapşırıq ləğv edildi",
      { description: row.task.title }
    );
  }

  function handleReassign(row: TaskRow) {
    setReassignFor(row);
    setReassignTarget(row.task.assigned_to_user_id);
  }

  function confirmReassign() {
    if (!reassignFor || !reassignTarget) return;
    setTaskOverride(reassignFor.task.id, { assigned_to_user_id: reassignTarget });
    audit(
      reassignFor.task.id,
      "task_reassigned",
      { assigned_to_user_id: reassignFor.task.assigned_to_user_id },
      { assigned_to_user_id: reassignTarget }
    );
    toast.success("İcraçı dəyişdirildi");
    setReassignFor(null);
  }

  function handleExtend(row: TaskRow) {
    setExtendFor(row);
    setExtendValue(row.task.deadline.slice(0, 16));
  }

  function confirmExtend() {
    if (!extendFor || !extendValue) return;
    const iso = new Date(extendValue).toISOString();
    setTaskOverride(extendFor.task.id, { deadline: iso });
    audit(
      extendFor.task.id,
      "task_deadline_extended",
      { deadline: extendFor.task.deadline },
      { deadline: iso }
    );
    toast.success("Deadline uzadıldı");
    setExtendFor(null);
  }

  function applyBulkPriority() {
    if (!bulkPriority || selected.size === 0) return;
    Array.from(selected).forEach((id) => {
      const target = tabRows.find((r) => r.task.id === id);
      if (!target) return;
      setTaskOverride(id, { priority: bulkPriority });
      audit(id, "task_priority_changed", { priority: target.task.priority }, { priority: bulkPriority });
    });
    toast.success(`${selected.size} tapşırığın prioriteti dəyişdi`);
    setSelected(new Set());
    setBulkPriority("");
  }

  function applyBulkReassign() {
    if (!bulkAssignee || selected.size === 0) return;
    Array.from(selected).forEach((id) => {
      const target = tabRows.find((r) => r.task.id === id);
      if (!target) return;
      setTaskOverride(id, { assigned_to_user_id: bulkAssignee });
      audit(
        id,
        "task_reassigned",
        { assigned_to_user_id: target.task.assigned_to_user_id },
        { assigned_to_user_id: bulkAssignee }
      );
    });
    toast.success(`${selected.size} tapşırıq yeni icraçıya verildi`);
    setSelected(new Set());
    setBulkAssignee("");
  }

  function applyBulkCancel() {
    if (selected.size === 0) return;
    Array.from(selected).forEach((id) => {
      const target = tabRows.find((r) => r.task.id === id);
      if (!target) return;
      updateTaskStatus(id, "cancelled", { userId: currentUser.id });
      audit(id, "task_cancelled", { status: target.task.status }, { status: "cancelled" });
    });
    toast.success(`${selected.size} tapşırıq ləğv edildi`);
    setSelected(new Set());
  }

  if (loading || !raw) {
    return <Fallback />;
  }

  const selectedRows = tabRows.filter((r) => selected.has(r.task.id));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Tapşırıqları idarə et — siyahı, təqvim və icraçı yükü görünüşləri."
        actions={
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as ManagerView)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <LayoutGrid className="mr-1 size-3.5" />
              Table
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view">
              <Calendar className="mr-1 size-3.5" />
              Calendar
            </ToggleGroupItem>
            <ToggleGroupItem value="workload" aria-label="Workload view">
              <Users className="mr-1 size-3.5" />
              Workload
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <ManagerToolbar
        filters={filters}
        onFilters={setFilters}
        stores={stores}
        users={users}
        totalRows={scopedRows.length}
        visibleRows={filteredRows.length}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ManagerTab)}>
        <TabsList className="flex h-auto flex-wrap items-center justify-start gap-1 bg-transparent p-0">
          {MANAGER_TAB_ORDER.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
            >
              {MANAGER_TAB_LABELS[t]}
              <Badge
                variant="outline"
                className={cn("h-4 px-1 text-[10px] tabular-nums", t === tab && "border-primary/40")}
              >
                {tabCounts[t]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "table" ? (
        <ManagerTable
          rows={tabRows}
          selected={selected}
          onSelect={(id, checked) => {
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onSelectAll={(checked) => {
            setSelected(checked ? new Set(tabRows.map((r) => r.task.id)) : new Set());
          }}
          onRowClick={setDrawerRow}
          onUpdateStatus={handleUpdateStatus}
          onReassign={handleReassign}
          onExtend={handleExtend}
          now={now}
        />
      ) : view === "calendar" ? (
        <ManagerCalendar rows={tabRows} now={now} onRowClick={setDrawerRow} />
      ) : (
        <ManagerWorkload rows={tabRows} users={users} now={now} onRowClick={setDrawerRow} />
      )}

      {selected.size > 0 ? (
        <BulkBar
          count={selected.size}
          users={users}
          bulkPriority={bulkPriority}
          setBulkPriority={setBulkPriority}
          bulkAssignee={bulkAssignee}
          setBulkAssignee={setBulkAssignee}
          applyBulkPriority={applyBulkPriority}
          applyBulkReassign={applyBulkReassign}
          applyBulkCancel={applyBulkCancel}
          onClear={() => setSelected(new Set())}
          selectedRows={selectedRows}
        />
      ) : null}

      <TaskDetailDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />

      <Dialog open={reassignFor !== null} onOpenChange={(o) => !o && setReassignFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign task</DialogTitle>
            <DialogDescription className="line-clamp-2 text-xs">
              {reassignFor?.task.title}
            </DialogDescription>
          </DialogHeader>
          <Select value={reassignTarget} onValueChange={setReassignTarget}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              {users
                .filter((u) => u.is_active && (u.role === "employee" || u.role === "supervisor" || u.role === "store_manager"))
                .map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.full_name} · {u.department}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setReassignFor(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmReassign} disabled={!reassignTarget}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendFor !== null} onOpenChange={(o) => !o && setExtendFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend deadline</DialogTitle>
            <DialogDescription className="line-clamp-2 text-xs">
              {extendFor?.task.title}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={extendValue}
            onChange={(e) => setExtendValue(e.target.value)}
            className="h-9 text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setExtendFor(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmExtend} disabled={!extendValue}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BulkBar({
  count,
  users,
  bulkPriority,
  setBulkPriority,
  bulkAssignee,
  setBulkAssignee,
  applyBulkPriority,
  applyBulkReassign,
  applyBulkCancel,
  onClear,
  selectedRows,
}: {
  count: number;
  users: User[];
  bulkPriority: Priority | "";
  setBulkPriority: (v: Priority | "") => void;
  bulkAssignee: string;
  setBulkAssignee: (v: string) => void;
  applyBulkPriority: () => void;
  applyBulkReassign: () => void;
  applyBulkCancel: () => void;
  onClear: () => void;
  selectedRows: TaskRow[];
}) {
  const totalCritical = selectedRows.filter((r) => r.task.priority === "critical").length;
  const totalHigh = selectedRows.filter((r) => r.task.priority === "high").length;

  return (
    <div className="sticky bottom-4 z-30 mx-auto flex w-full max-w-4xl items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
      <Avatar className="hidden size-8 sm:flex">
        <AvatarFallback className="text-[10px]">{count}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">
          {count} task selected · {totalCritical} critical · {totalHigh} high
        </div>
      </div>
      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <Select value={bulkPriority || undefined} onValueChange={(v) => setBulkPriority(v as Priority)}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
            <SelectItem key={p} value={p} className="text-xs">
              {PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkPriority} disabled={!bulkPriority}>
        Apply
      </Button>
      <Select value={bulkAssignee || undefined} onValueChange={setBulkAssignee}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Reassign…" />
        </SelectTrigger>
        <SelectContent>
          {users
            .filter((u) => u.is_active && (u.role === "employee" || u.role === "supervisor" || u.role === "store_manager"))
            .map((u) => (
              <SelectItem key={u.id} value={u.id} className="text-xs">
                {u.full_name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkReassign} disabled={!bulkAssignee}>
        Apply
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 hover:text-rose-700" onClick={applyBulkCancel}>
        Cancel all
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={onClear}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
