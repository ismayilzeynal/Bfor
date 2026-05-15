"use client";

import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/cards/product-card";
import type { RiskyRow } from "./types";

interface ProductsGridProps {
  rows: RiskyRow[];
  onApprove: (row: RiskyRow) => void;
  onReject: (row: RiskyRow) => void;
}

export function ProductsGrid({ rows, onApprove, onReject }: ProductsGridProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <p className="font-medium">No risky products match your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {rows.slice(0, 60).map((r) => (
        <ProductCard key={r.id} row={r} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  );
}
