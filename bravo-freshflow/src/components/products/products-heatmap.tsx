"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RiskyRow } from "./types";

interface Cell {
  storeId: string;
  categoryId: string;
  count: number;
  loss: number;
}

const STEPS = [
  { min: 0, cls: "bg-muted/30 text-muted-foreground" },
  { min: 0.0001, cls: "bg-emerald-50 text-emerald-800" },
  { min: 0.2, cls: "bg-amber-100 text-amber-800" },
  { min: 0.4, cls: "bg-orange-200 text-orange-900" },
  { min: 0.65, cls: "bg-rose-200 text-rose-900" },
  { min: 0.85, cls: "bg-rose-400 text-white" },
];

function intensity(ratio: number): string {
  let pick = STEPS[0].cls;
  for (const s of STEPS) if (ratio >= s.min) pick = s.cls;
  return pick;
}

interface ProductsHeatmapProps {
  rows: RiskyRow[];
  onCellClick: (storeId: string, categoryId: string) => void;
}

export function ProductsHeatmap({ rows, onCellClick }: ProductsHeatmapProps) {
  const { stores, categories, cellMap, max } = useMemo(() => {
    const storeMap = new Map<string, { id: string; code: string; name: string }>();
    const catMap = new Map<string, { id: string; name: string }>();
    const map = new Map<string, Cell>();
    let maxLoss = 0;

    for (const r of rows) {
      storeMap.set(r.store.id, { id: r.store.id, code: r.store.code, name: r.store.name });
      if (r.category) catMap.set(r.category.id, { id: r.category.id, name: r.category.name });
      const key = `${r.store.id}::${r.product.category_id}`;
      const existing = map.get(key) ?? {
        storeId: r.store.id,
        categoryId: r.product.category_id,
        count: 0,
        loss: 0,
      };
      existing.count += 1;
      existing.loss += r.prediction.predicted_loss_value;
      map.set(key, existing);
      if (existing.loss > maxLoss) maxLoss = existing.loss;
    }

    return {
      stores: Array.from(storeMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
      categories: Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      cellMap: map,
      max: maxLoss,
    };
  }, [rows]);

  if (stores.length === 0 || categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No data to plot. Try clearing filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <div
          className="inline-grid min-w-full gap-1"
          style={{
            gridTemplateColumns: `minmax(160px, 1fr) repeat(${categories.length}, minmax(100px, 1fr))`,
          }}
        >
          <div />
          {categories.map((c) => (
            <div
              key={c.id}
              className="truncate px-1 pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title={c.name}
            >
              {c.name}
            </div>
          ))}

          {stores.map((s) => (
            <Row
              key={s.id}
              store={s}
              categories={categories}
              cellMap={cellMap}
              max={max}
              onCellClick={(catId) => onCellClick(s.id, catId)}
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
  store: { id: string; code: string; name: string };
  categories: { id: string; name: string }[];
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
              "flex h-14 flex-col items-center justify-center rounded-md text-[11px] font-medium leading-tight transition-colors hover:opacity-80",
              intensity(ratio)
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
