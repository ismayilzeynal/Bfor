"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionBadge } from "@/components/badges/action-badge";
import { formatAZN, formatRelative } from "@/lib/formatters";
import type { Product, Recommendation, Store } from "@/types";

interface LatestRecommendationsCardProps {
  recommendations: Recommendation[];
  products: Product[];
  stores: Store[];
}

export function LatestRecommendationsCard({
  recommendations,
  products,
  stores,
}: LatestRecommendationsCardProps) {
  const router = useRouter();
  const items = recommendations
    .filter((r) => r.status === "pending_approval" || r.status === "generated")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-amber-500" aria-hidden />
          Latest AI Recommendations
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")}>
          View all
          <ChevronRight className="ml-1 size-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((r) => {
            const product = products.find((p) => p.id === r.product_id);
            const store = stores.find((s) => s.id === r.store_id);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-md border bg-background/50 p-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-200 to-slate-100 text-xs font-medium text-slate-600">
                  {product?.name.slice(0, 2).toUpperCase() ?? "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{product?.name ?? r.product_id}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{store?.code ?? r.store_id}</span>
                    <span>·</span>
                    <span>{formatRelative(r.created_at)}</span>
                  </div>
                </div>
                <ActionBadge type={r.recommendation_type} />
                <span className="hidden md:inline-block whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 tabular-nums">
                  {formatAZN(r.net_saved_value, { compact: true })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => router.push(`/recommendations`)}
                >
                  View
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
      No pending recommendations.
    </div>
  );
}
