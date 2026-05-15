"use client";

import { useMemo, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";
import type { TransferRow } from "./types";

interface Props {
  rows: TransferRow[];
  stores: Store[];
  selectedStoreId: string | null;
  onSelectStore: (storeId: string | null) => void;
}

const MAP_PADDING = 32;
const MAP_VIEW_W = 800;
const MAP_VIEW_H = 380;

export function NetworkMap({ rows, stores, selectedStoreId, onSelectStore }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const bounds = useMemo(() => {
    if (stores.length === 0) return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const s of stores) {
      if (s.latitude < minLat) minLat = s.latitude;
      if (s.latitude > maxLat) maxLat = s.latitude;
      if (s.longitude < minLng) minLng = s.longitude;
      if (s.longitude > maxLng) maxLng = s.longitude;
    }
    const padLat = (maxLat - minLat) * 0.08 || 0.01;
    const padLng = (maxLng - minLng) * 0.08 || 0.01;
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [stores]);

  function toXY(lat: number, lng: number): [number, number] {
    const w = MAP_VIEW_W - MAP_PADDING * 2;
    const h = MAP_VIEW_H - MAP_PADDING * 2;
    const x = MAP_PADDING + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w;
    const y = MAP_PADDING + (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * h;
    return [x, y];
  }

  const activeRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.transfer.status === "approved" ||
          r.transfer.status === "preparing" ||
          r.transfer.status === "in_transit" ||
          r.transfer.status === "received"
      ),
    [rows]
  );

  const storeUsage = useMemo(() => {
    const sources = new Set<string>();
    const targets = new Set<string>();
    for (const r of activeRows) {
      sources.add(r.transfer.from_store_id);
      targets.add(r.transfer.to_store_id);
    }
    return { sources, targets };
  }, [activeRows]);

  const storeStats = useMemo(() => {
    const map = new Map<string, { sourceCount: number; targetCount: number }>();
    for (const r of rows) {
      const f = map.get(r.transfer.from_store_id) ?? { sourceCount: 0, targetCount: 0 };
      f.sourceCount += 1;
      map.set(r.transfer.from_store_id, f);
      const t = map.get(r.transfer.to_store_id) ?? { sourceCount: 0, targetCount: 0 };
      t.targetCount += 1;
      map.set(r.transfer.to_store_id, t);
    }
    return map;
  }, [rows]);

  function pinColor(storeId: string): string {
    const isSource = storeUsage.sources.has(storeId);
    const isTarget = storeUsage.targets.has(storeId);
    if (isSource && isTarget) return "fill-purple-500 stroke-purple-700";
    if (isSource) return "fill-sky-500 stroke-sky-700";
    if (isTarget) return "fill-emerald-500 stroke-emerald-700";
    return "fill-slate-300 stroke-slate-500";
  }

  return (
    <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-sky-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-3 text-xs">
          <h3 className="font-semibold">Transfer Network — Bakı & Sumqayıt</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LegendDot className="bg-sky-500" label="Source" />
            <LegendDot className="bg-emerald-500" label="Target" />
            <LegendDot className="bg-purple-500" label="Both" />
            <LegendDot className="bg-slate-300" label="Idle" />
          </div>
        </div>
        {selectedStoreId ? (
          <button
            type="button"
            onClick={() => onSelectStore(null)}
            className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            Clear store filter
          </button>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${MAP_VIEW_W} ${MAP_VIEW_H}`}
        className="block h-[320px] w-full sm:h-[380px]"
        role="img"
        aria-label="Bravo store transfer network map"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.5" />
          </pattern>
          <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-sky-500" />
          </marker>
        </defs>
        <rect width={MAP_VIEW_W} height={MAP_VIEW_H} fill="url(#grid)" />

        {/* abstract caspian sea hint */}
        <path
          d={`M ${MAP_VIEW_W - 60} 30 Q ${MAP_VIEW_W - 80} ${MAP_VIEW_H * 0.5} ${MAP_VIEW_W - 40} ${MAP_VIEW_H - 30} L ${MAP_VIEW_W} ${MAP_VIEW_H - 30} L ${MAP_VIEW_W} 30 Z`}
          className="fill-sky-100/60 dark:fill-sky-900/40"
        />
        <text
          x={MAP_VIEW_W - 60}
          y={MAP_VIEW_H / 2}
          className="fill-sky-400/80 text-[10px] font-medium tracking-wider"
        >
          XƏZƏR
        </text>

        {/* active lines */}
        {activeRows.map((r) => {
          if (!r.fromStore || !r.toStore) return null;
          const [x1, y1] = toXY(r.fromStore.latitude, r.fromStore.longitude);
          const [x2, y2] = toXY(r.toStore.latitude, r.toStore.longitude);
          const dimmed =
            selectedStoreId &&
            r.transfer.from_store_id !== selectedStoreId &&
            r.transfer.to_store_id !== selectedStoreId;
          return (
            <g key={r.transfer.id} opacity={dimmed ? 0.15 : 1}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-sky-500"
                strokeWidth={1.6}
                strokeDasharray="6 6"
                markerEnd="url(#arrowhead)"
                style={{
                  animation: "transfer-dash 1.4s linear infinite",
                }}
              />
            </g>
          );
        })}

        {/* store pins */}
        {stores.map((s) => {
          const [x, y] = toXY(s.latitude, s.longitude);
          const isSelected = selectedStoreId === s.id;
          const isHovered = hovered === s.id;
          const stats = storeStats.get(s.id);
          return (
            <HoverCard key={s.id} openDelay={80} closeDelay={40}>
              <HoverCardTrigger asChild>
                <g
                  onClick={() => onSelectStore(isSelected ? null : s.id)}
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  {(isSelected || isHovered) ? (
                    <circle cx={x} cy={y} r={18} className="fill-sky-400/20 animate-pulse" />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 9 : 7}
                    className={cn(pinColor(s.id))}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    className={cn(
                      "fill-foreground text-[10px] font-medium",
                      isSelected ? "font-bold" : ""
                    )}
                  >
                    {s.code}
                  </text>
                </g>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-56 p-2 text-xs">
                <div className="font-semibold">{s.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{s.code}</div>
                <div className="mt-1 text-muted-foreground">{s.address}</div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-sky-700">
                    From {stats?.sourceCount ?? 0}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                    To {stats?.targetCount ?? 0}
                  </span>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </svg>
      <style jsx>{`
        @keyframes transfer-dash {
          to {
            stroke-dashoffset: -24;
          }
        }
      `}</style>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block size-2 rounded-full", className)} />
      <span>{label}</span>
    </span>
  );
}
