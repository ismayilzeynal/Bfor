"use client";

import Link from "next/link";
import { ArrowRight, Eye, Package, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TRANSFER_STATUS_CLASSES, TRANSFER_STATUS_LABELS } from "@/lib/constants";
import { formatAZN, formatNumber, formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/badges/priority-badge";
import type { TransferRow } from "./types";

interface Props {
  row: TransferRow;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
  canBulkSelect: boolean;
}

export function TransferCard({ row, selected, onSelect, onApprove, onReject, onView, canBulkSelect }: Props) {
  const t = row.transfer;
  const isPending = t.status === "suggested";
  const net = t.net_saved_value;
  const netTone = net >= 0 ? "text-emerald-700" : "text-rose-700";

  return (
    <Card className={cn("relative overflow-hidden p-4", selected && "ring-2 ring-primary/40")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {canBulkSelect && isPending ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelect(v === true)}
              className="mt-1"
              aria-label="Select for bulk action"
            />
          ) : null}
          <div className="flex items-center gap-2 text-sm">
            <StoreChip code={row.fromStore?.code} name={row.fromStore?.name} tone="from" />
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <StoreChip code={row.toStore?.code} name={row.toStore?.name} tone="to" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.recommendation ? <PriorityBadge priority={row.recommendation.priority} /> : null}
          <Badge
            variant="outline"
            className={cn("border-transparent text-[10px]", TRANSFER_STATUS_CLASSES[t.status])}
          >
            {TRANSFER_STATUS_LABELS[t.status]}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{formatRelative(t.created_at)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
          <Package className="size-5 text-slate-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={row.product ? `/products/${row.product.id}` : "/products"}
            className="block truncate text-sm font-semibold hover:underline"
          >
            {row.product?.name ?? "Unknown product"}
          </Link>
          <div className="font-mono text-[10px] text-muted-foreground">
            {row.product?.sku ?? "—"} · qty <span className="font-semibold tabular-nums">{formatNumber(t.quantity)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Cost" value={formatAZN(t.transfer_cost, { compact: true })} />
        <Stat label="Expected revenue" value={formatAZN(t.expected_sales_value, { compact: true })} />
        <Stat
          label="Net saved"
          value={formatAZN(net, { compact: true, sign: true })}
          tone={netTone}
        />
      </div>

      {row.recommendation ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mr-1 inline size-3 text-primary" aria-hidden />
          {row.recommendation.reason_text}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isPending ? (
          <>
            <Button size="sm" className="h-8" onClick={onApprove}>
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={onReject}>
              Reject
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1" onClick={onView}>
          <Eye className="size-3.5" aria-hidden />
          Details
        </Button>
      </div>
    </Card>
  );
}

function StoreChip({ code, name, tone }: { code: string | undefined; name: string | undefined; tone: "from" | "to" }) {
  const toneClass =
    tone === "from"
      ? "bg-sky-100 text-sky-700"
      : "bg-emerald-100 text-emerald-700";
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold", toneClass)}>
        {code ?? "—"}
      </span>
      <span className="truncate text-xs font-medium">{name ?? ""}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
