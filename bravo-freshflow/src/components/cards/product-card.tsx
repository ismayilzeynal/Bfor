"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, MoreVertical, ShieldOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiskBadge } from "@/components/badges/risk-badge";
import { ActionBadge } from "@/components/badges/action-badge";
import { formatAZN, formatDaysToExpiry } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RiskyRow } from "@/components/products/types";

interface ProductCardProps {
  row: RiskyRow;
  onApprove: (row: RiskyRow) => void;
  onReject: (row: RiskyRow) => void;
}

function daysToTone(days: number): string {
  if (days <= 1) return "bg-rose-100 text-rose-700";
  if (days <= 3) return "bg-orange-100 text-orange-700";
  if (days <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

export function ProductCard({ row, onApprove, onReject }: ProductCardProps) {
  const router = useRouter();
  const r = row;
  const netSaved = r.recommendation?.net_saved_value;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition hover:border-primary/40 hover:shadow-md">
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-3xl font-semibold text-slate-500">
        {r.product.name.slice(0, 2).toUpperCase()}
        <div className="absolute left-2 top-2">
          <RiskBadge level={r.prediction.risk_level} />
        </div>
        <div className="absolute right-1 top-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 bg-background/70 backdrop-blur hover:bg-background"
                aria-label="Card actions"
              >
                <MoreVertical className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/products/${r.product.id}`)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onApprove(r)}
                disabled={!r.recommendation}
              >
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReject(r)}
                disabled={!r.recommendation}
              >
                Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium">{r.product.name}</div>
          <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span className="font-mono">{r.store.code}</span>
            <span>·</span>
            <span className="truncate">{r.category?.name ?? "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <StatChip label="Stock" value={String(r.prediction.current_stock)} />
          <StatChip
            label="Expiry"
            value={formatDaysToExpiry(r.prediction.days_to_expiry)}
            tone={daysToTone(r.prediction.days_to_expiry)}
          />
          <StatChip label="Risk" value={String(r.prediction.risk_score)} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {r.recommendation ? (
            <ActionBadge type={r.recommendation.recommendation_type} />
          ) : (
            <span className="text-[11px] text-muted-foreground">No action</span>
          )}
          {netSaved !== undefined ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                netSaved >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {formatAZN(netSaved, { compact: true, sign: true })}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/products/${r.product.id}`)}
          >
            View
          </Button>
          <Button
            size="icon"
            className="size-8"
            variant="ghost"
            disabled={!r.recommendation}
            onClick={() => onApprove(r)}
            aria-label="Approve"
          >
            <CheckCircle2 className="size-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            className="size-8"
            variant="ghost"
            disabled={!r.recommendation}
            onClick={() => onReject(r)}
            aria-label="Reject"
          >
            <ShieldOff className="size-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 inline-flex rounded-full px-1.5 text-[11px] font-medium tabular-nums",
          tone
        )}
      >
        {value}
      </div>
    </div>
  );
}
