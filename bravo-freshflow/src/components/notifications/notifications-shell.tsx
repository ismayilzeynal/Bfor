"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseISO, isSameDay, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { CheckCheck, Trash2, BellOff, Settings as SettingsIcon, Bell } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MultiSelectPopover, type MultiSelectOption } from "@/components/products/multi-select-popover";
import { NOTIFICATION_TYPE_LABELS, PRIORITY_LABELS, MOCK_DATE } from "@/lib/constants";
import type { Notification, NotificationType, Priority } from "@/types";
import { useCurrentUser } from "@/hooks/use-role";
import { useNotificationsStore } from "@/store/notifications-store";
import { NotificationCard } from "./notification-card";

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  recommendation: () => "/products",
  task: () => "/tasks",
  transfer: () => "/tasks",
  discount: () => "/tasks",
  product: (id) => `/products/${id}`,
  data_issue: () => "/products",
};

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const ALL_TYPES: NotificationType[] = [
  "critical_risk",
  "approval_needed",
  "task_assigned",
  "task_deadline_approaching",
  "task_expired",
  "transfer_pending",
  "stock_mismatch",
  "low_data_confidence",
  "supplier_issue",
  "result_ready",
];

const MENTION_TYPES = new Set<NotificationType>([
  "approval_needed",
  "task_assigned",
  "task_deadline_approaching",
]);

type TabKey = "all" | "unread" | "mentions";

interface GroupedItems {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
}

function groupByDate(items: Notification[]): GroupedItems {
  const today = parseISO(MOCK_DATE);
  return items.reduce<GroupedItems>(
    (acc, n) => {
      const d = parseISO(n.created_at);
      const diff = differenceInCalendarDays(today, d);
      if (isSameDay(d, today)) acc.today.push(n);
      else if (diff === 1) acc.yesterday.push(n);
      else if (diff <= 7) acc.thisWeek.push(n);
      else acc.earlier.push(n);
      return acc;
    },
    { today: [], yesterday: [], thisWeek: [], earlier: [] }
  );
}

function entityHref(n: Notification): string | null {
  if (!n.entity_type) return null;
  const fn = ENTITY_ROUTES[n.entity_type];
  if (!fn) return null;
  return fn(n.entity_id ?? "");
}

