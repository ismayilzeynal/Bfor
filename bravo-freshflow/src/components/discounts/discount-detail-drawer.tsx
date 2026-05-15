"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { DISCOUNT_STATUS_CLASSES, DISCOUNT_STATUS_LABELS } from "@/lib/constants";
import { formatAZN, formatDateTime, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DiscountRow } from "./types";

interface Props {
  row: DiscountRow | null;
  onOpenChange: (open: boolean) => void;
}

export function DiscountDetailDrawer({ row, onOpenChange }: Props) {
  if (!row) return null;
  const d = row.discount;
  const p = row.product;
  const discountedPrice = p ? p.sale_price * (1 - d.discount_pct) : 0;

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Discount detail</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="font-mono text-xs">{d.id}</span>
            <Badge
              variant="outline"
              className={cn("border-transparent", DISCOUNT_STATUS_CLASSES[d.status])}
            >
              {DISCOUNT_STATUS_LABELS[d.status]}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="rounded-md border p-3">
          <Link
            href={p ? `/products/${p.id}` : "/products"}
            className="text-sm font-semibold hover:underline"
          >
            {p?.name ?? "Unknown product"}
          </Link>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {p?.sku ?? "—"} · {row.store?.name ?? ""} ({row.store?.code ?? ""})
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Original price</span>
            <span className="tabular-nums line-through">{formatAZN(p?.sale_price ?? 0)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Discounted price</span>
            <span className="text-base font-bold tabular-nums">{formatAZN(discountedPrice)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-semibold tabular-nums">{formatPercent(d.discount_pct, 0)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Margin after</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                row.marginBreached ? "text-rose-700" : "text-emerald-700"
              )}
            >
              {formatPercent(d.current_margin_after_discount_pct, 1)} / min{" "}
              {formatPercent(p?.minimum_margin_pct ?? 0, 0)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Expected uplift</span>
            <span className="font-semibold tabular-nums text-emerald-700">
              +{Math.round(d.expected_sales_uplift_pct)}%
            </span>
          </div>
        </div>

        <div className="rounded-md border p-3 text-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Time window
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Start</span>
            <span className="tabular-nums">{formatDateTime(d.start_datetime)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">End</span>
            <span className="tabular-nums">{formatDateTime(d.end_datetime)}</span>
          </div>
          <Progress value={row.isLiveNow ? 50 : 0} className="mt-3 h-1.5" />
        </div>

        {row.recommendation ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source recommendation
            </div>
            <Link href="/recommendations" className="mt-1 block text-foreground hover:underline">
              {row.recommendation.id}
            </Link>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {row.recommendation.reason_text}
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
