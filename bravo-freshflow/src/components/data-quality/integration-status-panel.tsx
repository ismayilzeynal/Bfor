"use client";

import { useState } from "react";
import {
  Boxes,
  Database,
  Loader2,
  RefreshCw,
  ScanLine,
  ScrollText,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Status = "healthy" | "degraded" | "syncing";

interface Integration {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  lastSync: Date;
  status: Status;
  description: string;
}

const STATUS_TONE: Record<Status, { dot: string; label: string; text: string }> = {
  healthy: { dot: "bg-emerald-500", label: "Healthy", text: "text-emerald-600" },
  degraded: { dot: "bg-amber-500", label: "Degraded", text: "text-amber-600" },
  syncing: { dot: "bg-sky-500", label: "Syncing", text: "text-sky-600" },
};

const SAMPLE_LOGS: Record<string, string[]> = {
  POS: [
    "[12:42] daily_aggregate sync: 412 rows merged",
    "[12:30] tranzaksiya stream resumed (lag: 0s)",
    "[11:58] retry: store s-006 timed out, recovered",
    "[10:14] schema check OK — 18 fields",
  ],
  ERP: [
    "[12:35] supplier delta pulled: 22 entries",
    "[11:50] inventory snapshot job complete",
    "[10:02] WARN: minimum_margin_pct null for 4 SKUs",
    "[09:30] reconciliation pass clean",
  ],
  "Supplier Portal": [
    "[11:55] supplier s-003 confirmed delivery batch b-00235",
    "[09:45] portal ping OK",
    "[08:30] expected delivery window updated",
  ],
  "Inventory Scanner": [
    "[12:00] scan batch flushed: 86 events",
    "[10:22] scanner s-007 reconnected",
    "[09:01] WARN: 2 scans flagged as duplicate",
  ],
};

const INITIAL: Integration[] = [
  {
    key: "POS",
    label: "POS",
    icon: ScanLine,
    lastSync: new Date(Date.now() - 18 * 60 * 1000),
    status: "healthy",
    description: "Real-time satış və tranzaksiya axını",
  },
  {
    key: "ERP",
    label: "ERP",
    icon: Database,
    lastSync: new Date(Date.now() - 42 * 60 * 1000),
    status: "healthy",
    description: "Mərkəzi inventar və supplier məlumatları",
  },
  {
    key: "Supplier Portal",
    label: "Supplier Portal",
    icon: Truck,
    lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: "degraded",
    description: "Supplier delivery confirmation portal",
  },
  {
    key: "Inventory Scanner",
    label: "Inventory Scanner",
    icon: Boxes,
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "healthy",
    description: "Mağaza scanner cihazları",
  },
];

export function IntegrationStatusPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [logFor, setLogFor] = useState<string | null>(null);

  const refreshSingle = (key: string) => {
    setRefreshingKey(key);
    setIntegrations((prev) =>
      prev.map((i) => (i.key === key ? { ...i, status: "syncing" } : i))
    );
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.key === key ? { ...i, status: "healthy", lastSync: new Date() } : i
        )
      );
      setRefreshingKey(null);
      toast.success(`${key} synced`, { description: "Last sync: just now" });
    }, 1200);
  };

  const refreshAll = () => {
    setRefreshingAll(true);
    setRefreshProgress(0);
    setIntegrations((prev) => prev.map((i) => ({ ...i, status: "syncing" })));
    const start = Date.now();
    const duration = 3000;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setRefreshProgress(pct);
      if (elapsed >= duration) {
        window.clearInterval(timer);
        setIntegrations((prev) =>
          prev.map((i) => ({ ...i, status: "healthy", lastSync: new Date() }))
        );
        setRefreshingAll(false);
        setRefreshProgress(0);
        toast.success("Bütün inteqrasiyalar yeniləndi", {
          description: "4 servis healthy",
        });
      }
    }, 80);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm">Integration status</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={refreshingAll}
          >
            {refreshingAll ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="mr-2 size-4" aria-hidden />
            )}
            Refresh all
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {refreshingAll ? (
            <div className="space-y-1">
              <Progress value={refreshProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">
                Sinxronlaşdırılır… {refreshProgress}%
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {integrations.map((i) => {
              const Icon = i.icon;
              const tone = STATUS_TONE[i.status];
              return (
                <div
                  key={i.key}
                  className="flex flex-col gap-2 rounded-md border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">{i.label}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] uppercase tracking-wide", tone.text)}
                    >
                      <span
                        className={cn("mr-1 inline-block size-1.5 rounded-full", tone.dot)}
                        aria-hidden
                      />
                      {tone.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{i.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Last sync: {formatRelative(i.lastSync.toISOString())}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => refreshSingle(i.key)}
                      disabled={Boolean(refreshingKey) || refreshingAll}
                    >
                      {refreshingKey === i.key ? (
                        <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="mr-1 size-3" aria-hidden />
                      )}
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setLogFor(i.key)}
                    >
                      <ScrollText className="mr-1 size-3" aria-hidden />
                      Logs
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(logFor)} onOpenChange={(v) => !v && setLogFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{logFor} — connection logs</DialogTitle>
            <DialogDescription>Son sinxronlaşdırma və xəbərdarlıqlar.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[240px] rounded-md border bg-muted/40 p-3">
            <ul className="space-y-1 font-mono text-xs">
              {(logFor ? SAMPLE_LOGS[logFor] ?? [] : []).map((line, i) => (
                <li key={i} className="text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
