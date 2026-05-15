"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  Layers,
  Percent,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface PriorityTile {
  id: "discounts" | "transfers" | "stock-checks" | "shelf-actions";
  count: number;
  total: number;
  href: string;
  helper: string;
}

interface PriorityTilesProps {
  tiles: PriorityTile[];
}

interface TileMeta {
  label: string;
  cta: string;
  icon: LucideIcon;
  accent: string;
  bar: string;
  iconBg: string;
}

const META: Record<PriorityTile["id"], TileMeta> = {
  discounts: {
    label: "Urgent Discounts",
    cta: "Review queue",
    icon: Percent,
    accent: "border-l-rose-500",
    bar: "[&_>div]:bg-rose-500",
    iconBg: "bg-rose-50 text-rose-600",
  },
  transfers: {
    label: "Pending Transfers",
    cta: "Open transfers",
    icon: Truck,
    accent: "border-l-blue-500",
    bar: "[&_>div]:bg-blue-500",
    iconBg: "bg-blue-50 text-blue-600",
  },
  "stock-checks": {
    label: "Stock Checks Required",
    cta: "Assign checks",
    icon: ClipboardList,
    accent: "border-l-amber-500",
    bar: "[&_>div]:bg-amber-500",
    iconBg: "bg-amber-50 text-amber-700",
  },
  "shelf-actions": {
    label: "Shelf Actions",
    cta: "Plan actions",
    icon: Layers,
    accent: "border-l-indigo-500",
    bar: "[&_>div]:bg-indigo-500",
    iconBg: "bg-indigo-50 text-indigo-600",
  },
};

export function PriorityTiles({ tiles }: PriorityTilesProps) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const meta = META[tile.id];
        const Icon = meta.icon;
        const pct = tile.total > 0 ? Math.min(100, (tile.count / tile.total) * 100) : 0;
        return (
          <Card
            key={tile.id}
            onClick={() => router.push(tile.href)}
            className={cn(
              "group cursor-pointer border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
              meta.accent
            )}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight">
                      {tile.count}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      / {tile.total}
                    </span>
                  </div>
                </div>
                <div className={cn("flex size-9 items-center justify-center rounded-lg", meta.iconBg)}>
                  <Icon className="size-5" aria-hidden />
                </div>
              </div>

              <Progress value={pct} className={cn("h-1.5", meta.bar)} />

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tile.helper}</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80 group-hover:text-primary">
                  {meta.cta}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
