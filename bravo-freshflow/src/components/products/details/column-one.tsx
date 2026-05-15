"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertOctagon,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  Coins,
  MapPin,
  Package,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { StorageBadge } from "./shared";
import { UNIT_LABELS } from "@/lib/constants";
import {
  formatAZN,
  formatDate,
  formatDaysToExpiry,
  formatPercent,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  InventoryBatch,
  InventorySnapshot,
  Product,
  RiskPrediction,
  Store,
  Supplier,
  Category,
} from "@/types";

interface ColumnOneProps {
  product: Product;
  store: Store;
  category: Category | undefined;
  supplier: Supplier | undefined;
  prediction: RiskPrediction | undefined;
  snapshots: InventorySnapshot[];
  batches: InventoryBatch[];
}

export function ColumnOne({
  product,
  store,
  category,
  supplier,
  prediction,
  snapshots,
  batches,
}: ColumnOneProps) {
  const latestSnapshot = snapshots[snapshots.length - 1];
  const currentStock = latestSnapshot?.current_stock ?? prediction?.current_stock ?? 0;
  const reservedStock = latestSnapshot?.reserved_stock ?? 0;
  const availableStock = latestSnapshot?.available_stock ?? currentStock;
  const confidence =
    latestSnapshot?.confidence_score ?? prediction?.data_confidence_score ?? 0;

  const margin = useMemo(() => {
    const m = (product.sale_price - product.cost_price) / product.sale_price;
    return Number.isFinite(m) ? m : 0;
  }, [product]);
  const marginAbs = product.sale_price - product.cost_price;
  const marginBreached = margin < product.minimum_margin_pct;

  const earliestBatch = batches.length
    ? [...batches].sort((a, b) => a.received_date.localeCompare(b.received_date))[0]
    : null;
  const earliestExpiry = batches.length
    ? [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0]
    : null;

  const daysToExpiry = prediction?.days_to_expiry ?? 0;
  const expectedSelloutDays =
    prediction && prediction.avg_daily_sales_7d > 0
      ? Math.ceil(prediction.current_stock / prediction.avg_daily_sales_7d)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4 text-muted-foreground" aria-hidden />
            Product Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-4xl font-semibold text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300">
            {product.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold leading-tight">{product.name}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{product.sku}</span>
              <span>·</span>
              <span className="font-mono">{product.barcode}</span>
            </div>
          </div>

          <Row icon={<Boxes className="size-3.5" aria-hidden />} label="Category">
            {category ? (
              <Link
                href={`/products?category=${category.id}`}
                className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
              >
                {category.name}
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            ) : (
              <span>—</span>
            )}
          </Row>
          <Row label="Brand">{product.brand}</Row>
          <Row icon={<ClipboardCheck className="size-3.5" aria-hidden />} label="Supplier">
            {supplier ? (
              <Link
                href={`/products?supplier=${supplier.id}`}
                className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
              >
                {supplier.name}
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            ) : (
              <span>—</span>
            )}
          </Row>
          <Row label="Storage">
            <StorageBadge storage={product.storage_type} />
          </Row>
          <Row label="Unit">{UNIT_LABELS[product.unit]}</Row>
          <Row label="Shelf life">{product.shelf_life_days} days</Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            Branch & Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">{store.name}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{store.code}</span>
              <span className="mx-1.5">·</span>
              {store.address}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Current" value={String(currentStock)} />
            <Stat label="Available" value={String(availableStock)} />
            <Stat label="Reserved" value={String(reservedStock)} />
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2 text-xs">
            <span className="text-muted-foreground">Data confidence</span>
            <ConfidenceBadge
              score={confidence}
              className=""
              showIcon
            />
          </div>
          {latestSnapshot ? (
            <p className="text-[11px] text-muted-foreground">
              Last sync: {formatDate(latestSnapshot.snapshot_datetime, "dd MMM, HH:mm")} ·{" "}
              {latestSnapshot.source_system.toUpperCase()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Coins className="size-4 text-muted-foreground" aria-hidden />
            Financials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Cost" value={formatAZN(product.cost_price)} />
            <Stat label="Sale" value={formatAZN(product.sale_price)} />
            <Stat
              label="Margin"
              value={`${formatAZN(marginAbs)} · ${formatPercent(margin)}`}
              tone={marginBreached ? "text-rose-700" : "text-emerald-700"}
            />
            <Stat
              label="Min margin"
              value={formatPercent(product.minimum_margin_pct)}
              tone={marginBreached ? "text-rose-700" : undefined}
            />
          </div>
          {prediction ? (
            <div className="rounded-md border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
              <p className="text-[10px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Predicted loss
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                {formatAZN(prediction.predicted_loss_value)}
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                {prediction.predicted_unsold_quantity} units expected unsold
              </p>
            </div>
          ) : null}
          {marginBreached ? (
            <p className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
              <AlertOctagon className="size-3.5" aria-hidden />
              Margin below minimum threshold
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Received">
            {earliestBatch ? formatDate(earliestBatch.received_date) : "—"}
          </Row>
          <Row label="Expiry">
            <span className={cn("font-medium", expiryTone(daysToExpiry))}>
              {earliestExpiry ? formatDate(earliestExpiry.expiry_date) : "—"}
            </span>
          </Row>
          <Row label="Days to expiry">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                daysChipTone(daysToExpiry)
              )}
            >
              {formatDaysToExpiry(daysToExpiry)}
            </span>
          </Row>
          <Row label="Expected sellout">
            {expectedSelloutDays !== null ? (
              <span>
                {expectedSelloutDays} days
                <span className="text-muted-foreground"> · @ avg pace</span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="size-4 text-muted-foreground" aria-hidden />
            Active Batches{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({batches.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active batches.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {batches.map((b) => (
                <AccordionItem key={b.id} value={b.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="py-2.5 hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-2 pr-2 text-xs">
                      <span className="truncate font-mono">{b.batch_code}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {b.remaining_quantity}/{b.received_quantity}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 text-xs">
                    <Row label="Received">{formatDate(b.received_date)}</Row>
                    <Row label="Expiry">{formatDate(b.expiry_date)}</Row>
                    <Row label="Qty remaining">{b.remaining_quantity}</Row>
                    <Row label="Status">
                      <span className="capitalize">{b.status}</span>
                    </Row>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function daysChipTone(days: number): string {
  if (days <= 1) return "bg-rose-100 text-rose-700";
  if (days <= 3) return "bg-orange-100 text-orange-700";
  if (days <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function expiryTone(days: number): string | undefined {
  if (days <= 1) return "text-rose-700";
  if (days <= 3) return "text-orange-700";
  if (days <= 7) return "text-amber-700";
  return undefined;
}

