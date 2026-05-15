"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/formatters";
import { useActionsStore } from "@/store/actions-store";
import { cn } from "@/lib/utils";
import type { AuditLog, Recommendation, User } from "@/types";

interface Props {
  baseAudit: AuditLog[];
  users: User[];
  recommendation: Recommendation | undefined;
}

const ACTION_TONE: Record<string, string> = {
  created: "bg-blue-500",
  approve_recommendation: "bg-emerald-500",
  reject_recommendation: "bg-rose-500",
  bulk_approve_recommendations: "bg-emerald-500",
  bulk_reject_recommendations: "bg-rose-500",
  updated: "bg-amber-500",
  completed: "bg-emerald-600",
};

const ACTION_LABEL: Record<string, string> = {
  created: "AI created recommendation",
  approve_recommendation: "Recommendation approved",
  reject_recommendation: "Recommendation rejected",
  bulk_approve_recommendations: "Bulk approve",
  bulk_reject_recommendations: "Bulk reject",
  updated: "Updated",
  completed: "Completed",
};

export function AuditTrailSection({ baseAudit, users, recommendation }: Props) {
  const storeEntries = useActionsStore((s) => s.auditEntries);

  const merged = useMemo<AuditLog[]>(() => {
    const list: AuditLog[] = [...baseAudit];
    if (recommendation) {
      for (const e of storeEntries) {
        if (e.entity_type === "recommendation" && e.entity_id === recommendation.id) {
          list.push(e);
        }
      }
    }
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [baseAudit, storeEntries, recommendation]);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <ScrollText className="size-4 text-muted-foreground" aria-hidden />
        Audit Trail
      </h2>
      <Card>
        <CardContent className="p-4">
          {merged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-5">
              {merged.map((e) => {
                const user = users.find((u) => u.id === e.user_id);
                const tone = ACTION_TONE[e.action] ?? "bg-slate-400";
                const label = ACTION_LABEL[e.action] ?? e.action;
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-background",
                        tone
                      )}
                      aria-hidden
                    />
                    <div className="flex items-start gap-2.5">
                      <Avatar className="size-7">
                        {user?.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt={user.full_name} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {(user?.full_name ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {user?.full_name ?? "System"}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span title={formatDateTime(e.created_at)}>
                            {formatRelative(e.created_at)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
