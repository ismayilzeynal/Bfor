"use client";

import Link from "next/link";
import { ChevronRight, ScrollText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/badges/risk-badge";
import { cn } from "@/lib/utils";
import type { Product, RiskPrediction } from "@/types";

interface Props {
  product: Product;
  prediction: RiskPrediction | undefined;
  onOpenAuditLog: () => void;
}

export function StickyHeader({ product, prediction, onOpenAuditLog }: Props) {
  function handleShare() {
    try {
      if (typeof window !== "undefined") {
        const url = `${window.location.origin}/products/${product.id}`;
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch {
      // ignore
    }
    toast.success("Link copied", {
      description: `Product details URL ready to share.`,
    });
  }

  return (
    <div
      className={cn(
        "sticky top-14 z-30 -mx-4 -mt-4 mb-4 border-b bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:px-6"
      )}
    >
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="max-w-[280px] truncate font-medium text-foreground">
          {product.name}
        </span>
      </nav>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-semibold text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300">
            {product.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight">
              {product.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-mono">{product.sku}</span>
              <span className="mx-1.5">·</span>
              <span className="font-mono">{product.barcode}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {prediction ? (
            <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Risk
              </span>
              <span className="text-base font-semibold tabular-nums">
                {prediction.risk_score}
              </span>
              <RiskBadge level={prediction.risk_level} />
            </div>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onOpenAuditLog}
          >
            <ScrollText className="size-3.5" aria-hidden />
            Audit Log
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={handleShare}
            aria-label="Share product"
          >
            <Share2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
