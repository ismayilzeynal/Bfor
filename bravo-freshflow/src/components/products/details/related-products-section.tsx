"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RiskBadge } from "@/components/badges/risk-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Product, RiskPrediction } from "@/types";

interface Props {
  products: Product[];
  predictionsByProduct: Map<string, RiskPrediction>;
}

export function RelatedProductsSection({ products, predictionsByProduct }: Props) {
  if (products.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Related Products</h2>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No related products in this category.
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">Related Products</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max gap-3 pb-3">
          {products.map((p) => {
            const pred = predictionsByProduct.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group block w-[220px] shrink-0"
              >
                <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <div className="relative flex h-20 items-center justify-center rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-semibold text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300">
                    {p.name.slice(0, 2).toUpperCase()}
                    {pred ? (
                      <div className="absolute left-1.5 top-1.5">
                        <RiskBadge level={pred.risk_level} />
                      </div>
                    ) : null}
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <div className="min-w-0 truncate text-sm font-medium">{p.name}</div>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <Stat label="Stock" value={pred ? String(pred.current_stock) : "—"} />
                      <Stat
                        label="Expiry"
                        value={pred ? formatDaysToExpiry(pred.days_to_expiry) : "—"}
                        tone={pred && pred.days_to_expiry <= 3 ? "text-rose-700" : undefined}
                      />
                      <Stat
                        label="Loss"
                        value={
                          pred
                            ? formatAZN(pred.predicted_loss_value, { compact: true })
                            : "—"
                        }
                      />
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                      View details
                      <ArrowRight className="size-3" aria-hidden />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border bg-background px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 truncate text-[11px] font-medium tabular-nums", tone)}>
        {value}
      </div>
    </div>
  );
}
