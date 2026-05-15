"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import {
  Download,
  ShieldCheck,
  Lock,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelectPopover, type MultiSelectOption } from "@/components/products/multi-select-popover";
import { ROLE_LABELS, MOCK_DATE } from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/formatters";
import { downloadCsv } from "@/lib/analytics-utils";
import { cn } from "@/lib/utils";
import type { AuditEntityType, AuditLog, Product, Store, User } from "@/types";
import { useUiStore } from "@/store/ui-store";
import { useAuditData } from "./use-audit-data";
import { DiffViewer } from "./diff-viewer";

const ENTITY_ROUTES: Record<AuditEntityType, (id: string) => string> = {
  recommendation: () => "/products",
  task: () => "/tasks",
  transfer: () => "/tasks",
  discount: () => "/tasks",
  product: (id) => `/products/${id}`,
  data_issue: () => "/products",
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  recommendation: "Recommendation",
  task: "Task",
  transfer: "Transfer",
  discount: "Discount",
  product: "Product",
  data_issue: "Data Issue",
};

const ACTION_TONE: Record<string, string> = {
  created: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  approve_recommendation: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  reject_recommendation: "bg-rose-100 text-rose-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-200 text-zinc-700",
  updated: "bg-indigo-100 text-indigo-700",
  resolve_data_issue: "bg-emerald-100 text-emerald-700",
  ignore_data_issue: "bg-zinc-200 text-zinc-700",
  investigate_data_issue: "bg-amber-100 text-amber-700",
  create_stock_check_task: "bg-sky-100 text-sky-700",
  network_wide_stock_check: "bg-indigo-100 text-indigo-700",
};

function actionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

function actionTone(action: string): string {
  return ACTION_TONE[action] ?? "bg-slate-100 text-slate-700";
}

function diffSummary(log: AuditLog): string {
  const oldVal = log.old_value;
  const newVal = log.new_value;
  if (oldVal === null && newVal !== null) {
    if (typeof newVal === "object") {
      const keys = Object.keys(newVal as Record<string, unknown>);
      if (keys.length === 0) return "created (no fields)";
      return `created: ${keys.slice(0, 2).join(", ")}${keys.length > 2 ? ` +${keys.length - 2}` : ""}`;
    }
    return `created → ${JSON.stringify(newVal)}`;
  }
  if (oldVal !== null && newVal === null) return "removed";
  if (typeof oldVal === "object" && typeof newVal === "object" && oldVal && newVal) {
    const oldObj = oldVal as Record<string, unknown>;
    const newObj = newVal as Record<string, unknown>;
    const changed: string[] = [];
    const all = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    for (const k of all) {
      if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) changed.push(k);
    }
    if (changed.length === 0) return "no diff";
    return changed.slice(0, 2).join(", ") + (changed.length > 2 ? ` +${changed.length - 2}` : "");
  }
  return "—";
}

const PAGE_SIZE = 50;

