"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Check, Clock, MapPin, Package, Truck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  TRANSFER_STATUS_CLASSES,
  TRANSFER_STATUS_LABELS,
} from "@/lib/constants";
import { formatAZN, formatDateTime, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import type { TransferStatus } from "@/types";
import {
  etaHours,
  haversineKm,
  transferSteps,
  type TransferRow,
} from "./types";

interface Props {
  row: TransferRow | null;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABEL: Record<"source_manager" | "target_manager" | "logistics", string> = {
  source_manager: "Source Store Manager",
  target_manager: "Target Store Manager",
  logistics: "Logistics Manager",
};

const NEXT_STAGE: Record<TransferStatus, TransferStatus | null> = {
  suggested: "approved",
  approved: "preparing",
  preparing: "in_transit",
  in_transit: "received",
  received: "completed",
  completed: null,
  cancelled: null,
  failed: null,
};

export function TransferDetailDrawer({ row, onOpenChange }: Props) {
  const setTransferStatus = useActionsStore((s) => s.setTransferStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const currentUser = useAuthStore((s) => s.currentUser);

  const distanceKm = useMemo(() => {
    if (!row?.fromStore || !row?.toStore) return null;
    return haversineKm(row.fromStore, row.toStore);
  }, [row?.fromStore, row?.toStore]);

  if (!row) return null;
  const t = row.transfer;
  const steps = transferSteps(t.status);
  const doneSteps = steps.filter((s) => s.done).length;
  const stepPct = (doneSteps / steps.length) * 100;
  const distance = distanceKm ?? 0;
  const eta = etaHours(distance);

  const approvals = row.override?.approvals ?? [];
  const approvalRoles: Array<"source_manager" | "target_manager" | "logistics"> = [
    "source_manager",
    "target_manager",
    "logistics",
  ];

  const nextStage = NEXT_STAGE[t.status];

  function advanceStage() {
    if (!nextStage) return;
    setTransferStatus(t.id, nextStage);
    appendAudit({
      id: `aud-${Date.now()}`,
      user_id: currentUser.id,
      action: `transfer_advance_${nextStage}`,
      entity_type: "transfer",
      entity_id: t.id,
      old_value: { status: t.status },
      new_value: { status: nextStage },
      created_at: new Date().toISOString(),
      ip_address: "mock",
    });
  }

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Transfer detail</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="font-mono text-xs">{t.id}</span>
            <Badge
              variant="outline"
              className={cn("border-transparent", TRANSFER_STATUS_CLASSES[t.status])}
            >
              {TRANSFER_STATUS_LABELS[t.status]}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2">
          <StoreCard label="Source" tone="from" row={row} which="from" distanceKm={distance} eta={eta} />
          <StoreCard label="Target" tone="to" row={row} which="to" distanceKm={distance} eta={eta} />
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200">
              <Package className="size-5 text-slate-500" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={row.product ? `/products/${row.product.id}` : "/products"}
                className="block truncate font-semibold hover:underline"
              >
                {row.product?.name ?? "Unknown product"}
              </Link>
              <div className="font-mono text-[10px] text-muted-foreground">
                {row.product?.sku ?? "—"} · qty {formatNumber(t.quantity)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-xs">
          <RiskBar label="Source risk" value={75} tone="bg-orange-500" />
          <RiskBar label="Target demand" value={62} tone="bg-emerald-500" />
        </div>

        <div className="rounded-md border p-3 text-xs">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cost breakdown
          </h4>
          <ul className="mt-2 space-y-1">
            <CostLine label="Transport" value={t.transfer_cost * 0.7} />
            <CostLine label="Handling" value={t.transfer_cost * 0.25} />
            <CostLine label="Operational" value={t.transfer_cost * 0.05} />
            <li className="mt-1 flex items-center justify-between border-t pt-1 text-foreground">
              <span className="font-semibold">Total cost</span>
              <span className="font-semibold tabular-nums">{formatAZN(t.transfer_cost)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Expected revenue</span>
              <span className="tabular-nums">{formatAZN(t.expected_sales_value)}</span>
            </li>
            <li className="flex items-center justify-between border-t pt-1">
              <span className="font-semibold">Net saved</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  t.net_saved_value >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {formatAZN(t.net_saved_value, { sign: true })}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Status pipeline</span>
            <span>{doneSteps}/{steps.length}</span>
          </div>
          <Progress value={stepPct} className="mt-2 h-1.5" />
          <ol className="mt-3 flex items-center justify-between">
            {steps.map((s, i) => (
              <li key={s.key} className="flex flex-1 flex-col items-center text-[10px]">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold",
                    s.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : s.active
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-300 bg-background text-muted-foreground"
                  )}
                >
                  {s.done ? <Check className="size-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "mt-1 text-center",
                    s.active ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          {nextStage && t.status !== "suggested" ? (
            <Button size="sm" className="mt-3 w-full" onClick={advanceStage}>
              Advance to {labelForStatus(nextStage)}
            </Button>
          ) : null}
        </div>

        <div className="rounded-md border p-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Multi-step approval
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs">
            {approvalRoles.map((role) => {
              const found = approvals.find((a) => a.role === role);
              const isDone = !!found || t.status !== "suggested";
              return (
                <li
                  key={role}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5",
                    isDone ? "border-emerald-200 bg-emerald-50" : ""
                  )}
                >
                  <span className="font-medium">{ROLE_LABEL[role]}</span>
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                      <Check className="size-3" /> {found ? "Approved" : "Auto"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700">
                      <Clock className="size-3" /> Waiting
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Audit
          </h4>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li className="flex items-center justify-between">
              <span>Created</span>
              <span className="tabular-nums">{formatDateTime(t.created_at)}</span>
            </li>
            {t.completed_at ? (
              <li className="flex items-center justify-between">
                <span>Completed</span>
                <span className="tabular-nums">{formatDateTime(t.completed_at)}</span>
              </li>
            ) : null}
            {row.recommendation ? (
              <li className="flex items-center justify-between">
                <span>Source recommendation</span>
                <Link href="/recommendations" className="text-foreground hover:underline">
                  {row.recommendation.id}
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StoreCard({
  label,
  tone,
  row,
  which,
  distanceKm,
  eta,
}: {
  label: string;
  tone: "from" | "to";
  row: TransferRow;
  which: "from" | "to";
  distanceKm: number;
  eta: number;
}) {
  const store = which === "from" ? row.fromStore : row.toStore;
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-xs",
        tone === "from" ? "border-sky-200 bg-sky-50/60" : "border-emerald-200 bg-emerald-50/60"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold",
            tone === "from" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          {store?.code ?? "—"}
        </span>
      </div>
      <div className="mt-1 font-semibold">{store?.name ?? "—"}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="size-3" aria-hidden />
        <span className="line-clamp-1">{store?.address ?? ""}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Distance</span>
        <span className="tabular-nums">{distanceKm.toFixed(1)} km</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Truck className="size-3" /> ETA
        </span>
        <span className="tabular-nums">~ {eta} h</span>
      </div>
    </div>
  );
}

function RiskBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{formatAZN(value)}</span>
    </li>
  );
}

function labelForStatus(s: TransferStatus): string {
  return TRANSFER_STATUS_LABELS[s];
}
