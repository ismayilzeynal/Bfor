"use client";

import Link from "next/link";
import { CheckCheck, CircleDot, Trash2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/formatters";
import { PRIORITY_CLASSES, PRIORITY_LABELS, NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import type { Notification } from "@/types";
import { NotificationIcon } from "./notification-icon";

interface NotificationCardProps {
  notification: Notification;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
  href: string | null;
  onNavigate?: () => void;
}

export function NotificationCard({
  notification,
  selected,
  onToggleSelect,
  onMarkRead,
  onMarkUnread,
  onDelete,
  href,
  onNavigate,
}: NotificationCardProps) {
  const { id, type, priority, title, message, is_read, created_at } = notification;

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
        is_read ? "bg-card" : "border-primary/30 bg-primary/[0.04]"
      )}
    >
      <div className="pt-1.5">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(id)}
          aria-label={`Select ${title}`}
        />
      </div>
      <NotificationIcon type={type} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {!is_read && (
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
              )}
              <span className="truncate text-sm font-semibold">{title}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{message}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-[10px] font-medium", PRIORITY_CLASSES[priority])}
            >
              {PRIORITY_LABELS[priority]}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="h-4 rounded-full px-1.5 text-[10px] font-normal">
            {NOTIFICATION_TYPE_LABELS[type]}
          </Badge>
          <span>{formatRelative(created_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {is_read ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => onMarkUnread(id)}
            >
              <CircleDot className="mr-1 h-3 w-3" />
              Mark unread
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => onMarkRead(id)}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark read
            </Button>
          )}
          {href ? (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary">
              <Link href={href} onClick={onNavigate}>
                Open <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-600"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}