export function AuditLogShell() {
  const { loading, combined, users, products, stores } = useAuditData();
  const complianceMode = useUiStore((s) => s.complianceMode);
  const setComplianceMode = useUiStore((s) => s.setComplianceMode);

  const [search, setSearch] = useState("");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [range, setRange] = useState<"all" | "24h" | "7d" | "30d" | "90d">("all");
  const [page, setPage] = useState(0);
  const [drawerLog, setDrawerLog] = useState<AuditLog | null>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const actionOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const a of combined) set.add(a.action);
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: actionLabel(v) }));
  }, [combined]);
  const entityOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const a of combined) set.add(a.entity_type);
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: ENTITY_LABELS[v as AuditEntityType] ?? v }));
  }, [combined]);
  const userOptions: MultiSelectOption[] = useMemo(
    () =>
      users.map((u) => ({ value: u.id, label: u.full_name, hint: ROLE_LABELS[u.role] })),
    [users]
  );

  const filtered = useMemo(() => {
    const today = parseISO(MOCK_DATE);
    const q = search.trim().toLowerCase();
    return combined.filter((log) => {
      if (userIds.length > 0 && !userIds.includes(log.user_id)) return false;
      if (actions.length > 0 && !actions.includes(log.action)) return false;
      if (entityTypes.length > 0 && !entityTypes.includes(log.entity_type)) return false;
      if (range !== "all") {
        const diff = differenceInCalendarDays(today, parseISO(log.created_at));
        if (range === "24h" && diff > 0) return false;
        if (range === "7d" && diff > 6) return false;
        if (range === "30d" && diff > 29) return false;
        if (range === "90d" && diff > 89) return false;
      }
      if (q) {
        const u = usersById.get(log.user_id);
        const hay = `${log.action} ${log.entity_type} ${log.entity_id} ${u?.full_name ?? ""} ${log.ip_address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [combined, userIds, actions, entityTypes, range, search, usersById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.message("Nothing to export");
      return;
    }
    const header = ["timestamp", "user", "role", "action", "entity_type", "entity_id", "ip"];
    const rows = filtered.map((log) => {
      const u = usersById.get(log.user_id);
      return [
        log.created_at,
        u?.full_name ?? log.user_id,
        u ? ROLE_LABELS[u.role] : "—",
        log.action,
        log.entity_type,
        log.entity_id,
        log.ip_address,
      ];
    });
    downloadCsv(`audit-log-${MOCK_DATE}.csv`, [header, ...rows]);
    toast.success(`${filtered.length} rows exported`);
  };

  const resetFilters = () => {
    setSearch("");
    setUserIds([]);
    setActions([]);
    setEntityTypes([]);
    setRange("all");
    setPage(0);
  };

  const filterActive =
    search.trim().length > 0 ||
    userIds.length > 0 ||
    actions.length > 0 ||
    entityTypes.length > 0 ||
    range !== "all";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log"
        description="Every approval, status change, and override — fully traceable."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
              <ShieldCheck className={cn("h-3.5 w-3.5", complianceMode ? "text-emerald-600" : "text-muted-foreground")} />
              <span className="text-xs">Compliance mode</span>
              <Switch checked={complianceMode} onCheckedChange={setComplianceMode} aria-label="Compliance mode" />
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      {complianceMode ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold">Immutable view</div>
            <div className="text-emerald-800/80 dark:text-emerald-200/70">
              Records are append-only; export is digitally watermarked. All filters and column changes are logged.
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <div className="flex items-center gap-1.5 rounded-md border px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search user, action, entity, IP…"
            className="h-7 w-[260px] border-0 px-0 text-xs focus-visible:ring-0"
          />
        </div>
        <MultiSelectPopover
          label="User"
          options={userOptions}
          values={userIds}
          onChange={(v) => {
            setUserIds(v);
            setPage(0);
          }}
        />
        <MultiSelectPopover
          label="Action"
          options={actionOptions}
          values={actions}
          onChange={(v) => {
            setActions(v);
            setPage(0);
          }}
        />
        <MultiSelectPopover
          label="Entity"
          options={entityOptions}
          values={entityTypes}
          onChange={(v) => {
            setEntityTypes(v);
            setPage(0);
          }}
        />
        <Select value={range} onValueChange={(v) => { setRange(v as typeof range); setPage(0); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        {filterActive ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Clear all
          </Button>
        ) : null}
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length.toLocaleString()} of {combined.length.toLocaleString()} entries
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[160px]">Action</TableHead>
                <TableHead className="w-[120px]">Entity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Diff</TableHead>
                <TableHead className="w-[120px]">IP</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    No entries match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((log) => {
                  const u = usersById.get(log.user_id);
                  const entityRoute = ENTITY_ROUTES[log.entity_type]?.(log.entity_id);
                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => setDrawerLog(log)}
                    >
                      <TableCell className="font-mono text-[11px]">
                        <div className="font-medium text-foreground">{formatDateTime(log.created_at)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatRelative(log.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        {u ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.full_name} /> : null}
                              <AvatarFallback className="text-[10px]">
                                {u.full_name
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{u.full_name}</div>
                              <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[u.role]}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{log.user_id}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium", actionTone(log.action))}>
                          {actionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entityRoute ? (
                          <Link
                            href={entityRoute}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            {log.entity_id}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">{log.entity_id}</span>
                        )}
                        {log.entity_type === "product" && productsById.get(log.entity_id) ? (
                          <div className="text-[10px] text-muted-foreground">
                            {productsById.get(log.entity_id)!.name}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="text-xs text-muted-foreground line-clamp-1">{diffSummary(log)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] text-muted-foreground">{log.ip_address}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => setDrawerLog(log)}>
                              <History className="mr-2 h-3.5 w-3.5" /> View diff
                            </DropdownMenuItem>
                            {entityRoute ? (
                              <DropdownMenuItem asChild>
                                <Link href={entityRoute}>
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open entity
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                navigator.clipboard.writeText(log.id);
                                toast.success("Audit ID copied");
                              }}
                            >
                              Copy audit ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="text-xs text-muted-foreground">
            Page {safePage + 1} of {totalPages} · 50 per page
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DiffDrawer
        log={drawerLog}
        usersById={usersById}
        productsById={productsById}
        storesById={storesById}
        onClose={() => setDrawerLog(null)}
      />
    </div>
  );
}

interface DiffDrawerProps {
  log: AuditLog | null;
  usersById: Map<string, User>;
  productsById: Map<string, Product>;
  storesById: Map<string, Store>;
  onClose: () => void;
}

function DiffDrawer({ log, usersById, productsById, storesById, onClose }: DiffDrawerProps) {
  const user = log ? usersById.get(log.user_id) : null;
  const productMatch =
    log && log.entity_type === "product" ? productsById.get(log.entity_id) : null;
  const storeMatch = log && log.entity_type === "transfer" && typeof log.new_value === "object" && log.new_value
    ? storesById.get((log.new_value as { to_store_id?: string }).to_store_id ?? "")
    : null;

  return (
    <Sheet open={log !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {log ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge variant="outline" className={cn("font-medium", actionTone(log.action))}>
                  {actionLabel(log.action)}
                </Badge>
                <span className="font-mono text-sm text-muted-foreground">{log.id}</span>
              </SheetTitle>
              <SheetDescription>
                {ENTITY_LABELS[log.entity_type] ?? log.entity_type} · {log.entity_id}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border bg-muted/30 p-2">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">Actor</div>
                  {user ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name} /> : null}
                        <AvatarFallback className="text-[10px]">
                          {user.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 font-mono">{log.user_id}</div>
                  )}
                </div>
                <div className="rounded-md border bg-muted/30 p-2">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">When · From</div>
                  <div className="mt-1 font-medium">{formatDateTime(log.created_at)}</div>
                  <div className="text-[10px] text-muted-foreground">{formatRelative(log.created_at)}</div>
                  <div className="mt-1 font-mono text-[10px]">IP {log.ip_address}</div>
                </div>
              </div>
              {productMatch ? (
                <Link
                  href={`/products/${productMatch.id}`}
                  className="flex items-center justify-between rounded-md border bg-card p-2 text-xs hover:bg-accent"
                >
                  <div>
                    <div className="font-semibold">{productMatch.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{productMatch.sku}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ) : null}
              {storeMatch ? (
                <div className="flex items-center justify-between rounded-md border bg-card p-2 text-xs">
                  <div>
                    <div className="font-semibold">Destination: {storeMatch.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{storeMatch.code}</div>
                  </div>
                </div>
              ) : null}
              <DiffViewer oldValue={log.old_value} newValue={log.new_value} />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