export function NotificationsShell() {
  const user = useCurrentUser();
  const allNotifications = useNotificationsStore((s) => s.notifications);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markUnread = useNotificationsStore((s) => s.markUnread);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markManyRead = useNotificationsStore((s) => s.markManyRead);
  const deleteNotification = useNotificationsStore((s) => s.deleteNotification);
  const deleteMany = useNotificationsStore((s) => s.deleteMany);
  const deleteReadForUser = useNotificationsStore((s) => s.deleteReadForUser);

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [typeFilter, setTypeFilter] = useState<NotificationType[]>([]);
  const [range, setRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const mine = useMemo(
    () =>
      allNotifications
        .filter((n) => n.user_id === user.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [allNotifications, user.id]
  );

  const unreadCount = useMemo(() => mine.filter((n) => !n.is_read).length, [mine]);
  const mentionsCount = useMemo(
    () => mine.filter((n) => MENTION_TYPES.has(n.type)).length,
    [mine]
  );

  const filtered = useMemo(() => {
    const today = parseISO(MOCK_DATE);
    const q = search.trim().toLowerCase();
    return mine.filter((n) => {
      if (tab === "unread" && n.is_read) return false;
      if (tab === "mentions" && !MENTION_TYPES.has(n.type)) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(n.priority)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(n.type)) return false;
      if (range !== "all") {
        const d = parseISO(n.created_at);
        const diff = differenceInCalendarDays(today, d);
        if (range === "24h" && diff > 0) return false;
        if (range === "7d" && diff > 6) return false;
        if (range === "30d" && diff > 29) return false;
      }
      if (q) {
        const hay = `${n.title} ${n.message}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [mine, tab, priorityFilter, typeFilter, range, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const groupOrder: { label: string; items: Notification[] }[] = [
    { label: "Today", items: grouped.today },
    { label: "Yesterday", items: grouped.yesterday },
    { label: "This week", items: grouped.thisWeek },
    { label: "Earlier", items: grouped.earlier },
  ];

  const handleNavigate = (n: Notification) => {
    if (!n.is_read) markRead(n.id);
  };

  const handleNavigateFromCard = (n: Notification) => () => handleNavigate(n);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((n) => n.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleMarkSelectedRead = () => {
    if (selected.size === 0) return;
    markManyRead(Array.from(selected));
    toast.success(`${selected.size} marked as read`);
    clearSelection();
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    const count = selected.size;
    deleteMany(Array.from(selected));
    toast.success(`${count} notifications deleted`);
    clearSelection();
  };

  const handleMarkAllRead = () => {
    markAllRead(user.id);
    toast.success("All notifications marked as read");
  };

  const handleDeleteRead = () => {
    const before = mine.filter((n) => n.is_read).length;
    deleteReadForUser(user.id);
    toast.success(`${before} read notifications removed`);
  };

  const priorityOptions: MultiSelectOption[] = PRIORITIES.map((p) => ({
    value: p,
    label: PRIORITY_LABELS[p],
  }));
  const typeOptions: MultiSelectOption[] = ALL_TYPES.map((t) => ({
    value: t,
    label: NOTIFICATION_TYPE_LABELS[t],
  }));

  const filterActive =
    search.trim().length > 0 ||
    priorityFilter.length > 0 ||
    typeFilter.length > 0 ||
    range !== "all";

  const clearFilters = () => {
    setSearch("");
    setPriorityFilter([]);
    setTypeFilter([]);
    setRange("all");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Stay on top of risks, approvals, and tasks."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={mine.filter((n) => n.is_read).length === 0}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete read
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all read notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`This removes ${mine.filter((n) => n.is_read).length} notification${
                      mine.filter((n) => n.is_read).length === 1 ? "" : "s"
                    } you've already seen.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRead}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            All
            <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
              {mine.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            Unread
            <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
              {unreadCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="mentions" className="gap-1.5">
            Mentions
            <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
              {mentionsCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or message…"
          className="h-8 w-[220px] text-xs"
        />
        <MultiSelectPopover
          label="Priority"
          options={priorityOptions}
          values={priorityFilter}
          onChange={(v) => setPriorityFilter(v as Priority[])}
        />
        <MultiSelectPopover
          label="Type"
          options={typeOptions}
          values={typeFilter}
          onChange={(v) => setTypeFilter(v as NotificationType[])}
        />
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        {filterActive ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
            Clear all
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            id="select-all-visible"
            checked={filtered.length > 0 && filtered.every((n) => selected.has(n.id))}
            onCheckedChange={(v) => {
              if (v) selectAllVisible();
              else clearSelection();
            }}
            aria-label="Select all visible"
          />
          <label htmlFor="select-all-visible" className="cursor-pointer">
            {`${filtered.length} of ${mine.length}`}
          </label>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="h-8" onClick={handleMarkSelectedRead}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark read
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleDeleteSelected}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-6">
          {groupOrder.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{g.items.length}</span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      selected={selected.has(n.id)}
                      onToggleSelect={toggleSelect}
                      onMarkRead={markRead}
                      onMarkUnread={markUnread}
                      onDelete={(id) => {
                        deleteNotification(id);
                        toast.success("Notification deleted");
                      }}
                      href={entityHref(n)}
                      onNavigate={handleNavigateFromCard(n)}
                    />
                  ))}
                </ul>
              </section>
            )
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        <Link
          href="/settings#notification-preferences"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <SettingsIcon className="h-3 w-3" /> Notification preferences
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  const map: Record<TabKey, { title: string; description: string; Icon: typeof Bell }> = {
    all: {
      title: "No notifications",
      description: "You're all caught up. New alerts appear here as soon as they arrive.",
      Icon: BellOff,
    },
    unread: {
      title: "Nothing unread",
      description: "Every notification has been read. Nice work staying on top of things.",
      Icon: CheckCheck,
    },
    mentions: {
      title: "No mentions yet",
      description: "Tasks assigned to you and approvals awaiting your action will appear here.",
      Icon: Bell,
    },
  };
  const { title, description, Icon } = map[tab];
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mx-auto max-w-xs text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
