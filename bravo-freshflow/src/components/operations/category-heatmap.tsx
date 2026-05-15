"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Category, Product, RiskPrediction, Store } from "@/types";

interface CategoryHeatmapProps {
  predictions: RiskPrediction[];
  products: Product[];
  categories: Category[];
  stores: Store[];
}

interface Cell {
  storeId: string;
  categoryId: string;
  count: number;
  loss: number;
}

const INTENSITY_STEPS = [
  { min: 0, cls: "bg-muted/40 text-muted-foreground" },
  { min: 0.0001, cls: "bg-emerald-50 text-emerald-800" },
  { min: 0.2, cls: "bg-amber-100 text-amber-800" },
  { min: 0.4, cls: "bg-orange-200 text-orange-900" },
  { min: 0.65, cls: "bg-rose-200 text-rose-900" },
  { min: 0.85, cls: "bg-rose-400 text-white" },
];

function intensityClass(ratio: number): string {
  let pick = INTENSITY_STEPS[0].cls;
  for (const step of INTENSITY_STEPS) {
    if (ratio >= step.min) pick = step.cls;
  }
  return pick;
}

export function CategoryHeatmap({
  predictions,
  products,
  categories,
  stores,
}: CategoryHeatmapProps) {
  const router = useRouter();

  const { rowStores, colCategories, cellMap, max } = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const lossByCat = new Map<string, number>();
    for (const p of predictions) {
      const prod = productMap.get(p.product_id);
      if (!prod) continue;
      lossByCat.set(prod.category_id, (lossByCat.get(prod.category_id) ?? 0) + p.predicted_loss_value);
    }
    const topCats = Array.from(lossByCat.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const storeIds = new Set(predictions.map((p) => p.store_id));
    const rows = stores.filter((s) => storeIds.has(s.id));

    const map = new Map<string, Cell>();
    let maxLoss = 0;
    for (const p of predictions) {
      const prod = productMap.get(p.product_id);
      if (!prod || !topCats.includes(prod.category_id)) continue;
      const key = `${p.store_id}::${prod.category_id}`;
      const existing = map.get(key) ?? {
        storeId: p.store_id,
        categoryId: prod.category_id,
        count: 0,
        loss: 0,
      };
      existing.count += 1;
      existing.loss += p.predicted_loss_value;
      map.set(key, existing);
      if (existing.loss > maxLoss) maxLoss = existing.loss;
    }

    return {
      rowStores: rows,
      colCategories: topCats
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is Category => Boolean(c)),
      cellMap: map,
      max: maxLoss,
    };
  }, [predictions, products, categories, stores]);

  if (rowStores.length === 0 || colCategories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Heat-Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No data for current scope.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Risk Heat-Map · Stores × Top Categories</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div
          className="inline-grid min-w-full gap-1"
          style={{
            gridTemplateColumns: `minmax(140px, 1fr) repeat(${colCategories.length}, minmax(96px, 1fr))`,
          }}
        >
          <div />
          {colCategories.map((c) => (
            <div
              key={c.id}
              className="truncate px-1 pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title={c.name}
            >
              {c.name}
            </div>
          ))}

          {rowStores.map((store) => (
            <Row
              key={store.id}
              store={store}
              categories={colCategories}
              cellMap={cellMap}
              max={max}
              onCellClick={(catId) =>
                router.push(`/products?store=${store.id}&category=${catId}`)
              }
            />
          ))}
        </div>

        <Legend />
      </CardContent>
    </Card>
  );
}

function Row({
  store,
  categories,
  cellMap,
  max,
  onCellClick,
}: {
  store: Store;
  categories: Category[];
  cellMap: Map<string, Cell>;
  max: number;
  onCellClick: (categoryId: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-1 text-xs">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          {store.code}
        </span>
        <span className="truncate text-foreground/80">{store.name}</span>
      </div>
      {categories.map((c) => {
        const cell = cellMap.get(`${store.id}::${c.id}`);
        const ratio = cell && max > 0 ? cell.loss / max : 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onCellClick(c.id)}
            className={cn(
              "flex h-12 flex-col items-center justify-center rounded-md text-[11px] font-medium leading-tight transition-colors hover:opacity-80",
              intensityClass(ratio)
            )}
            title={cell ? `${cell.count} products · ${formatAZN(cell.loss)}` : "No risk"}
          >
            {cell ? (
              <>
                <span className="tabular-nums">{cell.count}</span>
                <span className="text-[10px] opacity-80 tabular-nums">
                  {formatAZN(cell.loss, { compact: true })}
                </span>
              </>
            ) : (
              <span className="opacity-50">—</span>
            )}
          </button>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
      <span>Low</span>
      <span className="inline-block size-3 rounded bg-emerald-50" />
      <span className="inline-block size-3 rounded bg-amber-100" />
      <span className="inline-block size-3 rounded bg-orange-200" />
      <span className="inline-block size-3 rounded bg-rose-200" />
      <span className="inline-block size-3 rounded bg-rose-400" />
      <span>High</span>
    </div>
  );
}
