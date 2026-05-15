"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useActionsStore } from "@/store/actions-store";
import { formatDateTime, formatRelative } from "@/lib/formatters";
import type { AuditLog, Recommendation, User } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseAudit: AuditLog[];
  users: User[];
  recommendation: Recommendation | undefined;
}

export function AuditLogDrawer({
  open,
  onOpenChange,
  baseAudit,
  users,
  recommendation,
}: Props) {
  const storeEntries = useActionsStore((s) => s.auditEntries);
  const [q, setQ] = useState("");

  const entries = useMemo<AuditLog[]>(() => {
    const all: AuditLog[] = [...baseAudit];
    if (recommendation) {
      for (const e of storeEntries) {
        if (e.entity_type === "recommendation" && e.entity_id === recommendation.id) {
          all.push(e);
        }
      }
    }
    return all
      .filter((e) => (q ? e.action.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [baseAudit, storeEntries, recommendation, q]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit Log</SheetTitle>
          <SheetDescription>All recorded events for this product.</SheetDescription>
        </SheetHeader>

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by action…"
          className="h-9 text-xs"
        />

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matching events.</p>
          ) : (
            entries.map((e) => (
              <AuditEntry key={e.id} entry={e} users={users} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditEntry({ entry, users }: { entry: AuditLog; users: User[] }) {
  const [expanded, setExpanded] = useState(false);
  const user = users.find((u) => u.id === entry.user_id);

  return (
    <div className="rounded-md border bg-background p-2.5 text-xs">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Avatar className="size-6">
          {user?.avatar_url ? <AvatarImage src={user.avatar_url} /> : null}
          <AvatarFallback className="text-[9px]">
            {(user?.full_name ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">{entry.action}</span>
            {expanded ? (
              <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {user?.full_name ?? "System"}
            <span className="mx-1">·</span>
            <span title={formatDateTime(entry.created_at)}>
              {formatRelative(entry.created_at)}
            </span>
          </p>
        </div>
      </button>
      {expanded ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <DiffBlock title="Before" value={entry.old_value} />
          <DiffBlock title="After" value={entry.new_value} />
        </div>
      ) : null}
    </div>
  );
}

function DiffBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <pre className="whitespace-pre-wrap break-words text-[10px] leading-snug">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

