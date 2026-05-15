"use client";

import Link from "next/link";
import { AlertTriangle, Eye, Package, Settings2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DISCOUNT_STATUS_CLASSES, DISCOUNT_STATUS_LABELS } from "@/lib/constants";
import { formatAZN, formatDateTime, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/badges/priority-badge";
import type { DiscountRow } from "./types";

interface Props {
  row: DiscountRow;
  onApprove: () => void;
  onReject: () => void;
  onAdjust: () => void;
  onView: () => void;
  liveSoldUnits?: number;
}

export function DiscountCard({ row, onApprove, onReject, onAdjust, onView, liveSoldUnits }: Props) {
  const d = row.discount;
  const isPending = d.status === "suggested";
  const isLive = row.isLiveNow;
  const product = row.product;
  const discountedPrice = product ? product.sale_price * (1 - d.discount_pct) : 0;
  const uplift = row.recommendation?.expected_recovered_value ?? 0;

  return (
    <Card className={cn("relative overflow-hidden p-4", row.marginBreached && "border-rose-300")}>
      {isLive ? (
        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          LIVE
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-100 to-orange-100">
            <Package className="size-5 text-amber-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <Link
              href={product ? `/products/${product.id}` : "/products"}
              className="block truncate text-sm font-semibold hover:underline"
            >
              {product?.name ?? "Unknown product"}
            </Link>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{product?.sku ?? "—"}</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {row.store?.code ?? "—"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.recommendation ? <PriorityBadge priority={row.recommendation.priority} /> : null}
          <Badge
            variant="outline"
            className={cn("border-transparent text-[10px]", DISCOUNT_STATUS_CLASSES[d.status])}
          >
            {DISCOUNT_STATUS_LABELS[d.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground line-through">
            {formatAZN(product?.sale_price ?? 0)}
          </span>
          <span className="text-xl font-bold tabular-nums text-foreground">
            {formatAZN(discountedPrice)}
          </span>
        </div>
        <Badge className="bg-orange-100 text-orange-700">−{formatPercent(d.discount_pct, 0)}</Badge>
        <div
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium",
            row.marginBreached ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          {row.marginBreached ? <AlertTriangle className="size-3" /> : null}
          Margin {formatPercent(d.current_margin_after_discount_pct, 1)}
          {product ? (
            <span className="opacity-70">/ min {formatPercent(product.minimum_margin_pct, 0)}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <Stat
          label="Expected uplift"
          value={`+${Math.round(d.expected_sales_uplift_pct)}%`}
          icon={<TrendingUp className="size-3 text-emerald-600" />}
        />
        <Stat label="Window" value={`${formatDateTime(d.start_datetime).slice(0, -6)} →`} />
        <Stat label="Ends" value={formatDateTime(d.end_datetime).slice(0, -6)} />
      </div>

      {isLive && liveSoldUnits !== undefined ? (
        <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs">
          <span className="text-emerald-700">
            Sold during discount:{" "}
            <span className="font-bold tabular-nums">{liveSoldUnits}</span> units
          </span>
          <span className="text-[10px] text-muted-foreground">
            Recovered ≈ {formatAZN(liveSoldUnits * discountedPrice, { compact: true })}
          </span>
        </div>
      ) : null}

      {row.recommendation ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
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
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onAdjust}>
              <Settings2 className="size-3.5" /> Adjust
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1" onClick={onView}>
          <Eye className="size-3.5" /> Details
        </Button>
      </div>
      <span className="sr-only">uplift {uplift}</span>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1 font-semibold tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}
