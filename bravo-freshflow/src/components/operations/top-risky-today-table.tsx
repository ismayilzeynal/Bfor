"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge } from "@/components/badges/risk-badge";
import { ActionBadge } from "@/components/badges/action-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Product, Recommendation, RiskPrediction, Store } from "@/types";

interface TopRiskyTodayTableProps {
  predictions: RiskPrediction[];
  products: Product[];
  stores: Store[];
  recommendations: Recommendation[];
  showStoreColumn: boolean;
}

export function TopRiskyTodayTable({
  predictions,
  products,
  stores,
  recommendations,
  showStoreColumn,
}: TopRiskyTodayTableProps) {
  const router = useRouter();

  const rows = useMemo(() => {
    const recByProduct = new Map<string, Recommendation>();
    for (const r of recommendations) {
      const existing = recByProduct.get(r.product_id);
      if (!existing || r.created_at > existing.created_at) recByProduct.set(r.product_id, r);
    }

    return [...predictions]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 10)
      .map((p) => {
        const product = products.find((x) => x.id === p.product_id);
        const store = stores.find((s) => s.id === p.store_id);
        const rec = recByProduct.get(p.product_id);
        return {
          prediction: p,
          product,
          store,
          recommendation: rec,
        };
      });
  }, [predictions, products, stores, recommendations]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Top 10 Risky Products Today</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push("/products")}>
          View all
          <ChevronRight className="ml-1 size-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-6">Product</TableHead>
                  {showStoreColumn ? <TableHead>Store</TableHead> : null}
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Days to Expiry</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right pr-6">Predicted Loss</TableHead>
                  <TableHead aria-label="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ prediction, product, store, recommendation }) => (
                  <TableRow
                    key={prediction.id}
                    className="cursor-pointer text-sm hover:bg-muted/40"
                    onClick={() => product && router.push(`/products/${product.id}`)}
                  >
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-medium text-slate-600">
                          {product?.name.slice(0, 2).toUpperCase() ?? "—"}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate">{product?.name ?? prediction.product_id}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {product?.sku ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {showStoreColumn ? (
                      <TableCell className="text-xs">
                        <span className="font-medium">{store?.code ?? "—"}</span>
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right tabular-nums text-xs">
                      {prediction.current_stock}
                    </TableCell>
                    <TableCell>
                      <DaysToExpiryBadge days={prediction.days_to_expiry} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium">{prediction.risk_score}</span>
                        <RiskBadge level={prediction.risk_level} showDot={false} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {recommendation ? (
                        <ActionBadge type={recommendation.recommendation_type} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums text-xs font-medium text-rose-700">
                      {formatAZN(prediction.predicted_loss_value, { compact: true })}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="View details"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product) router.push(`/products/${product.id}`);
                        }}
                      >
                        <Eye className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DaysToExpiryBadge({ days }: { days: number }) {
  const tone =
    days <= 1
      ? "bg-rose-100 text-rose-700"
      : days <= 3
        ? "bg-orange-100 text-orange-700"
        : days <= 7
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-50 text-emerald-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone
      )}
    >
      {formatDaysToExpiry(days)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
      No risky products under current scope.
    </div>
  );
}
