"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/formatters";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-role";
import { useNotificationsStore } from "@/store/notifications-store";
import type { Notification } from "@/types";

const ENTITY_ROUTES: Record<string, string> = {
  recommendation: "/recommendations",
  task: "/tasks",
  transfer: "/transfers",
  discount: "/discounts",
  product: "/products",
  data_issue: "/data-quality",
};

export function NotificationsPopover() {
  const router = useRouter();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const notifications = useNotificationsStore((s) => s.notifications);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const mine = useMemo(
    () =>
      notifications
        .filter((n) => n.user_id === user.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 30),
    [notifications, user.id]
  );
  const unread = useMemo(() => mine.filter((n) => !n.is_read), [mine]);
  const unreadCount = unread.length;

  const handleClick = (n: Notification) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.entity_type) {
      const route = ENTITY_ROUTES[n.entity_type];
      if (route) {
        if (n.entity_type === "product" && n.entity_id) {
          router.push(`/products/${n.entity_id}`);
        } else {
          router.push(route);
        }
      }
    } else {
      router.push("/notifications");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-medium">Notifications</div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead(user.id)}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <Tabs defaultValue="all">
          <TabsList className="m-2 grid grid-cols-2">
            <TabsTrigger value="all" className="text-xs">
              All <span className="ml-1 text-muted-foreground">({mine.length})</span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread <span className="ml-1 text-muted-foreground">({unreadCount})</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="m-0">
            <NotificationList items={mine} onClick={handleClick} />
          </TabsContent>
          <TabsContent value="unread" className="m-0">
            <NotificationList items={unread} onClick={handleClick} />
          </TabsContent>
        </Tabs>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationList({
  items,
  onClick,
}: {
  items: Notification[];
  onClick: (n: Notification) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-sm text-muted-foreground">
        Nothing to show.
      </div>
    );
  }
  return (
    <ScrollArea className="h-[380px]">
      <ul className="divide-y">
        {items.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => onClick(n)}
              className={cn(
                "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent",
                !n.is_read && "bg-primary/5"
              )}
            >
              {!n.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              )}
              <div className={cn("min-w-0 flex-1", n.is_read && "pl-5")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <Badge
                    variant="secondary"
                    className={cn("h-4 shrink-0 px-1.5 text-[9px] font-normal", PRIORITY_CLASSES[n.priority])}
                  >
                    {PRIORITY_LABELS[n.priority]}
                  </Badge>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {formatRelative(n.created_at)}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
